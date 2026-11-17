// Kiểm nhánh "đã trả" của ZaloPay mà không cần trả thật: `npx tsx test/kiem-zalopay.ts` (thoát 1 nếu sai).
// Giả lời ZaloPay, kiểm: ghi tiền đúng một lần, không vượt số còn thiếu, mã giao dịch phải thuộc đúng đơn.
import assert from 'node:assert';
import { kiemDon, maGiaoDich } from '../src/nghiep-vu/zalopay.ts';

const ghi: any[] = [];
const ht: any = { cfg: { tinhNangThu: true }, nganHang: { chuyenKhoan: async (d: any) => { ghi.push(d); }, giao: async () => {} } };
let traLoi: any = { return_code: 1, amount: 4185000, zp_trans_id: 251117000123 };
globalThis.fetch = (async () => new Response(JSON.stringify(traLoi))) as any;

const h = { payment_ref: 'AGV-HD3001-COC', total_vnd: '4185000', received_vnd: '0' };
const ma = maGiaoDich(h.payment_ref, Date.parse('2026-11-17T03:00:00Z'));
assert.match(ma, /^261117_AGVHD3001COC/); assert.ok(ma.length <= 40);

assert.equal((await kiemDon(ht, h, ma)).trang_thai, 'da_tra');
assert.deepEqual(ghi[0], { payment_ref: 'AGV-HD3001-COC', amount_vnd: 4185000, payer: { bank_code: 'ZALOPAY', account_no: '251117000123', name: 'ZALOPAY SANDBOX' } });
await kiemDon(ht, { ...h, received_vnd: '4185000' }, ma);
assert.equal(ghi.length, 1, 'cọc đã đủ thì không ghi lần hai');
await kiemDon(ht, { ...h, received_vnd: '4000000' }, ma);
assert.equal(ghi[1].amount_vnd, 185000, 'chỉ ghi phần còn thiếu');
traLoi = { return_code: 3, sub_return_message: 'Giao dịch chưa được thực hiện' };
assert.equal((await kiemDon(ht, h, ma)).trang_thai, 'chua_tra'); assert.equal(ghi.length, 2);
await assert.rejects(kiemDon(ht, h, '261117_DONKHAC'), /không tìm thấy|KHONG_TIM_THAY/i, 'mã của đơn khác bị chặn');
console.log('✔ ZaloPay: ghi một lần, không vượt số thiếu, chặn mã đơn khác');
