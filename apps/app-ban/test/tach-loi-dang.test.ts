import { describe, expect, it } from 'vitest';
import { tachLoiDang } from '../src/man/dang.tsx';

describe('Tách lời nói đăng hàng', () => {
  it('mặt hàng, tấn, giá nghìn', () => {
    expect(tachLoiDang('Xoài cát Chu 10 tấn, giá 25 nghìn một ký')).toEqual({ matHang: 'xoai-cat-chu', kg: 10000, gia: 25000 });
  });
  it('ký và giá dạng k; không có mặt hàng thì để trống', () => {
    expect(tachLoiDang('800 ký thanh long ruột đỏ giá 18k')).toMatchObject({ kg: 800, gia: 18000, matHang: 'thanh-long-ruot-do' });
    expect(tachLoiDang('hàng nhà còn 2,5 tấn')).toEqual({ kg: 2500 });
  });
});
