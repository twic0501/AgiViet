// Máy chủ AgiViet: API + phục vụ hai giao diện (/ban/ Nhà sản xuất, /mua/ Thu mua).
// Chạy: node src/server.js   (PORT, AGIVIET_DB, FE_BAN, FE_MUA, AGIVIET_DEMO=0 để tắt chế độ demo)
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { moDb } from './lib/core.js';
import { taoServer } from './lib/http.js';
import './modules/dinh-danh.js';
import './modules/nguon-hang.js';
import './modules/don-hang.js';
import './modules/tien.js';
import './modules/giao-nhan.js';
import { chayViecNen } from './modules/ho-tro.js';
import { damBaoNenTang } from '../scripts/nen-tang.js';

export function khoiDong({ port = Number(process.env.PORT || 8790), db } = {}) {
  moDb(db);
  damBaoNenTang();
  const home = os.homedir();
  const xuLy = taoServer({ tinh: [
    { tien_to: '/ban/', thu_muc: process.env.FE_BAN || path.join(home, 'fe-nongdan') },
    { tien_to: '/mua/', thu_muc: process.env.FE_MUA || path.join(home, 'fe-thumua') },
  ] });
  const server = http.createServer(xuLy);
  const hen = setInterval(() => { try { chayViecNen(); } catch (e) { console.error('việc nền', e); } }, 60e3);
  server.on('close', () => clearInterval(hen));
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const s = await khoiDong();
  const { port } = s.address();
  console.log(`AgiViet chạy tại http://127.0.0.1:${port}  ·  /ban/ Nhà sản xuất  ·  /mua/ Thu mua  ·  /api/health`);
}
