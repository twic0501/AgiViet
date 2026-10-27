-- Ràng buộc liên bảng và điều kiện nghiệp vụ tại các điểm chốt.
CREATE FUNCTION core.guard_instruction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d core.deposits%ROWTYPE; seller uuid; buyer uuid; k ref.bank_instruction_kinds%ROWTYPE; s core.settlements%ROWTYPE; a pii.bank_accounts%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deposits WHERE id=NEW.deposit_id FOR UPDATE;
 SELECT * INTO k FROM ref.bank_instruction_kinds WHERE code=NEW.kind;
 IF NEW.order_id IS DISTINCT FROM d.order_id THEN RAISE EXCEPTION 'Lệnh khác đơn của cọc' USING HINT='ck_instruction_order'; END IF;
 IF d.order_id IS NOT NULL THEN SELECT seller_org_id,buyer_org_id INTO seller,buyer FROM core.orders WHERE id=d.order_id;
 ELSE SELECT seller_org_id,buyer_org_id INTO seller,buyer FROM core.framework_contracts WHERE id=d.framework_id; END IF;
 IF NEW.target_org_id IS DISTINCT FROM (CASE WHEN k.target='seller' THEN seller ELSE buyer END) THEN RAISE EXCEPTION 'Sai tổ chức nhận tiền' USING HINT='ck_instruction_target'; END IF;
 IF NEW.target_bank_account_id IS NOT NULL THEN
 SELECT * INTO a FROM pii.bank_accounts WHERE id=NEW.target_bank_account_id;
 IF a.org_id<>NEW.target_org_id OR (a.bank_code,a.account_masked,a.holder_name) IS DISTINCT FROM (NEW.target_bank_code,NEW.target_account_masked,NEW.target_account_holder) THEN
 RAISE EXCEPTION 'Ảnh chụp tài khoản khác đích' USING HINT='ck_instruction_target'; END IF; END IF;
 IF NEW.basis_kind='settlement' THEN
 SELECT * INTO s FROM core.settlements WHERE id=NEW.basis_id;
 IF s.order_id IS DISTINCT FROM NEW.order_id OR NEW.amount_vnd IS DISTINCT FROM (CASE WHEN NEW.kind='release_deposit_to_seller' THEN s.release_vnd WHEN NEW.kind='refund_deposit_to_buyer' THEN s.refund_vnd END) THEN
 RAISE EXCEPTION 'Lệnh không khớp quyết toán' USING HINT='ck_instruction_basis'; END IF;
 ELSIF NEW.basis_kind='cancellation' AND NOT EXISTS(SELECT 1 FROM core.cancellation_requests WHERE id=NEW.basis_id AND order_id=NEW.order_id AND status='processing_money') THEN
 RAISE EXCEPTION 'Thiếu yêu cầu hủy đang xử lý tiền' USING HINT='ck_instruction_basis';
 ELSIF NEW.basis_kind IN ('ops_decision','debt_offset') AND NOT EXISTS(SELECT 1 FROM ops.decisions WHERE id=NEW.basis_id AND proposed_by=NEW.created_by AND approved_by=NEW.approved_by) THEN
 RAISE EXCEPTION 'Thiếu quyết định lập và duyệt' USING HINT='ck_instruction_basis'; END IF;
 IF NEW.is_manual AND (NEW.created_by IS NULL OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.created_by AND active AND role_code='finance') OR
 NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.approved_by AND active AND role_code IN ('finance','supervisor'))) THEN
 RAISE EXCEPTION 'Lệnh thủ công cần hai nhân viên tài chính' USING HINT='ck_instruction_approval'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_basis BEFORE INSERT ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.guard_instruction();
