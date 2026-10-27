-- Những bước còn phải ghép SQL ở backend. Không có API đổi trạng thái/bảng tùy ý.
CREATE FUNCTION cmd.raise_demand_price(p_line uuid,p_price bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.demands%ROWTYPE; result bigint;
BEGIN
 PERFORM cmd.enter_actor();
 SELECT dm.* INTO d FROM core.demands dm JOIN core.demand_lines l ON l.demand_id=dm.id WHERE l.id=p_line FOR UPDATE OF dm,l;
 PERFORM cmd.require_org(d.buyer_org_id,ARRAY['owner','purchaser']);
 IF d.status NOT IN ('draft','open') OR p_price IS NULL OR p_price<=0 THEN RAISE EXCEPTION 'Nhu cầu không còn sửa giá' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_by,set_at) VALUES(p_line,p_price,ref.ctx_user(),ref.clock_at()) RETURNING id INTO result;
 PERFORM evt.emit('demand',d.id,'demand.price_changed','{}',ARRAY['notify']); RETURN result;
END $$;

-- Đóng tin không để lời chào cũ còn được nhận. Hold đã nhận vẫn phải đóng theo đơn.
CREATE OR REPLACE FUNCTION cmd.close_demand(p_demand uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.demands%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO d FROM core.demands WHERE id=p_demand FOR UPDATE;
 PERFORM cmd.require_org(d.buyer_org_id,ARRAY['owner','purchaser']);
 IF d.status='closed' THEN RETURN; END IF;
 PERFORM set_config('app.reason','Bên mua đóng nhu cầu',true); UPDATE core.demands SET status='closed' WHERE id=d.id;
 -- Chuyển phát sinh từ đóng tin, sau khi đã kiểm người mua; không nhận actor từ request.
 PERFORM set_config('app.actor_kind','system',true);
 UPDATE core.offers SET status='expired' WHERE demand_line_id IN (SELECT id FROM core.demand_lines WHERE demand_id=d.id) AND status='sent';
 UPDATE core.deadlines SET status='cancelled' WHERE entity='offer' AND entity_id IN (SELECT o.id FROM core.offers o JOIN core.demand_lines l ON l.id=o.demand_line_id WHERE l.demand_id=d.id AND o.status='expired') AND status='open';
 PERFORM cmd.enter_actor(); PERFORM evt.emit('demand',d.id,'demand.closed','{}',ARRAY['notify']);
END $$;

-- Hủy trước cọc là đóng nghĩa vụ chưa hiệu lực; khoản đã vào deposit_pending
-- phải trở về đúng nguồn qua bank_return_tasks, không nhập giả vào cọc escrow.
CREATE FUNCTION cmd.process_unsigned_cancellation(p_request uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ledger,ref,public AS $$
DECLARE c core.cancellation_requests%ROWTYPE; o core.orders%ROWTYPE; dep core.deposits%ROWTYPE; doc uuid; a core.cancellation_accountings%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO c FROM core.cancellation_requests WHERE id=p_request FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=c.order_id FOR UPDATE;
 SELECT * INTO a FROM core.cancellation_accountings WHERE cancellation_id=c.id;
 IF a.cancellation_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM core.documents WHERE id=a.document_id AND content_sha256=(p_document->>'content_sha256')::bytea) THEN RAISE EXCEPTION 'Hủy khác chứng từ đã ghi' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN a.document_id;
 END IF;
 IF c.status IS DISTINCT FROM 'processing_money' OR o.status NOT IN ('drafting','internal_approval','awaiting_seller','awaiting_deposit')
 OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=o.id) OR EXISTS(SELECT 1 FROM core.direct_payments WHERE order_id=o.id)
 OR EXISTS(SELECT 1 FROM core.deposits WHERE order_id=o.id AND status NOT IN ('awaiting_transfer','partially_received')) THEN RAISE EXCEPTION 'Chỉ hủy trước cọc chưa hiệu lực' USING HINT='ck_command_cancel'; END IF;
 SELECT * INTO dep FROM core.deposits WHERE order_id=o.id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM ledger.v_account_balances WHERE order_id=o.id AND account_type IN ('deposit_escrow','deposit_in_instruction','fee_held') AND balance_vnd<>0) THEN RAISE EXCEPTION 'Đã có cọc: dùng process_cancellation' USING HINT='ck_command_cancel'; END IF;
 doc:=cmd.attach_document(o.id,'cancellation_record',p_document,'cancellation',c.id);
 INSERT INTO core.cancellation_accountings VALUES(c.id,o.id,doc,0,0,0,0,0,0,0,0,0,0,0,0,now());
 PERFORM set_config('app.reason','Hủy trước khi cọc đủ',true);
 UPDATE core.holds SET status='released' WHERE id=o.hold_id AND status='active';
 UPDATE core.deadlines SET status='cancelled' WHERE order_id=o.id AND status='open';
 UPDATE core.documents SET status='cancelled',cancel_reason='cancel_before_deposit' WHERE order_id=o.id AND doc_type IN ('contract','annex') AND status IN ('draft','awaiting_signature','partially_signed','fully_signed');
 IF dep.status='awaiting_transfer' THEN UPDATE core.deposits SET status='void' WHERE id=dep.id; END IF;
 UPDATE core.orders SET status='closed',close_reason='cancel_before_deposit' WHERE id=o.id;
 INSERT INTO ops.bank_return_tasks(bank_event_id,deposit_id,reason)
 SELECT e.id,dep.id,'cancel_before_deposit' FROM core.bank_events e WHERE e.payment_ref=dep.payment_ref AND e.kind='deposit_received' AND e.apply_result='applied' AND dep.status='partially_received' ON CONFLICT DO NOTHING;
 PERFORM evt.emit('cancellation',c.id,'cancellation.accounted',jsonb_build_object('order_id',o.id,'document_id',doc,'before_deposit',true),ARRAY['notify']); RETURN doc;
