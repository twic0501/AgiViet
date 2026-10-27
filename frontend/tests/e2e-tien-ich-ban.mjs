// Kiểm thử giao diện thật các màn chuyển từ bản mẫu: lưới 6 ô, Tôi, Cài đặt, Quyền riêng tư,
// Hỗ trợ có hỏi đáp, Giá hôm nay, Học kỹ thuật, Vườn mùa vụ, Nhật ký vườn (ghi phun thuốc thật).
// Chạy trên cặp dịch vụ cô lập: FRONTEND_URL=http://127.0.0.1:18990 API_ORIGIN=http://127.0.0.1:18980
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const fe = process.env.FRONTEND_URL, api = process.env.API_ORIGIN;
if (api !== "http://127.0.0.1:18980" || fe !== "http://127.0.0.1:18990") throw Error("Chỉ chạy trên cặp dịch vụ cô lập 18980/18990.");

const { token } = await (await fetch(api + "/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem("agv-session-ban")) sessionStorage.setItem("agv-session-ban", JSON.stringify({ token: t })); } catch {} }, token);
const p = await ctx.newPage();
const loi = [];
p.on("pageerror", (e) => loi.push(e.message));
const ketQua = [];
async function buoc(ten, fn) {
  try { await fn(); ketQua.push(["ĐẠT", ten]); console.log("ĐẠT", ten); }
  catch (e) { ketQua.push(["KHÔNG ĐẠT", ten]); console.log("KHÔNG ĐẠT", ten, "—", e.message.split("\n")[0]); }
}
async function mo(hash) { await p.goto(`${fe}/ban/#/${hash}`); await p.waitForSelector("#content h1", { timeout: 15000 }); await p.waitForTimeout(300); }
const h1 = () => p.locator("#content h1").first().innerText();
const khongTran = async () => assert.equal(await p.evaluate(() => document.querySelector("#app").scrollWidth > document.querySelector("#app").clientWidth), false, "tràn ngang");

await buoc("Trang chủ có đủ 6 ô theo bố cục đã duyệt", async () => {
  await mo("home");
  const o = await p.locator(".sl-nhanh a").allInnerTexts();
  assert.deepEqual(o.map((x) => x.trim()), ["Nhật ký vườn", "Giá hôm nay", "Tin vụ mùa", "Học kỹ thuật", "Vườn, mùa vụ", "Hỗ trợ"]);
  assert.equal(await p.locator(".sl-dau [data-action=listen]").innerText(), "Nghe");
  await khongTran();
});
for (const [href, tieuDe] of [["nhat-ky", "Nhật ký vườn"], ["gia", "Giá hôm nay"], ["hoc", "Học kỹ thuật"], ["vuon", "Vườn, mùa vụ"], ["support", "Hỗ trợ"]]) {
  await buoc(`Ô ${tieuDe} mở đúng màn, không phải màn "sắp có"`, async () => {
    await mo("home");
    await p.locator(`.sl-nhanh a[href="#/${href}"]`).click();
    await p.waitForFunction((t) => document.querySelector("#content h1")?.innerText === t, tieuDe, { timeout: 15000 });
    assert.equal(await p.locator(".sl-sap-co").count(), 0, "còn màn sắp có");
    assert.equal(await p.locator("text=Vì sao?").count(), 0, "còn ô Vì sao?");
    await khongTran();
  });
}
await buoc("Giá hôm nay hiện giá tham khảo theo mặt hàng đã xác minh", async () => {
  await mo("gia");
  const dong = await p.locator(".sl-dg").allInnerTexts();
  assert.ok(dong.length >= 1, "không có dòng giá");
  assert.ok(dong.some((x) => /đ\/kg|Chưa đủ đơn/.test(x)), dong.join(" | "));
});
await buoc("Học kỹ thuật có tài liệu theo từng mặt hàng, mở trang khuyến nông", async () => {
  await mo("hoc");
  const lk = await p.locator(".sl-dg[href*='khuyennongvn']").count();
  assert.ok(lk >= 3, "ít hơn 3 tài liệu");
});
await buoc("Hỗ trợ có gọi nhân viên, câu hỏi thường gặp và gửi yêu cầu", async () => {
  await mo("support");
  assert.ok(await p.locator("a[href^='tel:']").count() === 1);
  assert.ok(await p.locator(".sl-hoi").count() >= 5);
  assert.ok(await p.locator("form[data-form=supportTicket]").count() === 1);
  assert.equal(await p.locator(".page-heading").count(), 0, "lặp tiêu đề khung chung");
});
await buoc("Menu tài khoản vào được Tôi và Cài đặt", async () => {
  await mo("home");
  await p.locator(".sl-toi summary").click();
  await p.locator(".sl-toi-menu a[href='#/toi']").click();
  await p.waitForFunction(() => document.querySelector("#content h1")?.innerText === "Tài khoản của tôi");
  const muc = await p.locator("#content .sl-dg").allInnerTexts();
  for (const t of ["Tài khoản nhận tiền", "Cài đặt", "Quyền riêng tư", "Trung tâm hỗ trợ"]) assert.ok(muc.some((x) => x.includes(t)), "thiếu " + t);
});
await buoc("Cài đặt cỡ chữ Lớn có tác dụng và giữ sau khi tải lại", async () => {
  await mo("cai-dat");
  const truoc = await p.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  await p.locator("button[data-action=datCo][data-v=lon]").click();
  await p.waitForTimeout(500);
  assert.equal(await p.evaluate(() => document.documentElement.dataset.coChu), "lon");
  await p.reload(); await p.waitForSelector("#content h1");
  const sau = await p.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  assert.ok(sau > truoc, `cỡ chữ không đổi (${truoc} → ${sau})`);
  assert.equal(await p.locator("button[data-action=datCo][data-v=lon]").getAttribute("aria-pressed"), "true");
  await p.locator("button[data-action=datCo][data-v=vua]").click(); await p.waitForTimeout(300);
});
await buoc("Quyền riêng tư nói rõ bên mua thấy gì trước và sau cọc", async () => {
  await mo("rieng-tu");
  assert.ok((await p.locator(".sl-b3").count()) >= 8);
});
await buoc("Nhật ký: ghi phun thuốc thật, hiện ngày hết cách ly", async () => {
  await mo("nhat-ky");
  await p.locator("button[data-action=moNk]").first().click();
  await p.locator("button[data-action=chonNk][data-v=spray]").click();
  await p.waitForSelector("input[name=thuoc]");
  await p.locator("input[name=thuoc]").fill("Abamectin 3.6EC (kiểm thử)");
  await p.locator("input[name=cach_ly]").fill("7");
  await p.locator("form[data-form=ghiNk] button:not([type=button])").click();
  await p.waitForFunction(() => document.body.innerText.includes("Abamectin 3.6EC (kiểm thử)"), null, { timeout: 15000 });
  const dong = (await p.locator(".sl-dg", { hasText: "Abamectin 3.6EC (kiểm thử)" }).first().innerText());
  assert.match(dong, /hết cách ly/);
  assert.match(await p.locator(".sl-cau-dau").innerText(), /cách ly/);
});
await buoc("Vườn, mùa vụ hiện vườn và mặt hàng đã xác minh", async () => {
  await mo("vuon");
  assert.ok((await p.locator(".sl-dg").count()) >= 1);
});
await buoc("Không lỗi JavaScript", async () => assert.deepEqual(loi, []));
await b.close();
const dat = ketQua.filter((x) => x[0] === "ĐẠT").length;
console.log(`${dat === ketQua.length ? "ĐẠT" : "KHÔNG ĐẠT"} ${dat}/${ketQua.length}`);
process.exit(dat === ketQua.length ? 0 : 1);
