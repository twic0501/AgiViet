// Phép tính tổng hợp (chỉ đọc sổ): uy tín, lời lỗ theo vụ, tổng kết tuần, nguồn gốc, chia tiền lô gộp, công nợ,
// bảng kê 01/TNDN, chấm điểm nhà cung cấp, truy xuất, độ phủ kế hoạch.
import { chinhSachCua, ngayCua, thangCua, tien } from './chinh-sach.ts';
import type { Don, Lo, NhatKy, SoGiaoDich } from './kieu.ts';
import { hetCachLy } from './lenh/lo.ts';
import { conBan, dangBanGap, laKemLoai, loaiCua, loHienThi } from './lo.ts';

const NGAY = 24 * 3600_000;
const daChot = (d: Don) => ['da_chot', 'tien_dang_giu', 'bao_da_tra', 'chua_thay_tien', 'da_nhan_tien'].includes(d.trangThai);
const lucCua = (d: Don, chu: string) => d.lichSu.find(l => l.noiDung.startsWith(chu))?.luc;

/* ---------------- Uy tín ---------------- */

export type BacUyTin = 'moi' | 'kha' | 'tot' | 'rat_tot';
export interface UyTin {
  bac: BacUyTin;
  soDonXong: number;
  /** Người bán: tổng kg nhận / tổng kg đơn đã chốt. Bên mua: không dùng. */
  tyLeGiaoDu: number | null;
  /** Bên mua: tỷ lệ đơn trả xong trong 3 ngày kể từ khi chốt cân. */
  tyLeTraDungHan: number | null;
  soHuyDoMinh: number;
  soTranhChap: number;
  /** Người bán: kg bị trả lại / kg đã cân (giao đúng loại). */
  tyLeTraLai: number | null;
  /** Người bán: số đơn quá ngày giao không đề nghị đổi lịch, giảm lượng. */
  soGiaoTre: number;
  diemDanhGia: number | null;
  soDanhGia: number;
}

export function uyTin(so: SoGiaoDich, nguoiId: string): UyTin {
  const nd = so.nguoiDung.find(n => n.id === nguoiId);
  const laBan = nd?.vai === 'ban';
  const don = so.don.filter(d => (laBan ? d.ban.id : d.mua.id) === nguoiId);
  const xong = don.filter(d => d.trangThai === 'da_nhan_tien');
  const chot = don.filter(d => d.ketQuaCan && daChot(d));
  const nhanDuoc = (d: Don) => d.ketQuaCan!.nhan + (d.ketQuaCan!.haCap ?? 0);
  const tyLeGiaoDu = laBan && chot.length ? chot.reduce((s, d) => s + nhanDuoc(d), 0) / chot.reduce((s, d) => s + d.kg, 0) : null;
  const daCan = chot.reduce((s, d) => s + nhanDuoc(d) + d.ketQuaCan!.tuChoi, 0);
  const tyLeTraLai = laBan && daCan ? chot.reduce((s, d) => s + d.ketQuaCan!.tuChoi, 0) / daCan : null;
  const soGiaoTre = laBan ? don.filter(d => d.giaoTre).length : 0;
  const daTra = !laBan ? xong.filter(d => d.thanhToan) : [];
  const dungHan = daTra.filter(d => { const c = lucCua(d, 'Người bán xác nhận kết quả'), t = d.lichSu.at(-1)!.luc; return c !== undefined && t - c <= 3 * NGAY; });
  const tyLeTraDungHan = !laBan && daTra.length ? dungHan.length / daTra.length : null;
  const vai = laBan ? 'ban' : 'mua';
  const soHuyDoMinh = don.filter(d => (d.trangThai === 'da_huy' || d.trangThai === 'ban_tu_choi') && d.huy?.ben === vai && d.daCoc).length;
  const soTranhChap = don.filter(d => d.lichSu.some(l => l.noiDung.startsWith('Người bán báo chưa thấy tiền') || l.noiDung.startsWith('Người bán báo kết quả cân không đúng'))).length;
  const dg = so.danhGia.filter(g => g.cho.id === nguoiId);
  const diemDanhGia = dg.length ? dg.reduce((s, g) => s + g.diem, 0) / dg.length : null;
  let bac: BacUyTin = 'moi';
  if (xong.length >= 3) {
    const tot = (tyLeGiaoDu ?? 1) >= 0.95 && (tyLeTraDungHan ?? 1) >= 0.9 && soHuyDoMinh === 0 && (diemDanhGia ?? 5) >= 4.5 && (tyLeTraLai ?? 0) <= 0.1 && soGiaoTre === 0;
    const kha = (tyLeGiaoDu ?? 1) >= 0.85 && (tyLeTraDungHan ?? 1) >= 0.7 && (diemDanhGia ?? 5) >= 3.5 && (tyLeTraLai ?? 0) <= 0.25;
    bac = tot && xong.length >= 10 ? 'rat_tot' : tot ? 'tot' : kha ? 'kha' : 'moi';
  }
  return { bac, soDonXong: xong.length, tyLeGiaoDu, tyLeTraDungHan, soHuyDoMinh, soTranhChap, tyLeTraLai, soGiaoTre, diemDanhGia, soDanhGia: dg.length };
}
export const NHAN_BAC: Record<BacUyTin, string> = { moi: 'Mới', kha: 'Khá', tot: 'Tốt', rat_tot: 'Rất tốt' };

