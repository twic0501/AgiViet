// Nạp CSDL Postgres ngoài (Neon / Postgres 17 bất kỳ) cho bản đi thi, KHÔNG cần psql:
//   1) migrations (như db/scripts/migrate.sh: mỗi file một giao dịch, ghi schema_migrations, kiểm checksum file đã chạy)
//   2) dữ liệu chợ mẫu db/seed-cho (một lần; đánh dấu ở public.seed_da_nap, không đụng schema_migrations vì backend đếm bảng đó)
//   3) vai runtime (như infra/oracle/runtime-roles.sql + db/scripts/cap-quyen-cong.sql), đặt mật khẩu vai gateway.
// Dùng: OWNER_URL=postgres://<owner>@host/db  GATEWAY_PASSWORD=<mật khẩu vai gateway>  node infra/render/nap-csdl.mjs
// Mật khẩu chỉ đọc từ biến môi trường, không in ra. Backend sau đó nối bằng:
//   DATABASE_URL=postgres://agv_backend_gateway:<GATEWAY_PASSWORD>@host/db
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const goc = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const { Client } = createRequire(path.join(goc, "backend/package.json"))("pg");
const { OWNER_URL, GATEWAY_PASSWORD } = process.env;
if (!OWNER_URL || !GATEWAY_PASSWORD) { console.error("Cần OWNER_URL và GATEWAY_PASSWORD"); process.exit(2); }

const ssl = /neon\.tech|sslmode=require/.test(OWNER_URL) ? { rejectUnauthorized: true } : undefined;
const c = new Client({ connectionString: OWNER_URL, ssl });
await c.connect();
const tenDb = (await c.query("SELECT current_database() d")).rows[0].d;
const docThuMuc = (t) => readdirSync(path.join(goc, "db", t)).filter((f) => f.endsWith(".sql")).sort();
const tx = async (sql) => { await c.query("BEGIN"); try { await c.query(sql); await c.query("COMMIT"); } catch (e) { await c.query("ROLLBACK"); throw e; } };

// 1) migrations
await c.query("CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
const daChay = new Map((await c.query("SELECT name, sha256 FROM public.schema_migrations")).rows.map((r) => [r.name, r.sha256]));
let moi = 0;
for (const f of docThuMuc("migrations").filter((f) => /^\d{4}_/.test(f))) {
  const sql = readFileSync(path.join(goc, "db/migrations", f), "utf8"), sum = createHash("sha256").update(sql).digest("hex");
  if (daChay.has(f)) { if (daChay.get(f) !== sum) throw new Error(`Checksum migration ${f} đã đổi; viết migration mới`); continue; }
  await tx(`SELECT pg_advisory_xact_lock(768503210);\n${sql}\nINSERT INTO public.schema_migrations(name,sha256) VALUES(${c.escapeLiteral(f)},${c.escapeLiteral(sum)});`);
  moi++;
}
console.log(`migrations: chạy mới ${moi}, đã có ${daChay.size}`);

// 2) chợ mẫu (một lần)
await c.query("CREATE TABLE IF NOT EXISTS public.seed_da_nap(ten text PRIMARY KEY, luc timestamptz NOT NULL DEFAULT now())");
let seed = 0;
for (const f of docThuMuc("seed-cho")) {
  if ((await c.query("SELECT 1 FROM public.seed_da_nap WHERE ten=$1", [f])).rowCount) continue;
  await tx(`${readFileSync(path.join(goc, "db/seed-cho", f), "utf8")}\nINSERT INTO public.seed_da_nap(ten) VALUES(${c.escapeLiteral(f)});`);
  seed++;
}
console.log(`chợ mẫu: nạp mới ${seed} tệp`);

// 3) vai runtime — thay đúng hai lệnh psql của runtime-roles.sql (\getenv, \i)
// Neon: vai không phải superuser không được nhắc thuộc tính SUPERUSER (kể cả NOSUPERUSER); vai tạo ra vốn đã không phải superuser.
const capQuyen = readFileSync(path.join(goc, "db/scripts/cap-quyen-cong.sql"), "utf8").replace(":'gateway_password'", c.escapeLiteral(GATEWAY_PASSWORD)).replace(/ NOSUPERUSER\b/g, "");
const db = c.escapeIdentifier(tenDb);
// Không SET LOCAL log_statement: Neon/owner thường không có quyền (42501); máy tự quản thì dùng runtime-roles.sql.
await tx(`SELECT pg_advisory_xact_lock(768503212);
${capQuyen}
REVOKE CONNECT,TEMPORARY ON DATABASE ${db} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${db} TO agv_backend_gateway;
GRANT SELECT ON public.schema_migrations TO agv_backend_gateway,agv_backend_read;
ALTER ROLE agv_backend_gateway SET default_transaction_isolation='serializable';
ALTER ROLE agv_backend_gateway SET statement_timeout='15s';
ALTER ROLE agv_backend_gateway SET idle_in_transaction_session_timeout='30s';`);
console.log("vai runtime: xong (agv_backend_gateway)");

// 4) Chỉ bản thử (THU=1): vai ghi đồng hồ nghiệp vụ để nút tua giờ chạy — như chuanBiRuntime() của PGlite.
//    Production KHÔNG đặt THU (cap-quyen-cong.sql: không tạo agv_backend_clock, cmd.test_clock rỗng).
if (process.env.THU === "1") {
  await tx(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_clock') THEN CREATE ROLE agv_backend_clock NOLOGIN BYPASSRLS; END IF; END $$;
GRANT USAGE ON SCHEMA cmd TO agv_backend_clock;
GRANT SELECT,INSERT,UPDATE ON cmd.test_clock TO agv_backend_clock;
GRANT agv_backend_clock TO agv_backend_gateway WITH INHERIT FALSE;`);
  console.log("bản thử: vai đồng hồ agv_backend_clock");
}
await c.end();
