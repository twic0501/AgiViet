/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// App mô phỏng chạy độc lập (cổng 5173), không chung tên miền hay kho dữ liệu với trang giới thiệu (cổng 5174).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: { environment: 'node' },
});
