// App MUA thật: đăng nhập OTP → màn chào (lần đầu) → 5 tab dữ liệu từ API. Luồng sâu (ký, cọc, giao nhận, khung) mở màn thật sẵn có trong mua.html.
import { esc, ANH_SP, luuPhien, tenLoai } from "./chung.js";

const $ = (s) => document.querySelector(s);
const vnd = (n) => Number(n || 0).toLocaleString("vi-VN");
const kg = (g) => Number(g || 0) / 1000;
const THU = new URLSearchParams(location.search).get("thu");
const KHOA_PHIEN = "agv-phien", KHOA_CHAO = "agv-mua-da-chao";
let token = null, me = null, DL = {};

// ---------- gọi API ----------
async function api(duong, than, method) {
  const r = await fetch(duong, than !== undefined || method ? { method: method || "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...(than || {}) }) }
    : { headers: { authorization: "Bearer " + token } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { dangXuat(); throw new Error("Phiên đã hết, đăng nhập lại."); }
  if (!r.ok) throw new Error([j.errors?.[0]?.message, j.errors?.[0]?.fix].filter(Boolean).join(" ") || `Lỗi ${r.status}`);
  return j.data ?? j;
}
const thu = (p) => p.catch(() => null); // phần phụ lỗi thì để trống, phần chính lỗi thì báo

// ---------- màn chờ, đăng nhập, màn chào ----------
const splash = (chu) => { $("#splash-chu").textContent = chu; };
const tatSplash = () => new Promise((xong) => { $("#splash").classList.add("tat"); setTimeout(() => { $("#splash").hidden = true; xong(); }, 320); });
function dangXuat() { try { sessionStorage.removeItem(KHOA_PHIEN); } catch {} fetch("/v1/auth/logout", { method: "POST", headers: { authorization: "Bearer " + token } }).catch(() => {}); location.href = location.pathname + (THU ? `?thu=${THU}` : ""); }

async function layPhien() {
  try { const t = sessionStorage.getItem(KHOA_PHIEN); if (t && (!THU || sessionStorage.getItem("agv-phien-thu") === THU)) return t; } catch {}
  if (!THU) return null;
  const cap = await fetch("/frontend-capabilities.json").then((r) => r.json()).catch(() => ({}));
  if (!cap.test_tools) return null; // số thử chỉ ở môi trường thử
  const r = await fetch("/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: THU }) });
  if (!r.ok) return null;
  const tk = (await r.json()).token;
  try { sessionStorage.setItem(KHOA_PHIEN, tk); sessionStorage.setItem("agv-phien-thu", THU); } catch {}  // màn sâu (mua.html) không còn ?thu= vẫn là dữ liệu thật
  return tk;
}


const BUOC = [
  ["Thấy ngay tuần này thiếu gì", "Trang Hôm nay cho biết bạn đang có bao nhiêu nguồn, việc nào đang chờ bạn và tiền đang ở đâu.", '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'],
  ["Tìm nguồn, chào giá kín", "Lọc theo mặt hàng, xem người bán đã kiểm vườn chưa, chào giá. Dưới mức người bán chấp nhận thì lời chào tự đóng.", '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'],
  ["Cọc do ngân hàng giữ", "Ký hợp đồng bằng mã OTP, chuyển cọc vào tài khoản ngân hàng giữ. Tiền hàng bạn trả thẳng cho người bán sau khi kiểm hàng.", '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>'],
  ["Mua đều mỗi tuần", "Hợp đồng khung tuần: giá chốt mỗi tuần, gọi buổi khi cần, trả gộp cuối tuần trong 72 giờ.", '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'],
];
function moChao(xong) {
  let i = 0; $("#chao").hidden = false;
  const ve = () => { const [t, p, h] = BUOC[i];
    $("#chao").innerHTML = `<div class="chao-the"><div class="chao-hinh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${h}</svg></div>
      <p class="nhan">Bước ${i + 1}/${BUOC.length}</p><h2>${t}</h2><p>${p}</p><div class="cham-buoc">${BUOC.map((_, k) => `<i class="${k === i ? "dang" : ""}"></i>`).join("")}</div></div>
      <button class="nut chinh rong" id="chao-tiep">${i < BUOC.length - 1 ? "Tiếp" : "Bắt đầu mua"}</button>${i < BUOC.length - 1 ? '<button class="nut vien rong" id="chao-bo">Bỏ qua</button>' : ""}`;
    $("#chao-tiep").focus();
    $("#chao-tiep").onclick = () => (i < BUOC.length - 1 ? (i++, ve()) : ket());
    if ($("#chao-bo")) $("#chao-bo").onclick = ket; };
  const ket = () => { try { localStorage.setItem(KHOA_CHAO, "1"); } catch {} $("#chao").hidden = true; xong(); };
  ve();
}

// ---------- tải dữ liệu ----------
async function taiHet() {
  const [don, khung, lots, tien, nhuCau, tin, sp, loiChao] = await Promise.all([api("/v1/orders"), api("/v1/frameworks"), api("/v1/lots"), thu(api("/v1/money/summary")), thu(api("/v1/demands?mine=true")), thu(api("/v1/messages/summary")), thu(api("/v1/products")), thu(api("/v1/offers"))]);
  DL.loiChao = (loiChao?.items ?? loiChao ?? []).filter((o) => o.la_ben_mua);
  DL.don = don.items || don; DL.khung = (khung || []).filter((k) => k.phia === "buyer"); DL.tien = tien; DL.nhuCau = nhuCau || []; DL.tin = tin || []; DL.sp = sp || [];
  DL.lo = await Promise.all((lots || []).slice(0, 30).map((l) => thu(api(`/v1/lots/${l.id}`)).then((c) => ({ ...l, ...(c || {}) }))));
  // Khoản phải trả: theo từng đơn + khoản tuần của khung.
  DL.thieuKhoan = 0; // số đơn không tải được khoản trả: không được hiện 'còn phải trả 0 đ'
  const theoDon = await Promise.all(DL.don.map((d) => thu(api(`/v1/orders/${d.id}/payments`)).then((ps) => (ps === null ? (DL.thieuKhoan++, []) : ps).filter((p) => p.direction === "buyer_to_seller").map((p) => ({ ...p, nguon: `${maHD(d.code)} · ${d.seller_name || ""}`, don_id: d.id })))));
  const theoKhung = DL.khung.flatMap((k) => (k.ky_tuan || []).map((p) => ({ id: p.payment_id, kind: "framework_period", status: p.trang_thai_tra, amount_due_vnd: p.gia_tri_vnd, da_nhan_vnd: p.da_nhan_vnd, due_at: p.han_tra, nguon: `${k.code} · ${k.ben_ban} · tuần từ ${ngay(p.tu)}` })));
  DL.khoan = [...theoDon.flat(), ...theoKhung];
}
const maHD = (c) => String(c || "").replace(/^HD-/, "HĐ-");
const ngay = (s) => (s ? new Date(s).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }) : "");
const MO = (man, q) => `mua.html?man=${man}&${q}${THU ? `&thu=${THU}` : ""}`;
const conTra = (p) => Number(p.amount_due_vnd || 0) - Number(p.da_nhan_vnd || p.confirmed_vnd || p.received_vnd || 0);
const canTra = (p) => ["due", "partially_received", "overdue", "partially_confirmed"].includes(p.status);

// ---------- Hôm nay ----------
// Tuần này đủ hay thiếu (T1): theo món — cần (nhu cầu đang mở) / đã chắc (đơn còn hiệu lực + khung tuần đang chạy) / còn thiếu.
async function veDuThieu() {
  const can = new Map(), chac = new Map(), cong = (m, k, g) => m.set(k, (m.get(k) || 0) + g);
  // Tuần này = 7 ngày tới. Cần: nhu cầu có khoảng ngày giao với tuần. Đã chắc: chỉ đơn ĐÃ KÝ giao trong tuần
  // (đơn chưa ký không làm giảm thiếu); buổi gọi của khung (dong_mon) bỏ vì đã tính theo khung đang chạy.
  const tu = new Date(); tu.setHours(0, 0, 0, 0); const den = new Date(tu.getTime() + 7 * 864e5);
  const trongTuan = (a, b) => (!a || new Date(a) < den) && (!b || new Date(b) >= tu);
  const nc = (DL.nhuCau || []).filter((n) => n.status === "open");
  const ctNc = await Promise.all(nc.map((n) => thu(api(`/v1/demands/${n.id}`))));
  ctNc.forEach((ct, i) => { if (ct && trongTuan(ct.needed_from, ct.needed_to ? `${ct.needed_to}T23:59:59` : null)) (ct.lines || []).forEach((l) => cong(can, nc[i].product_code, Number(l.qty_g || 0))); });
  const daKy = DL.don.filter((d) => /awaiting_deposit|active|awaiting_settlement/.test(d.status || ""));
  const ctDon = await Promise.all(daKy.map((d) => thu(api(`/v1/orders/${d.id}`))));
  ctDon.forEach((o) => { if (o?.san_pham?.code && !o.dong_mon && trongTuan(o.dieu_khoan?.delivery_from, o.dieu_khoan?.delivery_to)) cong(chac, o.san_pham.code, Number(o.dieu_khoan?.qty_g || 0)); });
  DL.khung.filter((k) => k.status === "running").forEach((k) => (k.mon || []).forEach((m) => m.ma && cong(chac, m.ma, Number(m.luong_g || 0) * Math.max(1, (k.ngay_giao || []).length))));
  const mon = [...new Set([...can.keys(), ...chac.keys()])];
  const ten = (ma) => DL.sp.find((s) => s.code === ma)?.name_vi || ma;
  $("#du-thieu").innerHTML = mon.length ? `<p class="nhan" style="margin-top:4px">Tuần này</p>${mon.map((ma) => { const c = can.get(ma) || 0, d = chac.get(ma) || 0, thieu = c - d;
    return `<div class="hang" style="padding:6px 0"><div><b>${esc(ten(ma))}</b><p class="phu">${c ? `cần ${vnd(kg(c))} kg · ` : ""}đã chắc ${vnd(kg(d))} kg</p></div>${c ? `<span class="chip ${thieu > 0 ? "do" : "la"}">${thieu > 0 ? `thiếu ${vnd(kg(thieu))} kg` : "đủ"}</span>` : ""}</div>`; }).join("")}` : "";
}
function veHomNay() {
  const tuan = DL.khung.filter((k) => k.status === "running" && (k.mon || []).length);
  const dangGiao = DL.don.filter((d) => /active|signed|deposit/.test(d.status || ""));
  const nc = DL.nhuCau.filter((n) => n.status === "open");
  $("#the-tuan").innerHTML = `<div class="hang"><p class="nhan">Nguồn đang chạy</p><span class="chip la">${tuan.length} khung · ${dangGiao.length} đơn</span></div>
    ${tuan.map((k) => `<div class="mon"><div class="hang"><b>${esc(k.code)} · ${esc(k.ben_ban)}</b><span class="phu">${(k.ngay_giao || []).map((x) => ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][x]).join(", ")}</span></div><p class="phu">${k.mon.map((m) => `${esc(m.mat_hang)} ${kg(m.luong_g)} kg`).join(" + ")} mỗi buổi · còn gọi được ${vnd(k.han_muc?.con_vnd)} đ</p></div>`).join("")}
    ${nc.length ? `<p class="phu">${nc.length} nhu cầu đang chờ người bán báo giá.</p>` : ""}
    ${!tuan.length && !dangGiao.length ? `<div class="trong"><p>Chưa có nguồn nào đang chạy. Tìm người bán và chào giá, hoặc lập khung tuần để nhận hàng đều.</p></div>` : ""}
    <button class="nut chinh rong" data-di="nguon-hang">Tìm nguồn hàng</button>`;
  $("#the-tuan .hang").insertAdjacentHTML("afterend", `<div id="du-thieu"></div>`); veDuThieu();
  const viec = [
    ...DL.don.filter((d) => d.hien_thi?.toi_luot?.phia === "buyer").map((d) => ({ gap: /cọc|trả|ký/i.test(d.hien_thi.toi_luot.viec), ten: `${maHD(d.code)} · ${d.seller_name || ""}`, phu: d.hien_thi.toi_luot.viec, href: MO("chi-tiet-don", `don=${d.id}`) })),
    ...DL.khung.filter((k) => k.toi_luot === "buyer").map((k) => ({ gap: true, ten: `${k.code} · ${k.ben_ban}`, phu: k.ten_trang_thai, href: MO("chi-tiet-khung", `khung=${k.id}`) })),
    ...DL.khung.flatMap((k) => (k.gia_tuan || []).filter((g) => g.trang_thai === "proposed" && g.de_nghi_boi === "seller").map((g) => ({ ten: `Duyệt giá tuần ${ngay(g.tuan)}`, phu: `${k.code} · ${k.ben_ban} đề nghị`, href: MO("chi-tiet-khung", `khung=${k.id}`) }))),
    // Lời chào: người bán trả giá lại → tới lượt mình trả lời; đã đồng ý mà chưa có đơn → lập đơn.
    ...DL.loiChao.filter((o) => o.status === "sent" && o.vong_cuoi?.from_side === "seller").map((o) => ({ gap: true, ten: `Người bán trả giá ${vnd(o.vong_cuoi.price_vnd)} đ/kg`, phu: `${o.code} · lô ${o.lot_code || ""} · trả lời trong 24 giờ`, href: MO("bao-gia", `loi-chao=${o.id}`) })),
    ...DL.loiChao.filter((o) => o.status === "accepted" && !DL.don.some((d) => d.offer_id === o.id)).map((o) => ({ gap: true, ten: "Lập đơn", phu: `${o.code} · lô ${o.lot_code || ""} · hai bên đã chốt giá`, href: MO("bao-gia", `loi-chao=${o.id}`) })),
    ...DL.khoan.filter(canTra).map((p) => ({ gap: true, ten: `Trả ${vnd(conTra(p))} đ`, phu: `${p.nguon}${p.due_at ? ` · hạn ${ngay(p.due_at)}` : ""}`, khoan: p.id })),
  ];
  $("#hang-doi").innerHTML = viec.length ? viec.map((v) => v.href ? `<a class="viec" href="${v.href}"><i class="${v.gap ? "do" : ""}"></i><div><b>${esc(v.ten)}</b><p class="phu">${esc(v.phu)}</p></div><span aria-hidden="true">›</span></a>`
    : `<button class="viec" data-mo="tra-tien" data-khoan="${v.khoan}"><i class="do"></i><div><b>${esc(v.ten)}</b><p class="phu">${esc(v.phu)}</p></div><span aria-hidden="true">›</span></button>`).join("") : `<p class="phu">Không có việc nào chờ bạn.</p>`;
  $("#so-viec").textContent = `${viec.length} việc`;
  $("#dem-viec").textContent = viec.length; $("#dem-viec").hidden = !viec.length;
  const t = DL.tien?.tong || {};
  $("#hn-coc").textContent = DL.tien ? `${vnd(Number(t.coc_dang_giu || 0))} đ` : "Chưa tải được"; // backend đã gồm cọc khung (trung-binh.ts) — không cộng lại
  $("#hn-no").textContent = DL.thieuKhoan ? "Chưa tính đủ" : `${vnd(DL.khoan.filter(canTra).reduce((a, p) => a + conTra(p), 0))} đ`;
}

// ---------- Nguồn hàng ----------
let loc = "Tất cả", tu = "";
const NHOM = (ma = "") => (/^(TOM|CA_|CUA|NGHEU|SO_|OC|MUC)/.test(ma) ? "Thủy sản" : /^(LUA|GAO|CAPHE|TIEU|DIEU|HAT|CACAO)/.test(ma) ? "Hạt, cà phê" : /^(RAU|CAI|HANH|OT|KHOAI|CU_|BAP|DUA_LEO|CA_CHUA)/.test(ma) ? "Rau củ" : "Trái cây");
const giaCho = new Map();
async function layGiaCho(ma, loai) { const k = ma + "|" + loai; if (!giaCho.has(k)) giaCho.set(k, thu(api(`/v1/reference-prices?product=${encodeURIComponent(ma)}&grade=${encodeURIComponent(loai)}`))); return giaCho.get(k); }
const TINH = { DT: "Đồng Tháp", CT: "Cần Thơ", TN: "Tây Ninh", VL: "Vĩnh Long", AG: "An Giang", TG: "Tiền Giang", BT: "Bến Tre", HCM: "TP.HCM", ST: "Sóc Trăng", CM: "Cà Mau", KG: "Kiên Giang", LA: "Long An" };
// So sánh nguồn: chọn 2–3 lô → bảng cùng tiêu chí (lượng, cân/ước, ngày, nơi, ảnh, giá giao dịch cùng loại).
const SS = new Set();
const veNutSS = () => { const n = [...SS].filter((id) => DL.lo?.some((l) => l.id === id)).length; $("#nut-ss").hidden = n < 2; $("#nut-ss").textContent = `So sánh ${n} nguồn`; };
async function veSoSanh() {
  const ds = DL.lo.filter((l) => SS.has(l.id));
  const gia = await Promise.all(ds.map((l) => layGiaCho(l.product_code, l.grade_code)));
  const dong = (nhan, f) => `<tr><th scope="row">${nhan}</th>${ds.map((l, i) => `<td>${f(l, i)}</td>`).join("")}</tr>`;
  $("#ss-bang").innerHTML = `<table class="bang-ss"><thead><tr><th></th>${ds.map((l) => `<th scope="col">${esc(l.product_name || l.product_code)} ${esc(tenLoai(l.grade_code))}</th>`).join("")}</tr></thead><tbody>
    ${dong("Người bán", (l) => esc(l.seller_name || ""))}
    ${dong("Nơi", (l) => esc(TINH[l.province_code] || l.province_code || ""))}
    ${dong("Còn", (l) => `<span class="so">${vnd(kg(l.available_g ?? l.qty?.available))} kg</span>`)}
    ${dong("Lượng", (l) => (l.qty_basis === "weighed" ? "Đã cân" : "Ước tính"))}
    ${dong("Có hàng từ", (l) => ngay(l.available_from))}
    ${dong("Ảnh trong app", (l) => String((l.photos || []).filter((p) => p.captured_in_app).length))}
    ${dong("Giá giao dịch cùng loại", (l, i) => (gia[i]?.status === "du_du_lieu" ? `<span class="so">${vnd(gia[i].price_vnd)} đ/kg</span>` : "Chưa đủ dữ liệu"))}
    </tbody></table>`;
}
function veNguon() {
  const ds0 = (DL.lo || []).filter((l) => !l.is_substandard || l.ban_gap);
  const nhom = ["Tất cả", ...new Set(ds0.map((l) => NHOM(l.product_code)))];
  $("#loc").innerHTML = nhom.map((m) => `<button aria-pressed="${m === loc}" data-loc-chon="${esc(m)}">${esc(m)}</button>`).join("");
  const q = tu.trim().toLowerCase();
  const ds = ds0.filter((l) => (loc === "Tất cả" || NHOM(l.product_code) === loc) && (!q || `${l.product_name} ${l.seller_name} ${TINH[l.province_code] || ""}`.toLowerCase().includes(q)));
  $("#ds-lo").innerHTML = ds.length ? ds.map((l) => {
    const anhApp = (l.photos || []).filter((p) => p.captured_in_app).length;
    return `<div class="the" data-lo-the="${l.id}">
    <div class="lo"><div class="anh" style="background-image:url(${ANH_SP(l.product_code)})" role="img" aria-label="Ảnh minh họa ${esc(l.product_name)}"></div>
      <div><div class="hang"><b>${esc(l.product_name || l.product_code)} ${esc(tenLoai(l.grade_code))}</b><span class="chip ${l.status === "upcoming" ? "bien" : "la"}">${l.status === "upcoming" ? "Sắp có" : "Có ngay"}</span></div>
        <p class="phu">${esc(l.seller_name || "")} · ${esc(TINH[l.province_code] || l.province_code || "")}</p><p class="phu so">Còn ${vnd(kg(l.available_g ?? l.qty?.available))} kg · từ ${ngay(l.available_from)}</p></div></div>
    <div class="tin">${l.qty_basis === "weighed" ? `<span class="chip la">Đã cân</span>` : `<span class="chip">Người bán ước tính</span>`}${anhApp ? `<span class="chip la">${anhApp} ảnh chụp trong app</span>` : `<span class="chip">Chưa có ảnh chụp trong app</span>`}${l.ban_gap ? `<span class="chip do">Bán gấp</span>` : ""}</div>
    <p class="phu" data-gia-cho="${esc(l.product_code)}|${esc(l.grade_code)}">Đang lấy giá chợ…</p>
    <label class="so-sanh-chon"><input type="checkbox" data-ss="${l.id}" ${SS.has(l.id) ? "checked" : ""}> So sánh</label>
    <button class="nut vien rong" data-mo="chao-gia" data-lo="${l.id}">Chào giá</button></div>`; }).join("") : `<div class="trong"><p>Không có lô nào khớp. Gửi nhu cầu để người bán báo giá cho bạn.</p><button class="nut vien" data-mo="gui-nhu-cau">Gửi nhu cầu</button></div>`;
  veNutSS();
  document.querySelectorAll("[data-gia-cho]").forEach(async (el) => { const [ma, loai] = el.dataset.giaCho.split("|"); const g = await layGiaCho(ma, loai);
    el.textContent = g?.status === "du_du_lieu" ? `Giá giao dịch trên AgiViet: ${vnd(g.price_vnd)} đ/kg (${g.order_count} đơn, đến ${ngay(g.as_of)})` : ""; el.hidden = g?.status !== "du_du_lieu"; });
}
async function veChaoGia(loId) {
  const l = DL.lo.find((x) => x.id === loId), g = await layGiaCho(l.product_code, l.grade_code), neo = g?.status === "du_du_lieu" ? Number(g.price_vnd) : null;
  $("#cg-tam").innerHTML = `<h2 id="cg-t">Chào giá ${esc(l.product_name)} ${esc(tenLoai(l.grade_code))}</h2>
    <p class="phu">${esc(l.seller_name || "")} · còn ${vnd(kg(l.available_g ?? l.qty?.available))} kg · ${neo ? `giá giao dịch gần đây <b>${vnd(neo)} đ/kg</b>` : "chưa đủ dữ liệu giá chợ"}</p>
    <div class="luoi2"><label class="o-nhap">Giá (đ/kg)<input id="cg-gia" inputmode="numeric" value="${neo || ""}"></label><label class="o-nhap">Lượng (kg)<input id="cg-kg" inputmode="decimal" value="${Math.min(1000, kg(l.available_g ?? l.qty?.available))}"></label></div>
    <p class="phu" id="cg-tong" role="status"></p><p class="phu">Giao tại vườn, bạn lo xe. Người bán có 24 giờ trả lời: đồng ý, trả giá hoặc không bán. Đồng ý giá chưa phải hợp đồng.</p>
    <p class="loi" id="cg-loi" role="alert"></p><button class="nut chinh rong" id="cg-gui">Gửi lời chào giá</button><button class="nut vien rong" data-dong>Để sau</button>`;
  const doc = () => ({ gia: Number($("#cg-gia").value.replace(/\D/g, "")), soKg: Number($("#cg-kg").value.replace(",", ".")) });
  const tinh = () => { const { gia, soKg } = doc(), ok = gia >= 1000 && soKg > 0 && soKg <= kg(l.available_g ?? l.qty?.available);
    $("#cg-tong").innerHTML = ok ? `Thành tiền <b class="so">${vnd(Math.round(gia * soKg))} đ</b>${neo ? ` · ${gia < neo ? `thấp hơn giá gần đây ${vnd(neo - gia)} đ/kg` : gia > neo ? `cao hơn giá gần đây ${vnd(gia - neo)} đ/kg` : "bằng giá gần đây"}` : ""}` : "Nhập giá (≥ 1.000 đ/kg) và lượng không quá lượng còn."; return ok; };
  $("#cg-tam").oninput = tinh; tinh();
  $("#cg-gui").onclick = async () => { if (!tinh()) return; const { gia, soKg } = doc(); $("#cg-gui").disabled = true;
    try { const of = await api("/v1/offers", { direction: "buyer_bid", lot_id: l.id, qty_g: Math.round(soKg * 1000), price_vnd: gia });
      dong(); bao(of.status === "auto_rejected" || of.status === "rejected" ? "Chưa tới mức người bán chấp nhận. Lời chào đã đóng." : `Đã gửi lời chào ${of.code || ""}. Chờ người bán trả lời trong 24 giờ.`);
    } catch (e) { $("#cg-loi").textContent = /trùng/i.test(e.message) ? "Bạn đang có lời chào chờ người bán trả lời ở lô này." : e.message; $("#cg-gui").disabled = false; } };
}

// ---------- Đơn ----------
function veDon() {
  $("#ds-khung").innerHTML = DL.khung.map((k) => `<a class="the" href="${MO("chi-tiet-khung", `khung=${k.id}`)}" style="text-decoration:none;color:inherit">
    <div class="hang"><div><b>Khung ${esc(k.code)} · ${esc(k.ben_ban)}</b><p class="phu">${(k.mon || []).map((m) => `${esc(m.mat_hang)} ${kg(m.luong_g)} kg`).join(" + ") || "Khung nhập từ dữ liệu cũ"}</p></div><span class="chip ${k.toi_luot === "buyer" ? "toi" : "la"}">${k.toi_luot === "buyer" ? "Tới lượt bạn" : esc(k.ten_trang_thai)}</span></div>
    ${k.han_muc ? `<div class="luoi2"><div class="o"><span class="phu">Cọc khung</span><b>${vnd(k.coc_khung_vnd)} đ</b></div><div class="o"><span class="phu">Còn gọi được</span><b>${vnd(k.han_muc.con_vnd)} đ</b></div></div>` : ""}</a>`).join("")
    + `<a class="nut vien rong" href="${MO("lap-khung", "")}">Lập hợp đồng khung tuần mới</a>`;
  $("#ds-don").innerHTML = DL.don.length ? DL.don.map((d) => { const tl = d.hien_thi?.toi_luot, toi = tl?.phia === "buyer";
    return `<a class="the" href="${MO("chi-tiet-don", `don=${d.id}`)}" style="text-decoration:none;color:inherit">
    <div class="hang"><b>${esc(maHD(d.code))} · ${esc(d.seller_name || "")}</b><span class="chip ${toi ? "toi" : ""}">${toi ? "Tới lượt bạn" : esc(d.hien_thi?.ten || d.status)}</span></div>
    <p class="phu">Giá trị ${vnd(d.contract_value_vnd)} đ${tl ? ` · ${toi ? "Bạn" : tl.phia === "seller" ? "Người bán" : "AgiViet"}: ${esc(tl.viec)}` : ""}</p></a>`; }).join("")
    : `<div class="the trong"><p>Chưa có đơn. Đơn được lập từ một lời chào giá người bán đã đồng ý.</p><a class="nut vien" href="${MO("bao-gia", "")}">Xem lời chào giá</a></div>`;
}

// ---------- Tiền ----------
function veTien() {
  const no = DL.khoan.filter(canTra), tong = no.reduce((a, p) => a + conTra(p), 0);
  // Đã báo chuyển / lệch số: không cộng vào "còn phải trả" (tránh trả hai lần) nhưng vẫn phải thấy trên ô tổng
  const cho = DL.khoan.filter((p) => ["payer_reported", "mismatch"].includes(p.status)), tongCho = cho.reduce((a, p) => a + conTra(p), 0);
  $("#tien-tong").innerHTML = DL.thieuKhoan ? `<p class="nhan">Bạn còn phải trả</p><div class="so-lon">Chưa tính đủ</div><p class="phu">Chưa tải được khoản trả của ${DL.thieuKhoan} đơn. <button class="nut" type="button" onclick="location.reload()">Tải lại</button></p>` : `<p class="nhan">Bạn còn phải trả</p><div class="so-lon so">${vnd(tong)} <small>đ</small></div><p class="phu">${no.length ? `${no.length} khoản · hạn sớm nhất ${ngay(no.map((p) => p.due_at).filter(Boolean).sort()[0])}` : "Không có khoản nào tới hạn."}</p>${cho.length ? `<p class="phu">Đang chờ người bán xác nhận hoặc AgiViet đối soát: <b class="so">${vnd(tongCho)} đ</b> (${cho.length} khoản) · không cần trả thêm</p>` : ""}`;
  // Tiền ngân hàng giữ hộ: cọc thừa ngân hàng tự hoàn về tài khoản đã chuyển, hệ thống đối soát; người bán không đụng vào.
  const nh = DL.tien?.tong || {}, giu = Number(nh.coc_dang_giu || 0), hoan = Number(nh.ngan_hang_da_chuyen_den || 0);
  $("#tien-tong").insertAdjacentHTML("beforeend", `<div class="hang" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--ke)"><div><span class="phu">Cọc ngân hàng giữ</span><br><b class="so">${DL.tien ? vnd(giu) + " đ" : "Chưa tải được"}</b></div><div style="text-align:right"><span class="phu">Ngân hàng đã hoàn</span><br><b class="so">${DL.tien ? vnd(hoan) + " đ" : "Chưa tải được"}</b></div></div><p class="phu" style="margin:8px 0 0">Tiền thừa trong cọc do ngân hàng tự hoàn về đúng tài khoản bạn đã chuyển, sau khi đơn quyết toán.</p>`);
  const TT = { due: "Chưa trả", payer_reported: "Đã báo chuyển · chờ người bán xác nhận", partially_received: "Người bán mới nhận một phần", partially_confirmed: "Người bán mới nhận một phần", overdue: "Quá hạn", fully_received: "Người bán đã nhận đủ", confirmed: "Người bán đã nhận đủ", mismatch: "Lệch số tiền · AgiViet đang xem", not_due: "Chưa tới hạn" };
  $("#ds-khoan").innerHTML = DL.khoan.length ? DL.khoan.map((p) => `<div class="the"><div class="hang"><div><b>${vnd(p.amount_due_vnd)} đ</b><p class="phu">${esc(p.nguon)}</p></div><span class="chip ${canTra(p) ? "do" : /received|confirmed/.test(p.status) ? "la" : ""}">${esc(TT[p.status] || p.status)}</span></div>
    ${canTra(p) ? `<button class="nut chinh rong" data-mo="tra-tien" data-khoan="${p.id}">Trả ${vnd(conTra(p))} đ</button>` : ""}</div>`).join("") : "";
}
async function veTraTien(id) {
  const p = DL.khoan.find((x) => x.id === id); $("#tt-tam").innerHTML = `<h2 id="tt-t">Đang lấy hướng dẫn…</h2><div class="khung-tai"></div>`;
  try { const h = await api(`/v1/payments/${id}/instruction`), tk = h.tai_khoan || {};
    const chep = (nhan, gt, hien = gt) => `<div class="chep"><div><span class="phu">${nhan}</span><br><b>${esc(hien)}</b></div><button class="nut vien nho" data-chep="${esc(gt)}">Chép</button></div>`;
    $("#tt-tam").innerHTML = `<h2 id="tt-t">Trả ${esc(p.nguon)}</h2><div class="so-lon so">${vnd(h.so_tien_con_vnd)} <small>đ</small></div>
      ${tk.so_tai_khoan ? `<div class="chep"><div><span class="phu">Ngân hàng · chủ tài khoản</span><br><b style="font-size:15px">${esc(tk.ngan_hang)} · ${esc(tk.chu_tai_khoan)}</b></div></div>${chep("Số tài khoản", tk.so_tai_khoan)}${chep("Nội dung chuyển khoản", h.noi_dung)}${chep("Số tiền", String(h.so_tien_con_vnd), `${vnd(h.so_tien_con_vnd)} đ`)}` : `<p class="loi">${esc(h.cau || "Chưa có tài khoản nhận tiền.")}</p>`}
      ${h.canh_bao ? `<p class="loi">${esc(h.canh_bao)}</p>` : ""}<p class="phu">${esc(h.cau || "")}</p>
      <label class="o-nhap">Ảnh biên lai chuyển khoản<input type="file" accept="image/*,application/pdf" id="tt-anh"></label>
      <p class="loi" id="tt-loi" role="alert"></p><button class="nut chinh rong" id="tt-gui">Tôi đã chuyển ${vnd(h.so_tien_con_vnd)} đ</button><button class="nut vien rong" data-dong>Để sau</button>`;
    $("#tt-gui").onclick = async () => { const f = $("#tt-anh").files[0]; if (!f) return ($("#tt-loi").textContent = "Chọn ảnh biên lai để người bán đối chiếu."); $("#tt-gui").disabled = true;
      try { const b64 = await new Promise((ok, loi) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1]); fr.onerror = loi; fr.readAsDataURL(f); });
        const anh = await api("/v1/files", { mime: f.type, data_base64: b64, entity: "payment", entity_id: id, captured_in_app: false });
        await api(`/v1/payments/${id}/report`, { amount_vnd: Number(h.so_tien_con_vnd), method: "bank_transfer", evidence_document_id: anh.id });
        dong(); bao("Đã báo chuyển. Người bán xác nhận đã nhận mới tính là đã trả."); await lamMoi();
      } catch (e) { $("#tt-loi").textContent = e.message; $("#tt-gui").disabled = false; } };
  } catch (e) { $("#tt-tam").innerHTML = `<h2 id="tt-t">Chưa lấy được hướng dẫn</h2><p class="loi">${esc(e.message)}</p><button class="nut vien rong" data-dong>Đóng</button>`; }
}

