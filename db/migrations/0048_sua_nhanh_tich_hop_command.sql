-- Tiếp nối 0038–0047: sửa nhánh được kiểm tích hợp, không thay checksum migration cũ.


CREATE OR REPLACE FUNCTION cmd.release_hold(p_hold uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE h core.holds%ROWTYPE; f core.offers%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO h FROM core.holds WHERE id=p_hold FOR UPDATE;
 SELECT * INTO f FROM core.offers WHERE id=h.offer_id;
 PERFORM cmd.require_org(CASE ref.ctx_actor() WHEN 'buyer' THEN f.buyer_org_id ELSE f.seller_org_id END,ARRAY['owner','purchaser','coop_board']);
 IF h.order_id IS NOT NULL THEN RAISE EXCEPTION 'Đã lập đơn: đóng đơn để nhả giữ' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason','Bên giao dịch nhả giữ lượng',true); UPDATE core.holds SET status='cancelled' WHERE id=h.id AND status='active';
 UPDATE core.deadlines SET status='cancelled' WHERE entity='hold' AND entity_id=h.id AND status='open';
END $$;

CREATE OR REPLACE FUNCTION cmd.close_unsigned_order(p_order uuid,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 o:=cmd.party_order(p_order);
 PERFORM 1 FROM core.deposits WHERE order_id=o.id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM core.deposits WHERE order_id=o.id AND status NOT IN ('awaiting_transfer','partially_received','void')) THEN RAISE EXCEPTION 'Cọc đủ: kích hoạt rồi hạch toán hủy sau cọc' USING HINT='ck_command_cancel'; END IF;
 IF o.status NOT IN ('drafting','internal_approval','awaiting_seller','awaiting_deposit') OR p_reason NOT IN ('seller_declined','cancel_before_deposit') OR (p_reason='seller_declined' AND ref.ctx_actor()<>'seller') THEN RAISE EXCEPTION 'Không thể đóng đơn ở bước này' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason',p_reason,true);
 UPDATE core.orders SET status='closed',close_reason=p_reason WHERE id=o.id;
 UPDATE core.holds SET status='cancelled' WHERE id=o.hold_id AND status='active';
 UPDATE core.deadlines SET status='cancelled' WHERE order_id=o.id AND status='open';
 INSERT INTO ops.bank_return_tasks(bank_event_id,deposit_id,reason)
 SELECT e.id,d.id,'cancel_before_deposit' FROM core.deposits d JOIN core.bank_events e ON e.payment_ref=d.payment_ref
 WHERE d.order_id=o.id AND e.kind='deposit_received' AND e.apply_result='applied' AND d.status='partially_received' ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION cmd.withdraw_group_part(p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 o:=cmd.order_party(p_order,'seller',ARRAY['owner','coop_board']);
 PERFORM 1 FROM core.group_orders WHERE id=o.group_order_id AND status='gathering' FOR UPDATE;
 IF NOT FOUND OR o.status<>'awaiting_seller' THEN RAISE EXCEPTION 'Chỉ rút trong pha gom' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason','Người bán rút phần nhóm trước cọc',true);
 UPDATE core.orders SET status='closed',close_reason='seller_declined' WHERE id=o.id;
 UPDATE core.holds SET status='cancelled' WHERE id=o.hold_id AND status='active';
END $$;

CREATE OR REPLACE FUNCTION cmd.cutoff_group(p_group uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE g core.group_orders%ROWTYPE; qty bigint; fee bigint; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; signed_qty bigint;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO g FROM core.group_orders WHERE id=p_group FOR UPDATE;
 IF g.status<>'gathering' THEN RETURN g.status; END IF;
 IF ref.clock_at()<g.cutoff_at THEN RAISE EXCEPTION 'Chưa đến giờ chốt nhóm' USING HINT='ck_deadline_not_due'; END IF;
 SELECT coalesce(sum(ver.qty_min),0),coalesce(sum(ver.fee_vnd),0) INTO qty,fee FROM core.orders child JOIN core.order_versions ver ON ver.order_id=child.id AND ver.version_no=1 WHERE child.group_order_id=g.id AND child.status='awaiting_seller'
 AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=ver.document_id AND party='buyer') AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=ver.document_id AND party='seller');
 IF qty=0 OR (g.all_or_nothing AND qty<>g.total_qty) THEN
 PERFORM set_config('app.reason','Nhóm không đủ tổng đã ký tại giờ chốt',true);
 FOR o IN SELECT * FROM core.orders WHERE group_order_id=g.id AND status IN ('drafting','awaiting_seller') ORDER BY id FOR UPDATE LOOP
 UPDATE core.orders SET status='closed',close_reason='group_not_filled' WHERE id=o.id; UPDATE core.holds SET status='cancelled' WHERE id=o.hold_id AND status='active'; END LOOP;
 UPDATE core.group_orders SET status='closed' WHERE id=g.id; RETURN 'closed'; END IF;
 -- Không thu thiếu hoặc nhân phí sàn khi một phần đã rút: cần phụ lục phân bổ được ký lại.
 IF fee IS DISTINCT FROM g.group_fee_vnd THEN RAISE EXCEPTION 'Phí phần đã ký không bằng phí nhóm; lập lại bộ phần trước chốt' USING HINT='ck_group_fee'; END IF;
 FOR o IN SELECT * FROM core.orders WHERE group_order_id=g.id ORDER BY id FOR UPDATE LOOP
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=1;
 IF o.status='awaiting_seller' AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=v.document_id AND party='buyer') AND EXISTS(SELECT 1 FROM core.signatures WHERE document_id=v.document_id AND party='seller') THEN
 PERFORM cmd.sync_document(v.document_id); UPDATE core.orders SET status='awaiting_deposit',effective_version_no=1 WHERE id=o.id;
 INSERT INTO core.deposits(order_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no,bank_provider) SELECT o.id,o.buyer_org_id,v.deposit_vnd,v.fee_vnd,a.payment_ref,a.virtual_account_no,a.provider FROM cmd.group_deposit_accounts a WHERE a.order_id=o.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Adapter chưa cấp tài khoản ảo cho phần nhóm' USING HINT='ck_group_bank_account'; END IF;
 UPDATE core.deadlines SET status='met' WHERE order_id=o.id AND status='open';
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) SELECT 'deposit','deposit',id,o.id,ref.clock_at()+interval '24 hours',ref.clock_at() FROM core.deposits WHERE order_id=o.id;
 ELSIF o.status IN ('drafting','awaiting_seller') THEN
 PERFORM set_config('app.reason','Phần chưa ký lúc chốt nhóm',true); UPDATE core.orders SET status='closed',close_reason='group_not_filled' WHERE id=o.id; UPDATE core.holds SET status='cancelled' WHERE id=o.hold_id AND status='active';
 END IF; END LOOP;
 UPDATE core.group_orders SET status='executing' WHERE id=g.id; UPDATE core.deadlines SET status='met' WHERE entity='group_order' AND entity_id=g.id AND kind='group_cutoff' AND status='open'; RETURN 'executing';
