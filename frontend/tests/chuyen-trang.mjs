// Kiểm chuyển trang mượt (thiet-ke/chuyen-trang.css/js): mỗi trang có đúng 1 phần tử cho mỗi tên chuyển cảnh,
// không tràn ngang 390/360, không lỗi JS; bấm tab / quay lại ra đúng hướng chuyển cảnh.
// Chạy: node tests/chuyen-trang.mjs  (cần frontend 18990)
import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const GOC = (process.env.FRONTEND_URL || "http://127.0.0.1:18990") + "/thiet-ke/";
const TRANG = ["ban-hom-nay", "ban-hang-hoa", "ban-dang-bai", "ban-tin-nhan", "ban-tien", "ban-vuon", "ban-don", "ban-hop-dong", "ban-lo", "ban-toi", "ban-thong-bao", "ban-tin-tuc", "ban-thoi-tiet", "ban-nhu-cau", "ban-them", "dang-nhap", "ban-bat-dau"];
const TEN = [".dau", ".tab", ".sl-menu", ".sl-dinh", ".sl-tab"];
const b = await chromium.launch();
const ket = []; const loi = [];
const ghi = (ok, ten, ly = "") => ket.push([ok, ten, ly]);
for (const w of [390, 360]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  p.on("pageerror", (e) => loi.push(`${p.url()}: ${e.message}`));
  for (const t of [...TRANG.map((x) => x + ".html"), "mua.html?man=tong-quan", "mua.html?man=nguon-hang", "van-hanh.html"]) {
    await p.goto(GOC + t); await p.waitForTimeout(700);
    const r = await p.evaluate((TEN) => ({ vt: document.documentElement.hasAttribute("data-hu-vt"), dem: TEN.map((s) => [s, document.querySelectorAll(s).length]), rong: document.documentElement.scrollWidth }), TEN);
    const trung = r.dem.filter(([, n]) => n > 1);
    const ok = r.vt && !trung.length && r.rong <= w;
    if (!ok || w === 390) ghi(ok, `${w}px ${t}`, ok ? "" : `${r.vt ? "" : "không bật VT; "}${trung.map(([s, n]) => `${s}×${n}`).join(" ")} rộng ${r.rong}`);
  }
  await p.close();
}
// Hướng chuyển cảnh
const p = await b.newPage({ viewport: { width: 390, height: 800 } });
p.on("pageerror", (e) => loi.push(`${p.url()}: ${e.message}`));
const loai = () => p.evaluate(() => document.documentElement.dataset.huVtLoai || "");
async function bam(sel, ten, mong) {
  try {
    await Promise.all([p.waitForNavigation({ timeout: 8000 }), p.locator(sel).first().click()]);
    await p.waitForTimeout(500);
    const l = await loai(); ghi(l === mong, ten, l === mong ? "" : `được "${l}", mong "${mong}" · ở ${p.url()}`);
  } catch (e) { ghi(false, ten, e.message.split("\n")[0]); }
}
await p.goto(GOC + "ban-hom-nay.html"); await p.waitForTimeout(800);
await bam('.tab a[href*="ban-hang-hoa"]', "Trang chủ → Chợ: trượt theo tab sang phải", "tab-phai");
await bam('.tab a[href*="ban-hom-nay"]', "Chợ → Trang chủ: trượt theo tab sang trái", "tab-trai");
await bam('main a[href*="ban-"]:not(.tab a), .noi a[href*="ban-"]', "Trang chủ → màn con: tới", "toi");
try { await Promise.all([p.waitForNavigation({ timeout: 8000 }), p.goBack()]); await p.waitForTimeout(500); const l = await loai(); ghi(l === "lui", "Nút lùi trình duyệt: lùi", l === "lui" ? "" : `được "${l}"`); } catch (e) { ghi(false, "Nút lùi trình duyệt", e.message.split("\n")[0]); }
await p.goto(GOC + "mua.html?man=tong-quan"); await p.waitForTimeout(800);
const conTab = await p.locator('.sl-tab a[href], .sl-menu a[href]').count();
if (conTab) await bam('.sl-tab a[href*="man=nguon-hang"]', "App mua: Tổng quan → Nguồn hàng theo thanh tab", "tab-phai");
ghi(!loi.length, "Không lỗi JS", [...new Set(loi)].slice(0, 4).join(" | "));
await b.close();
for (const [ok, ten, ly] of ket) console.log(`${ok ? "✔" : "✖"} ${ten}${ly ? " — " + ly : ""}`);
console.log(`${ket.filter((x) => x[0]).length}/${ket.length} đạt`);
process.exit(ket.every((x) => x[0]) ? 0 : 1);
