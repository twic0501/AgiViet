// Chế độ ngoại tuyến AgiViet: lưu bản đã tải để xem khi mất mạng + hàng đợi lệnh gửi sau.
// Nguyên tắc:
// - Chặn mặc định: chỉ lệnh trong DUOC_XEP_HANG mới được xếp hàng khi mất mạng. Ký, OTP, tiền, đăng nhập,
//   chào/đồng ý giá, giao nhận… LUÔN cần mạng (CAM_NGOAI_TUYEN nêu rõ lý do để giao diện báo).
// - Mỗi lệnh xếp hàng được cấp idempotency_key MỘT lần lúc thêm; gửi lại bao nhiêu lần cũng cùng khóa → backend không tạo trùng.
// - Gửi lần lượt theo thứ tự thêm. Lỗi mạng/5xx: dừng, giữ nguyên, thử lại sau. 409 xung đột phiên bản: đánh dấu "xung_dot",
//   KHÔNG tự ghi đè — người dùng xem bản mới rồi quyết. 4xx khác: "loi" kèm câu báo từ backend.

export const DUOC_XEP_HANG = [
  { mau: /^\/v1\/farm-diary$/, ten: "Ghi nhật ký vườn", khoa_rieng: "request_key" },
  { mau: /^\/v1\/lots$/, ten: "Tạo lô hàng nháp" },
  { mau: /^\/v1\/seasonal-orders\/[^/]+\/production-updates$/, ten: "Cập nhật tình hình sản xuất" },
  { mau: /^\/v1\/support$/, ten: "Gửi yêu cầu hỗ trợ" },
];

