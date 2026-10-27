-- Bám mô phỏng quy trình bản 23 (khóa 28/10/2026) và lựa chọn của người sáng lập:
-- E1: khi còn tranh chấp, trả đủ phần đã công nhận; khoản đòi thêm ghi "chưa bảo đảm", không giữ lại từ cọc.
-- E2: lệnh tiền ngoại lệ phải có người thứ hai duyệt, là hai NGƯỜI khác nhau (không chỉ hai tài khoản).
-- B1: "Hoàn tất toàn bộ" chỉ khi không còn hồ sơ mở; vẫn quyết toán phần đã công nhận.
-- B2–B4: V1 không tạo mới thương lái, tổ hợp gom, người giúp (giữ dữ liệu cũ, bật lại bằng công tắc).
-- B5: mở liên lạc khi cọc đủ đã được ngân hàng xác nhận; ngoại lệ khảo sát vườn người bán đồng ý, có hạn.
-- Đơn đã ký trước migration này không đổi cách phân bổ tiền: snapshot bản tạm cũ giữ nguyên (hold_formula_version cũ).

-- ---------- Công tắc tính năng ----------
CREATE TABLE ref.feature_flags (
 code text PRIMARY KEY, enabled boolean NOT NULL, note text NOT NULL
);
INSERT INTO ref.feature_flags VALUES
 ('nguoi_giup', false, 'Người giúp nhập liệu / ủy quyền giúp: bỏ từ 27/10/2026 (bản 23)'),
 ('dang_ky_thuong_lai_to_hop_gom', false, 'Đăng ký mới thương lái, tổ hợp gom: ngoài phạm vi V1 (bản 23)');
CREATE FUNCTION ref.flag(p_code text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT enabled FROM ref.feature_flags WHERE code=p_code),false)
$$;
REVOKE ALL ON ref.feature_flags FROM PUBLIC;
COMMENT ON TABLE ref.feature_flags IS 'Công tắc tính năng theo quyết định nghiệp vụ; chỉ chủ migration đổi được.';

-- ---------- E1: không giữ lại tiền thuộc phần đã công nhận ----------
-- Khoản trước đây bị giữ (phí kiểm định bên mua ứng + phạt thiếu lượng của phần tranh chấp) nay là
-- khoản đòi thêm CHƯA BẢO ĐẢM, xử lý riêng. Bản tạm mới dùng hold_formula_version=3, khoản giữ thêm = 0.
ALTER TABLE core.settlements DROP CONSTRAINT settlements_hold_formula_version_check;
ALTER TABLE core.settlements ADD CONSTRAINT settlements_hold_formula_version_check CHECK(hold_formula_version IN (1,2,3));
ALTER TABLE core.settlements ADD CONSTRAINT ck_st_e1_no_hold CHECK(hold_formula_version<>3 OR additional_hold_vnd=0);
CREATE OR REPLACE FUNCTION core.snapshot_dispute_hold() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.hold_formula_version:=3;
 NEW.additional_hold_vnd:=0;
 RETURN NEW;
END $$;
COMMENT ON FUNCTION core.dispute_additional_hold(uuid) IS 'Bản 23 (E1): số tiền BÊN BÁN có thể bị đòi thêm từ tranh chấp đang mở (phí kiểm định bên mua ứng + phạt thiếu lượng). Không còn trừ vào tiền đã công nhận; xem core.v_unsecured_claims.';

CREATE VIEW core.v_unsecured_claims AS
 SELECT d.order_id, d.id AS dispute_id, d.claim_kind,
  coalesce((SELECT sum(i.fee_vnd) FROM core.inspections i WHERE i.dispute_id=d.id AND i.prepaid_by_org_id=o.buyer_org_id),0) AS inspection_fee_vnd,
  CASE WHEN d.claim_kind='shortfall' THEN coalesce(ref.div_round(v.deposit_vnd::numeric*d.disputed_qty*
   (SELECT max(bps) FROM unnest(v.shortfall_penalty_bps) bps),v.qty_min::numeric*10000),0) ELSE 0 END AS penalty_vnd,
  'chưa bảo đảm'::text AS security_status
 FROM core.disputes d JOIN core.orders o ON o.id=d.order_id
 JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no
 WHERE d.status<>'resolved';
COMMENT ON VIEW core.v_unsecured_claims IS 'Khoản đòi thêm từ tranh chấp đang mở: chưa được bảo đảm bằng cọc. Muốn bảo đảm thì cần khoản bổ sung hai bên chấp thuận.';
REVOKE ALL ON core.v_unsecured_claims FROM PUBLIC;

-- ---------- E2: người duyệt phải là người khác thật ----------
-- Hai tài khoản trùng giấy tờ tùy thân (cùng hash) bị coi là một người.
CREATE FUNCTION ops.guard_distinct_person() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pii,ops AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM pii.identity_documents a JOIN pii.identity_documents b ON a.number_hash=b.number_hash AND a.doc_type=b.doc_type
           WHERE a.doc_type IN ('cccd','passport') AND a.user_id=NEW.proposed_by AND b.user_id=NEW.approved_by) THEN
  RAISE EXCEPTION 'Người duyệt trùng người đề xuất (cùng giấy tờ tùy thân)' USING HINT='KHONG_CO_QUYEN'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_distinct_person BEFORE INSERT ON ops.decisions FOR EACH ROW EXECUTE FUNCTION ops.guard_distinct_person();

