-- Sửa theo Codex rà commit 2f4517e (28/10/2026): báo thiếu rồi mới hủy → phần nguồn chưa thực hiện bị loại;
-- nếu đã có hàng nghiệm thu thì chỉ giữ phần thực nhận (payable_qty của phiên bản nghiệm thu mới nhất mỗi lượt giao).

CREATE FUNCTION core.order_accepted_qty(p_order uuid) RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT coalesce(sum(l.payable_qty),0) FROM (
  SELECT DISTINCT ON (a.delivery_id) a.id FROM core.acceptance_versions a JOIN core.deliveries d ON d.id=a.delivery_id
  WHERE d.order_id=p_order ORDER BY a.delivery_id, a.version_no DESC) v
 JOIN core.acceptance_lines l ON l.acceptance_id=v.id
$$;
COMMENT ON FUNCTION core.order_accepted_qty(uuid) IS 'Lượng đã nghiệm thu (g) của đơn: tổng payable_qty theo phiên bản nghiệm thu mới nhất mỗi lượt giao.';

CREATE OR REPLACE FUNCTION core.sync_allocation_on_cancel() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
DECLARE got bigint;
BEGIN
 IF NEW.status='done' AND OLD.status IS DISTINCT FROM 'done' AND EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE order_id=NEW.order_id) THEN
  got:=core.order_accepted_qty(NEW.order_id);
  PERFORM set_config('app.dong_bo_phu_luc','on',true);
  IF got=0 THEN
   UPDATE core.sourcing_allocations SET status='cancelled' WHERE order_id=NEW.order_id AND status IN ('committed','shortfall');
  ELSE -- giữ riêng phần thực nhận; phần còn lại bị hủy
   UPDATE core.sourcing_allocations SET status='shortfall', delivered_qty_g=least(got,qty_g) WHERE order_id=NEW.order_id AND status IN ('committed','shortfall');
  END IF;
  PERFORM set_config('app.dong_bo_phu_luc','',true);
 END IF;
 RETURN NEW;
END $$;
