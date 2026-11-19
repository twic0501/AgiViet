import { quaCau } from "./qua-cau.ts";
import { luuPhien } from "./chung.ts";
const $ = (id) => document.getElementById(id);
const cau = quaCau($("cau") as HTMLCanvasElement, { anh: ["xoai-cat-chu", "tom", "lua-gao", "ca-phe", "thanh-long", "sau-rieng", "buoi", "vai", "chuoi", "dua-hau", "rau-cai", "cu", "ho-tieu", "hat-dieu", "ca-tra", "cua"].map((n) => `/assets/products/${n}.jpg`) });

let cheDo = "dang-nhap", thuThach = null, demNguoc = null, nutMo = null, dangGui = false, dangXacNhan = 0;
// Một màn đăng nhập cho cả hai app: ?ben=mua là app người mua.
const MUA = new URLSearchParams(location.search).get("ben") === "mua" || location.hostname.startsWith("mua."); // mua.agiviet.id.vn luôn là cửa người mua
const APP = MUA ? "/mua-ts/" : "./ban-hom-nay.html"; // app mua bản Vite + TypeScript; bản cũ vẫn ở ./mua-app.html
if (MUA) {
  document.title = "Đăng nhập · AgiViet mua";
  $("nut-dk").textContent = "Đăng ký mua hàng";
  $("dk-ban").hidden = true; $("dk-mua").hidden = false;
  $("nhan-cs").textContent = "Tên cơ sở / công ty"; $("ten-cs").placeholder = "Nhà hàng Bếp Sen";
  $("xong-ghi").textContent = "Nhân viên AgiViet sẽ gọi xác minh cơ sở và mã số thuế. Được duyệt, bạn nhận tin nhắn và đăng nhập bằng số này.";
}
const chuan = (s) => s.replace(/\D/g, "");
const sdt = () => chuan($("sdt").value);
const hienLoi = (id, m) => { $(id).textContent = m; $(id).hidden = !m; };
const mstHopLe = () => !MUA || /^\d{10}(\d{3})?$/.test(chuan($("mst").value));
const hopLe = () => /^0\d{9}$/.test(sdt()) && (cheDo === "dang-nhap" || ($("ho-ten").value.trim() && $("ten-cs").value.trim() && mstHopLe()));
const buoc = (n) => { for (const b of ["b0", "b1", "b2", "b3"]) $(b).hidden = b !== `b${n}`; $("tam").setAttribute("aria-labelledby", ["tieu-de-0", "tieu-de", "tieu-de-2", "tieu-de-3"][n]); };

