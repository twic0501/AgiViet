-- RLS và command của app lấy danh tính từ login đã ánh xạ; SET app.* chỉ dành owner fixtures/nội bộ.
CREATE OR REPLACE FUNCTION ref.ctx_user() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN current_setting('role',true)='agiviet_app' OR pg_has_role(session_user,'agiviet_app','MEMBER') AND session_user<>current_user
 THEN (SELECT user_id FROM cmd.login_principals WHERE login_name=session_user AND active)
 ELSE nullif(current_setting('app.user_id',true),'')::uuid END
$$;
CREATE OR REPLACE FUNCTION ref.ctx_org() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN current_setting('role',true)='agiviet_app' OR pg_has_role(session_user,'agiviet_app','MEMBER') AND session_user<>current_user
 THEN (SELECT org_id FROM cmd.login_principals WHERE login_name=session_user AND active)
 ELSE nullif(current_setting('app.org_id',true),'')::uuid END
$$;
CREATE OR REPLACE FUNCTION ref.ctx_actor() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN current_setting('role',true)='agiviet_app' OR pg_has_role(session_user,'agiviet_app','MEMBER') AND session_user<>current_user
 THEN coalesce((SELECT actor_kind FROM cmd.login_principals WHERE login_name=session_user AND active),'unknown')
 ELSE coalesce(nullif(current_setting('app.actor_kind',true),''),'unknown') END
$$;
-- Không sử dụng app.test_time để tua clock ở login runtime.
CREATE OR REPLACE FUNCTION ref.clock_at() RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT CASE WHEN current_setting('role',true) IN ('agiviet_app','agiviet_bank_worker','agiviet_auth_worker')
 OR session_user<>current_user THEN now() ELSE coalesce(nullif(current_setting('app.test_time',true),'')::timestamptz,now()) END
$$;
