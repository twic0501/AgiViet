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
  "ban-vi-pham": { kb: "khong-giao", kiem: "tệp này", ghi: "bên mua đã trả trước 32,2 tr (v23 chưa trả) nên người bán trả lại thêm phần đó" },
  "nghiem-thu-im-lang": { kb: "im-lang", kiem: "tệp này" },
  "bat-kha-khang": { kb: "bkk", kiem: "tệp này", ghi: "dừng sau khi ký bản sửa + hoàn cọc dư; nguồn bù 800 kg và phần giao tiếp chưa mô phỏng" },
  "khac-mau": { kb: "khac-mau", kiem: "tệp này", ghi: "phiếu bồi hoàn chi phí dịch vụ chỉ ghi chữ, chưa vào sổ tiền" },
  "hang-tra-lai": { kb: "hang-tra", kiem: "tệp này" },
  "lay-tai-vuon": { kb: "hai-can", kiem: "tệp này", ghi: "phần hai cân + chốt số; trả trước bàn giao và dư lượng đi theo luồng chung" },
  "vuon-du-luong-khong-dat": { kb: "du-luong", kiem: "tệp này", ghi: "phí kiểm lần đầu gộp vào khoản người bán hoàn" },
  "hai-ket-qua-khac": { kb: "hai-kq", kiem: "tệp này", ghi: "phí 2,8 tr bên mua hoàn người bán chỉ ghi lượt xác nhận, chưa vào sổ tiền" },
  "tra-sau-ngan-hang": { kb: "nh-cam-ket", kiem: "tệp này", ghi: "hoa hồng ngân hàng trả AgiViet và việc bên mua trả gốc + lãi sau 30 ngày chỉ ghi chữ" },
  "tra-sau-mua-vi-pham": { kb: "nh-tu-choi", kiem: "tệp này", ghi: "bồi thường bằng giá trị nghiệm thu luồng thuận (v23 không nêu số)" },
  "ung-tien": { kb: "ung", kiem: "tệp này" },
  "vuon-bien-the": { kb: "bien-the", kiem: "tệp này", ghi: "3/7 sự cố có nhánh riêng (sai người, đòi hạ giá, thiếu tải); cân lệch, chuyển thiếu, sai hàng, về kho báo hỏng đã kiểm ở hai-can, tra-mot-phan, khac-mau, tra-lai" },
  "nhieu-de-nghi": { kb: "nhieu-de-nghi", kiem: "tệp này", ghi: "bên mua A không có app (mô phỏng); 2.000 kg thay 4 tấn" },
  "de-nghi-bo-cuoc": { kb: "bo-cuoc", kiem: "tệp này", ghi: "nhánh B đã ký nhưng chưa cọc đi theo các tình huống cọc" },
  "den-xem-hang": { kb: "xem-hang", kiem: "tệp này" },
  "dang-ky": { kb: "dang-ky", kiem: "tệp này", ghi: "nhân viên xác minh bằng nút Mô phỏng; lên hạng chưa có thang điểm" },
  "khong-co-dau-ra": { kb: "dau-ra", kiem: "tệp này", ghi: "lô L-0415 6 tấn riêng, không nối vào HĐ-0018" },
  "dat-truoc": { kb: "dat-truoc", kiem: "tệp này", ghi: "số theo v23 (8 → 9 tấn × 15.000), sổ tiền riêng" },
  "tien-mat": { kb: "tien-mat", kiem: "tệp này", ghi: "v23 người bán tự chở tới kho; mô phỏng giữ lấy tại vườn rồi trả tiền mặt khi nhận" },
  "chua-tra": { kb: "chua-tra", kiem: "tệp này", ghi: "trên khung trả sau nghiệm thu (kb tra-sau = luồng chính v23 trả sau, cũng kiểm ở đây)" },
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
const moMua = async (man) => { await mua.goto(GOC + "mua.html?man=" + man); await cho(400); await mua.waitForFunction(() => (document.querySelector(".sl-viec")?.innerText || "").trim().length > 0, null, { timeout: 5000 }).catch(() => {}); await cho(200); };
const muaLam = async (re) => { await mua.locator(".sl-viec [data-lam]").filter({ hasText: re }).first().click(); await cho(1500); };
const banKb = async (kb) => { await ban.locator(`[data-kb="${kb}"]`).click(); await cho(1600); };
const viecMua = () => mua.locator(".sl-viec").first().innerText();
const viecBan = () => ban.locator(".m-viec").first().innerText();
const tienMua2 = async () => { await cho(300); return tienMua(); };
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

