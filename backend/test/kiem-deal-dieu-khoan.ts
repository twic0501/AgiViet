// Kiểm luật deal + điều khoản + đọc giá: chạy `npx tsx test/kiem-deal-dieu-khoan.ts` (thoát 1 nếu sai).
import assert from 'node:assert';
import { buocDeal, giaGiua, xetDieuKhoan } from '../src/demo/doi-tac-ao.ts';
// @ts-ignore — module JS của frontend, hàm thuần
import { docGia } from '../../frontend/thiet-ke/the-giao-dich.js';

for (const [c, g] of [['14.700', 14700], ['15 ngàn', 15000], ['14ngàn 700', 14700], ['14k7', 14700], ['14,5 ngàn', 14500], ['14700 nhé', 14700], ['bán 23.550đ', 23550], ['hello', null], ['500 kg', null], ['2 lần', null]] as const)
  assert.equal(docGia(c), g, c);

assert.equal(buocDeal(0.03, 500_000, 1), 0.03);
assert.ok(Math.abs(buocDeal(0.03, 1_000_000, 3) - 0.05) < 1e-9, 'đơn lớn, nhiều vòng nhượng thêm');
assert.equal(giaGiua(16000, 14000, 15500, 'seller', 0.03), 15500, 'không xuống dưới mức chịu');
assert.equal(giaGiua(16000, 15000, 15000, 'seller', 0.03), 15500, 'gặp ở giữa');
assert.equal(giaGiua(14000, 15000, 14400, 'buyer', 0.03), 14400, 'không vượt trần');

const now = Date.parse('2026-11-06T00:00:00Z'), ban = (hc: number, ngay = 2) => ({ downgrade_price_vnd: hc, delivery_from: new Date(now + ngay * 864e5).toISOString(), delivery_to: new Date(now + ngay * 864e5 + 8 * 36e5).toISOString() });
assert.equal(xetDieuKhoan(ban(6500), 10000, 'seller', now).dong_y, true);
const s = xetDieuKhoan(ban(4000), 10000, 'seller', now); assert.equal(s.dong_y, false); assert.equal(s.sua.downgrade_price_vnd, 5500);
const m = xetDieuKhoan(ban(9000), 10000, 'buyer', now); assert.equal(m.dong_y, false); assert.equal(m.sua.downgrade_price_vnd, 8000);
assert.equal(xetDieuKhoan(ban(6500, 20), 10000, 'buyer', now).dong_y, false, 'ngày giao quá xa');
console.log('✔ luật deal + điều khoản + đọc giá đạt');
