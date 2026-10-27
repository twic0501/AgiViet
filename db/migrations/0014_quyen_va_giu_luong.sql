-- Giữ tạm tồn tại trước đơn: khóa theo hold_id, cam kết mới khóa theo order_id.
ALTER TABLE ledger.qty_movements ADD COLUMN hold_id uuid REFERENCES core.holds;
CREATE OR REPLACE FUNCTION ledger.apply_qty_movement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE z constant uuid:='00000000-0000-0000-0000-000000000000'; f boolean; t boolean; fk uuid; tk uuid;
BEGIN
 PERFORM 1 FROM core.lots WHERE id=NEW.lot_id FOR UPDATE;
 SELECT per_order INTO f FROM ref.qty_buckets WHERE code=NEW.from_bucket;
 SELECT per_order INTO t FROM ref.qty_buckets WHERE code=NEW.to_bucket;
 fk:=CASE WHEN NEW.from_bucket='held' THEN NEW.hold_id WHEN f THEN NEW.order_id ELSE z END;
 tk:=CASE WHEN NEW.to_bucket='held' THEN NEW.hold_id WHEN t THEN NEW.order_id ELSE z END;
 IF fk IS NULL OR tk IS NULL THEN RAISE EXCEPTION 'Ngăn giữ cần hold_id, ngăn đơn cần order_id' USING HINT='ck_qty_move_order'; END IF;
 UPDATE ledger.qty_balances SET qty=qty-NEW.qty,updated_at=now() WHERE lot_id=NEW.lot_id AND bucket=NEW.from_bucket AND order_key=fk;
 IF NOT FOUND THEN
 IF NEW.from_bucket<>'source' THEN RAISE EXCEPTION 'Không đủ lượng' USING ERRCODE='23514',HINT='ck_qty_non_negative'; END IF;
 INSERT INTO ledger.qty_balances(lot_id,bucket,order_key,qty) VALUES(NEW.lot_id,NEW.from_bucket,fk,-NEW.qty); END IF;
 INSERT INTO ledger.qty_balances AS b(lot_id,bucket,order_key,qty) VALUES(NEW.lot_id,NEW.to_bucket,tk,NEW.qty)
 ON CONFLICT(lot_id,bucket,order_key) DO UPDATE SET qty=b.qty+excluded.qty,updated_at=now(); RETURN NEW;
EXCEPTION WHEN check_violation THEN RAISE EXCEPTION 'Lô không đủ lượng ngăn %',NEW.from_bucket USING ERRCODE='23514',HINT='ck_qty_non_negative'; END $$;
CREATE FUNCTION core.sync_hold_qty() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE f text; t text; why text;
BEGIN
 IF TG_OP='INSERT' THEN
 IF NOT EXISTS(SELECT 1 FROM core.offers WHERE id=NEW.offer_id AND lot_id=NEW.lot_id AND status='accepted') THEN RAISE EXCEPTION 'Giữ lượng cần lời chào đã đồng ý' USING HINT='ck_hold_offer'; END IF;
 f:='available';t:='held';why:='hold';
 ELSIF NEW.status=OLD.status THEN
 IF (NEW.lot_id,NEW.offer_id,NEW.qty) IS DISTINCT FROM (OLD.lot_id,OLD.offer_id,OLD.qty) THEN RAISE EXCEPTION 'Không đổi lượng giữ; hủy và giữ mới' USING HINT='ck_hold_frozen'; END IF; RETURN NEW;
 ELSIF NEW.status='committed' THEN f:='held';t:='committed';why:='commit';
 ELSE f:='held';t:='available';why:='hold_release'; END IF;
 INSERT INTO ledger.qty_movements(lot_id,from_bucket,to_bucket,reason,qty,order_id,hold_id,idempotency_key,actor_user_id,request_id)
 VALUES(NEW.lot_id,f,t,why,NEW.qty,NEW.order_id,NEW.id,'hold:'||NEW.id||':'||NEW.status,ref.ctx_user(),ref.ctx('request_id'));
 RETURN NEW; END $$;