END $$;

-- Người bán nhận lại phần bị từ chối trước kiểm định: ký chính biên bản đã có,
-- ghi căn cứ rút bất biến và tạo lô con từ returned_pending, không khai lượng mới.
CREATE TABLE core.dispute_withdrawals(
 dispute_id uuid PRIMARY KEY REFERENCES core.disputes,acceptance_id uuid NOT NULL REFERENCES core.acceptance_versions,
 withdrawn_by uuid NOT NULL REFERENCES core.users,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.dispute_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.dispute_withdrawals FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds) VALUES('dispute','open','resolved',ARRAY['seller']);
CREATE FUNCTION cmd.withdraw_dispute(p_dispute uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE tc core.disputes%ROWTYPE; l core.acceptance_lines%ROWTYPE; a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO tc FROM core.disputes WHERE id=p_dispute FOR UPDATE;
 PERFORM cmd.order_party(tc.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 IF EXISTS(SELECT 1 FROM core.dispute_withdrawals WHERE dispute_id=tc.id) THEN RETURN; END IF;
 SELECT * INTO l FROM core.acceptance_lines WHERE id=tc.line_id;
 SELECT * INTO a FROM core.acceptance_versions WHERE id=l.acceptance_id;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 IF tc.status NOT IN ('open','awaiting_seller') OR l.kind IS DISTINCT FROM 'rejected' OR tc.disputed_qty IS DISTINCT FROM l.qty
 OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no)
 OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer')
 OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Cần phần trả lại hiện hành đã ký, chưa kiểm định' USING HINT='ck_dispute_scope'; END IF;
 UPDATE core.acceptance_lines SET status='closed' WHERE id=l.id AND status='disputed';
 UPDATE core.disputes SET status='resolved' WHERE id=tc.id;
 INSERT INTO core.dispute_withdrawals(dispute_id,acceptance_id,withdrawn_by) VALUES(tc.id,a.id,ref.ctx_user());
 UPDATE core.deadlines SET status='met' WHERE entity='dispute' AND entity_id=tc.id AND status='open';
 PERFORM evt.emit('dispute',tc.id,'dispute.withdrawn',jsonb_build_object('acceptance_id',a.id),ARRAY['notify']);
END $$;

CREATE OR REPLACE FUNCTION cmd.close_resolved_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; x record; pending bigint; delivered bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 PERFORM 1 FROM core.orders WHERE id=d.order_id FOR UPDATE;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF d.status='closed' THEN RETURN; END IF;
 IF d.status IS DISTINCT FROM 'disputed' OR a.id IS NULL
 OR EXISTS(SELECT 1 FROM core.disputes tc JOIN core.acceptance_lines al ON al.id=tc.line_id JOIN core.acceptance_versions av ON av.id=al.acceptance_id WHERE av.delivery_id=d.id AND tc.status<>'resolved')
 OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed')
 OR NOT (EXISTS(SELECT 1 FROM core.dispute_resolutions WHERE acceptance_id=a.id) OR
 (EXISTS(SELECT 1 FROM core.dispute_withdrawals WHERE acceptance_id=a.id) AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller'))) THEN RAISE EXCEPTION 'Chưa kết luận hết tranh chấp' USING HINT='ck_command_acceptance'; END IF;
 FOR x IN SELECT lot_id,kind='rejected' rejected,sum(qty)::bigint qty FROM core.acceptance_lines WHERE acceptance_id=a.id GROUP BY lot_id,kind='rejected' ORDER BY lot_id,kind='rejected' LOOP
  SELECT coalesce(sum(CASE WHEN to_bucket='in_transit' THEN qty WHEN from_bucket='in_transit' THEN -qty ELSE 0 END),0),coalesce(sum(CASE WHEN to_bucket='delivered' THEN qty WHEN from_bucket='delivered' THEN -qty ELSE 0 END),0) INTO pending,delivered FROM ledger.qty_movements WHERE delivery_id=d.id AND lot_id=x.lot_id;
  IF pending>0 THEN INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(x.lot_id,'in_transit',CASE WHEN x.rejected THEN 'returned_pending' ELSE 'delivered' END,CASE WHEN x.rejected THEN 'reject' ELSE 'accept' END,x.qty,d.order_id,d.id,'resolved:'||d.id||':'||x.lot_id||':'||x.rejected);
  ELSIF delivered>0 AND x.rejected THEN INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(x.lot_id,'delivered','returned_pending','reject_after',x.qty,d.order_id,d.id,'resolved-return:'||d.id||':'||x.lot_id);
  END IF;
 END LOOP;
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
END $$;

GRANT EXECUTE ON FUNCTION cmd.raise_demand_price(uuid,bigint),cmd.withdraw_dispute(uuid) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.process_unsigned_cancellation(uuid,jsonb) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
COMMENT ON TABLE core.dispute_withdrawals IS 'Người bán ký chấp nhận phần bị từ chối trước kiểm định; căn cứ đóng tranh chấp, không giả kết luận kiểm định.';
COMMENT ON COLUMN core.dispute_withdrawals.dispute_id IS 'Tranh chấp rút đúng một lần.';
COMMENT ON COLUMN core.dispute_withdrawals.acceptance_id IS 'Bản nghiệm thu đã được hai bên ký và người bán nhận lại phần trả.';
COMMENT ON COLUMN core.dispute_withdrawals.withdrawn_by IS 'Người bán lấy từ login đã ánh xạ.';
COMMENT ON COLUMN core.dispute_withdrawals.created_at IS 'Thời điểm ghi căn cứ bất biến theo giờ thật.';
