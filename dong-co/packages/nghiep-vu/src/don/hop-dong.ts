// Hợp đồng cọc: toàn văn dùng chung hai app (màn ký, màn xem đơn, nghe đọc, bản in).
// Hợp đồng chỉ có hiệu lực và được app bảo vệ khi cọc đi qua tài khoản đảm bảo; giao dịch ngoài app hai bên tự chịu.
import { chinhSachCua, tien, tinhCoc, tinhPhi, vnd } from '../chinh-sach.ts';
import type { Don, SoGiaoDich } from '../kieu.ts';
import { NHAN_LOAI } from '../lo.ts';

const ngay = (d: string) => d.split('-').reverse().join('/');
const phanTram = (x: number) => `${Math.round(x * 100)}%`;

/** Hiệu lực của hợp đồng: chưa cọc thì chưa ràng buộc, đã cọc thì app bảo vệ theo đúng các điều khoản và giá trên đơn. */
export function hieuLucHopDong(don: Don): { coHieuLuc: boolean; moTa: string } {
  if (don.daCoc) return { coHieuLuc: true, moTa: `Có hiệu lực từ khi bên mua đặt cọc qua tài khoản đảm bảo. App bảo vệ hai bên theo đúng giá và điều khoản dưới đây.` };
  if (['da_huy', 'qua_han', 'ban_tu_choi'].includes(don.trangThai)) return { coHieuLuc: false, moTa: 'Đơn đã đóng trước khi cọc: hợp đồng không phát sinh hiệu lực.' };
  return { coHieuLuc: false, moTa: 'Chưa có hiệu lực: hợp đồng chỉ ràng buộc và được app bảo vệ khi bên mua đặt cọc qua tài khoản đảm bảo trên app.' };
}

/** Số liệu cọc, phí của đơn (đã chốt khi người bán xác nhận; trước đó tính thử theo giá tính cọc). */
export function soLieuCoc(don: Don, so: SoGiaoDich) {
  const cs = chinhSachCua(so);
  const giaTinhCoc = don.hopDong?.giaTinhCoc ?? don.gia;
  const giaTri = tien(don.kg, don.gia), giaTriTinhCoc = tien(don.kg, giaTinhCoc);
  const quen = don.coc ? don.coc.loaiPhi === 'moi_quen' : so.don.some(x => x.ma !== don.ma && x.mua.id === don.mua.id && x.ban.id === don.ban.id && x.daCoc);
  return {
    giaTri, giaTinhCoc, giaTriTinhCoc, quen,
    coc: don.coc?.so ?? tinhCoc(giaTriTinhCoc, cs), phi: don.coc?.phi ?? tinhPhi(giaTriTinhCoc, quen, cs),
    hanCocGio: cs.hanCoc / 3600_000, tyLeCoc: cs.tyLeCoc,
  };
}

