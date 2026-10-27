CREATE TABLE core.framework_terms(
 framework_id uuid PRIMARY KEY REFERENCES core.framework_contracts,document_id uuid NOT NULL UNIQUE REFERENCES core.documents,
 seller_bank_account_id uuid NOT NULL REFERENCES pii.bank_accounts,seller_bank_code text NOT NULL,seller_account_masked text NOT NULL,seller_account_holder text NOT NULL,
 period_value_vnd bigint NOT NULL CHECK(period_value_vnd>0)
);
ALTER TABLE core.framework_terms ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.framework_terms FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.create_framework(p_data jsonb,p_document jsonb,p_bank uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,pii,ref,public AS $$
DECLARE result uuid; b pii.bank_accounts%ROWTYPE; doc uuid; policy integer; value bigint; x jsonb; fee integer;
BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','purchaser']);
 IF ref.ctx_actor()<>'buyer' OR NOT EXISTS(SELECT 1 FROM core.organizations WHERE id=(p_data->>'seller_org_id')::uuid AND can_sell AND status='active' AND kind<>'coop_group') THEN RAISE EXCEPTION 'Sai bên khung' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM cmd.check_payload(p_data,ARRAY['code','seller_org_id','segment_code','schedule','price_period','billing_period','framework_deposit_vnd','active_during']);
 SELECT * INTO b FROM pii.bank_accounts WHERE id=p_bank AND org_id=(p_data->>'seller_org_id')::uuid AND status='active';
 IF b.id IS NULL OR jsonb_typeof(p_data->'schedule'->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'schedule'->'items')=0 THEN RAISE EXCEPTION 'Thiếu tài khoản/lịch món' USING HINT='ck_command_terms'; END IF;
 value:=0;
 FOR x IN SELECT * FROM jsonb_array_elements(p_data->'schedule'->'items') LOOP
 PERFORM cmd.check_payload(x,ARRAY['product_id','profile_version','grade_code','qty','unit_price_vnd','downgrade_price_vnd']);
 IF (x->>'qty')::bigint<=0 OR (x->>'unit_price_vnd')::bigint<=0 OR NOT EXISTS(SELECT 1 FROM core.product_grades WHERE product_id=(x->>'product_id')::uuid AND profile_version=(x->>'profile_version')::integer AND grade_code=x->>'grade_code') THEN RAISE EXCEPTION 'Sai món trong lịch' USING HINT='ck_command_terms'; END IF;
 value:=value+ref.div_round((x->>'qty')::numeric*(x->>'unit_price_vnd')::bigint,1000);
 END LOOP;
 IF (p_data->>'framework_deposit_vnd')::bigint<value THEN RAISE EXCEPTION 'Cọc khung ít nhất một kỳ lịch' USING HINT='ck_framework_deposit'; END IF;
 SELECT id INTO policy FROM core.policy_versions WHERE effective_from<=now() ORDER BY effective_from DESC LIMIT 1;
 SELECT pl.repeat_fee_bps INTO fee FROM core.subscriptions s JOIN ref.plans pl ON pl.code=s.plan_code WHERE s.org_id=ref.ctx_org() AND s.active_during@>ref.clock_at() ORDER BY lower(s.active_during) DESC LIMIT 1;
 result:=cmd.insert_row('core.framework_contracts',p_data||jsonb_build_object('buyer_org_id',ref.ctx_org(),'created_by',ref.ctx_user(),'policy_version_id',policy,'fee_bps',coalesce(fee,100)),ARRAY['code','seller_org_id','segment_code','schedule','price_period','billing_period','framework_deposit_vnd','active_during','buyer_org_id','created_by','policy_version_id','fee_bps']);
 doc:=cmd.attach_document(NULL,'framework_contract',p_document,'framework',result);
 INSERT INTO core.framework_terms VALUES(result,doc,b.id,b.bank_code,b.account_masked,b.holder_name,value); RETURN result;
END $$;
CREATE FUNCTION cmd.send_framework(p_framework uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE; PERFORM cmd.require_org(f.buyer_org_id,ARRAY['owner','purchaser']);
 IF NOT EXISTS(SELECT 1 FROM core.framework_terms t JOIN core.signatures s ON s.document_id=t.document_id AND s.party='buyer' WHERE t.framework_id=f.id) THEN RAISE EXCEPTION 'Bên mua chưa ký khung' USING HINT='ck_order_version_signed'; END IF;
 UPDATE core.framework_contracts SET status='awaiting_signature' WHERE id=f.id;
END $$;
CREATE FUNCTION cmd.finalize_framework(p_framework uuid,p_ref text,p_virtual text,p_provider text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; result uuid; doc uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE; PERFORM cmd.require_org(f.seller_org_id,ARRAY['owner','coop_board']);
 SELECT document_id INTO doc FROM core.framework_terms WHERE framework_id=f.id;
 IF f.status IS DISTINCT FROM 'awaiting_signature' OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=doc AND party='buyer') OR NOT EXISTS(SELECT 1 FROM core.signatures WHERE document_id=doc AND party='seller') THEN RAISE EXCEPTION 'Khung chưa đủ hai chữ ký' USING HINT='ck_order_version_signed'; END IF;
 UPDATE core.framework_contracts SET status='awaiting_deposit' WHERE id=f.id;
 INSERT INTO core.deposits(framework_id,payer_org_id,expected_deposit_vnd,expected_fee_vnd,payment_ref,virtual_account_no,bank_provider) VALUES(f.id,f.buyer_org_id,f.framework_deposit_vnd,0,p_ref,p_virtual,p_provider) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.activate_framework(p_framework uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; doc uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE;
 IF f.status='running' THEN RETURN; END IF;
 SELECT document_id INTO doc FROM core.framework_terms WHERE framework_id=f.id; PERFORM cmd.sync_document(doc);
 IF f.status IS DISTINCT FROM 'awaiting_deposit' OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=doc AND status='fully_signed') OR NOT EXISTS(SELECT 1 FROM core.deposits WHERE framework_id=f.id AND status='held') OR coalesce((SELECT sum(balance_vnd) FROM ledger.v_account_balances WHERE framework_id=f.id AND account_type='deposit_escrow'),0)<f.framework_deposit_vnd THEN RAISE EXCEPTION 'Chưa đủ cọc khung đã xác minh' USING HINT='ck_framework_deposit'; END IF;
 UPDATE core.framework_contracts SET status='running' WHERE id=f.id;
END $$;
CREATE FUNCTION cmd.grant_framework_credit(p_framework uuid,p_amount bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; result bigint;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE; PERFORM cmd.require_org(f.seller_org_id,ARRAY['owner','coop_board']);
 IF f.status NOT IN ('running','needs_security') THEN RAISE EXCEPTION 'Khung không hoạt động' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.framework_credit_grants(framework_id,extra_credit_vnd,granted_by) VALUES(f.id,p_amount,ref.ctx_user()) RETURNING id INTO result;
 IF f.status='needs_security' AND EXISTS(SELECT 1 FROM core.v_framework_limits WHERE id=f.id AND used_vnd<=allowed_vnd) THEN UPDATE core.framework_contracts SET status='running' WHERE id=f.id; END IF; RETURN result;
END $$;
CREATE FUNCTION cmd.create_calloff(p_framework uuid,p_code text,p_terms jsonb,p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; t core.framework_terms%ROWTYPE; result uuid; x jsonb; l core.lots%ROWTYPE; value bigint:=0; qty bigint:=0; n smallint:=0;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE; PERFORM cmd.require_org(f.buyer_org_id,ARRAY['owner','purchaser']);
 SELECT * INTO t FROM core.framework_terms WHERE framework_id=f.id;
 IF f.status IS DISTINCT FROM 'running' OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=t.document_id AND status IN ('fully_signed','effective')) OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)=0 THEN RAISE EXCEPTION 'Khung chưa chạy/chưa có chứng từ' USING HINT='ck_command_state'; END IF;
 IF NOT f.active_during@>((lower((p_terms->>'delivery_window')::tstzrange) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) OR lower((p_terms->>'delivery_window')::tstzrange)<ref.clock_at()+interval '24 hours' THEN RAISE EXCEPTION 'Gọi hàng trước 24 giờ trong kỳ khung' USING HINT='ck_command_terms'; END IF;
 PERFORM cmd.check_payload(p_terms,ARRAY['delivery_window','delivery_mode','acceptance_point','acceptance_facility_id','transport_by','designated_receiver_user_id','inspection_before_loading','reject_allowance_bps','silent_accept_hours','cost_bearers','extra_terms']);
 FOR x IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
 PERFORM cmd.check_payload(x,ARRAY['lot_id','qty']);
 SELECT * INTO l FROM core.lots WHERE id=(x->>'lot_id')::uuid FOR UPDATE;
 IF l.seller_org_id IS DISTINCT FROM f.seller_org_id OR l.status NOT IN ('on_sale','upcoming') OR l.safety_locked_at IS NOT NULL OR (x->>'qty')::bigint<=0 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(f.schedule->'items') item WHERE (item->>'product_id')::uuid=l.product_id AND (item->>'profile_version')::integer=l.profile_version AND item->>'grade_code'=l.grade_code) THEN RAISE EXCEPTION 'Lô khác lịch/nhà cung cấp' USING HINT='ck_command_terms'; END IF;
 qty:=qty+(x->>'qty')::bigint;
 value:=value+(SELECT ref.div_round((x->>'qty')::numeric*(item->>'unit_price_vnd')::bigint,1000) FROM jsonb_array_elements(f.schedule->'items') item WHERE (item->>'product_id')::uuid=l.product_id AND (item->>'profile_version')::integer=l.profile_version AND item->>'grade_code'=l.grade_code);
 END LOOP;
 INSERT INTO core.orders(code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,framework_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id)
 VALUES(p_code,'framework_calloff',f.buyer_org_id,f.seller_org_id,f.segment_code,l.product_id,f.id,f.policy_version_id,coalesce((SELECT plan_code FROM core.subscriptions WHERE org_id=f.buyer_org_id AND active_during@>ref.clock_at() ORDER BY lower(active_during) DESC LIMIT 1),'free'),false,ref.ctx_user()) RETURNING id INTO result;
 PERFORM cmd.insert_row('core.order_versions',p_terms||jsonb_build_object('order_id',result,'version_no',1,'profile_version',l.profile_version,'qty_tolerance_bps',0,'reject_allowance_bps',0,'qty_min',qty,'qty_max',qty,'price_mode','fixed','unit_price_vnd',1,'deposit_price_vnd',1,'contract_value_vnd',value,'deposit_basis_vnd',value,'deposit_rule','none','deposit_bps',0,'deposit_vnd',0,'fee_rule','period','fee_bps',0,'fee_vnd',0,'payment_timing','period','seller_bank_account_id',t.seller_bank_account_id,'seller_bank_code',t.seller_bank_code,'seller_account_masked',t.seller_account_masked,'seller_account_holder',t.seller_account_holder,'buyer_refund_account_masked','SOURCE','shortfall_penalty_bps',ARRAY[0,0,0,0],'created_by',ref.ctx_user(),'value_basis','lines'),
 ARRAY['order_id','version_no','profile_version','qty_tolerance_bps','qty_min','qty_max','price_mode','unit_price_vnd','deposit_price_vnd','contract_value_vnd','deposit_basis_vnd','deposit_rule','deposit_bps','deposit_vnd','fee_rule','fee_bps','fee_vnd','payment_timing','seller_bank_account_id','seller_bank_code','seller_account_masked','seller_account_holder','buyer_refund_account_masked','shortfall_penalty_bps','created_by','value_basis','delivery_window','delivery_mode','acceptance_point','acceptance_facility_id','transport_by','designated_receiver_user_id','inspection_before_loading','reject_allowance_bps','silent_accept_hours','cost_bearers','extra_terms']);
 FOR x IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
 SELECT * INTO l FROM core.lots WHERE id=(x->>'lot_id')::uuid; n:=n+1;
 INSERT INTO core.order_lines(order_id,version_no,line_no,lot_id,product_id,profile_version,grade_code,qty,unit_price_vnd,downgrade_price_vnd,line_value_vnd)
 SELECT result,1,n,l.id,l.product_id,l.profile_version,l.grade_code,(x->>'qty')::bigint,(item->>'unit_price_vnd')::bigint,(item->>'downgrade_price_vnd')::bigint,ref.div_round((x->>'qty')::numeric*(item->>'unit_price_vnd')::bigint,1000) FROM jsonb_array_elements(f.schedule->'items') item WHERE (item->>'product_id')::uuid=l.product_id AND (item->>'profile_version')::integer=l.profile_version AND item->>'grade_code'=l.grade_code;
 END LOOP; RETURN result;
END $$;
CREATE FUNCTION cmd.activate_calloff(p_order uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; result uuid; l record;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 IF o.contract_type IS DISTINCT FROM 'framework_calloff' THEN RAISE EXCEPTION 'Không phải gọi hàng' USING HINT='ck_command_state'; END IF;
 IF o.status='active' THEN RETURN (SELECT id FROM core.deliveries WHERE order_id=o.id AND batch_no=1); END IF;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=1;
 UPDATE core.orders SET effective_version_no=1,status='active' WHERE id=o.id; -- guard khóa hạn mức và chứng từ ký
 FOR l IN SELECT lot_id,sum(qty)::bigint qty FROM core.order_lines WHERE order_id=o.id AND version_no=1 GROUP BY lot_id ORDER BY lot_id LOOP
 PERFORM ledger.move_qty(l.lot_id,'available','committed','commit_direct',l.qty,o.id,'calloff-commit:'||o.id||':'||l.lot_id); END LOOP;
 INSERT INTO core.deliveries(code,order_id,version_no,batch_no,planned_qty,delivery_window,receiver_user_id) VALUES(o.code||'-D1',o.id,1,1,v.qty_min,v.delivery_window,v.designated_receiver_user_id) RETURNING id INTO result;
 IF v.designated_receiver_user_id IS NOT NULL THEN PERFORM core.issue_qr('receipt',result,upper(v.delivery_window),v.designated_receiver_user_id); END IF; RETURN result;
END $$;
CREATE TABLE core.framework_periods(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),framework_id uuid NOT NULL REFERENCES core.framework_contracts,period tstzrange NOT NULL,
 payment_id uuid UNIQUE REFERENCES core.direct_payments,value_vnd bigint NOT NULL CHECK(value_vnd>0),fee_vnd bigint NOT NULL CHECK(fee_vnd>=0),
 CHECK(NOT isempty(period) AND NOT lower_inf(period) AND NOT upper_inf(period)),EXCLUDE USING gist(framework_id WITH =,period WITH &&)
);
ALTER TABLE core.framework_periods ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.framework_periods FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION cmd.bill_framework_period(p_framework uuid,p_period tstzrange) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; result uuid; amount bigint; pay uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE;
 SELECT id INTO result FROM core.framework_periods WHERE framework_id=f.id AND period=p_period; IF result IS NOT NULL THEN RETURN result; END IF;
 IF f.status NOT IN ('running','needs_security') OR upper(p_period)>ref.clock_at() THEN RAISE EXCEPTION 'Kỳ chưa tới' USING HINT='ck_command_state'; END IF;
 SELECT coalesce(sum(s.n_vnd),0) INTO amount FROM core.orders o JOIN core.settlements s ON s.order_id=o.id AND s.is_effective AND s.is_final WHERE o.framework_id=f.id AND o.created_at<@p_period;
 IF amount<=0 OR EXISTS(SELECT 1 FROM core.orders o WHERE o.framework_id=f.id AND o.created_at<@p_period AND o.status NOT IN ('closed','completed') AND NOT EXISTS(SELECT 1 FROM core.settlements WHERE order_id=o.id AND is_final)) THEN RAISE EXCEPTION 'Cần chốt giao nhận/quyết toán kỳ' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.direct_payments(code,framework_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,due_at)
 VALUES('FW-PERIOD-'||gen_random_uuid(),f.id,'framework_period','buyer_to_seller',f.buyer_org_id,f.seller_org_id,amount,'period_end','due',ref.clock_at()+interval '72 hours') RETURNING id INTO pay;
 INSERT INTO core.framework_periods(framework_id,period,payment_id,value_vnd,fee_vnd) VALUES(f.id,p_period,pay,amount,ref.div_round(amount::numeric*f.fee_bps,10000)) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.create_group(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ BEGIN
 PERFORM cmd.enter_actor(); PERFORM cmd.require_org(ref.ctx_org(),ARRAY['owner','purchaser']);
 IF ref.ctx_actor()<>'buyer' OR (p_data->>'cutoff_at')::timestamptz<=ref.clock_at() OR NOT EXISTS(SELECT 1 FROM core.demands WHERE id=(p_data->>'demand_id')::uuid AND buyer_org_id=ref.ctx_org() AND product_id=(p_data->>'product_id')::uuid AND status='open') THEN RAISE EXCEPTION 'Sai nhu cầu/giờ chốt nhóm' USING HINT='ck_command_terms'; END IF;
 RETURN cmd.insert_row('core.group_orders',p_data||jsonb_build_object('buyer_org_id',ref.ctx_org(),'created_by',ref.ctx_user()),ARRAY['code','demand_id','product_id','grade_code','total_qty','unit_price_vnd','all_or_nothing','cutoff_at','collection_facility_id','buyer_org_id','created_by']);
END $$;

-- Helper chỉ được gọi sau khi command khóa nhóm và tính phân bổ phí.
CREATE FUNCTION cmd.create_group_part_internal(p_group uuid,p_fee bigint,p_code text,p_offer uuid,p_terms jsonb,p_document jsonb) RETURNS uuid
LANGUAGE plpgsql SET search_path=pg_catalog,cmd,core,ref,public AS $$
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
 OR (p_terms->>'fee_rule') IS DISTINCT FROM 'group_allocated' OR (p_terms->>'fee_vnd')::bigint IS DISTINCT FROM p_fee
 OR (p_terms->>'fee_floor_vnd')::bigint IS DISTINCT FROM pl.fee_floor_vnd OR (p_terms->>'fee_cap_vnd')::bigint IS DISTINCT FROM pl.fee_cap_vnd
 OR p_terms->'shortfall_penalty_bps' IS DISTINCT FROM to_jsonb(pol.shortfall_penalty_bps) OR p_terms->>'value_basis' IS DISTINCT FROM 'single_product' THEN RAISE EXCEPTION 'Sai chính sách cọc/phí' USING HINT='ck_command_terms'; END IF;
 SELECT segment_code INTO seg FROM core.org_buyer_segments WHERE org_id=f.buyer_org_id ORDER BY segment_code LIMIT 1;
 INSERT INTO core.orders(code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,lot_id,offer_id,hold_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id,group_order_id)
 VALUES(p_code,'group_part',f.buyer_org_id,f.seller_org_id,seg,l.product_id,l.id,f.id,h.id,policy,coalesce(plan,'free'),first_pair,ref.ctx_user(),p_group) RETURNING id INTO result;
 UPDATE core.holds SET order_id=result WHERE id=h.id;
 doc:=cmd.attach_document(result,'contract',p_document);
 IF (p_terms->>'qty_min')::bigint IS DISTINCT FROM h.qty OR (p_terms->>'qty_max')::bigint IS DISTINCT FROM h.qty OR (p_terms->>'unit_price_vnd')::bigint IS DISTINCT FROM r.price_vnd OR (p_terms->>'profile_version')::integer IS DISTINCT FROM l.profile_version THEN
 RAISE EXCEPTION 'Điều khoản khác lời chào/giữ lượng' USING HINT='ck_command_terms'; END IF;
 cols:=ARRAY['order_id','version_no','document_id','profile_version','qty_min','qty_max','qty_tolerance_bps','price_mode','unit_price_vnd','downgrade_price_vnd','price_formula','size_price_table','moisture_std_bps','impurity_max_bps','price_unit_base_qty','ref_price_vnd','ref_price_order_count','ref_price_scope','deposit_price_vnd','contract_value_vnd','deposit_basis_vnd','deposit_rule','deposit_bps','deposit_vnd','fee_rule','fee_bps','fee_floor_vnd','fee_cap_vnd','fee_vnd','payment_timing','pay_after_days','seller_bank_account_id','seller_bank_code','seller_account_masked','seller_account_holder','buyer_refund_account_masked','delivery_mode','acceptance_point','acceptance_facility_id','transport_by','cost_bearers','delivery_window','designated_receiver_user_id','inspection_before_loading','reject_allowance_bps','transit_loss_allowance_bps','seal_sample_required','silent_accept_hours','shortfall_penalty_bps','extra_terms','created_by','value_basis','ref_price_source','ref_price_grade_code','ref_price_as_of','ref_price_external_id'];
 PERFORM cmd.insert_row('core.order_versions',p_terms||jsonb_build_object('order_id',result,'version_no',1,'document_id',doc,'created_by',ref.ctx_user()),cols);
 UPDATE core.orders SET flag_abnormal_price=EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=result AND ref_price_source='trades' AND unit_price_vnd*10000<ref_price_vnd*pol.abnormal_price_bps),excluded_from_ref_price=EXISTS(SELECT 1 FROM core.order_versions WHERE order_id=result AND ref_price_source='trades' AND unit_price_vnd*10000<ref_price_vnd*pol.abnormal_price_bps) WHERE id=result;
 RETURN result;
END $$;
CREATE FUNCTION cmd.create_group_parts(p_group uuid,p_parts jsonb) RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE g core.group_orders%ROWTYPE; x jsonb; f core.offers%ROWTYPE; r core.offer_rounds%ROWTYPE; qty bigint:=0; weights bigint[]:='{}'; fees bigint[]; fee bigint; plan ref.plans%ROWTYPE; result uuid[]:='{}'; n integer:=0;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO g FROM core.group_orders WHERE id=p_group FOR UPDATE; PERFORM cmd.require_org(g.buyer_org_id,ARRAY['owner','purchaser']);
 IF g.status IS DISTINCT FROM 'gathering' OR ref.clock_at()>=g.cutoff_at OR jsonb_typeof(p_parts) IS DISTINCT FROM 'array' OR jsonb_array_length(p_parts)=0 OR EXISTS(SELECT 1 FROM core.orders WHERE group_order_id=g.id AND status<>'closed') THEN RAISE EXCEPTION 'Nhóm không còn chuẩn bị phần' USING HINT='ck_command_state'; END IF;
 FOR x IN SELECT * FROM jsonb_array_elements(p_parts) LOOP
 PERFORM cmd.check_payload(x,ARRAY['offer_id','code','terms','document']);
 SELECT * INTO f FROM core.offers WHERE id=(x->>'offer_id')::uuid FOR UPDATE;
 SELECT * INTO r FROM core.offer_rounds WHERE offer_id=f.id AND round_no=f.current_round;
 IF f.buyer_org_id IS DISTINCT FROM g.buyer_org_id OR r.price_vnd IS DISTINCT FROM g.unit_price_vnd OR NOT EXISTS(SELECT 1 FROM core.lots WHERE id=f.lot_id AND product_id=g.product_id AND grade_code=g.grade_code) THEN RAISE EXCEPTION 'Phần khác chuẩn/giá nhóm' USING HINT='ck_command_terms'; END IF;
 qty:=qty+r.qty; weights:=array_append(weights,r.qty);
 END LOOP;
 IF qty>g.total_qty OR (g.all_or_nothing AND qty<>g.total_qty) THEN RAISE EXCEPTION 'Chưa đủ/vượt tổng nhóm' USING HINT='ck_group_total'; END IF;
 SELECT p.* INTO plan FROM ref.plans p WHERE code=coalesce((SELECT plan_code FROM core.subscriptions WHERE org_id=g.buyer_org_id AND active_during@>ref.clock_at() ORDER BY lower(active_during) DESC LIMIT 1),'free');
 fee:=CASE WHEN plan.first_order_fee_bps=0 THEN 0 ELSE least(coalesce(plan.fee_cap_vnd,9223372036854775807),greatest(coalesce(plan.fee_floor_vnd,0),ref.div_round(ref.div_round(qty::numeric*g.unit_price_vnd,1000)::numeric*plan.first_order_fee_bps,10000))) END;
 fees:=ref.allocate_vnd(fee,weights); UPDATE core.group_orders SET group_fee_vnd=fee WHERE id=g.id;
 FOR x IN SELECT * FROM jsonb_array_elements(p_parts) LOOP n:=n+1;
 result:=array_append(result,cmd.create_group_part_internal(g.id,fees[n],x->>'code',(x->>'offer_id')::uuid,(x->'terms')||jsonb_build_object('fee_rule','group_allocated','fee_vnd',fees[n]),x->'document'));
 END LOOP; RETURN result;
END $$;
CREATE FUNCTION cmd.withdraw_group_part(p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 o:=cmd.order_party(p_order,'seller',ARRAY['owner','coop_board']);
 PERFORM 1 FROM core.group_orders WHERE id=o.group_order_id AND status='gathering' FOR UPDATE;
 IF NOT FOUND OR o.status<>'awaiting_seller' THEN RAISE EXCEPTION 'Chỉ rút trong pha gom' USING HINT='ck_command_state'; END IF;
 PERFORM set_config('app.reason','Người bán rút phần nhóm trước cọc',true);
 UPDATE core.orders SET status='closed',close_reason='seller_declined' WHERE id=o.id;
 UPDATE core.holds SET status='released' WHERE id=o.hold_id AND status='active';
END $$;
CREATE FUNCTION cmd.cutoff_group(p_group uuid) RETURNS text
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
 UPDATE core.orders SET status='closed',close_reason='group_not_filled' WHERE id=o.id; UPDATE core.holds SET status='released' WHERE id=o.hold_id AND status='active'; END LOOP;
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
 PERFORM set_config('app.reason','Phần chưa ký lúc chốt nhóm',true); UPDATE core.orders SET status='closed',close_reason='group_not_filled' WHERE id=o.id; UPDATE core.holds SET status='released' WHERE id=o.hold_id AND status='active';
 END IF; END LOOP;
 UPDATE core.group_orders SET status='executing' WHERE id=g.id; UPDATE core.deadlines SET status='met' WHERE entity='group_order' AND entity_id=g.id AND kind='group_cutoff' AND status='open'; RETURN 'executing';
END $$;
CREATE FUNCTION cmd.finish_group(p_group uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,public AS $$ BEGIN
 PERFORM cmd.require_system(); PERFORM 1 FROM core.group_orders WHERE id=p_group FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM core.orders WHERE group_order_id=p_group) OR EXISTS(SELECT 1 FROM core.orders WHERE group_order_id=p_group AND status NOT IN ('completed','closed')) THEN RAISE EXCEPTION 'Còn phần nhóm chưa xong' USING HINT='ck_command_state'; END IF;
 UPDATE core.group_orders SET status='completed' WHERE id=p_group AND status='executing'; RETURN (SELECT status FROM core.group_orders WHERE id=p_group);
END $$;
GRANT EXECUTE ON FUNCTION cmd.create_framework(jsonb,jsonb,uuid),cmd.send_framework(uuid),cmd.finalize_framework(uuid,text,text,text),cmd.grant_framework_credit(uuid,bigint),cmd.create_calloff(uuid,text,jsonb,jsonb),cmd.create_group(jsonb),cmd.create_group_parts(uuid,jsonb),cmd.withdraw_group_part(uuid) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.activate_framework(uuid),cmd.activate_calloff(uuid),cmd.bill_framework_period(uuid,tstzrange),cmd.cutoff_group(uuid),cmd.finish_group(uuid) TO agiviet_orchestrator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cmd FROM PUBLIC;
