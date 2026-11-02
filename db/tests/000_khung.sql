-- Khung kiểm tra: mỗi kiểm tra ghi một dòng vào test.results. Runner in bảng này và trả mã lỗi nếu có dòng hỏng.
-- Chạy được cả bằng psql (db/scripts/test.sh) lẫn PGlite (db/tools/kiem-tra-pglite.mjs).
DROP SCHEMA IF EXISTS test CASCADE;
CREATE SCHEMA test;

CREATE TABLE test.results (
  id     integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name   text    NOT NULL,
  passed boolean NOT NULL,
  detail text
);

CREATE FUNCTION test.check(p_name text, p_ok boolean, p_detail text DEFAULT NULL) RETURNS void
LANGUAGE sql AS $$ INSERT INTO test.results (name, passed, detail) VALUES (p_name, coalesce(p_ok, false), p_detail) $$;

-- Chạy p_sql trong một subtransaction; ĐẠT nếu nó lỗi và (nếu có p_hint) HINT hoặc SQLSTATE khớp.
-- Mọi thay đổi của p_sql bị hoàn lại.
CREATE FUNCTION test.expect_error(p_name text, p_sql text, p_hint text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE v_hint text; v_state text; v_msg text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'T0001', MESSAGE = '__no_error__';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT, v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
  END;
  IF v_state = 'T0001' THEN
    PERFORM test.check(p_name, false, 'không bị chặn');
  ELSIF p_hint IS NULL OR v_hint = p_hint OR v_state = p_hint OR v_msg LIKE '%' || p_hint || '%' THEN
    PERFORM test.check(p_name, true, 'bị chặn: ' || left(v_msg, 120));
  ELSE
    PERFORM test.check(p_name, false, 'lỗi khác mong đợi [' || v_state || '/' || coalesce(v_hint, '') || ']: ' || v_msg);
  END IF;
END $$;

-- Chạy p_sql và mong không lỗi (thay đổi bị hoàn lại).
CREATE FUNCTION test.expect_ok(p_name text, p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE v_msg text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'T0002', MESSAGE = '__rollback__';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
  END;
  PERFORM test.check(p_name, v_msg = '__rollback__', CASE WHEN v_msg <> '__rollback__' THEN v_msg END);
END $$;

-- Ngưỡng 70% (0082): dữ liệu mẫu cũ có giá hạ cấp 15.000/23.000 (65%) và nhiều bộ thử chèn chữ ký người bán trực tiếp.
-- Chỉ trong CSDL thử: tự thêm xác nhận riêng cho chữ ký người bán, trừ khi phiên đặt test.strict_ack='1' để thử chính luật này.
-- Trigger "j_" chạy trước "k_ha_cap_thap" (thứ tự tên). Không nằm trong migration nên không có ở CSDL thật.
CREATE OR REPLACE FUNCTION test.auto_low_ack() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.party='seller' AND coalesce(current_setting('test.strict_ack',true),'')<>'1' AND NOT ('low_downgrade_price_ack'=ANY(coalesce(NEW.statements,'{}'))) THEN
  NEW.statements:=coalesce(NEW.statements,'{}')||'low_downgrade_price_ack'::text; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS j_test_auto_low_ack ON core.signatures;
CREATE TRIGGER j_test_auto_low_ack BEFORE INSERT ON core.signatures FOR EACH ROW EXECUTE FUNCTION test.auto_low_ack();

-- Giá chốt mỗi tuần (0084): bộ thử khung cũ gọi hàng theo giá trong lịch. Chốt sẵn giá tuần của ngày giao = đúng giá lịch khung.
CREATE OR REPLACE FUNCTION test.agree_week_price(p_framework uuid,p_terms jsonb) RETURNS void LANGUAGE plpgsql AS $$
DECLARE f core.framework_contracts%ROWTYPE; u uuid; BEGIN
 SELECT * INTO f FROM core.framework_contracts WHERE id=p_framework;
 SELECT m.user_id INTO u FROM core.memberships m WHERE m.org_id=f.buyer_org_id LIMIT 1;
 INSERT INTO core.framework_week_prices(framework_id,week_start,items,proposed_by_side,proposed_by,answered_by,answered_at,status)
 VALUES(f.id,date_trunc('week',(lower((p_terms->>'delivery_window')::tstzrange) AT TIME ZONE 'Asia/Ho_Chi_Minh'))::date,f.schedule->'items','buyer',u,u,now(),'agreed')
 ON CONFLICT DO NOTHING; END $$;
