// Trả cọc qua ZaloPay sandbox. Luồng: tạo đơn ZaloPay đúng số còn thiếu → người mua trả trên cổng ZaloPay →
// máy chủ TỰ HỎI LẠI ZaloPay (không tin tham số trên đường dẫn trả về) → đã trả thì chuyển tiền vào ngân hàng giả lập,
// để phần sau (webhook, tra lại, ghi cọc) chạy y như ngân hàng thật.
// Khóa: ZALOPAY_APP_ID / ZALOPAY_KEY1. Môi trường thử thiếu khóa thì dùng bộ khóa mẫu công khai trong tài liệu ZaloPay (app 553: trả về chuỗi QR, quét bằng app ZaloPay Sandbox).
// shortcut: chỉ dùng sandbox và chỉ chạy ở môi trường thử; bản thật cần hợp đồng merchant + nhận callback ký bằng key2.
import { createHmac } from 'node:crypto';
import type { HeThong } from '../he-thong.ts';
import { loi } from '../loi.ts';
/** h: kết quả huongDanCoc đã đọc xong (kiểm quyền người mua nằm trong đó). Gọi mạng và ghi tiền ngoài giao dịch đọc. */
type HuongDan = { payment_ref: string; total_vnd: string; received_vnd: string };

const MAY = 'https://sb-openapi.zalopay.vn/v2';
const khoa = () => ({ app_id: Number(process.env.ZALOPAY_APP_ID ?? 553), key1: process.env.ZALOPAY_KEY1 ?? '9phuAOYhan4urywHTh0ndEXiV3pKHr5Q' });
const ky = (key: string, ...p: (string | number)[]) => createHmac('sha256', key).update(p.join('|')).digest('hex');

async function goi(duong: string, than: Record<string, string | number>) {
  const r = await fetch(`${MAY}/${duong}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.entries(than).map(([k, v]) => [k, String(v)])), signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw loi('LOI_HE_THONG', `ZaloPay trả HTTP ${r.status}.`);
  return r.json() as Promise<any>;
}

/** Mã giao dịch phía ZaloPay: yymmdd (giờ VN) + "_" + mã nội dung cọc, chỉ chữ số và chữ, tối đa 40 ký tự. */
export function maGiaoDich(paymentRef: string, nowMs: number) {
  const ngay = new Date(nowMs + 7 * 3600e3).toISOString().slice(2, 10).replace(/-/g, '');
  return `${ngay}_${paymentRef.replace(/[^0-9A-Za-z]/g, '')}${(nowMs % 1e5).toString(36)}`.slice(0, 40);
}

export async function taoDon(ht: HeThong, h: HuongDan, nguoiMua: string, quayVe: string) {
  if (!ht.cfg.tinhNangThu) throw loi('CHUA_HO_TRO', 'Thanh toán ZaloPay mới có ở bản thử.');
  const con = Number(h.total_vnd) - Number(h.received_vnd);
  if (con <= 0) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Cọc đã đủ, không cần trả thêm.');
  const { app_id, key1 } = khoa();
  const app_trans_id = maGiaoDich(h.payment_ref, Date.now());
  const embed_data = JSON.stringify({ redirecturl: quayVe });
  const o: Record<string, string | number> = { app_id, app_trans_id, app_user: nguoiMua, app_time: Date.now(), amount: con,
    item: '[]', embed_data, description: `AgiViet - coc ${h.payment_ref}`, bank_code: '' };
  o.mac = ky(key1, o.app_id, o.app_trans_id, o.app_user, o.amount, o.app_time, o.embed_data, o.item);
  const r = await goi('create', o);
  if (r.return_code !== 1) throw loi('LOI_HE_THONG', `ZaloPay chưa tạo được đơn: ${r.sub_return_message ?? r.return_message}`);
  return { app_trans_id, qr: (r.qr_code ?? r.order_url) as string, order_url: r.order_url as string, amount_vnd: String(con) };
}

/** Hỏi lại ZaloPay. Đã trả và cọc còn thiếu thì ghi tiền vào ngân hàng giả lập đúng một lần. */
export async function kiemDon(ht: HeThong, h: HuongDan, appTransId: string) {
  if (!appTransId.includes(h.payment_ref.replace(/[^0-9A-Za-z]/g, ''))) throw loi('KHONG_TIM_THAY');
  const { app_id, key1 } = khoa();
  const r = await goi('query', { app_id, app_trans_id: appTransId, mac: ky(key1, app_id, appTransId, key1) });
  // return_code: 1 đã trả, 2 thất bại, 3 chưa trả hoặc đang xử lý
  if (r.return_code !== 1) return { trang_thai: r.return_code === 2 ? 'that_bai' : 'chua_tra', cau: r.sub_return_message ?? r.return_message };
  const con = Number(h.total_vnd) - Number(h.received_vnd);
  // Tải lại trang sau khi đã ghi: cọc không còn thiếu nên không ghi lần hai
  if (con > 0) {
    await ht.nganHang.chuyenKhoan({ payment_ref: h.payment_ref, amount_vnd: Math.min(Number(r.amount), con),
      payer: { bank_code: 'ZALOPAY', account_no: String(r.zp_trans_id), name: 'ZALOPAY SANDBOX' } });
    await ht.nganHang.giao({});
  }
  return { trang_thai: 'da_tra', zp_trans_id: String(r.zp_trans_id), amount_vnd: String(r.amount) };
}
