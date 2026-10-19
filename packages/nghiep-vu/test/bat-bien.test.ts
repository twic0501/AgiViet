// Kiểm tra toàn diện bảng luật: ma trận mọi bước × mọi trạng thái × mọi vai, và 5.000 bước ngẫu nhiên giữ các bất biến.
import { describe, expect, it } from 'vitest';
import { DA_DONG, LUAT, TEN_BUOC, TRANG_THAI, aiLam, apDung, lienLacDaMo, type Don, type NguoiLam, type SoGiaoDich, type TenBuoc, type ThamSoBuoc, type TrangThaiDon } from '../src/index.ts';
import { BAT_DAU, DONG_XANH, HE_THONG, NAM, Phien } from './phien.ts';

const THAM: { [B in TenBuoc]?: ThamSoBuoc[B] } = {
  nhapKetQua: [500, 0], chuyenTienDamBao: [9_000_000], baoDaTra: [9_000_000], guiChungTu: ['UNC'], ghiDoiSoat: ['ghi chú'],
  tuChoiDon: ['lý do'], huyTruocCoc: ['lý do'], yeuCauHuy: ['lý do'],
};

/** Sổ có một đơn dựng sẵn ở trạng thái bất kỳ, đủ số liệu để mọi bước hợp lệ chạy được. */
function soCoDon(tt: TrangThaiDon, buoc: TenBuoc): SoGiaoDich {
  const don: Don = {
    ma: 'HĐ-0999', loId: 'LO-1', tenLo: 'Chanh dây', ban: { id: NAM.id, ten: NAM.ten }, mua: { id: DONG_XANH.id, ten: DONG_XANH.ten },
    kg: 1000, gia: 25000, trangThai: tt, phienBan: 1, taoLuc: BAT_DAU, lichSu: [{ noiDung: 'dựng', luc: BAT_DAU, vai: 'mua' }],
    coc: { so: 2_500_000, phi: 250_000, loaiPhi: 'gioi_thieu', han: BAT_DAU + 3600_000 }, daCoc: { so: 2_500_000, phi: 250_000, luc: BAT_DAU },
    ketQuaCan: { nhan: 1000, tuChoi: 0, luc: BAT_DAU, nguon: 'tu_khai' }, phaiTra: 25_000_000, conPhaiTra: 9_000_000, daTra: 16_000_000,
    tra: { so: buoc === 'nhanMotPhan' ? 4_000_000 : 9_000_000, luc: BAT_DAU }, huy: { ben: 'mua', lyDo: 'x', truoc: 'cho_giao' },
  };
  return { phienBan: 1, lo: [{ id: 'LO-1', ban: don.ban, matHang: 'x', ten: 'Chanh dây', kg: 4000, coSo: 'uoc_tinh', gia: 25000, hua: 1000, giao: 0, dangLuc: BAT_DAU }], ketNoi: [], don: [don], dem: { lo: 1, ketNoi: 0, don: 999 } };
}

describe('Ma trận bước × trạng thái × vai', () => {
  const NGUOI: NguoiLam[] = [NAM, DONG_XANH, HE_THONG];
  const ca = TEN_BUOC.flatMap(b => TRANG_THAI.flatMap(tt => NGUOI.map(n => [b, tt, n] as const)));
  it(`đủ ${TEN_BUOC.length} bước × ${TRANG_THAI.length} trạng thái × 3 vai`, () => expect(ca.length).toBe(TEN_BUOC.length * TRANG_THAI.length * 3));
  it('chỉ chạy được đúng chỗ bảng luật cho phép; bị chặn thì sổ không đổi', () => {
    const sai: string[] = [];
    for (const [buoc, tt, nguoi] of ca) {
      const so = soCoDon(tt, buoc);
      const gio = BAT_DAU + (buoc === 'quaHanCoc' ? 49 * 3600_000 : 0);
      const kq = apDung(so, { loai: 'buoc_don', ma: 'HĐ-0999', buoc, thamSo: THAM[buoc] ?? [] } as never, nguoi, gio);
      const nenDuoc = LUAT[buoc].tu.includes(tt) && aiLam(LUAT[buoc] as never, so.don[0]!).includes(nguoi.vai);
      if (nenDuoc !== kq.ok) sai.push(`${buoc} @ ${tt} / ${nguoi.vai}: ${kq.ok ? 'chạy được' : kq.loi}`);
      if (so.don[0]!.phienBan !== 1) sai.push(`${buoc} @ ${tt}: sửa vào sổ cũ`);
      if (kq.ok && kq.giaTri.so.don[0]!.phienBan !== 2) sai.push(`${buoc} @ ${tt}: phiên bản không tăng`);
    }
    expect(sai).toEqual([]);
  });
});

