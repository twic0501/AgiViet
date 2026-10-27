// Giao diện app bán theo thiết kế "Sổ làm ăn" (docs/frontend/tham-khao/thiet-ke-so-lam-an).
// Trâu C01 có hai vai: hướng dẫn dùng app (tour) và dòng nhắc ở đáy theo việc đang làm.
import { money, moneyWords, quantity, date, escapeHtml as e } from "./format.js";
import { button, rule, field, notice, fraud, otpBox } from "./ui.js";
import { grams } from "./format.js";
import { orderPart } from "./orders.js";
import { phoneSuggestions } from "./login-options.js";

const TRAU = "/tham-khao/hieu-ung-va-linh-vat/trau/";
const ANH = "/tham-khao/thiet-ke-so-lam-an/assets/anh/";
const anhMatHang = {
  XOAI_CAT_CHU: ANH + "mango.jpg",
  THANH_LONG: ANH + "dragon-fruit.jpg",
  LUA_TUOI: ANH + "rice.jpg",
  TOM_THE: ANH + "shrimp.jpg",
  CA_TRA: ANH + "basa.jpg",
  CHANH_KHONG_HAT: "/assets/products/lime.svg",
  BUOI_DA_XANH: "/assets/products/pomelo.svg",
  SAU_RIENG: "/assets/products/durian.svg",
};
export const anh = (code) => anhMatHang[code] || ANH + "mango.jpg";

const svg = (d) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const loa = svg('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/>');
const lui = svg('<path d="M15 6l-6 6 6 6"/>');
const toi = svg('<path d="M9 6l6 6-6 6"/>');
const canh = svg('<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>');

// Gọi tên thân mật: "chị Năm", "anh Hòa"; không đoán được thì dùng tên.
export function xung(name = "") {
  // \b không nhận chữ có dấu, nên tách theo khoảng trắng.
  const parts = name.trim().split(/\s+/);
  const ten = parts.at(-1) || "";
  if (parts.includes("Thị")) return "chị " + ten;
  if (parts.includes("Văn")) return "anh " + ten;
  return ten;
}
const hoaDau = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const trieu = (v) => {
  const n = Number(v || 0) / 1e6;
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n);
};
const conLai = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const gio = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(d);
  return `Hạn ${gio} ${date(iso).slice(0, 5)}`;
};
const nutHoi = `<button type="button" class="sl-chu-nut" data-action="huongDan">Hướng dẫn</button>`;
const dauMuc = (title, back = "", nghe = true) =>
  `<div class="sl-dau">${back ? `<a class="sl-ve" href="#/${back}" aria-label="Trở lại">${lui}</a>` : ""}<h1 tabindex="-1">${e(title)}</h1>${nghe ? `<button type="button" class="sl-chu-nut" data-action="listen">Nghe</button>${nutHoi}` : ""}</div>`;

export function dayBuoc(at) {
  const all = ["Chào giá", "Ký", "Cọc", "Giao", "Tiền"];
  const i = all.indexOf(at);
  return `<div class="sl-buoc" aria-label="Các bước"><div>${all.map((_, k) => `<i class="${k < i ? "xong" : k === i ? "dang" : ""}"></i>`).join("")}</div><div class="sl-buoc-chu">${all.map((s, k) => (k === i ? `<b aria-current="step">${s}</b>` : `<span>${s}</span>`)).join("")}</div></div>`;
}

/* ---------- Màn vào app ---------- */
export function welcome(c) {
  const dangOtp = !!c.state.login;
  return `<section class="sl-chao">
    <div class="sl-chao-dau"><img src="/assets/logo.svg" width="34" height="34" alt=""><b>AgiViet</b><button type="button" class="sl-nghe toi" data-action="listen">Nghe</button></div>
    ${dangOtp ? "" : `<div class="sl-anh3"><img src="${ANH}mango.jpg" alt="Xoài"><img src="${ANH}shrimp.jpg" alt="Tôm"><img src="${ANH}dragon-fruit.jpg" alt="Thanh long"></div>
    <div class="sl-chao-chu"><h1 tabindex="-1">Bán nông sản, thủy sản đúng mối, đúng giá</h1><p>Tiền đi qua ngân hàng giữ hộ. Người bán dùng miễn phí.</p></div>`}
    <div class="sl-chao-form">${
      !dangOtp
        ? `<form data-form="loginPhone">${field("Số điện thoại của chị, anh", "phone", "tel", "", `inputmode="tel" autocomplete="tel" pattern="${c.health?.moi_truong === "thu" ? "0[0-9]{9}|00(0[1-9]|10)" : "0[0-9]{9}"}" required`)}${phoneSuggestions("ban", c.health, c.accounts.length > 0)}<button class="sl-nut kem">Nhận mã đăng nhập</button></form><p class="sl-ghi">Tài khoản người bán do nhân viên AgiViet hoặc HTX mở sau khi xác minh hồ sơ.</p>`
        : `<h1 tabindex="-1">Nhập mã vừa gửi tới ${e(c.state.login.phone)}</h1><div class="sl-canh do">${canh}<span>${e(fraud)}</span></div><form data-form="loginOtp">${otpBox("Mã 6 số")}<button class="sl-nut kem">Đăng nhập</button></form>${button("Đổi số điện thoại", "changeLoginPhone", true)}`
    }</div>
  </section>`;
}

/* ---------- Trang chủ ---------- */
export async function home(c) {
  const [orders, offers, tien, demands, lots] = await Promise.all([
    c.api.get("/v1/orders"),
    c.api.get("/v1/offers"),
    c.api.get("/v1/money/summary").catch(() => null),
    c.api.get("/v1/demands").catch(() => []),
    c.api.get("/v1/lots?mine=true").catch(() => []),
  ]);
  const thoiTiet = await c.api.get("/v1/weather").catch(() => null);
  const lo = Object.fromEntries(lots.map((l) => [l.code, l]));
  const chaoCho = offers
    .filter((o) => o.status === "sent" && o.vong_cuoi.from_side !== "seller")
    .sort((x, y) => new Date(x.vong_cuoi.expires_at) - new Date(y.vong_cuoi.expires_at));
  const donCho = orders.filter((o) => o.hien_thi?.toi_luot?.phia === "seller");
  const t = tien?.tong || {};
  const daVe = BigInt(t.da_nhan_truc_tiep || 0) + BigInt(t.ngan_hang_da_chuyen_den || 0);
  const ten = xung(c.user.name);
  const chuDau = (ten.split(" ").at(-1) || "A").charAt(0).toUpperCase();
  // Việc cần làm: đơn tới lượt trước (gấp hơn), rồi lời chào theo hạn gần nhất; chỉ 3 dòng.
  const viec = [
    ...donCho.map((o) => dongGon({ href: `#/order/${o.id}/${{ Ký: "terms", Cọc: "deposit", "Giao nhận": "delivery", "Thanh toán": "payments" }[o.hien_thi.chang] || "terms"}`, ten: o.hien_thi.toi_luot.viec, phu: o.buyer_name, so: tienGon(o.contract_value_vnd), vang: true })),
    ...chaoCho.map((o) => {
      const l = lo[o.lot_code], r = o.vong_cuoi;
      const tong = (BigInt(r.price_vnd) * BigInt(r.qty_g)) / 1000n;
      return dongGon({ href: "#/offers/" + o.id, img: anh(l?.product_code), ten: `Lời chào ${l ? tenHang(c, l.product_code).toLowerCase() : "lô " + o.lot_code}`, phu: `${quantity(r.qty_g)} · ${money(r.price_vnd)}/kg · ${gioHan(r.expires_at)}`, so: tienGon(tong.toString()), vang: true });
    }),
  ];
  const sanPham = new Set(lots.map((l) => l.product_code));
  const canMua = demands.filter((d) => (d.lines || []).some((x) => sanPham.has(x.product_code)) || sanPham.has(d.product_code));
  const nhanh = [
    ["thoi-tiet", "Thời tiết", "M7 18a4 4 0 1 1 .5-8 6 6 0 0 1 11.5 2 3 3 0 0 1 0 6z"],
    ["nhat-ky", "Nhật ký", "M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3"],
    ["tin-tuc", "Tin giá", "M4 5h14v14H6a2 2 0 0 1-2-2zM18 9h2v8a2 2 0 0 1-2 2M8 9h6M8 13h6"],
  ];
  return `<div class="sl-dau sl-dau-chu"><details class="sl-toi"><summary aria-label="Tài khoản">${e(chuDau)}</summary><div class="sl-toi-menu"><b>${e(c.user.name)}</b><span class="sl-nho">${e(c.user.org?.name || "")}</span><a href="#/toi">Tài khoản của tôi</a><a href="#/cai-dat">Cài đặt</a><a href="#/notifications">Thông báo</a><a href="#/organization">Tổ chức và người giúp</a><a href="#/lich-su">Lịch sử làm ăn</a><a href="#/support">Gọi nhân viên AgiViet</a><button type="button" class="sl-menu-nut" data-action="huongDan">Xem hướng dẫn</button><button type="button" class="sl-menu-nut" data-action="install">Cài app vào điện thoại</button><button type="button" data-action="logout">Đăng xuất</button></div></details><div class="sl-dau-ten"><span class="sl-nho">Chào</span><h1 tabindex="-1">${e(hoaDau(ten))}</h1></div><button type="button" class="sl-chu-nut" data-action="listen">Nghe</button>${nutHoi}</div>
  <a class="sl-the sl-tien" href="#/ledger" data-guide="tien"><span class="sl-nho">Tiền đã về</span><div class="sl-so-lon"><span data-dem="${Number(daVe) / 1e6}" data-hau="">${trieu(daVe)}</span> <small>triệu đ</small></div><div class="sl-tien-phu"><span><b>${trieu(t.coc_dang_giu)} triệu</b> ngân hàng giữ hộ</span><span><b>${trieu(t.con_phai_nhan)} triệu</b> còn chờ nhận</span></div></a>

  <nav class="sl-nhanh sl-nhanh-6" aria-label="Lối tắt">${[
    ["nhat-ky", "Nhật ký vườn", "M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3"],
    ["gia", "Giá hôm nay", "M4 18l5-6 4 3 7-9M15 6h5v5"],
    ["tin-tuc", "Tin vụ mùa", "M4 5h14v14H6a2 2 0 0 1-2-2zM18 9h2v8a2 2 0 0 1-2 2M8 9h6M8 13h6"],
    ["hoc", "Học kỹ thuật", "M3 8l9-4 9 4-9 4zM7 10v5c3 2 7 2 10 0v-5"],
    ["vuon", "Vườn, mùa vụ", "M12 21V11M12 11c0-4 3-7 7-7 0 4-3 7-7 7zM12 14c0-3-2-5-5-5 0 3 2 5 5 5z"],
    ["support", "Hỗ trợ", "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2"],
  ].map(([r, t2, d]) => `<a href="#/${r}"><span>${svg(`<path d="${d}"/>`)}</span>${t2}</a>`).join("")}</nav>
  <section class="sl-nhom" data-guide="viec"><div class="sl-tieu"><h2>Cần làm</h2>${viec.length > 3 ? `<a class="sl-lien" href="#/offers">Tất cả ${viec.length} ${toi}</a>` : ""}</div>
  ${viec.length ? `<div class="sl-ds-gon">${viec.slice(0, 3).join("")}</div>` : `<div class="sl-the sl-trong"><img src="${TRAU}06-vui.webp" alt=""><div><b>Không có việc gấp</b><p class="sl-nho">Lời chào giá và hạn giao sẽ hiện ở đây.</p></div></div>`}</section>
  ${theVuon(c, thoiTiet, lots)}
  ${canMua.length ? `<a class="sl-the sl-goi-y" href="#/lots/ben-mua"><img src="${anh([...sanPham][0])}" alt=""><div><b>${canMua.length} bên mua đang cần ${e(tenHang(c, [...sanPham][0]).toLowerCase())}</b><span class="sl-nho">Xem họ cần loại nào, bao nhiêu</span></div>${toi}</a>` : ""}`;
}

/* ---------- Thẻ Vườn trên Hôm nay ---------- */
function theVuon(c, w, lots) {
  const hn = w?.ngay?.[0];
  const canhBao = w?.ngay?.slice(0, 3).find((d) => d.loi_khuyen?.length);
  const lo = lots.find((l) => ["on_sale", "upcoming"].includes(l.status));
  return `<section class="sl-the sl-vuon"><div class="sl-vuon-dau"><b>Vườn của mình</b><a class="sl-lien" href="#/thoi-tiet">7 ngày ${toi}</a></div>
  ${hn ? `<div class="sl-vuon-tt"><span class="sl-vuon-do">${Math.round(hn.nhiet_do_cao_c)}°</span><span>Mưa ${hn.kha_nang_mua_phan_tram}% · ${e(w.tinh?.ten || "")}</span></div>` : ""}
  ${canhBao ? `<p class="sl-vuon-canh">${canh}<span>${e(canhBao.loi_khuyen[0])}</span></p>` : ""}
  <div class="sl-vuon-dong"><a href="#/nhat-ky">${svg('<path d="M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3"/>')}<span>Nhật ký vườn</span></a>${lo ? `<a href="#/lots/${e(lo.id)}"><img src="${anh(lo.product_code)}" alt=""><span>${e(tenHang(c, lo.product_code))} · có hàng ${e(date(lo.available_from).slice(0, 5))}</span></a>` : ""}</div></section>`;
}

