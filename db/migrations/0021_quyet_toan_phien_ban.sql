-- LS-1: seq là số phiên bản quyết toán, độc lập số phiên bản hợp đồng.
-- Giữ nguyên toàn bộ nội dung và bút toán cũ; chỉ cờ hiệu lực được chuyển nguyên tử.
DROP INDEX core.uq_settlement_one_final;
DROP TRIGGER tg_settlement_immutable ON core.settlements;
ALTER TABLE core.settlements ADD COLUMN previous_settlement_id uuid REFERENCES core.settlements(id);
ALTER TABLE core.settlements ADD COLUMN is_effective boolean NOT NULL DEFAULT false;
ALTER TABLE core.settlements ADD COLUMN is_adjustment boolean NOT NULL DEFAULT false;
UPDATE core.settlements s SET previous_settlement_id=(SELECT p.id FROM core.settlements p WHERE p.order_id=s.order_id AND p.seq<s.seq ORDER BY p.seq DESC LIMIT 1),
 is_effective=NOT EXISTS(SELECT 1 FROM core.settlements n WHERE n.order_id=s.order_id AND n.seq>s.seq);
ALTER TABLE core.settlements ALTER COLUMN is_effective SET DEFAULT true;
ALTER TABLE core.settlements ADD CONSTRAINT ck_settlement_version CHECK(seq>0 AND ((seq=1)=(previous_settlement_id IS NULL)));
CREATE UNIQUE INDEX uq_settlement_effective ON core.settlements(order_id) WHERE is_effective;
CREATE UNIQUE INDEX uq_settlement_successor ON core.settlements(previous_settlement_id) WHERE previous_settlement_id IS NOT NULL;
COMMENT ON COLUMN core.settlements.seq IS 'Số phiên bản quyết toán, UNIQUE theo đơn; bản 1 rồi tăng liên tục, kể cả tạm, cuối và điều chỉnh.';
COMMENT ON COLUMN core.settlements.previous_settlement_id IS 'Phiên bản hiệu lực ngay trước, cùng đơn; không cho phân nhánh hoặc lùi phiên bản.';
COMMENT ON COLUMN core.settlements.is_effective IS 'Một bản hiệu lực mỗi đơn; chỉ trigger chèn bản kế tiếp được hạ cờ bản cũ.';
COMMENT ON COLUMN core.settlements.is_adjustment IS 'Sau bản cuối: chỉ chênh N thành nghĩa vụ T_bm/T_nb, không chia lại cọc hay sửa lệnh cũ.';

CREATE FUNCTION core.freeze_settlement_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF pg_trigger_depth()>1 AND OLD.is_effective AND NOT NEW.is_effective
   AND (to_jsonb(OLD)-'is_effective')=(to_jsonb(NEW)-'is_effective') THEN RETURN NEW; END IF;
 END IF;
 RAISE EXCEPTION 'Quyết toán bất biến; tạo phiên bản kế tiếp' USING HINT='ck_append_only';
END $$;
CREATE TRIGGER tg_settlement_immutable BEFORE UPDATE OR DELETE ON core.settlements
 FOR EACH ROW EXECUTE FUNCTION core.freeze_settlement_version();

CREATE FUNCTION core.advance_settlement_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p core.settlements%ROWTYPE;
BEGIN
 PERFORM 1 FROM core.orders WHERE id=NEW.order_id FOR UPDATE;
 SELECT * INTO p FROM core.settlements WHERE order_id=NEW.order_id AND is_effective FOR UPDATE;
 IF NOT NEW.is_effective OR (p.id IS NULL AND (NEW.seq<>1 OR NEW.previous_settlement_id IS NOT NULL))
  OR (p.id IS NOT NULL AND (NEW.previous_settlement_id IS DISTINCT FROM p.id OR NEW.seq<>p.seq+1)) THEN
  RAISE EXCEPTION 'Phải nối phiên bản hiệu lực ngay trước của cùng đơn' USING HINT='ck_settlement_sequence';
 END IF;
 NEW.is_adjustment:=coalesce(p.is_final,false);
 IF NEW.is_adjustment AND NOT NEW.is_final THEN
  RAISE EXCEPTION 'Sau quyết toán cuối chỉ tạo bản điều chỉnh cuối' USING HINT='ck_settlement_final'; END IF;
 IF p.id IS NOT NULL THEN UPDATE core.settlements SET is_effective=false WHERE id=p.id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_00_revision BEFORE INSERT ON core.settlements FOR EACH ROW EXECUTE FUNCTION core.advance_settlement_version();

