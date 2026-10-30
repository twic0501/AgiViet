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
  if (ketQuaGui === "chan") assert.match(await p.locator("#loi-1").textContent(), /thử lại sau|chờ/, "bị chặn gửi mã phải có câu báo dễ hiểu");
  return ketQuaGui;
}
// Người bán mẫu dùng cho kiểm thử (không dùng 0918000421 người sáng lập đang thử tay)
const SO_BAN = ["0918000422", "0939000140", "0977000620", "0966000520", "0939000160", "0977000630", "0977000640", "0988000770"];

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
  let duoc = false;
  for (const so of SO_BAN) {
    await p.locator("#sdt").fill(""); await p.locator("#sdt").pressSequentially(so);
    if ((await guiMa(p)) === "ok") { duoc = true; break; }
  }
  assert.ok(duoc, "mọi số người bán mẫu đều đang bị khóa OTP");
  await p.locator("#ma-thu").waitFor({ state: "visible", timeout: 5000 });
  const ma = (await p.locator("#ma-thu").textContent()).match(/\d{6}/)[0];
  await p.screenshot({ path: `${ANH}02-otp.png` });
  await p.locator("#otp input").first().pressSequentially(ma);
  await p.waitForURL(/ban-hom-nay\.html/, { timeout: 8000 });
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 8000 });
  assert.notEqual((await p.locator("#dau h1").textContent()).trim(), "AgiViet", "đã vào bằng phiên thật, hiện tên tổ chức");
}, /status of 429/);

await trang("dang-nhap-sai-ma", async (p) => {
  await p.goto(`${GOC}/thiet-ke/dang-nhap.html`);
  await p.getByRole("button", { name: "Đăng nhập" }).click();
  await p.locator("#sdt").pressSequentially("097" + String(Date.now()).slice(-7));   // số mới: không bị khóa
  assert.equal(await guiMa(p), "ok");
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
  await p.locator(".hd-gon").first().waitFor({ timeout: 8000 });
  assert.equal(await p.locator(".hd-gon").count(), 2, "2 hợp đồng, mỗi cái một dòng");
  assert.equal(await p.locator(".the-lo").count(), 0, "Trang chủ không còn mục Hàng đang bán");
  assert.equal(await p.locator("#tong-hd, #khoi-viec, .gia-tt, .ngay-troi").count(), 0, "chi tiết nằm ở màn riêng, Trang chủ chỉ tóm tắt");
  assert.equal(await p.locator(".qua").count(), 0, "đã bỏ quạ");
  await p.waitForFunction(() => /\d/.test(document.querySelector("#tom-troi .lon")?.textContent || ""), null, { timeout: 8000 });
  await p.waitForFunction(() => /\d/.test(document.querySelector("#tom-gia .lon")?.textContent || ""), null, { timeout: 8000 });
  assert.match(await p.locator("#cau-chinh").textContent(), /chưa có việc gấp|lời chào giá chờ bác|việc cần làm/);
  assert.deepEqual((await p.locator(".loi-tat a").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim()), ["Thời tiết", "Nhật ký canh tác", "Giá & tin tức", "Học kỹ thuật", "Cài đặt & Hỗ trợ"]);
  assert.equal(await p.locator(".dau").count(), 1, "chỉ một header");
  // Bấm ô tóm tắt → màn chi tiết
  await p.locator("#tom-troi").click(); await p.waitForURL(/ban-thoi-tiet\.html\?thu=/);
  await p.locator(".ngay-dai").first().waitFor({ timeout: 8000 });
  assert.ok(await p.locator(".ngay-dai").count() >= 4, "màn Thời tiết có nhiều ngày");
  await kiemChung(p);
  await p.goto(`${GOC}/thiet-ke/ban-tin-tuc.html?thu=0918000421`);
  await p.locator(".gia-tt").first().waitFor({ timeout: 8000 });
  await p.locator(".tin").first().waitFor({ timeout: 8000 });
  await kiemChung(p);
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0918000421`);
  await p.locator(".hd-gon").first().waitFor({ timeout: 8000 });
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
  assert.equal(await p.locator(".lo").count(), dangBan, "mặc định hiện các lô đang bán");
  assert.equal((await p.locator("#so-lo").textContent()).trim(), String(dangBan));
  assert.equal(await p.locator('#loc button[data-k="tat-ca"]').count(), 0, "không còn nút Tất cả trùng với Đang bán");
  if (tatCa === dangBan) assert.ok(await p.locator("#loc").isHidden(), "chỉ một trạng thái thì ẩn bộ lọc");
  assert.equal(await p.locator("#dau.dau-xanh").count(), 1, "header xanh như Trang chủ");
  // tab giữ ?thu= khi chuyển màn
  assert.match(await p.locator('.tab a[href*="ban-hom-nay"]').getAttribute("href"), /thu=0918000421/);
  assert.equal(await p.locator(".nut-noi").count(), 0, "không còn nút Đăng hàng trùng với thanh menu");
  assert.ok(await p.locator(".lo .luong i").count() > 0, "mỗi lô có thanh lượng");
  await p.waitForFunction(() => /bên mua đang chào giá/.test(document.querySelector('.lo[data-lo="L-0412"] .hoi')?.textContent || ""), null, { timeout: 8000 });
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}05-hang-hoa.png`, fullPage: true });
  // Ngăn Bên mua đang cần → chào hàng vào một nhu cầu khớp
  await p.locator("#ngan-can").click();
  await p.locator("#p-can .can").first().waitFor({ timeout: 8000 });
  assert.ok(await p.locator("#p-can .khop").count() > 0, "có nhu cầu khớp hàng của bác");
  const conChao = p.locator("#p-can button[data-dong]:not([disabled])");
  if (await conChao.count()) {
    await conChao.first().click();
    await p.locator(".tam").waitFor({ timeout: 3000 });
    await p.locator('.tam input[name="gia"]').fill("24000");
    await kiemChung(p);
    await p.locator("#tam-gui").click();
    await p.getByText("Đã gửi chào hàng").waitFor({ timeout: 8000 });
  } else {
    // Chạy lại trên cùng dữ liệu: mọi dòng khớp đã chào → nút phải ghi rõ lý do, không cho chào trùng
    const nhan = await p.locator("#p-can button[data-dong]").allInnerTexts();
    assert.ok(nhan.every((t) => /Đã chào|Đang chào|Chưa có hàng/.test(t)), `nút khóa phải có lý do: ${nhan.join(", ")}`);
  }
  await p.screenshot({ path: `${ANH}05b-cho-chao-hang.png` });
});

