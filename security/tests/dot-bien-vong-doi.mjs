#!/usr/bin/env node
// Kiểm đột biến cho bài kiểm thử vòng đời tiền: cố tình thêm một chuyển SAI vào máy trạng thái,
// chạy lại bộ kiểm thử tính chất; bộ kiểm thử PHẢI hỏng. Nếu không hỏng, bài kiểm thử đang rỗng.
// Chạy: node security/tests/dot-bien-vong-doi.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const libUrl = pathToFileURL(join(here, '..', 'lib', 'money-lifecycle.mjs')).href;
const testUrl = pathToFileURL(join(here, 'unit', 'money-lifecycle.test.mjs')).href;

const MUTATIONS = {
  nguoi_giup_xac_nhan_tien: `M.tra_thang.transitions.push({ from: 'den_han', to: 'da_nhan_du', by: ['NG'], evidence: 'B', moneyFact: true });`,
  ben_tra_tu_ghi_coc: `M.nop_coc.transitions.push({ from: 'bm_bao_da_chuyen', to: 'da_ghi_so', by: ['BM'], evidence: 'C', moneyFact: true });`,
  het_han_coi_nhu_da_nhan: `M.tra_thang.transitions.push({ from: 'bm_da_bao', to: 'da_nhan_du', by: ['HT'], evidence: '-', moneyFact: true });`,
  huy_lenh_da_gui: `M.lenh_ngan_hang.transitions.push({ from: 'da_gui', to: 'da_huy_truoc_gui', by: ['HT'], evidence: '-' });`,
  quay_lai_sau_khoa: `M.quyet_toan.transitions.push({ from: 'da_khoa', to: 'nhap', by: ['HT'], evidence: '-' });`,
  vh_mot_nguoi_chi_tien: `M.coc.transitions.push({ from: 'dang_giu', to: 'da_khoa_phan_bo', by: ['VH2', 'HT'], evidence: 'B' });`,
  trang_thai_treo_vo_han: `M.tra_thang.transitions.push({ from: 'qua_han', to: 'cho_vo_han', by: ['HT'], evidence: '-' });`,
};

let ok = 0;
for (const [name, code] of Object.entries(MUTATIONS)) {
  const script = `const L = await import(${JSON.stringify(libUrl)}); const M = L.MACHINES; ${code} await import(${JSON.stringify(testUrl)});`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  const failed = r.status !== 0;
  console.log(`${failed ? '  ĐẠT ' : '  HỎNG'} đột biến "${name}" ${failed ? 'bị bài kiểm thử bắt' : 'KHÔNG bị bắt'}`);
  if (failed) ok++;
}
console.log(`\n${ok}/${Object.keys(MUTATIONS).length} đột biến bị bắt.`);
process.exit(ok === Object.keys(MUTATIONS).length ? 0 : 1);
