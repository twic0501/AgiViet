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
  // Ảnh chứng từ chụp tại vườn/kho/điểm giao: được chờ gửi, TRỪ ảnh khoản tiền (tiền chỉ làm khi có mạng).
  { mau: /^\/v1\/files$/, ten: "Gửi ảnh chứng từ", hop_le: (than) => ANH_DUOC_CHO.has(than?.entity) },
];
const ANH_DUOC_CHO = new Set(["lot", "production_site", "delivery", "acceptance", "order", "dispute"]);

export const CAM_NGOAI_TUYEN = [
  { mau: /\/(auth|otp)\//, ly_do: "Đăng nhập và mã OTP cần mạng để xác thực." },
  { mau: /\/(sign|approve)$/, ly_do: "Ký và duyệt cần mạng để xác thực bằng OTP." },
  { mau: /\/(payments|payout-accounts|credit-terms)\b/, ly_do: "Các thao tác tiền chỉ thực hiện khi có mạng." },
  { mau: /\/(offers|orders|amendments|cancellation-requests)\b/, ly_do: "Giá, hợp đồng và hủy đơn cần xác nhận trực tiếp với bên kia." },
  { mau: /\/deliveries\//, ly_do: "Giao nhận cần ghi nhận đúng thời điểm, cần có mạng." },
];

export function phanLoai(duong, than = {}) {
  const p = String(duong).split("?")[0];
  const cho = DUOC_XEP_HANG.find((x) => x.mau.test(p));
  if (cho && (!cho.hop_le || cho.hop_le(than))) return { xep_hang: true, ten: cho.ten, khoa_rieng: cho.khoa_rieng };
  if (cho) return { xep_hang: false, ly_do: "Ảnh chứng từ khoản tiền chỉ gửi khi có mạng." };
  const cam = CAM_NGOAI_TUYEN.find((x) => x.mau.test(p));
  return { xep_hang: false, ly_do: cam?.ly_do || "Thao tác này cần có mạng." };
}

const MA_XUNG_DOT = new Set(["REVISION_XUNG_DOT", "PHIEN_BAN_DA_DOI"]);
const THAM_CHIEU = /^@muc:(.+)$/;

/** Tham chiếu tới kết quả của một mục trước trong hàng (vd. mã tệp ảnh cho nhật ký): than.photo_document_ids = [thamChieu(anh.id)]. */
export const thamChieu = (id) => `@muc:${id}`;
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
    const pl = phanLoai(duong, than);
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
    const ds = await this.danhSach();
    for (const m of ds) {
      if (m.trang_thai !== "cho") continue;
      if (kq.mat_mang) { kq.con_cho++; continue; }
      const giai = await this._giaiThamChieu(m.than, ds);
      if (giai.loi) {
        m.trang_thai = "loi"; m.loi = giai.loi; kq.loi++;
        await this.kho.dat("hang", m.id, m);
        continue;
      }
      m.lan_thu++;
      let r;
      try { r = await this.gui(m.duong, giai.than); } catch { r = null; }
      if (!r || r.status >= 500) {
        kq.mat_mang = true; kq.con_cho++;
        m.loi = r ? `Máy chủ lỗi ${r.status}, sẽ thử lại.` : "Chưa có mạng, sẽ gửi lại.";
        await this.kho.dat("hang", m.id, m);
        continue;
      }
      if (r.status < 300) {
        await this.kho.dat("doc", `ket_qua:${m.id}`, { id: r.body?.id ?? r.body?.data?.id ?? null, luc: this.bayGio() });
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

  /** Thay mọi "@muc:<id>" trong thân bằng mã kết quả của mục đó. Mục gốc lỗi/xung đột → mục này lỗi theo, không gửi mã sai. */
  async _giaiThamChieu(than, ds) {
    let loi = null;
    const di = async (v) => {
      if (typeof v === "string") {
        const k = THAM_CHIEU.exec(v);
        if (!k) return v;
        const kq = await this.kho.lay("doc", `ket_qua:${k[1]}`);
        if (kq?.id) return kq.id;
        const goc = ds.find((x) => x.id === k[1]);
        loi = { code: "PHU_THUOC_LOI", message: `Chưa gửi được "${goc?.ten || "mục liên quan"}" nên mục này chưa gửi.`, fix: "Xử lý mục kia trước rồi gửi lại mục này." };
        return v;
      }
      if (Array.isArray(v)) return Promise.all(v.map(di));
      if (v && typeof v === "object") return Object.fromEntries(await Promise.all(Object.entries(v).map(async ([a, b]) => [a, await di(b)])));
      return v;
    };
    const ket = await di(than);
    return loi ? { loi } : { than: ket };
  }
}

/** Đọc ảnh (File/Blob) thành base64 sau khi thu nhỏ cạnh dài về tối đa `canh` px, JPEG — chỉ chạy trong trình duyệt. */
export async function anhThanhBase64(tep, canh = 1600, chat = 0.82) {
  const bm = await createImageBitmap(tep);
  const tl = Math.min(1, canh / Math.max(bm.width, bm.height));
  const c = new OffscreenCanvas(Math.round(bm.width * tl), Math.round(bm.height * tl));
  c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
  const blob = await c.convertToBlob({ type: "image/jpeg", quality: chat });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { mime: "image/jpeg", data_base64: btoa(s), rong: c.width, cao: c.height, byte: bytes.length };
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
