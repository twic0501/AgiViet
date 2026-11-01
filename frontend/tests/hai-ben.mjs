// Kiểm giao dịch HAI BÊN trên bản thiết kế (dữ liệu mô phỏng dùng chung, thiet-ke/giao-dich-chung.js):
// chị Năm (app bán) và chị Thu Hà (app mua) cùng một HĐ-0018, cùng một cuộc trò chuyện. Mỗi bên bấm đúng việc của mình.
// Chạy: node tests/hai-ben.mjs  (cần frontend 18990; không cần backend)
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const GOC = (process.env.FRONTEND_URL || "http://127.0.0.1:18990") + "/thiet-ke/";
const ANH = process.env.ANH_DIR || "";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });   // cùng một trình duyệt → chung localStorage
const ban = await ctx.newPage(), mua = await ctx.newPage();
const loi = []; for (const p of [ban, mua]) p.on("pageerror", (e) => loi.push(e.message));
const ketQua = []; let dangChay = "";
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const hd = () => mua.evaluate(() => JSON.parse(localStorage.getItem("agv-hd-0018") || "{}"));
async function buoc(ten, f) { dangChay = ten; try { await f(); ketQua.push(["ĐẠT", ten]); } catch (e) { ketQua.push(["HỎNG", ten, e.message.split("\n")[0]]); if (ANH) { await ban.screenshot({ path: `${ANH}/hong-ban.png` }).catch(() => {}); await mua.screenshot({ path: `${ANH}/hong-mua.png` }).catch(() => {}); } } }
const moBan = async (hash) => { await ban.goto(GOC + "mau/ban.html#" + hash); await ban.reload(); await cho(500); };
const moMua = async (man) => { await mua.goto(GOC + "mua.html?man=" + man); await cho(500); };
const muaLam = async (re) => { const n = mua.locator(".sl-viec [data-lam]").filter({ hasText: re }).first(); await n.click(); await cho(1500); };
const ketQuaTien = () => mua.evaluate(() => [...document.querySelectorAll("#tien-o b[data-v]")].map((x) => Number(x.dataset.v)));
async function lamLai(kb = "thuan") {
  await mua.goto(GOC + "hai-ben.html"); await mua.evaluate((kb) => { for (const k of ["agv-hd-0018", "agv-tro-chuyen-v1", "agv-tro-chuyen-v1-vp", "agv-mua", "agv-ban-mau"]) localStorage.removeItem(k); localStorage.setItem("agv-hd-0018", JSON.stringify({ buoc: 0, daTra: 0, nbXn: 0, kb, phu: "", ban: 1, huy: false, ngayGiao: "28/10" })); }, kb);
}

// ── 1. Luồng thuận, mỗi bên làm phần mình ──
await lamLai("thuan");
await buoc("Chị Năm đồng ý giá trong trò chuyện → HĐ-0018 sang bước bên mua soạn thỏa thuận", async () => {
  await ban.goto(GOC + "ban-tin-nhan.html?thu=0918000421#tro=T1"); await cho(1500);
  await ban.click('[data-gia="dong-y"]'); await cho(300); await ban.click("#chot"); await cho(2500);
  assert.equal((await hd()).buoc, 1);
  await moMua("tin-nhan");
  assert.match(await mua.locator("#tn-chat").innerText(), /Hai bên đã đồng ý/);
});
await buoc("Nhắn qua lại: bên mua nhắn → chị Năm thấy; số điện thoại bên mua gửi bị che", async () => {
  await mua.fill("#tn-go", "Em gửi xe 66C-123.45 tới lúc 5 giờ 30 nha chị"); await mua.click("#tn-gui"); await cho(400);
  await mua.fill("#tn-go", "Chị gọi em 0277 386 210 nha"); await mua.click("#tn-gui"); await cho(400);
  await ban.goto(GOC + "ban-tin-nhan.html?thu=0918000421#tro=T1"); await cho(1500);
  const t = await ban.locator("#chat").innerText();
  assert.match(t, /66C-123\.45 tới lúc 5 giờ 30/);
  assert.ok(!/0277 386 210/.test(t), "số bên mua gửi phải bị che");
  await ban.fill("#go", "Dạ chị chờ ở đầu ấp 3 nha em"); await ban.click("#gui"); await cho(500);
  await moMua("tin-nhan"); assert.match(await mua.locator("#tn-chat").innerText(), /chờ ở đầu ấp 3/);
});
await buoc("Bên mua ký thỏa thuận → chị Năm ký bằng mã", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Ký và gửi/); assert.equal((await hd()).buoc, 2);
  await moBan("man=ky-otp"); await ban.click("#ky"); await cho(800); assert.equal((await hd()).buoc, 3);
});
await buoc("Bên mua chuyển cọc → ngân hàng xác nhận → liên lạc mở trong trò chuyện", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Chuyển cọc/); assert.equal((await hd()).buoc, 4);
  await muaLam(/Mô phỏng: ngân hàng xác nhận/); assert.equal((await hd()).buoc, 5);
  assert.deepEqual((await ketQuaTien()).slice(0, 2), [13938000, 13800000], "bạn đã chi 13.938.000 (cọc + phí), ngân hàng giữ 13.800.000");
  await ban.goto(GOC + "ban-tin-nhan.html?thu=0918000421#tro=T1"); await cho(1200);
  assert.match(await ban.locator("#dau").innerText(), /liên lạc đã mở/);
});
await buoc("Bên mua trả thẳng 32,2 tr → chị Năm kiểm tiền xác nhận → bên mua thấy chị Năm đã nhận", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Ghi đã trả/); assert.equal((await hd()).buoc, 6);
  await moBan("man=kiem-tien"); await ban.click("#xn"); await cho(1800);
  const h = await hd(); assert.equal(h.buoc, 7); assert.equal(h.nbXn, 32200000);
  await moMua("chi-tiet-don"); assert.equal((await ketQuaTien())[2], 32200000);
});
await buoc("Chị Năm bàn giao (đúng mã) → bên mua đạt khi bốc, ký nhận, gửi kết quả cân", async () => {
  await moBan("man=ban-giao"); await ban.click("#bg"); await cho(1800); assert.equal((await hd()).buoc, 8);
  await moMua("chi-tiet-don"); await muaLam(/Đạt khi bốc/); await muaLam(/Ký nhận/); await muaLam(/Gửi kết quả/);
  assert.equal((await hd()).buoc, 11);
});
await buoc("Chị Năm đồng ý kết quả → ngân hàng chi cọc 12,15 tr cho chị Năm, hoàn 1,65 tr bên mua", async () => {
  await moBan("man=ket-qua"); await ban.click("#dy"); await cho(1800); assert.equal((await hd()).buoc, 12);
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng chi cọc/); assert.equal((await hd()).buoc, 13);
  const t = await ketQuaTien(); assert.equal(t[1], 0, "ngân hàng hết giữ"); assert.equal(t[2], 44350000, "chị Năm nhận tổng 44.350.000");
});
await buoc("Bên mua xác nhận tiền hoàn về, nhập kho → hoàn tất; chị Năm thấy đơn xong", async () => {
  await muaLam(/Đã nhận lại 1\.650\.000/); await muaLam(/Nhập kho/);
  assert.equal((await hd()).buoc, 15);
  assert.equal((await ketQuaTien())[0], 44488000, "bên mua chi ròng 44.350.000 + phí 138.000");
  await moBan("man=chi-tiet-don"); assert.match(await ban.locator(".m-viec h2").first().innerText(), /hoàn tất/i);
});

