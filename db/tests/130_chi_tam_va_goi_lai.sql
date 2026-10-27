SELECT set_config('app.test_time','2026-11-04 07:00+07',true);
-- N-08: ghi bản tạm thật, đầu vào lấy nghiệm thu và sổ tiền, không chỉ kiểm số học.
SELECT test.make_order('N08','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('N08','TC-M01','Trần Thu Hà');
SELECT test.fund_order('N08');
INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
 VALUES(test.id('N08:goods'),'TEST-N08-GOODS',test.id('N08'),'goods_after_days','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),32200000,'after_days','due');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,bank_txn_ref,otp_challenge_id)
 VALUES(test.id('N08:goods'),'full',32200000,ref.ctx_user(),'N08-GOODS',test.payment_otp(test.id('N08:goods'),32200000,ref.ctx_user()));
SELECT test.start_delivery('N08',1,2000000,'TC-M01','Võ Hoàng Phúc');
INSERT INTO core.acceptance_lines(id,acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id)
SELECT test.id('N08:line:'||n),test.id('N08:accept:1'),n,test.id('N08:lot'),kind,qty,payable,price,value,reason,test.id('N08:bbnt:1') FROM (VALUES
 (1::smallint,'accepted',1750000,1750000,23000,40250000,NULL::text),
 (2::smallint,'downgraded',120000,120000,15000,1800000,'TRAY_VO'),
 (3::smallint,'rejected',100000,0,0,0,'DAP'),
 (4::smallint,'rejected',30000,0,0,0,'DAP'))t(n,kind,qty,payable,price,value,reason);
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=test.id('N08:accept:1') AND line_no<>3;
SELECT test.context('Võ Hoàng Phúc','TC-M01','buyer');
UPDATE core.acceptance_lines SET status='disputed' WHERE id=test.id('N08:line:3');
INSERT INTO core.disputes(id,line_id,order_id,disputed_qty,opened_by,reason,claim_kind)
 VALUES(test.id('N08:dispute'),test.id('N08:line:3'),test.id('N08'),100000,ref.ctx_user(),'Khác mẫu, đề xuất trả lại','quality');
INSERT INTO core.inspections(id,delivery_id,dispute_id,provider_org_id,kind,fee_vnd,prepaid_by_org_id,due_at)
 VALUES(test.id('N08:inspection'),test.id('N08:batch:1'),test.id('N08:dispute'),test.org('DT-KD'),'sample',280000,test.org('TC-M01'),now()+interval '1 day');
SELECT test.check('N08 G_them từ phí buyer ứng, chất lượng không phạt thiếu lượng',core.dispute_claim_amount(test.id('N08'))=280000);
SELECT test.expect_ok('N08 phạt tối đa Q04 chỉ trên lượng tranh chấp thiếu', $$DO $b$ BEGIN
 UPDATE core.disputes SET claim_kind='shortfall' WHERE id=test.id('N08:dispute');
 IF core.dispute_claim_amount(test.id('N08'))<>970000 THEN RAISE EXCEPTION 'Q04 sai: 280000 + 690000'; END IF;
 END $b$;$$);
CREATE FUNCTION test.n08_interim(p_release bigint,p_extra bigint DEFAULT 0) RETURNS void LANGUAGE sql AS $$
 INSERT INTO core.settlements(id,order_id,seq,is_final,v_vnd,d_vnd,c_vnd,n_vnd,c_nb_formula_vnd,release_vnd,refund_vnd,t_bm_vnd,t_nb_vnd,inputs,additional_hold_vnd,hold_formula_version)
 VALUES(test.id('N08:s1'),test.id('N08'),1,false,42050000,32200000,13800000,42050000,9850000,p_release,0,0,0,'{"test":"N08"}',p_extra,1)
$$;
-- Bản 23 E1 (28/10/2026): trả đủ phần đã công nhận; không giữ lại phí kiểm định/phạt từ tiền người bán.
SELECT test.expect_error('E1 chi tạm kiểu cũ (giữ 280000) bị CHECK chặn', $$SELECT test.n08_interim(9570000,280000)$$,'ck_st_interim');
SELECT test.n08_interim(9850000,0);
SELECT test.check('E1 người bán nhận đủ phần công nhận 9850000, không giữ thêm',EXISTS(SELECT 1 FROM core.settlements WHERE id=test.id('N08:s1') AND additional_hold_vnd=0 AND hold_formula_version=3 AND release_vnd=9850000));
SELECT test.check('E1 khoản đòi thêm (phí bên mua ứng + phạt) ghi chưa bảo đảm, không trừ vào tiền người bán',(SELECT sum(inspection_fee_vnd+penalty_vnd)=core.dispute_claim_amount(test.id('N08')) AND core.dispute_additional_hold(test.id('N08'))=0 AND sum(inspection_fee_vnd)=280000 AND bool_and(security_status='chưa bảo đảm') FROM core.v_unsecured_claims WHERE order_id=test.id('N08')));
SELECT test.expect_error('E1 snapshot bất biến', $$UPDATE core.settlements SET additional_hold_vnd=280000 WHERE id=test.id('N08:s1')$$,'ck_append_only');

-- D-07/D-18: tài khoản mới phải được chụp trong hợp đồng trước ký.
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,created_at)
 VALUES(test.id('D07:new-bank'),test.org('TC-B01'),'TEST-NEW','\x01',digest('D07-NEW-BANK','sha256'),'****7200','NGUYEN THI NAM',true,ref.ctx_user(),ARRAY['otp','in_person'],'TEST-NOT-ENCRYPTED',ref.clock_at()-interval '2 days');
SELECT test.context(NULL,NULL,'system');
UPDATE pii.bank_accounts SET status='cooling_down' WHERE id=test.id('D07:new-bank');
UPDATE pii.bank_accounts SET status='replaced' WHERE org_id=test.org('TC-B01') AND status='active';
UPDATE pii.bank_accounts SET status='active',activated_at='2020-01-01' WHERE id=test.id('D07:new-bank');
SELECT test.check('D18 không cho tự khai lùi thời điểm kích hoạt',(SELECT activated_at=ref.clock_at() FROM pii.bank_accounts WHERE id=test.id('D07:new-bank')));
SELECT test.expect_error('D18 không sửa giờ kích hoạt để bỏ giữ lệnh', $$UPDATE pii.bank_accounts SET activated_at=ref.clock_at()-interval '4 days' WHERE id=test.id('D07:new-bank')$$,'ck_bank_activation');
SELECT test.make_order('D07','TC-M01','Nguyễn Đức Thịnh','spot',jsonb_build_object(
 'qty_min',4000000,'qty_max',4000000,'contract_value_vnd',92000000,'deposit_basis_vnd',92000000,'deposit_vnd',27600000,'fee_vnd',276000,
 'seller_bank_account_id',test.id('D07:new-bank'),'seller_bank_code','TEST-NEW','seller_account_masked','****7200','seller_account_holder','NGUYEN THI NAM'));
SELECT test.sign_order('D07','TC-M01','Nguyễn Đức Thịnh');
SELECT test.fund_order('D07');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
INSERT INTO core.cancellation_requests(id,order_id,requested_by_org_id,requested_by_user_id,reason_kind)
 VALUES(test.id('D07:cancel'),test.id('D07'),ref.ctx_org(),ref.ctx_user(),'seller_request');
UPDATE core.cancellation_requests SET status='processing_money' WHERE id=test.id('D07:cancel');
SELECT test.context(NULL,NULL,'system');
CREATE FUNCTION test.d07_instruction(k text,amount bigint,p_bank uuid DEFAULT NULL) RETURNS void LANGUAGE sql AS $$
 INSERT INTO core.bank_instructions(id,code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_account_id,target_bank_code,target_account_masked,target_account_holder)
 SELECT test.id(k),'TEST-'||k,'release_deposit_to_seller',test.id('D07:deposit'),test.id('D07'),'cancellation',test.id('D07:cancel'),amount,test.org('TC-B01'),b.id,b.bank_code,b.account_masked,b.holder_name
 FROM pii.bank_accounts b WHERE id=coalesce(p_bank,test.id('D07:new-bank'))
$$;
SELECT test.expect_error('D07 không dùng tài khoản cũ ngoài phiên bản hợp đồng', $$SELECT test.d07_instruction('D07-WRONG',20000000,(SELECT seller_bank_account_id FROM core.order_versions WHERE order_id=test.id('order') AND version_no=1))$$,'ck_instruction_signed_account');
SELECT test.d07_instruction('D07-BI',20000000);
SELECT test.check('D18 lệnh 20 triệu tài khoản mới giữ ở created và có việc gọi lại',EXISTS(SELECT 1 FROM core.bank_instructions b JOIN ops.tasks t ON t.entity_id=b.id AND t.entity='bank_instruction' WHERE b.id=test.id('D07-BI') AND b.callback_required AND b.status='created' AND b.target_activated_at=ref.clock_at() AND t.required_role='finance'));
SELECT test.expect_error('D18 chưa gọi lại không được gửi lệnh', $$UPDATE core.bank_instructions SET status='sent' WHERE id=test.id('D07-BI')$$,'ck_instruction_callback');
SELECT test.check('D18 biên dưới 20 triệu không giữ',NOT core.payout_needs_callback(19999999,now(),now()));
SELECT test.check('D18 đúng 72 giờ không còn thuộc diện tài khoản mới',NOT core.payout_needs_callback(20000000,now()-interval '72 hours',now())
 AND core.payout_needs_callback(20000000,now()-interval '72 hours'+interval '1 microsecond',now()));
SELECT test.check('D18 tài khoản lịch sử không rõ giờ giữ thận trọng',core.payout_needs_callback(20000000,NULL,now()));
SELECT test.context('Bùi Thị Thảo','AGV','ops');
INSERT INTO ops.calls(id,task_id,caller_user_id,callee_user_id,duration_seconds,summary)
 SELECT test.id('D07:call'),id,ref.ctx_user(),test.person('Nguyễn Thị Năm'),30,'Đã gọi số chủ được xác minh' FROM ops.tasks WHERE entity_id=test.id('D07-BI') AND entity='bank_instruction';
CREATE FUNCTION test.d07_callback(p_contact uuid DEFAULT NULL) RETURNS void LANGUAGE sql AS $$
 INSERT INTO ops.payout_callbacks(instruction_id,bank_account_id,contact_user_id,contact_phone_hash,confirmed_by,call_id)
 SELECT test.id('D07-BI'),test.id('D07:new-bank'),c.user_id,c.phone_hash,ref.ctx_user(),test.id('D07:call') FROM pii.user_contacts c WHERE c.user_id=coalesce(p_contact,test.person('Nguyễn Thị Năm'))
$$;
SELECT test.expect_error('D18 không gọi lại người khác chủ tài khoản', $$SELECT test.d07_callback(test.person('Trần Văn Sáu'))$$,'ck_payout_callback_proof');
SELECT test.context('Nguyễn Hữu Tâm','AGV','ops');
SELECT test.expect_error('D18 VH-QL không nhả lệnh tiền', $$SELECT test.d07_callback()$$,'ck_payout_callback_proof');
SELECT test.context('Bùi Thị Thảo','AGV','ops');
CREATE ROLE agiviet_test_ops_callback LOGIN NOSUPERUSER NOBYPASSRLS;
GRANT agiviet_app TO agiviet_test_ops_callback;
INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind) VALUES('agiviet_test_ops_callback',test.person('Bùi Thị Thảo'),test.org('AGV'),'ops');
SELECT set_config('test.callback_instruction',test.id('D07-BI')::text,true),set_config('test.callback_contact',test.person('Nguyễn Thị Năm')::text,true),set_config('test.callback_call',test.id('D07:call')::text,true),set_config('test.callback_original',session_user,true);
SET LOCAL SESSION AUTHORIZATION agiviet_test_ops_callback;
SELECT cmd.confirm_payout_callback(current_setting('test.callback_instruction')::uuid,current_setting('test.callback_contact')::uuid,current_setting('test.callback_call')::uuid);
RESET SESSION AUTHORIZATION;
DO $$ BEGIN EXECUTE format('SET LOCAL SESSION AUTHORIZATION %I',current_setting('test.callback_original')); END $$;
RESET ROLE;
SELECT test.context(NULL,NULL,'system');
UPDATE core.bank_instructions SET status='sent' WHERE id=test.id('D07-BI');
SELECT test.check('D18 có cuộc gọi tài chính hợp lệ mới được gửi',EXISTS(SELECT 1 FROM core.bank_instructions b JOIN ops.payout_callbacks c ON c.instruction_id=b.id WHERE b.id=test.id('D07-BI') AND b.status='sent' AND b.callback_required));
SELECT test.expect_error('D18 không xóa chứng cứ nhả lệnh', $$DELETE FROM ops.payout_callbacks WHERE instruction_id=test.id('D07-BI')$$,'ck_append_only');
SELECT test.expect_error('D18 không sửa cờ giữ lệnh', $$UPDATE core.bank_instructions SET callback_required=false WHERE id=test.id('D07-BI')$$,'ck_instruction_callback');
SET CONSTRAINTS ALL IMMEDIATE;
