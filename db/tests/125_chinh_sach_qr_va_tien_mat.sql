-- N-09: quyết định chứa toàn bộ policy; không áp dụng chính sách tương lai.
CREATE FUNCTION test.publish_policy(p_id integer,p_delay interval DEFAULT interval '24 hours',p_change boolean DEFAULT false,p_same boolean DEFAULT false) RETURNS void LANGUAGE plpgsql AS $$
DECLARE j jsonb; did uuid:=gen_random_uuid();
BEGIN
 SELECT to_jsonb(p)-'approval_decision_id'||jsonb_build_object('id',p_id,'effective_from',now()+p_delay,'estimated_commit_cap_bps',100) INTO j FROM core.policy_versions p WHERE id=1;
 INSERT INTO ops.decisions(id,kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES(did,'policy_change','policy_version',gen_random_uuid(),test.person('Bùi Thị Thảo'),CASE WHEN p_same THEN test.person('Bùi Thị Thảo') ELSE test.person('Nguyễn Hữu Tâm') END,
 'Thay chính sách thử',test.id('LS3:evidence'),jsonb_build_object('policy',j));
 IF p_change THEN j:=j||'{"deposit_bps":2000}'; END IF;
 INSERT INTO core.policy_versions SELECT (jsonb_populate_record(NULL::core.policy_versions,j||jsonb_build_object('approval_decision_id',did))).*;
END $$;
SELECT test.expect_error('N09 không có quyết định không được công bố', $$INSERT INTO core.policy_versions(id,effective_from,deadlines) VALUES(99,now()+interval '2 days','{}')$$,'ck_policy_approval');
SELECT test.expect_error('N09 người lập không tự duyệt', $$SELECT test.publish_policy(99,interval '24 hours',false,true)$$,'23514');
SELECT test.expect_error('N09 chưa đủ 24h bị chặn', $$SELECT test.publish_policy(99,interval '23 hours')$$,'ck_policy_approval');
SELECT test.expect_error('N09 không thay nội dung sau khi được duyệt', $$SELECT test.publish_policy(99,interval '24 hours',true)$$,'ck_policy_approval');
SELECT test.publish_policy(99);
SELECT test.check('N09 hai người duyệt, đúng 24h được lập lịch',EXISTS(SELECT 1 FROM core.policy_versions p JOIN ops.decisions d ON d.id=p.approval_decision_id WHERE p.id=99 AND p.effective_from=d.created_at+interval '24 hours'));
SELECT test.make_order('N09','TC-M01','Trần Thu Hà','spot');
SELECT test.expect_error('N09 đơn không dùng chính sách chưa hiệu lực', $$UPDATE core.orders SET policy_version_id=99 WHERE id=test.id('N09')$$,'ck_policy_not_effective');
SELECT test.expect_ok('N09 giới hạn lượng dùng chính sách đang hiệu lực', $$DO $b$ BEGIN
 PERFORM ledger.move_qty(test.id('N09:lot'),'available','committed','commit_direct',400000,test.id('N09'),'N09-cap'); SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$);

-- N-04/N-12: invitation có hash số đích, xác minh đúng OTP/jti.
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
CREATE TABLE test.qr_n12(raw text);
INSERT INTO test.qr_n12 SELECT core.issue_qr('invitation',test.org('TC-B01'),clock_timestamp()+interval '1 hour',test.person('Nguyễn Thị Năm'));
SELECT test.check('N12 lời mời lưu hash số đã xác minh',EXISTS(SELECT 1 FROM core.qr_tokens q JOIN pii.user_contacts c ON c.user_id=test.person('Nguyễn Thị Năm') WHERE q.token_hash=digest((SELECT raw FROM test.qr_n12),'sha256') AND q.invited_phone_hash=c.phone_hash));
SELECT test.expect_error('N12 scan lời mời không OTP không được nhận', $$SELECT core.scan_qr((SELECT raw FROM test.qr_n12),'test')$$,'ck_otp_verified_binding');
SELECT test.expect_error('N12 OTP purpose nhận tiền không nhận lời mời', $$SELECT core.scan_qr((SELECT raw FROM test.qr_n12),'test',test.payment_otp(test.id('SEC-PAY:dp'),100,ref.ctx_user()))$$,'ck_otp_verified_binding');
SELECT test.expect_error('N12 OTP lời mời khác jti không dùng được', $$DO $b$ DECLARE other text; BEGIN
 other:=core.issue_qr('invitation',test.org('TC-B01'),clock_timestamp()+interval '1 hour',ref.ctx_user());
 PERFORM core.scan_qr((SELECT raw FROM test.qr_n12),'test',test.invitation_otp(other,ref.ctx_user())); END $b$;$$,'ck_otp_verified_binding');
SELECT test.expect_error('N12 không đổi hash số người được mời', $$UPDATE core.qr_tokens SET invited_phone_hash=digest('OTHER','sha256') WHERE token_hash=digest((SELECT raw FROM test.qr_n12),'sha256')$$,'ck_qr_identity');
SELECT test.expect_error('N12 không phát lời mời thiếu số điện thoại', $$SELECT core.issue_qr('invitation',test.org('TC-B01'),clock_timestamp()+interval '1 hour')$$,'ck_invitation_phone');
SELECT test.check('N12 đúng người đúng OTP nhận lời mời một lần',core.scan_qr((SELECT raw FROM test.qr_n12),'test',test.invitation_otp((SELECT raw FROM test.qr_n12),ref.ctx_user()))='accepted'
 AND core.scan_qr((SELECT raw FROM test.qr_n12),'test')='used');
SELECT test.expect_error('N04 không đặt lại used_at', $$UPDATE core.qr_tokens SET used_at=NULL WHERE token_hash=digest((SELECT raw FROM test.qr_n12),'sha256')$$,'ck_qr_identity');
DO $$ DECLARE raw text; BEGIN
 raw:=core.issue_qr('record',test.id('contract'),clock_timestamp()+interval '1 hour',ref.ctx_user());
 PERFORM test.check('N04 QR biên bản jti chỉ dùng một lần',core.scan_qr(raw,'test')='accepted' AND core.scan_qr(raw,'test')='used');
END $$;
SELECT test.expect_error('N04 QR nhận hàng không được tắt single_use', $$INSERT INTO core.qr_tokens(token_hash,kind,delivery_id,expires_at,single_use) VALUES(digest('BAD-SINGLE','sha256'),'receipt',test.id('delivery'),clock_timestamp()+interval '1 hour',false)$$,'ck_qr_single_use');
SELECT test.expect_error('N04 không sửa danh tính jti của QR', $$UPDATE core.qr_tokens SET id=gen_random_uuid() WHERE token_hash=digest((SELECT raw FROM test.qr_n12),'sha256')$$,'ck_qr_identity');

CREATE FUNCTION test.cash_payment(k text,amount bigint) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 PERFORM test.context(NULL,NULL,'system');
 INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
 VALUES(test.id(k),'TEST-'||k,test.id('N01-PART'),'goods_after_days','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),amount,'after_days','due');
 INSERT INTO core.documents(id,code,doc_type,owner_org_id,order_id,series_key,version_no,content_sha256,file_sha256,canonical_content,storage_key,mime_type,size_bytes)
 VALUES(test.id(k||':receipt'),'TEST-'||k||'-RECEIPT','evidence',test.org('TC-B01'),test.id('N01-PART'),'TEST-'||k||'-RECEIPT',1,digest(k,'sha256'),digest(k||':file','sha256'),jsonb_build_object('payment_id',test.id(k),'amount_vnd',amount),'test/cash','image/jpeg',1);
END $$;
CREATE FUNCTION test.receive_cash(k text,amount bigint) RETURNS void LANGUAGE sql AS $$
 INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,otp_challenge_id,method,receipt_document_id)
 VALUES(test.id(k),'full',amount,test.person('Nguyễn Thị Năm'),test.payment_otp(test.id(k),amount,test.person('Nguyễn Thị Năm')),'cash',test.id(k||':receipt'))
$$;
SELECT test.cash_payment('N14-LOW',19999999);
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT test.expect_error('N02 có OTP nhưng biên nhận chưa hai bên ký bị chặn', $$SELECT test.receive_cash('N14-LOW',19999999)$$,'ck_cash_receipt_signatures');
SELECT test.sign_cash_receipt(test.id('N14-LOW:receipt'));
SELECT test.receive_cash('N14-LOW',19999999);
SELECT test.check('N14 tiền mặt 19999999 không gắn cờ',EXISTS(SELECT 1 FROM core.direct_payment_confirmations WHERE direct_payment_id=test.id('N14-LOW') AND NOT cash_warning));
SELECT test.cash_payment('N14-EDGE',20000000);
SELECT test.sign_cash_receipt(test.id('N14-EDGE:receipt'));
SELECT test.receive_cash('N14-EDGE',20000000);
SELECT test.check('N14 tiền mặt đúng 20 triệu vẫn ghi nhận và gắn cờ',EXISTS(SELECT 1 FROM core.direct_payment_confirmations c JOIN ops.anomaly_flags f ON f.evidence->>'confirmation_id'=c.id::text WHERE c.direct_payment_id=test.id('N14-EDGE') AND c.cash_warning AND f.rule_code='cash_ge_20m'));
SELECT test.cash_payment('N14-TH059',33320000);
SELECT test.sign_cash_receipt(test.id('N14-TH059:receipt'));
SELECT test.receive_cash('N14-TH059',33320000);
SELECT test.check('N14 TH059 33320000 không có trần cứng, cảnh báo qua outbox',
 EXISTS(SELECT 1 FROM core.direct_payment_confirmations WHERE direct_payment_id=test.id('N14-TH059') AND cash_warning)
 AND EXISTS(SELECT 1 FROM evt.domain_events e JOIN evt.outbox ob ON ob.event_id=e.id WHERE e.aggregate_id=test.id('N14-TH059') AND e.event_type='payment.cash_warning' AND ob.destination='notify'));
SELECT test.cash_payment('N02-ID',100);
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT test.expect_error('N02 OTP khoản khác cùng số tiền bị chặn', $$INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,bank_txn_ref,otp_challenge_id) VALUES(test.id('N02-ID'),'full',100,ref.ctx_user(),'N02-ID-WRONG',test.payment_otp(test.id('SEC-PAY:dp'),100,ref.ctx_user()))$$,'ck_otp_verified_binding');
SELECT test.expect_error('N02 OTP và chuyển khoản đúng nhưng thiếu mã bị chặn', $$INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,otp_challenge_id) VALUES(test.id('N02-ID'),'full',100,ref.ctx_user(),test.payment_otp(test.id('N02-ID'),100,ref.ctx_user()))$$,'ck_confirmation_evidence');

