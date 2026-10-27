CREATE TABLE core.framework_opening_exposures (
 framework_id uuid PRIMARY KEY REFERENCES core.framework_contracts,
 unpaid_delivered_vnd bigint NOT NULL CHECK(unpaid_delivered_vnd>=0), scheduled_vnd bigint NOT NULL CHECK(scheduled_vnd>=0),
 source_key text NOT NULL, as_of timestamptz NOT NULL
);
COMMENT ON TABLE core.framework_opening_exposures IS 'Ảnh chụp dư nợ đầu kỳ dữ liệu ảo; chưa có chi tiết lần gọi hàng trong JSON. Nợ được ghi sổ, phần sắp giao chỉ là hạn mức đã dùng.';
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.framework_opening_exposures FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION ledger.open_framework_exposure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.unpaid_delivered_vnd>0 THEN
 PERFORM ledger.post('settlement_accrual',NULL,'fw-opening:'||NEW.framework_id,'Dư nợ đầu kỳ dữ liệu thử',
 jsonb_build_array(jsonb_build_object('type','seller_receivable','framework',NEW.framework_id,'amount',NEW.unpaid_delivered_vnd),jsonb_build_object('type','buyer_payable','framework',NEW.framework_id,'amount',-NEW.unpaid_delivered_vnd)),NEW.as_of,NULL,NULL,jsonb_build_object('framework',NEW.framework_id));
 END IF; RETURN NEW; END $$;
CREATE TRIGGER z_ledger AFTER INSERT ON core.framework_opening_exposures FOR EACH ROW EXECUTE FUNCTION ledger.open_framework_exposure();
CREATE VIEW core.v_framework_limits AS
SELECT f.id,f.framework_deposit_vnd+f.extra_credit_vnd allowed_vnd,
 coalesce((SELECT sum(balance_vnd) FROM ledger.v_account_balances WHERE framework_id=f.id AND account_type='seller_receivable'),0)
 +coalesce((SELECT scheduled_vnd FROM core.framework_opening_exposures WHERE framework_id=f.id),0)
 +coalesce((SELECT sum(v.contract_value_vnd) FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.framework_id=f.id AND o.status='active'),0) used_vnd
FROM core.framework_contracts f;
COMMENT ON VIEW core.v_framework_limits IS 'Giới hạn khung; phần sắp giao tính theo đơn active. Backend chuyển đơn sau chốt nghiệm thu để tránh đếm trùng với quyền đòi đã ghi.';
CREATE FUNCTION core.guard_framework_credit() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE seller uuid;
BEGIN
 SELECT seller_org_id INTO seller FROM core.framework_contracts WHERE id=NEW.framework_id FOR UPDATE;
 IF NEW.granted_by IS DISTINCT FROM ref.ctx_user() OR NOT EXISTS(SELECT 1 FROM core.memberships m JOIN core.membership_roles mr ON mr.membership_id=m.id WHERE m.org_id=seller AND m.user_id=NEW.granted_by AND m.status='active' AND mr.role_code IN ('owner','coop_board')) THEN
 RAISE EXCEPTION 'Chỉ chủ hoặc ban điều hành cấp cho nợ thêm' USING HINT='KHONG_CO_QUYEN'; END IF;
 UPDATE core.framework_contracts SET extra_credit_vnd=NEW.extra_credit_vnd WHERE id=NEW.framework_id; RETURN NEW;
END $$;
CREATE TRIGGER a_credit BEFORE INSERT ON core.framework_credit_grants FOR EACH ROW EXECUTE FUNCTION core.guard_framework_credit();
CREATE TABLE core.confirmed_external_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('service','advance','advance_refund')),
 payer_org_id uuid NOT NULL REFERENCES core.organizations, payee_org_id uuid NOT NULL REFERENCES core.organizations,
 order_id uuid REFERENCES core.orders, amount_vnd bigint NOT NULL CHECK(amount_vnd>0),
 confirmed_by uuid NOT NULL REFERENCES core.users, document_id uuid NOT NULL REFERENCES core.documents,
 idempotency_key text NOT NULL UNIQUE, confirmed_at timestamptz NOT NULL DEFAULT now(), CHECK(payer_org_id<>payee_org_id)
);
COMMENT ON TABLE core.confirmed_external_transfers IS 'Tiền dịch vụ xe/kho/kiểm định, ứng tiền đã được bên nhận xác nhận; không coi là tiền hàng D hay tiền ngân hàng giữ hộ.';
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.confirmed_external_transfers FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
INSERT INTO ref.ledger_txn_kinds VALUES ('service_payment','Xác nhận tiền dịch vụ ngoài app','direct'),('advance_payment','Xác nhận tiền ứng ngoài app','advance');
CREATE FUNCTION ledger.on_external_transfer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM core.require_money_role(NEW.confirmed_by,NEW.payee_org_id);
 PERFORM ledger.post(CASE WHEN NEW.kind='service' THEN 'service_payment' ELSE 'advance_payment' END,NEW.order_id,'external:'||NEW.idempotency_key,'Xác nhận chuyển tiền ngoài app',
 jsonb_build_array(jsonb_build_object('type','external','org',NEW.payer_org_id,'amount',-NEW.amount_vnd),jsonb_build_object('type','external','org',NEW.payee_org_id,'amount',NEW.amount_vnd)),NEW.confirmed_at);
 RETURN NEW; END $$;
