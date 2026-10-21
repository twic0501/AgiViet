// Cơ chế chất lượng, giá và chống lách: giá tham khảo, giá tính cọc theo giá sàn, giá bất thường, hợp đồng cọc,
// nghiệm thu 3 phần, hàng trả lại thành lô bán gấp, tách lô theo loại, người nhận hàng kém loại, bao tiêu, giao trễ.
import { describe, expect, it } from 'vitest';
import { banHopDong, danhGiaGia, giaThamKhao, giaVonUoc, hieuLucHopDong, loNenBanGap, loKemLoaiKhop, nguoiNhanHangKemLoai, tinhCoc, uyTin } from '../src/index.ts';
import { BAY, DONG_XANH, HE_THONG, MIEN_TAY, NAM, Phien, VAN_HANH } from './phien.ts';

const NGAY = 24 * 3600_000;
const ANH = ['anh-hang-khong-dat.jpg'];

/** Phiên có 3 đơn chanh dây đã chốt ở 24.000, 25.000, 26.000 đ/kg: giá tham khảo 25.000. */
function coGiaThamKhao() {
  const p = new Phien();
  const lo = p.loSanSang(20_000);
  for (const gia of [24000, 25000, 26000]) {
    const ma = p.taoDon(lo, 1000, gia).ma!;
    p.buoc(NAM, ma, 'xacNhanDon'); p.buoc(DONG_XANH, ma, 'datCoc');
    p.buoc(DONG_XANH, ma, 'nhapKetQua', 1000, 0); p.buoc(NAM, ma, 'ketQuaDung');
  }
  return { p, lo };
}
const donMoi = (p: Phien, lo: string, kg: number, gia: number, them: Record<string, unknown> = {}) =>
  p.lam(DONG_XANH, { loai: 'tao_don', loId: lo, kg, gia, ngayGiao: p.ngay(3), ...them } as never);

describe('Giá tham khảo', () => {
  it('chưa đủ 3 đơn đã chốt thì chưa có giá; đủ thì lấy trung vị, bỏ đơn giá bất thường', () => {
    const p = new Phien();
    expect(giaThamKhao(p.so, 'passion-fruit', p.gio).gia).toBeNull();
    const { p: q } = coGiaThamKhao();
    expect(giaThamKhao(q.so, 'passion-fruit', q.gio)).toMatchObject({ gia: 25000, soDon: 3, thap: 24000, cao: 26000 });
    expect(giaThamKhao(q.so, 'passion-fruit', q.gio + 31 * NGAY).gia).toBeNull();
    expect(giaThamKhao(q.so, 'passion-fruit', q.gio, { loai: 'loai_2' }).gia).toBeNull();
  });
  it('đánh giá giá: ngang mặt bằng, thấp (< 80%), bất thường (< 60%); giá tính cọc không dưới 70% giá tham khảo', () => {
    const { p } = coGiaThamKhao();
    expect(danhGiaGia(p.so, 'passion-fruit', 24000, p.gio)).toMatchObject({ muc: 'binh_thuong', giaTinhCoc: 24000 });
    expect(danhGiaGia(p.so, 'passion-fruit', 19000, p.gio)).toMatchObject({ muc: 'thap', lech: 24, giaTinhCoc: 19000 });
    expect(danhGiaGia(p.so, 'passion-fruit', 10000, p.gio)).toMatchObject({ muc: 'bat_thuong', giaTinhCoc: 17500 });
  });
  it('giá vốn ước = chi của vụ / sản lượng ước', () => {
    const p = new Phien();
    p.so.muaVu.push({ id: 'VU-1', vuonId: 'V-1', ban: NAM, ten: 'Vụ chanh dây', batDau: '2026-06-01', giaiDoan: 'thu_hoach', sanLuongUoc: 10_000, haiDuKien: '2026-10-20' });
    expect(giaVonUoc(p.so, 'VU-1')).toBeNull();
    for (const so of [60_000_000, 20_000_000]) p.so.thuChi.push({ id: `TC-${so}`, ban: NAM, muaVuId: 'VU-1', loai: 'chi', so, noiDung: 'phân, thuốc', ngay: '2026-07-01', luc: p.gio });
    expect(giaVonUoc(p.so, 'VU-1')).toBe(8000);
    expect(giaVonUoc(p.so, 'khong-co')).toBeNull();
  });
});

