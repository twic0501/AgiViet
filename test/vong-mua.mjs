// Bài thử app mua (bản HTML vẽ từ động cơ): mở cả các màn ở khổ máy tính và điện thoại, rồi chạy một giao dịch từ phía bên mua
// (kết nối → báo giá → đơn theo báo giá → cọc → mở liên lạc → cân → trả qua tài khoản đảm bảo → nhập kho → truy xuất), người bán
// làm phần của họ qua Giả lập người bán; kiểm cùng đơn ở app bán; Phòng thử phía mua.
// node test/vong-mua.mjs [base]   (base mặc định http://127.0.0.1:8768: app mua ở /mua/, app bán ở /ban/)
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8768';
const goc = `${base}/mua/`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const loiJs = [];
p.on('pageerror', e => loiJs.push(`${p.url()} :: ${e.message}`));
let dat = 0, truot = 0;
const kiem = (moTa, ok, chiTiet = '') => { if (ok) dat++; else truot++; console.log(`${ok ? 'ĐẠT ' : 'TRƯỢT'} ${moTa}${chiTiet ? ` · ${chiTiet}` : ''}`); };
const di = async (duong, cho = 300) => { await p.goto(goc + duong); await p.waitForTimeout(cho); };
const chu = async () => (await p.locator('.screen.active').innerText()).replace(/\s+/g, ' ');
const toast = async () => (await p.locator('.toast').innerText()).trim();
const bam = async (ten, vai = 'button') => { await p.getByRole(vai, { name: ten }).first().click(); await p.waitForTimeout(220); };
const so = () => p.evaluate(() => AVN.so());
const giaLap = async (nhom, nhan) => { await di('cong-cu.html#gia-lap'); await p.locator('.pill-nhom', { hasText: nhom }).click(); await p.waitForTimeout(150); await p.getByRole('button', { name: nhan }).first().click(); await p.waitForTimeout(250); return toast(); };

// 1. Lần đầu mở: dữ liệu mẫu tự nạp; đăng nhập Đồng Xanh
await di('tong-quan.html');
await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await di('tong-quan.html', 600);
kiem('Chưa đăng nhập thì về trang vào app', p.url().includes('vao-app.html#dang-nhap'));
await bam(/Dùng số mẫu/); await bam('Gửi mã'); await bam('Điền mã mô phỏng'); await bam('Tiếp tục'); await p.waitForTimeout(500);
kiem('Đăng nhập Nhà máy sấy Đồng Xanh vào Tổng quan', p.url().endsWith('tong-quan.html') && (await chu()).includes('Việc cần làm'));

// 2. Mở cả các màn (máy tính và điện thoại)
const s0 = await so();
const dx = 'mua-dong-xanh', donDx = s0.don.filter(d => d.mua.id === dx);
const theo = st => (donDx.find(d => d.trangThai === st) ?? donDx[0])?.ma;
const kn0 = s0.ketNoi.find(k => k.mua.id === dx && k.trangThai === 'dong_y');
const TS = {
  'chi-tiet-lo': { lo: s0.lo.find(l => l.ban.id === 'ban-tu-ben').id }, 'ho-so-ban': { id: 'ban-nam' }, 'chi-tiet-nhu-cau': { nc: s0.nhuCau.find(n => n.mua.id === dx).id },
  'gui-bao-gia': { kn: kn0.id }, 'tin-nhan': { kn: kn0.id }, 'hen-xem-vuon': { kn: kn0.id }, 'chi-tiet-don': { ma: theo('cho_giao') }, 'thoa-thuan': { lo: kn0.loId }, 'dat-coc': { ma: theo('cho_coc') },
  'mo-lien-lac': { ma: theo('cho_giao') }, 'nghiem-thu': { ma: theo('cho_giao') }, 'doc-phieu-can': { ma: theo('cho_giao') }, 'doi-soat': { ma: theo('chua_thay_tien') }, 'huy-don': { ma: theo('cho_giao') },
  'ghi-thanh-toan': { ma: theo('da_chot') }, 'truy-xuat': { phieu: s0.kho.find(x => x.mua.id === dx)?.id },
};
const TRANG = await p.evaluate(() => AM.TRANG);
for (const [w, hh] of [[1280, 900], [390, 844]]) {
  await p.setViewportSize({ width: w, height: hh });
  let soMan = 0;
  const loi = [];
  for (const [tep, ds] of Object.entries(TRANG)) {
    if (tep === 'vao-app.html') continue;
    await di(tep, 250);
    for (const id of ds) {
      const n0 = loiJs.length;
      await p.evaluate(x => { location.hash = x; }, `${id}${TS[id] ? `?${new URLSearchParams(TS[id])}` : ''}`);
      await p.waitForTimeout(120);
      const x = await p.evaluate(() => { const s = document.querySelector('.screen.active'); return { id: s?.id, dai: s?.innerText.length ?? 0, ve: !s?.innerText.includes('gặp lỗi khi vẽ'), tran: document.documentElement.scrollWidth > innerWidth + 1 }; });
      soMan++;
      if (loiJs.length > n0 || x.id !== id || x.dai < 40 || !x.ve || x.tran) loi.push(`${id}${x.tran ? ' (tràn ngang)' : ''}${loiJs.length > n0 ? ` ${loiJs.slice(n0).join('; ')}` : ''}`);
    }
  }
  kiem(`Mở ${soMan} màn ở khổ ${w}px không lỗi JS, không tràn ngang`, !loi.length, loi.join(', '));
}
await p.setViewportSize({ width: 1280, height: 900 });

