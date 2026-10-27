-- Chỉ chế độ AGV_RESET_ON_START=1 ở laptop. Theo backend/scripts/test-pg.mjs.
DO $$ BEGIN
  IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='agv_backend_clock') THEN
    CREATE ROLE agv_backend_clock NOLOGIN NOSUPERUSER BYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA cmd TO agv_backend_clock;
GRANT SELECT,INSERT,UPDATE ON cmd.test_clock TO agv_backend_clock;
GRANT agv_backend_clock TO agv_backend_gateway WITH INHERIT FALSE;
