// Kiểm đầu-cuối 3 màn giao diện mới app bán (thiet-ke/): Đăng nhập (quả cầu, đăng nhập, sai mã, đăng ký), Hôm nay, Hàng hóa.
// Chạy trên stack thử: backend 18980 (PGlite) + frontend 18990. Dùng: node tests/thiet-ke-ban.mjs
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");

const GOC = process.env.FRONTEND_URL || "http://127.0.0.1:18990";
const ANH = new URL("../../docs/frontend/anh-thiet-ke/", import.meta.url).pathname;
await mkdir(ANH, { recursive: true });
const ketQua = [];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

// choPhep: dòng lỗi console được biết trước (vd. trình duyệt tự ghi "Failed to load resource" khi backend trả 4xx cho mã sai)
async function trang(ten, fn, choPhep = null) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const p = await ctx.newPage();
  const loi = [];
  p.on("pageerror", (e) => loi.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !(choPhep && choPhep.test(m.text()))) loi.push("console: " + m.text()); });
  try {
    await fn(p);
    assert.deepEqual(loi, [], "lỗi trình duyệt");
    ketQua.push([ten, "ĐẠT"]);
  } catch (e) {
    ketQua.push([ten, "LỖI: " + e.message.split("\n")[0] + (loi.length ? " · " + loi.join(" | ") : "") + (e.actual ? " · thực tế: " + JSON.stringify(e.actual) : "")]);
    await p.screenshot({ path: `${ANH}loi-${ten}.png` }).catch(() => {});
  }
  await ctx.close();
}

// Gửi mã OTP; backend giới hạn 1 lần/60 giây mỗi số → nếu bị chặn (429) thì báo lỗi rõ trên màn, chờ hết hạn rồi gửi lại
async function guiMa(p) {
  await p.locator("#gui").click();
  const ketQuaGui = await Promise.race([
    p.locator("#b2").waitFor({ state: "visible", timeout: 8000 }).then(() => "ok"),
    p.locator("#loi-1").waitFor({ state: "visible", timeout: 8000 }).then(() => "chan"),
  ]);
  if (ketQuaGui === "chan") {
    assert.ok((await p.locator("#loi-1").textContent()).trim().length > 0, "bị chặn gửi mã phải có câu báo");
    await p.waitForTimeout(61000);
    await p.locator("#gui").click();
    await p.locator("#b2").waitFor({ state: "visible", timeout: 8000 });
  }
}

// Số lô đang bán thật trên backend (các lượt thử Đăng bài làm số lô thay đổi)
async function loDangBan(sdt) {
  const t = (await (await fetch("http://127.0.0.1:18980/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt }) })).json()).token;
  const ds = await (await fetch("http://127.0.0.1:18980/v1/lots?mine=true", { headers: { authorization: "Bearer " + t } })).json();
  return { tatCa: ds.length, dangBan: ds.filter((l) => l.status === "on_sale" && !l.an_tu_dong).length };
}

// Kiểm chung: không tràn ngang, nút bấm cao ≥ 44px
async function kiemChung(p) {
  const tran = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(tran, false, "tràn ngang");
  const nho = await p.evaluate(() => [...document.querySelectorAll("button, .tab a")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44)
    .map((b) => `${b.textContent.trim().slice(0, 20)}=${Math.round(b.getBoundingClientRect().height)}`));
  assert.deepEqual(nho, [], "vùng bấm < 44px");
}

await trang("dang-nhap-qua-cau", async (p) => {
  await p.goto(`${GOC}/thiet-ke/dang-nhap.html`);
  await p.waitForTimeout(2500);
  // quả cầu đã vẽ: đếm điểm ảnh không trong suốt trên canvas
  const diem = await p.evaluate(() => { const c = document.getElementById("cau"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n; });
  assert.ok(diem > 5000, `quả cầu chưa vẽ (${diem} điểm)`);
  assert.ok(await p.getByRole("button", { name: "Đăng nhập" }).isVisible());
  assert.ok(await p.getByRole("button", { name: "Đăng ký bán hàng" }).isVisible());
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}01-dang-nhap.png` });
});

await trang("dang-nhap-dung-ma", async (p) => {
  await p.goto(`${GOC}/thiet-ke/dang-nhap.html`);
  await p.getByRole("button", { name: "Đăng nhập" }).click();
  // Số riêng cho kiểm thử (0918000422, cùng hộ Năm) — không dùng 0918000421 người sáng lập đang thử tay
  await p.locator("#sdt").pressSequentially("0918000422");
  await guiMa(p);
  await p.locator("#ma-thu").waitFor({ state: "visible", timeout: 5000 });
  const ma = (await p.locator("#ma-thu").textContent()).match(/\d{6}/)[0];
  await p.screenshot({ path: `${ANH}02-otp.png` });
  await p.locator("#otp input").first().pressSequentially(ma);
  await p.waitForURL(/ban-hom-nay\.html/, { timeout: 8000 });
  await p.getByText("Hộ Nguyễn Thị Năm").waitFor({ timeout: 8000 });
}, /status of 429/);

await trang("dang-nhap-sai-ma", async (p) => {
  await p.goto(`${GOC}/thiet-ke/dang-nhap.html`);
  await p.getByRole("button", { name: "Đăng nhập" }).click();
  await p.locator("#sdt").pressSequentially("0966000520");
  await guiMa(p);
  await p.locator("#otp input").first().pressSequentially("000000");
  await p.locator("#loi-2").waitFor({ state: "visible", timeout: 5000 });
  assert.match(p.url(), /dang-nhap\.html/);
  assert.equal(await p.locator("#otp input").first().inputValue(), "", "ô mã phải xóa để nhập lại");
  assert.ok((await p.locator("#loi-2").textContent()).trim().length > 0, "phải có câu báo mã sai");
}, /Failed to load resource: the server responded with a status of 4\d\d/);

await trang("dang-ky", async (p) => {
  const so = "090" + String(Date.now()).slice(-7);
  await p.goto(`${GOC}/thiet-ke/dang-nhap.html`);
  await p.getByRole("button", { name: "Đăng ký bán hàng" }).click();
  await p.locator("#ho-ten").fill("Người Thử Đăng Ký");
  await p.locator("#ten-cs").fill("Vườn thử E2E");
  assert.ok(await p.locator("#gui").isDisabled(), "chưa có số thì chưa gửi được");
  await p.locator("#sdt").pressSequentially(so);
  await p.locator("#gui").click();
  await p.locator("#ma-thu").waitFor({ state: "visible", timeout: 5000 });
  const ma = (await p.locator("#ma-thu").textContent()).match(/\d{6}/)[0];
  await p.locator("#otp input").first().pressSequentially(ma);
  await p.locator("#b3").waitFor({ state: "visible", timeout: 8000 });
  await p.screenshot({ path: `${ANH}03-dang-ky-xong.png` });
});

await trang("hom-nay", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0918000421`);
  await p.locator(".the-hd").first().waitFor({ timeout: 8000 });
  assert.equal(await p.locator(".the-hd").count(), 2, "2 hợp đồng");
  const { dangBan } = await loDangBan("0918000421");
  assert.equal(await p.locator(".the-lo").count(), Math.min(4, dangBan), "Trang chủ hiện tối đa 4 lô đang bán");
  assert.equal(await p.locator(".ngay-troi").count(), 4, "4 ngày thời tiết");
  assert.match(await p.locator("#cau-chinh").textContent(), /chưa có việc gấp/);
  assert.equal(await p.locator(".chang i.dang").count(), 2, "mỗi hợp đồng một chặng đang làm");
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}04-hom-nay.png`, fullPage: true });
});

await trang("hom-nay-chua-co-hop-dong", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0939000120`);
  await p.getByText("Chưa có hợp đồng nào").waitFor({ timeout: 8000 });
  assert.equal(await p.locator("#nut-chinh").textContent(), "Đăng hàng");
});

