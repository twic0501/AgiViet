-- Các đường nóng có thứ tự ổn định và khóa nghiệp vụ của nguồn ghi sổ.
CREATE INDEX ix_orders_buyer_cursor ON core.orders(buyer_org_id,created_at DESC,id DESC) WHERE status NOT IN ('completed','closed');
CREATE INDEX ix_orders_seller_cursor ON core.orders(seller_org_id,created_at DESC,id DESC) WHERE status NOT IN ('completed','closed');
CREATE INDEX ix_deadlines_order ON core.deadlines(order_id,kind) WHERE status='open';
CREATE INDEX ix_outbox_lease ON evt.outbox(destination,available_at,id) WHERE status IN ('pending','failed');
CREATE INDEX ix_tasks_order ON ops.tasks(order_id,created_at DESC);
CREATE INDEX ix_storage_lot ON core.storage_bookings(lot_id,created_at DESC);
CREATE INDEX ix_storage_movements_booking ON core.storage_movements(booking_id,id);
CREATE INDEX ix_sample_delivery ON core.sealed_samples(delivery_id);
CREATE INDEX ix_inspection_results ON core.inspection_results(inspection_id,issued_at DESC);
CREATE INDEX ix_contacts_granted_pair ON core.contact_grants(buyer_org_id,seller_org_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX uq_transaction_bank_event ON ledger.transactions(bank_event_id) WHERE bank_event_id IS NOT NULL;
CREATE UNIQUE INDEX uq_transaction_confirmation ON ledger.transactions(dp_confirmation_id) WHERE dp_confirmation_id IS NOT NULL;
CREATE UNIQUE INDEX uq_transaction_settlement ON ledger.transactions(settlement_id) WHERE settlement_id IS NOT NULL;
CREATE UNIQUE INDEX uq_transaction_instruction_step ON ledger.transactions(bank_instruction_id,kind) WHERE bank_instruction_id IS NOT NULL;
-- Kiểm toán tự động các thay đổi quyền và quyết định nhạy cảm, không chép giá kín/PII vào log chung.
CREATE FUNCTION evt.audit_sensitive_change() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE rid uuid;
BEGIN
 rid:=coalesce((to_jsonb(NEW)->>'id')::uuid,(to_jsonb(NEW)->>'membership_id')::uuid,(to_jsonb(OLD)->>'id')::uuid,(to_jsonb(OLD)->>'membership_id')::uuid);
 PERFORM evt.audit(TG_TABLE_NAME||'.'||lower(TG_OP),TG_TABLE_NAME,rid,jsonb_build_object('operation',TG_OP,'table_schema',TG_TABLE_SCHEMA));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
CREATE TRIGGER z_audit AFTER INSERT OR UPDATE OR DELETE ON core.membership_roles FOR EACH ROW EXECUTE FUNCTION evt.audit_sensitive_change();
CREATE TRIGGER z_audit AFTER INSERT OR UPDATE OR DELETE ON core.delegations FOR EACH ROW EXECUTE FUNCTION evt.audit_sensitive_change();
CREATE TRIGGER z_audit AFTER INSERT ON ops.decisions FOR EACH ROW EXECUTE FUNCTION evt.audit_sensitive_change();
-- Bảo đảm sổ lượng của đơn không còn cam kết đang treo trước khi đóng hoàn tất.
CREATE FUNCTION core.guard_finished_qty() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='completed' AND OLD.status<>NEW.status AND EXISTS(SELECT 1 FROM ledger.qty_balances WHERE order_key=NEW.id AND bucket IN ('committed','in_transit') AND qty>0) THEN
 RAISE EXCEPTION 'Đơn còn lượng chưa xử lý' USING HINT='ck_order_qty'; END IF; RETURN NEW; END $$;
CREATE TRIGGER b_finished_qty BEFORE UPDATE OF status ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_finished_qty();
