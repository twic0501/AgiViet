-- Bản 23 · tìm nguồn định kỳ nhiều người bán (C7–C9). Quyết định Codex 28/10: Q25 mặc định duyệt từng phương án,
-- khách chủ động ủy quyền trong phạm vi rõ ràng; Q26 hạn chốt 14:00 hôm trước, cấu hình theo thỏa thuận, đổi sau hạn cần
-- người bán bị ảnh hưởng đồng ý + bên mua chịu chi phí thực tế có chứng cứ; Q27 thỏa thuận dịch vụ + mua bán giữa bên mua
-- và từng người bán, mỗi nguồn mỗi đợt là một core.orders; Q28 2 lần giao thiếu/30 ngày → mở rà soát, không tự trừ uy tín;
-- cho nợ mặc định 0 đ ngoài bảo đảm hợp lệ, người bán tự cấp từng bên mua; nợ quá hạn chặn cam kết mới.
-- Lớp này là KẾ HOẠCH; đơn từng nguồn từng đợt tạo bằng luồng đơn sẵn có rồi gắn vào phân bổ (order_id).

-- ---------- Thỏa thuận tìm nguồn ----------
CREATE TABLE core.sourcing_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
 buyer_org_id uuid NOT NULL REFERENCES core.organizations, product_id uuid NOT NULL REFERENCES core.products,
 spec jsonb NOT NULL DEFAULT '{}', required_docs text[] NOT NULL DEFAULT '{}', accepts_substitution boolean NOT NULL DEFAULT false,
 sourcing_mode text NOT NULL DEFAULT 'duyet_tung_phuong_an' CHECK(sourcing_mode IN ('duyet_tung_phuong_an','trong_pham_vi')),
 max_price_vnd_per_kg bigint CHECK(max_price_vnd_per_kg>0),
 cutoff_time time NOT NULL DEFAULT '14:00', receive_by time,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','stopped')),
 created_by uuid NOT NULL REFERENCES core.users, created_at timestamptz NOT NULL DEFAULT now(), stopped_at timestamptz,
 CHECK(sourcing_mode<>'trong_pham_vi' OR max_price_vnd_per_kg IS NOT NULL),
 CHECK((status='stopped')=(stopped_at IS NOT NULL))
);
COMMENT ON TABLE core.sourcing_agreements IS 'Thỏa thuận dịch vụ tìm nguồn định kỳ giữa bên mua và AgiViet (Q27). Giá tối đa chỉ là giới hạn để AgiViet tự tổ chức khi được ủy quyền, không ép người bán hạ giá.';
COMMENT ON COLUMN core.sourcing_agreements.id IS 'Mã';
COMMENT ON COLUMN core.sourcing_agreements.code IS 'Mã thỏa thuận';
COMMENT ON COLUMN core.sourcing_agreements.buyer_org_id IS 'Bên mua';
COMMENT ON COLUMN core.sourcing_agreements.product_id IS 'Mặt hàng';
COMMENT ON COLUMN core.sourcing_agreements.spec IS 'Yêu cầu: loại, kích cỡ, dung sai, đóng gói, chỉ tiêu thử nghiệm';
COMMENT ON COLUMN core.sourcing_agreements.required_docs IS 'Giấy tờ bắt buộc của nguồn';
COMMENT ON COLUMN core.sourcing_agreements.accepts_substitution IS 'Có nhận thay thế (nguồn/loại khác) không';
COMMENT ON COLUMN core.sourcing_agreements.sourcing_mode IS 'Q25: duyet_tung_phuong_an (mặc định) / trong_pham_vi (khách chủ động ủy quyền)';
COMMENT ON COLUMN core.sourcing_agreements.max_price_vnd_per_kg IS 'Giá tối đa (đ/kg) khi ủy quyền trong phạm vi';
COMMENT ON COLUMN core.sourcing_agreements.cutoff_time IS 'Giờ chốt nhu cầu của ngày hôm trước (Q26, mặc định 14:00)';
COMMENT ON COLUMN core.sourcing_agreements.receive_by IS 'Giờ nhận hàng muộn nhất';
COMMENT ON COLUMN core.sourcing_agreements.status IS 'active / stopped';
COMMENT ON COLUMN core.sourcing_agreements.created_by IS 'Người lập';
COMMENT ON COLUMN core.sourcing_agreements.created_at IS 'Lúc lập';
COMMENT ON COLUMN core.sourcing_agreements.stopped_at IS 'Lúc dừng';

