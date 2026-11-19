import { esc, phien, giuThamSo, veDau, veTab, ghiDaXem, seqDaXem } from "./chung.ts";
const $ = (id) => document.getElementById(id);
veTab("");
veDau($("dau"), { chao: "Thông báo", ten: "Thông báo & hỗ trợ", chuDau: "" });
giuThamSo();

// Thẻ: Thông báo / Hỏi AgiViet (mở thẳng bằng #ho-tro từ nút tai nghe ở header)
const chon = (ht) => {
  $("t-tb").setAttribute("aria-selected", String(!ht)); $("t-ht").setAttribute("aria-selected", String(ht));
  $("p-tb").hidden = ht; $("p-ht").hidden = !ht;
};
$("t-tb").onclick = () => { chon(false); history.replaceState(null, "", "#thong-bao"); };
$("t-ht").onclick = () => { chon(true); history.replaceState(null, "", "#ho-tro"); };
if (location.hash === "#ho-tro") chon(true);

// Thông báo gồm 3 loại (người sáng lập 02/11): việc giao dịch từ hệ thống · thời tiết NGHIÊM TRỌNG · tin đúng ngành của hộ.
const IC = {
  lo: '<path d="M4 9h16l-1.2 11.1a1 1 0 0 1-1 .9H6.2a1 1 0 0 1-1-.9z"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/>',
  chao: '<path d="M12 4v16M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
  hd: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  tien: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>',
  xe: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  dsoat: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  nh: '<path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',
  tk: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  khac: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
};
const NHOM = { lo: "hang", chao: "hang", hd: "hd", tien: "tien", nh: "tien", xe: "hd", dsoat: "hd", tk: "khac", khac: "khac" };
// [biểu tượng, tiêu đề, câu phụ, cần bác làm?, đường dẫn] — mã đơn {d}, mã lô {l}
const SU_KIEN = {
  "lo.da_dang": ["lo", "{l} đã lên chợ", "Người mua tìm thấy lô này", 0, "lo"],
  "lot.on_sale": ["lo", "{l} đang bán trên chợ", "", 0, "lo"],
  "lot.upcoming": ["lo", "{l} lên chợ dạng sắp có hàng", "Người mua đặt trước được", 0, "lo"],
  "lot.price": ["lo", "{l} đã đổi giá", "Giá mới đã hiện cho người mua", 0, "lo"],
  "lot.closed": ["lo", "{l} đã ngừng bán", "", 0, "lo"],
  "lot.sold_out": ["lo", "{l} đã bán hết", "", 0, "lo"],
  "offer.sent": ["chao", "Có lời chào giá mới", "Bấm để xem và trả lời", 1, "chao"],
  "offer.countered": ["chao", "Bên kia trả giá lại", "Bấm để xem và trả lời", 1, "chao"],
  "offer.accepted": ["chao", "Hai bên đã đồng ý giá", "Hàng được giữ 24 giờ chờ lập hợp đồng", 0, "chao"],
  "offer.rejected": ["chao", "Lời chào bị từ chối", "Lô vẫn bán bình thường", 0, "chao"],
  "offer.withdrawn": ["chao", "Một lời chào đã được rút", "", 0, "chao"],
  "offer.expired": ["chao", "Một lời chào đã hết hạn", "", 0, "chao"],
  "offer.auto_rejected": ["chao", "App tự từ chối lời chào thấp hơn giá sàn của bác", "", 0, "chao"],
  "hold.active": ["lo", "Hàng đang được giữ cho người mua", "Giữ 24 giờ để hai bên lập hợp đồng", 0, "lo"],
  "hold.committed": ["lo", "Phần hàng giữ đã vào hợp đồng", "", 0, "hd"],
  "hold.released": ["lo", "Hết giữ hàng, lượng đã trả về lô", "", 0, "lo"],
  "order.drafting": ["hd", "Người mua đang soạn hợp đồng {d}", "Soạn xong bác sẽ được mời ký", 0, "hd"],
  "order.awaiting_seller": ["hd", "Hợp đồng {d} chờ bác ký", "Xem kỹ giá, lượng, ngày giao rồi ký", 1, "hd"],
  "order.awaiting_deposit": ["hd", "Bác đã ký {d}", "Chờ người mua chuyển cọc vào ngân hàng", 0, "hd"],
  "don.hieu_luc": ["hd", "Hợp đồng {d} có hiệu lực", "Ngân hàng đã giữ cọc, chuẩn bị giao hàng", 0, "hd"],
  "order.active": ["hd", "Hợp đồng {d} có hiệu lực", "Ngân hàng đã giữ cọc, chuẩn bị giao hàng", 0, "hd"],
  "order.completed": ["hd", "Hợp đồng {d} đã hoàn tất", "", 0, "hd"],
  "order.cancelled": ["hd", "Hợp đồng {d} đã hủy", "Bấm xem tiền cọc đi đâu", 0, "hd"],
  "deposit.awaiting_transfer": ["tien", "Chờ người mua chuyển cọc {d}", "Chưa giao hàng khi chưa có cọc", 0, "hd"],
  "deposit.held": ["tien", "Ngân hàng đã giữ cọc {d}", "Tiền cọc an toàn tới khi xong đơn", 0, "hd"],
  "deposit.processing": ["tien", "Ngân hàng đang xử lý cọc {d}", "Tiền sẽ chuyển theo kết quả cân", 0, "hd"],
  "deposit.released": ["tien", "Ngân hàng đã chuyển cọc {d}", "Kiểm tài khoản của bác", 0, "tien"],
  "direct_payment.due": ["tien", "Tới hạn người mua trả tiền {d}", "Người mua chuyển thẳng vào tài khoản bác", 0, "hd"],
  "direct_payment.payer_reported": ["tien", "Người mua báo đã chuyển tiền {d}", "Bác kiểm tài khoản rồi xác nhận đúng số", 1, "hd"],
  "direct_payment.fully_received": ["tien", "Bác đã nhận đủ tiền {d}", "", 0, "tien"],
  "direct_payment.partially_received": ["tien", "Bác mới nhận một phần tiền {d}", "Phần còn thiếu vẫn chờ người mua", 0, "hd"],
  "khoan.nb_xac_nhan": ["tien", "Bác đã xác nhận số tiền {d}", "", 0, "tien"],
  "bank_instruction.sent": ["nh", "Ngân hàng đã gửi lệnh chuyển tiền", "Tiền về tài khoản trong ngày làm việc", 0, "tien"],
  "lenh.da_gui": ["nh", "Ngân hàng đã gửi lệnh chuyển tiền", "Tiền về tài khoản trong ngày làm việc", 0, "tien"],
  "bank_instruction.settled": ["nh", "Tiền đã về tài khoản bác", "", 0, "tien"],
  "delivery.preparing": ["xe", "Đợt giao {d} đang chuẩn bị", "", 0, "hd"],
  "delivery.ready": ["xe", "Đợt giao {d} sẵn sàng", "Chờ xe tới lấy hàng", 0, "hd"],
  "delivery.in_transit": ["xe", "Hàng {d} đang trên đường", "", 0, "hd"],
  "delivery.arrived": ["xe", "Xe đã tới nơi nhận {d}", "", 0, "hd"],
  "delivery.arrival_check": ["xe", "Người mua đang kiểm hàng {d}", "", 0, "hd"],
  "delivery.checking": ["xe", "Người mua đang cân, kiểm hàng {d}", "", 0, "hd"],
  "delivery.awaiting_seller": ["xe", "Có kết quả cân {d}", "Bác xem rồi đồng ý hoặc phản đối từng dòng", 1, "hd"],
  "delivery.disputed": ["dsoat", "Có dòng đang đối soát {d}", "Phần còn lại vẫn chốt bình thường", 0, "hd"],
  "delivery.accepted": ["xe", "Đã chốt kết quả cân {d}", "", 0, "hd"],
  "dispute.open": ["dsoat", "Mở đối soát {d}", "", 0, "hd"],
  "dispute.awaiting_seller": ["dsoat", "Đối soát {d} chờ bác trả lời", "", 1, "hd"],
  "dispute.awaiting_inspection": ["dsoat", "Đối soát {d} chờ kiểm định", "Bên sai chịu phí kiểm định", 0, "hd"],
  "dispute.resolved": ["dsoat", "Đối soát {d} đã có kết quả", "", 0, "hd"],
  "organization.active": ["tk", "Tài khoản đã được xác minh", "Bác đăng bán và ký hợp đồng được", 0, ""],
};
const BO_QUA = new Set(["lot.draft", "bank_instruction.created", "deposit.created"]);
function dien(n, maLo, maDon) {
  const m = SU_KIEN[n.event_type];
  const d = maDon.get(n.order_id || (n.aggregate_type === "order" ? n.aggregate_id : "")) || "";
  const l = maLo.get(n.aggregate_id) || "Lô";
  const thay = (x) => x.replace("{d}", d).replace("{l}", l).replace(/\s+/g, " ").trim();
  const oid = n.order_id || (n.aggregate_type === "order" ? n.aggregate_id : "");
  const den = { lo: "./ban-hang-hoa.html", chao: "./ban-tin-nhan.html", hd: oid ? `./ban-don.html?id=${encodeURIComponent(oid)}` : "./ban-hop-dong.html", tien: "./ban-tien.html", "": "./ban-toi.html" };
  if (m) return { ic: m[0], tieu: thay(m[1]), phu: m[2], can: !!m[3], den: den[m[4]] ?? "#" };
  // Loại chưa đặt tên: nói theo nhóm, không lộ mã thô
  const ic = { lot: "lo", offer: "chao", order: "hd", deposit: "tien", direct_payment: "tien", bank_instruction: "nh", delivery: "xe", dispute: "dsoat", organization: "tk" }[n.aggregate_type] || "khac";
  const ten = { lo: `${l} có thay đổi`, chao: "Lời chào giá có thay đổi", hd: `Hợp đồng ${d} có thay đổi`, tien: `Tiền ${d} có thay đổi`, nh: "Ngân hàng có cập nhật", xe: `Giao nhận ${d} có thay đổi`, dsoat: `Đối soát ${d} có thay đổi`, tk: "Tài khoản có thay đổi", khac: "AgiViet có cập nhật" }[ic];
  return { ic, tieu: ten.replace(/\s+/g, " ").trim(), phu: "Bấm để xem", can: false, den: den[{ lo: "lo", chao: "chao", tien: "tien", nh: "tien", tk: "" }[ic] ?? "hd"] };
}
const nhomNgay = (d) => {
  const h = new Date(), x = new Date(d);
  const cach = Math.floor((+new Date(h.toDateString()) - +new Date(x.toDateString())) / 864e5);
  return cach === 0 ? "Hôm nay" : cach === 1 ? "Hôm qua" : x.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" });
};
const SVG = (p, w = 22) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

