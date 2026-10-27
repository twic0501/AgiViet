-- Sửa theo rà soát commit 70611c2 (28/10/2026):
-- 1) E1 phải chạy qua lệnh nghiệp vụ: cmd.create_settlement và trigger dùng CHUNG một nguồn khoản giữ.
-- 2) Chính sách gắn với từng đơn: đơn có trước migration này giữ chính sách cũ (giữ thêm khi tranh chấp);
--    đơn tạo từ nay theo bản 23 (E1, không ký thay khách).
-- 3) Liên lạc khảo sát: kiểm chính người gọi (phía bên mua phải là người đến đã khai) và chỉ trong khung giờ chuyến.
-- 4) Bản 23 + E2: quyết định nội bộ hai người không thay sự chấp thuận của khách; chặn chữ ký thay bên mua/bán.

-- ---------- 2) Phiên bản chính sách theo đơn ----------
-- Thêm cột với mặc định 22: mọi đơn ĐÃ CÓ nhận 22 (giữ điều khoản đã ký). Sau đó đổi mặc định 23 cho đơn mới.
ALTER TABLE core.orders ADD COLUMN policy_version smallint NOT NULL DEFAULT 22 CHECK(policy_version IN (22,23));
ALTER TABLE core.orders ALTER COLUMN policy_version SET DEFAULT 23;
COMMENT ON COLUMN core.orders.policy_version IS 'Chính sách áp cho đơn: 22 = luật trước bản 23 (đơn có trước 28/10/2026); 23 = bản 23 (E1 trả đủ phần công nhận, không ký thay khách). Không đổi sau khi tạo.';
CREATE FUNCTION core.guard_order_policy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.policy_version IS DISTINCT FROM OLD.policy_version AND NOT ref.is_schema_owner() THEN
  RAISE EXCEPTION 'Không đổi chính sách của đơn đã tạo' USING HINT='ck_append_only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_policy_fixed BEFORE UPDATE OF policy_version ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_order_policy();

-- ---------- 1) Một nguồn khoản giữ cho cả lệnh và trigger ----------
-- Số đòi thêm từ tranh chấp đang mở (phí kiểm định bên mua ứng + phạt thiếu lượng): công thức cũ, đổi tên cho rõ nghĩa.
CREATE FUNCTION core.dispute_claim_amount(p_order uuid) RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT sum(i.fee_vnd) FROM core.inspections i JOIN core.disputes d ON d.id=i.dispute_id
  WHERE d.order_id=o.id AND d.status<>'resolved' AND i.prepaid_by_org_id=o.buyer_org_id),0)
 +coalesce((SELECT sum(ref.div_round(v.deposit_vnd::numeric*d.disputed_qty*
  (SELECT max(bps) FROM unnest(v.shortfall_penalty_bps) bps),v.qty_min::numeric*10000))
  FROM core.disputes d WHERE d.order_id=o.id AND d.status<>'resolved' AND d.claim_kind='shortfall'),0)
 FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.id=p_order
$$;
COMMENT ON FUNCTION core.dispute_claim_amount(uuid) IS 'Khoản bên mua đòi thêm từ tranh chấp đang mở. Đơn chính sách 23: chưa bảo đảm, không giữ từ tiền người bán. Đơn chính sách 22: bị giữ khi chi tạm.';
-- Khoản GIỮ khi chi tạm: phụ thuộc chính sách của đơn. cmd.create_settlement (0044/0052) và trigger đều gọi hàm này.
CREATE OR REPLACE FUNCTION core.dispute_additional_hold(p_order uuid) RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN (SELECT policy_version FROM core.orders WHERE id=p_order)=23 THEN 0 ELSE coalesce(core.dispute_claim_amount(p_order),0) END
$$;
COMMENT ON FUNCTION core.dispute_additional_hold(uuid) IS 'Khoản giữ thêm khi chi tạm theo chính sách đơn: 23 → 0 (E1); 22 → bằng core.dispute_claim_amount.';
CREATE OR REPLACE FUNCTION core.snapshot_dispute_hold() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.hold_formula_version:=CASE WHEN (SELECT policy_version FROM core.orders WHERE id=NEW.order_id)=23 THEN 3 ELSE 2 END;
 NEW.additional_hold_vnd:=CASE WHEN NEW.is_final THEN 0 ELSE coalesce(core.dispute_additional_hold(NEW.order_id),0) END;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION core.dispute_claim_amount(uuid) FROM PUBLIC;