CREATE TABLE core.sourcing_forecasts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agreement_id uuid NOT NULL REFERENCES core.sourcing_agreements,
 period daterange NOT NULL CHECK(NOT isempty(period)), qty_g bigint NOT NULL CHECK(qty_g>0),
 cancelled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE core.sourcing_forecasts IS 'DỰ KIẾN: không ràng buộc mua, không là lời hứa với người bán.';
COMMENT ON COLUMN core.sourcing_forecasts.id IS 'Mã';
COMMENT ON COLUMN core.sourcing_forecasts.agreement_id IS 'Thỏa thuận';
COMMENT ON COLUMN core.sourcing_forecasts.period IS 'Khoảng ngày dự kiến';
COMMENT ON COLUMN core.sourcing_forecasts.qty_g IS 'Lượng dự kiến (gam)';
COMMENT ON COLUMN core.sourcing_forecasts.cancelled_at IS 'Hủy (vd khi dừng thỏa thuận)';
COMMENT ON COLUMN core.sourcing_forecasts.created_at IS 'Lúc ghi';

CREATE TABLE core.sourcing_days (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agreement_id uuid NOT NULL REFERENCES core.sourcing_agreements,
 delivery_date date NOT NULL, cutoff_at timestamptz NOT NULL, confirmed_qty_g bigint NOT NULL CHECK(confirmed_qty_g>0),
 confirmed_by uuid NOT NULL REFERENCES core.users, confirmed_at timestamptz NOT NULL,
 UNIQUE(agreement_id,delivery_date)
);
COMMENT ON TABLE core.sourcing_days IS 'ĐÃ CHỐT nhu cầu từng ngày, chốt trước cutoff_at; sau hạn chốt chỉ đổi qua lệnh có người bán đồng ý.';
COMMENT ON COLUMN core.sourcing_days.id IS 'Mã';
COMMENT ON COLUMN core.sourcing_days.agreement_id IS 'Thỏa thuận';
COMMENT ON COLUMN core.sourcing_days.delivery_date IS 'Ngày nhận hàng';
COMMENT ON COLUMN core.sourcing_days.cutoff_at IS 'Hạn chốt (giờ chốt của ngày hôm trước)';
COMMENT ON COLUMN core.sourcing_days.confirmed_qty_g IS 'Lượng đã chốt (gam)';
COMMENT ON COLUMN core.sourcing_days.confirmed_by IS 'Người chốt';
COMMENT ON COLUMN core.sourcing_days.confirmed_at IS 'Lúc chốt';

CREATE TABLE core.seller_credit_terms (
 buyer_org_id uuid NOT NULL REFERENCES core.organizations, seller_org_id uuid NOT NULL REFERENCES core.organizations,
 pay_after_days integer NOT NULL DEFAULT 0 CHECK(pay_after_days BETWEEN 0 AND 60),
 credit_limit_vnd bigint NOT NULL DEFAULT 0 CHECK(credit_limit_vnd>=0),
 set_by uuid NOT NULL REFERENCES core.users, set_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(buyer_org_id,seller_org_id)
);
COMMENT ON TABLE core.seller_credit_terms IS 'Kỳ trả và mức cho nợ NGƯỜI BÁN tự cấp cho từng bên mua. Không có dòng = trả trước bàn giao, cho nợ 0 đ.';
COMMENT ON COLUMN core.seller_credit_terms.buyer_org_id IS 'Bên mua';
COMMENT ON COLUMN core.seller_credit_terms.seller_org_id IS 'Người bán';
COMMENT ON COLUMN core.seller_credit_terms.pay_after_days IS 'Trả sau N ngày (0 = trả trước bàn giao)';
COMMENT ON COLUMN core.seller_credit_terms.credit_limit_vnd IS 'Mức nợ tối đa người bán chấp nhận';
COMMENT ON COLUMN core.seller_credit_terms.set_by IS 'Người bán đặt';
COMMENT ON COLUMN core.seller_credit_terms.set_at IS 'Lúc đặt';

