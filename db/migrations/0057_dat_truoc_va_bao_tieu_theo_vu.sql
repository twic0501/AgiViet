CREATE TABLE core.seasonal_contracts (
 order_id uuid PRIMARY KEY REFERENCES core.orders, site_id uuid NOT NULL REFERENCES core.production_sites,
 harvest_during daterange NOT NULL CHECK(NOT isempty(harvest_during) AND NOT lower_inf(harvest_during) AND NOT upper_inf(harvest_during)),
 materials_advance_vnd bigint NOT NULL DEFAULT 0 CHECK(materials_advance_vnd>=0),
 created_at timestamptz NOT NULL DEFAULT ref.clock_at()
);
CREATE TABLE core.seasonal_batches (
 order_id uuid NOT NULL REFERENCES core.seasonal_contracts, batch_no integer NOT NULL CHECK(batch_no>0),
 committed_qty bigint NOT NULL CHECK(committed_qty>0), delivery_window tstzrange NOT NULL CHECK(NOT isempty(delivery_window) AND NOT lower_inf(delivery_window) AND NOT upper_inf(delivery_window)),
 materials_offset_vnd bigint NOT NULL DEFAULT 0 CHECK(materials_offset_vnd>=0), PRIMARY KEY(order_id,batch_no)
);
CREATE TABLE core.production_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES core.seasonal_contracts,
 qty_min bigint NOT NULL CHECK(qty_min>0), qty_max bigint NOT NULL CHECK(qty_max>=qty_min),
 harvest_during daterange NOT NULL CHECK(NOT isempty(harvest_during) AND NOT lower_inf(harvest_during) AND NOT upper_inf(harvest_during)),
 note text NOT NULL CHECK(length(btrim(note))>0), photo_document_ids uuid[] NOT NULL DEFAULT '{}',
 recorded_by uuid NOT NULL REFERENCES core.users, recorded_at timestamptz NOT NULL DEFAULT ref.clock_at(),
 request_key text NOT NULL CHECK(length(btrim(request_key))>0), UNIQUE(order_id,request_key)
);
CREATE TABLE core.seasonal_batch_prices (
 delivery_id uuid PRIMARY KEY REFERENCES core.deliveries, unit_price_vnd bigint NOT NULL CHECK(unit_price_vnd>0),
 reference_price_vnd bigint, reference_as_of timestamptz, reference_scope text,
 fixed_at timestamptz NOT NULL DEFAULT ref.clock_at(), fixed_by uuid NOT NULL REFERENCES core.users
);
CREATE TABLE core.seasonal_batch_accountings (
 delivery_id uuid PRIMARY KEY REFERENCES core.deliveries, acceptance_id uuid NOT NULL REFERENCES core.acceptance_versions,
 gross_vnd bigint NOT NULL CHECK(gross_vnd>=0), materials_offset_vnd bigint NOT NULL CHECK(materials_offset_vnd>=0 AND materials_offset_vnd<=gross_vnd),
 payment_id uuid UNIQUE REFERENCES core.direct_payments, created_at timestamptz NOT NULL DEFAULT ref.clock_at()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['seasonal_contracts','seasonal_batches','production_updates','seasonal_batch_prices','seasonal_batch_accountings'] LOOP
 EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.%I FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation()',t);
 EXECUTE format('ALTER TABLE core.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('GRANT SELECT ON core.%I TO agiviet_app',t);
 END LOOP;
END $$;
CREATE POLICY own_season ON core.seasonal_contracts FOR SELECT USING(core.can_access_order(order_id));
CREATE POLICY own_season_batch ON core.seasonal_batches FOR SELECT USING(core.can_access_order(order_id));
CREATE POLICY own_production_update ON core.production_updates FOR SELECT USING(core.can_access_order(order_id));
CREATE POLICY own_batch_price ON core.seasonal_batch_prices FOR SELECT USING(EXISTS(SELECT 1 FROM core.deliveries WHERE id=delivery_id AND core.can_access_order(order_id)));
CREATE POLICY own_batch_accounting ON core.seasonal_batch_accountings FOR SELECT USING(EXISTS(SELECT 1 FROM core.deliveries WHERE id=delivery_id AND core.can_access_order(order_id)));

CREATE FUNCTION core.seasonal_formula_price(p_formula jsonb,p_ref bigint) RETURNS bigint
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,ref AS $$
DECLARE floor_price bigint:=(p_formula->>'floor')::bigint; cap_price bigint:=(p_formula->>'cap')::bigint; bps integer:=(p_formula->>'ref_bps')::integer; share integer:=(p_formula->>'share_bps')::integer; price bigint;
BEGIN
 IF jsonb_typeof(p_formula) IS DISTINCT FROM 'object' OR floor_price IS NULL OR floor_price<=0 OR cap_price<floor_price
 OR (bps IS NULL)=(share IS NULL) OR bps NOT BETWEEN 0 AND 20000 OR share NOT BETWEEN 0 AND 10000
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_formula) k WHERE k NOT IN ('floor','cap','ref_bps','share_bps','scope')) THEN
 RAISE EXCEPTION 'Công thức cần sàn và ref_bps hoặc share_bps; trần không dưới sàn' USING HINT='ck_seasonal_formula'; END IF;
 IF p_ref IS NULL THEN RETURN floor_price; END IF;
 price:=CASE WHEN share IS NOT NULL THEN floor_price+ref.div_round(greatest(0,p_ref-floor_price)::numeric*share,10000)
 ELSE greatest(floor_price,ref.div_round(p_ref::numeric*bps,10000)) END;
 RETURN least(coalesce(cap_price,9223372036854775807),price);
END $$;
REVOKE ALL ON FUNCTION core.seasonal_formula_price(jsonb,bigint) FROM PUBLIC;

