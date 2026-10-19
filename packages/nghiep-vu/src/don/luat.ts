// Bảng luật các bước của đơn: nguồn duy nhất cho "ai được làm gì, ở bước nào, với điều kiện gì".
// Mỗi bước nhận bản sao của đơn và lô (được phép sửa), trả lỗi để chặn, hoặc trả dòng lịch sử (và trạng thái đích nếu tùy trường hợp).
import { tien, tinhCoc, tinhPhi, vnd, type ChinhSach } from '../chinh-sach.ts';
import type { Don, Lo, NguoiLam, SoGiaoDich, TrangThaiDon, Vai } from '../kieu.ts';
import { conBan, traLuong } from '../lo.ts';

/** Tham số của từng bước (ngoài mã đơn). */
export interface ThamSoBuoc {
  rutDon: [];
  xacNhanDon: [];
  tuChoiDon: [lyDo?: string];
  datCoc: [];
  quaHanCoc: [];
  huyTruocCoc: [lyDo?: string];
  yeuCauHuy: [lyDo?: string];
  dongYHuy: [];
  tuChoiHuy: [];
  nhapKetQua: [nhan: number, tuChoi: number];
  ketQuaDung: [];
  ketQuaSai: [];
  chuyenTienDamBao: [so: number];
  giaiNgan: [];
  baoDaTra: [so: number];
  tienDu: [];
  nhanMotPhan: [];
  tienChua: [];
  guiChungTu: [ten: string];
  ghiDoiSoat: [noiDung: string];
}
export type TenBuoc = keyof ThamSoBuoc;

export interface NguCanhBuoc {
  don: Don;
  lo: Lo | undefined;
  so: SoGiaoDich;
  nguoi: NguoiLam;
  bayGio: number;
  cs: ChinhSach;
}
export type KetQuaLam = { loi: string } | string | { den: TrangThaiDon; ghi: string };

export interface Luat<B extends TenBuoc = TenBuoc> {
  /** Tên việc, dùng trong lời báo lỗi ("không xác nhận đơn được"). */
  ten: string;
  /** Vai được làm; hàm khi phụ thuộc đơn (ví dụ: bên không xin hủy mới được đồng ý hủy). */
  ai: readonly Vai[] | ((don: Don) => readonly Vai[]);
  tu: readonly TrangThaiDon[];
  /** Trạng thái đích mặc định; bỏ trống khi bước giữ nguyên trạng thái hoặc đích tùy trường hợp. */
  den?: TrangThaiDon;
  /** Việc phụ: không tính là "tới lượt bạn" khi xếp nhóm. */
  phu?: boolean;
  lam: (nc: NguCanhBuoc, ...thamSo: ThamSoBuoc[B]) => KetQuaLam;
}

const loi = (noiDung: string) => ({ loi: noiDung });
const khac = (v: 'ban' | 'mua'): 'ban' | 'mua' => (v === 'ban' ? 'mua' : 'ban');
const tenBen = (v: Vai) => (v === 'ban' ? 'Người bán' : v === 'mua' ? 'Bên mua' : 'Hệ thống');
const laVaiNguoi = (v: Vai): v is 'ban' | 'mua' => v === 'ban' || v === 'mua';

