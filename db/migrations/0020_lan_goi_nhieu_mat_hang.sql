-- Lần gọi hàng khung có nhiều món: tiền là tổng dòng, không ép thành một mặt hàng giả.
ALTER TABLE core.order_versions ADD COLUMN value_basis text NOT NULL DEFAULT 'single_product' CHECK(value_basis IN ('single_product','lines'));
COMMENT ON COLUMN core.order_versions.value_basis IS 'Cơ sở giá trị: một mặt hàng theo lượng nhân giá, hoặc tổng nhiều dòng của lần gọi hàng khung.';
ALTER TABLE core.order_versions DROP CONSTRAINT ck_ov_contract_value;
ALTER TABLE core.order_versions ADD CONSTRAINT ck_ov_contract_value CHECK(value_basis='lines' OR contract_value_vnd=ref.div_round(qty_min::numeric*unit_price_vnd,price_unit_base_qty));
ALTER TABLE core.order_versions DROP CONSTRAINT ck_ov_deposit_basis;
ALTER TABLE core.order_versions ADD CONSTRAINT ck_ov_deposit_basis CHECK(value_basis='lines' OR deposit_basis_vnd=ref.div_round(qty_min::numeric*deposit_price_vnd,price_unit_base_qty));
ALTER TABLE core.order_lines ADD COLUMN profile_version integer NOT NULL DEFAULT 1;
ALTER TABLE core.order_lines ADD FOREIGN KEY(product_id,profile_version,grade_code) REFERENCES core.product_grades(product_id,profile_version,grade_code);
ALTER TABLE core.order_lines ADD COLUMN write_xid xid8 NOT NULL DEFAULT pg_current_xact_id();
COMMENT ON COLUMN core.order_lines.profile_version IS 'Phiên bản hồ sơ của đúng mặt hàng trên dòng; hợp đồng khung có thể nhiều mặt hàng.';
COMMENT ON COLUMN core.order_lines.write_xid IS 'Giao dịch tạo dòng; chỉ thêm dòng cùng giao dịch tạo phiên bản.';
ALTER TABLE core.order_versions ADD COLUMN write_xid xid8 NOT NULL DEFAULT pg_current_xact_id();
COMMENT ON COLUMN core.order_versions.write_xid IS 'Giao dịch tạo phiên bản để đóng cấu trúc các dòng sau COMMIT.';
ALTER TABLE core.acceptance_lines ADD COLUMN order_line_no smallint;
COMMENT ON COLUMN core.acceptance_lines.order_line_no IS 'Số dòng hợp đồng cho lần gọi hàng nhiều món; xác định đơn giá và hồ sơ áp dụng.';
CREATE FUNCTION core.check_order_lines_total() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE oid uuid; ver integer; v core.order_versions%ROWTYPE; total numeric; qty numeric;
BEGIN
 oid:=NEW.order_id; ver:=NEW.version_no; SELECT * INTO v FROM core.order_versions WHERE order_id=oid AND version_no=ver;
 IF v.value_basis<>'lines' THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.orders WHERE id=oid AND contract_type='framework_calloff') OR v.deposit_rule<>'none' OR v.deposit_basis_vnd<>v.contract_value_vnd THEN
 RAISE EXCEPTION 'Tổng dòng chỉ cho lần gọi hàng khung không cọc riêng' USING HINT='ck_order_lines_basis'; END IF;
 SELECT sum(line_value_vnd),sum(l.qty) INTO total,qty FROM core.order_lines l WHERE order_id=oid AND version_no=ver;
 IF total IS DISTINCT FROM v.contract_value_vnd::numeric OR qty IS DISTINCT FROM v.qty_min::numeric THEN RAISE EXCEPTION 'Tổng dòng không khớp phiên bản gọi hàng' USING HINT='ck_order_lines_total'; END IF;
 RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER order_lines_total AFTER INSERT ON core.order_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION core.check_order_lines_total();
CREATE CONSTRAINT TRIGGER order_lines_total AFTER INSERT ON core.order_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION core.check_order_lines_total();
CREATE FUNCTION core.guard_new_order_line() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=NEW.order_id AND version_no=NEW.version_no AND write_xid=pg_current_xact_id()) THEN RAISE EXCEPTION 'Phiên bản đã đóng cấu trúc dòng' USING HINT='ck_order_lines_sealed'; END IF;
 IF NEW.downgrade_price_vnd IS NOT NULL AND NEW.downgrade_price_vnd NOT BETWEEN 0 AND NEW.unit_price_vnd-1 THEN RAISE EXCEPTION 'Giá hạ cấp không hợp lệ' USING HINT='ck_order_line_price'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_line BEFORE INSERT ON core.order_lines FOR EACH ROW EXECUTE FUNCTION core.guard_new_order_line();
