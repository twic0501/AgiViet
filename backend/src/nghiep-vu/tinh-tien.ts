// Công thức tiền theo docs/nghiep-vu/04. Mọi phép tính dùng bigint (đồng, gam); không dùng số thực.
import { CHINH_SACH } from '../chinh-sach.ts';

export const B = (x: bigint | number | string | null | undefined): bigint => (x === null || x === undefined ? 0n : BigInt(x));

/** Chia làm tròn nửa lên (a, b > 0). */
export function chiaNuaLen(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new RangeError('Mẫu số phải dương');
  if (a < 0n) return -chiaNuaLen(-a, b);
  return (a * 2n + b) / (2n * b);
}
export function chiaLen(a: bigint, b: bigint): bigint { return (a + b - 1n) / b; }

/** Tiền một dòng = làm tròn nửa lên (gam × giá đồng/kg ÷ 1.000). */
export function tienDong(gam: bigint, giaDongKg: bigint): bigint { return chiaNuaLen(gam * giaDongKg, 1000n); }

/** P_coc = P nếu chưa đủ dữ liệu tham khảo; ngược lại max(P, làm tròn lên (0,7 × P_tk)). */
export function giaTinhCoc(P: bigint, Ptk: bigint | null): bigint {
  if (Ptk === null) return P;
  const san = chiaLen(Ptk * BigInt(CHINH_SACH.giaTinhCocSanBps), 10000n);
  return P > san ? P : san;
}

export interface KetQuaCoc { G: bigint; Gcoc: bigint; C: bigint; F: bigint; traThang: bigint; phiBps: number; phiSan: bigint; phiTran: bigint }

/** Cọc và phí lúc ký (04 mục 4). qGam: lượng hợp đồng (tối thiểu nếu khoảng). */
export function tinhCocPhi(qGam: bigint, P: bigint, Pcoc: bigint, goi: string, donDau: boolean): KetQuaCoc {
  const G = tienDong(qGam, P);
  const Gcoc = tienDong(qGam, Pcoc);
  const r = chiaNuaLen(Gcoc * BigInt(CHINH_SACH.cocBps), 10000n);
  const lamTron = BigInt(CHINH_SACH.cocLamTronVnd);
  const cocTron = chiaNuaLen(r, lamTron) * lamTron;
  const C = G < cocTron ? G : cocTron;
  const g = CHINH_SACH.goi[goi];
  if (!g) throw new Error(`Gói không biết: ${goi}`);
  const bps = donDau ? g.phiDonDauBps : g.phiDonSauBps;
  let F = 0n;
  if (bps > 0) {
    F = chiaNuaLen(Gcoc * BigInt(bps), 10000n);
    if (F < BigInt(g.sanVnd)) F = BigInt(g.sanVnd);
    if (g.tranVnd > 0 && F > BigInt(g.tranVnd)) F = BigInt(g.tranVnd);
  }
  const traThang = G - C > 0n ? G - C : 0n;
  return { G, Gcoc, C, F, traThang, phiBps: bps, phiSan: BigInt(g.sanVnd), phiTran: BigInt(g.tranVnd) };
}

export interface KetQuaQuyetToan { N: bigint; C_nb: bigint; C_bm: bigint; T_bm: bigint; T_nb: bigint }

/** Quyết toán đầy đủ (04 mục 5). */
export function quyetToan(V: bigint, D: bigint, C: bigint, X_nb = 0n, X_bm = 0n): KetQuaQuyetToan {
  if (V < 0n || D < 0n || C < 0n || X_nb < 0n || X_bm < 0n) throw new RangeError('Đầu vào âm');
  const N = V - X_nb + X_bm;
  if (N >= D + C) return { N, C_nb: C, C_bm: 0n, T_bm: N - D - C, T_nb: 0n };
  if (N >= D) return { N, C_nb: N - D, C_bm: C - (N - D), T_bm: 0n, T_nb: 0n };
  return { N, C_nb: 0n, C_bm: C, T_bm: 0n, T_nb: D - N };
}

/** Chi tạm khi có tranh chấp (04 mục 6, N-08): max(0, min(C, max(0, V_kt − D)) − G_them). */
export function chiTam(V_kt: bigint, D: bigint, C: bigint, G_them: bigint): bigint {
  const a = V_kt - D > 0n ? V_kt - D : 0n;
  const b = a < C ? a : C;
  const x = b - G_them;
  return x > 0n ? x : 0n;
}

/** Kết luận sau chi tạm: không thu hồi từ ngân hàng; phần chi tạm vượt thành T_nb. */
export function quyetToanSauChiTam(V: bigint, D: bigint, C: bigint, X_nb: bigint, X_bm: bigint, daChi: bigint) {
  const f = quyetToan(V, D, C, X_nb, X_bm);
  const them = f.C_nb - daChi;
  if (them >= 0n) return { ...f, chiThem: them, hoan: C - f.C_nb };
  return { ...f, chiThem: 0n, hoan: C - daChi, T_nb: f.T_nb - them };
}

/** Phạt thiếu lượng Q04: tỷ lệ % cọc phần thiếu. */
export function phatThieuLuong(C: bigint, qHopDong: bigint, qThieu: bigint, mucBps: number): bigint {
  if (qThieu <= 0n) return 0n;
  const cocPhanThieu = chiaNuaLen(C * qThieu, qHopDong);
  return chiaNuaLen(cocPhanThieu * BigInt(mucBps), 10000n);
}

export const s = (x: bigint | null | undefined) => (x === null || x === undefined ? null : x.toString());