describe('Hợp đồng cọc và chống khai giá thấp', () => {
  it('khai giá thấp không giảm được cọc, phí: tính trên giá tính cọc', () => {
    const { p, lo } = coGiaThamKhao();
    const ma = donMoi(p, lo, 1000, 15000).ma!;
    expect(p.don(ma).hopDong).toMatchObject({ giaThamKhao: 25000, giaTinhCoc: 17500, noiGiao: 'tai_vuon', tieuChuan: { loai: 'loai_1', loiChoPhep: 0.05 } });
    expect(p.don(ma).hopDong?.giaBatThuong).toBeUndefined();
    p.buoc(NAM, ma, 'xacNhanDon');
    expect(p.don(ma).coc!.so).toBe(tinhCoc(1000 * 17500));
  });
  it('giá bất thường (< 60%): người bán phải xác nhận thêm mới ký được', () => {
    const { p, lo } = coGiaThamKhao();
    const ma = donMoi(p, lo, 1000, 10000).ma!;
    expect(p.don(ma).hopDong?.giaBatThuong).toBe(true);
    expect(p.buoc(NAM, ma, 'xacNhanDon').loi).toMatch(/bất thường/);
    expect(p.buoc(NAM, ma, 'xacNhanDon', true).loi).toBeUndefined();
    expect(p.don(ma).hopDong?.banDongYGiaBatThuong).toBe(p.gio);
    // Đơn giá bất thường không kéo giá tham khảo xuống
    p.buoc(DONG_XANH, ma, 'datCoc'); p.buoc(DONG_XANH, ma, 'nhapKetQua', 1000, 0); p.buoc(NAM, ma, 'ketQuaDung');
    expect(giaThamKhao(p.so, 'passion-fruit', p.gio).soDon).toBe(3);
  });
  it('đổi giá xuống mức bất thường thì đánh dấu lại; giá mới không dưới giá hạ cấp', () => {
    const { p, lo } = coGiaThamKhao();
    const ma = donMoi(p, lo, 1000, 25000, { giaHaCap: 15000 }).ma!;
    expect(p.lam(NAM, { loai: 'de_nghi_don', ma, deNghi: 'doi_gia', giaTri: '14000', lyDo: 'x' }).loi).toMatch(/hạ cấp/);
    const dn = p.lam(DONG_XANH, { loai: 'de_nghi_don', ma, deNghi: 'doi_gia', giaTri: '16000', lyDo: 'giá rớt' }).ma!;
    p.lam(NAM, { loai: 'tra_loi_de_nghi', deNghiId: dn, dongY: true });
    expect(p.don(ma).hopDong).toMatchObject({ giaTinhCoc: 17500 });
    expect(p.don(ma).hopDong?.giaBatThuong).toBeUndefined();
  });
  it('điều khoản sai bị chặn: giá hạ cấp không thấp hơn giá đơn, tỷ lệ lỗi ngoài 0–50%', () => {
    const { p, lo } = coGiaThamKhao();
    expect(donMoi(p, lo, 1000, 25000, { giaHaCap: 25000 }).loi).toMatch(/hạ cấp/);
    expect(donMoi(p, lo, 1000, 25000, { loiChoPhep: 0.8 }).loi).toMatch(/0 đến 50%/);
  });
  it('toàn văn hợp đồng: chưa hiệu lực trước cọc, có hiệu lực sau cọc; nêu giá hạ cấp, nơi giao, giá tính cọc', () => {
    const { p, lo } = coGiaThamKhao();
    const ma = donMoi(p, lo, 1000, 15000, { giaHaCap: 9000, noiGiao: 'tai_kho' }).ma!;
    expect(hieuLucHopDong(p.don(ma)).coHieuLuc).toBe(false);
    const ban = banHopDong(p.don(ma), p.so).join('\n');
    expect(ban).toMatch(/Chưa có hiệu lực/);
    expect(ban).toMatch(/9\.000 đồng\/kg/);
    expect(ban).toMatch(/tại kho bên mua/);
    expect(ban).toMatch(/Giá tính cọc 17\.500/);
    expect(ban).toMatch(/ngoài app/);
    p.buoc(NAM, ma, 'xacNhanDon'); p.buoc(DONG_XANH, ma, 'datCoc');
    expect(hieuLucHopDong(p.don(ma)).coHieuLuc).toBe(true);
    expect(banHopDong(p.don(ma), p.so, 'dam_bao').join('\n')).toMatch(/Có hiệu lực/);
  });
});