// Bản trình diễn: chọn người mẫu. Tính cách khớp hành vi AI ở backend/src/demo/doi-tac-ao.ts (bảng KIEU).
const TINH = {
  "TC-B01": "Xoài cát. Dễ chốt nếu giá sát giá tham khảo, trả lời nhanh.",
  "TC-B02": "Sầu riêng. Hay trả giá thêm một lần trước khi đồng ý.",
  "TC-B03": "HTX gom nhiều hộ, sản lượng lớn, thích hợp đồng khung theo tuần.",
  "TC-B04": "Cẩn thận, trả lời chậm, trả giá một lần.",
  "TC-B05": "Hay cần bán gấp khi hàng chín, chịu bớt chút giá.",
  "TC-B06": "Lúa. Trả giá một lần rồi đồng ý.",
  "TC-B07": "Thanh long. Trả giá một lần rồi đồng ý.",
  "TC-B08": "Cá tra. Giữ giá: trả giá lên 2 lần rồi mới chốt.",
  "TC-B09": "Chanh không hạt. Mới dùng app, trả lời chậm, đồng ý ngay.",
  "TC-B10": "Bưởi da xanh. Có giấy kiểm nghiệm, đòi giá cao hơn thị trường.",
  "TC-M01": "Nhà máy sấy. Mua số lượng lớn, trả giá một lần.",
  "TC-M02": "Xuất nhập khẩu. Cần đúng quy cách, trả giá một lần.",
  "TC-M03": "Nhà hàng. Mua giỏ nhiều món nhỏ mỗi tuần.",
  "TC-M04": "Vựa đầu mối. Vừa mua vừa bán lại, trả giá gắt.",
  "TC-M05": "Thủy sản. Mua định kỳ, chuộng hợp đồng khung theo tuần.",
  "TC-M06": "Quán cơm. Đơn nhỏ, cần giao sớm buổi sáng.",
  "TC-M07": "Vựa trái cây. Chốt nhanh khi hàng đẹp, ít đọc điều khoản.",
  "TC-M08": "Vựa lúa. Mua theo vụ, thích đặt trước.",
  "TC-M09": "Chế biến. Trả tiền đúng hạn, ít trả giá.",
  "TC-M10": "Xuất khẩu. Đòi mã vùng trồng, giấy kiểm nghiệm đầy đủ."
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// null = không phải bản trình diễn (máy chủ thật không có /v1/test/*) → đăng nhập OTP như thường.
const NGUOI_MAU = fetch("/v1/test/accounts").then((r) => (r.ok ? r.json() : null)).then((ds) => {
  if (!Array.isArray(ds)) return null;
  const gap = new Set();
  return ds.filter((a) => TINH[a.org_code] && a.org_code.startsWith(MUA ? "TC-M" : "TC-B") && a.roles.split(",").includes("owner") && !gap.has(a.org_code) && gap.add(a.org_code))
    .sort((a, b) => a.org_code.localeCompare(b.org_code));
}).catch(() => null);
async function moChonVai() {
  const ds = await NGUOI_MAU;
  if (!ds?.length) return false;
  // Hộ đang có người khác giữ (dùng trong 30 phút gần nhất): khóa nút + xếp xuống cuối — mỗi người thử một hộ riêng
  const dung = new Set(await fetch("/v1/test/dang-dung").then((r) => (r.ok ? r.json() : [])).catch(() => []));
  ds.sort((x, y) => +dung.has(x.org_code) - +dung.has(y.org_code) || x.org_code.localeCompare(y.org_code));
  $("ds-vai").hidden = false; $("tep").hidden = true; // mở lại sau lần chọn trước: về đúng danh sách vai
  $("ds-vai").innerHTML = ds.map((a) => `<button type="button" data-sdt="${esc(a.phone)}"${dung.has(a.org_code) ? " disabled" : ""}><b>${esc(a.org_name)}</b><small>${esc(a.display_name)} · ${esc(TINH[a.org_code])}</small>${dung.has(a.org_code) ? `<small style="color:#9a3b1f;font-weight:600">Đang có người khác thử. Hộ mở lại sau 10 phút họ ngừng dùng.</small>` : ""}</button>`).join("");
  buoc(0); hienLoi("loi-0", "");
  return true;
}
$("ds-vai").onclick = async (e) => {
  const b = e.target.closest("[data-sdt]"); if (!b) return;
  b.disabled = true;
  try {
    const r = await fetch("/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: b.dataset.sdt }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.token) throw new Error(j.errors?.[0]?.message || "Chưa vào được vai này, thử lại nhé.");
    luuPhien(j.token);
    const [t, ds] = await Promise.all([fetch("/v1/test/tep-khach", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + j.token }, body: "{}" }).then((x) => x.json()).catch(() => null),
      fetch("/v1/test/accounts").then((x) => x.json()).catch(() => [])]);
    const ten = new Map((ds || []).map((a) => [a.org_code, a.org_name]));
    if (!t?.doi_tac?.length) { location.href = APP; return; }
    $("ds-vai").hidden = true; $("tep").hidden = false;
    $("ds-tep").innerHTML = t.doi_tac.map((d) => `<div class="the" style="padding:10px 12px;margin-top:8px"><b>${esc(ten.get(d.to_chuc) || d.to_chuc)}</b><p class="phu-de" style="margin:2px 0 0">${esc(d.mo_ta)}</p></div>`).join("");
    $("vao-tep").onclick = () => (location.href = APP); $("vao-tep").focus();
  } catch (err) { hienLoi("loi-0", err.message); b.disabled = false; }
};
$("dn-so").onclick = () => { buoc(1); $("sdt").focus(); };