CREATE TABLE core.sourcing_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), day_id uuid NOT NULL REFERENCES core.sourcing_days,
 seller_org_id uuid NOT NULL REFERENCES core.organizations, qty_g bigint NOT NULL CHECK(qty_g>0),
 unit_price_vnd_per_kg bigint NOT NULL CHECK(unit_price_vnd_per_kg>0),
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','buyer_approved','committed','shortfall','cancelled')),
 proposed_by uuid NOT NULL REFERENCES core.users, buyer_approved_by uuid REFERENCES core.users, buyer_approved_at timestamptz,
 seller_committed_by uuid REFERENCES core.users, seller_committed_at timestamptz,
 delivered_qty_g bigint CHECK(delivered_qty_g>=0), order_id uuid REFERENCES core.orders,
 replaces_allocation_id uuid REFERENCES core.sourcing_allocations, created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE core.sourcing_allocations IS 'ĐÃ CAM KẾT theo từng người bán. Đơn của nguồn (order_id) tạo bằng luồng đơn sẵn có.';
COMMENT ON COLUMN core.sourcing_allocations.id IS 'Mã';
COMMENT ON COLUMN core.sourcing_allocations.day_id IS 'Ngày đã chốt';
COMMENT ON COLUMN core.sourcing_allocations.seller_org_id IS 'Người bán';
COMMENT ON COLUMN core.sourcing_allocations.qty_g IS 'Lượng (gam)';
COMMENT ON COLUMN core.sourcing_allocations.unit_price_vnd_per_kg IS 'Giá người bán chấp thuận (đ/kg)';
COMMENT ON COLUMN core.sourcing_allocations.status IS 'proposed → buyer_approved → committed; shortfall; cancelled';
COMMENT ON COLUMN core.sourcing_allocations.proposed_by IS 'Người đề xuất phương án';
COMMENT ON COLUMN core.sourcing_allocations.buyer_approved_by IS 'Bên mua duyệt (chế độ duyệt từng phương án)';
COMMENT ON COLUMN core.sourcing_allocations.buyer_approved_at IS 'Lúc duyệt';
COMMENT ON COLUMN core.sourcing_allocations.seller_committed_by IS 'Người bán cam kết';
COMMENT ON COLUMN core.sourcing_allocations.seller_committed_at IS 'Lúc cam kết';
COMMENT ON COLUMN core.sourcing_allocations.delivered_qty_g IS 'Lượng thực giao (khi báo giao thiếu)';
COMMENT ON COLUMN core.sourcing_allocations.order_id IS 'Đơn của nguồn này trong đợt này';
COMMENT ON COLUMN core.sourcing_allocations.replaces_allocation_id IS 'Phân bổ thay thế cho phân bổ thiếu';
COMMENT ON COLUMN core.sourcing_allocations.created_at IS 'Lúc lập';

CREATE TABLE core.allocation_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), allocation_id uuid NOT NULL REFERENCES core.sourcing_allocations,
 new_qty_g bigint NOT NULL CHECK(new_qty_g>=0), requested_by uuid NOT NULL REFERENCES core.users, requested_at timestamptz NOT NULL,
 seller_cost_vnd bigint NOT NULL DEFAULT 0 CHECK(seller_cost_vnd>=0), cost_evidence_id uuid REFERENCES core.documents,
 seller_consented_by uuid REFERENCES core.users, seller_consented_at timestamptz, rejected_at timestamptz
);
COMMENT ON TABLE core.allocation_changes IS 'Q26: đổi lượng đã cam kết sau hạn chốt: người bán bị ảnh hưởng phải đồng ý; chi phí thực tế có chứng cứ bên mua chịu.';
COMMENT ON COLUMN core.allocation_changes.id IS 'Mã';
COMMENT ON COLUMN core.allocation_changes.allocation_id IS 'Phân bổ bị đổi';
COMMENT ON COLUMN core.allocation_changes.new_qty_g IS 'Lượng mới';
COMMENT ON COLUMN core.allocation_changes.requested_by IS 'Bên mua yêu cầu';
COMMENT ON COLUMN core.allocation_changes.requested_at IS 'Lúc yêu cầu';
COMMENT ON COLUMN core.allocation_changes.seller_cost_vnd IS 'Chi phí người bán đã phát sinh (có chứng cứ)';
COMMENT ON COLUMN core.allocation_changes.cost_evidence_id IS 'Chứng cứ chi phí';
COMMENT ON COLUMN core.allocation_changes.seller_consented_by IS 'Người bán đồng ý';
COMMENT ON COLUMN core.allocation_changes.seller_consented_at IS 'Lúc đồng ý';
COMMENT ON COLUMN core.allocation_changes.rejected_at IS 'Người bán không đồng ý: giữ cam kết cũ';