END $$;

CREATE OR REPLACE FUNCTION cmd.process_unsigned_cancellation(p_request uuid,p_document jsonb) RETURNS uuid
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
 UPDATE core.holds SET status='cancelled' WHERE id=o.hold_id AND status='active';
 UPDATE core.deadlines SET status='cancelled' WHERE order_id=o.id AND status='open';
 UPDATE core.documents SET status='cancelled',cancel_reason='cancel_before_deposit' WHERE order_id=o.id AND doc_type IN ('contract','annex') AND status IN ('draft','awaiting_signature','partially_signed','fully_signed');
 IF dep.status='awaiting_transfer' THEN UPDATE core.deposits SET status='void' WHERE id=dep.id; END IF;
 UPDATE core.orders SET status='closed',close_reason='cancel_before_deposit' WHERE id=o.id;
 INSERT INTO ops.bank_return_tasks(bank_event_id,deposit_id,reason)
 SELECT e.id,dep.id,'cancel_before_deposit' FROM core.bank_events e WHERE e.payment_ref=dep.payment_ref AND e.kind='deposit_received' AND e.apply_result='applied' AND dep.status='partially_received' ON CONFLICT DO NOTHING;
 PERFORM evt.emit('cancellation',c.id,'cancellation.accounted',jsonb_build_object('order_id',o.id,'document_id',doc,'before_deposit',true),ARRAY['notify']); RETURN doc;