CREATE TRIGGER z_qty AFTER INSERT OR UPDATE ON core.holds FOR EACH ROW EXECUTE FUNCTION core.sync_hold_qty();
CREATE FUNCTION core.freeze_hold() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.lot_id,NEW.offer_id,NEW.qty) IS DISTINCT FROM (OLD.lot_id,OLD.offer_id,OLD.qty) THEN RAISE EXCEPTION 'Giữ lượng bất biến' USING HINT='ck_hold_frozen'; END IF; RETURN NEW; END $$;
CREATE TRIGGER a_freeze BEFORE UPDATE ON core.holds FOR EACH ROW EXECUTE FUNCTION core.freeze_hold();
CREATE TRIGGER no_delete BEFORE DELETE ON core.holds FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();
CREATE FUNCTION core.declare_on_publish() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status IN ('on_sale','upcoming') AND NOT EXISTS(SELECT 1 FROM ledger.qty_movements WHERE lot_id=NEW.id AND reason IN ('declare','split_in')) THEN
 PERFORM ledger.move_qty(NEW.id,'source','available','declare',NEW.declared_qty,NULL,'declare:'||NEW.id); END IF; RETURN NEW; END $$;
CREATE TRIGGER z_declare AFTER INSERT OR UPDATE OF status ON core.lots FOR EACH ROW EXECUTE FUNCTION core.declare_on_publish();