describe('Nghiệm thu 3 phần', () => {
  it('đạt + hạ cấp + trả lại: tiền = đạt × giá + hạ cấp × giá hạ cấp; trả lại vượt mức cho phép phải có ảnh', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const ma = donMoi(p, lo, 1000, 25000, { giaHaCap: 15000 }).ma!;
    p.buoc(NAM, ma, 'xacNhanDon'); p.buoc(DONG_XANH, ma, 'datCoc');
    expect(p.buoc(DONG_XANH, ma, 'nhapKetQua', 800, 100, 100).loi).toMatch(/ảnh/);
    expect(p.buoc(DONG_XANH, ma, 'nhapKetQua', 800, 150, 100, ANH).loi).toMatch(/vượt/);
    expect(p.buoc(DONG_XANH, ma, 'nhapKetQua', 870, 30, 100).loi).toBeUndefined();
    p.buoc(NAM, ma, 'ketQuaDung');
    expect(p.don(ma)).toMatchObject({ phaiTra: 870 * 25000 + 100 * 15000, trangThai: 'da_chot' });
    expect(p.lo(lo).giao).toBe(970);
  });
  it('hợp đồng không có giá hạ cấp thì không nhập phần hạ cấp được', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const ma = p.donDaCoc(lo, 1000);
    expect(p.buoc(DONG_XANH, ma, 'nhapKetQua', 900, 0, 100).loi).toMatch(/không có giá hạ cấp/);
  });
  it('tỷ lệ trả lại vào uy tín người bán', () => {
    const p = new Phien(); const lo = p.loSanSang(10_000);
    const ma = p.donDaCoc(lo, 1000);
    p.buoc(DONG_XANH, ma, 'nhapKetQua', 800, 200, 0, ANH); p.buoc(NAM, ma, 'ketQuaDung');
    expect(uyTin(p.so, NAM.id).tyLeTraLai).toBeCloseTo(0.2);
  });
});