// ── ban-vi-pham: xe chờ 2 giờ không có hàng → người bán nhận không giao → hoàn cọc + phí → người bán trả lại tiền trước + bồi hoàn ──
await napKb("khong-giao", { buoc: 7, daTra: 32200000, nbXn: 32200000 });
await buoc("[ban-vi-pham] Người bán không giao: cọc + phí hoàn bên mua, người bán trả lại 32,2 tr + bồi hoàn 1,2 tr tiền xe", async () => {
  await moMua("chi-tiet-don"); await muaLam(/xe chờ 2 giờ/); assert.equal((await hd()).phu, "khong-hang");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /chờ 2 giờ ở vườn/); await banKb("khong-giao");
  let h = await hd(); assert.equal(h.phu, "vi-pham"); assert.equal(h.vp, true);
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /vi phạm: không giao/);
  await muaLam(/ngân hàng hoàn cọc/); h = await hd(); assert.equal(h.huy, true); assert.equal(h.phu, "cho-nb-tra");
  assert.deepEqual(await tienMua(), [32200000, 0, 32200000], "cọc + phí đã hoàn; còn 32,2 tr người bán giữ");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /trả lại 33\.400\.000/); await banKb("nb-tra-vp");
  await moMua("chi-tiet-don"); await muaLam(/Đã nhận lại 33\.400\.000/);
  assert.equal((await hd()).vpXong, true);
  assert.deepEqual(await tienMua(), [0, 0, 0], "bên mua không mất đồng nào");
  assert.match(await viecMua(), /nhận lại đủ/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /đã đóng/);
  assert.equal(await ban.evaluate(() => Number(document.querySelector("#o-bac b").dataset.v)), 0, "app bán: đã nhận 0");
});

// ── nghiem-thu-im-lang: gia hạn kiểm một lần → người bán im lặng 24 giờ → nhắc, nhân viên gọi → người bán chốt ──
await napKb("im-lang", { buoc: 10, daTra: 32200000, nbXn: 32200000 });
await buoc("[nghiem-thu-im-lang] Gia hạn kiểm một lần; người bán im lặng KHÔNG thành đồng ý; nhân viên gọi rồi người bán chốt", async () => {
  await moMua("chi-tiet-don"); await muaLam(/xin gia hạn/); assert.equal((await hd()).giaHan, true);
  assert.match(await viecMua(), /gia hạn một lần tới 8:00/);
  await muaLam(/Gửi kết quả/); assert.equal((await hd()).buoc, 11);
  await muaLam(/hết 24 giờ/); assert.equal((await hd()).phu, "nhac");
  assert.match(await viecMua(), /Im lặng không phải đồng ý/);
  assert.equal(await mua.locator(".sl-viec .sl-vang").count(), 0, "bên mua không có nút tự đi tiếp khi người bán im lặng");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /đã nhắc 3 lần/);
  await moMua("chi-tiet-don"); await muaLam(/nhân viên đã gọi/); assert.equal((await hd()).phu, "da-goi");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /vừa gọi bác/);
  await moBan("man=ket-qua"); await ban.click("#dy"); await cho(1800); assert.equal((await hd()).buoc, 12);
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng chi cọc/); assert.equal((await hd()).buoc, 13);
  assert.equal((await tienMua())[2], 44350000, "chị Năm nhận đủ theo nghiệm thu sau khi chốt");
});

