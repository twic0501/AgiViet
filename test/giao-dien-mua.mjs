// Thử giao diện Thu mua nối API (server đang chạy với dữ liệu mẫu). node test/giao-dien-mua.mjs [base]
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8790';
const loi = [];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => loi.push('JS: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) loi.push('console: ' + m.text()); });
const cho = ms => p.waitForTimeout(ms);
const toast = async () => (await p.locator('.toast').textContent()).trim();

await p.goto(base + '/mua/tong-quan.html#tong-quan'); await cho(700);
console.log('1. Hộp đăng nhập hiện:', await p.locator('#dn-gui').isVisible());
await p.click('#dn-gui'); await cho(300);
await p.fill('#dn-ma', '123456'); await p.click('#dn-vao'); await cho(1500);
if (await p.locator('#hd-lop').isVisible()) { console.log('   Hướng dẫn lần đầu hiện → bỏ qua'); await p.click('.hd-bo'); await cho(200); }
console.log('2. Sau đăng nhập:', await p.locator('.sidebar .to-chuc strong').first().innerText(), '|', await p.locator('.topbar .nguoi-dung strong').innerText());
console.log('3. Hạn mức:', (await p.locator('.the-luot').innerText()).replace(/\n/g, ' / '));
console.log('4. KPI:', (await p.locator('.luoi.l4 .kpi .so').allTextContents()).join(', '));
await p.goto(base + '/mua/nguon-hang.html#nguon-hang'); await cho(1000);
console.log('5. Nguồn hàng:', await p.locator('#nguon-hang p.nho.muted strong').textContent(), '|', (await p.locator('#nguon-hang .luoi.l2 strong').allTextContents()).slice(0, 4).join(' || '));
const nut = p.locator('#nguon-hang [data-ket-noi]:not([disabled])').first();
if (await nut.count()) { await nut.click(); await cho(700); console.log('6. Kết nối khi hết lượt →', await toast()); }
await p.goto(base + '/mua/don-hang.html#don-hang'); await cho(1500);
console.log('7. Đơn:', (await p.locator('#don-hang tbody tr').allInnerTexts()).map(t => t.replace(/\s+/g, ' ')).join(' || '));
await p.goto(base + '/mua/cong-no.html#cong-no'); await cho(1000);
console.log('8. Hóa đơn phí:', (await p.locator('#cong-no .card').filter({ hasText: 'Hóa đơn phí dịch vụ' }).locator('tbody tr').allInnerTexts()).map(t => t.replace(/\s+/g, ' ')).join(' || '));
await p.goto(base + '/mua/cong-no.html#ghi-thanh-toan'); await cho(1200);
console.log('9. Ghi thanh toán: khoản =', await p.locator('#tt-khoan option').count(), '| TK =', await p.inputValue('#tt-tk'));
const opt = await p.locator('#tt-khoan option').allTextContents();
const i = opt.findIndex(t => t.includes('HĐ-0243'));
if (i >= 0) { await p.selectOption('#tt-khoan', { index: i }); await cho(800); console.log('10. HĐ-0243 (tài khoản vừa đổi):', await p.locator('#ghi-thanh-toan .bao.canh').isVisible() ? (await p.locator('#ghi-thanh-toan .bao.canh').innerText()).slice(0, 90) : 'không cảnh báo'); }
console.log('Lỗi trang:', loi.length ? loi : 'không');
await b.close();