-- ---------- B1: hồ sơ còn mở theo đơn ----------
CREATE FUNCTION core.open_dossiers(p_order uuid) RETURNS TABLE(kind text, ref_id uuid, note text)
LANGUAGE sql STABLE AS $$
 SELECT 'tranh_chap', id, 'Tranh chấp chưa có kết quả' FROM core.disputes WHERE order_id=p_order AND status<>'resolved'
 UNION ALL
 SELECT 'tien_truc_tiep', id, 'Khoản trả trực tiếp chưa nhận đủ (' || status || ')' FROM core.direct_payments
  WHERE order_id=p_order AND status NOT IN ('fully_received','cancelled')
 UNION ALL
 SELECT 'lenh_ngan_hang', id, 'Lệnh ngân hàng chưa có kết quả cuối (' || status || ')' FROM core.bank_instructions
  WHERE order_id=p_order AND status IN ('created','sent','processing','succeeded')
 UNION ALL
 SELECT 'hang_tra_lai', lot_id, 'Hàng trả lại chưa xử lý: ' || qty || ' g' FROM ledger.qty_balances
  WHERE order_key=p_order AND bucket='returned_pending' AND qty>0
$$;
COMMENT ON FUNCTION core.open_dossiers(uuid) IS 'Bản 23: danh sách hồ sơ còn mở của đơn; rỗng mới được Hoàn tất toàn bộ.';

CREATE OR REPLACE FUNCTION cmd.finish_order(p_order uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE o core.orders%ROWTYPE;
BEGIN
 PERFORM cmd.require_system(); SELECT * INTO o FROM core.orders WHERE id=p_order FOR UPDATE;
 IF o.status='completed' THEN RETURN o.status; END IF;
 IF EXISTS(SELECT 1 FROM core.open_dossiers(o.id)) THEN
  IF o.status='awaiting_settlement' THEN UPDATE core.orders SET status='outstanding' WHERE id=o.id; END IF;
  RETURN 'outstanding';
 END IF;
 UPDATE core.orders SET status='completed' WHERE id=o.id;
 RETURN 'completed';
END $$;

-- Không cho đơn sang "completed" bằng đường khác khi còn hồ sơ mở.
CREATE FUNCTION core.guard_order_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.status='completed' AND OLD.status<>'completed' AND EXISTS(SELECT 1 FROM core.open_dossiers(NEW.id)) THEN
  RAISE EXCEPTION 'Còn hồ sơ mở, chưa thể Hoàn tất toàn bộ' USING HINT='ck_open_dossiers'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_open_dossiers BEFORE UPDATE OF status ON core.orders FOR EACH ROW EXECUTE FUNCTION core.guard_order_completion();

-- ---------- B2–B4: không tạo mới thương lái, tổ hợp gom, người giúp ----------
CREATE FUNCTION core.guard_org_kind_v1() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.kind IN ('trader','coop_group') AND NOT ref.flag('dang_ky_thuong_lai_to_hop_gom') AND coalesce(current_setting('app.nap_du_lieu_cu',true),'')<>'on' THEN
  RAISE EXCEPTION 'V1 chỉ nhận người sản xuất trực tiếp và bên mua doanh nghiệp' USING HINT='ck_command_payload'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_org_kind_v1 BEFORE INSERT ON core.organizations FOR EACH ROW EXECUTE FUNCTION core.guard_org_kind_v1();

CREATE FUNCTION core.guard_delegation_v1() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT ref.flag('nguoi_giup') AND coalesce(current_setting('app.nap_du_lieu_cu',true),'')<>'on' THEN
  RAISE EXCEPTION 'Đã bỏ vai người giúp (bản 23)' USING HINT='ck_command_payload'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_delegation_v1 BEFORE INSERT ON core.delegations FOR EACH ROW EXECUTE FUNCTION core.guard_delegation_v1();

UPDATE ref.roles SET label_vi=label_vi || ' — không dùng cho tạo mới ở V1' WHERE code IN ('collection_staff');

-- ---------- B5: mở liên lạc ----------
CREATE OR REPLACE FUNCTION core.refresh_contact_grant() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE o core.orders%ROWTYPE;
BEGIN
 IF NEW.status<>'active' THEN RETURN NEW; END IF;
 SELECT * INTO o FROM core.orders WHERE id=NEW.id;
 -- Cọc đủ đã được ngân hàng xác nhận (held trở đi), hoặc đơn thuộc hợp đồng khung đã có bảo đảm.
 IF o.framework_id IS NULL AND NOT EXISTS(SELECT 1 FROM core.deposits WHERE order_id=o.id AND status IN ('held','processing','fully_processed')) THEN RETURN NEW; END IF;
 INSERT INTO core.contact_grants(order_id,buyer_org_id,seller_org_id,mode) VALUES(o.id,o.buyer_org_id,o.seller_org_id,'full')
 ON CONFLICT(order_id) DO NOTHING; RETURN NEW;
END $$;

CREATE TABLE core.survey_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lot_id uuid NOT NULL REFERENCES core.lots, buyer_org_id uuid NOT NULL REFERENCES core.organizations,
 seller_org_id uuid NOT NULL REFERENCES core.organizations,
 visitor_user_ids uuid[] NOT NULL CHECK(cardinality(visitor_user_ids) BETWEEN 1 AND 5),
 visit_window tstzrange NOT NULL CHECK(NOT isempty(visit_window) AND NOT upper_inf(visit_window) AND upper(visit_window)-lower(visit_window)<=interval '2 days'),
 requested_by uuid NOT NULL REFERENCES core.users, requested_at timestamptz NOT NULL DEFAULT now(),
 seller_consented_by uuid REFERENCES core.users, seller_consented_at timestamptz,
 cancelled_at timestamptz,
 CHECK((seller_consented_by IS NULL)=(seller_consented_at IS NULL))
);
ALTER TABLE core.survey_visits ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.survey_visits IS 'Khảo sát vườn trước hợp đồng: không cọc, không giữ lượng. Liên lạc chỉ mở cho đúng chuyến, trong khung giờ, sau khi người bán đồng ý.';

