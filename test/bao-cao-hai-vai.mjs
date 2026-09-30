// Chạy lại các bước tái hiện trong "Kiểm thử hai vai 30/09/2026" trên bản hosting tĩnh.
// node test/bao-cao-hai-vai.mjs [base]   (mặc định http://127.0.0.1:8768)
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8768';
const kq = [];
const ghi = (id, dat, chiTiet) => kq.push({ id, dat, chiTiet });
const b = await chromium.launch();
const loi = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
p.on('pageerror', e => loi.push(e.message));
const cho = ms => p.waitForTimeout(ms);
const toast = async () => (await p.locator('.toast').textContent() || '').trim();
const di = async (u, ms = 700) => { await p.goto(base + u); await cho(ms); };
const bamNut = async sel => { await p.locator(sel).first().click(); await cho(350); };

// Hướng dẫn lần đầu (bán)
await di('/ban/hang.html#hang', 1200);
ghi('HD-ban', await p.locator('#hd-lop').isVisible(), 'Hướng dẫn tự hiện lần đầu vào Hàng');
for (let i = 0; i < 4; i++) await bamNut('.hd-tiep');
await bamNut('.hd-tiep');
ghi('HD-ban-dong', !(await p.locator('#hd-lop').count()), 'Bấm hết 5 bước thì đóng; không hiện lại');
ghi('Mô phỏng', await p.locator('.screen.active .dai-mo-phong').isVisible(), await p.locator('.screen.active .dai-mo-phong').innerText().catch(() => ''));

// P0-01
await di('/ban/bat-dau.html#dang-nhap');
await p.fill('#sdt', '');
await bamNut('#dang-nhap .bottom-actions a.btn');
ghi('P0-01a', p.url().endsWith('#dang-nhap'), 'SĐT trống → ' + await toast());
await di('/ban/bat-dau.html#otp');
await bamNut('#otp .bottom-actions a.btn');
ghi('P0-01b', p.url().endsWith('#otp'), 'OTP trống → ' + await toast());
await di('/ban/bat-dau.html#xac-minh');
ghi('P0-01c', !(await p.locator('#xac-minh').innerText()).includes('Đã xác minh hôm nay'), 'Màn xác minh không khẳng định đã xác minh');
// P0-02
await di('/ban/giao-dich.html#ky-otp');
await bamNut('#ky-otp .bottom-actions a.btn');
ghi('P0-02a', p.url().endsWith('#ky-otp'), 'Mã ký trống → ' + await toast());
await di('/ban/giao-dich.html#ky-xong');
ghi('P0-02b', await p.locator('#av-nhan-ky').isVisible(), 'Hoàn tất ký có nhãn mô phỏng');
// P0-03
await di('/ban/toi.html#tai-khoan-nhan');
await p.locator('#tai-khoan-nhan a.btn', { hasText: 'Không phải tôi' }).click(); await cho(400);
ghi('P0-03', p.url().endsWith('#tai-khoan-nhan') && (await p.locator('#tai-khoan-nhan').innerText()).includes('Đã khóa'), 'Khóa hiện ngay trên màn');
// P0-04
await di('/ban/giao-dich.html#phuong-thuc');
await p.locator('[data-chon="cach"] [data-khi="ho-tro"]').click();
await p.locator('[data-chon="ai-tra"] [data-khi="toi"]').click();
await bamNut('#phuong-thuc .bottom-actions a.btn');
ghi('P0-04a', p.url().endsWith('#phuong-thuc'), 'Có hỗ trợ khi giá chưa chốt → ' + await toast());
await p.locator('[data-chon="cach"] [data-khi="tu"]').click();
await bamNut('#phuong-thuc .bottom-actions a.btn');
ghi('P0-04b', p.url().endsWith('#chon-luong'), 'Tự giao dịch đi tiếp được');

// P1-01
await di('/ban/hang.html#hang');
await p.locator('[data-lo-mau="thanh-long"]').first().click(); await cho(600);
ghi('P1-01', (await p.locator('#chi-tiet-lo h1').textContent()).includes('Thanh long'), 'Bấm thanh long mở: ' + await p.locator('#chi-tiet-lo h1').textContent());
// P1-03 bán bớt
await di('/ban/hang.html#hang');
await p.locator('[data-lo-mau="xoai"]').first().click(); await cho(500);
await bamNut('#chi-tiet-lo a[href="#cap-nhat-luong"]');
await p.locator('#dem-luong [data-buoc="-0.5"]').click(); await cho(200);
const conLai = await p.locator('#dem-luong [data-gia-tri]').textContent();
await bamNut('#cap-nhat-luong .bottom-actions a.btn'); await cho(400);
ghi('P1-03', (await p.locator('#chi-tiet-lo').innerText()).includes(`${conLai} tấn`), `Bớt 0,5 tấn → chi tiết còn ${conLai} tấn`);
// P1-02 đăng lô: chọn mặt hàng, giá 0 bị chặn, giá hợp lệ → lô mới xuất hiện
await p.evaluate(() => localStorage.setItem('am.hang.dang', 'longan'));
await di('/ban/dang.html#kiem-tra');
await p.locator('[data-chon="gia"] [data-khi="tu"]').click().catch(() => {});
await p.fill('#gia-moi-ky', '0');
await bamNut('#kiem-tra .bottom-actions a, #kiem-tra .bottom-actions button');
ghi('P1-02a', p.url().endsWith('#kiem-tra'), 'Giá 0 → ' + await toast());
await p.fill('#gia-moi-ky', '25000');
await di('/ban/dang.html#xem-lai');
await p.fill('#av-luong', '2');
const tenXemLai = await p.locator('#xem-lai strong.num').textContent();
await bamNut('#xem-lai a.btn[href="#xong"]'); await cho(300);
await di('/ban/hang.html#hang');
const lan = await p.locator('#hang article.card.lo').allInnerTexts();
ghi('P1-02b', tenXemLai.includes('Nhãn') && lan.some(t => t.includes('Nhãn') && t.includes('2 tấn')), `Xem lại: ${tenXemLai}; Hàng có lô mới: ${lan.find(t => t.includes('Nhãn'))?.replace(/\s+/g, ' ').slice(0, 60)}`);
// P1-06 chat đúng khách
await di('/ban/khach.html#ket-noi');
await bamNut('#ket-noi .bottom-actions a.btn[href="#chat"]'); await cho(300);
ghi('P1-06', (await p.locator('#chat .chat-dau .ten strong').textContent()).includes('Bên mua D'), 'Chat mở với ' + await p.locator('#chat .chat-dau .ten strong').textContent());
// P1-10 cọc
await di('/ban/giao-dich.html#coc');
await p.locator('#coc button', { hasText: 'Chưa thấy tiền' }).click(); await cho(300);
await di('/ban/tien.html#tien');
ghi('P1-10', (await p.locator('#tien').innerText()).includes('chưa thấy tiền cọc'), 'Tiền hàng phản ánh cọc chưa thấy');

