CREATE FUNCTION cmd.agree_acceptance_line(p_line uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,public AS $$
DECLARE l core.acceptance_lines%ROWTYPE; a core.acceptance_versions%ROWTYPE;
BEGIN
 SELECT * INTO l FROM core.acceptance_lines WHERE id=p_line; SELECT * INTO a FROM core.acceptance_versions WHERE id=l.acceptance_id;
 PERFORM cmd.order_party((SELECT order_id FROM core.deliveries WHERE id=a.delivery_id),'seller',ARRAY['owner','coop_board','collection_staff']);
 IF EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=a.delivery_id AND version_no>a.version_no) OR l.status IS DISTINCT FROM 'proposed' OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Cần dòng hiện hành và hai chữ ký' USING HINT='ck_command_acceptance'; END IF;
 UPDATE core.acceptance_lines SET status='closed' WHERE id=l.id;
END $$;
CREATE FUNCTION cmd.begin_arrival_check(p_delivery uuid,p_weighed bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE; o:=cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.receiver_user_id IS DISTINCT FROM ref.ctx_user() OR p_weighed IS NULL OR p_weighed<0 THEN RAISE EXCEPTION 'Sai người nhận/lượng cân' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.deliveries SET status='arrival_check' WHERE id=d.id;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('arrival_check','delivery',d.id,o.id,ref.clock_at()+interval '2 hours',ref.clock_at());
 PERFORM evt.emit('delivery',d.id,'delivery.arrival_check',jsonb_build_object('weighed_qty',p_weighed),ARRAY['notify']);
END $$;
CREATE TABLE core.delivery_shortfall_actions(
 delivery_id uuid PRIMARY KEY REFERENCES core.deliveries,acceptance_id uuid NOT NULL REFERENCES core.acceptance_versions,
 choice text NOT NULL CHECK(choice IN ('backfill','end','force_majeure')),qty bigint NOT NULL CHECK(qty>0),
 backfill_delivery_id uuid REFERENCES core.deliveries,evidence_id uuid REFERENCES core.documents,actor_user_id uuid NOT NULL REFERENCES core.users,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.delivery_shortfall_actions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.delivery_shortfall_actions FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.resolve_shortfall(p_delivery uuid,p_choice text,p_window tstzrange DEFAULT NULL,p_evidence uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; a core.acceptance_versions%ROWTYPE; old core.delivery_shortfall_actions%ROWTYPE; qty bigint; pending bigint; result uuid; penalty bigint;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE; o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board']);
 SELECT * INTO old FROM core.delivery_shortfall_actions WHERE delivery_id=d.id;
 IF old.delivery_id IS NOT NULL THEN IF old.choice IS DISTINCT FROM p_choice OR old.evidence_id IS DISTINCT FROM p_evidence THEN RAISE EXCEPTION 'Đã xử lý thiếu bằng lựa chọn khác' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN old.backfill_delivery_id; END IF;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 qty:=d.planned_qty-a.weighed_qty;
 IF o.framework_id IS NOT NULL OR qty IS NULL OR qty<=0 OR p_choice IS NULL OR p_choice NOT IN ('backfill','end','force_majeure') OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Cần nghiệm thu đã ký có phần thiếu' USING HINT='ck_command_acceptance'; END IF;
 IF p_choice='force_majeure' AND NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND order_id=o.id AND doc_type='evidence') THEN RAISE EXCEPTION 'Bất khả kháng cần chứng cứ' USING HINT='ck_command_evidence'; END IF;
 -- Phần không bốc vẫn ở in_transit theo planned_qty, trả về committed trước khi giao bù/nhả.
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(o.lot_id,'in_transit','committed','not_loaded',qty,o.id,d.id,'shortfall-unload:'||d.id);
 IF p_choice='backfill' THEN
 IF p_window IS NULL OR isempty(p_window) OR lower(p_window)<=ref.clock_at() THEN RAISE EXCEPTION 'Thiếu lịch giao bù' USING HINT='ck_command_terms'; END IF;
 INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id)
 SELECT o.code||'-BACKFILL-'||d.batch_no,o.id,d.version_no,max(batch_no)+1,qty,p_window,d.receiver_user_id FROM core.deliveries WHERE order_id=o.id RETURNING id INTO result;
 IF d.receiver_user_id IS NOT NULL THEN PERFORM core.issue_qr('receipt',result,upper(p_window),d.receiver_user_id); END IF;
 ELSE
 PERFORM ledger.move_qty(o.lot_id,'committed','available','commit_release',qty,o.id,'shortfall-release:'||d.id);
 IF p_choice='end' AND qty::numeric*10000>d.planned_qty::numeric*v.qty_tolerance_bps THEN
 penalty:=ref.div_round(v.deposit_vnd::numeric*qty*v.shortfall_penalty_bps[4],v.qty_min::numeric*10000);
 IF penalty>0 THEN INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis,source_entity,source_id,created_by) VALUES(o.id,'shortfall_penalty','seller',penalty,jsonb_build_object('short_qty',qty,'bps',v.shortfall_penalty_bps[4]),'delivery',d.id,ref.ctx_user()); END IF;
 END IF;
 END IF;
 INSERT INTO core.delivery_shortfall_actions VALUES(d.id,a.id,p_choice,qty,result,p_evidence,ref.ctx_user(),now()); RETURN result;
