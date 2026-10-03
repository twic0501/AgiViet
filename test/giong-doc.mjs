// Nút Nghe của app Nhà sản xuất: mọi màn có lời đọc cố định phải phát giọng thu sẵn (assets/giong/<mã>.mp3),
// thẻ hướng dẫn và hướng dẫn chỉ tay cũng vậy; câu không có sẵn thì quay về giọng của máy.
// node test/giong-doc.mjs [base]
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8768';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => {
  window.__phat = []; window.__may = [];
  const goc = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { window.__phat.push(this.src.split('/').pop()); return goc.call(this).catch(() => {}); };
  if (window.speechSynthesis) speechSynthesis.speak = u => { window.__may.push(u.text.slice(0, 40)); };
});
const p = await ctx.newPage();
const loi = []; p.on('pageerror', e => loi.push(e.message));
const thieu = [], hong = [];
let soMan = 0, coSan = 0;
await p.goto(base + '/'); await p.evaluate(() => { localStorage.setItem('am.da-xem-hd', '1'); });
for (const trang of ['bat-dau', 'hang', 'dang', 'khach', 'giao-dich', 'lich', 'tien', 'toi']) {
  await p.goto(`${base}/ban/${trang}.html`); await p.waitForTimeout(500);
  const ids = await p.evaluate(() => [...document.querySelectorAll('.screen[data-read]')].map(s => s.id));
  for (const id of ids) {
    await p.evaluate(h => { location.hash = h; }, '#' + id); await p.waitForTimeout(250);
    const truoc = await p.evaluate(() => window.__phat.length);
    const nut = p.locator(`#${id} .nghe`).first();
    if (!(await nut.count())) continue;
    await nut.click(); await p.waitForTimeout(150);
    soMan++;
    const phat = await p.evaluate(n => window.__phat.slice(n), truoc);
    if (phat.length) { coSan++; const r = await p.request.get(`${base}/ban/assets/giong/${phat[0]}`); if (!r.ok() || (await r.body()).length < 2000) hong.push(phat[0]); }
    else thieu.push(`${trang}#${id}`);
    await nut.click().catch(() => {}); await p.waitForTimeout(80);   // bấm lần nữa để dừng
  }
}
// Thẻ hướng dẫn và một bước hướng dẫn chỉ tay
await p.evaluate(() => localStorage.removeItem('am.da-xem-hd'));
await p.goto(base + '/ban/hang.html#hang'); await p.waitForTimeout(900);
let n0 = await p.evaluate(() => window.__phat.length);
await p.locator('.hd-nghe').click(); await p.waitForTimeout(200);
const hdOk = (await p.evaluate(() => window.__phat.length)) > n0;
await p.locator('.hd-bo').click();
await p.evaluate(() => window.moTour('dang')); await p.waitForTimeout(900);
n0 = await p.evaluate(() => window.__phat.length);
await p.locator('.tour-the [data-tour="nghe"]').click(); await p.waitForTimeout(200);
const tourOk = (await p.evaluate(() => window.__phat.length)) > n0;
await p.locator('.tour-the [data-tour="bo"]').click();
// Câu không có sẵn → giọng của máy
const may0 = await p.evaluate(() => window.__may.length);
await p.evaluate(() => window.amDoc('Câu này không có trong danh sách thu sẵn ' + Date.now()));
const mayOk = (await p.evaluate(() => window.__may.length)) > may0;
await b.close();
const kq = [
  ['Màn có giọng thu sẵn', coSan === soMan && soMan > 50, `${coSan}/${soMan} màn${thieu.length ? ' · thiếu: ' + thieu.join(', ') : ''}`],
  ['Tệp giọng tải được', !hong.length, hong.length ? 'hỏng: ' + hong.join(', ') : 'mọi tệp đã phát đều tải được, > 2 KB'],
  ['Thẻ hướng dẫn', hdOk, 'nút Nghe trên thẻ hướng dẫn phát giọng thu sẵn'],
  ['Hướng dẫn chỉ tay', tourOk, 'nút Nghe trong khung hướng dẫn phát giọng thu sẵn'],
  ['Câu không có sẵn', mayOk, 'quay về giọng của máy'],
];
for (const [id, dat, ct] of kq) console.log(`${dat ? 'ĐẠT ' : 'LỖI '} ${id.padEnd(24)} ${ct}`);
console.log(`\n${kq.filter(x => x[1]).length}/${kq.length} đạt; lỗi JS: ${loi.length ? loi.join(' | ') : 'không'}`);
process.exitCode = kq.every(x => x[1]) && !loi.length ? 0 : 1;
