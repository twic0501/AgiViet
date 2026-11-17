-- 0090: Tem thời gian RFC 3161 cho từng chữ ký. Sau khi một bên ký (OTP), backend băm bản ghi chữ ký
-- (tài liệu + bên ký + phương thức + giờ ký) rồi xin tem của TSA bên thứ ba. Tem chứng minh chữ ký tồn tại
-- trước giờ trên tem và hồ sơ chưa bị sửa từ đó; AgiViet không tự sửa được. Chỉ ghi thêm, không sửa/xóa.
CREATE TABLE core.signature_timestamps (
  signature_id uuid PRIMARY KEY REFERENCES core.signatures (id),
  imprint      bytea NOT NULL CHECK (length(imprint) = 32),   -- SHA-256 đã gửi TSA
  tsa_url      text NOT NULL,
  gen_time     timestamptz,                                     -- giờ trong tem
  token        bytea NOT NULL,                                  -- TimeStampResp nguyên bản (kiểm bằng openssl ts -verify)
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE core.signature_timestamps IS 'Tem thời gian RFC 3161 của chữ ký (append-only).';
ALTER TABLE core.signature_timestamps ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_signature_timestamps_immutable BEFORE UPDATE OR DELETE ON core.signature_timestamps
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- Ghi tem: chỉ cho chữ ký có thật và imprint phải đúng băm của bản ghi chữ ký (backend không ghi bừa được).
CREATE OR REPLACE FUNCTION cmd.record_signature_timestamp(p_sig uuid, p_imprint bytea, p_url text, p_time timestamptz, p_token bytea)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,public AS $$
DECLARE s core.signatures%ROWTYPE;
BEGIN
 SELECT * INTO s FROM core.signatures WHERE id=p_sig;
 IF s.id IS NULL THEN RAISE EXCEPTION 'Không có chữ ký' USING HINT='ck_not_found'; END IF;
 IF p_imprint <> core.signature_imprint(p_sig) THEN RAISE EXCEPTION 'Mã băm không khớp chữ ký' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.signature_timestamps(signature_id,imprint,tsa_url,gen_time,token) VALUES (p_sig,p_imprint,p_url,p_time,p_token)
 ON CONFLICT (signature_id) DO NOTHING;
END $$;

-- Mã băm chuẩn của một chữ ký: ai cũng dựng lại được từ dữ liệu công khai trên trang xác minh.
CREATE OR REPLACE FUNCTION core.signature_imprint(p_sig uuid) RETURNS bytea
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,public AS $$
 SELECT sha256(convert_to(concat_ws('|', 'agiviet-sig-v1', encode(s.signed_sha256,'hex'), s.party, s.method,
   to_char(s.signed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), s.id::text), 'UTF8'))
 FROM core.signatures s WHERE s.id=p_sig $$;

-- Đọc tem của một tài liệu (quyền xem tài liệu do backend kiểm trước khi gọi).
CREATE OR REPLACE FUNCTION core.document_timestamps(p_doc uuid)
RETURNS TABLE(signature_id uuid, party text, gen_time timestamptz, tsa_url text, imprint_hex text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,public AS $$
 SELECT t.signature_id, s.party, t.gen_time, t.tsa_url, encode(t.imprint,'hex')
 FROM core.signature_timestamps t JOIN core.signatures s ON s.id=t.signature_id WHERE s.document_id=p_doc ORDER BY t.gen_time $$;

REVOKE ALL ON FUNCTION cmd.record_signature_timestamp(uuid,bytea,text,timestamptz,bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.record_signature_timestamp(uuid,bytea,text,timestamptz,bytea) TO agiviet_app, agiviet_orchestrator;
REVOKE ALL ON FUNCTION core.signature_imprint(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.signature_imprint(uuid) TO agiviet_app, agiviet_orchestrator;
REVOKE ALL ON FUNCTION core.document_timestamps(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.document_timestamps(uuid) TO agiviet_app, agiviet_orchestrator;

-- Chữ ký của các tài liệu thuộc đơn mà chưa có tem (worker hệ thống dùng sau khi ký).
CREATE OR REPLACE FUNCTION core.untimestamped_signatures(p_order uuid) RETURNS TABLE(id uuid, imprint_hex text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,public AS $$
 SELECT s.id, encode(core.signature_imprint(s.id),'hex') FROM core.signatures s JOIN core.documents d ON d.id=s.document_id
 WHERE d.order_id=p_order AND NOT EXISTS (SELECT 1 FROM core.signature_timestamps x WHERE x.signature_id=s.id) $$;
REVOKE ALL ON FUNCTION core.untimestamped_signatures(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.untimestamped_signatures(uuid) TO agiviet_app, agiviet_orchestrator;
