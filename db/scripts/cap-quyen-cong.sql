-- Cấp vai runtime cho backend trên PostgreSQL 17 thật. Provisioner chạy MỘT LẦN bằng owner sau migrations + seed,
-- ngoài request; backend không chạy file này. Mật khẩu login cổng truyền qua psql -v, không ghi vào repo/log:
-- Từ gốc repo:
--   psql "$DATABASE_URL_OWNER" -v ON_ERROR_STOP=1 -v gateway_password="$AGV_GATEWAY_PASSWORD" -f db/scripts/cap-quyen-cong.sql
-- Tương ứng chuanBiRuntime() của PGlite (src/db/co-so-du-lieu.ts) cộng login cổng.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_read') THEN CREATE ROLE agv_backend_read NOLOGIN NOSUPERUSER BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_meta') THEN CREATE ROLE agv_backend_meta NOLOGIN NOSUPERUSER BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_broker') THEN CREATE ROLE agv_backend_broker NOLOGIN NOSUPERUSER BYPASSRLS CREATEROLE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_auth') THEN CREATE ROLE agv_backend_auth NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_bank') THEN CREATE ROLE agv_backend_bank NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  -- Login cổng: NOINHERIT nên không tự có quyền của vai nào; chỉ SET LOCAL ROLE trong giao dịch.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_gateway') THEN CREATE ROLE agv_backend_gateway LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE; END IF;
END $$;
ALTER ROLE agv_backend_gateway LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
ALTER ROLE agv_backend_gateway PASSWORD :'gateway_password';

GRANT agiviet_app,agiviet_orchestrator TO agv_backend_broker WITH ADMIN OPTION;
GRANT agiviet_auth_worker TO agv_backend_auth;
GRANT agiviet_bank_worker TO agv_backend_bank;
GRANT agv_backend_read,agv_backend_meta,agv_backend_broker,agv_backend_auth,agv_backend_bank TO agv_backend_gateway WITH INHERIT FALSE;
-- Broker cấp login danh tính mới cho cổng (GRANT <login> TO agv_backend_gateway).
-- Không GRANT ngược gateway TO broker: tạo vòng membership và PostgreSQL từ chối.
-- Broker có ADMIN trên login do chính nó tạo; đủ để GRANT <login> TO gateway.

GRANT USAGE ON SCHEMA core,pii,ref,ledger,mkt,evt,ops,cmd,app_auth TO agv_backend_read;
GRANT SELECT ON ALL TABLES IN SCHEMA core,pii,ref,ledger,mkt,evt,ops,cmd,app_auth TO agv_backend_read;
GRANT EXECUTE ON FUNCTION ref.clock_at(),core.signature_binding(uuid),core.payment_binding(uuid,bigint),core.invitation_binding(uuid),evt.otp_hash(text,uuid,jsonb) TO agv_backend_read;
GRANT USAGE ON SCHEMA cmd TO agv_backend_broker;
GRANT SELECT,INSERT,UPDATE ON cmd.login_principals TO agv_backend_broker;
GRANT USAGE ON SCHEMA evt,ref TO agv_backend_meta;
GRANT SELECT,INSERT,UPDATE ON evt.idempotency_keys TO agv_backend_meta;
GRANT INSERT,SELECT ON evt.domain_events,evt.outbox TO agv_backend_meta;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA evt TO agv_backend_meta;
GRANT EXECUTE ON FUNCTION ref.ctx_user(),ref.ctx_org(),ref.ctx(text) TO agv_backend_meta;
GRANT EXECUTE ON FUNCTION evt.claim_idempotency(text,text,bytea),evt.emit(text,uuid,text,jsonb,text[]) TO agv_backend_meta;
-- Production: KHÔNG tạo agv_backend_clock và giữ cmd.test_clock rỗng.

-- Login danh tính đã có từ trước (nếu có): cho cổng SET ROLE được.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT login_name FROM cmd.login_principals LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r.login_name) THEN EXECUTE format('GRANT %I TO agv_backend_gateway WITH INHERIT FALSE', r.login_name); END IF;
  END LOOP;
END $$;

-- Backend kiểm số migration ngay sau mở pool, trước SET ROLE. Chỉ đọc metadata.
GRANT USAGE ON SCHEMA public TO agv_backend_gateway;
GRANT SELECT ON public.schema_migrations TO agv_backend_gateway;
-- Chỉ owner provisioner ghi cấu hình 0054; không giao quyền này cho broker.
INSERT INTO cmd.trusted_gateways(login_name,enabled) VALUES('agv_backend_gateway',true)
ON CONFLICT(login_name) DO UPDATE SET enabled=true;
