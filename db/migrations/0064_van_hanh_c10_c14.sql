-- Bản 23 · vận hành C10–C14 (C13 đã có ở giữ lượng/lời chào; C15 trang nhân viên để sau theo người sáng lập).

-- ---------- C10: giữ hàng tại chỗ có giới hạn ----------
CREATE TABLE core.product_hold_limits (
 product_id uuid PRIMARY KEY REFERENCES core.products, max_hold_hours integer NOT NULL CHECK(max_hold_hours BETWEEN 1 AND 240),
 check_every_hours integer NOT NULL CHECK(check_every_hours BETWEEN 1 AND 24), decide_before_hours integer NOT NULL CHECK(decide_before_hours>=0),
 note text NOT NULL, CHECK(decide_before_hours<max_hold_hours)
);
COMMENT ON TABLE core.product_hold_limits IS 'Thông số giữ hàng tại chỗ theo mặt hàng (minh họa, xác nhận trước pilot). Mặt hàng không có dòng: KHÔNG được giữ tại chỗ.';
COMMENT ON COLUMN core.product_hold_limits.product_id IS 'Mặt hàng';
COMMENT ON COLUMN core.product_hold_limits.max_hold_hours IS 'Giữ tối đa (giờ)';
COMMENT ON COLUMN core.product_hold_limits.check_every_hours IS 'Kiểm tình trạng mỗi N giờ';
COMMENT ON COLUMN core.product_hold_limits.decide_before_hours IS 'Hai bên quyết trước khi hết giữ bao nhiêu giờ';
COMMENT ON COLUMN core.product_hold_limits.note IS 'Điều kiện bảo quản';
CREATE TABLE core.hold_in_place (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES core.orders,
 started_at timestamptz NOT NULL, max_until timestamptz NOT NULL, decide_by timestamptz NOT NULL,
 checker_user_id uuid NOT NULL REFERENCES core.users, last_check_at timestamptz,
 default_plan text NOT NULL CHECK(length(btrim(default_plan))>0), max_cost_vnd bigint NOT NULL CHECK(max_cost_vnd>=0),
 ended_at timestamptz, outcome text CHECK(outcome IN ('hai_ben_chon','phuong_an_mac_dinh','huy')),
 CHECK(decide_by<=max_until AND max_until>started_at), CHECK((ended_at IS NULL)=(outcome IS NULL))
);
ALTER TABLE core.hold_in_place ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.hold_in_place IS 'Bản 23: giữ hàng tại chỗ khi chưa có xe/kho: có hạn theo mặt hàng, người kiểm, hạn quyết định; hết hạn chỉ chạy phương án đã ủy quyền trước trong mức chi đã duyệt.';
COMMENT ON COLUMN core.hold_in_place.id IS 'Mã';
COMMENT ON COLUMN core.hold_in_place.order_id IS 'Đơn';
COMMENT ON COLUMN core.hold_in_place.started_at IS 'Bắt đầu giữ';
COMMENT ON COLUMN core.hold_in_place.max_until IS 'Giữ tối đa tới';
COMMENT ON COLUMN core.hold_in_place.decide_by IS 'Hạn hai bên quyết';
COMMENT ON COLUMN core.hold_in_place.checker_user_id IS 'Người kiểm tình trạng hàng';
COMMENT ON COLUMN core.hold_in_place.last_check_at IS 'Lần kiểm gần nhất';
COMMENT ON COLUMN core.hold_in_place.default_plan IS 'Phương án đã ủy quyền trước trong hợp đồng';
COMMENT ON COLUMN core.hold_in_place.max_cost_vnd IS 'Mức chi tối đa đã duyệt cho phương án mặc định';
COMMENT ON COLUMN core.hold_in_place.ended_at IS 'Kết thúc giữ';
COMMENT ON COLUMN core.hold_in_place.outcome IS 'hai_ben_chon / phuong_an_mac_dinh / huy';
CREATE FUNCTION cmd.start_hold_in_place(p_order uuid,p_checker uuid,p_default_plan text,p_max_cost bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$
DECLARE lim core.product_hold_limits%ROWTYPE; result uuid;
BEGIN
 PERFORM cmd.require_staff(ARRAY['dispatcher','supervisor','support']);
 SELECT l.* INTO lim FROM core.orders o JOIN core.product_hold_limits l ON l.product_id=o.product_id WHERE o.id=p_order;
 IF lim.product_id IS NULL THEN RAISE EXCEPTION 'Mặt hàng không giữ được tại chỗ' USING HINT='ck_hold_not_allowed'; END IF;
 INSERT INTO core.hold_in_place(order_id,started_at,max_until,decide_by,checker_user_id,default_plan,max_cost_vnd)
 VALUES(p_order,ref.clock_at(),ref.clock_at()+make_interval(hours=>lim.max_hold_hours),ref.clock_at()+make_interval(hours=>lim.max_hold_hours-lim.decide_before_hours),p_checker,p_default_plan,coalesce(p_max_cost,0))
 RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION cmd.expire_hold_in_place() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cmd,core,ref,public AS $$ DECLARE n integer; BEGIN
 PERFORM cmd.require_system();
 UPDATE core.hold_in_place SET ended_at=ref.clock_at(),outcome='phuong_an_mac_dinh' WHERE ended_at IS NULL AND ref.clock_at()>=max_until;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;

-- ---------- C11: sự cố mẫu ----------
CREATE TABLE core.sample_incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sample_id uuid NOT NULL REFERENCES core.sealed_samples,
 kind text NOT NULL CHECK(kind IN ('mat_niem','hong','that_lac')), found_at timestamptz NOT NULL,
 reported_by uuid NOT NULL REFERENCES core.users, evidence_document_id uuid REFERENCES core.documents,
 redo_cost_vnd bigint NOT NULL DEFAULT 0 CHECK(redo_cost_vnd>=0), advanced_by_org_id uuid REFERENCES core.organizations,
 responsible text NOT NULL DEFAULT 'cho_xu_ly' CHECK(responsible IN ('cho_xu_ly','doi_tac','ben_mua','nguoi_ban','agiviet')),
 decision_id uuid REFERENCES ops.decisions,
 CHECK(responsible='cho_xu_ly' OR decision_id IS NOT NULL)
);
ALTER TABLE core.sample_incidents ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.sample_incidents IS 'Bản 23: mẫu mất niêm/hỏng/thất lạc là mẫu KHÔNG HỢP LỆ; bên đặt gửi mẫu ứng chi phí làm lại; trách nhiệm xác định bằng quyết định, chưa rõ thì chờ xử lý. Không dùng quy tắc "kết quả trái nhau".';
COMMENT ON COLUMN core.sample_incidents.id IS 'Mã';
COMMENT ON COLUMN core.sample_incidents.sample_id IS 'Mẫu';
COMMENT ON COLUMN core.sample_incidents.kind IS 'mat_niem / hong / that_lac';
COMMENT ON COLUMN core.sample_incidents.found_at IS 'Lúc phát hiện';
COMMENT ON COLUMN core.sample_incidents.reported_by IS 'Người báo';
COMMENT ON COLUMN core.sample_incidents.evidence_document_id IS 'Biên bản, ảnh niêm';
COMMENT ON COLUMN core.sample_incidents.redo_cost_vnd IS 'Chi phí lấy/gửi lại mẫu';
COMMENT ON COLUMN core.sample_incidents.advanced_by_org_id IS 'Bên ứng chi phí làm lại';
COMMENT ON COLUMN core.sample_incidents.responsible IS 'Bên chịu cuối (cho_xu_ly khi chưa xác minh)';
COMMENT ON COLUMN core.sample_incidents.decision_id IS 'Quyết định hai người xác định bên chịu';
CREATE VIEW core.v_sample_validity AS
 SELECT s.id AS sample_id, s.code, NOT EXISTS(SELECT 1 FROM core.sample_incidents i WHERE i.sample_id=s.id) AS hop_le
 FROM core.sealed_samples s;
