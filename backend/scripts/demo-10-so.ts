// npm run demo:10-so — dựng (lại) 10 tình huống cho số đăng nhập mẫu 0001–0010 trên backend thử đang chạy.
// API_ORIGIN mặc định http://127.0.0.1:18080. Chỉ chạy được khi backend ở môi trường thử (/v1/test/* có mặt).
// Lọc: npm run demo:10-so -- 0003,0008
import { dungDemo } from '../src/demo/dung-demo.ts';
import { SO_DEMO } from '../src/demo/so-demo.ts';

const BASE = process.env.API_ORIGIN ?? 'http://127.0.0.1:18080';
const chi = process.argv[2] ? process.argv[2].split(',') : undefined;
const goi = async (method: 'GET' | 'POST', url: string, body?: any, token?: string) => {
  const r = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined });
  const t = await r.text();
  let json: any = null; try { json = JSON.parse(t); } catch { json = t; }
  return { status: r.status, json };
};
const kt = await goi('GET', '/v1/test/clock');
if (kt.status !== 200) { console.error(`Backend ${BASE} không ở môi trường thử (/v1/test/clock → ${kt.status}); dừng.`); process.exit(2); }
// Stack Postgres (18080) không có đồng hồ thử trong DB: dùng giờ thật. Đặt DEMO_TUA_GIO=1 nếu backend là PGlite có đồng hồ thử.
const kq = await dungDemo(goi, chi, process.env.DEMO_TUA_GIO !== '1');
console.log('Số  | Người | Tình huống | Màn mở đầu | Trạng thái');
for (const x of kq) {
  const s = SO_DEMO.find((y) => y.so === x.so)!;
  const duong = s.man_mo_dau.replace(/\{(\w+)\}/g, (_m, k) => x.ids[k] ?? '');
  console.log(`${x.so} | ${x.ten} (${s.to_chuc}) | ${x.tinh_huong} | ${duong} | ${x.trang_thai}${x.giu_nguyen ? ' (giữ nguyên)' : ' (vừa dựng)'}`);
}
