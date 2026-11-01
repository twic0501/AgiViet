// Kiểm giao dịch HAI BÊN theo MÔ HÌNH QUY TRÌNH v23 (~/Documents/AgiViet/mo-phong-quy-trinh-v23-chot-2026-10-28/quy-trinh.json).
// Mỗi tình huống v23 có cả bên bán và bên mua được ghép vào một kịch bản mô phỏng của HĐ-0018 (thiet-ke/giao-dich-chung.js);
// app bán (chị Năm) và app mua (chị Thu Hà) mỗi bên bấm đúng việc của mình, ngân hàng/vận hành bấm nút "Mô phỏng".
// Cuối bài in bảng phủ: tình huống nào đã kiểm hai bên, tình huống nào bản mô phỏng chưa có.
// Chạy: node tests/hai-ben-quy-trinh.mjs   (cần frontend 18990; không cần backend)
//       QUY_TRINH=<đường dẫn quy-trinh.json> để đổi tệp mô hình.
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")("playwright");
const GOC = (process.env.FRONTEND_URL || "http://127.0.0.1:18990") + "/thiet-ke/";
const QT = process.env.QUY_TRINH || process.env.HOME + "/Documents/AgiViet/mo-phong-quy-trinh-v23-chot-2026-10-28/quy-trinh.json";

// Tình huống v23 → kịch bản mô phỏng. "kiem" = bài nào chạy nó (tệp này hoặc hai-ben.mjs).
const GHEP = {
  "chinh": { kb: "thuan", kiem: "hai-ben.mjs", ghi: "luồng 15 bước, rút gọn: lấy tại vườn thay vì chở về kho Long An" },
  "mua-huy": { kb: "huy", kiem: "hai-ben.mjs" },
  "nghiem-thu-thap": { kb: "tra-lai", kiem: "hai-ben.mjs" },
  "da-nhan-nhieu-hon": { kb: "tra-lai", kiem: "hai-ben.mjs", ghi: "người bán hoàn phần dư 3,1 tr" },
  "de-nghi": { kb: "doi-ngay", kiem: "tệp này" },
  "tra-mot-phan": { kb: "thieu", kiem: "tệp này", ghi: "phần trả một phần; phần trả trùng chưa có. Lệch tiền (kịch bản lech) cũng kiểm ở hai-ben.mjs" },
  "tranh-chap-mot-dong": { kb: "phan-doi", kiem: "tệp này" },
  "can-khong-dung": { kb: "can-lech", kiem: "tệp này", ghi: "chỉ nhánh trong ±5%; nhánh vượt 5% chưa có" },
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const ban = await ctx.newPage(), mua = await ctx.newPage();
const loi = []; for (const p of [ban, mua]) p.on("pageerror", (e) => loi.push(e.message));
const ketQua = [];
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const hd = () => mua.evaluate(() => JSON.parse(localStorage.getItem("agv-hd-0018") || "{}"));
async function buoc(ten, f) { try { await f(); ketQua.push(["ĐẠT", ten]); } catch (e) { ketQua.push(["HỎNG", ten, e.message.split("\n")[0]]); } }
const moBan = async (hash) => { await ban.goto(GOC + "mau/ban.html#" + hash); await ban.reload(); await cho(600); };
const moMua = async (man) => { await mua.goto(GOC + "mua.html?man=" + man); await cho(600); };
const muaLam = async (re) => { await mua.locator(".sl-viec [data-lam]").filter({ hasText: re }).first().click(); await cho(1500); };
const banKb = async (kb) => { await ban.locator(`[data-kb="${kb}"]`).click(); await cho(1600); };
const viecMua = () => mua.locator(".sl-viec").first().innerText();
const viecBan = () => ban.locator(".m-viec").first().innerText();
const tienMua = () => mua.evaluate(() => [...document.querySelectorAll("#tien-o b[data-v]")].map((x) => Number(x.dataset.v)));
async function napKb(kb, them = {}) {
  await mua.goto(GOC + "hai-ben.html");
  await mua.evaluate(([kb, them]) => {
    for (const k of ["agv-hd-0018", "agv-mua", "agv-ban-mau"]) localStorage.removeItem(k);
    localStorage.setItem("agv-hd-0018", JSON.stringify({ buoc: 0, daTra: 0, nbXn: 0, kb, phu: "", ban: 1, huy: false, ngayGiao: "28/10", ...them }));
  }, [kb, them]);
}

// ── de-nghi: người bán đề nghị đổi lịch trước khi ký → bên mua đồng ý → bản 2 → người bán ký ──
await napKb("doi-ngay", { buoc: 2 });
await buoc("[de-nghi] Chị Năm đề nghị đổi ngày 28/10 → 29/10; bên mua thấy và đồng ý; sang bản 2 rồi chị Năm ký", async () => {
  await moBan("man=chi-tiet-don"); await banKb("de-nghi");
  assert.equal((await hd()).phu, "de-nghi");
  assert.match(await viecBan(), /Chờ bên mua trả lời/);
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /đề nghị đổi ngày giao 28\/10 → 29\/10/);
  await muaLam(/^Đồng ý$/);
  const h = await hd(); assert.equal(h.ban, 2); assert.equal(h.ngayGiao, "29/10"); assert.equal(h.phu, "");
  await moBan("man=ky-otp"); await ban.click("#ky"); await cho(800);
  assert.equal((await hd()).buoc, 3, "ký bản 2 xong sang bước chuyển cọc");
});
await napKb("doi-ngay", { buoc: 2 });
await buoc("[de-nghi] Bên mua không đồng ý → giữ bản 1, ngày 28/10", async () => {
  await moBan("man=chi-tiet-don"); await banKb("de-nghi");
  await moMua("chi-tiet-don"); await muaLam(/Không đồng ý/);
  const h = await hd(); assert.equal(h.ban, 1); assert.equal(h.ngayGiao, "28/10"); assert.equal(h.phu, "");
});

