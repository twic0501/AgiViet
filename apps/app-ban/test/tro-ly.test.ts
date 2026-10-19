import { describe, expect, it } from 'vitest';
import { docTien, tachCau } from '../src/tro-ly.ts';

const VUON = [{ id: 'VU-1', ten: 'Vườn xoài sau nhà', cay: 'Xoài cát Chu' }, { id: 'VU-2', ten: 'Ao tôm bờ kênh', cay: 'Tôm thẻ' }];

describe('Nói để ghi', () => {
  it('đọc số tiền nói kiểu Việt', () => {
    expect(docTien('mua 3 bao phân 900 nghìn')).toBe(900_000);
    expect(docTien('hết 1 triệu 2')).toBe(1_200_000);
    expect(docTien('tốn 2tr5')).toBe(2_500_000);
    expect(docTien('1,5 triệu')).toBe(1_500_000);
    expect(docTien('350k')).toBe(350_000);
    expect(docTien('tưới cây')).toBeUndefined();
  });
  it('phun thuốc: loại, thuốc, lượng, cách ly, vườn', () => {
    const k = tachCau('Sáng nay phun thuốc trừ rầy cho vườn xoài 2 bình, cách ly 7 ngày', '2026-10-19', VUON);
    expect(k).toMatchObject({ loai: 'phun_thuoc', ngay: '2026-10-19', vatTu: 'thuốc trừ rầy', luong: '2 bình', ngayCachLy: 7, vuonId: 'VU-1' });
  });
  it('mua phân là khoản chi, có ngày hôm qua', () => {
    const k = tachCau('hôm qua mua 3 bao phân NPK hết 900 nghìn', '2026-10-19', VUON);
    expect(k).toMatchObject({ loai: 'chi', ngay: '2026-10-18', soTien: 900_000, luong: '3 bao' });
  });
  it('bán được là khoản thu; tưới; thu hoạch', () => {
    expect(tachCau('bán được 2 triệu tiền chuối', '2026-10-19').loai).toBe('thu');
    expect(tachCau('tưới ao tôm', '2026-10-19', VUON)).toMatchObject({ loai: 'tuoi', vuonId: 'VU-2' });
    expect(tachCau('hái 500 ký xoài ngày 17/10', '2026-10-19')).toMatchObject({ loai: 'thu_hoach', ngay: '2026-10-17', luong: '500 ký' });
  });
});