/* ---------------- Người bán: tiền, thu chi, tổng kết ---------------- */

/** Tiền của người bán theo đơn: đang giữ ở tài khoản đảm bảo, đã về, còn chờ. */
export function tienNguoiBan(so: SoGiaoDich, banId: string) {
  const don = so.don.filter(d => d.ban.id === banId);
  const dangGiu = don.filter(d => d.daCoc && !['da_nhan_tien', 'da_huy', 'qua_han'].includes(d.trangThai))
    .reduce((s, d) => s + (d.trangThai === 'tien_dang_giu' ? (d.daCoc?.so ?? 0) + (d.tra?.so ?? 0) : d.daCoc?.so ?? 0), 0);
  const daVe = don.filter(d => d.trangThai === 'da_nhan_tien').reduce((s, d) => s + (d.daTra ?? 0), 0)
    + don.filter(d => d.trangThai === 'da_huy' && d.huy?.cocVe === 'ban').reduce((s, d) => s + (d.daCoc?.so ?? 0), 0);
  const conCho = don.filter(d => ['da_chot', 'bao_da_tra', 'chua_thay_tien'].includes(d.trangThai)).reduce((s, d) => s + (d.conPhaiTra ?? 0), 0);
  const ung = so.ungTien.filter(u => u.ban.id === banId && u.trangThai === 'da_giai_ngan').reduce((s, u) => s + u.so - u.phi, 0);
  return { dangGiu, daVe, conCho, daUng: ung };
}

/** Lời lỗ một vụ: chi ghi tay; thu ghi tay + tiền bán qua app của lô gắn vườn của vụ, trong khoảng thời gian vụ. */
export function loiLoVu(so: SoGiaoDich, muaVuId: string) {
  const vu = so.muaVu.find(m => m.id === muaVuId);
  if (!vu) return null;
  const ghi = so.thuChi.filter(t => t.muaVuId === muaVuId);
  const chi = ghi.filter(t => t.loai === 'chi').reduce((s, t) => s + t.so, 0);
  const thuTay = ghi.filter(t => t.loai === 'thu').reduce((s, t) => s + t.so, 0);
  const lo = new Set(so.lo.filter(l => l.vuonId === vu.vuonId).map(l => l.id));
  const thuApp = so.don.filter(d => lo.has(d.loId) && d.trangThai === 'da_nhan_tien' && ngayCua(d.taoLuc) >= vu.batDau).reduce((s, d) => s + (d.daTra ?? 0), 0);
  return { chi, thuTay, thuApp, loi: thuTay + thuApp - chi };
}

