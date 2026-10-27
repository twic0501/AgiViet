-- Lượng vượt và chuyển rủi ro tại nguồn dựa trên BBNT hai chữ ký.
CREATE TABLE core.acceptance_overage_choices(
 acceptance_id uuid PRIMARY KEY REFERENCES core.acceptance_versions,accepted_by uuid NOT NULL REFERENCES core.users,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE core.acceptance_quantity_finalizations(
 delivery_id uuid PRIMARY KEY REFERENCES core.deliveries,acceptance_id uuid NOT NULL UNIQUE REFERENCES core.acceptance_versions,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.acceptance_quantity_finalizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.acceptance_quantity_finalizations FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TABLE core.source_acceptance_finalizations(
 delivery_id uuid PRIMARY KEY REFERENCES core.deliveries,acceptance_id uuid NOT NULL UNIQUE REFERENCES core.acceptance_versions,
 risk_transfer_id uuid REFERENCES core.risk_transfers,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.acceptance_overage_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.source_acceptance_finalizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.acceptance_overage_choices FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.source_acceptance_finalizations FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
ALTER FUNCTION cmd.submit_acceptance(uuid,bigint,jsonb,jsonb) RENAME TO submit_acceptance_internal;
REVOKE ALL ON FUNCTION cmd.submit_acceptance_internal(uuid,bigint,jsonb,jsonb) FROM agiviet_app;
CREATE FUNCTION cmd.submit_acceptance(p_delivery uuid,p_weighed bigint,p_document jsonb,p_lines jsonb,p_accept_overage boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE d core.deliveries%ROWTYPE; v core.order_versions%ROWTYPE; result uuid;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 SELECT * INTO v FROM core.order_versions WHERE order_id=d.order_id AND version_no=d.version_no;
 IF EXISTS(SELECT 1 FROM core.acceptance_quantity_finalizations WHERE delivery_id=d.id) THEN RAISE EXCEPTION 'Đã chốt tại nguồn: dùng khiếu nại nơi đến' USING HINT='ck_command_acceptance'; END IF;
 IF p_weighed IS NULL OR p_weighed<=0 OR p_accept_overage IS NULL OR (p_weighed>d.planned_qty AND (NOT p_accept_overage OR v.value_basis<>'single_product' OR p_weighed::numeric*10000>d.planned_qty::numeric*(10000+v.qty_tolerance_bps))) THEN RAISE EXCEPTION 'Lượng vượt cần đồng ý rõ và trong dung sai đã ký' USING HINT='ck_acceptance_overage'; END IF;
 result:=cmd.submit_acceptance_internal(p_delivery,p_weighed,p_document,p_lines);
 IF p_weighed>d.planned_qty THEN INSERT INTO core.acceptance_overage_choices VALUES(result,ref.ctx_user(),now()); END IF;
 RETURN result;
END $$;
CREATE FUNCTION cmd.submit_acceptance(p_delivery uuid,p_weighed bigint,p_document jsonb,p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd AS $$ BEGIN
 RETURN cmd.submit_acceptance(p_delivery,p_weighed,p_document,p_lines,false);
END $$;
CREATE FUNCTION cmd.finalize_acceptance_quantity(p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; extra bigint; q bigint; risk uuid;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=p_acceptance;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=d.order_id FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no;
 IF EXISTS(SELECT 1 FROM core.acceptance_quantity_finalizations WHERE delivery_id=d.id AND acceptance_id=a.id) THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM core.acceptance_quantity_finalizations WHERE delivery_id=d.id) THEN RAISE EXCEPTION 'Đã chốt bản khác' USING HINT='PHIEN_BAN_DA_DOI'; END IF;
 extra:=greatest(0,a.weighed_qty-d.planned_qty);
 IF extra>0 AND NOT EXISTS(SELECT 1 FROM ledger.qty_movements WHERE idempotency_key='overage-load:'||d.id) THEN
 IF NOT EXISTS(SELECT 1 FROM core.acceptance_overage_choices WHERE acceptance_id=a.id) OR a.weighed_qty::numeric*10000>d.planned_qty::numeric*(10000+v.qty_tolerance_bps) THEN RAISE EXCEPTION 'Chưa đồng ý phần vượt trong dung sai' USING HINT='ck_acceptance_overage'; END IF;
 PERFORM 1 FROM core.lots WHERE id=o.lot_id FOR UPDATE;
 PERFORM ledger.move_qty(o.lot_id,'available','committed','commit_direct',extra,o.id,'overage-commit:'||d.id);
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key)
 VALUES(o.lot_id,'committed','in_transit','start_check',extra,o.id,d.id,'overage-load:'||d.id);
 END IF;
 IF v.acceptance_point IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom') THEN
 PERFORM cmd.move_delivery_closed(d.id,a.id);
 SELECT coalesce(sum(qty),0) INTO q FROM core.acceptance_lines WHERE acceptance_id=a.id AND kind<>'rejected';
 IF q>0 THEN INSERT INTO core.risk_transfers(delivery_id,from_org_id,to_org_id,qty,acceptance_point,document_id)
 VALUES(d.id,o.seller_org_id,o.buyer_org_id,q,v.acceptance_point,a.document_id) RETURNING id INTO risk; END IF;
 INSERT INTO core.source_acceptance_finalizations VALUES(d.id,a.id,risk,now());
 END IF;
 INSERT INTO core.acceptance_quantity_finalizations VALUES(d.id,a.id,now());
END $$;

CREATE OR REPLACE FUNCTION cmd.agree_acceptance(p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; amount bigint; received bigint; outstanding bigint;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=p_acceptance;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE; o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no;
 IF EXISTS(SELECT 1 FROM core.acceptance_quantity_finalizations WHERE delivery_id=d.id AND acceptance_id=a.id) THEN RETURN; END IF;
 IF d.status<>'awaiting_seller' OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no) OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status='disputed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Cần bản hiện hành hai chữ ký, không tranh chấp' USING HINT='ck_command_acceptance'; END IF;
 UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=a.id AND status='proposed';
 PERFORM cmd.finalize_acceptance_quantity(a.id);
 IF o.framework_id IS NOT NULL THEN RETURN; END IF;
 SELECT coalesce(sum(l.value_vnd),0) INTO amount FROM core.acceptance_lines l JOIN core.acceptance_versions av ON av.id=l.acceptance_id JOIN core.deliveries dl ON dl.id=av.delivery_id WHERE dl.order_id=o.id AND l.status='closed' AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=dl.id AND n.version_no>av.version_no);
 SELECT coalesce(sum(c.amount_vnd),0) INTO received FROM core.direct_payments p JOIN core.direct_payment_confirmations c ON c.direct_payment_id=p.id WHERE p.order_id=o.id AND p.direction='buyer_to_seller';
 SELECT coalesce(sum(p.amount_due_vnd-coalesce((SELECT sum(c.amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0)),0) INTO outstanding FROM core.direct_payments p WHERE p.order_id=o.id AND p.direction='buyer_to_seller' AND p.status NOT IN ('fully_received','cancelled');
 amount:=greatest(0,amount-v.deposit_vnd-received-outstanding);
 IF amount>0 AND v.payment_timing IN ('inspect_then_before_loading','on_receipt','after_days') THEN
 INSERT INTO core.direct_payments(code,order_id,delivery_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,blocks_loading,due_at,payee_bank_code,payee_account_masked,payee_account_holder)
 VALUES('GOODS-'||a.id,o.id,d.id,CASE WHEN v.payment_timing='after_days' THEN 'goods_after_days' ELSE 'goods_on_receipt' END,'buyer_to_seller',o.buyer_org_id,o.seller_org_id,amount,CASE WHEN v.payment_timing='after_days' THEN 'after_days' ELSE 'acceptance_closed' END,'due',v.payment_timing='inspect_then_before_loading',ref.clock_at()+coalesce(v.pay_after_days,0)*interval '1 day',v.seller_bank_code,v.seller_account_masked,v.seller_account_holder);
 END IF;
END $$;

CREATE OR REPLACE FUNCTION cmd.move_delivery_closed(p_delivery uuid,p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,core,ledger,public AS $$
DECLARE x record; d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery;
 IF EXISTS(SELECT 1 FROM core.source_acceptance_finalizations WHERE delivery_id=d.id) THEN RETURN; END IF;
 FOR x IN SELECT lot_id,kind='rejected' rejected,sum(qty)::bigint qty FROM core.acceptance_lines WHERE acceptance_id=p_acceptance GROUP BY lot_id,kind='rejected' ORDER BY lot_id,kind='rejected' LOOP
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(x.lot_id,'in_transit',CASE WHEN x.rejected THEN 'returned_pending' ELSE 'delivered' END,CASE WHEN x.rejected THEN 'reject' ELSE 'accept' END,x.qty,d.order_id,d.id,'delivery-close:'||d.id||':'||x.lot_id||':'||x.rejected); END LOOP;
END $$;

CREATE OR REPLACE FUNCTION cmd.begin_arrival_check(p_delivery uuid,p_weighed bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; hours integer;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE; o:=cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.receiver_user_id IS DISTINCT FROM ref.ctx_user() OR p_weighed IS NULL OR p_weighed<0 THEN RAISE EXCEPTION 'Sai người nhận/lượng cân' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT silent_accept_hours INTO hours FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no;
 UPDATE core.deliveries SET status='arrival_check' WHERE id=d.id;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('arrival_check','delivery',d.id,o.id,ref.clock_at()+coalesce(hours,2)*interval '1 hour',ref.clock_at());
 PERFORM evt.emit('delivery',d.id,'delivery.arrival_check',jsonb_build_object('weighed_qty',p_weighed),ARRAY['notify']);
END $$;

CREATE OR REPLACE FUNCTION cmd.expire_deadline_result(p_deadline uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE h core.deadlines%ROWTYPE; result jsonb; action text; v_status text; task uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO h FROM core.deadlines WHERE id=p_deadline FOR UPDATE;
 SELECT r.result INTO result FROM cmd.deadline_results r WHERE deadline_id=h.id;
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF h.id IS NULL OR h.due_at>ref.clock_at() THEN RAISE EXCEPTION 'Hạn chưa đến' USING HINT='ck_deadline_not_due'; END IF;
 IF h.status<>'open' THEN RETURN jsonb_build_object('status',h.status,'action','already_handled','kind',h.kind,'entity',h.entity,'entity_id',h.entity_id,'order_id',h.order_id); END IF;
 PERFORM set_config('app.reason','Hết hạn '||h.kind,true);
 IF h.kind='deposit' AND EXISTS(SELECT 1 FROM core.deposits WHERE id=h.entity_id AND status='held') THEN
 PERFORM cmd.activate_order_after_deposit((SELECT order_id FROM core.deposits WHERE id=h.entity_id)); action:='order_activated_after_deposit';
 ELSIF h.kind='group_cutoff' THEN action:='group_'||cmd.cutoff_group(h.entity_id);
 ELSIF h.kind='dispute_agreement' THEN
 UPDATE core.disputes SET status='external_resolution' WHERE id=h.entity_id AND status='inconclusive';
 task:=cmd.create_task('V12',2::smallint,h.entity,h.entity_id,h.order_id,'risk','deadline:'||h.id,'Tranh chấp không kết luận: chuyển cơ chế khác, giữ nguyên tiền'); action:='external_resolution';
 ELSIF h.kind='amendment_reply' AND EXISTS(SELECT 1 FROM core.amendments WHERE id=h.entity_id AND kind='force_majeure_reduction' AND status='open') THEN
 task:=cmd.create_task('V13',2::smallint,h.entity,h.entity_id,h.order_id,'risk','deadline:'||h.id,'Bất khả kháng: xét chứng cứ sau 24 giờ, không ký thay tự động'); action:='force_majeure_review';
 ELSIF h.kind='arrival_check' AND EXISTS(
 SELECT 1 FROM core.deliveries d JOIN core.order_versions v ON v.order_id=d.order_id AND v.version_no=d.version_no
 JOIN core.documents doc ON doc.id=v.document_id WHERE d.id=h.entity_id AND d.status='arrival_check' AND v.silent_accept_hours>0
 AND doc.status IN ('fully_signed','effective') AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=doc.id AND party='buyer') AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=doc.id AND party='seller')
 AND h.due_at>=h.created_at+v.silent_accept_hours*interval '1 hour') THEN
 PERFORM cmd.close_delivery(h.entity_id); action:='delivery_closed_by_silence';
 ELSIF h.kind='direct_payment_confirm' THEN
 IF EXISTS(SELECT 1 FROM core.direct_payments WHERE id=h.entity_id AND status='payer_reported') THEN
 UPDATE core.direct_payments SET status='mismatch' WHERE id=h.entity_id AND status='payer_reported';
 task:=cmd.create_task('V08',2::smallint,h.entity,h.entity_id,h.order_id,'finance','deadline:'||h.id,'Báo trả chưa được xác nhận: đối soát, không ghi đã nhận'); action:='payment_reconciliation';
 ELSE action:='already_satisfied'; END IF;
 ELSE
 v_status:=cmd.expire_deadline_internal(h.id);
 action:=CASE h.kind WHEN 'offer_reply' THEN 'offer_expired' WHEN 'hold' THEN 'hold_released' WHEN 'seller_sign' THEN 'order_sign_expired' WHEN 'deposit' THEN 'order_deposit_expired' WHEN 'cancellation_reply' THEN 'cancel_rejected' WHEN 'amendment_reply' THEN 'amendment_rejected' WHEN 'lot_visibility' THEN 'lot_hidden' WHEN 'urgent_sale' THEN 'urgent_sale_ended' WHEN 'direct_payment_due' THEN 'payment_overdue' ELSE 'evidence_review_required' END;
 SELECT id INTO task FROM ops.tasks WHERE dedup_key='deadline:'||h.id;
 END IF;
 UPDATE core.deadlines SET status='expired' WHERE id=h.id AND core.deadlines.status='open';
 result:=jsonb_build_object('status',(SELECT status FROM core.deadlines WHERE id=h.id),'action',action,'kind',h.kind,'entity',h.entity,'entity_id',h.entity_id,'order_id',h.order_id,'task_id',task);
 INSERT INTO cmd.deadline_results(deadline_id,result) VALUES(h.id,result);
 PERFORM evt.emit('deadline',h.id,'deadline.processed',result,ARRAY['notify']); RETURN result;
END $$;

-- Rút hàng đang tranh chấp: biên bản trả có hai chữ ký trước khi thay bản nghiệm thu.
CREATE TABLE core.dispute_goods_withdrawals(
 dispute_id uuid PRIMARY KEY REFERENCES core.disputes,record_id uuid NOT NULL UNIQUE REFERENCES core.documents,
 acceptance_id uuid NOT NULL UNIQUE REFERENCES core.acceptance_versions,withdrawn_qty bigint NOT NULL CHECK(withdrawn_qty>0),
 created_by uuid NOT NULL REFERENCES core.users,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.dispute_goods_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.dispute_goods_withdrawals FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds,requires_reason) VALUES('delivery','disputed','checking',ARRAY['buyer'],true);
UPDATE ref.state_transitions SET actor_kinds=array_append(actor_kinds,'buyer') WHERE entity IN ('dispute','acceptance_line') AND from_status IN ('open','awaiting_seller','disputed') AND to_status IN ('resolved','closed') AND NOT ('buyer'=ANY(actor_kinds));
CREATE FUNCTION cmd.prepare_dispute_withdrawal(p_dispute uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE tc core.disputes%ROWTYPE; a core.acceptance_versions%ROWTYPE;
BEGIN
 SELECT * INTO tc FROM core.disputes WHERE id=p_dispute FOR UPDATE;
 PERFORM cmd.order_party(tc.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 SELECT av.* INTO a FROM core.acceptance_lines l JOIN core.acceptance_versions av ON av.id=l.acceptance_id WHERE l.id=tc.line_id;
 IF tc.status NOT IN ('open','awaiting_seller') OR EXISTS(SELECT 1 FROM core.source_acceptance_finalizations WHERE delivery_id=a.delivery_id) OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=a.delivery_id AND version_no>a.version_no)
 OR tc.disputed_qty IS DISTINCT FROM (SELECT qty FROM core.acceptance_lines WHERE id=tc.line_id) OR p_document->'canonical_content' IS DISTINCT FROM jsonb_build_object('action','withdraw_disputed_goods','dispute_id',tc.id,'acceptance_id',a.id,'qty',tc.disputed_qty) THEN RAISE EXCEPTION 'Cần biên bản đúng phần tranh chấp chưa kiểm định' USING HINT='ck_dispute_scope'; END IF;
 RETURN cmd.attach_document(tc.order_id,'return_record',p_document,'dispute',tc.id);
END $$;
CREATE FUNCTION cmd.revise_acceptance_after_withdrawal(p_dispute uuid,p_record uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE tc core.disputes%ROWTYPE; a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; l core.acceptance_lines%ROWTYPE; result uuid; doc uuid; n smallint:=0;
BEGIN
 SELECT * INTO tc FROM core.disputes WHERE id=p_dispute FOR UPDATE; o:=cmd.order_party(tc.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 SELECT acceptance_id INTO result FROM core.dispute_goods_withdrawals WHERE dispute_id=tc.id;
 IF result IS NOT NULL THEN
 IF NOT EXISTS(SELECT 1 FROM core.dispute_goods_withdrawals w JOIN core.acceptance_versions av ON av.id=w.acceptance_id JOIN core.documents dd ON dd.id=av.document_id WHERE w.dispute_id=tc.id AND w.record_id=p_record AND dd.content_sha256=(p_document->>'content_sha256')::bytea) THEN RAISE EXCEPTION 'Rút hàng khác bản đã ghi' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN result; END IF;
 SELECT av.* INTO a FROM core.acceptance_lines al JOIN core.acceptance_versions av ON av.id=al.acceptance_id WHERE al.id=tc.line_id;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 IF tc.status NOT IN ('open','awaiting_seller') OR d.status<>'disputed' OR d.receiver_user_id IS DISTINCT FROM ref.ctx_user() OR tc.disputed_qty>=a.weighed_qty
 OR EXISTS(SELECT 1 FROM core.disputes other JOIN core.acceptance_lines al ON al.id=other.line_id JOIN core.acceptance_versions av ON av.id=al.acceptance_id WHERE av.delivery_id=d.id AND other.id<>tc.id AND other.status<>'resolved')
 OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no)
 OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_record AND doc_type='return_record' AND order_id=o.id AND entity='dispute' AND entity_id=tc.id AND canonical_content=jsonb_build_object('action','withdraw_disputed_goods','dispute_id',tc.id,'acceptance_id',a.id,'qty',tc.disputed_qty))
 OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=p_record AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=p_record AND party='seller') THEN RAISE EXCEPTION 'Cần biên bản rút hàng hai bên đã ký đúng bản hiện hành' USING HINT='ck_dispute_scope'; END IF;
 doc:=cmd.attach_document(o.id,'acceptance_record',p_document,'delivery',d.id);
 INSERT INTO core.acceptance_versions(delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by)
 VALUES(d.id,a.version_no+1,a.id,a.weighed_qty-tc.disputed_qty,doc,ref.ctx_user()) RETURNING id INTO result;
 FOR l IN SELECT * FROM core.acceptance_lines WHERE acceptance_id=a.id AND id<>tc.line_id ORDER BY line_no LOOP
 n:=n+1;
 INSERT INTO core.acceptance_lines(acceptance_id,line_no,lot_id,order_line_no,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id,measurements)
 VALUES(result,n,l.lot_id,l.order_line_no,l.kind,l.qty,l.payable_qty,l.unit_price_vnd,l.value_vnd,l.reason_code,l.evidence_document_id,l.measurements);
 END LOOP;
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key)
 SELECT lot_id,'in_transit','returned_pending','reject',tc.disputed_qty,o.id,d.id,'dispute-withdraw:'||tc.id FROM core.acceptance_lines WHERE id=tc.line_id;
 UPDATE core.acceptance_lines SET status='closed' WHERE id=tc.line_id;
 UPDATE core.disputes SET status='resolved' WHERE id=tc.id;
 PERFORM set_config('app.reason','Hai bên ký rút phần tranh chấp, gửi bản nghiệm thu mới',true);
 UPDATE core.deliveries SET status='checking',planned_qty=planned_qty-tc.disputed_qty WHERE id=d.id;
 UPDATE core.deadlines SET status='met' WHERE entity='dispute' AND entity_id=tc.id AND status='open';
 INSERT INTO core.dispute_goods_withdrawals VALUES(tc.id,p_record,result,tc.disputed_qty,ref.ctx_user(),now()); RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.submit_acceptance(uuid,bigint,jsonb,jsonb),cmd.submit_acceptance(uuid,bigint,jsonb,jsonb,boolean),cmd.prepare_dispute_withdrawal(uuid,jsonb),cmd.revise_acceptance_after_withdrawal(uuid,uuid,jsonb) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

CREATE OR REPLACE FUNCTION cmd.finish_warehouse_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; o core.orders%ROWTYPE; x record;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 IF NOT EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no AND acceptance_point IN ('tai_kho_ben_mua','tai_cua_ben_mua')) THEN RAISE EXCEPTION 'Không giao tại kho/cửa' USING HINT='ck_command_state'; END IF;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF a.id IS NULL OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Chưa chốt nghiệm thu' USING HINT='ck_command_acceptance'; END IF;
 IF d.status='closed' THEN RETURN; END IF;
 PERFORM cmd.finalize_acceptance_quantity(a.id);
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
 PERFORM cmd.move_delivery_closed(d.id,a.id);
END $$;
COMMENT ON TABLE app_auth.registration_receipts IS 'Receipt SMS đăng ký do auth adapter xác nhận; payload cố định và hạn giờ thật, không cấp login hoặc vai.';
COMMENT ON TABLE core.registration_results IS 'Kết quả đăng ký một lần theo receipt; user/tổ chức pending, chưa cấp chủ trước xác minh hai người.';
COMMENT ON TABLE core.subscription_changes IS 'Lịch sử thay gói từ billing system, giữ khóa/hash/chứng từ; không đổi các snapshot đơn cũ.';
COMMENT ON TABLE mkt.command_cache_batches IS 'Batch tính ghép có hash JSONB và expiry; lý do whitelist không chứa giá kín, không coi ghép là xác minh.';
COMMENT ON TABLE core.acceptance_overage_choices IS 'Người nhận chủ động nhận vượt trong dung sai đã ký; chưa chuyển lượng trước khi seller ký.';
COMMENT ON TABLE core.source_acceptance_finalizations IS 'BBNT tại nguồn hai chữ ký đã chuyển lượng đạt/trả và rủi ro đúng một lần trước vận chuyển.';
COMMENT ON TABLE core.acceptance_quantity_finalizations IS 'Bản nghiệm thu đã chốt cấp nguồn lượng vượt, ngăn gửi lại tùy ý sau nghĩa vụ tiền/lượng.';
COMMENT ON TABLE core.dispute_goods_withdrawals IS 'Hai bên ký rút đúng một dòng trước kiểm định, giảm lượng giao của đợt và nối bản nghiệm thu mới chưa ký.';
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT n.nspname,c.relname,a.attname FROM pg_namespace n JOIN pg_class c ON c.relnamespace=n.oid JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 WHERE (n.nspname,c.relname) IN (('app_auth','registration_receipts'),('core','registration_results'),('core','subscription_changes'),('mkt','command_cache_batches'),('core','acceptance_overage_choices'),('core','source_acceptance_finalizations'),('core','acceptance_quantity_finalizations'),('core','dispute_goods_withdrawals')) LOOP
 EXECUTE format('COMMENT ON COLUMN %I.%I.%I IS %L',r.nspname,r.relname,r.attname,'Dữ liệu '||r.relname||': '||r.attname||'; command kiểm căn cứ, danh tính từ login và giữ lịch sử.'); END LOOP;
END $$;

CREATE OR REPLACE FUNCTION cmd.close_resolved_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; x record; pending bigint; delivered bigint; returned bigint; delta bigint;
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
  IF EXISTS(SELECT 1 FROM core.source_acceptance_finalizations WHERE delivery_id=d.id) THEN
   -- Phần trả đã tách tại nguồn (kể cả đã sang lô con) không bị trả lần hai.
   IF x.rejected THEN
    SELECT coalesce(sum(qty),0) INTO returned FROM ledger.qty_movements WHERE delivery_id=d.id AND lot_id=x.lot_id AND to_bucket='returned_pending' AND idempotency_key NOT LIKE 'dispute-withdraw:%';
    delta:=x.qty-returned;
    IF delta<0 THEN RAISE EXCEPTION 'Bản mới không được xóa phần hàng đã trả' USING HINT='ck_command_acceptance'; END IF;
    IF delta>0 THEN INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key)
    VALUES(x.lot_id,'delivered','returned_pending','reject_after',delta,d.order_id,d.id,'resolved-source:'||d.id||':'||a.id||':'||x.lot_id); END IF;
   END IF;
  ELSIF pending>0 THEN INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(x.lot_id,'in_transit',CASE WHEN x.rejected THEN 'returned_pending' ELSE 'delivered' END,CASE WHEN x.rejected THEN 'reject' ELSE 'accept' END,x.qty,d.order_id,d.id,'resolved:'||d.id||':'||x.lot_id||':'||x.rejected);
  ELSIF delivered>0 AND x.rejected THEN INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(x.lot_id,'delivered','returned_pending','reject_after',x.qty,d.order_id,d.id,'resolved-return:'||d.id||':'||x.lot_id);
  END IF;
 END LOOP;
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
END $$;

CREATE OR REPLACE FUNCTION cmd.close_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; o core.orders%ROWTYPE; accepted bigint; rejected bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=d.order_id FOR UPDATE;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF d.status='closed' THEN RETURN; END IF;
 IF d.status='disputed' THEN PERFORM cmd.close_resolved_delivery(d.id); RETURN; END IF;
 IF a.id IS NULL OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Nghiệm thu chưa chốt' USING HINT='ck_command_acceptance'; END IF;
 -- system không thay seller xác nhận tại nguồn. Ghi nhận đóng sau arrived/arrival_check.
 IF d.status='arrived' THEN RAISE EXCEPTION 'Người nhận cần begin_arrival_check' USING HINT='ck_command_state'; END IF;
 IF d.status='awaiting_seller' THEN
 -- Chuyển này chỉ được ghi bởi seller; system từ chối để giữ máy trạng thái cũ.
 RAISE EXCEPTION 'Người bán cần chốt tại kho qua finish_warehouse_delivery' USING HINT='ck_command_state'; END IF;
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
 PERFORM cmd.move_delivery_closed(d.id,a.id);
 PERFORM cmd.sync_document(a.document_id);
END $$;
