import { can, esc, phien, ANH_SP, giuThamSo, veDau, veTab, tenLoai } from "./chung.ts";
const $ = (id) => document.getElementById(id);
giuThamSo();
veTab("cho");
veDau($("dau"), { chao: "Chợ của bác", ten: "Hàng đang bán", chuDau: "" });

const TT = {
  on_sale: ["Đang bán", ""], upcoming: ["Sắp có hàng", ""], hidden: ["Người mua không thấy", "gap"], draft: ["Nháp", "cho"], reserved: ["Đang giữ cho đơn", "vang"],
  sold_out: ["Đã bán hết", "cho"], closed: ["Đã đóng", "cho"], paused: ["Tạm ngưng", "cho"],
};
const NHOM_MUA = { processor: "Nhà máy chế biến", export: "Xuất khẩu", horeca: "Nhà hàng, bếp ăn", wholesale: "Đầu mối", wholesaler: "Vựa, đầu mối", trader: "Thương lái", retail: "Bán lẻ", household: "Hộ chế biến" };
const NGAY_NHAC = 7;   // lô chưa xác nhận còn hàng quá 7 ngày thì nhắc (14 ngày tự ẩn)
const ngayVN = (s) => new Date(s).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });

let token, lo = [], tenSp = new Map(), dsChaoMo = [], tatCaChao = [], dangBanToanCuc = [], chaoLoiTai = false;
const get = (d) => fetch(d, { headers: { authorization: "Bearer " + token } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${d}: ${r.status}`))));
const lenh = async (d, b) => {
  const r = await fetch(d, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...b }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = j.errors?.[0] || {};
    if (/ck_lot_price_rate/.test(JSON.stringify(e))) throw new Error("Giá lô chỉ sửa được 1 lần mỗi 24 giờ. Bác đợi qua 24 giờ rồi sửa lại.");
    if (e.details?.db === "uq_offer_open_per_lot_buyer") throw new Error("Lô này đã có lời chào đang mở với người mua này. Bác xem và trả lời ở Tin nhắn.");
    throw new Error(e.message || j.thong_diep || j.message || `Lỗi ${r.status}`);
  }
  return j;
};

// Hai ngăn
const chonNgan = (k) => {
  for (const [n, p] of [["ngan-hang", "p-hang"], ["ngan-can", "p-can"], ["ngan-vu", "p-vu"]]) { const on = n === k; $(n).setAttribute("aria-selected", String(on)); $(p).hidden = !on; $(p).style.display = on ? "grid" : ""; }
  try { sessionStorage.setItem("agv-ngan-cho", k); } catch {}
};
$("ngan-hang").onclick = () => chonNgan("ngan-hang");
$("ngan-can").onclick = () => chonNgan("ngan-can");
$("ngan-vu").onclick = () => chonNgan("ngan-vu");
if (location.hash === "#can") chonNgan("ngan-can"); else if (location.hash === "#vu") chonNgan("ngan-vu");
else { try { const k = sessionStorage.getItem("agv-ngan-cho"); if (k === "ngan-can" || k === "ngan-vu") chonNgan(k); } catch {} }

const alertNhe = (m) => { const p = document.createElement("p"); p.className = "bao loi"; p.textContent = m; $("ds-da-chao").prepend(p); setTimeout(() => p.remove(), 5000); };
// Một dòng lời chào: ai chào, giá, lượng, tới lượt ai, hạn → bấm mở Tin nhắn để trả lời
const dongChao = (c, coMaLo = true) => {
  const v = c.vong_cuoi || {};
  const bacChao = c.direction === "seller_quote";
  const toiBac = v.from_side === "buyer";
  const han = v.expires_at ? new Date(v.expires_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }) : "";
  return `<a href="./ban-tin-nhan.html${location.search}#chao=${esc(c.id)}">
    <span class="ai">${bacChao ? `Bác chào ${esc(c.buyer_name || "người mua")}` : `${esc(c.buyer_name || "Người mua")} chào`}</span>
    <span class="gia">${Number(v.price_vnd || 0).toLocaleString("vi-VN")} đ/kg</span>
    <span class="phu2">${esc(can(v.qty_g).join(" "))}${coMaLo ? ` · lô ${esc(c.lot_code)}` : ""}${han ? ` · hạn ${han}` : ""}</span>
    <span class="luot ${toiBac ? "bac" : ""}">${toiBac ? "Chờ bác" : "Chờ người mua"}</span></a>`;
};

// Quản lý lô: sửa giá (1 lần/24 giờ), bán nhanh 3 ngày, ngừng bán
async function moQuanLy(l) {
  const che = document.createElement("div"); che.className = "man-che";
  const ten = `${tenSp.get(l.product_code) || l.product_code} · ${tenLoai(l.grade_code)}`;
  che.innerHTML = `<div class="tam" role="dialog" aria-modal="true" aria-labelledby="ql-t"><h2 id="ql-t">${esc(ten)} · ${esc(l.code)}</h2><div class="khung-tai"></div></div>`;
  document.body.appendChild(che);
  const dong_ = () => che.remove();
  che.addEventListener("pointerdown", (e) => { if (e.target === che) dong_(); });
  const ct = await get(`/v1/lots/${l.id}`).catch(() => null);
  const g = await get(`/v1/reference-prices?product=${encodeURIComponent(l.product_code)}&grade=${encodeURIComponent(l.grade_code)}`).catch(() => null);
  const tam = che.querySelector(".tam");
  const dangGap = l.ban_gap_den && new Date(l.ban_gap_den) > new Date();
  const soChaoMo = dsChaoMo.filter((c) => c.lot_code === l.code).length;
  // Lượng đang giữ/trong hợp đồng/đang giao: máy chủ không cho ngừng bán (409) → báo trước, khóa nút (QA F15)
  const rangBuoc = ["held", "committed", "in_transit"].reduce((t, k) => t + Number(ct?.qty?.[k] || 0), 0);
  tam.innerHTML = `<h2 id="ql-t">${esc(ten)} · ${esc(l.code)}</h2>
    <form class="muc-tam" id="f-gia"><h3>Sửa giá</h3>
      <p>Sửa được 1 lần mỗi 24 giờ. Giá thấp nhất giữ kín, người mua không thấy; lời chào thấp hơn bị tự từ chối.${g?.price_vnd ? ` Giá tham khảo hiện ${Number(g.price_vnd).toLocaleString("vi-VN")} đ/kg.` : ""}</p>
      <div class="hai-o"><label>Giá muốn bán, đ/kg<input name="ask" type="number" inputmode="numeric" min="1000" step="100" required value="${esc(ct?.ask_price_vnd || "")}"></label>
        <label>Giá thấp nhất, đ/kg<input name="floor" type="number" inputmode="numeric" min="1000" step="100" required value="${esc(ct?.floor_price_vnd || "")}"></label></div>
      <p class="bao-ket" id="bao-gia" role="status"></p>
      <button type="submit" class="nut chinh-nut">Lưu giá mới</button></form>
    <div class="muc-tam"><h3>Bán nhanh trong 3 ngày</h3>
      <p>${dangGap ? `Đang bán nhanh tới ${new Date(l.ban_gap_den).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" })}.` : "Người mua chỉ thấy \"giao được trong 48 giờ\", không thấy chữ gấp. Bên nhận hàng kém loại sẽ được báo."}</p>
      <p class="bao-ket" id="bao-gap" role="status"></p>
      <button type="button" class="nut phu-nut" id="nut-gap">${dangGap ? "Tắt bán nhanh" : "Bật bán nhanh 3 ngày"}</button></div>
    <div class="muc-tam"><h3>Ngừng bán lô này</h3>
      <p>Người mua sẽ không thấy lô nữa. Hợp đồng đã ký vẫn giữ nguyên. ${soChaoMo ? `<b>Lô đang có ${soChaoMo} lời chào mở: sau khi ngừng bán sẽ không đồng ý được nữa</b>, bác nên trả lời hoặc hủy các lời chào đó trước.` : ""}</p>
      ${rangBuoc ? `<p class="bao-ket" style="display:block"><b>Chưa ngừng bán được:</b> ${(rangBuoc / 1000).toLocaleString("vi-VN")} kg của lô đang giữ hoặc nằm trong hợp đồng với người mua. Khi giao xong hoặc hợp đồng đóng thì bác ngừng bán được.</p>` : ""}
      <p class="bao-ket" id="bao-dong" role="status"></p>
      <button type="button" class="nut nut-do" id="nut-dong"${rangBuoc ? " disabled" : ""}>Ngừng bán</button></div>
    <div class="day-tam"><button type="button" class="nut phu-nut" id="ql-dong" style="width:100%">Đóng</button></div>`;
  tam.querySelector("#ql-dong").onclick = dong_;
  const f = tam.querySelector("#f-gia");
  // Chưa đủ 24 giờ từ lần sửa trước: khóa sẵn, ghi rõ giờ được sửa lại (không để bác bấm rồi mới báo lỗi)
  const suaTu = ct?.price_editable_from ? new Date(ct.price_editable_from) : null;
  if (suaTu && suaTu > new Date()) {
    f.querySelectorAll("input, button").forEach((x) => (x.disabled = true));
    $("bao-gia").textContent = `Giá vừa được sửa. Bác sửa lại được từ ${suaTu.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" })}.`;
  }
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (Number(f.floor.value) > Number(f.ask.value)) { $("bao-gia").textContent = "Giá thấp nhất không được cao hơn giá mong muốn."; return; }
    $("bao-gia").textContent = "Đang lưu…";
    try {
      const r = await lenh(`/v1/lots/${l.id}/price`, { ask_price_vnd: String(f.ask.value), floor_price_vnd: String(f.floor.value) });
      const cb = r?.data?.canh_bao ?? r?.canh_bao;
      const chuCb = Array.isArray(cb) ? cb.map((x) => (typeof x === "string" ? x : x?.thong_diep || x?.message || "")).filter(Boolean).join(" ") : typeof cb === "string" ? cb : "";
      $("bao-gia").textContent = "Đã lưu giá mới." + (chuCb ? ` Lưu ý: ${chuCb}` : "");
    } catch (err) { $("bao-gia").textContent = err.message; }
  };
  tam.querySelector("#nut-gap").onclick = async (e) => {
    e.target.disabled = true; $("bao-gap").textContent = "Đang gửi…";
    try {
      await lenh(`/v1/lots/${l.id}/urgent-sale`, dangGap ? { on: false } : { until: new Date(Date.now() + 3 * 864e5).toISOString(), reason: "Người bán bật bán nhanh trên Chợ" });
      $("bao-gap").textContent = dangGap ? "Đã tắt bán nhanh." : "Đã bật bán nhanh 3 ngày."; setTimeout(() => location.reload(), 900);
    } catch (err) { $("bao-gap").textContent = err.message; e.target.disabled = false; }
  };
  // Ngừng bán cần bấm hai lần (không dùng hộp thoại trình duyệt)
  let xacNhan = false;
  tam.querySelector("#nut-dong").onclick = async (e) => {
    if (!xacNhan) { xacNhan = true; e.target.textContent = "Bấm lần nữa để ngừng bán"; $("bao-dong").textContent = "Bác chắc chắn ngừng bán lô này?"; return; }
    e.target.disabled = true; $("bao-dong").textContent = "Đang gửi…";
    try { await lenh(`/v1/lots/${l.id}/close`, {}); $("bao-dong").textContent = "Đã ngừng bán."; setTimeout(() => location.reload(), 900); }
    catch (err) { $("bao-dong").textContent = err.message; e.target.disabled = false; }
  };
}