// Bên mua
const pm = await ctx.newPage(); await pm.setViewportSize({ width: 1280, height: 900 });
pm.on('pageerror', e => loi.push('mua: ' + e.message));
const choM = ms => pm.waitForTimeout(ms);
const toastM = async () => (await pm.locator('.toast').textContent() || '').trim();
await pm.goto(base + '/mua/tong-quan.html?goi=free#tong-quan'); await choM(1200);
ghi('HD-mua', await pm.locator('#hd-lop').isVisible(), 'Hướng dẫn bên mua tự hiện lần đầu');
await pm.locator('.hd-bo').click(); await choM(200);
await pm.goto(base + '/mua/nguon-hang.html?goi=free#nguon-hang'); await choM(900);
const loMoi = await pm.locator('#nguon-hang .luoi.l2 article', { hasText: 'Nhãn' }).count();
ghi('Hai vai', loMoi === 1, 'Lô nhãn chị Năm vừa đăng hiện bên mua: ' + loMoi);
await pm.selectOption('#l-mh', { label: 'Mít Thái' }); await choM(300);
ghi('P1-04', (await pm.locator('#nguon-hang p.nho.muted').first().innerText()).startsWith('0 lô') && await pm.locator('#av-rong').isVisible(), 'Lọc Mít Thái → ' + await pm.locator('#nguon-hang p.nho.muted').first().innerText());
await pm.goto(base + '/mua/nguon-hang.html?goi=bus#nguon-hang'); await choM(900);
await pm.locator('#nguon-hang article:not([hidden]) [data-luot="ket-noi"]').first().click(); await choM(300);
const tb = await toastM();
ghi('P1-05', /18 đã dùng \+ 4 đang giữ = 22\/50, còn 28/.test(tb), tb);
await pm.goto(base + '/mua/nhu-cau.html?goi=free#tao-nhu-cau'); await choM(700);
await pm.fill('#luong', '-2');
await pm.locator('#tao-nhu-cau [data-luot="tin"]').first().click(); await choM(300);
ghi('P1-07', /lớn hơn 0/.test(await toastM()) && !(await pm.locator('.hop-thoai, dialog[open]').count()), 'Lượng -2 → ' + await toastM());
await pm.goto(base + '/mua/don-hang.html?goi=free#nghiem-thu'); await choM(700);
await pm.fill('#nt-nhan', '7.000'); await pm.locator('#nghiem-thu .btn.lon').click(); await choM(300);
ghi('P1-08a', /vượt lượng giao/.test(await toastM()), await toastM());
await pm.fill('#nt-nhan', '5.900'); await pm.locator('#nt-nhan').dispatchEvent('input'); await choM(200);
ghi('P1-08b', (await pm.locator('#dong-nhan-dot2').textContent()).startsWith('5.900'), 'Xem trước theo ô nhập: ' + await pm.locator('#dong-nhan-dot2').textContent() + ' → ' + await pm.locator('#tong-dot2').textContent());
await pm.goto(base + '/mua/cong-no.html?goi=free#ghi-thanh-toan'); await choM(700);
await pm.fill('#tt-tien', '0'); await pm.locator('#ghi-thanh-toan .btn.chi-free').click(); await choM(300);
ghi('P1-09', /lớn hơn 0/.test(await toastM()), 'Tiền 0 → ' + await toastM());
await pm.goto(base + '/mua/goi.html?goi=free#nang-cap'); await choM(500);
ghi('P1-12', (await pm.locator('#nang-cap').innerText()).includes('23/31') && !(await pm.locator('#nang-cap').innerText()).includes('8/11'), 'Kỳ Business theo tháng dương lịch');

await b.close();
for (const r of kq) console.log(`${r.dat ? 'ĐẠT ' : 'LỖI '} ${r.id.padEnd(12)} ${r.chiTiet}`);
console.log(`\n${kq.filter(r => r.dat).length}/${kq.length} đạt; lỗi JS: ${loi.length ? loi.join(' | ') : 'không'}`);
