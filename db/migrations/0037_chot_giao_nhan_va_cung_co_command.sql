CREATE FUNCTION cmd.send_acceptance(p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=p_acceptance;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.receiver_user_id IS DISTINCT FROM ref.ctx_user() OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no)
 OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer' AND signer_user_id=ref.ctx_user()) THEN RAISE EXCEPTION 'Chưa ký bản nghiệm thu mới nhất' USING HINT='ck_command_acceptance'; END IF;
 UPDATE core.deliveries SET status='awaiting_seller' WHERE id=d.id;
END $$;
CREATE OR REPLACE FUNCTION cmd.agree_acceptance(p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; amount bigint;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=p_acceptance;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no;
 IF d.status<>'awaiting_seller' OR EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no)
 OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status='disputed')
 OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Chỉ chốt bản mới nhất có hai chữ ký, không tranh chấp' USING HINT='ck_command_acceptance'; END IF;
 UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=a.id AND status='proposed';
 SELECT greatest(0,coalesce(sum(value_vnd),0)-v.deposit_vnd) INTO amount FROM core.acceptance_lines WHERE acceptance_id=a.id;
 IF amount>0 AND v.payment_timing IN ('inspect_then_before_loading','on_receipt','after_days') THEN
 INSERT INTO core.direct_payments(code,order_id,delivery_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,blocks_loading,due_at,payee_bank_code,payee_account_masked,payee_account_holder)
 VALUES('GOODS-'||d.id,o.id,d.id,CASE v.payment_timing WHEN 'after_days' THEN 'goods_after_days' ELSE 'goods_on_receipt' END,'buyer_to_seller',o.buyer_org_id,o.seller_org_id,amount,CASE v.payment_timing WHEN 'after_days' THEN 'after_days' ELSE 'acceptance_closed' END,'due',v.payment_timing='inspect_then_before_loading',ref.clock_at()+coalesce(v.pay_after_days,0)*interval '1 day',v.seller_bank_code,v.seller_account_masked,v.seller_account_holder);
 END IF;
 -- Đợt ở awaiting_seller: seller dispatch tại vườn, system close tại kho sau đủ chữ ký.
END $$;
CREATE FUNCTION cmd.close_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; o core.orders%ROWTYPE; accepted bigint; rejected bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 SELECT * INTO o FROM core.orders WHERE id=d.order_id FOR UPDATE;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF d.status='closed' THEN RETURN; END IF;
 IF a.id IS NULL OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Nghiệm thu chưa chốt' USING HINT='ck_command_acceptance'; END IF;
 -- system không thay seller xác nhận tại nguồn. Ghi nhận đóng sau arrived/arrival_check.
 IF d.status='arrived' THEN UPDATE core.deliveries SET status='arrival_check' WHERE id=d.id; END IF;
 IF d.status='awaiting_seller' THEN
 -- Chuyển này chỉ được ghi bởi seller; system từ chối để giữ máy trạng thái cũ.
 RAISE EXCEPTION 'Người bán cần chốt tại kho qua finish_warehouse_delivery' USING HINT='ck_command_state'; END IF;
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
 SELECT coalesce(sum(qty) FILTER(WHERE kind<>'rejected'),0),coalesce(sum(qty) FILTER(WHERE kind='rejected'),0) INTO accepted,rejected FROM core.acceptance_lines WHERE acceptance_id=a.id;
 IF accepted>0 THEN INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(o.lot_id,'in_transit','delivered','accept',accepted,o.id,d.id,'accept:'||d.id); END IF;
 IF rejected>0 THEN INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key) VALUES(o.lot_id,'in_transit','returned_pending','reject',rejected,o.id,d.id,'reject:'||d.id); END IF;
 PERFORM cmd.sync_document(a.document_id);
