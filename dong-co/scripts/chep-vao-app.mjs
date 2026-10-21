// Chép động cơ vừa đóng gói, khung vẽ màn dùng chung, ảnh và icon nhóm của danh mục vào hai app HTML.
import { cpSync, mkdirSync } from 'node:fs';

const goc = new URL('..', import.meta.url).pathname;
for (const app of ['fe-nongdan', 'fe-thumua']) {
  const den = `${goc}../${app}`;
  cpSync(`${goc}dist/dong-co.js`, `${den}/js/dong-co.js`);
  cpSync(`${goc}khung/khung.js`, `${den}/js/khung.js`);
  cpSync(`${goc}khung/moi.css`, `${den}/css/moi.css`);
  mkdirSync(`${den}/assets/dm`, { recursive: true });
  cpSync(`${goc}packages/danh-muc/anh`, `${den}/assets/dm/anh`, { recursive: true });
  cpSync(`${goc}packages/danh-muc/icon`, `${den}/assets/dm/icon`, { recursive: true });
}
console.log('Đã chép js/dong-co.js, js/khung.js, css/moi.css và assets/dm/ vào fe-nongdan, fe-thumua.');