// Câu báo giới hạn gửi mã: "Đợi 554 giây…" → "Bác thử lại sau 10 phút nhé" + đếm ngược
function cauGioiHan(j, r) {
  const e = j.errors?.[0] || {};
  const giay = Number(e.details?.retry_after_s ?? e.details?.cho_giay ?? r.headers.get("retry-after") ?? (e.message || "").match(/(\d+)\s*giây/)?.[1]);
  if (r.status === 429 || Number.isFinite(giay)) {
    const g = Number.isFinite(giay) ? giay : 60;
    return { cau: g >= 90 ? `Bác gửi mã nhiều lần quá. Bác thử lại sau ${Math.ceil(g / 60)} phút nhé.` : `Bác chờ ${g} giây rồi gửi lại mã nhé.`, giay: g };
  }
  return { cau: e.message || "Chưa gửi được mã. Bác thử lại sau ít phút." };
}

async function moTam(che, nut) {
  cheDo = che; nutMo = nut;
  $("tieu-de").textContent = che === "dang-ky" ? (MUA ? "Đăng ký mua hàng" : "Đăng ký bán hàng") : "Đăng nhập";
  $("phu-de").textContent = che === "dang-ky" ? "Điền vài thông tin, AgiViet gửi mã 6 số để xác nhận số điện thoại." : "Nhập số điện thoại, AgiViet gửi mã 6 số.";
  $("them-dk").hidden = che !== "dang-ky";
  buoc(1); hienLoi("loi-1", ""); $("gui").disabled = !hopLe();
  const chonVai = che === "dang-nhap" && await moChonVai();
  $("tam").inert = false; $("tam").classList.add("mo"); $("che").classList.add("mo");
  document.querySelector(".vao").inert = true; cau?.dung?.();
  setTimeout(() => (chonVai ? $("ds-vai").querySelector("button") : che === "dang-ky" ? $("ho-ten") : $("sdt"))?.focus(), 320);
}
function dongTam() {
  $("tam").classList.remove("mo"); $("che").classList.remove("mo"); $("tam").inert = true;
  document.querySelector(".vao").inert = false; clearInterval(demNguoc); cau?.chay?.(); nutMo?.focus();
}
document.querySelectorAll("[data-mo]").forEach((b) => (b.onclick = () => moTam(b.dataset.mo, b)));
$("che").onclick = dongTam;
addEventListener("keydown", (e) => { if (e.key === "Escape" && $("tam").classList.contains("mo")) dongTam(); });

$("sdt").addEventListener("input", (e) => {
  const so = chuan(e.target.value).slice(0, 10);
  e.target.value = so.replace(/(\d{4})(\d{0,3})(\d{0,3})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));
  $("gui").disabled = !hopLe() || dangGui;
});
for (const id of ["ho-ten", "ten-cs", "mst"]) $(id).addEventListener("input", () => ($("gui").disabled = !hopLe() || dangGui));