export const LUAT: { [B in TenBuoc]: Luat<B> } = {
  rutDon: {
    ten: 'rút đơn', ai: ['mua'], tu: ['cho_ban_xac_nhan'], den: 'da_huy', phu: true,
    lam: ({ don }) => { don.huy = { ben: 'mua', lyDo: 'bên mua rút đơn' }; return 'Bên mua rút đơn trước khi người bán xác nhận'; },
  },
  xacNhanDon: {
    ten: 'xác nhận đơn', ai: ['ban'], tu: ['cho_ban_xac_nhan'], den: 'cho_coc',
    lam: ({ don, lo, so, bayGio, cs }) => {
      if (!lo) return loi('Lô của đơn không còn.');
      if (don.kg > conBan(lo)) return loi(`Lô chỉ còn bán được ${vnd(conBan(lo))} kg, đơn cần ${vnd(don.kg)} kg. Từ chối đơn hoặc hỏi bên mua giảm lượng.`);
      lo.hua += don.kg;
      const giaTri = tien(don.kg, don.gia);
      const quen = so.don.some(x => x.ma !== don.ma && x.mua.id === don.mua.id && x.ban.id === don.ban.id && x.daCoc);
      don.coc = { so: tinhCoc(giaTri, cs), phi: tinhPhi(giaTri, quen, cs), loaiPhi: quen ? 'moi_quen' : 'gioi_thieu', han: bayGio + cs.hanCoc };
      return `Người bán xác nhận đơn, giữ ${vnd(don.kg)} kg, chờ bên mua cọc ${vnd(don.coc.so)} đ`;
    },
  },
  tuChoiDon: {
    ten: 'từ chối đơn', ai: ['ban'], tu: ['cho_ban_xac_nhan'], den: 'ban_tu_choi',
    lam: ({ don }, lyDo = 'không nêu lý do') => { don.huy = { ben: 'ban', lyDo }; return `Người bán từ chối đơn: ${lyDo}`; },
  },
  datCoc: {
    ten: 'đặt cọc', ai: ['mua'], tu: ['cho_coc'], den: 'cho_giao',
    lam: ({ don, bayGio }) => {
      const coc = don.coc!;
      if (bayGio > coc.han) return loi('Đã quá hạn đặt cọc. Đơn sẽ tự đóng; tạo đơn mới nếu còn muốn mua.');
      don.daCoc = { so: coc.so, phi: coc.phi, luc: bayGio };
      return `Bên mua đặt cọc ${vnd(coc.so)} đ vào tài khoản đảm bảo, trả phí ${coc.loaiPhi === 'moi_quen' ? 'mối quen' : 'giới thiệu'} ${vnd(coc.phi)} đ. Mở liên lạc hai bên`;
    },
  },
  quaHanCoc: {
    ten: 'đóng đơn quá hạn cọc', ai: ['he_thong'], tu: ['cho_coc'], den: 'qua_han',
    lam: ({ don, lo, bayGio }) => {
      if (bayGio <= don.coc!.han) return loi('Chưa tới hạn cọc.');
      traLuong(lo, don.kg);
      return 'Quá hạn chưa cọc: đơn đóng, trả lại lượng cho lô';
    },
  },
  huyTruocCoc: {
    ten: 'hủy đơn', ai: ['ban', 'mua'], tu: ['cho_coc'], den: 'da_huy', phu: true,
    lam: ({ don, lo, nguoi }, lyDo = 'không nêu lý do') => {
      if (!laVaiNguoi(nguoi.vai)) return loi('Chỉ người bán hoặc bên mua hủy được đơn.');
      traLuong(lo, don.kg);
      don.huy = { ben: nguoi.vai, lyDo };
      return `${tenBen(nguoi.vai)} hủy trước khi cọc: ${lyDo}. Trả lại lượng cho lô`;
    },
  },
  yeuCauHuy: {
    ten: 'xin hủy đơn', ai: ['ban', 'mua'], tu: ['cho_giao'], den: 'cho_dong_y_huy', phu: true,
    lam: ({ don, nguoi }, lyDo = 'không nêu lý do') => {
      if (!laVaiNguoi(nguoi.vai)) return loi('Chỉ người bán hoặc bên mua xin hủy được đơn.');
      don.huy = { ben: nguoi.vai, lyDo, truoc: don.trangThai };
      return `${tenBen(nguoi.vai)} xin hủy đơn: ${lyDo}`;
    },
  },
  dongYHuy: {
    ten: 'đồng ý hủy', ai: don => (don.huy ? [khac(don.huy.ben)] : []), tu: ['cho_dong_y_huy'], den: 'da_huy',
    lam: ({ don, lo }) => {
      const huy = don.huy!;
      traLuong(lo, don.kg);
      huy.cocVe = khac(huy.ben);
      return `Bên kia đồng ý hủy. Cọc ${vnd(don.daCoc?.so)} đ thuộc về ${huy.cocVe === 'ban' ? 'người bán' : 'bên mua'}. Trả lại lượng cho lô`;
    },
  },
  tuChoiHuy: {
    ten: 'không đồng ý hủy', ai: don => (don.huy ? [khac(don.huy.ben)] : []), tu: ['cho_dong_y_huy'],
    lam: ({ don }) => {
      const den = don.huy?.truoc ?? 'cho_giao';
      delete don.huy;
      return { den, ghi: 'Bên kia không đồng ý hủy, đơn tiếp tục' };
    },
  },
  nhapKetQua: {
    ten: 'nhập kết quả cân', ai: ['mua'], tu: ['cho_giao'], den: 'cho_ban_xn_kq',
    lam: ({ don, bayGio }, nhan, tuChoi) => {
      if (!(nhan >= 0) || !(tuChoi >= 0) || nhan + tuChoi <= 0) return loi('Nhập số kg nhận và không nhận (không âm).');
      if (nhan + tuChoi > don.kg) return loi(`Nhận + không nhận vượt ${vnd(don.kg)} kg của đơn.`);
      don.ketQuaCan = { nhan, tuChoi, luc: bayGio, nguon: 'tu_khai' };
      return `Bên mua nhập cân: nhận ${vnd(nhan)} kg, không nhận ${vnd(tuChoi)} kg (tự khai)`;
    },
  },
  ketQuaDung: {
    ten: 'xác nhận kết quả cân', ai: ['ban'], tu: ['cho_ban_xn_kq'], den: 'da_chot',
    lam: ({ don, lo }) => {
      const kq = don.ketQuaCan!, coc = don.daCoc!.so;
      kq.nguon = 'ben_kia_xac_nhan';
      don.phaiTra = tien(kq.nhan, don.gia);
      don.conPhaiTra = Math.max(0, don.phaiTra - coc);
      don.daTra = Math.min(don.phaiTra, coc);
      if (lo) lo.giao += kq.nhan;
      if (!don.conPhaiTra) {
        // Tiền hàng không quá tiền cọc: cọc trả đủ, phần dư hoàn bên mua, đơn đóng luôn
        don.hoanCoc = coc - don.phaiTra;
        return { den: 'da_nhan_tien', ghi: `Người bán xác nhận kết quả. Tiền hàng ${vnd(don.phaiTra)} đ trừ vào cọc${don.hoanCoc ? `, hoàn ${vnd(don.hoanCoc)} đ cọc dư cho bên mua` : ''}. Đơn đóng` };
      }
      return `Người bán xác nhận kết quả. Tiền hàng ${vnd(don.phaiTra)} đ, trừ cọc còn phải trả ${vnd(don.conPhaiTra)} đ`;
    },
  },
  ketQuaSai: {
    ten: 'báo kết quả cân không đúng', ai: ['ban'], tu: ['cho_ban_xn_kq'], den: 'cho_giao',
    lam: ({ don }) => { don.ketQuaCan!.phanDoi = true; return 'Người bán báo kết quả cân không đúng; bên mua nhập lại hoặc mở đối soát'; },
  },
  chuyenTienDamBao: {
    ten: 'chuyển tiền vào tài khoản đảm bảo', ai: ['mua'], tu: ['da_chot'], den: 'tien_dang_giu',
    lam: ({ don, bayGio }, so) => {
      if (so !== don.conPhaiTra) return loi(`Tài khoản đảm bảo nhận đúng số còn phải trả: ${vnd(don.conPhaiTra)} đ.`);
      don.thanhToan = 'dam_bao';
      don.tra = { so, luc: bayGio };
      return `Bên mua chuyển ${vnd(so)} đ vào tài khoản đảm bảo`;
    },
  },
  giaiNgan: {
    ten: 'chuyển tiền cho người bán', ai: ['he_thong'], tu: ['tien_dang_giu'], den: 'da_nhan_tien',
    lam: ({ don }) => {
      don.daTra = (don.daTra ?? 0) + don.tra!.so;
      don.conPhaiTra = 0;
      return `Ngân hàng chuyển ${vnd(don.phaiTra)} đ (gồm cọc) vào tài khoản người bán. Đơn đóng`;
    },
  },
  baoDaTra: {
    ten: 'ghi trả tiền', ai: ['mua'], tu: ['da_chot', 'chua_thay_tien'], den: 'bao_da_tra',
    lam: ({ don, bayGio }, so) => {
      const con = don.conPhaiTra ?? 0;
      if (!(so > 0) || so > con) return loi(`Số trả phải lớn hơn 0 và không quá ${vnd(con)} đ còn phải trả.`);
      don.thanhToan = 'truc_tiep';
      don.tra = { so, luc: bayGio };
      return `Bên mua báo đã trả ${vnd(so)} đ`;
    },
  },
  tienDu: {
    ten: 'xác nhận đã nhận đủ', ai: ['ban'], tu: ['bao_da_tra', 'chua_thay_tien'], den: 'da_nhan_tien',
    lam: ({ don }) => {
      const tra = don.tra?.so ?? 0, con = don.conPhaiTra ?? 0;
      if (tra < con) return loi(`Bên mua mới báo trả ${vnd(tra)} đ, còn thiếu ${vnd(con - tra)} đ. Thấy đúng số này thì bấm Nhận một phần.`);
      const doiSoat = don.trangThai === 'chua_thay_tien';
      don.daTra = (don.daTra ?? 0) + tra;
      don.conPhaiTra = 0;
      return doiSoat ? 'Người bán thấy tiền: đóng đối soát, đã nhận đủ' : 'Người bán xác nhận đã nhận đủ';
    },
  },
  nhanMotPhan: {
    ten: 'xác nhận nhận một phần', ai: ['ban'], tu: ['bao_da_tra'], den: 'da_chot',
    lam: ({ don }) => {
      const tra = don.tra?.so ?? 0, con = don.conPhaiTra ?? 0;
      if (tra >= con) return loi('Bên mua đã báo trả đủ. Bấm Đã nhận đủ.');
      don.daTra = (don.daTra ?? 0) + tra;
      don.conPhaiTra = con - tra;
      don.tra = null;
      return `Người bán nhận ${vnd(tra)} đ, còn phải trả ${vnd(don.conPhaiTra)} đ`;
    },
  },
  tienChua: {
    ten: 'báo chưa thấy tiền', ai: ['ban'], tu: ['bao_da_tra'], den: 'chua_thay_tien',
    lam: () => 'Người bán báo chưa thấy tiền, mở đối soát',
  },
  guiChungTu: {
    ten: 'gửi chứng từ', ai: ['mua'], tu: ['chua_thay_tien'], phu: true,
    lam: ({ don, bayGio }, ten) => {
      if (!ten?.trim()) return loi('Ghi tên chứng từ.');
      (don.chungTu ??= []).push({ ten, luc: bayGio });
      return { den: don.trangThai, ghi: `Bên mua gửi chứng từ: ${ten}` };
    },
  },
  ghiDoiSoat: {
    ten: 'ghi đối soát', ai: ['ban', 'mua'], tu: ['chua_thay_tien'], phu: true,
    lam: ({ don, nguoi, bayGio }, noiDung) => {
      if (!laVaiNguoi(nguoi.vai)) return loi('Chỉ hai bên ghi được vào đối soát.');
      if (!noiDung?.trim()) return loi('Ghi nội dung đối soát.');
      (don.doiSoat ??= []).push({ vai: nguoi.vai, noiDung, luc: bayGio });
      return { den: don.trangThai, ghi: `${tenBen(nguoi.vai)}: ${noiDung}` };
    },
  },
};

export const TEN_BUOC = Object.keys(LUAT) as TenBuoc[];
export const aiLam = (luat: Luat, don: Don): readonly Vai[] => (typeof luat.ai === 'function' ? luat.ai(don) : luat.ai);
