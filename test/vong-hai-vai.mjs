// Vòng giao dịch khép kín hai vai trên bản hosting tĩnh (kho mẫu chung localStorage "av.demo"):
// bên mua đăng nhu cầu → bên bán thấy → bên bán đăng lô → bên mua lọc, kết nối → bên bán đồng ý → bên mua tạo đơn
// → bên bán xác nhận → bên mua nhập cân → bên bán xác nhận → bên mua ghi trả → bên bán xác nhận đã nhận. Cùng một mã đơn.
// Kèm kiểm tra lỗi lần kiểm thử lại: lẫn lô (Bán bớt, HĐ-0232), bộ lọc “Lượng từ”, giá tham khảo, bộ đếm tin.
// node test/vong-hai-vai.mjs [base]   (mặc định http://127.0.0.1:8768)
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8768';
const kq = [];
const ghi = (id, dat, chiTiet) => kq.push({ id, dat: !!dat, chiTiet: String(chiTiet).replace(/\s+/g, ' ').slice(0, 160) });
const b = await chromium.launch();
const loi = [];
const ctx = await b.newContext();
const pb = await ctx.newPage(); await pb.setViewportSize({ width: 390, height: 844 });
const pm = await ctx.newPage(); await pm.setViewportSize({ width: 1280, height: 900 });
pb.on('pageerror', e => loi.push('bán: ' + e.message));
pm.on('pageerror', e => loi.push('mua: ' + e.message));
pb.on('console', m => { if (m.type() === 'error') loi.push('bán console: ' + m.text()); });
pm.on('console', m => { if (m.type() === 'error') loi.push('mua console: ' + m.text()); });
const cho = (p, ms) => p.waitForTimeout(ms);
const di = async (p, u, ms = 800) => { await p.goto(base + u); await cho(p, ms); };
const toast = async p => ((await p.locator('.toast').textContent()) || '').trim();
const bam = async (p, sel, ms = 400) => { await p.locator(sel).first().click(); await cho(p, ms); };
const chu = async (p, sel) => (await p.locator(sel).first().innerText().catch(() => '')) || '';
ctx.setDefaultTimeout(6000);
try {

// Trạng thái sạch, bỏ hướng dẫn lần đầu
await di(pb, '/', 300);
await pb.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('am.da-xem-hd', '1'); localStorage.setItem('tm.da-xem-hd', '1'); });

/* ---- Lỗi 1: lẫn dữ liệu lô ---- */
await di(pb, '/ban/hang.html#hang');
await bam(pb, '[data-lo-mau="thanh-long"]', 600);
await bam(pb, '#chi-tiet-lo a[href="#cap-nhat-luong"]');
const demTL = (await pb.locator('#dem-luong [data-gia-tri]').textContent()).trim();
ghi('Lô-1 bán bớt', demTL === '3,2', `Bán bớt thanh long bắt đầu từ ${demTL} tấn (lô 3,2 tấn)`);
await di(pb, '/ban/hang.html#hang');
await bam(pb, '[data-lo-mau="xoai"]', 600);
await bam(pb, '#chi-tiet-lo a[href="#cap-nhat-luong"]');
const demX = (await pb.locator('#dem-luong [data-gia-tri]').textContent()).trim();
ghi('Lô-2 bán bớt', demX === '10', `Bán bớt xoài bắt đầu từ ${demX} tấn`);
await di(pb, '/ban/lich.html#lich');
await pb.locator('#lich a.card.row', { hasText: 'Thanh long 2 tấn' }).click(); await cho(pb, 900);
const hd = await pb.locator('body').innerText();
ghi('Lô-3 HĐ-0232', hd.includes('HĐ-0232') && !hd.includes('HĐ-0231') && !/xoài/i.test(await chu(pb, '.screen.active')), 'Thẻ thanh long mở: ' + (hd.match(/HĐ-0\d+/g) || []).join(','));

/* ---- Bên mua đăng nhu cầu: lưu, đếm 1 lần, thông báo khớp ---- */
await di(pm, '/mua/nhu-cau.html?goi=bus#tao-nhu-cau');
const truoc = await chu(pm, '.the-luot');
await pm.selectOption('#mh', { label: 'Mít Thái' });
await pm.fill('#luong', '3');
await bam(pm, '#tao-nhu-cau [data-luot="tin"]', 500);
const tbTin = await toast(pm);
const sauDang = await chu(pm, '.the-luot');
ghi('Tin-1 thông báo', /Đã đăng N-015\. Đã dùng 8\/30/.test(tbTin) && /Tin mua mới\s*8\/30/.test(sauDang) && /Tin mua mới\s*7\/30/.test(truoc), `${tbTin} | thanh bên ${sauDang.match(/Tin mua mới\s*\d+\/30/)?.[0]}`);
await di(pm, '/mua/nhu-cau.html?goi=bus#nhu-cau');
ghi('Tin-2 sau tải lại', (await chu(pm, '#nhu-cau tbody')).includes('N-015') && /Tin mua mới\s*8\/30/.test(await chu(pm, '.the-luot')), 'Danh sách: ' + (await chu(pm, '#nhu-cau tbody tr')));
await di(pb, '/ban/khach.html#khach');
await bam(pb, '[data-chon="khach-tab"] [data-khi="can"]');
ghi('Tin-3 bên bán thấy', (await chu(pb, '.av-nhu-cau')).includes('N-015'), await chu(pb, '.av-nhu-cau'));