// ---------- Tin nhắn theo đơn / lời chào (GET/POST /v1/messages) ----------
const tenCuoc = (c) => { const d = DL.don.find((x) => x.id === c.order_id); return d ? `${d.seller_name || "Người bán"} · ${d.code}` : "Lời chào giá"; };
const gioTin = (s) => new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
function veDsTin() {
  $("#tn-t").textContent = "Tin nhắn";
  $("#ds-tin").innerHTML = DL.tin.length ? DL.tin.map((c) => `<button type="button" class="viec" data-cuoc="${esc(JSON.stringify(c.order_id ? { order_id: c.order_id } : { offer_id: c.offer_id }))}" data-ten="${esc(tenCuoc(c))}"><i class="${c.la_cua_toi ? "la" : ""}"></i><div><b>${esc(tenCuoc(c))}</b><p class="phu">${c.la_cua_toi ? "Bạn: " : ""}${esc(c.body)}</p></div><span class="chip">${c.so_tin}</span></button>`).join("")
    : `<p class="phu">Chưa có tin nhắn. Tin nhắn mở theo từng lời chào giá hoặc đơn.</p>`;
}
async function moCuoc(q, ten) {
  $("#tn-t").textContent = ten;
  try {
    const x = await api(`/v1/messages?${new URLSearchParams(q)}`);
    $("#ds-tin").innerHTML = `<button type="button" class="nut vien nho" data-tin-lui>‹ Tất cả tin nhắn</button>
      <div class="luong-tin">${x.tin.map((m) => `<div class="bong${m.la_cua_toi ? " toi" : ""}"><small>${esc(m.la_cua_toi ? "Bạn" : m.nguoi_gui)} · ${gioTin(m.created_at)}</small><p>${esc(m.body)}</p></div>`).join("") || `<p class="phu">Chưa có tin nào. Gửi tin đầu tiên cho người bán.</p>`}</div>
      <form id="tn-gui" class="hang" style="gap:8px"><input id="tn-o" class="o-tin" maxlength="1000" autocomplete="off" placeholder="Nhắn người bán…" aria-label="Nội dung tin nhắn"><button class="nut chinh nho">Gửi</button></form><p class="loi" id="tn-loi" role="alert"></p>`;
    const l = $(".luong-tin"); l.scrollTop = l.scrollHeight;
    $("#tn-gui").onsubmit = async (e) => { e.preventDefault(); const body = $("#tn-o").value.trim(); if (!body) return;
      e.submitter && (e.submitter.disabled = true);
      try { await api("/v1/messages", { ...q, body }); DL.tin = await api("/v1/messages/summary"); await moCuoc(q, ten); $("#tn-o")?.focus(); }
      catch (err) { $("#tn-loi").textContent = err.message; e.submitter && (e.submitter.disabled = false); } };
  } catch (err) { $("#ds-tin").innerHTML = `<button type="button" class="nut vien nho" data-tin-lui>‹ Tất cả tin nhắn</button><p class="loi">${esc(err.message)}</p>`; }
}
$("#ds-tin").addEventListener("click", (e) => {
  if (e.target.closest("[data-tin-lui]")) return veDsTin();
  const c = e.target.closest("[data-cuoc]"); if (c) moCuoc(JSON.parse(c.dataset.cuoc), c.dataset.ten);
});