/* ---------- Thêm: các tiện ích còn lại ---------- */
export function them(c) {
  return `${dauMuc("Tiện ích", "home")}<div class="sl-ds-gon">${LOI_TAT.map(([r, t, d]) => `<a class="sl-dg" href="#/${r}"><span class="sl-dg-icon">${svg(`<path d="${d}"/>`)}</span><div class="sl-dg-chu"><b>${t}</b></div>${toi}</a>`).join("")}<button type="button" class="sl-dg" data-action="huongDan"><span class="sl-dg-icon">${svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>')}</span><div class="sl-dg-chu"><b>Hướng dẫn dùng app</b></div>${toi}</button><button type="button" class="sl-dg" data-action="install"><span class="sl-dg-icon">${svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>')}</span><div class="sl-dg-chu"><b>Cài app vào điện thoại</b></div>${toi}</button></div>`;
}
const tenHang = (c, code) => { const p = c.products.find((x) => x.code === code); return p?.name_vi || p?.name || code; };

/* ---------- Dòng gọn và nhóm danh sách ---------- */
// Một dòng: ảnh nhỏ, tên (đậm), dòng phụ, số chính bên phải, chip trạng thái.
const dongGon = ({ href, img, ten, phu, so, chip, vang }) =>
  `<a class="sl-dg${vang ? " vang" : ""}" href="${e(href)}">${img ? `<img src="${e(img)}" alt="">` : ""}<div class="sl-dg-chu"><b>${e(ten)}</b>${phu ? `<span>${e(phu)}</span>` : ""}</div><div class="sl-dg-phai">${so ? `<b>${e(so)}</b>` : ""}${chip ? `<span class="sl-chip ${chip[1] || ""}">${e(chip[0])}</span>` : ""}</div></a>`;
// Nhóm: tiêu đề + số lượng, hiện tối đa n dòng, phần còn lại thu gọn.
function nhom(tieuDe, dong, n = 5, moSan = true) {
  if (!dong.length) return "";
  const dau = dong.slice(0, n).join(""), sau = dong.slice(n).join("");
  const than = `<div class="sl-ds-gon">${dau}${sau ? `<details class="sl-them"><summary>Xem thêm ${dong.length - n}</summary>${sau}</details>` : ""}</div>`;
  return moSan
    ? `<section class="sl-nhom"><div class="sl-tieu"><h2>${e(tieuDe)}</h2><span class="sl-nho">${dong.length}</span></div>${than}</section>`
    : `<details class="sl-nhom sl-nhom-dong"><summary><span>${e(tieuDe)}</span><span class="sl-nho">${dong.length}</span></summary>${than}</details>`;
}
const kgGon = (g) => quantity(g).replace(" kg", " kg");
const tienGon = (v) => { const n = Number(v || 0); return n >= 1e6 ? trieu(v) + " triệu" : money(v); };
const gioHan = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const gio = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(d);
  const ngay = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" }).format(d);
  return `hạn ${gio.replace(":", " giờ ")}, ${ngay}`;
};

/* ---------- Danh sách lời chào ---------- */
export async function offerList(c) {
  const [offers, lots] = await Promise.all([c.api.get("/v1/offers"), c.api.get("/v1/lots?mine=true").catch(() => [])]);
  const lo = Object.fromEntries(lots.map((l) => [l.code, l]));
  const d = (o) => {
    const l = lo[o.lot_code], r = o.vong_cuoi;
    const tong = (BigInt(r.price_vnd) * BigInt(r.qty_g)) / 1000n;
    return { o, l, tong, href: "#/offers/" + o.id, img: anh(l?.product_code), ten: `${l ? tenHang(c, l.product_code) : "Lô " + o.lot_code} · ${kgGon(r.qty_g)}`, phu: `${money(r.price_vnd)}/kg · ${gioHan(r.expires_at)}`, so: tienGon(tong.toString()) };
  };
  const ds = offers.map(d);
  const cho = ds.filter((x) => x.o.status === "sent" && x.o.vong_cuoi.from_side !== "seller").sort((a, b) => new Date(a.o.vong_cuoi.expires_at) - new Date(b.o.vong_cuoi.expires_at));
  const minhGui = ds.filter((x) => x.o.status === "sent" && x.o.vong_cuoi.from_side === "seller");
  const dongY = ds.filter((x) => x.o.status === "accepted");
  const khac = ds.filter((x) => !["sent", "accepted"].includes(x.o.status));
  const nhan = { expired: "Hết hạn", rejected: "Không bán", withdrawn: "Bên mua rút", auto_rejected: "Thấp hơn giá chịu bán", cancelled: "Đã hủy" };
  return `${dauMuc("Bán hàng")}${tabBan("offers", cho.length)}
  ${!ds.length ? `<div class="sl-the sl-trong"><img src="${TRAU}04-nghe.webp" alt=""><div><b>Chưa có lời chào</b><p class="sl-nho">Đăng hàng để bên mua chào giá.</p></div></div>` : ""}
  ${nhom("Cần chị trả lời", cho.map((x) => dongGon({ ...x, vang: true, chip: ["Trả lời", "vang"] })), 5)}
  ${nhom("Chờ bên mua trả lời", minhGui.map((x) => dongGon({ ...x, chip: ["Đã trả giá"] })), 3)}
  ${nhom("Đã đồng ý giá", dongY.map((x) => dongGon({ ...x, phu: `${money(x.o.vong_cuoi.price_vnd)}/kg · chờ bên mua lập hợp đồng`, chip: ["Đã đồng ý"] })), 3)}
  ${nhom("Đã xong, hết hạn", khac.map((x) => dongGon({ ...x, phu: `${money(x.o.vong_cuoi.price_vnd)}/kg`, chip: [nhan[x.o.status] || "Đã đóng", "xam"] })), 5, false)}`;
}