-- N-15: seed giữ nguồn, không tạo tài khoản nhận tiền chung của tổ hợp tác.
SELECT test.check('N15 tổ hợp tác không có tài khoản nhận tiền',NOT EXISTS(SELECT 1 FROM pii.bank_accounts b JOIN core.organizations o ON o.id=b.org_id WHERE o.kind='coop_group'));
SELECT test.check('N15 HTX pháp nhân vẫn có tài khoản',EXISTS(SELECT 1 FROM pii.bank_accounts b JOIN core.organizations o ON o.id=b.org_id WHERE o.kind='cooperative' AND b.status='active'));
SELECT test.expect_error('N15 không chuyển tổ hợp tác thành HTX để lách', $$UPDATE core.organizations SET kind='cooperative' WHERE code='TC-B10'$$,'ck_org_kind_immutable');
SELECT test.expect_error('N15 không cho tổ hợp tác đứng bán nhận tiền chung', $$UPDATE core.orders SET seller_org_id=test.org('TC-B10') WHERE id=test.id('N09')$$,'ck_coop_group_money');
SELECT test.expect_error('N15 không lập khoản trả thẳng cho tổ hợp tác', $$INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger) VALUES('TEST-N15',test.id('N09'),'goods_after_days','buyer_to_seller',test.org('TC-M01'),test.org('TC-B10'),100,'after_days')$$,'ck_coop_group_money');
SELECT test.expect_error('N15 không đi vòng sổ cái nhận tiền chung', $$SELECT test.manual_post('manual_adjustment',NULL,'N15-LEDGER','Thử nhận tiền chung',jsonb_build_array(jsonb_build_object('type','external','org',test.org('TC-B10'),'amount',100),jsonb_build_object('type','external','org',test.org('TC-M01'),'amount',-100)))$$,'ck_coop_group_money');
SET CONSTRAINTS ALL IMMEDIATE;
