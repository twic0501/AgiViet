// Kiểm chế độ ngoại tuyến bằng kho bộ nhớ. Chạy: node --test tests/ngoai-tuyen.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { NgoaiTuyen, khoBoNho, phanLoai } from "../shared/ngoai-tuyen.js";

function mayGui(kich_ban) {
  const da_goi = [];
  const gui = async (duong, than) => {
    da_goi.push({ duong, than: structuredClone(than) });
    const f = kich_ban.shift();
    if (!f) throw new TypeError("mất mạng");
    return f(duong, than);
  };
  return { gui, da_goi };
}
const ok = () => ({ status: 200, body: { id: "x", revision: 2 } });

test("ký, OTP, tiền, giá, giao nhận không được xếp hàng", () => {
  for (const d of ["/v1/orders/1/sign", "/v1/auth/otp/verify", "/v1/otp/challenges", "/v1/payments/1/report", "/v1/payments/1/confirm",
    "/v1/payout-accounts", "/v1/offers", "/v1/offers/1/accept", "/v1/orders/1/cancel", "/v1/deliveries/1/acceptance/agree",
    "/v1/amendments/1/sign", "/v1/credit-terms", "/v1/lots/1/publish", "/v1/khong-biet"]) {
    assert.equal(phanLoai(d).xep_hang, false, d);
    assert.ok(phanLoai(d).ly_do);
  }
  for (const d of ["/v1/farm-diary", "/v1/lots", "/v1/support", "/v1/seasonal-orders/7/production-updates"]) assert.equal(phanLoai(d).xep_hang, true, d);
});

test("thêm lệnh bị cấm thì báo CAN_MANG, không ghi vào hàng", async () => {
  const nt = new NgoaiTuyen({ kho: khoBoNho(), gui: async () => ok() });
  await assert.rejects(nt.them("/v1/orders/1/sign", {}), (e) => e.code === "CAN_MANG" && /OTP/.test(e.message));
  assert.equal((await nt.danhSach()).length, 0);
});

test("mất mạng giữ nguyên, có mạng gửi đúng thứ tự, cùng idempotency_key qua các lần thử", async () => {
  const kich_ban = [];
  const { gui, da_goi } = mayGui(kich_ban);
  const nt = new NgoaiTuyen({ kho: khoBoNho(), gui });
  const a = await nt.them("/v1/farm-diary", { note: "bón phân" });
  const b = await nt.them("/v1/lots", { product: "xoai" });
  let kq = await nt.dongBo();                       // mất mạng
  assert.deepEqual([kq.da_gui, kq.con_cho, kq.mat_mang], [0, 2, true]);
  assert.equal(da_goi.length, 1);                   // dừng ngay sau lỗi mạng đầu tiên
  kich_ban.push(ok, ok);
  kq = await nt.dongBo();
  assert.equal(kq.da_gui, 2);
  assert.deepEqual(da_goi.map((x) => x.duong), ["/v1/farm-diary", "/v1/farm-diary", "/v1/lots"]);
  assert.equal(da_goi[0].than.idempotency_key, a.than.idempotency_key);
  assert.equal(da_goi[1].than.idempotency_key, a.than.idempotency_key);
  assert.equal(da_goi[2].than.idempotency_key, b.than.idempotency_key);
  assert.notEqual(a.than.idempotency_key, b.than.idempotency_key);
  assert.equal((await nt.danhSach()).length, 0);
});

test("5xx giữ lại thử sau, không đánh dấu lỗi vĩnh viễn", async () => {
  const { gui } = mayGui([() => ({ status: 503, body: {} })]);
  const nt = new NgoaiTuyen({ kho: khoBoNho(), gui });
  await nt.them("/v1/support", { message: "hỏi" });
  const kq = await nt.dongBo();
  const [m] = await nt.danhSach();
  assert.equal(kq.mat_mang, true);
  assert.equal(m.trang_thai, "cho");
  assert.match(m.loi, /503/);
});

test("409 xung đột phiên bản: đánh dấu xung_dot, không tự ghi đè; gửi lại với revision mới thì cấp khóa mới", async () => {
  const xd = () => ({ status: 409, body: { errors: [{ code: "REVISION_XUNG_DOT", message: "Có người vừa cập nhật trước bạn.", fix: "Tải lại rồi làm lại." }] } });
  const kich_ban = [xd, ok];
  const { gui, da_goi } = mayGui(kich_ban);
  const nt = new NgoaiTuyen({ kho: khoBoNho(), gui });
  const m = await nt.them("/v1/seasonal-orders/7/production-updates", { expected_revision: 3, note: "ra hoa" });
  let kq = await nt.dongBo();
  assert.equal(kq.xung_dot, 1);
  let [x] = await nt.danhSach();
  assert.equal(x.trang_thai, "xung_dot");
  assert.equal(x.loi.code, "REVISION_XUNG_DOT");
  kq = await nt.dongBo();                           // không tự gửi lại mục xung đột
  assert.equal(da_goi.length, 1);
  await nt.guiLaiVoi(m.id, { expected_revision: 4, note: "ra hoa" });
  kq = await nt.dongBo();
  assert.equal(kq.da_gui, 1);
  assert.equal(da_goi[1].than.expected_revision, 4);
  assert.notEqual(da_goi[1].than.idempotency_key, m.than.idempotency_key);
});

test("4xx khác: đánh dấu loi kèm câu backend, mục sau vẫn được gửi", async () => {
  const sai = () => ({ status: 422, body: { errors: [{ code: "DU_LIEU_KHONG_HOP_LE", message: "Thiếu mặt hàng." }] } });
  const { gui } = mayGui([sai, ok]);
  const nt = new NgoaiTuyen({ kho: khoBoNho(), gui });
  await nt.them("/v1/lots", {});
  await nt.them("/v1/farm-diary", { note: "tưới" });
  const kq = await nt.dongBo();
  assert.deepEqual([kq.loi, kq.da_gui], [1, 1]);
  const [m] = await nt.danhSach();
  assert.equal(m.loi.message, "Thiếu mặt hàng.");
});

test("hai lượt đồng bộ cùng lúc không gửi trùng", async () => {
  let goi = 0;
  const nt = new NgoaiTuyen({ kho: khoBoNho(), gui: async () => { goi++; await new Promise((r) => setTimeout(r, 10)); return ok(); } });
  await nt.them("/v1/farm-diary", { note: "a" });
  await Promise.all([nt.dongBo(), nt.dongBo(), nt.dongBo()]);
  assert.equal(goi, 1);
});

test("bản đã tải lưu kèm thời điểm và revision", async () => {
  const nt = new NgoaiTuyen({ kho: khoBoNho(), gui: async () => ok(), bayGio: () => 1000 });
  await nt.luuDoc("don:HD-0018", { id: "HD-0018", revision: 5, status: "active" });
  const d = await nt.docDaLuu("don:HD-0018");
  assert.deepEqual([d.luc, d.revision, d.du_lieu.status], [1000, 5, "active"]);
  assert.equal(await nt.docDaLuu("khong-co"), null);
});
