// Sinh các trang HTML của app bán (fe-nongdan) từ bảng TRANG trong js/khung.js: mỗi màn là một <section class="screen">
// trống, js/khung.js vẽ nội dung từ dữ liệu. Sinh thêm index.html (mục lục màn cho người kiểm thử).
// Chạy: node scripts/tao-trang-ban.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fe-nongdan');
const khung = readFileSync(path.join(goc, 'js/khung.js'), 'utf8');
const TRANG = Function(`return ${khung.match(/const TRANG = (\{[\s\S]*?\n {2}\});/)[1]}`)();
const danhMuc = readFileSync(path.resolve(goc, '../dong-co/src/danh-muc-man.ts'), 'utf8');
const TEN = Object.fromEntries([...danhMuc.matchAll(/id: "([^"]+)",\s*ten: "([^"]+)"/g)].map(m => [m[1], m[2]]));

// Màn gốc của các mục trên thanh dưới (có thanh dưới)
const NAV = { 'hom-nay': 'hom-nay', vuon: 'vuon', hang: 'ban', khach: 'ban', lich: 'don', tien: 'tien' };
const TEN_TRANG = {
  'bat-dau.html': 'Bắt đầu', 'hom-nay.html': 'Hôm nay', 'vuon.html': 'Vườn', 'hang.html': 'Hàng đang bán', 'dang.html': 'Đăng hàng',
  'khach.html': 'Khách hỏi mua', 'lich.html': 'Đơn và lịch giao', 'giao-dich.html': 'Ký thỏa thuận', 'tien.html': 'Tiền hàng',
  'toi.html': 'Tôi', 'cong-cu.html': 'Công cụ mô phỏng',
};
const thoat = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const dau = tieuDe => `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#235c45">
<title>${thoat(tieuDe)} · AgiViet</title>
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/app.css">
<link rel="stylesheet" href="css/moi.css">
</head>
<body>
`;

for (const [tep, ds] of Object.entries(TRANG)) {
  const ten = tep.replace('.html', '');
  const man = ds.map(id => `<section class="screen" id="${id}" data-title="${thoat(TEN[id] ?? id)}"${NAV[id] ? ` data-nav="${NAV[id]}"` : ''}></section>`).join('\n');
  writeFileSync(path.join(goc, tep), `${dau(TEN_TRANG[tep] ?? ten)}<!-- Tệp sinh bằng scripts/tao-trang-ban.mjs. Nội dung màn vẽ ở js/man/${ten}.js. -->
<div class="app">
${man}
</div>
<script src="js/dong-co.js"></script>
<script src="js/khung.js"></script>
<script src="js/app.js"></script>
<script src="js/mo-phong.js"></script>
<script src="js/man/${ten}.js"></script>
${['hom-nay', 'toi'].includes(ten) ? '<script src="js/huong-dan.js"></script>\n' : ''}</body>
</html>
`);
}

// Mục lục cho người kiểm thử: mọi màn, nhóm theo trang
const muc = Object.entries(TRANG).map(([tep, ds]) => `  <section class="nhom"><h2>${thoat(TEN_TRANG[tep])}</h2><div class="luoi">${ds.map(id => `<a href="${tep}#${id}"><strong>${thoat(TEN[id] ?? id)}</strong><span>${id}</span></a>`).join('')}</div></section>`).join('\n');
writeFileSync(path.join(goc, 'index.html'), `${dau('Mục lục màn')}<!-- Tệp sinh bằng scripts/tao-trang-ban.mjs. -->
<main class="muc-luc">
  <h1>AgiViet · App Nhà sản xuất</h1>
  <p>${Object.values(TRANG).flat().length} màn. Dữ liệu mô phỏng tự nạp lần đầu; đăng nhập bằng số 0918 234 421, mã 123456. <a href="hom-nay.html">Vào app</a> · <a href="cong-cu.html#gia-lap">Giả lập</a> · <a href="cong-cu.html#phong-thu">Phòng thử</a></p>
${muc}
</main>
</body>
</html>
`);
console.log(`Đã sinh ${Object.keys(TRANG).length} trang, ${Object.values(TRANG).flat().length} màn và index.html.`);
