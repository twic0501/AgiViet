CREATE FUNCTION test.otp(p_doc uuid,p_user uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE cid text:=gen_random_uuid()::text; purpose text;
BEGIN
 SELECT CASE WHEN doc_type='annex' THEN 'amendment_sign' ELSE 'contract_sign' END INTO purpose FROM core.documents WHERE id=p_doc;
 PERFORM cmd.record_otp(cid,p_user,purpose,core.signature_binding(p_doc),digest('TEST-MAC','sha256'));
 PERFORM cmd.otp_verification(cid,true);
 RETURN cid;
END $$;
CREATE FUNCTION test.payment_otp(p_payment uuid,p_amount bigint,p_user uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE cid text:=gen_random_uuid()::text;
BEGIN
 PERFORM cmd.record_otp(cid,p_user,'money_received',core.payment_binding(p_payment,p_amount),digest('TEST-MAC','sha256'));
 PERFORM cmd.otp_verification(cid,true); RETURN cid;
END $$;
CREATE FUNCTION test.apply_bank_event(p_id uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
 SET LOCAL ROLE agiviet_bank_worker;
 r:=core.apply_bank_event(p_id);
 RESET ROLE;
 RETURN r;
END $$;
CREATE FUNCTION test.manual_post(p_kind text,p_order uuid,p_idem text,p_memo text,p_lines jsonb,p_reverse uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE tid uuid:=gen_random_uuid(); did uuid:=gen_random_uuid(); uid uuid; checker uuid; doc uuid;
BEGIN
 SELECT id INTO tid FROM ledger.transactions WHERE idempotency_key=p_idem;
 IF tid IS NOT NULL THEN RETURN ledger.post(p_kind,p_order,p_idem,p_memo,p_lines,now(),p_reverse,(SELECT approved_by FROM ledger.transactions WHERE id=tid),jsonb_build_object('id',tid,'decision',(SELECT decision_id FROM ledger.transactions WHERE id=tid))); END IF;
 tid:=gen_random_uuid();
 SELECT user_id INTO uid FROM ops.staff_assignments WHERE role_code='finance' ORDER BY user_id LIMIT 1;
 SELECT user_id INTO checker FROM ops.staff_assignments WHERE role_code='finance' AND user_id<>uid LIMIT 1;
 INSERT INTO core.documents(code,doc_type,series_key,version_no,content_sha256,file_sha256,storage_key,mime_type,size_bytes)
 VALUES('TEST-DEC-'||did,'evidence','TEST-DEC-'||did,1,digest(did::text,'sha256'),digest(did::text,'sha256'),'test/evidence','image/jpeg',1) RETURNING id INTO doc;
 INSERT INTO ops.decisions(id,kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES(did,'ledger_correction','ledger_transaction',tid,uid,checker,'Điều chỉnh thử có chứng cứ',doc,'{}');
 PERFORM set_config('app.user_id',uid::text,true);
 RETURN ledger.post(p_kind,p_order,p_idem,p_memo,p_lines,now(),p_reverse,checker,jsonb_build_object('id',tid,'decision',did));
END $$;

CREATE FUNCTION test.reverse(p_id uuid) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE ls jsonb; t ledger.transactions%ROWTYPE; BEGIN
 SELECT * INTO t FROM ledger.transactions WHERE id=p_id;
 SELECT jsonb_agg(jsonb_build_object('type',a.account_type,'org',a.org_id,'order',a.order_id,'framework',a.framework_id,'amount',-e.amount_vnd) ORDER BY e.line_no)
 INTO ls FROM ledger.entries e JOIN ledger.accounts a ON a.id=e.account_id WHERE e.transaction_id=p_id;
 RETURN test.manual_post('reversal',t.order_id,'test-reverse:'||p_id,'Đảo có phê duyệt',ls,p_id);
END $$;
CREATE FUNCTION test.instruction(p_id uuid,p_code text,p_kind text,p_order uuid,p_dep uuid,p_basis uuid,p_amount bigint,p_source uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO core.bank_instructions(id,code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_code,target_account_masked,target_account_holder,target_bank_account_id,source_bank_event_id,target_account_hash)
 SELECT p_id,p_code,p_kind,p_dep,p_order,'settlement',p_basis,p_amount,
 CASE WHEN p_kind='release_deposit_to_seller' THEN o.seller_org_id ELSE o.buyer_org_id END,
 CASE WHEN p_kind='release_deposit_to_seller' THEN v.seller_bank_code ELSE 'TEST' END,
 CASE WHEN p_kind='release_deposit_to_seller' THEN v.seller_account_masked ELSE e.payer_account_masked END,
 CASE WHEN p_kind='release_deposit_to_seller' THEN v.seller_account_holder ELSE e.payer_account_name END,
 CASE WHEN p_kind='release_deposit_to_seller' THEN v.seller_bank_account_id END,p_source,e.payer_account_hash
 FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no LEFT JOIN core.bank_events e ON e.id=p_source WHERE o.id=p_order;
END $$;

CREATE FUNCTION test.invitation_otp(p_raw text,p_user uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE cid text:=gen_random_uuid()::text; qid uuid;
BEGIN
 SELECT id INTO qid FROM core.qr_tokens WHERE token_hash=digest(p_raw,'sha256');
 PERFORM cmd.record_otp(cid,p_user,'invitation_accept',core.invitation_binding(qid),digest('TEST-MAC','sha256'));
 PERFORM cmd.otp_verification(cid,true); RETURN cid;
END $$;
CREATE FUNCTION test.sign_cash_receipt(p_doc uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE o core.orders%ROWTYPE; uid uuid; org uuid; side text;
BEGIN
 SELECT o1.* INTO o FROM core.orders o1 JOIN core.documents d ON d.order_id=o1.id WHERE d.id=p_doc;
 PERFORM test.context(NULL,NULL,'system'); UPDATE core.documents SET status='awaiting_signature' WHERE id=p_doc;
 FOREACH side IN ARRAY ARRAY['buyer','seller'] LOOP
  org:=CASE WHEN side='buyer' THEN o.buyer_org_id ELSE o.seller_org_id END;
  SELECT m.user_id INTO uid FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id WHERE m.org_id=org AND m.status='active' AND r.role_code='owner' LIMIT 1;
  PERFORM set_config('app.user_id',uid::text,true); PERFORM set_config('app.org_id',org::text,true); PERFORM set_config('app.actor_kind',side,true);
  INSERT INTO core.signatures(document_id,party,signer_user_id,signer_org_id,method,signed_sha256,otp_challenge_id,device_id)
  SELECT id,side,uid,org,'otp',content_sha256,test.otp(id,uid),'test-receipt-device' FROM core.documents WHERE id=p_doc;
 END LOOP;
 PERFORM test.context(NULL,NULL,'system'); UPDATE core.documents SET status='fully_signed' WHERE id=p_doc;
 PERFORM set_config('app.user_id',uid::text,true); PERFORM set_config('app.org_id',org::text,true); PERFORM set_config('app.actor_kind','seller',true);
END $$;
