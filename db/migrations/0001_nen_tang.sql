-- =====================================================================
-- 0001 · Nền tảng: extension, schema, hàm dùng chung, máy trạng thái,
--        event log, outbox, idempotency, webhook đầu vào.
-- Chạy trên DB trống. Mọi migration bọc trong một giao dịch (do runner).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_bytes cho token QR, digest khi cần
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- exclusion constraint trộn = và && (xe, kho, khung giờ)

CREATE SCHEMA IF NOT EXISTS ref;    -- bảng tham chiếu cố định
CREATE SCHEMA IF NOT EXISTS core;   -- nghiệp vụ chính
CREATE SCHEMA IF NOT EXISTS ledger; -- sổ cái tiền, sổ lượng
CREATE SCHEMA IF NOT EXISTS pii;    -- dữ liệu cá nhân nhạy cảm
CREATE SCHEMA IF NOT EXISTS ops;    -- vận hành: hàng đợi việc, SLA, cờ bất thường
CREATE SCHEMA IF NOT EXISTS evt;    -- lịch sử trạng thái, event log, outbox, idempotency, webhook
CREATE SCHEMA IF NOT EXISTS mkt;    -- giá tham khảo, điểm phù hợp

COMMENT ON SCHEMA ref    IS 'Bảng tham chiếu: trạng thái, chuyển hợp lệ, loại bút toán. Chỉ đổi bằng migration.';
COMMENT ON SCHEMA core   IS 'Thực thể nghiệp vụ: tổ chức, lô, nhu cầu, đơn, hợp đồng, giao nhận.';
COMMENT ON SCHEMA ledger IS 'Sổ cái kép tiền (VND) và sổ lượng lô. Append-only.';
COMMENT ON SCHEMA pii    IS 'Dữ liệu cá nhân nhạy cảm, mã hóa ở tầng ứng dụng; chỉ đọc qua hàm có ghi log.';
COMMENT ON SCHEMA ops    IS 'Nhân viên vận hành, hàng đợi việc thủ công, SLA, cờ bất thường.';
COMMENT ON SCHEMA evt    IS 'Lịch sử chuyển trạng thái, event log, outbox, khóa idempotency, webhook ngân hàng.';
COMMENT ON SCHEMA mkt    IS 'Dữ liệu thị trường suy ra: giá tham khảo, điểm phù hợp.';

-- ---------------------------------------------------------------------
-- Ngữ cảnh phiên: backend đặt bằng SET LOCAL trong mỗi giao dịch.
--   app.user_id     uuid người thao tác (NULL = hệ thống)
--   app.org_id      uuid tổ chức đang đại diện
--   app.actor_kind  vai trong thao tác: buyer, seller, ops, field, inspector, bank, system, helper
--   app.request_id  mã yêu cầu để truy vết
--   app.reason      lý do (bắt buộc với một số chuyển trạng thái)
-- ---------------------------------------------------------------------
CREATE FUNCTION ref.ctx(p_key text) RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.' || p_key, true), '') $$;

CREATE FUNCTION ref.ctx_user() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT ref.ctx('user_id')::uuid $$;

CREATE FUNCTION ref.ctx_org() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT ref.ctx('org_id')::uuid $$;

CREATE FUNCTION ref.ctx_actor() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT coalesce(ref.ctx('actor_kind'), 'unknown') $$;

-- updated_at + version tự động (optimistic locking: backend gửi version cũ trong WHERE).
CREATE FUNCTION ref.touch_row() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END $$;

-- Chặn sửa/xóa: dùng cho bảng append-only (bút toán, chữ ký, lịch sử, bằng chứng).
CREATE FUNCTION ref.forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Bảng % là append-only: không được % (sửa bằng bản ghi điều chỉnh)', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'P0001', HINT = 'ck_append_only';
END $$;

-- Làm tròn nửa lên cho phép chia số nguyên không âm (tiền dòng = lượng * đơn giá / đơn vị giá).
CREATE FUNCTION ref.div_round(p_num numeric, p_den numeric) RETURNS bigint
LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT round(p_num / p_den)::bigint $$;
COMMENT ON FUNCTION ref.div_round IS 'round() của numeric là nửa ra xa 0 (half away from zero) – quy tắc làm tròn tiền VND của AgiViet.';