export const CAM_NGOAI_TUYEN = [
  { mau: /\/(auth|otp)\//, ly_do: "Đăng nhập và mã OTP cần mạng để xác thực." },
  { mau: /\/(sign|approve)$/, ly_do: "Ký và duyệt cần mạng để xác thực bằng OTP." },
  { mau: /\/(payments|payout-accounts|credit-terms)\b/, ly_do: "Các thao tác tiền chỉ thực hiện khi có mạng." },
  { mau: /\/(offers|orders|amendments|cancellation-requests)\b/, ly_do: "Giá, hợp đồng và hủy đơn cần xác nhận trực tiếp với bên kia." },
  { mau: /\/deliveries\//, ly_do: "Giao nhận cần ghi nhận đúng thời điểm, cần có mạng." },
];

export function phanLoai(duong) {
  const p = String(duong).split("?")[0];
  const cho = DUOC_XEP_HANG.find((x) => x.mau.test(p));
  if (cho) return { xep_hang: true, ten: cho.ten, khoa_rieng: cho.khoa_rieng };
  const cam = CAM_NGOAI_TUYEN.find((x) => x.mau.test(p));
  return { xep_hang: false, ly_do: cam?.ly_do || "Thao tác này cần có mạng." };
}

const MA_XUNG_DOT = new Set(["REVISION_XUNG_DOT", "PHIEN_BAN_DA_DOI"]);
const taoKhoa = () => (globalThis.crypto?.randomUUID?.() || `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// ---- Kho: cùng giao diện cho IndexedDB (trình duyệt) và bộ nhớ (kiểm thử) ----
export function khoBoNho() {
  const bang = { doc: new Map(), hang: new Map() };
  return {
    async lay(b, k) { return structuredClone(bang[b].get(k) ?? null); },
    async dat(b, k, v) { bang[b].set(k, structuredClone(v)); },
    async xoa(b, k) { bang[b].delete(k); },
    async tatCa(b) { return [...bang[b].values()].map((v) => structuredClone(v)); },
  };
}

export function khoIndexedDB(ten = "agiviet-ngoai-tuyen") {
  const mo = new Promise((ok, loi) => {
    const r = indexedDB.open(ten, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("doc"); r.result.createObjectStore("hang"); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => loi(r.error);
  });
  const lam = (b, che_do, f) => mo.then((db) => new Promise((ok, loi) => {
    const tx = db.transaction(b, che_do); const yc = f(tx.objectStore(b));
    tx.oncomplete = () => ok(yc?.result ?? null); tx.onerror = () => loi(tx.error); tx.onabort = () => loi(tx.error);
  }));
  return {
    lay: (b, k) => lam(b, "readonly", (s) => s.get(k)).then((v) => v ?? null),
    dat: (b, k, v) => lam(b, "readwrite", (s) => { s.put(v, k); }),
    xoa: (b, k) => lam(b, "readwrite", (s) => { s.delete(k); }),
    tatCa: (b) => lam(b, "readonly", (s) => s.getAll()),
  };
}

export class NgoaiTuyen {
  /** @param {{kho?: any, gui: (duong: string, than: object) => Promise<{status: number, body: any}>, bayGio?: () => number}} o */
  constructor({ kho, gui, bayGio = () => Date.now() }) {
    this.kho = kho || khoIndexedDB();
    this.gui = gui;
    this.bayGio = bayGio;
    this.dangDongBo = null;
  }

  // ---- Bản đã tải ----
  async luuDoc(khoa, du_lieu) {
    await this.kho.dat("doc", khoa, { khoa, du_lieu, revision: du_lieu?.revision ?? null, luc: this.bayGio() });
  }

  /** Trả {du_lieu, luc, revision} hoặc null. Giao diện phải hiện "đã lưu lúc …" khi dùng bản này. */
  docDaLuu(khoa) { return this.kho.lay("doc", khoa); }

  // ---- Hàng đợi ----
  async them(duong, than = {}) {
    const pl = phanLoai(duong);
    if (!pl.xep_hang) {
      const e = new Error(pl.ly_do); e.code = "CAN_MANG"; throw e;
    }
    const ds = await this.kho.tatCa("hang");
    const khoa = than.idempotency_key || taoKhoa();
    // Lệnh có khóa chống lặp riêng (vd. nhật ký vườn: request_key) dùng chung khóa với idempotency_key.
    const them_khoa = pl.khoa_rieng && !than[pl.khoa_rieng] ? { [pl.khoa_rieng]: khoa } : {};
    const muc = {
      id: taoKhoa(), stt: ds.reduce((m, x) => Math.max(m, x.stt), 0) + 1, duong, ten: pl.ten,
      than: { ...than, ...them_khoa, idempotency_key: khoa },
      trang_thai: "cho", lan_thu: 0, tao_luc: this.bayGio(), loi: null, ket_qua: null,
    };
    await this.kho.dat("hang", muc.id, muc);
    return muc;
  }

  async danhSach() { return (await this.kho.tatCa("hang")).sort((a, b) => a.stt - b.stt); }

  async boQua(id) { await this.kho.xoa("hang", id); }

  /** Gửi lại mục xung đột/lỗi với thân mới (vd. expected_revision mới) — cấp khóa mới vì nội dung đã đổi. */
  async guiLaiVoi(id, than_moi) {
    const m = await this.kho.lay("hang", id);
    if (!m) return null;
    Object.assign(m, { than: { ...than_moi, idempotency_key: taoKhoa() }, trang_thai: "cho", loi: null });
    await this.kho.dat("hang", id, m);
    return m;
  }

  /** Gửi lần lượt các mục "cho". Chỉ một lượt đồng bộ chạy tại một thời điểm. */
  dongBo() {
    if (!this.dangDongBo) this.dangDongBo = this._dongBo().finally(() => { this.dangDongBo = null; });
    return this.dangDongBo;
  }

  async _dongBo() {
    const kq = { da_gui: 0, xung_dot: 0, loi: 0, con_cho: 0, mat_mang: false };
    for (const m of await this.danhSach()) {
      if (m.trang_thai !== "cho") continue;
      if (kq.mat_mang) { kq.con_cho++; continue; }
      m.lan_thu++;
      let r;
      try { r = await this.gui(m.duong, m.than); } catch { r = null; }
      if (!r || r.status >= 500) {
        kq.mat_mang = true; kq.con_cho++;
        m.loi = r ? `Máy chủ lỗi ${r.status}, sẽ thử lại.` : "Chưa có mạng, sẽ gửi lại.";
        await this.kho.dat("hang", m.id, m);
        continue;
      }
      if (r.status < 300) {
        await this.kho.xoa("hang", m.id); kq.da_gui++;
        continue;
      }
      const e = r.body?.errors?.[0] || {};
      m.trang_thai = MA_XUNG_DOT.has(e.code) ? "xung_dot" : "loi";
      m.loi = { code: e.code || `HTTP_${r.status}`, message: e.message || "Không gửi được.", fix: e.fix || "" };
      await this.kho.dat("hang", m.id, m);
      m.trang_thai === "xung_dot" ? kq.xung_dot++ : kq.loi++;
    }
    return kq;
  }
}

/** Gói fetch thành hàm gửi cho NgoaiTuyen (lỗi mạng ném ra để được giữ lại hàng đợi). */
export function guiQuaFetch(goc, layToken) {
  return async (duong, than) => {
    const r = await fetch(goc + duong, {
      method: "POST",
      headers: { "content-type": "application/json", ...(layToken?.() ? { authorization: "Bearer " + layToken() } : {}) },
      body: JSON.stringify(than),
    });
    let body = null;
    try { body = await r.json(); } catch { /* thân rỗng */ }
    return { status: r.status, body };
  };
}
