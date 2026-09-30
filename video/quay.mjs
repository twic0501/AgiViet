// Quay trang sân khấu (video/san-khau.html) thành chuỗi khung hình có mốc thời gian, rồi ghép thành video 30 hình/giây.
// Cần: bản hosting đang chạy (node scripts/build-hosting.js; cd hosting-build && python3 -m http.server 8768)
// Chạy: node video/quay.mjs <thư mục có lich.json> [base]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const { chromium } = createRequire(os.homedir() + '/rnd idea/package.json')('playwright');
const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ra = path.resolve(process.argv[2] || path.join(goc, 'video', 'ra'));
const base = process.argv[3] || 'http://127.0.0.1:8768';
const lich = JSON.parse(fs.readFileSync(path.join(ra, 'lich.json'), 'utf8'));
// Đặt sân khấu vào bản hosting (không deploy thư mục này lên mạng: build lại là mất)
const dich = path.join(goc, 'hosting-build', 'video');
fs.mkdirSync(dich, { recursive: true });
fs.copyFileSync(path.join(goc, 'video', 'san-khau.html'), path.join(dich, 'san-khau.html'));
fs.copyFileSync(path.join(ra, 'lich.json'), path.join(dich, 'lich.json'));
const khung = path.join(ra, 'khung'); fs.rmSync(khung, { recursive: true, force: true }); fs.mkdirSync(khung);

const b = await chromium.launch({ args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--force-color-profile=srgb'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const loi = []; p.on('pageerror', e => loi.push(e.message)); p.on('console', m => { if (m.type() === 'error') loi.push('console: ' + m.text()); });
await p.goto(base + '/video/san-khau.html');
await p.waitForFunction(() => window.sanSang === true, null, { timeout: 60000 });
await p.waitForTimeout(800);
const cdp = await ctx.newCDPSession(p);
const ds = [];
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const f = `k${String(ds.length).padStart(6, '0')}.jpg`;
  fs.writeFileSync(path.join(khung, f), Buffer.from(data, 'base64'));
  ds.push({ f, ts: metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await p.waitForTimeout(600);
await p.evaluate(() => { window.__kq = window.batDau(); });
const t0 = (await p.evaluate(() => window.T0())) / 1000;
console.log('Đang quay', lich.tong_giay, 'giây…');
const kq = await p.evaluate(() => window.__kq, null);
await p.waitForTimeout(500);
await cdp.send('Page.stopScreencast');
await b.close();
console.log('Khung đã chụp:', ds.length, '· độ lệch:', kq.lech.length ? kq.lech : 'không', '· lỗi trang:', loi.length ? loi.slice(0, 5) : 'không');

// Ghép: mỗi khung giữ tới khi khung kế tiếp tới; cắt đúng [t0, t0 + tổng]
const T = lich.tong_giay;
const dau = Math.max(0, ds.findLastIndex(k => k.ts <= t0));
const dong = ['ffconcat version 1.0'];
for (let i = dau; i < ds.length; i++) {
  const bd = Math.max(ds[i].ts, t0) - t0, kt = Math.min(i + 1 < ds.length ? ds[i + 1].ts - t0 : T, T);
  if (kt <= bd) { if (bd >= T) break; continue; }
  dong.push(`file 'khung/${ds[i].f}'`, `duration ${(kt - bd).toFixed(4)}`);
  if (kt >= T) break;
}
dong.push(dong.at(-2));   // lặp khung cuối (quy ước của concat)
fs.writeFileSync(path.join(ra, 'khung.txt'), dong.join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(ra, 'khung.txt'),
  '-vf', 'fps=30,format=yuv420p', '-t', String(T), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', path.join(ra, 'hinh.mp4')], { stdio: 'inherit' });
fs.writeFileSync(path.join(ra, 'quay-ket-qua.json'), JSON.stringify({ khung: ds.length, lech: kq.lech, loi, tong: kq.tong }, null, 1));
console.log('Đã ghép', path.join(ra, 'hinh.mp4'));