await trang("hang-hoa", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-hang-hoa.html?thu=0918000421`);
  await p.locator(".lo").first().waitFor({ timeout: 8000 });
  const { tatCa, dangBan } = await loDangBan("0918000421");
  assert.equal(await p.locator(".lo").count(), tatCa, "Tất cả = mọi lô của bác");
  assert.equal((await p.locator("#so-lo").textContent()).trim(), String(dangBan));
  await p.locator('#loc button[data-k="on_sale"]').click();
  assert.equal(await p.locator('#loc button[data-k="on_sale"]').getAttribute("aria-pressed"), "true");
  // tab giữ ?thu= khi chuyển màn
  assert.match(await p.locator('.tab a[href*="ban-hom-nay"]').getAttribute("href"), /thu=0918000421/);
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}05-hang-hoa.png`, fullPage: true });
});

await trang("thieu-phien-bao-loi", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html`);
  await p.getByText("Chưa mở được sổ").waitFor({ timeout: 5000 });
  assert.ok(await p.getByRole("button", { name: "Thử lại" }).isVisible());
});

await trang("dang-bai", async (p) => {
  // Lượng ngẫu nhiên để nhận ra lô vừa tạo trên backend
  const kg = 300 + (Date.now() % 600);
  await p.goto(`${GOC}/thiet-ke/ban-dang-bai.html?thu=0918000421`);
  await p.locator("#ds-sp button").first().waitFor({ timeout: 8000 });
  assert.ok(await p.locator("#tiep").isDisabled(), "chưa chọn mặt hàng thì chưa đi tiếp");
  await p.locator("#ds-sp button").first().click();
  await p.locator('#ds-loai button[data-g="L1"]').click();
  await p.locator("#tiep").click();
  await p.locator("#luong").fill(String(kg));
  await p.locator("#tiep").click();
  await p.locator("#gia-muon").pressSequentially("27000");
  await p.locator("#gia-san").pressSequentially("28000");
  assert.ok(await p.locator("#tiep").isDisabled(), "giá thấp nhất > giá mong muốn phải bị chặn");
  await p.locator("#gia-san").fill(""); await p.locator("#gia-san").pressSequentially("24000");
  await p.locator("#tiep").click();
  assert.ok(await p.locator("#tiep").isDisabled(), "chưa có ảnh thì chưa đăng được");
  await p.locator("#chon-anh").setInputFiles(new URL("../assets/products/xoai-cat-chu.jpg", import.meta.url).pathname);
  await p.locator("#anh-chon .o").first().waitFor();
  await kiemChung(p);
  await p.locator("#tiep").click();
  await p.locator('[data-b="5"]').waitFor({ state: "visible", timeout: 10000 });
  const t = (await (await fetch("http://127.0.0.1:18980/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json()).token;
  const lo = (await (await fetch("http://127.0.0.1:18980/v1/lots?mine=true", { headers: { authorization: "Bearer " + t } })).json()).find((l) => l.declared_qty_g === String(kg * 1000));
  assert.ok(lo, "lô mới phải có trên backend");
  assert.equal(lo.status, "on_sale", "lô phải được đăng (đang bán), không kẹt nháp");
});

await browser.close();
for (const [t, k] of ketQua) console.log(k.startsWith("ĐẠT") ? "✔" : "✖", t, k === "ĐẠT" ? "" : k);
const dat = ketQua.filter(([, k]) => k === "ĐẠT").length;
console.log(`${dat}/${ketQua.length} đạt · ảnh: docs/frontend/anh-thiet-ke/`);
if (dat !== ketQua.length) process.exitCode = 1;
