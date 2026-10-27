// Luồng chính đầu-cuối trên giao diện thật (chuyển từ bản audit docs/doi-chieu/bang-chung/scripts/e2e-v2.mjs).
import { choose, signedIn, skipGuides, press, horizontalOverflow } from './ui-controls.mjs';
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")(
  "playwright",
);
const origin = process.env.FRONTEND_URL || "http://127.0.0.1:8090";
const base = process.env.API_ORIGIN;
if(base!=="http://127.0.0.1:18980" || process.env.FRONTEND_URL!=="http://127.0.0.1:18990") throw Error("Chỉ chạy trên cặp dịch vụ cô lập 18980/18990; không reset hệ thống đang chạy.");
const dir = process.env.E2E_SHOT_DIR || "/tmp/agv-e2e-anh/";
await mkdir(dir, { recursive: true });
const results = [],
  errors = [],
  shots = [];
let active;
async function api(path, body, token) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  assert.ok(r.ok, JSON.stringify(data));
  return data;
}
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
async function page(role, width) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
  });
  await skipGuides(context);
  const p = await context.newPage();
  p.setDefaultTimeout(10000);
  p.role = role;
  p.on("pageerror", (err) => errors.push({ role, message: err.message }));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push({ role, message: m.text() });
  });
  return p;
}
async function settle(p) {
  await p.waitForFunction(() => {
    const app = document.getElementById('app');
    return app?.dataset.renderedRoute === location.hash && app.getAttribute('aria-busy') !== 'true';
  });
  await p.locator("[aria-busy=true]").waitFor({ state: "hidden" });
  await p.locator(".skeleton").waitFor({ state: "hidden" });
  if (await p.locator("[role=alert]").count())
    throw new Error(await p.locator("[role=alert]").innerText());
}
async function go(p, path) {
  active = p;
  const url = `${origin}/${p.role}/#/${path}`;
  if (p.url() === url) await p.reload();
  else await p.goto(url);
  await p.locator("h1").waitFor();
  await settle(p);
}
// Ngân hàng mô phỏng / đồng hồ / vận hành đứng ngoài app bán và app mua: gọi thẳng API thử.
async function nganHangNhanCoc(order, token) {
  const d = await api(`/v1/orders/${order}/deposit-instruction`, undefined, token);
  await api("/v1/sim/bank/transfers", { payment_ref: d.payment_ref, amount_vnd: d.total_vnd });
  await api("/v1/sim/bank/deliver", {});
}
async function datGioGiao(order, token) {
  const o = await api("/v1/orders/" + order, undefined, token);
  const id = o.dot_hien_hanh_id || o.dot_giao[0].id;
  const d = await api("/v1/deliveries/" + id, undefined, token);
  await api("/v1/test/clock", { set: d.window_from });
}
async function nganHangXuLyLenh() {
  await api("/v1/sim/bank/process-instructions", {});
  await api("/v1/sim/bank/deliver", {});
}
async function vanHanhDoiSoat() {
  const { token } = await api("/v1/test/impersonate", { phone: "0901000005" });
  await api("/v1/ops/reconcile", { idempotency_key: crypto.randomUUID() }, token);
}
async function shot(p, name) {
  await settle(p);
  await p.locator("body").evaluate(() => document.fonts.ready);
  const overflow = await p.evaluate(
    () => document.body.dataset.app==='ban' ? document.querySelector('#app').scrollWidth > document.querySelector('#app').clientWidth : document.documentElement.scrollWidth > window.innerWidth,
  );
  assert.equal(overflow, false, "Tràn ngang ở " + name);
  // Dải môi trường thử chỉ còn ở quản trị (yêu cầu 27/10).
  assert.equal(await p.locator(".test-strip").count(), p.role === "quan-tri" ? 1 : 0);
  const text = await p.locator("#content").innerText();
  assert.doesNotMatch(
    text,
    /mô phỏng|idempotency|expected_revision|undefined|\bNaN\b/i,
  );
  const file = `${p.role}-${String(shots.length + 1).padStart(2, "0")}-${name}.png`;
  await p.screenshot({ path: dir + file, fullPage: p.role !== "ban" });
  shots.push({ role: p.role, name, file, width: p.viewportSize().width });
}
async function submit(p, form) {
  const target = p.locator(`form[data-form="${form}"]`);
  await press(target.locator("button:not([type=button])"));
  await settle(p);
}
async function click(p, name) {
  await press(p.getByRole("button", { name, exact: true }));
  await settle(p);
}
async function login(p, phone) {
  await go(p, "home");
  await shot(p, "dang-nhap");
  await p.locator('form[data-form=loginPhone] input[name=phone]').fill(phone);
  await submit(p, "loginPhone");
  await shot(p, "otp-dang-nhap");
  await nhapMa(p, "loginOtp", "123456");
  await signedIn(p,p.role);
}
// Ô mã 6 số tự gửi khi đủ số; ô thường thì bấm nút như cũ.
async function nhapMa(p, form, code, chon = "[name=code]") {
  const f = p.locator(`form[data-form="${form}"]`);
  const tuGui = await f.locator(".otp-that").count();
  await f.locator(chon).fill(code);
  if (tuGui) { await f.waitFor({ state: "detached", timeout: 20000 }); await settle(p); }
  else await submit(p, form);
}
async function sign(p) {
  await p.locator("[name=commitment]").check();
  await submit(p, p.role === "ban" ? "chuanBiKy" : "prepareSign");
  await shot(p, "otp-ky");
  await nhapMa(p, p.role === "ban" ? "ky" : "sign", "123456");
}
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log("ĐẠT", name);
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
    if (active)
      await active.screenshot({ path: dir + "LOI.png", fullPage: active.role !== "ban" });
    throw err;
  }
}
try {
  await api("/v1/test/reset", {});
  const s = await page("ban", 390),
    b = await page("mua", 1280);
  active = s;
  await step("Đăng nhập OTP hai app", async () => {
    await login(s, "0918000421");
    await login(b, "0909000213");
    await shot(s, "hom-nay");
    await shot(b, "tong-quan");
  });
  let lot, offer, order, detail, payment;
  const buyerSession = async () =>
    JSON.parse(
      await b.evaluate(() => sessionStorage.getItem("agv-session-mua")),
    ).token;
  await step("Chọn nguồn và gửi chào mua bằng giao diện", async () => {
    await go(b, "lots");
    await shot(b, "nguon-hang");
    const card = b.locator("article").filter({ hasText: "L-0412" });
    await card.getByRole("link", { name: "Xem lô" }).click();
    await settle(b);
    await shot(b, "chi-tiet-lo");
    lot = await b.evaluate(() => location.hash.split("/")[2]);
    await go(b, "bid/" + lot);
    await b.locator("[name=qty]").fill("2000");
    await b.locator("[name=price]").fill("23000");
    await shot(b, "chao-mua");
    await submit(b, "bid");
    await b.getByRole("heading", { name: "Lời chào giá" }).waitFor();
    offer = await b.evaluate(() => location.hash.split("/")[2]);
    await shot(b, "loi-chao-da-gui");
  });
  await step("Người bán đồng ý lời chào", async () => {
    await go(s, "offers/" + offer);
    await shot(s, "loi-chao");
    await click(s, "Đồng ý giá này");
    await shot(s, "dong-y-gia");
  });
  await step("Lập hợp đồng và ký phía mua", async () => {
    await go(b, "create-order/" + offer);
    for(const [n,v] of Object.entries({mode:"at_farm",site:"tai_vuon",transport:"buyer",timing:"before_loading"})) await choose(b,"[name="+n+"]",v);
    await b.locator("[name=downgrade]").fill("15000");
    await b.locator("[name=from]").fill("2026-11-04T06:00");
    await b.locator("[name=to]").fill("2026-11-04T12:00");
    await shot(b, "lap-hop-dong");
    await submit(b, "createOrder");
    await b.getByRole("heading", { name: /^HD-/ }).waitFor();
    order = await b.evaluate(() => location.hash.split("/")[2]);
    await shot(b, "thoa-thuan");
    await click(b, "Xem PDF hợp đồng");
    await b.locator("iframe").waitFor();
    const pdf = await b.locator("iframe").getAttribute("src");
    assert.match(pdf, /^blob:/);
    const pdfCheck = await b.evaluate(async (url) => {
      const data = new Uint8Array(await (await fetch(url)).arrayBuffer());
      return {
        header: new TextDecoder().decode(data.slice(0, 5)),
        length: data.length,
      };
    }, pdf);
    assert.equal(pdfCheck.header, "%PDF-");
    assert.ok(pdfCheck.length > 1000);
    await shot(b, "pdf-hop-dong");
    await sign(b);
    detail = await api("/v1/orders/" + order, undefined, await buyerSession());
    assert.equal(detail.status, "awaiting_seller");
  });
  await step("Người bán ký OTP và xem cọc", async () => {
    await go(s, "order/" + order + "/terms");
    await shot(s, "thoa-thuan");
    await sign(s);
    await go(s, `order/${order}/deposit`);
    await shot(s, "cho-coc");
  });
  await step("Ngân hàng xác nhận cọc qua công cụ thử", async () => {
    await go(b, `order/${order}/deposit`);
    await shot(b, "chuyen-coc");
    await nganHangNhanCoc(order, await buyerSession());
    detail = await api("/v1/orders/" + order, undefined, await buyerSession());
    assert.equal(detail.status, "active");
    await go(s, `order/${order}/deposit`);
    await shot(s, "coc-dang-giu");
  });
  await step(
    "Bên mua báo chuyển tiền với chứng từ thật đã tải lên",
    async () => {
      await go(b, `order/${order}/payments`);
      const token = await buyerSession();
      const list = await api(`/v1/orders/${order}/payments`, undefined, token);
      payment = list.find((p) => p.kind === "goods_before_loading");
      assert.equal(payment.amount_due_vnd, "32200000");
      await b
        .locator("details.rule summary", { hasText: "Ghi số tiền đã chuyển" })
        .click();
      await b.locator("[name=amount]").fill(payment.amount_due_vnd);
      await b
        .locator("[name=evidence]")
        .setInputFiles(
          new URL(
            "../tham-khao/thiet-ke-so-lam-an/assets/anh/mango.jpg",
            import.meta.url,
          ).pathname,
        );
      await shot(b, "bao-tra-thang");
      await submit(b, "report-" + payment.id);
      await shot(b, "da-bao-tra");
    },
  );
  await step(
    "Người bán kiểm tra tiền rồi xác nhận OTP gắn số tiền",
    async () => {
      await go(s, `order/${order}/payments`);
      await press(s.locator(`[data-action="du-${payment.id}"]`));await settle(s);
      await s.locator("[name=ref]").fill("AGV-AO-UI-0001");
      await shot(s, "doi-chieu-tien");
      await submit(s, "chuanBi-" + payment.id);
      await shot(s, "otp-nhan-tien");
      await nhapMa(s, "xacNhan-" + payment.id, "123456");
      await shot(s, "tien-da-xac-nhan");
    },
  );
  let code;
  await step("Chỉ định người nhận, lưu xe và mở QR thật", async () => {
    await go(b, `order/${order}/delivery`);
    await click(b, "Tôi là người nhận hàng");
    await b.locator("form[data-form=trip] [name=plate]").fill("66C-123.45");
    await b.locator("[name=freight]").fill("3200000");
    await submit(b, "trip");
    await datGioGiao(order, await buyerSession());
    await go(b, `order/${order}/delivery`);
    await click(b, "Mở QR nhận hàng");
    code = await b.locator("[data-receipt-code]").innerText();
    assert.match(code, /^\d{6}$/);
    await shot(b, "qr-nhan-hang");
  });
  await step("Người bán dùng mã 6 số bắt đầu nghiệm thu", async () => {
    await go(s, `order/${order}/delivery`);
    await shot(s, "san-sang-giao");
    await s.locator("form[data-form=batDau] [name=code]").fill(code);
    await s
      .locator("form[data-form=batDau] [name=plate]")
      .fill("66C-123.45");
    await submit(s, "batDau");
    await shot(s, "bat-dau-nghiem-thu");
  });
  await step("Bên mua nhập 3 phần nghiệm thu, người bán ký PIN", async () => {
    await go(b, `order/${order}/delivery`);
    await b.locator("[name=weighed]").fill("2000");
    await b.locator("[name=seal]").fill("M-UI-2291");
    await b.locator("[name=accepted]").fill("2000");
    await b.locator("[name=downgraded]").fill("0");
    await b.locator("[name=rejected]").fill("0");
    await shot(b, "nghiem-thu");
    await b.locator("form[data-form=acceptance] [name=pin]").fill("2468");
    await submit(b, "acceptance");
    await shot(b, "gui-bien-ban");
    await go(s, `order/${order}/delivery`);
    await shot(s, "ket-qua-nghiem-thu");
    // Seller current shell uses PIN form dongY (no checkbox).
    await s.locator("[name=pin]").fill("2468");
    await submit(s, "dongY");
    await shot(s, "da-dong-y-can");
  });
  await step("Nhận tại nơi đến và quyết toán", async () => {
    await go(b, `order/${order}/delivery`);
    await b.locator("form[data-form=arrival] [name=weighed]").fill("2000");
    await shot(b, "can-noi-den");
    await submit(b, "arrival");
    await b
      .locator("form[data-form=confirmArrival] input[type=checkbox]")
      .check();
    await shot(b, "xac-nhan-noi-den");
    await submit(b, "confirmArrival");
    await go(b, `order/${order}/money`);
    await shot(b, "quyet-toan");
    await go(s, `order/${order}/money`);
    await shot(s, "quyet-toan");
  });
  await step("Lệnh ngân hàng thành công và đối soát hoàn tất", async () => {
    await nganHangXuLyLenh();
    await vanHanhDoiSoat();
    detail = await api("/v1/orders/" + order, undefined, await buyerSession());
    assert.equal(detail.status, "completed");
    await go(b, `order/${order}/money`);
    await shot(b, "hoan-tat");
    await go(s, `order/${order}/money`);
    await shot(s, "tien-da-ve");
  });
  await step("Các màn bổ sung và bố cục hai kích thước", async () => {
    for (const [p, paths] of [
      [
        s,
        [
          "home",
          "lots",
          "post",
          "offers",
          "orders",
          "ledger",
          "demands",
          "messages",
          `order/${order}/documents`,
          `order/${order}/cancel`,
          `order/${order}/disputes`,
        ],
      ],
      [
        b,
        [
          "home",
          "demands",
          "demand-new",
          "offers",
          "orders",
          "ledger",
          "organization",
          "plans",
          `order/${order}/documents`,
          `order/${order}/cancel`,
          `order/${order}/disputes`,
        ],
      ],
    ])
      for (const path of paths) {
        await go(p, path);
        await shot(p, path.replaceAll("/", "-"));
      }
  });
  await step("Không lỗi JavaScript hoặc console", async () =>
    assert.deepEqual(errors, []),
  );
  await writeFile(
    dir + "ket-qua.json",
    JSON.stringify(
      { date: new Date().toISOString(), results, errors, shots, order: detail },
      null,
      2,
    ),
  );
  console.log(
    `ĐẠT ${results.length}/${results.length}; ${shots.length} ảnh; đơn ${detail.code} ${detail.status}`,
  );
} catch (err) {
  console.error("KHÔNG ĐẠT", err);
  await writeFile(
    dir + "ket-qua.json",
    JSON.stringify(
      { date: new Date().toISOString(), results, errors, shots },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