// ── Trả sau nghiệm thu (luồng chính v23: CK sau nghiệm thu) ──
await napKb("tra-sau", { buoc: 7 });
await buoc("[chinh · trả sau] Bốc trước, nghiệm thu chốt rồi bên mua trả 30.550.000, chị Năm xác nhận, ngân hàng chuyển hết cọc", async () => {
  await moBan("man=ban-giao"); await ban.click("#bg"); await cho(1800); assert.equal((await hd()).buoc, 8);
  await moMua("chi-tiet-don"); await muaLam(/Đạt khi bốc/); await muaLam(/Ký nhận/); await muaLam(/Gửi kết quả/); assert.equal((await hd()).buoc, 11);
  await moBan("man=ket-qua"); await ban.click("#dy"); await cho(1800); assert.equal((await hd()).buoc, 12);
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /Chuyển phần còn lại 30\.550\.000/);
  await muaLam(/Ghi đã trả 30\.550\.000/); assert.equal((await hd()).phu, "cho-xn-sau");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /báo đã chuyển 30\.550\.000/); await banKb("xn-sau");
  assert.equal((await hd()).nbXn, 30550000);
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng/); assert.equal((await hd()).buoc, 14, "trả sau: không có bước nhận tiền hoàn");
  assert.deepEqual(await tienMua(), [44488000, 0, 44350000], "chi 44.350.000 + phí; chị Năm nhận đủ nghiệm thu");
  await muaLam(/Nhập kho/); assert.equal((await hd()).buoc, 15);
  await moBan("man=chi-tiet-don"); assert.equal(await ban.evaluate(() => Number(document.querySelector("#o-bac b").dataset.v)), 44350000, "app bán: đã nhận 44.350.000");
});

// ── chua-tra: đã dỡ hàng, bên mua không trả → báo chưa nhận → 48 giờ → ngân hàng chuyển cọc, ghi nợ ──
await napKb("chua-tra", { buoc: 12 });
await buoc("[chua-tra] Bên mua không trả sau nghiệm thu: người bán báo chưa nhận, hết 48 giờ, cọc về người bán, bên mua còn nợ", async () => {
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /Chờ bên mua trả phần còn lại 30\.550\.000/);
  assert.equal(await ban.evaluate(() => Number(document.querySelector("#o-bac b").dataset.v)), 0, "chưa bốc trả trước nên chị Năm chưa nhận đồng nào");
  await banKb("qua-han-sau"); assert.equal((await hd()).phu, "qua-han");
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /Quá hạn trả/);
  await muaLam(/hết 48 giờ/); assert.equal((await hd()).phu, "xu-ly-no");
  await muaLam(/ngân hàng chuyển cọc/); assert.equal((await hd()).no, true);
  assert.deepEqual(await tienMua(), [13938000, 0, 13800000], "bên mua mới chi cọc + phí; chị Năm nhận cọc");
  assert.match(await viecMua(), /còn nợ 30\.550\.000/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /bên mua chưa trả/);
  assert.equal(await ban.evaluate(() => Number(document.querySelector("#o-cho b").dataset.v)), 30550000, "app bán: còn chờ 30.550.000");
});

// ── tien-mat: trả tiền mặt trước khi dỡ, người bán đếm đủ mới dỡ ──
await napKb("tien-mat", { buoc: 11 });
await buoc("[tien-mat] Chốt số → bên mua trả tiền mặt 30.550.000 trước khi dỡ → người bán đếm đủ → ngân hàng chuyển cọc", async () => {
  await moBan("man=ket-qua"); await ban.click("#dy"); await cho(1800); assert.equal((await hd()).buoc, 12);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /trả tiền mặt 30\.550\.000/);
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /Trả tiền mặt 30\.550\.000 đ trước khi dỡ/);
  await muaLam(/Đã trả tiền mặt/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /đếm đủ/i); await banKb("xn-sau");
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng/); assert.equal((await hd()).buoc, 14);
  assert.deepEqual(await tienMua(), [44488000, 0, 44350000]);
});

// ── bat-kha-khang ──
await napKb("bkk", { buoc: 5 });
await buoc("[bat-kha-khang] Báo thiệt hại → nhân viên xác nhận → thương lượng → ký bản sửa 1.200 kg → hoàn cọc dư, không ai bị phạt", async () => {
  await moBan("man=chi-tiet-don"); await banKb("bao-bkk"); assert.equal((await hd()).phu, "bkk");
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /chỉ giao được 1\.200 kg/);
  await muaLam(/nhân viên xác nhận/); await muaLam(/Đề nghị: nhận 1\.200 kg/); assert.equal((await hd()).phu, "bkk-de");
  await moBan("man=chi-tiet-don"); await banKb("bkk-ok"); assert.equal((await hd()).ban, 2);
  await moMua("chi-tiet-don"); await muaLam(/Ký bản sửa/);
  await moBan("man=chi-tiet-don"); await banKb("bkk-ky-ban"); assert.equal((await hd()).phu, "bkk-hoan");
  await moMua("chi-tiet-don"); await muaLam(/hoàn cọc dư/); assert.equal((await hd()).bkkXong, true);
  assert.deepEqual(await tienMua(), [8418000, 8280000, 0], "bên mua còn chi cọc 1.200 kg + phí; ngân hàng giữ 8.280.000");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /giao 1\.200 kg/);
  assert.equal(await ban.evaluate(() => Number(document.querySelector("#o-nh b").dataset.v)), 8280000);
});