// Kế hoạch mua tuần: mỗi nhu cầu đang mở — cần bao nhiêu (chi tiết nhu cầu), đã có mấy báo giá (offer-comparison).
async function veKeHoach() {
  const mo = (DL.nhuCau || []).filter((n) => n.status === "open");
  if (!mo.length) { $("#ke-hoach").innerHTML = `<p class="phu">Chưa có nhu cầu đang mở. Gửi nhu cầu để người bán báo giá.</p>`; return; }
  const ds = await Promise.all(mo.map(async (n) => { const [ct, so] = await Promise.all([thu(api(`/v1/demands/${n.id}`)), thu(api(`/v1/demands/${n.id}/offer-comparison`))]); return { n, ct, so }; }));
  const ten = (ma) => DL.sp.find((s) => s.code === ma)?.name_vi || ma;
  $("#ke-hoach").innerHTML = ds.map(({ n, ct, so }) => { // ct/so = null là tải lỗi: nói rõ "chưa tải được", không biến lỗi thành 0 kg / chưa có báo giá
    const can = (ct?.lines || []).reduce((a, l) => a + Number(l.qty_g || 0), 0) / 1000; const bg = (so?.items ?? so ?? []).length || 0;
    const chuCan = ct ? `cần ${vnd(can)} kg` : "chưa tải được lượng cần", chuBg = !so ? "chưa tải được báo giá" : bg ? `${bg} báo giá` : "Chưa có báo giá";
    return `<div class="viec" style="cursor:default"><i class="${bg ? "la" : ""}"></i><div><b>${esc(ten(n.product_code))} · ${chuCan}</b><p class="phu">${ct?.needed_from ? `Từ ${ngay(ct.needed_from)} tới ${ngay(ct.needed_to)} · ` : ""}${chuBg}${!ct || !so ? ` <button class="nut" type="button" onclick="location.reload()">Tải lại</button>` : ""}</p></div><span class="chip">${esc(n.code)}</span></div>`; }).join("");
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-tim-ban]"); if (!b) return; tu = b.dataset.timBan; $("#tim").value = tu; di("nguon-hang"); veNguon(); });

