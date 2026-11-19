import { esc, phien, giuThamSo, CO_CHU, datCoChu } from "./chung.ts";
const $ = (id) => document.getElementById(id);
const VN = { timeZone: "Asia/Ho_Chi_Minh" };
const gio = (s) => (s ? new Date(s).toLocaleString("vi-VN", { ...VN, hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }) : "");
const VAI = { owner: "Chủ hộ", coop_board: "Ban quản trị HTX", member: "Thành viên", accountant: "Kế toán", field: "Người làm vườn" };
const QUYEN = { view: "Xem đơn và hàng", "lot.draft": "Soạn tin đăng nháp", "message.send": "Nhắn tin", "diary.write": "Ghi nhật ký vườn", "lot.create": "Đăng hàng", "offer.reply": "Trả lời lời chào", "delivery.record": "Ghi giao nhận" };
const TT_HT = { new: ["Đã nhận, chờ xử lý", "vang"], in_progress: ["Đang xử lý", "vang"], resolved: ["Đã xong", "xanh"], closed: ["Đã đóng", "xam"] };
let token, me, hoSo;
const TT_GT = { da_xac_minh: ["Đã xác minh", "xanh"], cho_doi_chieu: ["Chờ AgiViet đối chiếu", "vang"], het_han: ["Hết hạn, cần nộp lại", "do"] };
const H = () => ({ headers: { authorization: "Bearer " + token } });
const doc = async (d) => { const r = await fetch(d, H()); return r.ok ? r.json() : { __loi: r.status }; };

$("dau").innerHTML = `<button class="nut-tron" type="button" id="dong" aria-label="Quay lại"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
  <div style="flex:1;min-width:0"><p class="chao">Tài khoản</p><h1>Tôi</h1></div>`;
$("dong").onclick = () => (history.length > 1 ? history.back() : (location.href = "./ban-hom-nay.html" + location.search));

