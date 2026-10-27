-- Gỡ các tối ưu của toi-uu.sql để đo lại trạng thái "trước".
SET search_path = bench;
DROP MATERIALIZED VIEW IF EXISTS mkt_ref_price;
DROP INDEX IF EXISTS ix_ledger_accounts_order, ix_ledger_accounts_org, ix_ledger_entries_account,
  ix_lots_match, ix_lots_browse, ix_lots_browse_prov, ix_orders_refprice;
CREATE OR REPLACE FUNCTION ledger_account_of(p_type text, p_org uuid, p_order uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM bench.ledger_accounts WHERE account_type = p_type
     AND org_id IS NOT DISTINCT FROM p_org AND order_id IS NOT DISTINCT FROM p_order;
  IF v_id IS NULL THEN
    INSERT INTO bench.ledger_accounts (account_type, org_id, order_id) VALUES (p_type, p_org, p_order)
    ON CONFLICT ON CONSTRAINT uq_ledger_account DO NOTHING RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM bench.ledger_accounts WHERE account_type = p_type
         AND org_id IS NOT DISTINCT FROM p_org AND order_id IS NOT DISTINCT FROM p_order;
    END IF;
  END IF;
  RETURN v_id;
END $$;
