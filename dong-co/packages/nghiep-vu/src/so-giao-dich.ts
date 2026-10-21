// Sổ giao dịch và hàm apDung: cửa duy nhất để thay đổi dữ liệu.
// apDung(sổ, lệnh, người làm, giờ) → sổ mới, hoặc lỗi. Không sửa sổ cũ, không đọc giờ hệ thống, không đụng lưu trữ.
import { CHINH_SACH_MAC_DINH } from './chinh-sach.ts';
import type { KetQua, NguoiLam, SoGiaoDich } from './kieu.ts';
import type { BangXuLy, KetQuaLenh, NguCanhLenh } from './lenh/chung.ts';
import { XU_LY_DON, type LenhBuocDon, type LenhDon } from './lenh/don.ts';
import { XU_LY_KET_NOI, type LenhKetNoi } from './lenh/ket-noi.ts';
import { XU_LY_KHAC, type LenhKhac } from './lenh/khac.ts';
import { XU_LY_LO, type LenhLo } from './lenh/lo.ts';
import { XU_LY_NGUOI_DUNG, type LenhNguoiDung } from './lenh/nguoi-dung.ts';
import { XU_LY_THU_MUA, type LenhThuMua } from './lenh/thu-mua.ts';
import { XU_LY_TRAO_DOI, type LenhTraoDoi } from './lenh/trao-doi.ts';
import { XU_LY_VUON, type LenhVuon } from './lenh/vuon.ts';

export type { LenhBuocDon };
export type Lenh = LenhNguoiDung | LenhLo | LenhKetNoi | LenhTraoDoi | LenhDon | LenhVuon | LenhThuMua | LenhKhac;

export const soTrong = (): SoGiaoDich => ({
  phienBan: 2, nguoiDung: [], lo: [], nhuCau: [], ketNoi: [], tinNhan: [], baoGia: [], henXem: [], don: [], deNghi: [],
  vuon: [], muaVu: [], nhatKy: [], thuChi: [], kho: [], donNgoai: [], keHoach: [], moiQuenNgoai: [],
  dichVu: [], ungTien: [], hoTro: [], baoCao: [], danhGia: [], chinhSach: structuredCloneJson(CHINH_SACH_MAC_DINH), dem: {},
});

/** Kết quả một lệnh: sổ mới + mã đối tượng vừa tạo hoặc vừa đổi (để giao diện mở đúng chỗ). */
export interface DaApDung {
  so: SoGiaoDich;
  doiTuong?: string;
}

/** Sổ chỉ chứa dữ liệu JSON thuần nên sao chép qua JSON là đủ và không phụ thuộc môi trường chạy. */
function structuredCloneJson<T>(x: T): T { return JSON.parse(JSON.stringify(x)) as T; }

const BANG = { ...XU_LY_NGUOI_DUNG, ...XU_LY_LO, ...XU_LY_KET_NOI, ...XU_LY_TRAO_DOI, ...XU_LY_DON, ...XU_LY_VUON, ...XU_LY_THU_MUA, ...XU_LY_KHAC } as BangXuLy<Lenh>;
export const LOAI_LENH = Object.keys(BANG) as Lenh['loai'][];

export function apDung(soCu: SoGiaoDich, lenh: Lenh, nguoi: NguoiLam, bayGio: number): KetQua<DaApDung> {
  const xuLy = (BANG as Record<string, (l: Lenh, nc: NguCanhLenh) => KetQuaLenh>)[lenh.loai];
  if (!xuLy) return { ok: false, loi: `Lệnh "${lenh.loai}" không có.` };
  // Người dùng (bán, mua) phải đã đăng ký đúng vai và không bị khóa; trừ lệnh đăng ký
  if ((nguoi.vai === 'ban' || nguoi.vai === 'mua') && lenh.loai !== 'dang_ky') {
    const n = soCu.nguoiDung.find(x => x.id === nguoi.id);
    if (!n) return { ok: false, loi: 'Tài khoản chưa đăng ký.' };
    if (n.vai !== nguoi.vai) return { ok: false, loi: 'Tài khoản này không dùng được ở app này.' };
    if (n.biKhoa) return { ok: false, loi: `Tài khoản đang tạm khóa: ${n.biKhoa.lyDo}. Liên hệ hỗ trợ.` };
  }
  const so = structuredCloneJson(soCu);
  const kq = xuLy(lenh, { so, nguoi, bayGio });
  if ('loi' in kq) return { ok: false, loi: kq.loi };
  return { ok: true, giaTri: { so, ...(kq.ma !== undefined ? { doiTuong: kq.ma } : {}) } };
}
