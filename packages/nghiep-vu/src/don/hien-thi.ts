// Cách một vai nhìn một đơn: làm được bước nào, đơn thuộc nhóm nào ("tới lượt ai"), việc tiếp theo, chặng đang ở.
import { vnd } from '../chinh-sach.ts';
import type { Don, Vai } from '../kieu.ts';
import { LUAT, TEN_BUOC, aiLam, type TenBuoc } from './luat.ts';
import { CHANG_CUA, KET_THUC } from './trang-thai.ts';

/** Năm nhóm hiển thị, trả lời câu hỏi "tới lượt ai". */
export type Nhom = 'lam' | 'cho' | 'xong' | 'loi' | 'het';
export const NHAN_NHOM: Record<Nhom, string> = { lam: 'Bạn cần làm', cho: 'Chờ bên kia', xong: 'Đã xong', loi: 'Có vấn đề', het: 'Đã kết thúc' };

/** Các bước vai này làm được ngay bây giờ (đã kiểm trạng thái và vai; điều kiện số liệu kiểm khi thực hiện). */
export const buocDuoc = (don: Don, vai: Vai): TenBuoc[] =>
  TEN_BUOC.filter(k => LUAT[k].tu.includes(don.trangThai) && aiLam(LUAT[k] as never, don).includes(vai));

export function nhom(don: Don, vai: Vai, bayGio: number): Nhom {
  if (don.trangThai === 'da_nhan_tien') return 'xong';
  if (KET_THUC.includes(don.trangThai)) return 'het';
  if (don.trangThai === 'chua_thay_tien') return 'loi';
  if (don.trangThai === 'cho_coc' && don.coc && bayGio > don.coc.han) return 'loi';
  return buocDuoc(don, vai).some(k => !LUAT[k].phu) ? 'lam' : 'cho';
}

/** Chặng đang ở (0–6). Đơn hủy giữ chặng của trạng thái trước khi hủy, hoặc chặng cọc nếu đã xác nhận. */
export function changCua(don: Don): number {
  const c = CHANG_CUA[don.trangThai];
  if (c !== undefined) return c;
  if (don.huy?.truoc) return CHANG_CUA[don.huy.truoc] ?? 1;
  return don.daCoc ? 3 : don.coc ? 2 : 1;
}

/** Liên lạc (số điện thoại, địa chỉ) của hai bên chỉ mở sau khi bên mua đặt cọc. */
export const lienLacDaMo = (don: Don): boolean => !!don.daCoc;

const gioNgay = (t: number) => {
  const x = new Date(t);
  return `${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')} ngày ${x.getDate()}/${x.getMonth() + 1}`;
};

/** Một câu "việc tiếp theo", viết cho đúng vai đang xem. */
export function viecTiep(don: Don, vai: 'ban' | 'mua'): string {
  const ban = vai === 'ban';
  switch (don.trangThai) {
    case 'cho_ban_xac_nhan':
      return ban ? 'Xem lượng, giá rồi xác nhận hoặc từ chối. Chưa xác nhận thì lượng chưa bị giữ.' : 'Chờ người bán xác nhận. Bạn vẫn rút đơn được.';
    case 'cho_coc': {
      const c = don.coc!;
      return ban
        ? `Chờ bên mua đặt cọc ${vnd(c.so)} đ trước ${gioNgay(c.han)}. Số điện thoại hai bên mở sau khi cọc.`
        : `Đặt cọc ${vnd(c.so)} đ và trả phí ${c.loaiPhi === 'moi_quen' ? 'mối quen' : 'giới thiệu'} ${vnd(c.phi)} đ trước ${gioNgay(c.han)}. Cọc xong mới thấy số điện thoại, địa chỉ người bán.`;
    }
    case 'cho_giao':
      return ban
        ? 'Giao hàng theo lịch. Bên mua cân xong sẽ gửi số để bạn xác nhận.'
        : `Nhận hàng, cân rồi gửi kết quả cân.${don.ketQuaCan?.phanDoi ? ' Người bán báo số lần trước không đúng: kiểm lại rồi gửi lại.' : ''}`;
    case 'cho_dong_y_huy':
      return don.huy?.ben === vai ? 'Bạn đã xin hủy. Chờ bên kia trả lời.' : `Bên kia xin hủy (${don.huy?.lyDo}). Nếu bạn đồng ý, cọc ${vnd(don.daCoc?.so)} đ thuộc về bạn.`;
    case 'cho_ban_xn_kq':
      return ban ? 'Đối chiếu phiếu cân rồi bấm Đúng hoặc Không đúng.' : 'Chờ người bán xác nhận số cân.';
    case 'da_chot':
      return ban
        ? `Chờ bên mua trả ${vnd(don.conPhaiTra)} đ còn lại (đã trừ cọc).`
        : `Trả ${vnd(don.conPhaiTra)} đ còn lại: chuyển vào tài khoản đảm bảo (tự về người bán), hoặc trả trực tiếp rồi ghi trả.`;
    case 'tien_dang_giu':
      return ban ? 'Tiền đã vào tài khoản đảm bảo, ngân hàng đang chuyển cho bạn.' : 'Tiền đã vào tài khoản đảm bảo. Bạn không cần làm gì thêm.';
    case 'bao_da_tra':
      return ban ? `Mở sổ ngân hàng. Thấy ${vnd(don.tra?.so)} đ thì xác nhận; chưa thấy thì báo chưa thấy.` : 'Chờ người bán xem sổ ngân hàng và xác nhận.';
    case 'chua_thay_tien':
      return ban ? 'Xem lại sổ ngân hàng. Thấy tiền thì bấm Đã thấy tiền. App không kết luận bên nào sai.' : 'Gửi ủy nhiệm chi hoặc ảnh chuyển khoản. App không kết luận bên nào sai.';
    case 'da_nhan_tien':
      return 'Đơn đã đóng. Không còn việc cần làm.';
    case 'ban_tu_choi':
      return `Người bán đã từ chối đơn (${don.huy?.lyDo ?? 'không nêu lý do'}).`;
    case 'qua_han':
      return 'Quá hạn cọc: đơn đã đóng, lượng đã trả lại cho lô.';
    case 'da_huy':
      return `Đơn đã hủy${don.huy?.cocVe ? `; cọc thuộc về ${don.huy.cocVe === 'ban' ? 'người bán' : 'bên mua'}` : ''}.`;
  }
}
