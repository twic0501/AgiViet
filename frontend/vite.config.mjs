// Build Vite nhiều trang cho bản host (Cloudflare Pages). Không đổi mã nguồn các màn: mỗi .html là một đầu vào;
// file chỉ được gọi bằng đường dẫn động (ảnh trâu, .riv, mau/, json…) Vite không thấy → chép nguyên vào dist sau build.
import { defineConfig } from "vite";
import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";

const goc = path.dirname(new URL(import.meta.url).pathname);
const BO = new Set(["node_modules", "dist", "tests", "tham-khao", "scripts", ".git"]);
const duyet = (d, ra = []) => {
  for (const ten of readdirSync(d)) {
    if (BO.has(ten) || ten.startsWith(".")) continue;
    const p = path.join(d, ten);
    statSync(p).isDirectory() ? duyet(p, ra) : ra.push(p);
  }
  return ra;
};
const tatCa = duyet(goc);
const trang = Object.fromEntries(tatCa.filter((p) => p.endsWith(".html")).map((p) => [path.relative(goc, p).replace(/\.html$/, ""), p]));

const chepPhanCon = () => ({
  name: "chep-file-tinh-con-lai",
  apply: "build",
  closeBundle() {
    let n = 0;
    for (const p of tatCa) {
      const rel = path.relative(goc, p);
      if (/^(vite\.config|server)\.mjs$|^package(-lock)?\.json$|\.md$/.test(rel)) continue;
      const dich = path.join(goc, "dist", rel);
      if (existsSync(dich)) continue; // file Vite đã build (html, js có gắn băm) giữ nguyên
      mkdirSync(path.dirname(dich), { recursive: true }); copyFileSync(p, dich); n++;
    }
    console.log(`chép thêm ${n} file tĩnh gọi bằng đường dẫn động`);
  },
});

export default defineConfig({
  root: goc,
  base: "./",
  publicDir: false,
  plugins: [chepPhanCon()],
  build: { outDir: "dist", emptyOutDir: true, rollupOptions: { input: trang }, target: "es2022" },
});