/* ---------- Danh sách hàng ---------- */
const tabBan = (dang, soChao) => `<nav class="sl-tab" aria-label="Bán hàng">${[["lots", "Hàng của tôi"], ["offers", "Lời chào" + (soChao ? ` <span class="sl-so-nho">${soChao}</span>` : "")], ["lots/ben-mua", "Bên mua cần"]].map(([h, t]) => `<a href="#/${h}" ${h === dang ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>`;
async function soChaoCho(c) {
  const ds = await c.api.get("/v1/offers").catch(() => []);
  return ds.filter((o) => o.status === "sent" && o.vong_cuoi.from_side !== "seller").length;
}
export async function benMuaCan(c) {
  const [demands, lots, so] = await Promise.all([c.api.get("/v1/demands").catch(() => []), c.api.get("/v1/lots?mine=true").catch(() => []), soChaoCho(c)]);
  const cua = new Set(lots.map((l) => l.product_code));
  const ma = (d) => d.lines?.[0]?.product_code || d.product_code;
  const dong = (d) => {
    const l0 = d.lines?.[0] || {};
    const kg = (d.lines || []).reduce((t, x) => t + Number(x.qty_g || 0), 0);
    return dongGon({ href: "#/demands/" + d.id, img: anh(ma(d)), ten: `${tenHang(c, ma(d))}${l0.grade_code ? " · loại " + l0.grade_code : ""}`, phu: `${d.buyer_name || "Bên mua đã xác minh"}${d.needed_from ? " · cần " + date(d.needed_from).slice(0, 5) : ""}`, so: kg ? quantity(String(kg)) : "" });
  };
  const hop = demands.filter((d) => cua.has(ma(d))), khac = demands.filter((d) => !cua.has(ma(d)));
  return `${dauMuc("Bán hàng")}${tabBan("lots/ben-mua", so)}
  ${nhom("Cùng mặt hàng chị bán", hop.map(dong), 5)}
  ${nhom("Mặt hàng khác", khac.map(dong), 3, false)}
  ${!demands.length ? `<div class="sl-the">Chưa có bên mua nào đang cần.</div>` : ""}`;
}
export async function lotList(c) {
  const [lots, so] = await Promise.all([c.api.get("/v1/lots?mine=true"), soChaoCho(c)]);
  const d = (l) => ({ href: "#/lots/" + l.id, img: anh(l.product_code), ten: `${tenHang(c, l.product_code)} · loại ${l.grade_code}`, phu: `Còn bán ${kgGon(l.available_g)}${l.available_from ? " · có hàng " + date(l.available_from).slice(0, 5) : ""}`, so: "" });
  const conHang = (l) => Number(l.available_g || 0) > 0;
  const theo = (st, can = true) => lots.filter((l) => st.includes(l.status) && (!can || conHang(l))).map(d);
  return `${dauMuc("Bán hàng")}${tabBan("lots", so)}
  ${!lots.length ? `<div class="sl-the sl-trong"><img src="${TRAU}12-ghi-so.webp" alt=""><div><b>Chưa có hàng nào</b><p class="sl-nho">Bấm nút + ở giữa thanh dưới để đăng hàng.</p></div></div>` : ""}
  ${nhom("Đang bán", theo(["on_sale"]).map((x) => dongGon({ ...x })), 5)}
  ${nhom("Sắp có hàng", theo(["upcoming"]).map((x) => dongGon({ ...x, chip: ["Sắp có", "vang"] })), 5)}
  ${nhom("Chưa đăng", theo(["draft"]).map((x) => dongGon({ ...x, chip: ["Chưa đăng", "xam"] })), 3)}
  <a class="sl-the sl-ban-truoc" href="#/dat-truoc"><div><b>Có hàng cho vụ sau?</b><span class="sl-nho">Đặt trước khi hái, bao tiêu cả vụ</span></div>${toi}</a>
  ${nhom("Đã đóng, hết hàng", [...theo(["closed", "sold_out", "hidden"], false), ...lots.filter((l) => ["on_sale", "upcoming"].includes(l.status) && !conHang(l)).map(d)].map((x) => dongGon({ ...x, chip: ["Đã đóng", "xam"] })), 5, false)}`;
}

/* ---------- Danh sách đơn hàng ---------- */
export async function orderList(c) {
  const orders = await c.api.get("/v1/orders");
  const d = (o) => ({ href: "#/order/" + o.id, img: "", ten: o.buyer_name, phu: `${o.code} · ${o.hien_thi?.toi_luot ? o.hien_thi.toi_luot.viec : o.hien_thi?.ten || ""}`, so: tienGon(o.contract_value_vnd) });
  const toiMinh = orders.filter((o) => o.hien_thi?.toi_luot?.phia === "seller");
  const choBen = orders.filter((o) => !["completed", "closed"].includes(o.status) && o.hien_thi?.toi_luot?.phia !== "seller");
  const xong = orders.filter((o) => o.status === "completed");
  const dong = orders.filter((o) => o.status === "closed");
  return `${dauMuc("Đơn hàng", "home")}
  ${!orders.length ? `<div class="sl-the sl-trong"><img src="${TRAU}04-nghe.webp" alt=""><div><b>Chưa có đơn hàng</b><p class="sl-nho">Đồng ý một lời chào giá, bên mua lập hợp đồng là có đơn.</p></div></div>` : ""}
  ${nhom("Tới lượt chị", toiMinh.map((o) => dongGon({ ...d(o), vang: true, chip: [o.hien_thi.chang, "vang"] })), 5)}
  ${nhom("Đang chờ bên mua", choBen.map((o) => dongGon({ ...d(o), phu: `${o.buyer_name} chưa ${loiThuong((o.hien_thi?.toi_luot?.viec || o.hien_thi?.ten || "").toLowerCase())} · ${o.code}`, ten: o.buyer_name, chip: [o.hien_thi?.chang ? "Chờ " + o.hien_thi.chang.toLowerCase() : "Đang chờ", "xam"] })), 5)}
  ${nhom("Đã xong", xong.map((o) => dongGon({ ...d(o), phu: o.code + " · tiền đã về đủ", chip: ["Xong"] })), 3, false)}
  ${nhom("Đã đóng", dong.map((o) => dongGon({ ...d(o), phu: o.code + " · " + (o.hien_thi?.ten || "đã đóng"), chip: ["Đóng", "xam"] })), 3, false)}`;
}

/* ---------- Chi tiết đơn ---------- */
// Đổi câu việc kỹ thuật từ backend sang lời thường.
const loiThuong = (x = "") => x
  .replace(/[Tt]rả khoản trước bốc/, "trả tiền trước khi bốc hàng")
  .replace(/[Cc]huyển cọc/, "chuyển cọc vào ngân hàng")
  .replace(/[Cc]hỉ định người nhận, đặt xe/, "cử người nhận và đặt xe")
  .replace(/[Kk]ý và gửi/, "ký hợp đồng");
const CHANG = ["Ký", "Cọc", "Giao nhận", "Thanh toán", "Xong"];
const SUB_CHANG = { Ký: "terms", Cọc: "deposit", "Giao nhận": "delivery", "Thanh toán": "payments" };
const TEN_MUC = { terms: "Hợp đồng", deposit: "Cọc", payments: "Tiền bên mua trả", delivery: "Giao nhận", money: "Tính tiền cuối", documents: "Giấy tờ", cancel: "Xin hủy", disputes: "Sự cố, tranh chấp", amendments: "Đề nghị sửa" };
const dayChang = (at) => {
  const i = CHANG.indexOf(at);
  return `<div class="sl-buoc" aria-label="Các bước của đơn"><div>${CHANG.map((_, k) => `<i class="${k < i || at === "Xong" ? "xong" : k === i ? "dang" : ""}"></i>`).join("")}</div><div class="sl-buoc-chu">${CHANG.map((x, k) => (k === i ? `<b aria-current="step">${x}</b>` : `<span>${x}</span>`)).join("")}</div></div>`;
};
export async function order(c, id, sub) {
  const o = await c.api.get(`/v1/orders/${id}`);
  c.currentOrder = o;
  const ben = o.buyer?.display_name || "Bên mua";
  if (sub) {
    const rieng = { payments: manTien, terms: manHopDong, deposit: manCoc, delivery: manGiaoNhan }[sub];
    const than = rieng ? await rieng(c, o) : await orderPart(c, o, sub);
    return `${dauMuc(TEN_MUC[sub] || "Chi tiết", "order/" + id)}<p class="sl-nho sl-ma">${e(o.code)} · ${e(ben)}</p>${dayChang(o.hien_thi.chang)}<div class="sl-con">${than}</div>`;
  }
  const d = o.dieu_khoan || {};
  let sp = c.products.find((x) => x.code === d.product_code);
  if (!sp) {
    const dk = await c.api.get(`/v1/orders/${o.id}/terms`).catch(() => null);
    const ten1 = dk?.the?.[0]?.noi_dung?.split(/ loại | \d/)[0];
    sp = c.products.find((x) => ten1 && ten1.startsWith(x.name_vi)) || (ten1 ? { name_vi: ten1 } : null);
  }
  const ten = xung(c.user.name);
  const toiMinh = o.hien_thi.toi_luot?.phia === "seller";
  const dot = (o.dot_giao || [])[0];
  const han = o.han?.[0]?.due_at;
  const sub0 = SUB_CHANG[o.hien_thi.chang];
  const bayGio = o.status === "completed"
    ? `<section class="sl-the sl-bay-gio xong"><img src="${TRAU}11-mung.webp" alt=""><div><b>Đơn đã xong</b><p class="sl-nho">Tiền đã về đủ. Hồ sơ lưu trong Giấy tờ.</p></div></section>`
    : o.status === "closed"
    ? `<section class="sl-the sl-bay-gio"><div><b>Đơn đã đóng</b><p class="sl-nho">${e(o.hien_thi.ten)}</p></div></section>`
    : toiMinh
    ? `<section class="sl-the sl-bay-gio toi" data-guide="viec"><span class="sl-chip vang">Tới lượt ${e(ten)}${han ? " · " + e(gioHan(han)) : ""}</span><b>${e(hoaDau(loiThuong(o.hien_thi.toi_luot.viec)))}</b><a class="sl-nut" href="#/order/${e(id)}/${sub0 || "terms"}">Làm ngay</a></section>`
    : `<section class="sl-the sl-bay-gio"><span class="sl-chip xam">Đang chờ bên mua</span><b>${e(ben)} chưa ${e(loiThuong((o.hien_thi.toi_luot?.viec || o.hien_thi.ten).toLowerCase()))}</b><p class="sl-nho">Chị chưa cần làm gì. Có thay đổi app sẽ báo.</p></section>`;
  const giao = { at_farm: "Tại vườn", at_buyer: "Tại kho bên mua" }[d.delivery_mode] || "Theo hợp đồng";
  const tra = d.payment_timing === "before_loading" ? "Trước khi bốc hàng" : d.pay_after_days ? `Sau ${d.pay_after_days} ngày` : "Khi nhận hàng";
  return `${dauMuc(`${sp?.name_vi || "Đơn hàng"} · ${quantity(d.qty_g)}`, "orders")}<p class="sl-nho sl-ma">${e(ben)} · ${e(o.code)}</p>
  ${dayChang(o.hien_thi.chang)}
  ${bayGio}
  <section class="sl-the"><span class="sl-nho">Giá trị hợp đồng</span><div class="sl-so-lon">${e(money(d.contract_value_vnd).replace(" đ", ""))} <small>đ</small></div><div class="sl-tien-phu"><span>${["awaiting_deposit", "drafting"].includes(o.status) ? `Cọc bên mua cần chuyển: <b>${e(money(d.deposit_vnd))}</b>` : o.status === "active" ? `Ngân hàng đã nhận cọc <b>${e(money(d.deposit_vnd))}</b>` : `Cọc <b>${e(money(d.deposit_vnd))}</b>`}</span></div></section>
  <section class="sl-the sl-dong-ds">
    <div class="sl-dong"><span>Hàng</span><b>${e(sp?.name_vi || "")} ${e(quantity(d.qty_g))} × ${e(money(d.unit_price_vnd))}</b></div>
    <div class="sl-dong"><span>Giao</span><b>${e(giao)}${dot ? " · " + e(date(dot.window_from).slice(0, 5)) : ""}${d.transport_by === "buyer" ? " · bên mua lo xe" : ""}</b></div>
    <div class="sl-dong"><span>Trả tiền</span><b>${e(tra)}</b></div>
    <div class="sl-dong"><span>Nhận vào</span><b>${e(d.seller_account?.masked || "")} · ${e(d.seller_account?.holder || "")}</b></div>
  </section>
  <section class="sl-nhom"><div class="sl-tieu"><h2>Chi tiết</h2></div><div class="sl-ds-gon">${["terms", "deposit", "payments", "delivery", "money", "documents"].map((k) => `<a class="sl-dg" href="#/order/${e(id)}/${k}"><div class="sl-dg-chu"><b>${TEN_MUC[k]}</b></div>${toi}</a>`).join("")}</div></section>
  <details class="sl-nhom sl-nhom-dong"><summary><span>Gặp vấn đề?</span></summary><div class="sl-ds-gon">${["disputes", "amendments", "cancel"].map((k) => `<a class="sl-dg" href="#/order/${e(id)}/${k}"><div class="sl-dg-chu"><b>${TEN_MUC[k]}</b></div>${toi}</a>`).join("")}<a class="sl-dg" href="#/support"><div class="sl-dg-chu"><b>Gọi nhân viên AgiViet</b></div>${toi}</a></div></details>`;
}

/* ---------- Màn con: xác nhận tiền về (thiết kế mục 4) ---------- */
const TEN_KHOAN = { goods_before_loading: "Tiền trước khi bốc hàng", goods_on_receipt: "Tiền khi nhận hàng", goods_after_days: "Tiền trả sau" };
async function manTien(c, o) {
  const list = await c.api.get(`/v1/orders/${o.id}/payments`);
  const ben = o.buyer?.display_name || "Bên mua";
  const tk = o.dieu_khoan?.seller_account || {};
  const nhan = list.filter((p) => p.direction === "buyer_to_seller");
  const conMo = nhan.filter((p) => !["fully_received", "cancelled", "not_due"].includes(p.status));
  for (const p of conMo) {
    const con = (BigInt(p.amount_due_vnd || 0) - BigInt(p.confirmed_vnd || 0)).toString();
    const daBao = BigInt(p.reported_vnd || 0) > 0n ? (BigInt(p.reported_vnd) - BigInt(p.confirmed_vnd || 0)).toString() : con;
    c.on["du-" + p.id] = () => { c.state.tien = { id: p.id, kieu: "full", so: daBao }; };
    c.on["mot-phan-" + p.id] = () => { c.state.tien = { id: p.id, kieu: "partial", so: "" }; };
    c.on["chua-" + p.id] = () => c.command(`/v1/payments/${p.id}/not-received`, {});
    c.on["thoi-" + p.id] = () => { delete c.state.tien; delete c.state.otp; };
    c.forms["chuanBi-" + p.id] = async (f) => {
      const so = f.get("amount") || c.state.tien.so;
      c.state.otp = { kind: "money", payment: p.id, amount: so, result: c.state.tien.kieu, ref: f.get("ref"),
        challenge: await c.api.post("/v1/otp/challenges", { purpose: "money_received", payment_id: p.id, amount_vnd: so }) };
    };
    c.forms["xacNhan-" + p.id] = async (f) => {
      const st = c.state.otp;
      await c.command(`/v1/payments/${p.id}/confirm`, { challenge_id: st.challenge.challenge_id, code: f.get("code"), amount_vnd: st.amount, result: st.result, bank_txn_ref: st.ref, method: "bank_transfer" });
      delete c.state.otp; delete c.state.tien;
    };
  }
  const the = (p) => {
    const con = (BigInt(p.amount_due_vnd || 0) - BigInt(p.confirmed_vnd || 0)).toString();
    const daBao = BigInt(p.reported_vnd || 0) > BigInt(p.confirmed_vnd || 0);
    const so = daBao ? (BigInt(p.reported_vnd) - BigInt(p.confirmed_vnd || 0)).toString() : con;
    const coQuyen = c.can("money.confirm.seller");
    const dangOtp = c.state.otp?.payment === p.id, dangChon = c.state.tien?.id === p.id;
    const cau = `Mở ứng dụng ngân hàng (tài khoản ${tk.masked || ""}), xem đã có ${money(so)} chưa.`;
    let nut = "";
    if (coQuyen && dangOtp)
      nut = `<form data-form="xacNhan-${p.id}" class="sl-otp-form"><div class="sl-canh do">${canh}<span>${e(fraud)}</span></div>${otpBox("Mã xác nhận đã nhận " + money(c.state.otp.amount))}<div class="sl-day"><button class="sl-nut" data-ok="Đã xác nhận">Xác nhận đã nhận ${e(money(c.state.otp.amount))}</button><button type="button" class="sl-nut phu" data-action="thoi-${p.id}">Thôi</button></div></form>`;
    else if (coQuyen && dangChon)
      nut = `<form data-form="chuanBi-${p.id}" class="sl-form">${c.state.tien.kieu === "partial" ? field("Số tiền đã thấy trong tài khoản (đ)", "amount", "number", "", 'min="1" step="1" inputmode="numeric" required') : ""}${field("Mã giao dịch trong ứng dụng ngân hàng", "ref", "text", "", 'required autocomplete="off"')}<div class="sl-day"><button class="sl-nut">Nhận mã xác nhận</button><button type="button" class="sl-nut phu" data-action="thoi-${p.id}">Thôi</button></div></form>`;
    else if (coQuyen)
      nut = `<div class="sl-day" data-guide="nut"><button type="button" class="sl-nut" data-action="du-${p.id}">Đã thấy đủ ${e(money(so))}</button><div class="sl-hai"><button type="button" class="sl-nut phu" data-action="mot-phan-${p.id}">Mới nhận một phần</button><button type="button" class="sl-nut phu" data-action="chua-${p.id}" data-ok="Đã báo">Chưa thấy</button></div></div>`;
    else nut = `<p class="sl-nho">Chủ hộ hoặc người được giao mới xác nhận được tiền.</p>`;
    return `<p class="sl-cau-dau">${e(cau)}</p>
    <section class="sl-the" data-guide="so-tien"><span class="sl-nho">${daBao ? e(ben) + " báo đã chuyển" : e(TEN_KHOAN[p.kind] || "Khoản cần nhận")}</span><div class="sl-so-lon"><span data-dem="${so}" data-hau="">${e(money(so).replace(" đ", ""))}</span> <small>đ</small></div><p class="sl-chu-so">${e(moneyWords(so))}</p><div class="sl-chips">${p.due_at ? `<span class="sl-chip vang">${e(gioHan(p.due_at))}</span>` : ""}${daBao ? "" : `<span class="sl-chip">Bên mua chưa báo chuyển</span>`}</div></section>
    ${dangOtp ? "" : `<div class="sl-canh do">${canh}<span>Chỉ bấm khi chính mình thấy tiền trong tài khoản. Ảnh chụp biên lai chưa phải tiền về.</span></div>`}
    ${nut}`;
  };
  const xong = nhan.filter((p) => p.status === "fully_received");
  return `${conMo.map(the).join('<hr class="sl-ke">') || `<div class="sl-the sl-trong"><img src="${TRAU}${xong.length ? "11-mung" : "04-nghe"}.webp" alt=""><div><b>${xong.length ? "Đã nhận đủ tiền bên mua trả thẳng" : "Chưa có khoản nào cần xác nhận"}</b><p class="sl-nho">${xong.length ? "Ngân hàng sẽ chuyển tiền cọc khi đơn xong." : "Khi bên mua chuyển tiền, app sẽ báo."}</p></div></div>`}
  ${xong.length ? nhom("Đã nhận", xong.map((p) => dongGon({ href: "#/order/" + o.id + "/payments", ten: TEN_KHOAN[p.kind] || "Khoản tiền", phu: "Đã xác nhận", so: tienGon(p.confirmed_vnd), chip: ["Đã nhận"] })), 3, false) : ""}`;
}

/* ---------- Màn con: hợp đồng và ký ---------- */
async function manHopDong(c, o) {
  const t = await c.api.get(`/v1/orders/${o.id}/terms`);
  const d = o.dieu_khoan || {};
  const doc = o.tai_lieu?.find((x) => x.doc_type === "contract");
  const kyDuoc = o.hanh_dong?.includes("sign");
  c.forms.chuanBiKy = async (f) => {
    c.state.otp = { kind: "sign", order: o.id, ack: f.get("commitment") === "on", abnormal: f.get("abnormal") === "on",
      challenge: await c.api.post("/v1/otp/challenges", { purpose: "contract_sign", document_id: doc.id }) };
  };
  c.forms.ky = async (f) => {
    const st = c.state.otp;
    await c.command(`/v1/orders/${o.id}/sign`, { challenge_id: st.challenge.challenge_id, code: f.get("code"), commitment_ack: st.ack, abnormal_price_ack: st.abnormal, expected_revision: o.revision });
    delete c.state.otp;
  };
  c.on.thoiKy = () => { delete c.state.otp; };
  const daKy = doc?.status === "fully_signed";
  const trangThai = daKy ? `<div class="sl-the sl-trong"><img src="${TRAU}11-mung.webp" alt=""><div><b>Hai bên đã ký</b><p class="sl-nho">Hợp đồng có hiệu lực khi ngân hàng nhận đủ cọc.</p></div></div>`
    : !kyDuoc ? `<div class="sl-the"><b>${e(o.ky?.ly_do || "Chưa tới lượt ký")}</b><p class="sl-nho">Bên mua ký trước, sau đó tới lượt mình.</p></div>` : "";
  const ky = !kyDuoc || daKy ? "" : c.state.otp?.kind === "sign"
    ? `<form data-form="ky" class="sl-otp-form"><div class="sl-canh do">${canh}<span>${e(fraud)}</span></div>${otpBox("Mã ký hợp đồng")}<div class="sl-day"><button class="sl-nut" data-ok="Đã ký">Ký hợp đồng</button><button type="button" class="sl-nut phu" data-action="thoiKy">Thôi</button></div></form>`
    : `<form data-form="chuanBiKy" class="sl-form"><label class="sl-dong-y"><input type="checkbox" name="commitment" required><span>Tôi đã đọc hợp đồng, đồng ý lượng hàng, giá và tài khoản nhận tiền.</span></label>${o.co?.gia_bat_thuong ? `<label class="sl-dong-y"><input type="checkbox" name="abnormal" required><span>Giá này khác thường so với thị trường; tôi vẫn đồng ý.</span></label>` : ""}<div class="sl-day" data-guide="nut"><button class="sl-nut">Nhận mã ký</button></div></form>`;
  return `<section class="sl-the"><span class="sl-nho">Mình nhận về</span><div class="sl-so-lon">${e(money(d.contract_value_vnd).replace(" đ", ""))} <small>đ</small></div><p class="sl-nho">${e(quantity(d.qty_g))} × ${e(money(d.unit_price_vnd))}/kg · hàng hạ cấp ${e(money(d.downgrade_price_vnd))}/kg</p></section>
  ${trangThai}
  ${doc ? `<button type="button" class="sl-nut phu" data-action="pdf:${e(doc.id)}">Xem toàn văn hợp đồng (PDF)</button>` : ""}
  <details class="sl-nhom sl-nhom-dong"><summary><span>${t.the.length} điều khoản chính</span><span class="sl-nho">Xem</span></summary><div class="sl-ds-gon">${t.the.map((x) => `<div class="sl-dg sl-dk"><div class="sl-dg-chu"><b>${e(x.so)}. ${e(x.tieu_de)}</b><span class="sl-dk-chu">${e(x.noi_dung.replace(/Agribank|Vietcombank|Vietinbank|Sacombank|BIDV/gi, "Ngân hàng ảo AgiViet"))}</span></div></div>`).join("")}</div></details>
  ${ky}<div data-pdf-host></div>`;
}

/* ---------- Màn con: giao nhận ---------- */
const PHAN = { accepted: ["Đạt", ""], downgraded: ["Hạ cấp", "vang"], rejected: ["Trả lại", "do"] };
function lyDoDe(x, ben) {
  if (x.ma === "tien") return `${ben} chưa trả đủ tiền trước khi bốc${(x.ly_do || "").match(/([\d.]+ đ)/) ? " (còn thiếu " + x.ly_do.match(/([\d.]+ đ)/)[1] + ")" : ""}`;
  if (x.ma === "nguoi_nhan") return `${ben} chưa cử người nhận hàng`;
  if (x.ma === "xe") return `${ben} chưa đặt xe`;
  return x.ly_do || x.ten;
}
async function manGiaoNhan(c, o) {
  if (!o.dot_giao?.length) return `<p class="sl-cau-dau">Chưa có đợt giao.</p><p class="sl-nho">Đợt giao có sau khi ngân hàng nhận đủ cọc.</p>`;
  const did = o.dot_hien_hanh_id || o.dot_giao.at(-1).id;
  const d = await c.api.get("/v1/deliveries/" + did);
  const ben = o.buyer?.display_name || "Bên mua";
  const kq = d.ket_qua?.at(-1);
  c.forms.batDau = (f) => c.command(`/v1/deliveries/${did}/start-check`, { ma_6_so: f.get("code"), plate_no: f.get("plate") || undefined });
  c.forms.dongY = (f) => c.command(`/v1/deliveries/${did}/acceptance/agree`, { pin: f.get("pin"), expected_sha256: kq.content_sha256 });
  c.on.khongDung = () => { c.state.khongDung = true; };
  if (c.state.khongDung) return `<p class="sl-cau-dau">Chọn dòng chị thấy chưa đúng.</p>${await orderPart(c, o, "delivery")}`;
  const gio = (iso) => { const t = new Date(iso); const g = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", minute: "2-digit", hour12: false }).format(t).replace(":", " giờ "); const n = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" }).format(t); return `${g}, ${n}`; };
  const khung = `<section class="sl-the sl-dong-ds"><div class="sl-dong"><span>Lượng giao</span><b>${e(quantity(d.planned_qty_g))}</b></div><div class="sl-dong"><span>Nơi giao</span><b>${d.acceptance_point === "tai_vuon" ? "Tại vườn" : "Tại kho bên mua"}</b></div><div class="sl-dong"><span>Thời gian</span><b>${e(gio(d.window_from))} – ${e(gio(d.window_to))}</b></div></section>`;
  if (d.status === "preparing" || d.status === "ready") {
    const thieu = (d.the_san_sang || []).filter((x) => !x.ok), du = (d.the_san_sang || []).filter((x) => x.ok);
    return `<p class="sl-cau-dau">${thieu.length ? "Chưa giao được. Đang chờ bên mua chuẩn bị." : "Đủ điều kiện. Khi xe tới, nhập mã của người nhận để bắt đầu cân."}</p>
    ${khung}
    ${thieu.length ? `<section class="sl-nhom"><div class="sl-tieu"><h2>Còn chờ</h2></div><div class="sl-ds-gon">${thieu.map((x) => `<div class="sl-dg"><span class="sl-dk-o cho"></span><div class="sl-dg-chu"><b>${e(x.ten)}</b><span>${e(lyDoDe(x, ben))}</span></div></div>`).join("")}</div></section>` : ""}
    ${du.length ? `<details class="sl-nhom sl-nhom-dong"><summary><span>Đã đủ ${du.length}</span><span class="sl-nho">Xem</span></summary><div class="sl-ds-gon">${du.map((x) => `<div class="sl-dg"><span class="sl-dk-o du">✓</span><div class="sl-dg-chu"><b>${e(x.ten)}</b></div></div>`).join("")}</div></details>` : ""}
    ${!thieu.length && c.can("delivery.record") !== false ? `<form data-form="batDau" class="sl-form sl-otp-form">${otpBox("Mã 6 số trên máy người nhận")}${field("Biển số xe (nếu có)", "plate", "text", "", 'autocomplete="off"')}<div class="sl-day"><button class="sl-nut" data-ok="Bắt đầu cân">Bắt đầu cân hàng</button></div></form><p class="sl-nho">Không đọc mã này qua điện thoại. Người nhận phải có mặt tại vườn.</p>` : ""}`;
  }
  if (kq && !kq.seller_agreed_at && (kq.lines || []).length) {
    const tong = (k) => (kq.lines || []).filter((l) => l.kind === k).reduce((t, l) => t + Number(l.qty_g || 0), 0);
    return `<p class="sl-cau-dau">${ben} đã cân xong. Chị xem kết quả rồi ký đồng ý.</p>
    <section class="sl-ba-phan">${Object.entries(PHAN).map(([k, [t, m]]) => `<div class="sl-the"><span class="sl-chip ${m}">${t}</span><b>${e(quantity(String(tong(k))))}</b></div>`).join("")}</section>
    ${khung}
    <form data-form="dongY" class="sl-form sl-otp-form">${field("Mã PIN ký biên bản", "pin", "password", "", 'inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" required class="sl-o-otp"')}<div class="sl-day"><button class="sl-nut" data-ok="Đã ký biên bản">Đồng ý kết quả cân</button><button type="button" class="sl-nut phu" data-action="khongDung">Không đúng</button></div></form>`;
  }
  const TT = { checking: "Đang cân và kiểm hàng.", in_transit: "Hàng đang trên đường tới bên mua.", arrival_check: "Bên mua đang kiểm hàng ở nơi đến.", arrived: "Hàng đã tới nơi.", completed: "Đợt giao đã xong.", disputed: "Có phần đang tranh chấp, nhân viên AgiViet đang xử lý." };
  return `<p class="sl-cau-dau">${e(TT[d.status] || "Đang giao nhận.")}</p>${khung}<details class="sl-nhom sl-nhom-dong"><summary><span>Chi tiết đợt giao</span></summary><div class="sl-con">${await orderPart(c, o, "delivery")}</div></details>`;
}

/* ---------- Màn con: cọc ---------- */
async function manCoc(c, o) {
  const m = await c.api.get(`/v1/orders/${o.id}/money`);
  const d = o.dieu_khoan || {};
  const st = m.coc?.status;
  const giu = ["held", "confirmed", "received"].includes(st);
  const cau = giu ? `Ngân hàng đang giữ ${money(d.deposit_vnd)} tiền cọc cho mình.` : st === "awaiting_transfer" ? `Đang chờ ${o.buyer?.display_name || "bên mua"} chuyển cọc vào ngân hàng.` : "Cọc chưa bắt đầu: hai bên cần ký hợp đồng trước.";
  return `<p class="sl-cau-dau">${e(cau)}</p>
  <section class="sl-the"><span class="sl-nho">Tiền cọc (30%)</span><div class="sl-so-lon">${e(money(d.deposit_vnd).replace(" đ", ""))} <small>đ</small></div><div class="sl-chips"><span class="sl-chip ${giu ? "" : "vang"}">${giu ? "Ngân hàng đang giữ" : "Chưa có cọc"}</span>${o.han?.[0] && !giu ? `<span class="sl-chip vang">${e(gioHan(o.han[0].due_at))}</span>` : ""}</div></section>
  <section class="sl-the sl-dong-ds"><div class="sl-dong"><span>Khi giao xong</span><b>Ngân hàng chuyển cọc cho mình</b></div><div class="sl-dong"><span>Bên mua hủy</span><b>Cọc về mình</b></div><div class="sl-dong"><span>Mình hủy</span><b>Cọc về bên mua</b></div></section>
  ${rule("Cọc nằm trong tài khoản đảm bảo của ngân hàng, không phải tài khoản của AgiViet hay của bên mua. Chưa có cọc thì chưa giao hàng.")}`;
}

/* ---------- Chi tiết lô ---------- */
const TINH = { DT: "Đồng Tháp", CT: "Cần Thơ", VL: "Vĩnh Long", AG: "An Giang", CM: "Cà Mau", TN: "Tây Ninh", HCM: "TP. Hồ Chí Minh" };
export async function lotDetail(c, id) {
  const [l, source] = await Promise.all([c.api.get("/v1/lots/" + id), c.api.get(`/v1/lots/${id}/source-profile`).catch(() => null)]);
  c.on.available = () => c.command(`/v1/lots/${id}/confirm-available`);
  c.on.publish = () => c.command(`/v1/lots/${id}/publish`, { expected_revision: l.revision });
  c.on.closeLot = () => c.command(`/v1/lots/${id}/close`);
  c.on.banGap = () => c.go("ban-gap");
  c.forms.lotPhoto = async (f) => {
    const file = f.get("photo");
    const data = await new Promise((ok, loi) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = loi; r.readAsDataURL(file); });
    await c.api.command("/v1/files", { mime: file.type, data_base64: data, entity: "lot", entity_id: id, captured_in_app: true });
    c.flash("Đã lưu ảnh hàng.");
  };
  const q = l.qty || {};
  const NGAN = { held: "Bên mua đang giữ chỗ", committed: "Đã ký bán", in_transit: "Đang giao", delivered: "Đã giao", returned_pending: "Bị trả lại chờ xử lý", moved_to_child: "Đã tách sang lô khác", loss: "Hao hụt" };
  const ngan = Object.entries(NGAN).filter(([k]) => Number(q[k] || 0) > 0);
  const tt = { on_sale: ["Đang bán", ""], upcoming: ["Sắp có hàng", "vang"], draft: ["Chưa đăng", "xam"], closed: ["Đã đóng", "xam"], sold_out: ["Hết hàng", "xam"], hidden: ["Tạm ẩn", "xam"] }[l.status] || [l.status, "xam"];
  const mo = ["on_sale", "upcoming", "draft"].includes(l.status);
  const giayTo = source?.giay_to || [];
  return `${dauMuc(l.product_name || tenHang(c, l.product_code), "lots")}<p class="sl-nho sl-ma">${e(l.code)} · loại ${e(l.grade_code)}</p>
  <section class="sl-the sl-lo-dau"><img src="${anh(l.product_code)}" alt=""><div><span class="sl-chip ${tt[1]}">${e(tt[0])}</span><div class="sl-so-lon">${e(quantity(q.available ?? l.declared_qty_g).replace(" kg", ""))} <small>kg còn bán</small></div><p class="sl-nho">${l.qty_basis === "weighed" ? "Đã cân" : "Mới ước"} · có hàng ${e(date(l.available_from).slice(0, 5))}</p></div></section>
  <section class="sl-the sl-dong-ds">
    ${l.ask_price_vnd ? `<div class="sl-dong"><span>Giá mong muốn</span><b>${e(money(l.ask_price_vnd))}/kg</b></div>` : ""}
    ${l.floor_price_vnd ? `<div class="sl-dong"><span>Giá thấp nhất (chỉ mình thấy)</span><b>${e(money(l.floor_price_vnd))}/kg</b></div>` : ""}
    ${l.harvest_on ? `<div class="sl-dong"><span>Ngày hái</span><b>${e(date(l.harvest_on))}</b></div>` : ""}
    ${ngan.map(([k, t]) => `<div class="sl-dong"><span>${t}</span><b>${e(quantity(q[k]))}</b></div>`).join("")}
  </section>
  ${mo && c.seller ? `<div class="sl-day">${l.status === "draft" && c.can("lot.publish") ? `<button type="button" class="sl-nut" data-action="publish" data-ok="Đã đăng">Đăng cho bên mua thấy</button>` : c.can("lot.update") ? `<button type="button" class="sl-nut" data-action="available" data-ok="Đã xác nhận">Xác nhận vẫn còn hàng</button>` : ""}<div class="sl-hai">${l.status !== "draft" ? `<button type="button" class="sl-nut phu" data-action="banGap">Bán gấp</button>` : ""}${c.can("lot.close") ? `<button type="button" class="sl-nut phu" data-action="closeLot" data-ok="Đã đóng">Đóng lô</button>` : ""}</div></div>` : ""}
  <section class="sl-nhom"><div class="sl-tieu"><h2>Ảnh hàng</h2><span class="sl-nho">${(l.photos || []).length}</span></div>
  ${(l.photos || []).length ? `<div class="sl-anh-lo">${l.photos.map((ph) => `<img hidden data-document-image="${e(ph.id)}" data-lot-photo="true" alt="Ảnh lô hàng">`).join("")}</div>` : `<p class="sl-nho">Chưa có ảnh. Bên mua tin hơn khi thấy ảnh chụp tại vườn.</p>`}
  ${c.can("lot.create") ? `<form data-form="lotPhoto" class="sl-form"><label class="sl-chup">${svg('<path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/>')}<span>Chụp ảnh hàng</span><input type="file" name="photo" accept="image/*" capture="environment" required></label><button class="sl-nut phu">Lưu ảnh</button></form>` : ""}</section>
  ${source ? `<details class="sl-nhom sl-nhom-dong"><summary><span>Hồ sơ đã xác minh</span><span class="sl-nho">${giayTo.filter((g) => g.trang_thai === "da_xac_minh").length}/${giayTo.length}</span></summary><div class="sl-ds-gon">${giayTo.map((g) => dongGon({ href: "#/lots/" + id, ten: g.label_vi, phu: g.den ? "Đến " + date(g.den) : "", chip: [{ da_xac_minh: "Đã xác minh", tu_khai: "Tự khai", het_hieu_luc: "Hết hạn" }[g.trang_thai] || "Đang kiểm", g.trang_thai === "da_xac_minh" ? "" : "vang"] })).join("")}<div class="sl-dg"><div class="sl-dg-chu"><b>Vùng</b><span>${e(source.vi_tri?.ten || TINH[source.nguoi_ban?.tinh] || "")}</span></div></div></div></details>` : ""}`;
}

/* ---------- Thông báo ---------- */
const CAU_TB = {
  "offer.sent": "Có lời chào giá mới", "offer.countered": "Bên mua trả giá", "offer.accepted": "Đã đồng ý giá", "offer.rejected": "Đã từ chối lời chào",
  "offer.expired": "Lời chào hết hạn", "offer.withdrawn": "Bên mua rút lời chào",
  "order.created": "Bên mua lập hợp đồng", "order.signed": "Có bên vừa ký hợp đồng", "order.activated": "Hợp đồng có hiệu lực", "order.completed": "Đơn đã xong",
  "order.closed": "Đơn đã đóng", "deposit.confirmed": "Ngân hàng đã nhận cọc", "payment.reported": "Bên mua báo đã chuyển tiền", "payment.confirmed": "Đã xác nhận nhận tiền",
  "instruction.succeeded": "Ngân hàng đã chuyển tiền", "delivery.ready": "Đợt giao sẵn sàng", "dispute.opened": "Có sự cố cần xử lý",
};
export async function thongBao(c) {
  const ds = await c.api.get("/v1/notifications").catch(() => []);
  const cau = (t) => CAU_TB[t.event_type] || CAU_TB[t.event_type?.split(".").slice(0, 2).join(".")] || "Cập nhật giao dịch";
  const den = (t) => t.order_id ? "#/order/" + t.order_id : t.aggregate_type === "offer" ? "#/offers/" + t.aggregate_id : t.aggregate_type === "lot" ? "#/lots/" + t.aggregate_id : "#/home";
  // Gom các thông báo cùng loại liền nhau
  const nhomTb = [];
  for (const t of ds) {
    const k = cau(t), cuoi = nhomTb.at(-1);
    if (cuoi && cuoi.k === k) cuoi.n++; else nhomTb.push({ k, t, n: 1 });
  }
  const gio = (iso) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(iso));
  return `${dauMuc("Thông báo", "home")}${nhomTb.length ? `<div class="sl-ds-gon">${nhomTb.slice(0, 30).map(({ k, t, n }) => dongGon({ href: den(t), ten: n > 1 ? `${k} (${n})` : k, phu: gio(t.occurred_at), so: "" })).join("")}</div>` : `<div class="sl-the sl-trong"><img src="${TRAU}04-nghe.webp" alt=""><div><b>Chưa có thông báo</b></div></div>`}`;
}

/* ---------- Lối tắt và tiện ích ---------- */
// Chỉ gồm việc thanh dưới chưa có; không lặp Trang chủ, Hàng, Đăng, Đơn hàng, Tiền.
const LOI_TAT = [
  ["thoi-tiet", "Thời tiết", "M7 18a4 4 0 1 1 .5-8 6 6 0 0 1 11.5 2 3 3 0 0 1 0 6z"],
  ["nhat-ky", "Nhật ký vườn", "M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3"],
  ["tin-tuc", "Tin tức giá", "M4 5h14v14H6a2 2 0 0 1-2-2zM18 9h2v8a2 2 0 0 1-2 2M8 9h6M8 13h6"],
  ["dat-truoc", "Đặt trước khi hái", "M8 3v4M16 3v4M4 8h16v12H4zM9 14l2 2 4-4"],
  ["bao-tieu", "Bao tiêu theo vụ", "M4 12l4 4 12-12M4 20h16"],
  ["ban-gap", "Bán gấp", "M13 3L4 14h7l-1 7 9-11h-7z"],
  ["demands", "Bên mua cần", "M4 20C2 8 9 3 21 3c0 12-5 19-17 17Zm0 0L16 8"],
  ["lich-su", "Lịch sử", "M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"],
  ["support", "Gọi hỗ trợ", "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2"],
];
// Tính năng đã có trong đặc tả nhưng chưa có API: hiện rõ "đang làm" và giải thích dùng để làm gì.
const SAP_CO = {
  "nhat-ky-cu": ["Nhật ký vườn", "12-ghi-so", "Ghi lại bón phân, phun thuốc, ra hoa, thu hoạch theo từng ngày. Ngày hết cách ly thuốc tự lấy từ nhật ký để không đăng bán sớm. Nhân viên AgiViet có thể xác nhận nhật ký khi đến vườn; bên mua xuất khẩu sẽ hỏi phần này.", ["Ghi một việc trong 3 lần chạm, có ảnh", "Nhắc ngày hết cách ly thuốc", "Người giúp (con cháu) ghi thay được"]],
  "dat-truoc": ["Đặt trước khi hái", "dien-thoai", "Bên mua đặt hàng khi trái còn trên cây: chốt lượng ước, giá hoặc cách tính giá, cọc theo đợt. Gần ngày hái thì cập nhật sản lượng; mất mùa có phụ lục giảm lượng, không bị phạt vô lý.", ["Có người nhận hàng trước khi hái", "Cọc qua ngân hàng giữ hộ theo đợt", "Cập nhật sản lượng gần ngày hái"]],
  "bao-tieu": ["Bao tiêu theo vụ", "nghe", "Ký với một nhà máy hoặc doanh nghiệp nhận cả vụ theo lịch. Hợp đồng ghi rõ lượng, loại, giá sàn hoặc công thức giá, ai lo xe, khi nào trả tiền.", ["Đầu ra chắc cho cả vụ", "Giá sàn rõ ràng", "Nhân viên AgiViet theo dõi lịch thu hoạch"]],
  "ban-gap": ["Bán gấp", "lo", "Hàng tươi sắp hỏng hoặc bị trả lại? Bật bán gấp để lô lên đầu danh sách và báo ngay cho các nhà máy sấy, nước ép, vựa gần mình. App gợi ý giá theo giá tham khảo hàng loại 2, không ép mình hạ giá.", ["Báo ngay cho bên mua hàng chế biến", "Gợi ý sau 24 giờ không ai hỏi", "Có lời chào bao tiêu hàng dạt của đối tác"]],
};
export async function tienIch(c, view) {
  const [k] = view;
  if (k === "thoi-tiet") {
    const w = await c.api.get("/v1/weather").catch((err) => ({ loi: err }));
    if (w.loi) return sapCo(c, k, "Thời tiết", "nghe", w.loi.status === 503 ? "Chưa lấy được dự báo lúc này (mạng tới nguồn thời tiết lỗi). Thử lại sau ít phút." : "Dự báo mưa, nắng, gió 7 ngày ở vùng mình, kèm lời khuyên hái, che hàng, giờ giao.", ["Dự báo 7 ngày theo tỉnh", "Cảnh báo mưa lớn trước ngày hái", "Gợi ý giờ giao mát"]);
    const ngay = w.ngay || [];
    const thu = (d) => new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(d + "T12:00:00+07:00"));
    const homNay = ngay[0];
    const canhBao = ngay.find((d) => d.loi_khuyen?.length);
    return `${dauMuc("Thời tiết " + (w.tinh?.ten || ""), "home")}
    ${homNay ? `<section class="sl-the"><p class="sl-nho">Hôm nay</p><div class="sl-so-lon">${Math.round(homNay.nhiet_do_cao_c)}° <small>thấp ${Math.round(homNay.nhiet_do_thap_c)}°</small></div><p class="sl-chu-so">Khả năng mưa ${homNay.kha_nang_mua_phan_tram}% · mưa ${homNay.mua_mm} mm · gió ${Math.round(homNay.gio_manh_nhat_kmh)} km/h</p></section>` : ""}
    ${canhBao ? `<div class="sl-canh">${canh}<span><b>${e(thu(canhBao.ngay))}:</b> ${e(canhBao.loi_khuyen[0])}</span></div>` : ""}
    <section class="sl-the sl-dong-ds">${ngay.map((d) => `<div class="sl-dong"><span>${e(thu(d.ngay))}</span><b>${Math.round(d.nhiet_do_cao_c)}° · mưa ${d.kha_nang_mua_phan_tram}%${d.mua_mm >= 10 ? " · lớn" : ""}</b></div>`).join("")}</section>
    <p class="sl-nho">Nguồn: ${e(w.nguon || "Open-Meteo")} · lấy lúc ${e(date(w.lay_luc, { time: true }))}</p>`;
  }
  if (k === "tin-tuc") {
    const lots = await c.api.get("/v1/lots?mine=true").catch(() => []);
    const ma = lots[0]?.product_code;
    let n = await c.api.get("/v1/news" + (ma ? "?product=" + encodeURIComponent(ma) : "")).catch((err) => ({ loi: err }));
    let chung = false;
    if (!n.loi && !(n.tin || []).length) { n = await c.api.get("/v1/news").catch((err) => ({ loi: err })); chung = true; }
    if (n.loi) return sapCo(c, k, "Tin tức", "nghe", "Chưa lấy được tin lúc này. Thử lại sau ít phút.", ["Lọc theo mặt hàng và tỉnh", "Chỉ báo chính thống, ghi rõ nguồn", "Nghe đọc tiêu đề"]);
    const ds = n.tin || [];
    return `${dauMuc("Tin tức", "home")}
    ${chung ? `<p class="sl-nho">Chưa có tin riêng về ${e(tenHang(c, ma))}. Đây là tin nông nghiệp ở ${e(n.tinh || "vùng mình")}.</p>` : ""}
    ${ds.map((t) => `<a class="sl-the sl-don" href="${e(t.link)}" target="_blank" rel="noopener"><div><b>${e(t.tieu_de)}</b><span class="sl-nho">${e(t.nguon)} · ${e(date(t.ngay))}${t.theo_tinh ? " · " + e(n.tinh || "") : ""}</span></div>${toi}</a>`).join("") || `<div class="sl-the">Chưa có tin mới.</div>`}
    <p class="sl-nho">${e(n.ghi_chu || "")}</p>`;
  }
  if (k === "lich-su") {
    const h = await c.api.get("/v1/seller/history?limit=40").catch((err) => ({ loi: err }));
    if (h.loi) return sapCo(c, k, "Lịch sử làm ăn", "ghi-so", "Mọi việc đã làm theo thứ tự thời gian.", ["Xem theo vụ, theo mặt hàng", "Tiền về từng đơn", "Sự cố và cách đã xử lý"]);
    const ds = Array.isArray(h) ? h : h.items || [];
    const nhan = { lot: "Lô hàng", offer: "Lời chào", order: "Hợp đồng", payment: "Tiền", payout: "Ngân hàng chuyển", dispute: "Sự cố", cancellation: "Hủy" };
    return `${dauMuc("Lịch sử làm ăn", "home")}<ol class="sl-dong-thoi-gian">${ds.map((x) => `<li${x.order_id ? ` data-href="#/order/${e(x.order_id)}"` : ""}><span class="sl-nho">${e(date(x.luc, { time: true }))} · ${e(nhan[x.loai] || "Việc")} ${e(x.ma || "")}</span><b>${e(x.tieu_de)}</b>${x.so_tien_vnd ? `<span>${e(money(x.so_tien_vnd))}</span>` : ""}${x.order_id ? `<a class="sl-lien" href="#/order/${e(x.order_id)}">Mở đơn ${toi}</a>` : ""}</li>`).join("") || "<li>Chưa có việc nào.</li>"}</ol>`;
  }
  const [t, pose, mo, loi] = SAP_CO[k];
  return sapCo(c, k, t, pose, mo, loi);
}
function sapCo(c, k, title, pose, mo, loi) {
  const anhTrau = { "12-ghi-so": "12-ghi-so", "dien-thoai": "10-dien-thoai", nghe: "04-nghe", lo: "07-lo", "ghi-so": "12-ghi-so" }[pose] || "04-nghe";
  return `${dauMuc(title, "home")}<section class="sl-the sl-sap-co"><img src="${TRAU}${anhTrau}.webp" alt=""><div><span class="sl-chip vang">Đang làm, sắp có</span><p>${e(mo)}</p></div></section><section class="sl-the"><b>Khi xong, mình sẽ:</b><ul class="sl-ds">${loi.map((x) => `<li>${e(x)}</li>`).join("")}</ul></section><a class="sl-nut phu" href="#/support">Cần ngay? Nhờ nhân viên AgiViet làm giúp</a>`;
}


/* ---------- Tôi: chuyển từ bản mẫu fe-nongdan/js/man/toi.js ---------- */
const docMay = (k, md) => { try { return localStorage.getItem("agv-ban-" + k) ?? md; } catch { return md; } };
const luuMay = (k, v) => { try { localStorage.setItem("agv-ban-" + k, v); } catch {} };
// Áp cài đặt trên máy (cỡ chữ) mỗi lần vẽ màn.
export function apCaiDat() { if (typeof document !== "undefined") document.documentElement.dataset.coChu = docMay("co-chu", "vua"); }
apCaiDat();
export function manToi(c) {
  const muc = [["payout", "Tài khoản nhận tiền"], ["organization", "Người giúp và thành viên"], ["vuon", "Vườn, mùa vụ, mặt hàng"], ["lich-su", "Lịch sử làm ăn"], ["rieng-tu", "Quyền riêng tư"], ["cai-dat", "Cài đặt"], ["support", "Trung tâm hỗ trợ"]];
  return `${dauMuc("Tài khoản của tôi", "home")}
  <section class="sl-the sl-toi-the"><span class="sl-toi-chu">${e((c.user.name || "?").split(" ").pop().charAt(0))}</span><div><b>${e(c.user.name)}</b><span class="sl-nho">${e(c.user.phone || "")} · ${e(c.user.org?.name || "")}</span></div></section>
  <nav class="sl-ds-gon" aria-label="Các mục">${muc.map(([r, t]) => `<a class="sl-dg" href="#/${r}"><div class="sl-dg-chu"><b>${t}</b></div>${toi}</a>`).join("")}
  <button type="button" class="sl-dg" data-action="huongDan"><div class="sl-dg-chu"><b>Xem hướng dẫn dùng app</b></div>${toi}</button>
  <button type="button" class="sl-dg" data-action="install"><div class="sl-dg-chu"><b>Cài app vào điện thoại</b></div>${toi}</button></nav>
  <button type="button" class="sl-nut phu" data-action="logout">Đăng xuất</button>`;
}
export function caiDat(c) {
  const co = docMay("co-chu", "vua"), toc = docMay("toc-do", "0.95"), rung = docMay("rung", "1") === "1";
  c.on.datCo = (el) => { luuMay("co-chu", el.dataset.v); apCaiDat(); };
  c.on.datToc = (el) => { luuMay("toc-do", el.dataset.v); try { const u = new SpeechSynthesisUtterance("Đây là tốc độ đọc chị vừa chọn."); u.lang = "vi-VN"; u.rate = Number(el.dataset.v); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {} };
  c.on.datRung = () => { const b = !rung; luuMay("rung", b ? "1" : "0"); if (b) navigator.vibrate?.(80); };
  const nhom = (nhan, act, lua, gt) => `<div class="sl-cd"><span class="sl-cd-nhan">${nhan}</span><div class="sl-phan-doan">${lua.map(([v, t]) => `<button type="button" data-action="${act}" data-v="${v}" aria-pressed="${String(gt) === v}">${t}</button>`).join("")}</div></div>`;
  return `${dauMuc("Cài đặt", "toi")}
  <section class="sl-the">${nhom("Cỡ chữ", "datCo", [["vua", "Vừa"], ["lon", "Lớn"], ["rat_lon", "Rất lớn"]], co)}
  ${nhom("Tốc độ đọc khi bấm Nghe", "datToc", [["0.8", "Chậm"], ["0.95", "Vừa"], ["1.15", "Nhanh"]], toc)}
  <div class="sl-cd"><span class="sl-cd-nhan">Rung khi có việc mới</span><div class="sl-phan-doan"><button type="button" data-action="datRung" aria-pressed="${rung}">${rung ? "Đang bật" : "Đang tắt"}</button></div></div></section>
  <p class="sl-nho">Cài đặt lưu trên máy này.</p>`;
}
const RIENG_TU = [["Tên, xã/huyện", "Có", "Có"], ["Ảnh, mô tả lô, giấy kiểm nghiệm", "Có", "Có"], ["Hồ sơ nguồn gốc vườn", "Phần chị chọn", "Phần chị chọn"], ["Địa chỉ đến cấp ấp", "Có", "Có"], ["Số nhà, địa chỉ vườn", "Không", "Có"], ["Số điện thoại", "Không", "Có"], ["Tài khoản ngân hàng", "Không", "Không"]];
export function riengTu() {
  return `${dauMuc("Quyền riêng tư", "toi")}<p class="sl-cau-dau">Bên mua thấy gì về chị</p>
  <section class="sl-the sl-bang3"><div class="sl-b3 dau"><b>Thông tin</b><b>Trước cọc</b><b>Sau cọc</b></div>${RIENG_TU.map(([a, b, c2]) => `<div class="sl-b3"><span>${a}</span><span>${b}</span><span>${c2}</span></div>`).join("")}</section>
  <p class="sl-nho">Tin nhắn có số điện thoại, Zalo, đường dẫn bị che trước khi cọc. Nhân viên AgiViet chỉ xem nguyên văn khi có báo cáo vi phạm.</p>`;
}
const HOI_DAP = [
  ["Bên mua có thấy số điện thoại của tôi không?", "Không. Số chỉ mở sau khi bên mua đặt cọc qua ngân hàng. Trước đó hai bên trao đổi trong app."],
  ["Tiền cọc nằm ở đâu?", "Ở tài khoản đảm bảo do ngân hàng giữ hộ, chưa vào tài khoản của chị. Ngân hàng chuyển theo kết quả nhận hàng và thỏa thuận của đơn."],
  ["Bên mua cân thiếu thì sao?", "Ở màn Giao nhận, bấm \"Không đúng\" và chụp số trên cân của chị. Phần đúng vẫn giữ, phần sai được xem lại."],
  ["Tôi có phải trả phí không?", "Không. Phí do bên mua trả khi đặt cọc."],
  ["Tin bán của tôi biến mất?", "Tin tự ẩn sau 14 ngày không xác nhận còn hàng. Mở lô, bấm xác nhận còn hàng để hiện lại."],
];
export async function hoTro(c, phanChung) {
  return `${dauMuc("Hỗ trợ", "home")}<a class="sl-nut" href="tel:19000000">Gọi nhân viên AgiViet</a>
  <section class="sl-nhom"><div class="sl-tieu"><h2>Câu hỏi thường gặp</h2></div>${HOI_DAP.map(([q, a]) => `<details class="sl-the sl-hoi"><summary><b>${q}</b></summary><p>${a}</p></details>`).join("")}</section>
  <section class="sl-nhom"><div class="sl-tieu"><h2>Gửi yêu cầu</h2></div>${phanChung.replace(/<div class="page-heading">[\s\S]*?<\/div><\/div>/, "")}</section>`;
}

/* ---------- Giá hôm nay: giá tham khảo theo mặt hàng của mình ---------- */
export async function gia(c) {
  const vp = await c.api.get("/v1/seller/verified-products").catch(() => []);
  const cap = [...new Map(vp.map((v) => [v.product_code + "|" + v.grade_code, v])).values()];
  const kq = await Promise.all(cap.map((v) => c.api.get(`/v1/reference-prices?product=${encodeURIComponent(v.product_code)}&grade=${encodeURIComponent(v.grade_code)}`).catch(() => null)));
  return `${dauMuc("Giá hôm nay", "home")}<p class="sl-cau-dau">Giá các đơn đã chốt gần đây trên AgiViet, cùng mặt hàng và loại chị bán.</p>
  ${cap.length ? `<div class="sl-ds-gon">${cap.map((v, i) => { const r = kq[i]; const du = r?.status === "du_du_lieu"; return dongGon({ img: anh(v.product_code), ten: `${v.product_name} · loại ${v.grade_label}`, phu: du ? `${r.order_count} đơn, ${r.pair_count} cặp mua bán · ${r.scope === "DBSCL" ? "Đồng bằng sông Cửu Long" : e(r.scope || "")}` : "Chưa đủ đơn để tính giá tham khảo", so: du ? money(r.price_vnd) + "/kg" : "—" }); }).join("")}</div>` : `<div class="sl-the">Chưa có mặt hàng đã xác minh.</div>`}
  <p class="sl-nho">Đây là giá tham khảo, không phải giá AgiViet định. Cần ít nhất 3 đơn từ 2 cặp mua bán mới tính.</p>`;
}

/* ---------- Học kỹ thuật: dẫn tới nguồn khuyến nông chính thống theo mặt hàng ---------- */
export async function hoc(c) {
  const vp = await c.api.get("/v1/seller/verified-products").catch(() => []);
  const ten = [...new Set(vp.map((v) => v.product_name))];
  const tim = (q) => "https://www.google.com/search?q=" + encodeURIComponent("site:khuyennongvn.gov.vn " + q);
  const chuDe = (t) => [[`Kỹ thuật trồng và chăm sóc ${t.toLowerCase()}`, t + " kỹ thuật chăm sóc"], [`Phòng trừ sâu bệnh trên ${t.toLowerCase()}`, t + " sâu bệnh"], [`Thu hoạch, bảo quản ${t.toLowerCase()} sau thu hoạch`, t + " thu hoạch bảo quản"]];
  return `${dauMuc("Học kỹ thuật", "home")}<p class="sl-cau-dau">Tài liệu của Trung tâm Khuyến nông Quốc gia theo mặt hàng chị bán.</p>
  ${ten.map((t) => `<section class="sl-nhom"><div class="sl-tieu"><h2>${e(t)}</h2></div><div class="sl-ds-gon">${chuDe(t).map(([tieu, q]) => `<a class="sl-dg" href="${tim(q)}" target="_blank" rel="noopener"><div class="sl-dg-chu"><b>${e(tieu)}</b><span>khuyennongvn.gov.vn</span></div>${toi}</a>`).join("")}</div></section>`).join("") || `<div class="sl-the">Chưa có mặt hàng đã xác minh.</div>`}
  <a class="sl-nut phu" href="#/support">Hỏi cán bộ kỹ thuật qua AgiViet</a>`;
}

/* ---------- Vườn, mùa vụ: cơ sở sản xuất + mặt hàng đã xác minh ---------- */
export async function vuon(c) {
  const [nk, vp] = await Promise.all([c.api.get("/v1/farm-diary").catch(() => ({ co_so: [] })), c.api.get("/v1/seller/verified-products?all=true").catch(() => [])]);
  const TT = { approved: "Còn hiệu lực", pending: "Chờ duyệt", expired: "Hết hạn", revoked: "Bị thu hồi" };
  return `${dauMuc("Vườn, mùa vụ", "home")}
  ${(nk.co_so || []).map((s) => `<section class="sl-the"><b>${e(s.name)}</b><span class="sl-nho">${s.con_cach_ly ? `Đang trong thời gian cách ly thuốc tới ${e(date(s.clear_on))}` : s.ngay_het_cach_ly_gan_nhat ? `Đã hết cách ly thuốc từ ${e(date(s.ngay_het_cach_ly_gan_nhat))}` : "Chưa ghi phun thuốc"}</span><a class="sl-lien" href="#/nhat-ky">Mở nhật ký vườn ${toi}</a></section>`).join("") || `<div class="sl-the">Chưa có vườn nào. Nhân viên AgiViet ghi vườn khi đến xác minh.</div>`}
  <section class="sl-nhom"><div class="sl-tieu"><h2>Mặt hàng được bán</h2></div><div class="sl-ds-gon">${vp.map((v) => dongGon({ img: anh(v.product_code), ten: `${v.product_name} · loại ${v.grade_label}`, phu: `${v.site_name} · hiệu lực tới ${date(v.valid_to)}`, chip: [TT[v.trang_thai] || v.trang_thai || "", v.trang_thai === "approved" ? "" : "xam"] })).join("") || `<div class="sl-the">Chưa có.</div>`}</div></section>
  <p class="sl-nho">Muốn bán thêm mặt hàng khác: nhờ nhân viên AgiViet đến kiểm và xác minh.</p>`;
}

/* ---------- Nhật ký vườn thật (thay màn "sắp có") ---------- */
const VIEC_NK = [["fertilize", "Bón phân"], ["spray", "Phun thuốc"], ["water", "Tưới"], ["flower", "Ra hoa"], ["fruit_set", "Đậu trái"], ["harvest", "Thu hoạch"], ["pest_incident", "Sâu bệnh"], ["weather_incident", "Sự cố thời tiết"], ["care", "Chăm sóc"]];
export async function nhatKy(c) {
  const nk = await c.api.get("/v1/farm-diary");
  const coSo = nk.co_so || [];
  const loai = c.state.nkLoai || "fertilize";
  c.on.chonNk = (el) => { c.state.nkLoai = el.dataset.v; };
  c.on.moNk = () => { c.state.nkMo = !c.state.nkMo; };
  c.forms.ghiNk = async (f) => {
    const b = { site_id: f.get("site") || coSo[0]?.id, occurred_on: f.get("ngay"), activity: loai, note: f.get("note") || VIEC_NK.find((x) => x[0] === loai)[1], request_key: crypto.randomUUID() };
    if (loai === "spray") { b.medicine_name = f.get("thuoc"); b.withdrawal_days = Number(f.get("cach_ly")); }
    if (loai === "harvest") b.harvested_qty_g = String(Math.round(Number(f.get("kg")) * 1000));
    const r = await c.command("/v1/farm-diary", b);
    c.state.nkMo = false;
    return r;
  };
  const homNay = nk.hom_nay || new Date().toISOString().slice(0, 10);
  const viec = (nk.theo_vu || []).flatMap((v) => v.viec || []).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  const s0 = coSo[0];
  return `${dauMuc("Nhật ký vườn", "home")}
  ${s0 ? `<p class="sl-cau-dau">${s0.con_cach_ly ? `Vườn đang trong cách ly thuốc tới ${e(date(s0.clear_on))}. Chưa được bán hàng hái trước ngày này.` : "Không có thuốc đang trong thời gian cách ly."}</p>` : `<p class="sl-cau-dau">Chưa có vườn. Nhân viên AgiViet ghi vườn khi đến xác minh.</p>`}
  ${s0 ? (c.state.nkMo ? `<form data-form="ghiNk" class="sl-form sl-the">
    ${coSo.length > 1 ? `<label class="sl-truong"><span>Vườn</span><select name="site">${coSo.map((s) => `<option value="${e(s.id)}">${e(s.name)}</option>`).join("")}</select></label>` : ""}
    <div class="sl-cd"><span class="sl-cd-nhan">Việc</span><div class="sl-phan-doan sl-boc">${VIEC_NK.map(([v, t]) => `<button type="button" data-action="chonNk" data-v="${v}" aria-pressed="${v === loai}">${t}</button>`).join("")}</div></div>
    <label class="sl-truong"><span>Ngày</span><input type="date" name="ngay" value="${e(homNay)}" max="${e(homNay)}" required></label>
    ${loai === "spray" ? `<label class="sl-truong"><span>Tên thuốc</span><input name="thuoc" required autocomplete="off"></label><label class="sl-truong"><span>Số ngày cách ly ghi trên nhãn thuốc</span><input name="cach_ly" type="number" inputmode="numeric" min="0" max="365" required></label>` : ""}
    ${loai === "harvest" ? `<label class="sl-truong"><span>Hái được bao nhiêu kg</span><input name="kg" type="number" inputmode="decimal" min="0" step="0.1" required></label>` : ""}
    <label class="sl-truong"><span>Ghi chú (nếu có)</span><input name="note" autocomplete="off"></label>
    <div class="sl-day"><button class="sl-nut" data-ok="Đã ghi nhật ký">Ghi vào nhật ký</button><button type="button" class="sl-nut phu" data-action="moNk">Thôi</button></div></form>`
    : `<button type="button" class="sl-nut" data-action="moNk">Ghi việc hôm nay</button>`) : ""}
  <section class="sl-nhom"><div class="sl-tieu"><h2>Đã ghi</h2></div>
  ${viec.length ? `<div class="sl-ds-gon">${viec.slice(0, 20).map((x) => `<div class="sl-dg"><div class="sl-dg-chu"><b>${e(x.ten_viec)}${x.medicine_name ? " · " + e(x.medicine_name) : ""}${x.harvested_qty_g ? " · " + e(quantity(x.harvested_qty_g)) : ""}</b><span>${e(date(x.occurred_on))}${x.clear_on ? " · hết cách ly " + e(date(x.clear_on)) : ""} · ${e(x.note || "")}</span></div><span class="sl-chip ${x.source === "self_recorded" ? "xam" : ""}">${e(x.nhan)}</span></div>`).join("")}</div>` : `<div class="sl-the">Chưa ghi việc nào.</div>`}</section>`;
}

/* ---------- Lời chào giá ---------- */
export async function offer(c, id) {
  const o = await c.api.get("/v1/offers/" + id);
  const lot = await c.api.get("/v1/lots/" + o.lot_id).catch(() => null);
  const r = o.rounds.at(-1);
  const tong = (BigInt(r.price_vnd) * BigInt(r.qty_g)) / 1000n;
  c.on.accept = () => c.command(`/v1/offers/${id}/accept`, { expected_revision: o.revision });
  c.on.reject = () => c.command(`/v1/offers/${id}/reject`);
  c.on.moTraGia = () => { c.state.traGia = !c.state.traGia; };
  c.forms.counter = (f) => c.command(`/v1/offers/${id}/counter`, { price_vnd: f.get("price") });
  const sp = lot ? tenHang(c, lot.product_code) : "Lô " + o.lot_code;
  const coTheTraLoi = o.toi_luot_toi && c.can("offer.accept.seller");
  const ketQua = { accepted: "Chị đã đồng ý giá. Bên mua sẽ lập hợp đồng để chị ký.", rejected: "Chị đã không bán theo lời chào này.", expired: "Lời chào đã hết hạn.", withdrawn: "Bên mua đã rút lời chào." }[o.status];
  return `${dauMuc("Lời chào giá", "home")}
  ${dayBuoc("Chào giá")}
  <div class="sl-ben"><img src="${anh(lot?.product_code)}" alt=""><div><b>${e(sp)}${lot?.grade_code ? " · loại " + e(lot.grade_code) : ""}</b><span class="sl-nho">Bên mua đã được AgiViet xác minh · lô ${e(o.lot_code)}</span></div></div>
  <section class="sl-the" data-guide="so-tien"><p class="sl-nho">${e(hoaDau(xung(c.user.name)))} nhận về</p><div class="sl-so-lon"><span data-dem="${tong}" data-hau="">${e(money(tong).replace(" đ", ""))}</span> <small>đ</small></div><p class="sl-nho">${e(quantity(r.qty_g))} × ${e(money(r.price_vnd))}/kg · người bán không mất phí</p><div class="sl-chips">${o.status === "sent" ? `<span class="sl-chip vang">${e(conLai(r.expires_at))}</span>` : ""}${o.luot_tra_gia_con != null && o.status === "sent" ? `<span class="sl-chip">Còn ${o.luot_tra_gia_con} lượt trả giá</span>` : ""}</div></section>
  <section class="sl-the sl-dong-ds"><div class="sl-dong"><span>Lượng chào</span><b>${e(quantity(r.qty_g))}</b></div><div class="sl-dong"><span>Ngày có hàng</span><b>${e(date(lot?.available_from))}</b></div><div class="sl-dong"><span>Cọc</span><b>30% qua ngân hàng giữ hộ</b></div></section>
  ${rule("Đây chưa phải hợp đồng. Đồng ý giá thì bên mua lập hợp đồng; chị đọc lại và ký bằng mã OTP. Hợp đồng chỉ có hiệu lực khi bên mua chuyển cọc vào ngân hàng giữ hộ. Giá chị đặt kín không lộ cho bên mua.")}
  ${o.rounds.length > 1 ? `<details class="sl-the"><summary>Các lượt trao đổi (${o.rounds.length})</summary>${o.rounds.map((x) => `<div class="sl-dong"><span>${x.from_side === "buyer" ? "Bên mua" : "Chị"} · lượt ${x.round_no}</span><b>${e(money(x.price_vnd))}/kg</b></div>`).join("")}</details>` : ""}
  ${ketQua ? notice(ketQua) : ""}
  ${coTheTraLoi ? `<div class="sl-day" data-guide="nut">${c.state.traGia ? `<form data-form="counter" class="sl-tra-gia">${field("Giá chị muốn (đ/kg)", "price", "number", "", 'min="1" step="1" required inputmode="numeric"')}<button class="sl-nut">Gửi giá này</button></form>` : ""}<button type="button" class="sl-nut" data-action="accept">Đồng ý giá này</button><div class="sl-hai">${o.luot_tra_gia_con > 0 && c.can("offer.counter.seller") ? `<button type="button" class="sl-nut phu" data-action="moTraGia">${c.state.traGia ? "Thôi trả giá" : "Trả giá"}</button>` : ""}<button type="button" class="sl-nut phu" data-action="reject">Không bán</button></div></div>` : ""}`;
}

/* ---------- Đăng hàng: mặt hàng lấy từ hồ sơ đã xác minh ---------- */
// Người bán chỉ bán mặt hàng đã được nhân viên AgiViet xác minh. Backend chưa có danh sách
// "mặt hàng đã xác minh" riêng, nên tạm lấy các mặt hàng trong hồ sơ lô của chính người bán.
export async function postLot(c) {
  const lots = await c.api.get("/v1/lots?mine=true").catch(() => []);
  const daXacMinh = [...new Set(lots.map((l) => l.product_code))];
  const hang = daXacMinh.length ? daXacMinh : [];
  const chon = c.state.hang && hang.includes(c.state.hang) ? c.state.hang : hang[0];
  const sp = c.products.find((p) => p.code === chon);
  for (const h of hang) c.on["hang_" + h] = () => { c.state.hang = h; };
  c.forms.post = async (f) => {
    const r = await c.api.command("/v1/lots", {
      product_code: chon,
      grade_code: f.get("grade"),
      qty_basis: f.get("basis"),
      qty_g: grams(f.get("qty")),
      ask_price_vnd: f.get("ask"),
      floor_price_vnd: f.get("floor"),
      available_from: f.get("available"),
      harvest_on: f.get("harvest") || undefined,
      spray_clear_on: f.get("clear") || undefined,
    });
    c.flash(r.data?.canh_bao?.join?.(" ") || "Đã lưu. Chụp ảnh hàng rồi bấm Đăng để bên mua thấy.");
    c.go("lots/" + r.id);
  };
  if (!sp)
    return `${dauMuc("Đăng hàng", "home")}<div class="sl-the sl-trong"><img src="${TRAU}07-lo.webp" alt=""><div><b>Chưa có mặt hàng đã xác minh</b><p class="sl-nho">Nhân viên AgiViet cần đến xem vườn, ao và ghi mặt hàng vào hồ sơ trước khi chị, anh đăng bán.</p></div></div><a class="sl-nut" href="#/support">Hẹn nhân viên xác minh</a>`;
  const homNay = new Date().toISOString().slice(0, 10);
  return `${dauMuc("Đăng hàng", "home")}
  <div class="sl-buoc"><div><i class="dang"></i><i></i><i></i></div><div class="sl-buoc-chu"><b>Thông tin</b><span>Chụp ảnh</span><span>Đăng</span></div></div>
  <section class="sl-the sl-hang-xm"><img src="${anh(chon)}" alt=""><div><b>${e(sp.name_vi || chon)}</b><span class="sl-nho">Mặt hàng trong hồ sơ đã xác minh</span></div><span class="sl-chip">Đã xác minh</span></section>
  ${hang.length > 1 ? `<div class="sl-chon-hang" role="group" aria-label="Chọn mặt hàng">${hang.map((h) => `<button type="button" class="sl-chip ${h === chon ? "" : "xam"}" data-action="hang_${e(h)}" aria-pressed="${h === chon}">${e(tenHang(c, h))}</button>`).join("")}</div>` : ""}
  <form data-form="post" class="sl-form">
    <fieldset class="sl-the"><legend>Hàng loại nào?</legend><div class="sl-o-chon">${(sp.grades || []).map((g, i) => `<label><input type="radio" name="grade" value="${e(g.grade_code)}" ${i === 0 ? "checked" : ""} required><span>Loại ${e(g.label)}${g.is_substandard ? (g.grade_code === "DAT" ? " · hàng dạt" : " · hàng loại dưới") : ""}</span></label>`).join("")}</div></fieldset>
    <fieldset class="sl-the"><legend>Bao nhiêu hàng?</legend><div class="sl-o-chon"><label><input type="radio" name="basis" value="weighed" required><span>Đã cân</span></label><label><input type="radio" name="basis" value="estimated" checked><span>Mới ước</span></label></div>${field("Khoảng bao nhiêu kg", "qty", "number", "", 'min="1" step="1" inputmode="numeric" required')}<p class="sl-nho">Hàng mới ước thì bên mua chỉ đặt tối đa 80% số này.</p></fieldset>
    <fieldset class="sl-the"><legend>Khi nào có hàng?</legend>${field("Ngày có thể giao", "available", "date", homNay, "required")}${field("Ngày hái (nếu biết)", "harvest", "date")}${field("Ngày hết cách ly thuốc", "clear", "date")}</fieldset>
    <fieldset class="sl-the"><legend>Giá bao nhiêu?</legend>${field("Giá mong muốn (đồng mỗi kg)", "ask", "number", "", 'min="1" step="1" inputmode="numeric" required')}${field("Giá thấp nhất chịu bán (bên mua không thấy)", "floor", "number", "", 'min="1" step="1" inputmode="numeric" required')}</fieldset>
    ${rule("Giá thấp nhất chỉ mình thấy: lời chào thấp hơn giá này sẽ tự bị từ chối. Chưa hết cách ly thuốc thì chưa đăng được.")}
    <div class="sl-day"><button class="sl-nut">Lưu và chụp ảnh hàng</button></div>
  </form>`;
}

/* ---------- Tiền: ba con số, nói bằng lời thường ---------- */
export async function ledger(c) {
  const [tien, orders] = await Promise.all([c.api.get("/v1/money/summary"), c.api.get("/v1/orders")]);
  const t = tien.tong || {};
  const daVe = BigInt(t.da_nhan_truc_tiep || 0) + BigInt(t.ngan_hang_da_chuyen_den || 0);
  const ten = orders.reduce((m, o) => ((m[o.id] = o), m), {});
  const dangGiu = (tien.theo_don || []).filter((d) => BigInt(d.coc_dang_giu_vnd || 0) > 0n);
  const so = (label, value, giai, mau = "") => `<section class="sl-the sl-tien-o ${mau}"><p class="sl-nho">${label}</p><div class="sl-so-lon">${e(money(value).replace(" đ", ""))} <small>đ</small></div><p class="sl-chu-so">${e(moneyWords(String(value)))}</p><p class="sl-giai">${giai}</p></section>`;
  return `${dauMuc("Tiền", "home")}
  ${so("Đã về tay", daVe, "Tiền bên mua trả thẳng mà mình đã xác nhận, cộng tiền ngân hàng đã chuyển vào tài khoản của mình.")}
  <div class="sl-hai-so">${so("Ngân hàng đang giữ hộ", t.coc_dang_giu || 0, "Cọc bên mua gửi ngân hàng. Ngân hàng chuyển theo kết quả nhận hàng và thỏa thuận của đơn.", "phu")}${so("Còn chờ nhận", t.con_phai_nhan || 0, "Bên mua còn phải trả theo hợp đồng.", "phu")}</div>
  ${dangGiu.length ? `<div class="sl-tieu"><h2>Tiền ngân hàng đang giữ theo đơn</h2></div>${dangGiu.slice(0, 5).map((d) => `<a class="sl-the sl-don" href="#/order/${e(d.id)}/money"><div><b>${e(ten[d.id]?.buyer_name || d.code)}</b><span class="sl-nho">${e(d.code)} · ${e(ten[d.id]?.hien_thi?.ten || "")}</span></div><b>${e(money(d.coc_dang_giu_vnd))}</b></a>`).join("")}` : ""}
  ${rule("Chỉ số đã được ngân hàng báo về, hoặc chính mình xác nhận bằng mã OTP, mới được cộng vào \"Đã về tay\". Bên mua chỉ báo \"đã chuyển\" thì chưa tính.")}
  <a class="sl-lien" href="#/ledger/chi-tiet">Xem bảng chi tiết tiền ${toi}</a>`;
}

/* ---------- Dòng nhắc ở đáy và hướng dẫn ---------- */
// [điều kiện tuyến, tư thế trâu, câu nhắc]
const NHAC = [
  [(v) => v[0] === "offers" && v[1], "chi", "Số lớn nhất là tiền về tay. Chưa hài lòng thì bấm Trả giá."],
  [(v) => v[0] === "order" && v[2] === "terms", "lo", "Đọc kỹ số tiền, lượng, ngày giao rồi mới nhập mã OTP."],
  [(v) => v[0] === "order" && v[2] === "payments", "lo", "Chỉ bấm đã nhận khi chính mình thấy tiền trong tài khoản."],
  [(v) => v[0] === "order" && v[2] === "deposit", "nghe", "Cọc nằm ở ngân hàng giữ hộ. Chưa có cọc thì chưa giao hàng."],
  [(v) => v[0] === "order" && v[2] === "delivery", "chi", "Đưa mã QR cho bên mua quét khi bốc hàng. Không đọc mã qua điện thoại."],
  [(v) => v[0] === "order", "nghe", "Dải bước cho biết đơn đang ở đâu và tới lượt ai."],
  [(v) => v[0] === "post", "ghi-so", "Ghi đúng loại và ngày có hàng, bên mua sẽ chào đúng giá."],
  [(v) => v[0] === "lots", "ghi-so", "Lô còn hàng mới hiện cho bên mua. Hết hàng thì báo để khỏi bị hỏi."],
  [(v) => v[0] === "ledger", "nghe", "Tiền đã về là tiền ngân hàng hoặc chính mình đã xác nhận."],
  [(v) => v[0] === "nhat-ky", "ghi-so", "Ghi việc trong ngày, nhất là ngày phun thuốc, để biết khi nào được bán."],
  [(v) => v[0] === "thoi-tiet", "nghe", "Mưa lớn trước ngày hái thì hẹn bên mua hái sớm hoặc che hàng."],
  [(v) => ["dat-truoc", "bao-tieu"].includes(v[0]), "nghe", "Có người nhận trước khi hái thì yên tâm chăm vườn."],
  [(v) => v[0] === "ban-gap", "lo", "Hàng tươi không ai hỏi 24 giờ thì nên bật bán gấp."],
  [(v) => v[0] === "home", "chao", "Thẻ viền vàng là việc có hạn. Làm từ trên xuống."],
];
export function dongNhac(view) {
  const hit = NHAC.find(([f]) => f(view));
  if (!hit) return "";
  // Mỗi màn chỉ nhắc một lần trong phiên; sau đó chỉ còn nút "?" nhỏ để gọi lại hướng dẫn.
  const khoa = "agv-nhac-" + view[0] + (view[2] ? "-" + view[2] : "");
  let daNhac = false;
  try { daNhac = !!sessionStorage.getItem(khoa); sessionStorage.setItem(khoa, "1"); } catch {}
  if (daNhac) return "";
  const khongTrau = ["order", "offers", "ledger"].includes(view[0]);
  if (khongTrau) return `<div class="sl-nhac" role="status"><p>${e(hit[2])}</p><button type="button" class="sl-nhac-dong" aria-label="Đóng" onclick="this.parentElement.remove()">×</button></div>`;
  return `<div class="sl-nhac" role="status"><img src="${TRAU}${{ chi: "08-chi", lo: "07-lo", nghe: "04-nghe", "ghi-so": "12-ghi-so", chao: "03-chao" }[hit[1]]}.webp" alt=""><p>${e(hit[2])}</p><button type="button" class="sl-nhac-dong" aria-label="Đóng" onclick="this.parentElement.remove()">×</button></div>`;
}

// Hướng dẫn từng bước kiểu "rọi đèn": tối cả màn trừ ô sáng quanh phần tử [data-guide] hoặc bộ chọn CSS.
// [chỗ chỉ (data-guide hoặc bộ chọn), tư thế trâu, lời]
const TOUR = {
  home: [
    ["tien", "nghe", "Tiền đã về tay mình. Hai số nhỏ là tiền ngân hàng đang giữ hộ và tiền còn chờ nhận. Chạm vào để xem sổ tiền."],
    [".sl-nhanh", "chi", "Thời tiết, nhật ký vườn, tin giá và lịch sử làm ăn."],
    ["viec", "chi", "Việc cần làm, gấp nhất ở trên. Viền vàng là việc có hạn."],
    [".bottom-nav .post", "vui", "Có hàng mới thì bấm nút xanh này để đăng."],
    [".bottom-nav", "nghe", "Bán hàng, Đơn hàng, Tiền ở thanh dưới. Muốn xem lại hướng dẫn, bấm dấu chấm hỏi ở góc trên."],
  ],
  offer: [
    ["so-tien", "chi", "Đây là tiền mình nhận về nếu đồng ý giá. Hạn trả lời ghi ở chữ vàng."],
    [".sl-dong-ds", "nghe", "Lượng, ngày có hàng và cọc. Cọc do bên mua gửi ngân hàng giữ hộ."],
    ["nut", "chi", "Đồng ý thì bấm nút xanh. Muốn giá khác bấm Trả giá; không bán bấm Không bán."],
  ],
  order: [
    [".sl-buoc", "chi", "Đơn đi qua 5 bước. Bước đang làm được tô xanh."],
    [".sl-bay-gio", "nghe", "Ô này cho biết bây giờ tới lượt ai và việc gì."],
    [".sl-nhom", "chi", "Hợp đồng, cọc, giao nhận, tiền… mở ở đây khi cần xem kỹ."],
  ],
  post: [
    [".sl-hang-xm", "nghe", "Mặt hàng lấy từ hồ sơ đã được AgiViet xác minh, không cần chọn lại."],
    [".sl-form fieldset", "ghi-so", "Chọn loại, lượng, ngày có hàng và giá. Giá thấp nhất chỉ mình thấy."],
  ],
  "order-payments": [
    ["so-tien", "chi", "Đây là số tiền cần nhận. Mở ứng dụng ngân hàng của mình để kiểm đã có chưa."],
    ["nut", "lo", "Thấy đủ thì bấm nút xanh; thấy thiếu bấm Mới nhận một phần; chưa thấy bấm Chưa thấy."],
  ],
  ledger: [
    [".sl-tien-o", "nghe", "Ba con số: đã về tay, ngân hàng đang giữ hộ, còn chờ nhận."],
  ],
};
const khoaTour = (view) => view[0] === "offers" && view[1] ? "offer" : view[0] === "order" && !view[2] ? "order" : view[0] === "order" && view[2] === "payments" ? "order-payments" : TOUR[view[0]] ? view[0] : null;
let trauTour = null;
export function moHuongDan(c, view) {
  const key = khoaTour(view);
  const steps = (TOUR[key] || [[null, "nghe", (NHAC.find(([f]) => f(view)) || [0, 0, "Bấm Nghe để nghe đọc màn này."])[2]]])
    .filter(([g]) => !g || document.querySelector(g.startsWith(".") ? g : `[data-guide="${g}"]`));
  let i = 0;
  const lop = document.createElement("div");
  lop.className = "sl-tour";
  lop.setAttribute("role", "dialog");
  lop.setAttribute("aria-label", "Hướng dẫn");
  lop.innerHTML = `<div class="sl-lo" aria-hidden="true"></div><div class="sl-tour-the"><div class="sl-tour-trau" data-tour-trau></div><p></p><div class="sl-tour-nut"><span class="sl-nho"></span><button type="button" class="sl-nut phu" data-tour="dong">Bỏ qua</button><button type="button" class="sl-nut" data-tour="tiep"></button></div></div>`;
  document.body.appendChild(lop);
  const lo = lop.querySelector(".sl-lo"), the = lop.querySelector(".sl-tour-the");
  let el = null;
  const datViTri = () => {
    if (!el) { lo.style.cssText = "top:50%;left:50%;width:0;height:0"; the.style.cssText = "bottom:24px;top:auto"; return; }
    const r = el.getBoundingClientRect(), dem = 6;
    lo.style.cssText = `top:${r.top - dem}px;left:${r.left - dem}px;width:${r.width + dem * 2}px;height:${r.height + dem * 2}px`;
    // Thẻ đặt phía có nhiều chỗ hơn
    if (r.top > innerHeight - r.bottom) the.style.cssText = `top:auto;bottom:${innerHeight - r.top + 16}px`;
    else the.style.cssText = `bottom:auto;top:${r.bottom + 16}px`;
  };
  const ve = () => {
    const [g, pose, text] = steps[i];
    el = g ? document.querySelector(g.startsWith(".") ? g : `[data-guide="${g}"]`) : null;
    el?.scrollIntoView({ block: "center" });
    the.querySelector("p").textContent = text;
    the.querySelector(".sl-nho").textContent = `${i + 1}/${steps.length}`;
    the.querySelector('[data-tour="tiep"]').textContent = i + 1 < steps.length ? "Tiếp" : "Đã hiểu";
    const host = the.querySelector("[data-tour-trau]");
    host.innerHTML = "";
    try {
      trauTour?.huy(); trauTour = null;
      // Không đặt trâu cạnh tiền, cọc, ký (quy tắc bộ asset): chỉ dùng ở màn không có tiền.
      if (["home", "order", "order-payments", "offer", "ledger"].includes(key)) host.remove();
      else if (window.LinhVatNguyen && !matchMedia("(prefers-reduced-motion: reduce)").matches && document.createElement("canvas").getContext("webgl"))
        trauTour = new window.LinhVatNguyen(host, { goc: TRAU, co: 80, nen: pose });
      else if (host.isConnected) host.innerHTML = `<img src="${TRAU}04-nghe.webp" alt="">`;
    } catch { host.innerHTML = `<img src="${TRAU}04-nghe.webp" alt="">`; }
    requestAnimationFrame(datViTri);
  };
  const theoDoi = () => datViTri();
  addEventListener("resize", theoDoi);
  addEventListener("hashchange", () => dong(), { once: true });
  document.querySelector("#app")?.addEventListener("scroll", theoDoi, { passive: true });
  const dong = () => {
    trauTour?.huy(); trauTour = null; lop.remove();
    removeEventListener("resize", theoDoi);
    document.querySelector("#app")?.removeEventListener("scroll", theoDoi);
    try { localStorage.setItem("agv-ban-da-xem-" + key, "1"); } catch {}
  };
  lop.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-tour]");
    if (!b) return;
    if (b.dataset.tour === "dong" || i + 1 >= steps.length) return dong();
    i++; ve();
  });
  ve();
}
export function tuMoHuongDan(c, view) {
  return; // Theo bản chấm: hướng dẫn chỉ mở khi người dùng bấm "?", không tự che màn.
  const key = khoaTour(view);
  if (!key) return;
  try { if (localStorage.getItem("agv-ban-da-xem-" + key)) return; } catch { return; }
  setTimeout(() => moHuongDan(c, view), 500);
}

/* ---------- Thanh dưới ---------- */
export const navBan = [
  ["home", "Hôm nay"],
  ["lots", "Bán hàng"],
  ["post", "Đăng"],
  ["orders", "Đơn hàng"],
  ["ledger", "Tiền"],
];
