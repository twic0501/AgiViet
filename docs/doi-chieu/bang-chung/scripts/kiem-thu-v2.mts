// Chạy các tình huống kiểm thử 09 ở tầng API (fastify.inject), mỗi tình huống trên dữ liệu nền vừa đặt lại.
// In bảng đạt/tổng thật và ghi backend/test/ket-qua.json. Lọc: npx tsx test/chay-tinh-huong.ts TH-006 TH-019
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dungApp } from '../../../../backend/src/app.ts';
import { docCauHinh, THU_MUC_BACKEND } from '../../../../backend/src/cau-hinh.ts';
import { May, TinhHuong } from '../../../../backend/test/khung.ts';
import { DANH_SACH } from '../../../../backend/test/tinh-huong.ts';
import '../../../../backend/test/tinh-huong-2.ts';
import '../../../../backend/test/tinh-huong-3.ts';
import '../../../../backend/test/tinh-huong-4.ts';
import '../../../../backend/test/tinh-huong-5.ts';
import '../../../../backend/test/tinh-huong-6.ts';
import '../../../../backend/test/tinh-huong-7.ts';
import '../../../../backend/test/tinh-huong-8.ts';
import '../../../../backend/test/tinh-huong-9.ts';
import '../../../../backend/test/tinh-huong-10.ts';
import '../../../../backend/test/tinh-huong-11.ts';
import '../../../../backend/test/tinh-huong-12.ts';

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';
const cfg = docCauHinh();
cfg.databaseUrl = null; cfg.thuMucDb = null; cfg.thuMucTaiLieu = '/tmp/agv-audit-tai-lieu';
cfg.logLevel = process.env.LOG_LEVEL!;
const { app, ht } = await dungApp(cfg);
const may = new May(app, ht);
const loc = process.argv.slice(2);
const ketQua: any[] = [];
let datTH = 0; let tongTH = 0; let datBuoc = 0; let tongBuoc = 0;
for (const [ma, ten, fn] of DANH_SACH) {
  if (loc.length && !loc.includes(ma)) continue;
  const th = new TinhHuong(ma, ten);
  const t0 = Date.now();
  let loiChay: string | null = null;
  try { await may.datLai(); await fn(may, th); } catch (e: any) { loiChay = (String(e?.message ?? e) + (e?.chiTiet ? ' ' + JSON.stringify(e.chiTiet) : '')).slice(0, 600); }
  const dat = !loiChay && th.buoc.length > 0 && th.buoc.every((b) => b.dat);
  tongTH += 1; if (dat) datTH += 1;
  tongBuoc += th.buoc.length + (loiChay ? 1 : 0); datBuoc += th.buoc.filter((b) => b.dat).length;
  ketQua.push({ ma, ten, dat, ms: Date.now() - t0, loi: loiChay, buoc: th.buoc });
  console.log(`${dat ? 'ĐẠT ' : 'HỎNG'} ${ma} ${ten} (${th.buoc.filter((b) => b.dat).length}/${th.buoc.length} bước${loiChay ? ', lỗi: ' + loiChay : ''}) ${Date.now() - t0} ms`);
  for (const b of th.buoc.filter((x) => !x.dat)) console.log(`      x ${b.ten}: ${b.chi_tiet}`);
}
console.log(`\nTình huống đạt ${datTH}/${tongTH}; bước kiểm đạt ${datBuoc}/${tongBuoc}`);
writeFileSync(new URL('../du-lieu/kiem-thu-v2.json', import.meta.url), JSON.stringify({ luc: new Date().toISOString(), migrations: ht.db.danhSachMigration.length, tinh_huong_dat: datTH, tinh_huong_tong: tongTH, buoc_dat: datBuoc, buoc_tong: tongBuoc, ket_qua: ketQua }, null, 1));
await app.close();
await ht.db.dong();
process.exit(datTH === tongTH ? 0 : 1);