END $$;

CREATE OR REPLACE FUNCTION cmd.finalize_signed_order(p_order uuid,p_payment_ref text,p_virtual_account text,p_provider text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid; hours integer;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 SELECT CASE WHEN shelf_life_days<=10 THEN 12 ELSE 24 END INTO hours FROM core.product_profiles WHERE product_id=o.product_id AND profile_version=(SELECT profile_version FROM core.order_versions WHERE order_id=o.id AND version_no=1);
 IF o.contract_type<>'spot' OR o.status<>'awaiting_seller' THEN RAISE EXCEPTION 'Đơn không ở bước ký' USING HINT='ck_command_state'; END IF;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=1;
 PERFORM cmd.sync_document(v.document_id);
 UPDATE core.orders SET effective_version_no=1,status='awaiting_deposit' WHERE id=o.id;
 INSERT INTO core.deposits(order_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no,bank_provider)
 VALUES(o.id,o.buyer_org_id,v.deposit_vnd,v.fee_vnd,p_payment_ref,p_virtual_account,p_provider) RETURNING id INTO result;
 UPDATE core.deadlines SET status='met' WHERE entity_id=o.id AND kind='seller_sign' AND status='open';
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('deposit','deposit',result,o.id,ref.clock_at()+coalesce(hours,24)*interval '1 hour',ref.clock_at());
 UPDATE core.holds SET expires_at=ref.clock_at()+coalesce(hours,24)*interval '1 hour' WHERE id=o.hold_id AND status='active';
 UPDATE core.deadlines SET due_at=ref.clock_at()+coalesce(hours,24)*interval '1 hour' WHERE entity='hold' AND entity_id=o.hold_id AND status='open';
 RETURN result;
END $$;

-- Helper giữ nguyên user/actor của login, không mượn danh tính chủ hộ.
CREATE FUNCTION cmd.require_lot_editor(p_org uuid,p_action text) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ref AS $$ BEGIN
 IF ref.ctx_actor()='helper' THEN
  IF ref.ctx_org() IS DISTINCT FROM p_org OR NOT EXISTS(
   SELECT 1 FROM core.delegations d JOIN core.memberships m ON m.org_id=d.org_id AND m.user_id=d.principal_user_id
   JOIN core.membership_roles r ON r.membership_id=m.id AND r.role_code IN ('owner','coop_board')
   JOIN core.users u ON u.id=d.principal_user_id AND u.disabled_at IS NULL
   WHERE d.org_id=p_org AND d.helper_user_id=ref.ctx_user() AND d.revoked_at IS NULL AND d.valid_during@>ref.clock_at() AND p_action=ANY(d.actions) AND m.status='active') THEN
   RAISE EXCEPTION 'Không có ủy quyền đang hiệu lực đúng thao tác' USING HINT='KHONG_CO_QUYEN'; END IF;
 ELSE PERFORM cmd.require_org(p_org,ARRAY['owner','coop_board','collection_staff']); END IF;
END $$;


CREATE OR REPLACE FUNCTION cmd.enter_actor() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref AS $$
DECLARE p cmd.login_principals%ROWTYPE;
BEGIN
 SELECT * INTO p FROM cmd.login_principals WHERE login_name=session_user AND active;
 IF p.user_id IS NULL OR NOT EXISTS(SELECT 1 FROM core.users WHERE id=p.user_id AND disabled_at IS NULL)
 OR (NOT EXISTS(SELECT 1 FROM core.memberships WHERE user_id=p.user_id AND org_id=p.org_id AND status='active') AND NOT (p.actor_kind='helper' AND EXISTS(SELECT 1 FROM core.delegations WHERE helper_user_id=p.user_id AND org_id=p.org_id AND revoked_at IS NULL AND valid_during@>ref.clock_at())))
 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p.org_id AND status='active')
 OR (p.actor_kind IN ('ops','system') AND (NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p.org_id AND is_platform)
  OR NOT EXISTS(SELECT 1 FROM ops.staff_assignments WHERE user_id=p.user_id AND active)))
 OR (p.actor_kind='system' AND NOT (current_setting('role',true)='agiviet_orchestrator' OR pg_has_role(session_user,'agiviet_orchestrator','MEMBER') AND session_user<>current_user)) THEN
 RAISE EXCEPTION 'Login chưa được ánh xạ danh tính/quyền hoạt động' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM set_config('app.user_id',p.user_id::text,true); PERFORM set_config('app.org_id',p.org_id::text,true); PERFORM set_config('app.actor_kind',p.actor_kind,true);
 -- Không cho request dùng cờ import để bỏ máy trạng thái.
 PERFORM set_config('app.allow_any_initial','',true);