ALTER TABLE core.settlements DROP CONSTRAINT ck_st_final;
ALTER TABLE core.settlements DROP CONSTRAINT ck_st_seller_net;
ALTER TABLE core.settlements DROP CONSTRAINT ck_st_deposit_split;
ALTER TABLE core.settlements ADD CONSTRAINT ck_st_final CHECK (NOT is_final OR is_adjustment OR (
 c_nb_formula_vnd=least(c_vnd,greatest(0,n_vnd-d_vnd))
 AND release_vnd=greatest(0,c_nb_formula_vnd-prior_released_vnd)
 AND refund_vnd=c_vnd-prior_released_vnd-release_vnd
 AND t_bm_vnd=greatest(0,n_vnd-d_vnd-c_vnd)
 AND t_nb_vnd=greatest(0,d_vnd-n_vnd)+greatest(0,prior_released_vnd-c_nb_formula_vnd)));
ALTER TABLE core.settlements ADD CONSTRAINT ck_st_seller_net CHECK (NOT is_final OR is_adjustment OR d_vnd+prior_released_vnd+release_vnd+t_bm_vnd-t_nb_vnd=n_vnd);
ALTER TABLE core.settlements ADD CONSTRAINT ck_st_deposit_split CHECK(is_adjustment OR prior_released_vnd+release_vnd+refund_vnd<=c_vnd);
ALTER TABLE core.settlements ADD CONSTRAINT ck_st_adjustment CHECK(NOT is_adjustment OR (is_final AND release_vnd=0 AND refund_vnd=0 AND c_nb_formula_vnd=0));