-- ---------- 3) Liên lạc khảo sát ----------
CREATE OR REPLACE FUNCTION pii.read_survey_contact(p_visit uuid,p_user uuid) RETURNS bytea LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,pii,evt,ref AS $$
DECLARE s core.survey_visits%ROWTYPE; caller uuid:=ref.ctx_user(); caller_org uuid:=ref.ctx_org(); result bytea;
BEGIN
 SELECT * INTO s FROM core.survey_visits WHERE id=p_visit;
 IF s.id IS NULL OR s.seller_consented_at IS NULL OR s.cancelled_at IS NOT NULL OR NOT (ref.clock_at() <@ s.visit_window) THEN
  RAISE EXCEPTION 'Liên lạc khảo sát chưa mở hoặc đã hết hạn' USING HINT='CONTACT_LOCKED'; END IF;
 IF caller IS NULL OR caller_org IS NULL OR caller_org NOT IN (s.buyer_org_id,s.seller_org_id)
  OR NOT EXISTS(SELECT 1 FROM core.memberships WHERE org_id=caller_org AND user_id=caller AND status='active') THEN
  RAISE EXCEPTION 'Không thuộc chuyến khảo sát' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF caller_org=s.buyer_org_id THEN
  -- Người gọi phía bên mua phải là người đến đã khai; chỉ được đọc liên hệ của người bán.
  IF NOT caller=ANY(s.visitor_user_ids) OR NOT EXISTS(SELECT 1 FROM core.memberships WHERE org_id=s.seller_org_id AND user_id=p_user AND status='active') THEN
   RAISE EXCEPTION 'Chỉ người đến khảo sát đã khai được nhận liên hệ người bán' USING HINT='KHONG_CO_QUYEN'; END IF;
 ELSE
  -- Người bán chỉ được đọc liên hệ của người đến đã khai.
  IF NOT p_user=ANY(s.visitor_user_ids) THEN RAISE EXCEPTION 'Chỉ liên hệ của người đến đã khai' USING HINT='KHONG_CO_QUYEN'; END IF;
 END IF;
 SELECT phone_enc INTO result FROM pii.user_contacts WHERE user_id=p_user;
 PERFORM evt.audit('pii.read_phone','user',p_user,jsonb_build_object('survey_visit_id',p_visit)); RETURN result;
END $$;
COMMENT ON COLUMN core.survey_visits.visit_window IS 'Khung giờ khảo sát, tối đa 2 ngày; liên lạc chỉ mở TRONG khung này (muốn có thời gian di chuyển thì khai khung rộng hơn)';

-- ---------- 4) Không ký thay khách bằng quyết định nội bộ ----------
CREATE FUNCTION core.guard_customer_consent() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE pol smallint;
BEGIN
 IF NEW.method='quyet_dinh_van_hanh' AND NEW.party IN ('buyer','seller') THEN
  SELECT o.policy_version INTO pol FROM core.documents d JOIN core.orders o ON o.id=d.order_id WHERE d.id=NEW.document_id;
  IF pol=23 THEN
   RAISE EXCEPTION 'Quyết định nội bộ không thay chấp thuận của khách hàng; cần chữ ký của chính bên đó' USING HINT='ck_customer_consent'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_customer_consent BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION core.guard_customer_consent();
COMMENT ON FUNCTION core.guard_customer_consent() IS 'Bản 23 + E2: hai người duyệt nội bộ không thay sự chấp thuận cần có của khách. Đơn chính sách 22 giữ đường cũ; chứng từ lịch sử không đổi.';
