-- Chứng cứ đăng ký do auth adapter ghi sau SMS thật. Không nhận actor từ payload.
CREATE TABLE app_auth.registration_receipts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payload jsonb NOT NULL,payload_sha256 bytea NOT NULL,
 provider_reference text NOT NULL UNIQUE CHECK(length(btrim(provider_reference))>0),
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
 CHECK(octet_length(payload_sha256)=32)
);
CREATE TABLE core.registration_results(
 receipt_id uuid PRIMARY KEY REFERENCES app_auth.registration_receipts,user_id uuid NOT NULL REFERENCES core.users,
 org_id uuid NOT NULL UNIQUE REFERENCES core.organizations,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_auth.registration_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.registration_results ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app_auth.registration_receipts FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.registration_results FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.record_registration(p_payload jsonb,p_reference text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,app_auth,core,public AS $$
DECLARE result uuid; old app_auth.registration_receipts%ROWTYPE;
BEGIN
 IF NOT pg_has_role(session_user,'agiviet_auth_worker','MEMBER') THEN RAISE EXCEPTION 'Chỉ auth adapter' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM cmd.check_payload(p_payload,ARRAY['name','organization','contact']);
 PERFORM cmd.check_payload(p_payload->'organization',ARRAY['code','kind','display_name','legal_name','tax_code','province_code','commune_code','can_buy','can_sell','segment_code']);
 PERFORM cmd.check_payload(p_payload->'contact',ARRAY['phone_enc','phone_hash','phone_masked','key_id']);
 IF coalesce(length(btrim(p_payload->>'name')),0)=0 OR octet_length((p_payload->'contact'->>'phone_hash')::bytea) IS DISTINCT FROM 32
 OR coalesce(octet_length((p_payload->'contact'->>'phone_enc')::bytea),0)=0 OR coalesce(length(p_payload->'contact'->>'key_id'),0)=0 THEN RAISE EXCEPTION 'Thiếu danh tính/số đã xác minh' USING HINT='ck_command_payload'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_reference,0));
 SELECT * INTO old FROM app_auth.registration_receipts WHERE provider_reference=p_reference;
 IF old.id IS NOT NULL THEN IF old.payload IS DISTINCT FROM p_payload THEN RAISE EXCEPTION 'Receipt khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN old.id; END IF;
 INSERT INTO app_auth.registration_receipts(payload,payload_sha256,provider_reference) VALUES(p_payload,digest(p_payload::text,'sha256'),p_reference) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.register_organization(p_receipt uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,app_auth,core,pii,ref,public AS $$
DECLARE r app_auth.registration_receipts%ROWTYPE; old core.registration_results%ROWTYPE; o jsonb; c jsonb; uid uuid; org uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO r FROM app_auth.registration_receipts WHERE id=p_receipt FOR UPDATE;
 SELECT * INTO old FROM core.registration_results WHERE receipt_id=p_receipt;
 IF old.receipt_id IS NOT NULL THEN RETURN jsonb_build_object('user_id',old.user_id,'org_id',old.org_id,'status',(SELECT status FROM core.organizations WHERE id=old.org_id)); END IF;
 IF r.id IS NULL OR r.expires_at<=now() THEN RAISE EXCEPTION 'Thiếu receipt đăng ký còn hạn' USING HINT='ck_registration_receipt'; END IF;
 o:=r.payload->'organization'; c:=r.payload->'contact';
 IF o->>'kind' IS NULL OR o->>'kind' NOT IN ('household','cooperative','coop_group','enterprise','trader')
 OR coalesce(length(btrim(o->>'display_name')),0)=0 OR (coalesce((o->>'can_buy')::boolean,false) AND o->>'tax_code' IS NULL)
 OR (o->>'commune_code' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ref.communes WHERE code=o->>'commune_code' AND province_code=o->>'province_code')) THEN RAISE EXCEPTION 'Sai dữ liệu tổ chức/MST/địa bàn' USING HINT='ck_command_payload'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(c->>'phone_hash',0));
 IF EXISTS(SELECT 1 FROM pii.user_contacts WHERE phone_hash=(c->>'phone_hash')::bytea) THEN RAISE EXCEPTION 'Số đã đăng ký: dùng đăng nhập/lời mời' USING HINT='ck_registration_existing'; END IF;
 INSERT INTO core.users(display_name) VALUES(r.payload->>'name') RETURNING id INTO uid;
 INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES(uid,(c->>'phone_enc')::bytea,(c->>'phone_hash')::bytea,c->>'phone_masked',c->>'key_id',now());
 org:=cmd.insert_row('core.organizations',(o-'segment_code')||jsonb_build_object('created_by',ref.ctx_user()),ARRAY['code','kind','display_name','legal_name','tax_code','province_code','commune_code','can_buy','can_sell','created_by']);
 INSERT INTO core.memberships(org_id,user_id,status,created_by) VALUES(org,uid,'active',ref.ctx_user());
 IF coalesce((o->>'can_buy')::boolean,false) THEN
 INSERT INTO core.org_buyer_segments(org_id,segment_code,source) VALUES(org,coalesce(o->>'segment_code','wholesaler'),'declared');
 INSERT INTO core.subscriptions(org_id,plan_code,active_during,created_by) VALUES(org,'free',tstzrange(ref.clock_at(),NULL,'[)'),ref.ctx_user()); END IF;
 INSERT INTO core.registration_results VALUES(r.id,uid,org,now());
 PERFORM evt.emit('organization',org,'organization.registered',jsonb_build_object('user_id',uid),ARRAY['ops']);
 RETURN jsonb_build_object('user_id',uid,'org_id',org,'status','pending');