await trang("tien", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0918000421`);
  await p.locator('.tab a[href*="ban-tien"]').click();
  await p.waitForURL(/ban-tien\.html\?thu=/);
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 8000 });
  // Số lấy đúng từ /v1/money/summary của backend
  const t = (await (await fetch(`${GOC}/v1/test/impersonate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json()).token;
  const s = await (await fetch(`${GOC}/v1/money/summary`, { headers: { authorization: "Bearer " + t } })).json();
  assert.equal(await p.locator("#coc").getAttribute("title"), `${Number(s.tong.coc_dang_giu).toLocaleString("vi-VN")} đồng`, "cọc đang giữ đúng số backend");
  assert.equal(await p.locator(".hd-tien").count(), s.theo_don.filter((d) => !d.la_mua).length, "mỗi hợp đồng một dòng");
  assert.equal(await p.locator('.tab a[aria-current="page"]').getAttribute("aria-label"), "Tiền");
  await p.locator('.ky button[data-ky="tat-ca"]').click();
  await p.getByText("Đã nhận từ trước tới nay").waitFor({ timeout: 5000 });
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}06-tien.png`, fullPage: true });
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

await trang("tin-nhan-thong-bao", async (p) => {
  // Trước khi xem: chuông có chấm mới; xem xong quay về Trang chủ: hết chấm
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0918000421`);
  await p.locator(".hd-gon").first().waitFor({ timeout: 8000 });
  assert.equal(await p.locator('#dau a[href*="#thong-bao"] .cham-moi').count(), 1, "chưa xem thì chuông có chấm");
  await p.locator('#dau a[href*="#thong-bao"]').click();
  await p.waitForURL(/ban-thong-bao\.html/);
  await p.locator("#ds-tb .tb").first().waitFor({ timeout: 8000 });
  assert.ok(await p.locator("#ds-tb .tb").count() > 0, "có thông báo thật");
  assert.ok(await p.locator("#ds-tb .ngay").count() > 0, "có nhóm theo ngày");
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}11-tin-nhan.png` });
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0918000421`);
  await p.locator(".hd-gon").first().waitFor({ timeout: 8000 });
  assert.equal(await p.locator('#dau a[href*="#thong-bao"] .cham-moi').count(), 0, "đã xem thì hết chấm");
});