// ── khac-mau ──
await napKb("khac-mau", { buoc: 10, daTra: 32200000, nbXn: 32200000 });
await buoc("[khac-mau] Báo khác mẫu → kiểm định: lỗi người bán → nghiệm thu lại 180 kg trả lại → người bán chốt theo kết luận", async () => {
  await moMua("chi-tiet-don"); await muaLam(/khác mẫu/); assert.equal((await hd()).phu, "km");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /khác mẫu lúc bốc/);
  await moMua("chi-tiet-don"); await muaLam(/kiểm định kết luận/); assert.equal((await hd()).phu, "km-kl");
  assert.match(await viecMua(), /trả lại 180 kg/);
  await muaLam(/Gửi kết quả/); assert.equal((await hd()).buoc, 11);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /lỗi bác/);
  await moBan("man=ket-qua"); assert.match(await ban.locator(".m-than").innerText(), /180 kg/); await ban.click("#dy"); await cho(1800);
  assert.equal((await hd()).buoc, 12);
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng/);
  assert.equal((await tienMua())[2], 1700 * 23000 + 120 * 15000, "chị Năm nhận theo nghiệm thu lại 1.700 + 120 kg");
});

// ── hang-tra-lai ──
await napKb("hang-tra", { buoc: 12, daTra: 32200000, nbXn: 32200000 });
await buoc("[hang-tra-lai] 30 kg trả lại giữ ở kho bên mua → chị Năm chọn bán gấp → hồ sơ đóng → bên mua nhập kho", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng chi cọc/); await muaLam(/Đã nhận lại 1\.650\.000/); assert.equal((await hd()).buoc, 14);
  assert.match(await viecMua(), /Chờ chị Năm chọn cách xử lý 30 kg/);
  assert.equal(await mua.locator(".sl-viec .sl-vang").count(), 0, "chưa xử lý xong hàng trả lại thì chưa nhập kho");
  await moBan("man=chi-tiet-don"); await banKb("ban-gap"); assert.equal((await hd()).hangChon, "ban-gap");
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /bán gấp tại chỗ/); await muaLam(/xử lý xong/);
  await muaLam(/Nhập kho/); assert.equal((await hd()).buoc, 15);
});

// ── lay-tai-vuon: hai cân lệch ──
await napKb("hai-can", { buoc: 7, daTra: 32200000, nbXn: 32200000 });
await buoc("[lay-tai-vuon] Cân người bán 2.000 · cân bên mua 1.940 → không tự chọn → cân lại 1.980 → nghiệm thu theo 1.980 kg", async () => {
  await moBan("man=chi-tiet-don"); await banKb("can-ban"); assert.equal((await hd()).phu, "can1");
  await moMua("chi-tiet-don"); await muaLam(/Cân của tôi: 1\.940/);
  assert.match(await viecMua(), /không tự chọn, không lấy trung bình/);
  assert.equal(await mua.locator(".sl-viec .sl-vang").count(), 0, "lệch cân thì bên mua không tự đi tiếp");
  await moBan("man=chi-tiet-don"); await banKb("can-lai");
  await moMua("chi-tiet-don"); await muaLam(/Xác nhận 1\.980/); assert.equal((await hd()).canXong, true);
  await moBan("man=ban-giao"); await ban.click("#bg"); await cho(1800); assert.equal((await hd()).buoc, 8);
  await moMua("chi-tiet-don"); await muaLam(/Đạt khi bốc/); await muaLam(/Ký nhận/);
  assert.match(await viecMua(), /1\.830 kg/); await muaLam(/Gửi kết quả/);
  await moBan("man=ket-qua"); assert.match(await ban.locator(".m-than").innerText(), /1\.830 kg/);
});

