// Kiểm ẩn danh trước hợp đồng qua API thật: `node test/kiem-an-danh.mjs [url]` trên môi trường thử.
// Luật: chưa từng có hợp đồng giữa hai bên thì chỉ thấy mã ẩn danh; đã có thì thấy tên thật (hợp đồng ghi tên hai bên).
import assert from "node:assert";
const B = process.argv[2] || "http://127.0.0.1:18981";
const vao = async (phone) => { const r = await fetch(B + "/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json", "x-agv-may": "kiem-an-danh" }, body: JSON.stringify({ phone }) }); assert.equal(r.status, 200, "đăng nhập " + phone); return (await r.json()).token; };
const doc = async (tk, d) => { const r = await fetch(B + d, { headers: { authorization: "Bearer " + tk } }); assert.equal(r.status, 200, d); const j = await r.json(); return j.items ?? j.data ?? j; };
const AN_BAN = /^Người bán NB-[0-9A-F]{4}$/, AN_MUA = /^Người mua NM-[0-9A-F]{4}$/;

const tenThat = new Set((await (await fetch(B + "/v1/test/accounts")).json()).map((a) => a.org_name));
const mua = await vao("0938000610");
const quen = new Set((await doc(mua, "/v1/orders")).map((d) => d.seller_org_id));

let an = 0, that = 0;
for (const l of await doc(mua, "/v1/lots")) {
  const ct = await doc(mua, `/v1/lots/${l.id}`);
  if (quen.has(ct.seller_org_id)) { assert.ok(tenThat.has(ct.seller_name), `${l.code}: đã có hợp đồng thì thấy tên thật, được ${ct.seller_name}`); that++; }
  else { assert.match(ct.seller_name, AN_BAN, `${l.code}: chưa có hợp đồng mà lộ tên ${ct.seller_name}`); an++; }
  const hs = await doc(mua, `/v1/lots/${l.id}/source-profile`);
  assert.equal(hs.nguoi_ban.ten, ct.seller_name, `${l.code}: hồ sơ nguồn phải theo cùng luật`);
}
assert.ok(an > 0, "dữ liệu thử phải có ít nhất một lô của người bán lạ");
// Cùng người bán luôn cùng một mã, để bên mua so được các lô của một người mà không biết là ai
const ma = new Map();
for (const l of await doc(mua, "/v1/lots")) { const ct = await doc(mua, `/v1/lots/${l.id}`); if (ma.has(ct.seller_org_id)) assert.equal(ma.get(ct.seller_org_id), ct.seller_name); ma.set(ct.seller_org_id, ct.seller_name); }
for (const o of await doc(mua, "/v1/offers")) if (o.la_ben_mua && !quen.has(o.seller_org_id)) assert.match(o.seller_name, AN_BAN, `lời chào ${o.code} lộ tên người bán`);
console.log(`✔ người mua: ${an} lô thấy mã ẩn danh, ${that} lô của người bán đã có hợp đồng thấy tên thật`);

// Chiều ngược lại: người bán xem nhu cầu mua của người mua lạ
const ban = await vao("0918000603");
const quenB = new Set((await doc(ban, "/v1/orders")).map((d) => d.buyer_org_id));
let nc = 0;
for (const d of await doc(ban, "/v1/demands")) {
  if (quenB.has(d.buyer_org_id)) continue;
  assert.match(d.buyer_name, AN_MUA, `nhu cầu ${d.code} lộ tên người mua ${d.buyer_name}`);
  assert.match((await doc(ban, `/v1/demands/${d.id}`)).buyer_name, AN_MUA, `chi tiết nhu cầu ${d.code} lộ tên`);
  nc++;
}
console.log(`✔ người bán: ${nc} nhu cầu của người mua lạ chỉ thấy mã ẩn danh`);

// Có hợp đồng thì hai bên thấy tên thật của nhau (hợp đồng ghi tên hai bên); chốt giá thôi thì chưa
const nb = await vao("0945000880");
const gui = async (tk, d, b = {}) => { const r = await fetch(B + d, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tk, "x-agv-may": "kiem-an-danh" }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...b }) }); const j = await r.json().catch(() => ({})); assert.ok(r.status < 300, `${d}: ${r.status} ${JSON.stringify(j).slice(0, 200)}`); return j.data ?? j; };
const loNb = (await doc(nb, "/v1/lots?mine=true")).find((l) => l.status === "on_sale");
const gia = Number((await doc(nb, `/v1/lots/${loNb.id}`)).ask_price_vnd);
const tenNb = (await doc(nb, "/v1/me")).org.name, me = await doc(mua, "/v1/me");
assert.match((await doc(mua, `/v1/lots/${loNb.id}`)).seller_name, AN_BAN, "trước hợp đồng còn ẩn");
const of = await gui(mua, "/v1/offers", { direction: "buyer_bid", lot_id: loNb.id, qty_g: 100000, price_vnd: gia });
await gui(nb, `/v1/offers/${of.id}/accept`, { expected_revision: (await doc(nb, `/v1/offers/${of.id}`)).revision });
assert.match((await doc(nb, "/v1/offers")).find((o) => o.id === of.id).buyer_name, AN_MUA, "chốt giá chưa phải hợp đồng: người bán vẫn chỉ thấy mã người mua");
await gui(mua, `/v1/offers/${of.id}/terms/framework-read`, {}); await gui(nb, `/v1/offers/${of.id}/terms/framework-read`, {});
const dx = await gui(mua, `/v1/offers/${of.id}/terms`, (await doc(mua, `/v1/offers/${of.id}/terms`)).mac_dinh);
await gui(nb, `/v1/offers/${of.id}/terms/accept`, { phien_ban: dx.phien_ban ?? 1 });
await gui(mua, "/v1/orders", { offer_id: of.id, delivery_mode: "at_farm", designated_receiver_user_id: me.user_id });
assert.equal((await doc(mua, `/v1/lots/${loNb.id}`)).seller_name, tenNb, "có hợp đồng: bên mua thấy tên thật người bán");
assert.equal((await doc(nb, "/v1/offers")).find((o) => o.id === of.id).buyer_name, me.org.name, "có hợp đồng: người bán thấy tên thật người mua");
console.log("✔ chốt giá chưa lộ tên; lập hợp đồng xong hai bên thấy tên thật của nhau");