-- ---------------------------------------------------------------------
-- Máy trạng thái lưu ở DB
-- ---------------------------------------------------------------------
CREATE TABLE ref.statuses (
  entity       text    NOT NULL,           -- 'order', 'lot', 'contract', ...
  code         text    NOT NULL,           -- mã máy: 'awaiting_deposit'
  label_vi     text    NOT NULL,           -- nhãn trung lập cho vận hành/báo cáo
  is_initial   boolean NOT NULL DEFAULT false,
  is_terminal  boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL DEFAULT 0,
  spec_code    text,                       -- mã trạng thái trong đặc tả nghiệp vụ (tiếng Việt), để backend đối chiếu
  PRIMARY KEY (entity, code)
);
COMMENT ON TABLE ref.statuses IS 'Danh sách trạng thái hợp lệ cho từng loại thực thể.';

CREATE TABLE ref.state_transitions (
  entity          text    NOT NULL,
  from_status     text    NOT NULL,
  to_status       text    NOT NULL,
  actor_kinds     text[],                  -- NULL = mọi vai; ngược lại vai (app.actor_kind) phải thuộc danh sách
  requires_reason boolean NOT NULL DEFAULT false,
  note_vi         text,
  PRIMARY KEY (entity, from_status, to_status),
  FOREIGN KEY (entity, from_status) REFERENCES ref.statuses (entity, code),
  FOREIGN KEY (entity, to_status)   REFERENCES ref.statuses (entity, code),
  CONSTRAINT ck_transition_not_self CHECK (from_status <> to_status)
);
COMMENT ON TABLE ref.state_transitions IS 'Bảng chuyển trạng thái cho phép. Trigger evt.guard_status() chặn mọi chuyển khác.';

CREATE TABLE evt.state_history (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity        text        NOT NULL,
  entity_id     uuid        NOT NULL,
  from_status   text,                      -- NULL khi tạo mới
  to_status     text        NOT NULL,
  actor_user_id uuid,
  actor_org_id  uuid,
  actor_kind    text        NOT NULL,
  reason        text,
  request_id    text,
  at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE evt.state_history IS 'Lịch sử chuyển trạng thái của mọi thực thể: ai, khi nào, từ, tới, lý do. Append-only.';
CREATE INDEX ix_state_history_entity ON evt.state_history (entity, entity_id, at);
CREATE TRIGGER tg_state_history_append_only BEFORE UPDATE OR DELETE ON evt.state_history
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

-- Trigger chung: TG_ARGV[0] = tên entity trong ref.statuses.
-- INSERT: trạng thái phải là trạng thái khởi đầu (is_initial) hoặc có app.allow_any_initial='on' (chỉ cho seed/migration dữ liệu).
-- UPDATE: nếu status đổi thì cặp (cũ, mới) phải có trong ref.state_transitions và vai phải được phép.
CREATE FUNCTION evt.guard_status() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_entity text := TG_ARGV[0];
  v_actor  text := ref.ctx_actor();
  v_reason text := ref.ctx('reason');
  v_tr     ref.state_transitions%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM ref.statuses s WHERE s.entity = v_entity AND s.code = NEW.status
                   AND (s.is_initial OR ref.ctx('allow_any_initial') = 'on')) THEN
      RAISE EXCEPTION 'Trạng thái khởi tạo không hợp lệ cho %: %', v_entity, NEW.status
        USING ERRCODE = 'P0001', HINT = 'ck_status_initial';
    END IF;
    INSERT INTO evt.state_history (entity, entity_id, from_status, to_status, actor_user_id, actor_org_id, actor_kind, reason, request_id)
    VALUES (v_entity, NEW.id, NULL, NEW.status, ref.ctx_user(), ref.ctx_org(), v_actor, v_reason, ref.ctx('request_id'));
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_tr FROM ref.state_transitions t
   WHERE t.entity = v_entity AND t.from_status = OLD.status AND t.to_status = NEW.status;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không được chuyển % từ "%" sang "%"', v_entity, OLD.status, NEW.status
      USING ERRCODE = 'P0001', HINT = 'ck_status_transition';
  END IF;
  IF v_tr.actor_kinds IS NOT NULL AND NOT (v_actor = ANY (v_tr.actor_kinds)) THEN
    RAISE EXCEPTION 'Vai "%" không được chuyển % từ "%" sang "%"', v_actor, v_entity, OLD.status, NEW.status
      USING ERRCODE = 'P0001', HINT = 'ck_status_actor';
  END IF;
  IF v_tr.requires_reason AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Chuyển % sang "%" cần lý do (app.reason)', v_entity, NEW.status
      USING ERRCODE = 'P0001', HINT = 'ck_status_reason';
  END IF;

  INSERT INTO evt.state_history (entity, entity_id, from_status, to_status, actor_user_id, actor_org_id, actor_kind, reason, request_id)
  VALUES (v_entity, NEW.id, OLD.status, NEW.status, ref.ctx_user(), ref.ctx_org(), v_actor, v_reason, ref.ctx('request_id'));
  NEW.status_changed_at := now();
  RETURN NEW;
