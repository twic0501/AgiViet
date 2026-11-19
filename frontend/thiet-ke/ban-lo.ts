import { can, esc, phien, ANH_SP, giuThamSo, veTab, tenLoai } from "./chung.ts";
const $ = (id) => document.getElementById(id);
veTab("cho");
const ngay = (s) => (s ? new Date(s).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", year: "numeric" }) : "—");
const dong = (v) => `${Number(v || 0).toLocaleString("vi-VN")} đ/kg`;
const soGia = (v) => (v ? `${Number(v).toLocaleString("vi-VN")}<small>đ/kg</small>` : "—");
const TT = { on_sale: "Đang bán", draft: "Nháp", reserved: "Đang giữ cho đơn", sold_out: "Đã bán hết", closed: "Đã ngừng bán", paused: "Tạm ngưng" };
const IC_GIAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13l2 2 4-4"/></svg>';
const THI_TRUONG = { TQ: "Trung Quốc", HQ: "Hàn Quốc", NB: "Nhật Bản", EU: "châu Âu", US: "Mỹ" };

async function mo() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) throw new Error("Thiếu mã lô");
  const token = await phien();
  const get = (d) => fetch(d, { headers: { authorization: "Bearer " + token } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))));
  const [l, nguon, chao] = await Promise.all([get(`/v1/lots/${id}`), get(`/v1/lots/${id}/source-profile`).catch(() => "loi"), get("/v1/offers").catch(() => null)]);
  const g = await get(`/v1/reference-prices?product=${encodeURIComponent(l.product_code)}&grade=${encodeURIComponent(l.grade_code)}`).catch(() => null);
  $("t-lo").textContent = `Lô ${l.code}`;
  const anh = ANH_SP(l.product_code);
  const q = l.qty || {};
  const phan = [["Còn bán", q.available, "var(--la)"], ["Đang giữ", q.held, "#e2b24a"], ["Trong hợp đồng", BigInt(q.committed || 0) + BigInt(q.in_transit || 0), "#4f7fb8"], ["Đã giao", q.delivered, "#9aa59f"]].map(([t, v, c]) => [t, Number(v || 0), c]);
  const tong = phan.reduce((s, [, v]) => s + v, 0) || 1;
  const chaoLoi = chao === null;
  const chaoLo = (Array.isArray(chao) ? chao : []).filter((c) => c.lot_code === l.code && /sent|countered/.test(c.status));
  const nguonLoi = nguon === "loi";
  const giay = nguonLoi ? [] : nguon?.giay_to || [];
  $("noi-dung").innerHTML = `
    <div class="anh-lon" style="${anh ? `background-image:url(${anh})` : ""}"><span class="minh-hoa">${l.photos?.length ? `Ảnh minh họa · lô có ${l.photos.length} ảnh chụp trong app` : "Ảnh minh họa · lô chưa có ảnh chụp"}</span></div>
    <section class="tieu-de" style="margin-top:14px"><h2>${esc(l.product_name)}</h2><p>${esc(tenLoai(l.grade_code))} · ${l.qty_basis === "estimated" ? "lượng ước tính (cam kết tối đa 80%)" : "đã cân"}</p>
      <span class="tt">${esc(TT[l.status] || l.status)}${l.urgent_sale_until && new Date(l.urgent_sale_until) > new Date() ? " · đang bán nhanh" : ""}</span></section>
    <div class="o-gia"><div><b>${soGia(l.ask_price_vnd)}</b><span>giá mong muốn</span></div>
      <div class="kin"><b>${soGia(l.floor_price_vnd)}</b><span>giá thấp nhất · kín</span></div>
      <div><b>${soGia(g?.price_vnd)}</b><span>giá tham khảo</span></div></div>

    <section class="muc" style="margin-top:20px"><h3><span>Lượng hàng</span><span style="font-weight:400">${esc(can(l.declared_qty_g).join(" "))} đã khai</span></h3>
      <div class="luong">${phan.filter(([, v]) => v).map(([t, v, c]) => `<i title="${t}" style="width:${(v / tong * 100).toFixed(1)}%;background:${c}"></i>`).join("")}</div>
      <dl class="bang">${phan.map(([t, v]) => `<dt>${t}</dt><dd>${esc(can(v).join(" "))}</dd>`).join("")}</dl></section>

    <section class="muc" style="margin-top:20px"><h3><span>Thời gian và nơi trồng</span></h3>
      <dl class="bang"><dt>Có hàng từ</dt><dd>${ngay(l.available_from)}</dd>
        <dt>Hết cách ly thuốc</dt><dd>${ngay(l.spray_clear_on)}</dd>
        <dt>Báo còn hàng lần cuối</dt><dd>${ngay(l.last_confirmed_at)}</dd>
        <dt>Vườn</dt><dd>${esc(nguon?.vi_tri?.ten || "—")}</dd></dl>
      ${nguon?.vi_tri?.ghi_chu ? `<p class="ghi">${esc(nguon.vi_tri.ghi_chu)}</p>` : ""}</section>

    <section class="muc" style="margin-top:20px"><h3><span>Giấy tờ của lô</span><span style="font-weight:400">${nguonLoi ? "—" : giay.length}</span></h3>
      ${nguonLoi ? '<p class="bao loi" style="margin-top:8px">Chưa tải được giấy tờ của lô. Bác tải lại trang để xem.</p>' : giay.length ? giay.map((x) => `<div class="giay"><span class="bt">${IC_GIAY}</span>
        <span><p class="ten">${esc(x.label_vi)}</p><p class="phu">${x.market ? `Thị trường ${esc(THI_TRUONG[x.market] || x.market)} · ` : ""}Hiệu lực ${ngay(x.tu)} – ${ngay(x.den)}</p></span>
        <span class="tt ${x.trang_thai === "da_xac_minh" ? "" : x.trang_thai === "het_hieu_luc" ? "het" : "chua"}">${x.trang_thai === "da_xac_minh" ? "Đã xác minh" : x.trang_thai === "het_hieu_luc" ? "Hết hiệu lực" : "Bác tự khai"}</span></div>`).join("")
        : '<p class="ghi">Lô chưa có giấy tờ. Người mua xuất khẩu, nhà máy thường cần VietGAP hoặc mã số vùng trồng.</p>'}</section>

    <section class="muc" style="margin-top:20px"><h3><span>Lời chào trên lô</span><span style="font-weight:400">${chaoLoi ? "—" : chaoLo.length}</span></h3>
      ${chaoLoi ? '<p class="bao loi" style="margin-top:8px">Chưa tải được lời chào.</p>' : chaoLo.length ? chaoLo.map((c) => { const v = c.vong_cuoi || {}; return `<a class="chao" href="./ban-tin-nhan.html">
        <span><b>${c.direction === "seller_quote" ? `Bác chào ${esc(c.buyer_name || "người mua")}` : `${esc(c.buyer_name || "Người mua")} chào`}</b><p class="phu">${esc(can(v.qty_g).join(" "))} · ${v.from_side === "buyer" ? "chờ bác trả lời" : "chờ người mua"}</p></span>
        <span class="gia">${dong(v.price_vnd)}</span></a>`; }).join("") : '<p class="ghi">Chưa có lời chào nào.</p>'}</section>
    <p class="ghi">Sửa giá, bật bán nhanh hoặc ngừng bán: bấm "Quản lý lô" ở màn Chợ.</p>`;
  giuThamSo();
}
mo().catch((e) => { $("noi-dung").innerHTML = `<p class="bao loi">Chưa mở được lô (${esc(e.message)}).</p>`; }).finally(() => $("noi").setAttribute("aria-busy", "false"));
