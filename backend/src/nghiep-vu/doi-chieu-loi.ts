// Đối chiếu chéo quyết toán: cơ sở dữ liệu lập bảng quyết toán, lõi Rust (qua cổng Go, AGV_LOI_URL) tính lại độc lập
// từ cùng V, D, C, X. Lệch thì chặn trước khi gửi lệnh chi tiền. Không gọi được lõi thì CSDL vẫn là nguồn đúng, ghi "chưa đối chiếu".
import { loi } from '../loi.ts';

export type KetQuaLoi = Record<'n' | 'coc_ve_nguoi_ban' | 'coc_hoan_ben_mua' | 'ben_mua_tra_them' | 'nguoi_ban_hoan', string>;
export type GoiLoi = (than: Record<string, string>) => Promise<KetQuaLoi | null>;

export const goiLoiQuaCong: GoiLoi = async (than) => {
  const url = process.env.AGV_LOI_URL;
  if (!url) return null;
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/v2/tinh/quyet-toan`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(than), signal: AbortSignal.timeout(4000) });
    return r.ok ? ((await r.json()) as KetQuaLoi) : null;
  } catch { return null; }
};

/** st: một hàng core.settlements. Chỉ đối chiếu lần quyết toán cuối (lần tạm khi tranh chấp dùng công thức chi tạm khác). */
export async function doiChieuQuyetToan(st: any, goi: GoiLoi = goiLoiQuaCong): Promise<{ ket_qua: 'khop' | 'bo_qua' | 'chua_doi_chieu'; da_so?: string[] }> {
  if (!st.is_final) return { ket_qua: 'bo_qua' };
  // Vật tư đối trừ trừ vào phần người bán, nên gộp vào phần người bán chịu: N = V − (X_nb + vật tư) + X_bm
  const r = await goi({ v: String(st.v_vnd), d: String(st.d_vnd), c: String(st.c_vnd), x_nb: String(BigInt(st.x_nb_vnd) + BigInt(st.materials_offset_vnd ?? 0)), x_bm: String(st.x_bm_vnd) });
  if (!r) return { ket_qua: 'chua_doi_chieu' };
  const so: [string, string, string][] = [['N', String(st.n_vnd), r.n], ['cọc về người bán', String(st.c_nb_formula_vnd), r.coc_ve_nguoi_ban]];
  // Có lần chi tạm trước đó thì hoàn và nghĩa vụ đã điều chỉnh theo phần đã chi, không so được bằng công thức gốc
  if (BigInt(st.prior_released_vnd ?? 0) === 0n) so.push(['hoàn bên mua', String(st.refund_vnd), r.coc_hoan_ben_mua], ['bên mua trả thêm', String(st.t_bm_vnd), r.ben_mua_tra_them], ['người bán hoàn', String(st.t_nb_vnd), r.nguoi_ban_hoan]);
  const lech = so.filter(([, a, b]) => a !== b);
  if (lech.length) throw loi('TRANG_THAI_KHONG_CHO_PHEP', `Quyết toán lệch giữa CSDL và lõi Rust (${lech.map(([k, a, b]) => `${k}: ${a} ≠ ${b}`).join('; ')}). Đã dừng, chưa gửi lệnh chi tiền.`);
  return { ket_qua: 'khop', da_so: so.map(([k]) => k) };
}
