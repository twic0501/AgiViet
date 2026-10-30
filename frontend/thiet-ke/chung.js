// Phần dùng chung cho các màn mẫu app bán: định dạng, phiên, tải dữ liệu, ảnh sản phẩm, chặng hợp đồng.
export const LUOT = { seller: ["bac", "Bác"], buyer: ["cho", "Bên mua"], bank: ["tien", "Ngân hàng"], ops: ["cho", "AgiViet"], system: ["cho", "Hệ thống"] };
export const CHANG = ["Chào giá", "Ký", "Cọc", "Giao", "Nhận tiền"];

// Tiền gọn cho thẻ ("41,4 triệu đ"); tienDu cho số đầy đủ (đặt ở title/aria để bác xem chính xác)
export const tien = (v) => {
  const n = Number(v || 0);
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ đ`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu đ`;
  return `${n.toLocaleString("vi-VN")} đ`;
};
export const tienDu = (v) => `${Number(v || 0).toLocaleString("vi-VN")} đồng`;
// Lượng: dưới 10 tấn ghi kg đầy đủ để không làm tròn mất hàng (1.049 kg không thành "1 tấn")
export const can = (g) => {
  const kg = Number(g || 0) / 1000;
  return kg >= 10000 ? [(kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }), "tấn"] : [kg.toLocaleString("vi-VN", { maximumFractionDigits: 0 }), "kg"];
};
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Số hữu hạn trong khoảng, sai thì null (không chèn chuỗi lạ vào HTML)
export const so = (v, min = -Infinity, max = Infinity) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };

// Ảnh minh họa theo mã mặt hàng (ảnh thật trong /assets/products); không khớp → null (giao diện dùng ô giữ chỗ trung tính)
const ANH = [[/XOAI/, "xoai-cat-chu"], [/SAU_RIENG|DURIAN/, "sau-rieng"], [/THANH_LONG|DRAGON/, "thanh-long"], [/TOM|SHRIMP/, "tom"],
  [/CA_PHE|COFFEE/, "ca-phe"], [/LUA|GAO|RICE/, "lua-gao"], [/BUOI|POMELO|CAM_|QUYT|CHANH/, "buoi"], [/VAI|NHAN|CHOM/, "vai"],
  [/CHUOI|BANANA/, "chuoi"], [/DUA_HAU|DUA_LUOI|MELON/, "dua-hau"], [/RAU|^CAI|XA_LACH/, "rau-cai"], [/KHOAI|CA_ROT/, "cu"],
  [/TIEU|PEPPER/, "ho-tieu"], [/DIEU|CASHEW/, "hat-dieu"], [/CA_TRA|BASA/, "ca-tra"], [/^CUA|CRAB/, "cua"]];
export const ANH_SP = (ma) => { const t = ANH.find(([m]) => m.test(ma || "")); return t ? `/assets/products/${t[1]}.jpg` : null; };

// Chặng hiện tại của hợp đồng (0 chào giá … 4 nhận tiền) theo hien_thi.chang của backend, rơi về trạng thái.
export function chiSoChang(d) {
  const c = (d.hien_thi?.chang || "").toLowerCase();
  const theoTen = [["chào", 0], ["ký", 1], ["cọc", 2], ["giao", 3], ["nghiệm", 3], ["quyết", 4], ["tiền", 4]].find(([k]) => c.includes(k));
  if (theoTen) return theoTen[1];
  const s = d.status || "";
  return /draft|sign/.test(s) ? 1 : /deposit/.test(s) ? 2 : /deliver|ship|accept/.test(s) ? 3 : /settle|complet/.test(s) ? 4 : 1;
}
// Hợp đồng còn đang chạy (bỏ đã xong/hủy/từ chối)
export const dangLam = (d) => !/complet|cancel|declin|withdrawn|reject|expired|closed/.test(d.status || "");

// "Chờ bên mua ký và gửi" / "Bác cần ký và gửi" — nói rõ ai làm
export const viecCho = (d) => {
  const l = d.hien_thi?.toi_luot;
  if (!l) return d.hien_thi?.ten || d.status;
  const viec = l.viec.charAt(0).toLowerCase() + l.viec.slice(1);
  return l.phia === d.phia_cua_ban ? `Bác cần ${viec}` : `Chờ ${(LUOT[l.phia]?.[1] || "bên kia").toLowerCase()} ${viec}`;
};

// Phiên: ưu tiên token thật từ đăng nhập OTP (lưu trong sessionStorage);
// chỉ khi không có mới dùng ?thu=<sđt> của môi trường thử (đăng nhập giả lập).
const KHOA_PHIEN = "agv-phien";
export const luuPhien = (token) => { try { sessionStorage.setItem(KHOA_PHIEN, token); } catch {} };
export async function phien() {
  try { const t = sessionStorage.getItem(KHOA_PHIEN); if (t) return t; } catch {}
  const sdt = new URLSearchParams(location.search).get("thu");
  if (!sdt) throw new Error("Bác đăng nhập trước nhé.");
  const r = await fetch("/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt }) });
  if (!r.ok) throw new Error("Không mở được tài khoản thử.");
  return (await r.json()).token;
}
// Giữ tham số thử (?thu=) trên mọi liên kết nội bộ khi chuyển màn
export function giuThamSo(goc = document) {
  const thu = new URLSearchParams(location.search).get("thu");
  if (!thu) return;
  goc.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((a) => {
    const u = new URL(a.getAttribute("href"), location.href); u.searchParams.set("thu", thu); a.href = u.pathname + u.search;
  });
}

// Tải dữ liệu; phần phụ lỗi thì đánh dấu loi (không giả làm rỗng)
export async function layDuLieu(token) {
  const get = (d) => fetch(d, { headers: { authorization: "Bearer " + token } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${d}: ${r.status}`))));
  const phu = (d) => get(d).catch(() => ({ __loi: true }));
  const [me, don, lo, tienTom, troi, sp] = await Promise.all([get("/v1/me"), get("/v1/orders"), get("/v1/lots?mine=true"), get("/v1/money/summary"), phu("/v1/weather"), phu("/v1/products")]);
  const tenSp = new Map((sp.__loi ? [] : Array.isArray(sp) ? sp : sp.items || []).map((p) => [p.code, p.name_vi || p.name]));
  return { me, don, lo, tienTom, troi, tenSp };
}
