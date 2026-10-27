-- Bổ sung backend 9–12; không sửa seed, migration cũ hay nghĩa TH-015/051.
CREATE ROLE agiviet_orchestrator NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA cmd,ref,core TO agiviet_orchestrator;
ALTER TABLE cmd.login_principals DROP CONSTRAINT login_principals_actor_kind_check;
ALTER TABLE cmd.login_principals ADD CHECK(actor_kind IN ('buyer','seller','ops','helper','system'));
-- Chỉ quản trị DB thử được bật. Runtime không ghi bảng này, GUC của request không bật được.
CREATE TABLE cmd.test_clock(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), at timestamptz NOT NULL);
REVOKE ALL ON cmd.test_clock FROM PUBLIC,agiviet_app,agiviet_orchestrator,agiviet_bank_worker,agiviet_auth_worker;
CREATE OR REPLACE FUNCTION ref.clock_at() RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT coalesce((SELECT at FROM cmd.test_clock WHERE singleton),
 CASE WHEN current_setting('role',true) IN ('agiviet_app','agiviet_orchestrator','agiviet_bank_worker','agiviet_auth_worker')
 OR session_user<>current_user THEN now() ELSE coalesce(nullif(current_setting('app.test_time',true),'')::timestamptz,now()) END)
$$;
-- RLS và command của app lấy danh tính từ login đã ánh xạ; SET app.* chỉ dành owner fixtures/nội bộ.
CREATE OR REPLACE FUNCTION ref.ctx_user() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN current_setting('role',true) IN ('agiviet_app','agiviet_orchestrator') OR (pg_has_role(session_user,'agiviet_app','MEMBER') OR pg_has_role(session_user,'agiviet_orchestrator','MEMBER')) AND session_user<>current_user
 THEN (SELECT user_id FROM cmd.login_principals WHERE login_name=session_user AND active)
 ELSE nullif(current_setting('app.user_id',true),'')::uuid END
$$;
CREATE OR REPLACE FUNCTION ref.ctx_org() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN current_setting('role',true) IN ('agiviet_app','agiviet_orchestrator') OR (pg_has_role(session_user,'agiviet_app','MEMBER') OR pg_has_role(session_user,'agiviet_orchestrator','MEMBER')) AND session_user<>current_user
 THEN (SELECT org_id FROM cmd.login_principals WHERE login_name=session_user AND active)
 ELSE nullif(current_setting('app.org_id',true),'')::uuid END
$$;
CREATE OR REPLACE FUNCTION ref.ctx_actor() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$
 SELECT CASE WHEN current_setting('role',true) IN ('agiviet_app','agiviet_orchestrator') OR (pg_has_role(session_user,'agiviet_app','MEMBER') OR pg_has_role(session_user,'agiviet_orchestrator','MEMBER')) AND session_user<>current_user
 THEN coalesce((SELECT actor_kind FROM cmd.login_principals WHERE login_name=session_user AND active),'unknown')
 ELSE coalesce(nullif(current_setting('app.actor_kind',true),''),'unknown') END
