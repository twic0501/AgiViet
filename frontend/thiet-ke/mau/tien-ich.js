// Hàm dùng chung cho các màn mẫu app bán.
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const d = (n) => Number(n).toLocaleString("vi-VN") + " đ";
export const so = (n) => Number(n).toLocaleString("vi-VN");
export const kg = (n) => Number(n).toLocaleString("vi-VN") + " kg";

const P = {
  lui: "M15 5l-7 7 7 7", toi: "M9 5l7 7-7 7", tich: "M5 12l5 5 9-10", them: "M12 5v14M5 12h14", x: "M6 6l12 12M18 6L6 18",
  nha: "M4 10.2 12 4l8 6.2V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19zM10 20.5v-5h4v5",
  cho: "M4.5 10.5h15v8.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5zM3.5 10.5 5.2 4.5h13.6l1.7 6M10 20.5v-4.5h4v4.5",
  tin: "M5 4.5h14A1.5 1.5 0 0 1 20.5 6v9.5A1.5 1.5 0 0 1 19 17h-8l-5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5zM8 9.5h8M8 12.5h5",
  tien: "M4 7.5h15.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18.5V8.5a1 1 0 0 1 1-1zM15.5 13.75h2.5",
  tai: "M4.5 13.5h3v6h-1.5a1.5 1.5 0 0 1-1.5-1.5zM16.5 13.5h3V18a1.5 1.5 0 0 1-1.5 1.5h-1.5zM4.5 15v-3a7.5 7.5 0 0 1 15 0v3",
  chuong: "M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 21a2 2 0 0 0 4 0",
  troi: "M7.5 19a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.7 1A3.5 3.5 0 0 1 17.5 19zM6 4.5l1 1.2M3.5 8h1.5M10 2.5v1.5",
  so: "M6.5 3.5H18a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6.5A2 2 0 0 1 4.5 18.5v-13a2 2 0 0 1 2-2zM8 3.5v17M15.5 8c-2.6 0-4 1.6-4 4 2.6 0 4-1.6 4-4z",
  hd: "M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8zM14 3.5V8h4.5M8.5 11.5h4M8.5 15.5c1-1.2 1.8-1.2 2.4 0s1.4 1.2 2.4 0",
  bao: "M5 4.5h11.5V18a2 2 0 0 0 2 2H6.5A1.5 1.5 0 0 1 5 18.5zM16.5 9h3v9a2 2 0 0 1-2 2M8 8.5h5.5M8 12h5.5M8 15.5h3.5",
  cai: "M4 6.5h16M4 12h16M4 17.5h16M9 6.5h.01M15 12h.01M8 17.5h.01",
  anh: "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  gui: "M4 12l16-8-6 16-2-7z",
  can: "M12 4v16M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z",
  khien: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  canh: "M12 3l10 18H2zM12 10v5M12 18v.5",
  dien: "M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 4 5a1 1 0 0 1 1-1z",
  xe: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  nguoi: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  sao: "M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z",
  khoa: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  lich: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",
  la: "M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7",
};
export const ic = (k, w = 22) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[k] || P.tich}"/></svg>`;

// ── Khối dựng sẵn ──
const j = (x) => esc(JSON.stringify(x));
export const the = (tieu, than, link = "") => `<section class="m-the">${tieu ? `<div class="m-the-dau"><h2>${esc(tieu)}</h2>${link}</div>` : ""}${than}</section>`;
export const dong = (a, b, lop = "") => `<div class="m-dong ${lop}"><span>${a}</span><b>${b}</b></div>`;
export const viec = (tieu, chu, nutHtml = "", lop = "") => `<section class="m-viec ${lop}"><h2>${esc(tieu)}</h2>${chu ? `<p>${chu}</p>` : ""}${nutHtml}</section>`;
export const nhan = (t, l = "") => `<span class="m-nhan ${l}">${esc(t)}</span>`;
export const lk = (chu, ma, tham) => `<button class="m-lk" type="button" data-di="${ma}"${tham ? ` data-tham="${j(tham)}"` : ""}>${esc(chu)}</button>`;
export const nut = (chu, { ma, tham, lop = "", id = "", icon = "" } = {}) => `<button class="m-nut ${lop}" type="button"${ma ? ` data-di="${ma}"` : ""}${tham ? ` data-tham="${j(tham)}"` : ""}${id ? ` id="${id}"` : ""}>${icon ? ic(icon, 20) : ""}${esc(chu)}</button>`;
export const chang = (i, xong = false) => `<div class="m-chang">${[0, 1, 2, 3, 4].map((k) => `<i class="${k < i || (xong && k === i) ? "m-qua" : k === i ? "m-dang" : ""}"></i>`).join("")}</div><div class="m-chang-ten">${["Chào giá", "Ký", "Cọc", "Giao", "Nhận tiền"].map((t) => `<span>${t}</span>`).join("")}</div>`;
export const chon = (ten, ds, mac = 0) => `<div class="m-chon" role="radiogroup">${ds.map(([t, g], i) => `<label><input type="radio" name="${ten}" ${i === mac ? "checked" : ""}><span class="m-chon-o"><span><b>${esc(t)}</b>${g ? `<small>${esc(g)}</small>` : ""}</span><span class="m-tick"></span></span></label>`).join("")}</div>`;
export const o = (nhanO, gt, ghi = "", them = "") => `<label class="m-o"><span>${esc(nhanO)}</span><input value="${esc(gt)}" ${them}>${ghi ? `<small>${esc(ghi)}</small>` : ""}</label>`;
export const hangLo = (l) => `<div class="m-hang" role="button" tabindex="0" data-di="chi-tiet-lo" data-tham="${j({ lo: l.ma })}"><span class="m-anh m-anh-xoai"></span><span><b>${esc(l.ten)} · ${esc(l.loai)}</b><small>${l.ma} · còn ${so(l.con)} kg · ${so(l.gia)} đ/kg</small></span>${l.trang === "sap-co" ? nhan("Sắp có", "m-n-tien") : l.chao ? nhan(`${l.chao} lời chào`, "m-n-bac") : nhan("Đang bán", "m-n-xong")}</div>`;

