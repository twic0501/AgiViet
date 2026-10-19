// Trang giới thiệu: đủ 12 khu theo thứ tự, liên kết sang app lấy từ cấu hình, nội dung được thoát ký tự HTML.
import { describe, expect, it } from 'vitest';
import { chu, trang } from '../src/khu/index.ts';
import { choChu, laCho } from '../src/noi-dung/kieu.ts';
import { TRANG_CHU } from '../src/noi-dung/trang-chu.ts';

const html = trang(TRANG_CHU, { duongDanApp: 'https://app.vi-du.vn' });

describe('Trang giới thiệu', () => {
  it('có đủ các khu theo đúng thứ tự', () => {
    const thuTu = ['dau', 'van-de', 'cach-hoat-dong', 'nha-vuon', 'doanh-nghiep', 'an-toan', 'mat-hang', 'bang-gia', 'hoi-dap', 'bat-dau'];
    const viTri = thuTu.map(id => html.indexOf(`id="${id}"`));
    expect(viTri.every(v => v > 0)).toBe(true);
    expect([...viTri].sort((a, b) => a - b)).toEqual(viTri);
    expect(html).toContain('<header class="dau-trang">');
    expect(html).toContain('<footer class="chan-trang">');
  });
  it('mọi nút vào app dùng đường dẫn cấu hình, không trỏ vào chính trang', () => {
    const lienKetApp = html.match(/href="https:\/\/app\.vi-du\.vn[^"]*"/g) ?? [];
    expect(lienKetApp.length).toBe(5);
  });
  it('khẩu hiệu đã chốt là chữ thật; chữ chưa chốt hiện ô chờ', () => {
    expect(laCho(TRANG_CHU.hero.khauHieu)).toBe(false);
    expect(html).toContain('<h1>Tìm đúng mối, chốt đúng giá</h1>');
    expect(chu(choChu('mô tả'))).toContain('class="cho-chu"');
  });
  it('thoát ký tự HTML trong nội dung', () => {
    expect(chu('<script>')).toBe('<span>&lt;script&gt;</span>');
  });
});