END $$;
-- Bên bán được chốt đợt tại kho; đóng lượng để system sau đó không phải giả actor seller.
CREATE FUNCTION cmd.finish_warehouse_delivery(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; a core.acceptance_versions%ROWTYPE; o core.orders%ROWTYPE; x record;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 IF NOT EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=o.id AND version_no=d.version_no AND acceptance_point IN ('tai_kho_ben_mua','tai_cua_ben_mua')) THEN RAISE EXCEPTION 'Không giao tại kho/cửa' USING HINT='ck_command_state'; END IF;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF a.id IS NULL OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Chưa chốt nghiệm thu' USING HINT='ck_command_acceptance'; END IF;
 UPDATE core.deliveries SET status='closed' WHERE id=d.id;
 FOR x IN SELECT kind='rejected' rejected,sum(qty)::bigint qty FROM core.acceptance_lines WHERE acceptance_id=a.id GROUP BY kind='rejected' LOOP
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key)
 VALUES(o.lot_id,'in_transit',CASE WHEN x.rejected THEN 'returned_pending' ELSE 'delivered' END,CASE WHEN x.rejected THEN 'reject' ELSE 'accept' END,x.qty,o.id,d.id,CASE WHEN x.rejected THEN 'reject:' ELSE 'accept:' END||d.id);
 END LOOP;