// ── tra-mot-phan: bên mua trả 20 tr → chị Năm xác nhận 20 tr → chưa bốc → bên mua trả nốt 12,2 tr → chị Năm xác nhận thêm ──
await napKb("thieu", { buoc: 5 });
await buoc("[tra-mot-phan] Trả một phần: chặn bốc tới khi đủ, mỗi bên xác nhận đúng số", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Ghi đã trả 20\.000\.000/);
  assert.equal((await hd()).daTra, 20000000);
  await moBan("man=kiem-tien");
  assert.match(await ban.locator(".m-than").innerText(), /Bên mua báo đã chuyển 20\.000\.000/, "app bán phải hiện đúng số bên mua báo");
  await ban.click("#xn"); await cho(1800);
  let h = await hd(); assert.equal(h.buoc, 7); assert.equal(h.nbXn, 20000000);
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /Chưa bốc được: người bán mới xác nhận 20\.000\.000/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /mới trả 20\.000\.000/);
  assert.equal(await ban.locator("#bg, [data-di=ban-giao]").count(), 0, "chưa đủ tiền thì app bán chưa có nút bàn giao");
  await muaLam(/Ghi đã trả 12\.200\.000/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /trả thêm 12\.200\.000/); await banKb("nhan-them");
  h = await hd(); assert.equal(h.nbXn, 32200000);
  await moMua("chi-tiet-don"); assert.doesNotMatch(await viecMua(), /Chưa bốc được/);
  assert.equal((await tienMua())[2], 32200000, "bên mua thấy chị Năm đã nhận 32.200.000");
});

