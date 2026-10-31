// Kiểm đầu-cuối 3 màn giao diện mới app bán (thiet-ke/): Đăng nhập (quả cầu, đăng nhập, sai mã, đăng ký), Hôm nay, Hàng hóa.
// Chạy trên stack thử: backend 18980 (PGlite) + frontend 18990. Dùng: node tests/thiet-ke-ban.mjs
import { createRequire } from "node:module";
import { anhNgauNhien } from "./anh-ngau-nhien.mjs";
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
  // Tràn bên trong khối có cuộn riêng (tấm nổi, thẻ…): trừ dải lọc và dải tin cố ý cuộn ngang
  const tranTrong = await p.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => {
    if (!e.offsetParent || e.closest(".loc, .khung-tin, .bang-tin, .tl-goi-y")) return false;
    const cs = getComputedStyle(e), ox = cs.overflowX;
    if (cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none") return false;   // cắt chữ có dấu … là cố ý
    return (ox === "auto" || ox === "scroll" || ox === "hidden") && e.scrollWidth > e.clientWidth + 1;
  }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${e.scrollWidth}>${e.clientWidth}`));
  assert.deepEqual(tranTrong, [], "tràn ngang bên trong khối");
  // Mọi thứ hiện ra phải nằm trong bề ngang màn hình
  const loRa = await p.evaluate(() => [...document.querySelectorAll(".tam *, .man-che *")].filter((e) => e.offsetParent && e.getBoundingClientRect().right > innerWidth + 1)
    .map((e) => `${e.tagName.toLowerCase()} ${(e.textContent || "").trim().slice(0, 16)}`));
  assert.deepEqual(loRa, [], "phần tử trong tấm nổi lòi ra ngoài màn hình");
  // Phần tử bị ép thấp hơn nội dung (vd. trùng tên lớp với CSS chung có height cố định) → chữ bị cắt
  const bep = await p.evaluate(() => [...document.querySelectorAll(".tam *, .the-nc *, .lo *, .vu *")].filter((e) => {
    if (!e.offsetParent) return false;
    const cs = getComputedStyle(e);
    if (cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none" || !/hidden|clip/.test(cs.overflowY)) return false;
    return e.scrollHeight > e.clientHeight + 2;
  }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${e.scrollHeight}>${e.clientHeight}`));
  assert.deepEqual(bep, [], "phần tử bị ép, chữ bị cắt");
  const nho = await p.evaluate(() => [...document.querySelectorAll("button, .tab a")].filter((b) => b.offsetParent && Math.round(b.getBoundingClientRect().height) < 44)
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
  // Hộ Đặng Thị Bích: không dùng trong các tình huống hợp đồng của E2E (0939000120 là tình huống demo 0002)
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0966000520`);
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
  await p.waitForFunction(() => /lời chào đang mở/.test(document.querySelector('.lo[data-lo="L-0412"] .hoi')?.textContent || ""), null, { timeout: 8000 });
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}05-hang-hoa.png`, fullPage: true });
  // Lời chào hiện ngay trên lô, có tên bên mua và tới lượt ai
  assert.match(await p.locator('.lo[data-lo="L-0412"] .chao-lo').innerText(), /chào[\s\S]*đ\/kg[\s\S]*Chờ bác/);
  // Quản lý lô: chặn giá thấp nhất cao hơn giá mong muốn ngay trên máy; lưu giá hợp lệ; bật bán nhanh
  await p.locator('.lo[data-lo="L-0413"] [data-ql]').click();
  await p.locator("#f-gia").waitFor({ timeout: 8000 });
  if (await p.locator('#f-gia button[type="submit"]').isEnabled()) {
    await p.locator('#f-gia input[name="ask"]').fill("22000");
    await p.locator('#f-gia input[name="floor"]').fill("23000");
    await p.locator('#f-gia button[type="submit"]').click();
    await p.getByText("Giá thấp nhất không được cao hơn giá mong muốn.").waitFor({ timeout: 3000 });
    await p.locator('#f-gia input[name="floor"]').fill("20000");
    await p.locator('#f-gia button[type="submit"]').click();
    await p.getByText("Đã lưu giá mới").waitFor({ timeout: 8000 });
  } else {
    // Đã sửa trong 24 giờ qua (lần chạy trước): ô giá khóa sẵn và ghi giờ được sửa lại
    assert.match(await p.locator("#bao-gia").textContent(), /sửa lại được từ/);
  }
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}05c-quan-ly-lo.png` });
  await p.locator("#ql-dong").click();
  // Ngăn Bên mua đang cần → chào hàng vào một nhu cầu khớp
  await p.locator("#ngan-can").click();
  await p.locator("#p-can .the-nc").first().waitFor({ timeout: 8000 });
  assert.ok(await p.locator("#p-can .khop").count() > 0, "có nhu cầu khớp hàng của bác");
  // Không lộ mã hạng thô; nhu cầu mặt hàng bác không bán được gom vào mục riêng; chữ trong thẻ không phóng to bất thường
  const chu = await p.locator("#p-can").innerText();
  assert.ok(!/Loại L\d|OM18-am|\bDAT\b|ngoai_co|chua_tach/.test(chu), "còn mã hạng thô");
  assert.equal(await p.locator("#p-can > #ds-can > .the-nc .khop").count(), await p.locator("#p-can > #ds-can > .the-nc").filter({ has: p.locator(".khop") }).count());
  const to = await p.evaluate(() => [...document.querySelectorAll("#p-can .the-nc *:not(.mui-ct)")].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) > 18).map((e) => e.textContent.trim().slice(0, 20)));
  assert.deepEqual(to, [], "chữ trong thẻ nhu cầu bị phóng to");
  const conChao = p.locator("#p-can button[data-dong]:not([disabled])");
  if (await conChao.count()) {
    await conChao.first().click();
    await p.locator(".tam").waitFor({ timeout: 3000 });
    // chờ tấm tải xong chi tiết lô (trần chào lô ước tính 80% có thể hạ lượng mặc định)
    await p.waitForFunction(() => document.querySelector('.tam [data-r="goi-y"]')?.textContent.includes("Giá thấp nhất"), null, { timeout: 8000 });
    await p.locator('.tam input[name="gia"]').fill("24000");
    const kg = Number(await p.locator('.tam input[name="kg"]').inputValue());
    assert.equal((await p.locator(".tam [data-r=tien] b").innerText()).trim(), `${(kg * 24000).toLocaleString("vi-VN")} đ`, "thành tiền = lượng × giá");
    await kiemChung(p);
    await p.locator("#tam-gui").click();
    await p.getByText("Đã gửi chào hàng").waitFor({ timeout: 8000 });
    // Lời chào vừa gửi hiện ngay dưới nhu cầu; Sửa lời chào thay giá; Hủy chào → dòng trở lại nút Chào hàng (vẫn chào lại được)
    await p.reload(); await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 10000 });
    const the = p.locator(".the-nc").filter({ hasText: /Bác đã chào 24\.000 đ\/kg/ }).first();
    assert.match(await the.locator(".loi-cua-bac").innerText(), /Bác đã chào 24\.000 đ\/kg/, "thấy lời chào của bác ngay dưới nhu cầu");
    await the.locator("[data-sua]").click();
    await p.getByText("Sửa lời chào").first().waitFor({ timeout: 3000 });
    assert.equal(await p.locator('.tam input[name="gia"]').inputValue(), "24000", "điền sẵn giá cũ");
    await p.locator('.tam input[name="gia"]').fill("23500");
    await p.locator("#tam-gui").click();
    await p.getByText("Đã sửa lời chào").waitFor({ timeout: 10000 });
    assert.match(await p.locator(".tam .o-thanh-tien small").innerText(), /× 23\.500 đ\/kg/, "bảng xác nhận đúng giá vừa sửa");
    await p.reload(); await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 10000 });
    const the2 = p.locator(".the-nc").filter({ hasText: /Bác đã chào 23\.500 đ\/kg/ }).first();
    assert.match(await the2.locator(".loi-cua-bac").innerText(), /23\.500 đ\/kg/, "giá mới thay giá cũ");
    const soSua = await p.locator("[data-sua]").count();
    const huy = the2.locator("[data-huy]");
    await huy.click(); await p.getByText("Bấm lần nữa để hủy").waitFor({ timeout: 3000 });
    await huy.click(); await p.getByText("Bác vẫn chào lại được").waitFor({ timeout: 8000 });
    await p.waitForTimeout(1800); await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 10000 });
    assert.equal(await p.locator("[data-sua]").count(), soSua - 1, "hủy xong thì bớt một lời chào");
  } else {
    // Chạy lại trên cùng dữ liệu: mọi dòng khớp đã chào → nút phải ghi rõ lý do, không cho chào trùng
    const nhan = await p.locator("#p-can .tt-dong").allTextContents();
    assert.ok(nhan.length && nhan.every((t) => /Bác đã chào|Đang có lời chào|chưa có hàng/.test(t)), `dòng không chào được phải ghi lý do: ${nhan.join(", ")}`);
  }
  await p.screenshot({ path: `${ANH}05b-cho-chao-hang.png` });
});

await trang("cho-chi-tiet", async (p) => {
  const tk = (await (await fetch(`${GOC}/v1/test/impersonate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json()).token;
  const api = (d) => fetch(GOC + d, { headers: { authorization: "Bearer " + tk } }).then((r) => r.json());
  // Ngăn Mùa vụ: đúng số hợp đồng đặt trước / bao tiêu của bác
  await p.goto(`${GOC}/thiet-ke/ban-hang-hoa.html?thu=0918000421#vu`);
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 10000 });
  const vu = (await api("/v1/seasonal-orders")).filter((v) => v.phia === "seller");
  assert.equal(await p.locator("#ds-vu .vu").count(), vu.length, "số hợp đồng mùa vụ");
  if (vu.some((v) => v.contract_type === "offtake")) assert.ok(await p.getByText("Bao tiêu theo vụ").first().isVisible());
  if (vu.some((v) => v.contract_type === "pre_harvest")) assert.ok(await p.getByText("Đặt trước khi hái").first().isVisible());
  await kiemChung(p);
  // Thanh ngăn không dính sát header
  const cach = await p.evaluate(() => document.querySelector(".ngan").getBoundingClientRect().top - document.querySelector(".dau").getBoundingClientRect().bottom);
  assert.ok(cach >= 8, `thanh ngăn cách header ${cach}px`);
  // Chi tiết lô: giá, giấy tờ đúng backend
  await p.locator("#ngan-hang").click();
  await p.locator('.lo[data-lo="L-0412"] .dau-lo').click();
  await p.waitForURL(/ban-lo\.html\?.*thu=/);
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 10000 });
  const loL = (await api("/v1/lots?mine=true")).find((l) => l.code === "L-0412");
  const ng = await api(`/v1/lots/${loL.id}/source-profile`);
  assert.equal(await p.locator(".giay").count(), ng.giay_to.length, "số giấy tờ của lô");
  assert.match(await p.locator(".o-gia").innerText(), /giá thấp nhất · kín/);
  assert.ok(!/undefined|NaN/.test(await p.locator("#noi").innerText()));
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}05d-chi-tiet-lo.png`, fullPage: true });
  // Mỗi dòng nhu cầu hiện đúng trạng thái lời chào mới nhất của bác (quy trình B3)
  await p.goto(`${GOC}/thiet-ke/ban-hang-hoa.html?thu=0918000421#can`);
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 10000 });
  const moiNhat = new Map(); for (const c of await api("/v1/offers")) if (c.direction === "seller_quote" && c.demand_line_id && !moiNhat.has(c.demand_line_id)) moiNhat.set(c.demand_line_id, c);
  const dem = { dongY: 0, toiBac: 0, cho: 0 };
  for (const c of moiNhat.values()) if (c.status === "accepted") dem.dongY++; else if (c.status === "sent" && c.vong_cuoi.from_side === "buyer") dem.toiBac++; else if (c.status === "sent" && (c.vong_cuoi.round_no || 1) === 1) dem.cho++; else if (c.status === "sent") dem.daTraGia = (dem.daTraGia || 0) + 1;
  assert.equal(await p.locator(".loi-cua-bac.dong-y").count(), dem.dongY, "lời chào đã đồng ý");
  assert.equal(await p.locator(".loi-cua-bac.toi-bac").count(), dem.toiBac, "bên mua trả giá, tới lượt bác");
  assert.equal(await p.locator(".loi-cua-bac [data-huy]").count(), dem.cho, "chỉ lời chào chưa được trả lời mới sửa/hủy được");
  // Hai bên đã trả giá qua lại: không còn nút hủy/sửa (quy trình B3, backend 0074)
  if (dem.daTraGia) assert.ok((await p.locator(".loi-cua-bac").allInnerTexts()).some((t) => /không hủy hay sửa được nữa/.test(t)), "lời chào đã trả giá qua lại ghi rõ không hủy được");
  if (dem.dongY) assert.match(await p.locator(".loi-cua-bac.dong-y").first().innerText(), /chưa phải hợp đồng/);
  // Chi tiết nhu cầu: đơn gom, giao nhận, không mã hạng thô
  await p.goto(`${GOC}/thiet-ke/ban-hang-hoa.html?thu=0918000421#can`);
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 10000 });
  await p.locator("#ds-can .dau-nc").first().click();
  await p.waitForURL(/ban-nhu-cau\.html/);
  await p.locator('#noi[aria-busy="false"]').waitFor({ timeout: 10000 });
  const chu = await p.locator("#noi").innerText();
  assert.match(chu, /Giao nhận/); assert.ok(!/undefined|NaN|Loại L\d/.test(chu));
  if (await p.getByText("Nhận gom nhiều vườn").count()) assert.match(chu, /Đơn gom là gì/);
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}05e-chi-tiet-nhu-cau.png`, fullPage: true });
});

await trang("dang-bai-anh-cu", async (p) => {
  // Server quyết "chụp trong app": cùng một ảnh dùng cho lô thứ hai bị coi là ảnh cũ, app nhắc chụp mới
  const X = anhNgauNhien();
  const dangMot = async (kg, anh) => {
    await p.goto(`${GOC}/thiet-ke/ban-dang-bai.html?thu=0918000421`);
    await p.locator("#the-hang b").waitFor({ timeout: 8000 });
    await p.locator('#ds-loai button[data-v="L1"]').click();
    await p.locator('#cach [data-cach="go"]').click();
    await p.locator("#luong").fill(String(kg));
    await p.locator('#thuoc [data-v="khong"]').click();
    await p.locator("#tiep").click();
    await p.locator("#gia-muon").pressSequentially("22000");
    await p.locator("#tiep").click();
    await p.locator("#chup-anh").setInputFiles(anh);
    await p.locator("#luoi-anh .o").first().waitFor();
    await p.locator("#tiep").click();
    await p.locator("#tiep").click();
  };
  await dangMot(410 + (Date.now() % 50), X);
  await p.locator('[data-m="xong"]').waitFor({ state: "visible", timeout: 10000 });
  await dangMot(470 + (Date.now() % 50), X);
  await p.locator("#loi").waitFor({ state: "visible", timeout: 10000 });
  assert.match(await p.locator("#loi").innerText(), /đã có trên hệ thống[\s\S]*chụp ảnh mới/, "ảnh cũ bị nhắc chụp mới");
  assert.ok(await p.locator('[data-m="anh"]').isVisible(), "quay về bước Ảnh");
  assert.match(await p.locator("#luoi-anh").innerText(), /Ảnh cũ/);
  await kiemChung(p);
  await p.locator("#luoi-anh .xoa").first().click();
  await p.locator("#chup-anh").setInputFiles(anhNgauNhien());
  await p.locator("#luoi-anh .o").first().waitFor();
  await p.locator("#tiep").click();
  await p.locator("#tiep").click();
  await p.locator('[data-m="xong"]').waitFor({ state: "visible", timeout: 10000 });
});

await trang("hop-dong-ky-tien-can", async (p) => {
  // Vòng đời hợp đồng phía người bán qua giao diện: ký (OTP) → xác nhận nhận tiền (OTP) → đồng ý kết quả cân (PIN).
  // Dùng 3 tình huống demo; tình huống đã dùng thì dựng lại bằng script demo (lệnh nghiệp vụ thật).
  const G = "http://127.0.0.1:18980";
  const { execFileSync } = await import("node:child_process");
  const dungLai = (so) => execFileSync("npx", ["tsx", "scripts/demo-10-so.ts", so], { cwd: new URL("../../backend/", import.meta.url).pathname, env: { ...process.env, API_ORIGIN: G, DEMO_TUA_GIO: "1" }, stdio: "pipe", timeout: 120000 });
  const dn = async (sdt) => (await (await fetch(G + "/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt }) })).json()).token;
  const tim = async (sdt, so, dk) => {
    for (let lan = 0; lan < 2; lan++) {
      const t = await dn(sdt);
      for (const o of await (await fetch(G + "/v1/orders", { headers: { authorization: "Bearer " + t } })).json()) {
        const ct = await (await fetch(`${G}/v1/orders/${o.id}`, { headers: { authorization: "Bearer " + t } })).json();
        const tien = await (await fetch(`${G}/v1/orders/${o.id}/money`, { headers: { authorization: "Bearer " + t } })).json();
        if (await dk(ct, tien, t)) return { o, ct, tien, t };
      }
      dungLai(so);
    }
    assert.fail("không dựng được tình huống " + so);
  };
  const mo = async (sdt, id) => { await p.goto(`${GOC}/thiet-ke/ban-don.html?id=${id}&thu=${sdt}`); await p.reload(); await p.locator(".hd-viec h2").waitFor({ timeout: 10000 }); };

  // 1. Ký hợp đồng
  const a = await tim("0939000120", "0002", (ct) => ct.hanh_dong?.includes("sign"));
  await mo("0939000120", a.o.id);
  assert.match(await p.locator(".hd-viec").innerText(), /Bác cần ký hợp đồng[\s\S]*Hạn/);
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}15-hop-dong-cho-ky.png`, fullPage: true });
  await p.locator("#viec-chinh").click();
  assert.ok(await p.locator('[data-r="tiep"]').isDisabled(), "chưa tích cam kết thì chưa gửi mã");
  await p.locator('[data-r="cam-ket"]').check();
  await p.locator('[data-r="tiep"]').click();
  await p.locator('[data-r="otp"]').waitFor({ state: "visible" });
  await p.locator('[data-r="otp"]').fill("123456");
  await p.locator('[data-r="tiep"]').click();
  await p.getByText("Bác đã ký").waitFor({ timeout: 10000 });
  const sauKy = await (await fetch(`${G}/v1/orders/${a.o.id}`, { headers: { authorization: "Bearer " + a.t } })).json();
  assert.ok(!sauKy.hanh_dong?.includes("sign") && sauKy.status !== "awaiting_seller", "đơn đã qua bước người bán ký: " + sauKy.status);

  // 2. Kiểm tiền: nhận thiếu một phần → mở lại chỉ còn phần mới → nhận nốt (Codex rà #1: báo nhiều lần cộng dồn)
  const b = await tim("0988000770", "0003", (ct, tien) => (tien.khoan_tra_thang || []).some((k) => k.status === "payer_reported" && Number(k.confirmed_vnd) === 0));
  const k0 = b.tien.khoan_tra_thang.find((k) => k.status === "payer_reported");
  const baoVnd = Number(k0.reported_vnd), lan1 = 10000000;
  await mo("0988000770", b.o.id);
  await p.locator("#viec-chinh").click();
  assert.match(await p.locator(".hd-tam").innerText(), /Mở app ngân hàng xem số dư/, "nhắc không tin ảnh chụp chuyển khoản");
  await kiemChung(p);
  await p.locator('[data-r="du"]').click();
  await p.getByText(/chép mã giao dịch/).waitFor();
  assert.ok(await p.locator('[data-r="otp"]').isHidden(), "chưa có mã giao dịch thì chưa gửi OTP");
  await p.locator('[data-cach="cash"]').click();
  await p.locator('[data-r="du"]').click();
  await p.getByText(/ảnh giấy biên nhận/).first().waitFor();
  await p.locator('[data-cach="bank_transfer"]').click();
  await p.locator('[data-r="ma-gd"]').fill("FT" + Date.now());
  await p.locator('[data-r="thieu"]').click();
  await p.locator('[data-r="so"]').fill(String(lan1));
  await p.locator('[data-r="gui"]').click();
  await p.locator('[data-r="otp"]').waitFor({ state: "visible" });
  await p.locator('[data-r="otp"]').fill("123456");
  await p.locator('[data-r="xac"]').click();
  await p.getByText(/Đã ghi nhận bác nhận .* Khoản này còn thiếu/).waitFor({ timeout: 10000 });
  let k1 = (await (await fetch(`${G}/v1/orders/${b.o.id}/payments`, { headers: { authorization: "Bearer " + b.t } })).json()).find((k) => k.id === k0.id);
  assert.equal(Number(k1.confirmed_vnd), lan1, "đã xác nhận đúng phần nhận thiếu");
  await p.locator("#viec-chinh").click();
  const tam2 = await p.locator(".hd-tam").innerText();
  assert.match(tam2, new RegExp(`chuyển thêm ${(baoVnd - lan1).toLocaleString("vi-VN").replace(/\./g, "\\.")}`), "mở lại chỉ còn phần mới: " + tam2.slice(0, 80));
  await p.locator('[data-r="ma-gd"]').fill("FT" + (Date.now() + 1));
  await p.locator('[data-r="du"]').click();
  await p.locator('[data-r="otp"]').waitFor({ state: "visible" });
  await p.locator('[data-r="otp"]').fill("123456");
  await p.locator('[data-r="xac"]').click();
  await p.getByText(/nhận đủ khoản/).waitFor({ timeout: 10000 });
  k1 = (await (await fetch(`${G}/v1/orders/${b.o.id}/payments`, { headers: { authorization: "Bearer " + b.t } })).json()).find((k) => k.id === k0.id);
  assert.equal(Number(k1.confirmed_vnd), baoVnd, "tổng xác nhận đúng bằng số bên mua báo");

  // 3. Kết quả cân: đồng ý và ký biên bản bằng PIN
  const c = await tim("0939000160", "0004", (ct) => ct.dot_giao?.some((d) => d.status === "awaiting_seller"));
  await mo("0939000160", c.o.id);
  await p.locator("#viec-chinh").click();
  const tam = await p.locator(".hd-tam").innerText();
  assert.match(tam, /Hạ cấp[\s\S]*Trầy vỏ[\s\S]*Trả lại[\s\S]*Dập/, "hiện đủ 3 phần kèm lý do tiếng Việt");
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}16-ket-qua-can.png` });
  await p.locator('[data-r="dong-y"]').click();
  await p.locator('[data-r="pin"]').fill("12");
  await p.locator('[data-r="chinh"]').click();
  await p.getByText("Bác nhập đủ 4 số PIN.").waitFor();
  await p.locator('[data-r="pin"]').fill("2468");
  await p.locator('[data-r="chinh"]').click();
  // Trả khi nhận tại vườn: bên mua chưa chuyển phần còn lại thì chưa ký được, hàng chưa rời vườn
  await p.getByText(/trước khi hàng rời vườn/).waitFor({ timeout: 10000 });
  await kiemChung(p);
  // Báo dòng hạ cấp không đúng → gửi phản đối thật (lần chạy trước đã phản đối thì tình huống demo giữ nguyên: bỏ qua bước này)
  const daPhanDoi = (await (await fetch(`${G}/v1/deliveries/${c.ct.dot_giao.find((d) => d.status === "awaiting_seller").id}`, { headers: { authorization: "Bearer " + c.t } })).json()).ket_qua.at(-1).lines.some((x) => x.status === "disputed");
  if (!daPhanDoi) {
  await p.keyboard.press("Escape");
  await p.locator("#viec-chinh").click();
  await p.locator('[data-r="sai"]').click();
  await p.locator('[data-r="ly"]').fill("Trái chỉ trầy nhẹ ngoài vỏ, ruột vẫn đạt loại 1");
  await p.locator('[data-r="pin"]').fill("2468");
  await p.locator('[data-r="chinh"]').click();
  await p.getByText(/Đã gửi phản đối dòng cân/).waitFor({ timeout: 10000 });
  const dv = await (await fetch(`${G}/v1/deliveries/${c.ct.dot_giao.find((d) => d.status === "awaiting_seller").id}`, { headers: { authorization: "Bearer " + c.t } })).json();
  assert.ok(dv.ket_qua.at(-1).lines.some((x) => x.status === "disputed") || dv.status !== "awaiting_seller", "dòng bị phản đối được ghi nhận");
  }

  // 4. Bàn giao tại vườn: người nhận bên mua mở mã 6 số trên app của họ, bác nhập để bắt đầu cân
  const g = await tim("0918000421", "0008", (ct) => ct.dot_giao?.some((d) => d.status === "ready"));
  const dotG = g.ct.dot_giao.find((d) => d.status === "ready");
  const tNhan = await dn("0903000411");
  const ma = await (await fetch(`${G}/v1/deliveries/${dotG.id}/receipt-qr`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tNhan }, body: JSON.stringify({ idempotency_key: crypto.randomUUID() }) })).json();
  const ma6 = (ma.data || ma).ma_6_so;
  assert.match(String(ma6), /^\d{6}$/, "người nhận có mã 6 số");
  await mo("0918000421", g.o.id);
  assert.match(await p.locator(".hd-viec").innerText(), /nhập mã 6 số/);
  await p.locator("#viec-chinh").click();
  await kiemChung(p);
  await p.locator('[data-r="ma6"]').fill(ma6 === "000000" ? "111111" : "000000");
  await p.locator('[data-r="tiep"]').click();
  await p.getByText(/Mã không đúng đợt này|Mã 6 số không đúng/).waitFor({ timeout: 8000 });
  await p.locator('[data-r="ma6"]').fill(ma6);
  await p.locator('[data-r="tiep"]').click();
  await p.getByText(/Đã mở bước cân/).waitFor({ timeout: 10000 });
  const sauBg = await (await fetch(`${G}/v1/deliveries/${dotG.id}`, { headers: { authorization: "Bearer " + g.t } })).json();
  assert.equal(sauBg.status, "checking", "đợt chuyển sang đang cân");

  // Danh sách hợp đồng
  await p.goto(`${GOC}/thiet-ke/ban-hop-dong.html?thu=0939000160`);
  await p.locator(".the-hd").first().waitFor();
  assert.match(await p.locator(".the-hd").first().getAttribute("href"), /ban-don\.html\?id=.*thu=/, "thẻ mở chi tiết, giữ tài khoản thử");
  await kiemChung(p);
}, /Failed to load resource: the server responded with a status of (409|4\d\d)/);   // 409 luật chưa đủ tiền trước bốc, 4xx mã 6 số sai: cố ý kiểm

await trang("tin-nhan-tra-loi", async (p) => {
  // Luồng chào giá B3 thật: bên mua chào → bác trả giá → bên mua trả lại → bác đồng ý (giữ hàng, chưa phải hợp đồng); lời chào khác → không bán
  const G = "http://127.0.0.1:18980";
  const dn = async (sdt) => (await (await fetch(G + "/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sdt }) })).json()).token;
  const tBan = await dn("0918000421"), tMua = await dn("0938000610");
  const api = (t) => ({ get: async (d) => (await fetch(G + d, { headers: { authorization: "Bearer " + t } })).json(),
    post: async (d, b) => (await fetch(G + d, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + t }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...b }) })).json() });
  const ban = api(tBan), mua = api(tMua);
  const lo = await ban.get("/v1/lots?mine=true");
  const daDung = new Set();
  const moChao = async () => {
    for (const l of lo.filter((x) => x.status === "on_sale" && !daDung.has(x.id))) {
      daDung.add(l.id);
      const g = Number((await ban.get(`/v1/lots/${l.id}`)).floor_price_vnd || 20000) + 500;
      const j = await mua.post("/v1/offers", { direction: "buyer_bid", lot_id: l.id, qty_g: "100000", price_vnd: String(g) });
      if (j.id) return [j.id, g];
    }
    assert.fail("không còn lô nào tạo được lời chào mới");
  };
  const [id1, g1] = await moChao();
  const mo = async (id) => { await p.goto(`${GOC}/thiet-ke/ban-tin-nhan.html?thu=0918000421#chao=${id}`); await p.reload(); await p.locator(".tam-lc .day button").first().waitFor({ timeout: 10000 }); };
  await mo(id1);
  assert.match(await p.locator(".tam-lc").innerText(), /Tư Hùng chào giá[\s\S]*Tới lượt bác/);
  assert.equal(await p.locator('.tam-lc [data-r="dong-y"]').count(), 1, "có nút Đồng ý");
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}11b-loi-chao.png` });
  await p.locator('.tam-lc [data-r="tra-gia"]').click();
  await p.locator('.tam-lc [name="gia"]').fill(String(g1 + 2000));
  await p.locator('.tam-lc [data-r="gui-gia"]').click();
  await p.getByText("Đã gửi giá").waitFor({ timeout: 8000 });
  await mua.post(`/v1/offers/${id1}/counter`, { price_vnd: String(g1 + 1000) });
  await mo(id1);
  assert.match(await p.locator(".tam-lc").innerText(), /còn 1 lần trả giá/, "đã trả giá 1 lần → còn 1 lượt");
  assert.equal(await p.locator(".tam-lc .vong p").count(), 3, "lịch sử 3 vòng");
  await p.locator('.tam-lc [data-r="dong-y"]').click();
  assert.match(await p.locator(".tam-lc").innerText(), /chưa phải hợp đồng/, "nhắc chưa phải hợp đồng trước khi chốt");
  await p.locator('.tam-lc [data-r="chot"]').click();
  await p.getByText("Đã đồng ý giá").first().waitFor({ timeout: 8000 });
  const ct1 = await ban.get(`/v1/offers/${id1}`);
  assert.equal(ct1.status, "accepted"); assert.equal(ct1.hold?.status, "active", "hàng đang được giữ");
  await mo(id1);
  assert.match(await p.locator(".tam-lc").innerText(), /Đây chưa phải hợp đồng/);
  await kiemChung(p);
  // Lời chào khác → Không bán (bấm 2 lần)
  const [id2] = await moChao();
  await mo(id2);
  await p.locator('.tam-lc [data-r="khong-ban"]').click();
  await p.getByText("Bấm lần nữa để xác nhận").waitFor({ timeout: 3000 });
  await p.locator('.tam-lc [data-r="khong-ban"]').click();
  await p.getByText("Đã từ chối").waitFor({ timeout: 8000 });
  assert.equal((await ban.get(`/v1/offers/${id2}`)).status, "rejected");
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
  // Cách 1 · Nói: app hỏi từng câu; máy thử không có mic nên gõ câu trả lời (cùng đường AI bóc trường)
  const kg = 300 + (Date.now() % 600);
  await p.goto(`${GOC}/thiet-ke/ban-dang-bai.html?thu=0918000421`);
  await p.locator("#the-hang b").waitFor({ timeout: 8000 });
  assert.match(await p.locator("#the-hang").innerText(), /Xoài cát Chu/, "mặt hàng của hộ điền sẵn");
  assert.ok(await p.locator('#cach [data-cach="go"]').isDisabled(), "chưa chọn loại thì Điền thông tin chờ");
  await p.locator('#cach [data-cach="noi"]').click();
  await p.locator('#nhanh button[data-v="L1"]').click();
  await p.locator("#go-cau").fill(`${kg} ký đã cân, có hàng ngay, muốn hai mươi bảy ngàn một ký`);
  await p.locator("#go-form button").click();
  await p.locator("#hieu dl").waitFor({ timeout: 10000 });
  assert.match(await p.locator("#hieu").innerText(), new RegExp(`${kg} kg · đã cân`), "bóc đúng lượng đã cân");
  await kiemChung(p);
  await p.locator("#tiep").click();
  assert.match(await p.locator("#cau-hoi").innerText(), /xịt thêm/, "luôn hỏi xịt thuốc thêm ngoài nhật ký");
  await p.locator('#nhanh button[data-v="khong"]').click();
  assert.match(await p.locator("#cau-hoi").innerText(), /24\.300/, "nói gộp → tới thẳng câu giá kín 90%");
  await p.locator("#go-cau").fill("thấp nhất hai mươi bốn ngàn");
  await p.locator("#go-form button").click();
  await p.locator("#hieu dl").waitFor({ timeout: 10000 });
  await p.locator("#tiep").click();
  await p.locator('[data-m="anh"]').waitFor({ state: "visible" });
  await p.locator("#chon-anh").setInputFiles(new URL("../assets/products/xoai-cat-chu.jpg", import.meta.url).pathname);
  await p.locator("#luoi-anh .o").first().waitFor();
  assert.ok(await p.locator("#tiep").isDisabled(), "chỉ ảnh có sẵn thì chưa đăng được");
  await p.locator("#chup-anh").setInputFiles(anhNgauNhien());
  await p.waitForFunction(() => document.querySelectorAll("#luoi-anh .o").length === 2);
  await kiemChung(p);
  await p.locator("#tiep").click();
  assert.match(await p.locator("#chi-bac").innerText(), /24\.000/, "giá kín bác nói được dùng");
  await kiemChung(p);
  await p.locator("#tiep").click();
  await p.locator('[data-m="xong"]').waitFor({ state: "visible", timeout: 10000 });
  const t = (await (await fetch("http://127.0.0.1:18980/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json()).token;
  const lo = (await (await fetch("http://127.0.0.1:18980/v1/lots?mine=true", { headers: { authorization: "Bearer " + t } })).json()).find((l) => l.declared_qty_g === String(kg * 1000));
  assert.ok(lo, "lô mới phải có trên backend");
  assert.equal(lo.status, "on_sale", "lô phải được đăng (đang bán), không kẹt nháp");
  const ct = await (await fetch(`http://127.0.0.1:18980/v1/lots/${lo.id}`, { headers: { authorization: "Bearer " + t } })).json();
  assert.equal(ct.photos?.filter((x) => x.captured_in_app).length, 1, "chỉ ảnh chụp ngay mới được đánh dấu chụp trong app");
});

