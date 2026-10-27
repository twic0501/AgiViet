-- N-01: hai lần báo có có requery; trước đủ C+F chỉ là tiền treo theo đơn.
SELECT test.make_order('N01-PART','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('N01-PART','TC-M01','Trần Thu Hà');
SELECT test.apply_bank_event(test.bank_receipt('N01-PART:1',13800000,'AGV TEST-N01-PART COC'));
SELECT test.check('N01 đủ C nhưng thiếu F vẫn treo, chưa là cọc',
 (SELECT balance_vnd=13800000 FROM ledger.v_account_balances WHERE order_id=test.id('N01-PART') AND account_type='deposit_pending')
 AND NOT EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('N01-PART') AND account_type IN ('deposit_escrow','fee_held') AND balance_vnd<>0));
SELECT test.check('N01 tiền treo không mở liên lạc',NOT EXISTS(SELECT 1 FROM core.contact_grants WHERE order_id=test.id('N01-PART') AND mode='full'));
SELECT test.context(NULL,NULL,'system');
SELECT test.expect_error('N01 không ép tiền treo thành held', $$UPDATE core.deposits SET status='held' WHERE id=test.id('N01-PART:deposit')$$,'ck_deposit_funded');
SELECT test.expect_error('N01 tiền treo không kích hoạt đơn', $$UPDATE core.orders SET status='active' WHERE id=test.id('N01-PART')$$,'ck_order_deposit');
SELECT test.apply_bank_event(test.bank_receipt('N01-PART:2',138000,'AGV TEST-N01-PART COC'));
SELECT test.check('N01 đủ C+F mới chuyển ngăn một lần',
 (SELECT balance_vnd=0 FROM ledger.v_account_balances WHERE order_id=test.id('N01-PART') AND account_type='deposit_pending')
 AND (SELECT balance_vnd=13800000 FROM ledger.v_account_balances WHERE order_id=test.id('N01-PART') AND account_type='deposit_escrow')
 AND (SELECT balance_vnd=138000 FROM ledger.v_account_balances WHERE order_id=test.id('N01-PART') AND account_type='fee_held'));
SELECT test.check('N01 báo có lặp không phân bổ thêm',test.apply_bank_event(test.id('N01-PART:2'))='duplicate_ignored'
 AND (SELECT count(*)=1 FROM ledger.transactions WHERE order_id=test.id('N01-PART') AND kind='deposit_allocation'));
SELECT test.check('N13 F và thừa nằm ngoài C của SEC-EXCESS',
 (SELECT held_vnd=13800000 AND in_instruction_vnd=0 FROM ledger.v_deposit_conservation WHERE order_id=test.id('SEC-EXCESS'))
 AND (SELECT balance_vnd=1000000 FROM ledger.v_account_balances WHERE order_id=test.id('SEC-EXCESS') AND account_type='excess_held'));
SELECT test.context(NULL,NULL,'system');
SELECT test.expect_ok('N13 lệnh hoàn thừa không đi vào coc_trong_lenh', $$DO $b$ BEGIN
 PERFORM test.excess_instruction();
 IF NOT (SELECT held_vnd=13800000 AND in_instruction_vnd=0 FROM ledger.v_deposit_conservation WHERE order_id=test.id('SEC-EXCESS'))
 OR NOT EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('SEC-EXCESS') AND account_type='excess_in_instruction' AND balance_vnd=1000000) THEN RAISE EXCEPTION 'Thừa bị tính vào C'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE; END $b$;$$);
SELECT test.check('N13 BT-T1 mọi cọc đã đủ cân trên C, không F',NOT EXISTS(
 SELECT 1 FROM ledger.v_deposit_conservation v JOIN core.deposits d ON d.id=v.deposit_id
 WHERE d.status='held' AND c_initial_vnd+c_topup_vnd<>held_vnd+in_instruction_vnd+released_vnd+refunded_vnd));

