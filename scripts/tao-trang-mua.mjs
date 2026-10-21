// Sinh các trang HTML của app mua (fe-thumua) từ bảng TRANG trong js/cau-hinh.js: khung thanh bên + cột chính,
// mỗi màn là một <section class="screen"> trống; js/khung.js vẽ nội dung. Sinh thêm index.html (mục lục) và dang-nhap.html
// (đường dẫn cũ từ trang giới thiệu, chuyển sang vao-app.html).  Chạy: node scripts/tao-trang-mua.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fe-thumua');
const cuaSo = {};
Function('window', readFileSync(path.join(goc, 'js/cau-hinh.js'), 'utf8'))(cuaSo);
const TRANG = cuaSo.KHUNG_CAU_HINH.trang;
const danhMuc = readFileSync(path.resolve(goc, '../dong-co/src/danh-muc-man-mua.ts'), 'utf8');
const TEN = Object.fromEntries([...danhMuc.matchAll(/"id": "([^"]+)",\s*"ten": "([^"]+)"/g)].map(m => [m[1], m[2]]));
const TEN_TRANG = {
  'vao-app.html': 'Vào app', 'tong-quan.html': 'Tổng quan', 'nguon-hang.html': 'Nguồn hàng', 'nhu-cau.html': 'Tin cần mua', 'bao-gia.html': 'Báo giá',
  'tin-nhan.html': 'Tin nhắn', 'don-hang.html': 'Đơn hàng', 'tien.html': 'Tiền, công nợ', 'kho.html': 'Kho', 'nha-cung-cap.html': 'Nhà cung cấp',
  'ke-hoach.html': 'Kế hoạch mua', 'bao-cao.html': 'Thuế, báo cáo', 'dich-vu.html': 'Dịch vụ', 'to-chuc.html': 'Tổ chức', 'cong-cu.html': 'Công cụ mô phỏng',
};
const thoat = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const dau = (tieuDe, lop = '') => `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#315c60">
<title>${thoat(tieuDe)} · AgiViet Thu mua</title>
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/mua.css">
<link rel="stylesheet" href="css/moi.css">
</head>
<body${lop ? ` class="${lop}"` : ''}>
`;

for (const [tep, ds] of Object.entries(TRANG)) {
  const ten = tep.replace('.html', '');
  const man = ds.map(id => `<section class="screen" id="${id}" data-title="${thoat(TEN[id] ?? id)}"></section>`).join('\n');
  writeFileSync(path.join(goc, tep), `${dau(TEN_TRANG[tep] ?? ten, tep === 'vao-app.html' ? 'khong-khung' : '')}<!-- Tệp sinh bằng scripts/tao-trang-mua.mjs. Nội dung màn vẽ ở js/man/${ten}.js. -->
<div class="shell">
<aside class="sidebar" aria-label="Điều hướng"></aside>
<div class="chinh">
<header class="topbar"></header>
<main class="app">
${man}
</main>
</div>
</div>
<nav class="nav-duoi" aria-label="Mục chính"></nav>
<script src="js/dong-co.js"></script>
<script src="js/cau-hinh.js"></script>
<script src="js/khung.js"></script>
<script src="js/app.js"></script>
<script src="js/man/${ten}.js"></script>
</body>
</html>
`);
}

writeFileSync(path.join(goc, 'dang-nhap.html'), `${dau('Đăng nhập')}<!-- Tệp sinh bằng scripts/tao-trang-mua.mjs: đường dẫn cũ, chuyển sang trang vào app mới. -->
<script>
  const ts = new URLSearchParams(location.search);
  location.replace(ts.get('tab') === 'dang-ky' ? 'vao-app.html#thong-tin-to-chuc' : 'vao-app.html#dang-nhap');
</script>
<p style="padding:24px"><a href="vao-app.html#dang-nhap">Vào app Thu mua</a></p>
</body>
</html>
`);

const muc = Object.entries(TRANG).map(([tep, ds]) => `  <section><h2>${thoat(TEN_TRANG[tep])}</h2><p>${ds.map(id => `<a href="${tep}#${id}">${thoat(TEN[id] ?? id)}</a>`).join(' · ')}</p></section>`).join('\n');
writeFileSync(path.join(goc, 'index.html'), `${dau('Mục lục màn', 'khong-khung')}<!-- Tệp sinh bằng scripts/tao-trang-mua.mjs. -->
<main class="app stack">
  <h1>AgiViet · App Thu mua</h1>
  <p>${Object.values(TRANG).flat().length} màn. Dữ liệu mô phỏng tự nạp lần đầu; đăng nhập bằng số 0277 386 210 (Nhà máy sấy Đồng Xanh), mã 123456. <a href="tong-quan.html">Vào app</a> · <a href="cong-cu.html#gia-lap">Giả lập người bán</a> · <a href="cong-cu.html#phong-thu">Phòng thử</a></p>
${muc}
</main>
</body>
</html>
`);
console.log(`Đã sinh ${Object.keys(TRANG).length} trang, ${Object.values(TRANG).flat().length} màn, index.html và dang-nhap.html.`);
