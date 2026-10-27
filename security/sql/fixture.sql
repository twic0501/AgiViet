-- Dữ liệu cho kiểm thử bảo mật DB. Chạy SAU: db/migrations, db/seed/000_du_lieu_ao.sql, db/tests/000_khung.sql,
-- db/tests/010_du_lieu_va_khung.sql (dùng các hàm test.id, test.org, test.person, test.context của nhóm DB).
-- Dựng hai đơn theo đúng đường hợp lệ (giống db/tests/030): SEC-1 đã hiệu lực, có cọc giữ và khoản trả thẳng đến hạn;
-- SEC-2 đang chờ cọc. Tất cả là DỮ LIỆU THỬ.

CREATE SCHEMA IF NOT EXISTS sec;
CREATE FUNCTION sec.make_order(p_code text, p_seller text, p_deposit bigint, p_fee bigint, p_value bigint) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE o uuid := test.id('sec-order:' || p_code); d uuid := test.id('sec-doc:' || p_code);
BEGIN
  PERFORM test.context('Trần Thu Hà', 'TC-M01', 'buyer');
  INSERT INTO core.orders (id, code, contract_type, buyer_org_id, seller_org_id, segment_code, product_id, policy_version_id, plan_code, is_first_pair_order, created_by_user_id)
  SELECT o, p_code, 'spot', test.org('TC-M01'), test.org(p_seller), 'processor', l.product_id, 1, 'procurement', true, test.person('Trần Thu Hà')
    FROM core.lots l WHERE l.code = 'L-0412';
  INSERT INTO core.documents (id, code, doc_type, owner_org_id, order_id, series_key, version_no, content_sha256, file_sha256, canonical_content, storage_key, mime_type, size_bytes, status)
  VALUES (d, p_code || '-PDF', 'contract', test.org('TC-M01'), o, p_code, 1, digest('sec-terms:' || p_code, 'sha256'), digest('sec-pdf:' || p_code, 'sha256'), '{"sec":true}', 'sec/no-pdf', 'application/pdf', 10, 'awaiting_signature');
  INSERT INTO core.order_versions (order_id, version_no, document_id, profile_version, qty_min, qty_max, qty_tolerance_bps, price_mode, unit_price_vnd, downgrade_price_vnd, ref_price_vnd, deposit_price_vnd,
         contract_value_vnd, deposit_basis_vnd, deposit_rule, deposit_bps, deposit_vnd, fee_rule, fee_bps, fee_floor_vnd, fee_cap_vnd, fee_vnd, payment_timing, seller_bank_account_id, seller_bank_code,
         seller_account_masked, seller_account_holder, delivery_mode, acceptance_point, transport_by, delivery_window, reject_allowance_bps, shortfall_penalty_bps)
  SELECT o, 1, d, 1, p_value / 23, p_value / 23, 500, 'fixed', 23000, 15000, NULL, 23000, p_value, p_value, 'percent', 3000, p_deposit, 'standard', 30, 20000, 1500000, p_fee, 'before_loading',
         id, bank_code, account_masked, holder_name, 'at_farm', 'tai_vuon', 'buyer', tstzrange(now() + interval '5 days', now() + interval '5 days 6 hours'), 500, ARRAY[0,1000,5000,10000]
    FROM pii.bank_accounts WHERE org_id = test.org(p_seller) AND status = 'active';
  INSERT INTO core.signatures (document_id, party, signer_user_id, signer_org_id, method, signed_sha256, otp_challenge_id, device_id)
  VALUES (d, 'buyer', test.person('Trần Thu Hà'), test.org('TC-M01'), 'otp', digest('sec-terms:' || p_code, 'sha256'), 'SEC-OTP-B', 'dev-b');
  UPDATE core.orders SET status = 'awaiting_seller' WHERE id = o;
  PERFORM test.context((SELECT u.display_name FROM core.users u JOIN core.memberships m ON m.user_id = u.id JOIN core.membership_roles r ON r.membership_id = m.id
                         WHERE m.org_id = test.org(p_seller) AND r.role_code = 'owner' LIMIT 1), p_seller, 'seller');
  INSERT INTO core.signatures (document_id, party, signer_user_id, signer_org_id, method, signed_sha256, otp_challenge_id, device_id)
  VALUES (d, 'seller', ref.ctx_user(), test.org(p_seller), 'otp', digest('sec-terms:' || p_code, 'sha256'), 'SEC-OTP-S', 'dev-s');
  UPDATE core.orders SET effective_version_no = 1 WHERE id = o;
  UPDATE core.orders SET status = 'awaiting_deposit' WHERE id = o;
  PERFORM test.context(NULL, NULL, 'system');
  UPDATE core.documents SET status = 'fully_signed' WHERE id = d;
  INSERT INTO core.deposits (id, order_id, payer_org_id, expected_deposit_vnd, expected_fee_vnd, payment_ref, virtual_account_no)
  VALUES (test.id('sec-dep:' || p_code), o, test.org('TC-M01'), p_deposit, p_fee, 'AGV ' || replace(p_code, '-', '') || ' COC', 'VA-' || p_code);
  RETURN o;
END $$;

CREATE FUNCTION sec.bank_receipt(p_name text, p_amount bigint, p_ref text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE w bigint; e uuid := test.id('sec-ev:' || p_name);
BEGIN
  INSERT INTO evt.inbound_webhooks (provider, provider_event_id, event_type, signature_valid, payload)
  VALUES ('bank_sim', 'SEC-' || p_name, 'deposit_received', true, jsonb_build_object('amount_vnd', p_amount)) RETURNING id INTO w;
  INSERT INTO core.bank_events (id, provider, provider_event_id, webhook_id, kind, amount_vnd, payment_ref, occurred_at)
  VALUES (e, 'bank_sim', 'SEC-' || p_name, w, 'deposit_received', p_amount, p_ref, now());
  RETURN core.apply_bank_event(e);
END $$;

-- SEC-1: hiệu lực, cọc 13.800.000 + phí 138.000 đã vào
SELECT sec.make_order('SEC-1', 'TC-B01', 13800000, 138000, 46000000);
SELECT test.context(NULL, NULL, 'bank');
SELECT sec.bank_receipt('dep1', 13938000, 'AGV SEC1 COC');
SELECT test.context(NULL, NULL, 'system');
UPDATE core.orders SET status = 'active' WHERE id = test.id('sec-order:SEC-1');
INSERT INTO core.direct_payments (id, code, order_id, kind, direction, payer_org_id, payee_org_id, amount_due_vnd, due_trigger, status, blocks_loading)
VALUES (test.id('sec-dp1'), 'SEC-TT1', test.id('sec-order:SEC-1'), 'goods_before_loading', 'buyer_to_seller', test.org('TC-M01'), test.org('TC-B01'), 32200000, 'order_active', 'due', true);

-- SEC-2: chờ cọc (người bán khác)
SELECT sec.make_order('SEC-2', 'TC-B02', 6900000, 69000, 23000000);
SELECT test.context(NULL, NULL, 'system');
