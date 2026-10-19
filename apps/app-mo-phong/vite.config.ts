/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// App mô phỏng chạy độc lập (cổng 5173), không chung tên miền hay kho dữ liệu với trang giới thiệu (cổng 5174).
// Chế độ "mot-tep" (npm run dong-goi): gộp JS, CSS vào một tệp HTML mở thẳng bằng trình duyệt, không cần máy chủ.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'mot-tep' ? [viteSingleFile()] : [])],
  server: { port: 5173 },
  test: { environment: 'node' },
}));
