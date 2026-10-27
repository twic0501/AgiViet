-- Điều khoản của phiên bản phải thuộc đúng hồ sơ, tài liệu và tổ chức đã chọn.
CREATE FUNCTION core.guard_order_version() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE o core.orders%ROWTYPE; d core.documents%ROWTYPE; a pii.bank_accounts%ROWTYPE;
BEGIN
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id FOR UPDATE;
 IF o.status IN ('completed','closed') THEN RAISE EXCEPTION 'Đơn đã kết thúc' USING HINT='ck_order_finished'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.product_profiles WHERE product_id=o.product_id AND profile_version=NEW.profile_version) THEN RAISE EXCEPTION 'Sai hồ sơ sản phẩm của đơn' USING HINT='ck_order_profile'; END IF;
 IF NEW.document_id IS NOT NULL THEN SELECT * INTO d FROM core.documents WHERE id=NEW.document_id;
 IF d.order_id IS DISTINCT FROM o.id OR d.version_no<>NEW.version_no THEN RAISE EXCEPTION 'Tài liệu khác phiên bản đơn' USING HINT='ck_order_document'; END IF; END IF;
 SELECT * INTO a FROM pii.bank_accounts WHERE id=NEW.seller_bank_account_id;
 IF a.org_id<>o.seller_org_id OR a.status<>'active' OR (a.bank_code,a.account_masked,a.holder_name) IS DISTINCT FROM (NEW.seller_bank_code,NEW.seller_account_masked,NEW.seller_account_holder) THEN
 RAISE EXCEPTION 'Sai tài khoản đã chụp của người bán' USING HINT='ck_order_bank'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER a_version_terms BEFORE INSERT ON core.order_versions FOR EACH ROW EXECUTE FUNCTION core.guard_order_version();
CREATE FUNCTION core.guard_signer_authority() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE value bigint; approved uuid; creator uuid; needs boolean; allowed boolean;
BEGIN
 IF NEW.party IN ('buyer','seller') AND EXISTS(SELECT 1 FROM core.documents WHERE id=NEW.document_id AND doc_type IN ('contract','annex','framework_contract')) THEN
 IF NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles mr ON mr.membership_id=m.id JOIN ref.roles r ON r.code=mr.role_code
 WHERE m.user_id=NEW.signer_user_id AND m.org_id=NEW.signer_org_id AND m.status='active' AND r.can_sign AND r.side IN ('both',NEW.party)) THEN
 RAISE EXCEPTION 'Không có quyền ký phía này' USING HINT='ck_signature_role'; END IF;
 END IF;
 IF NEW.party='buyer' THEN
 SELECT v.contract_value_vnd,o.approved_by_user_id,o.created_by_user_id INTO value,approved,creator FROM core.order_versions v JOIN core.orders o ON o.id=v.order_id WHERE v.document_id=NEW.document_id;
 IF value IS NOT NULL THEN
 SELECT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles mr ON mr.membership_id=m.id WHERE m.user_id=NEW.signer_user_id AND m.org_id=NEW.signer_org_id AND m.status='active' AND (mr.role_code='owner' OR m.approval_limit_vnd>=value)) INTO allowed;
 IF NOT allowed AND NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles mr ON mr.membership_id=m.id WHERE m.user_id=approved AND approved<>creator AND m.org_id=NEW.signer_org_id AND m.status='active' AND mr.role_code='owner') THEN
 RAISE EXCEPTION 'Vượt hạn mức, cần quản lý khác người lập duyệt' USING HINT='ck_signature_limit'; END IF; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER b_authority BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.guard_signer_authority();
