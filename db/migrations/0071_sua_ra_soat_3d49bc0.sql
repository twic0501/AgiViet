-- Sửa theo Codex rà commit 3d49bc0 (28/10/2026): đơn single_product lấy lượng/giá từ phiên bản hợp đồng hiệu lực
-- (qty_min, unit_price_vnd), chỉ cộng order_lines khi value_basis='lines'; đồng bộ hủy theo kết quả hủy thực tế.

CREATE FUNCTION core.order_qty_price(p_order uuid,p_version integer,OUT qty_g bigint,OUT price_vnd_per_kg bigint,OUT same_price boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core AS $$
 SELECT CASE WHEN v.value_basis='single_product' THEN v.qty_min ELSE (SELECT sum(l.qty) FROM core.order_lines l WHERE l.order_id=v.order_id AND l.version_no=v.version_no) END,
        CASE WHEN v.value_basis='single_product' THEN v.unit_price_vnd ELSE (SELECT max(l.unit_price_vnd) FROM core.order_lines l WHERE l.order_id=v.order_id AND l.version_no=v.version_no) END,
        v.price_unit_base_qty=1000 AND (v.value_basis='single_product' OR (SELECT count(DISTINCT l.unit_price_vnd)=1 FROM core.order_lines l WHERE l.order_id=v.order_id AND l.version_no=v.version_no))
 FROM core.order_versions v WHERE v.order_id=p_order AND v.version_no=p_version
$$;
COMMENT ON FUNCTION core.order_qty_price(uuid,integer) IS 'Lượng (g) và giá (đ/kg) của một phiên bản hợp đồng; same_price=false khi đơn theo dòng có nhiều giá hoặc đơn vị giá khác kg.';

CREATE OR REPLACE FUNCTION cmd.link_allocation_order(p_alloc uuid,p_order uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE; dd date; o core.orders%ROWTYPE; v core.order_versions%ROWTYPE; op record;
BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor']);
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc FOR UPDATE;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 SELECT delivery_date INTO dd FROM core.sourcing_days WHERE id=a.day_id;
 SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 SELECT * INTO v FROM core.order_versions WHERE order_id=o.id AND version_no=o.effective_version_no;
 IF a.status NOT IN ('committed','shortfall') OR a.order_id IS NOT NULL OR o.buyer_org_id<>g.buyer_org_id OR o.seller_org_id<>a.seller_org_id OR o.product_id<>g.product_id
  OR EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE order_id=p_order) THEN
  RAISE EXCEPTION 'Đơn không khớp phân bổ (bên mua, người bán, mặt hàng) hoặc đã gắn' USING HINT='ck_command_payload'; END IF;
 IF core.order_committed_at(o.id) IS NULL OR o.status IN ('drafting','internal_approval','awaiting_seller','closed','completed','outstanding','cancelled') THEN
  RAISE EXCEPTION 'Chỉ gắn đơn đã ký và còn đang chạy' USING HINT='ck_command_state'; END IF;
 IF o.created_at<a.seller_committed_at-interval '1 day' THEN
  RAISE EXCEPTION 'Đơn lập trước cam kết nguồn: không dùng đơn cũ' USING HINT='ck_command_state'; END IF;
 SELECT * INTO op FROM core.order_qty_price(o.id,o.effective_version_no);
 IF NOT coalesce(op.same_price,false) OR op.qty_g IS DISTINCT FROM (CASE a.status WHEN 'shortfall' THEN a.delivered_qty_g ELSE a.qty_g END)
  OR op.price_vnd_per_kg IS DISTINCT FROM a.unit_price_vnd_per_kg
  OR NOT (v.delivery_window && tstzrange((dd::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'),((dd+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))) THEN
  RAISE EXCEPTION 'Đơn khác phân bổ về lượng, giá hoặc ngày giao' USING HINT='ck_command_payload'; END IF;
 UPDATE core.sourcing_allocations SET order_id=p_order WHERE id=a.id;
END $$;

CREATE OR REPLACE FUNCTION core.sync_allocation_from_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
DECLARE op record;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM core.sourcing_allocations WHERE order_id=NEW.id) THEN RETURN NEW; END IF;
 PERFORM set_config('app.dong_bo_phu_luc','on',true);
 IF NEW.status='cancelled' THEN
  UPDATE core.sourcing_allocations SET status='cancelled' WHERE order_id=NEW.id AND status='committed';
 ELSIF NEW.effective_version_no IS DISTINCT FROM OLD.effective_version_no THEN
  SELECT * INTO op FROM core.order_qty_price(NEW.id,NEW.effective_version_no);
  IF op.qty_g IS NOT NULL THEN
   UPDATE core.sourcing_allocations SET qty_g=op.qty_g, unit_price_vnd_per_kg=op.price_vnd_per_kg WHERE order_id=NEW.id;
  END IF;
 END IF;
 PERFORM set_config('app.dong_bo_phu_luc','',true);
 RETURN NEW;
END $$;

-- Hủy hoàn tất (yêu cầu hủy 'done') → phân bổ gắn đơn hủy theo; hoàn tất thường không đụng tới.
CREATE FUNCTION core.sync_allocation_on_cancel() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$ BEGIN
 IF NEW.status='done' AND OLD.status IS DISTINCT FROM 'done' THEN
  PERFORM set_config('app.dong_bo_phu_luc','on',true);
  UPDATE core.sourcing_allocations SET status='cancelled' WHERE order_id=NEW.order_id AND status='committed';
  PERFORM set_config('app.dong_bo_phu_luc','',true);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_sync_allocation_cancel AFTER UPDATE OF status ON core.cancellation_requests FOR EACH ROW EXECUTE FUNCTION core.sync_allocation_on_cancel();