-- Vai đọc của ứng dụng: cấp ít quyền trước; không cấp SQL ghi tiền trực tiếp.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agiviet_app') THEN CREATE ROLE agiviet_app NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agiviet_worker') THEN CREATE ROLE agiviet_worker NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agiviet_readonly') THEN CREATE ROLE agiviet_readonly NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agiviet_pii_reader') THEN CREATE ROLE agiviet_pii_reader NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
END $$;
REVOKE ALL ON SCHEMA core,ledger,pii,ops,evt,mkt,ref FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA core,ledger,pii,ops,evt,mkt,ref FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA core,ledger,pii,ops,evt,mkt,ref REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE FUNCTION core.can_access_org(p_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
 SELECT p_org=ref.ctx_org() AND EXISTS(SELECT 1 FROM core.memberships m JOIN core.users u ON u.id=m.user_id WHERE m.org_id=p_org AND m.user_id=ref.ctx_user() AND m.status='active' AND u.disabled_at IS NULL)
$$;
CREATE FUNCTION core.can_access_order(p_order uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
 SELECT EXISTS(SELECT 1 FROM core.orders WHERE id=p_order AND (core.can_access_org(buyer_org_id) OR core.can_access_org(seller_org_id)))
$$;
CREATE FUNCTION pii.read_order_contact(p_order uuid,p_user uuid) RETURNS bytea LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,pii,evt,ref AS $$
DECLARE result bytea; other_org uuid;
BEGIN
 IF NOT core.can_access_order(p_order) OR NOT EXISTS(SELECT 1 FROM core.contact_grants WHERE order_id=p_order AND mode='full' AND revoked_at IS NULL) THEN
 RAISE EXCEPTION 'Liên lạc chưa mở' USING HINT='CONTACT_LOCKED'; END IF;
 SELECT CASE WHEN buyer_org_id=ref.ctx_org() THEN seller_org_id ELSE buyer_org_id END INTO other_org FROM core.orders WHERE id=p_order;
 IF NOT EXISTS(SELECT 1 FROM core.memberships WHERE org_id=other_org AND user_id=p_user AND status='active') THEN RAISE EXCEPTION 'Không phải liên hệ đối tác của đơn' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT phone_enc INTO result FROM pii.user_contacts WHERE user_id=p_user;
 PERFORM evt.audit('pii.read_phone','user',p_user,jsonb_build_object('order_id',p_order)); RETURN result;
END $$;
-- Bật RLS mặc định chặn trên toàn bộ bảng nghiệp vụ. Chủ migration là ranh giới tin cậy, không phải tài khoản web.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('core','ledger','pii','ops','evt','mkt') LOOP
 EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',r.schemaname,r.tablename);
 END LOOP;
END $$;
CREATE POLICY own_org ON core.organizations FOR SELECT USING(core.can_access_org(id));
CREATE POLICY own_user ON core.users FOR SELECT USING(id=ref.ctx_user());
CREATE POLICY own_membership ON core.memberships FOR SELECT USING(core.can_access_org(org_id));
CREATE POLICY own_orders ON core.orders FOR SELECT USING(core.can_access_org(buyer_org_id) OR core.can_access_org(seller_org_id));
CREATE POLICY own_lots ON core.lots FOR SELECT USING(core.can_access_org(seller_org_id));
CREATE POLICY own_demands ON core.demands FOR SELECT USING(core.can_access_org(buyer_org_id));
CREATE POLICY own_prices ON core.lot_price_versions FOR SELECT USING(EXISTS(SELECT 1 FROM core.lots WHERE id=lot_id AND core.can_access_org(seller_org_id)));
CREATE POLICY own_demand_lines ON core.demand_lines FOR SELECT USING(EXISTS(SELECT 1 FROM core.demands WHERE id=demand_id AND core.can_access_org(buyer_org_id)));
CREATE POLICY own_max_price ON core.demand_line_max_prices FOR SELECT USING(EXISTS(SELECT 1 FROM core.demand_lines l JOIN core.demands d ON d.id=l.demand_id WHERE l.id=demand_line_id AND core.can_access_org(d.buyer_org_id)));
CREATE POLICY own_versions ON core.order_versions FOR SELECT USING(core.can_access_order(order_id));
CREATE POLICY own_deliveries ON core.deliveries FOR SELECT USING(core.can_access_order(order_id));
CREATE POLICY own_documents ON core.documents FOR SELECT USING(core.can_access_order(order_id) OR core.can_access_org(owner_org_id));
CREATE POLICY own_payments ON core.direct_payments FOR SELECT USING(core.can_access_org(payer_org_id) OR core.can_access_org(payee_org_id));
CREATE POLICY own_settlements ON core.settlements FOR SELECT USING(core.can_access_order(order_id));
CREATE POLICY own_deposits ON core.deposits FOR SELECT USING(core.can_access_order(order_id) OR core.can_access_org(payer_org_id));
CREATE POLICY own_accounts ON ledger.accounts FOR SELECT USING(core.can_access_org(org_id) OR core.can_access_order(order_id));
CREATE POLICY own_entries ON ledger.entries FOR SELECT USING(EXISTS(SELECT 1 FROM ledger.accounts WHERE id=account_id));
CREATE POLICY own_products ON core.products FOR SELECT USING(true);
CREATE POLICY own_profiles ON core.product_profiles FOR SELECT USING(true);
CREATE POLICY own_grades ON core.product_grades FOR SELECT USING(true);
CREATE POLICY own_matches ON mkt.match_candidates FOR SELECT USING(EXISTS(SELECT 1 FROM core.demand_lines l JOIN core.demands d ON d.id=l.demand_id WHERE l.id=demand_line_id AND core.can_access_org(d.buyer_org_id)));
-- Tìm nguồn qua hàm định nghĩa cột an toàn: không có ask_price, floor, khẩn cấp, địa chỉ hay tên hộ.
CREATE FUNCTION mkt.search_lots(p_product uuid) RETURNS TABLE(lot_id uuid,code text,product_id uuid,grade_code text,available_from date,region text,qty_basis text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
 SELECT l.id,l.code,l.product_id,l.grade_code,l.available_from,o.province_code,l.qty_basis FROM core.lots l JOIN core.organizations o ON o.id=l.seller_org_id
 WHERE l.product_id=p_product AND l.status IN ('on_sale','upcoming') AND l.safety_locked_at IS NULL AND o.status='active'
 AND core.can_access_org(ref.ctx_org())
$$;
GRANT USAGE ON SCHEMA core,ref,ledger,mkt TO agiviet_app,agiviet_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA ref TO agiviet_app,agiviet_readonly;
GRANT SELECT ON core.organizations,core.users,core.memberships,core.orders,core.lots,core.demands,core.lot_price_versions,core.demand_lines,core.demand_line_max_prices,core.order_versions,core.deliveries,core.documents,core.direct_payments,core.settlements,core.deposits,core.products,core.product_profiles,core.product_grades,ledger.accounts,ledger.entries,mkt.match_candidates TO agiviet_app,agiviet_readonly;
GRANT SELECT ON mkt.reference_prices TO agiviet_app,agiviet_readonly;
GRANT EXECUTE ON FUNCTION ref.ctx(text),ref.ctx_user(),ref.ctx_org(),ref.ctx_actor(),ref.div_round(numeric,numeric),core.can_access_org(uuid),core.can_access_order(uuid),mkt.search_lots(uuid) TO agiviet_app,agiviet_readonly;
GRANT USAGE ON SCHEMA pii TO agiviet_pii_reader;
GRANT EXECUTE ON FUNCTION pii.read_order_contact(uuid,uuid) TO agiviet_pii_reader;
GRANT USAGE ON SCHEMA evt TO agiviet_worker;
CREATE POLICY worker_outbox ON evt.outbox TO agiviet_worker USING(true) WITH CHECK(true);
CREATE POLICY worker_events ON evt.domain_events FOR SELECT TO agiviet_worker USING(true);
GRANT SELECT ON evt.outbox,evt.domain_events TO agiviet_worker;
GRANT UPDATE(status,attempts,available_at,locked_until,last_error,sent_at) ON evt.outbox TO agiviet_worker;
