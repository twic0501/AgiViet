// Phần dùng chung cho các màn mẫu app bán: định dạng, phiên thử, tải dữ liệu, ảnh sản phẩm, chặng hợp đồng.
export const LUOT = { seller: ["bac", "Bác"], buyer: ["cho", "Bên mua"], bank: ["tien", "Ngân hàng"], ops: ["cho", "AgiViet"], system: ["cho", "Hệ thống"] };
export const CHANG = ["Chào giá", "Ký", "Cọc", "Giao", "Nhận tiền"];

export const tien = (v) => {
  const n = Number(v || 0);
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  return `${n.toLocaleString("vi-VN")} đ`;
};
export const can = (g) => {
  const kg = Number(g || 0) / 1000;
  return kg >= 1000 ? [(kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }), "tấn"] : [kg.toLocaleString("vi-VN", { maximumFractionDigits: 0 }), "kg"];
};
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Ảnh sản phẩm theo mã mặt hàng (ảnh thật trong /assets/products); chưa có ảnh thì dùng ảnh nhóm gần nhất.
const ANH = [[/XOAI/, "xoai-cat-chu"], [/SAU_RIENG|DURIAN/, "sau-rieng"], [/THANH_LONG|DRAGON/, "thanh-long"], [/TOM|SHRIMP/, "tom"],
  [/CA_PHE|COFFEE/, "ca-phe"], [/LUA|GAO|RICE/, "lua-gao"]];
export const ANH_SP = (ma) => `/assets/products/${(ANH.find(([m]) => m.test(ma || "")) || [, "xoai-cat-chu"])[1]}.jpg`;

// Chặng hiện tại của hợp đồng (0 chào giá … 4 nhận tiền) theo hien_thi.chang của backend, rơi về trạng thái.
export function chiSoChang(d) {
  const c = (d.hien_thi?.chang || "").toLowerCase();
  const theoTen = [["chào", 0], ["ký", 1], ["cọc", 2], ["giao", 3], ["nghiệm", 3], ["quyết", 4], ["tiền", 4]].find(([k]) => c.includes(k));
  if (theoTen) return theoTen[1];
  const s = d.status || "";
  return /draft|sign/.test(s) ? 1 : /deposit/.test(s) ? 2 : /deliver|ship|accept/.test(s) ? 3 : /settle|complet/.test(s) ? 4 : 1;
}

// "Chờ bên mua ký và gửi" / "Bác cần ký và gửi" — nói rõ ai làm
export const viecCho = (d) => {
  const l = d.hien_thi?.toi_luot;
  if (!l) return d.hien_thi?.ten || d.status;
  const viec = l.viec.charAt(0).toLowerCase() + l.viec.slice(1);
  return l.phia === d.phia_cua_ban ? `Bác cần ${viec}` : `Chờ ${(LUOT[l.phia]?.[1] || "bên kia").toLowerCase()} ${viec}`;
};

// Phiên thử: ?thu=<sđt> chỉ chạy ở môi trường thử (đăng nhập giả lập).
export async function phien() {
  const sdt = new URLSearchParams(location.search).get("thu");
  if (!sdt) throw new Error("Đăng nhập trước (màn Đăng nhập) hoặc thêm ?thu=<số điện thoại mẫu>.");
  const r = await fetch("/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt }) });
  if (!r.ok) throw new Error("Không mở được tài khoản thử.");
  return (await r.json()).token;
}

export async function layDuLieu(token) {
  const get = (d) => fetch(d, { headers: { authorization: "Bearer " + token } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${d}: ${r.status}`))));
  const [me, don, lo, tienTom, troi, sp] = await Promise.all([
    get("/v1/me"), get("/v1/orders"), get("/v1/lots?mine=true"), get("/v1/money/summary"),
    get("/v1/weather").catch(() => null), get("/v1/products").catch(() => []),
  ]);
  const tenSp = new Map((Array.isArray(sp) ? sp : sp.items || []).map((p) => [p.code, p.name_vi || p.name]));
  return { me, don, lo, tienTom, troi, tenSp };
}
