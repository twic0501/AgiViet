// Che liên lạc trước khi ngân hàng nhận cọc: số (kể cả đọc bằng chữ Việt/Anh), mã số thuế, mã vùng trồng, địa chỉ, tìm ngoài app.
import test from "node:test";
import assert from "node:assert/strict";
import { quetLienLacDayDu as q } from "../../lib/lien-lac.mjs";

const PHAI_CHAN = [
  ["không chín một tám không không không bốn hai mốt", "số điện thoại"],
  ["zero nine one eight zero zero zero four two one", "số điện thoại"],
  ["số em là 0 9 1 8 . 000 . 421", "số điện thoại"],
  ["anh cho em xin mã số thuế bên anh nha", "mã số thuế"],
  ["mst 0319990004", "mã số thuế"],
  ["cho em xin mã vùng trồng để em tra", "mã vùng trồng"],
  ["mã vùng trồng của tôi là VN-DTCT-0412", "mã vùng trồng"],
  ["MVT-DT-0412 nhé", "mã vùng trồng"],
  ["tìm trên google Vựa Ba Cường Cao Lãnh là ra", "địa chỉ, tìm ngoài app"],
  ["nhà tôi ở ấp 3 Mỹ Xương, ghé chơi", "địa chỉ, tìm ngoài app"],
  ["cho em xin địa chỉ số nhà", "địa chỉ, tìm ngoài app"],
  ["kết bạn zalo tên Năm Xoài nha", "kênh nhắn ngoài"],
];
const BINH_THUONG = ["Giá 24 ngàn được không anh?", "em lấy 2 tấn, giao sáng thứ 7 nha", "xoài ngọt, độ đường cao", "bên em lo xe tới vườn",
  "hàng xa quá không anh, ở huyện nào", "VietGAP còn hạn không anh", "lô L-0412 còn bao nhiêu kg", "hợp đồng HD-3001 ký chưa", "giá 26.000 đ/kg, lấy 1.200 kg ngày 19/11"];

test("chặn mọi kiểu lách liên lạc", () => {
  for (const [cau, loai] of PHAI_CHAN) { const r = q(cau); assert.equal(r.sach, false, cau); assert.ok(r.loai.includes(loai), `${cau} → ${r.loai}`); }
});
test("mã số thuế, mã vùng trồng, địa chỉ: thay cả tin bằng câu báo, không để lộ mẩu nào", () => {
  for (const cau of ["mã vùng trồng của tôi là VN-DTCT-0412", "nhà tôi ở ấp 3 Mỹ Xương, ghé chơi"]) { const r = q(cau); assert.match(r.che, /đã che/); assert.ok(!r.che.includes("0412") && !r.che.includes("Mỹ Xương")); }
});
test("không chặn nhầm câu thương lượng bình thường", () => {
  for (const cau of BINH_THUONG) assert.equal(q(cau).sach, true, cau);
});
