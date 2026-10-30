# Chế độ ngoại tuyến (mất mạng)

Mô-đun dùng chung: `frontend/shared/ngoai-tuyen.js`. Vỏ app (HTML/JS/CSS, ảnh) do `frontend/sw.js` lưu; dữ liệu và hàng đợi nằm trong IndexedDB `agiviet-ngoai-tuyen` (bảng `doc`, `hang`).

## Làm được khi mất mạng
| Việc | Cách |
|---|---|
| Xem đơn, lô, hợp đồng, nhu cầu đã mở trước đó | `luuDoc(khoa, du_lieu)` sau mỗi lần tải thành công; `docDaLuu(khoa)` khi mất mạng. Giao diện **phải** ghi "Bản đã lưu lúc …" |
| Ghi nhật ký vườn | Xếp hàng `POST /v1/farm-diary` (tự điền `request_key` = `idempotency_key`) |
| Tạo lô hàng nháp | Xếp hàng `POST /v1/lots` (chỉ tạo nháp; **đăng lô cần mạng**) |
| Cập nhật tình hình sản xuất (đơn theo vụ) | Xếp hàng `POST /v1/seasonal-orders/:id/production-updates` |
| Gửi yêu cầu hỗ trợ | Xếp hàng `POST /v1/support` |
| Chụp ảnh chứng từ (lô, vườn, giao nhận, nghiệm thu, đơn, tranh chấp) | `anhThanhBase64(tep)` thu nhỏ cạnh dài ≤1600 px JPEG, rồi xếp hàng `POST /v1/files`. **Ảnh khoản tiền (`entity: payment`) không được chờ gửi.** |
| Nhật ký kèm ảnh | `photo_document_ids: [thamChieu(anh.id)]` — lúc gửi tự thay bằng mã tệp thật; ảnh lỗi thì nhật ký báo `PHU_THUOC_LOI`, không gửi mã sai |

## Luôn cần mạng (không xếp hàng)
Đăng nhập, OTP, ký, duyệt; mọi thao tác tiền (báo trả, xác nhận, tài khoản nhận tiền, trả chậm); chào giá/đồng ý/trả giá, hợp đồng, phụ lục, hủy; giao nhận, nghiệm thu; đăng lô/nhu cầu. Mọi đường không có trong danh sách được phép đều bị chặn (chặn mặc định) và trả lỗi `CAN_MANG` kèm lý do.

## Đồng bộ
- Gửi lần lượt theo thứ tự thêm, mỗi lượt chỉ một tiến trình (gọi `dongBo()` khi có sự kiện `online`, khi mở app, sau khi đăng nhập).
- Mỗi mục được cấp `idempotency_key` một lần khi thêm; gửi lại luôn dùng cùng khóa → mất phản hồi giữa chừng cũng không tạo trùng (đã kiểm với backend thật).
- Lỗi mạng hoặc 5xx: dừng lượt, giữ mục, thử lại lần sau.
- 409 `REVISION_XUNG_DOT` / `PHIEN_BAN_DA_DOI`: mục chuyển `xung_dot`, **không tự ghi đè**. Giao diện hiện bản mới, người dùng chọn bỏ (`boQua`) hoặc gửi lại với revision mới (`guiLaiVoi`, cấp khóa mới vì nội dung đã đổi).
- 4xx khác: mục chuyển `loi`, giữ câu báo và cách khắc phục của backend; mục sau vẫn được gửi.

## Kiểm thử
- `node --test tests/ngoai-tuyen.test.mjs` — chính sách, thứ tự, khóa, 5xx, xung đột, lỗi, đồng bộ đồng thời, bản đã lưu (kho bộ nhớ).
- `node tests/ngoai-tuyen-that.mjs` — backend thật trên stack thử 18980: chặn ký; mất mạng giữ lệnh; lần đầu tới máy chủ nhưng mất phản hồi → gửi lại cùng khóa chỉ tạo **1** dòng nhật ký.
- Trình duyệt thật (Playwright): IndexedDB giữ hàng đợi và bản đã lưu qua lần mở lại, đồng bộ hết khi có mạng, thao tác tiền bị chặn.

## Đề xuất backend (chưa sửa, cần người sáng lập duyệt vì đổi CSDL)
**Giờ chụp ảnh khi mất mạng bị mất:** `/v1/files` không nhận thời điểm chụp; CSDL đóng dấu giờ lúc tải lên. Ảnh chụp tại vườn lúc 7 giờ, có mạng lúc 15 giờ sẽ mang giờ 15 giờ — sai với chứng từ cân/giao. Đề xuất migration thêm `captured_at` (nhận từ app, ghi nhãn "giờ máy khai", từ chối nếu lệch tương lai hoặc cũ hơn 7 ngày) và hiển thị cả hai giờ. Hàng đợi đã giữ `tao_luc` (giờ chụp) sẵn để gửi khi backend nhận.

## Chưa làm
Gắn vào giao diện (nhãn "đang chờ gửi"/"xung đột", nút gửi lại/bỏ, "Bản đã lưu lúc …") — ở bước E.
