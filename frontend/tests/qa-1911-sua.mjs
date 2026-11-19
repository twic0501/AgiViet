// Kiểm các lỗi QA 19/11 đã sửa (QA-02, 04, 05, 06, 13) trên bản build. Cặp cô lập 18980/18990 như e2e-luong-chinh
// (chạy SAU e2e-luong-chinh để có đơn HD-3001 completed).
import { createRequire } from "node:module";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const F = process.env.FRONTEND_URL, API = process.env.API_ORIGIN;
if (API !== "http://127.0.0.1:18980" || F !== "http://127.0.0.1:18990") throw Error("Chỉ chạy trên cặp dịch vụ cô lập 18980/18990.");
const tk = async (phone) => (await (await fetch(API + "/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) })).json()).token;
const MUA = "0908000510", NAM = "0918000421", MUA_E2E = "0909000213"; // MUA_E2E: người mua của e2e-luong-chinh (có HD-3001 completed)
const b = await chromium.launch(); const kq = [];
const ghi = (t, ok, c = "") => { kq.push(!!ok); console.log(ok ? "ĐẠT " : "HỎNG", t, c); };
const trang = async (phone, w = 390) => { const ctx = await b.newContext({ viewport: { width: w, height: 844 }, serviceWorkers: "block" }); const t = await tk(phone);
  await ctx.addInitScript((x) => sessionStorage.setItem("agv-phien", x), t); const p = await ctx.newPage(); p.loi = []; p.on("pageerror", (e) => p.loi.push(e.message)); return p; };

// QA-02: phiếu tìm nguồn app mua, lượng "1.500" → 1.500 kg (1.500.000 g), không phải 1,5 kg
{ const p = await trang(MUA); let than = null;
  p.on("request", (r) => { if (r.method() === "POST" && /\/v1\/(demands|sourcing)/.test(r.url())) than = than || JSON.parse(r.postData() || "{}"); });
  await p.goto(`${F}/mua-ts/#nhu-cau/moi`, { waitUntil: "load" }); await p.waitForSelector("#pk-kg");
  await p.fill("#pk-kg", "1.500"); await p.fill("#pk-gia", "26000"); await p.click("#pk-gui"); await p.waitForTimeout(2500);
  const g = JSON.stringify(than || {}).match(/"(?:qty_g|min_source_qty_g)":"?(\d+)/);
  ghi("QA-02 lượng 1.500 gửi 1.500.000 g", g && g[1] === "1500000", JSON.stringify(than)?.slice(0, 160)); await p.context().close(); }

// QA-04: chat app bán khi API lỗi không báo "Chưa có ai để nhắn"
{ const p = await trang(NAM); await p.route(/\/v1\/(offers|orders|messages\/summary)(\?|$)/, (r) => r.fulfill({ status: 503, json: { errors: [{ message: "lỗi thử" }] } }));
  await p.goto(`${F}/thiet-ke/ban-tin-nhan.html`, { waitUntil: "load" }); await p.waitForTimeout(800);
  const chu = await p.innerText("body");
  ghi("QA-04 API lỗi → báo chưa tải được, không nói 'chưa có ai'", /Chưa tải được tin nhắn/.test(chu) && !/Chưa có ai để nhắn/.test(chu)); await p.context().close(); }

// QA-05: hộp ghi việc giữ focus bên trong khi bấm Tab nhiều lần
{ const p = await trang(NAM); await p.goto(`${F}/thiet-ke/ban-vuon.html`, { waitUntil: "load" });
  await p.click("#ghi"); let ra = 0; const noi = [];
  for (let i = 0; i < 25; i++) { await p.keyboard.press("Tab"); const o = await p.evaluate(() => { const a = document.activeElement; return a?.closest("#che") ? "" : (a?.tagName + "#" + (a?.id || "") + "." + (a?.className || "")); }); if (o) { ra++; noi.push(o); } }
  ghi("QA-05 Tab 25 lần không ra ngoài hộp", ra === 0, `${ra} lần ra ngoài: ${[...new Set(noi)].join(", ")}`);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  ghi("QA-05 đóng hộp thì nền hết inert", await p.evaluate(() => ![...document.body.children].some((e) => e.inert))); await p.context().close(); }

// QA-06: chat của đơn đã hoàn tất không ghi "Đang chờ bên kia"
{ const t = await tk(MUA_E2E); const dn = await (await fetch(API + "/v1/orders", { headers: { authorization: "Bearer " + t } })).json();
  const xong = (Array.isArray(dn) ? dn : dn.items || []).find((d) => d.status === "completed");
  if (!xong) ghi("QA-06 có đơn completed để thử", false, "chạy e2e-luong-chinh trước");
  else { const p = await trang(MUA_E2E); await p.goto(`${F}/mua-ts/#tin/order/${xong.id}`, { waitUntil: "load" }); await p.waitForTimeout(2500);
    const dai = (await p.locator("#dai").innerText().catch(() => "")).replace(/\s+/g, " ");
    ghi("QA-06 đơn hoàn tất: dải không 'Đang chờ bên kia'", dai && !/Đang chờ bên kia/.test(dai), dai.slice(0, 120)); await p.context().close(); } }

// QA-13: trang chủ app bán nạp được rive (không 404)
{ const p = await trang(NAM); const hong = [];
  p.on("response", (r) => { if (/vendor\/rive/.test(r.url()) && r.status() >= 400) hong.push(r.status() + " " + r.url()); });
  await p.goto(`${F}/thiet-ke/ban-hom-nay.html`, { waitUntil: "load" }); await p.waitForTimeout(1500);
  ghi("QA-13 rive.js/rive.wasm không 404", hong.length === 0, hong.join(" | ")); await p.context().close(); }

await b.close(); const h = kq.filter((x) => !x).length; console.log(`\n${kq.length - h}/${kq.length} đạt`); process.exit(h ? 1 : 0);