END $$;
-- Tổ chức mới vẫn qua propose/approve_owner_verification + bootstrap_owner (hai người, chờ 24h).
-- Xác minh bổ sung tổ chức đã hoạt động cũng phải có quyết định hai người.
CREATE FUNCTION cmd.propose_organization_verification(p_org uuid,p_level smallint,p_evidence uuid,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['field','risk','supervisor']);
 IF p_level IS NULL OR p_level NOT BETWEEN 1 AND 2 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p_org AND status='active') OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND doc_type='evidence' AND entity='organization' AND entity_id=p_org) THEN RAISE EXCEPTION 'Sai tổ chức/chứng cứ xác minh' USING HINT='ck_command_evidence'; END IF;
 INSERT INTO ops.decision_proposals(kind,entity,entity_id,proposed_by,reason,evidence_document_id,detail)
 VALUES('organization_verification','organization',p_org,ref.ctx_user(),p_reason,p_evidence,jsonb_build_object('verification_level',p_level)) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.verify_organization(p_decision uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref AS $$
DECLARE d ops.decisions%ROWTYPE;
BEGIN
 PERFORM cmd.require_staff(ARRAY['risk','supervisor']); SELECT * INTO d FROM ops.decisions WHERE id=p_decision;
 IF d.kind IS DISTINCT FROM 'organization_verification' OR d.entity IS DISTINCT FROM 'organization' OR d.approved_by IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Cần quyết định xác minh hai người' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.organizations SET verification_level=greatest(verification_level,(d.detail->>'verification_level')::smallint) WHERE id=d.entity_id AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Tổ chức mới cần bootstrap chủ đầu tiên' USING HINT='ck_owner_bootstrap'; END IF;
END $$;
-- Gói do billing adapter xác nhận. Không chỉnh snapshot của đơn đã ký.
CREATE TABLE core.subscription_changes(
 request_key text PRIMARY KEY,org_id uuid NOT NULL REFERENCES core.organizations,subscription_id uuid NOT NULL REFERENCES core.subscriptions,
 request_sha256 bytea NOT NULL,proof_document_id uuid REFERENCES core.documents,created_by uuid NOT NULL REFERENCES core.users,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.subscription_changes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.subscription_changes FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.change_subscription(p_org uuid,p_plan text,p_key text,p_proof uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE pl ref.plans%ROWTYPE; s core.subscriptions%ROWTYPE; old core.subscription_changes%ROWTYPE; h bytea; result uuid; at_time timestamptz:=ref.clock_at();
BEGIN
 PERFORM cmd.require_system(); PERFORM 1 FROM core.organizations WHERE id=p_org AND status='active' AND can_buy FOR UPDATE;
 IF NOT FOUND OR coalesce(length(btrim(p_key)),0)=0 THEN RAISE EXCEPTION 'Sai tổ chức/khóa gói' USING HINT='ck_command_payload'; END IF;
 h:=digest(jsonb_build_object('org',p_org,'plan',p_plan,'proof',p_proof)::text,'sha256');
 SELECT * INTO old FROM core.subscription_changes WHERE request_key=p_key;
 IF old.request_key IS NOT NULL THEN IF old.request_sha256 IS DISTINCT FROM h THEN RAISE EXCEPTION 'Khóa gói khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN old.subscription_id; END IF;
 SELECT * INTO pl FROM ref.plans WHERE code=p_plan;
 IF pl.code IS NULL OR (SELECT count(*) FROM core.memberships WHERE org_id=p_org AND status IN ('active','invited'))>pl.max_members THEN RAISE EXCEPTION 'Gói không đủ thành viên' USING HINT='ck_plan_member_limit'; END IF;
 IF pl.monthly_price_vnd>0 AND NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_proof AND owner_org_id IN (SELECT id FROM core.organizations WHERE is_platform) AND doc_type='evidence' AND entity='billing_receipt' AND entity_id=p_org
 AND canonical_content->>'billing_org_id'=p_org::text AND canonical_content->>'plan_code'=p_plan AND (canonical_content->>'amount_vnd')::bigint=pl.monthly_price_vnd AND canonical_content->>'result'='paid' AND length(canonical_content->>'provider_reference')>0) THEN RAISE EXCEPTION 'Thiếu chứng từ thu gói của billing adapter' USING HINT='ck_subscription_proof'; END IF;
 IF p_proof IS NOT NULL AND EXISTS(SELECT 1 FROM core.subscription_changes WHERE proof_document_id=p_proof) THEN RAISE EXCEPTION 'Chứng từ gói đã dùng' USING HINT='ck_subscription_proof'; END IF;
 SELECT * INTO s FROM core.subscriptions WHERE org_id=p_org AND active_during@>at_time FOR UPDATE;
 IF s.plan_code=p_plan THEN result:=s.id;
 ELSE
 IF s.id IS NOT NULL THEN
 IF lower(s.active_during)>=at_time THEN RAISE EXCEPTION 'Hai thay đổi gói cùng thời điểm' USING HINT='ck_subscription_time'; END IF;
 UPDATE core.subscriptions SET active_during=tstzrange(lower(active_during),at_time,'[)') WHERE id=s.id; END IF;
 INSERT INTO core.subscriptions(org_id,plan_code,active_during,created_by) VALUES(p_org,p_plan,tstzrange(at_time,NULL,'[)'),ref.ctx_user()) RETURNING id INTO result;
 END IF;
 INSERT INTO core.subscription_changes VALUES(p_key,p_org,result,h,p_proof,ref.ctx_user(),now()); RETURN result;
END $$;
-- Tài liệu hệ thống ghim toàn bộ căn cứ bất biến, không mạo chữ ký khách hàng.
INSERT INTO ref.document_types VALUES('bank_confirmation','Chứng từ lệnh ngân hàng đã đối soát','{}');
CREATE FUNCTION cmd.attach_system_document(p_kind text,p_basis uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE snapshot jsonb; oid uuid; result uuid; dtype text;
BEGIN
 PERFORM cmd.require_system();
 IF p_kind='settlement' THEN SELECT to_jsonb(s),s.order_id INTO snapshot,oid FROM core.settlements s WHERE id=p_basis; dtype:='settlement_statement';
 ELSIF p_kind='bank_instruction' THEN SELECT to_jsonb(b),b.order_id INTO snapshot,oid FROM core.bank_instructions b WHERE id=p_basis AND status='reconciled'; dtype:='bank_confirmation';
 ELSE RAISE EXCEPTION 'Loại tài liệu hệ thống không hỗ trợ' USING HINT='ck_command_payload'; END IF;
 IF snapshot IS NULL OR p_document->'canonical_content' IS DISTINCT FROM jsonb_build_object('basis_kind',p_kind,'basis_id',p_basis,'snapshot',snapshot) THEN RAISE EXCEPTION 'Nội dung khác căn cứ đã chốt' USING HINT='ck_system_document_basis'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_kind||p_basis::text,0));
 SELECT id INTO result FROM core.documents WHERE doc_type=dtype AND entity=p_kind AND entity_id=p_basis;
 IF result IS NOT NULL THEN
 IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=result AND content_sha256=(p_document->>'content_sha256')::bytea AND file_sha256=(p_document->>'file_sha256')::bytea AND storage_key=p_document->>'storage_key') THEN RAISE EXCEPTION 'Tài liệu hệ thống khác bản đã đăng' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN result; END IF;
 result:=cmd.attach_document(oid,dtype,p_document,p_kind,p_basis);
 UPDATE core.documents SET status='fully_signed' WHERE id=result; -- Loại này không có bên phải ký.
 RETURN result;
