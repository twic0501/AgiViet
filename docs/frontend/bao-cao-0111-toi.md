# Báo cáo tổng hợp tối 01/11/2026

## 1. Trâu (Claude 2, PR #1 `trau-goc-nhin`)

- Commit cuối `d82668e` lúc 13:58 (sửa 4 lỗi nhỏ sau rà soát lần 2). Từ đó tới tối **không có commit mới**; không có phiên Claude 2 nào đang chạy trên máy.
- PR #1 **đang mở, gộp được** (MERGEABLE) — chờ người sáng lập quyết gộp.
- Đã dò lại: 12 ảnh tư thế đúng C01 (không miệng, mắt chấm, mõm 2 lỗ); `trau-v4.riv` và `trau-v3.riv` nạp trên trình duyệt 0 lỗi, đủ đầu vào `hanh_dong`, `huong`, `cham`, `nhin_x`, `nhin_y` (+ `vao` ở v4); hành động 16 ra đúng dáng. Ảnh 09 ngọn chuối còn chạm mép khăn (nhẹ).
- Còn mở trong tài liệu bàn giao (`docs/trau/BAN-GIAO-TRAU.md`), chờ người sáng lập duyệt:
  - 3 động tác lúc rảnh (ngáp, chỉnh khăn, chợt thấy rồi chỉ) + chạm 3 phản ứng ngẫu nhiên.
  - Chặng 4: góc ¾ / nghiêng — bảng dáng tay mục đích chờ duyệt; góc sau lưng chưa làm.
  - Dáng ngồi / cầm đồ: ghi "chưa đạt" (ghế bị thân che, thúng nhỏ) ở bản cũ.
- Sau khi gộp PR: dựng tour lần đầu, bong bóng, nút "?", màn trống trên giao diện mới bằng `trau-v4.riv` (chỉ app bán).

## 2. Đối chiếu 69 quy tắc v23

Trang: `/thiet-ke/doi-chieu-quy-tac.html` (đọc chữ quy tắc thẳng từ `quy-trinh.json`, lọc theo mức).

| Mức | Số |
|---|---|
| Có trong mô phỏng + có test | 23 |
| Có một phần / chỉ ghi chữ | 19 |
| Lệch v23 | 6 (HT01, HT02, HT04, HT22, HT31, HG03) |
| Chỉ chạy bước ở trang vận hành | 3 |
| Chưa có | 16 |
| Ngoài phạm vi giao diện (backend) | 2 (HT17 idempotency, VH04 phân quyền) |

Lệch chính: quyết toán theo phần khi tranh chấp (v23 trả ngay phần công nhận); ba mức đóng đơn / trạng thái cuối nhánh (app vẫn ghi "Hoàn tất"); hạn cọc hàng tươi 12 giờ (app 48 giờ).
Chưa có, đáng làm trước: thông báo đã gửi/đọc/làm (HT15), kho bên mua tách 3 loại (HT09), tạm dừng hạn khi sự cố (VH07), kháng nghị / xem lại quyết định (VH06, VH12), phiếu nghĩa vụ 24 giờ (HG01).

## 3. ChatGPT (Codex) soát bố cục 16 màn

Chi tiết: `docs/frontend/codex-soat-bo-cuc-0111.md`, ảnh: `docs/frontend/anh-soat-bo-cuc-0111/`. **Chưa sửa gì** — màn đã chốt cần người sáng lập quyết.

5 vấn đề nên sửa trước (theo Codex):
1. **Màn hợp đồng (mẫu app bán 10, app mua điện thoại 14)** — mức cao: 15 bước dài đứng trước thỏa thuận; nên thu gọn theo 5 chặng, giữ việc hiện tại + hành động chính ở trên. *(Không phải màn đã chốt — có thể sửa.)*
2. **Sổ vườn (07, đã chốt)** — cao: chữ phụ và nút "Sửa" nhỏ, danh sách dài; nhóm theo tháng/đợt.
3. **Đăng bài (03, đã chốt)** — cao: chữ lựa chọn nhạt, trạng thái chọn Loại 1 / Loại 2 chưa rõ.
4. **Trang chủ, Tin nhắn, Hợp đồng (01, 04, 08, đã chốt)** — vừa: tên đối tác / mã / trạng thái bị cắt hoặc dồn dòng.
5. **Trò chuyện (05, đã chốt)** — vừa: nút "Hẹn xem…" ở thanh thao tác bị cắt mép phải.

Khác: app mua nguồn hàng (12) vùng hình quá cao; tổng quan mua (11) bảng việc xuống 3 dòng; trang thử quy trình (16) app bên chờ bị phủ tối khó đọc.

Giữ: màu nền sáng + xanh đậm + vàng nhấn nhất quán; màn Tiền đã về (09) thứ tự đọc tốt; app mua máy tính hai cột rõ.

## 4. Trạng thái chung

- Mô hình quy trình v23: 59/59 tình huống có chỗ chạy thử (40 hai app, 19 trang vận hành); tests 40/40, 12/12, 39/39, 23/23; chuyển trang 26/26; E2E app bán 24/24.
- Nhánh `production-test`, chưa push.

## 5. Chờ người sáng lập quyết

1. Gộp PR #1 (trâu) và duyệt các mục trâu còn mở.
2. Sửa màn đã chốt theo góp ý bố cục nào (mục 3).
3. 6 chỗ lệch v23 (mục 2) + 10 điểm nghiệp vụ Codex nêu trước (`codex-nhap-vai-ben-mua-0111.md`).
4. Bật lại agiviet.id.vn (cloudflared).
