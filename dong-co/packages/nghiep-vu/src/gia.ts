// Giá tham khảo và giá tính cọc. App không định giá: chỉ cho hai bên thấy mặt bằng giá các đơn đã chốt, cảnh báo giá thấp
// và lấy giá sàn để tính cọc, phí (khai giá thấp không giảm được cọc, phí).
import { chinhSachCua } from './chinh-sach.ts';
import type { LoaiHang, SoGiaoDich } from './kieu.ts';
import { loaiCua } from './lo.ts';

const NGAY = 24 * 3600_000;
const DA_CHOT = ['da_chot', 'tien_dang_giu', 'bao_da_tra', 'chua_thay_tien', 'da_nhan_tien'];

export interface GiaThamKhao {
  /** Trung vị giá các đơn đã chốt cân 30 ngày qua; null khi chưa đủ số đơn tối thiểu. */
  gia: number | null;
  soDon: number;
  thap: number | null;
  cao: number | null;
}

/** Giá tham khảo theo mặt hàng (+ loại, + tỉnh của người bán). Bỏ qua đơn giá bất thường để không kéo mặt bằng xuống. */
export function giaThamKhao(so: SoGiaoDich, matHang: string, bayGio: number, loc: { loai?: LoaiHang; vung?: string } = {}): GiaThamKhao {
  const tinh = loc.vung?.split(',').at(-1)?.trim();
  const ds = so.don.filter(d => {
    if (d.matHang !== matHang || !DA_CHOT.includes(d.trangThai) || !d.ketQuaCan || d.hopDong?.giaBatThuong) return false;
    if (d.ketQuaCan.luc < bayGio - 30 * NGAY || d.ketQuaCan.luc > bayGio) return false;
    const lo = so.lo.find(l => l.id === d.loId);
    if (loc.loai && (d.hopDong?.tieuChuan.loai ?? (lo ? loaiCua(lo) : 'loai_1')) !== loc.loai) return false;
    if (tinh && !so.nguoiDung.find(n => n.id === d.ban.id)?.vung.includes(tinh)) return false;
    return true;
  }).map(d => d.gia).sort((a, b) => a - b);
  const du = ds.length >= chinhSachCua(so).soDonThamKhaoToiThieu;
  const giua = !ds.length ? 0 : ds.length % 2 ? ds[(ds.length - 1) / 2]! : (ds[ds.length / 2 - 1]! + ds[ds.length / 2]!) / 2;
  return { gia: du ? Math.round(giua / 100) * 100 : null, soDon: ds.length, thap: ds[0] ?? null, cao: ds.at(-1) ?? null };
}

export type MucGia = 'chua_du' | 'binh_thuong' | 'thap' | 'bat_thuong';
export const NHAN_MUC_GIA: Record<MucGia, string> = { chua_du: 'Chưa đủ dữ liệu', binh_thuong: 'Ngang mặt bằng', thap: 'Thấp hơn mặt bằng', bat_thuong: 'Giá bất thường' };

/** Đánh giá một mức giá so với giá tham khảo cùng loại: dùng ở màn đăng lô, báo giá, lập đơn, ký. */
export function danhGiaGia(so: SoGiaoDich, matHang: string, gia: number, bayGio: number, loai?: LoaiHang) {
  const cs = chinhSachCua(so);
  const thamKhao = giaThamKhao(so, matHang, bayGio, loai ? { loai } : {});
  if (!thamKhao.gia || !(gia > 0)) return { thamKhao, muc: 'chua_du' as MucGia, lech: 0, giaTinhCoc: gia };
  const tyLe = gia / thamKhao.gia;
  const muc: MucGia = tyLe < cs.nguongGiaBatThuong ? 'bat_thuong' : tyLe < cs.nguongGiaThap ? 'thap' : 'binh_thuong';
  return { thamKhao, muc, lech: Math.round((1 - tyLe) * 100), giaTinhCoc: Math.max(gia, Math.round((thamKhao.gia * cs.tyLeGiaTinhCoc) / 100) * 100) };
}

/** Giá vốn ước tính của một vụ: tổng chi đã ghi / sản lượng ước (đ/kg); null khi chưa ghi chi hoặc chưa ước sản lượng. */
export function giaVonUoc(so: SoGiaoDich, muaVuId: string): number | null {
  const vu = so.muaVu.find(m => m.id === muaVuId);
  if (!vu || !(vu.sanLuongUoc > 0)) return null;
  const chi = so.thuChi.filter(t => t.muaVuId === muaVuId && t.loai === 'chi').reduce((s, t) => s + t.so, 0);
  return chi ? Math.round(chi / vu.sanLuongUoc) : null;
}

/** Giá vốn ước cho hàng của một vườn: theo vụ đang chạy (hoặc vụ gần nhất) của vườn. */
export function giaVonCuaVuon(so: SoGiaoDich, vuonId: string | undefined): number | null {
  if (!vuonId) return null;
  const vu = so.muaVu.find(m => m.vuonId === vuonId && m.giaiDoan !== 'xong') ?? so.muaVu.find(m => m.vuonId === vuonId);
  return vu ? giaVonUoc(so, vu.id) : null;
}