// ---------- Thêm, tin nhắn, nhu cầu ----------
function veThem() {
  $("#tk-thong-tin").innerHTML = `<p style="margin:0"><b>${esc(me.name)}</b> · ${esc(me.phone_masked)}</p><p class="phu">${esc(me.org?.name)} · ${me.roles.includes("owner") ? "Chủ tổ chức" : "Thành viên"} · duyệt chi tới ${vnd(me.approval_limit_vnd)} đ</p>`;
  // Người bán quen: gom từ đơn của mình, ai giao xong nhiều đứng trước; "Xem hàng" = sang Nguồn lọc theo tên.
  const theo = new Map(); for (const d of DL.don) { const k = d.seller_name || "Người bán"; const x = theo.get(k) || { n: 0, xong: 0 }; x.n++; if (d.status === "completed") x.xong++; theo.set(k, x); }
  $("#ban-quen").innerHTML = theo.size ? [...theo].sort((a, b) => b[1].xong - a[1].xong || b[1].n - a[1].n).slice(0, 5).map(([ten, x]) => `<button type="button" class="viec" data-tim-ban="${esc(ten)}"><i class="${x.xong ? "la" : ""}"></i><div><b>${esc(ten)}</b><p class="phu">${x.n} đơn · ${x.xong} đã xong</p></div><span class="chip">Xem hàng</span></button>`).join("")
    : `<p class="phu">Chưa có. Sau đơn đầu tiên, người bán sẽ hiện ở đây để đặt lại nhanh.</p>`;
  veKeHoach();
  veDsTin();
  // Chấm đỏ = số cuộc mà tin cuối là của bên kia (chưa trả lời); API chưa có cờ đã đọc.
  const moi = DL.tin.filter((c) => !c.la_cua_toi).length; $("#dem-tin").textContent = moi; $("#dem-tin").hidden = !moi;
  $("#nc-sp").innerHTML = DL.sp.map((s) => `<option value="${esc(s.code)}">${esc(s.name_vi)}</option>`).join("");
  // Loại theo đúng mặt hàng (nhãn dễ hiểu, gửi mã gốc); đổi mặt hàng thì đổi danh sách loại trước khi form lấy giá chợ
  const veLoai = () => { const sp = DL.sp.find((x) => x.code === $("#nc-sp").value);
    $("#nc-loai").innerHTML = (sp?.grades?.length ? sp.grades : [{ grade_code: "L1" }]).map((g) => `<option value="${esc(g.grade_code)}">${esc(tenLoai(g.grade_code))}</option>`).join(""); };
  veLoai(); $("#nc-sp").oninput = veLoai;
  const homNay = new Date(), d = (n) => new Date(homNay.getTime() + n * 864e5).toISOString().slice(0, 10);
  $("#nc-tu").value ||= d(2); $("#nc-den").value ||= d(9);
}
$("#gui-nhu-cau")?.addEventListener("input", async () => { const g = await layGiaCho($("#nc-sp").value, $("#nc-loai").value.trim()); $("#nc-neo").textContent = g?.status === "du_du_lieu" ? `Giá giao dịch gần đây ${vnd(g.price_vnd)} đ/kg.` : ""; });
$("#nc-gui").onclick = async () => { const loi = $("#nc-loi"); loi.textContent = ""; const soKg = Number($("#nc-kg").value.replace(",", ".")), gia = Number($("#nc-gia").value.replace(/\D/g, ""));
  if (!(soKg > 0) || !(gia >= 1000)) return (loi.textContent = "Nhập lượng và giá tối đa hợp lệ.");
  $("#nc-gui").disabled = true;
  try { const qty = Math.round(soKg * 1000), seg = me.org?.segment_code || "horeca";
    const n = await api("/v1/demands", { product_code: $("#nc-sp").value, segment_code: seg, needed_from: $("#nc-tu").value, needed_to: $("#nc-den").value, delivery_mode: "self_pickup", lines: [{ grade_code: $("#nc-loai").value.trim(), qty_g: String(qty), max_price_vnd: String(gia), min_source_qty_g: String(Math.min(qty, 20000)) }] });
    dong(); bao(`Đã đăng nhu cầu ${n.code}. Người bán đang có món này sẽ báo giá.`); await lamMoi();
  } catch (e) { loi.textContent = e.message; } $("#nc-gui").disabled = false; };