$$;
CREATE OR REPLACE FUNCTION core.guard_bank_account() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE recent timestamptz;
BEGIN
 IF ref.ctx_actor()='helper' THEN RAISE EXCEPTION 'Người giúp không đổi tài khoản' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF TG_OP='INSERT' THEN
 -- Owner import/test giữ timestamp đã truyền; runtime không được chọn ngày tạo.
 IF session_user<>current_user OR current_setting('role',true) IN ('agiviet_app','agiviet_orchestrator') THEN NEW.created_at:=ref.clock_at(); END IF;
 IF NEW.status='active' AND session_user<>current_user THEN RAISE EXCEPTION 'Tài khoản mới phải chờ' USING HINT='ck_bank_cooldown'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles mr ON mr.membership_id=m.id JOIN ref.roles r ON r.code=mr.role_code WHERE m.user_id=NEW.requested_by AND m.org_id=NEW.org_id AND m.status='active' AND r.can_payout_admin) THEN
 RAISE EXCEPTION 'Không có quyền đổi tài khoản' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT last_recovery_at INTO recent FROM core.users WHERE id=NEW.requested_by;
 NEW.cooldown_until:=NEW.created_at+CASE WHEN recent>=NEW.created_at-interval '7 days' THEN interval '72 hours' ELSE interval '24 hours' END;
 ELSIF NEW.status='active' AND OLD.status<>'active' THEN
 IF NEW.name_match IS DISTINCT FROM true OR NEW.cooldown_until>ref.clock_at() THEN RAISE EXCEPTION 'Chưa hết thời gian chờ hoặc tên không khớp' USING HINT='ck_bank_cooldown'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (NEW.org_id,NEW.bank_code,NEW.account_number_enc,NEW.account_number_hash,NEW.holder_name,NEW.cooldown_until) IS DISTINCT FROM (OLD.org_id,OLD.bank_code,OLD.account_number_enc,OLD.account_number_hash,OLD.holder_name,OLD.cooldown_until) THEN
 RAISE EXCEPTION 'Tạo tài khoản mới để đổi đích' USING HINT='ck_append_only'; END IF;
 RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION pii.stamp_bank_activation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='active' AND (TG_OP='INSERT' OR OLD.status<>'active') THEN NEW.activated_at:=ref.clock_at();
 ELSIF TG_OP='UPDATE' AND NEW.activated_at IS DISTINCT FROM OLD.activated_at THEN
 RAISE EXCEPTION 'Không đổi thời điểm kích hoạt tài khoản' USING HINT='ck_bank_activation'; END IF;
 RETURN NEW;
END $$;

ALTER TABLE core.membership_role_grants ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE core.membership_role_grants DROP CONSTRAINT membership_roles_pkey;
ALTER TABLE core.membership_role_grants ADD PRIMARY KEY(id);
ALTER TABLE core.membership_role_grants ADD COLUMN revoked_at timestamptz;
ALTER TABLE core.membership_role_grants ADD COLUMN revoked_by uuid REFERENCES core.users;
ALTER TABLE core.membership_role_grants ADD CHECK((revoked_at IS NULL)=(revoked_by IS NULL));
ALTER TABLE core.membership_role_grants ADD COLUMN bootstrap_decision_id uuid UNIQUE REFERENCES ops.decisions;
CREATE UNIQUE INDEX uq_active_member_role ON core.membership_role_grants(membership_id,role_code) WHERE revoked_at IS NULL;
CREATE OR REPLACE VIEW core.membership_roles AS
 SELECT membership_id,role_code,granted_by,granted_at,effective_at FROM core.membership_role_grants WHERE revoked_at IS NULL AND effective_at<=ref.clock_at();