COMMENT ON VIEW core.v_sample_validity IS 'Mẫu có sự cố thì không dùng làm căn cứ kết luận.';
REVOKE ALL ON core.v_sample_validity FROM PUBLIC;
-- Kết quả kiểm định dựa trên mẫu có sự cố bị chặn.
CREATE FUNCTION core.guard_result_sample_valid() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM core.inspections i JOIN core.sample_incidents x ON x.sample_id=i.sample_id WHERE i.id=NEW.inspection_id) THEN
  RAISE EXCEPTION 'Mẫu có sự cố (mất niêm/hỏng/thất lạc): không dùng làm căn cứ' USING HINT='ck_sample_invalid'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_sample_valid BEFORE INSERT ON core.inspection_results FOR EACH ROW EXECUTE FUNCTION core.guard_result_sample_valid();

-- ---------- C12: lỗi do AgiViet, AgiViet chịu ----------
CREATE TABLE core.platform_liabilities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES core.orders,
 kind text NOT NULL CHECK(kind IN ('dat_nham_dich_vu','bo_sot_canh_bao','doi_soat_sai','khac')),
 amount_vnd bigint NOT NULL CHECK(amount_vnd>=0), payee_org_id uuid NOT NULL REFERENCES core.organizations,
 reason text NOT NULL CHECK(length(btrim(reason))>0), decision_id uuid NOT NULL REFERENCES ops.decisions,
 prevention_note text, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE core.platform_liabilities ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE core.platform_liabilities IS 'Bản 23: lỗi do chính AgiViet (đặt nhầm xe, bỏ sót cảnh báo, đối soát sai): AgiViet chịu, quyết định hai người, ghi biện pháp ngăn lặp lại. Việc trễ do lỗi này không tính vi phạm cho bên nào.';