await trang("dang-bai-nhat-ky", async (p) => {
  // Cách 2 · Từ nhật ký: điền sẵn lần hái gần nhất, mặc định ước chừng, ghi nguồn
  await p.goto(`${GOC}/thiet-ke/ban-dang-bai.html?thu=0918000421`);
  await p.locator("#the-hang b").waitFor({ timeout: 8000 });
  await p.locator('#ds-loai button[data-v="L1"]').click();
  await p.locator('#cach [data-cach="nk"]').click();
  await p.locator("#nk-tom .dong-nk").first().waitFor();
  assert.match(await p.locator("#nk-tom").innerText(), /hết cách ly/i);
  await p.locator('#nk-tinh [data-v="da-hai"]').click();
  await kiemChung(p);
  await p.locator("#tiep").click();
  assert.ok(Number(await p.locator("#luong").inputValue()) > 0, "lượng lấy từ nhật ký");
  assert.ok(await p.locator("#ng-luong").isVisible(), "ghi nguồn nhật ký cạnh lượng");
  assert.equal(await p.locator('#co-so [data-v="estimated"]').getAttribute("aria-pressed"), "true", "lượng từ nhật ký mặc định ước chừng");
  await kiemChung(p);
});

await trang("dang-bai-truoc-mua", async (p) => {
  // Cách 3 · Điền thông tin, đăng trước mùa (brief D10): lô "sắp có hàng", gửi kèm ngày hết cách ly
  const kg = 900 + (Date.now() % 90);
  await p.goto(`${GOC}/thiet-ke/ban-dang-bai.html?thu=0918000421`);
  await p.locator("#the-hang b").waitFor({ timeout: 8000 });
  await p.locator('#ds-loai button[data-v="L1"]').click();
  assert.ok(!/Loại L\d/.test(await p.locator("#ds-loai").innerText()), "tên loại không còn mã thô");
  await p.locator('#cach [data-cach="go"]').click();
  await p.locator("#luong").fill(String(kg));
  await p.locator("#ngay-hai").fill("2026-07-01");
  await p.waitForFunction(() => /cách ly/.test(document.querySelector("#cach-ly")?.textContent || ""), null, { timeout: 8000 });
  assert.ok(await p.locator("#tiep").isDisabled(), "ngày hái trước ngày hết cách ly thuốc phải bị chặn");
  await p.locator("#ngay-hai").fill("2026-11-20");
  await p.locator('#khi-co button[data-v="sap"]').click();
  assert.ok(await p.locator("#tiep").isDisabled(), "sắp có hàng phải chọn ngày");
  await p.locator("#ngay-co").fill("2026-11-25");
  assert.ok(await p.locator("#tiep").isDisabled(), "chưa trả lời xịt thuốc thêm thì chưa đi tiếp");
  await p.locator('#thuoc [data-v="co"]').click();
  assert.ok(await p.locator("#thuoc-chan").isVisible() && await p.locator("#tiep").isDisabled(), "có xịt thêm → chặn, nhắc ghi nhật ký");
  await p.locator('#thuoc [data-v="khong"]').click();
  await kiemChung(p);
  await p.locator("#tiep").click();
  await p.locator("#gia-muon").pressSequentially("26000");
  assert.equal(await p.locator("#gia-san").inputValue(), "23.400", "giá thấp nhất tự điền 90%");
  await p.locator("#gia-san").fill(""); await p.locator("#gia-san").pressSequentially("28000");
  assert.ok(await p.locator("#tiep").isDisabled(), "giá thấp nhất > giá mong muốn phải bị chặn");
  await p.locator("#gia-san").fill(""); await p.locator("#gia-san").pressSequentially("23400");
  await kiemChung(p);
  await p.locator("#tiep").click();
  await p.locator("#chup-anh").setInputFiles(anhNgauNhien());
  await p.locator("#luoi-anh .o").first().waitFor();
  await p.locator("#tiep").click();
  assert.ok(!/23\.400/.test(await p.locator("#xem-lai").innerText()), "bên mua không thấy giá thấp nhất");
  await kiemChung(p);
  await p.locator("#tiep").click();
  await p.locator('[data-m="xong"]').waitFor({ state: "visible", timeout: 10000 });
  assert.match(await p.locator("#xong-tieu").innerText(), /trước mùa/);
  await p.locator("#so-ben-mua").waitFor({ state: "visible", timeout: 8000 });
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}07-dang-truoc-mua.png`, fullPage: true });
  const t = (await (await fetch("http://127.0.0.1:18980/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json()).token;
  const lo = (await (await fetch("http://127.0.0.1:18980/v1/lots?mine=true", { headers: { authorization: "Bearer " + t } })).json()).find((l) => l.declared_qty_g === String(kg * 1000));
  assert.ok(lo, "lô trước mùa phải có trên backend");
  assert.equal(lo.status, "upcoming", "đăng trước mùa → lô sắp có hàng");
  const ct = await (await fetch(`http://127.0.0.1:18980/v1/lots/${lo.id}`, { headers: { authorization: "Bearer " + t } })).json();
  assert.equal(ct.available_from, "2026-11-25", "ngày có hàng lưu đúng");
  assert.ok(ct.spray_clear_on, "ngày hết cách ly gửi kèm cho backend");
});

