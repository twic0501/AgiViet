import { esc, so, phien, layDuLieu, ANH_SP, giuThamSo, veTab } from "./chung.ts";
veTab("trang-chu");
const $ = (id) => document.getElementById(id);
const iconTroi = (p) => p >= 70
  ? `<svg viewBox="0 0 36 36" fill="none"><path d="M10 20a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 0 10z" fill="#c9d3dc"/><path d="M13 24l-2 5M19 24l-2 5M25 24l-2 5" stroke="#2b6cb0" stroke-width="2.4" stroke-linecap="round"/></svg>`
  : p >= 30
  ? `<svg viewBox="0 0 36 36" fill="none"><circle cx="13" cy="13" r="6" fill="#e8b53a"/><path d="M12 24a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 0 10z" fill="#dfe4e8"/></svg>`
  : `<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="7" fill="#e8b53a"/><path d="M18 4v4M18 28v4M4 18h4M28 18h4M8 8l3 3M25 25l3 3M8 28l3-3M25 11l3-3" stroke="#e8b53a" stroke-width="2.4" stroke-linecap="round"/></svg>`;

async function mo() {
  const { troi } = await layDuLieu(await phien());
  if (!troi || troi.__loi || !troi.ngay?.length) { $("hom-nay").innerHTML = `<p style="margin:0">${troi?.__loi ? "Chưa tải được thời tiết. Bác kiểm tra mạng rồi mở lại." : "Chưa có dữ liệu thời tiết."}</p>`; $("ds-ngay").innerHTML = ""; return; }
  const noi = troi.tinh?.ten || "";
  if (noi) $("tieu-de").textContent = `Thời tiết ${noi}`;
  // Thẻ lớn: hôm nay + lời khuyên ngay trong thẻ (theo bản mẫu)
  const h = troi.ngay[0], mua0 = so(h.kha_nang_mua_phan_tram, 0, 100), cao0 = so(h.nhiet_do_cao_c);
  const moTa = mua0 == null ? "" : mua0 >= 70 ? "Nhiều khả năng mưa" : mua0 >= 30 ? "Có thể mưa" : "Ít mưa";
  const kh = h.loi_khuyen?.[0] || [...new Set(troi.ngay.flatMap((n) => n.loi_khuyen || []))][0];
  $("hom-nay").innerHTML = `<div style="display:flex;align-items:center;gap:16px"><span style="width:56px;height:56px;flex:none">${iconTroi(mua0 ?? 0)}</span>
    <div><b style="font-size:40px;line-height:1;font-variant-numeric:tabular-nums">${cao0 == null ? "—" : Math.round(cao0) + "°"}</b>
    <p style="margin:4px 0 0;opacity:.85;font-size:16px">Hôm nay${moTa ? ` · ${moTa}` : ""}${mua0 == null ? "" : ` · mưa ${mua0}%`}</p></div></div>
    ${kh ? `<p class="m-loi-khuyen">${esc(kh)}</p>` : ""}`;
  $("ds-ngay").innerHTML = troi.ngay.map((n, i) => {
    const thu = i === 0 ? "Hôm nay" : new Date(n.ngay).toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" });
    const mua = so(n.kha_nang_mua_phan_tram, 0, 100), cao = so(n.nhiet_do_cao_c), thap = so(n.nhiet_do_thap_c);
    return `<div class="m-dong"><span><b style="color:var(--muc)">${esc(thu)}</b></span><b>${cao == null ? "—" : Math.round(cao) + "°"}${thap == null ? "" : "/" + Math.round(thap) + "°"} <span class="m-ghi">· ${mua == null ? "—" : mua >= 30 ? "mưa " + mua + "%" : "nắng"}</span></b></div>`;
  }).join("");
}

mo().catch((e) => { $("hom-nay").innerHTML = `<p style="margin:0">Không tải được: ${esc(e.message)}</p>`; }).finally(() => { giuThamSo(); $("noi").setAttribute("aria-busy", "false"); });