/* ---- Bên bán đăng lô Chanh dây 4 tấn; giá tham khảo đúng mặt hàng ---- */
await pb.evaluate(() => localStorage.setItem('am.hang.dang', 'passion-fruit'));
await di(pb, '/ban/dang.html#kiem-tra');
const gtk = await pb.locator('#kiem-tra').innerText();
ghi('Giá tham khảo', gtk.includes('Chưa có giá tham khảo cho Chanh dây') && !gtk.includes('Xoài cát Chu loại 1'), gtk.match(/Giá tham khảo[^\n]*\n[^\n]*/)?.[0]);
await pb.locator('[data-chon="gia"] [data-khi="tu"]').click().catch(() => {});
await pb.fill('#gia-moi-ky', '25000');
await di(pb, '/ban/dang.html#xem-lai');
await pb.fill('#av-luong', '4');
await bam(pb, '#xem-lai a.btn[href="#xong"]', 500);

/* ---- Bên mua: bộ lọc lượng, kết nối lô chị Năm ---- */
await di(pm, '/mua/nguon-hang.html?goi=bus#nguon-hang', 1000);
const loCD = pm.locator('#nguon-hang article.av-lo', { hasText: 'Chanh dây' });
await pm.fill('#l-luong', '5'); await pm.locator('#l-luong').dispatchEvent('input'); await cho(pm, 200);
const an5 = await loCD.isHidden(), sau4 = await pm.locator('#nguon-hang article', { hasText: 'Anh Sáu Lộc' }).first().isHidden();
await pm.fill('#l-luong', '3'); await pm.locator('#l-luong').dispatchEvent('input'); await cho(pm, 200);
ghi('Lọc lượng', an5 && sau4 && await loCD.isVisible(), `Từ 5 tấn: Chanh dây 4 t ẩn=${an5}, Anh Sáu Lộc 4 t ẩn=${sau4}; từ 3 tấn: hiện=${await loCD.isVisible()} · ${await chu(pm, '#nguon-hang p.nho.muted')}`);
await loCD.locator('[data-kn-lo]').click(); await cho(pm, 400);
const tbKn = await toast(pm);
ghi('Kết nối-1 giữ lượt', /18 đã dùng \+ 4 đang giữ = 22\/50/.test(tbKn), tbKn);
await di(pb, '/ban/khach.html#khach');
await bam(pb, '[data-chon="khach-tab"] [data-khi="cho"]');
const knBan = await chu(pb, '.av-ket-noi');
ghi('Kết nối-2 tới bên bán', knBan.includes('Nhà máy sấy Đồng Xanh') && knBan.includes('Chanh dây'), knBan);
await bam(pb, '[data-kn-dong-y]');
await di(pm, '/mua/nguon-hang.html?goi=bus#nguon-hang', 1000);
const theLuot = await chu(pm, '.the-luot');
ghi('Kết nối-3 đồng ý', await loCD.locator('[data-tao-don]').isVisible() && /19 đã dùng · 3 đang tạm giữ/.test(theLuot), 'Thanh bên: ' + theLuot.match(/Kết nối[^\n]*\n[^\n]*\n?[^\n]*/)?.[0]);

