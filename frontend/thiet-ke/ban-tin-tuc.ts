import { esc, phien, layDuLieu, ANH_SP, giuThamSo, veTab } from "./chung.ts";
veTab("trang-chu");
const $ = (id) => document.getElementById(id);
const vnd = (x) => Number(x).toLocaleString("vi-VN");
const MUI = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
document.querySelector(".m-tab").onclick = (e) => {
  const b = e.target.closest("[data-tab]"); if (!b) return;
  document.querySelectorAll(".m-tab [data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  ["gia", "tin", "hoc"].forEach((k) => ($("tab-" + k).hidden = k !== b.dataset.tab));
};
const theTin = (n, anh) => `<a class="m-the tin-the" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">${anh ? `<span class="anh" style="background-image:url(${anh})"></span>` : `<span class="anh" style="display:grid;place-items:center;color:var(--la-dam)"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5"/></svg></span>`}
  <span style="flex:1;min-width:0"><p class="tieu">${esc(n.tieu_de)}</p><p class="phu">${esc(n.nguon)} · ${new Date(n.ngay).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}${n.theo_tinh ? " · trong tỉnh" : ""}</p></span>${MUI}</a>`;

async function mo() {
  const token = await phien();
  const { lo: tatCa, tenSp } = await layDuLieu(token);
  const lo = tatCa.filter((l) => ["on_sale", "upcoming"].includes(l.status));
  const h = { headers: { authorization: "Bearer " + token } };
  const cap = [...new Map<string, any>(lo.map((l) => [`${l.product_code}|${l.grade_code}`, l])).values()];
  const tenHang = [...new Set(cap.map((l) => tenSp.get(l.product_code) || l.product_code))];
  if (tenHang.length) $("theo-hang").textContent = "Theo hàng của bác: " + tenHang.slice(0, 2).join(", ");
  const ls = await Promise.all(cap.map((l) => fetch(`/v1/price-history?product=${encodeURIComponent(l.product_code)}&grade=${encodeURIComponent(l.grade_code)}`, h).then((x) => (x.ok ? x.json() : null)).catch(() => null)));
  $("tab-gia").innerHTML = cap.length ? cap.map((l, i) => {
    const g = ls[i], ten = `${tenSp.get(l.product_code) || l.product_code} loại ${String(l.grade_code).replace(/^L/, "")}`;
    if (!g || !g.khoang) return `<section class="m-the"><p class="gia-nhan">${esc(ten)}</p><p style="margin:0;font-size:16px">Chưa có giao dịch nào trong 7 tuần để tham khảo. Khi có người mua bán mặt hàng này trên AgiViet, giá sẽ hiện ở đây.</p></section>`;
    const cao = Math.max(...g.tuan.map((t) => Number(t.gia_tb_vnd || 0)));
    const khoang = g.khoang.thap_vnd === g.khoang.cao_vnd ? vnd(g.khoang.thap_vnd) : `${vnd(g.khoang.thap_vnd)}–${vnd(g.khoang.cao_vnd)}`;
    return `<section class="m-the"><p class="gia-nhan">${esc(ten)} · tại vườn</p>
      <div><p class="gia-to">${khoang}</p><p class="gia-phu">đ/kg · ${g.tong_don} giao dịch trong 7 tuần trên AgiViet</p></div>
      <div class="cot" role="img" aria-label="Giá trung bình 7 tuần gần nhất">${g.tuan.map((t, k) => t.so_don ? `<span class="${k === g.tuan.length - 1 ? "moi" : ""}" style="height:${Math.max(12, Math.round(72 * Number(t.gia_tb_vnd) / cao))}px" title="${vnd(t.gia_tb_vnd)} đ/kg · ${t.so_don} giao dịch"></span>` : `<span class="trong" title="Tuần này chưa có giao dịch"></span>`).join("")}</div>
      <p class="m-ghi" style="margin:0">7 tuần gần nhất · cột gạch là tuần chưa có giao dịch · tham khảo từ các đơn đã hoàn tất trên AgiViet, không phải giá chính thức.</p></section>`;
  }).join("") : `<section class="m-the"><p style="margin:0;font-size:16px">Bác chưa đăng hàng nào, nên chưa có giá để theo dõi. Đăng hàng xong, giá của mặt hàng đó sẽ hiện ở đây.</p></section>`;
  const tin = await fetch("/v1/news", h).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  const ds = tin?.tin || [];
  // Ảnh theo mặt hàng tin nhắc tới; không khớp thì dùng biểu tượng tờ báo (không gắn ảnh xoài cho tin sầu riêng/trứng gà)
  const KHOP: [RegExp, string][] = [[/xoài/i, "XOAI_CAT_CHU"], [/sầu riêng/i, "SAU_RIENG"], [/thanh long/i, "THANH_LONG"], [/bưởi/i, "BUOI_DA_XANH"], [/tôm/i, "TOM_THE"], [/cá tra/i, "CA_TRA"], [/lúa|gạo/i, "LUA_TUOI"], [/chanh/i, "CHANH_KHONG_HAT"]];
  const anhTin = (n) => { const k = KHOP.find(([r]) => r.test(n.tieu_de)); return k ? ANH_SP(k[1]) : null; };
  const laHoc = (n) => /kỹ thuật|cách |phòng trừ|bón|tưới|chăm sóc|bao trái|sâu bệnh/i.test(n.tieu_de);
  const tinThuong = ds.filter((n) => !laHoc(n)), hoc = ds.filter(laHoc);
  $("tab-tin").innerHTML = tinThuong.length ? tinThuong.map((n) => theTin(n, anhTin(n))).join("") : `<section class="m-the"><p style="margin:0">Chưa tải được tin tức. Bác thử lại sau.</p></section>`;
  $("tab-hoc").innerHTML = hoc.length ? hoc.map((n) => theTin(n, anhTin(n))).join("") : `<section class="m-the"><p style="margin:0;font-size:16px">Chưa có bài kỹ thuật mới cho mặt hàng của bác. Bác cần hỏi gì thì bấm Hỗ trợ để AgiViet giúp.</p></section>`;
}

mo().catch((e) => { $("tab-gia").innerHTML = `<section class="m-the"><p style="margin:0">Không tải được: ${esc(e.message)}</p></section>`; }).finally(() => { giuThamSo(); $("noi").setAttribute("aria-busy", "false"); });
