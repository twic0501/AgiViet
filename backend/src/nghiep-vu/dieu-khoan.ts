// Thương lượng điều khoản SAU khi chốt giá, TRƯỚC khi có hợp đồng: một bên đề xuất, bên kia đồng ý / từ chối / đề xuất lại.
// Lưu bằng sự kiện bất biến (evt.domain_events) nên có đủ lịch sử mà không cần bảng mới.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { loi } from '../loi.ts';
import { phat } from './chung.ts';

export const CACH_TRA = ['on_receipt', 'inspect_then_before_loading'] as const;
export interface DieuKhoan { delivery_from: string; delivery_to: string; payment_timing: string; downgrade_price_vnd: number; transport_by: 'buyer' | 'seller'; ghi_chu?: string }
type Phia = 'buyer' | 'seller';

async function cuocChot(t: GiaoDich, nd: NguoiDung, id: string) {
  const o = await t.mot<any>(`SELECT id, status, buyer_org_id, seller_org_id FROM core.offers WHERE id=$1`, [id]);
  if (!o || ![o.buyer_org_id, o.seller_org_id].includes(nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  const r = await t.mot<any>(`SELECT price_vnd::text gia FROM core.offer_rounds WHERE offer_id=$1 ORDER BY round_no DESC LIMIT 1`, [id]);
  return { o, phia: (o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : 'seller') as Phia, gia: Number(r.gia) };
}

/** Trạng thái điều khoản của một lời chào, suy ra từ dãy sự kiện. */
export async function trangThaiDieuKhoan(t: GiaoDich, offerId: string) {
  const ds = await t.q<any>(`SELECT event_type, payload FROM evt.domain_events WHERE aggregate_id=$1 AND event_type LIKE 'dieu\\_khoan.%' ORDER BY seq`, [offerId]);
  const dx = ds.filter((e) => e.event_type === 'dieu_khoan.de_xuat'), cuoi = ds.at(-1);
  const lichSu = ds.map((e) => ({ loai: e.event_type.slice(11), ...e.payload }));
  if (!cuoi) return { trang_thai: 'chua_de_xuat' as const, phien_ban: 0, ban: null as any, de_xuat_boi: null as Phia | null, lich_su: lichSu };
  const hienTai = dx.at(-1)?.payload;
  const trang_thai = cuoi.event_type === 'dieu_khoan.dong_y' ? 'da_thong_nhat' as const : cuoi.event_type === 'dieu_khoan.tu_choi' ? 'bi_tu_choi' as const : 'cho_tra_loi' as const;
  return { trang_thai, phien_ban: dx.length, ban: hienTai?.dieu_khoan ?? null, de_xuat_boi: (hienTai?.ben ?? null) as Phia | null, lich_su: lichSu };
}

export async function xemDieuKhoan(t: GiaoDich, nd: NguoiDung, id: string) {
  const { o, phia, gia } = await cuocChot(t, nd, id);
  // Mặc định: 7 giờ sáng ngày kế tiếp (giờ VN), đủ thời gian hái và điều xe; xuống loại 70% (dưới mức này người bán phải xác nhận riêng)
  const ngayVN = new Date(t.thoiDiemMs + 7 * 3600e3).toISOString().slice(0, 10);
  const tu = new Date(Date.parse(`${ngayVN}T07:00:00+07:00`) + 864e5);
  const mac_dinh: DieuKhoan = { delivery_from: tu.toISOString(), delivery_to: new Date(tu.getTime() + 8 * 3600e3).toISOString(), payment_timing: 'on_receipt', downgrade_price_vnd: Math.ceil(gia * 0.7 / 100) * 100, transport_by: 'buyer' };
  return { ...(await trangThaiDieuKhoan(t, id)), offer_status: o.status, ben_toi: phia, gia_vnd: gia, mac_dinh };
}

export async function deXuatDieuKhoan(t: GiaoDich, nd: NguoiDung, id: string, d: DieuKhoan) {
  const { o, phia, gia } = await cuocChot(t, nd, id);
  if (o.status !== 'accepted') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Chỉ đề xuất điều khoản sau khi hai bên đã chốt giá.');
  const tu = new Date(d.delivery_from), den = new Date(d.delivery_to);
  if (!(tu < den) || tu.getTime() <= t.thoiDiemMs) throw loi('DU_LIEU_KHONG_HOP_LE', 'Ngày giao phải ở tương lai.');
  if (!CACH_TRA.includes(d.payment_timing as any)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cách trả tiền không hỗ trợ.');
  const hc = Number(d.downgrade_price_vnd);
  if (!(hc >= 0 && hc < gia)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Giá xuống loại phải nhỏ hơn giá đã chốt.');
  if (!['buyer', 'seller'].includes(d.transport_by)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần chọn bên lo xe.');
  const tt = await trangThaiDieuKhoan(t, id);
  if (tt.trang_thai === 'da_thong_nhat') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Điều khoản đã thống nhất, hãy tạo hợp đồng.');
  const dieu_khoan = { delivery_from: tu.toISOString(), delivery_to: den.toISOString(), payment_timing: d.payment_timing, downgrade_price_vnd: hc, transport_by: d.transport_by, ghi_chu: String(d.ghi_chu ?? '').slice(0, 300) };
  await phat(t, 'offer', id, 'dieu_khoan.de_xuat', { ben: phia, phien_ban: tt.phien_ban + 1, dieu_khoan });
  return { id, phien_ban: tt.phien_ban + 1, trang_thai: 'cho_tra_loi' };
}

async function traLoi(t: GiaoDich, nd: NguoiDung, id: string, phienBan: number) {
  const { o, phia } = await cuocChot(t, nd, id);
  if (o.status !== 'accepted') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Lời chào không còn ở bước chốt điều khoản.');
  const tt = await trangThaiDieuKhoan(t, id);
  if (tt.trang_thai !== 'cho_tra_loi') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Không có đề xuất đang chờ trả lời.');
  if (tt.de_xuat_boi === phia) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Bên kia mới được trả lời đề xuất của bạn.');
  if (Number(phienBan) !== tt.phien_ban) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Đề xuất vừa thay đổi, hãy xem lại bản mới.');
  return phia;
}
export async function dongYDieuKhoan(t: GiaoDich, nd: NguoiDung, id: string, phienBan: number) {
  const ben = await traLoi(t, nd, id, phienBan);
  await phat(t, 'offer', id, 'dieu_khoan.dong_y', { ben, phien_ban: phienBan });
  return { id, phien_ban: phienBan, trang_thai: 'da_thong_nhat' };
}
export async function tuChoiDieuKhoan(t: GiaoDich, nd: NguoiDung, id: string, phienBan: number, lyDo?: string) {
  const ben = await traLoi(t, nd, id, phienBan);
  await phat(t, 'offer', id, 'dieu_khoan.tu_choi', { ben, phien_ban: phienBan, ly_do: String(lyDo ?? '').slice(0, 300) });
  return { id, phien_ban: phienBan, trang_thai: 'bi_tu_choi' };
}

/** Lập đơn: đã mở thương lượng thì phải thống nhất, và hợp đồng dùng đúng bản đã thống nhất (bỏ qua số client gửi). */
export async function apDieuKhoan<T extends object>(t: GiaoDich, offerId: string, d: T): Promise<T> {
  const tt = await trangThaiDieuKhoan(t, offerId);
  if (tt.trang_thai === 'chua_de_xuat') return d;
  if (tt.trang_thai !== 'da_thong_nhat') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Hai bên chưa thống nhất điều khoản.');
  return { ...d, ...tt.ban };
}
