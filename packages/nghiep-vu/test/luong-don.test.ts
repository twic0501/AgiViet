// Kịch bản nghiệp vụ của đơn: hai luồng trọn vẹn, các lỗi đã gặp (bán lố, xác nhận trùng, trả thiếu vẫn đóng đơn),
// sai vai, sai chủ, hủy, quá hạn cọc, liên lạc chỉ mở sau cọc, phí và cọc.
import { describe, expect, it } from 'vitest';
import { lienLacDaMo, nhom } from '../src/index.ts';
import { BAY, DONG_XANH, HE_THONG, MIEN_TAY, NAM, Phien } from './phien.ts';

describe('Luồng trọn vẹn qua tài khoản đảm bảo', () => {
  const p = new Phien();
  const lo = p.loSanSang();
  const ma = p.taoDon(lo, 4000).ma!;

  it('tạo đơn với mã đơn đầu tiên', () => {
    expect(ma).toBe('HĐ-0001');
    expect(p.don(ma).trangThai).toBe('cho_ban_xac_nhan');
  });
  it('người bán xác nhận: giữ lượng, tính cọc 10% và phí giới thiệu 1%', () => {
    p.buoc(NAM, ma, 'xacNhanDon');
    expect(p.don(ma).trangThai).toBe('cho_coc');
    expect(p.lo(lo).hua).toBe(4000);
    expect(p.don(ma).coc).toMatchObject({ so: 10_000_000, phi: 1_000_000, loaiPhi: 'gioi_thieu' });
    expect(lienLacDaMo(p.don(ma))).toBe(false);
  });
  it('bên mua đặt cọc thì mở liên lạc', () => {
    p.buoc(DONG_XANH, ma, 'datCoc');
    expect(p.don(ma).trangThai).toBe('cho_giao');
    expect(lienLacDaMo(p.don(ma))).toBe(true);
  });
  it('cân và chốt: tiền hàng trừ cọc', () => {
    p.buoc(DONG_XANH, ma, 'nhapKetQua', 3800, 200);
    p.buoc(NAM, ma, 'ketQuaDung');
    expect(p.don(ma)).toMatchObject({ trangThai: 'da_chot', phaiTra: 95_000_000, conPhaiTra: 85_000_000 });
    expect(p.lo(lo).giao).toBe(3800);
  });
  it('tài khoản đảm bảo chỉ nhận đúng số còn phải trả', () => {
    expect(p.buoc(DONG_XANH, ma, 'chuyenTienDamBao', 80_000_000).loi).toMatch(/85\.000\.000/);
    expect(p.don(ma).trangThai).toBe('da_chot');
  });
  it('ngân hàng giải ngân một lần, đơn đóng với đủ tiền', () => {
    p.buoc(DONG_XANH, ma, 'chuyenTienDamBao', 85_000_000);
    expect(p.buoc(HE_THONG, ma, 'giaiNgan').loi).toBeUndefined();
    expect(p.don(ma)).toMatchObject({ trangThai: 'da_nhan_tien', daTra: 95_000_000, conPhaiTra: 0 });
    expect(p.buoc(HE_THONG, ma, 'giaiNgan').loi).toBeDefined();
    expect(p.don(ma).lichSu).toHaveLength(7);
  });
});

describe('Trả trực tiếp: trả thiếu không đóng được đơn', () => {
  const p = new Phien();
  const ma = p.taoDon(p.loSanSang(), 4000).ma!;
  p.buoc(NAM, ma, 'xacNhanDon'); p.buoc(DONG_XANH, ma, 'datCoc');
  p.buoc(DONG_XANH, ma, 'nhapKetQua', 4000, 0); p.buoc(NAM, ma, 'ketQuaDung');

  it('báo trả thiếu thì không bấm "Đã nhận đủ" được', () => {
    p.buoc(DONG_XANH, ma, 'baoDaTra', 50_000_000);
    expect(p.buoc(NAM, ma, 'tienDu').loi).toMatch(/còn thiếu 40\.000\.000/);
    expect(p.don(ma).trangThai).toBe('bao_da_tra');
  });
  it('nhận một phần: còn nợ đúng số, không ghi trả vượt được', () => {
    p.buoc(NAM, ma, 'nhanMotPhan');
    expect(p.don(ma)).toMatchObject({ trangThai: 'da_chot', conPhaiTra: 40_000_000, daTra: 60_000_000 });
    expect(p.buoc(DONG_XANH, ma, 'baoDaTra', 41_000_000).loi).toBeDefined();
  });
  it('chưa thấy tiền mở đối soát; hai bên ghi chứng từ, ghi chú; thấy tiền thì đóng', () => {
    p.buoc(DONG_XANH, ma, 'baoDaTra', 40_000_000);
    p.buoc(NAM, ma, 'tienChua');
    expect(nhom(p.don(ma), 'ban', p.gio)).toBe('loi');
    p.buoc(DONG_XANH, ma, 'guiChungTu', 'Ủy nhiệm chi 40.000.000 đ');
    p.buoc(NAM, ma, 'ghiDoiSoat', 'đã xem lại sổ, vẫn chưa thấy');
    expect(p.don(ma).doiSoat?.[0]?.vai).toBe('ban');
    p.buoc(NAM, ma, 'tienDu');
    expect(p.don(ma)).toMatchObject({ trangThai: 'da_nhan_tien', daTra: 100_000_000 });
  });
});

