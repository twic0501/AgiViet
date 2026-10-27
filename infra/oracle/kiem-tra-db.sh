#!/usr/bin/env bash
# Owner kiểm ACL/checksum; gateway kiểm TCP và SET ROLE. Không ghi nghiệp vụ.
set -euo pipefail
[[ "${1:-}" == '' || "${1:-}" == --acl-only ]] || exit 2
psql -v ON_ERROR_STOP=1 -X -q <<'SQL'
DO $$ DECLARE r record; BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='agv_backend_gateway' AND rolcanlogin
   AND NOT (rolsuper OR rolinherit OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN
   RAISE EXCEPTION 'Gateway phải LOGIN NOINHERIT, không đặc quyền quản trị'; END IF;
 IF pg_has_role('agv_backend_gateway','agiviet_owner','MEMBER')
   OR has_table_privilege('agv_backend_gateway','cmd.login_principals','INSERT')
   OR has_table_privilege('agv_backend_gateway','ledger.entries','INSERT')
   OR has_table_privilege('agv_backend_gateway','core.orders','UPDATE') THEN
   RAISE EXCEPTION 'Gateway có quyền trực tiếp ngoài hợp đồng'; END IF;
 IF has_table_privilege('agv_backend_read','core.orders','UPDATE')
   OR has_table_privilege('agiviet_app','cmd.login_principals','INSERT')
   OR has_table_privilege('agiviet_app','ledger.entries','INSERT')
   OR has_function_privilege('agiviet_app','cmd.insert_row(regclass,jsonb,text[])','EXECUTE') THEN
   RAISE EXCEPTION 'App/reader có quyền ghi trực tiếp hoặc helper nội bộ'; END IF;
 FOR r IN SELECT unnest(ARRAY['agv_backend_read','agv_backend_meta','agv_backend_broker','agv_backend_auth','agv_backend_bank']) AS n LOOP
   IF NOT pg_has_role('agv_backend_gateway',r.n,'SET') OR pg_has_role('agv_backend_gateway',r.n,'USAGE') THEN
     RAISE EXCEPTION 'Cổng thiếu SET hoặc đang kế thừa vai %',r.n; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT FROM public.schema_migrations WHERE name='0053_dong_ho_nghiep_vu_tranh_chap.sql') THEN
   RAISE EXCEPTION 'Chưa đến migration 0053'; END IF;
 FOR r IN SELECT login_name FROM cmd.login_principals WHERE active LOOP
   IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname=r.login_name) THEN
     RAISE EXCEPTION 'Thiếu role principal % sau restore/provision',r.login_name; END IF;
   IF EXISTS(SELECT FROM pg_roles WHERE rolname=r.login_name
      AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
      OR pg_has_role(r.login_name,'agiviet_owner','MEMBER') THEN
     RAISE EXCEPTION 'Principal % có đặc quyền ngoài hợp đồng',r.login_name; END IF;
   IF NOT pg_has_role('agv_backend_gateway',r.login_name,'SET') THEN
     RAISE EXCEPTION 'Gateway chưa được SET ROLE principal %',r.login_name; END IF;
 END LOOP;
 IF EXISTS(SELECT FROM cmd.test_clock) THEN
   RAISE EXCEPTION 'DB triển khai không được có đồng hồ thử'; END IF;
END $$;
SQL
PGUSER=agv_backend_gateway PGPASSWORD="${AGV_GATEWAY_PASSWORD:?}" psql -v ON_ERROR_STOP=1 -X -q <<'SQL'
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT session_user,current_user;
SET LOCAL ROLE agv_backend_read;
SELECT count(*) AS migration_count FROM public.schema_migrations;
SET LOCAL ROLE agv_backend_auth;
RESET ROLE;
ROLLBACK;
SQL
echo 'Đạt ACL, login gateway TCP và SET LOCAL ROLE. Chưa chứng minh command nhận đúng danh tính.'
# Dùng riêng cho chẩn đoán/provision. Deploy không bao giờ bỏ bước chặn dưới.
if [[ "${1:-}" == --acl-only ]]; then exit 0; fi
psql -v ON_ERROR_STOP=1 -X -q -f "${ORACLE_SCRIPT_DIR:-/oracle}/kiem-tra-cong.sql"
