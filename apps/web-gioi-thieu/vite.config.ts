/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Trang giới thiệu: một trang tĩnh, dự án riêng, không dùng chung code hay dữ liệu với các app.
// Hai nút "Dùng thử" trỏ sang app bán và app mua qua VITE_APP_BAN, VITE_APP_MUA (xem .env.example).
// Chế độ "mot-tep" (npm run dong-goi): nhúng ảnh, logo, font vào một tệp HTML; nút trỏ tới tệp app cùng thư mục.
export const TEP = { ban: 'AgiViet_app_ban.html', mua: 'AgiViet_app_mua.html', nguonAnh: 'AgiViet_nguon_anh.html' };

const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2' };
const dataUri = (tep: string) => `data:${MIME[tep.split('.').pop()!]};base64,${readFileSync(tep).toString('base64')}`;

function lienKetApp(ban: string, mua: string): Plugin {
  return { name: 'lien-ket-app', transformIndexHtml: html => html.replaceAll('%APP_BAN%', ban).replaceAll('%APP_MUA%', mua) };
}

/** Nhúng tệp trong public/ (ảnh, logo, font) vào HTML để một tệp mở được khi không có máy chủ. */
function nhungTaiNguyen(pub: string): Plugin {
  return {
    name: 'nhung-tai-nguyen',
    enforce: 'post',
    transformIndexHtml(html) {
      const css = readFileSync(join(pub, 'css/fonts.css'), 'utf8').replace(/url\(\.\.\/([^)]+)\)/g, (_, p: string) => `url(${dataUri(join(pub, p))})`);
      return html
        .replace(/<link rel="stylesheet" href="css\/fonts\.css">/, `<style>${css}</style>`)
        .replace(/(src|href)="((?:anh|assets)\/[^"]+\.(?:jpg|png|svg))"/g, (_, at: string, p: string) => `${at}="${dataUri(join(pub, p))}"`)
        .replaceAll('href="nguon-anh.html"', `href="${TEP.nguonAnh}"`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const motTep = mode === 'mot-tep';
  return {
    plugins: [
      lienKetApp(motTep ? TEP.ban : env.VITE_APP_BAN || 'http://localhost:5173', motTep ? TEP.mua : env.VITE_APP_MUA || 'http://localhost:5175'),
      ...(motTep ? [nhungTaiNguyen(join(process.cwd(), 'public'))] : []),
    ],
    publicDir: motTep ? false : 'public',
    server: { port: 5174 },
    test: { environment: 'node' },
  };
});
