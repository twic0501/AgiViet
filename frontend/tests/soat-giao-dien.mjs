// Soát giao diện toàn app bán (theo Impeccable audit + craft floor + system.md): mọi màn + mọi tấm thao tác, 360 và 390.
// Đo: nút gãy dòng, đáy tấm sát mép, vùng chạm < 44, chữ < 12px, tương phản < 4.5, emoji làm biểu tượng, mã nội bộ, tràn ngang.
// Không bấm gửi lệnh (trừ bước cuối "đã gửi chào hàng"). Chạy trên stack thử có dựng demo 0002/0003/0004/0009.
// Dùng: node tests/soat-giao-dien.mjs <thư mục ảnh> [360,390]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const OUT = process.argv[2] || "/tmp/soat-giao-dien"; mkdirSync(OUT, { recursive: true });
const CO = (process.argv[3] || "360,390").split(",").map(Number);
const G = "http://127.0.0.1:18980", F = "http://127.0.0.1:18990/thiet-ke";
const dn = async (sdt) => (await (await fetch(G + "/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt }) })).json()).token;
const lay = async (sdt, d) => (await fetch(G + d, { headers: { authorization: "Bearer " + (await dn(sdt)) } })).json();
const donDau = async (sdt, dk = () => true) => { for (const o of await lay(sdt, "/v1/orders")) if (!/^DEMO56/.test(o.code) && (await dk(o))) return o; return null; };

const doLoi = (p) => p.evaluate(() => {
  const loi = [], thay = (e) => { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const nen = (e) => { for (let x = e; x; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.backgroundImage !== "none" && !/gradient/.test(cs.backgroundImage)) return null; const m = cs.backgroundColor.match(/[\d.]+/g); if (m && (m[3] === undefined || +m[3] > 0.9)) return cs.backgroundColor; } return "rgb(246,242,231)"; };
  const moTam = document.querySelector('[role="dialog"]');
  const goc = moTam || document;
  if (document.documentElement.scrollWidth > innerWidth + 1) loi.push("tràn ngang trang");
  for (const e of goc.querySelectorAll("button, a.nut, label.nut, [role=button]")) {
    if (!thay(e) || e.closest(".tab")) continue;
    const r = e.getBoundingClientRect(), ten = (e.innerText || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 28);
    if (Math.round(r.height) < 44 && Math.round(r.width) < 44 && !e.closest(".nut-chu,.hd-ghi")) loi.push(`vùng chạm ${Math.round(r.width)}×${Math.round(r.height)}: ${ten}`);
    // Nút chữ gãy dòng: đếm số dòng chữ thật
    const rg = document.createRange(); rg.selectNodeContents(e); const dong = new Set([...rg.getClientRects()].filter((x) => x.width > 2).map((x) => Math.round(x.top)));
    if (dong.size > 1 && /nut|chinh-nut|phu-nut/.test(e.className) && ten.length) loi.push(`nút gãy ${dong.size} dòng: "${ten}" (${Math.round(r.width)}px)`);
  }
  if (moTam) { // đáy tấm: nút cuối phải cách mép dưới ≥ 12px
    // Hàng nút đáy = phần tử con cuối của tấm có nút; phải nằm trong màn và cách mép dưới ≥ 12px (gồm vùng an toàn)
    const day = [...moTam.querySelectorAll(":scope > *, :scope > * > *")].filter((x) => thay(x) && x.querySelector("button, a.nut") && getComputedStyle(x).overflowY !== "auto").at(-1);
    const nut = day ? [...day.querySelectorAll("button, a.nut")].filter(thay) : [];
    const cuoi = nut.length ? Math.max(...nut.map((n) => n.getBoundingClientRect().bottom)) : 0;
    if (!nut.length) loi.push("tấm không có hàng nút đáy");
    else if (innerHeight - cuoi < 12) loi.push(`đáy tấm sát mép: nút cuối cách đáy ${Math.round(innerHeight - cuoi)}px`);
    const tam = moTam.getBoundingClientRect(); if (tam.top < 8) loi.push("tấm cao kín màn, không thấy nền phía sau");
  }
  for (const e of goc.querySelectorAll("body *, [role=dialog] *")) {
    if (e.children.length || !e.textContent.trim() || !thay(e)) continue;
    const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize), txt = e.textContent.trim().slice(0, 24);
    if (fs < 12) loi.push(`chữ ${fs}px: ${txt}`);
    const b = nen(e), l1 = lum(cs.color), l2 = b && lum(b);
    if (l1 != null && l2 != null) { const tl = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); const lon = fs >= 18.66 || (fs >= 14 && +cs.fontWeight >= 700); if (tl < (lon ? 3 : 4.5) && !e.closest("[disabled],.khung-tai")) loi.push(`tương phản ${tl.toFixed(1)}: ${txt}`); }
  }
  const chu = (moTam || document.body).innerText;
  if (/\p{Extended_Pictographic}/u.test(chu)) loi.push("dùng emoji làm biểu tượng: " + chu.match(/\p{Extended_Pictographic}/u)[0]);
  const ma = chu.match(/\b(offer|order|lot|delivery|payment|deposit|dispute)\.[a-z_]+\b|\bundefined\b|\bNaN\b|\[object|\b(processing|pending|held|awaiting_[a-z_]+|payer_reported|on_sale|in_transit)\b/);
  if (ma) loi.push("lộ mã nội bộ: " + ma[0]);
  return [...new Set(loi)];
});

const b = await chromium.launch();
let tong = 0;
for (const W of CO) {
  const p = await b.newPage({ viewport: { width: W, height: 780 }, deviceScaleFactor: 2 });
  const loiTrang = []; p.on("pageerror", (e) => loiTrang.push(e.message));
  const soat = async (ten) => { await p.waitForTimeout(350); const l = await doLoi(p); tong += l.length; console.log(`${l.length ? "✖" : "✓"} ${W} ${ten}${l.length ? "\n    " + l.join("\n    ") : ""}`); await p.screenshot({ path: `${OUT}/${W}-${ten}.png` }); };
  const vao = async (url) => { await p.goto(`${F}/${url}`); await p.waitForTimeout(1400); };
  const bam = async (sel) => { const x = p.locator(sel).first(); if (await x.count() && await x.isVisible()) { await x.click(); await p.waitForTimeout(500); return true; } return false; };
  const dong = async () => { await p.keyboard.press("Escape"); await p.waitForTimeout(250); };
  const N = "thu=0918000421";
  for (const m of ["ban-hom-nay", "ban-tien", "ban-thong-bao", "ban-thoi-tiet", "ban-tin-tuc", "ban-hop-dong", "ban-vuon", "ban-toi"]) { await vao(`${m}.html?${N}`); await soat(m); }
  // Chợ
  await vao(`ban-hang-hoa.html?${N}`); await soat("cho-hang");
  if (await bam('button:has-text("Quản lý lô")')) { await soat("cho-tam-quan-ly-lo"); await dong(); }
  await vao(`ban-hang-hoa.html?${N}#can`); await p.reload(); await p.waitForTimeout(1200); await soat("cho-can");
  if (await bam(".the-nc .nc-dong button:not([disabled])")) { await soat("cho-tam-chao"); await dong(); }
  await vao(`ban-hang-hoa.html?${N}#mua-vu`); await p.reload(); await p.waitForTimeout(1200); await soat("cho-mua-vu");
  // Chi tiết lô / nhu cầu
  const lo = (await lay("0918000421", "/v1/lots?mine=true"))[0]; await vao(`ban-lo.html?id=${lo.id}&${N}`); await soat("lo");
  const nc = (await lay("0918000421", "/v1/demands"))[0]; if (nc) { await vao(`ban-nhu-cau.html?id=${nc.id}&${N}`); await soat("nhu-cau"); }
  // Tin nhắn: lời chào tới lượt bác → Đồng ý (bước xác nhận) / Trả giá
  await vao(`ban-tin-nhan.html?${N}`); await soat("tin-nhan");
  const lc = (await lay("0918000421", "/v1/offers")).find((o) => o.status === "sent" && o.vong_cuoi?.from_side === "buyer");
  if (lc) {
    await vao(`ban-tin-nhan.html?${N}#chao=${lc.id}`); await p.reload(); await p.waitForTimeout(1200); await soat("tn-tam-chao");
    if (await bam('[data-r="dong-y"]')) await soat("tn-xac-nhan-dong-y");
    await vao(`ban-tin-nhan.html?${N}#chao=${lc.id}`); await p.reload(); await p.waitForTimeout(1200);
    if (await bam('[data-r="tra-gia"]')) await soat("tn-tra-gia");
  }
  // Đăng bài: điền thông tin đi hết các bước (không đăng)
  await vao(`ban-dang-bai.html?${N}`); await soat("dang-dau");
  await bam('#ds-loai button'); await bam('#cach [data-cach="go"]'); await soat("dang-luong");
  await p.locator("#luong").fill("500"); await bam('#thuoc [data-v="khong"]'); await bam("#tiep"); await soat("dang-gia");
  await p.locator("#gia-muon").fill("24000"); await p.locator("#gia-muon").dispatchEvent("input"); await bam("#tiep"); await soat("dang-anh");
  await vao(`ban-dang-bai.html?${N}`); await bam('#ds-loai button'); await bam('#cach [data-cach="nk"]'); await soat("dang-nhat-ky");
  await vao(`ban-dang-bai.html?${N}`); await bam('#cach [data-cach="noi"]'); await soat("dang-noi");
  // Hợp đồng: 4 trạng thái + mọi tấm
  const cac = [["0939000120", "hd-cho-ky", ["#viec-chinh", "#tu-choi"]], ["0988000770", "hd-kiem-tien", ["#viec-chinh", '[data-r="thieu"]']], ["0939000160", "hd-ket-qua-can", ["#viec-chinh", '[data-r="sai"]']]];
  for (const [sdt, ten, nut] of cac) {
    const o = await donDau(sdt); if (!o) { console.log(`- bỏ ${ten}: không có đơn`); continue; }
    await vao(`ban-don.html?id=${o.id}&thu=${sdt}`); await soat(ten);
    if (await bam(nut[0])) { await soat(ten + "-tam"); if (nut[1].startsWith("[data-r")) { if (await bam(nut[1])) await soat(ten + "-tam-2"); } await dong(); }
    if (nut[1].startsWith("#") && await bam(nut[1])) { await soat(ten + "-tam-2"); await dong(); }
  }
  const tc = await donDau("0918000421", async (o) => (await lay("0918000421", `/v1/orders/${o.id}/disputes`)).length > 0);
  if (tc) { await vao(`ban-don.html?id=${tc.id}&${N}`); await soat("hd-tranh-chap"); if (await bam("#xin-huy")) { await p.waitForTimeout(800); await soat("hd-tam-xin-huy"); await dong(); } }
  // Vườn: tấm ghi; Tôi: tấm hỗ trợ
  await vao(`ban-vuon.html?${N}`); if (await bam("#ghi")) { await bam('[data-viec="spray"]'); await soat("vuon-tam-ghi"); await dong(); }
  await vao(`ban-toi.html?${N}`); if (await bam("#gui-ht")) { await soat("toi-tam-ho-tro"); await dong(); }
  // Cuối: gửi một chào hàng để soát tấm "Đã gửi"
  if (W === CO.at(-1)) { await vao(`ban-hang-hoa.html?${N}#can`); await p.reload(); await p.waitForTimeout(1200);
    if (await bam(".the-nc .nc-dong button:not([disabled])")) { await bam('.tam [type="submit"]'); await p.waitForTimeout(1500); await soat("cho-da-gui"); } }
  if (loiTrang.length) { tong += loiTrang.length; console.log(`✖ ${W} lỗi JS: ${loiTrang.join(" | ")}`); }
  await p.close();
}
console.log(`\n${tong ? tong + " lỗi" : "Sạch"} · ảnh: ${OUT}`);
await b.close();
process.exitCode = tong ? 1 : 0;
