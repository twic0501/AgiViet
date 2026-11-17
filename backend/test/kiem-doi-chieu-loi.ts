// Kiểm đối chiếu chéo quyết toán (không cần mạng): `npx tsx test/kiem-doi-chieu-loi.ts` (thoát 1 nếu sai).
import assert from 'node:assert';
import { doiChieuQuyetToan, type GoiLoi } from '../src/nghiep-vu/doi-chieu-loi.ts';

// HĐ-3008 trên host: hàng đạt 1.764.000, chưa trả thẳng, cọc 2.646.000 → về người bán 1.764.000, hoàn 882.000
const st = { is_final: true, v_vnd: '1764000', d_vnd: '0', c_vnd: '2646000', x_nb_vnd: '0', x_bm_vnd: '0', materials_offset_vnd: '0', prior_released_vnd: '0',
  n_vnd: '1764000', c_nb_formula_vnd: '1764000', refund_vnd: '882000', t_bm_vnd: '0', t_nb_vnd: '0' };
const dung: GoiLoi = async () => ({ n: '1764000', coc_ve_nguoi_ban: '1764000', coc_hoan_ben_mua: '882000', ben_mua_tra_them: '0', nguoi_ban_hoan: '0' });
let gui: any = null; const ghi: GoiLoi = async (b) => { gui = b; return dung(b); };

assert.equal((await doiChieuQuyetToan(st, ghi)).ket_qua, 'khop');
assert.deepEqual(gui, { v: '1764000', d: '0', c: '2646000', x_nb: '0', x_bm: '0' });
await assert.rejects(doiChieuQuyetToan(st, async (b) => ({ ...(await dung(b))!, coc_hoan_ben_mua: '882001' })), /hoàn người mua: 882000 ≠ 882001/, 'lệch một đồng cũng chặn');
assert.equal((await doiChieuQuyetToan(st, async () => null)).ket_qua, 'chua_doi_chieu', 'không gọi được lõi thì không chặn');
assert.equal((await doiChieuQuyetToan({ ...st, is_final: false }, ghi)).ket_qua, 'bo_qua', 'lần tạm không đối chiếu');
await doiChieuQuyetToan({ ...st, x_nb_vnd: '1000', materials_offset_vnd: '500', n_vnd: '1762500', c_nb_formula_vnd: '1762500', refund_vnd: '883500' }, async (b) => { gui = b; return { n: '1762500', coc_ve_nguoi_ban: '1762500', coc_hoan_ben_mua: '883500', ben_mua_tra_them: '0', nguoi_ban_hoan: '0' }; });
assert.equal(gui.x_nb, '1500', 'vật tư đối trừ gộp vào phần người bán chịu');
const sauChiTam = await doiChieuQuyetToan({ ...st, prior_released_vnd: '500000', refund_vnd: '1' }, dung);
assert.deepEqual(sauChiTam.da_so, ['N', 'cọc về người bán'], 'đã chi tạm thì chỉ so N và cọc về người bán');
console.log('✔ đối chiếu quyết toán với lõi Rust đạt');