CREATE FUNCTION core.guard_deposit() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE buyer uuid; amount bigint; fee bigint;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.order_id,NEW.framework_id,NEW.payer_org_id,NEW.expected_deposit_vnd,NEW.expected_fee_vnd,NEW.payment_ref,NEW.virtual_account_no,NEW.bank_provider) IS DISTINCT FROM
 (OLD.order_id,OLD.framework_id,OLD.payer_org_id,OLD.expected_deposit_vnd,OLD.expected_fee_vnd,OLD.payment_ref,OLD.virtual_account_no,OLD.bank_provider) THEN
 RAISE EXCEPTION 'Điều chỉnh cọc bằng dòng điều chỉnh' USING HINT='ck_append_only'; END IF;
 IF NEW.order_id IS NOT NULL THEN
 SELECT o.buyer_org_id,v.deposit_vnd,v.fee_vnd INTO buyer,amount,fee FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.id=NEW.order_id;
 ELSE SELECT buyer_org_id,framework_deposit_vnd,0 INTO buyer,amount,fee FROM core.framework_contracts WHERE id=NEW.framework_id; END IF;
 IF buyer IS NULL OR NEW.payer_org_id IS DISTINCT FROM buyer OR NEW.expected_deposit_vnd<>amount OR NEW.expected_fee_vnd<>fee THEN
 RAISE EXCEPTION 'Cọc sai bên trả hoặc điều khoản đã ký' USING HINT='ck_deposit_terms'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_deposit BEFORE INSERT OR UPDATE ON core.deposits FOR EACH ROW EXECUTE FUNCTION core.guard_deposit();
CREATE FUNCTION core.guard_order_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v core.order_versions%ROWTYPE; c numeric; n integer;
BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF NEW.status IN ('awaiting_deposit','active') AND EXISTS(SELECT 1 FROM core.amendments WHERE order_id=NEW.id AND status='open') THEN RAISE EXCEPTION 'Còn đề nghị mở' USING HINT='ck_open_amendment'; END IF;
 IF NEW.status IN ('awaiting_deposit','active') AND NEW.effective_version_no IS NULL THEN RAISE EXCEPTION 'Đơn chưa có phiên bản đủ chữ ký' USING HINT='ck_order_version_signed'; END IF;
 IF NEW.status='active' AND NEW.framework_id IS NULL THEN
 IF NOT EXISTS(SELECT 1 FROM core.deposits WHERE order_id=NEW.id AND status='held') THEN RAISE EXCEPTION 'Chưa có cọc ngân hàng' USING HINT='ck_order_deposit'; END IF;
 END IF;
 IF NEW.status IN ('awaiting_settlement','completed') THEN
 IF NOT EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=NEW.id) OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=NEW.id AND status NOT IN ('closed','shortfall_ended','cancelled')) THEN
 RAISE EXCEPTION 'Còn đợt giao chưa kết thúc' USING HINT='ck_order_delivery'; END IF;
 IF EXISTS(SELECT 1 FROM core.disputes WHERE order_id=NEW.id AND status<>'resolved') THEN RAISE EXCEPTION 'Còn tranh chấp mở' USING HINT='ck_order_dispute'; END IF;
 END IF;
 IF NEW.status='completed' THEN
 IF NOT EXISTS(SELECT 1 FROM core.settlements WHERE order_id=NEW.id AND is_final) THEN RAISE EXCEPTION 'Chưa quyết toán cuối' USING HINT='ck_order_settlement'; END IF;
 IF EXISTS(SELECT 1 FROM core.direct_payments p WHERE p.order_id=NEW.id AND p.status<>'cancelled' AND p.amount_due_vnd<>(SELECT coalesce(sum(amount_vnd),0) FROM core.direct_payment_confirmations WHERE direct_payment_id=p.id)) THEN
 RAISE EXCEPTION 'Còn công nợ' USING HINT='ck_order_debt'; END IF;
 IF EXISTS(SELECT 1 FROM core.bank_instructions WHERE order_id=NEW.id AND status NOT IN ('reconciled','failed')) THEN RAISE EXCEPTION 'Lệnh chưa đối soát' USING HINT='ck_order_reconciled'; END IF;
 SELECT coalesce(sum(balance_vnd),0) INTO c FROM ledger.v_account_balances WHERE order_id=NEW.id AND account_type IN ('seller_receivable','deposit_escrow','deposit_in_instruction','fee_in_instruction');
 IF c<>0 OR EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=NEW.id AND account_type IN ('seller_receivable','deposit_escrow','deposit_in_instruction','fee_in_instruction') AND balance_vnd<>0) THEN
 RAISE EXCEPTION 'Sổ còn dư tiền giữ hoặc quyền đòi' USING HINT='ck_order_money'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER a_lifecycle BEFORE UPDATE OF status ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_order_lifecycle();
