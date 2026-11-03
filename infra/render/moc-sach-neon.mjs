// In mốc thời gian CSDL Neon vừa nạp xong chợ mẫu (sau migrations + seed-cho + vai runtime), và số đơn hiện có.
// Dùng để đặt lại nhánh production về đúng mốc sạch trước buổi thi (xem docs/trien-khai/vercel-render-neon.md).
// Chỉ ĐỌC. Đọc DATABASE_URL_UNPOOLED từ .env.local (không in chuỗi kết nối).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
const goc = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const env = Object.fromEntries(readFileSync(path.join(goc, ".env.local"), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const { Client } = createRequire(path.join(goc, "backend/package.json"))("pg");
const c = new Client({ connectionString: env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: true } });
await c.connect();
const r = (await c.query(`SELECT (SELECT max(luc) FROM public.seed_da_nap) seed_xong, (SELECT max(applied_at) FROM public.schema_migrations) mig_xong,
  (SELECT min(created_at) FROM core.orders) don_dau, (SELECT count(*) FROM core.orders) so_don,
  (SELECT min(created_at) FROM core.offers) chao_gia_dau, (SELECT count(*) FROM core.offers) so_chao_gia,
  (SELECT has_table_privilege('agv_backend_read','core.orders','SELECT')) vai_runtime_co`)).rows[0];
// Mốc sạch đề xuất: sau seed + vai runtime, trước lời chào giá/đơn đầu tiên của kiểm thử.
const dau = [r.chao_gia_dau, r.don_dau].filter(Boolean).map((x) => new Date(x).getTime());
// 2 giây trước hoạt động đầu: vai runtime chắc chắn đã có (backend phải chạy được mới chào giá được).
r.moc_sach_de_xuat = dau.length ? new Date(Math.min(...dau) - 2_000).toISOString() : "chưa có hoạt động: DB đang sạch";
await c.end();
console.log(JSON.stringify(r, null, 1));