CREATE FUNCTION test.return_proof(k text,src uuid,patch jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE e core.bank_events%ROWTYPE; w bigint; out_id uuid:=test.id(k);
BEGIN
 SELECT * INTO e FROM core.bank_events WHERE id=src;
 INSERT INTO evt.inbound_webhooks(provider,provider_event_id,event_type,signature_valid,payload)
 VALUES('bank_sim',k,'statement_line',true,'{"simulator":true}') RETURNING id INTO w;
 INSERT INTO core.bank_events(id,provider,provider_event_id,webhook_id,kind,amount_vnd,occurred_at,requeried_at,requery_status,requery_evidence)
 VALUES(out_id,'bank_sim',k,w,'statement_line',e.amount_vnd,now(),now(),'confirmed',
  jsonb_build_object('simulator',true,'source_event_id',src,'direction','debit','target_bank_code',e.payer_bank_code,'target_account_hash',encode(e.payer_account_hash,'hex'))||patch);
 RETURN out_id;
END $$;
CREATE FUNCTION test.complete_return(src uuid,proof uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 SET LOCAL ROLE agiviet_bank_worker; PERFORM cmd.complete_bank_return(src,proof); RESET ROLE;
END $$;
SELECT test.make_order('N01-LATE','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('N01-LATE','TC-M01','Trần Thu Hà');
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='closed',close_reason='deposit_expired' WHERE id=test.id('N01-LATE');
SELECT test.apply_bank_event(test.bank_receipt('N01-LATE:ev',13938000,'AGV TEST-N01-LATE COC'));
SELECT test.check('N01 tiền muộn treo đúng đơn, snapshot hoàn nguồn',EXISTS(
 SELECT 1 FROM ops.bank_return_tasks WHERE bank_event_id=test.id('N01-LATE:ev') AND status='pending'
 AND target_bank_code='TEST' AND target_account_hash=digest('TEST-PAYER','sha256'))
 AND EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('N01-LATE') AND account_type='deposit_pending' AND balance_vnd=13938000)
 AND NOT EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('N01-LATE') AND account_type IN ('deposit_escrow','fee_held') AND balance_vnd<>0));
SELECT test.expect_error('N01 không đánh dấu đã hoàn khi chưa có API', $$UPDATE ops.bank_return_tasks SET status='returned' WHERE bank_event_id=test.id('N01-LATE:ev')$$,'ck_bank_return_proof');
SELECT test.expect_error('N01 không đổi nguồn hoàn treo', $$UPDATE ops.bank_return_tasks SET target_bank_code='OTHER' WHERE bank_event_id=test.id('N01-LATE:ev')$$,'ck_bank_return_source');
SELECT test.expect_error('N01 API hoàn sai tài khoản bị chặn', $$SELECT test.complete_return(test.id('N01-LATE:ev'),test.return_proof('N01-BAD-HASH',test.id('N01-LATE:ev'),'{"target_account_hash":"wrong"}'))$$,'ck_bank_return_proof');
SELECT test.expect_error('N01 API hoàn sai chiều bị chặn', $$SELECT test.complete_return(test.id('N01-LATE:ev'),test.return_proof('N01-BAD-DIR',test.id('N01-LATE:ev'),'{"direction":"credit"}'))$$,'ck_bank_return_proof');
SELECT test.complete_return(test.id('N01-LATE:ev'),test.return_proof('N01-LATE:proof',test.id('N01-LATE:ev')));
SELECT test.check('N01 hoàn treo qua bank worker ghi sổ và đơn vẫn đóng',
 (SELECT status='closed' FROM core.orders WHERE id=test.id('N01-LATE'))
 AND (SELECT balance_vnd=0 FROM ledger.v_account_balances WHERE order_id=test.id('N01-LATE') AND account_type='deposit_pending')
 AND (SELECT status='returned' FROM ops.bank_return_tasks WHERE bank_event_id=test.id('N01-LATE:ev'))
 AND EXISTS(SELECT 1 FROM ledger.transactions WHERE kind='suspense_return' AND order_id=test.id('N01-LATE')));
SELECT test.check('N01 replay tiền muộn không mở lại task',test.apply_bank_event(test.id('N01-LATE:ev'))='duplicate_ignored'
 AND (SELECT status='returned' FROM ops.bank_return_tasks WHERE bank_event_id=test.id('N01-LATE:ev')));
SELECT test.expect_error('N01 hoàn cùng nguồn lần hai bị chặn', $$SELECT test.complete_return(test.id('N01-LATE:ev'),test.id('N01-LATE:proof'))$$,'ck_bank_return_source');
SELECT test.make_order('N01-EXPIRE','TC-M01','Trần Thu Hà','spot');
SELECT test.sign_order('N01-EXPIRE','TC-M01','Trần Thu Hà');
SELECT test.apply_bank_event(test.bank_receipt('N01-EXPIRE:ev',1000000,'AGV TEST-N01-EXPIRE COC'));
SELECT test.context(NULL,NULL,'system');
UPDATE core.orders SET status='closed',close_reason='deposit_expired' WHERE id=test.id('N01-EXPIRE');
SELECT test.check('N01 đóng đơn nộp thiếu tự xếp task hoàn nguồn',EXISTS(SELECT 1 FROM ops.bank_return_tasks WHERE bank_event_id=test.id('N01-EXPIRE:ev') AND reason='partial_deposit_expired'));
SELECT test.complete_return(test.id('N01-EXPIRE:ev'),test.return_proof('N01-EXPIRE:proof',test.id('N01-EXPIRE:ev')));
SELECT test.check('N01 tiền thiếu hết hạn hoàn đủ, không thành cọc',
 (SELECT balance_vnd=0 FROM ledger.v_account_balances WHERE order_id=test.id('N01-EXPIRE') AND account_type='deposit_pending')
 AND NOT EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=test.id('N01-EXPIRE') AND account_type='deposit_escrow' AND balance_vnd<>0));
SELECT test.check('N01 app không được gọi command hoàn nguồn',NOT has_function_privilege('agiviet_app','cmd.complete_bank_return(uuid,uuid)','EXECUTE'));
SET CONSTRAINTS ALL IMMEDIATE;
