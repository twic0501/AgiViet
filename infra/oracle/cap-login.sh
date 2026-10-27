#!/usr/bin/env bash
# Quản trị cấp trước danh tính đã xác thực; không gọi script từ request HTTP.
set -euo pipefail
source "$(dirname "$0")/chung.sh"
user_id="${1:?Cách dùng: cap-login.sh user_uuid org_uuid buyer|seller|helper|ops|inspector|system}"
org_id="${2:?Cần org_uuid}"; actor="${3:?Cần actor}"
[[ "$user_id" =~ ^[a-f0-9-]{36}$ && "$org_id" =~ ^[a-f0-9-]{36}$ ]] || fail 'UUID sai'
case "$actor" in buyer|seller|helper|ops|inspector) prefix=agv_u_; role=agiviet_app;; system) prefix=agv_s_; role=agiviet_orchestrator;; *) fail 'Actor sai';; esac
login="$prefix$(printf '%s' "$user_id|$org_id|$actor" | sha256sum | cut -c1-16)"
operation_lock
dc exec -T db psql -U agiviet_owner -d agiviet -v ON_ERROR_STOP=1 -X -q -v login="$login" -v uid="$user_id" -v oid="$org_id" -v actor="$actor" -v group_role="$role" <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(768503212);
-- FK/membership phải tồn tại, system phải có staff active tại tổ chức nền tảng.
SELECT EXISTS(SELECT FROM core.memberships m JOIN core.users u ON u.id=m.user_id
 JOIN core.organizations o ON o.id=m.org_id WHERE m.user_id=:'uid'::uuid AND m.org_id=:'oid'::uuid
 AND m.status='active' AND u.disabled_at IS NULL AND o.status='active'
 AND (:'actor'<>'system' OR (o.is_platform AND EXISTS(SELECT FROM ops.staff_assignments s WHERE s.user_id=m.user_id AND s.active)))) AS valid \gset
\if :valid
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION', :'login')
WHERE NOT EXISTS(SELECT FROM pg_roles WHERE rolname=:'login') \gexec
SELECT format('GRANT %I TO %I', :'group_role', :'login') \gexec
SELECT format('GRANT %I TO agv_backend_gateway', :'login') \gexec
INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind,active)
 VALUES(:'login',:'uid',:'oid',:'actor',true) ON CONFLICT(login_name) DO NOTHING;
-- Tên login phải luôn giữ nguyên danh tính; không tái ánh xạ một login cũ.
SELECT 1 / (EXISTS(SELECT FROM cmd.login_principals WHERE login_name=:'login'
 AND user_id=:'uid'::uuid AND org_id=:'oid'::uuid AND actor_kind=:'actor' AND active))::int;
\else
DO $$ BEGIN RAISE EXCEPTION 'Danh tính/tổ chức/thành viên/staff không hợp lệ'; END $$;
\endif
COMMIT;
SQL
printf 'Đã cấp principal %s cho gateway SET ROLE. Không đặt password cho principal.\n' "$login"