-- Nhánh riêng cho nghiệm thu nhiều món; nhánh một mặt hàng giữ kiểm tra cỡ/ẩm của 0013.
ALTER FUNCTION core.guard_acceptance() RENAME TO guard_acceptance_single;
-- Hàm trigger không thể gọi trực tiếp; dùng hai trigger có WHEN để chọn nhánh.
DROP TRIGGER a_values ON core.acceptance_lines;
CREATE FUNCTION core.is_calloff_acceptance(p_acceptance uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT o.contract_type='framework_calloff' FROM core.acceptance_versions a JOIN core.deliveries d ON d.id=a.delivery_id JOIN core.orders o ON o.id=d.order_id WHERE a.id=p_acceptance
$$;
CREATE TRIGGER a_values_single BEFORE INSERT ON core.acceptance_lines FOR EACH ROW WHEN (NOT core.is_calloff_acceptance(NEW.acceptance_id)) EXECUTE FUNCTION core.guard_acceptance_single();
CREATE FUNCTION core.guard_acceptance_calloff() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; l core.order_lines%ROWTYPE; o core.orders%ROWTYPE; p core.lots%ROWTYPE;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=NEW.acceptance_id;
 IF a.write_xid<>pg_current_xact_id() THEN RAISE EXCEPTION 'Phiên bản nghiệm thu đã đóng' USING HINT='ck_acceptance_sealed'; END IF;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id; SELECT * INTO o FROM core.orders WHERE id=d.order_id;
 SELECT * INTO l FROM core.order_lines WHERE order_id=d.order_id AND version_no=d.version_no AND line_no=NEW.order_line_no;
 SELECT * INTO p FROM core.lots WHERE id=NEW.lot_id;
 IF l.line_no IS NULL OR l.product_id<>p.product_id OR p.seller_org_id<>o.seller_org_id THEN RAISE EXCEPTION 'Sai dòng mặt hàng gọi hàng' USING HINT='ck_acceptance_lot'; END IF;
 IF NEW.kind NOT IN ('accepted','downgraded','rejected') OR (NEW.kind<>'rejected' AND NEW.payable_qty<>NEW.qty) OR
 (NEW.kind='accepted' AND NEW.unit_price_vnd<>l.unit_price_vnd) OR (NEW.kind='downgraded' AND NEW.unit_price_vnd IS DISTINCT FROM l.downgrade_price_vnd) THEN RAISE EXCEPTION 'Sai giá nghiệm thu theo dòng đã ký' USING HINT='ck_acceptance_price'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_values_calloff BEFORE INSERT ON core.acceptance_lines FOR EACH ROW WHEN (core.is_calloff_acceptance(NEW.acceptance_id)) EXECUTE FUNCTION core.guard_acceptance_calloff();
CREATE OR REPLACE FUNCTION core.check_effective_version() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE doc uuid; parties text[];
BEGIN
 IF NEW.effective_version_no IS NULL OR NEW.effective_version_no IS NOT DISTINCT FROM OLD.effective_version_no THEN RETURN NEW; END IF;
 IF OLD.effective_version_no IS NOT NULL AND NEW.effective_version_no<OLD.effective_version_no THEN RAISE EXCEPTION 'Không lùi phiên bản hiệu lực' USING HINT='ck_order_version_forward'; END IF;
 SELECT document_id INTO doc FROM core.order_versions WHERE order_id=NEW.id AND version_no=NEW.effective_version_no;
 IF NEW.contract_type='framework_calloff' AND doc IS NULL THEN
 SELECT d.id INTO doc FROM core.documents d JOIN core.framework_contracts f ON f.id=d.entity_id WHERE f.id=NEW.framework_id AND f.status='running' AND f.buyer_org_id=NEW.buyer_org_id AND f.seller_org_id=NEW.seller_org_id AND d.doc_type='framework_contract' AND d.status IN ('fully_signed','effective') ORDER BY d.version_no DESC LIMIT 1;
 END IF;
 SELECT array_agg(DISTINCT party) INTO parties FROM core.signatures WHERE document_id=doc;
 IF doc IS NULL OR parties IS NULL OR NOT parties@>ARRAY['buyer','seller'] THEN RAISE EXCEPTION 'Chưa có điều khoản được hai bên ký' USING HINT='ck_order_version_signed'; END IF;
 RETURN NEW; END $$;
-- Chỉ cộng các lần gọi sắp giao chưa ghi nhận N vào sổ quyền đòi, tránh đếm trùng.
CREATE OR REPLACE VIEW core.v_framework_limits AS
SELECT f.id,f.framework_deposit_vnd+f.extra_credit_vnd allowed_vnd,
 coalesce((SELECT sum(balance_vnd) FROM ledger.v_account_balances WHERE framework_id=f.id AND account_type='seller_receivable'),0)
 +coalesce((SELECT scheduled_vnd FROM core.framework_opening_exposures WHERE framework_id=f.id),0)
 +coalesce((SELECT sum(v.contract_value_vnd) FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.framework_id=f.id AND o.status='active' AND NOT EXISTS(SELECT 1 FROM core.settlements WHERE order_id=o.id)),0) used_vnd
FROM core.framework_contracts f;