// ── 2. Lệch tiền: chị Năm báo chỉ thấy 20 tr → bên mua gửi chứng từ → người vận hành chốt ──
await lamLai("lech"); await mua.evaluate(() => localStorage.setItem("agv-hd-0018", JSON.stringify({ ...JSON.parse(localStorage.getItem("agv-hd-0018")), buoc: 6, daTra: 32200000 })));
await buoc("Kịch bản lệch tiền hai bên", async () => {
  await moBan("man=chi-tiet-don"); await ban.locator('[data-kb="lech"]').click(); await cho(1600);
  assert.equal((await hd()).phu, "lech");
  await moMua("chi-tiet-don"); assert.match(await mua.locator(".sl-viec h2").innerText(), /Lệch tiền, đang đối soát/);
  assert.match(await mua.locator(".sl-viec p").innerText(), /không phải vi phạm/);
  await muaLam(/Gửi chứng từ/); await muaLam(/người vận hành chốt/);
  const h = await hd(); assert.equal(h.buoc, 7); assert.equal(h.nbXn, 32200000);
});

// ── 3. Trả lại nhiều: 29,1 tr → hoàn hết cọc → chị Năm hoàn 3,1 tr → bên mua xác nhận ──
await lamLai("tra-lai"); await mua.evaluate(() => localStorage.setItem("agv-hd-0018", JSON.stringify({ ...JSON.parse(localStorage.getItem("agv-hd-0018")), buoc: 12, daTra: 32200000, nbXn: 32200000 })));
await buoc("Kịch bản trả lại nhiều: số tiền và lượt hai bên", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng/);
  await muaLam(/Đã nhận lại 13\.800\.000/); assert.equal((await hd()).phu, "cho-nb-hoan");
  await moBan("man=chi-tiet-don"); assert.match(await ban.locator(".m-viec h2").first().innerText(), /hoàn 3\.100\.000/);
  await ban.locator('[data-kb="nb-hoan"]').click(); await cho(1600);
  await moMua("chi-tiet-don"); await muaLam(/Đã nhận lại 3\.100\.000/);
  assert.equal((await hd()).buoc, 14);
  assert.deepEqual(await ketQuaTien(), [29238000, 0, 29100000], "chi ròng 29.100.000 + phí; chị Năm giữ 29.100.000");
});

// ── 4. Xin hủy sau cọc: chị Năm đồng ý → cọc về chị Năm, phí không hoàn ──
await lamLai("huy"); await mua.evaluate(() => localStorage.setItem("agv-hd-0018", JSON.stringify({ ...JSON.parse(localStorage.getItem("agv-hd-0018")), buoc: 5 })));
await buoc("Kịch bản xin hủy sau cọc", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Xin hủy/); assert.equal((await hd()).phu, "xin-huy");
  await moBan("man=chi-tiet-don"); await ban.locator('[data-kb="huy-ok"]').click(); await cho(1600);
  await moMua("chi-tiet-don"); assert.match(await mua.locator(".sl-viec h2").innerText(), /đã hủy/);
  assert.deepEqual(await ketQuaTien(), [13938000, 0, 13800000]);
});

await buoc("Không có lỗi JS ở cả hai app", async () => { assert.deepEqual(loi, []); });
await b.close();
for (const [kq, ten, ly] of ketQua) console.log(`${kq === "ĐẠT" ? "✔" : "✖"} ${ten}${ly ? " — " + ly : ""}`);
console.log(`${ketQua.filter((x) => x[0] === "ĐẠT").length}/${ketQua.length} đạt`);
process.exit(ketQua.every((x) => x[0] === "ĐẠT") ? 0 : 1);