$("#xuat-bang-ke").onclick = () => { const dong2 = [["Khoản", "Số tiền (đ)", "Đã nhận (đ)", "Trạng thái", "Hạn"], ...DL.khoan.map((p) => [p.nguon, p.amount_due_vnd, p.da_nhan_vnd || p.confirmed_vnd || 0, p.status, p.due_at ? new Date(p.due_at).toLocaleString("vi-VN") : ""])];
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + dong2.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = `bang-ke-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); };
$("#dang-xuat").onclick = dangXuat;
$("#xem-lai-chao").onclick = () => { $("#app").hidden = true; $("#tab").hidden = true; moChao(() => { $("#app").hidden = false; $("#tab").hidden = false; }); };

// ---------- điều hướng, tấm, thông báo ----------
const TEN = { "hom-nay": "Hôm nay", "nguon-hang": "Nguồn hàng", don: "Đơn và khung", tien: "Tiền", them: "Thêm" };
const di = (m) => { document.querySelectorAll("section[data-man]").forEach((s) => s.classList.toggle("hien", s.dataset.man === m));
  document.querySelectorAll(".tab button").forEach((b) => (b.dataset.di === m ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  $("#tieu").textContent = TEN[m]; scrollTo(0, 0); try { history.replaceState(null, "", `#${m}`); } catch {} };
let truoc = null;
$("#ds-lo").addEventListener("change", (e) => { const c = e.target.closest("[data-ss]"); if (!c) return;
  if (c.checked && SS.size >= 3) { c.checked = false; bao("So sánh tối đa 3 nguồn. Bỏ chọn một nguồn trước."); return; }
  c.checked ? SS.add(c.dataset.ss) : SS.delete(c.dataset.ss); veNutSS(); });
const mo = (id, t) => { if (id === "tra-tien") veTraTien(t.dataset.khoan); if (id === "chao-gia") veChaoGia(t.dataset.lo); if (id === "so-sanh") veSoSanh();
  truoc = document.activeElement; $("#" + id).classList.add("mo"); $("#app").inert = true; $("#tab").inert = true; setTimeout(() => $("#" + id).querySelector("input, select, button")?.focus(), 50); };
const dong = () => { document.querySelectorAll(".phu-man.mo").forEach((x) => x.classList.remove("mo")); $("#app").inert = false; $("#tab").inert = false; truoc?.focus(); };
let hen; const bao = (t) => { const b = $("#bao"); b.textContent = t; b.style.display = "block"; clearTimeout(hen); hen = setTimeout(() => (b.style.display = "none"), 3500); };
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("phu-man")) return dong();
  const t = e.target.closest("[data-di],[data-mo],[data-dong],[data-loc-chon],[data-chep]"); if (!t) return;
  if (t.dataset.chep) { try { await navigator.clipboard.writeText(t.dataset.chep); t.textContent = "Đã chép"; } catch { t.textContent = "Chép tay"; } return; }
  if (t.dataset.locChon) { loc = t.dataset.locChon; return veNguon(); }
  if (t.dataset.di) return di(t.dataset.di);
  if (t.dataset.mo === "nhan") veDsTin(); // mở lại luôn về danh sách
  if (t.dataset.mo) return mo(t.dataset.mo, t);
  if ("dong" in t.dataset) return dong();
});
$("#tim").addEventListener("input", (e) => { tu = e.target.value; veNguon(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") return dong();
  const m = document.querySelector(".phu-man.mo"); if (e.key !== "Tab" || !m) return; // giữ tiêu điểm trong tấm đang mở
  const f = [...m.querySelectorAll("button, input, select, a[href]")].filter((x) => !x.disabled && x.offsetParent); if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
});
async function lamMoi() { await taiHet(); veHomNay(); veNguon(); veDon(); veTien(); veThem(); }

// ---------- khởi động ----------
(async () => {
  splash("Đang mở sổ mua…");
  // Lỗi mạng khi lấy phiên: tắt màn chờ, báo + thử lại (trước kẹt "Đang mở sổ mua…")
  try { token = await layPhien(); } catch {
    await tatSplash(); document.body.insertAdjacentHTML("beforeend", `<div class="man-full"><div class="the trong"><p>Chưa kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại.</p><button class="nut chinh" type="button" onclick="location.reload()">Thử lại</button></div></div>`);
    return;
  }
  if (!token) return location.replace("./dang-nhap.html?ben=mua");
  try {
    me = await api("/v1/me");
    if (!me.org?.can_buy) { tatSplash(); document.body.insertAdjacentHTML("beforeend", `<div class="man-full"><div class="the trong"><p>Tài khoản <b>${esc(me.org?.name || "")}</b> là bên bán. App này dành cho bên mua.</p><a class="nut chinh" href="ban-hom-nay.html">Mở app người bán</a><button class="nut vien" id="dx2">Đăng xuất</button></div></div>`); $("#dx2").onclick = dangXuat; return; }
    // Tổ chức mới đăng ký: chưa có vai (chờ nhân viên AgiViet xác minh, hai người duyệt) → chưa dùng được chức năng mua.
    if (!(me.roles || []).length) { await tatSplash(); document.body.insertAdjacentHTML("beforeend", `<div class="man-full"><div class="the trong"><h2 style="margin:0;font-size:20px">${esc(me.org?.name || "")} đang chờ xác minh</h2><p>Nhân viên AgiViet sẽ gọi số ${esc(me.phone_masked)} để xác minh cơ sở và mã số thuế. Được duyệt (hai người duyệt, hiệu lực sau 24 giờ) thì bạn tìm nguồn, chào giá và ký hợp đồng được.</p><button class="nut vien" id="dx2">Đăng xuất</button></div></div>`); $("#dx2").onclick = dangXuat; return; }
    $("#ten-tc").textContent = `${me.org.name} · ${me.name}`;
    splash("Đang tải nguồn hàng, đơn và tiền…");
    await lamMoi();
  } catch (e) { tatSplash(); document.body.insertAdjacentHTML("beforeend", `<div class="man-full"><div class="the trong"><p class="loi">Chưa tải được dữ liệu: ${esc(e.message)}</p><button class="nut chinh" onclick="location.reload()">Tải lại</button></div></div>`); return; }
  const vao = () => { $("#app").hidden = false; $("#tab").hidden = false; const h = location.hash.slice(1); if (TEN[h]) di(h); };
  await tatSplash();
  let daChao = false; try { daChao = !!localStorage.getItem(KHOA_CHAO); } catch {}
  daChao ? vao() : moChao(vao);
})();