COMMENT ON COLUMN core.platform_liabilities.id IS 'Mã';
COMMENT ON COLUMN core.platform_liabilities.order_id IS 'Đơn';
COMMENT ON COLUMN core.platform_liabilities.kind IS 'Loại lỗi';
COMMENT ON COLUMN core.platform_liabilities.amount_vnd IS 'Số AgiViet chịu/bồi hoàn';
COMMENT ON COLUMN core.platform_liabilities.payee_org_id IS 'Bên được bồi hoàn';
COMMENT ON COLUMN core.platform_liabilities.reason IS 'Diễn giải';
COMMENT ON COLUMN core.platform_liabilities.decision_id IS 'Quyết định hai người';
COMMENT ON COLUMN core.platform_liabilities.prevention_note IS 'Biện pháp ngăn lặp lại';
COMMENT ON COLUMN core.platform_liabilities.paid_at IS 'Lúc đã trả';
COMMENT ON COLUMN core.platform_liabilities.created_at IS 'Lúc ghi';
CREATE FUNCTION core.guard_platform_liability() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE q ops.decisions%ROWTYPE; BEGIN
 SELECT * INTO q FROM ops.decisions WHERE id=NEW.decision_id;
 IF q.id IS NULL OR q.proposed_by=q.approved_by THEN RAISE EXCEPTION 'Cần quyết định hai người' USING HINT='ck_decision_two_people'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_platform_liability BEFORE INSERT ON core.platform_liabilities FOR EACH ROW EXECUTE FUNCTION core.guard_platform_liability();

-- Hồ sơ mở: thêm bồi hoàn AgiViet chưa trả, sự cố mẫu chưa xác định bên chịu, giữ hàng tại chỗ đang diễn ra.
CREATE OR REPLACE FUNCTION core.open_dossiers(p_order uuid) RETURNS TABLE(kind text, ref_id uuid, note text)
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
 UNION ALL
 SELECT 'phi_kiem_dinh', inspection_id, 'Hồ sơ phí kiểm định: ' || trang_thai FROM core.v_fee_dossier
  WHERE order_id=p_order AND trang_thai NOT IN ('đã xong','còn thiếu hoàn')
 UNION ALL
 SELECT 'kiem_sau_giao', id, 'Tiêu chí kiểm sau giao chưa có kết quả: ' || criterion FROM core.deferred_checks
  WHERE order_id=p_order AND result IS NULL
 UNION ALL
 SELECT 'doi_soat_coc', id, 'Đang chờ đối soát cọc' FROM core.deposit_reconciliations
  WHERE order_id=p_order AND closed_at IS NULL
 UNION ALL
 SELECT 'agiviet_boi_hoan', id, 'AgiViet chưa trả bồi hoàn: ' || amount_vnd || ' đ' FROM core.platform_liabilities
  WHERE order_id=p_order AND paid_at IS NULL AND amount_vnd>0
 UNION ALL
 SELECT 'su_co_mau', x.id, 'Sự cố mẫu chưa xác định bên chịu' FROM core.sample_incidents x
  JOIN core.sealed_samples s ON s.id=x.sample_id JOIN core.deliveries d ON d.id=s.delivery_id
  WHERE d.order_id=p_order AND x.responsible='cho_xu_ly'
 UNION ALL
 SELECT 'giu_tai_cho', id, 'Đang giữ hàng tại chỗ, hạn quyết định ' || to_char(decide_by,'HH24:MI DD/MM') FROM core.hold_in_place
  WHERE order_id=p_order AND ended_at IS NULL