CREATE OR REPLACE FUNCTION core.guard_settlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE vv numeric; dd numeric; cc numeric; prior numeric; xnb numeric; xbm numeric; mat numeric; p core.settlements%ROWTYPE;
BEGIN
 PERFORM 1 FROM core.orders WHERE id=NEW.order_id FOR UPDATE;
 SELECT * INTO p FROM core.settlements WHERE id=NEW.previous_settlement_id;
 IF NEW.is_final AND (EXISTS(SELECT 1 FROM core.disputes WHERE order_id=NEW.order_id AND status<>'resolved') OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=NEW.order_id AND status NOT IN ('closed','shortfall_ended','cancelled'))) THEN
 RAISE EXCEPTION 'Chưa kết thúc giao nhận, chỉ quyết toán tạm' USING HINT='ck_settlement_final'; END IF;
 SELECT coalesce(sum(al.value_vnd),0) INTO vv FROM core.acceptance_lines al JOIN core.acceptance_versions av ON av.id=al.acceptance_id JOIN core.deliveries d ON d.id=av.delivery_id
 WHERE d.order_id=NEW.order_id AND (al.status='closed' OR (NOT NEW.is_final AND al.status='disputed'))
 AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions newer WHERE newer.delivery_id=d.id AND newer.version_no>av.version_no)
 AND NOT EXISTS(SELECT 1 FROM core.acceptance_lines newer WHERE newer.replaces_line_id=al.id);
 SELECT coalesce(sum(c.amount_vnd),0) INTO dd FROM core.direct_payment_confirmations c JOIN core.direct_payments dp ON dp.id=c.direct_payment_id WHERE dp.order_id=NEW.order_id AND dp.direction='buyer_to_seller' AND dp.kind IN ('goods_before_loading','goods_on_receipt','goods_after_days','goods_extra','goods_batch');
 IF NEW.is_adjustment THEN
  -- C và phần cọc chi trước giữ snapshot bản cuối đầu tiên; trạng thái callback không đổi phép chênh N.
  cc:=p.c_vnd; prior:=p.prior_released_vnd;
  IF NEW.t_bm_vnd<>greatest(0,NEW.n_vnd-p.n_vnd) OR NEW.t_nb_vnd<>greatest(0,p.n_vnd-NEW.n_vnd) THEN
   RAISE EXCEPTION 'Nghĩa vụ điều chỉnh phải bằng chênh N giữa hai phiên bản' USING HINT='ck_settlement_delta'; END IF;
 ELSE
  SELECT coalesce(sum(balance_vnd),0) INTO cc FROM ledger.v_account_balances WHERE order_id=NEW.order_id AND account_type IN ('deposit_escrow','deposit_in_instruction');
  SELECT coalesce(sum(amount_vnd),0) INTO prior FROM core.bank_instructions WHERE order_id=NEW.order_id AND kind='release_deposit_to_seller' AND status IN ('succeeded','reconciled');
  -- Bản tạm có lệnh chưa xong phải đợi callback, tránh chi lại tiền đang trong lệnh.
  IF EXISTS(SELECT 1 FROM core.bank_instructions WHERE order_id=NEW.order_id AND status IN ('created','sent','processing')) THEN
   RAISE EXCEPTION 'Chờ kết quả lệnh tạm trước khi chia cọc lần tiếp' USING HINT='ck_settlement_pending'; END IF;
  cc:=cc+prior;
 END IF;
 SELECT coalesce(sum(amount_vnd) FILTER(WHERE payer_side='seller' AND kind<>'materials_offset'),0),coalesce(sum(amount_vnd) FILTER(WHERE payer_side='buyer' AND kind<>'materials_offset'),0),coalesce(sum(amount_vnd) FILTER(WHERE kind='materials_offset'),0) INTO xnb,xbm,mat FROM core.contract_charges WHERE order_id=NEW.order_id;
 IF (NEW.v_vnd,NEW.d_vnd,NEW.c_vnd,NEW.prior_released_vnd,NEW.x_nb_vnd,NEW.x_bm_vnd,NEW.materials_offset_vnd) IS DISTINCT FROM (vv,dd,cc,prior,xnb,xbm,mat) THEN
 RAISE EXCEPTION 'Đầu vào quyết toán không khớp chứng cứ và sổ tiền' USING HINT='ck_settlement_inputs'; END IF;
 RETURN NEW;
END $$;

-- Chỉ trigger được tạo nghĩa vụ điều chỉnh; UNIQUE và kiểm nội dung chặn tạo lại/sửa/hủy.
CREATE UNIQUE INDEX uq_payment_settlement_adjustment ON core.direct_payments(settlement_id)
 WHERE settlement_id IS NOT NULL AND kind IN ('settlement_buyer_balance','seller_refund');
CREATE FUNCTION core.guard_settlement_adjustment_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s core.settlements%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 SELECT * INTO s FROM core.settlements WHERE id=NEW.settlement_id;
 IF s.is_adjustment THEN
  SELECT * INTO o FROM core.orders WHERE id=s.order_id;
  IF TG_OP<>'INSERT' OR pg_trigger_depth()<2 OR NEW.status<>'due'
   OR NEW.order_id IS DISTINCT FROM s.order_id OR NEW.framework_id IS NOT NULL OR NEW.due_trigger<>'settlement'
   OR NEW.amount_due_vnd<>greatest(s.t_bm_vnd,s.t_nb_vnd)
   OR NEW.kind<>(CASE WHEN s.t_bm_vnd>0 THEN 'settlement_buyer_balance' ELSE 'seller_refund' END)
   OR NEW.direction<>(CASE WHEN s.t_bm_vnd>0 THEN 'buyer_to_seller' ELSE 'seller_to_buyer' END)
   OR NEW.payer_org_id IS DISTINCT FROM (CASE WHEN s.t_bm_vnd>0 THEN o.buyer_org_id ELSE o.seller_org_id END)
   OR NEW.payee_org_id IS DISTINCT FROM (CASE WHEN s.t_bm_vnd>0 THEN o.seller_org_id ELSE o.buyer_org_id END) THEN
   RAISE EXCEPTION 'Nghĩa vụ điều chỉnh chỉ do phiên bản quyết toán tạo' USING HINT='ck_settlement_obligation'; END IF;
 END IF;
 RETURN NEW;