CREATE FUNCTION cmd.record_production_update(p_order uuid,p_data jsonb,p_key text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; result uuid; body jsonb; old core.production_updates%ROWTYPE;
BEGIN
 o:=cmd.order_party(p_order,'seller',ARRAY['owner','coop_board']);
 IF o.status NOT IN ('awaiting_seller','awaiting_deposit','active') OR NOT EXISTS(SELECT 1 FROM core.seasonal_contracts WHERE order_id=o.id) THEN
 RAISE EXCEPTION 'Đơn vụ chưa thể cập nhật' USING HINT='ck_command_state'; END IF;
 PERFORM cmd.check_payload(p_data,ARRAY['qty_min','qty_max','harvest_during','note','photo_document_ids']);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(p_data->'photo_document_ids','[]')) x WHERE NOT EXISTS(SELECT 1 FROM core.documents
 WHERE id=x::uuid AND owner_org_id=o.seller_org_id AND order_id=o.id AND doc_type='evidence' AND mime_type LIKE 'image/%')) THEN
 RAISE EXCEPTION 'Ảnh khác đơn/tổ chức' USING HINT='ck_command_evidence'; END IF;
 body:=p_data||jsonb_build_object('order_id',o.id,'recorded_by',ref.ctx_user(),'request_key',p_key);
 SELECT * INTO old FROM core.production_updates WHERE order_id=o.id AND request_key=p_key;
 IF old.id IS NOT NULL THEN
 IF (to_jsonb(old)-ARRAY['id','recorded_at']) IS DISTINCT FROM (to_jsonb(jsonb_populate_record(NULL::core.production_updates,jsonb_build_object('photo_document_ids','[]'::jsonb)||body))-ARRAY['id','recorded_at']) THEN
 RAISE EXCEPTION 'Khóa cập nhật đã dùng' USING HINT='IDEMPOTENCY_CONFLICT'; END IF; RETURN old.id; END IF;
 result:=cmd.insert_row('core.production_updates',body,ARRAY['order_id','recorded_by','request_key','qty_min','qty_max','harvest_during','note','photo_document_ids']);
 IF jsonb_array_length(coalesce(p_data->'photo_document_ids','[]'))>0 THEN
 UPDATE core.deadlines SET status='met' WHERE order_id=o.id AND kind='pre_harvest_photo' AND status='open';
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at) VALUES('pre_harvest_photo','order',o.id,o.id,ref.clock_at()+interval '7 days'); END IF;
 PERFORM evt.emit('order',o.id,'production.updated',jsonb_build_object('update_id',result),ARRAY['notify','sync_apps']); RETURN result;
END $$;
INSERT INTO ref.deadline_kinds(code,label_vi,on_expiry) VALUES('pre_harvest_photo','Cập nhật ảnh vườn mỗi 7 ngày','Việc cho vận hành nhắc người bán');

