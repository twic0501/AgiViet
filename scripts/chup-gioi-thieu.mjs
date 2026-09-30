// Chụp màn hình thật của hai app cho trang giới thiệu (site/anh/*.jpg). Cần bản hosting đang chạy:
//   node scripts/build-hosting.js && (cd hosting-build && python3 -m http.server 8768) ; node scripts/chup-gioi-thieu.mjs [base]
import os from 'node:os'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const { chromium } = createRequire(os.homedir() + '/rnd idea/package.json')('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8768';
const thuMuc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site', 'anh');
fs.mkdirSync(thuMuc, { recursive: true });
const b = await chromium.launch();
const chuan = async (vp, scale) => { const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: scale })).newPage(); await p.goto(base + '/'); await p.evaluate(() => { localStorage.setItem('am.da-xem-hd', '1'); localStorage.setItem('tm.da-xem-hd', '1'); }); return p; };
const an = p => p.addStyleTag({ content: '.dai-mo-phong{display:none!important}' });   // ẩn dải “mô phỏng” trong ảnh chụp
const dt = await chuan({ width: 390, height: 780 }, 2);
for (const [ten, u] of [['ban-hang', '/ban/hang.html#hang'], ['ban-so-sanh', '/ban/giao-dich.html#so-sanh'], ['ban-tien', '/ban/tien.html#tien'], ['ban-dang', '/ban/dang.html#dang']]) {
  await dt.goto(base + u); await dt.waitForTimeout(700); await an(dt);
  await dt.screenshot({ path: path.join(thuMuc, ten + '.jpg'), type: 'jpeg', quality: 82 });
}
// Một bước hướng dẫn chỉ tay
await dt.goto(base + '/ban/dang.html#dang'); await dt.waitForTimeout(600); await an(dt);
await dt.evaluate(() => { sessionStorage.setItem('av.tour', JSON.stringify({ ten: 'dang', i: 1 })); }); await dt.reload(); await dt.waitForTimeout(1200); await an(dt);
await dt.screenshot({ path: path.join(thuMuc, 'ban-tour.jpg'), type: 'jpeg', quality: 82 });
await dt.evaluate(() => sessionStorage.clear());
const mt = await chuan({ width: 1280, height: 800 }, 1.5);
for (const [ten, u] of [['mua-nguon', '/mua/nguon-hang.html?goi=bus#nguon-hang'], ['mua-doi-soat', '/mua/don-hang.html?goi=bus#doi-soat'], ['mua-tong-quan', '/mua/tong-quan.html?goi=bus#tong-quan']]) {
  await mt.goto(base + u); await mt.waitForTimeout(800); await an(mt);
  await mt.screenshot({ path: path.join(thuMuc, ten + '.jpg'), type: 'jpeg', quality: 80 });
}
await b.close();
console.log('Đã chụp vào', thuMuc, fs.readdirSync(thuMuc).join(', '));
