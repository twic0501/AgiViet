-- Nguồn JSON có kế hoạch vụ và trạng thái đợt nhưng không đủ chứng từ lịch sử.
-- Tách dữ liệu nhập với hợp đồng đang chạy để không sáng tác số dư hay chữ ký.
CREATE TABLE core.imported_offtake_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
 buyer_org_id uuid NOT NULL REFERENCES core.organizations, seller_org_id uuid NOT NULL REFERENCES core.organizations,
 product_id uuid NOT NULL REFERENCES core.products, grade_code text NOT NULL,
 deposit_vnd bigint NOT NULL CHECK(deposit_vnd>=0), materials_advance_vnd bigint NOT NULL CHECK(materials_advance_vnd>=0),
 formula_text text NOT NULL, payment_after_days integer NOT NULL CHECK(payment_after_days>0),
 operational_order_id uuid UNIQUE REFERENCES core.orders, source_key text NOT NULL REFERENCES ops.seed_sources(source_key),
 imported_at timestamptz NOT NULL DEFAULT now(), CHECK(buyer_org_id<>seller_org_id)
);
COMMENT ON TABLE core.imported_offtake_plans IS 'Kế hoạch bao tiêu từ JSON. Không phải hợp đồng đã ký; liên kết operational_order_id sau khi backend có đầy đủ phiên bản và chứng từ.';
CREATE TABLE core.imported_offtake_batches (
 plan_id uuid NOT NULL REFERENCES core.imported_offtake_plans,
 batch_no integer NOT NULL CHECK(batch_no>0), committed_qty bigint NOT NULL CHECK(committed_qty>0),
 materials_offset_vnd bigint NOT NULL CHECK(materials_offset_vnd>=0), source_status text NOT NULL,
 PRIMARY KEY(plan_id,batch_no)
);
COMMENT ON TABLE core.imported_offtake_batches IS 'Các đợt theo nguồn JSON, giữ nguyên nhãn trạng thái nguồn; không coi da_chot là bằng chứng đã trả tiền.';
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.imported_offtake_batches FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
ALTER TABLE core.imported_offtake_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.imported_offtake_batches ENABLE ROW LEVEL SECURITY;
-- Bình luận cột cho hai bảng nhập.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='core' AND table_name IN ('imported_offtake_plans','imported_offtake_batches') LOOP
 EXECUTE format('COMMENT ON COLUMN core.%I.%I IS %L',r.table_name,r.column_name,CASE WHEN r.column_name='committed_qty' THEN 'Lượng cam kết số nguyên gam từ JSON.' WHEN r.column_name LIKE '%_vnd' THEN 'Số tiền nguyên đồng VND từ dữ liệu thử; chưa chứng minh có dòng tiền.' ELSE 'Thuộc tính nhập '||r.column_name||'; đối chiếu du-lieu-ao.json trước khi đưa vào hợp đồng đang chạy.' END);
 END LOOP;
END $$;
