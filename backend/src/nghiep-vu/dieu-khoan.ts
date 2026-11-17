// Thương lượng điều khoản SAU khi chốt giá, TRƯỚC khi có hợp đồng: một bên đề xuất, bên kia đồng ý / từ chối / đề xuất lại.
// Lưu bằng sự kiện bất biến (evt.domain_events) nên có đủ lịch sử mà không cần bảng mới.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { loi } from '../loi.ts';
import { phat } from './chung.ts';
import { CHINH_SACH } from '../chinh-sach.ts';

export const CACH_TRA = ['on_receipt', 'inspect_then_before_loading'] as const;
export interface MucRieng { ten: string; noi_dung: string }
export interface DieuKhoan { delivery_from: string; delivery_to: string; payment_timing: string; downgrade_price_vnd: number; transport_by: 'buyer' | 'seller'; ghi_chu?: string; muc_rieng?: MucRieng[] }
/** Ý kiến của bên trả lời cho từng mục (mã mục cố định hoặc 'rieng:<số thứ tự>'). */
export type YKien = Record<string, 'dong_y' | 'sua' | 'khong'>;

const pt = (bps: number) => `${bps / 100}%`;
/** Khung điều khoản chung của AgiViet: hai bên đọc trước khi thương lượng điều khoản riêng. Số lấy từ chinh-sach.ts. */
export function khungChung() {
  const h = CHINH_SACH.han;
  return { phien_ban: CHINH_SACH.phienBan, muc: [
    { ma: 'coc', ten: 'Cọc do ngân hàng giữ', noi_dung: `Người mua đặt cọc ${pt(CHINH_SACH.cocBps)} giá trị hợp đồng trong ${h.cocGio} giờ sau khi hai bên ký (hàng tươi ${h.cocHangTuoiGio} giờ). Ngân hàng đối tác giữ cọc; AgiViet không giữ tiền.` },
    { ma: 'tra_tien', ten: 'Trả tiền hàng', noi_dung: 'Phần còn lại người mua chuyển thẳng vào tài khoản nhận tiền ghi trong hợp đồng, theo cách trả hai bên chọn. Chỉ chuyển vào đúng tài khoản trong hợp đồng.' },
    { ma: 'nghiem_thu', ten: 'Nghiệm thu và cân', noi_dung: `Kiểm và cân tại điểm giao, có ảnh. Hợp đồng ghi số giờ người nhận phải phản hồi; quá giờ đó không phản hồi thì coi như đã nhận. Có chênh lệch thì cân lại trong ${h.canLaiGio} giờ.` },
    { ma: 'xuong_loai', ten: 'Hàng xuống loại, trả lại', noi_dung: `Hàng không đạt loại tính theo giá xuống loại ghi trong hợp đồng. Xuống loại cộng trả lại quá ${pt(CHINH_SACH.nguongHaCapTraLaiBps)} lượng cân thì người bán phải đồng ý riêng hoặc đề nghị giám định.` },
    { ma: 'huy', ten: 'Hủy đơn', noi_dung: `Trước cọc: một bên đóng đơn được ngay. Sau cọc: xin hủy, bên kia trả lời trong ${h.traLoiXinHuyGio} giờ (im lặng là không đồng ý); cọc về bên không xin hủy.` },
    { ma: 'tranh_chap', ten: 'Tranh chấp và giám định', noi_dung: `Bên nào cũng có quyền đề nghị kiểm định trong ${h.kiemDinhGio} giờ; bên sai chịu phí kiểm định. Tin nhắn, ảnh và các bản điều khoản trong app là chứng cứ.` },
    { ma: 'bat_kha_khang', ten: 'Bất khả kháng', noi_dung: 'Xin hủy vì bất khả kháng (thiên tai, dịch bệnh…) phải kèm chứng cứ gắn vào đơn; cọc và phí xử lý theo bảng hoàn.' },
    { ma: 'phi', ten: 'Phí AgiViet', noi_dung: 'Phí AgiViet tính theo gói dịch vụ, ghi rõ số tiền trên hợp đồng trước khi hai bên ký.' },
  ] };
}
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
  const dx = ds.filter((e) => e.event_type === 'dieu_khoan.de_xuat'), cuoi = ds.filter((e) => e.event_type !== 'dieu_khoan.doc_khung').at(-1);
  const lichSu = ds.map((e) => ({ loai: e.event_type.slice(11), ...e.payload }));
  const da_doc_khung = { buyer: ds.some((e) => e.event_type === 'dieu_khoan.doc_khung' && e.payload.ben === 'buyer'), seller: ds.some((e) => e.event_type === 'dieu_khoan.doc_khung' && e.payload.ben === 'seller') };
  ds.splice(0, ds.length, ...ds.filter((e) => e.event_type !== 'dieu_khoan.doc_khung'));
  const y_kien = (ds.at(-1)?.event_type === 'dieu_khoan.tu_choi' ? ds.at(-1)!.payload.y_kien : null) as YKien | null;
  if (!cuoi) return { trang_thai: 'chua_de_xuat' as const, phien_ban: 0, ban: null as any, de_xuat_boi: null as Phia | null, lich_su: lichSu, da_doc_khung, y_kien };
  const hienTai = dx.at(-1)?.payload;
  const trang_thai = cuoi.event_type === 'dieu_khoan.dong_y' ? 'da_thong_nhat' as const : cuoi.event_type === 'dieu_khoan.tu_choi' ? 'bi_tu_choi' as const : 'cho_tra_loi' as const;
  return { trang_thai, phien_ban: dx.length, ban: hienTai?.dieu_khoan ?? null, de_xuat_boi: (hienTai?.ben ?? null) as Phia | null, lich_su: lichSu, da_doc_khung, y_kien };
}

