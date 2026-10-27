// Tạo dữ liệu trình diễn cho app bán (chị Năm) bằng bộ tạo tình huống của quản trị.
// Chạy trên máy có backend thử ở 127.0.0.1:8080: node frontend/scripts/tao-du-lieu-trinh-dien.mjs
// Chỉ dùng tiền ảo, ngân hàng ảo; không gọi dịch vụ thật.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.API_ORIGIN || "http://127.0.0.1:18080";

// Môi trường trình duyệt tối thiểu cho case-engine.
const kho = new Map();
globalThis.localStorage = { getItem: (k) => kho.get(k) ?? null, setItem: (k, v) => kho.set(k, String(v)), removeItem: (k) => kho.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;
const fetchGoc = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.endsWith("/frontend-capabilities.json")) return new Response(JSON.stringify({ test_tools: true }), { headers: { "content-type": "application/json" } });
  if (u.startsWith("/quan-tri/")) return new Response(fs.readFileSync(path.join(goc, u)));
  return fetchGoc(u.startsWith("/") ? BASE + u : u, init);
};

const { Api } = await import("../shared/api.js");
const { createCase } = await import("../quan-tri/case-engine.js");
const api = new Api({ base: "", deviceId: "tao-du-lieu-trinh-dien", storage: globalThis.sessionStorage });

const accounts = await api.get("/v1/test/accounts");
const tim = (phone) => {
  const a = accounts.find((x) => x.phone === phone);
  if (!a) throw new Error("Không thấy tài khoản " + phone);
  return a;
};
const chiNam = tim("0918000421");
const banMua = accounts.filter((a) => a.can_buy && a.org_code && a.org_code !== chiNam.org_code);
const dongXanh = banMua.find((a) => a.phone === "0909000210") || banMua[0];
const muaDuoc = (a) => /purchaser|owner/.test(a.roles || "");
const khac = banMua.find((a) => a.org_code !== dongXanh.org_code && muaDuoc(a)) || dongXanh;

// [mẫu, bên mua, mặt hàng, loại, lượng kg, giá đ/kg]
const danhSach = [
  // Đơn chạy trước, lời chào tạo cuối cùng để không bị đồng hồ thử làm hết hạn.
  ["completed", khac, "XOAI_CAT_CHU", "L1", "2000", "23000"],
  ["checking", khac, "BUOI_DA_XANH", null, "800", "32000"],
  ["active", khac, "XOAI_CAT_CHU", "L1", "800", "23500"],
  ["deposit", dongXanh, "XOAI_CAT_CHU", "L1", "1000", "24000"],
  ["offer", dongXanh, "XOAI_CAT_CHU", "L1", "2000", "23000"],
  ["offer", khac, "CHANH_KHONG_HAT", null, "1500", "14000"],
];
const products = await api.get("/v1/products").catch(() => []);
const loaiDau = (code) => {
  const p = (products || []).find((x) => x.code === code);
  return p?.grades?.[0]?.code || p?.grade_codes?.[0] || "L1";
};

const chi = process.env.CHI ? process.env.CHI.split(",") : null;
for (const [template, buyer, product, grade, qty, price] of danhSach.filter(([t]) => !chi || chi.includes(t))) {
  try {
    const r = await createCase(api, { template, seller: chiNam, buyer, product, grade: grade || loaiDau(product), qty, price, plate: { completed: "66C-678.90", checking: "66C-123.45" }[template] || "66C-678.90" });
    console.log("ĐẠT", template, product, r.orderId || r.offerId);
  } catch (e) {
    const ban = JSON.parse(localStorage.getItem("agv-local-test-cases-v1") || "[]")[0];
    console.log("LỖI", template, product, "ở bước:", ban?.step, "·", e.message, e.code || "", "· bên mua", buyer.phone, buyer.roles, JSON.stringify(e.details || e.fix || ""));
  }
}