async function moHang() {
  const [me, ds, sp, chao] = await Promise.all([get("/v1/me"), get("/v1/lots?mine=true"), get("/v1/products").catch(() => []), get("/v1/offers").catch(() => null)]);
  lo = ds;
  tenSp = new Map((Array.isArray(sp) ? sp : sp.items || []).map((p) => [p.code, p.name_vi || p.name]));
  veDau($("dau"), { chao: "Chợ của bác", ten: me.org.name, chuDau: me.name.split(" ").at(-1).charAt(0).toUpperCase() });

  const dangBan = lo.filter((l) => l.status === "on_sale" && !l.an_tu_dong);
  const [tc, dv] = can(dangBan.reduce((s, l) => s + Number(l.available_g || 0), 0));
  $("so-lo").textContent = String(dangBan.length); $("tong-con").textContent = tc; $("dv-con").textContent = `${dv} còn bán`;
  const dsChao = chao === null ? null : (Array.isArray(chao) ? chao : chao.items || []).filter((c) => /sent|countered|open|pending/.test(c.status || ""));
  $("so-chao").textContent = dsChao === null ? "—" : dsChao.length;
  dsChaoMo = dsChao || [];
  chaoLoiTai = chao === null;
  tatCaChao = chao === null ? [] : (Array.isArray(chao) ? chao : chao.items || []);   // gồm cả đã đồng ý, từ chối, hết hạn, đã rút
  const hoiTheoLo = new Map(); (dsChao || []).forEach((c) => hoiTheoLo.set(c.lot_code, (hoiTheoLo.get(c.lot_code) || 0) + 1));

  // Lượng theo từng ngăn: còn bán · đang giữ (đồng ý giá, chờ ký) · đã hứa (trong hợp đồng) · đã giao
  const qty = new Map<string, any>(await Promise.all(lo.map((l) => get(`/v1/lots/${l.id}/qty`).then((q): [string, any] => [l.id, q]).catch((): [string, any] => [l.id, null]))));

  // Nhắc: lô sắp tự ẩn / đã ẩn → một nút xác nhận còn hàng cho tất cả
  const canNhac = lo.filter((l) => l.status === "hidden" || (l.status === "on_sale" && (l.an_tu_dong || !l.last_confirmed_at || (Date.now() - +new Date(l.last_confirmed_at)) / 864e5 > NGAY_NHAC)));
  if (canNhac.length) {
    $("nhac").innerHTML = `<p><b>${canNhac.length} lô</b> lâu chưa xác nhận còn hàng. Quá 14 ngày người mua sẽ không thấy nữa.</p><button type="button" id="xn-tat-ca">Vẫn còn hàng</button>`;
    $("nhac").hidden = false;
    $("xn-tat-ca").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Đang gửi…";
      const kq = await Promise.allSettled(canNhac.map((l) => lenh(`/v1/lots/${l.id}/confirm-available`, {})));
      const loi = kq.map((x, i) => [x, canNhac[i]]).filter(([x]) => x.status === "rejected");
      if (!loi.length) { location.reload(); return; }
      e.target.disabled = false; e.target.textContent = "Thử lại";
      $("nhac").querySelector("p").innerHTML = `Đã xác nhận ${kq.length - loi.length}/${kq.length} lô. Chưa được: ${loi.map(([x, l]) => `<b>${esc(l.code)}</b> (${esc(x.reason?.message || "lỗi")})`).join(", ")}.`;
    };
  }

  // Nhóm theo trạng thái (chỉ nhóm có lô); một nhóm thì không cần nút lọc
  const anDi = lo.filter((l) => l.status === "on_sale" && l.an_tu_dong);
  const nhom = [
    ["on_sale", "Đang bán", lo.filter((l) => l.status === "on_sale" && !l.an_tu_dong)],
    ["an", "Người mua không thấy", [...anDi, ...lo.filter((l) => l.status === "hidden")]],
    ...Object.entries(TT).filter(([k]) => k !== "on_sale" && k !== "hidden").map(([k, [ten]]) => [k, ten, lo.filter((l) => l.status === k)]),
  ].filter(([, , d]) => d.length);
  if (!nhom.length) nhom.push(["on_sale", "Đang bán", []]);
  let chon = nhom[0][0];
  $("loc").hidden = nhom.length < 2;
  $("loc").innerHTML = nhom.length > 1 ? nhom.map(([k, ten, d]) => `<button type="button" data-k="${k}" aria-pressed="${k === chon}">${ten}<small>${d.length}</small></button>`).join("") : "";
  $("loc").querySelectorAll("button").forEach((b) => (b.onclick = () => { chon = b.dataset.k; ve(); }));
  const ve = () => {
    $("loc").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === chon)));
    const d: any[] = nhom.find(([k]) => k === chon)[2] as any[];
    $("ds").innerHTML = d.length ? d.map((l) => {
      const q = qty.get(l.id) || { available: l.available_g };
      const phan = [["con", "Còn bán", q.available, "var(--la)"], ["giu", "Đang giữ", q.held, "#e2b24a"], ["hua", "Trong hợp đồng", BigInt(q.committed || 0) + BigInt(q.in_transit || 0), "#4f7fb8"], ["giao", "Đã giao", q.delivered, "#9aa59f"]]
        .map(([k, ten, g, mau]) => [k, ten, Number(g || 0), mau]);
      const tong = phan.reduce((s, [, , g]) => s + g, 0) || 1;
      const conGap = l.ban_gap_den && new Date(l.ban_gap_den) > new Date() && l.status === "on_sale";
      const [tt, lop] = l.an_tu_dong ? ["Người mua không thấy", "gap"] : conGap ? ["Đang bán nhanh", "vang"] : TT[l.status] || [l.status, "cho"];
      const anh = ANH_SP(l.product_code);
      const chaoLo = (dsChao || []).filter((c) => c.lot_code === l.code);
      const hoi = chaoLo.length;
      const lauChuaXn = l.status === "on_sale" && (!l.last_confirmed_at || (Date.now() - +new Date(l.last_confirmed_at)) / 864e5 > NGAY_NHAC);
      return `<article class="lo" data-lo="${esc(l.code)}">
        <a class="dau-lo" href="./ban-lo.html?id=${encodeURIComponent(l.id)}" aria-label="Xem chi tiết lô ${esc(l.code)}"><span class="anh" ${anh ? `style="background-image:url(${anh})"` : ""}></span>
          <span style="min-width:0"><p class="ten">${esc(tenSp.get(l.product_code) || l.product_code)}</p>
            <p class="loai">${esc(tenLoai(l.grade_code))} <span class="tt ${lop}">${esc(tt)}</span></p>
            <p class="phu">${esc(l.code)} · ${l.qty_basis === "estimated" ? "lượng ước tính" : "đã cân"}${l.last_confirmed_at ? ` · báo còn hàng ${ngayVN(l.last_confirmed_at)}` : ""}</p></span><span class="mui-ct" aria-hidden="true">›</span></a>
        <div class="luong" role="img" aria-label="${phan.filter(([, , g]) => g).map(([, ten, g]) => `${ten} ${can(g).join(" ")}`).join(", ")}">${phan.filter(([, , g]) => g).map(([k, , g]) => `<i class="${k}" style="width:${(g / tong * 100).toFixed(1)}%"></i>`).join("")}</div>
        <div class="chu-luong">${phan.filter(([k, , g]) => g || k === "con").map(([, ten, g, mau]) => `<span style="--c:${mau}">${ten} <b>${can(g).join(" ")}</b></span>`).join("")}</div>
        ${chaoLo.length ? `<div class="chao-lo">${chaoLo.map((c) => dongChao(c, false)).join("")}</div>` : ""}
        <div class="duoi"><span class="hoi">${chaoLoiTai ? "Chưa tải được lời chào" : hoi ? `<b>${hoi}</b> lời chào đang mở` : "Chưa có lời chào"}</span>
          <span class="nut-hang">${lauChuaXn ? `<button type="button" class="xac-nhan" data-xn="${l.id}">Vẫn còn hàng</button>` : ""}${l.status === "on_sale" ? `<button type="button" class="nut-ql" data-ql="${l.id}">Quản lý lô</button>` : ""}</span></div>
        ${l.goi_y_ban_gap ? `<p class="goi-y">Lô này lâu chưa có người hỏi. Bác có thể bật bán nhanh (người mua chỉ thấy "giao được trong 48 giờ"), hoặc nhắn AgiViet hỏi ứng tiền, kho lạnh.</p>` : ""}
      </article>`;
    }).join("") : `<div class="trong">${window.anhTrong?.("chua-co-lo-hang") || ""}<p><b>Chưa có lô nào ở đây</b></p><p style="margin-top:4px">Bấm nút Đăng bài ở giữa thanh dưới để đăng hàng.</p></div>`;
    $("ds").setAttribute("aria-label", `${d.length} lô`);
    $("ds").querySelectorAll("[data-ql]").forEach((b) => (b.onclick = () => moQuanLy(lo.find((x) => x.id === b.dataset.ql))));
    $("ds").querySelectorAll("[data-xn]").forEach((b) => (b.onclick = async () => {
      b.disabled = true; b.textContent = "Đang gửi…";
      try { await lenh(`/v1/lots/${b.dataset.xn}/confirm-available`, {}); b.textContent = "Đã xác nhận"; } catch (e) { b.textContent = "Thử lại"; b.disabled = false; }
    }));
  };
  ve();
}