/** Tổng kết 7 ngày gần nhất của người bán (và 7 ngày trước đó để so). */
export function tongKetTuan(so: SoGiaoDich, banId: string, bayGio: number) {
  const tinh = (tu: number, den: number) => {
    const xong = so.don.filter(d => d.ban.id === banId && d.trangThai === 'da_nhan_tien').filter(d => { const t = d.lichSu.at(-1)!.luc; return t >= tu && t < den; });
    const tc = so.thuChi.filter(t => t.ban.id === banId).filter(t => { const n = Date.parse(t.ngay); return n >= tu - 7 * 3600_000 && n < den; });
    return {
      daBanKg: xong.reduce((s, d) => s + (d.ketQuaCan?.nhan ?? 0), 0),
      daThu: xong.reduce((s, d) => s + (d.daTra ?? 0), 0) + tc.filter(t => t.loai === 'thu').reduce((s, t) => s + t.so, 0),
      daChi: tc.filter(t => t.loai === 'chi').reduce((s, t) => s + t.so, 0),
      soDon: xong.length,
    };
  };
  const nay = tinh(bayGio - 7 * NGAY, bayGio + 1), truoc = tinh(bayGio - 14 * NGAY, bayGio - 7 * NGAY);
  return { nay: { ...nay, loi: nay.daThu - nay.daChi }, truoc: { ...truoc, loi: truoc.daThu - truoc.daChi } };
}

/** Hồ sơ nguồn gốc của một vườn: nhật ký (mới trước), vụ đang chạy, ngày hết cách ly, mức đầy đủ 0–100. */
export function hoSoNguonGoc(so: SoGiaoDich, vuonId: string, bayGio: number) {
  const vuon = so.vuon.find(v => v.id === vuonId);
  if (!vuon) return null;
  const nhatKy: NhatKy[] = so.nhatKy.filter(k => k.vuonId === vuonId).sort((a, b) => b.ngay.localeCompare(a.ngay));
  const vu = so.muaVu.find(m => m.vuonId === vuonId && m.giaiDoan !== 'xong');
  const cachLy = hetCachLy(so, vuonId);
  const homNay = ngayCua(bayGio);
  const ganDay = nhatKy.filter(k => Date.parse(k.ngay) >= bayGio - 30 * NGAY);
  // Đầy đủ: có vụ, có nhật ký 30 ngày qua, có ghi bón phân, mọi lần phun có thuốc và ngày cách ly, có diện tích và số gốc
  const tieuChi = [!!vu, ganDay.length >= 2, nhatKy.some(k => k.loai === 'bon_phan'), nhatKy.filter(k => k.loai === 'phun_thuoc').every(k => k.vatTu && k.ngayCachLy !== undefined), vuon.dienTich > 0 && vuon.soGoc > 0];
  return { vuon, vu, nhatKy, cachLy, dangCachLy: !!cachLy && cachLy > homNay, mucDayDu: Math.round((tieuChi.filter(Boolean).length / tieuChi.length) * 100) };
}

/** Chia tiền một đơn của lô gộp theo phần từng hộ (tỷ lệ theo kg đóng góp). */
export function chiaTienLoGop(so: SoGiaoDich, donMa: string) {
  const d = so.don.find(x => x.ma === donMa);
  const lo = d && so.lo.find(l => l.id === d.loId);
  if (!d || !lo?.thanhPhan) return null;
  const tong = lo.thanhPhan.reduce((s, t) => s + t.kg, 0);
  const tien = d.trangThai === 'da_nhan_tien' ? d.daTra ?? 0 : 0;
  let daChia = 0;
  return lo.thanhPhan.map((t, i) => {
    const phan = i === lo.thanhPhan!.length - 1 ? tien - daChia : Math.round((tien * t.kg) / tong);
    daChia += phan;
    return { ho: t.ho, kg: t.kg, kgTrongDon: Math.round((d.kg * t.kg) / tong), tien: phan };
  });
}

/* ---------------- Bên mua: công nợ, bảng kê, nhà cung cấp, truy xuất, kế hoạch ---------------- */

export function congNo(so: SoGiaoDich, muaId: string) {
  const trongApp = so.don.filter(d => d.mua.id === muaId && d.phaiTra !== undefined && d.trangThai !== 'da_nhan_tien')
    .map(d => ({ nguon: 'app' as const, ma: d.ma, nguoiBan: d.ban.ten, ten: d.tenLo, phaiTra: d.phaiTra!, daTra: d.daTra ?? 0, con: d.conPhaiTra ?? 0, trangThai: d.trangThai }));
  const ngoai = so.donNgoai.filter(n => n.mua.id === muaId && n.daTra < tien(n.kg, n.gia))
    .map(n => ({ nguon: 'ngoai' as const, ma: n.id, nguoiBan: n.nguoiBan, ten: n.ten, phaiTra: tien(n.kg, n.gia), daTra: n.daTra, con: tien(n.kg, n.gia) - n.daTra, trangThai: 'ngoai' as const }));
  const ds = [...trongApp, ...ngoai];
  return { ds, tongCon: ds.reduce((s, x) => s + x.con, 0) };
}

