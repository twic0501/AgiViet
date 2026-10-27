import test from "node:test";
import assert from "node:assert/strict";
import {
  money,
  moneyWords,
  quantity,
  date,
  grams,
  escapeHtml,
} from "../shared/format.js";
for (const [input, expected] of [
  ["0", "0 đ"],
  ["32200000", "32.200.000 đ"],
  ["9007199254740993", "9.007.199.254.740.993 đ"],
  ["-2500", "-2.500 đ"],
  [null, "Chưa có"],
])
  test("Tiền: " + input, () => assert.equal(money(input), expected));
for (const [input, expected] of [
  ["0", "Không đồng"],
  ["15", "Mười lăm đồng"],
  ["21", "Hai mươi mốt đồng"],
  ["105", "Một trăm lẻ năm đồng"],
  ["1005", "Một nghìn không trăm lẻ năm đồng"],
  ["32200000", "Ba mươi hai triệu hai trăm nghìn đồng"],
  ["1000000000", "Một tỷ đồng"],
  ["1000000000000", "Một nghìn tỷ đồng"],
  ["-23000", "Âm hai mươi ba nghìn đồng"],
])
  test("Đọc số: " + input, () => assert.equal(moneyWords(input), expected));
test("Gam sang kg", () => assert.equal(quantity("2000500"), "2.000,5 kg"));
test("Ngày giờ Việt Nam", () =>
  assert.equal(
    date("2026-11-04T23:30:00Z", { time: true }),
    "06:30 05/11/2026",
  ));
test("Ngày sai", () => assert.equal(date("invalid"), "Chưa có"));
test("Kg thành gam", () => assert.equal(grams("12.345"), "12345"));
test("Không nhận lượng âm hoặc quá chi tiết", () => {
  assert.throws(() => grams(-1));
  assert.throws(() => grams("0.0001"));
});
test("Chống chèn HTML", () =>
  assert.equal(escapeHtml('<img "x">&'), "&lt;img &quot;x&quot;&gt;&amp;"));
test("Không sai số nhị phân khi đổi 1,001 kg", () =>
  assert.equal(grams("1.001"), "1001"));
test("Đổi lượng lớn giữ chính xác bằng số nguyên", () =>
  assert.equal(grams("9007199254740.993"), "9007199254740993"));
