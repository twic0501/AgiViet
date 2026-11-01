// npm run doi-tac-ao — chạy đối tác ảo trên backend thử. NGUOI_THAT=số người thật (phẩy), mặc định 0918000421.
// MOT_LAN=1: chạy một vòng rồi thoát (dùng trong test). API_ORIGIN mặc định http://127.0.0.1:18980.
import { motVong } from '../src/demo/doi-tac-ao.ts';

const BASE = process.env.API_ORIGIN ?? 'http://127.0.0.1:18980';
const nguoiThat = (process.env.NGUOI_THAT ?? '0918000421').split(',').map((x) => x.trim()).filter(Boolean);
const goi = async (method: 'GET' | 'POST', url: string, body?: any, token?: string) => {
  const r = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined });
  const t = await r.text(); let json: any = null; try { json = JSON.parse(t); } catch { json = t; }
  return { status: r.status, json };
};
if ((await goi('GET', '/v1/test/clock')).status !== 200) { console.error('Backend không ở môi trường thử; dừng.'); process.exit(2); }
console.log(`Đối tác ảo: đóng vai mọi bên trừ ${nguoiThat.join(', ')}`);
do {
  for (const v of await motVong(goi, nguoiThat)) console.log(`${new Date().toLocaleTimeString('vi-VN')} ${v.to_chuc} ${v.viec} ${v.doi_tuong}: ${v.ket_qua}${v.chi_tiet ? ' ' + v.chi_tiet : ''}`);
  if (process.env.MOT_LAN === '1') break;
  await new Promise((r) => setTimeout(r, Number(process.env.CHU_KY_MS ?? 4000)));
} while (true);