CREATE FUNCTION core.guard_settlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE vv numeric; dd numeric; cc numeric; prior numeric; xnb numeric; xbm numeric; mat numeric;
BEGIN
 PERFORM 1 FROM core.orders WHERE id=NEW.order_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM core.settlements WHERE order_id=NEW.order_id AND seq>=NEW.seq) THEN RAISE EXCEPTION 'Thứ tự quyết toán sai' USING HINT='ck_settlement_sequence'; END IF;
 IF NEW.is_final AND (EXISTS(SELECT 1 FROM core.disputes WHERE order_id=NEW.order_id AND status<>'resolved') OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=NEW.order_id AND status NOT IN ('closed','shortfall_ended','cancelled'))) THEN
 RAISE EXCEPTION 'Chưa kết thúc giao nhận, chỉ quyết toán tạm' USING HINT='ck_settlement_final'; END IF;
 SELECT coalesce(sum(al.value_vnd),0) INTO vv FROM core.acceptance_lines al JOIN core.acceptance_versions av ON av.id=al.acceptance_id JOIN core.deliveries d ON d.id=av.delivery_id
 WHERE d.order_id=NEW.order_id AND (al.status='closed' OR (NOT NEW.is_final AND al.status='disputed'))
 AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions newer WHERE newer.delivery_id=d.id AND newer.version_no>av.version_no)
 AND NOT EXISTS(SELECT 1 FROM core.acceptance_lines newer WHERE newer.replaces_line_id=al.id);
 SELECT coalesce(sum(c.amount_vnd),0) INTO dd FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.order_id=NEW.order_id AND p.direction='buyer_to_seller' AND p.kind IN ('goods_before_loading','goods_on_receipt','goods_after_days','goods_extra','goods_batch');
 SELECT coalesce(sum(balance_vnd),0) INTO cc FROM ledger.v_account_balances WHERE order_id=NEW.order_id AND account_type IN ('deposit_escrow','deposit_in_instruction');
 SELECT coalesce(sum(amount_vnd),0) INTO prior FROM core.bank_instructions WHERE order_id=NEW.order_id AND kind='release_deposit_to_seller' AND status IN ('succeeded','reconciled');
 cc:=cc+prior;
 SELECT coalesce(sum(amount_vnd) FILTER(WHERE payer_side='seller' AND kind<>'materials_offset'),0),coalesce(sum(amount_vnd) FILTER(WHERE payer_side='buyer' AND kind<>'materials_offset'),0),coalesce(sum(amount_vnd) FILTER(WHERE kind='materials_offset'),0) INTO xnb,xbm,mat FROM core.contract_charges WHERE order_id=NEW.order_id;
 IF (NEW.v_vnd,NEW.d_vnd,NEW.c_vnd,NEW.prior_released_vnd,NEW.x_nb_vnd,NEW.x_bm_vnd,NEW.materials_offset_vnd) IS DISTINCT FROM (vv,dd,cc,prior,xnb,xbm,mat) THEN
 RAISE EXCEPTION 'Đầu vào quyết toán không khớp chứng cứ và sổ tiền' USING HINT='ck_settlement_inputs'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_inputs BEFORE INSERT ON core.settlements FOR EACH ROW EXECUTE FUNCTION core.guard_settlement();