describe('Các lỗi đã gặp ở bản mô phỏng cũ', () => {
  it('bán lố: đơn thứ hai vượt lượng còn bán bị chặn khi xác nhận', () => {
    const p = new Phien(); const lo = p.loSanSang(4000);
    const a = p.taoDon(lo, 3000).ma!, b = p.taoDon(lo, 3000).ma!;
    p.buoc(NAM, a, 'xacNhanDon');
    expect(p.buoc(NAM, b, 'xacNhanDon').loi).toMatch(/chỉ còn bán được 1\.000 kg/);
    expect(p.lo(lo).hua).toBe(3000);
    expect(p.taoDon(lo, 1500).loi).toBeDefined();
  });
  it('bấm xác nhận hai lần không giữ lượng hai lần', () => {
    const p = new Phien(); const lo = p.loSanSang();
    const a = p.taoDon(lo, 3000).ma!;
    p.buoc(NAM, a, 'xacNhanDon');
    expect(p.buoc(NAM, a, 'xacNhanDon').loi).toBeDefined();
    expect(p.lo(lo).hua).toBe(3000);
    expect(p.don(a).lichSu).toHaveLength(2);
  });
  it('màn còn hiện nút cũ (tab khác đã từ chối): không xác nhận được', () => {
    const p = new Phien(); const ma = p.taoDon(p.loSanSang(), 2000).ma!;
    const soCu = p.so;
    p.buoc(NAM, ma, 'tuChoiDon', 'đã bán cho mối khác');
    expect(p.buoc(NAM, ma, 'xacNhanDon').loi).toMatch(/từ chối/);
    expect(soCu.don[0]?.trangThai).toBe('cho_ban_xac_nhan');   // sổ cũ không bị sửa
  });
});

describe('Sai vai, sai chủ', () => {
  const p = new Phien(); const lo = p.loSanSang();
  it('người bán không tạo đơn, không kết nối; bên mua không đăng lô', () => {
    expect(p.lam(NAM, { loai: 'tao_don', loId: lo, kg: 100, gia: 1, ngayGiao: p.ngay(3) }).loi).toBeDefined();
    expect(p.lam(NAM, { loai: 'gui_loi_moi', loId: lo }).loi).toBeDefined();
    expect(p.lam(DONG_XANH, { loai: 'dang_lo', matHang: 'x', ten: 'X', kg: 1, coSo: 'da_can', gia: 1 }).loi).toBeDefined();
  });
  it('mỗi bên chỉ làm phần mình', () => {
    const ma = p.taoDon(lo, 1000).ma!;
    expect(p.buoc(DONG_XANH, ma, 'xacNhanDon').loi).toBeDefined();
    expect(p.buoc(NAM, ma, 'datCoc').loi).toBeDefined();
    expect(p.buoc(HE_THONG, ma, 'xacNhanDon').loi).toBeDefined();
  });
  it('người bán khác và bên mua khác không chạm được đơn', () => {
    const ma = p.taoDon(lo, 1000).ma!;
    expect(p.buoc(BAY, ma, 'xacNhanDon').loi).toMatch(/không phải đơn của bạn/);
    p.buoc(NAM, ma, 'xacNhanDon');
    expect(p.buoc(MIEN_TAY, ma, 'datCoc').loi).toMatch(/không phải đơn của bạn/);
  });
  it('bên mua chưa được đồng ý kết nối thì không tạo đơn được', () => {
    expect(p.taoDon(lo, 100, 25000, MIEN_TAY).loi).toMatch(/chưa đồng ý/);
    const kn = p.lam(MIEN_TAY, { loai: 'gui_loi_moi', loId: lo }).ma!;
    expect(p.lam(MIEN_TAY, { loai: 'gui_loi_moi', loId: lo }).loi).toBeDefined();
    p.lam(NAM, { loai: 'tra_loi_ket_noi', ketNoiId: kn, dongY: false });
    expect(p.lam(NAM, { loai: 'tra_loi_ket_noi', ketNoiId: kn, dongY: true }).loi).toBeDefined();
    expect(p.taoDon(lo, 100, 25000, MIEN_TAY).loi).toBeDefined();
  });
  it('chỉ người bán của lô sửa được lượng', () => {
    expect(p.lam(BAY, { loai: 'cap_nhat_luong', loId: lo, kg: 1, coSo: 'da_can' }).loi).toBeDefined();
  });
});

