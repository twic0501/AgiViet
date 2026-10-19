# Trang giới thiệu

Dự án `apps/web-gioi-thieu`. Hai tầng tách rời:

- **Nội dung** (`src/noi-dung/`): chỉ chữ và đường dẫn, có kiểu (`NoiDungTrang`). Chữ chưa chốt ghi `choChu("mô tả cần viết")`, trang hiện ô chờ viền vàng để người viết biết phải điền gì.
- **Bố cục** (`src/khu/`): mỗi khu một hàm `(nội dung) → HTML`. Không chứa chữ cố định.

Đổi chữ: chỉ sửa `noi-dung/trang-chu.ts`. Đổi bố cục: chỉ sửa `khu/` và `giao-dien/trang.css`.

## Thứ tự khu

| # | Khu | Mã | Mục đích |
|---|---|---|---|
| 0 | Đầu trang | | Logo, mục lục, nút Dùng thử (sang app) |
| 1 | Mở đầu | `dau` | Khẩu hiệu "Tìm đúng mối, chốt đúng giá", một câu giá trị, hai nút theo vai, ảnh hai thiết bị |
| 2 | Vấn đề | `van-de` | Ba nỗi lo: bị ép giá, sợ không được trả tiền, khó có nguồn ổn định |
| 3 | Cách hoạt động | `cach-hoat-dong` | Sáu chặng của một giao dịch |
| 4 | Cho nhà vườn | `nha-vuon` | Sổ làm vườn, đăng bán từ nhật ký, tiền về chắc chắn |
| 5 | Cho doanh nghiệp | `doanh-nghiep` | Nguồn đúng loại, đơn rõ tới lượt ai, kho, bảng kê |
| 6 | An toàn | `an-toan` | Tài khoản đảm bảo, liên lạc mở khi cọc, đối soát |
| 7 | Mặt hàng | `mat-hang` | Sáu nhóm mặt hàng |
| 8 | Bảng giá | `bang-gia` | Người bán miễn phí, bên mua Miễn phí và Business, phí theo đơn |
| 9 | Hỏi đáp | `hoi-dap` | Liên lạc, cọc, cân lệch, phí |
| 10 | Bắt đầu | `bat-dau` | Hai nút vào app theo vai |
| 11 | Chân trang | | Giới thiệu ngắn, liên kết |

## Liên kết sang app

Mọi nút vào app dùng `VITE_DUONG_DAN_APP` (mặc định `http://localhost:5173`), kèm `?vai=ban` hoặc `?vai=mua`. Đặt trong `.env.local` khi triển khai.
