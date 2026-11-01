// Kiểm trang thiet-ke/testquytrinhapp.html: mỗi tình huống, mỗi bước phải tìm thấy nút cần bấm trên đúng điện thoại,
// bấm giúp chạy hết tới cuối, không lỗi JS. Chạy: node tests/testquytrinhapp.mjs [ANH_DIR=thư mục ảnh]
import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const GOC = (process.env.FRONTEND_URL || "http://127.0.0.1:18990") + "/thiet-ke/testquytrinhapp.html";
const ANH = process.env.ANH_DIR || "";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const loi = []; p.on("pageerror", (e) => loi.push("trang: " + e.message));
p.on("frameattached", () => {});
p.on("console", (m) => { if (m.type() === "error" && !/favicon|404/.test(m.text())) loi.push("console: " + m.text()); });
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
await p.goto(GOC); await cho(3000);
const ds = await p.$$eval("#chon option", (o) => o.map((x) => x.value));
const ket = [];
for (const id of ds) {
  await p.selectOption("#chon", id); await cho(3500);
  const tong = await p.evaluate(() => Number(document.querySelector(".tq-bay .tq-ghi").textContent.match(/\/(\d+)/)[1]));
  let hong = "";
  for (let k = 0; k < tong; k++) {
    const t = await p.evaluate(() => ({ ban: document.getElementById("loi-ban").textContent, mua: document.getElementById("loi-mua").textContent, coNut: !document.getElementById("bam").disabled }));
    if (/Không thấy nút/.test(t.ban + t.mua)) { hong = `bước ${k + 1}: ${t.ban} | ${t.mua}`; break; }
    if (ANH && k === 0) await p.screenshot({ path: `${ANH}/${id}-1.png` });
    if (k === tong - 1 && !t.coNut) break;
    const truoc = await p.evaluate(() => localStorage.getItem("agv-hd-0018"));
    if (t.coNut) await p.click("#bam"); else await p.click("#toi");
    await cho(300);
    await p.waitForFunction(() => !window.__tqBan, null, { timeout: 30000 });
    await cho(300);
    const sau = await p.evaluate(() => localStorage.getItem("agv-hd-0018"));
    if (t.coNut && sau === truoc) { hong = `bước ${k + 1}: bấm xong mà dữ liệu đơn không đổi`; break; }
    if (k === tong - 1) break;
  }
  if (ANH) await p.screenshot({ path: `${ANH}/${id}-cuoi.png` });
  const hd = await p.evaluate(() => JSON.parse(localStorage.getItem("agv-hd-0018") || "{}"));
  ket.push([hong ? "HỎNG" : "ĐẠT", id, hong || `cuối: bước đơn ${hd.buoc}${hd.huy ? " (đã hủy)" : ""}${hd.phu ? " · " + hd.phu : ""}`]);
}
await b.close();
for (const [k, id, g] of ket) console.log(`${k === "ĐẠT" ? "✔" : "✖"} ${id} — ${g}`);
if (loi.length) console.log("Lỗi JS:", [...new Set(loi)].slice(0, 8));
console.log(`${ket.filter((x) => x[0] === "ĐẠT").length}/${ket.length} tình huống chạy hết${loi.length ? ` · ${loi.length} lỗi JS` : " · không lỗi JS"}`);
process.exit(ket.every((x) => x[0] === "ĐẠT") && !loi.length ? 0 : 1);