describe('Hủy và cọc', () => {
  it('hủy trước cọc: đóng ngay, trả lượng, không mở liên lạc', () => {
    const p = new Phien(); const lo = p.loSanSang(); const ma = p.taoDon(lo, 2000).ma!;
    p.buoc(NAM, ma, 'xacNhanDon');
    p.buoc(NAM, ma, 'huyTruocCoc', 'trái bị nứt');
    expect(p.don(ma).trangThai).toBe('da_huy');
    expect(p.lo(lo).hua).toBe(0);
    expect(lienLacDaMo(p.don(ma))).toBe(false);
  });
  it('sau cọc: phải được bên kia đồng ý; cọc về bên không xin hủy', () => {
    const p = new Phien(); const lo = p.loSanSang(); const ma = p.taoDon(lo, 2000).ma!;
    p.buoc(NAM, ma, 'xacNhanDon'); p.buoc(DONG_XANH, ma, 'datCoc');
    p.buoc(DONG_XANH, ma, 'yeuCauHuy', 'nhà máy ngưng dây chuyền');
    expect(p.buoc(DONG_XANH, ma, 'dongYHuy').loi).toBeDefined();
    expect(nhom(p.don(ma), 'mua', p.gio)).toBe('cho');
    expect(nhom(p.don(ma), 'ban', p.gio)).toBe('lam');
    p.buoc(NAM, ma, 'tuChoiHuy');
    expect(p.don(ma).trangThai).toBe('cho_giao');
    p.buoc(DONG_XANH, ma, 'yeuCauHuy', 'nhà máy ngưng dây chuyền');
    p.buoc(NAM, ma, 'dongYHuy');
    expect(p.don(ma)).toMatchObject({ trangThai: 'da_huy', huy: { cocVe: 'ban' } });
    expect(p.lo(lo).hua).toBe(0);
  });
});

describe('Quá hạn cọc', () => {
  const p = new Phien(); const lo = p.loSanSang(); const ma = p.taoDon(lo, 2000).ma!;
  p.buoc(NAM, ma, 'xacNhanDon');
  it('chưa tới hạn thì hệ thống không đóng đơn', () => {
    p.lam(HE_THONG, { loai: 'kiem_han' });
    expect(p.don(ma).trangThai).toBe('cho_coc');
  });
  it('quá hạn: không cọc được, đơn thuộc nhóm "có vấn đề", hệ thống đóng và trả lượng', () => {
    p.gio += 49 * 3600_000;
    expect(p.buoc(DONG_XANH, ma, 'datCoc').loi).toMatch(/quá hạn/);
    expect(nhom(p.don(ma), 'mua', p.gio)).toBe('loi');
    expect(p.lam(DONG_XANH, { loai: 'kiem_han' }).loi).toBeDefined();
    p.lam(HE_THONG, { loai: 'kiem_han' });
    expect(p.don(ma).trangThai).toBe('qua_han');
    expect(p.lo(lo).hua).toBe(0);
  });
});

describe('Phí và cọc', () => {
  const p = new Phien(); const lo = p.loSanSang(400_000);
  const a = p.taoDon(lo, 100).ma!;
  p.buoc(NAM, a, 'xacNhanDon');
  it('phí sàn 50.000 đ cho đơn nhỏ', () => expect(p.don(a).coc?.phi).toBe(50_000));
  it('đơn sau với cùng người bán: phí mối quen, có trần 3 triệu', () => {
    p.buoc(DONG_XANH, a, 'datCoc');
    const b = p.taoDon(lo, 100_000).ma!;
    p.buoc(NAM, b, 'xacNhanDon');
    expect(p.don(b).coc).toMatchObject({ loaiPhi: 'moi_quen', phi: 3_000_000 });
  });
  it('tiền hàng nhỏ hơn cọc: đơn đóng luôn, hoàn cọc dư', () => {
    p.buoc(DONG_XANH, a, 'nhapKetQua', 5, 95);
    p.buoc(NAM, a, 'ketQuaDung');
    expect(p.don(a)).toMatchObject({ trangThai: 'da_nhan_tien', phaiTra: 125_000, hoanCoc: 125_000, daTra: 125_000 });
  });
});