const CU = { rejected: "Lần trước người mua đã từ chối", expired: "Lần trước hết hạn, người mua chưa trả lời", withdrawn: "Lần trước bác đã hủy lời chào", auto_rejected: "Lần trước chưa tới mức bác chấp nhận" };
const gioVN = (s) => new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" });
async function moCan() {
  const nc = await get("/v1/demands").catch(() => null);
  if (!nc) { $("ds-can").innerHTML = `<p class="bao loi">Chưa tải được nhu cầu người mua.</p>`; return; }
  const dangBan = lo.filter((l) => l.status === "on_sale" && !l.an_tu_dong);
  dangBanToanCuc = dangBan;
  const vuong = (l, ben) => dsChaoMo.some((c) => c.lot_code === l.code && c.buyer_org_id === ben);
  const loKhop = (sp: string, loai: string, ben?: string) => dangBan.filter((l) => l.product_code === sp && l.grade_code === loai && (!ben || !vuong(l, ben)));
  const mo = nc.filter((n) => n.status === "open");
  $("chao-loi").hidden = !chaoLoiTai;
  // Lời chào mới nhất của bác cho từng dòng nhu cầu (danh sách lời chào đã xếp mới nhất trước)
  const moiNhat = new Map();
  for (const c of tatCaChao) if (c.direction === "seller_quote" && c.demand_line_id && !moiNhat.has(c.demand_line_id)) moiNhat.set(c.demand_line_id, c);
  const chiTiet = new Map<string, any>(await Promise.all([...moiNhat.values()].filter((c) => c.status === "accepted" || (c.status === "sent" && c.vong_cuoi?.from_side === "buyer"))
    .map((c) => get(`/v1/offers/${c.id}`).then((d): [string, any] => [c.id, d]).catch((): [string, any] => [c.id, null]))));
  const diem = (n) => n.lines.some((x) => loKhop(n.product_code, x.grade_code).length) ? 0 : dangBan.some((l) => l.product_code === n.product_code) ? 1 : 2;
  mo.sort((a, b) => diem(a) - diem(b));
  const soKhop = mo.filter((n) => diem(n) === 0).length;
  // Cung cầu trong vùng cho các mặt hàng bác đang bán (không nêu ai rẻ nhất)
  const spBac = [...new Set(dangBan.map((l) => l.product_code))];
  const canKg = mo.filter((n) => spBac.includes(n.product_code)).flatMap((n) => n.lines).reduce((t, x) => t + Number(x.qty_g), 0);
  const banKg = dangBan.reduce((t, l) => t + Number(l.available_g || 0), 0);
  if (spBac.length) {
    $("cung-cau").innerHTML = `<div><b>${esc(can(canKg).join(" "))}</b><span>người mua đang cần (${mo.filter((n) => spBac.includes(n.product_code)).length} phiếu)</span></div>
      <div><b>${esc(can(banKg).join(" "))}</b><span>bác đang bán</span></div>`;
    $("cung-cau").hidden = false;
  }
  const daChao = dsChaoMo.filter((c) => c.direction === "seller_quote");
  if (daChao.length) {
    $("ds-da-chao").innerHTML = daChao.map((c) => `<div class="da-chao">${dongChao(c)}</div>`).join("");
    $("khoi-da-chao").hidden = false;
    // Rút lại: bấm 2 lần (không dùng hộp thoại trình duyệt)
    $("ds-da-chao").querySelectorAll("[data-rut]").forEach((x) => (x.onclick = async () => {
      if (x.dataset.xn !== "1") { x.dataset.xn = "1"; x.textContent = "Bấm lần nữa để rút"; return; }
      x.disabled = true; x.textContent = "Đang rút…";
      try { await lenh(`/v1/offers/${x.dataset.rut}/withdraw`, {}); x.textContent = "Đã rút"; setTimeout(() => location.reload(), 700); }
      catch (err) { x.textContent = "Rút lại"; x.disabled = false; x.dataset.xn = ""; alertNhe(err.message); }
    }));
  }
  $("so-can").textContent = soKhop ? soKhop : "";
  // Lời chào của bác dưới dòng nhu cầu, đúng theo trạng thái
  const veLoiCua = (c, ct, n, x) => {
    const v = c.vong_cuoi || {}, gia = Number(v.price_vnd).toLocaleString("vi-VN");
    if (c.status === "accepted" && ct?.hold?.status === "committed") {
      return `<div class="loi-cua-bac dong-y"><p><b>Đã thành đơn ${gia} đ/kg</b> · ${esc(can(v.qty_g).join(" "))} · lô ${esc(c.lot_code)}</p>
        <p class="phu2">Hai bên đã chuyển sang hợp đồng. Bác theo dõi các bước tiếp theo ở Tin nhắn.</p>
        <a class="nut-sua" href="./ban-tin-nhan.html#chao=${esc(c.id)}">Xem hợp đồng</a></div>`;
    }
    if (c.status === "accepted") {
      const giu = ct?.hold?.expires_at ? ` tới ${gioVN(ct.hold.expires_at)}` : " 24 giờ";
      return `<div class="loi-cua-bac dong-y"><p><b>Người mua đã đồng ý giá ${gia} đ/kg</b> · ${esc(can(v.qty_g).join(" "))} · lô ${esc(c.lot_code)}</p>
        <p class="phu2">Hàng được giữ cho người mua${giu}. Đây chưa phải hợp đồng: chờ người mua gửi thỏa thuận để hai bên ký.</p>
        <a class="nut-sua" href="./ban-tin-nhan.html#chao=${esc(c.id)}">Xem ở Tin nhắn</a></div>`;
    }
    if (v.from_side === "buyer") {
      const con = ct?.luot_tra_gia_con;
      return `<div class="loi-cua-bac toi-bac"><p><b>Người mua trả giá ${gia} đ/kg</b> · ${esc(can(v.qty_g).join(" "))} · lô ${esc(c.lot_code)}</p>
        <p class="phu2">Tới lượt bác trả lời${v.expires_at ? ` trước ${gioVN(v.expires_at)}` : ""}${con != null ? ` · bác còn ${con} lần chào giá mới` : ""}. Bác đồng ý, chào giá mới hoặc không bán ở Tin nhắn.</p>
        <a class="nut-sua" href="./ban-tin-nhan.html#chao=${esc(c.id)}">Trả lời ở Tin nhắn</a></div>`;
    }
    if ((v.round_no || 1) > 1) {
      // Bác đã trả giá lại sau khi người mua trả giá: chỉ chờ, không rút/sửa (quy trình B3; backend 0074 cũng chặn)
      return `<div class="loi-cua-bac"><p><b>Bác đã chào giá mới ${gia} đ/kg</b> · ${esc(can(v.qty_g).join(" "))} · lô ${esc(c.lot_code)}</p>
        <p class="phu2">Chờ người mua trả lời${v.expires_at ? ` trước ${gioVN(v.expires_at)}` : ""}. Hai bên đã thương lượng qua lại nên không hủy hay sửa được nữa.</p>
        <a class="nut-sua" href="./ban-tin-nhan.html#chao=${esc(c.id)}">Xem ở Tin nhắn</a></div>`;
    }
    return `<div class="loi-cua-bac"><p><b>Bác đã chào ${gia} đ/kg</b> · ${esc(can(v.qty_g).join(" "))} · lô ${esc(c.lot_code)}</p>
      <p class="phu2">Chờ người mua trả lời${v.expires_at ? ` trước ${gioVN(v.expires_at)}` : ""}. Người mua chưa trả lời thì bác sửa hoặc hủy được.</p>
      <div class="hai-nut"><button type="button" class="nut-sua" data-sua="${c.id}" data-nc="${n.id}" data-dong="${x.id}">Sửa lời chào</button><button type="button" class="nut-huy" data-huy="${c.id}">Hủy chào</button></div></div>`;
  };
  const veNc = (n) => {
    const khop = diem(n) === 0;
    return `<article class="the-nc">
      <a class="dau-nc" href="./ban-nhu-cau.html?id=${encodeURIComponent(n.id)}"><span><p class="ben">${esc(n.buyer_name)}</p>
      <p class="sp-nc">${esc(tenSp.get(n.product_code) || n.product_code)} <span>· cần ${ngayVN(n.needed_from)}–${ngayVN(n.needed_to)}</span></p>
      <p class="phu">${esc(NHOM_MUA[n.segment_code] || n.segment_code)}</p>
      <p class="nhan-nc">${khop ? '<span class="khop">Khớp hàng của bác</span>' : ""}${n.lines.some((x) => x.min_source_qty_g && Number(x.min_source_qty_g) < Number(x.qty_g)) ? '<span class="gom">Nhận gom nhiều vườn</span>' : ""}</p></span><span class="mui-ct" aria-hidden="true">›</span></a>
      ${n.lines.map((x) => { const k = loKhop(n.product_code, x.grade_code, n.buyer_org_id);
        const moi = moiNhat.get(x.id);
        // Còn hiệu lực (không chào thêm): đang mở, hoặc đã đồng ý mà hàng còn giữ / đã thành cam kết
        const giu = moi?.status === "accepted" ? chiTiet.get(moi.id)?.hold : null;
        const conGiu = giu && (giu.status === "committed" || (giu.status === "active" && new Date(giu.expires_at) > new Date()));
        const cua = moi && (moi.status === "sent" || (moi.status === "accepted" && (conGiu || !chiTiet.get(moi.id)))) ? moi : null;
        const cuDong = moi && !cua ? (moi.status === "accepted" ? "Lần trước người mua đồng ý nhưng hết thời gian giữ hàng" : CU[moi.status]) : "";
        const nhan = !cua && !k.length && loKhop(n.product_code, x.grade_code).length ? ["Lô này đang có lời chào với người mua", "da"] : !cua && !k.length ? ["Bác chưa có hàng này", "chua"] : null;
        return `${cuDong ? `<p class="lan-truoc">${esc(cuDong)} (${Number(moi.vong_cuoi.price_vnd).toLocaleString("vi-VN")} đ/kg). Bác chào lại được.</p>` : ""}<div class="nc-dong"><span>${esc(tenLoai(x.grade_code))}</span><span class="sl">${can(x.qty_g).join(" ")}</span>
          ${cua ? "" : nhan ? `<span class="tt-dong ${nhan[1]}">${nhan[0]}</span>` : `<button type="button" ${chaoLoiTai ? "disabled" : ""} data-nc="${n.id}" data-dong="${x.id}" aria-label="Chào hàng cho ${esc(n.buyer_name)}">Chào hàng</button>`}</div>
          ${cua ? veLoiCua(cua, chiTiet.get(cua.id), n, x) : ""}`; }).join("")}
    </article>`;
  };
  const lienQuan = mo.filter((n) => diem(n) < 2), khac = mo.filter((n) => diem(n) === 2);
  $("ds-can").innerHTML = (lienQuan.length ? lienQuan.map(veNc).join("") : `<div class="trong">Chưa có người mua nào cần mặt hàng bác đang bán.</div>`)
    + (khac.length ? `<details class="nc-khac"><summary>Nhu cầu mặt hàng khác <small>${khac.length}</small></summary>${khac.map(veNc).join("")}</details>` : "");
  // Sửa lời chào: mở tấm điền sẵn, gửi thì thay lời chào cũ (vẫn giữ mối với người mua)
  $("ds-can").querySelectorAll("[data-sua]").forEach((b) => (b.onclick = () => {
    const n = mo.find((x) => x.id === b.dataset.nc), dong = n.lines.find((x) => x.id === b.dataset.dong), cu = tatCaChao.find((c) => c.id === b.dataset.sua);
    const dsLo = dangBan.filter((l) => l.product_code === n.product_code && l.grade_code === dong.grade_code && (l.code === cu.lot_code || !vuong(l, n.buyer_org_id)));
    moTam(n, dong, dsLo, cu);
  }));
  // Hủy chào: bấm 2 lần; nhu cầu còn mở thì bác chào lại được
  $("ds-can").querySelectorAll("[data-huy]").forEach((b) => (b.onclick = async () => {
    if (b.dataset.xn !== "1") { b.dataset.xn = "1"; b.textContent = "Bấm lần nữa để hủy"; return; }
    b.disabled = true; b.textContent = "Đang hủy…";
    try { await lenh(`/v1/offers/${b.dataset.huy}/withdraw`, {}); b.closest(".loi-cua-bac").innerHTML = '<p class="phu2">Đã hủy lời chào. Bác vẫn chào lại được khi nhu cầu còn mở.</p>'; setTimeout(() => location.reload(), 1500); }
    catch (err) { b.textContent = "Hủy chào"; b.disabled = false; b.dataset.xn = ""; b.closest(".loi-cua-bac").insertAdjacentHTML("beforeend", `<p class="phu2" style="color:var(--dau-do)">${esc(err.message)}</p>`); }
  }));
  $("ds-can").querySelectorAll("button[data-dong]:not([data-sua])").forEach((b) => (b.onclick = () => {
    const n = mo.find((x) => x.id === b.dataset.nc), dong = n.lines.find((x) => x.id === b.dataset.dong);
    moTam(n, dong, loKhop(n.product_code, dong.grade_code, n.buyer_org_id));
  }));
}

