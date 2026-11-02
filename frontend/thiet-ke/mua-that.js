// App MUA — lớp dữ liệu THẬT (GĐ3, bước 1). Bật khi URL có ?thu=<số bên mua> (môi trường thử) hoặc đã có phiên đăng nhập bên mua.
// Không có thì app mua giữ bản mô phỏng (trang thử quy trình dùng). Bên mua KHÔNG thấy giá của lô khi tìm nguồn (quyết định A3.10).
import { phien } from "./chung.js";

export const THAT = new URLSearchParams(location.search).has("thu");
let token = null;
export async function api(duong, than) {
  token ||= await phien();
  const r = await fetch(duong, than ? { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...than }) }
    : { headers: { authorization: "Bearer " + token } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error([j.errors?.[0]?.message, j.errors?.[0]?.fix].filter(Boolean).join(" ") || `Lỗi ${r.status}`);
  return j.data ?? j;
}

const TINH = { DT: "Đồng Tháp", CT: "Cần Thơ", TN: "Tây Ninh", VL: "Vĩnh Long", AG: "An Giang", HCM: "TP.HCM" };
const ANH = { XOAI: "xoai", SAU: "sau", THANH: "thanh-long", BUOI: "buoi", TOM: "tom", CA: "tom", LUA: "lua", CHANH: "chanh" };
const anhCua = (ma = "") => ANH[Object.keys(ANH).find((k) => ma.startsWith(k))] || "xoai";
const nhomCua = (ma = "") => (/^(TOM|CA|CUA|NGHEU|SO|OC|MUC)/.test(ma) ? "Thủy sản" : /^(LUA|GAO|CAPHE|CAFE|TIEU|DIEU|HAT|CACAO)/.test(ma) ? "Hạt, cà phê" : /^(RAU|CAI|HANH|OT|KHOAI|CU|BAP|DUA_LEO|CA_CHUA)/.test(ma) ? "Rau củ" : "Trái cây");
const LOAI = (g) => (/^L(\d)$/.test(g) ? `loại ${g.slice(1)}` : g === "A" ? "loại A" : g === "B" ? "loại B" : g);
const ngayVN = (s) => (s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "");

/** Người đang đăng nhập + nguồn hàng thật trên chợ (lô của người bán khác, đang bán / sắp có). */
export async function napThat() {
  const me = await api("/v1/me");
  const ds = await api("/v1/lots");
  const ct = await Promise.all(ds.map((l) => api(`/v1/lots/${l.id}`).catch(() => null)));
  const lo = ds.map((l, i) => {
    const c = ct[i] || {};
    return { id: l.id, ma: l.code, ten: `${c.product_name || l.product_code} ${LOAI(l.grade_code)}`, nguoi: c.seller_name || "Người bán", noi: TINH[l.province_code] || l.province_code,
      gia: null, con: Math.round(Number(l.available_g) / 1000), hai: ngayVN(l.available_from), uy: null, don: null, anh: anhCua(l.product_code), nhom: nhomCua(l.product_code), kiem: false,
      nguoiId: c.seller_org_id || null, maSp: l.product_code, loai: l.grade_code, sapCo: l.status === "upcoming", banGap: !!l.ban_gap, uocTinh: l.qty_basis === "estimated", soAnh: (c.photos || []).length };
  });
  return { me, lo };
}

/** Chào giá thật một lô (bên mua). Trả lời chào; giá dưới mức người bán chấp nhận thì backend tự đóng, không lộ giá kín. */
export async function chaoGia(loId, kg, gia) {
  const of = await api("/v1/offers", { direction: "buyer_bid", lot_id: loId, qty_g: Math.round(kg * 1000), price_vnd: Math.round(gia) });
  return of;
}

// Giữ ?thu= khi đi giữa các màn (link nội bộ ?man=...), nếu không sẽ rơi về bản mô phỏng.
if (THAT) {
  const thu = new URLSearchParams(location.search).get("thu");
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[href]"); if (!a) return;
    const u = new URL(a.href, location.href);
    if (u.origin === location.origin && u.pathname === location.pathname && !u.searchParams.has("thu")) { u.searchParams.set("thu", thu); a.href = u.href; }
  }, true);
}
