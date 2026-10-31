// Bộ máy dùng chung cho app MUA và trang VẬN HÀNH (hệ "Sổ làm ăn").
// Mỗi app khai báo: menu, tab (điện thoại), các màn { tieuDe, phu?, lui?, phai?, ve(s) }, trạng thái đầu.
// Trạng thái lưu localStorage theo khóa của app → khung máy tính và khung điện thoại (2 iframe) dùng chung, đổi là cùng đổi.
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const d = (n) => Number(n).toLocaleString("vi-VN") + " đ";
export const kg = (n) => Number(n).toLocaleString("vi-VN") + " kg";
export const so = (n) => Number(n).toLocaleString("vi-VN");

const DUONG = {
  nha: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  la: "M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7",
  phieu: "M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1zM9 8h6M9 12h6",
  can: "M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z",
  tin: "M4 5h16v11H8l-4 4z",
  don: "M4 4h16v16H4zM4 9h16M9 4v5",
  tien: "M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v4M18 10v4",
  kho: "M3 9l9-5 9 5v11H3zM8 20v-6h8v6",
  nguoi: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3a4 4 0 0 1 0 8M22 21c0-3-2-5-5-6",
  lich: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",
  bieu: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  xe: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  toa: "M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 9h2M14 9h2M8 13h2M14 13h2",
  khien: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  co: "M5 21V4M5 4h11l-2 4 2 4H5",
  tim: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  lui: "M15 5l-7 7 7 7",
  tich: "M5 12l5 5 9-10",
  them: "M12 5v14M5 12h14",
  tai: "M12 4v12M7 11l5 5 5-5M5 20h14",
  mat: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  chuong: "M6 9a6 6 0 1 1 12 0c0 6 3 7 3 7H3s3-1 3-7M10 20a2 2 0 0 0 4 0",
  canh: "M12 3l10 18H2zM12 10v5M12 18v.5",
  dong_ho: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  khoa: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  dien: "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 4 5a1 1 0 0 1 1-1z",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  sao: "M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z",
  them_nguoi: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6",
  ghep: "M8 7h8M8 12h8M8 17h5M4 3h16v18H4z",
  cai: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .2-1.5-1.5.2-2-3-1-1 2h-2l-1-2-3 1 .2 2L6.4 7.2 4.4 7l-1 3 2 1v2l-2 1 1 3 2-.2 1.5 1.5-.2 2 3 1 1-2h2l1 2 3-1-.2-2 1.5-1.5 2 .2 1-3-2-1z",
  hop: "M3 8l9-5 9 5-9 5zM3 8v8l9 5 9-5V8M12 13v8",
};
export const icon = (ten) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${DUONG[ten] || DUONG.phieu}"/></svg>`;

// ── Kho trạng thái dùng chung giữa các khung ──
export function taoKho(khoa, dau) {
  let s;
  try { s = JSON.parse(localStorage.getItem(khoa)) || null; } catch { s = null; }
  if (!s || s.phien !== dau.phien) s = structuredClone(dau);
  const ngheList = [];
  const luu = () => { try { localStorage.setItem(khoa, JSON.stringify(s)); } catch {} };
  addEventListener("storage", (e) => {
    if (e.key !== khoa || !e.newValue) return;
    try { s = JSON.parse(e.newValue); ngheList.forEach((f) => f(s, true)); } catch {}
  });
  return {
    get s() { return s; },
    doi(f) { f(s); luu(); ngheList.forEach((g) => g(s, false)); },
    datLai() { s = structuredClone(dau); luu(); ngheList.forEach((g) => g(s, false)); },
    nghe(f) { ngheList.push(f); },
  };
}