// Tấm chào hàng: chọn lô khớp, lượng, giá → lời chào của người bán vào nhu cầu
const GIAO = { self_pickup: "Người mua tự đến lấy tại vườn", delivered: "Bác giao tới nơi người mua", seller_delivers: "Bác chở tới nơi người mua", platform_logistics: "AgiViet điều phối xe", warehouse: "Giao tại kho" };
async function moTam(n, dong, dsLo, cu = null) {
  const che = document.createElement("div"); che.className = "man-che";
  const truocDo = document.activeElement;
  const soVN = (v) => Number(v || 0).toLocaleString("vi-VN");
  const gom = dong.min_source_qty_g && Number(dong.min_source_qty_g) < Number(dong.qty_g);
  // Lượng tối thiểu luôn theo backend (kể cả khi bằng toàn bộ nhu cầu); "đơn gom" chỉ để giải thích
  const toiThieuG = Math.max(1000, Number(dong.min_source_qty_g || 0));
  const toiThieuKg = Math.ceil(toiThieuG / 1000);
  // Trần chào theo lô: còn bán; lô ước tính chỉ cam kết tối đa 80% lượng khai trừ phần đã giữ/hứa/giao (ràng buộc ck_qty_estimated_cap)
  const tran = new Map();   // lot_id → gam được phép chào
  const toiDaKg = (l) => Math.floor(Math.min(tran.get(l.id) ?? Number(l.available_g), Number(dong.qty_g)) / 1000);
  che.innerHTML = `<form class="tam tam-chao" role="dialog" aria-modal="true" aria-labelledby="tam-t" novalidate tabindex="-1">
    <div class="dau-tam"><h2 id="tam-t">${cu ? "Sửa lời chào" : "Chào hàng"}</h2><p>cho <b>${esc(n.buyer_name)}</b></p></div>
    ${cu ? `<p class="ghi-sua">Lời chào cũ (${soVN(cu.vong_cuoi.price_vnd)} đ/kg · ${esc(can(cu.vong_cuoi.qty_g).join(" "))}) sẽ được thay bằng lời chào mới. Người mua vẫn thấy bác, hạn trả lời tính lại 24 giờ.</p>` : ""}
    <dl class="ngu-canh">
      <dt>Người mua cần</dt><dd>${esc(tenSp.get(n.product_code) || n.product_code)} · ${esc(tenLoai(dong.grade_code))} · ${esc(can(dong.qty_g).join(" "))}</dd>
      <dt>Thời gian</dt><dd>${ngayVN(n.needed_from)} – ${ngayVN(n.needed_to)}</dd>
      <dt>Giao nhận</dt><dd data-r="giao">…</dd>
      ${toiThieuG > 1000 ? `<dt>${gom ? "Đơn gom" : "Tối thiểu"}</dt><dd>Mỗi vườn tối thiểu ${esc(can(toiThieuG).join(" "))}</dd>` : ""}
    </dl>
    <label>Lô của bác<select name="lo">${dsLo.map((l) => `<option value="${esc(l.id)}"${cu && l.code === cu.lot_code ? " selected" : ""}>${esc(l.code)} · còn ${esc(can(l.available_g).join(" "))}</option>`).join("")}</select></label>
    <div class="hai-o">
      <label>Lượng<span class="o-don-vi"><input name="kg" type="number" inputmode="decimal" min="${toiThieuKg}" step="any" required><i>kg</i></span></label>
      <label>Giá<span class="o-don-vi"><input name="gia" type="number" inputmode="numeric" min="1000" step="100" required><i>đ/kg</i></span></label>
    </div>
    <p class="goi-y-gia" data-r="goi-y"></p>
    <div class="o-thanh-tien" data-r="tien" aria-live="polite"></div>
    <p class="canh-bao an" data-r="canh-bao" role="status"></p>
    <p class="bao-ket" data-r="bao" role="status"></p>
    <div class="hang-nut day-tam"><button type="button" class="nut phu-nut" data-r="dong">Đóng</button><button type="submit" class="nut chinh-nut" data-r="gui" id="tam-gui">${cu ? "Gửi lời chào mới" : "Gửi chào hàng"}</button></div>
  </form>`;
  document.body.appendChild(che);
  const f = che.querySelector("form");
  const r = (k) => che.querySelector(`[data-r="${k}"]`);   // chỉ tìm trong tấm này (tấm cũ đóng rồi không đụng tấm mới)
  const conMo = () => che.isConnected;
  let giaThap = null, giaTK = null, luotLo = 0, dangGui = false;
  const loChon = () => dsLo.find((x) => x.id === f.lo.value);
  // Lượng đang nhập ra gam: nếu là đúng lượng cũ đã làm tròn thì giữ nguyên số gam cũ (không làm mất phần lẻ)
  const kgHienCu = cu ? Number((Number(cu.vong_cuoi.qty_g) / 1000).toFixed(3)) : null;
  const gamNhap = () => (cu && Number(f.kg.value) === kgHienCu && f.lo.value === (dsLo.find((l) => l.code === cu.lot_code)?.id) ? Number(cu.vong_cuoi.qty_g) : Math.round(Number(f.kg.value) * 1000));
  const kiem = () => {
    const g0 = gamNhap(), g = Number(f.gia.value), l = loChon(), maxKg = toiDaKg(l);
    if (!g0 || g0 <= 0) return ["Bác nhập lượng muốn chào.", ""];
    if (g0 > maxKg * 1000) return [`Tối đa ${soVN(maxKg)} kg (${tran.has(l.id) && l.qty_basis === "estimated" ? "lô ước tính chỉ cam kết tối đa 80%, " : ""}lô còn ${can(l.available_g).join(" ")}, người mua cần ${can(dong.qty_g).join(" ")}).`, ""];
    if (g0 < toiThieuG) return [`Mỗi vườn chào tối thiểu ${can(toiThieuG).join(" ")}.`, ""];
    if (!g || g < 1000) return ["Bác nhập giá chào (đồng/kg).", ""];
    const cb = [];
    if (giaThap && g < giaThap) cb.push(`Giá này thấp hơn giá thấp nhất bác đã đặt cho lô (${soVN(giaThap)} đ/kg).`);
    if (giaTK && g < giaTK * 0.8) cb.push("Thấp hơn giá tham khảo hơn 20%.");
    return ["", cb.join(" ")];
  };
  const veLai = () => {
    if (!conMo()) return;
    const g0 = gamNhap(), g = Number(f.gia.value);
    r("tien").innerHTML = g0 > 0 && g > 0 ? `<span>Thành tiền</span><b>${soVN(Math.round(g0 * g / 1000))} đ</b><small>${esc(can(g0).join(" "))} × ${soVN(g)} đ/kg · trước chi phí chở, phân loại</small>` : "";
    const [chan, cb] = kiem();
    r("canh-bao").textContent = chan || cb; r("canh-bao").className = "canh-bao" + (chan ? " chan" : cb ? "" : " an");
  };
  const veGoiY = () => {
    if (!conMo()) return;
    const phan = [];
    if (giaTK) phan.push(`<span>Giá tham khảo <b>${soVN(giaTK)}</b></span><button type="button" class="dung-gia" data-gia="${giaTK}">Dùng giá này</button>`);
    if (giaThap) phan.push(`<span style="flex-basis:100%">Giá thấp nhất của bác <b>${soVN(giaThap)}</b> (kín)</span>`);
    r("goi-y").innerHTML = phan.join("");
    r("goi-y").querySelectorAll(".dung-gia").forEach((x) => (x.onclick = () => { f.gia.value = x.dataset.gia; veLai(); }));
  };
  const capNhatLo = async () => {
    const l = loChon(), luot = ++luotLo;
    const ct = await get(`/v1/lots/${l.id}`).catch(() => null);
    if (!conMo() || luot !== luotLo || f.lo.value !== l.id) return;   // kết quả của lô cũ về muộn: bỏ
    if (ct?.qty) {
      const q = ct.qty, daDung = ["held", "committed", "in_transit", "delivered"].reduce((s, k) => s + Number(q[k] || 0), 0);
      let duoc = Number(q.available || 0);
      if (ct.qty_basis === "estimated") duoc = Math.min(duoc, Math.floor(Number(ct.declared_qty_g) * 0.8) - daDung);
      tran.set(l.id, Math.max(0, duoc)); l.qty_basis = ct.qty_basis;
    }
    giaThap = ct?.floor_price_vnd ? Number(ct.floor_price_vnd) : null;
    const max = toiDaKg(l);
    if (!f.kg.value || Number(f.kg.value) > max) f.kg.value = max;
    f.kg.max = max;
    if (!f.gia.value && ct?.ask_price_vnd) f.gia.value = ct.ask_price_vnd;   // gợi ý giá mong muốn của lô; không ghi đè giá bác đã gõ
    veGoiY(); veLai();
  };
  if (cu) { f.kg.value = kgHienCu; f.gia.value = cu.vong_cuoi.price_vnd; }
  f.kg.oninput = veLai; f.gia.oninput = veLai; f.lo.onchange = capNhatLo;
  capNhatLo();
  get(`/v1/reference-prices?product=${encodeURIComponent(n.product_code)}&grade=${encodeURIComponent(dong.grade_code)}`).then((g) => { if (conMo() && g?.price_vnd) { giaTK = Number(g.price_vnd); veGoiY(); veLai(); } }).catch(() => {});
  get(`/v1/demands/${encodeURIComponent(n.id)}`).then((ct) => { if (conMo()) r("giao").textContent = GIAO[ct.delivery_mode] || "Thỏa thuận khi chốt"; }).catch(() => { if (conMo()) r("giao").textContent = "—"; });
  // Đóng: nút Đóng, bấm nền, phím Escape; trả focus về nút đã mở tấm
  const dong_ = () => { if (dangGui) return; che.remove(); document.removeEventListener("keydown", phim); truocDo?.focus?.(); };
  const phim = (e) => { if (e.key === "Escape") dong_(); };
  document.addEventListener("keydown", phim);
  che.addEventListener("pointerdown", (e) => { if (e.target === che) dong_(); });
  r("dong").onclick = dong_;
  f.focus();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const [chan] = kiem(); if (chan) { veLai(); return; }
    // Chụp đúng số sẽ gửi, khóa ô trong lúc gửi; màn xác nhận dùng đúng số này
    const moi = { direction: "seller_quote", lot_id: f.lo.value, demand_line_id: dong.id, qty_g: String(gamNhap()), price_vnd: String(Number(f.gia.value)) };
    dangGui = true; f.querySelectorAll("input, select, button").forEach((x) => (x.disabled = true));
    r("bao").textContent = "Đang gửi…";
    const moKhoa = () => { dangGui = false; f.querySelectorAll("input, select, button").forEach((x) => (x.disabled = false)); };
    try {
      if (cu) {
        // Mỗi lô chỉ một lời chào mở với cùng người mua → rút cũ rồi gửi mới (chỉ khi người mua chưa trả lời; backend chặn nếu đã trả lời)
        await lenh(`/v1/offers/${cu.id}/withdraw`, {});
        try { await lenh("/v1/offers", moi); }
        catch (err) {
          const loCu = dangBanToanCuc.find((l) => l.code === cu.lot_code);
          let giuLai = false;
          if (loCu) giuLai = await lenh("/v1/offers", { direction: "seller_quote", lot_id: loCu.id, demand_line_id: dong.id, qty_g: cu.vong_cuoi.qty_g, price_vnd: cu.vong_cuoi.price_vnd }).then(() => true).catch(() => false);
          throw new Error(giuLai ? `${err.message} Lời chào cũ đã được gửi lại (hạn trả lời tính lại 24 giờ).`
            : `${err.message} Lời chào cũ đã bị hủy và chưa gửi lại được, bác chào lại giúp.`);
        }
      } else await lenh("/v1/offers", moi);
      if (!conMo()) return;
      f.innerHTML = `<div class="dau-tam"><h2>${cu ? "Đã sửa lời chào" : "Đã gửi chào hàng"}</h2><p>${esc(n.buyer_name)} có 24 giờ để trả lời.</p></div>
        <div class="o-thanh-tien"><span>Bác chào</span><b>${soVN(Math.round(Number(moi.qty_g) * Number(moi.price_vnd) / 1000))} đ</b><small>${esc(can(moi.qty_g).join(" "))} × ${soVN(moi.price_vnd)} đ/kg</small></div>
        <p class="bao-ket">Lời chào hiện ngay dưới nhu cầu này. Người mua chưa trả lời thì bác sửa hoặc hủy được.</p>
        <div class="hang-nut day-tam"><button type="button" class="nut phu-nut" id="tam-xong">Đóng</button><a class="nut chinh-nut" href="./ban-tin-nhan.html${location.search}">Mở Tin nhắn</a></div>`;
      dangGui = false;
      f.querySelector("#tam-xong").onclick = () => location.reload();
    } catch (err) { if (conMo()) { moKhoa(); r("bao").textContent = err.message; } }
  };
}

