/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Trang giới thiệu chạy độc lập (cổng 5174). Đường dẫn sang app mô phỏng đặt bằng biến VITE_DUONG_DAN_APP (xem .env.example).
// Chế độ "mot-tep" (npm run dong-goi): một tệp HTML; nút vào app trỏ tới tệp app một tệp nằm cùng thư mục.
export const TEP_APP = 'AgiViet_app_mo_phong.html';

export default defineConfig(({ mode }) => ({
  plugins: mode === 'mot-tep' ? [viteSingleFile()] : [],
  define: mode === 'mot-tep' ? { 'import.meta.env.VITE_DUONG_DAN_APP': JSON.stringify(`${TEP_APP}#`) } : {},
  server: { port: 5174 },
  test: { environment: 'node' },
}));
