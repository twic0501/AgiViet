import { choose, signedIn, skipGuides, press, horizontalOverflow } from './ui-controls.mjs';
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")(
  "playwright",
);
const origin = process.env.FRONTEND_URL || "http://127.0.0.1:8090";
const base = process.env.API_ORIGIN || "http://127.0.0.1:8080";
const dir = new URL("../../docs/frontend/anh-bo-sung/", import.meta.url)
  .pathname;
await mkdir(dir, { recursive: true });
const results = [],
  shots = [],
  errors = [],
  pageErrors = [], deniedImages = [];
let active;
const browser = await chromium.launch({ args: ["--no-sandbox"] });
async function make(role, width) {
  const context = await browser.newContext({
    viewport: { width, height: role === "ban" ? 844 : 900 },
    reducedMotion: "reduce",
  });
  await skipGuides(context);
  const p = await context.newPage();
  p.setDefaultTimeout(10000);
  p.role = role;
  p.on("pageerror", (e) => {
    errors.push(e.message);
    pageErrors.push(e.message);
  });
  p.on("response", r => { if(r.status()>=400) deniedImages.push({url:r.url(),status:r.status()}); });
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
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
async function submit(p, name) {
  await press(p.locator(`form[data-form="${name}"] button:not([type=button])`));
  await settle(p);
}
async function click(p, name) {
  await press(p.getByRole("button", { name, exact: true }));
  await settle(p);
  if(name === "Không đúng" && p.role === "ban" && await p.locator("[data-action=disagree]").count()) await press(p.locator("[data-action=disagree]"));
  await settle(p);
}
async function login(p, phone) {
  await go(p, "home");
  await p.locator('form[data-form=loginPhone] input[name=phone]').fill(phone);
  await submit(p, "loginPhone");
  await p.locator("input[name=code]").fill("123456");
  await submit(p, "loginOtp");
  await signedIn(p,p.role);
}
async function role(p, phone) {
  // App bán mới ẩn công cụ thử; đổi vai là chuẩn bị fixture bằng API, không giả thao tác UI.
  const response=await fetch(base+'/v1/test/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone})});
  const session=await response.json();assert.ok(response.ok,JSON.stringify(session));
  await p.evaluate(({role,token})=>sessionStorage.setItem('agv-session-'+role,JSON.stringify({token})),{role:p.role,token:session.token});
  await go(p,'home');await p.reload();await settle(p);
}
async function shot(p, name) {
  await settle(p);
  assert.equal(
    await horizontalOverflow(p),
    false,
    "Tràn ngang " + name,
  );
  const file = `${p.role}-${String(shots.length + 1).padStart(2, "0")}-${name}.png`;
  await p.screenshot({ path: dir + file, fullPage: p.role !== "ban" });
  shots.push({ file, name, role: p.role, width: p.viewportSize().width });
}
async function token(p) {
  return JSON.parse(
    await p.evaluate(
      (role) => sessionStorage.getItem("agv-session-" + role),
      p.role,
    ),
  ).token;
}
async function api(p, path, body) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + (await token(p)),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  assert.ok(r.ok, JSON.stringify(data));
  return data;
}
async function step(name, fn, continueOnFailure = false) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log("ĐẠT", name);
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
    await active?.screenshot({ path: dir + "LOI.png", fullPage: active.role !== "ban" });
    if (!continueOnFailure) throw e;
  }
}
let lot, demand, offer, order;
try {
  const reset = await fetch(base + "/v1/test/reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.ok(reset.ok);
  const s = await make("ban", 390),
    b = await make("mua", 1280);
  await login(s, "0918000421");
  await login(b, "0909000210");
  await step("Lưu lô từ lưới mặt hàng và tải ảnh qua API", async () => {
    await go(s, "post");
    if(await s.locator('[data-action="hang_XOAI_CAT_CHU"]').count()) await s.locator('[data-action="hang_XOAI_CAT_CHU"]').click();
    await settle(s);
    await choose(s,'[name=grade]','L1');
    await choose(s,"[name=basis]","weighed");
    await s.locator("[name=qty]").fill("3000");
    await s.locator("[name=available]").fill("2026-11-05");
    await s.locator("[name=harvest]").fill("2026-11-05");
    await s.locator("[name=clear]").fill("2026-11-01");
    await s.locator("[name=ask]").fill("25000");
    await s.locator("[name=floor]").fill("23000");
    await shot(s, "dang-lo");
    await submit(s, "post");
    await s.getByRole("heading", { name: "Xoài cát Chu" }).waitFor();
    lot = await s.evaluate(() => location.hash.split("/")[2]);
    await s
      .locator("[name=photo]")
      .setInputFiles(
        new URL(
          "../tham-khao/thiet-ke-so-lam-an/assets/anh/mango.jpg",
          import.meta.url,
        ).pathname,
      );
    await submit(s, "lotPhoto");
    assert.equal((await api(s, "/v1/lots/" + lot)).status, "draft");
    await shot(s, "lo-nhap-co-anh");
  });
  await step(
    "Đăng công khai lô với expected_revision vừa đọc",
    async () => {
      await click(s, "Đăng cho bên mua thấy");
      await shot(s, "lo-da-dang");
      assert.equal(
        (await api(s, "/v1/lots/" + lot)).status,
        "upcoming",
        "Lô có ngày hàng tương lai phải được đăng ở trạng thái Sắp có hàng.",
      );
    },
    true,
  );
  await step("Tạo và đăng nhu cầu rồi ghép có lý do", async () => {
    await go(b, "demand-new");
    await choose(b,"[name=segment]","processor");
    await choose(b,"[name=mode]","self_pickup");
    await b.locator("[name=from]").fill("2026-11-05");
    await b.locator("[name=to]").fill("2026-11-06");
    await b.locator("[name=qty]").fill("2500");
    await b.locator("[name=min]").fill("500");
    await b.locator("[name=max]").fill("26000");
    await submit(b, "demand");
    await b.getByRole("heading", {name: /^NC-/}).waitFor();
    demand = await b.evaluate(() => location.hash.split("/")[2]);
    assert.equal((await api(b, "/v1/demands/" + demand)).status, "open");
    await shot(b, "nhu-cau-da-dang");
    await go(b, "matches/" + demand);
    await b.getByText("Khớp đủ lượng", { exact: true }).waitFor();
    assert.ok(await b.getByText("Vì sao khớp?", { exact: true }).count());
    await shot(b, "hang-khop-co-ly-do");
  });
  await step("Lọc nguồn theo mặt hàng và mã lô", async () => {
    const l = (await api(b, "/v1/lots")).find((l) => l.code === "L-0414");
    await go(b, "lots");
    await b.locator("form[data-form=sourceFilter] [name=search]").fill(l.code);
    await b
      .locator("form[data-form=sourceFilter] [name=product]")
      .selectOption("XOAI_CAT_CHU");
    await submit(b, "sourceFilter");
    assert.equal(await b.locator("article").count(), 1);
    await shot(b, "loc-nguon");
  });
  await step("Lập hợp đồng vượt hạn mức và gửi người khác duyệt", async () => {
    const sources = await api(b, "/v1/lots");
    const tradeLot = sources.find((l) => l.code === "L-0414");
    assert.ok(tradeLot);
    await go(b, "bid/" + tradeLot.id);
    await b.locator("[name=qty]").fill("2000");
    await b.locator("[name=price]").fill("30000");
    await submit(b, "bid");
    await b.getByRole("heading", { name: "Lời chào giá" }).waitFor();
    offer = await b.evaluate(() => location.hash.split("/")[2]);
    await go(s, "offers/" + offer);
    await click(s, "Đồng ý giá này");
    await go(b, "create-order/" + offer);
    for(const [n,v] of Object.entries({mode:"at_farm",site:"tai_vuon",transport:"buyer",timing:"before_loading"})) await choose(b,"[name="+n+"]",v);
    await b.locator("[name=downgrade]").fill("15000");
    await b.locator("[name=from]").fill("2026-11-06T06:00");
    await b.locator("[name=to]").fill("2026-11-06T12:00");
    await submit(b, "createOrder");
    await b.getByRole("heading", { name: /^HD-/ }).waitFor();
    order = await b.evaluate(() => location.hash.split("/")[2]);
    await click(b, "Gửi quản lý duyệt");
    assert.equal(
      (await api(b, "/v1/orders/" + order)).status,
      "internal_approval",
    );
    assert.equal(
      await b
        .getByRole("button", { name: "Duyệt hợp đồng", exact: true })
        .count(),
      0,
    );
    await shot(b, "cho-duyet-noi-bo");
    await role(b, "0909000213");
    await go(b, "order/" + order);
    await click(b, "Duyệt hợp đồng");
    assert.equal((await api(b, "/v1/orders/" + order)).status, "drafting");
    await shot(b, "quan-ly-da-duyet");
  });
  await step(
    "Người giúp được xem và soạn lô, không có nút ký hoặc tiền",
    async () => {
      await role(s, "0918000422");
      const u = await api(s, "/v1/auth/session");
      assert.ok(u.actions.includes("lot.create"));
      assert.ok(!u.actions.includes("order.sign.seller"));
      assert.ok(!u.actions.includes("money.confirm.seller"));
      await go(s, "order/" + order);
      assert.equal(await s.locator("form[data-form=prepareSign]").count(), 0);
      await go(s, "post");
      assert.equal(await s.locator("form[data-form=post]").count(), 1);
      await shot(s, "nguoi-giup");
      await role(s, "0918000421");
    },
  );
  await step(
    "Người bán được xem đủ tab và nút cuối không bị thanh dưới che",
    async () => {
      await go(s, "order/" + order);
      await s.locator('.sl-nhom-dong summary').click();
      const sections=s.locator('.sl-nhom a[href^="#/order/"]');
      assert.equal(await sections.count(),9);
      for (const a of await sections.all()) {
        const rect = await a.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= 390);
      }
      await s.evaluate(() => {const a=document.querySelector('#app');a.scrollTop=a.scrollHeight;});
      const last = s.locator('.sl-nhom-dong a').last();
      await last.scrollIntoViewIfNeeded();
      const r = await last.boundingBox(),
        n = await s.locator(".bottom-nav").boundingBox();
      assert.ok(r.y + r.height <= n.y + 1);
      await shot(s, "day-man-khong-che");
      const samples=[];
      for(const [name,offset] of [["dau",0],["giua",Math.floor(await s.evaluate(()=>document.querySelector('#app').scrollHeight)/2)],["cuoi",999999]]) {
        await s.evaluate(y=>{document.querySelector('#app').scrollTop=y},offset);
        const nav=await s.locator('.bottom-nav').boundingBox();
        assert.ok(Math.abs(nav.y+nav.height-844)<=1,'Tab phải bám đáy viewport');
        for(const tab of await s.locator('.bottom-nav a').all()) {
          const box=await tab.boundingBox();
          assert.ok(box.x>=0&&box.x+box.width<=390&&box.height>=44,'Tab nhìn thấy và đủ vùng bấm');
          assert.ok(await tab.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Tab không bị che');
        }
        const file='ban-tab-390x844-'+name+'.png';
        await s.screenshot({path:dir+file,fullPage:false});
        shots.push({file,name:'tab khi cuộn '+name,role:'ban',width:390,height:844,fullPage:false});
        samples.push({name,scrollY:await s.evaluate(()=>document.querySelector('#app').scrollTop),nav});
      }
      await writeFile(dir+'tab-viewport.json',JSON.stringify(samples,null,2));

    },
  );
  await step(
    "Không đúng mở phản đối từng phần và hồ sơ thật (chuẩn bị bằng API)",
    async () => {
      const cmd = (p, path, body = {}) =>
        api(p, path, { ...body, idempotency_key: crypto.randomUUID() });
      let o = await api(b, "/v1/orders/" + order);
      const doc = o.tai_lieu.find((d) => d.doc_type === "contract");
      for (const p of [b, s]) {
        const challenge = await api(p, "/v1/otp/challenges", {
          purpose: "contract_sign",
          document_id: doc.id,
        });
        await cmd(p, `/v1/orders/${order}/sign`, {
          challenge_id: challenge.challenge_id,
          code: "123456",
          commitment_ack: true,
        });
      }
      const dep = await api(b, `/v1/orders/${order}/deposit-instruction`);
      await api(b, "/v1/sim/bank/transfers", {
        payment_ref: dep.payment_ref,
        amount_vnd: dep.total_vnd,
      });
      await api(b, "/v1/sim/bank/deliver", {});
      const pay = (await api(b, `/v1/orders/${order}/payments`)).find(
        (p) => p.kind === "goods_before_loading",
      );
      const picture = (
        await readFile(
          new URL(
            "../tham-khao/thiet-ke-so-lam-an/assets/anh/mango.jpg",
            import.meta.url,
          ),
        )
      ).toString("base64");
      const file = await cmd(b, "/v1/files", {
        mime: "image/jpeg",
        data_base64: picture,
        entity: "payment",
        entity_id: pay.id,
        captured_in_app: false,
      });
      await cmd(b, `/v1/payments/${pay.id}/report`, {
        amount_vnd: pay.amount_due_vnd,
        method: "bank_transfer",
        evidence_document_id: file.id,
      });
      const ch = await api(s, "/v1/otp/challenges", {
        purpose: "money_received",
        payment_id: pay.id,
        amount_vnd: pay.amount_due_vnd,
      });
      await cmd(s, `/v1/payments/${pay.id}/confirm`, {
        challenge_id: ch.challenge_id,
        code: "123456",
        amount_vnd: pay.amount_due_vnd,
        result: "full",
        bank_txn_ref: "FT-BRANCH-" + crypto.randomUUID(),
        method: "bank_transfer",
      });
      o = await api(b, "/v1/orders/" + order);
      const d = o.dot_giao[0],
        user = await api(b, "/v1/auth/session");
      await cmd(b, `/v1/deliveries/${d.id}/receiver`, {
        user_id: user.user_id,
      });
      await cmd(b, `/v1/deliveries/${d.id}/trip`, {
        plate_no: "66C-123.45",
        freight_vnd: "3200000",
      });
      await api(b, "/v1/test/clock", { set: d.window_from });
      const qr = await cmd(b, `/v1/deliveries/${d.id}/receipt-qr`);
      await cmd(s, `/v1/deliveries/${d.id}/start-check`, {
        ma_6_so: qr.data.ma_6_so,
        plate_no: "66C-123.45",
      });
      const profile = await api(b, "/v1/products/XOAI_CAT_CHU/profile");
      const reason = profile.reject_reasons[0].reason_code;
      await cmd(b, `/v1/deliveries/${d.id}/acceptance`, {
        pin: "2468",
        weighed_g: "2000000",
        seal_code: "BRANCH-2292",
        lines: [
          { kind: "accepted", qty_g: "1900000" },
          { kind: "downgraded", qty_g: "50000", reason_code: reason },
          { kind: "rejected", qty_g: "50000", reason_code: reason },
        ],
      });
      await go(s, "order/" + order + "/delivery");
      await click(s, "Không đúng");
      await choose(s,"form[data-form=disagree] [name=line]","2");
      const option=s.locator('form[data-form=disagree] [name=option]');
      await choose(s,'form[data-form=disagree] [name=option]','rut_phan');await settle(s);
      const pin=s.locator('form[data-form=disagree] [name=pin]');
      assert.ok(await pin.isVisible());assert.equal(await pin.getAttribute('required'),'');
      await choose(s,'form[data-form=disagree] [name=option]','chia_lai');await settle(s);assert.ok(await pin.isDisabled());
      await s
        .locator("form[data-form=disagree] [name=reason]")
        .fill("Phần hàng này vẫn đạt loại đã thỏa thuận.");
      await shot(s, "phan-doi-tung-phan");
      await submit(s, "disagree");
      await s.getByRole("heading", { name: "Hồ sơ tranh chấp" }).waitFor();
      await shot(s, "ho-so-tranh-chap");
    },
  );
  await step("Kho dùng được app mua ở 390px", async () => {
    await role(b, "0909000212");
    await b.setViewportSize({ width: 390, height: 844 });
    await go(b, "orders");
    await shot(b, "kho-dien-thoai");
    await go(b, "order/" + order + "/delivery");
    await shot(b, "kho-giao-nhan");
  });
  await step(
    "Không lỗi JavaScript, console hoặc HTTP; ảnh lô bên mua tải thật",
    async () => {
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(deniedImages, []);
      assert.deepEqual(errors, []);
      const data = await api(b, '/v1/lots/'+lot);
      const image = await fetch(base+'/v1/documents/'+data.photos[0].id+'/file', {headers:{Authorization:'Bearer '+await token(b)}});
      assert.equal(image.status,200);
      assert.match(image.headers.get('content-type'), /^image\//);
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), await readFile(new URL('../tham-khao/thiet-ke-so-lam-an/assets/anh/mango.jpg',import.meta.url)));
      await go(b,'lots/'+lot);
      const img = b.locator('[data-document-image]').first();
      assert.match(await img.getAttribute('src'), /^blob:/);
      assert.equal(await img.getAttribute('alt'), 'Ảnh lô hàng');
      assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth>0),true);
      assert.equal(await b.getByText('Đang tải ảnh lô…',{exact:true}).count(),0);
      await shot(b,'anh-lo-that-ben-mua');
    },
  );
} catch (e) {
  console.error("KHÔNG ĐẠT", e.message);
  process.exitCode = 1;
} finally {
  await writeFile(
    dir + "ket-qua.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        results,
        shots,
        errors,
        deniedImages,
        pageErrors,
        lot,
        demand,
        offer,
        order,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (results.some((r) => !r.pass)) process.exitCode = 1;
  console.log(
    `${results.filter((x) => x.pass).length}/${results.length} nhóm kiểm bổ sung; ${shots.length} ảnh.`,
  );
}
