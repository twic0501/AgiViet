// Tầng dịch vụ trên kho bộ nhớ: lệnh đi qua dịch vụ → nghiệp vụ → kho; hai "tab" dùng chung kho; liên lạc theo cọc; mô phỏng hệ thống.
import type { NguoiLam, SoGiaoDich } from '@agiviet/nghiep-vu';
import { describe, expect, it } from 'vitest';
import { taoKhoBoNho, taoKhoHoSoBoNho } from '../src/du-lieu/kho-bo-nho.ts';
import type { KhoGiaoDich } from '../src/du-lieu/kho.ts';
import { DichVuGiaoDich } from '../src/dich-vu/giao-dich.ts';
import { chayMotNhip } from '../src/dich-vu/mo-phong-he-thong.ts';
import { benKia, donTheoNhom, viecCanLam } from '../src/dich-vu/truy-van.ts';

const NAM: NguoiLam = { vai: 'ban', id: 'ban-nam', ten: 'Chị Năm' };
const DX: NguoiLam = { vai: 'mua', id: 'mua-dx', ten: 'Nhà máy sấy Đồng Xanh' };
const hoSo = taoKhoHoSoBoNho([
  { id: NAM.id, vai: 'ban', ten: NAM.ten, vung: 'Mỹ Xương, Cao Lãnh', daXacMinh: true, lienLac: { sdt: '0918 234 421', diaChi: 'Ấp Mỹ Thạnh' } },
  { id: DX.id, vai: 'mua', ten: DX.ten, vung: 'Sa Đéc', daXacMinh: true, lienLac: { sdt: '0277 386 210', diaChi: 'KCN Sa Đéc' } },
]);

function dungDon(dv: DichVuGiaoDich) {
  const lo = dv.thucHien(NAM, { loai: 'dang_lo', matHang: 'mango', ten: 'Xoài cát Chu', kg: 5000, coSo: 'uoc_tinh', gia: null });
  const kn = dv.thucHien(DX, { loai: 'gui_loi_moi', loId: lo.ok ? lo.giaTri! : '' });
  dv.thucHien(NAM, { loai: 'tra_loi_ket_noi', ketNoiId: kn.ok ? kn.giaTri! : '', dongY: true });
  const don = dv.thucHien(DX, { loai: 'tao_don', loId: lo.ok ? lo.giaTri! : '', kg: 2000, gia: 12000 });
  return don.ok ? don.giaTri! : '';
}