// Thời tiết: chỉ báo khi NGHIÊM TRỌNG (mưa ≥ 50 mm/ngày, gió ≥ 40 km/h, nắng ≥ 36°C) trong 3 ngày tới
function canhBaoTroi(w) {
  const ds = (w?.ngay || []).slice(0, 3).map((x) => {
    const ly = [];
    if (x.mua_mm >= 50) ly.push(`mưa lớn ${Math.round(x.mua_mm)} mm`);
    if (x.gio_manh_nhat_kmh >= 40) ly.push(`gió mạnh ${Math.round(x.gio_manh_nhat_kmh)} km/h`);
    if (x.nhiet_do_cao_c >= 36) ly.push(`nắng nóng ${Math.round(x.nhiet_do_cao_c)}°C`);
    return ly.length ? { ngay: x.ngay, ly, khuyen: (x.loi_khuyen || [])[0] } : null;
  }).filter(Boolean);
  return ds;
}

let token;
async function moThongBao() {
  token = await phien();
  const h = { headers: { authorization: "Bearer " + token } };
  const lay = (u: string): Promise<any> => fetch(u, h).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  const [me, ds, lo, don, troi] = await Promise.all([
    fetch("/v1/me", h).then((x) => x.json()), fetch("/v1/notifications?limit=100", h).then((x) => (x.ok ? x.json() : Promise.reject(new Error("tb")))),
    lay("/v1/lots?mine=true").then((x) => x || []), lay("/v1/orders").then((x) => x || []), lay("/v1/weather"),
  ]);
  veDau($("dau"), { chao: "Thông báo", ten: me.org.name, chuDau: me.name.split(" ").at(-1).charAt(0).toUpperCase() });
  const maLo = new Map(lo.map((l) => [l.id, l.code])), maDon = new Map(don.map((d) => [d.id, d.code]));
  const daXem = seqDaXem();

  // 1. Thời tiết nghiêm trọng
  const cb = canhBaoTroi(troi);
  const ngayVN = (s) => new Date(s + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" });
  $("tb-troi").innerHTML = cb.length
    ? cb.map((c) => `<a class="tb-troi" href="./ban-thoi-tiet.html">${SVG('<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>', 30)}<div><b>${esc(ngayVN(c.ngay))}: ${esc(c.ly.join(", "))}</b><span>${esc(c.khuyen || "Che chắn hàng, hoãn hái nếu cần.")}</span></div></a>`).join("")
    : troi ? `<a class="tb-troi-on" href="./ban-thoi-tiet.html">${SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 24)}<span>3 ngày tới ở ${esc(troi.tinh?.ten || "tỉnh bác")} không có mưa lớn, gió mạnh hay nắng nóng.</span></a>` : "";

  // 2. Giao dịch
  const UU_TIEN = { "lo.da_dang": 5, "lot.on_sale": 4, "lot.price": 3 };
  const gon = [];
  for (const n of ds) {
    if (BO_QUA.has(n.event_type)) continue;
    const cu = gon.find((g) => g.aggregate_id === n.aggregate_id && Math.abs(+new Date(g.occurred_at) - +new Date(n.occurred_at)) < 6e5);
    if (!cu) { gon.push({ ...n }); continue; }
    if ((UU_TIEN[n.event_type] || 2) > (UU_TIEN[cu.event_type] || 2)) Object.assign(cu, n, { seq: Math.max(Number(cu.seq), Number(n.seq)) });
  }
  const dong = gon.map((n) => ({ n, ...dien(n, maLo, maDon) }));
  const LOC = [["tat", "Tất cả"], ["can", "Cần bác làm"], ["hang", "Hàng, lời chào"], ["hd", "Hợp đồng"], ["tien", "Tiền"]];
  const dem = { tat: dong.length, can: dong.filter((x) => x.can).length, hang: dong.filter((x) => NHOM[x.ic] === "hang").length, hd: dong.filter((x) => NHOM[x.ic] === "hd").length, tien: dong.filter((x) => NHOM[x.ic] === "tien").length };
  let chonLoc = "tat";
  const ve = () => {
    $("tb-loc").innerHTML = LOC.filter(([k]) => k === "tat" || dem[k]).map(([k, t]) => `<button type="button" data-k="${k}" aria-pressed="${k === chonLoc}">${t}${k !== "tat" ? `<b>${dem[k]}</b>` : ""}</button>`).join("");
    const r = dong.filter((x) => chonLoc === "tat" || (chonLoc === "can" ? x.can : NHOM[x.ic] === chonLoc));
    if (!r.length) { $("ds-tb").innerHTML = `${window.anhTrong?.("chua-co-thong-bao") || ""}<p class="bao" style="margin-top:16px">${dong.length ? "Không có thông báo trong mục này." : "Chưa có thông báo giao dịch nào."}</p>`; return; }
    let truoc = ""; const out = [];
    for (const x of r) {
      const g = nhomNgay(x.n.occurred_at); if (g !== truoc) { out.push(`<h3 class="ngay">${esc(g)}</h3>`); truoc = g; }
      const gio = new Date(x.n.occurred_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      out.push(`<a class="tb ${Number(x.n.seq) > daXem ? "moi" : ""}" href="${x.den}"><span class="bt ${x.ic}">${SVG(IC[x.ic])}</span>
        <span><p class="tieu">${esc(x.tieu)}</p><p class="phu">${esc([x.phu, gio].filter(Boolean).join(" · "))}</p>${x.can ? `<span class="tb-can">Cần bác làm</span>` : ""}</span></a>`);
    }
    $("ds-tb").innerHTML = out.join("");
    giuThamSo($("ds-tb"));
  };
  $("tb-loc").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; chonLoc = b.dataset.k; ve(); });
  ve();
  ghiDaXem(Math.max(0, ...ds.map((n) => Number(n.seq) || 0)));

  // 3. Tin đúng ngành: theo mặt hàng các lô của hộ; không có thì tin nông nghiệp chung (ghi rõ)
  const maSp = [...new Set(lo.map((l) => l.product_code).filter(Boolean))].slice(0, 3);
  let tin = []; const tenSp = [];
  for (const m of maSp) { const t = await lay(`/v1/news?product=${encodeURIComponent(String(m))}`); if (t?.mat_hang) tenSp.push(t.mat_hang); tin.push(...(t?.tin || [])); }
  const dungNganh = tin.length > 0;
  if (!dungNganh) tin = (await lay("/v1/news"))?.tin || [];
  const thay = new Set(); tin = tin.filter((x) => !thay.has(x.link) && thay.add(x.link)).slice(0, 4);
  $("tb-tin-khoi").innerHTML = tin.length ? `<h3 class="ngay" style="margin-top:24px">${dungNganh ? `Tin về ${esc(tenSp.join(", ").toLowerCase())}` : "Tin nông nghiệp"}</h3>
    <div class="tb-tin">${tin.map((x) => `<a href="${esc(x.link)}" target="_blank" rel="noopener"><b>${esc(x.tieu_de)}</b><small>${esc(x.nguon)}${x.ngay ? " · " + esc(new Date(x.ngay).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })) : ""}</small>${SVG('<path d="M7 17L17 7M9 7h8v8"/>', 18)}</a>`).join("")}</div>
    ${dungNganh ? "" : `<p class="tb-ghi">Chưa có tin mới về ${esc(tenSp.join(", ").toLowerCase() || "mặt hàng của bác")}; đang hiện tin nông nghiệp chung.</p>`}
    <a class="tb-xem" href="./ban-tin-tuc.html">Xem thêm tin</a>` : "";
  giuThamSo($("tb-tin-khoi"));
}
moThongBao().catch(() => { $("ds-tb").innerHTML = `<p class="bao loi" style="margin-top:16px">Chưa tải được thông báo.</p><button class="nut phu-nut" type="button" style="margin-top:12px" onclick="location.reload()">Thử lại</button>`; });