CREATE TABLE core.shortfall_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), allocation_id uuid NOT NULL REFERENCES core.sourcing_allocations,
 seller_org_id uuid NOT NULL REFERENCES core.organizations, buyer_org_id uuid NOT NULL REFERENCES core.organizations,
 missing_qty_g bigint NOT NULL CHECK(missing_qty_g>0), reported_early boolean NOT NULL, cause text NOT NULL DEFAULT 'chua_ro'
 CHECK(cause IN ('chua_ro','phia_ben_mua','bat_kha_khang','phia_nguoi_ban')), at timestamptz NOT NULL
);
COMMENT ON TABLE core.shortfall_events IS 'Q28: lịch sử giao thiếu. Không tự trừ uy tín. 2 lần trong 30 ngày (trừ lỗi phía bên mua/bất khả kháng) → mở việc rà soát.';
COMMENT ON COLUMN core.shortfall_events.id IS 'Mã';
COMMENT ON COLUMN core.shortfall_events.allocation_id IS 'Phân bổ';
COMMENT ON COLUMN core.shortfall_events.seller_org_id IS 'Người bán';
COMMENT ON COLUMN core.shortfall_events.buyer_org_id IS 'Bên mua';
COMMENT ON COLUMN core.shortfall_events.missing_qty_g IS 'Lượng thiếu';
COMMENT ON COLUMN core.shortfall_events.reported_early IS 'Báo trước giờ hạn';
COMMENT ON COLUMN core.shortfall_events.cause IS 'Nguyên nhân sau giải trình';
COMMENT ON COLUMN core.shortfall_events.at IS 'Lúc báo';

ALTER TABLE core.sourcing_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.sourcing_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.sourcing_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.seller_credit_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.sourcing_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.allocation_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.shortfall_events ENABLE ROW LEVEL SECURITY;

-- ---------- Công nợ cặp bên mua–người bán ----------
CREATE FUNCTION core.pair_exposure(p_buyer uuid,p_seller uuid) RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT sum(p.amount_due_vnd-coalesce((SELECT sum(c.amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0))
   FROM core.direct_payments p WHERE p.payer_org_id=p_buyer AND p.payee_org_id=p_seller AND p.direction='buyer_to_seller'
    AND p.status NOT IN ('fully_received','cancelled')),0)
 + coalesce((SELECT sum(ref.div_round(a.qty_g::numeric*a.unit_price_vnd_per_kg,1000)) FROM core.sourcing_allocations a
   JOIN core.sourcing_days d ON d.id=a.day_id JOIN core.sourcing_agreements g ON g.id=d.agreement_id
   WHERE g.buyer_org_id=p_buyer AND a.seller_org_id=p_seller AND a.status='committed' AND a.order_id IS NULL),0)
$$;
COMMENT ON FUNCTION core.pair_exposure(uuid,uuid) IS 'Công nợ chồng của bên mua với một người bán: khoản trả trực tiếp chưa nhận đủ + cam kết chưa thành đơn.';
CREATE FUNCTION core.pair_has_overdue(p_buyer uuid,p_seller uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM core.direct_payments p WHERE p.payer_org_id=p_buyer AND p.payee_org_id=p_seller AND p.direction='buyer_to_seller'
  AND p.status NOT IN ('fully_received','cancelled') AND (p.status='overdue' OR (p.due_at IS NOT NULL AND p.due_at<ref.clock_at())))