await trang("tin-nhan-thong-bao", async (p) => {
  // Trước khi xem: chuông có chấm mới; xem xong quay về Trang chủ: hết chấm
  await p.goto(`${GOC}/thiet-ke/ban-hom-nay.html?thu=0918000421`);
  await p.locator(".hd-gon").first().waitFor({ timeout: 8000 });
  // Chấm chuông theo đúng dữ liệu backend: có thông báo (bộ gửi chạy 30 s/lần nên stack vừa khởi động có thể chưa có) thì có chấm
  const tk = (await (await fetch(`${GOC}/v1/test/impersonate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json()).token;
  const demTb = async () => (await (await fetch(`${GOC}/v1/notifications?limit=50`, { headers: { authorization: "Bearer " + tk } })).json()).length;
  // Stack vừa khởi động: bộ gửi thông báo chạy 30 s/lần → chờ tới khi backend có thông báo rồi tải lại
  let soTb = await demTb();
  for (let i = 0; !soTb && i < 20; i++) { await p.waitForTimeout(2000); soTb = await demTb(); }
  assert.ok(soTb > 0, "backend chưa có thông báo nào sau 40 s");
  await p.reload(); await p.locator(".hd-gon").first().waitFor({ timeout: 8000 });
  await p.locator('#dau a[href*="#thong-bao"] .cham-moi').waitFor({ timeout: 8000 }).catch(() => {});
  assert.equal(await p.locator('#dau a[href*="#thong-bao"] .cham-moi').count(), 1, `chưa xem thì chuông có chấm (backend có ${soTb} thông báo)`);
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
  await p.locator("#the-hang b").waitFor({ timeout: 8000 });
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

// Để cuối: ghi phun thuốc làm vườn chị Năm vào cách ly (các bài đăng bán "có hàng ngay" phải chạy trước)
await trang("vuon-nhat-ky", async (p) => {
  // Sổ vườn: ghi phun thuốc → server tính ngày hết cách ly; sửa dòng cần lý do (dòng cũ vẫn trong lịch sử)
  const G = "http://127.0.0.1:18980";
  await p.goto(`${GOC}/thiet-ke/ban-vuon.html?thu=0918000421`);
  await p.locator(".vu-vuon").first().waitFor({ timeout: 8000 });
  assert.match(await p.locator(".vu-cac-vuon").innerText(), /cách ly/, "thẻ vườn có tình trạng cách ly");
  assert.ok(await p.locator(".vu-dong").count() > 0, "có nhật ký mẫu");
  await kiemChung(p);
  await p.screenshot({ path: `${ANH}17-vuon-nhat-ky.png`, fullPage: true });
  await p.locator("#ghi").click();
  await p.locator('[data-viec="spray"]').click();
  await p.locator("#g-ten-thuoc").fill("Thuốc thử E2E");
  await p.locator("#g-ghi").fill("Phun khu A, 2 bình");
  await p.locator("#g-luu").click();
  await p.getByText(/số ngày cách ly/).first().waitFor();
  await p.locator("#g-cach-ly").fill("5");
  assert.match(await p.locator("#g-duoc-hai").innerText(), /Được hái bán từ/);
  await kiemChung(p);
  await p.locator("#g-luu").click();
  await p.getByText(/Đã ghi\. Vườn được hái bán từ/).waitFor({ timeout: 10000 });
  const t = (await (await fetch(G + "/v1/test/impersonate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "0918000421" }) })).json()).token;
  const nk = await (await fetch(G + "/v1/farm-diary", { headers: { authorization: "Bearer " + t } })).json();
  const moi = nk.viec.find((v) => v.medicine_name === "Thuốc thử E2E");
  assert.ok(moi && moi.withdrawal_days === 5, "server lưu đúng thuốc + 5 ngày cách ly");
  // Sửa dòng vừa ghi
  await p.locator(`[data-sua="${moi.id}"]`).click();
  await p.locator("#g-ghi").fill("Phun khu B, 2 bình");
  await p.locator("#g-luu").click();
  await p.getByText("Bác ghi lý do sửa.").waitFor();
  await p.locator("#g-ly-do").fill("Ghi nhầm khu");
  await p.locator("#g-luu").click();
  await p.getByText(/Đã sửa/).waitFor({ timeout: 10000 });
  const nk2 = await (await fetch(G + "/v1/farm-diary", { headers: { authorization: "Bearer " + t } })).json();
  assert.ok(nk2.viec.some((v) => v.supersedes_id === moi.id && /khu B/.test(v.note)), "dòng sửa thay dòng cũ");
});

await browser.close();
for (const [t, k] of ketQua) console.log(k.startsWith("ĐẠT") ? "✔" : "✖", t, k === "ĐẠT" ? "" : k);
const dat = ketQua.filter(([, k]) => k === "ĐẠT").length;
console.log(`${dat}/${ketQua.length} đạt · ảnh: docs/frontend/anh-thiet-ke/`);
if (dat !== ketQua.length) process.exitCode = 1;