CREATE FUNCTION cmd.create_seasonal_order(p_code text,p_offer uuid,p_type text,p_terms jsonb,p_document jsonb,p_season jsonb,p_batches jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.offers%ROWTYPE; h core.holds%ROWTYPE; l core.lots%ROWTYPE; r core.offer_rounds%ROWTYPE; result uuid; doc uuid; policy integer; plan text; first_pair boolean; cols text[]; seg text; pol core.policy_versions%ROWTYPE; pl ref.plans%ROWTYPE; x jsonb; n integer:=0; total bigint:=0; offsets bigint:=0;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.offers WHERE id=p_offer FOR UPDATE;
 PERFORM cmd.require_org(f.buyer_org_id,ARRAY['owner','purchaser']);
 IF ref.ctx_actor()<>'buyer' THEN RAISE EXCEPTION 'Chỉ bên mua lập đơn' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT * INTO h FROM core.holds WHERE offer_id=f.id AND status='active' FOR UPDATE;
 SELECT * INTO l FROM core.lots WHERE id=f.lot_id FOR UPDATE;
 SELECT * INTO r FROM core.offer_rounds WHERE offer_id=f.id AND round_no=f.current_round;
 IF f.status IS DISTINCT FROM 'accepted' OR h.id IS NULL OR h.order_id IS NOT NULL OR h.expires_at<=ref.clock_at() OR l.safety_locked_at IS NOT NULL THEN RAISE EXCEPTION 'Lời chào/giữ lượng không còn dùng được' USING HINT='ck_command_state'; END IF;

 IF p_type IS NULL OR p_type NOT IN ('pre_harvest','offtake') THEN RAISE EXCEPTION 'Sai loại hợp đồng vụ' USING HINT='ck_command_payload'; END IF;
 PERFORM cmd.assert_lot_verified(l.id);
 PERFORM cmd.check_payload(p_season,ARRAY['harvest_during','materials_advance_vnd']);
 IF jsonb_typeof(p_batches) IS DISTINCT FROM 'array' OR jsonb_array_length(p_batches)=0 OR p_type='pre_harvest' AND jsonb_array_length(p_batches)<>1 THEN
 RAISE EXCEPTION 'Thiếu lịch đợt' USING HINT='ck_seasonal_schedule'; END IF;
 IF p_terms->>'price_mode' NOT IN ('fixed','formula') OR p_terms->>'price_mode' IS NULL THEN RAISE EXCEPTION 'Giá vụ cần cố định hoặc công thức' USING HINT='ck_seasonal_formula'; END IF;
 IF p_terms->>'price_mode'='formula' THEN
 PERFORM core.seasonal_formula_price(p_terms->'price_formula',NULL);
 IF (p_terms->>'unit_price_vnd')::bigint IS DISTINCT FROM (p_terms->'price_formula'->>'floor')::bigint OR (p_terms->>'deposit_price_vnd')::bigint IS DISTINCT FROM (p_terms->'price_formula'->>'floor')::bigint THEN
 RAISE EXCEPTION 'Giá ban đầu và giá cọc phải bằng sàn' USING HINT='ck_seasonal_formula'; END IF;
 END IF;
 IF p_type='offtake' THEN
 p_terms:=jsonb_build_object('payment_timing','after_days','pay_after_days',7)||p_terms;
 IF p_terms->>'deposit_rule' IS DISTINCT FROM 'per_unit' OR coalesce((p_terms->>'deposit_vnd')::bigint,0)<=0 OR p_terms->>'payment_timing' IS DISTINCT FROM 'after_days' OR coalesce((p_terms->>'pay_after_days')::integer,0)<=0 THEN RAISE EXCEPTION 'Bao tiêu giữ cọc vụ, trả riêng từng đợt sau N ngày' USING HINT='ck_seasonal_terms'; END IF;
 ELSE
 IF (p_terms->>'deposit_bps')::integer IS DISTINCT FROM 3000 THEN RAISE EXCEPTION 'Đặt trước cọc ban đầu 30 phần trăm' USING HINT='ck_seasonal_terms'; END IF;
 END IF;
 SELECT * INTO pol FROM core.policy_versions WHERE effective_from<=now() ORDER BY effective_from DESC,id DESC LIMIT 1; policy:=pol.id;
 SELECT plan_code INTO plan FROM core.subscriptions WHERE org_id=f.buyer_org_id AND active_during@>ref.clock_at() ORDER BY lower(active_during) DESC LIMIT 1;
 SELECT NOT EXISTS(SELECT 1 FROM core.orders WHERE buyer_org_id=f.buyer_org_id AND seller_org_id=f.seller_org_id AND status='completed') INTO first_pair;
 SELECT * INTO pl FROM ref.plans WHERE code=coalesce(plan,'free');
 IF (p_type='pre_harvest' AND ((p_terms->>'deposit_rule') IS DISTINCT FROM 'percent' OR (p_terms->>'deposit_bps')::integer IS DISTINCT FROM 3000))
 OR (p_terms->>'fee_rule') IS DISTINCT FROM 'standard' OR (p_terms->>'fee_bps')::integer IS DISTINCT FROM (CASE WHEN first_pair THEN pl.first_order_fee_bps ELSE pl.repeat_fee_bps END)
 OR (p_terms->>'fee_floor_vnd')::bigint IS DISTINCT FROM pl.fee_floor_vnd OR (p_terms->>'fee_cap_vnd')::bigint IS DISTINCT FROM pl.fee_cap_vnd
 OR p_terms->'shortfall_penalty_bps' IS DISTINCT FROM to_jsonb(pol.shortfall_penalty_bps) OR p_terms->>'value_basis' IS DISTINCT FROM 'single_product' THEN RAISE EXCEPTION 'Sai chính sách cọc/phí' USING HINT='ck_command_terms'; END IF;
 SELECT segment_code INTO seg FROM core.org_buyer_segments WHERE org_id=f.buyer_org_id ORDER BY segment_code LIMIT 1;
 INSERT INTO core.orders(code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,lot_id,offer_id,hold_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id)
 VALUES(p_code,p_type,f.buyer_org_id,f.seller_org_id,seg,l.product_id,l.id,f.id,h.id,policy,coalesce(plan,'free'),first_pair,ref.ctx_user()) RETURNING id INTO result;
 UPDATE core.holds SET order_id=result WHERE id=h.id;
 INSERT INTO core.seasonal_contracts(order_id,site_id,harvest_during,materials_advance_vnd)
 VALUES(result,l.site_id,(p_season->>'harvest_during')::daterange,coalesce((p_season->>'materials_advance_vnd')::bigint,0));
 FOR x IN SELECT * FROM jsonb_array_elements(p_batches) LOOP
  PERFORM cmd.check_payload(x,ARRAY['committed_qty','delivery_window','materials_offset_vnd']); n:=n+1;
  IF NOT (p_terms->>'delivery_window')::tstzrange @> (x->>'delivery_window')::tstzrange THEN RAISE EXCEPTION 'Lịch đợt ngoài cửa sổ hợp đồng' USING HINT='ck_seasonal_schedule'; END IF;
  INSERT INTO core.seasonal_batches(order_id,batch_no,committed_qty,delivery_window,materials_offset_vnd)
  VALUES(result,n,(x->>'committed_qty')::bigint,(x->>'delivery_window')::tstzrange,coalesce((x->>'materials_offset_vnd')::bigint,0));
  total:=total+(x->>'committed_qty')::bigint; offsets:=offsets+coalesce((x->>'materials_offset_vnd')::bigint,0);
 END LOOP;
 IF total<>h.qty OR offsets<>coalesce((p_season->>'materials_advance_vnd')::bigint,0) OR p_type='pre_harvest' AND offsets<>0 THEN RAISE EXCEPTION 'Tổng lượng/lịch vật tư không khớp' USING HINT='ck_seasonal_schedule'; END IF;
 doc:=cmd.attach_document(result,'contract',p_document);
 IF (p_terms->>'qty_min')::bigint IS DISTINCT FROM h.qty OR ((p_terms->>'qty_max')::bigint<h.qty OR (p_type='offtake' AND (p_terms->>'qty_max')::bigint<>h.qty)) OR (p_terms->>'unit_price_vnd')::bigint IS DISTINCT FROM r.price_vnd OR (p_terms->>'profile_version')::integer IS DISTINCT FROM l.profile_version THEN
 RAISE EXCEPTION 'Điều khoản khác lời chào/giữ lượng' USING HINT='ck_command_terms'; END IF;
 cols:=ARRAY['order_id','version_no','document_id','profile_version','qty_min','qty_max','qty_tolerance_bps','price_mode','unit_price_vnd','downgrade_price_vnd','price_formula','size_price_table','moisture_std_bps','impurity_max_bps','price_unit_base_qty','ref_price_vnd','ref_price_order_count','ref_price_scope','deposit_price_vnd','contract_value_vnd','deposit_basis_vnd','deposit_rule','deposit_bps','deposit_vnd','fee_rule','fee_bps','fee_floor_vnd','fee_cap_vnd','fee_vnd','payment_timing','pay_after_days','seller_bank_account_id','seller_bank_code','seller_account_masked','seller_account_holder','buyer_refund_account_masked','delivery_mode','acceptance_point','acceptance_facility_id','transport_by','cost_bearers','delivery_window','designated_receiver_user_id','inspection_before_loading','reject_allowance_bps','transit_loss_allowance_bps','seal_sample_required','silent_accept_hours','shortfall_penalty_bps','extra_terms','created_by','value_basis','ref_price_source','ref_price_grade_code','ref_price_as_of','ref_price_external_id'];
 PERFORM cmd.insert_row('core.order_versions',p_terms||jsonb_build_object('order_id',result,'version_no',1,'document_id',doc,'created_by',ref.ctx_user()),cols);
 UPDATE core.orders SET flag_abnormal_price=EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=result AND ref_price_source='trades' AND unit_price_vnd*10000<ref_price_vnd*pol.abnormal_price_bps),excluded_from_ref_price=EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=result AND ref_price_source='trades' AND unit_price_vnd*10000<ref_price_vnd*pol.abnormal_price_bps) WHERE id=result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION cmd.finalize_signed_order(p_order uuid,p_payment_ref text,p_virtual_account text,p_provider text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid; hours integer;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 SELECT CASE WHEN shelf_life_days<=10 THEN 12 ELSE 24 END INTO hours FROM core.product_profiles WHERE product_id=o.product_id AND profile_version=(SELECT profile_version FROM core.order_versions WHERE order_id=o.id AND version_no=1);
 IF o.contract_type NOT IN ('spot','pre_harvest','offtake') OR o.status<>'awaiting_seller' THEN RAISE EXCEPTION 'Đơn không ở bước ký' USING HINT='ck_command_state'; END IF;
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


CREATE OR REPLACE FUNCTION cmd.activate_order_after_deposit(p_order uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid; b record; did uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF o.status='active' THEN SELECT id INTO result FROM core.deliveries WHERE order_id=o.id AND batch_no=1; RETURN result; END IF;
 IF o.status IS DISTINCT FROM 'awaiting_deposit' THEN RAISE EXCEPTION 'Đơn không chờ cọc' USING HINT='ck_command_state'; END IF;
 UPDATE core.orders SET status='active' WHERE id=o.id; -- guard kiểm bằng chứng + số dư C/F.
 UPDATE core.holds SET status='committed' WHERE id=o.hold_id AND status='active';
 UPDATE core.deadlines SET status='met' WHERE order_id=o.id AND kind='deposit' AND status='open';
 IF EXISTS(SELECT 1 FROM core.seasonal_contracts WHERE order_id=o.id) THEN
 FOR b IN SELECT * FROM core.seasonal_batches WHERE order_id=o.id ORDER BY batch_no LOOP
  INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id)
  VALUES(o.code||'-D'||b.batch_no,o.id,v.version_no,b.batch_no,b.committed_qty,b.delivery_window,v.designated_receiver_user_id) RETURNING id INTO did;
  IF result IS NULL THEN result:=did; END IF;
  IF v.designated_receiver_user_id IS NOT NULL THEN PERFORM core.issue_qr('receipt',did,greatest(upper(b.delivery_window),ref.clock_at()+interval '1 hour'),v.designated_receiver_user_id); END IF;
 END LOOP;
 IF o.contract_type='pre_harvest' THEN INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at) VALUES('pre_harvest_photo','order',o.id,o.id,ref.clock_at()+interval '7 days'); END IF;
 ELSE
 INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id)
 VALUES(o.code||'-D1',o.id,v.version_no,1,v.qty_min,v.delivery_window,v.designated_receiver_user_id) RETURNING id INTO result;
 IF v.designated_receiver_user_id IS NOT NULL THEN PERFORM core.issue_qr('receipt',result,greatest(upper(v.delivery_window),ref.clock_at()+interval '1 hour'),v.designated_receiver_user_id); END IF;
 END IF;
 IF v.contract_value_vnd>v.deposit_vnd AND v.payment_timing='before_loading' THEN
 INSERT INTO core.direct_payments(code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,blocks_loading,due_at,payee_bank_code,payee_account_masked,payee_account_holder)
 VALUES(o.code||'-BEFORE',o.id,'goods_before_loading','buyer_to_seller',o.buyer_org_id,o.seller_org_id,v.contract_value_vnd-v.deposit_vnd,'order_active','due',true,lower(v.delivery_window),v.seller_bank_code,v.seller_account_masked,v.seller_account_holder);
 END IF;
 RETURN result;
