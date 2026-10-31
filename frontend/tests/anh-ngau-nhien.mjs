// Ảnh PNG nhiễu màu, khác nhau mỗi lần gọi: server không tính ảnh trùng là "chụp trong app" (Codex rà Đăng bài #6)
import { deflateSync } from "node:zlib";
const crcBang = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcBang[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const khoi = (loai, du) => { const d = Buffer.alloc(4); d.writeUInt32BE(du.length); const td = Buffer.concat([Buffer.from(loai), du]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([d, td, c]); };
export function anhNgauNhien(w = 96, h = 72) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const dong = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; dong[o] = 200 + Math.random() * 55; dong[o + 1] = 150 + Math.random() * 80; dong[o + 2] = Math.random() * 90; }
  const buffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoi("IHDR", ihdr), khoi("IDAT", deflateSync(dong)), khoi("IEND", Buffer.alloc(0))]);
  return { name: `hang-${Date.now()}.png`, mimeType: "image/png", buffer };
}
