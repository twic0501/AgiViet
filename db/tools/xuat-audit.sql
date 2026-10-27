-- psql -X -qAt -v ON_ERROR_STOP=1 -f db/tools/xuat-audit.sql > audit.jsonl
-- Cần tài khoản kiểm toán đọc được audit/chain. Không GRANT cho backend web.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT jsonb_build_object('seq',c.seq,'audit_id',c.audit_id,'previous_sha256',encode(c.previous_sha256,'hex'),
 'row_sha256',encode(c.row_sha256,'hex'),'row_json',c.row_json)::text
FROM evt.audit_chain c JOIN evt.audit_log a ON a.id=c.audit_id ORDER BY c.seq;
COMMIT;