END $$;
CREATE FUNCTION cmd.seasonal_price(p_order uuid) RETURNS TABLE(price bigint,ref_price bigint,ref_as_of timestamptz,scope text)
LANGUAGE plpgsql SET search_path=pg_catalog,core,mkt,ref AS $$
DECLARE v core.order_versions%ROWTYPE; o core.orders%ROWTYPE; grade text;
BEGIN
 SELECT * INTO o FROM core.orders WHERE id=p_order;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=1;
 IF v.price_mode='fixed' THEN RETURN QUERY SELECT v.unit_price_vnd,NULL::bigint,NULL::timestamptz,NULL::text; RETURN; END IF;
 SELECT grade_code INTO grade FROM core.lots WHERE id=o.lot_id;
 scope:=coalesce(v.price_formula->>'scope','DBSCL');
 SELECT r.unit_price_vnd,r.as_of INTO ref_price,ref_as_of FROM mkt.reference_prices r
 WHERE r.product_id=o.product_id AND r.grade_code=grade AND r.scope=seasonal_price.scope AND r.order_count>=3 AND r.pair_count>=2
 AND (r.as_of AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND r.as_of<=ref.clock_at();
 IF ref_price IS NULL THEN RAISE EXCEPTION 'Chưa có giá giao dịch đủ mẫu tại ngày chốt; không dùng giá ngoài' USING HINT='ck_seasonal_reference'; END IF;
 price:=core.seasonal_formula_price(v.price_formula,ref_price); RETURN NEXT;
END $$;
CREATE FUNCTION cmd.propose_harvest_fix(p_order uuid,p_qty bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; initial core.order_versions%ROWTYPE; result uuid; price record;
BEGIN
 o:=cmd.party_order(p_order); SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 SELECT * INTO initial FROM core.order_versions WHERE order_id=o.id AND version_no=1;
 IF o.contract_type<>'pre_harvest' OR o.status<>'active' OR p_qty IS NULL OR p_qty<least(v.qty_min,initial.qty_min) OR p_qty>initial.qty_max
 OR NOT EXISTS(SELECT 1 FROM core.seasonal_contracts WHERE order_id=o.id)
 OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=o.id AND status NOT IN ('preparing','ready'))
 OR EXISTS(SELECT 1 FROM core.amendments WHERE order_id=o.id AND (status='open' OR status='accepted' AND resulting_version_no>o.effective_version_no OR kind='fix_qty_price' AND status='accepted'))
 OR EXISTS(SELECT 1 FROM core.cancellation_requests WHERE order_id=o.id AND status IN ('awaiting_reply','processing_money')) THEN
 RAISE EXCEPTION 'Chưa thể chốt lượng/ngoài khoảng hợp đồng' USING HINT='ck_harvest_fix'; END IF;
 SELECT * INTO price FROM cmd.seasonal_price(o.id);
 INSERT INTO core.amendments(order_id,kind,proposed_by_org_id,proposed_by_user_id,payload,buyer_reply_deadline,notice_days_before_delivery,created_at)
 VALUES(o.id,'fix_qty_price',ref.ctx_org(),ref.ctx_user(),jsonb_build_object('qty_g',p_qty,'unit_price_vnd',price.price,'reference_price_vnd',price.ref_price,'reference_as_of',price.ref_as_of,'reference_scope',price.scope),ref.clock_at()+interval '24 hours',greatest(0,extract(day FROM lower(v.delivery_window)-ref.clock_at())::integer),ref.clock_at()) RETURNING id INTO result;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at) VALUES('amendment_reply','amendment',result,o.id,ref.clock_at()+interval '24 hours'); RETURN result;
