// Trả cọc qua MoMo sandbox: tạo đơn → người mua trả trên trang MoMo (thẻ ATM test, không cần app) → MoMo đưa về trang đơn →
// máy chủ TỰ HỎI LẠI MoMo (không tin tham số trên đường dẫn) → đã trả thì chuyển tiền vào ngân hàng giả lập đúng một lần.
// Khóa: MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY. Thiếu thì dùng bộ khóa mẫu công khai trong mã mẫu của MoMo.
// shortcut: chỉ sandbox và chỉ môi trường thử; bản thật cần hợp đồng merchant và nhận IPN có kiểm chữ ký.
import { createHmac } from 'node:crypto';
import type { HeThong } from '../he-thong.ts';
import { loi } from '../loi.ts';

type HuongDan = { payment_ref: string; total_vnd: string; received_vnd: string };
const MAY = 'https://test-payment.momo.vn/v2/gateway/api';
const khoa = () => ({ partnerCode: process.env.MOMO_PARTNER_CODE ?? 'MOMO', accessKey: process.env.MOMO_ACCESS_KEY ?? 'F8BBA842ECF85',
  secretKey: process.env.MOMO_SECRET_KEY ?? 'K951B6PE1waDMi640xX08PD3vg6EkVlz' });
const ky = (secret: string, chuoi: string) => createHmac('sha256', secret).update(chuoi).digest('hex');
const goc = (paymentRef: string) => paymentRef.replace(/[^0-9A-Za-z]/g, '');

async function goi(duong: string, than: Record<string, unknown>) {
  const r = await fetch(`${MAY}/${duong}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(than), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw loi('LOI_HE_THONG', `MoMo trả HTTP ${r.status}.`);
  return r.json() as Promise<any>;
}

/** Mã đơn phía MoMo: mã nội dung cọc + đuôi thời gian, chỉ chữ và số, duy nhất mỗi lần bấm. */
export const maDon = (paymentRef: string, nowMs: number) => `${goc(paymentRef)}${nowMs.toString(36)}`.slice(0, 50);

export async function taoDon(ht: HeThong, h: HuongDan, quayVe: string) {
  if (!ht.cfg.tinhNangThu) throw loi('CHUA_HO_TRO', 'Thanh toán MoMo mới có ở bản thử.');
  const con = Number(h.total_vnd) - Number(h.received_vnd);
  if (con <= 0) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Cọc đã đủ, không cần trả thêm.');
  const { partnerCode, accessKey, secretKey } = khoa();
  const orderId = maDon(h.payment_ref, Date.now()), requestId = orderId, amount = String(con), orderInfo = `AgiViet coc ${h.payment_ref}`;
  const extraData = '', requestType = 'payWithMethod', ipnUrl = quayVe, redirectUrl = quayVe;
  const signature = ky(secretKey, `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`);
  const r = await goi('create', { partnerCode, requestId, amount, orderId, orderInfo, redirectUrl, ipnUrl, requestType, extraData, lang: 'vi', signature });
  if (r.resultCode !== 0) throw loi('LOI_HE_THONG', `MoMo chưa tạo được đơn: ${r.message}`);
  return { ma: orderId, pay_url: r.payUrl as string, amount_vnd: amount };
}

/** Hỏi lại MoMo. Đã trả và cọc còn thiếu thì ghi tiền vào ngân hàng giả lập. */
export async function kiemDon(ht: HeThong, h: HuongDan, orderId: string) {
  if (!orderId.startsWith(goc(h.payment_ref))) throw loi('KHONG_TIM_THAY');
  const { partnerCode, accessKey, secretKey } = khoa(), requestId = `${orderId}q${Date.now().toString(36)}`;
  const r = await goi('query', { partnerCode, requestId, orderId, lang: 'vi',
    signature: ky(secretKey, `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${requestId}`) });
  // resultCode 0: đã trả; 1000: đang chờ người dùng xác nhận; còn lại: thất bại hoặc đã hủy
  if (r.resultCode !== 0) return { trang_thai: r.resultCode === 1000 || r.resultCode === 7000 ? 'chua_tra' : 'that_bai', cau: r.message as string };
  const con = Number(h.total_vnd) - Number(h.received_vnd);
  if (con > 0) {
    await ht.nganHang.chuyenKhoan({ payment_ref: h.payment_ref, amount_vnd: Math.min(Number(r.amount), con),
      payer: { bank_code: 'MOMO', account_no: String(r.transId), name: 'MOMO SANDBOX' } });
    await ht.nganHang.giao({});
  }
  return { trang_thai: 'da_tra', ma_giao_dich: String(r.transId), amount_vnd: String(r.amount) };
}
