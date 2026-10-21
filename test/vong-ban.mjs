// Bài thử app bán (bản HTML vẽ từ động cơ): mở cả 82 màn, đăng lô bằng giọng nói, ghi nhật ký, chạy hết một đơn
// từ xác nhận, ký, cọc, cân, chốt tới tiền về (bên mua làm qua Giả lập), các chặn của nghiệp vụ, Phòng thử 38/38.
// node test/vong-ban.mjs [base]   (base mặc định http://127.0.0.1:8768, app bán ở /ban/; chạy sau node scripts/build-hosting.js
// và python3 -m http.server 8768 trong hosting-build/)
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const goc = `${process.argv[2] || 'http://127.0.0.1:8768'}/ban/`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const loiJs = [];
p.on('pageerror', e => loiJs.push(`${p.url()} :: ${e.message}`));
let dat = 0, truot = 0;
const kiem = (moTa, ok, chiTiet = '') => { if (ok) dat++; else truot++; console.log(`${ok ? 'ĐẠT ' : 'TRƯỢT'} ${moTa}${chiTiet ? ` · ${chiTiet}` : ''}`); };
const di = async (duong, cho = 300) => { await p.goto(goc + duong); await p.waitForTimeout(cho); };
const chu = async () => (await p.locator('.screen.active').innerText()).replace(/\s+/g, ' ');
const toast = async () => (await p.locator('.toast').innerText()).trim();
const bam = async (ten, vai = 'button') => { await p.getByRole(vai, { name: ten }).first().click(); await p.waitForTimeout(200); };
const so = () => p.evaluate(() => AVN.so());

// 1. Lần đầu mở: tự nạp dữ liệu mẫu, chưa đăng nhập thì về Chào mừng; đăng nhập bằng số mẫu
await di('hom-nay.html');
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await di('hom-nay.html', 600);
kiem('Chưa đăng nhập thì về Chào mừng', p.url().includes('bat-dau.html#chao-mung'));
kiem('Lần đầu mở tự có dữ liệu mẫu', (await so()).don.length >= 13);
await bam('Tôi đã có tài khoản'); await bam('Gửi mã'); await bam('Điền mã mô phỏng'); await bam('Tiếp tục');
await p.waitForTimeout(500);
kiem('Đăng nhập số mẫu, mã 123456 vào Hôm nay', p.url().endsWith('hom-nay.html'), await chu().then(t => t.slice(0, 60)));
await p.evaluate(() => localStorage.setItem('am.da-xem-hd', '1'));

