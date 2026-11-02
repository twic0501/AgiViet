-- 0084: Hợp đồng khung — GIÁ CHỐT LẠI MỖI TUẦN (người sáng lập chốt 02/11/2026).
-- Một bảng giá cho mỗi khung mỗi tuần (thứ 2 đầu tuần, giờ VN). Một bên đề nghị (coi như bên đó đã đồng ý), bên kia đồng ý / không đồng ý.
-- Gọi hàng (cmd.create_calloff) chỉ được khi tuần của ngày giao đã có giá 'agreed', và tiền tính theo giá tuần đó
-- (trước: lấy giá cố định trong lịch khung). Không chốt giá tuần → tuần đó tạm dừng (không gọi hàng được).
CREATE TABLE core.framework_week_prices(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 framework_id uuid NOT NULL REFERENCES core.framework_contracts,
 week_start date NOT NULL CHECK(extract(isodow FROM week_start)=1),
 items jsonb NOT NULL CHECK(jsonb_typeof(items)='array' AND jsonb_array_length(items)>0),
 proposed_by_side text NOT NULL CHECK(proposed_by_side IN ('buyer','seller')),
 proposed_by uuid NOT NULL REFERENCES core.users,
 proposed_at timestamptz NOT NULL DEFAULT now(),
 answered_by uuid REFERENCES core.users, answered_at timestamptz,
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','agreed','rejected','superseded')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_framework_week_price_live ON core.framework_week_prices(framework_id,week_start) WHERE status IN ('proposed','agreed');
ALTER TABLE core.framework_week_prices ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.framework_week_prices IS 'Giá từng tuần của hợp đồng khung (0084): mỗi tuần một bảng giá còn hiệu lực (proposed/agreed); gọi hàng chỉ dùng giá agreed của tuần giao.';
COMMENT ON COLUMN core.framework_week_prices.framework_id IS 'Hợp đồng khung.';
COMMENT ON COLUMN core.framework_week_prices.week_start IS 'Thứ 2 đầu tuần (giờ VN) áp giá.';
COMMENT ON COLUMN core.framework_week_prices.items IS 'Giá các món: [{product_id, profile_version, grade_code, unit_price_vnd, downgrade_price_vnd}] — cùng món với lịch khung.';
COMMENT ON COLUMN core.framework_week_prices.proposed_by_side IS 'Bên đề nghị giá (coi như bên đó đã đồng ý).';
COMMENT ON COLUMN core.framework_week_prices.proposed_by IS 'Người đề nghị.';
COMMENT ON COLUMN core.framework_week_prices.proposed_at IS 'Lúc đề nghị.';
COMMENT ON COLUMN core.framework_week_prices.answered_by IS 'Người bên kia trả lời.';
COMMENT ON COLUMN core.framework_week_prices.answered_at IS 'Lúc trả lời.';
COMMENT ON COLUMN core.framework_week_prices.status IS 'proposed: chờ bên kia; agreed: đã chốt; rejected: bên kia không đồng ý; superseded: bị đề nghị mới thay.';
COMMENT ON COLUMN core.framework_week_prices.created_at IS 'Lúc tạo dòng.';

CREATE FUNCTION cmd.propose_framework_week_price(p_framework uuid,p_week date,p_items jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; side text; x jsonb; result uuid;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE;
 side:=ref.ctx_actor();
 IF side='buyer' THEN PERFORM cmd.require_org(f.buyer_org_id,ARRAY['owner','purchaser']); ELSIF side='seller' THEN PERFORM cmd.require_org(f.seller_org_id,ARRAY['owner','coop_board']); ELSE RAISE EXCEPTION 'Sai bên' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF f.status NOT IN ('running','needs_security') THEN RAISE EXCEPTION 'Khung không chạy' USING HINT='ck_command_state'; END IF;
 IF extract(isodow FROM p_week)<>1 OR NOT f.active_during && daterange(p_week,p_week+7) OR p_week<date_trunc('week',(ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::date THEN RAISE EXCEPTION 'Tuần không hợp lệ (thứ 2, trong kỳ khung, chưa qua)' USING HINT='ck_framework_week_price'; END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)<>jsonb_array_length(f.schedule->'items') THEN RAISE EXCEPTION 'Giá tuần phải đủ các món của khung' USING HINT='ck_framework_week_price'; END IF;
 FOR x IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  PERFORM cmd.check_payload(x,ARRAY['product_id','profile_version','grade_code','unit_price_vnd','downgrade_price_vnd']);
  IF (x->>'unit_price_vnd')::bigint<=0 OR ((x->>'downgrade_price_vnd') IS NOT NULL AND ((x->>'downgrade_price_vnd')::bigint<0 OR (x->>'downgrade_price_vnd')::bigint>=(x->>'unit_price_vnd')::bigint))
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(f.schedule->'items') i WHERE i->>'product_id'=x->>'product_id' AND i->>'profile_version'=x->>'profile_version' AND i->>'grade_code'=x->>'grade_code') THEN
   RAISE EXCEPTION 'Món/giá tuần không hợp lệ' USING HINT='ck_framework_week_price'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM core.framework_week_prices WHERE framework_id=f.id AND week_start=p_week AND status='agreed') THEN RAISE EXCEPTION 'Giá tuần này đã chốt' USING HINT='ck_framework_week_price'; END IF;
 UPDATE core.framework_week_prices SET status='superseded' WHERE framework_id=f.id AND week_start=p_week AND status='proposed';
 INSERT INTO core.framework_week_prices(framework_id,week_start,items,proposed_by_side,proposed_by) VALUES(f.id,p_week,p_items,side,ref.ctx_user()) RETURNING id INTO result;
 RETURN result;
END $$;
COMMENT ON FUNCTION cmd.propose_framework_week_price(uuid,date,jsonb) IS 'Một bên đề nghị giá tuần cho khung (đủ món, giá xuống loại < giá); đề nghị mới thay đề nghị cũ chưa trả lời; tuần đã chốt thì không đổi (0084).';

CREATE FUNCTION cmd.answer_framework_week_price(p_price uuid,p_agree boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE w core.framework_week_prices%ROWTYPE; f core.framework_contracts%ROWTYPE; side text;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO w FROM core.framework_week_prices WHERE id=p_price FOR UPDATE; SELECT * INTO f FROM core.framework_contracts WHERE id=w.framework_id;
 side:=ref.ctx_actor();
 IF side='buyer' THEN PERFORM cmd.require_org(f.buyer_org_id,ARRAY['owner','purchaser']); ELSIF side='seller' THEN PERFORM cmd.require_org(f.seller_org_id,ARRAY['owner','coop_board']); ELSE RAISE EXCEPTION 'Sai bên' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF w.status<>'proposed' THEN RAISE EXCEPTION 'Giá tuần không còn chờ trả lời' USING HINT='ck_command_state'; END IF;
 IF w.proposed_by_side=side THEN RAISE EXCEPTION 'Đang chờ bên kia trả lời giá bạn đề nghị' USING HINT='ck_command_state'; END IF;
 UPDATE core.framework_week_prices SET status=CASE WHEN p_agree THEN 'agreed' ELSE 'rejected' END, answered_by=ref.ctx_user(), answered_at=ref.clock_at() WHERE id=w.id;
 RETURN CASE WHEN p_agree THEN 'agreed' ELSE 'rejected' END;
END $$;
COMMENT ON FUNCTION cmd.answer_framework_week_price(uuid,boolean) IS 'Bên kia đồng ý (agreed) hoặc không (rejected) giá tuần; không tự trả lời đề nghị của mình (0084).';

CREATE OR REPLACE FUNCTION cmd.create_calloff(p_framework uuid,p_code text,p_terms jsonb,p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; t core.framework_terms%ROWTYPE; result uuid; x jsonb; l core.lots%ROWTYPE; value bigint:=0; qty bigint:=0; n smallint:=0; tuan date; gia jsonb;
BEGIN
 PERFORM cmd.enter_actor(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE; PERFORM cmd.require_org(f.buyer_org_id,ARRAY['owner','purchaser']);
 SELECT * INTO t FROM core.framework_terms WHERE framework_id=f.id;
 IF f.status IS DISTINCT FROM 'running' OR NOT EXISTS(SELECT 1 FROM core.documents WHERE id=t.document_id AND status IN ('fully_signed','effective')) OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)=0 THEN RAISE EXCEPTION 'Khung chưa chạy/chưa có chứng từ' USING HINT='ck_command_state'; END IF;
 IF NOT f.active_during@>((lower((p_terms->>'delivery_window')::tstzrange) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) OR lower((p_terms->>'delivery_window')::tstzrange)<ref.clock_at()+interval '24 hours' THEN RAISE EXCEPTION 'Gọi hàng trước 24 giờ trong kỳ khung' USING HINT='ck_command_terms'; END IF;
 PERFORM cmd.check_payload(p_terms,ARRAY['delivery_window','delivery_mode','acceptance_point','acceptance_facility_id','transport_by','designated_receiver_user_id','inspection_before_loading','reject_allowance_bps','silent_accept_hours','cost_bearers','extra_terms']);
 tuan:=date_trunc('week',(lower((p_terms->>'delivery_window')::tstzrange) AT TIME ZONE 'Asia/Ho_Chi_Minh'))::date;
 SELECT items INTO gia FROM core.framework_week_prices WHERE framework_id=f.id AND week_start=tuan AND status='agreed';
 IF gia IS NULL THEN RAISE EXCEPTION 'Chưa chốt giá tuần %: hai bên chốt giá tuần trước khi gọi hàng',to_char(tuan,'DD/MM') USING HINT='ck_framework_week_price'; END IF;
 FOR x IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
 PERFORM cmd.check_payload(x,ARRAY['lot_id','qty']);
 SELECT * INTO l FROM core.lots WHERE id=(x->>'lot_id')::uuid FOR UPDATE;
 IF l.seller_org_id IS DISTINCT FROM f.seller_org_id OR l.status NOT IN ('on_sale','upcoming') OR l.safety_locked_at IS NOT NULL OR (x->>'qty')::bigint<=0 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(f.schedule->'items') item WHERE (item->>'product_id')::uuid=l.product_id AND (item->>'profile_version')::integer=l.profile_version AND item->>'grade_code'=l.grade_code) THEN RAISE EXCEPTION 'Lô khác lịch/nhà cung cấp' USING HINT='ck_command_terms'; END IF;
 qty:=qty+(x->>'qty')::bigint;
 value:=value+(SELECT ref.div_round((x->>'qty')::numeric*(item->>'unit_price_vnd')::bigint,1000) FROM jsonb_array_elements(gia) item WHERE (item->>'product_id')::uuid=l.product_id AND (item->>'profile_version')::integer=l.profile_version AND item->>'grade_code'=l.grade_code);
 END LOOP;
 INSERT INTO core.orders(code,contract_type,buyer_org_id,seller_org_id,segment_code,product_id,framework_id,policy_version_id,plan_code,is_first_pair_order,created_by_user_id)
 VALUES(p_code,'framework_calloff',f.buyer_org_id,f.seller_org_id,f.segment_code,l.product_id,f.id,f.policy_version_id,coalesce((SELECT plan_code FROM core.subscriptions WHERE org_id=f.buyer_org_id AND active_during@>ref.clock_at() ORDER BY lower(active_during) DESC LIMIT 1),'free'),false,ref.ctx_user()) RETURNING id INTO result;
 PERFORM cmd.insert_row('core.order_versions',p_terms||jsonb_build_object('order_id',result,'version_no',1,'profile_version',l.profile_version,'qty_tolerance_bps',0,'reject_allowance_bps',0,'qty_min',qty,'qty_max',qty,'price_mode','fixed','unit_price_vnd',1,'deposit_price_vnd',1,'contract_value_vnd',value,'deposit_basis_vnd',value,'deposit_rule','none','deposit_bps',0,'deposit_vnd',0,'fee_rule','period','fee_bps',0,'fee_vnd',0,'payment_timing','period','seller_bank_account_id',t.seller_bank_account_id,'seller_bank_code',t.seller_bank_code,'seller_account_masked',t.seller_account_masked,'seller_account_holder',t.seller_account_holder,'buyer_refund_account_masked','SOURCE','shortfall_penalty_bps',ARRAY[0,0,0,0],'created_by',ref.ctx_user(),'value_basis','lines'),
 ARRAY['order_id','version_no','profile_version','qty_tolerance_bps','qty_min','qty_max','price_mode','unit_price_vnd','deposit_price_vnd','contract_value_vnd','deposit_basis_vnd','deposit_rule','deposit_bps','deposit_vnd','fee_rule','fee_bps','fee_vnd','payment_timing','seller_bank_account_id','seller_bank_code','seller_account_masked','seller_account_holder','buyer_refund_account_masked','shortfall_penalty_bps','created_by','value_basis','delivery_window','delivery_mode','acceptance_point','acceptance_facility_id','transport_by','designated_receiver_user_id','inspection_before_loading','reject_allowance_bps','silent_accept_hours','cost_bearers','extra_terms']);
 FOR x IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
 SELECT * INTO l FROM core.lots WHERE id=(x->>'lot_id')::uuid; n:=n+1;
 INSERT INTO core.order_lines(order_id,version_no,line_no,lot_id,product_id,profile_version,grade_code,qty,unit_price_vnd,downgrade_price_vnd,line_value_vnd)
 SELECT result,1,n,l.id,l.product_id,l.profile_version,l.grade_code,(x->>'qty')::bigint,(item->>'unit_price_vnd')::bigint,(item->>'downgrade_price_vnd')::bigint,ref.div_round((x->>'qty')::numeric*(item->>'unit_price_vnd')::bigint,1000) FROM jsonb_array_elements(gia) item WHERE (item->>'product_id')::uuid=l.product_id AND (item->>'profile_version')::integer=l.profile_version AND item->>'grade_code'=l.grade_code;
 END LOOP; RETURN result;
END $$;
COMMENT ON FUNCTION cmd.create_calloff(uuid,text,jsonb,jsonb) IS 'Gọi hàng một buổi của khung: trước 24 giờ, trong kỳ, lô đúng món/nhà cung cấp; tiền theo GIÁ TUẦN ĐÃ CHỐT của tuần giao (0084), chưa chốt thì chặn.';
GRANT EXECUTE ON FUNCTION cmd.propose_framework_week_price(uuid,date,jsonb), cmd.answer_framework_week_price(uuid,boolean) TO agiviet_app;
