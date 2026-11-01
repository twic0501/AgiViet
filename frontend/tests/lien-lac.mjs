// Kiểm bộ quét liên lạc thiet-ke/lien-lac.js: phải bắt các cách lách hay gặp, KHÔNG che nhầm số tiền / khối lượng / ngày / mã.
// Chạy: node tests/lien-lac.mjs
import { quetLienLacDayDu as q } from "../thiet-ke/lien-lac.js";
const PHAI_BAT = [
  "Chị gọi em 0918000421 nha", "0918 000 421", "0918.000.421", "0918-000-421", "0 9 1 8 0 0 0 4 2 1", "+84 918 000 421", "84918000421",
  "không chín một tám không không không bốn hai một", "khong chin mot tam khong khong khong bon hai mot", "không, chín, một, tám, linh, linh, linh, bốn, hai, một",
  "zalo em nha", "za lô 0918", "kết bạn fb em đi", "nhắn qua telegram", "phây búc em là Thu Hà",
  "STK VCB 1234567890", "agribank 0123 456 789", "số tài khoản 12345678",
  "xem thêm ở https://bit.ly/abc", "vào xoaicatchu.vn mà xem", "email em: thuha@gmail.com", "@thuha_dongxanh",
  // 02/11: các kiểu lách khó hơn
  "z.a.l.o 0918000421", "goi o9l8 ooo 421", "sdt ０９１８０００４２１", "số mình 0️⃣9️⃣1️⃣8️⃣000421", "khong9 mot8 000 421",
  "gmail namxoai at gmail dot com", "lien he 09.18.00.04.21", "vcb 0071 000 610 610", "kb zl chị nha 0918 000 421",
  "z.a.l.o anh Tư: khong chin bay bay khong khong khong sau mot khong",
];
const KHONG_DUOC_CHE = [
  "Cọc 13.800.000 đ, trả thẳng 32.200.000 đ", "Giá 23.000 đ/kg, lô 2.000 kg", "Tổng 46 triệu", "Giao ngày 28/10 lúc 5:30", "Lô L-0412 còn 3.500 kg",
  "Hợp đồng HD0018 đã ký", "Mai em gửi xe tới vườn nha chị", "Trái 350-550 g, hái 27/10", "Chị đồng ý 23 ngàn thì em soạn thỏa thuận", "Nghiệm thu 1.850 kg loại 1, 120 kg hạ cấp",
  "lô L-0412 hợp đồng HĐ-3005", "cọc 3.465.000 đồng", "xoài loại 1 nặng 350 gram mỗi trái", "tầm 15 tấn mỗi vụ", "mai 6h sáng xe tới", "mã niêm phong M-7710",
];
let dat = 0, hong = [];
for (const c of PHAI_BAT) { const r = q(c); if (!r.sach && !/0918|1234567890|thuha@|bit\.ly|xoaicatchu/.test(r.che)) dat++; else hong.push(["lọt", c, r.che]); }
for (const c of KHONG_DUOC_CHE) { const r = q(c); if (r.sach) dat++; else hong.push(["che nhầm", c, r.loai.join(", ")]); }
for (const [k, c, ly] of hong) console.log(`✖ ${k}: "${c}" → ${ly}`);
console.log(`${dat}/${PHAI_BAT.length + KHONG_DUOC_CHE.length} đạt (${PHAI_BAT.length} câu phải bắt, ${KHONG_DUOC_CHE.length} câu không được che)`);
process.exit(hong.length ? 1 : 0);