END $$;
CREATE FUNCTION cmd.fix_seasonal_batch_price(p_delivery uuid) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; price record; old bigint;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE;
 o:=cmd.party_order(d.order_id);
 IF o.contract_type<>'offtake' OR o.status<>'active' OR d.status NOT IN ('preparing','ready') OR NOT EXISTS(SELECT 1 FROM core.seasonal_contracts WHERE order_id=o.id) THEN
 RAISE EXCEPTION 'Đợt chưa thể chốt giá' USING HINT='ck_command_state'; END IF;
 SELECT unit_price_vnd INTO old FROM core.seasonal_batch_prices WHERE delivery_id=d.id;
 IF old IS NOT NULL THEN RETURN old; END IF;
 SELECT * INTO price FROM cmd.seasonal_price(o.id);
 INSERT INTO core.seasonal_batch_prices(delivery_id,unit_price_vnd,reference_price_vnd,reference_as_of,reference_scope,fixed_by)
 VALUES(d.id,price.price,price.ref_price,price.ref_as_of,price.scope,ref.ctx_user());
 PERFORM evt.emit('order',o.id,'seasonal_batch.price_fixed',jsonb_build_object('delivery_id',d.id,'price_vnd',price.price),ARRAY['notify']); RETURN price.price;
END $$;

CREATE FUNCTION core.guard_seasonal_delivery() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,core,ref AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id;
 IF NOT EXISTS(SELECT 1 FROM core.seasonal_contracts WHERE order_id=o.id) THEN RETURN NEW; END IF;
 IF NEW.status IN ('ready','checking','in_transit','arrival_check','closed') THEN
  IF o.contract_type='pre_harvest' AND NOT EXISTS(SELECT 1 FROM core.amendments a JOIN core.amendment_applications ap ON ap.amendment_id=a.id
   WHERE a.order_id=o.id AND a.kind='fix_qty_price' AND a.resulting_version_no<=o.effective_version_no) THEN
   RAISE EXCEPTION 'Đặt trước còn chờ chốt lượng/giá bằng phụ lục đã ký' USING HINT='ck_harvest_fix'; END IF;
  IF o.contract_type='offtake' AND NEW.status<>'ready' AND (NOT EXISTS(SELECT 1 FROM core.seasonal_batch_prices WHERE delivery_id=NEW.id)
   OR NOT EXISTS(SELECT 1 FROM core.cultivation_entries e WHERE e.delivery_id=NEW.id AND e.activity='harvest' AND NOT EXISTS(SELECT 1 FROM core.cultivation_entries n WHERE n.supersedes_id=e.id))) THEN
   RAISE EXCEPTION 'Bao tiêu cần nhật ký thu hoạch và giá đợt' USING HINT='ck_seasonal_harvest'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER a_seasonal BEFORE UPDATE OF status ON core.deliveries FOR EACH ROW EXECUTE FUNCTION core.guard_seasonal_delivery();
CREATE FUNCTION core.account_seasonal_batch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; a core.acceptance_versions%ROWTYPE; gross bigint; mat bigint; harvested bigint; task uuid; payment uuid;
BEGIN
 IF NEW.status<>'closed' OR EXISTS(SELECT 1 FROM core.seasonal_batch_accountings WHERE delivery_id=NEW.id) THEN RETURN NEW; END IF;
 SELECT * INTO o FROM core.orders WHERE id=NEW.order_id;
 IF o.contract_type<>'offtake' OR NOT EXISTS(SELECT 1 FROM core.seasonal_contracts WHERE order_id=o.id) THEN RETURN NEW; END IF;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=NEW.version_no;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=NEW.id ORDER BY version_no DESC LIMIT 1;
 IF a.id IS NULL OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') THEN RAISE EXCEPTION 'Đợt bao tiêu chưa chốt nghiệm thu' USING HINT='ck_command_acceptance'; END IF;
 SELECT coalesce(sum(value_vnd),0) INTO gross FROM core.acceptance_lines WHERE acceptance_id=a.id;
 SELECT materials_offset_vnd INTO mat FROM core.seasonal_batches WHERE order_id=o.id AND batch_no=NEW.batch_no;
 IF mat>gross THEN RAISE EXCEPTION 'Vật tư đối trừ vượt giá trị đợt; cần phụ lục lịch mới' USING HINT='ck_seasonal_materials'; END IF;
 IF mat>0 THEN INSERT INTO core.contract_charges(order_id,kind,payer_side,amount_vnd,basis,source_entity,source_id,created_by)
 VALUES(o.id,'materials_offset','seller',mat,jsonb_build_object('batch_no',NEW.batch_no),'delivery',NEW.id,ref.ctx_user()); END IF;
 IF gross>mat THEN
 INSERT INTO core.direct_payments(code,order_id,delivery_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,due_at,payee_bank_code,payee_account_masked,payee_account_holder)
 VALUES('SEASON-'||NEW.id,o.id,NEW.id,'goods_batch','buyer_to_seller',o.buyer_org_id,o.seller_org_id,gross-mat,'after_days','due',ref.clock_at()+coalesce(v.pay_after_days,7)*interval '1 day',v.seller_bank_code,v.seller_account_masked,v.seller_account_holder) RETURNING id INTO payment;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at) VALUES('direct_payment_due','direct_payment',payment,o.id,ref.clock_at()+coalesce(v.pay_after_days,7)*interval '1 day');
 END IF;
 INSERT INTO core.seasonal_batch_accountings(delivery_id,acceptance_id,gross_vnd,materials_offset_vnd,payment_id) VALUES(NEW.id,a.id,gross,mat,payment);
 SELECT sum(harvested_qty) INTO harvested FROM core.cultivation_entries e WHERE delivery_id=NEW.id AND activity='harvest' AND NOT EXISTS(SELECT 1 FROM core.cultivation_entries n WHERE n.supersedes_id=e.id);
 IF a.weighed_qty::numeric*100<harvested::numeric*80 AND NOT EXISTS(SELECT 1 FROM core.cultivation_entries e WHERE delivery_id=NEW.id AND shortfall_reason IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.cultivation_entries n WHERE n.supersedes_id=e.id)) THEN
 task:=cmd.payment_reconciliation_task('V05',2::smallint,'delivery',NEW.id,o.id,'field','suspected-side-sale:'||NEW.id,'Lượng giao thấp hơn 80% nhật ký, chưa có lý do; nghi bán ra ngoài, cần kiểm tra');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_seasonal_money AFTER UPDATE OF status ON core.deliveries FOR EACH ROW WHEN(OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION core.account_seasonal_batch();
CREATE FUNCTION core.guard_seasonal_settlement() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,core AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM core.orders o JOIN core.seasonal_contracts s ON s.order_id=o.id WHERE o.id=NEW.order_id AND o.contract_type='offtake')
 AND (NOT NEW.is_final OR EXISTS(SELECT 1 FROM core.deliveries WHERE order_id=NEW.order_id AND status NOT IN ('closed','shortfall_ended','cancelled'))) THEN
 RAISE EXCEPTION 'Giữ cọc suốt vụ; chỉ quyết toán cuối vụ hoặc đi luồng hủy' USING HINT='ck_seasonal_deposit'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER a_seasonal_deposit BEFORE INSERT ON core.settlements FOR EACH ROW EXECUTE FUNCTION core.guard_seasonal_settlement();