/** Bảng kê mua hàng nông sản không có hóa đơn (mẫu 01/TNDN) trong một tháng: đơn trong app đã nhận đủ + đơn ngoài app. */
export function bangKe01(so: SoGiaoDich, muaId: string, thang: string) {
  const app = so.don.filter(d => d.mua.id === muaId && d.trangThai === 'da_nhan_tien' && thangCua(d.lichSu.at(-1)!.luc) === thang).map(d => {
    const nb = so.nguoiDung.find(n => n.id === d.ban.id);
    return { ngay: ngayCua(d.lichSu.at(-1)!.luc), nguoiBan: d.ban.ten, diaChi: nb ? [nb.diaChi, nb.vung].filter(Boolean).join(', ') : '', matHang: d.tenLo, kg: d.ketQuaCan?.nhan ?? d.kg, donGia: d.gia, thanhTien: d.phaiTra ?? 0, chungTu: d.ma };
  });
  const ngoai = so.donNgoai.filter(n => n.mua.id === muaId && n.ngay.startsWith(thang))
    .map(n => ({ ngay: n.ngay, nguoiBan: n.nguoiBan, diaChi: n.diaChiNguoiBan, matHang: n.ten, kg: n.kg, donGia: n.gia, thanhTien: tien(n.kg, n.gia), chungTu: n.id }));
  const dong = [...app, ...ngoai].sort((a, b) => a.ngay.localeCompare(b.ngay));
  return { dong, tong: dong.reduce((s, x) => s + x.thanhTien, 0) };
}

/** Chấm điểm từng người bán đã giao dịch với bên mua này. */
export function chamDiemNhaCungCap(so: SoGiaoDich, muaId: string) {
  const theoBan = new Map<string, Don[]>();
  for (const d of so.don.filter(x => x.mua.id === muaId && x.ketQuaCan && daChot(x))) theoBan.set(d.ban.id, [...(theoBan.get(d.ban.id) ?? []), d]);
  return [...theoBan.entries()].map(([id, ds]) => {
    const haCap = (d: Don) => d.ketQuaCan!.haCap ?? 0;
    const giaoDu = ds.reduce((s, d) => s + d.ketQuaCan!.nhan + haCap(d), 0) / ds.reduce((s, d) => s + d.kg, 0);
    const dungLoai = ds.reduce((s, d) => s + d.ketQuaCan!.nhan, 0) / ds.reduce((s, d) => s + d.ketQuaCan!.nhan + haCap(d) + d.ketQuaCan!.tuChoi, 0);
    const dungHen = ds.filter(d => ngayCua(d.ketQuaCan!.luc) <= d.ngayGiao).length / ds.length;
    const diem = Math.round((giaoDu * 0.4 + dungLoai * 0.4 + dungHen * 0.2) * 100);
    return { id, ten: ds[0]!.ban.ten, soDon: ds.length, giaoDu, dungLoai, dungHen, diem };
  }).sort((a, b) => b.diem - a.diem);
}

/** Truy xuất một phiếu kho: đơn → lô → người bán → vườn → nhật ký. */
export function truyXuat(so: SoGiaoDich, phieuId: string, bayGio: number) {
  const p = so.kho.find(x => x.id === phieuId);
  if (!p) return null;
  const don = p.donMa ? so.don.find(d => d.ma === p.donMa) : undefined;
  const ngoai = p.donNgoaiId ? so.donNgoai.find(n => n.id === p.donNgoaiId) : undefined;
  const lo = don && so.lo.find(l => l.id === don.loId);
  const nguon = lo?.vuonId ? hoSoNguonGoc(so, lo.vuonId, bayGio) : null;
  return { phieu: p, don, ngoai, lo, nguoiBan: don ? so.nguoiDung.find(n => n.id === don.ban.id) : undefined, nguon };
}

