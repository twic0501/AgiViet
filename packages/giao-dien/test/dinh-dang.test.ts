import { describe, expect, it } from 'vitest';
import { docSo, luong, ngay, tienGon, tuongDoi } from '../src/dinh-dang.ts';

describe('Định dạng', () => {
  it('đọc số người gõ', () => {
    expect(docSo('1.500')).toBe(1500);
    expect(docSo('2,5')).toBe(2.5);
    expect(docSo('25 000')).toBe(25000);
    expect(docSo('')).toBeNaN();
    expect(docSo('abc')).toBeNaN();
  });
  it('lượng, tiền gọn, ngày', () => {
    expect(luong(1500)).toBe('1,5 tấn');
    expect(luong(800)).toBe('800 kg');
    expect(tienGon(95_000_000)).toBe('95 triệu');
    expect(ngay('2026-10-19')).toBe('19/10/2026');
    expect(ngay('2026-10-09', true)).toBe('9/10');
  });
  it('thời gian tương đối', () => {
    expect(tuongDoi(0, 30_000)).toBe('vừa xong');
    expect(tuongDoi(0, 3 * 3600_000)).toBe('3 giờ trước');
    expect(tuongDoi(0, 30 * 3600_000)).toBe('hôm qua');
  });
});