CREATE OR REPLACE FUNCTION cmd.answer_amendment(p_amendment uuid,p_action text,p_document jsonb DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.amendments%ROWTYPE; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; nv core.order_versions%ROWTYPE; d core.documents%ROWTYPE; doc uuid; q bigint; price bigint; pc bigint; val bigint; basis bigint; c bigint; f bigint; fb bigint; so integer; patch jsonb;
BEGIN
 SELECT * INTO a FROM core.amendments WHERE id=p_amendment FOR UPDATE; o:=cmd.party_order(a.order_id);
 IF a.status IS DISTINCT FROM 'open' OR a.kind='change_receiver' THEN RAISE EXCEPTION 'Đề nghị không chờ trả lời' USING HINT='ck_command_state'; END IF;
 IF p_action='withdraw' THEN
 IF a.proposed_by_org_id<>ref.ctx_org() THEN RAISE EXCEPTION 'Chỉ bên gửi rút' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.amendments SET status='withdrawn' WHERE id=a.id;
 ELSIF p_action IN ('accept','reject') THEN
 IF a.proposed_by_org_id=ref.ctx_org() THEN RAISE EXCEPTION 'Bên gửi không tự trả lời' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.deadlines WHERE entity='amendment' AND entity_id=a.id AND status='open' AND due_at>ref.clock_at()) THEN RAISE EXCEPTION 'Hết hạn trả lời' USING HINT='ck_deadline_not_due'; END IF;
 IF p_action='reject' THEN UPDATE core.amendments SET status='rejected',buyer_replied_at=CASE WHEN ref.ctx_actor()='buyer' THEN ref.clock_at() ELSE buyer_replied_at END WHERE id=a.id;
 ELSE
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 q:=CASE WHEN a.kind IN ('increase_qty','decrease_qty','force_majeure_reduction','fix_qty_price') THEN (a.payload->>'qty_g')::bigint ELSE v.qty_min END;
 price:=CASE WHEN a.kind IN ('change_price','fix_qty_price') THEN (a.payload->>'unit_price_vnd')::bigint ELSE v.unit_price_vnd END;
 pc:=CASE WHEN v.ref_price_source='trades' THEN greatest(price,ceil(v.ref_price_vnd*0.7)::bigint) ELSE price END;
 val:=ref.div_round(q::numeric*price,v.price_unit_base_qty); basis:=ref.div_round(q::numeric*pc,v.price_unit_base_qty);
 c:=CASE v.deposit_rule WHEN 'percent' THEN least(val,ref.div_round(v.deposit_bps::numeric*basis,10000000)*1000) WHEN 'none' THEN 0 ELSE ref.div_round(v.deposit_vnd::numeric*q,v.qty_min) END;
 fb:=core.order_fee_basis(v.order_id,v.version_no,v.deposit_basis_vnd);
 IF a.kind IN ('increase_qty','decrease_qty','force_majeure_reduction','fix_qty_price') THEN fb:=ref.div_round(fb::numeric*q,v.qty_min); END IF;
 f:=CASE WHEN v.fee_bps=0 THEN 0 ELSE least(coalesce(v.fee_cap_vnd,9223372036854775807),greatest(coalesce(v.fee_floor_vnd,0),ref.div_round(v.fee_bps::numeric*fb,10000))) END;
 SELECT max(version_no)+1 INTO so FROM core.order_versions WHERE order_id=o.id;
 SELECT * INTO d FROM core.documents WHERE id=v.document_id;
 -- Chuỗi phải nối đúng phiên bản hiện hành; không cho client chọn người/tổ chức/status.
 doc:=cmd.attach_document(o.id,'annex',p_document||jsonb_build_object('series_key',d.series_key,'version_no',so,'prev_document_id',d.id,'prev_content_sha256',d.content_sha256),'amendment',a.id);
 patch:=jsonb_build_object('version_no',so,'amendment_id',a.id,'document_id',doc,'qty_min',q,'qty_max',q,'unit_price_vnd',price,'deposit_price_vnd',pc,'contract_value_vnd',val,'deposit_basis_vnd',basis,'deposit_vnd',c,'fee_vnd',f,'created_by',ref.ctx_user(),'created_at',now(),'write_xid',pg_current_xact_id()::text);
 IF a.kind='fix_qty_price' THEN patch:=patch||jsonb_build_object('price_mode','fixed'); END IF;
 IF a.kind='change_date' THEN patch:=patch||jsonb_build_object('delivery_window',a.payload->>'delivery_window'); END IF;
 IF a.kind='change_transport' THEN patch:=patch||jsonb_build_object('transport_by',a.payload->>'transport_by'); END IF;
 nv:=jsonb_populate_record(NULL::core.order_versions,to_jsonb(v)||patch);
 INSERT INTO core.order_versions SELECT (nv).*;
 UPDATE core.amendments SET status='accepted',resulting_version_no=so,buyer_replied_at=CASE WHEN ref.ctx_actor()='buyer' THEN ref.clock_at() ELSE buyer_replied_at END WHERE id=a.id;
 END IF;
 ELSE RAISE EXCEPTION 'Sai hành động đề nghị' USING HINT='ck_command_payload'; END IF;
 UPDATE core.deadlines SET status=CASE WHEN p_action='withdraw' THEN 'cancelled' ELSE 'met' END WHERE entity='amendment' AND entity_id=a.id AND status='open'; RETURN doc;
