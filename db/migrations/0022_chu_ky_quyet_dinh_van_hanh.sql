-- LS-3: ký thay bên mua chỉ cho TH-040b, sau im lặng 24 giờ, hai nhân viên khác nhau.
ALTER TABLE core.amendments ADD COLUMN buyer_reply_deadline timestamptz;
ALTER TABLE core.amendments ADD COLUMN buyer_replied_at timestamptz;
COMMENT ON COLUMN core.amendments.buyer_reply_deadline IS 'Hạn phản hồi bên mua, tối thiểu 24 giờ từ tạo đề nghị; điều kiện ký thay TH-040b.';
COMMENT ON COLUMN core.amendments.buyer_replied_at IS 'Thời điểm bên mua đã phản hồi; khác NULL thì không được ký thay do im lặng.';
ALTER TABLE core.signatures ADD COLUMN ops_decision_id uuid REFERENCES ops.decisions(id);
COMMENT ON COLUMN core.signatures.ops_decision_id IS 'Quyết định hai người cho TH-040b; chữ ký mô phỏng AgiViet thay phía buyer, không phải chữ ký cá nhân bên mua.';
ALTER TABLE core.signatures DROP CONSTRAINT ck_sig_method;
ALTER TABLE core.signatures ADD CONSTRAINT ck_sig_method CHECK(method IN ('otp','simulated_digital','onscreen_handwriting','qr_confirm','quyet_dinh_van_hanh'));
ALTER TABLE core.signatures DROP CONSTRAINT ck_sig_digital;
ALTER TABLE core.signatures ADD CONSTRAINT ck_sig_digital CHECK((method IN ('simulated_digital','quyet_dinh_van_hanh'))=(cert_fingerprint IS NOT NULL));
ALTER TABLE core.signatures ADD CONSTRAINT ck_sig_ops_decision CHECK((method='quyet_dinh_van_hanh')=(ops_decision_id IS NOT NULL));
CREATE UNIQUE INDEX uq_signature_ops_decision ON core.signatures(ops_decision_id) WHERE ops_decision_id IS NOT NULL;

CREATE FUNCTION core.guard_operational_signature() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d core.documents%ROWTYPE; a core.amendments%ROWTYPE; q ops.decisions%ROWTYPE;
 o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; p core.order_versions%ROWTYPE;
 ignored text[]:=ARRAY['version_no','amendment_id','document_id','qty_min','qty_max','contract_value_vnd','deposit_basis_vnd','deposit_vnd','fee_vnd','created_at','write_xid'];
BEGIN
 IF NEW.method<>'quyet_dinh_van_hanh' THEN RETURN NEW; END IF;
 SELECT * INTO d FROM core.documents WHERE id=NEW.document_id FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=d.order_id FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE document_id=d.id;
 SELECT * INTO p FROM core.order_versions WHERE order_id=o.id AND version_no=v.version_no-1;
 SELECT * INTO a FROM core.amendments WHERE id=v.amendment_id FOR UPDATE;
 SELECT * INTO q FROM ops.decisions WHERE id=NEW.ops_decision_id;
 IF d.doc_type IS DISTINCT FROM 'annex' OR a.kind IS DISTINCT FROM 'force_majeure_reduction'
  OR a.order_id IS DISTINCT FROM o.id OR a.status IS DISTINCT FROM 'accepted'
  OR a.resulting_version_no IS DISTINCT FROM v.version_no OR p.order_id IS NULL
  OR o.effective_version_no IS DISTINCT FROM p.version_no
  OR a.proposed_by_org_id IS DISTINCT FROM o.seller_org_id
  OR a.buyer_reply_deadline IS NULL OR a.buyer_reply_deadline<a.created_at+interval '24 hours'
  OR ref.clock_at()<a.buyer_reply_deadline OR a.buyer_replied_at IS NOT NULL
  OR EXISTS(SELECT 1 FROM core.signatures WHERE document_id=d.id AND party='buyer')
  OR v.qty_min>=p.qty_min OR v.qty_max>p.qty_max
  OR (to_jsonb(v)-ignored) IS DISTINCT FROM (to_jsonb(p)-ignored)
  OR q.kind IS DISTINCT FROM 'force_majeure_reduction' OR q.entity IS DISTINCT FROM 'amendment'
  OR q.entity_id IS DISTINCT FROM a.id OR q.proposed_by IS NOT DISTINCT FROM q.approved_by
  OR q.created_at<a.buyer_reply_deadline
  OR NOT (q.evidence_document_id=ANY(a.evidence_doc_ids))
  OR NEW.party<>'buyer' OR NEW.signer_user_id IS DISTINCT FROM q.approved_by
  OR ref.ctx_actor()<>'ops' OR ref.ctx_user() IS DISTINCT FROM q.approved_by
  OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=NEW.signer_org_id AND is_platform)
  OR ref.ctx_org() IS DISTINCT FROM NEW.signer_org_id
  OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=q.proposed_by AND active)
  OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=q.approved_by AND active AND role_code IN ('risk','supervisor'))
  OR NEW.signature_value IS NULL OR octet_length(NEW.signature_value)=0
  OR d.canonical_content->>'operational_signature_notice' IS DISTINCT FROM 'ký thay bằng quyết định vận hành '||q.id::text THEN
  RAISE EXCEPTION 'Chỉ ký thay TH-040b giảm lượng bất khả kháng, im lặng 24 giờ, quyết định hai người và ghi rõ mã' USING HINT='ck_operational_signature';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_00_operational BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.guard_operational_signature();
