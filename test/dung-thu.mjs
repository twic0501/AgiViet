// Luồng dùng thử từ trang giới thiệu: đăng ký / đăng nhập bản thử → vào app → màn chào mừng mời hướng dẫn chỉ tay.
// node test/dung-thu.mjs [base]
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(os.homedir() + '/rnd idea/package.json');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8768';
const b = await chromium.launch();
const kq = [], loi = [];
const ghi = (id, dat, ct) => kq.push({ id, dat: !!dat, ct: String(ct).replace(/\s+/g, ' ').slice(0, 170) });
const ctx = await b.newContext();
const trang = async vp => { const p = await ctx.newPage(); await p.setViewportSize(vp); p.on('pageerror', e => loi.push(e.message)); p.setDefaultTimeout(6000); return p; };
const cho = (p, ms = 500) => p.waitForTimeout(ms);
try {
  /* Trang giới thiệu: nút dẫn vào luồng dùng thử */
  const w = await trang({ width: 1280, height: 800 });
  await w.goto(base + '/'); await cho(w, 800);
  const nutBan = await w.locator('.hero a.nut', { hasText: 'người bán' }).getAttribute('href');
  const nutMua = await w.locator('.hero a.nut', { hasText: 'bên mua' }).getAttribute('href');
  ghi('Web: nút dùng thử', nutBan === '/ban/bat-dau.html#chao-mung' && nutMua === '/mua/dang-nhap.html', `${nutBan} · ${nutMua}`);
  await w.locator('#i-gia-A').fill('7500'); await cho(w, 200);
  ghi('Web: ô tính tiền về tay', /Khách [AB] cho bạn nhiều hơn/.test(await w.locator('#ket-tinh').innerText()), await w.locator('#ket-tinh').innerText());
  await w.mouse.wheel(0, 2500); await cho(w, 900);
  ghi('Web: hiện dần khi cuộn', (await w.locator('[data-hien].da-hien').count()) > 5, 'số khối đã hiện: ' + await w.locator('[data-hien].da-hien').count());

  /* Bên mua: đăng ký tổ chức */
  const m = await trang({ width: 1280, height: 860 });
  await m.goto(base + '/mua/dang-nhap.html'); await cho(m);
  await m.locator('[data-tiep]').click(); await cho(m, 200);
  ghi('Mua: chặn thiếu tên', /tên tổ chức/.test(await m.locator('#khung').innerText()), (await m.locator('#khung .loi').first().innerText()));
  await m.fill('#to-chuc', 'Công ty Trái cây Miền Tây'); await m.fill('#nguoi', 'Chị Hoa'); await m.fill('#sdt', '0901 234 567');
  await m.locator('[data-loai="xuat-khau"]').click(); await m.locator('[data-mh="Chanh dây"]').click();
  await m.locator('[data-tiep]').click(); await cho(m, 300);
  for (const [i, s] of [...'111111'].entries()) await m.locator('.otp-dn input').nth(i).fill(s);
  await m.locator('[data-tiep]').click(); await cho(m, 200);
  ghi('Mua: chặn sai mã', /123456/.test(await m.locator('#loi-otp').innerText()), await m.locator('#loi-otp').innerText());
  await m.locator('[data-dien-otp]').click(); await m.locator('[data-tiep]').click(); await cho(m, 300);
  await m.locator('[data-goi="free"]').click(); await m.locator('[data-tiep]').click(); await cho(m, 1600);
  const tenTc = await m.locator('.to-chuc strong').innerText();
  ghi('Mua: vào app đúng gói, đúng tên', m.url().includes('tong-quan.html?goi=free') && tenTc === 'Công ty Trái cây Miền Tây' && (await m.locator('#tong-quan h1').innerText()) === 'Chào chị Hoa' && (await m.locator('.nguoi-dung strong').innerText()) === 'Chị Hoa', `${m.url().split('/').pop()} · ${tenTc} · ${await m.locator('#tong-quan h1').innerText()}`);
  const chao = await m.locator('.tour-the').innerText().catch(() => '');
  ghi('Mua: chào mừng mời hướng dẫn', /Chào mừng/.test(chao) && /Đăng nhu cầu mua/.test(chao), chao);
  await m.locator('.tour-the [data-tour-mo="nhu-cau"]').click(); await cho(m, 1200);
  ghi('Mua: bắt đầu hướng dẫn', /bước 1\/5/.test(await m.locator('.tour-the').innerText()), await m.locator('.tour-the').innerText());
  await m.locator('.tour-the [data-tour="bo"]').click();

  /* Người bán: đăng ký trọn bước */
  const s = await trang({ width: 390, height: 844 });
  await s.goto(base + '/ban/bat-dau.html#chao-mung'); await cho(s, 700);
  await s.locator('#chao-mung .bottom-actions a.btn').click(); await cho(s);
  ghi('Bán: gợi ý bản thử', /Bản thử/.test(await s.locator('#dang-nhap').innerText()), await s.locator('#dang-nhap .av-demo').innerText());
  await s.locator('#dang-nhap .bottom-actions a.btn').click(); await cho(s);
  await s.locator('[data-demo-otp]').click(); await cho(s, 900);
  if (!s.url().endsWith('#vai-tro')) { await s.locator('#otp .bottom-actions a.btn').click(); await cho(s); }
  for (const man of ['vai-tro', 'mat-hang', 'ho-so']) { await s.locator(`#${man} .bottom-actions a.btn`).first().click(); await cho(s); }
  ghi('Bán: tới màn xác minh', s.url().endsWith('#xac-minh'), s.url().split('/').pop());
  await s.locator('#xac-minh .bottom-actions a.btn').click(); await cho(s, 1800);
  const chaoBan = await s.locator('.tour-the').innerText().catch(() => '');
  ghi('Bán: vào app, mời hướng dẫn', s.url().includes('hang.html') && /Chào mừng/.test(chaoBan) && /Đăng hàng/.test(chaoBan) && !(await s.locator('#hd-lop').count()), `${s.url().split('/').pop()} · ${chaoBan}`);
  await s.locator('.tour-the [data-tour-mo="dang"]').click(); await cho(s, 1200);
  ghi('Bán: hướng dẫn chỉ nút + Đăng', /bước 1\/9/.test(await s.locator('.tour-the').innerText()), await s.locator('.tour-the').innerText());
  await s.locator('.tour-the [data-tour="bo"]').click();
  // Bên bán thấy tên tổ chức bên mua vừa đăng ký
  ghi('Hai vai: tên bên mua', (await s.evaluate(() => AV.NGUOI_MUA)) === 'Công ty Trái cây Miền Tây', await s.evaluate(() => AV.NGUOI_MUA));

  /* Người bán: đăng nhập (đã có tài khoản) */
  const s2 = await trang({ width: 390, height: 844 });
  await s2.goto(base + '/ban/bat-dau.html#chao-mung'); await cho(s2, 700);
  await s2.locator('#chao-mung .bottom-actions a.link-btn').click(); await cho(s2);
  ghi('Bán: màn đăng nhập', (await s2.locator('#dang-nhap .top h1').innerText()) === 'Đăng nhập' && await s2.locator('#dang-nhap [aria-label="Các bước"]').isHidden(), await s2.locator('#dang-nhap .top h1').innerText());
  await s2.locator('#dang-nhap .bottom-actions a.btn').click(); await cho(s2);
  await s2.locator('[data-demo-otp]').click(); await cho(s2, 900);
  if (s2.url().includes('bat-dau')) { await s2.locator('#otp .bottom-actions a.btn').click().catch(() => {}); }
  await cho(s2, 1800);
  ghi('Bán: đăng nhập vào thẳng app', s2.url().includes('hang.html') && /Chào mừng/.test(await s2.locator('.tour-the').innerText().catch(() => '')), s2.url().split('/').pop());

  /* Bên mua: đăng nhập */
  const m2 = await trang({ width: 1280, height: 860 });
  await m2.goto(base + '/mua/dang-nhap.html?tab=dang-nhap'); await cho(m2);
  await m2.locator('[data-tiep]').click(); await cho(m2, 200);
  await m2.locator('[data-dien-otp]').click(); await m2.locator('[data-tiep]').click(); await cho(m2, 1500);
  ghi('Mua: đăng nhập', m2.url().includes('tong-quan.html') && (await m2.locator('.to-chuc strong').innerText()) === 'Công ty Trái cây Miền Tây', m2.url().split('/').pop());
  ghi('Mua: có nút đăng xuất', (await m2.locator('#av-dang-xuat').getAttribute('href')) === 'dang-nhap.html?tab=dang-nhap', 'đăng xuất → trang đăng nhập');
} catch (e) { ghi('DỪNG', false, e.message.split('\n')[0]); }
await b.close();
for (const r of kq) console.log(`${r.dat ? 'ĐẠT ' : 'LỖI '} ${r.id.padEnd(30)} ${r.ct}`);
console.log(`\n${kq.filter(r => r.dat).length}/${kq.length} đạt; lỗi JS: ${loi.length ? loi.join(' | ') : 'không'}`);
process.exitCode = kq.every(r => r.dat) && !loi.length ? 0 : 1;
