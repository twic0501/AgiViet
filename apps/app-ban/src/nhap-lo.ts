// Bản nháp đăng lô: các màn Mùa vụ, Sắp có hàng, luồng Đăng hàng cùng điền vào đây rồi mới gửi lệnh dang_lo.
import { timTheoChu } from '@agiviet/danh-muc';

export interface NhapLo {
  cach: 'chup' | 'noi' | 'go' | 'vu';
  matHang: string;
  ten: string;
  kg: string;
  coSo: 'uoc_tinh' | 'da_can';
  gia: string;
  nhanBaoGia: boolean;
  thuocTinh: Record<string, string>;
  choCheBien: boolean;
  haiTu: string;
  haiDen: string;
  vuonId: string;
  anh: string[];
  moTa: string;
  loiNoi: string;
  sapCo: boolean;
}
export const NHAP_LO_TRONG: NhapLo = { cach: 'chup', matHang: '', ten: '', kg: '', coSo: 'uoc_tinh', gia: '', nhanBaoGia: false, thuocTinh: {}, choCheBien: false, haiTu: '', haiDen: '', vuonId: '', anh: [], moTa: '', loiNoi: '', sapCo: false };

/** Mặt hàng trong danh mục khớp tên cây trồng của vườn (ví dụ "Xoài cát Chu" → xoai-cat-chu). */
export const matHangTuCay = (cay: string) => timTheoChu(cay, 1)[0]?.id ?? timTheoChu(cay.split(' ')[0] ?? '', 1)[0]?.id ?? '';
