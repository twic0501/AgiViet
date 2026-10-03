// Gom mọi câu cố định mà nút Nghe của app Nhà sản xuất đọc: data-read (màn), data-noi (nút), 5 thẻ hướng dẫn,
// các bước hướng dẫn chỉ tay (tour.js, phần bên bán). Mỗi câu chuẩn hóa như app (gộp khoảng trắng) rồi băm FNV-1a
// trên mã UTF-16 — cùng hàm với js/giong-thu.js để app tra ra đúng tệp.
// Chạy: node scripts/gom-cau-doc.mjs [~/fe-nongdan] > cau-doc.json
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const goc = process.argv[2] || path.join(os.homedir(), 'fe-nongdan');
export const chuan = t => String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().normalize('NFC');
export const bam = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const giai = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const cau = new Map();
const them = (t, nguon) => { const c = chuan(giai(t)); if (c.length < 2) return; const k = bam(c); if (!cau.has(k)) cau.set(k, { id: k, t: c, nguon }); };
for (const f of fs.readdirSync(goc).filter(x => x.endsWith('.html') && !['nhan-dien.html', 'nguon-anh.html', 'index.html'].includes(x))) {
  const s = fs.readFileSync(path.join(goc, f), 'utf8');
  for (const m of s.matchAll(/data-(read|noi)="([^"]*)"/g)) them(m[2], `${f}:${m[1]}`);
}
// Bản mô phỏng đổi lời đọc của vài màn lúc chạy (dataset.read.replace('A', 'B')): thu cả phiên bản đã đổi
const mp = fs.readFileSync(path.join(goc, 'js/mo-phong.js'), 'utf8');
for (const m of mp.matchAll(/dataset\.read\.replace\('([^']*)', '([^']*)'\)/g)) for (const c of [...cau.values()]) if (c.t.includes(m[1])) them(c.t.replace(m[1], m[2]), c.nguon + ':mo-phong');
const hd = fs.readFileSync(path.join(goc, 'js/huong-dan.js'), 'utf8');
for (const m of hd.matchAll(/doc: '([^']*)'/g)) them(m[1], 'huong-dan');
const tour = fs.readFileSync(path.join(goc, 'js/tour.js'), 'utf8');
const ban = tour.slice(tour.indexOf('ban: {'), tour.indexOf('mua: {'));
for (const m of ban.matchAll(/c: '([^']*)'/g)) them(m[1], 'tour');
const ds = [...cau.values()];
if (process.argv[1].endsWith('gom-cau-doc.mjs')) {
  console.error(`${ds.length} câu · ${ds.reduce((a, c) => a + c.t.length, 0)} ký tự`);
  console.log(JSON.stringify(ds, null, 1));
}
