// Đo chịu tải các API đọc chính trên stack thử cô lập (mặc định 127.0.0.1:18980, PGlite bộ nhớ).
// Dùng: node test/do-tai-doc.mjs [so_luot=2000] [song_song=50]. Chỉ chạy với môi trường "thu" (cần /v1/test/impersonate).
const GOC = process.env.AGV_API || 'http://127.0.0.1:18980';
const [N, SS] = [Number(process.argv[2] || 2000), Number(process.argv[3] || 50)];

async function goi(duong, body, token) {
  const r = await fetch(GOC + duong, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  await r.arrayBuffer();
  return r.status;
}

const suc = await (await fetch(GOC + '/health')).json();
if (suc.moi_truong !== 'thu') throw new Error('chỉ đo trên môi trường thử');
const tk = {};
for (const [vai, sdt] of [['ban', '0909000210'], ['mua', '0918000421']]) {
  const r = await fetch(GOC + '/v1/test/impersonate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: sdt }) });
  tk[vai] = (await r.json()).token;
}
const viec = [['/v1/me', 'ban'], ['/v1/lots?mine=true', 'ban'], ['/v1/demands', 'ban'], ['/v1/me', 'mua'], ['/v1/lots', 'mua'], ['/v1/demands?mine=true', 'mua']];
const tre = []; const ma = {}; let i = 0;
const t0 = performance.now();
await Promise.all(Array.from({ length: SS }, async () => {
  while (i < N) {
    const [duong, vai] = viec[i++ % viec.length];
    const t = performance.now();
    let s;
    try { s = await goi(duong, null, tk[vai]); } catch { s = 'loi_mang'; }
    tre.push(performance.now() - t); ma[s] = (ma[s] || 0) + 1;
  }
}));
const tong = (performance.now() - t0) / 1000;
tre.sort((a, b) => a - b);
const p = (q) => tre[Math.min(tre.length - 1, Math.floor(tre.length * q))].toFixed(0);
console.log(`${N} lượt, ${SS} song song, ${tong.toFixed(1)}s, ${(N / tong).toFixed(0)} lượt/s`);
console.log('mã HTTP:', ma);
console.log(`trễ ms: p50=${p(0.5)} p95=${p(0.95)} p99=${p(0.99)} max=${tre.at(-1).toFixed(0)}`);
if (Object.keys(ma).some((k) => k !== '200')) process.exitCode = 1;
