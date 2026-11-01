// Kiểm màn "Chạy tình huống vận hành" (thiet-ke/van-hanh.html?man=tinh-huong-vh): mọi tình huống v23 KHÔNG có đủ
// hai bên bán + mua phải đi hết từng bước đúng thứ tự, đúng vai; không lỗi JS; 390 px không tràn ngang.
// Chạy: node tests/van-hanh-tinh-huong.mjs  (cần frontend 18990)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const GOC = (process.env.FRONTEND_URL || "http://127.0.0.1:18990") + "/thiet-ke/van-hanh.html?man=tinh-huong-vh";
const qt = JSON.parse(readFileSync(new URL("../mo-phong-quy-trinh/quy-trinh.json", import.meta.url), "utf8"));
const DS = qt.tinh_huong.filter((t) => { const v = new Set(t.buoc.map((b) => b.vai)); return !(v.has("ban") && v.has("mua")); });
const VAI = { ban: "Người bán", mua: "Bên mua", nv: "Nhân viên AgiViet", qt: "Quản trị AgiViet", nh: "Ngân hàng", dt: "Đối tác dịch vụ", app: "Hệ thống" };
const b = await chromium.launch();
const ket = [], loi = [];
for (const w of [1280, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  p.on("pageerror", (e) => loi.push(e.message));
  for (const t of (w === 390 ? DS.slice(0, 3) : DS)) {
    try {
      await p.goto(`${GOC}&th=${t.id}`); await p.waitForSelector("#th-viec", { timeout: 8000 });
      await p.click("#th-lai"); await p.waitForTimeout(150);
      for (let i = 0; i < t.buoc.length; i++) {
        const h = await p.locator("#th-viec h2").innerText();
        assert.ok(h.includes(`Bước ${i + 1}/${t.buoc.length}`), `bước ${i + 1}: tiêu đề "${h}"`);
        assert.ok(h.includes(VAI[t.buoc[i].vai] || t.buoc[i].vai), `bước ${i + 1}: sai vai — "${h}"`);
        await p.click("#th-tiep"); await p.waitForTimeout(60);
      }
      assert.match(await p.locator("#th-viec h2").innerText(), new RegExp(`Đã đi hết ${t.buoc.length} bước`));
      const rong = await p.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(rong <= w, `tràn ngang ${rong}px`);
      ket.push([true, `${w}px ${t.id} (${t.buoc.length} bước)`]);
    } catch (e) { ket.push([false, `${w}px ${t.id}`, e.message.split("\n")[0]]); }
  }
  await p.close();
}
await b.close();
ket.push([!loi.length, "Không lỗi JS", [...new Set(loi)].slice(0, 3).join(" | ")]);
for (const [ok, ten, ly] of ket) console.log(`${ok ? "✔" : "✖"} ${ten}${ly ? " — " + ly : ""}`);
console.log(`${ket.filter((x) => x[0]).length}/${ket.length} đạt · ${DS.length} tình huống chỉ có vận hành / ngân hàng / một bên`);
process.exit(ket.every((x) => x[0]) ? 0 : 1);