describe('Dịch vụ giao dịch', () => {
  it('chạy lệnh qua nghiệp vụ và ghi kho; lỗi nghiệp vụ không ghi', () => {
    const kho = taoKhoBoNho(); const dv = new DichVuGiaoDich(kho);
    const ma = dungDon(dv);
    const pb = kho.doc().phienBan;
    const sai = dv.thucHien(DX, { loai: 'buoc_don', ma, buoc: 'xacNhanDon', thamSo: [] });
    expect(sai.ok).toBe(false);
    expect(kho.doc().phienBan).toBe(pb);
    expect(dv.thucHien(NAM, { loai: 'buoc_don', ma, buoc: 'xacNhanDon', thamSo: [] }).ok).toBe(true);
    expect(viecCanLam(dv.doc(), DX, dv.bayGio()).don.map(d => d.ma)).toEqual([ma]);
    expect(donTheoNhom(dv.doc(), NAM, dv.bayGio()).cho).toHaveLength(1);
  });

  it('tab khác ghi chen giữa lúc đọc và ghi: tự đọc lại, áp dụng lại trên dữ liệu mới', () => {
    const goc = taoKhoBoNho();
    let chen = true;
    // Kho giả: lần ghi đầu tiên của dịch vụ A bị một lần ghi của "tab B" chen trước
    const khoA: KhoGiaoDich = { ...goc, ghi(so: SoGiaoDich, pb: number) {
      if (chen) { chen = false; const b = goc.doc(); goc.ghi({ ...b.so, dem: { ...b.so.dem, lo: b.so.dem.lo + 10 } }, b.phienBan); }
      return goc.ghi(so, pb);
    } };
    const dv = new DichVuGiaoDich(khoA);
    const kq = dv.thucHien(NAM, { loai: 'dang_lo', matHang: 'x', ten: 'Bưởi', kg: 100, coSo: 'da_can', gia: 30000 });
    expect(kq).toEqual({ ok: true, giaTri: 'LO-11' });   // mã tính trên dữ liệu đã có thay đổi của tab B
  });

  it('hai tab cùng bấm xác nhận một đơn: chỉ một lần thành công', () => {
    const kho = taoKhoBoNho(); const tab1 = new DichVuGiaoDich(kho), tab2 = new DichVuGiaoDich(kho);
    const ma = dungDon(tab1);
    const a = tab1.thucHien(NAM, { loai: 'buoc_don', ma, buoc: 'xacNhanDon', thamSo: [] });
    const b = tab2.thucHien(NAM, { loai: 'buoc_don', ma, buoc: 'xacNhanDon', thamSo: [] });
    expect([a.ok, b.ok]).toEqual([true, false]);
    expect(kho.doc().so.lo[0]!.hua).toBe(2000);
  });

  it('liên lạc bên kia chỉ có sau khi đặt cọc; vùng và xác minh luôn thấy', () => {
    const dv = new DichVuGiaoDich(taoKhoBoNho()); const ma = dungDon(dv);
    dv.thucHien(NAM, { loai: 'buoc_don', ma, buoc: 'xacNhanDon', thamSo: [] });
    const truoc = benKia(dv.doc().don[0]!, DX, hoSo);
    expect(truoc).toMatchObject({ ten: NAM.ten, vung: 'Mỹ Xương, Cao Lãnh', daXacMinh: true, lienLac: null });
    dv.thucHien(DX, { loai: 'buoc_don', ma, buoc: 'datCoc', thamSo: [] });
    expect(benKia(dv.doc().don[0]!, DX, hoSo).lienLac?.sdt).toBe('0918 234 421');
    expect(benKia(dv.doc().don[0]!, NAM, hoSo).lienLac?.sdt).toBe('0277 386 210');
  });

  it('mô phỏng hệ thống: giải ngân tiền đảm bảo và đóng đơn quá hạn cọc', () => {
    let gio = Date.UTC(2026, 9, 9);
    const dv = new DichVuGiaoDich(taoKhoBoNho(), { bayGio: () => gio });
    const a = dungDon(dv);
    dv.thucHien(NAM, { loai: 'buoc_don', ma: a, buoc: 'xacNhanDon', thamSo: [] });
    dv.thucHien(DX, { loai: 'buoc_don', ma: a, buoc: 'datCoc', thamSo: [] });
    dv.thucHien(DX, { loai: 'buoc_don', ma: a, buoc: 'nhapKetQua', thamSo: [2000, 0] });
    dv.thucHien(NAM, { loai: 'buoc_don', ma: a, buoc: 'ketQuaDung', thamSo: [] });
    dv.thucHien(DX, { loai: 'buoc_don', ma: a, buoc: 'chuyenTienDamBao', thamSo: [dv.doc().don[0]!.conPhaiTra ?? 0] });
    const b = dv.thucHien(DX, { loai: 'tao_don', loId: 'LO-1', kg: 1000, gia: 12000 });
    dv.thucHien(NAM, { loai: 'buoc_don', ma: b.ok ? b.giaTri! : '', buoc: 'xacNhanDon', thamSo: [] });
    gio += 49 * 3600_000;
    expect(chayMotNhip(dv)).toBe(2);
    expect(dv.doc().don.map(d => d.trangThai).sort()).toEqual(['da_nhan_tien', 'qua_han']);
    expect(chayMotNhip(dv)).toBe(0);
  });
});
