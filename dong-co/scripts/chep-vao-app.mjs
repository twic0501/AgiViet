// Chép động cơ vừa đóng gói và ảnh, icon nhóm của danh mục vào hai app HTML.
import { cpSync, mkdirSync } from 'node:fs';

const goc = new URL('..', import.meta.url).pathname;
for (const app of ['fe-nongdan', 'fe-thumua']) {
  const den = `${goc}../${app}`;
  cpSync(`${goc}dist/dong-co.js`, `${den}/js/dong-co.js`);
  mkdirSync(`${den}/assets/dm`, { recursive: true });
  cpSync(`${goc}packages/danh-muc/anh`, `${den}/assets/dm/anh`, { recursive: true });
  cpSync(`${goc}packages/danh-muc/icon`, `${den}/assets/dm/icon`, { recursive: true });
}
console.log('Đã chép js/dong-co.js và assets/dm/ vào fe-nongdan, fe-thumua.');