const TT_DON = { drafting: "Đang soạn hợp đồng", awaiting_signatures: "Chờ ký", awaiting_deposit: "Chờ người mua cọc", active: "Đang thực hiện", completed: "Đã xong", cancelled: "Đã hủy" };
async function moVu() {
  const ds = await get("/v1/seasonal-orders").catch(() => null);
  if (!ds) { $("ds-vu").innerHTML = `<p class="bao loi">Chưa tải được hợp đồng mùa vụ.</p>`; return; }
  const cuaBac = ds.filter((v) => v.phia === "seller");
  $("so-vu").textContent = cuaBac.length || "";
  const kg = (g) => can(g).join(" ");
  $("ds-vu").innerHTML = cuaBac.length ? cuaBac.map((v) => {
    const bt = v.contract_type === "offtake";
    const luong = v.qty_min_g === v.qty_max_g ? kg(v.qty_min_g) : `${kg(v.qty_min_g)} – ${kg(v.qty_max_g)}`;
    return `<a class="vu" href="./ban-tin-nhan.html${location.search}">
      <span class="loai-hd ${bt ? "bt" : ""}">${bt ? "Bao tiêu theo vụ" : "Đặt trước khi hái"}</span>
      <p class="ben">${esc(v.buyer_name)}</p>
      <p class="phu">${esc(v.product_name)} · ${esc(v.code)}</p>
      <dl><dt>Lượng</dt><dd>${esc(luong)}</dd>
        <dt>Giá</dt><dd>${Number(v.unit_price_vnd).toLocaleString("vi-VN")} đ/kg${v.price_mode === "formula" ? " (theo công thức)" : ""}</dd>
        <dt>Cọc người mua</dt><dd>${Number(v.deposit_vnd).toLocaleString("vi-VN")} đ</dd>
        <dt>Mùa hái</dt><dd>${ngayVN(v.harvest_from)} – ${ngayVN(v.harvest_to)}</dd>
        <dt>Vườn</dt><dd>${esc(v.site_name || "—")}</dd>
        ${v.so_dot > 1 ? `<dt>Số đợt giao</dt><dd>${v.so_dot}</dd>` : ""}</dl>
      <p class="tt-vu">${esc(TT_DON[v.order_status] || v.order_status)} ›</p></a>`;
  }).join("") : `<div class="trong">Bác chưa có hợp đồng đặt trước nào. Khi người mua muốn đặt hàng trước mùa, hợp đồng sẽ hiện ở đây.</div>`;
}

async function mo() {
  token = await phien();
  await moHang();
  await moCan();
  await moVu();
  giuThamSo();
  $("noi").setAttribute("aria-busy", "false");
}
mo().catch((e) => {
  $("ds").innerHTML = `<p class="bao loi">${esc(e.message)}</p><button class="nut phu-nut" type="button" style="margin-top:12px" onclick="location.reload()">Thử lại</button>`;
  $("noi").setAttribute("aria-busy", "false");
});
