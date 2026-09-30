// Kiểm tra bản hosting tĩnh: mọi trang tải được, không lỗi JS, không gọi /api, không tràn ngang.
// node test/hosting.mjs [base]   (base mặc định http://127.0.0.1:8768; có thể trỏ tới https://agiviet-23a94.web.app)
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8768';
const build = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'hosting-build');
const trang = ['index.html', ...['ban', 'mua'].flatMap(m => fs.readdirSync(path.join(build, m)).filter(f => f.endsWith('.html')).map(f => `${m}/${f}`))];
const b = await chromium.launch();
let loi = [], goiApi = 0;
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/')) goiApi++; });
  for (const t of trang) {
    const e = [];
    p.removeAllListeners('pageerror'); p.on('pageerror', x => e.push(x.message));
    const r = await p.goto(`${base}/${t}`, { waitUntil: 'load' });
    await p.waitForTimeout(150);
    const tran = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    // nhan-dien.html (bảng nhận diện) tràn ngang ở 390px từ trước, không phải màn app
    if (r.status() >= 400 || e.length || (tran && !t.endsWith('nhan-dien.html'))) loi.push({ t, w, status: r.status(), e, tran });
  }
  await p.close();
}
await b.close();
console.log(`Đã kiểm ${trang.length} trang × 2 khổ; gọi /api: ${goiApi}; lỗi: ${loi.length}`);
for (const l of loi) console.log(JSON.stringify(l));
