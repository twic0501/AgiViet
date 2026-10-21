// Máy chủ mô phỏng: kho kiểm phiên bản, hai tab ghi chen, đồng hồ tua, hệ thống tự động, quyền riêng tư của truy vấn,
// kịch bản mẫu đủ 13 trạng thái, gợi ý giả lập bên mua chạy được, và toàn bộ ca kiểm thử của app bán.
import { TRANG_THAI, type SoGiaoDich } from '@agiviet/nghiep-vu';
import { describe, expect, it } from 'vitest';
import {
  CA_KIEM_THU_BAN, chayCa, chayMotNhip, DichVu, dongHoCoDinh, hoSoCongKhai, kichBanMau, lienLacCua, NGUOI_BAN_MAU, NGUOI_MUA_MAU, PhienThu,
  taoDongHo, taoKhoBoNho, taoKhoTrinhDuyet, tinNhanCua, TRE, viecGiaLap, viecGiaLapBan, CA_KIEM_THU_MUA, NGUOI_BAN_KHAC, type NoiLuu,
} from '../src/index.ts';

const noiLuuGia = (): NoiLuu & { m: Map<string, string> } => { const m = new Map<string, string>(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) }; };

describe('Kho và dịch vụ', () => {
  it('kho trình duyệt: hai "app" cùng nơi lưu thấy cùng dữ liệu; ghi trên dữ liệu cũ bị từ chối', () => {
    const nl = noiLuuGia();
    const a = taoKhoTrinhDuyet(nl), b = taoKhoTrinhDuyet(nl);
    const doc = a.doc();
    expect(a.ghi({ ...doc.so, dem: { x: 1 } }, doc.phienBan).ok).toBe(true);
    expect(b.doc().so.dem).toEqual({ x: 1 });
    expect(b.ghi(doc.so, doc.phienBan)).toEqual({ ok: false, loi: 'du_lieu_cu' });
    expect(a.doc()).toBe(a.doc());   // cùng một đối tượng khi dữ liệu không đổi
  });
  it('dịch vụ tự đọc lại khi nơi khác ghi chen, áp dụng lại trên dữ liệu mới', () => {
    const goc = taoKhoBoNho(); let chen = true;
    const kho = { ...goc, ghi(so: SoGiaoDich, pb: number) { if (chen) { chen = false; const x = goc.doc(); goc.ghi({ ...x.so, dem: { ...x.so.dem, LO: 9 } }, x.phienBan); } return goc.ghi(so, pb); } };
    const dv = new DichVu(kho, dongHoCoDinh(Date.UTC(2026, 9, 9)));
    dv.thucHien(NGUOI_BAN_MAU, { loai: 'dang_ky', vai: 'ban', ten: 'Năm', sdt: '0918234421' });
    chen = true;
    expect(dv.thucHien(NGUOI_BAN_MAU, { loai: 'dang_lo', matHang: 'x', ten: 'Xoài', kg: 1, coSo: 'da_can', gia: 1 })).toEqual({ ok: true, giaTri: 'LO-10' });
  });
  it('đồng hồ tua lưu chung giữa các app', () => {
    const nl = noiLuuGia();
    const a = taoDongHo(nl, undefined, () => 1000), b = taoDongHo(nl, undefined, () => 1000);
    a.tua(5000);
    expect(b.bayGio()).toBe(6000);
    b.datLai();
    expect(a.bayGio()).toBe(1000);
  });
});

