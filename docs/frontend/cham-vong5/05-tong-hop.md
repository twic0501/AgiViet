# Vòng 5 — tổng hợp (03/11/2026)

## Điểm chấm chéo (trước khi sửa)
| Bảng | Claude | ChatGPT |
|---|---|---|
| A — app bán (70) | 58 | 54 |
| B — app mua (100) | 68 | 64 |
| C — dữ liệu, luồng, bằng chứng (50) | 41 | 36 |

Hai bên lệch nhau 4–5 điểm mỗi bảng. ChatGPT trừ chủ yếu ở bằng chứng (ảnh B15 lỗi), ở E2E chưa có kết luận đạt/thất bại, và ở chỗ app mua đếm kg sai.

## Sáu việc ChatGPT yêu cầu trước buổi thi: đã sửa hết
| # | Việc | Nhật ký | Commit |
|---|---|---|---|
| V5-1 | Đủ/thiếu kg: chỉ tính tuần này, chỉ đơn đã ký, không cộng trùng buổi gọi khung | E120 | 2ca81af |
| V5-2 | Script E2E bên mua bám đúng đơn và trả exit 1 khi hỏng; ca hoàn kiểm số tiền | E123 | 1b7042b |
| V5-3 | Khung HTX mở được từ menu; màn Tiền của HTX bỏ câu "chưa có hợp đồng" và "cọc 30%"; chụp lại B15 | E122 | c389ffc |
| V5-4 | Người bán ảo báo giá nhu cầu của bên mua | E119 | bb7fb20 |
| V5-5/6 | API tiền lỗi thì hiện "Chưa tải được" thay vì 0; dịch các trạng thái lệnh ngân hàng và cọc | E121 | 9e64d7b |

## Kiểm chứng sau sửa
- Stack mới, `kiem-cho-ai-hoan.mjs` ĐẠT:
  - HD-3001 chi người bán 2.340.000 + hoàn bên mua 1.170.000 = cọc 3.510.000.
  - Lệnh hoàn đã đối soát.
  - Nhà máy sấy Đồng Xanh thấy 1.170.000 "ngân hàng đã chuyển đến".
- Stack mới, `kiem-cho-ai-ben-mua.mjs` ĐẠT: HD-3001 hoàn tất ở vòng 10.
- Trình duyệt:
  - HTX 0907000300: Khung KH-2003 có đủ 4 dòng điều khoản; Tiền ghi cọc 1.120.000 kèm câu dẫn sang Khung tuần.
  - Chị Năm: Tiền vẫn liệt kê các hợp đồng.
  - Không trang nào tràn ngang.

## Còn để sau buổi thi
- #48: kiểm từng tình huống trên DB thật.
- #54: đo chịu tải và offline.
- Màn tin nhắn cũ chuyển hướng sang sheet tin nhắn (ChatGPT ghi là tùy chọn).
