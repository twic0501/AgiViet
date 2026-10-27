-- N-02/N-06: cuộc gọi và quyết định hai người chưa đủ để coi là đã nhận tiền.
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT test.expect_error('N02 biên nhận hai bên ký của khoản khác không dùng được', $$INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,otp_challenge_id,method,receipt_document_id)
 VALUES(test.id('N02-ID'),'full',100,ref.ctx_user(),test.payment_otp(test.id('N02-ID'),100,ref.ctx_user()),'cash',test.id('N14-LOW:receipt'))$$,'ck_cash_receipt_binding');
SELECT test.context('Lê Thị Lan','TC-M01','buyer');
INSERT INTO core.direct_payment_reports(direct_payment_id,amount_vnd,method,evidence_doc_id,reported_by)
 VALUES(test.id('N02-ID'),100,'bank_transfer',test.id('N02-ID:receipt'),ref.ctx_user());
UPDATE core.direct_payments SET status='payer_reported' WHERE id=test.id('N02-ID');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by) VALUES(test.id('N02-ID'),'not_received',0,ref.ctx_user());
SELECT test.context('Bùi Thị Thảo','AGV','ops');
INSERT INTO ops.decisions(kind,entity,entity_id,proposed_by,approved_by,reason,evidence_document_id,detail)
 VALUES('payment_reconciliation','direct_payment',test.id('N02-ID'),test.person('Bùi Thị Thảo'),test.person('Đỗ Minh Trí'),'Tra soát thử',test.id('LS3:evidence'),'{}');
CREATE FUNCTION test.ops_receive(p_proof uuid DEFAULT NULL) RETURNS void LANGUAGE sql AS $$
 INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,bank_txn_ref,ops_decision_by,bank_evidence_id)
 VALUES(test.id('N02-ID'),'full',100,ref.ctx_user(),'OPS-REF',ARRAY[test.person('Bùi Thị Thảo'),test.person('Đỗ Minh Trí')],p_proof)
$$;
SELECT test.expect_error('N02 N06 quyết định hai người thiếu API không thay OTP', $$SELECT test.ops_receive()$$,'ck_payment_bank_proof');
INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload)
 VALUES('bank_sim','N02-OPS-PROOF','statement_line',true,'{"simulator":true}');
INSERT INTO core.bank_events(id,provider,provider_event_id,webhook_id,kind,amount_vnd,bank_txn_ref,occurred_at,requeried_at,requery_status,requery_evidence)
 SELECT test.id('N02-OPS-PROOF'),'bank_sim','N02-OPS-PROOF',id,'statement_line',100,'OPS-REF',now(),now(),'confirmed',
 jsonb_build_object('simulator',true,'payment_binding',core.payment_binding(test.id('N02-ID'),100),'recipient_org_id',test.org('TC-B01'),'direction','credit')
 FROM evt.inbound_webhooks WHERE provider='bank_sim' AND provider_event_id='N02-OPS-PROOF';
SELECT test.ops_receive(test.id('N02-OPS-PROOF'));
SELECT test.check('N02 N06 đối soát có API đúng binding mới ghi nhận',EXISTS(SELECT 1 FROM core.direct_payment_confirmations WHERE direct_payment_id=test.id('N02-ID') AND amount_vnd=100 AND bank_evidence_id=test.id('N02-OPS-PROOF')));
SELECT test.check('N08 snapshot mới dùng công thức phiên bản 3 (E1, không giữ thêm)',(SELECT hold_formula_version=3 FROM core.settlements WHERE id=test.id('N08:s1')));
SELECT test.expect_error('N08 không mở lượng tranh chấp vượt lượng dòng', $$INSERT INTO core.disputes(line_id,order_id,disputed_qty,opened_by,reason,claim_kind) VALUES(test.id('N08:line:1'),test.id('N08'),1750001,test.person('Nguyễn Thị Năm'),'Lượng sai','shortfall')$$,'ck_dispute_scope');
SELECT test.expect_error('N08 không gắn kiểm định đơn khác để giảm giữ phí', $$INSERT INTO core.inspections(delivery_id,dispute_id,provider_org_id,kind,fee_vnd,prepaid_by_org_id,due_at) VALUES(test.id('delivery'),test.id('N08:dispute'),test.org('DT-KD'),'sample',280000,test.org('TC-M01'),now()+interval '1 day')$$,'ck_inspection_dispute_scope');
SELECT test.expect_error('N08 phí kiểm định đã khai ứng không sửa giảm', $$UPDATE core.inspections SET fee_vnd=0 WHERE id=test.id('N08:inspection')$$,'ck_append_only');
-- Sau chi tạm: held chỉ còn phần giữ, không yêu cầu phải nộp lại C ban đầu.
SELECT test.context(NULL,NULL,'system');
UPDATE core.deposits SET status='processing' WHERE id=test.id('N08:deposit');
SELECT test.instruction(test.id('N08:release'),'TEST-N08-RELEASE','release_deposit_to_seller',test.id('N08'),test.id('N08:deposit'),test.id('N08:s1'),9850000);
UPDATE core.bank_instructions SET status='sent' WHERE id=test.id('N08:release');
SELECT test.instruction_event('N08-release-paid','TEST-N08-RELEASE','instruction_succeeded',9850000);
SELECT test.context(NULL,NULL,'system');
UPDATE core.deposits SET status='held' WHERE id=test.id('N08:deposit');
SELECT test.check('N08 sau chi tạm trở lại held chỉ còn 3950000',
 (SELECT status='held' FROM core.deposits WHERE id=test.id('N08:deposit'))
 AND (SELECT held_vnd=3950000 AND released_vnd=9850000 AND in_instruction_vnd=0 FROM ledger.v_deposit_conservation WHERE order_id=test.id('N08')));
SET CONSTRAINTS ALL IMMEDIATE;