// 2. Mở cả 82 màn không lỗi, không tràn ngang
const s0 = await so();
const don = s0.don.filter(d => d.ban.id === 'ban-nam');
const theo = st => (don.find(d => d.trangThai === st) ?? don[0]).ma;
const kn = s0.ketNoi.find(k => k.ban.id === 'ban-nam' && k.trangThai === 'dong_y');
const lo = s0.lo.find(l => l.ban.id === 'ban-nam'), vuon = s0.vuon[0];
const TS = {
  'chi-tiet-don': { ma: theo('cho_giao') }, 'xac-nhan-don': { ma: theo('cho_ban_xac_nhan') }, coc: { ma: theo('cho_coc') }, 'mo-lien-lac': { ma: theo('cho_giao') }, 'ket-qua': { ma: theo('cho_ban_xn_kq') },
  'giao-mot-phan': { ma: theo('cho_giao') }, 'doi-lich': { ma: theo('cho_coc') }, 'yeu-cau-thay-doi': { ma: theo('cho_coc') }, 'huy-don': { ma: theo('cho_coc') }, 'tranh-chap': { ma: theo('chua_thay_tien') },
  'so-ban': { ma: theo('cho_giao') }, 'so-sanh': { lo: don.find(d => d.trangThai === 'cho_ban_xac_nhan')?.loId }, 'phuong-thuc': { ma: theo('cho_ban_xac_nhan') }, 'chon-luong': { ma: theo('cho_ban_xac_nhan') },
  ky: { ma: theo('cho_ban_xac_nhan') }, quyen: { ma: theo('cho_ban_xac_nhan') }, 'ban-day-du': { ma: theo('cho_ban_xac_nhan') }, 'ky-otp': { ma: theo('cho_ban_xac_nhan') }, 'ky-xong': { ma: theo('cho_coc') },
  'ky-giay': { ma: theo('cho_ban_xac_nhan') }, 'tien-ve': { ma: theo('da_nhan_tien') }, 'quyet-toan': { ma: theo('da_chot') }, chat: { kn: kn.id }, 'bao-gia': { kn: kn.id }, 'hen-xem': { kn: kn.id },
  'ket-noi': { kn: kn.id }, 'ho-so-ben-mua': { id: kn.mua.id }, 'bao-cao': { nguoi: kn.mua.id }, 'chi-tiet-lo': { lo: lo.id }, 'cap-nhat-luong': { lo: lo.id }, 'chung-tu': { lo: lo.id },
  'mua-vu': { vuon: vuon.id }, 'ho-so-vuon': { vuon: vuon.id },
};
const TRANG = await p.evaluate(() => AM.TRANG);
let soMan = 0;
const manLoi = [];
for (const [tep, ds] of Object.entries(TRANG)) {
  if (tep === 'bat-dau.html') continue;   // đã đăng nhập thì trang Bắt đầu chuyển vào app; kiểm riêng ở bước 1
  await di(tep, 250);
  for (const id of ds) {
    const n0 = loiJs.length;
    await p.evaluate(h => { location.hash = h; }, `${id}${TS[id] ? `?${new URLSearchParams(TS[id])}` : ''}`);
    await p.waitForTimeout(120);
    const x = await p.evaluate(() => { const s = document.querySelector('.screen.active'); return { id: s?.id, dai: s?.innerText.length ?? 0, ve: !s?.innerText.includes('gặp lỗi khi vẽ'), tran: document.documentElement.scrollWidth > innerWidth + 1 }; });
    soMan++;
    if (loiJs.length > n0 || x.id !== id || x.dai < 40 || !x.ve || x.tran) manLoi.push(`${id}${x.tran ? ' (tràn ngang)' : ''}${loiJs.length > n0 ? ` ${loiJs.slice(n0).join('; ')}` : ''}`);
  }
}
kiem(`Mở ${soMan} màn không lỗi JS, không tràn ngang ở 390 px`, !manLoi.length, manLoi.join(', '));

// 3. Đăng lô bằng giọng nói, ghi nhật ký bằng giọng nói
await di('dang.html#dang');
await p.locator('[data-cach="noi"]').click(); await p.waitForTimeout(200);
await bam('Thử câu mẫu'); await bam('Nói xong'); await bam('Tiếp: xem lại'); await bam('Đăng bán'); await p.waitForTimeout(300);
kiem('Đăng lô từ câu nói "Xoài cát Chu 8 tấn, 24 nghìn"', p.url().includes('#xong?lo=') && (await chu()).includes('8 tấn'));
await di('vuon.html#ghi');
await bam(/phun thuốc trừ rầy/); await bam('Tiếp: kiểm tra'); await bam('Lưu'); await p.waitForTimeout(300);
kiem('Ghi nhật ký phun thuốc từ câu nói', (await toast()).includes('nhật ký') && (await so()).nhatKy.some(k => k.loai === 'phun_thuoc' && k.ngayCachLy === 7 && k.noiDung.includes('rầy')));

