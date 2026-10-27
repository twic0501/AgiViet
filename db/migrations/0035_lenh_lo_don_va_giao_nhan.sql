-- D-01: entry points nghiệp vụ. Không nhận actor/tổ chức sở hữu từ request.
-- Helper chỉ dùng trong SECURITY DEFINER, không cấp EXECUTE cho runtime.
CREATE FUNCTION cmd.insert_row(p_table regclass,p_body jsonb,p_allowed text[]) RETURNS uuid
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE cols text; vals text; result uuid;
BEGIN
 IF jsonb_typeof(p_body) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_body) k WHERE NOT k=ANY(p_allowed)) THEN
 RAISE EXCEPTION 'Trường không thuộc hợp đồng command' USING HINT='ck_command_payload'; END IF;
 SELECT string_agg(format('%I',k),',' ORDER BY k),string_agg(format('r.%I',k),',' ORDER BY k) INTO cols,vals FROM jsonb_object_keys(p_body) k;
 EXECUTE format('INSERT INTO %s(%s) SELECT %s FROM jsonb_populate_record(NULL::%s,$1) r RETURNING %I',p_table,cols,vals,p_table,CASE WHEN p_table='core.order_versions'::regclass THEN 'order_id' ELSE 'id' END) INTO result USING p_body;
 RETURN result;
END $$;
CREATE FUNCTION cmd.order_party(p_order uuid,p_side text,p_roles text[]) RETURNS core.orders
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 IF p_side NOT IN ('buyer','seller') OR p_side IS NULL THEN RAISE EXCEPTION 'Sai bên' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM cmd.require_org(CASE p_side WHEN 'buyer' THEN o.buyer_org_id ELSE o.seller_org_id END,p_roles);
 IF ref.ctx_actor()<>p_side THEN RAISE EXCEPTION 'Sai bên thao tác' USING HINT='KHONG_CO_QUYEN'; END IF;
 RETURN o;
END $$;
CREATE FUNCTION cmd.create_lot(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE result uuid;
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','coop_board','collection_staff']);
 IF ref.ctx_actor()<>'seller' OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=ref.ctx_org() AND can_sell) THEN RAISE EXCEPTION 'Chỉ bên bán' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF (p_data->>'site_id') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.production_sites WHERE id=(p_data->>'site_id')::uuid AND org_id=ref.ctx_org())
 OR (p_data->>'facility_id') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.facilities WHERE id=(p_data->>'facility_id')::uuid AND org_id=ref.ctx_org()) THEN
 RAISE EXCEPTION 'Địa điểm khác tổ chức' USING HINT='KHONG_CO_QUYEN'; END IF;
 result:=cmd.insert_row('core.lots',p_data||jsonb_build_object('seller_org_id',ref.ctx_org(),'created_by',ref.ctx_user()),
 ARRAY['code','product_id','profile_version','grade_code','variety','product_form','site_id','facility_id','qty_basis','declared_qty','available_from','harvest_on','spray_clear_on','is_substandard','seller_org_id','created_by']);
 RETURN result;
