-- 0085: Trả gộp cuối tuần của hợp đồng khung tính theo NGÀY GIAO, không theo ngày lập lệnh gọi hàng.
-- Trước (0043): o.created_at <@ kỳ → bên mua gọi hàng hôm nay cho thứ 2 tuần sau thì buổi đó bị gộp vào tuần NAY
-- (và tuần nay không chốt được vì buổi đó chưa giao). Nay: buổi thuộc kỳ khi ngày bắt đầu khung giờ giao (đợt đầu) nằm trong kỳ.
CREATE OR REPLACE FUNCTION core.calloff_delivery_start(p_order uuid) RETURNS timestamptz
LANGUAGE sql STABLE SET search_path=pg_catalog,core AS $$
 SELECT coalesce((SELECT min(lower(delivery_window)) FROM core.deliveries WHERE order_id=p_order),(SELECT created_at FROM core.orders WHERE id=p_order)) $$;

CREATE OR REPLACE FUNCTION cmd.bill_framework_period(p_framework uuid,p_period tstzrange) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; result uuid; amount bigint; pay uuid;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE;
 SELECT id INTO result FROM core.framework_periods WHERE framework_id=f.id AND period=p_period; IF result IS NOT NULL THEN RETURN result; END IF;
 IF f.status NOT IN ('running','needs_security') OR upper(p_period)>ref.clock_at() THEN RAISE EXCEPTION 'Kỳ chưa tới' USING HINT='ck_command_state'; END IF;
 SELECT coalesce(sum(s.n_vnd),0) INTO amount FROM core.orders o JOIN core.settlements s ON s.order_id=o.id AND s.is_effective AND s.is_final WHERE o.framework_id=f.id AND core.calloff_delivery_start(o.id)<@p_period;
 IF amount<=0 OR EXISTS(SELECT 1 FROM core.orders o WHERE o.framework_id=f.id AND core.calloff_delivery_start(o.id)<@p_period AND o.status NOT IN ('closed','completed','cancelled') AND NOT EXISTS(SELECT 1 FROM core.settlements WHERE order_id=o.id AND is_final)) THEN RAISE EXCEPTION 'Cần chốt giao nhận/quyết toán kỳ' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.direct_payments(code,framework_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,due_at)
 VALUES('FW-PERIOD-'||gen_random_uuid(),f.id,'framework_period','buyer_to_seller',f.buyer_org_id,f.seller_org_id,amount,'period_end','due',ref.clock_at()+interval '72 hours') RETURNING id INTO pay;
 INSERT INTO core.framework_periods(framework_id,period,payment_id,value_vnd,fee_vnd) VALUES(f.id,p_period,pay,amount,ref.div_round(amount::numeric*f.fee_bps,10000)) RETURNING id INTO result; RETURN result;
END $$;
REVOKE ALL ON FUNCTION core.calloff_delivery_start(uuid) FROM PUBLIC;
COMMENT ON COLUMN core.framework_week_prices.id IS 'Mã dòng giá tuần.';
