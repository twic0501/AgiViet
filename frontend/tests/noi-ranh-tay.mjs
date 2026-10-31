// Soát hội thoại rảnh tay: micro + loa giả, không bấm gì sau "Nói để đăng"
import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const OUT = process.argv[2], W = Number(process.argv[3] || 390);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2 });
const loi = []; p.on("pageerror", (e) => loi.push(e.message));
await p.addInitScript(() => {
  const KB = ["loại một", "chừng hai tạ chưa cân, có hàng ngay, muốn hai mươi bốn ngàn một ký", "đúng rồi", "đồng ý"];
  window.__da_noi = []; window.__da_nghe = [];
  class SR { start() { const c = KB.shift(); window.__da_nghe.push(c ?? "(im)"); setTimeout(() => { if (c) this.onresult?.({ results: [[{ transcript: c }]] }); this.onend?.(); }, 250); } stop() { this.onend?.(); } abort() {} }
  window.webkitSpeechRecognition = SR; window.SpeechRecognition = SR;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel() {}, getVoices: () => [], speak(u) { window.__da_noi.push(u.text); setTimeout(() => u.onend?.(), 120); } } });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
});
await p.goto("http://127.0.0.1:18990/thiet-ke/ban-dang-bai.html?thu=0918000421");
await p.locator("#the-hang b").waitFor();
await p.screenshot({ path: `${OUT}/rt-${W}-0-dau.png`, fullPage: true });
await p.locator('#cach [data-cach="noi"]').click();
await p.waitForTimeout(700);
await p.screenshot({ path: `${OUT}/rt-${W}-1-dang-nghe.png` });
await p.locator('[data-m="anh"]').waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
const kq = await p.evaluate(() => ({ noi: window.__da_noi, nghe: window.__da_nghe, man: [...document.querySelectorAll("[data-m]")].find((s) => !s.hidden)?.dataset.m, luong: document.querySelector("#luong").value, gia: document.querySelector("#gia-muon").value, san: document.querySelector("#gia-san").value }));
console.log(JSON.stringify(kq, null, 1));
console.log(kq.man === "anh" && kq.luong === "200" && kq.gia === "24.000" && kq.san === "21.600" ? "ĐẠT hội thoại rảnh tay tới bước Ảnh" : "SAI");
console.log(kq.noi.some((t) => /21\.600|21 600/.test(t)) ? "SAI loa đọc giá kín" : "ĐẠT loa không đọc giá kín");
await p.screenshot({ path: `${OUT}/rt-${W}-2-anh.png`, fullPage: true });
await p.goto("http://127.0.0.1:18990/thiet-ke/ban-hang-hoa.html?thu=0918000421");
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/rt-${W}-3-cho.png` });
await p.mouse.wheel(0, 500); await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/rt-${W}-4-cho-cuon.png` });
console.log("LỖI TRANG", JSON.stringify(loi));
await b.close();