END $$;
CREATE FUNCTION cmd.publish_lot(p_lot uuid,p_ask bigint,p_floor bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.lots%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 PERFORM cmd.require_org(l.seller_org_id,ARRAY['owner','coop_board','collection_staff']);
 IF l.status<>'draft' OR l.safety_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Lô chưa thể đăng' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.lot_price_versions(lot_id,ask_price_vnd,floor_price_vnd,set_by,set_at) VALUES(l.id,p_ask,p_floor,ref.ctx_user(),ref.clock_at());
 UPDATE core.lots SET status=CASE WHEN available_from>(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'upcoming' ELSE 'on_sale' END,last_confirmed_at=ref.clock_at() WHERE id=l.id;
END $$;
CREATE FUNCTION cmd.create_demand(p_data jsonb,p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE result uuid; x jsonb; line_id uuid;
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','purchaser']);
 IF ref.ctx_actor()<>'buyer' OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=ref.ctx_org() AND can_buy) THEN RAISE EXCEPTION 'Chỉ bên mua' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)=0 THEN RAISE EXCEPTION 'Thiếu dòng nhu cầu' USING HINT='ck_command_payload'; END IF;
 result:=cmd.insert_row('core.demands',p_data||jsonb_build_object('buyer_org_id',ref.ctx_org(),'created_by',ref.ctx_user()),
 ARRAY['code','segment_code','product_id','profile_version','needed_during','delivery_mode','delivery_facility_id','delivery_commune_code','required_docs','accepts_substandard','buyer_org_id','created_by']);
 FOR x IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
 IF NOT EXISTS(SELECT 1 FROM core.product_grades WHERE product_id=(p_data->>'product_id')::uuid AND profile_version=(p_data->>'profile_version')::integer AND grade_code=x->>'grade_code') THEN RAISE EXCEPTION 'Loại khác hồ sơ nhu cầu' USING HINT='ck_command_payload'; END IF;
 line_id:=cmd.insert_row('core.demand_lines',(x-'max_price_vnd')||jsonb_build_object('demand_id',result),ARRAY['demand_id','grade_code','qty','min_source_qty']);
 INSERT INTO core.demand_line_max_prices(demand_line_id,max_price_vnd,set_by,set_at) VALUES(line_id,(x->>'max_price_vnd')::bigint,ref.ctx_user(),ref.clock_at());
 END LOOP;
 UPDATE core.demands SET status='open' WHERE id=result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.send_offer(p_code text,p_lot uuid,p_line uuid,p_buyer uuid,p_direction text,p_price bigint,p_qty bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE l core.lots%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO l FROM core.lots WHERE id=p_lot FOR UPDATE;
 IF l.id IS NULL OR l.status NOT IN ('on_sale','upcoming') OR l.safety_locked_at IS NOT NULL OR p_direction IS NULL OR p_direction NOT IN ('buyer_bid','seller_quote') THEN RAISE EXCEPTION 'Lô/lời chào không hợp lệ' USING HINT='ck_command_state'; END IF;
 IF p_direction='buyer_bid' THEN PERFORM cmd.require_org(p_buyer,ARRAY['owner','purchaser']);
 ELSE PERFORM cmd.require_org(l.seller_org_id,ARRAY['owner','coop_board']); END IF;
 IF ref.ctx_actor() IS DISTINCT FROM (CASE p_direction WHEN 'buyer_bid' THEN 'buyer' ELSE 'seller' END)
 OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=p_buyer AND can_buy AND status='active')
 OR (p_line IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.demand_lines dl JOIN core.demands d ON d.id=dl.demand_id WHERE dl.id=p_line AND d.buyer_org_id=p_buyer AND d.product_id=l.product_id AND dl.grade_code=l.grade_code AND d.status='open')) THEN
 RAISE EXCEPTION 'Sai bên/lô/nhu cầu' USING HINT='KHONG_CO_QUYEN'; END IF;
 INSERT INTO core.offers(code,direction,lot_id,demand_line_id,buyer_org_id,seller_org_id,created_by)
 VALUES(p_code,p_direction,l.id,p_line,p_buyer,l.seller_org_id,ref.ctx_user()) RETURNING id INTO result;
 INSERT INTO core.offer_rounds(offer_id,round_no,from_side,price_vnd,qty,expires_at,created_by)
 VALUES(result,1,ref.ctx_actor(),p_price,p_qty,ref.clock_at()+interval '24 hours',ref.ctx_user());
 INSERT INTO core.deadlines(kind,entity,entity_id,due_at,created_at) VALUES('offer_reply','offer',result,ref.clock_at()+interval '24 hours',ref.clock_at());
 RETURN result;