// 3. Một giao dịch từ phía bên mua: lô Chanh dây của chị Năm (chưa kết nối)
const lo = s0.lo.find(l => l.ten === 'Chanh dây');
await di(`nguon-hang.html#chi-tiet-lo?lo=${lo.id}`);
await bam('Gửi lời mời kết nối');
kiem('Gửi lời mời kết nối', (await toast()).includes('Đã gửi lời mời'));
kiem('Giả lập: chị Năm đồng ý kết nối', (await giaLap('Kết nối', /Chị Năm đồng ý kết nối/)).startsWith('Xong'));
const kn = (await so()).ketNoi.find(k => k.loId === lo.id && k.mua.id === dx);
await di(`bao-gia.html#gui-bao-gia?kn=${kn.id}`);
await p.locator('input[data-st="gia"]').fill('20000'); await p.locator('input[data-st="kg"]').fill('500');
await bam('Gửi báo giá');
kiem('Gửi báo giá 20.000 đ/kg × 500 kg', (await toast()).includes('Đã gửi báo giá'));
kiem('Giả lập: chị Năm đồng ý báo giá', (await giaLap('Trao đổi', /Chị Năm đồng ý báo giá 20\.000/)).startsWith('Xong'));
await di('bao-gia.html#bao-gia');
await p.locator('.phan-doan button', { hasText: 'Đã chốt' }).click(); await p.waitForTimeout(200);
await p.getByRole('link', { name: 'Lập đơn' }).first().click(); await p.waitForTimeout(300);
kiem('Chưa đồng ý điều khoản thì chưa gửi được đơn', (await p.getByRole('button', { name: 'Gửi đơn cho người bán ký' }).isDisabled()));
await p.locator('.cong-tac').click(); await p.waitForTimeout(150);
await bam('Gửi đơn cho người bán ký'); await p.waitForTimeout(200);
const ma = decodeURIComponent(p.url()).match(/ma=([^&]+)/)?.[1];
const d1 = (await so()).don.find(d => d.ma === ma);
kiem('Đơn theo đúng báo giá đã chốt', d1?.gia === 20000 && d1?.kg === 500 && d1?.trangThai === 'cho_ban_xac_nhan', ma);
kiem('Giả lập: chị Năm xác nhận và ký', (await giaLap('Đơn', new RegExp(`${ma}: xác nhận đơn`))).startsWith('Xong'));
await di(`don-hang.html#mo-lien-lac?ma=${encodeURIComponent(ma)}`);
kiem('Trước cọc: chưa thấy số người bán', !(await chu()).includes('0918234421'));
await di(`don-hang.html#dat-coc?ma=${encodeURIComponent(ma)}`);
const coc = (await so()).don.find(d => d.ma === ma).coc;
kiem('Cọc 10% = 1.000.000 đ, phí đơn đầu với chị Năm hay mối quen đúng loại', coc.so === 1_000_000 && coc.loaiPhi === 'moi_quen', `${coc.so} · ${coc.loaiPhi} ${coc.phi}`);
await bam(/Tôi đã chuyển/); await p.waitForTimeout(300);
kiem('Sau cọc thấy số và địa chỉ người bán', (await chu()).includes('0918234421'));
await di(`don-hang.html#nghiem-thu?ma=${encodeURIComponent(ma)}`);
await p.locator('input[data-st="nhan"]').fill('600'); await p.locator('input[data-st="tuChoi"]').fill('0');
await bam('Gửi kết quả cân cho người bán');
kiem('Cân vượt lượng đơn bị chặn', (await toast()).includes('vượt') && (await so()).don.find(d => d.ma === ma).trangThai === 'cho_giao');
await p.locator('input[data-st="nhan"]').fill('490'); await p.locator('input[data-st="tuChoi"]').fill('10');
await bam('Gửi kết quả cân cho người bán');
kiem('Gửi kết quả cân 490 kg, trả lại 10 kg', (await so()).don.find(d => d.ma === ma).trangThai === 'cho_ban_xn_kq');
kiem('Giả lập: chị Năm xác nhận số cân', (await giaLap('Đơn', new RegExp(`${ma}: xác nhận số cân đúng`))).startsWith('Xong'));
const d2 = (await so()).don.find(d => d.ma === ma);
kiem('Chốt: 490 × 20.000 = 9,8 triệu, trừ cọc còn 8,8 triệu', d2.phaiTra === 9_800_000 && d2.conPhaiTra === 8_800_000);
await di(`tien.html#ghi-thanh-toan?ma=${encodeURIComponent(ma)}`);
await bam(/vào tài khoản đảm bảo/); await p.waitForTimeout(200);
kiem('Chuyển vào tài khoản đảm bảo', (await so()).don.find(d => d.ma === ma).trangThai === 'tien_dang_giu');
await di('cong-cu.html#gia-lap'); await bam(/\+2 phút/); await p.waitForTimeout(300);
const d3 = (await so()).don.find(d => d.ma === ma);
kiem('Ngân hàng chuyển cho người bán, đơn đóng', d3.trangThai === 'da_nhan_tien' && d3.daTra === d3.phaiTra);
await di(`kho.html#nhap-kho?ma=${encodeURIComponent(ma)}`);
await bam('Nhập kho'); await p.waitForTimeout(300);
const pk = (await so()).kho.find(x => x.donMa === ma);
kiem('Nhập kho đủ 490 kg từ đơn', pk?.kg === 490, pk?.id);
await di(`kho.html#truy-xuat?phieu=${pk?.id}`);
kiem('Truy xuất phiếu kho về đơn và người bán', (await chu()).includes(ma) && (await chu()).includes('Chị Năm'));
await di('bao-cao.html#bang-ke');
kiem('Bảng kê 01/TNDN có đơn vừa xong', (await chu()).includes(ma));

// 4. Cùng đơn nhìn từ app bán
await p.evaluate(() => AVN.datPhien('ban', AVN.NGUOI_BAN_MAU));
await p.goto(`${base}/ban/lich.html#chi-tiet-don?ma=${encodeURIComponent(ma)}`); await p.waitForTimeout(500);
kiem('App bán thấy đơn đã nhận đủ tiền', (await chu()).includes('Người bán đã nhận đủ tiền') || (await chu()).includes('Đã xong'));

// 5. Phòng thử phía mua
await di('cong-cu.html#phong-thu');
await bam(/Chạy tất cả/); await p.waitForTimeout(1500);
const tong = await p.locator('.screen.active .row.between .chip').first().innerText();
kiem('Phòng thử app mua: mọi ca đạt', /^(\d+)\/\1 đạt$/.test(tong), tong);

kiem('Không có lỗi JS trong cả lượt', !loiJs.length, loiJs.slice(0, 3).join(' | '));
await b.close();
console.log(`\n${dat} đạt, ${truot} trượt`);
process.exit(truot ? 1 : 0);
