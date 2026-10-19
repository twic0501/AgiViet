/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// App Nhà sản xuất (cổng 5173). Chế độ "mot-tep": gộp JS, CSS, ảnh vào một tệp HTML mở thẳng bằng trình duyệt.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'mot-tep' ? [viteSingleFile()] : [])],
  build: mode === 'mot-tep' ? { assetsInlineLimit: () => true } : {},
  server: { port: 5173 },
  test: { environment: 'node' },
}));