END $$;
CREATE FUNCTION cmd.accept_offer(p_offer uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.offers%ROWTYPE; r core.offer_rounds%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO o FROM core.offers WHERE id=p_offer FOR UPDATE;
 PERFORM cmd.require_org(CASE o.direction WHEN 'buyer_bid' THEN o.seller_org_id ELSE o.buyer_org_id END,ARRAY['owner','purchaser','coop_board']);
 SELECT * INTO r FROM core.offer_rounds WHERE offer_id=o.id AND round_no=o.current_round;
 PERFORM 1 FROM core.lots WHERE id=o.lot_id AND status IN ('on_sale','upcoming') AND safety_locked_at IS NULL FOR UPDATE;
 IF NOT FOUND OR o.status<>'sent' OR r.expires_at<=ref.clock_at() THEN RAISE EXCEPTION 'Lời chào hết hiệu lực' USING HINT='ck_command_state'; END IF;
 UPDATE core.offers SET status='accepted' WHERE id=o.id;
 INSERT INTO core.holds(lot_id,offer_id,qty,expires_at) VALUES(o.lot_id,o.id,r.qty,ref.clock_at()+interval '24 hours') RETURNING id INTO result;
 UPDATE core.deadlines SET status='met' WHERE entity='offer' AND entity_id=o.id AND kind='offer_reply' AND status='open';
 INSERT INTO core.deadlines(kind,entity,entity_id,due_at,created_at) VALUES('hold','hold',result,ref.clock_at()+interval '24 hours',ref.clock_at());
 RETURN result;
END $$;
-- Metadata object đã upload + hash bytes thật. Các trường quyền/status bị cố định ở đây.
CREATE FUNCTION cmd.attach_document(p_order uuid,p_type text,p_data jsonb,p_entity_kind text DEFAULT NULL,p_entity_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ref,public AS $$
BEGIN
 RETURN cmd.insert_row('core.documents',p_data||jsonb_build_object('order_id',p_order,'doc_type',p_type,'owner_org_id',ref.ctx_org(),'created_by',ref.ctx_user(),'entity',p_entity_kind,'entity_id',p_entity_id,'status','awaiting_signature'),
 ARRAY['code','series_key','version_no','prev_document_id','prev_content_sha256','content_sha256','canonical_content','file_sha256','storage_key','mime_type','size_bytes','generator_version','is_test_data','order_id','doc_type','owner_org_id','created_by','entity','entity_id','status']);
END $$;
CREATE FUNCTION cmd.create_order(p_code text,p_offer uuid,p_terms jsonb,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.offers%ROWTYPE; h core.holds%ROWTYPE; l core.lots%ROWTYPE; r core.offer_rounds%ROWTYPE; result uuid; doc uuid; policy integer; plan text; first_pair boolean; cols text[]; seg text; pol core.policy_versions%ROWTYPE; pl ref.plans%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.offers WHERE id=p_offer FOR UPDATE;
 PERFORM cmd.require_org(f.buyer_org_id,ARRAY['owner','purchaser']);
 IF ref.ctx_actor()<>'buyer' THEN RAISE EXCEPTION 'Chỉ bên mua lập đơn' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT * INTO h FROM core.holds WHERE offer_id=f.id AND status='active' FOR UPDATE;
 SELECT * INTO l FROM core.lots WHERE id=f.lot_id FOR UPDATE;
 SELECT * INTO r FROM core.offer_rounds WHERE offer_id=f.id AND round_no=f.current_round;
 IF f.status IS DISTINCT FROM 'accepted' OR h.id IS NULL OR h.order_id IS NOT NULL OR h.expires_at<=ref.clock_at() OR l.safety_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Lời chào/giữ lượng không còn dùng được' USING HINT='ck_command_state'; END IF;
 -- Chỉ spot trong entry point này; khung/nhóm cần command chuyên biệt, không giả bằng header.
 SELECT * INTO pol FROM core.policy_versions WHERE effective_from<=now() ORDER BY effective_from DESC,id DESC LIMIT 1; policy:=pol.id;
 SELECT plan_code INTO plan FROM core.subscriptions WHERE org_id=f.buyer_org_id AND active_during@>ref.clock_at() ORDER BY lower(active_during) DESC LIMIT 1;
 SELECT NOT EXISTS(SELECT 1 FROM core.orders WHERE buyer_org_id=f.buyer_org_id AND seller_org_id=f.seller_org_id AND status='completed') INTO first_pair;
 SELECT * INTO pl FROM ref.plans WHERE code=coalesce(plan,'free');
 IF (p_terms->>'deposit_rule') IS DISTINCT FROM 'percent' OR (p_terms->>'deposit_bps')::integer IS DISTINCT FROM pol.deposit_bps
 OR (p_terms->>'fee_rule') IS DISTINCT FROM 'standard' OR (p_terms->>'fee_bps')::integer IS DISTINCT FROM (CASE WHEN first_pair THEN pl.first_order_fee_bps ELSE pl.repeat_fee_bps END)
 OR (p_terms->>'fee_floor_vnd')::bigint IS DISTINCT FROM pl.fee_floor_vnd OR (p_terms->>'fee_cap_vnd')::bigint IS DISTINCT FROM pl.fee_cap_vnd
 OR p_terms->'shortfall_penalty_bps' IS DISTINCT FROM to_jsonb(pol.shortfall_penalty_bps) OR p_terms->>'value_basis' IS DISTINCT FROM 'single_product' THEN RAISE EXCEPTION 'Sai chính sách cọc/phí' USING HINT='ck_command_terms'; END IF;
 SELECT segment_code INTO seg FROM core.org_buyer_segments WHERE org_id=f.buyer_org_id ORDER BY segment_code LIMIT 1;
 INSERT INTO core.orders(code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,lot_id,offer_id,hold_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id)
 VALUES(p_code,'spot',f.buyer_org_id,f.seller_org_id,seg,l.product_id,l.id,f.id,h.id,policy,coalesce(plan,'free'),first_pair,ref.ctx_user()) RETURNING id INTO result;
 UPDATE core.holds SET order_id=result WHERE id=h.id;
 doc:=cmd.attach_document(result,'contract',p_document);
 IF (p_terms->>'qty_min')::bigint IS DISTINCT FROM h.qty OR (p_terms->>'qty_max')::bigint IS DISTINCT FROM h.qty OR (p_terms->>'unit_price_vnd')::bigint IS DISTINCT FROM r.price_vnd OR (p_terms->>'profile_version')::integer IS DISTINCT FROM l.profile_version THEN
 RAISE EXCEPTION 'Điều khoản khác lời chào/giữ lượng' USING HINT='ck_command_terms'; END IF;
 cols:=ARRAY['order_id','version_no','document_id','profile_version','qty_min','qty_max','qty_tolerance_bps','price_mode','unit_price_vnd','downgrade_price_vnd','price_formula','size_price_table','moisture_std_bps','impurity_max_bps','price_unit_base_qty','ref_price_vnd','ref_price_order_count','ref_price_scope','deposit_price_vnd','contract_value_vnd','deposit_basis_vnd','deposit_rule','deposit_bps','deposit_vnd','fee_rule','fee_bps','fee_floor_vnd','fee_cap_vnd','fee_vnd','payment_timing','pay_after_days','seller_bank_account_id','seller_bank_code','seller_account_masked','seller_account_holder','buyer_refund_account_masked','delivery_mode','acceptance_point','acceptance_facility_id','transport_by','cost_bearers','delivery_window','designated_receiver_user_id','inspection_before_loading','reject_allowance_bps','transit_loss_allowance_bps','seal_sample_required','silent_accept_hours','shortfall_penalty_bps','extra_terms','created_by','value_basis','ref_price_source','ref_price_grade_code','ref_price_as_of','ref_price_external_id'];
 PERFORM cmd.insert_row('core.order_versions',p_terms||jsonb_build_object('order_id',result,'version_no',1,'document_id',doc,'created_by',ref.ctx_user()),cols);
 UPDATE core.orders SET flag_abnormal_price=EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=result AND ref_price_source='trades' AND unit_price_vnd*10000<ref_price_vnd*pol.abnormal_price_bps),excluded_from_ref_price=EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=result AND ref_price_source='trades' AND unit_price_vnd*10000<ref_price_vnd*pol.abnormal_price_bps) WHERE id=result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.report_payment(p_payment uuid,p_amount bigint,p_method text,p_evidence uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.direct_payments%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO d FROM core.direct_payments WHERE id=p_payment FOR UPDATE;
 PERFORM cmd.require_org(d.payer_org_id,ARRAY['owner','accountant','coop_board']);
 IF d.status NOT IN ('due','payer_reported','partially_received','overdue') OR p_amount<=0 OR p_amount>d.amount_due_vnd OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=p_evidence AND order_id=d.order_id AND owner_org_id=ref.ctx_org() AND doc_type IN ('evidence','receipt_record')) THEN
 RAISE EXCEPTION 'Báo tiền cần khoản đến hạn và chứng cứ đúng đơn' USING HINT='ck_command_payment'; END IF;
 INSERT INTO core.direct_payment_reports(direct_payment_id,amount_vnd,method,evidence_doc_id,reported_by) VALUES(d.id,p_amount,p_method,p_evidence,ref.ctx_user()) RETURNING id INTO result;
 UPDATE core.direct_payments SET status='payer_reported' WHERE id=d.id;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('direct_payment_confirm','direct_payment',d.id,d.order_id,ref.clock_at()+interval '48 hours',ref.clock_at());
 RETURN result;
END $$;
CREATE FUNCTION cmd.assign_receiver(p_delivery uuid,p_user uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 o:=cmd.order_party(d.order_id,'buyer',ARRAY['owner','purchaser','warehouse']);
 IF d.status NOT IN ('preparing','ready') OR NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id JOIN core.users u ON u.id=m.user_id WHERE m.org_id=o.buyer_org_id AND m.user_id=p_user AND m.status='active' AND u.disabled_at IS NULL AND r.role_code IN ('owner','warehouse','site_receiver')) THEN
 RAISE EXCEPTION 'Người nhận/trạng thái không hợp lệ' USING HINT='ck_delivery_ready'; END IF;
 UPDATE core.qr_tokens SET revoked_at=ref.clock_at() WHERE delivery_id=d.id AND kind='receipt' AND revoked_at IS NULL;
 UPDATE core.deliveries SET receiver_user_id=p_user WHERE id=d.id;
 RETURN core.issue_qr('receipt',d.id,greatest(upper(d.delivery_window),ref.clock_at()+interval '1 hour'),p_user);
END $$;
CREATE FUNCTION cmd.book_trip(p_delivery uuid,p_vehicle uuid,p_driver uuid,p_window tstzrange,p_freight bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid; side text;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=d.order_id AND version_no=d.version_no;
 side:=CASE WHEN v.transport_by IN ('buyer','partner_for_buyer') THEN 'buyer' ELSE 'seller' END;
 o:=cmd.order_party(d.order_id,side,ARRAY['owner','purchaser','coop_board']);
 IF d.status NOT IN ('preparing','ready') OR o.status<>'active' THEN RAISE EXCEPTION 'Đợt chưa thể đặt xe' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.trips(code,vehicle_id,driver_user_id,payer_org_id,scheduled_during,freight_vnd) VALUES('TRIP-'||gen_random_uuid(),p_vehicle,p_driver,ref.ctx_org(),p_window,p_freight) RETURNING id INTO result;
 INSERT INTO core.trip_deliveries(trip_id,delivery_id,loaded_qty,freight_share_vnd) VALUES(result,d.id,d.planned_qty,p_freight);
 -- booked: nhà xe/dispatcher phải xác nhận thật bằng command riêng, không suy từ đặt xe.
 RETURN result;
END $$;
CREATE FUNCTION cmd.start_acceptance(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.receiver_user_id IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Chỉ người nhận được chỉ định' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.deliveries SET status='checking' WHERE id=d.id;
 IF d.status='ready' THEN
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,delivery_id,idempotency_key)
 SELECT lot_id,'committed','in_transit','start_check',d.planned_qty,d.order_id,d.id,'delivery-start:'||d.id FROM core.orders WHERE id=d.order_id;
 END IF;
END $$;
CREATE FUNCTION cmd.submit_acceptance(p_delivery uuid,p_weighed bigint,p_document jsonb,p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; prev core.acceptance_versions%ROWTYPE; result uuid; doc uuid; x jsonb; n integer:=0;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.status<>'checking' OR d.receiver_user_id IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Chưa nghiệm thu hoặc sai người nhận' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)=0 THEN RAISE EXCEPTION 'Thiếu dòng nghiệm thu' USING HINT='ck_command_payload'; END IF;
 SELECT * INTO prev FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 doc:=cmd.attach_document(d.order_id,'acceptance_record',p_document,'delivery',d.id);
 INSERT INTO core.acceptance_versions(delivery_id,version_no,previous_id,weighed_qty,document_id,recorded_by) VALUES(d.id,coalesce(prev.version_no,0)+1,prev.id,p_weighed,doc,ref.ctx_user()) RETURNING id INTO result;
 FOR x IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
 n:=n+1;
 PERFORM cmd.insert_row('core.acceptance_lines',x||jsonb_build_object('acceptance_id',result,'line_no',n,'evidence_document_id',doc),ARRAY['acceptance_id','line_no','lot_id','order_line_no','kind','qty','payable_qty','unit_price_vnd','value_vnd','reason_code','evidence_document_id','measurements','replaces_line_id']);
 END LOOP;
 RETURN result; -- Ký BBNT qua sign_record, không tự tạo chữ ký hay nhận fully_signed từ JSON.
END $$;
CREATE FUNCTION cmd.agree_acceptance(p_acceptance uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=p_acceptance;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board','collection_staff']);
 IF EXISTS(SELECT 1 FROM core.acceptance_versions WHERE delivery_id=d.id AND version_no>a.version_no) OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=a.document_id AND party='seller') THEN RAISE EXCEPTION 'Chỉ chốt bản mới nhất có hai chữ ký' USING HINT='ck_command_acceptance'; END IF;
 UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=a.id AND status='proposed';
END $$;
CREATE FUNCTION cmd.confirm_arrival(p_delivery uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 PERFORM cmd.order_party(d.order_id,'buyer',ARRAY['owner','warehouse','site_receiver']);
 IF d.receiver_user_id IS DISTINCT FROM ref.ctx_user() THEN RAISE EXCEPTION 'Sai người nhận' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.deliveries SET status='arrived' WHERE id=d.id;
END $$;
CREATE FUNCTION cmd.request_cancel(p_order uuid,p_reason text,p_text text,p_partial boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE result uuid; o core.orders%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); o:=cmd.order_party(p_order,ref.ctx_actor(),ARRAY['owner','purchaser','coop_board']);
 IF o.status IN ('closed','completed') OR (ref.ctx_actor()='buyer' AND p_reason NOT IN ('buyer_request','seller_no_delivery')) OR (ref.ctx_actor()='seller' AND p_reason NOT IN ('seller_request','buyer_no_payment','buyer_vehicle_late','force_majeure')) THEN RAISE EXCEPTION 'Không được yêu cầu hủy này' USING HINT='ck_command_cancel'; END IF;
 INSERT INTO core.cancellation_requests(order_id,requested_by_org_id,requested_by_user_id,reason_kind,reason_text,partial_undelivered_only) VALUES(o.id,ref.ctx_org(),ref.ctx_user(),p_reason,p_text,p_partial) RETURNING id INTO result;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at,created_at) VALUES('cancellation_reply','cancellation',result,o.id,ref.clock_at()+interval '24 hours',ref.clock_at());
 RETURN result;
END $$;
CREATE FUNCTION cmd.answer_cancel(p_request uuid,p_accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE c core.cancellation_requests%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO c FROM core.cancellation_requests WHERE id=p_request FOR UPDATE;
 PERFORM cmd.order_party(c.order_id,ref.ctx_actor(),ARRAY['owner','purchaser','coop_board']);
 IF c.requested_by_org_id=ref.ctx_org() OR p_accept IS NULL THEN RAISE EXCEPTION 'Chỉ đối tác trả lời' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.cancellation_requests SET status=CASE WHEN p_accept THEN 'processing_money' ELSE 'rejected' END WHERE id=c.id;
 UPDATE core.deadlines SET status='met' WHERE entity='cancellation' AND entity_id=c.id AND status='open';
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.create_lot(jsonb),cmd.publish_lot(uuid,bigint,bigint),cmd.create_demand(jsonb,jsonb),cmd.send_offer(text,uuid,uuid,uuid,text,bigint,bigint),cmd.accept_offer(uuid),cmd.create_order(text,uuid,jsonb,jsonb),cmd.report_payment(uuid,bigint,text,uuid),cmd.assign_receiver(uuid,uuid),cmd.book_trip(uuid,uuid,uuid,tstzrange,bigint),cmd.start_acceptance(uuid),cmd.submit_acceptance(uuid,bigint,jsonb,jsonb),cmd.agree_acceptance(uuid),cmd.confirm_arrival(uuid),cmd.request_cancel(uuid,text,text,boolean),cmd.answer_cancel(uuid,boolean) TO agiviet_app;
