import test from "node:test";
import assert from "node:assert/strict";
import { Api, ApiError } from "../shared/api.js";
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "req-1" },
  });
const storage = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) || null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
};
test("Gửi token, thiết bị, số phiên bản và khóa", async () => {
  let seen;
  const api = new Api({
    token: "secret",
    deviceId: "device",
    fetcher: async (...a) => {
      seen = a;
      return response({ id: "order" });
    },
  });
  await api.command("/v1/orders/a/sign", {
    expected_revision: 3,
    code: "123456",
  });
  assert.equal(seen[1].headers.Authorization, "Bearer secret");
  assert.equal(seen[1].headers["x-device-id"], "device");
  const b = JSON.parse(seen[1].body);
  assert.equal(b.expected_revision, 3);
  assert.match(b.idempotency_key, /^[a-f0-9-]{36}$/);
});
test("Mất phản hồi gửi lại đúng cùng khóa và thân", async () => {
  const seen = [];
  let calls = 0;
  const api = new Api({
    fetcher: async (_, init) => {
      seen.push(init.body);
      if (!calls++) throw new Error("lost");
      return response({ replayed: true });
    },
  });
  await assert.rejects(
    api.command("/v1/payments/a/confirm", { amount_vnd: "1000" }),
    (e) => e.code === "CAN_MANG",
  );
  assert.equal(
    (await api.command("/v1/payments/a/confirm", { amount_vnd: "1000" }))
      .replayed,
    true,
  );
  assert.equal(seen[0], seen[1]);
});
test("Giữ khóa qua phiên tải lại", async () => {
  const shared = storage();
  let body;
  const a = new Api({
    deviceId: "same",
    storage: shared,
    fetcher: async (_, i) => {
      body = i.body;
      throw new Error("offline");
    },
  });
  await assert.rejects(a.command("/v1/lots", { qty_g: "10" }));
  const b = new Api({
    deviceId: "same",
    storage: shared,
    fetcher: async (_, i) => {
      assert.equal(i.body, body);
      return response({});
    },
  });
  await b.command("/v1/lots", { qty_g: "10" });
});
test("Không đổi nội dung khi lệnh trước chưa rõ", async () => {
  const api = new Api({
    fetcher: async () => {
      throw Error();
    },
  });
  await assert.rejects(api.command("/v1/orders", { qty_g: "10" }));
  await assert.rejects(
    api.command("/v1/orders", { qty_g: "20" }),
    (e) => e.code === "LENH_CHUA_RO",
  );
});
test("Lỗi nghiệp vụ gồm câu, cách sửa và mã hỗ trợ", async () => {
  const api = new Api({
    fetcher: async () =>
      response(
        {
          errors: [
            {
              code: "REVISION_XUNG_DOT",
              message: "Dữ liệu đã đổi.",
              fix: "Tải lại.",
            },
          ],
        },
        409,
      ),
  });
  await assert.rejects(
    api.command("/v1/orders", {}),
    (e) =>
      e instanceof ApiError &&
      e.message === "Dữ liệu đã đổi." &&
      e.fix === "Tải lại." &&
      e.requestId === "req-1",
  );
});
test("Lỗi 422 cho phép sửa và dùng khóa mới", async () => {
  let first,
    second,
    calls = 0;
  const api = new Api({
    fetcher: async (_, i) => {
      if (!calls++) {
        first = JSON.parse(i.body);
        return response({ errors: [{ code: "OTP_SAI" }] }, 422);
      }
      second = JSON.parse(i.body);
      return response({});
    },
  });
  await assert.rejects(api.command("/v1/a", { code: "bad" }));
  await api.command("/v1/a", { code: "good" });
  assert.notEqual(first.idempotency_key, second.idempotency_key);
});
test("HTTP 502 chưa rõ kết quả giữ nguyên khóa", async () => {
  const bodies = [];
  let n = 0;
  const api = new Api({
    fetcher: async (_, i) => {
      bodies.push(i.body);
      return response({}, n++ ? 200 : 502);
    },
  });
  await assert.rejects(api.command("/v1/orders", {}));
  await api.command("/v1/orders", {});
  assert.equal(bodies[0], bodies[1]);
});
test("GET không gửi thân và không mang khóa lệnh", async () => {
  const api = new Api({
    fetcher: async (_, init) => {
      assert.equal(init.method, "GET");
      assert.equal(init.body, undefined);
      return response([]);
    },
  });
  assert.deepEqual(await api.get("/v1/orders"), []);
});
test("Nút gửi lại dùng chính thân trước, không phát lại lệnh mới", async () => {
  const seen = [];
  let n = 0;
  const api = new Api({
    fetcher: async (_, i) => {
      seen.push(i.body);
      if (!n++) throw Error();
      return response({ replayed: true });
    },
  });
  await assert.rejects(api.command("/v1/a", { amount_vnd: "900" }));
  assert.equal(api.hasPending(), true);
  assert.equal((await api.retryPending()).replayed, true);
  assert.equal(seen[0], seen[1]);
  assert.equal(api.hasPending(), false);
});
test("Fetch mặc định gọi với ngữ cảnh globalThis của trình duyệt", async () => {
  const old = globalThis.fetch;
  let receiver;
  globalThis.fetch = async function () {
    receiver = this;
    return response({});
  };
  try {
    await new Api().get("/health");
    assert.equal(receiver, globalThis);
  } finally {
    globalThis.fetch = old;
  }
});
test("Không gửi lại lệnh của người khác khi đổi vai", async () => {
  const shared = storage();
  const api = new Api({
    storage: shared,
    fetcher: async () => {
      throw Error();
    },
  });
  api.setActor("seller");
  await assert.rejects(
    api.command("/v1/payments/a/confirm", { amount_vnd: "1" }),
  );
  api.setActor("buyer");
  assert.equal(api.hasPending(), false);
  assert.equal(await api.retryPending(), null);
  api.setActor("seller");
  assert.equal(api.hasPending(), true);
});
