// Kiểm bộ quét liên lạc thiet-ke/lien-lac.js: phải bắt các cách lách hay gặp, KHÔNG che nhầm số tiền / khối lượng / ngày / mã.
// Chạy: node tests/lien-lac.mjs
import { quetLienLacDayDu as q } from "../thiet-ke/lien-lac.js";
const PHAI_BAT = [
  "Chị gọi em 0918000421 nha", "0918 000 421", "0918.000.421", "0918-000-421", "0 9 1 8 0 0 0 4 2 1", "+84 918 000 421", "84918000421",
  "không chín một tám không không không bốn hai một", "khong chin mot tam khong khong khong bon hai mot", "không, chín, một, tám, linh, linh, linh, bốn, hai, một",
  "zalo em nha", "za lô 0918", "kết bạn fb em đi", "nhắn qua telegram", "phây búc em là Thu Hà",
  "STK VCB 1234567890", "agribank 0123 456 789", "số tài khoản 12345678",
  "xem thêm ở https://bit.ly/abc", "vào xoaicatchu.vn mà xem", "email em: thuha@gmail.com", "@thuha_dongxanh",
];
const KHONG_DUOC_CHE = [
  "Cọc 13.800.000 đ, trả thẳng 32.200.000 đ", "Giá 23.000 đ/kg, lô 2.000 kg", "Tổng 46 triệu", "Giao ngày 28/10 lúc 5:30", "Lô L-0412 còn 3.500 kg",
  "Hợp đồng HD0018 đã ký", "Mai em gửi xe tới vườn nha chị", "Trái 350-550 g, hái 27/10", "Chị đồng ý 23 ngàn thì em soạn thỏa thuận", "Nghiệm thu 1.850 kg loại 1, 120 kg hạ cấp",
];
let dat = 0, hong = [];
for (const c of PHAI_BAT) { const r = q(c); if (!r.sach && !/0918|1234567890|thuha@|bit\.ly|xoaicatchu/.test(r.che)) dat++; else hong.push(["lọt", c, r.che]); }
for (const c of KHONG_DUOC_CHE) { const r = q(c); if (r.sach) dat++; else hong.push(["che nhầm", c, r.loai.join(", ")]); }
for (const [k, c, ly] of hong) console.log(`✖ ${k}: "${c}" → ${ly}`);
console.log(`${dat}/${PHAI_BAT.length + KHONG_DUOC_CHE.length} đạt (${PHAI_BAT.length} câu phải bắt, ${KHONG_DUOC_CHE.length} câu không được che)`);
process.exit(hong.length ? 1 : 0);
