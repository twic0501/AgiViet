-- 0089: Sửa theo bản rà Codex 02/11 (lỗi nặng 4). Buổi gọi hàng khung cân thiếu (vd gọi 30 kg, cân 29,9 kg):
-- backend bắt chọn xử lý thiếu, nhưng cmd.resolve_shortfall từ chối mọi đơn có framework_id → buổi kẹt, không quyết toán được tuần.
-- Khung theo tuần: buổi là một lần gọi trong khung, không có cọc riêng để phạt. Phần thiếu kết thúc theo từng lô (trả lượng chưa bốc về
-- 'available' của đúng lô), không phạt; bên mua chỉ trả phần đã nhận (trả gộp cuối tuần). Muốn bù thì bên mua gọi buổi khác.
CREATE OR REPLACE FUNCTION cmd.resolve_calloff_shortfall(p_delivery uuid) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ledger,ref,public AS $$
DECLARE d core.deliveries%ROWTYPE; o core.orders%ROWTYPE; a core.acceptance_versions%ROWTYPE; old core.delivery_shortfall_actions%ROWTYPE; r record; tong bigint:=0;
BEGIN
 SELECT * INTO d FROM core.deliveries WHERE id=p_delivery FOR UPDATE; o:=cmd.order_party(d.order_id,'seller',ARRAY['owner','coop_board']);
 IF o.framework_id IS NULL OR o.contract_type<>'framework_calloff' THEN RAISE EXCEPTION 'Chỉ dùng cho buổi gọi hàng khung' USING HINT='ck_command_state'; END IF;
 SELECT * INTO old FROM core.delivery_shortfall_actions WHERE delivery_id=d.id; IF old.delivery_id IS NOT NULL THEN RETURN old.qty; END IF;
 SELECT * INTO a FROM core.acceptance_versions WHERE delivery_id=d.id ORDER BY version_no DESC LIMIT 1;
 IF a.id IS NULL OR EXISTS(SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=a.id AND status<>'closed') THEN RAISE EXCEPTION 'Chưa chốt nghiệm thu' USING HINT='ck_command_state'; END IF;
 FOR r IN SELECT l.lot_id, (l.qty-coalesce((SELECT sum(x.qty) FROM core.acceptance_lines x WHERE x.acceptance_id=a.id AND x.lot_id=l.lot_id),0))::bigint thieu
   FROM core.order_lines l WHERE l.order_id=o.id AND l.version_no=d.version_no LOOP
  IF r.thieu>0 THEN
   PERFORM ledger.move_qty(r.lot_id,'in_transit','committed','not_loaded',r.thieu,o.id,'calloff-short-unload:'||d.id||':'||r.lot_id);
   PERFORM ledger.move_qty(r.lot_id,'committed','available','commit_release',r.thieu,o.id,'calloff-short-release:'||d.id||':'||r.lot_id);
   tong:=tong+r.thieu;
  END IF;
 END LOOP;
 IF tong<=0 THEN RAISE EXCEPTION 'Không thiếu' USING HINT='ck_command_state'; END IF;
 INSERT INTO core.delivery_shortfall_actions VALUES(d.id,a.id,'end',tong,NULL,NULL,ref.ctx_user(),now()); RETURN tong;
END $$;
REVOKE ALL ON FUNCTION cmd.resolve_calloff_shortfall(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.resolve_calloff_shortfall(uuid) TO agiviet_app;
COMMENT ON FUNCTION cmd.resolve_calloff_shortfall(uuid) IS 'Kết thúc phần thiếu của buổi gọi hàng khung theo từng lô, không phạt (0089).';