describe('Kịch bản mẫu và hệ thống', () => {
  const so = kichBanMau(Date.UTC(2026, 9, 19, 3));
  it('dựng được, có đơn ở đủ 13 trạng thái', () => {
    for (const t of TRANG_THAI) expect(so.don.some(d => d.trangThai === t), t).toBe(true);
    expect(so.lo.length).toBe(8);
    expect(so.nguoiDung.length).toBe(6);   // 3 người bán (chị Năm, Tư Bền, Hai Thu) + 3 bên mua
  });
  it('mọi đơn giữ bất biến: lịch sử = phiên bản; lượng đã hứa không vượt lô', () => {
    for (const d of so.don) expect(d.lichSu.length, d.ma).toBe(d.phienBan);
    for (const l of so.lo) expect(l.hua <= l.kg, l.id).toBe(true);
  });
  it('hệ thống: giải ngân sau độ trễ ngân hàng, không làm lại', () => {
    const dh = dongHoCoDinh(Date.UTC(2026, 9, 19, 3));
    const dv = new DichVu(taoKhoBoNho(structuredClone(so)), dh);
    expect(chayMotNhip(dv)).toBe(0);
    dh.tua(TRE.nganHang);
    expect(chayMotNhip(dv)).toBeGreaterThan(0);
    expect(dv.doc().don.some(d => d.trangThai === 'tien_dang_giu')).toBe(false);
    expect(chayMotNhip(dv)).toBe(0);
  });
  it('truy vấn: tin nhắn không lộ nguyên văn đã che; liên lạc chỉ khi có đơn cọc', () => {
    expect(tinNhanCua(so, so.tinNhan.find(t => t.biChe.length)!.ketNoiId).some(t => 'goc' in t)).toBe(false);
    const coCoc = so.don.find(d => d.daCoc)!;
    expect(lienLacCua(so, NGUOI_BAN_MAU, coCoc.mua.id)?.sdt).toMatch(/^0/);
    expect(hoSoCongKhai(so, NGUOI_BAN_MAU.id)).not.toHaveProperty('sdt');
  });
  it('mọi gợi ý giả lập bên mua đều chạy được qua nghiệp vụ', () => {
    const gio = Date.UTC(2026, 9, 19, 3);
    const viec = viecGiaLap(so, NGUOI_BAN_MAU.id, gio);
    expect(viec.length).toBeGreaterThan(20);
    const loi: string[] = [];
    for (const v of viec) {
      const dv = new DichVu(taoKhoBoNho(structuredClone(so)), dongHoCoDinh(gio));
      const kq = dv.thucHien(v.nguoi, v.lenh);
      if (!kq.ok) loi.push(`${v.nhan}: ${kq.loi}`);
    }
    expect(loi).toEqual([]);
    expect(NGUOI_MUA_MAU.every(m => viec.some(v => v.nguoi.id === m.nguoi.id))).toBe(true);
  });
});

describe('Ca kiểm thử app bán', () => {
  for (const ca of CA_KIEM_THU_BAN) {
    it(`${ca.ma} · ${ca.ten}`, () => {
      const kq = chayCa(ca);
      expect(kq.loi).toBeUndefined();
      expect(kq.kiemTra.filter(k => !k.dat)).toEqual([]);
      expect(kq.dat).toBe(true);
    });
  }
  it('mã ca không trùng; mỗi ca có màn để xem', () => {
    expect(new Set(CA_KIEM_THU_BAN.map(c => c.ma)).size).toBe(CA_KIEM_THU_BAN.length);
    for (const c of CA_KIEM_THU_BAN) expect(chayCa(c).man.length).toBeGreaterThan(0);
  });
  it('phiên thử dựng sẵn người bán đã xác minh và ba bên mua', () => {
    const t = new PhienThu();
    expect(t.so.nguoiDung.map(n => n.xacMinh)).toEqual(['da_xac_minh', 'da_xac_minh', 'da_xac_minh', 'da_xac_minh']);
  });
});

describe('App mua: giả lập người bán và ca kiểm thử', () => {
  const so = kichBanMau(Date.UTC(2026, 9, 19, 3));
  it('kịch bản có nguồn của ba người bán và dữ liệu quản lý của Đồng Xanh', () => {
    const dx = NGUOI_MUA_MAU[0]!.nguoi.id;
    expect(NGUOI_BAN_KHAC.every(k => so.lo.some(l => l.ban.id === k.nguoi.id))).toBe(true);
    expect(so.nguoiDung.find(n => n.id === dx)?.goi).toBe('business');
    expect(so.kho.filter(p => p.mua.id === dx).length).toBeGreaterThan(0);
    expect(so.donNgoai.filter(n => n.mua.id === dx).length).toBe(2);
    expect(so.keHoach.filter(k => k.mua.id === dx).length).toBe(3);
  });
  it('mọi gợi ý giả lập người bán đều chạy được qua nghiệp vụ', () => {
    const gio = Date.UTC(2026, 9, 19, 3);
    for (const m of NGUOI_MUA_MAU) {
      const viec = viecGiaLapBan(so, m.nguoi.id, gio);
      const loi: string[] = [];
      for (const v of viec) {
        const dv = new DichVu(taoKhoBoNho(structuredClone(so)), dongHoCoDinh(gio));
        const kq = dv.thucHien(v.nguoi, v.lenh);
        if (!kq.ok) loi.push(`${v.nhan}: ${kq.loi}`);
      }
      expect(loi).toEqual([]);
    }
    expect(viecGiaLapBan(so, NGUOI_MUA_MAU[0]!.nguoi.id, gio).length).toBeGreaterThan(10);
  });
  for (const ca of CA_KIEM_THU_MUA) {
    it(`${ca.ma} · ${ca.ten}`, () => {
      const kq = chayCa(ca);
      expect(kq.loi).toBeUndefined();
      expect(kq.kiemTra.filter(k => !k.dat)).toEqual([]);
      expect(kq.dat).toBe(true);
    });
  }
  it('mã ca app mua không trùng, khác mã ca app bán', () => {
    const ma = [...CA_KIEM_THU_BAN, ...CA_KIEM_THU_MUA].map(c => c.ma);
    expect(new Set(ma).size).toBe(ma.length);
  });
});