async function tai() {
  token = await phien();
  const [m, tk, giup, ht, ls, hs] = await Promise.all([doc("/v1/me"), doc("/v1/payout-accounts"), doc("/v1/org/delegations"), doc("/v1/support"), doc("/v1/seller/history?limit=50"), doc("/v1/seller/profile")]);
  if (m.__loi) throw new Error("Chưa tải được thông tin tài khoản.");
  me = m; hoSo = hs.__loi ? null : hs;
  const chuTat = String(me.name || "?").split(/\s+/).at(-1).charAt(0).toUpperCase();
  const lsOk = Array.isArray(ls) ? ls : [];
  const soChao = lsOk.filter((x) => x.loai === "offer").length, soDong = lsOk.filter((x) => x.trang_thai === "accepted").length, soHd = new Set(lsOk.map((x) => x.order_id).filter(Boolean)).size;
  const coChu = (() => { try { return localStorage.getItem("agv-co-chu") || "1"; } catch { return "1"; } })();
  const tocDo = (() => { try { return localStorage.getItem("agv-toc-do-doc") || "0.95"; } catch { return "0.95"; } })();
  $("noi").innerHTML = `
    <section class="to-ho-so"><span class="anh" aria-hidden="true">${esc(chuTat)}</span>
      <div style="min-width:0"><b>${esc(me.name)}</b><small>${esc(me.org?.name)} · ${esc((me.roles || []).map((v) => VAI[v] || v).join(", "))}</small><small>${esc(me.phone_masked)}</small></div></section>

    <section class="to-the" id="ho-so"><h2><i class="cham"></i>Hồ sơ và giấy tờ</h2>
      ${hoSo ? `<div class="to-dong"><span><b style="text-align:left">${esc(hoSo.to_chuc.ten)}</b></span><span class="to-nhan ${hoSo.muc_xac_minh >= 2 ? "xanh" : "vang"}">Mức ${hoSo.muc_xac_minh}/2</span>
        <small>${esc(hoSo.muc_ten)}${hoSo.to_chuc.tinh ? " · " + esc(hoSo.to_chuc.tinh) : ""}${hoSo.vuon.length ? " · " + esc(hoSo.vuon.map((v) => v.name).join(", ")) : ""}</small></div>
      ${hoSo.giay_to.length ? hoSo.giay_to.map((g) => `<div class="to-dong"><span style="overflow-wrap:anywhere"><b style="text-align:left">${esc(g.ten)}</b></span><span class="to-nhan ${(TT_GT[g.trang_thai] || ["", "xam"])[1]}">${esc((TT_GT[g.trang_thai] || [g.trang_thai])[0])}</span>
        <small>${g.so ? "Số " + esc(g.so) : "Chưa ghi số"}${g.thi_truong ? " · thị trường " + esc(g.thi_truong) : ""}${g.het_han ? " · hạn tới " + esc(new Date(g.het_han).toLocaleDateString("vi-VN")) : ""}</small></div>`).join("")
        : `<p class="hd-ghi" style="padding-bottom:8px">Bác chưa có giấy tờ nào trên app. Có VietGAP, mã vùng trồng thì nộp để người mua tin hàng và trả giá tốt hơn.</p>`}
      <div class="to-hai-nut"><button class="nut chinh-nut to-nut" type="button" id="nop-gt">Nộp / cập nhật giấy tờ</button><button class="nut phu-nut to-nut" type="button" id="sua-hs">Đề nghị sửa thông tin</button></div>`
      : `<p class="to-bao do" style="margin:4px 0 12px">Chưa tải được hồ sơ.</p>`}</section>

    <section class="to-the"><h2><i class="cham"></i>Hoạt động gần đây</h2>
      ${Array.isArray(ls) ? `<div class="to-so"><div><b>${soChao}</b><span>lời chào nhận</span></div><div><b>${soDong}</b><span>đã đồng ý</span></div><div><b>${soHd}</b><span>hợp đồng</span></div></div>
      <p class="hd-ghi" style="font-size:13px;color:var(--muc-nhat);margin:0 0 12px">Tính theo 50 việc gần nhất. Điểm uy tín sẽ có khi bác đã giao xong vài đơn.</p>` : `<p class="to-bao do" style="margin:4px 0 12px">Chưa tải được hoạt động.</p>`}</section>

    <section class="to-the" id="tk"><h2><i class="cham"></i>Tài khoản nhận tiền</h2>
      ${Array.isArray(tk) ? (tk.map((a) => `<div class="to-dong"><span><b style="text-align:left">${esc(a.bank_code)} ${esc(a.account_masked)}</b></span><span class="to-nhan ${a.status === "active" ? "xanh" : "vang"}">${a.status === "active" ? "Đang dùng" : "Chờ hiệu lực"}</span>
        <small>Chủ tài khoản: ${esc(a.holder_name)}${a.name_match ? " · trùng tên với bác" : " · <b>khác tên bác</b>"}${a.status !== "active" && a.cooldown_until ? ` · dùng được từ ${esc(gio(a.cooldown_until))}` : ""}</small></div>`).join("") || `<p class="hd-ghi">Chưa có tài khoản nhận tiền.</p>`) : `<p class="to-bao do">Chưa tải được tài khoản.</p>`}
      <button class="nut phu-nut to-nut" type="button" id="doi-tk">Đổi tài khoản nhận tiền</button></section>

    <section class="to-the"><h2><i class="cham"></i>Người giúp</h2>
      <p class="hd-ghi" style="font-size:14px;color:var(--muc-phu);margin:4px 0 8px">Con cháu được làm thay một số việc. Ký hợp đồng và xác nhận tiền chỉ bác làm.</p>
      ${Array.isArray(giup) && giup.length ? giup.map((g) => { const conHan = !g.revoked_at && (!g.valid_to || new Date(g.valid_to) > new Date());
        return `<div class="to-dong"><span><b style="text-align:left">${esc(g.helper_name)}</b></span>${conHan ? `<button class="nut-chu" type="button" data-thu-hoi="${esc(g.id)}">Thu hồi</button>` : `<span class="to-nhan xam">${g.revoked_at ? "Đã thu hồi" : "Hết hạn"}</span>`}
        <small>${esc((g.actions || []).map((a) => QUYEN[a] || a).join(", "))}${g.valid_to ? ` · tới ${esc(gio(g.valid_to))}` : ""}</small></div>`; }).join("") : `<p class="hd-ghi" style="padding-bottom:12px">Chưa có người giúp. Muốn thêm, bác bấm Hỗ trợ để mời người nhà vào.</p>`}</section>

    <section class="to-the"><h2><i class="cham"></i>Cài đặt</h2>
      <div style="padding-top:6px"><span style="font-size:14px;font-weight:600;color:var(--muc-phu)">Cỡ chữ</span>
        <div class="to-doan" role="group" aria-label="Cỡ chữ">${CO_CHU.map(([v, t]) => `<button type="button" data-co="${v}" aria-pressed="${v === coChu}">${t}</button>`).join("")}</div></div>
      <div><span style="font-size:14px;font-weight:600;color:var(--muc-phu)">Tốc độ đọc khi bấm Nghe</span>
        <div class="to-doan" role="group" aria-label="Tốc độ đọc">${[["0.8", "Chậm"], ["0.95", "Vừa"], ["1.1", "Nhanh"]].map(([v, t]) => `<button type="button" data-doc="${v}" aria-pressed="${v === tocDo}">${t}</button>`).join("")}</div></div></section>

    <section class="to-the"><h2><i class="cham"></i>Hỗ trợ</h2>
      ${Array.isArray(ht) && ht.length ? ht.slice(0, 5).map((x) => `<div class="to-dong"><span style="overflow-wrap:anywhere">${esc(String(x.trigger_reason || "").replace(/^Hỗ trợ:\s*/, "").slice(0, 90))}</span><span class="to-nhan ${(TT_HT[x.status] || ["", "xam"])[1]}">${esc((TT_HT[x.status] || [x.status])[0])}</span>
        <small>Gửi ${esc(gio(x.created_at))}${x.response_due_at ? ` · AgiViet trả lời trước ${esc(gio(x.response_due_at))}` : ""}${x.nguoi_phu_trach ? ` · ${esc(x.nguoi_phu_trach)} phụ trách` : ""}</small></div>`).join("") : `<p class="hd-ghi">Chưa gửi yêu cầu nào.</p>`}
      <button class="nut chinh-nut to-nut" type="button" id="gui-ht">Gửi yêu cầu hỗ trợ</button>
      <a class="nut phu-nut to-nut" href="./ban-hom-nay.html${esc(location.search ? location.search + "&" : "?")}huong-dan=1" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:8px">Xem lại hướng dẫn dùng app</a></section>

    <details class="to-the"><summary style="list-style:none;cursor:pointer;padding:14px 0;font-weight:700;min-height:44px">Quyền riêng tư: người mua thấy gì?</summary>
      <ul class="to-ds"><li><b>Trước khi đặt cọc:</b> tên hộ, xã/huyện, mặt hàng, ảnh hàng, lượng, giá mong muốn, nhật ký phần bác chọn cho xem.</li>
        <li><b>Không bao giờ thấy:</b> giá thấp nhất của bác, số tài khoản đầy đủ, số căn cước.</li>
        <li><b>Sau khi ngân hàng giữ cọc:</b> số điện thoại người liên hệ và địa chỉ giao hàng để hai bên hẹn giao.</li>
        <li>Số điện thoại, Zalo trong tin nhắn bị che trước khi có cọc, để hai bên không bỏ qua bảo đảm của ngân hàng.</li></ul></details>

    <button class="to-ra" type="button" id="thu-xong" hidden>Thử xong, làm lại từ đầu</button>
    <p class="phu-de" id="thu-xong-bao" role="status"></p>
    <button class="to-ra" type="button" id="dang-xuat">Đăng xuất</button>`;
  document.querySelectorAll("[data-co]").forEach((b) => (b.onclick = () => { datCoChu(b.dataset.co); document.querySelectorAll("[data-co]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
  document.querySelectorAll("[data-doc]").forEach((b) => (b.onclick = () => {
    try { localStorage.setItem("agv-toc-do-doc", b.dataset.doc); } catch {}
    document.querySelectorAll("[data-doc]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    try { window.giongViet?.docTo("Dạ, bác nghe tốc độ đọc như thế này có vừa không ạ?", Number(b.dataset.doc)); } catch {}
  }));
  document.querySelectorAll("[data-thu-hoi]").forEach((b) => (b.onclick = () => xacNhanThuHoi(b.dataset.thuHoi, b)));
  $("gui-ht").onclick = () => moHoTro("");
  if ($("nop-gt")) $("nop-gt").onclick = moNopGiayTo;
  if ($("sua-hs")) $("sua-hs").onclick = moSuaHoSo;
  $("doi-tk").onclick = () => moHoTro("Tôi muốn đổi tài khoản nhận tiền sang: ngân hàng …, số tài khoản …, chủ tài khoản …");
  $("dang-xuat").onclick = dangXuat;
  // Chỉ bản thử: người thử xong trả hộ lại cho người sau; không còn ai thử thì dữ liệu về ban đầu
  fetch("/frontend-capabilities.json").then((r) => r.json()).then((c) => { if (c?.test_tools) $("thu-xong").hidden = false; }).catch(() => {});
  let chac = false;
  $("thu-xong").onclick = async () => {
    const b = $("thu-xong"), bao = $("thu-xong-bao");
    if (!chac) { chac = true; b.textContent = "Bấm lần nữa để xóa dữ liệu thử của hộ này"; bao.textContent = "Đơn, lời chào, tin nhắn bác đã thử sẽ về như ban đầu."; return; }
    b.disabled = true; bao.textContent = "Đang làm lại…";
    const r = await fetch("/v1/test/thu-xong", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: "{}" }).then((x) => x.json()).catch(() => null);
    const kq = r?.data ?? r;
    if (!kq) { b.disabled = false; bao.textContent = "Chưa làm lại được, bác thử lại nhé."; return; }
    try { sessionStorage.removeItem("agv-phien"); sessionStorage.removeItem("agv-phien-thu"); } catch {}
    bao.textContent = kq.lam_moi ? "Đã làm lại từ đầu. Đang về màn chọn hộ…" : `Đã trả hộ cho người sau. Còn ${kq.con_nguoi_thu} người khác đang thử nên dữ liệu chưa xóa, sẽ làm mới khi họ thử xong.`;
    setTimeout(() => (location.href = "./dang-nhap.html"), kq.lam_moi ? 1200 : 3500);
  };
}

let traVe = null;
const thoat = (e) => { if (e.key === "Escape") dongTam(); };
function dongTam() { $("che")?.remove(); document.removeEventListener("keydown", thoat); traVe?.focus?.(); }
function moHoTro(goiY) {
  traVe = document.activeElement; const khoa = crypto.randomUUID();
  document.body.insertAdjacentHTML("beforeend", `<div class="to-che man-che" id="che"><div class="to-tam" role="dialog" aria-modal="true" aria-labelledby="t-ht">
    <div class="than"><h2 id="t-ht">Gửi yêu cầu hỗ trợ</h2>
      <p class="hd-ghi" style="font-size:14px;color:var(--muc-phu);margin:0">AgiViet đọc và trả lời trong giờ làm việc. Việc gấp về tiền hoặc giao hàng được xử lý trước.</p>
      <label for="ht-noi" style="font-weight:600;color:var(--muc-phu);font-size:14px">Bác cần giúp gì?</label>
      <textarea class="to-o" id="ht-noi" maxlength="1000">${esc(goiY)}</textarea>
      ${goiY ? `<p class="hd-ghi" style="font-size:13px;color:var(--muc-nhat);margin:0">Đổi tài khoản nhận tiền cần xác minh chính chủ: AgiViet gửi mã xác minh về số của bác. Tài khoản mới có hiệu lực sau thời gian chờ để chống bị lừa đổi tài khoản.</p>` : ""}
      <p class="to-bao do" id="ht-loi" hidden></p></div>
    <div class="day"><button class="nut lui" type="button" id="ht-huy">Thôi</button><button class="nut chinh-nut" type="button" id="ht-gui">Gửi</button></div></div></div>`);
  document.addEventListener("keydown", thoat);
  $("che").addEventListener("click", (e) => { if (e.target.id === "che") dongTam(); });
  $("ht-huy").onclick = dongTam; $("ht-noi").focus();
  $("ht-gui").onclick = async () => {
    const noi = $("ht-noi").value.trim(); if (noi.length < 5) { $("ht-loi").textContent = "Bác ghi rõ hơn một chút."; $("ht-loi").hidden = false; return; }
    $("ht-gui").disabled = true;
    const r = await fetch("/v1/support", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: khoa, message: noi }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); $("ht-loi").textContent = j.errors?.[0]?.message || "Chưa gửi được, bác thử lại."; $("ht-loi").hidden = false; $("ht-gui").disabled = false; return; }
    dongTam(); await tai(); thongBao("Đã gửi. AgiViet sẽ trả lời bác sớm.");
  };
}
// Nộp giấy tờ: chọn loại, số, hạn, chụp ảnh → chờ AgiViet đối chiếu
function moNopGiayTo() {
  traVe = document.activeElement; const khoa = crypto.randomUUID();
  document.body.insertAdjacentHTML("beforeend", `<div class="to-che man-che" id="che"><div class="to-tam" role="dialog" aria-modal="true" aria-labelledby="t-gt">
    <div class="than"><h2 id="t-gt">Nộp giấy tờ</h2>
      <p class="hd-ghi" style="font-size:14px;color:var(--muc-phu);margin:0">Chụp rõ cả tờ giấy. AgiViet đối chiếu rồi mới hiện "Đã xác minh" cho người mua.</p>
      <label class="to-nhan-o" for="gt-loai">Loại giấy tờ</label>
      <select class="to-o" id="gt-loai">${hoSo.loai_giay_to.map((k) => `<option value="${esc(k.code)}">${esc(k.ten)}</option>`).join("")}</select>
      <label class="to-nhan-o" for="gt-so">Số giấy tờ (nếu có)</label><input class="to-o" id="gt-so" maxlength="80" autocomplete="off">
      <div id="gt-tt-khoi"><label class="to-nhan-o" for="gt-tt">Thị trường (mã vùng trồng: TQ, HQ, Mỹ…)</label><input class="to-o" id="gt-tt" maxlength="20"></div>
      <label class="to-nhan-o" for="gt-han">Hết hạn ngày (nếu có)</label><input class="to-o" id="gt-han" type="date">
      <label class="nut phu-nut to-nut" style="display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer">📷 <span id="gt-anh-chu">Chụp hoặc chọn ảnh giấy tờ</span><input id="gt-anh" type="file" accept="image/*" capture="environment" hidden></label>
      <p class="to-bao do" id="gt-loi" hidden></p></div>
    <div class="day"><button class="nut lui" type="button" id="gt-huy">Thôi</button><button class="nut chinh-nut" type="button" id="gt-gui">Nộp</button></div></div></div>`);
  document.addEventListener("keydown", thoat);
  $("che").addEventListener("click", (e) => { if (e.target.id === "che") dongTam(); });
  $("gt-huy").onclick = dongTam;
  const hienTT = () => { $("gt-tt-khoi").hidden = $("gt-loai").value !== "growing_area_code"; }; $("gt-loai").onchange = hienTT; hienTT();
  let anh = null;
  $("gt-anh").onchange = () => { const f = $("gt-anh").files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { anh = { mime: f.type || "image/jpeg", data: String(r.result).split(",")[1] }; $("gt-anh-chu").textContent = "Đã chọn ảnh ✓ (bấm để chụp lại)"; }; r.readAsDataURL(f); };
  const loi = (c) => { $("gt-loi").textContent = c; $("gt-loi").hidden = false; };
  $("gt-gui").onclick = async () => {
    if (!anh) return loi("Bác chụp ảnh giấy tờ trước đã.");
    $("gt-gui").disabled = true; $("gt-loi").hidden = true;
    try {
      const post = async (d, b) => { const r = await fetch(d, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error([j.errors?.[0]?.message, j.errors?.[0]?.fix].filter(Boolean).join(" ") || "Chưa nộp được."); return j.data ?? j; };
      const tep = await post("/v1/files", { idempotency_key: khoa + "-anh", mime: anh.mime, data_base64: anh.data, entity: "organization", entity_id: me.org.id, captured_in_app: true });
      const kq = await post("/v1/seller/certifications", { idempotency_key: khoa, kind: $("gt-loai").value, number: $("gt-so").value.trim() || undefined, market: $("gt-tt-khoi").hidden ? undefined : $("gt-tt").value.trim() || undefined, valid_to: $("gt-han").value || undefined, evidence_document_id: tep.id });
      dongTam(); await tai(); thongBao(kq.cau || "Đã nộp. Chờ AgiViet đối chiếu.");
    } catch (e) { loi(e.message); $("gt-gui").disabled = false; }
  };
}
// Đổi tên, địa chỉ vườn: cần AgiViet xác minh lại → gửi đề nghị
function moSuaHoSo() {
  traVe = document.activeElement; const khoa = crypto.randomUUID();
  document.body.insertAdjacentHTML("beforeend", `<div class="to-che man-che" id="che"><div class="to-tam" role="dialog" aria-modal="true" aria-labelledby="t-hs">
    <div class="than"><h2 id="t-hs">Đề nghị sửa thông tin</h2>
      <p class="hd-ghi" style="font-size:14px;color:var(--muc-phu);margin:0">Tên hộ, địa chỉ vườn, diện tích cần AgiViet xác minh lại nên không đổi ngay. Bác ghi điều cần sửa, AgiViet sẽ nhắn lại cho bác.</p>
      <textarea class="to-o" id="hs-noi" maxlength="600" placeholder="Ví dụ: vườn đã mở rộng thêm 3 công ở ấp Mỹ Thới"></textarea>
      <p class="to-bao do" id="hs-loi" hidden></p></div>
    <div class="day"><button class="nut lui" type="button" id="hs-huy">Thôi</button><button class="nut chinh-nut" type="button" id="hs-gui">Gửi</button></div></div></div>`);
  document.addEventListener("keydown", thoat);
  $("che").addEventListener("click", (e) => { if (e.target.id === "che") dongTam(); });
  $("hs-huy").onclick = dongTam; $("hs-noi").focus();
  $("hs-gui").onclick = async () => {
    const noi = $("hs-noi").value.trim(); if (noi.length < 5) { $("hs-loi").textContent = "Bác ghi rõ hơn một chút."; $("hs-loi").hidden = false; return; }
    $("hs-gui").disabled = true;
    const r = await fetch("/v1/seller/profile-change", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: khoa, noi_dung: noi }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { $("hs-loi").textContent = j.errors?.[0]?.message || "Chưa gửi được, bác thử lại."; $("hs-loi").hidden = false; $("hs-gui").disabled = false; return; }
    dongTam(); await tai(); thongBao((j.data ?? j).cau || "Đã gửi đề nghị.");
  };
}
const thongBao = (chu, lop = "xanh") => { const b = document.createElement("p"); b.className = `to-bao ${lop}`; b.setAttribute("role", "status"); b.textContent = chu; $("noi").prepend(b); scrollTo({ top: 0 }); };
// Thu hồi người giúp: bấm 2 lần để chắc
function xacNhanThuHoi(id, nut) {
  if (nut.dataset.chac !== "1") { nut.dataset.chac = "1"; nut.textContent = "Bấm lần nữa để thu hồi"; return; }
  nut.disabled = true;
  fetch(`/v1/org/delegations/${id}/revoke`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: "thu-hoi-" + id }) })
    .then(async (r) => { if (!r.ok) throw new Error("Chưa thu hồi được."); await tai(); thongBao("Đã thu hồi quyền của người giúp."); })
    .catch((e) => { thongBao(e.message, "do"); nut.disabled = false; });
}
async function dangXuat() {
  try { await fetch("/v1/auth/logout", { method: "POST", headers: { authorization: "Bearer " + token } }); } catch {}
  try { sessionStorage.removeItem("agv-phien"); } catch {}
  location.href = "./dang-nhap.html";
}