-- Nội dung dòng nghiệm thu đóng băng, đúng đơn giá đã ký; lượng quy đổi riêng với lượng cân.
ALTER TABLE core.acceptance_versions ADD COLUMN write_xid xid8 NOT NULL DEFAULT pg_current_xact_id();
CREATE FUNCTION core.guard_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; v core.order_versions%ROWTYPE; o core.orders%ROWTYPE; p core.lots%ROWTYPE; valid_price boolean;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=NEW.acceptance_id;
 IF a.write_xid<>pg_current_xact_id() THEN RAISE EXCEPTION 'Phiên bản nghiệm thu đã đóng' USING HINT='ck_acceptance_sealed'; END IF;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id; SELECT * INTO o FROM core.orders WHERE id=d.order_id;
 SELECT * INTO v FROM core.order_versions WHERE order_id=d.order_id AND version_no=d.version_no;
 SELECT * INTO p FROM core.lots WHERE id=NEW.lot_id;
 IF p.seller_org_id<>o.seller_org_id OR p.product_id<>o.product_id THEN RAISE EXCEPTION 'Dòng khác lô của đơn' USING HINT='ck_acceptance_lot'; END IF;
 IF NEW.kind IN ('accepted','transit_damage') AND NEW.unit_price_vnd<>v.unit_price_vnd THEN RAISE EXCEPTION 'Không được sửa giá khi giao' USING HINT='ck_acceptance_price'; END IF;
 IF NEW.kind='downgraded' AND NEW.unit_price_vnd IS DISTINCT FROM v.downgrade_price_vnd THEN RAISE EXCEPTION 'Sai giá hạ cấp đã ký' USING HINT='ck_acceptance_price'; END IF;
 IF NEW.kind='transit_damage' AND v.acceptance_point NOT IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom') THEN RAISE EXCEPTION 'Rủi ro đường thuộc người bán' USING HINT='ck_acceptance_risk'; END IF;
 IF NEW.kind<>'table_adjustment' AND NEW.kind<>'rejected' AND NEW.payable_qty<>NEW.qty THEN RAISE EXCEPTION 'Lượng tính tiền khác lượng cân' USING HINT='ck_acceptance_qty'; END IF;
 IF NEW.kind='table_adjustment' THEN
 IF v.price_mode='size_table' THEN
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(v.size_price_table) t WHERE (NEW.measurements->>'sample_size')::numeric BETWEEN (t->>'from')::numeric AND (t->>'to')::numeric AND NEW.unit_price_vnd=(t->>'price')::bigint) INTO valid_price;
 IF NOT coalesce(valid_price,false) OR NEW.payable_qty<>NEW.qty THEN RAISE EXCEPTION 'Sai bảng cỡ' USING HINT='ck_acceptance_table'; END IF;
 ELSIF v.price_mode='moisture' THEN
 IF NEW.unit_price_vnd<>v.unit_price_vnd OR (NEW.measurements->>'moisture_bps')::integer NOT BETWEEN 0 AND 9999 OR NEW.payable_qty IS DISTINCT FROM ref.div_round(NEW.qty::numeric*(10000-(NEW.measurements->>'moisture_bps')::integer),10000-v.moisture_std_bps) THEN
 RAISE EXCEPTION 'Sai quy đổi độ ẩm' USING HINT='ck_acceptance_moisture'; END IF;
 ELSE RAISE EXCEPTION 'Không có bảng điều chỉnh đã ký' USING HINT='ck_acceptance_table'; END IF;
 END IF;
 IF NEW.kind IN ('downgraded','rejected') AND NOT EXISTS(SELECT 1 FROM core.product_reject_reasons WHERE product_id=p.product_id AND profile_version=p.profile_version AND reason_code=NEW.reason_code) THEN RAISE EXCEPTION 'Lý do sai danh mục' USING HINT='ck_acceptance_reason'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_values BEFORE INSERT ON core.acceptance_lines FOR EACH ROW EXECUTE FUNCTION core.guard_acceptance();
