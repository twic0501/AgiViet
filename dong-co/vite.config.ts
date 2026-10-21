/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Đóng gói src/trinh-duyet.ts thành một tệp IIFE (window.AVN) để trang HTML nạp bằng <script>, không cần công cụ build ở app.
export default defineConfig({
  build: {
    lib: { entry: 'src/trinh-duyet.ts', name: 'AVN', formats: ['iife'], fileName: () => 'dong-co.js' },
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    target: 'es2020',
  },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