export async function xemDieuKhoan(t: GiaoDich, nd: NguoiDung, id: string) {
  const { o, phia, gia } = await cuocChot(t, nd, id);
  // Mặc định: 7 giờ sáng ngày kế tiếp (giờ VN), đủ thời gian hái và điều xe; xuống loại 70% (dưới mức này người bán phải xác nhận riêng)
  const ngayVN = new Date(t.thoiDiemMs + 7 * 3600e3).toISOString().slice(0, 10);
  const tu = new Date(Date.parse(`${ngayVN}T07:00:00+07:00`) + 864e5);
  const mac_dinh: DieuKhoan = { delivery_from: tu.toISOString(), delivery_to: new Date(tu.getTime() + 8 * 3600e3).toISOString(), payment_timing: 'on_receipt', downgrade_price_vnd: Math.ceil(gia * 0.7 / 100) * 100, transport_by: 'buyer' };
  return { ...(await trangThaiDieuKhoan(t, id)), offer_status: o.status, ben_toi: phia, gia_vnd: gia, mac_dinh, khung_chung: khungChung() };
}

export async function docKhungChung(t: GiaoDich, nd: NguoiDung, id: string) {
  const { o, phia } = await cuocChot(t, nd, id);
  if (o.status !== 'accepted') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Chỉ đọc khung điều khoản sau khi hai bên đã chốt giá.');
  const tt = await trangThaiDieuKhoan(t, id);
  if (!tt.da_doc_khung[phia]) await phat(t, 'offer', id, 'dieu_khoan.doc_khung', { ben: phia, phien_ban_khung: CHINH_SACH.phienBan });
  return { id, da_doc_khung: { ...tt.da_doc_khung, [phia]: true } };
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
  const muc_rieng = (Array.isArray(d.muc_rieng) ? d.muc_rieng : []).map((m) => ({ ten: String(m?.ten ?? '').trim().slice(0, 80), noi_dung: String(m?.noi_dung ?? '').trim().slice(0, 400) }));
  if (muc_rieng.length > 8 || muc_rieng.some((m) => !m.ten || !m.noi_dung)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Mỗi mục riêng cần tên và nội dung; tối đa 8 mục.');
  const tt = await trangThaiDieuKhoan(t, id);
  if (!tt.da_doc_khung[phia]) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Hãy đọc khung điều khoản chung của AgiViet trước.');
  if (tt.trang_thai === 'da_thong_nhat') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Điều khoản đã thống nhất, hãy tạo hợp đồng.');
  const dieu_khoan = { delivery_from: tu.toISOString(), delivery_to: den.toISOString(), payment_timing: d.payment_timing, downgrade_price_vnd: hc, transport_by: d.transport_by, ghi_chu: String(d.ghi_chu ?? '').slice(0, 300), muc_rieng };
  await phat(t, 'offer', id, 'dieu_khoan.de_xuat', { ben: phia, phien_ban: tt.phien_ban + 1, dieu_khoan });
  return { id, phien_ban: tt.phien_ban + 1, trang_thai: 'cho_tra_loi' };
}

async function traLoi(t: GiaoDich, nd: NguoiDung, id: string, phienBan: number) {
  const { o, phia } = await cuocChot(t, nd, id);
  if (!(await trangThaiDieuKhoan(t, id)).da_doc_khung[phia]) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Hãy đọc khung điều khoản chung của AgiViet trước.');
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
export async function tuChoiDieuKhoan(t: GiaoDich, nd: NguoiDung, id: string, phienBan: number, lyDo?: string, yKien?: YKien) {
  const ben = await traLoi(t, nd, id, phienBan);
  const y_kien: YKien = {};
  for (const [k, v] of Object.entries(yKien ?? {}).slice(0, 20)) if (['dong_y', 'sua', 'khong'].includes(v as string) && /^[a-z_]+(:\d+)?$/.test(k)) y_kien[k] = v;
  await phat(t, 'offer', id, 'dieu_khoan.tu_choi', { ben, phien_ban: phienBan, ly_do: String(lyDo ?? '').slice(0, 300), y_kien });
  return { id, phien_ban: phienBan, trang_thai: 'bi_tu_choi' };
}

/** Lập đơn: đã mở thương lượng thì phải thống nhất, và hợp đồng dùng đúng bản đã thống nhất (bỏ qua số client gửi). */
export async function apDieuKhoan<T extends object>(t: GiaoDich, offerId: string, d: T): Promise<T> {
  const tt = await trangThaiDieuKhoan(t, offerId);
  if (tt.trang_thai === 'chua_de_xuat') return d;
  if (tt.trang_thai !== 'da_thong_nhat') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Hai bên chưa thống nhất điều khoản.');
  const { muc_rieng, ...con } = tt.ban;
  return { ...d, ...con, ...(muc_rieng?.length ? { muc_rieng } : {}) };
}
