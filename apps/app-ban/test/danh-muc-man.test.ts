import { describe, expect, it } from 'vitest';
import { DANH_MUC_MAN, MAN } from '../src/ung-dung.tsx';

describe('Danh mục màn app bán', () => {
  it('mọi màn trong danh mục đều có giao diện', () => {
    expect(DANH_MUC_MAN.filter(m => !MAN[m.id]).map(m => m.id)).toEqual([]);
  });
  it('không có giao diện thừa ngoài danh mục', () => {
    const ids = new Set(DANH_MUC_MAN.map(m => m.id));
    expect(Object.keys(MAN).filter(id => !ids.has(id))).toEqual([]);
  });
});