END $$;
COMMENT ON FUNCTION evt.guard_status IS 'Cưỡng chế máy trạng thái ở DB và ghi lịch sử. Bảng dùng trigger này phải có cột id, status, status_changed_at.';

-- ---------------------------------------------------------------------
-- Event log nghiệp vụ + outbox
-- ---------------------------------------------------------------------
CREATE TABLE evt.domain_events (
  seq            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- thứ tự toàn cục
  id             uuid        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  aggregate_type text        NOT NULL,            -- 'order', 'lot', 'contract', ...
  aggregate_id   uuid        NOT NULL,
  event_type     text        NOT NULL,            -- 'order.deposit_confirmed'
  payload        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id  uuid,
  actor_org_id   uuid,
  request_id     text,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_event_type_format CHECK (event_type ~ '^[a-z_]+\.[a-z_]+$')
);
COMMENT ON TABLE evt.domain_events IS 'Sự kiện nghiệp vụ đã xảy ra (event log). Append-only; nguồn cho thông báo, đồng bộ hai app, phân tích.';
CREATE INDEX ix_domain_events_aggregate ON evt.domain_events (aggregate_type, aggregate_id, seq);
CREATE INDEX ix_domain_events_type_time ON evt.domain_events (event_type, occurred_at);
CREATE TRIGGER tg_domain_events_append_only BEFORE UPDATE OR DELETE ON evt.domain_events
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE TABLE evt.outbox (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id      uuid        NOT NULL REFERENCES evt.domain_events (id),
  destination   text        NOT NULL,   -- 'notify', 'sync_apps', 'bank', 'sms', 'zalo', 'analytics'
  status        text        NOT NULL DEFAULT 'pending',
  attempts      integer     NOT NULL DEFAULT 0,
  available_at  timestamptz NOT NULL DEFAULT now(),  -- lùi thời gian khi thử lại (backoff)
  locked_until  timestamptz,
  last_error    text,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_outbox_event_dest UNIQUE (event_id, destination),
  CONSTRAINT ck_outbox_status CHECK (status IN ('pending','sent','failed','dead')),
  CONSTRAINT ck_outbox_attempts CHECK (attempts >= 0),
  CONSTRAINT ck_outbox_sent CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);
COMMENT ON TABLE evt.outbox IS 'Hộp thư đi: ghi cùng giao dịch với thay đổi nghiệp vụ; worker lấy bằng FOR UPDATE SKIP LOCKED.';
CREATE INDEX ix_outbox_ready ON evt.outbox (destination, available_at) WHERE status IN ('pending','failed');

-- Phát sự kiện + xếp outbox trong một lệnh.
CREATE FUNCTION evt.emit(p_aggregate_type text, p_aggregate_id uuid, p_event_type text,
                         p_payload jsonb DEFAULT '{}'::jsonb,
                         p_destinations text[] DEFAULT ARRAY['notify','sync_apps'])
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO evt.domain_events (aggregate_type, aggregate_id, event_type, payload, actor_user_id, actor_org_id, request_id)
  VALUES (p_aggregate_type, p_aggregate_id, p_event_type, p_payload, ref.ctx_user(), ref.ctx_org(), ref.ctx('request_id'))
  RETURNING id INTO v_id;
  INSERT INTO evt.outbox (event_id, destination)
  SELECT v_id, d FROM unnest(p_destinations) AS d;
  RETURN v_id;