// ── Khung app ──
export function chayApp({ ten, phu, viet, menu, tab, man, kho, macDinh, nguoi }) {
  const q = new URLSearchParams(location.search);
  const ma = man[q.get("man")] ? q.get("man") : macDinh;
  const url = (m, them = "") => `?man=${m}${them}`;
  const muc = (m) => {
    const dem = typeof m.dem === "function" ? m.dem(kho.s) : 0;
    return `<a class="sl-muc" href="${url(m.ma)}" ${m.ma === ma || (man[ma].thuoc === m.ma) ? 'aria-current="page"' : ""}>${icon(m.icon)}<span>${esc(m.ten)}</span>${dem ? `<span class="sl-dem">${dem}</span>` : ""}</a>`;
  };
  const veMenu = () => `
    <div class="sl-hieu"><img src="/assets/logo.svg" alt=""><div><b>${esc(ten)}</b><small>${esc(phu)}</small></div></div>
    ${menu.map((n) => (n.nhom ? `<div class="sl-nhom-ten">${esc(n.nhom)}</div>` : "") + n.muc.map(muc).join("")).join("")}
    <div class="sl-chan"><span class="sl-anh">${esc(nguoi.viet)}</span><div><b>${esc(nguoi.ten)}</b><small>${esc(nguoi.vai)}</small></div></div>`;
  const veTab = () => tab.map((m) => {
    const dem = typeof m.dem === "function" ? m.dem(kho.s) : 0;
    const dang = m.ma === ma || man[ma].thuoc === m.ma || (m.gom || []).includes(ma) || (m.gom || []).includes(man[ma].thuoc);
    return `<a href="${url(m.ma)}" ${dang ? 'aria-current="page"' : ""}>${icon(m.icon)}<span>${esc(m.ten)}</span>${dem ? `<span class="sl-dem">${dem}</span>` : ""}</a>`;
  }).join("");

  const goc = document.getElementById("app");
  const ve = (tuNoiKhac) => {
    const m = man[ma];
    const s = kho.s;
    const phai = typeof m.phai === "function" ? m.phai(s) : (m.phai || "");
    const tieuDe = typeof m.tieuDe === "function" ? m.tieuDe(s) : m.tieuDe;
    const phuDe = typeof m.phu === "function" ? m.phu(s) : (m.phu || "");
    const cuon = scrollY;
    goc.innerHTML = `
      <div class="sl-khung">
        <nav class="sl-menu" aria-label="Menu chính">${veMenu()}</nav>
        <div class="sl-lam">
          <header class="sl-dinh">
            ${m.lui ? `<a class="sl-lui" href="${url(m.lui)}" aria-label="Quay lại">${icon("lui")}</a>` : ""}
            <div style="min-width:0"><h1>${esc(tieuDe)}</h1>${phuDe ? `<div class="sl-phu">${esc(phuDe)}</div>` : ""}</div>
            <div class="sl-phai">${phai}</div>
          </header>
          <main class="sl-trang" ${tuNoiKhac ? 'style="animation:none"' : ""}>${m.ve(s, { url, q })}</main>
        </div>
      </div>
      <nav class="sl-tab" aria-label="Menu điện thoại">${veTab()}</nav>`;
    if (tuNoiKhac) scrollTo(0, cuon);
    // Nhãn cột cho bảng (điện thoại hiện bảng thành thẻ)
    goc.querySelectorAll("table.sl-bang").forEach((t) => { const ten = [...t.querySelectorAll("thead th")].map((h) => h.textContent.trim()); t.querySelectorAll("tbody tr").forEach((r) => [...r.children].forEach((c, i) => ten[i] && c.setAttribute("data-nhan", ten[i]))); });
    m.sau?.(goc, kho, { url, q, veLai: () => ve(true) });
    document.title = `${tieuDe} · ${ten}`;
  };
  kho.nghe((_, tuNoiKhac) => ve(true));
  ve(false);
}

// Đếm giờ còn lại dạng "còn 5 giờ 20 phút"
export const conLai = (phut) => phut <= 0 ? "đã quá hạn" : phut < 60 ? `còn ${phut} phút` : `còn ${Math.floor(phut / 60)} giờ${phut % 60 ? ` ${phut % 60} phút` : ""}`;