// 4. Một đơn từ xác nhận tới tiền về
const ma = theo('cho_ban_xac_nhan'), em = encodeURIComponent(ma);
const giaLap = async (nhom, nhan) => { await di('cong-cu.html#gia-lap'); await p.locator('.pill-nhom', { hasText: nhom }).click(); await p.waitForTimeout(150); await p.getByRole('button', { name: nhan }).first().click(); await p.waitForTimeout(250); };
await di(`lich.html#xac-nhan-don?ma=${em}`);
await bam('Xác nhận và ký', 'link'); await bam('Tiếp tục', 'link'); await bam('Tiếp tục');
kiem('Chưa bật "chắc chắn giao được" thì chưa sang ký', (await toast()).includes('chắc chắn'));
await p.locator('.cong-tac').click(); await p.waitForTimeout(150);
await bam('Tiếp tục', 'link'); await bam(/Đồng ý, ký bằng mã/, 'link');
await p.locator('input[data-st="ma"]').fill('111111'); await bam('Ký và xác nhận đơn');
kiem('Mã ký sai bị chặn', (await chu()).includes('Mã không đúng'));
await p.locator('input[data-st="ma"]').fill('123456'); await bam('Ký và xác nhận đơn'); await p.waitForTimeout(300);
kiem('Ký xong: đơn chờ cọc, lô đã giữ lượng', p.url().includes('ky-xong') && (await so()).don.find(d => d.ma === ma).trangThai === 'cho_coc');
await di(`lich.html#mo-lien-lac?ma=${em}`);
kiem('Trước cọc không thấy số điện thoại bên mua', !(await chu()).includes('0277'));
await giaLap('Tiền', new RegExp(`${ma}: đặt cọc`));
await di(`lich.html#mo-lien-lac?ma=${em}`);
kiem('Sau cọc thấy số điện thoại bên mua', (await chu()).includes('0277386210'));
await giaLap('Đơn', new RegExp(`${ma}: cân đủ`));
await di(`lich.html#ket-qua?ma=${em}`); await bam('Đúng, chốt số'); await p.waitForTimeout(300);
const d1 = (await so()).don.find(d => d.ma === ma);
kiem('Chốt cân: tiền hàng trừ cọc', d1.trangThai === 'da_chot' && d1.conPhaiTra === d1.phaiTra - d1.daCoc.so, `${d1.phaiTra} − ${d1.daCoc.so}`);
await giaLap('Tiền', new RegExp(`${ma}: ghi đã trả trực tiếp một nửa`));
await di(`lich.html#chi-tiet-don?ma=${em}`); await bam('Đã nhận đủ');
kiem('Trả thiếu: "Đã nhận đủ" bị chặn', (await toast()).includes('còn thiếu') && (await so()).don.find(d => d.ma === ma).trangThai === 'bao_da_tra');
await bam('Nhận một phần');
await giaLap('Tiền', new RegExp(`${ma}: chuyển .* tài khoản đảm bảo`));
await p.getByRole('button', { name: /\+2 phút/ }).click(); await p.waitForTimeout(300);
const d2 = (await so()).don.find(d => d.ma === ma);
kiem('Ngân hàng giải ngân: đơn đóng, nhận đủ tiền hàng', d2.trangThai === 'da_nhan_tien' && d2.daTra === d2.phaiTra, `${d2.daTra}/${d2.phaiTra}`);
await di(`tien.html#tien-ve?ma=${em}`);
kiem('Màn Tiền đã về hiện đúng số', (await chu()).includes(d2.phaiTra.toLocaleString('vi-VN')));

// 5. Chặn đăng bán khi vườn đang cách ly thuốc
const vuonCachLy = await p.evaluate(() => { const s = AVN.so(); return s.vuon.find(v => AVN.nv.hetCachLy(s, v.id) > AVN.nv.ngayCua(AVN.bayGio()))?.id; });
if (vuonCachLy) {
  await p.evaluate(v => sessionStorage.setItem('am.nhap.dang-lo', JSON.stringify({ cach: 'go', matHang: 'xoai-cat-chu', ten: 'Xoài', kg: '1000', coSo: 'uoc_tinh', gia: '20000', nhanBaoGia: false, thuocTinh: {}, choCheBien: false, haiTu: '', haiDen: '', vuonId: v, anh: [], moTa: '', loiNoi: '' })), vuonCachLy);
  await di('dang.html#kiem-tra'); await bam('Tiếp: xem lại');
  kiem('Vườn đang cách ly: không cho sang bước đăng', (await toast()).includes('cách ly') && p.url().includes('kiem-tra'));
}

// 6. Phòng thử
await di('cong-cu.html#phong-thu');
await bam(/Chạy tất cả/); await p.waitForTimeout(1500);
const tong = await p.locator('.screen.active .row.between .chip').first().innerText();
kiem('Phòng thử: mọi ca đạt', /^(\d+)\/\1 đạt$/.test(tong), tong);

kiem('Không có lỗi JS trong cả lượt', !loiJs.length, loiJs.slice(0, 3).join(' | '));
await b.close();
console.log(`\n${dat} đạt, ${truot} trượt`);
process.exit(truot ? 1 : 0);