/** Độ phủ kế hoạch mua theo tháng: đã có đơn (đã xác nhận trở đi) bao nhiêu so với cần. */
export function phuKeHoach(so: SoGiaoDich, muaId: string) {
  return so.keHoach.filter(k => k.mua.id === muaId).map(k => {
    const daCo = so.don.filter(d => d.mua.id === muaId && d.matHang === k.matHang && d.coc && !['da_huy', 'qua_han'].includes(d.trangThai) && d.ngayGiao.startsWith(k.thang)).reduce((s, d) => s + d.kg, 0)
      + so.donNgoai.filter(n => n.mua.id === muaId && n.matHang === k.matHang && n.ngay.startsWith(k.thang)).reduce((s, n) => s + n.kg, 0);
    return { ...k, daCo, thieu: Math.max(0, k.kgCan - daCo) };
  }).sort((a, b) => a.thang.localeCompare(b.thang));
}

/* ---------------- Đầu ra cho hàng kém loại ---------------- */

/** Ai nhận lô kém loại (hoặc đang bán gấp) này: bên mua đã đăng ký nhận hàng kém loại đúng mặt hàng, bên mua có tin cần mua
 *  đang mở cùng mặt hàng, và đối tác bao tiêu có giá sàn cho mặt hàng (người nhận cuối cùng). */
export function nguoiNhanHangKemLoai(so: SoGiaoDich, lo: Lo) {
  const kg = conBan(lo), tinh = (v: string) => v.split(',').at(-1)!.trim();
  const vungBan = so.nguoiDung.find(n => n.id === lo.ban.id)?.vung ?? '';
  const nhan = so.nguoiDung.filter(n => n.vai === 'mua' && !n.biKhoa && n.nhanHangKemLoai).filter(n => {
    const k = n.nhanHangKemLoai!;
    return (!k.matHang.length || k.matHang.includes(lo.matHang)) && k.kgToiThieu <= kg && (!k.vung || vungBan.includes(tinh(k.vung)) || k.vung.includes(tinh(vungBan)));
  }).map(n => ({ id: n.id, ten: n.toChuc?.ten ?? n.ten, vung: n.vung, kgToiThieu: n.nhanHangKemLoai!.kgToiThieu, daKetNoi: so.ketNoi.some(k => k.loId === lo.id && k.mua.id === n.id) }));
  const coNhuCau = so.nhuCau.filter(c => c.trangThai === 'mo' && c.matHang === lo.matHang && c.mua.id !== lo.ban.id && !nhan.some(n => n.id === c.mua.id))
    .map(c => ({ id: c.mua.id, ten: c.mua.ten, nhuCauId: c.id, kg: c.kg, giaTran: c.giaTran }));
  const baoTieu = so.nguoiDung.filter(n => n.vai === 'mua' && !n.biKhoa && n.baoTieu?.giaSan[lo.matHang])
    .map(n => ({ id: n.id, ten: n.toChuc?.ten ?? n.ten, gia: n.baoTieu!.giaSan[lo.matHang]!, diemGom: n.baoTieu!.diemGom }));
  return { nhan, coNhuCau, baoTieu };
}

/** Lô kém loại (hoặc hàng tươi) của người bán chưa có ai hỏi sau 24 giờ và chưa bán gấp: gợi ý bật bán gấp. */
export function loNenBanGap(so: SoGiaoDich, banId: string, bayGio: number) {
  return so.lo.filter(l => l.ban.id === banId && !l.an && conBan(l) > 0 && !dangBanGap(l, bayGio) && laKemLoai(l)
    && bayGio - l.dangLuc >= NGAY && !so.ketNoi.some(k => k.loId === l.id && k.trangThai !== 'tu_choi'));
}

/** Lô kém loại khớp hồ sơ nhận hàng kém loại của bên mua (để báo bên mua). */
export function loKemLoaiKhop(so: SoGiaoDich, muaId: string, bayGio: number) {
  const n = so.nguoiDung.find(x => x.id === muaId);
  if (!n?.nhanHangKemLoai) return [];
  return so.lo.filter(l => l.ban.id !== muaId && loHienThi(l, bayGio, chinhSachCua(so).hanHienThiLo) && laKemLoai(l) && nguoiNhanHangKemLoai(so, l).nhan.some(x => x.id === muaId))
    .sort((a, b) => Number(dangBanGap(b, bayGio)) - Number(dangBanGap(a, bayGio)) || b.dangLuc - a.dangLuc)
    .map(l => ({ lo: l, loai: loaiCua(l), banGap: dangBanGap(l, bayGio) }));
}