// Hỏi AgiViet: gửi yêu cầu hỗ trợ thật (POST /v1/support), có khóa chống gửi trùng
$("goi-nhanh").querySelectorAll("button").forEach((b) => (b.onclick = () => { $("noi-dung").value = b.textContent + ". "; $("noi-dung").focus(); $("gui").disabled = false; }));
$("noi-dung").addEventListener("input", () => ($("gui").disabled = $("noi-dung").value.trim().length < 5));
let khoa = null;
$("gui").onclick = async () => {
  const nd = $("noi-dung").value.trim();
  khoa ||= crypto.randomUUID();
  $("gui").disabled = true; $("gui").textContent = "Đang gửi…"; $("loi").hidden = true;
  try {
    token ||= await phien();
    const r = await fetch("/v1/support", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: khoa, message: nd }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.errors?.[0]?.message || "Chưa gửi được, bác thử lại.");
    $("da-gui").innerHTML = `<b>Đã gửi cho AgiViet.</b><br>AgiViet sẽ nhắn lại cho bác trong app. Mã yêu cầu: ${esc((j.data?.code || j.id || "").toString().slice(0, 12))}`;
    $("da-gui").hidden = false; $("noi-dung").value = ""; khoa = null;
  } catch (e) { $("loi").textContent = e.message; $("loi").hidden = false; }
  $("gui").textContent = "Gửi cho AgiViet"; $("gui").disabled = $("noi-dung").value.trim().length < 5;
};