// ── vuon-du-luong-khong-dat ──
await napKb("du-luong", { buoc: 12, daTra: 32200000, nbXn: 32200000 });
await buoc("[vuon-du-luong-khong-dat] Dư lượng không đạt → kiểm lại mẫu lưu vẫn không đạt → hoàn cọc → người bán hoàn tiền hàng + phí kiểm", async () => {
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /cách ly/); await muaLam(/KHÔNG đạt/);
  await moBan("man=chi-tiet-don"); await banKb("dl-kiem-lai");
  await moMua("chi-tiet-don"); await muaLam(/vẫn không đạt/); await muaLam(/ngân hàng hoàn cọc/);
  assert.deepEqual(await tienMua(), [32338000, 0, 32200000], "cọc đã hoàn; chị Năm còn giữ 32,2 tr");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /hoàn 33\.700\.000/); await banKb("dl-nb-hoan");
  await moMua("chi-tiet-don"); await muaLam(/Đã nhận lại 33\.700\.000/); assert.equal((await hd()).dlXong, true);
  assert.deepEqual(await tienMua(), [138000, 0, 0], "bên mua chỉ còn mất phí giới thiệu");
});

// ── hai-ket-qua-khac ──
await napKb("hai-kq", { buoc: 12, daTra: 32200000, nbXn: 32200000 });
await buoc("[hai-ket-qua-khac] Phòng A không đạt · phòng B đạt → trái nhau, phòng trọng tài đạt → bên mua hoàn phí → ngân hàng chuyển cọc", async () => {
  await moMua("chi-tiet-don"); await muaLam(/phòng A báo KHÔNG đạt/);
  await moBan("man=chi-tiet-don"); await banKb("kq2");
  await moMua("chi-tiet-don"); await muaLam(/phòng B báo ĐẠT/);
  assert.match(await viecMua(), /trái nhau/);
  await muaLam(/trọng tài/); await muaLam(/Đã chuyển 2\.800\.000/);
  await moBan("man=chi-tiet-don"); await banKb("hk-phi-xn"); assert.equal((await hd()).hkXong, true);
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng chi cọc/); assert.equal((await hd()).buoc, 13);
  assert.equal((await tienMua())[2], 44350000);
});

// ── Lỗi cũ: trả sau tới bước 7 app bán ghi sai "Bên mua mới trả 0" ──
await napKb("tra-sau", { buoc: 7 });
await buoc("[trả sau · bước 7] App bán không báo nhầm \"bên mua mới trả 0\" khi trả sau", async () => {
  await moBan("man=chi-tiet-don"); assert.doesNotMatch(await viecBan(), /mới trả/);
});

// ── tra-sau-ngan-hang ──
await napKb("nh-cam-ket", { buoc: 3 });
await buoc("[tra-sau-ngan-hang] Không cọc: ngân hàng cam kết → bốc, nghiệm thu → ngân hàng giải ngân thẳng 44.350.000 → người bán xác nhận", async () => {
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /không chuyển cọc/); await muaLam(/cam kết thanh toán/);
  assert.equal((await hd()).buoc, 7);
  await moBan("man=chi-tiet-don"); assert.doesNotMatch(await viecBan(), /mới trả/);
  await moBan("man=ban-giao"); await ban.click("#bg"); await cho(1800);
  await moMua("chi-tiet-don"); await muaLam(/Đạt khi bốc/); await muaLam(/Ký nhận/); await muaLam(/Gửi kết quả/);
  await moBan("man=ket-qua"); await ban.click("#dy"); await cho(1800); assert.equal((await hd()).buoc, 12);
  await moMua("chi-tiet-don"); await muaLam(/giải ngân 44\.350\.000/);
  await moBan("man=chi-tiet-don"); await banKb("xn-gn"); assert.equal((await hd()).buoc, 14);
  assert.deepEqual(await tienMua2(), [0, 0, 44350000], "bên mua chưa chi đồng nào (nợ ngân hàng); chị Năm nhận đủ");
});

// ── tra-sau-mua-vi-pham ──
await napKb("nh-tu-choi", { buoc: 10, camKet: true });
await buoc("[tra-sau-mua-vi-pham] Bên mua từ chối cả lô → kiểm định đạt → quản trị duyệt → ngân hàng bồi thường người bán, ghi nợ bên mua → bên mua trả phí kiểm định", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Từ chối cả lô/); assert.equal((await hd()).phu, "tc");
  await muaLam(/hàng ĐẠT/); await muaLam(/quản trị duyệt/); await muaLam(/chi bồi thường/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /được bồi thường/);
  await moMua("chi-tiet-don"); await muaLam(/Đã trả phí kiểm định/); assert.equal((await hd()).tcXong, true);
  assert.deepEqual(await tienMua2(), [850000, 0, 44350000]);
});