await trang("hoi-agiviet", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-thong-bao.html?thu=0918000421#ho-tro`);
  assert.equal(await p.locator("#p-ht").isVisible(), true, "mở thẳng thẻ Hỏi AgiViet từ nút tai nghe");
  assert.ok(await p.locator("#gui").isDisabled(), "chưa có nội dung thì chưa gửi");
  await p.getByRole("button", { name: "Bên mua chưa ký hợp đồng" }).click();
  await p.locator("#noi-dung").press("End");
  await p.locator("#noi-dung").pressSequentially("Hợp đồng DEMO56 chờ lâu rồi.");
  await p.locator("#gui").click();
  await p.locator("#da-gui").waitFor({ state: "visible", timeout: 8000 });
  assert.match(await p.locator("#da-gui").innerText(), /Đã gửi cho AgiViet/);
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}12-hoi-agiviet.png` });
});

await trang("tin-nhan-chao-gia", async (p) => {
  // Có lời chào giá thật của bên mua thì phải hiện, mục tới lượt bác đứng đầu
  const t = (await (await fetch("http://127.0.0.1:18980/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json()).token;
  const chao = await (await fetch("http://127.0.0.1:18980/v1/offers", { headers: { authorization: "Bearer " + t } })).json();
  const mo = chao.filter((c) => /sent|countered|open/.test(c.status)).length;
  await p.goto(`${GOC}/thiet-ke/ban-tin-nhan.html?thu=0918000421`);
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 8000 });
  assert.equal(await p.locator('.tab a[aria-current="page"]').innerText().then((s) => s.trim()), "Tin nhắn");
  assert.ok(await p.locator(".cuoc").count() >= mo, "mọi lời chào đang mở đều hiện");
  if (mo) {
    await p.locator('#loc [data-k="cho-bac"]').click();
    assert.ok(await p.locator(".cuoc .nhan-cho.bac").count() > 0, "lọc Chờ bác trả lời có mục");
  }
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}13-tin-nhan-chao-gia.png` });
});

