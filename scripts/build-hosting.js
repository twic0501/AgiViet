// Đóng gói giao diện cho Firebase Hosting (bản tĩnh, chưa có backend):
//   hosting-build/ban/ ← fe-nongdan/, hosting-build/mua/ ← fe-thumua/ (trong kho), hosting-build/ ← site/ (trang giới thiệu; không có thì trang chọn app)
// Bỏ file .md (ghi chú nội bộ) và file ẩn; chèn <meta name="agiviet-api" content="off"> để app không gọi API.
// Chạy: node scripts/build-hosting.js   (FE_BAN, FE_MUA để đổi thư mục nguồn; API=on để bỏ cờ tắt API)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dich = path.join(goc, 'hosting-build');
// Mặc định lấy giao diện trong kho (fe-nongdan/, fe-thumua/); không có thì lấy thư mục cũ ở thư mục nhà
const nguonMacDinh = ten => (fs.existsSync(path.join(goc, ten, 'index.html')) ? path.join(goc, ten) : path.join(os.homedir(), ten));
const NGUON = [['ban', process.env.FE_BAN || nguonMacDinh('fe-nongdan')], ['mua', process.env.FE_MUA || nguonMacDinh('fe-thumua')]];
const tatApi = process.env.API !== 'on';

fs.rmSync(dich, { recursive: true, force: true });
let soFile = 0;
function chep(tu, den) {
  for (const ten of fs.readdirSync(tu)) {
    if (ten.startsWith('.') || ten.endsWith('.md')) continue;
    const a = path.join(tu, ten), b = path.join(den, ten);
    if (fs.statSync(a).isDirectory()) { chep(a, b); continue; }
    fs.mkdirSync(den, { recursive: true });
    if (ten.endsWith('.html') && tatApi) fs.writeFileSync(b, fs.readFileSync(a, 'utf8').replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="agiviet-api" content="off">'));
    else fs.copyFileSync(a, b);
    soFile++;
  }
}
for (const [muc, nguon] of NGUON) {
  if (!fs.existsSync(path.join(nguon, 'index.html'))) throw new Error('Không thấy giao diện ở ' + nguon);
  chep(nguon, path.join(dich, muc));
}
fs.writeFileSync(path.join(dich, 'index.html'), `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgiViet · Kết nối nông sản, thủy sản</title>
<meta name="description" content="AgiViet kết nối người bán nông sản, thủy sản với bên thu mua. Bản giao diện thử nghiệm.">
<link rel="icon" href="/ban/assets/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="/ban/css/fonts.css">
<style>
  :root { --reu: #235c45; --muc: #233c31; --nang: #f0deae; --suong: #f7f8f2; --vien: #dfe5d8; --song: #315c60; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background: var(--suong); color: var(--muc); font: 16px/1.5 'Be Vietnam Pro', system-ui, sans-serif; }
  main { width: min(760px, 100%); display: flex; flex-direction: column; gap: 22px; }
  .dau { display: flex; align-items: center; gap: 12px; }
  .dau img { width: 52px; height: 52px; }
  .dau strong { font: 800 34px/1 'Baloo 2', sans-serif; }
  .dau strong span { color: #0e93b5; }
  h1 { margin: 0; font: 800 clamp(28px, 6vw, 40px)/1.1 'Baloo 2', sans-serif; }
  p { margin: 0; color: #4a5d52; }
  .luoi { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
  a.the { display: flex; flex-direction: column; gap: 8px; padding: 22px; border-radius: 22px; text-decoration: none; color: #fff; min-height: 170px; }
  a.the strong { font: 800 26px/1.1 'Baloo 2', sans-serif; }
  a.the span { opacity: .9; }
  a.the em { margin-top: auto; font-style: normal; font-weight: 700; background: #ffffff26; align-self: flex-start; padding: 8px 14px; border-radius: 99px; }
  .ban { background: var(--reu); } .mua { background: var(--song); }
  a.the:focus-visible { outline: 3px solid #f5b83d; outline-offset: 3px; }
  .ghi { font-size: 13px; color: #6b7c70; }
</style>
</head>
<body>
<main>
  <div class="dau"><img src="/ban/assets/mark.svg" alt=""><strong>Agi<span>Viet</span></strong></div>
  <h1>Tìm đúng mối, chốt đúng giá.</h1>
  <p>Chọn app phù hợp với bạn.</p>
  <div class="luoi">
    <a class="the ban" href="/ban/"><strong>Nhà sản xuất</strong><span>Nông dân, chủ ao, hợp tác xã: đăng hàng bằng hình và giọng nói, xem tiền về tay.</span><em>Mở app bán →</em></a>
    <a class="the mua" href="/mua/"><strong>Thu mua</strong><span>Nhà máy, vựa, doanh nghiệp: tìm nguồn, quản lý đơn, công nợ và kế hoạch mua.</span><em>Mở app mua →</em></a>
  </div>
  <p class="ghi">Bản giao diện thử nghiệm: số liệu mẫu, chưa có giao dịch hay tiền thật.</p>
</main>
</body>
</html>
`);
// Service worker "tự hủy" thay PWA cũ của rnd idea (/sw.js phủ cả site): xóa cache, gỡ đăng ký, tải lại trang
fs.writeFileSync(path.join(dich, 'sw.js'), `// Gỡ service worker của bản cũ (rnd idea) để người dùng cũ thấy giao diện mới.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
`);
fs.writeFileSync(path.join(dich, 'registerSW.js'), `// Bản cũ gọi file này; giờ chỉ gỡ service worker còn sót.
if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
`);
// Trang giới thiệu sản phẩm (site/) thay cho trang chọn app ở gốc, nếu có
const site = path.join(goc, 'site');
if (fs.existsSync(path.join(site, 'index.html'))) chep(site, dich);
console.log(`Đã đóng gói ${soFile} file vào ${path.relative(goc, dich)}/ (API ${tatApi ? 'tắt' : 'bật'}${fs.existsSync(site) ? ', có trang giới thiệu' : ''}).`);
