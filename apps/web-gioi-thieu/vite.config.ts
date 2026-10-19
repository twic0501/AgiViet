/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Trang giới thiệu chạy độc lập (cổng 5174). Đường dẫn sang app mô phỏng đặt bằng biến VITE_DUONG_DAN_APP (xem .env.example).
export default defineConfig({
  server: { port: 5174 },
  test: { environment: 'node' },
});
