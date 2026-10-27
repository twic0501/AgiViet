-- Sửa theo Codex rà commit d37991a (28/10/2026):
-- P1-1 Chính sách đơn: giữ chính sách đã cam kết, không chia theo thời điểm chạy 0059. Đơn đã có quyết toán theo
--      công thức E1 (phiên bản 3), hoặc tạo sau khi 0058 được áp, là đơn chính sách 23.
-- P1-2 Liên lạc khảo sát: cấm phần tử NULL trong danh sách người đến; kiểm quyền mặc định từ chối (IS NOT TRUE).
-- P1-3 Tài khoản đã khóa (users.disabled_at) không đọc được và không bị lộ liên lạc khảo sát.

-- ---------- P1-1 ----------
CREATE FUNCTION core.backfill_order_policy() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer; e1_from timestamptz;
BEGIN
 SELECT applied_at INTO e1_from FROM public.schema_migrations WHERE name LIKE '0058%';
 UPDATE core.orders o SET policy_version=23
  WHERE o.policy_version=22 AND (
   EXISTS(SELECT 1 FROM core.settlements s WHERE s.order_id=o.id AND s.hold_formula_version=3)
   OR (e1_from IS NOT NULL AND o.created_at>=e1_from));
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
COMMENT ON FUNCTION core.backfill_order_policy() IS 'Trả đơn đã cam kết theo E1 (có quyết toán phiên bản 3 hoặc tạo sau 0058) về chính sách 23. Chỉ chủ migration chạy.';
REVOKE ALL ON FUNCTION core.backfill_order_policy() FROM PUBLIC;
SELECT core.backfill_order_policy();

-- Đơn đã có quyết toán phiên bản 3 thì không được mang chính sách 22 (chặn hạ chính sách về sau).
CREATE FUNCTION core.guard_policy_matches_settlement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.policy_version=22 AND EXISTS(SELECT 1 FROM core.settlements WHERE order_id=NEW.id AND hold_formula_version=3) THEN
  RAISE EXCEPTION 'Đơn đã quyết toán theo E1 không hạ về chính sách cũ' USING HINT='ck_policy_committed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER b_policy_committed BEFORE UPDATE OF policy_version ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_policy_matches_settlement();

-- ---------- P1-2 ----------
ALTER TABLE core.survey_visits ADD CONSTRAINT ck_survey_visitors_no_null CHECK(array_position(visitor_user_ids,NULL) IS NULL);

-- ---------- P1-2 + P1-3: viết lại hàm đọc, mặc định từ chối ----------
CREATE OR REPLACE FUNCTION pii.read_survey_contact(p_visit uuid,p_user uuid) RETURNS bytea LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,pii,evt,ref AS $$
DECLARE s core.survey_visits%ROWTYPE; caller uuid:=ref.ctx_user(); caller_org uuid:=ref.ctx_org(); result bytea; ok boolean;
BEGIN
 SELECT * INTO s FROM core.survey_visits WHERE id=p_visit;
 IF s.id IS NULL OR s.seller_consented_at IS NULL OR s.cancelled_at IS NOT NULL OR (ref.clock_at() <@ s.visit_window) IS NOT TRUE THEN
  RAISE EXCEPTION 'Liên lạc khảo sát chưa mở hoặc đã hết hạn' USING HINT='CONTACT_LOCKED'; END IF;
 -- Người gọi: đúng tổ chức của chuyến, thành viên còn hiệu lực, tài khoản không bị khóa.
 ok := caller IS NOT NULL AND caller_org IS NOT NULL AND caller_org IN (s.buyer_org_id,s.seller_org_id)
       AND EXISTS(SELECT 1 FROM core.memberships m JOIN core.users u ON u.id=m.user_id
                  WHERE m.org_id=caller_org AND m.user_id=caller AND m.status='active' AND u.disabled_at IS NULL);
 IF ok IS NOT TRUE THEN RAISE EXCEPTION 'Không thuộc chuyến khảo sát' USING HINT='KHONG_CO_QUYEN'; END IF;
 -- Người được tra số: tài khoản không bị khóa.
 IF EXISTS(SELECT 1 FROM core.users WHERE id=p_user AND disabled_at IS NULL) IS NOT TRUE THEN
  RAISE EXCEPTION 'Tài khoản không còn hiệu lực' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF caller_org=s.buyer_org_id THEN
  ok := (caller = ANY(s.visitor_user_ids)) AND EXISTS(SELECT 1 FROM core.memberships WHERE org_id=s.seller_org_id AND user_id=p_user AND status='active');
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'Chỉ người đến khảo sát đã khai được nhận liên hệ người bán' USING HINT='KHONG_CO_QUYEN'; END IF;
 ELSE
  ok := (p_user = ANY(s.visitor_user_ids));
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'Chỉ liên hệ của người đến đã khai' USING HINT='KHONG_CO_QUYEN'; END IF;
 END IF;
 SELECT phone_enc INTO result FROM pii.user_contacts WHERE user_id=p_user;
 PERFORM evt.audit('pii.read_phone','user',p_user,jsonb_build_object('survey_visit_id',p_visit)); RETURN result;
END $$;
