// Đóng gói các app thành tệp HTML mở thẳng bằng trình duyệt (bấm đúp, không cần máy chủ), đặt cạnh nhau trong dist-html/.
// Chạy: npm run dong-goi-html [thư mục đích thêm]. Trang giới thiệu trỏ sang tệp app cùng thư mục.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const goc = new URL('..', import.meta.url).pathname;
const ra = join(goc, 'dist-html');
mkdirSync(ra, { recursive: true });
const TEP = [
  ['@agiviet/app-ban', 'apps/app-ban', 'AgiViet_app_ban.html'],
  ['@agiviet/web-gioi-thieu', 'apps/web-gioi-thieu', 'AgiViet_web_gioi_thieu.html'],
] as const;
for (const [goi, thuMuc, ten] of TEP) {
  execSync(`npm run dong-goi -w ${goi}`, { cwd: goc, stdio: 'inherit' });
  copyFileSync(join(goc, thuMuc, 'dist-mot-tep/index.html'), join(ra, ten));
}
const them = process.argv[2];
if (them) {
  mkdirSync(them, { recursive: true });
  for (const [, , ten] of TEP) copyFileSync(join(ra, ten), join(them, ten));
}
console.log(`Đã đóng gói: ${TEP.map(t => t[2]).join(', ')} → ${ra}${them ? ` và ${them}` : ''}`);
