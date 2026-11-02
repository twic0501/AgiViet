-- 0086: Sửa theo bản rà Codex 02/11 (docs/nghiep-vu/codex-ra-khung-tuan-0211.md) cho hợp đồng khung theo tuần.
-- (6) Hạn trả khoản tuần tính từ CUỐI KỲ + 72 giờ, không từ lúc bấm chốt — chốt muộn không kéo dài hạn trả.
-- (9) Lập khoản tuần kèm mốc 'direct_payment_due' để bộ xử lý hạn chuyển 'overdue' khi quá hạn.
-- (8) Mã giao dịch ngân hàng không dùng lại trong cùng một khoản trả thẳng (khoản tuần không có order_id nên ràng buộc cũ theo đơn bỏ lọt).
CREATE OR REPLACE FUNCTION cmd.bill_framework_period(p_framework uuid,p_period tstzrange) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE f core.framework_contracts%ROWTYPE; result uuid; amount bigint; pay uuid; han timestamptz;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework FOR UPDATE;
 SELECT id INTO result FROM core.framework_periods WHERE framework_id=f.id AND period=p_period; IF result IS NOT NULL THEN RETURN result; END IF;
 IF f.status NOT IN ('running','needs_security') OR upper(p_period)>ref.clock_at() THEN RAISE EXCEPTION 'Kỳ chưa tới' USING HINT='ck_command_state'; END IF;
 SELECT coalesce(sum(s.n_vnd),0) INTO amount FROM core.orders o JOIN core.settlements s ON s.order_id=o.id AND s.is_effective AND s.is_final WHERE o.framework_id=f.id AND core.calloff_delivery_start(o.id)<@p_period;
 IF amount<=0 OR EXISTS(SELECT 1 FROM core.orders o WHERE o.framework_id=f.id AND core.calloff_delivery_start(o.id)<@p_period AND o.status NOT IN ('closed','completed','cancelled') AND NOT EXISTS(SELECT 1 FROM core.settlements WHERE order_id=o.id AND is_final)) THEN RAISE EXCEPTION 'Cần chốt giao nhận/quyết toán kỳ' USING HINT='ck_command_state'; END IF;
 han:=upper(p_period)+interval '72 hours';
 INSERT INTO core.direct_payments(code,framework_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status,due_at)
 VALUES('FW-PERIOD-'||gen_random_uuid(),f.id,'framework_period','buyer_to_seller',f.buyer_org_id,f.seller_org_id,amount,'period_end','due',han) RETURNING id INTO pay;
 INSERT INTO core.deadlines(kind,entity,entity_id,order_id,due_at) VALUES('direct_payment_due','direct_payment',pay,NULL,han);
 INSERT INTO core.framework_periods(framework_id,period,payment_id,value_vnd,fee_vnd) VALUES(f.id,p_period,pay,amount,ref.div_round(amount::numeric*f.fee_bps,10000)) RETURNING id INTO result; RETURN result;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_direct_payment_confirm_txn ON core.direct_payment_confirmations(direct_payment_id,bank_txn_ref) WHERE bank_txn_ref IS NOT NULL;