END $$;

CREATE OR REPLACE FUNCTION cmd.create_lot(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_lot_editor(ref.ctx_org(),'lot.draft');
 IF ref.ctx_actor() NOT IN ('seller','helper') OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=ref.ctx_org() AND can_sell) THEN RAISE EXCEPTION 'Chỉ bên bán' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF (p_data->>'site_id') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.production_sites WHERE id=(p_data->>'site_id')::uuid AND org_id=ref.ctx_org())
 OR (p_data->>'facility_id') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.facilities WHERE id=(p_data->>'facility_id')::uuid AND org_id=ref.ctx_org()) THEN
 RAISE EXCEPTION 'Địa điểm khác tổ chức' USING HINT='KHONG_CO_QUYEN'; END IF;
 result:=cmd.insert_row('core.lots',p_data||jsonb_build_object('seller_org_id',ref.ctx_org(),'created_by',ref.ctx_user()),
 ARRAY['code','product_id','profile_version','grade_code','variety','product_form','site_id','facility_id','qty_basis','declared_qty','available_from','harvest_on','spray_clear_on','is_substandard','seller_org_id','created_by']);
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION cmd.publish_lot(p_lot uuid,p_ask bigint,p_floor bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.lots%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 PERFORM cmd.require_lot_editor(l.seller_org_id,'lot.update');
 IF l.status<>'draft' OR l.safety_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Lô chưa thể đăng' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_by,set_at) VALUES(l.id,p_ask,p_floor,ref.ctx_user(),ref.clock_at());
 UPDATE core.lots SET status=CASE WHEN available_from>(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'upcoming' ELSE 'on_sale' END,last_confirmed_at=ref.clock_at() WHERE id=l.id;
END $$;

CREATE OR REPLACE FUNCTION cmd.update_lot(p_lot uuid,p_action text,p_data jsonb DEFAULT '{}') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE l core.lots%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 PERFORM cmd.require_lot_editor(l.seller_org_id,'lot.update');
 IF ref.ctx_actor() NOT IN ('seller','helper') OR l.status='closed' OR l.safety_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Lô không thể sửa' USING HINT='ck_command_state'; END IF;
 IF p_action='price' THEN
 PERFORM cmd.check_payload(p_data,ARRAY['ask_price_vnd','floor_price_vnd','below_cost_ack']);
 INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,below_cost_ack,set_by,set_at)
 VALUES(l.id,(p_data->>'ask_price_vnd')::bigint,(p_data->>'floor_price_vnd')::bigint,coalesce((p_data->>'below_cost_ack')::boolean,false),ref.ctx_user(),ref.clock_at());
 ELSIF p_action='confirm' THEN
 PERFORM cmd.check_payload(p_data,'{}');
 UPDATE core.lots SET last_confirmed_at=ref.clock_at(),status=CASE WHEN status='hidden' THEN 'on_sale' ELSE status END WHERE id=l.id;
 ELSIF p_action='close' THEN
 PERFORM cmd.check_payload(p_data,'{}');
 IF EXISTS(SELECT 1 FROM ledger.qty_balances WHERE lot_id=l.id AND bucket IN ('held','committed','in_transit') AND qty>0) THEN RAISE EXCEPTION 'Lô còn lượng ràng buộc' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason','Chủ lô đóng tin',true); UPDATE core.lots SET status='closed' WHERE id=l.id;
 ELSE RAISE EXCEPTION 'Sai thao tác lô' USING HINT='ck_command_payload'; END IF;
 PERFORM evt.emit('lot',l.id,'lot.'||p_action,'{}',ARRAY['notify']);
END $$;

CREATE OR REPLACE FUNCTION cmd.attach_entity_evidence(p_entity text,p_id uuid,p_document jsonb,p_captured boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE org uuid;
BEGIN
 PERFORM cmd.enter_actor();
 IF p_entity='lot' THEN SELECT seller_org_id INTO org FROM core.lots WHERE id=p_id FOR UPDATE;
 ELSIF p_entity='organization' THEN org:=p_id;
 ELSE RAISE EXCEPTION 'Sai loại đối tượng' USING HINT='ck_command_payload'; END IF;
 IF ref.ctx_actor()='ops' THEN PERFORM cmd.require_staff(ARRAY['field','risk','supervisor']);
 ELSIF p_entity='lot' THEN PERFORM cmd.require_lot_editor(org,'lot.update');
 ELSE PERFORM cmd.require_org(org,ARRAY['owner','coop_board','collection_staff']); END IF;
 IF NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=org) THEN RAISE EXCEPTION 'Không có tổ chức' USING HINT='ck_command_state'; END IF;
 RETURN cmd.insert_row('core.documents',p_document||jsonb_build_object('doc_type','evidence','owner_org_id',org,'created_by',ref.ctx_user(),'entity',p_entity,'entity_id',p_id,'captured_in_app',p_captured),
 ARRAY['code','series_key','version_no','content_sha256','canonical_content','file_sha256','storage_key','mime_type','size_bytes','generator_version','is_test_data','doc_type','owner_org_id','created_by','entity','entity_id','captured_in_app']);
END $$;

CREATE FUNCTION cmd.delegate_helper(p_user uuid,p_actions text[],p_during tstzrange,p_evidence uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','coop_board']);
 IF p_during IS NULL OR lower(p_during)<ref.clock_at() OR upper_inf(p_during) OR upper(p_during)<=ref.clock_at() OR (p_evidence IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND owner_org_id=ref.ctx_org() AND doc_type='evidence')) THEN RAISE EXCEPTION 'Sai thời hạn/chứng cứ ủy quyền' USING HINT='ck_command_payload'; END IF;
 INSERT INTO core.delegations(org_id,principal_user_id,helper_user_id,actions,valid_during,evidence_id,created_by)
 VALUES(ref.ctx_org(),ref.ctx_user(),p_user,p_actions,p_during,p_evidence,ref.ctx_user()) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.revoke_delegation(p_delegation uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE org uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT org_id INTO org FROM core.delegations WHERE id=p_delegation FOR UPDATE;
 PERFORM cmd.require_org(org,ARRAY['owner','coop_board']);
 UPDATE core.delegations SET revoked_at=ref.clock_at(),revoked_by=ref.ctx_user() WHERE id=p_delegation AND revoked_at IS NULL;
END $$;


CREATE OR REPLACE FUNCTION cmd.send_offer(p_code text,p_lot uuid,p_line uuid,p_buyer uuid,p_direction text,p_price bigint,p_qty bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.lots%ROWTYPE; result uuid; low boolean;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 IF l.id IS NULL OR l.status NOT IN ('on_sale','upcoming') OR l.safety_locked_at IS NOT NULL OR p_direction IS NULL OR p_direction NOT IN ('buyer_bid','seller_quote') THEN RAISE EXCEPTION 'Lô/lời chào không hợp lệ' USING HINT='ck_command_state'; END IF;
 IF p_direction='buyer_bid' THEN PERFORM cmd.require_org(p_buyer,ARRAY['owner','purchaser']);
 ELSE PERFORM cmd.require_org(l.seller_org_id,ARRAY['owner','coop_board']); END IF;
 IF ref.ctx_actor() IS DISTINCT FROM (CASE p_direction WHEN 'buyer_bid' THEN 'buyer' ELSE 'seller' END)
 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p_buyer AND can_buy AND status='active')
 OR (p_line IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.demand_lines dl JOIN core.demands d ON d.id=dl.demand_id WHERE dl.id=p_line AND d.buyer_org_id=p_buyer AND d.product_id=l.product_id AND dl.grade_code=l.grade_code AND d.status='open')) THEN
 RAISE EXCEPTION 'Sai bên/lô/nhu cầu' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT p_direction='buyer_bid' AND p_price<floor_price_vnd INTO low FROM core.lot_price_versions WHERE lot_id=l.id ORDER BY id DESC LIMIT 1;
 INSERT INTO core.offers(code,direction,lot_id,demand_line_id,buyer_org_id,seller_org_id,created_by,status)
 VALUES(p_code,p_direction,l.id,p_line,p_buyer,l.seller_org_id,ref.ctx_user(),CASE WHEN coalesce(low,false) THEN 'auto_rejected' ELSE 'sent' END) RETURNING id INTO result;
 INSERT INTO core.offer_rounds(offer_id,round_no,from_side,price_vnd,qty,expires_at,created_by)
 VALUES(result,1,ref.ctx_actor(),p_price,p_qty,ref.clock_at()+interval '24 hours',ref.ctx_user());
 IF NOT coalesce(low,false) THEN INSERT INTO core.deadlines(kind,entity,entity_id,due_at,created_at) VALUES('offer_reply','offer',result,ref.clock_at()+interval '24 hours',ref.clock_at()); END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION cmd.reply_offer(p_offer uuid,p_action text,p_price bigint DEFAULT NULL,p_qty bigint DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.offers%ROWTYPE; r core.offer_rounds%ROWTYPE; side text; low boolean;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.offers WHERE id=p_offer FOR UPDATE;
 side:=ref.ctx_actor();
 PERFORM cmd.require_org(CASE side WHEN 'buyer' THEN f.buyer_org_id WHEN 'seller' THEN f.seller_org_id END,ARRAY['owner','purchaser','coop_board']);
 SELECT * INTO r FROM core.offer_rounds WHERE offer_id=f.id AND round_no=f.current_round;
 IF f.status IS DISTINCT FROM 'sent' OR r.expires_at<=ref.clock_at() THEN RAISE EXCEPTION 'Lời chào không còn mở' USING HINT='ck_command_state'; END IF;
 IF p_action='withdraw' AND side=(CASE f.direction WHEN 'buyer_bid' THEN 'buyer' ELSE 'seller' END) THEN
 UPDATE core.offers SET status='withdrawn' WHERE id=f.id;
 ELSIF p_action='reject' AND side<>r.from_side THEN UPDATE core.offers SET status='rejected' WHERE id=f.id;
 ELSIF p_action='counter' AND side<>r.from_side THEN
 IF (CASE side WHEN 'buyer' THEN f.buyer_counters ELSE f.seller_counters END)>=2 THEN RAISE EXCEPTION 'Tối đa hai lượt mỗi bên' USING HINT='ck_offer_counters'; END IF;
 PERFORM 1 FROM core.lots WHERE id=f.lot_id FOR UPDATE;
 SELECT side='buyer' AND p_price<floor_price_vnd INTO low FROM core.lot_price_versions WHERE lot_id=f.lot_id ORDER BY id DESC LIMIT 1;
 INSERT INTO core.offer_rounds(offer_id,round_no,from_side,price_vnd,qty,expires_at,created_by)
 VALUES(f.id,f.current_round+1,side,p_price,p_qty,ref.clock_at()+interval '24 hours',ref.ctx_user());
 UPDATE core.offers SET current_round=current_round+1,buyer_counters=buyer_counters+CASE WHEN side='buyer' THEN 1 ELSE 0 END,seller_counters=seller_counters+CASE WHEN side='seller' THEN 1 ELSE 0 END WHERE id=f.id;
 IF coalesce(low,false) THEN UPDATE core.offers SET status='rejected' WHERE id=f.id; END IF;
 ELSE RAISE EXCEPTION 'Sai bên/hành động lời chào' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.deadlines SET status='met' WHERE entity='offer' AND entity_id=f.id AND kind='offer_reply' AND status='open';
 IF p_action='counter' AND NOT coalesce(low,false) THEN INSERT INTO core.deadlines(kind,entity,entity_id,due_at,created_at) VALUES('offer_reply','offer',f.id,ref.clock_at()+interval '24 hours',ref.clock_at()); END IF;
END $$;

CREATE FUNCTION cmd.payment_reconciliation_task(p_kind text,p_priority smallint,p_entity text,p_id uuid,p_order uuid,p_role text,p_key text,p_reason text) RETURNS uuid
LANGUAGE plpgsql SET search_path=pg_catalog,ops,ref,public AS $$
DECLARE result uuid; s ref.sla_policies%ROWTYPE;
BEGIN
 SELECT * INTO s FROM ref.sla_policies WHERE priority=p_priority;
 SELECT id INTO result FROM ops.tasks WHERE dedup_key=p_key; IF result IS NOT NULL THEN RETURN result; END IF;
 INSERT INTO ops.tasks(code,kind,priority,entity,entity_id,order_id,required_role,dedup_key,trigger_reason,response_due_at,resolution_due_at,next_update_at)
 VALUES('TASK-'||gen_random_uuid(),p_kind,p_priority,p_entity,p_id,p_order,p_role,p_key,p_reason,ref.clock_at()+s.response_minutes*interval '1 minute',ref.clock_at()+s.resolution_minutes*interval '1 minute',ref.clock_at()+s.update_minutes*interval '1 minute') RETURNING id INTO result; RETURN result;
END $$;

CREATE OR REPLACE FUNCTION evt.state_to_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE quiet boolean;
BEGIN
 quiet:=NEW.entity='offer' AND (NEW.to_status='auto_rejected' OR (NEW.to_status='rejected' AND EXISTS(
 SELECT 1 FROM core.offers f JOIN core.offer_rounds r ON r.offer_id=f.id AND r.round_no=f.current_round JOIN core.lot_price_versions p ON p.lot_id=f.lot_id
 WHERE f.id=NEW.entity_id AND r.from_side='buyer' AND r.price_vnd<p.floor_price_vnd AND p.id=(SELECT max(id) FROM core.lot_price_versions WHERE lot_id=f.lot_id))));
 PERFORM evt.emit(NEW.entity,NEW.entity_id,NEW.entity||'.'||NEW.to_status,
 jsonb_build_object('from',NEW.from_status,'to',NEW.to_status,'history_id',NEW.id)||CASE WHEN quiet THEN jsonb_build_object('audience_org_id',(SELECT buyer_org_id FROM core.offers WHERE id=NEW.entity_id)) ELSE '{}'::jsonb END,
 CASE WHEN quiet THEN ARRAY['notify_buyer','sync_buyer'] ELSE ARRAY['notify','sync_apps'] END);
 RETURN NEW;
END $$;
INSERT INTO ref.state_transitions(entity,from_status,to_status,actor_kinds) VALUES('direct_payment','partially_received','mismatch',ARRAY['buyer','seller']);
CREATE FUNCTION cmd.report_payment_not_received(p_payment uuid,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ops,ref AS $$
DECLARE p core.direct_payments%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO p FROM core.direct_payments WHERE id=p_payment FOR UPDATE;
 PERFORM cmd.require_org(p.payee_org_id,ARRAY['owner','accountant','coop_board']);
 IF p.status NOT IN ('payer_reported','partially_received','mismatch') OR coalesce(length(btrim(p_reason)),0)=0 THEN RAISE EXCEPTION 'Khoản chưa báo trả hoặc đã nhận đủ' USING HINT='ck_command_payment'; END IF;
 UPDATE core.direct_payments SET status='mismatch' WHERE id=p.id AND status<>'mismatch';
 UPDATE core.deadlines SET status='met' WHERE entity='direct_payment' AND entity_id=p.id AND kind='direct_payment_confirm' AND status='open';
 -- Tạo task trong bước đã xác thực người nhận; helper task nội bộ phía dưới.
 result:=cmd.payment_reconciliation_task('V08',2::smallint,'direct_payment',p.id,p.order_id,'finance','not-received:'||p.id,'Bên nhận báo chưa nhận tiền');
 INSERT INTO ops.task_actions(task_id,actor_user_id,action,detail) VALUES(result,ref.ctx_user(),'recipient_not_received',jsonb_build_object('reason',p_reason));
 PERFORM evt.emit('direct_payment',p.id,'payment.not_received',jsonb_build_object('task_id',result),ARRAY['notify']); RETURN result;
END $$;


GRANT EXECUTE ON FUNCTION cmd.delegate_helper(uuid,text[],tstzrange,uuid),cmd.revoke_delegation(uuid),cmd.report_payment_not_received(uuid,text) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
