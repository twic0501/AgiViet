// Danh mục màn và điều hướng khớp nhau: không trỏ tới màn không có, không màn đã làm nào nằm ngoài danh mục.
import { describe, expect, it } from 'vitest';
import { DANH_MUC_MAN, timMan } from '../src/phan-he/danh-muc-man.ts';
import { MAN_VAO, MUC_TOI_BAN, THANH_BEN_MUA, THANH_DUOI_BAN, TRANG_NGOAI } from '../src/phan-he/dieu-huong.ts';

describe('Danh mục màn', () => {
  it('129 màn, không trùng mã trong một vai, màn nào cũng có khu vực bố cục', () => {
    expect(DANH_MUC_MAN).toHaveLength(129);
    const ma = DANH_MUC_MAN.map(m => `${m.vai}/${m.id}`);
    expect(new Set(ma).size).toBe(ma.length);
    expect(DANH_MUC_MAN.filter(m => !m.khuVuc.length)).toEqual([]);
  });
  it('mục điều hướng nào cũng mở được màn có thật, đúng trang', () => {
    for (const m of [...THANH_DUOI_BAN, MUC_TOI_BAN]) expect(timMan('ban', m.manDau)?.trang, m.manDau).toBe(m.trang);
    for (const m of THANH_BEN_MUA) expect(timMan('mua', m.manDau)?.trang, m.manDau).toBe(m.trang);
    expect(timMan('ban', MAN_VAO.ban)).toBeDefined();
    expect(timMan('mua', MAN_VAO.mua)).toBeDefined();
  });
  it('trang nào trong danh mục cũng có mục điều hướng (trừ trang đăng ký, đăng nhập)', () => {
    const coMuc = new Set([...THANH_DUOI_BAN, MUC_TOI_BAN].map(m => 'ban/' + m.trang).concat(THANH_BEN_MUA.map(m => 'mua/' + m.trang)));
    const thieu = [...new Set(DANH_MUC_MAN.filter(m => m.trang !== TRANG_NGOAI[m.vai]).map(m => `${m.vai}/${m.trang}`))].filter(t => !coMuc.has(t));
    expect(thieu).toEqual([]);
  });
});