describe('Đầu ra cho hàng kém loại', () => {
  it('phần bị trả lại thành lô loại dưới, bán gấp; mỗi đơn một lần; lô gốc giữ nguyên lượng đã hứa', () => {
    const p = new Phien(); const lo = p.loSanSang(4000);
    const ma = p.donDaCoc(lo, 1000);
    p.buoc(DONG_XANH, ma, 'nhapKetQua', 700, 300, 0, ANH);
    expect(p.lam(NAM, { loai: 'tra_hang_ve_lo', ma }).loi).toMatch(/chưa chốt/);
    p.buoc(NAM, ma, 'ketQuaDung');
    const hua = p.lo(lo).hua;
    const moi = p.lam(NAM, { loai: 'tra_hang_ve_lo', ma, gia: 12000 }).ma!;
    expect(p.lo(moi)).toMatchObject({ kg: 300, coSo: 'da_can', loai: 'loai_2', choCheBien: true, gia: 12000, traVeTuDon: ma, anh: ANH });
    expect(p.lo(moi).banGap!.den).toBe(p.gio + 3 * NGAY);
    expect(p.lo(lo).hua).toBe(hua);
    expect(p.don(ma).traVeLoId).toBe(moi);
    expect(p.lam(NAM, { loai: 'tra_hang_ve_lo', ma }).loi).toMatch(/đã thành lô/);
    expect(p.lam(DONG_XANH, { loai: 'tra_hang_ve_lo', ma }).loi).toBeDefined();
  });
  it('tách lô theo loại: phần kém loại thành lô cho chế biến, lô gốc giảm lượng; không tách hết', () => {
    const p = new Phien(); const lo = p.loSanSang(4000);
    p.donDaCoc(lo, 1000);
    expect(p.lam(NAM, { loai: 'tach_lo', loId: lo, phan: [{ loai: 'loai_2', kg: 3000, gia: 15000 }] }).loi).toMatch(/nhỏ hơn/);
    const moi = p.lam(NAM, { loai: 'tach_lo', loId: lo, phan: [{ loai: 'loai_2', kg: 800, gia: 15000 }, { loai: 'dat', kg: 200, gia: null }] }).ma!;
    expect(p.lo(lo)).toMatchObject({ kg: 3000, hua: 1000, loai: 'loai_1' });
    expect(p.lo(moi)).toMatchObject({ kg: 800, loai: 'loai_2', choCheBien: true, hua: 0, tachTu: lo, ten: 'Chanh dây · loại 2' });
    expect(p.so.lo.filter(l => l.tachTu === lo)).toHaveLength(2);
    expect(p.lam(BAY, { loai: 'tach_lo', loId: lo, phan: [{ loai: 'loai_2', kg: 100, gia: null }] }).loi).toBeDefined();
  });
  it('đăng lô có loại: loại 2 trở xuống tự là hàng cho chế biến; sửa loại được', () => {
    const p = new Phien();
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'passion-fruit', ten: 'Chanh dây trái nhỏ', kg: 500, coSo: 'uoc_tinh', gia: null, loaiHang: 'loai_3' }).ma!;
    expect(p.lo(lo)).toMatchObject({ loai: 'loai_3', choCheBien: true });
    p.lam(NAM, { loai: 'sua_lo', loId: lo, loaiHang: 'loai_1' });
    expect(p.lo(lo)).toMatchObject({ loai: 'loai_1', choCheBien: false });
  });
  it('bán gấp: bật, hết hạn sau 3 ngày, tắt; gợi ý bán gấp khi lô kém loại 24 giờ chưa ai hỏi', () => {
    const p = new Phien();
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'passion-fruit', ten: 'Chanh dây loại 2', kg: 600, coSo: 'uoc_tinh', gia: 14000, loaiHang: 'loai_2' }).ma!;
    expect(loNenBanGap(p.so, NAM.id, p.gio)).toHaveLength(0);
    p.gio += 25 * 3600_000;
    expect(loNenBanGap(p.so, NAM.id, p.gio).map(l => l.id)).toEqual([lo]);
    expect(p.lam(NAM, { loai: 'bat_ban_gap', loId: lo, gia: 12000 }).loi).toBeUndefined();
    expect(p.lo(lo)).toMatchObject({ gia: 12000, banGap: { tu: p.gio, den: p.gio + 3 * NGAY } });
    expect(loNenBanGap(p.so, NAM.id, p.gio)).toHaveLength(0);
    expect(p.lam(DONG_XANH, { loai: 'bat_ban_gap', loId: lo }).loi).toBeDefined();
    p.lam(NAM, { loai: 'tat_ban_gap', loId: lo });
    expect(p.lo(lo).banGap).toBeUndefined();
    expect(p.lam(NAM, { loai: 'tat_ban_gap', loId: lo }).loi).toMatch(/không bật/);
  });
  it('ai nhận hàng kém loại: bên mua đăng ký nhận, bên mua có tin cần mua, đối tác bao tiêu (vận hành ghi)', () => {
    const p = new Phien();
    const lo = p.lam(NAM, { loai: 'dang_lo', matHang: 'passion-fruit', ten: 'Chanh dây dạt', kg: 2000, coSo: 'uoc_tinh', gia: null, loaiHang: 'dat' }).ma!;
    expect(nguoiNhanHangKemLoai(p.so, p.lo(lo))).toEqual({ nhan: [], coNhuCau: [], baoTieu: [] });
    expect(p.lam(MIEN_TAY, { loai: 'cap_nhat_nhan_hang_kem_loai', bat: true, matHang: ['passion-fruit'], kgToiThieu: 500, vung: 'Đồng Tháp' }).loi).toBeUndefined();
    expect(p.lam(NAM, { loai: 'cap_nhat_nhan_hang_kem_loai', bat: true }).loi).toBeDefined();
    expect(p.lam(DONG_XANH, { loai: 'dat_bao_tieu', nguoiDungId: DONG_XANH.id, bat: true, giaSan: { 'passion-fruit': 6000 }, diemGom: 'Sa Đéc' }).loi).toMatch(/vận hành/);
    expect(p.lam(VAN_HANH, { loai: 'dat_bao_tieu', nguoiDungId: DONG_XANH.id, bat: true, giaSan: { 'passion-fruit': 6000 }, diemGom: 'Kho Sa Đéc' }).loi).toBeUndefined();
    p.lam(NAM, { loai: 'cap_nhat_ho_so', vung: 'Mỹ Xương, Đồng Tháp' });
    const ai = nguoiNhanHangKemLoai(p.so, p.lo(lo));
    expect(ai.nhan.map(n => n.id)).toEqual([MIEN_TAY.id]);
    expect(ai.baoTieu).toEqual([{ id: DONG_XANH.id, ten: DONG_XANH.ten, gia: 6000, diemGom: 'Kho Sa Đéc' }]);
    expect(loKemLoaiKhop(p.so, MIEN_TAY.id, p.gio).map(x => x.lo.id)).toEqual([lo]);
    // Lượng tối thiểu lớn hơn lô thì không báo
    p.lam(MIEN_TAY, { loai: 'cap_nhat_nhan_hang_kem_loai', bat: true, matHang: [], kgToiThieu: 5000, vung: '' });
    expect(nguoiNhanHangKemLoai(p.so, p.lo(lo)).nhan).toHaveLength(0);
  });
});

