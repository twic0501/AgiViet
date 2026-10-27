# Giao việc: kỹ sư giao diện (Codex gpt-6.1-sol)

Bạn là kỹ sư giao diện cấp senior cho AgiViet production v2, sàn B2B nông sản và thủy sản Việt Nam, tại `/home/twictrn/agiviet-production-v2`. Làm hai app dùng chung một backend thật: **app bán** (`frontend/ban/`, điện thoại trước, người bán 35–60 tuổi đọc chữ chậm, có người giúp thao tác thay) và **app mua** (`frontend/mua/`, máy tính trước, nhân viên mua hàng/kế toán/kho của nhà máy chế biến, doanh nghiệp xuất khẩu, vựa đầu mối, bếp nhỏ). Chữ giao diện tiếng Việt có dấu, không emoji; mã tiếng Anh, comment tiếng Việt ngắn.

## Làm tiếp, không làm lại
Nếu `frontend/ban` hoặc `frontend/mua` đã có mã, đọc `frontend/TIEN-DO.md` trước, giữ phần đúng, làm tiếp. Cập nhật `frontend/TIEN-DO.md` (đã xong, đang dở, bước kế) sau mỗi phần lớn.

## Phạm vi ghi
Chỉ `frontend/` (trừ `frontend/tham-khao/`, chỉ đọc) và `docs/frontend/`. Không sửa `backend/`, `db/`, `security/`, `docs/nghiep-vu/`. Cần API mới hoặc API sai thì ghi vào `docs/frontend/de-xuat-backend.md`, giao diện tạm hiện trạng thái "chưa có" chứ không bịa dữ liệu.

## Nguồn sự thật
- API: `docs/backend/openapi.yaml`, `docs/backend/huong-dan-giao-dien.md` (đăng nhập thử OTP `123456`, PIN `2468`, tài khoản ảo, `POST /v1/test/reset`). Chạy backend: `cd backend && npm start` (http://127.0.0.1:8080).
- Nghiệp vụ: `docs/nghiep-vu/` (đặc biệt 03 vòng đời đơn, 04 tiền và cọc, 06 kho/QR, 07 PDF, 09 tình huống kiểm thử, 10/11 nếu có về màn hình).
- Thiết kế đã được người dùng duyệt: `frontend/tham-khao/thiet-ke-so-lam-an/index.html` ("Sổ làm ăn"). Token: xanh `#1d5a42` cho hành động; vàng chỉ cho "tới lượt / hạn"; đỏ chỉ cho tiền nợ và lỗi; một font Be Vietnam Pro, 5 cỡ 32/22/17/15/13; viền 1px thay bóng 3D; bo góc 14. Tránh vẻ trẻ con: không font tròn Baloo, không nút vàng 3D.
- Linh vật, hiệu ứng và câu hướng dẫn: `frontend/tham-khao/hieu-ung-va-linh-vat/` (trâu C01, `linh-vat-nguyen.js` mesh-warp WebGL, `anh-trau.js` ảnh nhúng data URI, `hieu-ung-app.js/css`, `ban-do-man.js`). Giữ linh vật, hiệu ứng và câu hướng dẫn nhưng tiết chế, không che nội dung; trâu không có miệng. Font trong `fonts/`.

## Yêu cầu bắt buộc
1. Không lộ chữ dành cho lập trình viên hay "mô phỏng" giữa giao diện; chỉ một dải báo "Môi trường thử" duy nhất.
2. Trạng thái lấy từ API, không giữ bản sao lệch giữa các màn; tiền hiển thị số lớn kèm đọc bằng chữ; các bước theo một dải bước; mục "Vì sao?" thu gọn cho luật khó.
3. Luồng thanh toán rõ ràng: cọc 30% qua tài khoản đảm bảo ngân hàng, phần còn lại trả thẳng người bán có xác nhận OTP; cảnh báo lừa đảo ở bước OTP; nói rõ giao dịch ngoài app không được bảo vệ.
4. App bán: hôm nay (việc tới lượt), đăng lô, chào giá, hợp đồng (xem PDF, ký OTP), cọc đã về, giao nhận (QR/mã 6 số), nghiệm thu 3 phần (đạt/hạ cấp/trả lại, bấm "Không đúng"), quyết toán, tiền về, hủy, tranh chấp, sổ. Có lối tắt màn hình chính (PWA manifest + icon) và logo mang cảm giác Việt (tự vẽ SVG, chững chạc).
5. App mua: nguồn hàng/ghép cung–cầu (lý do khớp, không xếp theo giá rẻ nhất), nhu cầu mua, so báo giá, lập đơn = hợp đồng cọc, duyệt nội bộ theo hạn mức, cọc, quét QR nhận hàng, nghiệm thu, quyết toán, tranh chấp, thành viên tổ chức, gói (Miễn phí / Thu mua / Doanh nghiệp / Bếp).
6. Công cụ "đóng vai bên kia" chỉ ở môi trường thử để một người thử được cả hai bên.
7. Công nghệ: nhẹ, không cần bước build phức tạp (HTML/CSS/JS module thuần, hoặc Vite nếu thật cần). Có lớp gọi API chung (idempotency key, xử lý mã lỗi thống nhất), kiểu dữ liệu JSDoc hoặc TS sinh từ OpenAPI, hàm tiện ích định dạng tiền/ngày/số chữ.
8. Kiểm thử: unit test cho helper (định dạng tiền, đọc số bằng chữ, lớp API); Playwright chạy luồng thuận một đơn qua cả hai app trên backend thật (`createRequire(process.env.HOME + '/rnd idea/package.json')('playwright')`), chụp ảnh từng màn ở 390px (bán) và 1280px (mua), không lỗi JS. Tự xem lại ảnh chụp: chữ tràn, nút che, khoảng trắng vỡ phải sửa.

## Đánh giá thành thật (bắt buộc)
`docs/frontend/danh-gia-thanh-that.md`: màn nào chạy với API thật, màn nào còn thiếu API, số kiểm thử đạt/tổng thật, chỗ chưa đạt thiết kế. Không phóng đại.

## Tiết kiệm hạn mức
Không chờ vòng lặp, không sleep. Ưu tiên: lớp API + đăng nhập → luồng thuận một đơn ở cả hai app → các màn còn lại → kiểm thử → tài liệu. Xong in tóm tắt rồi dừng.