END $$;
CREATE FUNCTION cmd.finish_order(p_order uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 IF o.status='completed' THEN RETURN o.status; END IF;
 IF EXISTS(SELECT 1 FROM core.direct_payments WHERE order_id=o.id AND status NOT IN ('fully_received','cancelled')) THEN
 IF o.status='awaiting_settlement' THEN UPDATE core.orders SET status='outstanding' WHERE id=o.id; END IF; RETURN 'outstanding'; END IF;
 UPDATE core.orders SET status='completed' WHERE id=o.id; -- lifecycle kiểm sổ, quyết toán cuối, đối soát.
 RETURN 'completed';
END $$;
GRANT EXECUTE ON FUNCTION cmd.send_acceptance(uuid),cmd.finish_warehouse_delivery(uuid) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.close_delivery(uuid),cmd.finish_order(uuid) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

GRANT EXECUTE ON FUNCTION ref.clock_at() TO agiviet_orchestrator;
CREATE FUNCTION cmd.attach_evidence(p_order uuid,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.order_party(p_order,ref.ctx_actor(),ARRAY['owner','purchaser','accountant','warehouse','site_receiver','coop_board','collection_staff']);
 RETURN cmd.attach_document(p_order,'evidence',p_document);
END $$;
CREATE FUNCTION cmd.retry_instruction(p_instruction uuid,p_code text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE b core.bank_instructions%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO b FROM core.bank_instructions WHERE id=p_instruction FOR UPDATE;
 IF b.status IS DISTINCT FROM 'failed' OR b.is_manual OR p_code IS NULL OR p_code=b.code THEN RAISE EXCEPTION 'Chỉ retry lệnh tự động đã thất bại bằng mã mới' USING HINT='ck_command_state'; END IF;
 SELECT id INTO result FROM core.bank_instructions WHERE replaces_instruction_id=b.id;
 IF result IS NOT NULL THEN
 IF (SELECT code FROM core.bank_instructions WHERE id=result) IS DISTINCT FROM p_code THEN RAISE EXCEPTION 'Retry khác mã' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN result; END IF;
 INSERT INTO core.bank_instructions(code,kind,deposit_id,order_id,basis_kind,basis_id,amount_vnd,target_org_id,target_bank_account_id,target_bank_code,target_account_masked,target_account_holder,source_bank_event_id,target_account_hash,replaces_instruction_id)
 VALUES(p_code,b.kind,b.deposit_id,b.order_id,b.basis_kind,b.basis_id,b.amount_vnd,b.target_org_id,b.target_bank_account_id,b.target_bank_code,b.target_account_masked,b.target_account_holder,b.source_bank_event_id,b.target_account_hash,b.id) RETURNING id INTO result;
 PERFORM cmd.refresh_deposit(b.deposit_id); RETURN result;
END $$;
CREATE FUNCTION cmd.reconcile_direct_payment(p_payment uuid,p_amount bigint,p_result text,p_reference text,p_decision uuid,p_proof uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE d ops.decisions%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['finance','risk']); SELECT * INTO d FROM ops.decisions WHERE id=p_decision;
 IF d.kind IS DISTINCT FROM 'payment_reconciliation' OR d.entity IS DISTINCT FROM 'direct_payment' OR d.entity_id IS DISTINCT FROM p_payment OR d.proposed_by IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Sai quyết định đối soát' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM set_config('app.reason',d.reason,true);
 INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,bank_txn_ref,confirmed_by,ops_decision_by,bank_evidence_id)
 VALUES(p_payment,p_result,p_amount,p_reference,ref.ctx_user(),ARRAY[d.proposed_by,d.approved_by],p_proof) RETURNING id INTO result; RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.attach_evidence(uuid,jsonb),cmd.reconcile_direct_payment(uuid,bigint,text,text,uuid,uuid) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.retry_instruction(uuid,text) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;

-- Sau phụ lục, expected_* gốc bất biến, delta ở adjustment; đổi status không đối chiếu lại bản gốc với bản mới.
CREATE OR REPLACE FUNCTION core.guard_deposit() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE buyer uuid; amount bigint; fee bigint;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.order_id,NEW.framework_id,NEW.payer_org_id,NEW.expected_deposit_vnd,NEW.expected_fee_vnd,NEW.payment_ref,NEW.virtual_account_no,NEW.bank_provider) IS DISTINCT FROM
 (OLD.order_id,OLD.framework_id,OLD.payer_org_id,OLD.expected_deposit_vnd,OLD.expected_fee_vnd,OLD.payment_ref,OLD.virtual_account_no,OLD.bank_provider) THEN
 RAISE EXCEPTION 'Điều chỉnh cọc bằng dòng điều chỉnh' USING HINT='ck_append_only'; END IF;
 IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
 IF NEW.order_id IS NOT NULL THEN
 SELECT o.buyer_org_id,v.deposit_vnd,v.fee_vnd INTO buyer,amount,fee FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.id=NEW.order_id;
 ELSE SELECT buyer_org_id,framework_deposit_vnd,0 INTO buyer,amount,fee FROM core.framework_contracts WHERE id=NEW.framework_id; END IF;
 IF buyer IS NULL OR NEW.payer_org_id IS DISTINCT FROM buyer OR NEW.expected_deposit_vnd<>amount OR NEW.expected_fee_vnd<>fee THEN
 RAISE EXCEPTION 'Cọc sai bên trả hoặc điều khoản đã ký' USING HINT='ck_deposit_terms'; END IF;
 RETURN NEW; END $$;
CREATE FUNCTION cmd.create_return_lot(p_order uuid,p_qty bigint,p_grade text,p_code text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; l core.lots%ROWTYPE; result uuid;
BEGIN
 o:=cmd.order_party(p_order,'seller',ARRAY['owner','coop_board','collection_staff']);
 SELECT * INTO l FROM core.lots WHERE id=o.lot_id FOR UPDATE;
 IF p_qty IS NULL OR p_qty<=0 OR NOT EXISTS(SELECT 1 FROM core.product_grades WHERE product_id=l.product_id AND profile_version=l.profile_version AND grade_code=p_grade) THEN RAISE EXCEPTION 'Lượng/loại lô con không hợp lệ' USING HINT='ck_command_payload'; END IF;
 INSERT INTO core.lots(code,seller_org_id,product_id,profile_version,grade_code,site_id,facility_id,parent_lot_id,origin_order_id,qty_basis,declared_qty,is_substandard,created_by)
 VALUES(p_code,l.seller_org_id,l.product_id,l.profile_version,p_grade,l.site_id,l.facility_id,l.id,o.id,'weighed',p_qty,true,ref.ctx_user()) RETURNING id INTO result;
 PERFORM ledger.move_qty(l.id,'returned_pending','moved_to_child','return_to_child',p_qty,o.id,'child-out:'||result,result);
 PERFORM ledger.move_qty(result,'source','available','split_in',p_qty,NULL,'child-in:'||result,l.id);
 UPDATE core.lots SET status='on_sale',last_confirmed_at=ref.clock_at() WHERE id=result;
 RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION cmd.create_return_lot(uuid,bigint,text,text) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
COMMENT ON TABLE app_auth.sessions IS 'Phiên bền vững: hash token ngẫu nhiên; chỉ auth worker tra và thu hồi, thời hạn đồng hồ thật.';
COMMENT ON TABLE app_auth.record_receipts IS 'Receipt tái xác thực PIN/sinh trắc do auth worker xác minh ngoài DB; binding một lần cho đúng tài liệu/người/thiết bị.';
COMMENT ON TABLE cmd.test_clock IS 'Chỉ owner cấp trong DB thử cô lập; production luôn rỗng, runtime không có quyền ghi hay bật bằng GUC.';

-- Xác nhận giá thuộc hợp đồng/phụ lục; không bắt ký lại xác nhận giá trên BBNT.
CREATE OR REPLACE FUNCTION core.guard_signature_party() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE d core.documents%ROWTYPE; o core.orders%ROWTYPE; f core.framework_contracts%ROWTYPE; allowed uuid;
BEGIN
 SELECT * INTO d FROM core.documents WHERE id=NEW.document_id FOR UPDATE;
 IF d.status NOT IN ('awaiting_signature','partially_signed') OR EXISTS(SELECT 1 FROM core.documents WHERE series_key=d.series_key AND version_no>d.version_no) THEN
 RAISE EXCEPTION 'Không ký bản cũ hoặc đã kết thúc' USING HINT='PHIEN_BAN_DA_DOI'; END IF;
 IF NEW.method<>'quyet_dinh_van_hanh' AND NEW.party IN ('buyer','seller') THEN
 IF d.order_id IS NOT NULL THEN SELECT * INTO o FROM core.orders WHERE id=d.order_id; allowed:=CASE WHEN NEW.party='buyer' THEN o.buyer_org_id ELSE o.seller_org_id END;
 ELSIF d.doc_type='framework_contract' THEN SELECT * INTO f FROM core.framework_contracts WHERE id=d.entity_id; allowed:=CASE WHEN NEW.party='buyer' THEN f.buyer_org_id ELSE f.seller_org_id END;
 ELSE allowed:=d.owner_org_id; END IF;
 IF allowed IS NULL OR NEW.signer_org_id IS DISTINCT FROM allowed OR NEW.signer_user_id IS DISTINCT FROM ref.ctx_user() OR ref.ctx_org() IS DISTINCT FROM allowed THEN
 RAISE EXCEPTION 'Chữ ký sai bên' USING HINT='ck_signature_party'; END IF;
 IF NEW.party='seller' AND d.doc_type IN ('contract','annex') AND o.flag_abnormal_price AND NOT ('abnormal_price_ack'=ANY(NEW.statements)) THEN
 RAISE EXCEPTION 'Cần xác nhận giá bất thường' USING HINT='CAN_XAC_NHAN_GIA_BAT_THUONG'; END IF;
 END IF;
 IF NEW.method='simulated_digital' AND NEW.signature_value IS NULL THEN RAISE EXCEPTION 'Thiếu chữ ký mô phỏng' USING HINT='ck_signature_value'; END IF;
 IF NEW.device_id IS NULL THEN RAISE EXCEPTION 'Thiếu thiết bị ký' USING HINT='ck_signature_device'; END IF;
 RETURN NEW; END $$;