// ── ung-tien ──
await napKb("ung", { buoc: 7 });
await buoc("[ung-tien] Người bán ứng 20 tr (phí 200k) → bốc, nghiệm thu → bên mua trả 30.550.000 vào tài khoản đơn → ngân hàng thu ứng, chuyển 24.350.000", async () => {
  await moBan("man=chi-tiet-don"); await banKb("de-nghi-ung");
  await moMua("chi-tiet-don"); await muaLam(/ngân hàng ứng 20\.000\.000/); assert.equal((await hd()).nbXn, 19800000);
  await moBan("man=ban-giao"); await ban.click("#bg"); await cho(1800);
  await moMua("chi-tiet-don"); await muaLam(/Đạt khi bốc/); await muaLam(/Ký nhận/); await muaLam(/Gửi kết quả/);
  await moBan("man=ket-qua"); await ban.click("#dy"); await cho(1800);
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /tài khoản đơn ở ngân hàng/); await muaLam(/Ghi đã trả 30\.550\.000/);
  await muaLam(/thu ứng/);
  await moBan("man=chi-tiet-don"); await banKb("xn-sau"); assert.equal((await hd()).nbXn, 44150000);
  await moMua("chi-tiet-don"); await muaLam(/Mô phỏng: ngân hàng/); assert.equal((await hd()).buoc, 14);
  assert.deepEqual(await tienMua2(), [44488000, 0, 44150000], "chị Năm nhận 44.350.000 − phí ứng 200.000");
});

// ── vuon-bien-the ──
await napKb("bien-the", { buoc: 7, daTra: 32200000, nbXn: 32200000 });
await buoc("[vuon-bien-the] Sai người → bổ sung danh sách; đòi hạ giá tại chỗ → người bán từ chối, giữ giá; xe thiếu tải → giữ 400 kg tới chuyến sau", async () => {
  await moBan("man=chi-tiet-don"); await banKb("bt-sai-nguoi");
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /không có tên trong danh sách/); await muaLam(/Bổ sung anh Lộc/);
  await muaLam(/đòi hạ giá/); assert.match(await viecMua(), /Không đổi giá tại chỗ/);
  assert.equal(await mua.locator(".sl-viec [data-lam]").count(), 0, "bên mua không tự hạ giá được");
  await moBan("man=chi-tiet-don"); await banKb("bt-tu-choi-gia");
  await moMua("chi-tiet-don"); await muaLam(/Xe thiếu tải/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /chỉ chở được 1\.600 kg/); await banKb("bt-hen-chuyen");
  assert.equal((await hd()).btXong, true);
  await moBan("man=ban-giao"); await ban.click("#bg"); await cho(1800); assert.equal((await hd()).buoc, 8);
});

// ── nhieu-de-nghi ──
await napKb("nhieu-de-nghi", { buoc: 0 });
await buoc("[nhieu-de-nghi] Người bán so tiền ròng (A 45,5 tr · B 46 tr), chọn B → hàng giữ, bên mua ký; bên mua không thấy giá bên khác", async () => {
  await moMua("chi-tiet-don"); const m = await viecMua();
  assert.match(m, /Đã gửi đề nghị: 23\.000/); assert.doesNotMatch(m, /24\.000/, "bên mua không thấy giá bên khác");
  await moBan("man=chi-tiet-don"); const b = await viecBan();
  assert.match(b, /45\.500\.000/); assert.match(b, /46\.000\.000/); assert.match(b, /chưa phải đã bán/);
  await banKb("chon-b"); assert.equal((await hd()).buoc, 1);
  await moMua("chi-tiet-don"); await muaLam(/Ký và gửi/); assert.equal((await hd()).buoc, 2);
});

// ── de-nghi-bo-cuoc ──
await napKb("bo-cuoc", { buoc: 1 });
await buoc("[de-nghi-bo-cuoc] B được chọn nhưng quá 24 giờ không ký → hủy giữ, mở lại lô → hỏi A → A còn mua → người bán chọn A", async () => {
  await moMua("chi-tiet-don"); await muaLam(/quá 24 giờ/); assert.equal((await hd()).phu, "mo-lai");
  assert.match(await viecMua(), /đã hết hạn/);
  assert.equal(await mua.locator(".sl-viec [data-lam]").count(), 0, "hết hạn thì bên mua không ký được nữa");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /đã mở lại/); await banKb("hoi-a"); await banKb("a-con"); await banKb("chon-a");
  assert.equal((await hd()).phu, "chon-a");
});