END $$;
CREATE TABLE mkt.command_cache_batches(
 request_key text PRIMARY KEY,demand_line_id uuid NOT NULL REFERENCES core.demand_lines,payload_sha256 bytea NOT NULL,payload jsonb NOT NULL,
 algorithm_version text NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mkt.command_cache_batches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON mkt.command_cache_batches FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.cache_match_candidates(p_line uuid,p_key text,p_algorithm text,p_rows jsonb,p_hash bytea,p_expires timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,mkt,ref,public AS $$
DECLARE d core.demands%ROWTYPE; x jsonb; old mkt.command_cache_batches%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT dm.* INTO d FROM core.demands dm JOIN core.demand_lines l ON l.demand_id=dm.id WHERE l.id=p_line FOR UPDATE OF dm,l;
 IF d.id IS NULL OR d.status<>'open' OR coalesce(length(btrim(p_key)),0)=0 OR coalesce(length(btrim(p_algorithm)),0)=0 OR p_expires IS NULL OR p_expires<=ref.clock_at() OR p_expires>ref.clock_at()+interval '1 hour' OR p_hash IS DISTINCT FROM digest(p_rows::text,'sha256') OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows)>500 THEN RAISE EXCEPTION 'Sai snapshot/hash/hạn cache' USING HINT='ck_match_cache'; END IF;
 SELECT * INTO old FROM mkt.command_cache_batches WHERE request_key=p_key;
 IF old.request_key IS NOT NULL THEN IF (old.demand_line_id,old.payload_sha256,old.algorithm_version,old.expires_at) IS DISTINCT FROM (p_line,p_hash,p_algorithm,p_expires) THEN RAISE EXCEPTION 'Khóa cache khác nội dung' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) v GROUP BY v->>'lot_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Trùng lô trong cache' USING HINT='ck_match_cache'; END IF;
 FOR x IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
 PERFORM cmd.check_payload(x,ARRAY['lot_id','match_group','score_bps','distance_m','promiseable_qty','reasons']);
 IF NOT EXISTS(SELECT 1 FROM core.lots l WHERE l.id=(x->>'lot_id')::uuid AND l.product_id=d.product_id AND l.profile_version=d.profile_version AND l.grade_code=(SELECT grade_code FROM core.demand_lines WHERE id=p_line) AND l.status IN ('on_sale','upcoming') AND l.safety_locked_at IS NULL)
 OR jsonb_typeof(x->'reasons') IS DISTINCT FROM 'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(x->'reasons') r WHERE r NOT IN ('product','grade','quantity','distance','schedule','documents','reputation','relationship','price_compatible','partial_quantity','near_price')) THEN RAISE EXCEPTION 'Sai lô hoặc lý do cache có dữ liệu ngoài whitelist' USING HINT='ck_match_cache'; END IF;
 END LOOP;
 DELETE FROM mkt.match_candidates WHERE demand_line_id=p_line;
 FOR x IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
 INSERT INTO mkt.match_candidates(demand_line_id,lot_id,match_group,score_bps,distance_m,promiseable_qty,hard_filters_passed,algorithm_version,reasons,computed_at,expires_at)
 VALUES(p_line,(x->>'lot_id')::uuid,x->>'match_group',(x->>'score_bps')::integer,(x->>'distance_m')::bigint,(x->>'promiseable_qty')::bigint,true,p_algorithm,x->'reasons',ref.clock_at(),p_expires);
 END LOOP;
 INSERT INTO mkt.command_cache_batches VALUES(p_key,p_line,p_hash,p_rows,p_algorithm,p_expires,now());
