// Chạy trọn các hướng dẫn chỉ tay (js/tour.js) như người dùng: bước “xem” bấm Tiếp, bước “bấm” bấm vào giữa ô đang sáng.
// Kiểm: mỗi bước tìm thấy nút thật, bấm ra ngoài bị chặn, đi hết tour thì tắt. node test/tour.mjs [base]
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8768';
const out = process.env.ANH_TOUR || '';
const b = await chromium.launch();
const kq = [], loi = [];
for (const [app, dau, ds, vp] of [['ban', '/ban/hang.html#hang', ['dang', 'khach', 'tien'], { width: 390, height: 844 }], ['mua', '/mua/tong-quan.html?goi=bus#tong-quan', ['nguon', 'nhu-cau', 'tra-tien'], { width: 1280, height: 860 }]]) {
  for (const ten of ds) {
    const p = await (await b.newContext({ viewport: vp })).newPage();
    p.on('pageerror', e => loi.push(`${ten}: ${e.message}`));
    await p.goto(base + '/'); await p.evaluate(() => { localStorage.setItem('am.da-xem-hd', '1'); localStorage.setItem('tm.da-xem-hd', '1'); });
    await p.goto(base + dau); await p.waitForTimeout(800);
    await p.evaluate(t => window.moTour(t), ten);
    const buoc = [], thieu = [];
    let chan = null;
    for (let k = 0; k < 20; k++) {
      await p.waitForTimeout(900);
      const tt = await p.evaluate(() => sessionStorage.getItem('av.tour'));
      if (!tt) break;
      const the = p.locator('.tour-the');
      if (!(await the.count())) continue;
      const chu = (await the.innerText()).replace(/\s+/g, ' ');
      const r = await p.locator('.tour-lo').evaluate(e => e.style.display === 'none' ? null : e.getBoundingClientRect().toJSON());
      if (!r) thieu.push(chu.slice(0, 60));
      buoc.push(chu.match(/bước (\d+)\/(\d+)/)?.[0]); if (process.env.IN_BUOC) console.log(ten, k, chu.slice(0, 110), JSON.stringify(r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]), p.url().split('/').pop());
      if (out && k === 1) await p.screenshot({ path: `${out}/tour-${ten}.png` });
      const tiep = p.locator('.tour-the [data-tour="tiep"]');
      if (await tiep.count()) { await tiep.click(); continue; }
      if (chan === null) {                                   // thử bấm ra ngoài: phải bị chặn, tour vẫn ở bước cũ
        await p.mouse.click(5, vp.height / 2); await p.waitForTimeout(300);
        chan = (await p.evaluate(() => sessionStorage.getItem('av.tour'))) === tt;
      }
      await p.mouse.click(r.x + r.width / 2, r.y + Math.min(r.height, 60) / 2);
    }
    const xong = !(await p.evaluate(() => sessionStorage.getItem('av.tour')));
    const tong = +(buoc.at(-1) || '0/0').split('/')[1];
    kq.push({ id: `${app}:${ten}`, dat: xong && !thieu.length && new Set(buoc).size === tong && chan !== false, chiTiet: `${new Set(buoc).size}/${tong} bước, hết tour=${xong}, bấm ngoài bị chặn=${chan}${thieu.length ? ' · KHÔNG THẤY NÚT: ' + thieu.join(' | ') : ''}` });
    await p.context().close();
  }
}
await b.close();
for (const r of kq) console.log(`${r.dat ? 'ĐẠT ' : 'LỖI '} ${r.id.padEnd(14)} ${r.chiTiet}`);
console.log(`\n${kq.filter(r => r.dat).length}/${kq.length} đạt; lỗi JS: ${loi.length ? loi.join(' | ') : 'không'}`);
process.exitCode = kq.every(r => r.dat) && !loi.length ? 0 : 1;
