# Hệ thiết kế "Sổ vườn" — app bán AgiViet (bản mẫu E1, 30/10/2026, chờ người sáng lập duyệt)

Tệp: `frontend/thiet-ke/so-vuon.css`. Màn mẫu: `frontend/thiet-ke/ban-hom-nay.html?thu=0918000421` (stack thử).

## Hướng
- Người dùng: nhà vườn/HTX, mở app sáng sớm ngoài vườn, nắng chói, ngón tay to. Việc chính: biết hôm nay mình phải làm gì, đang chờ ai.
- Cảm giác: cuốn sổ ghi chép của vựa — chắc, rõ, ấm, không màu mè. Thân thiện ở lời ("bác"), chững chạc ở hình.
- Màu: giấy ngà `--giay`, mực lá xoài `--la`, dấu đỏ `--dau-do` (chỉ việc tới lượt bác), vàng xoài `--chin` (tiền/ngân hàng), xám `--cho` (đang chờ bên khác). Khối câu chính dùng `--nen-chinh` riêng (nền tối không dùng `--la` sáng).
- Điểm riêng: "con dấu tới lượt" (`.dau-luot`: BÁC nghiêng, đỏ / BÊN MUA, NGÂN HÀNG thẳng, nhạt) — chỉ dùng cho ai phải làm, không dùng cho mã lô; số lượng hàng đọc như mặt cân (`.can`, chữ số đều).
- Đã bỏ: lưới thẻ số liệu → một câu chính; nền chuyển màu → nền phẳng; tab biểu tượng → tab chữ.

## Số đo
- Chữ: Be Vietnam Pro (tự lưu), thang 1.25 từ 16px: 13 · 16 · 18 · 20 · 25 · 32. Phân tầng bằng cỡ + đậm (400/600) + 4 mức mực.
- Lưới 4px; lề trang 16px; khoảng giữa mục 24px; dòng sổ cao tối thiểu 64px, kẻ 1px `--ke`.
- Độ sâu: chỉ đổi sắc nền + đường kẻ mảnh, không đổ bóng. Bo góc 8 / 12 / 16.
- Nút: cao 48px, bo 12, ấn `scale(0.97)` 140ms `cubic-bezier(0.23,1,0.32,1)`. Tab dưới 5 mục chữ, cao 56px, mục đang mở có vạch 3px trên.
- Lời: nói rõ ai làm ("Chờ bên mua ký và gửi" / "Bác cần …"); không hứa thao tác chưa có.

## Đã kiểm
390×844 sáng + tối, dữ liệu thật (người bán có 2 hợp đồng / người bán chưa có hợp đồng / thiếu phiên → lỗi), không tràn ngang, 0 lỗi console.