CREATE FUNCTION core.check_acceptance_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a uuid; rejected numeric; total bigint; bps integer;
BEGIN
 a:=NEW.id; SELECT weighed_qty INTO total FROM core.acceptance_versions WHERE id=a;
 SELECT v.reject_allowance_bps INTO bps FROM core.acceptance_versions av JOIN core.deliveries d ON d.id=av.delivery_id JOIN core.order_versions v ON v.order_id=d.order_id AND v.version_no=d.version_no WHERE av.id=a;
 SELECT coalesce(sum(qty),0) INTO rejected FROM core.acceptance_lines WHERE acceptance_id=a AND kind='rejected';
 IF rejected*10000>total::numeric*bps AND EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a AND kind='rejected' AND evidence_document_id IS NULL) THEN RAISE EXCEPTION 'Trả hàng vượt ngưỡng cần ảnh' USING HINT='ck_acceptance_evidence'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER acceptance_evidence AFTER INSERT ON core.acceptance_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION core.check_acceptance_evidence();
CREATE FUNCTION core.guard_storage() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE booked bigint; total numeric;
BEGIN
 SELECT reserved_qty INTO booked FROM core.storage_bookings WHERE id=NEW.booking_id FOR UPDATE;
 SELECT coalesce(sum(CASE WHEN kind='in' THEN qty ELSE -qty END),0) INTO total FROM core.storage_movements WHERE booking_id=NEW.booking_id;
 IF (total+CASE WHEN NEW.kind='in' THEN NEW.qty ELSE -NEW.qty END) NOT BETWEEN 0 AND booked THEN RAISE EXCEPTION 'Kho âm hoặc vượt lượng đặt' USING HINT='ck_storage_qty'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_balance BEFORE INSERT ON core.storage_movements FOR EACH ROW EXECUTE FUNCTION core.guard_storage();
CREATE FUNCTION core.guard_risk_transfer() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; q numeric;
BEGIN
 SELECT o1.* INTO o FROM core.orders o1 JOIN core.deliveries d ON d.order_id=o1.id WHERE d.id=NEW.delivery_id;
 SELECT v1.* INTO v FROM core.order_versions v1 JOIN core.deliveries d ON d.order_id=v1.order_id AND d.version_no=v1.version_no WHERE d.id=NEW.delivery_id;
 SELECT coalesce(sum(l.qty),0) INTO q FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id WHERE a.delivery_id=NEW.delivery_id AND l.status='closed' AND l.kind<>'rejected'
 AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=a.delivery_id AND n.version_no>a.version_no);
 IF NEW.from_org_id<>o.seller_org_id OR NEW.to_org_id<>o.buyer_org_id OR NEW.acceptance_point<>v.acceptance_point OR NEW.qty>q THEN RAISE EXCEPTION 'Chuyển rủi ro sai điều khoản hoặc lượng' USING HINT='ck_risk_transfer'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_risk BEFORE INSERT ON core.risk_transfers FOR EACH ROW EXECUTE FUNCTION core.guard_risk_transfer();
CREATE FUNCTION core.guard_staff_task() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.assigned_to IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=NEW.assigned_to AND active AND role_code IN (NEW.required_role,'supervisor')) THEN RAISE EXCEPTION 'Nhân viên không đúng vai' USING HINT='ck_task_role'; END IF;
 IF NEW.status='done' AND NEW.result_code IS NULL THEN RAISE EXCEPTION 'Xong việc phải có kết quả' USING HINT='ck_task_result'; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_assignment BEFORE INSERT OR UPDATE ON ops.tasks FOR EACH ROW EXECUTE FUNCTION core.guard_staff_task();
