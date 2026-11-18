-- 0092: Mặt hàng chính của người mua (người sáng lập chốt 18/11/2026). Người mua B2B thật chỉ mua vài nguyên liệu
-- (nhà máy sấy: xoài, mít; vựa trái cây: vài loại trái), nên mỗi tổ chức mua chọn TỐI ĐA 5 mặt hàng chính.
-- Phiếu tìm nguồn và danh sách lô chỉ hiện các mặt hàng này; muốn đổi thì chọn lại (ghi đè cả danh sách).
CREATE TABLE core.buyer_main_products(
 org_id uuid NOT NULL REFERENCES core.organizations,
 product_id uuid NOT NULL REFERENCES core.products,
 created_by uuid NOT NULL REFERENCES core.users,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(org_id, product_id)
);
ALTER TABLE core.buyer_main_products ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.buyer_main_products IS 'Mặt hàng chính của tổ chức mua (0092): tối đa 5; phiếu tìm nguồn và danh sách lô chỉ hiện các mặt hàng này.';
COMMENT ON COLUMN core.buyer_main_products.org_id IS 'Tổ chức mua.';
COMMENT ON COLUMN core.buyer_main_products.product_id IS 'Mặt hàng chính.';
COMMENT ON COLUMN core.buyer_main_products.created_by IS 'Người chọn.';
COMMENT ON COLUMN core.buyer_main_products.created_at IS 'Lúc chọn.';

-- Ghi đè danh sách mặt hàng chính của tổ chức đang đăng nhập (vai mua: chủ hoặc người phụ trách mua).
CREATE FUNCTION cmd.set_buyer_main_products(p_products uuid[]) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE org uuid := ref.ctx_org(); n int;
BEGIN
 PERFORM cmd.enter_actor();
 IF ref.ctx_actor() <> 'buyer' THEN RAISE EXCEPTION 'Chỉ tổ chức mua chọn mặt hàng chính' USING HINT='KHONG_CO_QUYEN'; END IF;
 PERFORM cmd.require_org(org, ARRAY['owner','purchaser']);
 n := coalesce(array_length(ARRAY(SELECT DISTINCT unnest(p_products)), 1), 0);
 IF n < 1 OR n > 5 THEN RAISE EXCEPTION 'Chọn từ 1 tới 5 mặt hàng chính' USING HINT='DU_LIEU_KHONG_HOP_LE'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_products) x WHERE NOT EXISTS(SELECT 1 FROM core.products p WHERE p.id=x)) THEN
   RAISE EXCEPTION 'Mặt hàng không có trong danh mục' USING HINT='DU_LIEU_KHONG_HOP_LE'; END IF;
 DELETE FROM core.buyer_main_products WHERE org_id=org;
 INSERT INTO core.buyer_main_products(org_id, product_id, created_by) SELECT DISTINCT org, x, ref.ctx_user() FROM unnest(p_products) x;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION cmd.set_buyer_main_products(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.set_buyer_main_products(uuid[]) TO agiviet_app;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_read') THEN GRANT SELECT ON core.buyer_main_products TO agv_backend_read; END IF;
END $$;