describe('Giao trễ theo hợp đồng cọc', () => {
  it('quá ngày giao chưa cân, không đề nghị gì: ghi giao trễ một lần, vào uy tín người bán', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const ma = p.donDaCoc(lo, 1000);
    p.lam(HE_THONG, { loai: 'kiem_han' });
    expect(p.don(ma).giaoTre).toBeUndefined();
    p.gio += 5 * NGAY;
    p.lam(HE_THONG, { loai: 'kiem_han' });
    expect(p.don(ma).giaoTre).toBe(p.gio);
    const pb = p.don(ma).phienBan;
    p.lam(HE_THONG, { loai: 'kiem_han' });
    expect(p.don(ma).phienBan).toBe(pb);
    expect(uyTin(p.so, NAM.id).soGiaoTre).toBe(1);
  });
  it('có đề nghị dời ngày đang chờ thì chưa ghi giao trễ', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const ma = p.donDaCoc(lo, 1000);
    p.lam(NAM, { loai: 'de_nghi_don', ma, deNghi: 'doi_lich', giaTri: p.ngay(6), lyDo: 'mưa' });
    p.gio += 5 * NGAY;
    p.lam(HE_THONG, { loai: 'kiem_han' });
    expect(p.don(ma).giaoTre).toBeUndefined();
  });
});