// ── tranh-chap-mot-dong: chị Năm phản đối dòng hạ cấp → bên mua cân lại → chị Năm vẫn không đồng ý → kiểm định → chốt 104 kg ──
await napKb("phan-doi", { buoc: 11, daTra: 32200000, nbXn: 32200000 });
await buoc("[tranh-chap-mot-dong] Chỉ dòng hạ cấp bị tranh chấp, các dòng khác giữ; kiểm định chốt 104 kg", async () => {
  await moBan("man=chi-tiet-don"); await banKb("phan-doi");
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /phản đối dòng hạ cấp 120 kg/); assert.match(await viecMua(), /đã chốt/);
  await muaLam(/Cân lại/); assert.equal((await hd()).phu, "can-lai");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /cân lại/i); await banKb("kd");
  assert.equal((await hd()).phu, "kiem-dinh");
  await moMua("chi-tiet-don"); await muaLam(/104\/120 kg/);
  const h = await hd(); assert.equal(h.buoc, 12); assert.equal(h.phu, "da-kiem-dinh");
  await muaLam(/Mô phỏng: ngân hàng/); assert.equal((await hd()).buoc, 13);
  const t = await tienMua(); assert.equal(t[1], 0, "ngân hàng hết giữ cọc");
  // Kiểm định: chỉ 104/120 kg dưới chuẩn → 16 kg tính lại loại 1 (chị Năm đúng một phần)
  assert.equal(t[2], 1866 * 23000 + 104 * 15000, "chị Năm nhận 1.866×23.000 + 104×15.000 = 44.478.000");
});

// ── can-khong-dung (trong ±5%): cân kho 1.960 kg → luồng thuận, tiền theo số cân ──
await napKb("can-lech", { buoc: 10, daTra: 32200000, nbXn: 32200000 });
await buoc("[can-khong-dung] Cân kho 1.960 kg trong ±5%: nghiệm thu theo số cân, chị Năm đồng ý, ngân hàng chi đúng", async () => {
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /1\.960 kg/);
  await muaLam(/Gửi kết quả/); assert.equal((await hd()).buoc, 11);
  await moBan("man=ket-qua"); assert.match(await ban.locator(".m-than").innerText(), /1\.810 kg/, "màn Kết quả cân app bán phải hiện đúng số bên mua gửi"); await ban.click("#dy"); await cho(1800); assert.equal((await hd()).buoc, 12);
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng chi cọc/); assert.equal((await hd()).buoc, 13);
  const t = await tienMua(); assert.equal(t[2], 1810 * 23000 + 120 * 15000, "chị Năm nhận 1.810×23.000 + 120×15.000");
});

await buoc("Không có lỗi JS ở cả hai app", async () => { assert.deepEqual(loi, []); });
await b.close();

for (const [kq, ten, ly] of ketQua) console.log(`${kq === "ĐẠT" ? "✔" : "✖"} ${ten}${ly ? " — " + ly : ""}`);
console.log(`${ketQua.filter((x) => x[0] === "ĐẠT").length}/${ketQua.length} đạt`);

// ── Bảng phủ theo quy-trinh.json ──
if (existsSync(QT)) {
  const ds = JSON.parse(readFileSync(QT, "utf8")).tinh_huong;
  const vaiCua = (t) => new Set((t.buoc || []).map((x) => x.vai || x.lan).filter(Boolean));
  const haiBen = ds.filter((t) => { const v = vaiCua(t); return v.has("ban") && v.has("mua"); });
  const co = haiBen.filter((t) => GHEP[t.id]);
  console.log(`\nBảng phủ v23: ${ds.length} tình huống · ${haiBen.length} có cả bên bán và bên mua · đã kiểm hai bên ${co.length}`);
  for (const t of haiBen) { const g = GHEP[t.id]; console.log(`${g ? "■" : "□"} ${t.id.padEnd(28)} ${g ? `→ ${g.kb} (${g.kiem})${g.ghi ? " · " + g.ghi : ""}` : "chưa có trong bản mô phỏng"}`); }
}
process.exit(ketQua.every((x) => x[0] === "ĐẠT") ? 0 : 1);