giuThamSo();
// ===== Danh sách mục (theo bản mẫu): mỗi phần thành một dòng; bấm mở riêng phần đó; nút thoát về danh sách =====
const ICON = {
  "giấy tờ": '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
  "hoạt động": '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  "tài khoản": '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  "người giúp": '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  "cài đặt": '<path d="M4 7h16M4 12h16M4 17h16"/>',
  "hỗ trợ": '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  "riêng tư": '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
const iconCho = (t) => { const k = Object.keys(ICON).find((x) => t.toLowerCase().includes(x)); return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ICON["cài đặt"]}</svg>`; };
const PHU = { "giấy tờ": "Nộp giấy tờ, đề nghị sửa thông tin", "tài khoản": "Nơi người mua chuyển tiền cho bác", "người giúp": "Con cháu làm thay một số việc", "cài đặt": "Cỡ chữ, tốc độ đọc", "hỗ trợ": "Hỏi AgiViet, xem lại hướng dẫn", "riêng tư": "Người mua thấy gì về bác" };
let MUC = [];
function ganMenu() {
  const noi = $("noi"), hs = noi.querySelector(".to-ho-so");
  MUC = [...noi.querySelectorAll(":scope > .to-the")].map((el, i) => {
    const ten = (el.querySelector("h2")?.textContent || el.querySelector("summary")?.textContent || "Mục").trim().replace(/:.*$/, "");
    el.dataset.muc = String(i); return { el, ten };
  });
  const nav = document.createElement("nav"); nav.className = "m-menu"; nav.setAttribute("aria-label", "Các mục tài khoản");
  nav.innerHTML = MUC.map((m, i) => { const k = Object.keys(PHU).find((x) => m.ten.toLowerCase().includes(x));
    return `<button type="button" data-mo="${i}"><span class="o">${iconCho(m.ten)}</span><span class="ten">${esc(m.ten)}${k ? `<small>${esc(PHU[k])}</small>` : ""}</span><svg class="mui" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`; }).join("");
  hs.after(nav);
  nav.onclick = (e) => { const b = e.target.closest("[data-mo]"); if (b) { history.pushState({ muc: b.dataset.mo }, "", "#muc=" + b.dataset.mo); veMuc(); } };
  window.addEventListener("popstate", veMuc);
  // Link cũ (#ho-so, #tk) mở thẳng phần tương ứng
  const cu = location.hash.slice(1); const dich = cu && noi.querySelector(`#${CSS.escape(cu)}.to-the`);
  if (dich) history.replaceState({ muc: dich.dataset.muc }, "", "#muc=" + dich.dataset.muc);
  veMuc();
}
function veMuc() {
  const m = /muc=(\d+)/.exec(location.hash)?.[1], noi = $("noi"), mo = m != null && MUC[m];
  noi.querySelector(".to-ho-so")?.classList.toggle("an-muc", !!mo);
  noi.querySelector(".m-menu")?.classList.toggle("an-muc", !!mo);
  $("dang-xuat")?.classList.toggle("an-muc", !!mo);
  MUC.forEach((x, i) => { x.el.classList.toggle("an-muc", !mo || String(i) !== m); if (x.el.tagName === "DETAILS" && mo && String(i) === m) x.el.open = true; });
  $("dau").querySelector("h1").textContent = mo ? mo.ten : "Tôi";
  $("dau").querySelector(".chao").textContent = mo ? "Tôi" : "Tài khoản";
  window.scrollTo(0, 0);
}
$("dong").onclick = () => (/muc=/.test(location.hash) ? history.back() : history.length > 1 ? history.back() : (location.href = "./ban-hom-nay.html" + location.search));
tai().then(ganMenu).catch((e) => { $("noi").innerHTML = `<p class="bao loi">${esc(e.message)}</p>`; });
