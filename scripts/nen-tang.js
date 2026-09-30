// Dữ liệu nền bắt buộc: tổ chức AgiViet (bên nhận phí dịch vụ) và danh mục mặt hàng.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { one, insert, tx, nowIso } from '../src/lib/core.js';
import { ORG_AGIVIET } from '../src/modules/tien.js';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function damBaoNenTang() {
  tx(() => {
    if (!one('select 1 from organizations where id = ?', ORG_AGIVIET)) insert('organizations', { id: ORG_AGIVIET, kind: 'doanh_nghiep', name: 'AgiViet', can_sell: 0, can_buy: 0, created_at: nowIso() });
    if (!one('select 1 from products limit 1')) {
      const dm = JSON.parse(fs.readFileSync(path.join(goc, 'db', 'danh-muc.json'), 'utf8'));
      const nhanh = Object.fromEntries(dm.branches.map(b => [b.id, b.sector]));
      for (const p of dm.products) insert('products', { id: p.id, sector: nhanh[p.branch], branch: p.branch, grp: p.group, name_vi: p.name.vi, name_en: p.name.en, custom: 0, status: 'danh_muc' });
    }
  });
}