CREATE FUNCTION pii.read_survey_contact(p_visit uuid,p_user uuid) RETURNS bytea LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,pii,evt,ref AS $$
DECLARE s core.survey_visits%ROWTYPE; other_org uuid; result bytea;
BEGIN
 SELECT * INTO s FROM core.survey_visits WHERE id=p_visit;
 IF s.id IS NULL OR s.seller_consented_at IS NULL OR s.cancelled_at IS NOT NULL
  OR NOT (ref.clock_at() >= lower(s.visit_window)-interval '1 day' AND ref.clock_at() < upper(s.visit_window))
  OR NOT (core.can_access_org(s.buyer_org_id) OR core.can_access_org(s.seller_org_id)) THEN
  RAISE EXCEPTION 'Liên lạc khảo sát chưa mở hoặc đã hết hạn' USING HINT='CONTACT_LOCKED'; END IF;
 other_org:=CASE WHEN ref.ctx_org()=s.buyer_org_id THEN s.seller_org_id ELSE s.buyer_org_id END;
 IF other_org=s.buyer_org_id AND NOT p_user=ANY(s.visitor_user_ids) THEN RAISE EXCEPTION 'Chỉ người đến khảo sát đã khai' USING HINT='KHONG_CO_QUYEN'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.memberships WHERE org_id=other_org AND user_id=p_user AND status='active') THEN RAISE EXCEPTION 'Không phải liên hệ của chuyến khảo sát' USING HINT='KHONG_CO_QUYEN'; END IF;
 SELECT phone_enc INTO result FROM pii.user_contacts WHERE user_id=p_user;
 PERFORM evt.audit('pii.read_phone','user',p_user,jsonb_build_object('survey_visit_id',p_visit)); RETURN result;
END $$;
REVOKE ALL ON FUNCTION pii.read_survey_contact(uuid,uuid) FROM PUBLIC;

-- Chú thích cột (bộ kiểm yêu cầu mọi cột nghiệp vụ có COMMENT).
COMMENT ON COLUMN ref.feature_flags.code IS 'Mã công tắc';
COMMENT ON COLUMN ref.feature_flags.enabled IS 'Bật/tắt';
COMMENT ON COLUMN ref.feature_flags.note IS 'Lý do và căn cứ quyết định';
COMMENT ON COLUMN core.survey_visits.id IS 'Mã chuyến khảo sát';
COMMENT ON COLUMN core.survey_visits.lot_id IS 'Lô được xem';
COMMENT ON COLUMN core.survey_visits.buyer_org_id IS 'Bên mua xin khảo sát';
COMMENT ON COLUMN core.survey_visits.seller_org_id IS 'Người bán sở hữu lô';
COMMENT ON COLUMN core.survey_visits.visitor_user_ids IS 'Người đến đã khai (tối đa 5); chỉ những người này được nhận số liên hệ';
COMMENT ON COLUMN core.survey_visits.visit_window IS 'Khung giờ khảo sát, tối đa 2 ngày; liên lạc mở từ 1 ngày trước tới hết khung';
COMMENT ON COLUMN core.survey_visits.requested_by IS 'Người lập yêu cầu';
COMMENT ON COLUMN core.survey_visits.requested_at IS 'Lúc lập yêu cầu';
COMMENT ON COLUMN core.survey_visits.seller_consented_by IS 'Người bán đồng ý (bắt buộc trước khi mở liên lạc)';
COMMENT ON COLUMN core.survey_visits.seller_consented_at IS 'Lúc người bán đồng ý';
COMMENT ON COLUMN core.survey_visits.cancelled_at IS 'Hủy chuyến; liên lạc đóng ngay';
