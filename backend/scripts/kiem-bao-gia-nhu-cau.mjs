// Bên mua thật (Nhà máy sấy) có nhu cầu mở → một vòng AI → người bán ảo báo giá → bên mua thấy báo giá. Sai thì exit 1.
const B = 'http://127.0.0.1:18980';
const j = async (r) => { const x = await r.json().catch(() => ({})); return x && typeof x === 'object' && 'data' in x ? x.data : x; };
const t = (await j(await fetch(B + '/v1/test/impersonate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '0909000213' }) }))).token;
const H = { 'content-type': 'application/json', authorization: 'Bearer ' + t };
const v = await j(await fetch(B + '/v1/test/doi-tac-ao/vong', { method: 'POST', headers: H, body: '{}' }));
console.log('AI:', (v.viec ?? []).filter((x) => /nhu cầu/.test(x.viec)).map((x) => `${x.to_chuc} ${x.viec} ${x.doi_tuong} ${x.ket_qua}${x.chi_tiet ? ' ' + x.chi_tiet.slice(0, 120) : ''}`).join(' | '));
const nc = await j(await fetch(B + '/v1/demands?mine=true', { headers: H }));
let co = 0;
for (const n of (nc.items ?? nc).filter((x) => x.status === 'open')) {
  const so = await j(await fetch(B + `/v1/demands/${n.id}/offer-comparison`, { headers: H }));
  const ds = so.items ?? so; co += ds.length;
  console.log(n.code, 'báo giá nhận được:', ds.length, JSON.stringify(ds.map((x) => [x.seller_name, x.price_vnd ?? x.vong_cuoi?.price_vnd])).slice(0, 200));
}
process.exit(co > 0 ? 0 : 1);