// Gửi mã; lỗi hiện ở bước đang mở (bước 1 lúc gửi lần đầu, bước 2 lúc gửi lại)
async function guiMa() {
  if (dangGui) return;
  const oLoi = $("b2").hidden ? "loi-1" : "loi-2";
  dangGui = true; $("gui").disabled = true; $("gui-lai").disabled = true; $("gui").textContent = "Đang gửi…"; hienLoi(oLoi, "");
  try {
    const r = await fetch("/v1/auth/otp/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt() }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const g = cauGioiHan(j, r); if (g.giay) batDem(g.giay, oLoi, g.cau); throw new Error(g.cau); }
    thuThach = j.challenge_id;
    buoc(2);
    $("gui-toi").textContent = `Mã đã gửi tới ${sdt().replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")}.`;
    o6.forEach((x) => (x.value = "")); o6[0].focus(); batDem(60);
    // Môi trường thử: hiện mã để kiểm (bản thật không có)
    fetch(`/v1/test/sms/${sdt()}`).then((x) => (x.ok ? x.json() : null)).then((m) => {
      const ma = JSON.stringify(m || "").match(/\b\d{6}\b/)?.[0];
      if (ma) { $("ma-thu").textContent = `Môi trường thử · mã: ${ma}`; $("ma-thu").hidden = false; }
    }).catch(() => {});
  } catch (e) { hienLoi(oLoi, e.message); }
  dangGui = false; $("gui").textContent = "Gửi mã"; $("gui").disabled = !hopLe(); $("gui-lai").disabled = false;
}
// Đếm ngược: ở bước 2 là "Gửi lại sau …"; khi bị chặn thì câu báo tự cập nhật số phút/giây còn lại
function batDem(s, oLoi = null, cau = null) {
  clearInterval(demNguoc); $("gui-lai").hidden = true;
  const ve = () => {
    const con = s > 90 ? `${Math.ceil(s / 60)} phút` : `${s} giây`;
    if (oLoi && cau) hienLoi(oLoi, s > 0 ? cau.replace(/\d+ (phút|giây)/, con) : "");
    $("dem").textContent = !oLoi && s > 0 ? `Gửi lại sau ${con}` : "";
    if (s-- <= 0) { clearInterval(demNguoc); if (!$("b2").hidden) $("gui-lai").hidden = false; }
  };
  ve(); demNguoc = setInterval(ve, 1000);
}
$("gui").onclick = guiMa; $("gui-lai").onclick = guiMa;
$("doi-so").onclick = () => { buoc(1); clearInterval(demNguoc); $("sdt").focus(); };

const o6 = [...$("otp").querySelectorAll("input")];
const ma = () => o6.map((x) => x.value).join("");
// Điền mã từ vị trí i (gõ, dán hoặc điện thoại tự điền); xóa phần cũ phía sau rồi đặt focus đúng chỗ
function dien(i, chuoi) {
  const s = chuan(chuoi).slice(0, 6 - i);
  if (s.length > 1) for (let k = i; k < 6; k++) o6[k].value = "";
  s.split("").forEach((c, k) => (o6[i + k].value = c));
  const tiep = o6.findIndex((x) => !x.value);
  (o6[tiep === -1 ? 5 : tiep]).focus();
  if (ma().length === 6) xacNhan();
}
o6.forEach((o, i) => {
  o.addEventListener("input", () => { const v = o.value; o.value = ""; dien(i, v); });
  o.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !o.value && o6[i - 1]) { o6[i - 1].value = ""; o6[i - 1].focus(); e.preventDefault(); } });
  o.addEventListener("paste", (e) => { e.preventDefault(); dien(i, e.clipboardData.getData("text")); });
});
const vaoApp = () => (location.href = APP);
async function xacNhan() {
  const luot = ++dangXacNhan;               // chỉ phản hồi của lượt mới nhất được xử lý
  hienLoi("loi-2", ""); o6.forEach((x) => (x.disabled = true)); $("gui-toi").textContent = "Đang xác nhận…";
  try {
    const than = { challenge_id: thuThach, phone: sdt(), code: ma() };
    const dk = cheDo === "dang-ky";
    const r = await fetch(dk ? "/v1/auth/register" : "/v1/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(dk ? { ...than, name: $("ho-ten").value.trim(), org: MUA
        ? { side: "buy", kind: "enterprise", display_name: $("ten-cs").value.trim(), tax_code: chuan($("mst").value), segment_code: $("phan-khuc").value }
        : { side: "sell", kind: document.querySelector('[name="loai"]:checked').value, display_name: $("ten-cs").value.trim() } } : than) });
    const j = await r.json().catch(() => ({}));
    if (luot !== dangXacNhan) return;
    if (!r.ok) throw new Error(j.errors?.[0]?.message || "Mã chưa đúng. Bác kiểm tra lại tin nhắn.");
    if (j.token) luuPhien(j.token);          // phiên thật từ máy chủ, không dùng đăng nhập giả lập
    clearInterval(demNguoc);
    if (dk) buoc(3); else vaoApp();
  } catch (e) {
    if (luot !== dangXacNhan) return;
    hienLoi("loi-2", e.message); o6.forEach((x) => { x.disabled = false; x.value = ""; }); o6[0].focus();
    $("gui-toi").textContent = `Mã đã gửi tới ${sdt().replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")}.`;
  }
}
$("vao-app").onclick = dongTam;
