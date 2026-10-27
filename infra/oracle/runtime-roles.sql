-- Owner chạy sau migrations + seed; tái dùng đúng hợp đồng của backend.
-- Không tạo một bộ credential worker song song mà driver không đọc.
\getenv gateway_password AGV_GATEWAY_PASSWORD
BEGIN;
SET LOCAL log_statement = 'none';
SET LOCAL log_min_error_statement = 'panic';
SELECT pg_advisory_xact_lock(768503212);
\i :provision_sql
REVOKE CONNECT,TEMPORARY ON DATABASE agiviet FROM PUBLIC;
GRANT CONNECT ON DATABASE agiviet TO agv_backend_gateway;
-- Driver kiểm count(schema_migrations) trước khi SET ROLE reader lúc khởi động.
GRANT SELECT ON public.schema_migrations TO agv_backend_gateway,agv_backend_read;
ALTER ROLE agv_backend_gateway SET default_transaction_isolation='serializable';
ALTER ROLE agv_backend_gateway SET statement_timeout='15s';
ALTER ROLE agv_backend_gateway SET idle_in_transaction_session_timeout='30s';
COMMIT;