END $$;
CREATE OR REPLACE FUNCTION core.guard_fee_basis() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,core,ref AS $$
DECLARE prev core.order_versions%ROWTYPE; am core.amendments%ROWTYPE; basis bigint;
BEGIN
 SELECT * INTO prev FROM core.order_versions WHERE order_id=NEW.order_id AND version_no=NEW.version_no-1;
 SELECT * INTO am FROM core.amendments WHERE id=NEW.amendment_id AND order_id=NEW.order_id;
 IF prev.order_id IS NULL OR am.id IS NULL THEN RETURN NEW; END IF;
 basis:=core.order_fee_basis(prev.order_id,prev.version_no,prev.deposit_basis_vnd);
 IF am.kind IN ('increase_qty','decrease_qty','force_majeure_reduction','fix_qty_price') THEN basis:=ref.div_round(basis::numeric*NEW.qty_min,prev.qty_min); END IF;
 INSERT INTO core.order_version_fee_bases VALUES(NEW.order_id,NEW.version_no,basis);
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION core.guard_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a core.acceptance_versions%ROWTYPE; d core.deliveries%ROWTYPE; v core.order_versions%ROWTYPE; o core.orders%ROWTYPE; p core.lots%ROWTYPE; valid_price boolean;
BEGIN
 SELECT * INTO a FROM core.acceptance_versions WHERE id=NEW.acceptance_id;
 IF a.write_xid<>pg_current_xact_id() THEN RAISE EXCEPTION 'Phiên bản nghiệm thu đã đóng' USING HINT='ck_acceptance_sealed'; END IF;
 SELECT * INTO d FROM core.deliveries WHERE id=a.delivery_id; SELECT * INTO o FROM core.orders WHERE id=d.order_id;
 SELECT * INTO v FROM core.order_versions WHERE order_id=d.order_id AND version_no=d.version_no;
 SELECT * INTO p FROM core.lots WHERE id=NEW.lot_id;
 IF p.seller_org_id<>o.seller_org_id OR p.product_id<>o.product_id THEN RAISE EXCEPTION 'Dòng khác lô của đơn' USING HINT='ck_acceptance_lot'; END IF;
 IF EXISTS(SELECT 1 FROM core.seasonal_contracts WHERE order_id=o.id) AND o.contract_type='offtake' THEN
 SELECT unit_price_vnd INTO v.unit_price_vnd FROM core.seasonal_batch_prices WHERE delivery_id=d.id;
 IF v.unit_price_vnd IS NULL THEN RAISE EXCEPTION 'Chưa chốt giá đợt' USING HINT='ck_seasonal_harvest'; END IF;
 END IF;
 IF NEW.kind IN ('accepted','transit_damage') AND NEW.unit_price_vnd<>v.unit_price_vnd THEN RAISE EXCEPTION 'Không được sửa giá khi giao' USING HINT='ck_acceptance_price'; END IF;
 IF NEW.kind='downgraded' AND NEW.unit_price_vnd IS DISTINCT FROM v.downgrade_price_vnd THEN RAISE EXCEPTION 'Sai giá hạ cấp đã ký' USING HINT='ck_acceptance_price'; END IF;
 IF NEW.kind='transit_damage' AND v.acceptance_point NOT IN ('tai_vuon','tai_ao','tai_ruong','tai_diem_gom') THEN RAISE EXCEPTION 'Rủi ro đường thuộc người bán' USING HINT='ck_acceptance_risk'; END IF;
 IF NEW.kind<>'table_adjustment' AND NEW.kind<>'rejected' AND NEW.payable_qty<>NEW.qty THEN RAISE EXCEPTION 'Lượng tính tiền khác lượng cân' USING HINT='ck_acceptance_qty'; END IF;
 IF NEW.kind='table_adjustment' THEN
 IF v.price_mode='size_table' THEN
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(v.size_price_table) t WHERE (NEW.measurements->>'sample_size')::numeric BETWEEN (t->>'from')::numeric AND (t->>'to')::numeric AND NEW.unit_price_vnd=(t->>'price')::bigint) INTO valid_price;
 IF NOT coalesce(valid_price,false) OR NEW.payable_qty<>NEW.qty THEN RAISE EXCEPTION 'Sai bảng cỡ' USING HINT='ck_acceptance_table'; END IF;
 ELSIF v.price_mode='moisture' THEN
 IF NEW.unit_price_vnd<>v.unit_price_vnd OR (NEW.measurements->>'moisture_bps')::integer NOT BETWEEN 0 AND 9999 OR NEW.payable_qty IS DISTINCT FROM ref.div_round(NEW.qty::numeric*(10000-(NEW.measurements->>'moisture_bps')::integer),10000-v.moisture_std_bps) THEN
 RAISE EXCEPTION 'Sai quy đổi độ ẩm' USING HINT='ck_acceptance_moisture'; END IF;
 ELSE RAISE EXCEPTION 'Không có bảng điều chỉnh đã ký' USING HINT='ck_acceptance_table'; END IF;
 END IF;
 IF NEW.kind IN ('downgraded','rejected') AND NOT EXISTS(SELECT 1 FROM core.product_reject_reasons WHERE product_id=p.product_id AND profile_version=p.profile_version AND reason_code=NEW.reason_code) THEN RAISE EXCEPTION 'Lý do sai danh mục' USING HINT='ck_acceptance_reason'; END IF;
 RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION cmd.agree_acceptance_before_revision(p_acceptance uuid) RETURNS void
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
 IF o.framework_id IS NOT NULL OR o.contract_type='offtake' AND EXISTS(SELECT 1 FROM core.seasonal_contracts WHERE order_id=o.id) THEN RETURN; END IF;
 SELECT coalesce(sum(l.value_vnd),0) INTO amount FROM core.acceptance_lines l JOIN core.acceptance_versions av ON av.id=l.acceptance_id JOIN core.deliveries dl ON dl.id=av.delivery_id WHERE dl.order_id=o.id AND l.status='closed' AND NOT EXISTS(SELECT 1 FROM core.acceptance_versions n WHERE n.delivery_id=dl.id AND n.version_no>av.version_no);
 SELECT coalesce(sum(c.amount_vnd),0) INTO received FROM core.direct_payments p JOIN core.direct_payment_confirmations c ON c.direct_payment_id=p.id WHERE p.order_id=o.id AND p.direction='buyer_to_seller';
 SELECT coalesce(sum(p.amount_due_vnd-coalesce((SELECT sum(c.amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0)),0) INTO outstanding FROM core.direct_payments p WHERE p.order_id=o.id AND p.direction='buyer_to_seller' AND p.status NOT IN ('fully_received','cancelled');
 amount:=greatest(0,amount-v.deposit_vnd-received-outstanding);
 IF amount>0 AND v.payment_timing IN ('inspect_then_before_loading','on_receipt','after_days') THEN
 INSERT INTO core.direct_payments(code,order_id,delivery_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,blocks_loading,due_at,payee_bank_code,payee_account_masked,payee_account_holder)
 VALUES('GOODS-'||a.id,o.id,d.id,CASE WHEN v.payment_timing='after_days' THEN 'goods_after_days' ELSE 'goods_on_receipt' END,'buyer_to_seller',o.buyer_org_id,o.seller_org_id,amount,CASE WHEN v.payment_timing='after_days' THEN 'after_days' ELSE 'acceptance_closed' END,'due',v.payment_timing='inspect_then_before_loading',ref.clock_at()+coalesce(v.pay_after_days,0)*interval '1 day',v.seller_bank_code,v.seller_account_masked,v.seller_account_holder);
 END IF;
END $$;

CREATE FUNCTION core.seasonal_status(p_order uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT CASE WHEN o.status IN ('closed','completed') THEN o.status WHEN o.status<>'active' THEN o.status
 WHEN o.contract_type='pre_harvest' AND NOT EXISTS(SELECT 1 FROM core.amendments a JOIN core.amendment_applications ap ON ap.amendment_id=a.id WHERE a.order_id=o.id AND a.kind='fix_qty_price') THEN 'cho_chot_luong_gia'
 ELSE 'dang_thuc_hien' END FROM core.orders o WHERE o.id=p_order AND core.can_access_order(o.id)
$$;
GRANT EXECUTE ON FUNCTION core.seasonal_status(uuid) TO agiviet_app;
CREATE VIEW core.v_seasonal_progress WITH(security_invoker=true) AS
 SELECT s.order_id,o.contract_type,o.status order_status,s.site_id,s.harvest_during,core.seasonal_status(o.id) seasonal_status
 FROM core.seasonal_contracts s JOIN core.orders o ON o.id=s.order_id;
GRANT SELECT ON core.v_seasonal_progress TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.create_seasonal_order(text,uuid,text,jsonb,jsonb,jsonb,jsonb),cmd.record_production_update(uuid,jsonb,text),cmd.propose_harvest_fix(uuid,bigint),cmd.fix_seasonal_batch_price(uuid) TO agiviet_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
-- Chú thích cho các trường mới; đơn vị dùng chung gam, đồng VND, múi giờ Việt Nam.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='core' AND table_name IN
 ('cultivation_entries','seller_product_verifications','seller_product_reviews','seller_product_revocations','urgent_sale_suggestions','seasonal_contracts','seasonal_batches','production_updates','seasonal_batch_prices','seasonal_batch_accountings') LOOP
 EXECUTE format('COMMENT ON COLUMN core.%I.%I IS %L',r.table_name,r.column_name,
 CASE WHEN r.column_name LIKE '%qty%' THEN 'Lượng số nguyên theo đơn vị cơ sở mặt hàng (gam trong seed).'
 WHEN r.column_name LIKE '%_vnd' THEN 'Số tiền nguyên đồng VND; không tự chứng minh dòng tiền đã nhận.'
 ELSE 'Thuộc tính '||r.column_name||'; xem hướng dẫn backend 06, phần nhật ký và hợp đồng vụ 0056–0057.' END);
 END LOOP;
END $$;
COMMENT ON TABLE core.seller_product_verifications IS 'Phạm vi mặt hàng × cơ sở × hồ sơ/loại/tiêu chí, nguồn kiểm và hạn; chỉ có hiệu lực sau duyệt độc lập, không bảo lãnh mọi lô.';
COMMENT ON TABLE core.seller_product_reviews IS 'Người duyệt khác người lập, append-only.';
COMMENT ON TABLE core.seller_product_revocations IS 'Thu hồi hiệu lực bằng sự kiện mới, giữ hồ sơ đã duyệt.';
COMMENT ON TABLE core.urgent_sale_suggestions IS 'Gợi ý riêng cho chủ sau 24 giờ không có lời hỏi hàng tươi; không tự bật cờ/giảm giá.';
COMMENT ON TABLE core.seasonal_contracts IS 'Thông tin vụ gắn hợp đồng thật; chữ ký/cọc vẫn qua orders/order_versions và command hiện có.';
COMMENT ON TABLE core.seasonal_batches IS 'Lịch cam kết và vật tư ứng ban đầu; lượng sau phụ lục lấy deliveries, không sửa lịch sử lịch ban đầu.';
COMMENT ON TABLE core.production_updates IS 'Cập nhật sản lượng ước tính và ảnh cho hai bên xem, không tự thay lượng đã ký.';
COMMENT ON TABLE core.seasonal_batch_prices IS 'Giá đợt tính từ công thức đã ký và tham khảo giao dịch đúng ngày; bất biến, hai bên đã ủy quyền công thức qua chữ ký hợp đồng.';
COMMENT ON TABLE core.seasonal_batch_accountings IS 'Chốt tiền từng đợt bao tiêu, đối trừ vật tư riêng; không trừ cọc vụ khỏi mỗi đợt.';
-- Bao tiêu cả vụ có thể vượt cửa sổ giao ngay 90 ngày. Không nới cho loại khác.
CREATE FUNCTION core.order_window_limit(p_order uuid) RETURNS interval LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM core.seasonal_contracts s JOIN core.orders o ON o.id=s.order_id WHERE o.id=p_order AND o.contract_type='offtake') THEN interval '366 days' ELSE interval '90 days' END
$$;
ALTER TABLE core.order_versions DROP CONSTRAINT ck_ov_window;
ALTER TABLE core.order_versions ADD CONSTRAINT ck_ov_window CHECK(NOT isempty(delivery_window) AND NOT lower_inf(delivery_window) AND NOT upper_inf(delivery_window) AND upper(delivery_window)-lower(delivery_window)<=core.order_window_limit(order_id));
REVOKE ALL ON FUNCTION core.order_window_limit(uuid) FROM PUBLIC;