describe('5.000 bước ngẫu nhiên', () => {
  it('luôn giữ bất biến và đi qua đủ mọi trạng thái', () => {
    let hat = 7;
    const ngau = (n: number) => { hat = (hat + 0x6d2b79f5) | 0; let t = Math.imul(hat ^ (hat >>> 15), 1 | hat); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) % n; };   // mulberry32
    const p = new Phien(); const lo = p.loSanSang(20_000);
    const conMo = () => p.so.don.filter(d => !DA_DONG.includes(d.trangThai));
    const daQua = new Set<TrangThaiDon>();
    const loi: string[] = [];
    const VIEC: ((ma: string) => unknown)[] = [
      () => (conMo().length < 6 ? p.taoDon(lo, 500 * (1 + ngau(10)), 20000 + 1000 * ngau(10)) : null),
      ma => p.buoc(NAM, ma, 'xacNhanDon'), ma => p.buoc(NAM, ma, 'tuChoiDon', 'x'), ma => p.buoc(DONG_XANH, ma, 'rutDon'),
      ma => p.buoc(DONG_XANH, ma, 'datCoc'),
      ma => p.buoc([NAM, DONG_XANH][ngau(2)]!, ma, p.don(ma)?.trangThai === 'cho_coc' ? 'huyTruocCoc' : 'yeuCauHuy', 'x'),
      ma => p.buoc([NAM, DONG_XANH][ngau(2)]!, ma, ngau(2) ? 'dongYHuy' : 'tuChoiHuy'),
      ma => p.buoc(DONG_XANH, ma, 'nhapKetQua', ngau((p.don(ma)?.kg ?? 0) + 1), ngau(200)),
      ma => p.buoc(NAM, ma, ngau(3) ? 'ketQuaDung' : 'ketQuaSai'),
      ma => p.buoc(DONG_XANH, ma, 'chuyenTienDamBao', p.don(ma)?.conPhaiTra ?? 0), ma => p.buoc(HE_THONG, ma, 'giaiNgan'),
      ma => p.buoc(DONG_XANH, ma, 'baoDaTra', Math.max(1, Math.round((p.don(ma)?.conPhaiTra ?? 0) * [1, 0.5, 1.2][ngau(3)]!))),
      ma => p.buoc(NAM, ma, ngau(2) ? 'tienDu' : 'tienChua'), ma => p.buoc(NAM, ma, 'nhanMotPhan'),
      ma => p.buoc([NAM, DONG_XANH, HE_THONG][ngau(3)]!, ma, 'xacNhanDon'),
      () => { p.gio += (ngau(4) ? ngau(10) : 50) * 3600_000; return p.lam(HE_THONG, { loai: 'kiem_han' }); },
    ];
    for (let i = 0; i < 5000 && !loi.length; i++) {
      const ds = conMo().length && ngau(10) ? conMo() : p.so.don;
      VIEC[ngau(VIEC.length)]!(ds.length ? ds[ngau(ds.length)]!.ma : '');
      const l = p.lo(lo);
      const dangGiu = p.so.don.filter(d => d.coc && !['qua_han', 'da_huy'].includes(d.trangThai)).reduce((s, d) => s + d.kg, 0);
      if (l.hua !== dangGiu) loi.push(`bước ${i}: đã hứa ${l.hua} ≠ tổng đơn đang giữ ${dangGiu}`);
      if (l.hua > l.kg) loi.push(`bước ${i}: hứa ${l.hua} > lô ${l.kg}`);
      for (const d of p.so.don) {
        daQua.add(d.trangThai);
        if (d.lichSu.length !== d.phienBan) loi.push(`bước ${i}: ${d.ma} lịch sử ≠ phiên bản`);
        if (lienLacDaMo(d) && !d.daCoc) loi.push(`bước ${i}: ${d.ma} lộ liên lạc khi chưa cọc`);
        if ((d.conPhaiTra ?? 0) < 0 || (d.daTra ?? 0) > (d.phaiTra ?? Infinity)) loi.push(`bước ${i}: ${d.ma} sai tiền`);
        if (d.trangThai === 'da_nhan_tien' && d.daTra !== d.phaiTra) loi.push(`bước ${i}: ${d.ma} đóng khi mới trả ${d.daTra}/${d.phaiTra}`);
      }
    }
    expect(loi).toEqual([]);
    expect([...daQua].sort()).toEqual([...TRANG_THAI].sort());
  });
});