END $$;
-- Chỉ áp cho INSERT ở đây; UPDATE trạng thái nhận tiền vẫn theo máy trạng thái cũ.
CREATE TRIGGER a_settlement_adjustment BEFORE INSERT ON core.direct_payments FOR EACH ROW EXECUTE FUNCTION core.guard_settlement_adjustment_payment();
CREATE FUNCTION core.freeze_adjustment_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM core.settlements WHERE id=OLD.settlement_id AND is_adjustment)
  AND (NEW.settlement_id IS DISTINCT FROM OLD.settlement_id OR NEW.status='cancelled') THEN
  RAISE EXCEPTION 'Không hủy/đổi căn cứ nghĩa vụ điều chỉnh; lập phiên bản kế tiếp' USING HINT='ck_settlement_obligation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_00_adjustment_payment BEFORE UPDATE ON core.direct_payments FOR EACH ROW EXECUTE FUNCTION core.freeze_adjustment_payment();
CREATE FUNCTION core.create_settlement_adjustment_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o core.orders%ROWTYPE; delta bigint;
BEGIN
 IF NOT NEW.is_adjustment THEN RETURN NEW; END IF;
 delta:=NEW.t_bm_vnd-NEW.t_nb_vnd;
 IF delta=0 THEN RETURN NEW; END IF;
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id;
 INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,settlement_id,status)
 VALUES('QT-'||NEW.id,NEW.order_id,CASE WHEN delta>0 THEN 'settlement_buyer_balance' ELSE 'seller_refund' END,
 CASE WHEN delta>0 THEN 'buyer_to_seller' ELSE 'seller_to_buyer' END,
 CASE WHEN delta>0 THEN o.buyer_org_id ELSE o.seller_org_id END,CASE WHEN delta>0 THEN o.seller_org_id ELSE o.buyer_org_id END,
 abs(delta),'settlement',NEW.id,'due');
 -- Đơn đã hoàn tất có thêm nghĩa vụ thì mở lại nhãn công nợ, không sửa lịch sử hoàn tất cũ.
 IF o.status='completed' THEN UPDATE core.orders SET status='outstanding' WHERE id=o.id; END IF;
 RETURN NEW;
END $$;
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds,requires_reason,note_vi)
 VALUES('order','completed','outstanding',ARRAY['system'],true,'Phiên bản quyết toán mới sinh nghĩa vụ điều chỉnh');
CREATE TRIGGER z_adjustment_payment AFTER INSERT ON core.settlements FOR EACH ROW EXECUTE FUNCTION core.create_settlement_adjustment_payment();

CREATE FUNCTION core.guard_current_settlement_instruction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM core.orders WHERE id=NEW.order_id FOR UPDATE;
 IF NEW.basis_kind='settlement' AND NOT EXISTS(SELECT 1 FROM core.settlements WHERE id=NEW.basis_id AND order_id=NEW.order_id AND is_effective AND NOT is_adjustment) THEN
  RAISE EXCEPTION 'Không phát lệnh mới từ bản hết hiệu lực hoặc bản điều chỉnh' USING HINT='ck_instruction_settlement_version'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_00_current_settlement BEFORE INSERT ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.guard_current_settlement_instruction();
-- Ledger trigger 0010 đã ghi delta N theo seq: giữ lại, không đảo hay sửa entries cũ.