// ── den-xem-hang ──
await napKb("xem-hang", { buoc: 0 });
await buoc("[den-xem-hang] Xin khảo sát → người bán chọn giờ → địa chỉ và số chỉ hiện sau khi xác nhận lịch → xem rồi chưa mua", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Gửi yêu cầu khảo sát/);
  assert.doesNotMatch(await viecMua(), /0918/, "chưa xác nhận lịch thì chưa lộ số người bán");
  await moBan("man=chi-tiet-don"); const b = await viecBan(); assert.match(b, /xin đến xem vườn/); assert.doesNotMatch(b, /0277/, "chưa lộ số bên mua");
  await banKb("ks-ok");
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /0918 000 421/); await muaLam(/chưa mua/);
  assert.equal((await hd()).phu, "ks-xong");
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /chưa mua/);
});

// ── dang-ky ──
await napKb("dang-ky", { buoc: 0 });
await buoc("[dang-ky] Gửi đăng ký → nhân viên xác minh tại vườn → mở tài khoản, hạng ban đầu → ghi nhật ký → bên mua thấy rõ phần đã kiểm / tự khai", async () => {
  await moBan("man=chi-tiet-don"); await banKb("dk-gui");
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /xác minh tại vườn/); await muaLam(/xác minh xong/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /Tài khoản bán đã mở/); await banKb("dk-nhat-ky");
  await moMua("chi-tiet-don"); const m = await viecMua();
  assert.match(m, /Đã kiểm tại vườn/); assert.match(m, /Người bán tự khai/); assert.match(m, /nhật ký sản xuất 1 mục/);
});

// ── khong-co-dau-ra ──
await napKb("dau-ra", { buoc: 0 });
await buoc("[khong-co-dau-ra] 48 giờ không có đề nghị → nhân viên tìm → tách 2 tấn loại 2 cho nhà máy sấy → ngày 4 rút 4 tấn loại 1", async () => {
  await moMua("chi-tiet-don"); await muaLam(/hết 48 giờ/); await muaLam(/tách 2 tấn loại 2/);
  await moBan("man=chi-tiet-don"); await banKb("dr-tach-ok");
  await moMua("chi-tiet-don"); await muaLam(/Gửi đề nghị 2 tấn/); await muaLam(/ngày 4/);
  await moBan("man=chi-tiet-don"); assert.match(await viecBan(), /dừng tìm/i); await banKb("dr-dung");
  assert.equal((await hd()).phu, "dr-xong");
  await moMua("chi-tiet-don"); assert.match(await viecMua(), /đã rút 4 tấn/);
});

// ── dat-truoc ──
await napKb("dat-truoc", { buoc: 0 });
await buoc("[dat-truoc] Ký 8 tấn → cọc 36 tr → cập nhật vườn → chốt 9 tấn, bổ sung cọc 4,5 tr → giao → trả thẳng 94,5 tr → ngân hàng chuyển cọc 40,5 tr", async () => {
  await moMua("chi-tiet-don"); await muaLam(/Ký hợp đồng đặt trước/);
  await moBan("man=chi-tiet-don"); await banKb("dt-ky-ban");
  await moMua("chi-tiet-don"); await muaLam(/Chuyển cọc 36\.000\.000/);
  assert.deepEqual(await tienMua2(), [36000000, 36000000, 0]);
  await moBan("man=chi-tiet-don"); await banKb("dt-vuon");
  await moMua("chi-tiet-don"); await muaLam(/bổ sung cọc 4\.500\.000/);
  await moBan("man=chi-tiet-don"); await banKb("dt-giao");
  await moMua("chi-tiet-don"); await muaLam(/Ghi đã trả 94\.500\.000/);
  await moBan("man=chi-tiet-don"); await banKb("dt-xn");
  await moMua("chi-tiet-don"); await muaLam(/ngân hàng chuyển cọc/); assert.equal((await hd()).phu, "dt-xong");
  assert.deepEqual(await tienMua2(), [135000000, 0, 135000000], "9 tấn × 15.000: bên mua chi đủ, chị Năm nhận đủ");
  await moBan("man=chi-tiet-don"); assert.equal(await ban.evaluate(() => Number(document.querySelector("#o-bac b").dataset.v)), 135000000);
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