$$;

CREATE VIEW core.v_sourcing_coverage AS
 SELECT d.id AS day_id, g.id AS agreement_id, g.code, d.delivery_date, d.cutoff_at, d.confirmed_qty_g,
  coalesce(sum(a.qty_g) FILTER (WHERE a.status='committed'),0) AS committed_qty_g,
  greatest(0,d.confirmed_qty_g-coalesce(sum(a.qty_g) FILTER (WHERE a.status='committed'),0)) AS missing_qty_g,
  coalesce(sum(a.qty_g) FILTER (WHERE a.status IN ('proposed','buyer_approved')),0) AS pending_qty_g
 FROM core.sourcing_days d JOIN core.sourcing_agreements g ON g.id=d.agreement_id
 LEFT JOIN core.sourcing_allocations a ON a.day_id=d.id GROUP BY d.id,g.id;
COMMENT ON VIEW core.v_sourcing_coverage IS 'Độ phủ nguồn: cần (đã chốt) · đã cam kết · còn thiếu · đang chờ. Danh sách gợi ý không tính là đã có hàng.';
REVOKE ALL ON core.v_sourcing_coverage FROM PUBLIC;

-- ---------- Lệnh ----------
CREATE FUNCTION cmd.create_sourcing_agreement(p_code text,p_product uuid,p_spec jsonb,p_docs text[],p_substitution boolean,p_mode text,p_max_price bigint,p_cutoff time) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE result uuid; BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','purchaser']);
 IF NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=ref.ctx_org() AND can_buy) THEN RAISE EXCEPTION 'Chỉ bên mua' USING HINT='KHONG_CO_QUYEN'; END IF;
 INSERT INTO core.sourcing_agreements(code,buyer_org_id,product_id,spec,required_docs,accepts_substitution,sourcing_mode,max_price_vnd_per_kg,cutoff_time,created_by)
 VALUES(p_code,ref.ctx_org(),p_product,coalesce(p_spec,'{}'),coalesce(p_docs,'{}'),coalesce(p_substitution,false),coalesce(p_mode,'duyet_tung_phuong_an'),p_max_price,coalesce(p_cutoff,'14:00'),ref.ctx_user()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.confirm_sourcing_day(p_agreement uuid,p_date date,p_qty bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE g core.sourcing_agreements%ROWTYPE; cut timestamptz; result uuid; BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO g FROM core.sourcing_agreements WHERE id=p_agreement;
 PERFORM cmd.require_org(g.buyer_org_id,ARRAY['owner','purchaser']);
 cut:=((p_date-1)+g.cutoff_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
 IF g.status<>'active' OR p_qty IS NULL OR p_qty<=0 OR ref.clock_at()>=cut THEN RAISE EXCEPTION 'Đã qua hạn chốt hoặc thỏa thuận đã dừng' USING HINT='ck_sourcing_cutoff'; END IF;
 INSERT INTO core.sourcing_days(agreement_id,delivery_date,cutoff_at,confirmed_qty_g,confirmed_by,confirmed_at) VALUES(g.id,p_date,cut,p_qty,ref.ctx_user(),ref.clock_at())
 ON CONFLICT(agreement_id,delivery_date) DO UPDATE SET confirmed_qty_g=EXCLUDED.confirmed_qty_g,confirmed_by=EXCLUDED.confirmed_by,confirmed_at=EXCLUDED.confirmed_at
 RETURNING id INTO result; RETURN result;
END $$;
-- Sau hạn chốt: không sửa lượng đã chốt trực tiếp.
CREATE FUNCTION core.guard_sourcing_day() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND ref.clock_at()>=OLD.cutoff_at AND NEW.confirmed_qty_g IS DISTINCT FROM OLD.confirmed_qty_g THEN
  RAISE EXCEPTION 'Sau hạn chốt: đổi lượng qua yêu cầu có người bán đồng ý' USING HINT='ck_sourcing_cutoff'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_day_cutoff BEFORE UPDATE ON core.sourcing_days FOR EACH ROW EXECUTE FUNCTION core.guard_sourcing_day();

CREATE FUNCTION cmd.set_credit_terms(p_buyer uuid,p_pay_after integer,p_limit bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','accountant']);
 INSERT INTO core.seller_credit_terms(buyer_org_id,seller_org_id,pay_after_days,credit_limit_vnd,set_by) VALUES(p_buyer,ref.ctx_org(),p_pay_after,p_limit,ref.ctx_user())
 ON CONFLICT(buyer_org_id,seller_org_id) DO UPDATE SET pay_after_days=EXCLUDED.pay_after_days,credit_limit_vnd=EXCLUDED.credit_limit_vnd,set_by=EXCLUDED.set_by,set_at=now();
END $$;

CREATE FUNCTION cmd.propose_allocation(p_day uuid,p_seller uuid,p_qty bigint,p_price bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE result uuid; BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor']);
 IF p_qty IS NULL OR p_qty<=0 OR p_price IS NULL OR p_price<=0 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p_seller AND can_sell) THEN
  RAISE EXCEPTION 'Sai phương án' USING HINT='ck_command_payload'; END IF;
 INSERT INTO core.sourcing_allocations(day_id,seller_org_id,qty_g,unit_price_vnd_per_kg,proposed_by) VALUES(p_day,p_seller,p_qty,p_price,ref.ctx_user()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.approve_allocation(p_alloc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE g core.sourcing_agreements%ROWTYPE; BEGIN
 PERFORM cmd.enter_actor();
 SELECT g2.* INTO g FROM core.sourcing_allocations a JOIN core.sourcing_days d ON d.id=a.day_id JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE a.id=p_alloc;
 PERFORM cmd.require_org(g.buyer_org_id,ARRAY['owner','purchaser']);
 UPDATE core.sourcing_allocations SET status='buyer_approved',buyer_approved_by=ref.ctx_user(),buyer_approved_at=ref.clock_at() WHERE id=p_alloc AND status='proposed';
 IF NOT FOUND THEN RAISE EXCEPTION 'Phương án không ở trạng thái chờ duyệt' USING HINT='ck_command_state'; END IF;
END $$;
CREATE FUNCTION cmd.commit_allocation(p_alloc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE; t core.seller_credit_terms%ROWTYPE; val bigint;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc FOR UPDATE;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 PERFORM cmd.require_org(a.seller_org_id,ARRAY['owner']);
 -- Q25: duyệt từng phương án → phải có bên mua duyệt; trong phạm vi → chỉ khi giá không vượt giới hạn.
 IF NOT (a.status='buyer_approved' OR (a.status='proposed' AND g.sourcing_mode='trong_pham_vi' AND a.unit_price_vnd_per_kg<=g.max_price_vnd_per_kg)) THEN
  RAISE EXCEPTION 'Chưa được bên mua duyệt hoặc vượt phạm vi ủy quyền' USING HINT='ck_sourcing_scope'; END IF;
 -- Nợ quá hạn chặn cam kết mới; trả sau phải nằm trong mức người bán tự cấp.
 IF core.pair_has_overdue(g.buyer_org_id,a.seller_org_id) THEN RAISE EXCEPTION 'Bên mua đang có khoản quá hạn với người bán này' USING HINT='ck_credit_overdue'; END IF;
 SELECT * INTO t FROM core.seller_credit_terms WHERE buyer_org_id=g.buyer_org_id AND seller_org_id=a.seller_org_id;
 val:=ref.div_round(a.qty_g::numeric*a.unit_price_vnd_per_kg,1000);
 IF coalesce(t.pay_after_days,0)>0 AND core.pair_exposure(g.buyer_org_id,a.seller_org_id)+val>coalesce(t.credit_limit_vnd,0) THEN
  RAISE EXCEPTION 'Vượt mức cho nợ người bán đã đặt' USING HINT='ck_credit_limit'; END IF;
 UPDATE core.sourcing_allocations SET status='committed',seller_committed_by=ref.ctx_user(),seller_committed_at=ref.clock_at() WHERE id=a.id;
END $$;
CREATE FUNCTION cmd.request_allocation_change(p_alloc uuid,p_new_qty bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE g core.sourcing_agreements%ROWTYPE; result uuid; BEGIN
 PERFORM cmd.enter_actor();
 SELECT g2.* INTO g FROM core.sourcing_allocations a JOIN core.sourcing_days d ON d.id=a.day_id JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE a.id=p_alloc AND a.status='committed';
 IF g.id IS NULL THEN RAISE EXCEPTION 'Chỉ đổi phân bổ đã cam kết' USING HINT='ck_command_state'; END IF;
 PERFORM cmd.require_org(g.buyer_org_id,ARRAY['owner','purchaser']);
 INSERT INTO core.allocation_changes(allocation_id,new_qty_g,requested_by,requested_at) VALUES(p_alloc,p_new_qty,ref.ctx_user(),ref.clock_at()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.answer_allocation_change(p_change uuid,p_agree boolean,p_cost bigint DEFAULT 0,p_evidence uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE c core.allocation_changes%ROWTYPE; a core.sourcing_allocations%ROWTYPE; BEGIN
 PERFORM cmd.enter_actor();
 SELECT * INTO c FROM core.allocation_changes WHERE id=p_change FOR UPDATE; SELECT * INTO a FROM core.sourcing_allocations WHERE id=c.allocation_id FOR UPDATE;
 PERFORM cmd.require_org(a.seller_org_id,ARRAY['owner']);
 IF c.seller_consented_at IS NOT NULL OR c.rejected_at IS NOT NULL THEN RAISE EXCEPTION 'Đã trả lời' USING HINT='ck_command_state'; END IF;
 IF coalesce(p_cost,0)>0 AND p_evidence IS NULL THEN RAISE EXCEPTION 'Chi phí phải có chứng cứ' USING HINT='ck_command_evidence'; END IF;
 IF p_agree THEN
  UPDATE core.allocation_changes SET seller_consented_by=ref.ctx_user(),seller_consented_at=ref.clock_at(),seller_cost_vnd=coalesce(p_cost,0),cost_evidence_id=p_evidence WHERE id=c.id;
  UPDATE core.sourcing_allocations SET qty_g=c.new_qty_g,status=CASE WHEN c.new_qty_g=0 THEN 'cancelled' ELSE status END WHERE id=a.id AND c.new_qty_g>0;
  UPDATE core.sourcing_allocations SET status='cancelled' WHERE id=a.id AND c.new_qty_g=0;
 ELSE UPDATE core.allocation_changes SET rejected_at=ref.clock_at() WHERE id=c.id; END IF;
END $$;
-- Lượng/giá của phân bổ đã cam kết chỉ đổi qua yêu cầu có người bán đồng ý.
CREATE FUNCTION core.guard_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.status='committed' AND (NEW.qty_g IS DISTINCT FROM OLD.qty_g OR NEW.unit_price_vnd_per_kg IS DISTINCT FROM OLD.unit_price_vnd_per_kg OR NEW.status IN ('cancelled'))
    AND NOT EXISTS(SELECT 1 FROM core.allocation_changes WHERE allocation_id=OLD.id AND seller_consented_at IS NOT NULL AND new_qty_g=CASE WHEN NEW.status='cancelled' THEN 0 ELSE NEW.qty_g END)
    AND NEW.status<>'shortfall' THEN
  RAISE EXCEPTION 'Phân bổ đã cam kết chỉ đổi khi người bán đồng ý' USING HINT='ck_allocation_consent'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_allocation_consent BEFORE UPDATE ON core.sourcing_allocations FOR EACH ROW EXECUTE FUNCTION core.guard_allocation();

INSERT INTO ref.task_kinds(code,label_vi) VALUES('V26','Rà soát người bán giao thiếu 2 lần/30 ngày (không tự trừ uy tín)') ON CONFLICT DO NOTHING;
CREATE FUNCTION cmd.report_shortfall(p_alloc uuid,p_delivered bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; d core.sourcing_days%ROWTYPE; g core.sourcing_agreements%ROWTYPE; result uuid; early boolean; n integer; s ref.sla_policies%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc FOR UPDATE; SELECT * INTO d FROM core.sourcing_days WHERE id=a.day_id; SELECT * INTO g FROM core.sourcing_agreements WHERE id=d.agreement_id;
 PERFORM cmd.require_org(a.seller_org_id,ARRAY['owner']);
 IF a.status<>'committed' OR p_delivered IS NULL OR p_delivered<0 OR p_delivered>=a.qty_g THEN RAISE EXCEPTION 'Sai báo thiếu' USING HINT='ck_command_payload'; END IF;
 early:=ref.clock_at() < (d.delivery_date+coalesce(g.receive_by,'08:00'::time)) AT TIME ZONE 'Asia/Ho_Chi_Minh';
 UPDATE core.sourcing_allocations SET status='shortfall',delivered_qty_g=p_delivered WHERE id=a.id;
 INSERT INTO core.shortfall_events(allocation_id,seller_org_id,buyer_org_id,missing_qty_g,reported_early,at) VALUES(a.id,a.seller_org_id,g.buyer_org_id,a.qty_g-p_delivered,early,ref.clock_at()) RETURNING id INTO result;
 SELECT count(*) INTO n FROM core.shortfall_events WHERE seller_org_id=a.seller_org_id AND cause NOT IN ('phia_ben_mua','bat_kha_khang') AND at>ref.clock_at()-interval '30 days';
 IF n>=2 THEN
  SELECT * INTO s FROM ref.sla_policies ORDER BY priority LIMIT 1;
  INSERT INTO ops.tasks(code,kind,priority,entity,entity_id,required_role,dedup_key,trigger_reason,response_due_at,resolution_due_at,next_update_at)
  VALUES('TASK-'||gen_random_uuid(),'V26',s.priority,'organization',a.seller_org_id,'supervisor','GT:'||a.seller_org_id||':'||to_char(ref.clock_at(),'YYYY-MM'),
   'Người bán giao thiếu '||n||' lần trong 30 ngày: rà soát, cho giải trình',ref.clock_at()+s.response_minutes*interval '1 minute',ref.clock_at()+s.resolution_minutes*interval '1 minute',ref.clock_at()+s.update_minutes*interval '1 minute')
  ON CONFLICT (dedup_key) DO NOTHING;
 END IF;
 RETURN result;
END $$;
CREATE FUNCTION cmd.stop_sourcing(p_agreement uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE g core.sourcing_agreements%ROWTYPE; n integer; BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO g FROM core.sourcing_agreements WHERE id=p_agreement FOR UPDATE;
 PERFORM cmd.require_org(g.buyer_org_id,ARRAY['owner','purchaser']);
 UPDATE core.sourcing_agreements SET status='stopped',stopped_at=ref.clock_at() WHERE id=g.id AND status='active';
 UPDATE core.sourcing_forecasts SET cancelled_at=ref.clock_at() WHERE agreement_id=g.id AND cancelled_at IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n; -- dự kiến bị hủy; phân bổ đã cam kết vẫn giữ (đổi qua yêu cầu có người bán đồng ý)
END $$;

REVOKE ALL ON FUNCTION cmd.create_sourcing_agreement(text,uuid,jsonb,text[],boolean,text,bigint,time),cmd.confirm_sourcing_day(uuid,date,bigint),
 cmd.set_credit_terms(uuid,integer,bigint),cmd.propose_allocation(uuid,uuid,bigint,bigint),cmd.approve_allocation(uuid),cmd.commit_allocation(uuid),
 cmd.request_allocation_change(uuid,bigint),cmd.answer_allocation_change(uuid,boolean,bigint,uuid),cmd.report_shortfall(uuid,bigint),cmd.stop_sourcing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.create_sourcing_agreement(text,uuid,jsonb,text[],boolean,text,bigint,time),cmd.confirm_sourcing_day(uuid,date,bigint),
 cmd.set_credit_terms(uuid,integer,bigint),cmd.propose_allocation(uuid,uuid,bigint,bigint),cmd.approve_allocation(uuid),cmd.commit_allocation(uuid),
 cmd.request_allocation_change(uuid,bigint),cmd.answer_allocation_change(uuid,boolean,bigint,uuid),cmd.report_shortfall(uuid,bigint),cmd.stop_sourcing(uuid) TO agiviet_app;
