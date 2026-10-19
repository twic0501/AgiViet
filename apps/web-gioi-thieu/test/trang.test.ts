// Trang giới thiệu: giữ nguyên trang đã duyệt; chỉ kiểm đường dẫn và tài nguyên tự đứng được.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const goc = new URL('..', import.meta.url).pathname;
const html = readFileSync(goc + 'index.html', 'utf8');

describe('Trang giới thiệu', () => {
  it('không còn đường dẫn tuyệt đối sang app cũ', () => {
    expect(html.match(/(?:href|src)="\/(?:ban|mua)\//g)).toBeNull();
  });
  it('nút dùng thử trỏ tới hai app qua chỗ giữ đường dẫn', () => {
    expect(html.split('%APP_BAN%').length - 1).toBe(4);
    expect(html.split('%APP_MUA%').length - 1).toBe(5);
  });
  it('mọi ảnh, logo, font, trang nguồn ảnh có trong public/', () => {
    const tep = [...html.matchAll(/(?:href|src)="((?:anh|assets|css)\/[^"]+)"/g)].map(m => m[1]!);
    const font = [...readFileSync(goc + 'public/css/fonts.css', 'utf8').matchAll(/url\(\.\.\/([^)]+)\)/g)].map(m => m[1]!);
    const thieu = [...tep.map(t => 'public/' + t), ...font.map(f => 'public/' + f), 'public/nguon-anh.html'].filter(t => !existsSync(goc + t));
    expect(thieu).toEqual([]);
  });
});