await trang("menu-va-dang-bai", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0918000421`);
  await p.locator(".tab .fab").waitFor({ timeout: 8000 });
  assert.equal(await p.locator(".tab a").count(), 5, "menu 5 mục");
  const fab = await p.locator(".tab .fab").boundingBox(), thanh = await p.locator(".tab").boundingBox();
  assert.ok(fab.y < thanh.y && fab.y > thanh.y - 30, "nút Đăng bài nhô lên một chút khỏi thanh");
  await p.goto(`${GOC}/thiet-ke/ban-tin-tuc.html?thu=0918000421`); await p.locator(".tin").first().waitFor({ timeout: 8000 });
  await p.mouse.wheel(0, 600); await p.waitForTimeout(500);
  assert.ok(await p.locator(".tab.thu").count() === 1, "cuộn xuống thì thanh trượt xuống ẩn");
  await p.mouse.wheel(0, -200); await p.waitForTimeout(500);
  assert.equal(await p.locator(".tab.thu").count(), 0, "kéo lên thì thanh hiện lại");
  await p.mouse.wheel(0, 600); await p.waitForTimeout(500);
  await p.locator(".muc h3 span").first().dispatchEvent("pointerdown"); await p.waitForTimeout(400);
  assert.equal(await p.locator(".tab.thu").count(), 0, "chạm màn hình thì thanh hiện lại");
  await p.mouse.wheel(0, -300); await p.waitForTimeout(500);
  assert.ok(await p.locator(".tab.thu").count() === 0, "cuộn lên thì hiện đủ");
  await p.goto(`${GOC}/thiet-ke/ban-dang-bai.html?thu=0918000421`);
  await p.locator("#ds-sp button").first().waitFor({ timeout: 8000 });
  assert.equal(await p.locator(".tab").count(), 0, "Đăng bài không có thanh menu");
  assert.ok(await p.locator("#dong").isVisible(), "Đăng bài có nút quay lại");
});

await trang("nut-cuon-nhanh", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-tin-tuc.html?thu=0918000421`);
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 8000 });
  assert.equal(await p.locator(".nut-cuon.hien").count(), 0, "chưa cuộn thì ẩn");
  await p.mouse.wheel(0, 500); await p.waitForTimeout(300);
  assert.equal(await p.locator(".nut-cuon.hien").count(), 1, "đang cuộn thì hiện");
  await p.waitForTimeout(2000);
  assert.equal(await p.locator(".nut-cuon.hien").count(), 0, "đứng yên vài giây thì ẩn");
  await p.mouse.wheel(0, 100); await p.waitForTimeout(300);
  const nut = await p.locator(".nut-cuon").boundingBox();
  await p.mouse.move(nut.x + 22, nut.y + 22); await p.mouse.down(); await p.mouse.move(nut.x + 22, 700, { steps: 6 }); await p.mouse.up();
  const y = await p.evaluate(() => scrollY), toi = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  assert.ok(y > toi * 0.8, `giữ và kéo xuống thì cuộn nhanh gần cuối (${y}/${toi})`);
});

await trang("tro-ly-ai", async (p) => {
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0918000421`);
  await p.locator('#dau [data-tro-ly]').waitFor({ timeout: 8000 });
  await p.locator('#dau [data-tro-ly]').click();
  await p.locator(".tl-tam.mo").waitFor({ timeout: 3000 });
  await p.locator(".tl-goi-y button", { hasText: "Đăng hàng mới" }).click();
  await p.locator(".tl-hoi .tl-di").last().waitFor({ timeout: 3000 });
  assert.match(await p.locator(".tl-hoi .tl-di").last().getAttribute("href"), /ban-dang-bai\.html/);
  // "cho tôi hỏi…" không được dẫn nhầm sang Chợ → đi hỏi AI và có câu trả lời
  await p.locator("#tl-o").fill("cho tôi hỏi bên mua đặt cọc thế nào?");
  await p.locator("#tl-go button").click();
  await p.waitForFunction(() => { const b = [...document.querySelectorAll(".tl-bong.ai")].at(-1); return b && !b.classList.contains("cho") && b.textContent.length > 10; }, null, { timeout: 30000 });
  const traLoi = await p.locator(".tl-bong.ai").last().innerText();
  assert.ok(!/Mở Chợ/.test(traLoi), "không dẫn nhầm sang Chợ");
  assert.equal(await p.locator(".tl-bong.ai").last().locator(".tl-di").count() === 0 || /nhân viên/i.test(traLoi), true, "câu hỏi giải thích phải do AI trả lời, không phải nút dẫn đường");
  assert.match(traLoi, /cọc|ngân hàng|tài khoản/i, "AI trả lời đúng chủ đề đặt cọc");
  await p.locator("#tl-o").fill("Gửi tôi mã OTP của bác");
  await p.locator("#tl-go button").click();
  await p.waitForFunction(() => /không bao giờ hỏi mã OTP/.test([...document.querySelectorAll(".tl-bong.ai")].at(-1)?.textContent || ""), null, { timeout: 10000 });
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}14-tro-ly-ai.png` });
  console.log("   trả lời AI:", traLoi.replace(/\s+/g, " ").slice(0, 160));
});

await browser.close();
for (const [t, k] of ketQua) console.log(k.startsWith("ĐẠT") ? "✔" : "✖", t, k === "ĐẠT" ? "" : k);
const dat = ketQua.filter(([, k]) => k === "ĐẠT").length;
console.log(`${dat}/${ketQua.length} đạt · ảnh: docs/frontend/anh-thiet-ke/`);
if (dat !== ketQua.length) process.exitCode = 1;