END $$;
GRANT EXECUTE ON FUNCTION cmd.record_registration(jsonb,text) TO agiviet_auth_worker;
GRANT EXECUTE ON FUNCTION cmd.register_organization(uuid),cmd.change_subscription(uuid,text,text,uuid),cmd.attach_system_document(text,uuid,jsonb),cmd.cache_match_candidates(uuid,text,text,jsonb,bytea,timestamptz) TO agiviet_orchestrator;
GRANT EXECUTE ON FUNCTION cmd.propose_organization_verification(uuid,smallint,uuid,text),cmd.verify_organization(uuid) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

CREATE OR REPLACE FUNCTION cmd.approve_decision(p_proposal uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,ops,ref,public AS $$
DECLARE p ops.decision_proposals%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO p FROM ops.decision_proposals WHERE id=p_proposal FOR UPDATE;
 PERFORM cmd.require_staff(CASE WHEN p.kind='payment_reconciliation' THEN ARRAY['finance','risk'] WHEN p.kind IN ('ledger_correction','manual_payment') THEN ARRAY['finance','supervisor'] WHEN p.kind='policy_change' THEN ARRAY['supervisor'] ELSE ARRAY['risk','supervisor'] END);
 IF p.id IS NULL OR p.proposed_by=ref.ctx_user() OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=p.proposed_by AND active AND role_code=ANY(CASE WHEN p.kind='payment_reconciliation' THEN ARRAY['finance','risk'] WHEN p.kind IN ('ledger_correction','manual_payment') THEN ARRAY['finance'] WHEN p.kind='organization_verification' THEN ARRAY['field','risk','supervisor'] ELSE ARRAY['risk','supervisor'] END)) THEN RAISE EXCEPTION 'Thiếu người lập độc lập còn quyền' USING HINT='ck_decision_two_people'; END IF;
 SELECT id INTO result FROM ops.decisions WHERE detail->>'command_proposal_id'=p.id::text;
 IF result IS NOT NULL THEN RETURN result; END IF;
 INSERT INTO ops.decisions(kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES(p.kind,p.entity,p.entity_id,p.proposed_by,ref.ctx_user(),p.reason,p.evidence_document_id,p.detail||jsonb_build_object('command_proposal_id',p.id)) RETURNING id INTO result; RETURN result;
END $$;

-- Metadata hóa đơn đầu vào chỉ từ billing adapter tin cậy dưới login system.
CREATE FUNCTION cmd.record_subscription_payment(p_org uuid,p_plan text,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
BEGIN
 PERFORM cmd.require_system();
 IF NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p_org AND status='active' AND can_buy) OR p_document->'canonical_content'->>'billing_org_id' IS DISTINCT FROM p_org::text
 OR p_document->'canonical_content'->>'plan_code' IS DISTINCT FROM p_plan OR p_document->'canonical_content'->>'result' IS DISTINCT FROM 'paid'
 OR NOT EXISTS(SELECT 1 FROM ref.plans WHERE code=p_plan AND monthly_price_vnd=(p_document->'canonical_content'->>'amount_vnd')::bigint)
 OR coalesce(length(p_document->'canonical_content'->>'provider_reference'),0)=0 THEN RAISE EXCEPTION 'Sai receipt billing đã xác minh' USING HINT='ck_subscription_proof'; END IF;
 RETURN cmd.attach_document(NULL,'evidence',p_document,'billing_receipt',p_org);
END $$;
CREATE UNIQUE INDEX uq_subscription_payment_reference ON core.documents((canonical_content->>'provider_reference')) WHERE doc_type='evidence' AND entity='billing_receipt';
GRANT EXECUTE ON FUNCTION cmd.record_subscription_payment(uuid,text,jsonb) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