COMMENT ON TABLE core.membership_role_grants IS 'Lịch sử cấp vai; thu hồi bằng revoked_at/revoked_by, không DELETE. Cấp lại là hàng mới.';
CREATE TABLE ops.owner_verifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES core.organizations,
 user_id uuid NOT NULL REFERENCES core.users, proposed_by uuid NOT NULL REFERENCES core.users,
 evidence_document_id uuid NOT NULL REFERENCES core.documents, reason text NOT NULL CHECK(length(btrim(reason))>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON ops.owner_verifications FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
ALTER TABLE ops.owner_verifications ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX uq_owner_bootstrap_org ON ops.decisions(entity_id) WHERE kind='owner_bootstrap' AND entity='organization';
CREATE OR REPLACE FUNCTION core.guard_privileged_membership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m core.memberships%ROWTYPE; d ops.decisions%ROWTYPE; v ops.owner_verifications%ROWTYPE;
BEGIN
 SELECT * INTO m FROM core.memberships WHERE id=NEW.membership_id;
 PERFORM 1 FROM core.organizations WHERE id=m.org_id FOR UPDATE;
 IF TG_OP='UPDATE' THEN
  IF OLD.revoked_at IS NOT NULL OR (to_jsonb(NEW)-ARRAY['revoked_at','revoked_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['revoked_at','revoked_by'])
   OR NEW.revoked_at IS NULL OR NEW.revoked_by IS DISTINCT FROM ref.ctx_user()
   OR NOT EXISTS(SELECT 1 FROM core.memberships p JOIN core.membership_roles r ON r.membership_id=p.id
    WHERE p.org_id=m.org_id AND p.user_id=ref.ctx_user() AND p.status='active' AND r.role_code='owner') THEN
   RAISE EXCEPTION 'Chỉ chủ thu hồi vai; lịch sử cấp bất biến' USING HINT='ck_role_revoke'; END IF;
  IF NEW.role_code='owner' AND NOT EXISTS(SELECT 1 FROM core.memberships p JOIN core.membership_roles r ON r.membership_id=p.id
   WHERE p.org_id=m.org_id AND p.status='active' AND r.role_code='owner' AND p.id<>m.id) THEN
   RAISE EXCEPTION 'Không thu hồi chủ cuối cùng' USING HINT='ck_last_owner'; END IF;
  NEW.revoked_at:=ref.clock_at();
  PERFORM evt.audit('membership.role_revoked','organization',m.org_id,jsonb_build_object('grant',OLD.id,'user',m.user_id));
  RETURN NEW;
 END IF;
 IF NEW.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Không nhập vai đã thu hồi' USING HINT='ck_role_revoke'; END IF;
 IF EXISTS(SELECT 1 FROM ref.roles WHERE code=NEW.role_code AND (can_sign OR can_pay OR can_payout_admin)) THEN
  IF EXISTS(SELECT 1 FROM core.delegations WHERE org_id=m.org_id AND helper_user_id=m.user_id AND revoked_at IS NULL AND upper(valid_during)>ref.clock_at()) THEN
   RAISE EXCEPTION 'Người giúp không kiêm vai tiền/chữ ký' USING HINT='ck_helper_privileged_role'; END IF;
  IF NEW.bootstrap_decision_id IS NOT NULL THEN
   SELECT * INTO d FROM ops.decisions WHERE id=NEW.bootstrap_decision_id;
   SELECT * INTO v FROM ops.owner_verifications WHERE id=(d.detail->>'verification_id')::uuid;
   IF NEW.role_code<>'owner' OR d.kind IS DISTINCT FROM 'owner_bootstrap' OR d.entity IS DISTINCT FROM 'organization'
    OR d.entity_id IS DISTINCT FROM m.org_id OR v.org_id IS DISTINCT FROM m.org_id OR v.user_id IS DISTINCT FROM m.user_id
    OR v.proposed_by IS DISTINCT FROM d.proposed_by OR v.evidence_document_id IS DISTINCT FROM d.evidence_document_id
    OR ref.ctx_actor()<>'ops' OR ref.ctx_user() IS DISTINCT FROM d.approved_by OR NEW.granted_by IS DISTINCT FROM d.approved_by
    OR d.created_at<now()-interval '24 hours' OR m.status<>'active'
    OR NOT EXISTS(SELECT 1 FROM core.users WHERE id=m.user_id AND disabled_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=m.org_id AND status='active' AND verification_level=2)
    OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=d.proposed_by AND active)
    OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=d.approved_by AND active AND role_code IN ('risk','supervisor'))
    OR EXISTS(SELECT 1 FROM core.membership_role_grants r JOIN core.memberships p ON p.id=r.membership_id WHERE p.org_id=m.org_id AND r.role_code='owner') THEN
    RAISE EXCEPTION 'Chủ đầu tiên cần xác minh tổ chức và quyết định hai người đúng đối tượng' USING HINT='ck_owner_bootstrap'; END IF;
  ELSIF NEW.granted_by IS NULL OR NEW.granted_by IS DISTINCT FROM ref.ctx_user() OR NOT EXISTS(
   SELECT 1 FROM core.memberships p JOIN core.membership_roles r ON r.membership_id=p.id
   WHERE p.org_id=m.org_id AND p.user_id=NEW.granted_by AND p.status='active' AND r.role_code='owner') THEN
   RAISE EXCEPTION 'Chỉ chủ hiện hành được cấp vai đặc quyền' USING HINT='ck_role_grant_owner'; END IF;
  NEW.granted_at:=ref.clock_at(); NEW.effective_at:=greatest(NEW.effective_at,ref.clock_at()+interval '24 hours');
  PERFORM evt.audit('membership.privilege_cooling','organization',m.org_id,jsonb_build_object('user',m.user_id,'effective_at',NEW.effective_at,'decision',NEW.bootstrap_decision_id));
 ELSIF NEW.bootstrap_decision_id IS NOT NULL THEN RAISE EXCEPTION 'Sai vai bootstrap' USING HINT='ck_owner_bootstrap';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER no_delete BEFORE DELETE ON core.membership_role_grants FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

ALTER TABLE core.bank_instructions DROP CONSTRAINT ck_bi_basis;
ALTER TABLE core.bank_instructions ADD CONSTRAINT ck_bi_basis CHECK(basis_kind IN ('settlement','cancellation','excess','fee_refund','debt_offset','ops_decision','deposit_adjustment'));
CREATE FUNCTION core.guard_deposit_reduction_refund() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE x core.deposit_adjustments%ROWTYPE; v core.order_versions%ROWTYPE; p core.order_versions%ROWTYPE; o core.orders%ROWTYPE; am core.amendments%ROWTYPE; used bigint;
BEGIN
 IF NEW.basis_kind<>'deposit_adjustment' THEN RETURN NEW; END IF;
 PERFORM 1 FROM core.deposits WHERE id=NEW.deposit_id FOR UPDATE;
 SELECT * INTO x FROM core.deposit_adjustments WHERE id=NEW.basis_id;
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=x.order_version_no;
 SELECT * INTO p FROM core.order_versions WHERE order_id=o.id AND version_no=v.version_no-1;
 SELECT * INTO am FROM core.amendments WHERE id=v.amendment_id;
 SELECT coalesce(sum(amount_vnd),0) INTO used FROM core.bank_instructions WHERE basis_kind='deposit_adjustment' AND basis_id=NEW.basis_id AND status<>'failed';
 IF NEW.kind<>'refund_deposit_to_buyer' OR x.deposit_id IS DISTINCT FROM NEW.deposit_id OR x.delta_deposit_vnd IS NULL OR x.delta_deposit_vnd>=0
  OR p.order_id IS NULL OR x.delta_deposit_vnd IS DISTINCT FROM v.deposit_vnd-p.deposit_vnd
  OR am.order_id IS DISTINCT FROM o.id OR am.status IS DISTINCT FROM 'accepted' OR am.kind NOT IN ('decrease_qty','force_majeure_reduction','change_price','drop_item')
  OR v.version_no>o.effective_version_no OR am.resulting_version_no IS DISTINCT FROM v.version_no
  OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=v.document_id AND party='buyer')
  OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=v.document_id AND party='seller')
  OR used+NEW.amount_vnd> -x.delta_deposit_vnd THEN
  RAISE EXCEPTION 'Hoàn chênh phải đúng delta cọc phụ lục đã ký, đúng đơn và không vượt phần chênh' USING HINT='ck_instruction_deposit_adjustment'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_adjustment_refund BEFORE INSERT ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.guard_deposit_reduction_refund();
-- Không sửa các khoản lịch sử; nhiều nguồn được chia lệnh, cộng dồn theo căn cứ vẫn bị khóa/kiểm.
DROP INDEX core.uq_bi_success_per_basis;
CREATE UNIQUE INDEX uq_bi_success_per_basis ON core.bank_instructions(basis_kind,basis_id,kind,coalesce(source_bank_event_id,'00000000-0000-0000-0000-000000000000'::uuid))
 WHERE status IN ('created','sent','processing','succeeded','reconciled');
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
REVOKE ALL ON FUNCTION core.guard_deposit_reduction_refund() FROM PUBLIC;