/* ---- Tạo đơn, hai bên xác nhận, cân, trả tiền: cùng một mã ---- */
await loCD.locator('[data-tao-don]').click(); await cho(pm, 200);
await loCD.locator('[data-don-gia]').fill('0');
await loCD.locator('[data-gui-don]').click(); await cho(pm, 300);
ghi('Đơn-0 chặn giá 0', /giá/.test(await toast(pm)) && !(await pm.evaluate(() => AV.doc().orders.length)), await toast(pm));
await loCD.locator('[data-don-gia]').fill('25000');
await loCD.locator('[data-gui-don]').click(); await cho(pm, 400);
const tbDon = await toast(pm);
const ma = tbDon.match(/HĐ-0\d+/)?.[0];
ghi('Đơn-1 tạo', ma === 'HĐ-0250', tbDon);
await di(pb, '/ban/lich.html#lich');
const theDonBan = pb.locator(`.av-don[data-don="${ma}"]`);
ghi('Đơn-2 bên bán thấy', (await theDonBan.innerText()).includes('Chanh dây') && (await theDonBan.innerText()).includes('4.000 kg'), await theDonBan.innerText());
await theDonBan.locator('[data-don-xn]').click(); await cho(pb, 400);
await di(pm, '/mua/don-hang.html?goi=bus#don-hang');
await pm.locator('[data-kq-nhan]').fill('4.200'); await bam(pm, '[data-gui-kq]');
ghi('Cân-0 chặn vượt', /vượt/.test(await toast(pm)), await toast(pm));
await pm.locator('[data-kq-nhan]').fill('3.800'); await pm.locator('[data-kq-tu-choi]').fill('200'); await bam(pm, '[data-gui-kq]');
ghi('Cân-1 bên mua nhập', (await toast(pm)).includes(ma), await toast(pm));
await di(pb, '/ban/lich.html#lich');
ghi('Cân-2 bên bán thấy', (await theDonBan.innerText()).includes('3.800 kg'), await theDonBan.innerText());
await theDonBan.locator('[data-kq-dung]').click(); await cho(pb, 400);
ghi('Cân-3 chốt', /95\.000\.000/.test(await toast(pb)), await toast(pb));
await di(pm, '/mua/cong-no.html?goi=bus#ghi-thanh-toan');
ghi('Tiền-1 khoản đúng đơn', (await pm.locator('#tt-don').inputValue()) === 'av:' + ma && (await pm.locator('#tt-tien').inputValue()) === '95.000.000', `${await pm.locator('#tt-don').inputValue()} · ${await pm.locator('#tt-tien').inputValue()} · ${await chu(pm, '#tt-khoan')}`);
await pm.fill('#tt-tien', '96.000.000'); await bam(pm, '#ghi-thanh-toan .btn.chi-bus');
ghi('Tiền-0 chặn vượt', /vượt/.test(await toast(pm)), await toast(pm));
await pm.fill('#tt-tien', '95.000.000'); await bam(pm, '#ghi-thanh-toan .btn.chi-bus');
ghi('Tiền-2 ghi trả', (await toast(pm)).includes(ma), await toast(pm));
await di(pb, '/ban/lich.html#lich');
await theDonBan.locator('[data-tien-du]').click(); await cho(pb, 400);
await di(pm, '/mua/don-hang.html?goi=bus#don-hang');
const cuoi = await chu(pm, '.av-don-khoi');
ghi('Tiền-3 đóng đơn', cuoi.includes(ma) && cuoi.includes('Người bán đã nhận đủ'), cuoi);
const ls = await pm.evaluate(m => AV.doc().orders.find(o => o.code === m)?.ls.map(x => x[0]), ma);
ghi('Một mã đơn', ls?.length === 6, (ls || []).join(' → '));

// Làm lại đưa cả hai về ban đầu
await Promise.all([pm.waitForNavigation(), pm.locator('#av-lam-lai').click()]); await cho(pm, 300);
ghi('Làm lại', await pm.evaluate(() => AV.doc().orders.length === 0 && AV.doc().needs.length === 0 && !localStorage.getItem('tm.demo-luot')), 'Kho chung và bộ đếm về mặc định');


// Gói Miễn phí: tin cuối (4/5 → 5/5) qua hộp thoại, đếm một lần, rồi chặn
await di(pm, '/mua/nhu-cau.html?goi=free#tao-nhu-cau');
await pm.fill('#luong', '2');
await bam(pm, '#tao-nhu-cau [data-luot="tin"]');
await bam(pm, 'dialog[open] [data-sau]', 500);
const tbCuoi = await toast(pm);
await di(pm, '/mua/nhu-cau.html?goi=free#tao-nhu-cau');
await bam(pm, '#tao-nhu-cau [data-luot="tin"]');
ghi('Tin free cuối', /Đã đăng N-015\. Đã dùng 5\/5/.test(tbCuoi) && /Hết lượt tin mua/.test(await toast(pm)) && /Tin mua mới\s*5\/5/.test(await chu(pm, '.the-luot')), `${tbCuoi} | lần sau: ${await toast(pm)}`);
} catch (e) { ghi('DỪNG', false, e.message.split('\n')[0]); }
await b.close();
for (const r of kq) console.log(`${r.dat ? 'ĐẠT ' : 'LỖI '} ${r.id.padEnd(22)} ${r.chiTiet}`);
console.log(`\n${kq.filter(r => r.dat).length}/${kq.length} đạt; lỗi JS: ${loi.length ? loi.join(' | ') : 'không'}`);
process.exitCode = kq.every(r => r.dat) && !loi.length ? 0 : 1;