/** Toàn văn hợp đồng cọc của một đơn. thanhToan: cách trả phần còn lại (người bán chọn khi ký), bỏ trống thì nêu cả hai cách. */
export function banHopDong(don: Don, so: SoGiaoDich, thanhToan?: 'dam_bao' | 'truc_tiep'): string[] {
  const s = soLieuCoc(don, so), hd = don.hopDong, cs = chinhSachCua(so);
  const loai = hd ? NHAN_LOAI[hd.tieuChuan.loai] : 'theo mô tả của lô';
  const loiChoPhep = hd?.tieuChuan.loiChoPhep ?? cs.loiChoPhepMacDinh;
  const tt = thanhToan === 'dam_bao' ? 'bên mua chuyển phần còn lại vào tài khoản đảm bảo; ngân hàng chuyển cho bên bán sau khi nhận'
    : thanhToan === 'truc_tiep' ? 'bên mua trả trực tiếp phần còn lại cho bên bán và ghi trên ứng dụng; bên bán xác nhận khi thấy tiền'
    : 'bên mua chuyển phần còn lại qua tài khoản đảm bảo, hoặc trả trực tiếp và ghi trên ứng dụng để bên bán xác nhận';
  return [
    `HỢP ĐỒNG CỌC MUA BÁN NÔNG SẢN số ${don.ma}`,
    `Bên bán: ${don.ban.ten}. Bên mua: ${don.mua.ten}. Lập qua ứng dụng AgiViet.`,
    `Hiệu lực: ${hieuLucHopDong(don).moTa} Hai bên tự thỏa thuận, trả tiền ngoài app thì tự chịu rủi ro, app không bảo vệ và không ghi nhận.`,
    `Điều 1. Hàng hóa và giá: ${don.tenLo}, ${vnd(don.kg)} kg, ${loai}, giá ${vnd(don.gia)} đồng/kg, tổng ${vnd(s.giaTri)} đồng. Mọi thay đổi giá chỉ có hiệu lực khi bên kia đồng ý trên ứng dụng.`,
    `Điều 2. Tiêu chuẩn nghiệm thu: hàng đạt ${loai} theo mô tả, ảnh và thuộc tính của lô trên ứng dụng. Tỷ lệ hàng không đạt được trả lại không cần bằng chứng: ${phanTram(loiChoPhep)}. Trả lại vượt mức này, bên mua phải kèm ảnh hàng không đạt.`,
    hd?.giaHaCap
      ? `Điều 3. Hàng không đạt: phần đạt loại dưới bên mua nhận với giá hạ cấp ${vnd(hd.giaHaCap)} đồng/kg; phần không dùng được bên mua trả lại, không tính tiền, bên bán nhận về.`
      : 'Điều 3. Hàng không đạt: bên mua trả lại, không tính tiền, bên bán nhận về. Không có giá hạ cấp.',
    `Điều 4. Giao nhận và chuyển rủi ro: giao ngày ${ngay(don.ngayGiao)}, ${hd?.noiGiao === 'tai_kho'
      ? 'tại kho bên mua. Bên bán chịu rủi ro hàng hóa tới lúc cân tại kho'
      : 'tại vườn bên bán. Bên mua kiểm, chọn hàng trước khi bốc; hàng đã bốc lên xe thì bên mua chịu rủi ro'}. Bên mua nhập kết quả cân ba phần (đạt, hạ cấp, trả lại); bên bán xác nhận đúng hoặc không đúng. Số đã xác nhận là căn cứ tính tiền.`,
    `Điều 5. Cọc: bên mua đặt cọc ${vnd(s.coc)} đồng (${phanTram(s.tyLeCoc)} giá trị tính cọc) vào tài khoản đảm bảo trong ${s.hanCocGio} giờ. Giá tính cọc ${vnd(s.giaTinhCoc)} đồng/kg${hd?.giaThamKhao ? ` (không thấp hơn ${phanTram(cs.tyLeGiaTinhCoc)} giá tham khảo ${vnd(hd.giaThamKhao)} đồng/kg)` : ''}. Quá hạn không cọc thì hợp đồng không phát sinh hiệu lực. Cọc trừ vào tiền hàng.`,
    `Điều 6. Thanh toán: ${tt}. Tiền chỉ được bảo vệ theo đúng giá trên đơn.`,
    `Điều 7. Phí: bên mua trả phí ${s.quen ? 'mối quen' : 'giới thiệu'} ${vnd(s.phi)} đồng khi đặt cọc. Bên bán không trả phí.`,
    'Điều 8. Thay đổi, giao thiếu, hủy: thay đổi lượng, giá, ngày giao lập thành đề nghị và chỉ có hiệu lực khi bên kia đồng ý. Mất mùa, thiếu hàng thì bên bán đề nghị giảm lượng trước ngày giao; quá ngày giao không đề nghị thì ghi giao trễ vào uy tín. Sau khi cọc, bên nào xin hủy mà bên kia đồng ý thì cọc thuộc về bên kia.',
    'Điều 9. Tranh chấp chất lượng: hai bên đối soát trên ứng dụng, gửi ảnh, chứng từ; khi cần thì thuê kiểm định bên thứ ba làm căn cứ, bên sai chịu phí kiểm định. Không giải quyết được thì theo pháp luật Việt Nam.',
    ...(hd?.giaBatThuong ? [`Ghi chú: giá đơn thấp hơn nhiều so với giá tham khảo. ${hd.banDongYGiaBatThuong ? 'Bên bán đã xác nhận hiểu rằng' : 'Khi ký, bên bán phải xác nhận rằng'} tiền trả thêm ngoài app không được tài khoản đảm bảo bảo vệ, không vào bảng kê, không tính uy tín.`] : []),
  ];
}