END $$;
-- Khung kết thúc khi hết nghĩa vụ; cọc hoàn về mọi nguồn, không chọn tài khoản từ request.
ALTER TABLE core.bank_instructions DROP CONSTRAINT ck_bi_basis;
ALTER TABLE core.bank_instructions ADD CONSTRAINT ck_bi_basis CHECK(basis_kind IN ('settlement','cancellation','excess','fee_refund','debt_offset','ops_decision','deposit_adjustment','framework_close'));
CREATE TABLE core.framework_closures(framework_id uuid PRIMARY KEY REFERENCES core.framework_contracts,deposit_id uuid NOT NULL REFERENCES core.deposits,refund_vnd bigint NOT NULL CHECK(refund_vnd>=0),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE core.framework_closures ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.framework_closures FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.guard_framework_close_instruction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f core.framework_closures%ROWTYPE; used bigint;
BEGIN
 IF NEW.basis_kind='framework_close' THEN
 SELECT * INTO f FROM core.framework_closures WHERE framework_id=NEW.basis_id;
 SELECT coalesce(sum(amount_vnd),0) INTO used FROM core.bank_instructions WHERE basis_kind='framework_close' AND basis_id=NEW.basis_id AND status<>'failed';
 IF f.deposit_id IS DISTINCT FROM NEW.deposit_id OR NEW.kind<>'refund_deposit_to_buyer' OR used+NEW.amount_vnd>f.refund_vnd THEN RAISE EXCEPTION 'Lệnh khác số dư đóng khung' USING HINT='ck_instruction_basis'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER a_framework_close BEFORE INSERT ON core.bank_instructions FOR EACH ROW EXECUTE FUNCTION core.guard_framework_close_instruction();
CREATE FUNCTION cmd.close_framework(p_framework uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; d core.deposits%ROWTYPE; e core.bank_events%ROWTYPE; amount bigint; available bigint; balance bigint; c core.framework_closures%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE;
 IF f.status='ended' THEN RETURN 'ended'; END IF;
 IF f.status NOT IN ('running','needs_security') OR EXISTS(SELECT 1 FROM core.orders WHERE framework_id=f.id AND status NOT IN ('closed','completed')) OR EXISTS(SELECT 1 FROM core.direct_payments WHERE framework_id=f.id AND status NOT IN ('fully_received','cancelled')) OR EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE framework_id=f.id AND account_type='seller_receivable' AND balance_vnd<>0) THEN RAISE EXCEPTION 'Khung còn giao nhận/công nợ' USING HINT='ck_framework_debt'; END IF;
 SELECT * INTO d FROM core.deposits WHERE framework_id=f.id FOR UPDATE;
 SELECT * INTO c FROM core.framework_closures WHERE framework_id=f.id;
 IF c.framework_id IS NULL THEN
 SELECT coalesce(sum(balance_vnd),0) INTO balance FROM ledger.v_account_balances WHERE framework_id=f.id AND account_type='deposit_escrow';
 INSERT INTO core.framework_closures VALUES(f.id,d.id,balance,now());
 FOR e IN SELECT * FROM core.bank_events WHERE payment_ref=d.payment_ref AND kind='deposit_received' AND apply_result='applied' ORDER BY occurred_at,id FOR UPDATE LOOP
 EXIT WHEN balance<=0;
 SELECT e.amount_vnd-coalesce(sum(amount_vnd),0) INTO available FROM core.bank_instructions WHERE source_bank_event_id=e.id AND status<>'failed'; amount:=least(balance,available);
 IF amount>0 THEN INSERT INTO core.bank_instructions(code,kind,deposit_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_code,target_account_masked,target_account_holder,source_bank_event_id,target_account_hash)
 VALUES('FW-CLOSE-'||f.id||':'||e.id,'refund_deposit_to_buyer',d.id,'framework_close',f.id,amount,f.buyer_org_id,e.payer_bank_code,e.payer_account_masked,e.payer_account_name,e.id,e.payer_account_hash); balance:=balance-amount; END IF;
 END LOOP;
 IF balance>0 THEN RAISE EXCEPTION 'Thiếu nguồn hoàn cọc khung' USING HINT='ck_refund_source'; END IF;
 END IF;
 PERFORM cmd.refresh_deposit(d.id);
 IF EXISTS(SELECT 1 FROM core.bank_instructions WHERE deposit_id=d.id AND status NOT IN ('reconciled','failed')) OR EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE framework_id=f.id AND account_type IN ('deposit_escrow','deposit_in_instruction','deposit_pending','excess_held','excess_in_instruction') AND balance_vnd<>0) THEN RETURN 'processing_money'; END IF;
 UPDATE core.framework_contracts SET status='ended' WHERE id=f.id; RETURN 'ended';
END $$;
CREATE FUNCTION cmd.refresh_framework_security(p_framework uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; over_limit boolean;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE;
 IF f.status NOT IN ('running','needs_security') THEN RAISE EXCEPTION 'Khung chưa chạy' USING HINT='ck_command_state'; END IF;
 SELECT used_vnd>allowed_vnd INTO over_limit FROM core.v_framework_limits WHERE id=f.id;
 UPDATE core.framework_contracts SET status=CASE WHEN over_limit THEN 'needs_security' ELSE 'running' END WHERE id=f.id; RETURN CASE WHEN over_limit THEN 'needs_security' ELSE 'running' END;
END $$;
GRANT EXECUTE ON FUNCTION cmd.agree_acceptance_line(uuid),cmd.begin_arrival_check(uuid,bigint),cmd.resolve_shortfall(uuid,text,tstzrange,uuid) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.close_framework(uuid),cmd.refresh_framework_security(uuid) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