CREATE TRIGGER z_ledger AFTER INSERT ON core.confirmed_external_transfers FOR EACH ROW EXECUTE FUNCTION ledger.on_external_transfer();
CREATE TABLE core.household_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES core.orders, contribution_id uuid NOT NULL REFERENCES core.lot_contributions,
 gross_vnd bigint NOT NULL CHECK(gross_vnd>=0), collection_fee_vnd bigint NOT NULL CHECK(collection_fee_vnd>=0),
 net_vnd bigint NOT NULL CHECK(net_vnd=gross_vnd-collection_fee_vnd AND net_vnd>=0), document_id uuid NOT NULL REFERENCES core.documents,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,contribution_id)
);
COMMENT ON TABLE core.household_allocations IS 'Bảng phân bổ HTX hiển thị theo phần hộ; không tự tạo lệnh ngân hàng. Xác nhận chi thực tế qua confirmed_external_transfers.';
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON core.household_allocations FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE POLICY own_allocations ON core.household_allocations FOR SELECT USING(core.can_access_order(order_id) OR EXISTS(SELECT 1 FROM core.lot_contributions c WHERE c.id=contribution_id AND core.can_access_org(c.household_org_id)));
ALTER TABLE core.household_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.confirmed_external_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.framework_opening_exposures ENABLE ROW LEVEL SECURITY;
-- Phân bổ nguyên đồng, dư về phần lớn nhất, cùng lượng thì thứ tự đầu (04 mục 2.6).
CREATE FUNCTION ref.allocate_vnd(p_total bigint,p_weights bigint[]) RETURNS bigint[] LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE result bigint[]:='{}'; weight bigint; sum_w numeric; residual bigint; largest integer; i integer:=0;
BEGIN
 IF p_total<0 OR cardinality(p_weights)=0 OR EXISTS(SELECT 1 FROM unnest(p_weights)w WHERE w IS NULL OR w<=0) THEN RAISE EXCEPTION 'Trọng số hoặc tổng không hợp lệ'; END IF;
 SELECT sum(w) INTO sum_w FROM unnest(p_weights)w;
 FOREACH weight IN ARRAY p_weights LOOP i:=i+1; result:=array_append(result,floor(p_total::numeric*weight/sum_w)::bigint); END LOOP;
 SELECT p_total-sum(w) INTO residual FROM unnest(result)w;
 SELECT n INTO largest FROM unnest(p_weights) WITH ORDINALITY t(w,n) ORDER BY w DESC,n LIMIT 1;
 result[largest]:=result[largest]+residual; RETURN result;
END $$;
-- Bình luận tiếng Việt cho cả bảng và cột, bổ sung nơi bản nháp chỉ dùng chú thích SQL.
DO $$ DECLARE r record; meaning text; BEGIN
 FOR r IN SELECT c.oid,n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('core','ref','ledger','pii','ops','evt','mkt') AND c.relkind = 'r' LOOP
 IF obj_description(r.oid,'pg_class') IS NULL THEN EXECUTE format('COMMENT ON TABLE %I.%I IS %L',r.nspname,r.relname,'Bảng '||r.relname||': dữ liệu '||CASE r.nspname WHEN 'core' THEN 'nghiệp vụ giao dịch AgiViet' WHEN 'ledger' THEN 'ghi sổ và đối chiếu tiền, lượng' WHEN 'pii' THEN 'nhạy cảm, hạn chế truy cập' WHEN 'ops' THEN 'vận hành có người chịu trách nhiệm' WHEN 'evt' THEN 'sự kiện và truy vết' WHEN 'mkt' THEN 'thị trường tổng hợp' ELSE 'tham chiếu và cấu hình' END||'.'); END IF;
 END LOOP;
 FOR r IN SELECT c.oid,n.nspname,c.relname,a.attnum,a.attname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('core','ref','ledger','pii','ops','evt','mkt') AND c.relkind IN ('r','m') AND a.attnum>0 AND NOT a.attisdropped LOOP
 meaning:=CASE WHEN r.attname='id' THEN 'Định danh bản ghi.' WHEN r.attname LIKE '%_vnd%' THEN 'Số tiền hoặc đơn giá nguyên đồng VND; không dùng số thực.' WHEN r.attname IN ('qty','declared_qty','planned_qty','loaded_qty','weighed_qty','payable_qty','capacity_qty','min_source_qty','promiseable_qty','reserved_qty') OR r.attname LIKE 'qty_%' THEN 'Khối lượng số nguyên gam; không dùng số thực.' WHEN r.attname LIKE '%_bps' THEN 'Tỷ lệ nguyên phần vạn; 10000 tương ứng 100 phần trăm.' WHEN r.attname LIKE '%_at' OR r.attname='at' THEN 'Thời điểm có múi giờ; lưu bằng timestamptz.' WHEN r.attname LIKE '%_enc' THEN 'Bản mã hóa tại backend; khóa ngoài database.' WHEN r.attname LIKE '%sha256%' OR r.attname LIKE '%_hash' THEN 'Mã băm kiểm tra toàn vẹn hoặc tra trùng; không thay dữ liệu gốc.' WHEN r.attname LIKE '%_id' THEN 'Tham chiếu đối tượng '||r.attname||'; kiểm tra phạm vi tổ chức trước khi dùng.' WHEN r.attname='status' THEN 'Trạng thái hiện tại; chuyển qua máy trạng thái nếu có vòng đời.' WHEN r.attname='code' THEN 'Mã hiển thị hoặc mã tham chiếu ổn định.' WHEN r.attname='write_xid' THEN 'Mã giao dịch PostgreSQL tạo bản ghi; khóa phần chi tiết sau COMMIT.' ELSE 'Thuộc tính '||r.attname||' của '||r.relname||'; xem tài liệu mô hình và ràng buộc SQL.' END;
 IF col_description(r.oid,r.attnum) IS NULL THEN EXECUTE format('COMMENT ON COLUMN %I.%I.%I IS %L',r.nspname,r.relname,r.attname,meaning); END IF;
 END LOOP;
END $$;