-- Không cho sửa đề nghị sau chữ ký để biến ngoại lệ này thành loại phụ lục khác.
CREATE FUNCTION core.freeze_signed_operational_amendment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM core.order_versions v JOIN core.signatures s ON s.document_id=v.document_id
 WHERE v.amendment_id=OLD.id AND s.method='quyet_dinh_van_hanh') THEN
  RAISE EXCEPTION 'Đề nghị đã được ký thay bằng quyết định vận hành là bất biến' USING HINT='ck_append_only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_00_signed_operational BEFORE UPDATE OR DELETE ON core.amendments FOR EACH ROW EXECUTE FUNCTION core.freeze_signed_operational_amendment();

CREATE OR REPLACE FUNCTION core.guard_signature_party() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE d core.documents%ROWTYPE; o core.orders%ROWTYPE; f core.framework_contracts%ROWTYPE; allowed uuid;
BEGIN
 SELECT * INTO d FROM core.documents WHERE id=NEW.document_id FOR UPDATE;
 IF d.status NOT IN ('awaiting_signature','partially_signed') OR EXISTS(SELECT 1 FROM core.documents WHERE series_key=d.series_key AND version_no>d.version_no) THEN
 RAISE EXCEPTION 'Không ký bản cũ hoặc đã kết thúc' USING HINT='PHIEN_BAN_DA_DOI'; END IF;
 IF NEW.method<>'quyet_dinh_van_hanh' AND NEW.party IN ('buyer','seller') THEN
 IF d.order_id IS NOT NULL THEN SELECT * INTO o FROM core.orders WHERE id=d.order_id; allowed:=CASE WHEN NEW.party='buyer' THEN o.buyer_org_id ELSE o.seller_org_id END;
 ELSIF d.doc_type='framework_contract' THEN SELECT * INTO f FROM core.framework_contracts WHERE id=d.entity_id; allowed:=CASE WHEN NEW.party='buyer' THEN f.buyer_org_id ELSE f.seller_org_id END;
 ELSE allowed:=d.owner_org_id; END IF;
 IF allowed IS NULL OR NEW.signer_org_id IS DISTINCT FROM allowed OR NEW.signer_user_id IS DISTINCT FROM ref.ctx_user() OR ref.ctx_org() IS DISTINCT FROM allowed THEN
 RAISE EXCEPTION 'Chữ ký sai bên' USING HINT='ck_signature_party'; END IF;
 IF NEW.party='seller' AND o.flag_abnormal_price AND NOT ('abnormal_price_ack'=ANY(NEW.statements)) THEN
 RAISE EXCEPTION 'Cần xác nhận giá bất thường' USING HINT='CAN_XAC_NHAN_GIA_BAT_THUONG'; END IF;
 END IF;
 IF NEW.method='simulated_digital' AND NEW.signature_value IS NULL THEN RAISE EXCEPTION 'Thiếu chữ ký mô phỏng' USING HINT='ck_signature_value'; END IF;
 IF NEW.device_id IS NULL THEN RAISE EXCEPTION 'Thiếu thiết bị ký' USING HINT='ck_signature_device'; END IF;
 RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION core.guard_signer_authority() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE value bigint; approved uuid; creator uuid; needs boolean; allowed boolean;
BEGIN
 IF NEW.method='quyet_dinh_van_hanh' THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION core.check_signature() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_doc core.documents%ROWTYPE; v_can_sign boolean;
BEGIN
  SELECT * INTO v_doc FROM core.documents WHERE id = NEW.document_id;
  IF v_doc.content_sha256 <> NEW.signed_sha256 THEN
    RAISE EXCEPTION 'Chữ ký không khớp mã băm nội dung tài liệu % (PHIEN_BAN_DA_DOI)', v_doc.code USING HINT = 'PHIEN_BAN_DA_DOI';
  END IF;
  IF ref.ctx_actor() = 'helper' THEN
    RAISE EXCEPTION 'Người giúp không được ký' USING HINT = 'ck_signature_helper';
  END IF;
  -- Hợp đồng, phụ lục, hợp đồng khung: người ký phải là thành viên đang hoạt động có vai được ký.
  IF NEW.method<>'quyet_dinh_van_hanh' AND v_doc.doc_type IN ('contract','annex','framework_contract') AND NEW.party IN ('buyer','seller') THEN
    SELECT EXISTS (
      SELECT 1 FROM core.memberships m
        JOIN core.membership_roles mr ON mr.membership_id = m.id
        JOIN ref.roles r ON r.code = mr.role_code
       WHERE m.user_id = NEW.signer_user_id AND m.org_id = NEW.signer_org_id
         AND m.status = 'active' AND r.can_sign) INTO v_can_sign;
    IF NOT v_can_sign THEN
      RAISE EXCEPTION 'Người dùng không có quyền ký thay tổ chức' USING HINT = 'ck_signature_role';
    END IF;
  END IF;
  RETURN NEW;
END $$;