$$;

-- ---------- C14: chi phí phục vụ (Q24) ----------
ALTER TABLE ops.work_logs ADD COLUMN order_id uuid REFERENCES core.orders;
ALTER TABLE ops.work_logs ADD COLUMN sourcing_agreement_id uuid REFERENCES core.sourcing_agreements;
ALTER TABLE ops.work_logs ADD COLUMN shared boolean NOT NULL DEFAULT false;
ALTER TABLE ops.work_logs ADD COLUMN cost_per_hour_vnd bigint NOT NULL DEFAULT 60000 CHECK(cost_per_hour_vnd>=0);
COMMENT ON COLUMN ops.work_logs.order_id IS 'Đơn được phục vụ (theo giao dịch)';
COMMENT ON COLUMN ops.work_logs.sourcing_agreement_id IS 'Khách định kỳ được phục vụ (theo tháng)';
COMMENT ON COLUMN ops.work_logs.shared IS 'Chi phí dùng chung (ca trực) — phân bổ, không tính trọn cho một đơn';
COMMENT ON COLUMN ops.work_logs.cost_per_hour_vnd IS 'Chi phí 1 giờ công (giả định 60.000 đ, chờ số pilot)';
CREATE VIEW ops.v_service_cost AS
 SELECT o.id AS order_id, o.code,
  coalesce(sum(ref.div_round(w.minutes::numeric*w.cost_per_hour_vnd,60)) FILTER (WHERE NOT w.shared),0) AS direct_labor_vnd,
  coalesce(sum(w.outside_cost_vnd) FILTER (WHERE NOT w.subsidized),0) AS outside_cost_vnd,
  coalesce((SELECT sum(amount_vnd) FROM core.platform_liabilities p WHERE p.order_id=o.id),0) AS platform_liability_vnd,
  coalesce(v.fee_vnd,0) AS fee_vnd
 FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no
 LEFT JOIN ops.work_logs w ON w.order_id=o.id GROUP BY o.id,v.fee_vnd;
COMMENT ON VIEW ops.v_service_cost IS 'Q24 (phương pháp, chờ duyệt): chi phí trực tiếp của đơn = công không dùng chung + chi ngoài AgiViet chịu + bồi hoàn do lỗi AgiViet; so với phí được hưởng. Chi phí dùng chung (ca trực) phân bổ riêng; phí đối tác khách trả thẳng không tính.';
REVOKE ALL ON ops.v_service_cost FROM PUBLIC;

REVOKE ALL ON FUNCTION cmd.start_hold_in_place(uuid,uuid,text,bigint),cmd.expire_hold_in_place() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cmd.start_hold_in_place(uuid,uuid,text,bigint) TO agiviet_app;
GRANT EXECUTE ON FUNCTION cmd.expire_hold_in_place() TO agiviet_orchestrator;
-- Q24: ghi công có thể theo đơn hoặc khách định kỳ, không bắt buộc gắn việc; phải gắn ít nhất một đối tượng.
ALTER TABLE ops.work_logs ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE ops.work_logs ADD CONSTRAINT ck_work_log_target CHECK(task_id IS NOT NULL OR order_id IS NOT NULL OR sourcing_agreement_id IS NOT NULL);
