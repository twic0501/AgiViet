import './giao-dien/token.css';
import './giao-dien/trang.css';
import { trang } from './khu/index.ts';
import { TRANG_CHU } from './noi-dung/trang-chu.ts';

const duongDanApp = (import.meta.env.VITE_DUONG_DAN_APP as string | undefined) ?? 'http://localhost:5173';
document.getElementById('trang')!.innerHTML = trang(TRANG_CHU, { duongDanApp: duongDanApp.replace(/\/$/, '') });
