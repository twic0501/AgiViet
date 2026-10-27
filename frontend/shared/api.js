/** @typedef {import('./api-types').User} User */
export class ApiError extends Error {
  constructor(status, payload = {}) {
    const e = payload.errors?.[0] || {};
    super(e.code === "CHUA_HO_TRO" ? "Chức năng này chưa sẵn sàng. Vui lòng gửi yêu cầu hỗ trợ." : e.message || "Không thực hiện được. Vui lòng thử lại.");
    this.name = "ApiError";
    this.status = status;
    this.code = e.code || "CAN_MANG";
    this.fix = e.fix || "";
    this.details = e.details || {};
    this.errors = payload.errors || [];
    this.requestId = payload.request_id || "";
  }
}
export class Api {
  constructor({
    base = "",
    token = "",
    deviceId = "agiviet-web",
    fetcher = (...args) => globalThis.fetch(...args),
    storage = null,
  } = {}) {
    this.base = base;
    this.token = token;
    this.deviceId = deviceId;
    this.fetcher = fetcher;
    this.storage = storage;
    this.pending = new Map();
    this.actorId = "";
    this.lastScope = this.storage?.getItem(this.lastKey()) || null;
  }
  async request(path, { method = "GET", body, blob = false } = {}) {
    let response;
    try {
      response = await this.fetcher(this.base + path, {
        method,
        headers: {
          ...(body ? { "content-type": "application/json" } : {}),
          ...(this.token ? { Authorization: "Bearer " + this.token } : {}),
          "x-device-id": this.deviceId,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
    } catch {
      throw new ApiError(0, {
        errors: [
          {
            code: "CAN_MANG",
            message:
              "Kết nối bị gián đoạn. Chưa biết thao tác đã được ghi nhận chưa.",
            fix: "Thử lại đúng thao tác để kiểm tra, không tạo thêm giao dịch.",
          },
        ],
      });
    }
    if (!response.ok) {
      let payload;
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      throw new ApiError(response.status, {
        ...payload,
        request_id: payload.request_id || response.headers.get("x-request-id"),
      });
    }
    return blob ? response.blob() : response.json();
  }
  get(path) {
    return this.request(path);
  }
  post(path, body = {}) {
    return this.request(path, { method: "POST", body });
  }
  // Giữ nguyên thân và khóa nếu kết nối chưa rõ kết quả, kể cả tải lại trang.
  lastKey() {
    return "agv-last-pending:" + this.deviceId + ":" + this.actorId;
  }
  setActor(id) {
    this.actorId = id || "";
    this.lastScope = this.storage?.getItem(this.lastKey()) || null;
  }
  clearPending(scope) {
    this.pending.delete(scope);
    this.storage?.removeItem(scope);
    if (this.lastScope === scope) {
      this.lastScope = null;
      this.storage?.removeItem(this.lastKey());
    }
  }
  hasPending() {
    return !!this.lastScope;
  }
  async retryPending() {
    const scope = this.lastScope;
    const entry =
      scope &&
      (this.pending.get(scope) ||
        JSON.parse(this.storage?.getItem(scope) || "null"));
    if (!entry) return null;
    try {
      const result = await this.post(entry.path, entry.body);
      this.clearPending(scope);
      return result;
    } catch (error) {
      if (error.status >= 400 && (error.status < 500 || error.status === 501))
        this.clearPending(scope);
      throw error;
    }
  }
  async command(path, data = {}) {
    const scope =
      "agv-pending:" + this.deviceId + ":" + this.actorId + ":" + path;
    const signature = JSON.stringify(data);
    let previous =
      this.pending.get(scope) ||
      JSON.parse(this.storage?.getItem(scope) || "null");
    if (previous && previous.signature !== signature)
      throw new ApiError(409, {
        errors: [
          {
            code: "LENH_CHUA_RO",
            message: "Thao tác trước chưa rõ kết quả.",
            fix: "Gửi lại nội dung trước hoặc tải lại để kiểm tra trước khi sửa.",
          },
        ],
      });
    const entry = previous || {
      path,
      signature,
      body: { ...data, idempotency_key: crypto.randomUUID() },
    };
    this.pending.set(scope, entry);
    this.storage?.setItem(scope, JSON.stringify(entry));
    this.lastScope = scope;
    this.storage?.setItem(this.lastKey(), scope);
    try {
      const result = await this.post(path, entry.body);
      this.clearPending(scope);
      return result;
    } catch (e) {
      if (e.status >= 400 && (e.status < 500 || e.status === 501)) {
        this.clearPending(scope);
      }
      throw e;
    }
  }
}
