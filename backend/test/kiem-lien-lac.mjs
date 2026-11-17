// Kiểm lớp che thông tin phần demo có thêm (chạy trên môi trường thử): `node test/kiem-lien-lac.mjs [url]`.
// 1) Số điện thoại bên kia: chưa cọc thì không có; ngân hàng xác nhận cọc thì hai bên thấy số của nhau.
// 2) Tra mã vùng trồng: người mua lạ chỉ thấy mã ẩn danh người bán.
// 3) Chat lời chào (chưa hợp đồng): tên người gửi bên kia là mã ẩn danh.
import assert from "node:assert";
const B = process.argv[2] || "http://127.0.0.1:18982", MAY = "kiem-lien-lac";
const vao = async (phone) => { const r = await fetch(B + "/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json", "x-agv-may": MAY }, body: JSON.stringify({ phone }) }); assert.equal(r.status, 200, "đăng nhập " + phone); return (await r.json()).token; };
const doc = async (tk, d) => { const r = await fetch(B + d, { headers: { authorization: "Bearer " + tk, "x-agv-may": MAY } }); const j = await r.json(); assert.equal(r.status, 200, d + " " + JSON.stringify(j).slice(0, 200)); return j.data ?? j; };
const gui = async (tk, d, b = {}) => { const r = await fetch(B + d, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tk, "x-agv-may": MAY }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...b }) }); const j = await r.json().catch(() => ({})); assert.ok(r.status < 300, d + " " + JSON.stringify(j).slice(0, 300)); return j.data ?? j; };
const AN_BAN = /^Người bán NB-[0-9A-F]{4}$/, AN_MUA = /^Người mua NM-[0-9A-F]{4}$/;

const mua = await vao("0938000610"), nb = await vao("0945000880");
const meMua = await doc(mua, "/v1/me"), meBan = await doc(nb, "/v1/me");

// 2) Mã vùng trồng của người bán chưa từng hợp đồng với người mua này
const vung = await doc(mua, "/v1/growing-areas/MVT-DT-0412");
const quen = new Set((await doc(mua, "/v1/orders")).map((d) => d.seller_org_id));
if (!quen.has(vung.nguoi_ban_id)) assert.match(vung.nguoi_ban, AN_BAN, "tra mã vùng trồng lộ tên người bán");
console.log("✔ tra mã vùng trồng:", vung.nguoi_ban);

// Lập một lời chào mới với người bán 0945000880
const lo = (await doc(nb, "/v1/lots?mine=true")).find((l) => l.status === "on_sale");
const gia = Number((await doc(nb, `/v1/lots/${lo.id}`)).ask_price_vnd);
const of = await gui(mua, "/v1/offers", { direction: "buyer_bid", lot_id: lo.id, qty_g: 100000, price_vnd: gia });
await gui(nb, "/v1/messages", { offer_id: of.id, body: "Dạ hàng còn, anh cần lúc nào?" });
const quenNb = (await doc(mua, "/v1/orders")).some((d) => d.seller_org_id === meBan.org.id);
const tin = (await doc(mua, `/v1/messages?offer_id=${of.id}`)).tin.find((m) => !m.la_cua_toi);
if (!quenNb) assert.match(tin.nguoi_gui, AN_BAN, "chat lời chào lộ tên người gửi " + tin.nguoi_gui);
console.log("✔ chat chưa hợp đồng, người gửi:", tin.nguoi_gui);

// 1) Chốt giá → điều khoản → hợp đồng → ký hai bên → chưa cọc: không có số
await gui(nb, `/v1/offers/${of.id}/accept`, { expected_revision: (await doc(nb, `/v1/offers/${of.id}`)).revision });
await gui(mua, `/v1/offers/${of.id}/terms/framework-read`, {}); await gui(nb, `/v1/offers/${of.id}/terms/framework-read`, {});
const dx = await gui(mua, `/v1/offers/${of.id}/terms`, (await doc(mua, `/v1/offers/${of.id}/terms`)).mac_dinh);
await gui(nb, `/v1/offers/${of.id}/terms/accept`, { phien_ban: dx.phien_ban ?? 1 });
const don = await gui(mua, "/v1/orders", { offer_id: of.id, delivery_mode: "at_farm", designated_receiver_user_id: meMua.user_id ?? meMua.user?.user_id });
assert.equal((await doc(mua, `/v1/orders/${don.id}`)).dieu_khoan?.seller_account, null, "chưa ký mà người mua đã thấy tài khoản người bán");
assert.ok((await doc(nb, `/v1/orders/${don.id}`)).dieu_khoan?.seller_account?.bank_code, "người bán phải thấy tài khoản của mình");
console.log("✔ chưa ký: người mua chưa thấy tài khoản nhận tiền của người bán");
const ky = async (tk, phia) => { const d = await doc(tk, `/v1/orders/${don.id}`); const hd = [...(d.tai_lieu || [])].reverse().find((x) => x.doc_type === "contract");
  const ch = await gui(tk, "/v1/otp/challenges", { purpose: "contract_sign", document_id: hd.id });
  // Môi trường thử: mã OTP cố định 123456
  await gui(tk, `/v1/orders/${don.id}/sign`, { challenge_id: ch.challenge_id, code: "123456", expected_revision: d.revision, ...(phia === "bán" ? { commitment_ack: true, low_downgrade_price_ack: true, abnormal_price_ack: true } : {}) }); };
for (const [tk, ten] of [[mua, "mua"], [nb, "bán"]]) { const d = await doc(tk, `/v1/orders/${don.id}`); if ((d.hanh_dong || []).includes("sign")) await ky(tk, ten); }
assert.equal((await doc(mua, `/v1/orders/${don.id}`)).lien_lac_ben_kia, null, "chưa cọc mà đã lộ số người bán");
assert.equal((await doc(nb, `/v1/orders/${don.id}`)).lien_lac_ben_kia, null, "chưa cọc mà đã lộ số người mua");
console.log("✔ đã ký, chưa cọc: hai bên chưa thấy số điện thoại của nhau");
assert.ok((await doc(mua, `/v1/orders/${don.id}`)).dieu_khoan?.seller_account?.bank_code, "đã ký mà người mua chưa thấy tài khoản người bán");
console.log("✔ đã ký: người mua thấy tài khoản nhận tiền ghi trong hợp đồng");

// Ngân hàng giả lập nhận đủ cọc → liên lạc mở
const h = await doc(mua, `/v1/orders/${don.id}/deposit-instruction`);
await gui(mua, "/v1/sim/bank/transfers", { payment_ref: h.payment_ref, amount_vnd: Number(h.total_vnd) - Number(h.received_vnd), payer: { bank_code: "VCB", account_no: "0071000123456", name: "NGUOI MUA THU" } });
await gui(mua, "/v1/sim/bank/deliver", {});
let llMua = null; for (let i = 0; i < 10 && !llMua; i++) { await new Promise((r) => setTimeout(r, 1500)); llMua = (await doc(mua, `/v1/orders/${don.id}`)).lien_lac_ben_kia; }
assert.ok(llMua && /^0\d{9}$/.test(llMua.so_dien_thoai), "đã cọc mà người mua chưa thấy số người bán: " + JSON.stringify(llMua));
const llBan = (await doc(nb, `/v1/orders/${don.id}`)).lien_lac_ben_kia;
assert.ok(llBan && /^0\d{9}$/.test(llBan.so_dien_thoai), "đã cọc mà người bán chưa thấy số người mua");
console.log("✔ ngân hàng xác nhận cọc: người mua thấy", llMua.ten, "· người bán thấy", llBan.ten);