END $$;

-- ---------------------------------------------------------------------
-- Idempotency cho lệnh từ app và lệnh tiền
-- ---------------------------------------------------------------------
CREATE TABLE evt.idempotency_keys (
  scope         text        NOT NULL,   -- 'user:<uuid>' hoặc 'bank:<provider>' hoặc 'system'
  key           text        NOT NULL,   -- do client sinh (UUID), gửi trong header Idempotency-Key
  request_hash  bytea       NOT NULL,   -- sha256 của thân yêu cầu: cùng key khác thân => 409
  status        text        NOT NULL DEFAULT 'in_progress',
  response_code integer,
  response_body jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  PRIMARY KEY (scope, key),
  CONSTRAINT ck_idem_status CHECK (status IN ('in_progress','completed','failed')),
  CONSTRAINT ck_idem_hash CHECK (octet_length(request_hash) = 32)
);
COMMENT ON TABLE evt.idempotency_keys IS 'Chống xử lý lặp. Lệnh tiền giữ khóa lâu hơn (đặt expires_at xa).';

-- ---------------------------------------------------------------------
-- Webhook đầu vào (ngân hàng, ký số, nhà xe) – chống lặp theo mã sự kiện của đối tác
-- ---------------------------------------------------------------------
CREATE TABLE evt.inbound_webhooks (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider           text        NOT NULL,     -- 'bank_sim', 'esign_sim', 'carrier_x'
  provider_event_id  text        NOT NULL,
  event_type         text        NOT NULL,
  signature_valid    boolean     NOT NULL,
  payload            jsonb       NOT NULL,
  received_at        timestamptz NOT NULL DEFAULT now(),
  processed_at       timestamptz,
  process_result     text,                     -- 'applied','duplicate_ignored','out_of_order_requeried','rejected'
  error              text,
  CONSTRAINT uq_inbound_webhook UNIQUE (provider, provider_event_id),
  CONSTRAINT ck_webhook_result CHECK (process_result IS NULL OR process_result IN ('applied','duplicate_ignored','out_of_order_requeried','rejected'))
);
COMMENT ON TABLE evt.inbound_webhooks IS 'Mọi callback đối tác ghi nguyên văn trước khi xử lý. UNIQUE(provider, provider_event_id) chống lặp.';
CREATE INDEX ix_inbound_webhooks_unprocessed ON evt.inbound_webhooks (received_at) WHERE processed_at IS NULL;

-- ---------------------------------------------------------------------
-- Nhật ký kiểm toán chung (thao tác nhạy cảm không phải chuyển trạng thái: xem PII, đổi quyền...)
-- ---------------------------------------------------------------------
CREATE TABLE evt.audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid,
  actor_org_id  uuid,
  actor_kind    text        NOT NULL,
  action        text        NOT NULL,     -- 'pii.read_phone', 'membership.grant_role', ...
  entity        text        NOT NULL,
  entity_id     uuid,
  detail        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  request_id    text,
  at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_entity ON evt.audit_log (entity, entity_id, at);
CREATE INDEX ix_audit_actor ON evt.audit_log (actor_user_id, at);
CREATE TRIGGER tg_audit_append_only BEFORE UPDATE OR DELETE ON evt.audit_log
  FOR EACH ROW EXECUTE FUNCTION ref.forbid_mutation();

CREATE FUNCTION evt.audit(p_action text, p_entity text, p_entity_id uuid, p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO evt.audit_log (actor_user_id, actor_org_id, actor_kind, action, entity, entity_id, detail, request_id)
  VALUES (ref.ctx_user(), ref.ctx_org(), ref.ctx_actor(), p_action, p_entity, p_entity_id, p_detail, ref.ctx('request_id'));
$$;
