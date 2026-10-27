CREATE FUNCTION cmd.invite_member(p_user uuid,p_roles text[],p_limit bigint DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,pii,ref,public AS $$
DECLARE result uuid; token text; q uuid; ph bytea;
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner']);
 PERFORM 1 FROM core.organizations WHERE id=ref.ctx_org() FOR UPDATE;
 IF cardinality(p_roles) IS NULL OR cardinality(p_roles)=0 OR EXISTS(SELECT 1 FROM unnest(p_roles) r WHERE NOT EXISTS(SELECT 1 FROM ref.roles WHERE code=r)) OR p_limit<0 THEN RAISE EXCEPTION 'Vai/hạn mức không hợp lệ' USING HINT='ck_command_payload'; END IF;
 SELECT phone_hash INTO ph FROM pii.user_contacts c JOIN core.users u ON u.id=c.user_id WHERE c.user_id=p_user AND u.disabled_at IS NULL;
 IF ph IS NULL THEN RAISE EXCEPTION 'Người được mời chưa có danh tính/số đích' USING HINT='ck_invitation_phone'; END IF;
 INSERT INTO core.memberships(org_id,user_id,approval_limit_vnd,status,created_by) VALUES(ref.ctx_org(),p_user,p_limit,'invited',ref.ctx_user()) RETURNING id INTO result;
 INSERT INTO core.membership_role_grants(membership_id,role_code,granted_by) SELECT result,r,ref.ctx_user() FROM unnest(p_roles) r;
 token:=encode(gen_random_bytes(32),'hex');
 INSERT INTO core.qr_tokens(token_hash,kind,invitation_org_id,designated_user_id,expires_at,single_use,invited_phone_hash)
 VALUES(digest(token,'sha256'),'invitation',ref.ctx_org(),p_user,ref.clock_at()+interval '72 hours',true,ph) RETURNING id INTO q;
 PERFORM evt.emit('organization',ref.ctx_org(),'membership.invited',jsonb_build_object('membership_id',result),ARRAY['notify']);
 RETURN jsonb_build_object('membership_id',result,'invitation_id',q,'token',token);
END $$;
-- Login lời mời vẫn do quản trị ánh xạ. Chỉ command này chấp nhận membership invited;
-- không nới cmd.enter_actor cho các entry point khác.
CREATE FUNCTION cmd.accept_invitation(p_token text,p_device text,p_otp text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,pii,ref,public AS $$
DECLARE p cmd.login_principals%ROWTYPE; q core.qr_tokens%ROWTYPE; m uuid; r text;
BEGIN
 SELECT * INTO p FROM cmd.login_principals WHERE login_name=session_user AND active;
 SELECT * INTO q FROM core.qr_tokens WHERE token_hash=digest(p_token,'sha256') AND kind='invitation' FOR UPDATE;
 IF p.user_id IS NULL OR p.actor_kind NOT IN ('buyer','seller') OR q.designated_user_id IS DISTINCT FROM p.user_id OR q.invitation_org_id IS DISTINCT FROM p.org_id
 OR NOT EXISTS(SELECT 1 FROM core.users WHERE id=p.user_id AND disabled_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p.org_id AND status='active') THEN RAISE EXCEPTION 'Sai danh tính lời mời' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT id INTO m FROM core.memberships WHERE org_id=p.org_id AND user_id=p.user_id AND status='invited' FOR UPDATE;
 IF m IS NULL THEN RAISE EXCEPTION 'Lời mời không còn chờ' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.user_id',p.user_id::text,true); PERFORM set_config('app.org_id',p.org_id::text,true); PERFORM set_config('app.actor_kind',p.actor_kind,true); PERFORM set_config('app.allow_any_initial','',true);
 -- consume_otp gắn phone_hash của đúng QR; auth worker phải xác minh số trước.
 r:=core.scan_qr(p_token,p_device,p_otp);
 IF r<>'accepted' THEN RAISE EXCEPTION 'QR lời mời không hợp lệ: %',r USING HINT='ck_invitation_phone'; END IF;
 UPDATE core.memberships SET status='active' WHERE id=m; RETURN m;
END $$;
CREATE FUNCTION cmd.update_member(p_membership uuid,p_status text,p_limit bigint,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE m core.memberships%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO m FROM core.memberships WHERE id=p_membership FOR UPDATE;
 PERFORM cmd.require_org(m.org_id,ARRAY['owner']); PERFORM 1 FROM core.organizations WHERE id=m.org_id FOR UPDATE;
 IF p_status NOT IN ('active','suspended','revoked') OR p_status IS NULL OR p_limit<0 OR length(btrim(p_reason))=0 OR p_reason IS NULL THEN RAISE EXCEPTION 'Sai trạng thái/hạn mức/lý do' USING HINT='ck_command_payload'; END IF;
 IF p_status<>'active' AND EXISTS(SELECT 1 FROM core.membership_roles WHERE membership_id=m.id AND role_code='owner') AND NOT EXISTS(
 SELECT 1 FROM core.memberships mm JOIN core.membership_roles r ON r.membership_id=mm.id WHERE mm.org_id=m.org_id AND mm.id<>m.id AND mm.status='active' AND r.role_code='owner') THEN RAISE EXCEPTION 'Không bỏ chủ cuối cùng' USING HINT='ck_last_owner'; END IF;
 -- Không kích hoạt lời mời bằng API quản trị để vượt OTP.
 IF m.status='invited' AND p_status='active' THEN RAISE EXCEPTION 'Nhận lời mời qua OTP' USING HINT='ck_invitation_phone'; END IF;
 PERFORM set_config('app.reason',p_reason,true); UPDATE core.memberships SET status=p_status,approval_limit_vnd=p_limit WHERE id=m.id;
 IF p_status='revoked' THEN
 UPDATE core.membership_role_grants SET revoked_at=ref.clock_at(),revoked_by=ref.ctx_user() WHERE membership_id=m.id AND revoked_at IS NULL;
 UPDATE core.qr_tokens SET revoked_at=ref.clock_at() WHERE invitation_org_id=m.org_id AND designated_user_id=m.user_id AND revoked_at IS NULL;
 END IF;
END $$;
-- Số tài khoản/bản mã/hash do adapter KMS cung cấp, tên khớp do vai bank xác minh;
-- app không được chọn name_match, factors hay thời điểm bỏ chờ.
ALTER TABLE evt.otp_challenges DROP CONSTRAINT otp_challenges_purpose_check;
ALTER TABLE evt.otp_challenges ADD CHECK(purpose IN ('contract_sign','amendment_sign','money_received','invitation_accept','record_sign','login','login_new_device','bank_account_change'));
CREATE FUNCTION cmd.request_bank_account(p_bank text,p_cipher bytea,p_hash bytea,p_masked text,p_holder text,p_key text,p_otp text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,pii,evt,ref,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner']);
 PERFORM evt.consume_otp(p_otp,ref.ctx_user(),'bank_account_change',jsonb_build_object('org_id',ref.ctx_org(),'bank_code',p_bank,'account_hash',encode(p_hash,'hex'),'holder',p_holder));
 IF octet_length(p_cipher)=0 OR length(btrim(p_key))=0 OR length(btrim(p_bank))=0 OR length(btrim(p_holder))=0 OR p_cipher IS NULL OR p_key IS NULL THEN RAISE EXCEPTION 'Thiếu dữ liệu tài khoản' USING HINT='ck_command_payload'; END IF;
 INSERT INTO pii.bank_accounts(org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,requested_by,verify_factors,key_id,created_at)
 VALUES(ref.ctx_org(),p_bank,p_cipher,p_hash,p_masked,p_holder,ref.ctx_user(),ARRAY['otp','session'],p_key,ref.clock_at()) RETURNING id INTO result;
 PERFORM evt.emit('organization',ref.ctx_org(),'bank_account.requested',jsonb_build_object('account_id',result),ARRAY['notify']); RETURN result;
END $$;
CREATE FUNCTION cmd.verify_bank_account(p_account uuid,p_match boolean,p_api_receipt jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,pii,ref,public AS $$
DECLARE a pii.bank_accounts%ROWTYPE;
BEGIN
 -- Cổng bank đã xác thực bên ngoài; không cấp app/orchestrator. Không nhận actor.
 IF NOT (current_setting('role',true)='agiviet_bank_worker' OR pg_has_role(session_user,'agiviet_bank_worker','MEMBER')) THEN RAISE EXCEPTION 'Chỉ adapter ngân hàng' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT * INTO a FROM pii.bank_accounts WHERE id=p_account FOR UPDATE;
 IF a.status IS DISTINCT FROM 'pending_verification' OR p_match IS NULL OR p_api_receipt->>'bank_code' IS DISTINCT FROM a.bank_code OR p_api_receipt->>'account_hash' IS DISTINCT FROM encode(a.account_number_hash,'hex') OR p_api_receipt->>'holder' IS DISTINCT FROM a.holder_name OR coalesce(length(p_api_receipt->>'reference'),0)=0 THEN RAISE EXCEPTION 'Thiếu tra tên đúng tài khoản' USING HINT='ck_bank_account_proof'; END IF;
 PERFORM set_config('app.actor_kind','bank',true); PERFORM set_config('app.reason','Tra tên qua ngân hàng',true);
 UPDATE pii.bank_accounts SET name_match=p_match,status=CASE WHEN p_match THEN 'cooling_down' ELSE 'rejected' END WHERE id=a.id;
 PERFORM evt.audit('bank_account.verified','payout_account',a.id,p_api_receipt);
END $$;
CREATE FUNCTION cmd.lock_bank_account(p_account uuid,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,pii,ops,ref,public AS $$
DECLARE a pii.bank_accounts%ROWTYPE; result uuid; s ref.sla_policies%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO a FROM pii.bank_accounts WHERE id=p_account FOR UPDATE;
 IF ref.ctx_actor()='ops' THEN PERFORM cmd.require_staff(ARRAY['risk','finance']); ELSE PERFORM cmd.require_org(a.org_id,ARRAY['owner']); END IF;
 IF a.id IS NULL OR p_reason IS NULL OR length(btrim(p_reason))=0 THEN RAISE EXCEPTION 'Thiếu tài khoản/lý do' USING HINT='ck_command_payload'; END IF;
 PERFORM set_config('app.reason',p_reason,true); UPDATE pii.bank_accounts SET status='locked' WHERE id=a.id AND status IN ('active','cooling_down');
 SELECT * INTO s FROM ref.sla_policies WHERE priority=0;
 INSERT INTO ops.tasks(code,kind,priority,entity,entity_id,required_role,dedup_key,trigger_reason,response_due_at,resolution_due_at,next_update_at)
 VALUES('LOCK-'||a.id,'V05',0,'payout_account',a.id,'risk','notme:'||a.id,p_reason,ref.clock_at()+s.response_minutes*interval '1 minute',ref.clock_at()+s.resolution_minutes*interval '1 minute',ref.clock_at()+s.update_minutes*interval '1 minute')
 ON CONFLICT(dedup_key) DO UPDATE SET dedup_key=EXCLUDED.dedup_key RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.record_work(p_task uuid,p_day date,p_minutes integer,p_category text,p_cost bigint DEFAULT 0) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ref,public AS $$
DECLARE t ops.tasks%ROWTYPE; result bigint;
BEGIN
 SELECT * INTO t FROM ops.tasks WHERE id=p_task FOR UPDATE; PERFORM cmd.require_staff(ARRAY[t.required_role,'supervisor']);
 IF t.assigned_to IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Việc thuộc nhân viên khác' USING HINT='KHONG_CO_QUYEN'; END IF;
 INSERT INTO ops.work_logs(task_id,user_id,work_on,minutes,category,outside_cost_vnd) VALUES(t.id,ref.ctx_user(),p_day,p_minutes,p_category,p_cost) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.claim_outbox(p_destination text,p_limit integer DEFAULT 50) RETURNS SETOF evt.outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,evt,ref,public AS $$ BEGIN
 PERFORM cmd.require_system();
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Giới hạn batch 1..100' USING HINT='ck_command_payload'; END IF;
 RETURN QUERY WITH picked AS (SELECT id FROM evt.outbox WHERE destination=p_destination AND status IN ('pending','failed') AND available_at<=now() AND (locked_until IS NULL OR locked_until<now()) ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT p_limit)
 UPDATE evt.outbox o SET attempts=o.attempts+1,locked_until=now()+interval '1 minute' FROM picked p WHERE o.id=p.id RETURNING o.*;
END $$;
CREATE FUNCTION cmd.finish_outbox(p_id bigint,p_attempt integer,p_error text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,evt,public AS $$ BEGIN
 PERFORM cmd.require_system();
 UPDATE evt.outbox SET status=CASE WHEN p_error IS NULL THEN 'sent' WHEN attempts>=10 THEN 'dead' ELSE 'failed' END,sent_at=CASE WHEN p_error IS NULL THEN now() END,last_error=p_error,locked_until=NULL,available_at=now()+least(3600,30*power(2,least(attempts,7))) * interval '1 second'
 WHERE id=p_id AND attempts=p_attempt AND locked_until>now() AND status IN ('pending','failed');
 IF NOT FOUND THEN RAISE EXCEPTION 'Lease outbox đã đổi/hết hạn' USING HINT='ck_outbox_lease'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION cmd.invite_member(uuid,text[],bigint),cmd.accept_invitation(text,text,text),cmd.update_member(uuid,text,bigint,text),cmd.request_bank_account(text,bytea,bytea,text,text,text,text),cmd.lock_bank_account(uuid,text),cmd.record_work(uuid,date,integer,text,bigint) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.verify_bank_account(uuid,boolean,jsonb) TO agiviet_bank_worker;
GRANT EXECUTE ON FUNCTION cmd.claim_outbox(text,integer),cmd.finish_outbox(bigint,integer,text) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
CREATE FUNCTION cmd.create_invitee(p_name text,p_cipher bytea,p_hash bytea,p_masked text,p_key text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,pii,ref,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner']);
 IF coalesce(length(btrim(p_name)),0)=0 OR octet_length(p_hash) IS DISTINCT FROM 32 OR coalesce(octet_length(p_cipher),0)=0 OR coalesce(length(btrim(p_key)),0)=0 THEN RAISE EXCEPTION 'Thiếu danh tính liên hệ' USING HINT='ck_command_payload'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(encode(p_hash,'hex'),0));
 SELECT user_id INTO result FROM pii.user_contacts WHERE phone_hash=p_hash; IF result IS NOT NULL THEN RETURN result; END IF;
 INSERT INTO core.users(display_name) VALUES(p_name) RETURNING id INTO result;
 INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id) VALUES(result,p_cipher,p_hash,p_masked,p_key); RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.create_invitee(text,bytea,bytea,text,text) TO agiviet_app;
-- Auth adapter xác minh số bằng hệ thống SMS, chỉ cập nhật khi có OTP invitation đã verified đúng binding.
CREATE FUNCTION cmd.verify_invitation_contact(p_challenge text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,evt,pii,core,public AS $$
DECLARE c evt.otp_challenges%ROWTYPE;
BEGIN
 SELECT * INTO c FROM evt.otp_challenges WHERE id=p_challenge FOR UPDATE;
 IF c.purpose IS DISTINCT FROM 'invitation_accept' OR c.verified_at IS NULL OR c.used_at IS NOT NULL OR c.expires_at<=now() OR NOT EXISTS(SELECT 1 FROM core.qr_tokens q JOIN pii.user_contacts p ON p.user_id=q.designated_user_id AND p.phone_hash=q.invited_phone_hash WHERE q.kind='invitation' AND q.designated_user_id=c.user_id AND evt.otp_hash(c.purpose,c.user_id,core.invitation_binding(q.id))=c.binding_sha256 AND q.expires_at>ref.clock_at() AND q.revoked_at IS NULL AND q.used_at IS NULL) THEN RAISE EXCEPTION 'Thiếu OTP đúng số lời mời' USING HINT='ck_invitation_phone'; END IF;
 UPDATE pii.user_contacts SET phone_verified_at=coalesce(phone_verified_at,now()) WHERE user_id=c.user_id;
END $$;
GRANT EXECUTE ON FUNCTION cmd.verify_invitation_contact(text) TO agiviet_auth_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