CREATE FUNCTION core.guard_document_signed_status() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE required text[]; actual text[];
BEGIN
 IF NEW.status IN ('fully_signed','effective') THEN
 SELECT needs_signatures INTO required FROM ref.document_types WHERE code=NEW.doc_type;
 SELECT coalesce(array_agg(DISTINCT party),'{}') INTO actual FROM core.signatures WHERE document_id=NEW.id;
 IF NOT required<@actual THEN RAISE EXCEPTION 'Tài liệu chưa đủ chữ ký' USING HINT='ck_document_signed'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER b_signed BEFORE INSERT OR UPDATE OF status ON core.documents FOR EACH ROW EXECUTE FUNCTION core.guard_document_signed_status();
CREATE FUNCTION core.guard_member_cap() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE cap integer; n integer; is_buyer boolean;
BEGIN
 SELECT can_buy INTO is_buyer FROM core.organizations WHERE id=NEW.org_id FOR UPDATE;
 IF NOT is_buyer OR NEW.status NOT IN ('invited','active') THEN RETURN NEW; END IF;
 SELECT p.max_members INTO cap FROM core.subscriptions s JOIN ref.plans p ON p.code=s.plan_code WHERE s.org_id=NEW.org_id AND s.active_during@>now();
 SELECT count(*) INTO n FROM core.memberships WHERE org_id=NEW.org_id AND status IN ('invited','active') AND id<>NEW.id;
 IF n>=coalesce(cap,1) THEN RAISE EXCEPTION 'Gói hết số thành viên' USING HINT='GOI_HET_THANH_VIEN'; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_member_cap BEFORE INSERT OR UPDATE OF status ON core.memberships FOR EACH ROW EXECUTE FUNCTION core.guard_member_cap();
CREATE FUNCTION ledger.split_settlement(p_v bigint,p_d bigint,p_c bigint,p_x_nb bigint DEFAULT 0,p_x_bm bigint DEFAULT 0,p_prior bigint DEFAULT 0,p_materials bigint DEFAULT 0)
RETURNS TABLE(n_vnd bigint,c_nb_formula_vnd bigint,release_vnd bigint,refund_vnd bigint,t_bm_vnd bigint,t_nb_vnd bigint)
LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN
 IF least(p_v,p_d,p_c,p_x_nb,p_x_bm,p_prior,p_materials)<0 OR p_prior>p_c THEN RAISE EXCEPTION 'Đầu vào quyết toán không hợp lệ'; END IF;
 n_vnd:=p_v-p_x_nb+p_x_bm-p_materials;
 c_nb_formula_vnd:=least(p_c,greatest(0,n_vnd-p_d)); release_vnd:=greatest(0,c_nb_formula_vnd-p_prior);
 refund_vnd:=p_c-p_prior-release_vnd; t_bm_vnd:=greatest(0,n_vnd-p_d-p_c);
 t_nb_vnd:=greatest(0,p_d-n_vnd)+greatest(0,p_prior-c_nb_formula_vnd); RETURN NEXT;
END $$;
COMMENT ON FUNCTION ledger.split_settlement IS 'Công thức quyết toán 04 mục 5-6; chỉ tính số, không tự tạo lệnh hay coi tiền đã nhận.';
-- Khóa từng lần cấp credit trước khi chốt gọi hàng khung.
CREATE FUNCTION core.guard_calloff_limit() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE allowed numeric; used numeric; value bigint;
BEGIN
 IF NEW.status='active' AND OLD.status<>NEW.status AND NEW.framework_id IS NOT NULL THEN
 PERFORM 1 FROM core.framework_contracts WHERE id=NEW.framework_id FOR UPDATE;
 SELECT allowed_vnd,used_vnd INTO allowed,used FROM core.v_framework_limits WHERE id=NEW.framework_id;
 SELECT contract_value_vnd INTO value FROM core.order_versions WHERE order_id=NEW.id AND version_no=NEW.effective_version_no;
 IF used+value>allowed THEN RAISE EXCEPTION 'Khung vượt mức bảo đảm' USING HINT='FRAMEWORK_LIMIT_EXCEEDED'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER b_calloff_limit BEFORE UPDATE OF status ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_calloff_limit();
-- Các hàm mới tuân theo default privileges đã thu hồi PUBLIC ở 0014.
