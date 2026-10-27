// Kiểm trang mô phỏng quy trình: đi hết mọi tình huống từng bước ở 390 px và 1280 px,
// không lỗi JS, không tràn ngang trang, sổ tiền cân đối; thử chế độ Sửa và tải JSON.
// Chạy: node docs/mo-phong-quy-trinh/kiem-thu.mjs [URL] [thư mục ảnh]
import { createRequire } from "node:module";
import os from "node:os";
import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = createRequire(os.homedir() + "/rnd idea/package.json")("playwright");
const URL_ = process.argv[2] || "http://127.0.0.1:18888/mo-phong-quy-trinh/";
const ANH = process.argv[3] || "/tmp/agv-mo-phong";
fs.mkdirSync(ANH, { recursive: true });
const b = await chromium.launch();
const kq = [];
const theoTen = {};
const buoc = async (ten, fn) => { try { await fn(); kq.push(1); theoTen[ten] = "đạt"; console.log("ĐẠT", ten); } catch (e) { kq.push(0); theoTen[ten] = "lỗi: " + e.message.split("\n")[0]; console.log("KHÔNG ĐẠT", ten, "—", e.message.split("\n")[0]); } };
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, httpCredentials: { username: "pilot", password: process.env.PILOT_PASS || "" } });
  const p = await ctx.newPage(); const loi = [];
  p.on("pageerror", (e) => loi.push(e.message));
  await p.goto(URL_); await p.waitForSelector(".th-dau h2");
  const ids = await p.evaluate(() => [...document.querySelectorAll("[data-th]")].map((x) => x.dataset.th));
  await buoc(`${w}px: có ${ids.length} tình huống`, async () => assert.ok(ids.length >= 20));
  for (const id of ids) {
    await buoc(`${w}px: chạy hết "${id}"`, async () => {
      await p.evaluate((i) => { location.hash = `k=tinh-huong&th=${i}&b=0`; }, id);
      await p.reload(); await p.waitForSelector(".th-dau h2");
      const n = await p.evaluate(() => document.querySelectorAll(".dau-cot").length);
      for (let i = 0; i < n; i++) {
        const so = await p.evaluate(() => document.querySelector(".so-buoc").innerText);
        assert.equal(so, `${i + 1} / ${n}`);
        assert.equal(await p.locator(".the.dang").count(), 1, "không có đúng 1 thẻ đang chạy ở bước " + (i + 1));
        const tran = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        assert.equal(tran, false, "tràn ngang ở bước " + (i + 1));
        if (i < n - 1) await p.click('[data-di="1"]');
      }
      if (w === 390) await p.screenshot({ path: `${ANH}/${id}-cuoi.png`, fullPage: true });
    });
  }
  for (const k of ["vai", "dich-vu", "van-hanh", "he-thong", "can-chot", "doi-chieu"]) {
    await buoc(`${w}px: khung "${k}" mở được, không tràn`, async () => {
      await p.click(`nav.tab [data-khung="${k}"]`); await p.waitForTimeout(200);
      assert.ok((await p.locator("#noi-dung").innerText()).length > 200);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      if (w === 390) await p.screenshot({ path: `${ANH}/khung-${k}.png`, fullPage: true });
    });
  }
  await buoc(`${w}px: ghi chú tại chỗ khi đang xem, giữ sau tải lại, tải về được`, async () => {
    await p.click('nav.tab [data-khung="tinh-huong"]'); await p.waitForSelector(".th-dau h2");
    await p.evaluate(() => { location.hash = "k=tinh-huong&th=chinh&b=9"; }); await p.reload(); await p.waitForSelector("[data-ghi-b]");
    await p.fill("[data-ghi-b]", "Kiểm thử: bên mua hay trả bằng tiền mặt");
    await p.waitForTimeout(700);
    assert.equal(await p.locator('.the[data-b="9"] .dau-ghi').count(), 1, "thẻ chưa có dấu ghi chú");
    await p.reload(); await p.waitForSelector("[data-ghi-b]");
    assert.equal(await p.inputValue("[data-ghi-b]"), "Kiểm thử: bên mua hay trả bằng tiền mặt");
    await p.click('nav.tab [data-khung="ghi-chu"]');
    assert.match(await p.locator(".ds-ghi").innerText(), /tiền mặt/);
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#tai-ghi")]);
    assert.match(fs.readFileSync(await dl.path(), "utf8"), /Bước 10 .*\n→ Kiểm thử/);
    await p.click(".ds-ghi .dong");
    assert.match(await p.locator(".so-buoc").innerText(), /^10 \//);
    await p.fill("[data-ghi-b]", ""); await p.waitForTimeout(700);
  });
  if (w === 1280) {
    await buoc("Sửa: đổi chữ một thẻ, tải JSON thấy thay đổi", async () => {
      await p.click('nav.tab [data-khung="tinh-huong"]'); await p.waitForSelector(".th-dau h2");
      await p.click("#nut-sua");
      const o = p.locator('.the.dang [data-sua="viec"]');
      await o.click(); await p.keyboard.press("End"); await p.keyboard.type(" (đã sửa)");
      await p.click(".th-dau h2");
      const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#tai-json")]);
      const txt = fs.readFileSync(await dl.path(), "utf8");
      assert.match(txt, /\(đã sửa\)/);
      await p.reload(); await p.waitForSelector(".th-dau h2");
      assert.match(await p.locator(".the.dang").innerText(), /\(đã sửa\)/, "không giữ sau tải lại");
      p.once("dialog", (d) => d.accept()); await p.click("#nut-sua"); await p.click("#ve-goc");
    });
  }
  await buoc(`${w}px: không lỗi JavaScript`, async () => assert.deepEqual(loi, []));
  await ctx.close();
}
await b.close();
// Ghi kết quả từng bước để kiem_tien.py gộp vào bảng kiểm thử trên trang.
fs.writeFileSync(new URL("./ket-qua-giao-dien.json", import.meta.url), JSON.stringify(theoTen, null, 1));
const dat = kq.filter(Boolean).length;
console.log(`${dat === kq.length ? "ĐẠT" : "KHÔNG ĐẠT"} ${dat}/${kq.length}`);
process.exit(dat === kq.length ? 0 : 1);
