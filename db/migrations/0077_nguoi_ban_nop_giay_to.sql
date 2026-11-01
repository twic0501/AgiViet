-- Người bán tự nộp / cập nhật giấy tờ (VietGAP, mã vùng trồng, nhật ký, kết quả kiểm…) từ app.
-- Giấy tờ nộp ở trạng thái CHỜ NHÂN VIÊN ĐỐI CHIẾU (verified_at NULL); chỉ nhân viên mới xác nhận được.
ALTER TABLE core.certifications ADD COLUMN evidence_document_id uuid REFERENCES core.documents;
ALTER TABLE core.certifications ADD COLUMN submitted_by uuid REFERENCES core.users;
COMMENT ON COLUMN core.certifications.evidence_document_id IS 'Ảnh/tệp giấy tờ người bán chụp khi nộp';
COMMENT ON COLUMN core.certifications.submitted_by IS 'Người nộp từ app (NULL = nhân viên nhập)';

CREATE FUNCTION cmd.submit_certification(p_kind text, p_number text, p_market text, p_valid_to date, p_evidence uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE me uuid; site uuid; result uuid;
BEGIN
 PERFORM cmd.enter_actor();
 me := ref.ctx_org();
 PERFORM cmd.require_org(me, ARRAY['owner','coop_board']);
 IF NOT EXISTS(SELECT 1 FROM ref.document_kinds WHERE code=p_kind) THEN RAISE EXCEPTION 'Loại giấy tờ không có' USING HINT='DU_LIEU_KHONG_HOP_LE'; END IF;
 IF p_evidence IS NULL THEN RAISE EXCEPTION 'Cần ảnh giấy tờ' USING HINT='DU_LIEU_KHONG_HOP_LE'; END IF;
 IF p_valid_to IS NOT NULL AND p_valid_to < (ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN RAISE EXCEPTION 'Giấy tờ đã hết hạn' USING HINT='DU_LIEU_KHONG_HOP_LE'; END IF;
 SELECT id INTO site FROM core.production_sites WHERE org_id=me ORDER BY created_at LIMIT 1;
 INSERT INTO core.certifications(org_id, site_id, kind, number, market, valid_during, evidence_document_id, submitted_by, created_at)
 VALUES(me, site, p_kind, nullif(btrim(p_number),''), nullif(btrim(p_market),''),
   daterange((ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, CASE WHEN p_valid_to IS NULL THEN NULL ELSE p_valid_to + 1 END, '[)'),
   p_evidence, ref.ctx_user(), ref.clock_at()) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION cmd.submit_certification(text,text,text,date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.submit_certification(text,text,text,date,uuid) TO agiviet_app;

CREATE FUNCTION core.certifications_of(p_org uuid) RETURNS SETOF core.certifications LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT * FROM core.certifications WHERE org_id=p_org AND revoked_at IS NULL ORDER BY created_at DESC
$$;
COMMENT ON FUNCTION core.certifications_of(uuid) IS 'Giấy tờ của một tổ chức (đã xác minh và chờ xác minh); backend truyền tổ chức đang thao tác.';
