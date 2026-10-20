# Quyết định kỹ thuật

Mỗi quyết định ghi: bối cảnh, quyết định, hệ quả. Đổi quyết định thì thêm mục mới, không xóa mục cũ.

## QĐ-01 · Tách trang giới thiệu và app mô phỏng thành hai dự án (19/10/2026)

- **Bối cảnh:** bản trước gộp trang giới thiệu và hai app trong một thư mục triển khai, dùng chung tên miền và localStorage; sửa chỗ này dễ hỏng chỗ kia.
- **Quyết định:** hai dự án riêng, triển khai riêng, không dùng chung dữ liệu; chỉ liên kết bằng đường dẫn.
- **Hệ quả:** thiết kế và phát hành độc lập; nhận diện thương hiệu giữ đồng bộ bằng cùng bảng màu (mỗi dự án một bản `token.css`).

## QĐ-02 · Nghiệp vụ là hàm thuần trong một gói riêng (19/10/2026)

- **Bối cảnh:** bản trước để luật trong kho mô phỏng, giao diện tự đổi trạng thái; dẫn tới bán lố, xác nhận trùng, trả thiếu vẫn đóng đơn.
- **Quyết định:** `apDung(sổ, lệnh, người làm, giờ, chính sách) → sổ mới | lỗi`, không đọc giờ hệ thống, không lưu trữ. Một bảng luật cho mọi bước.
- **Hệ quả:** test được toàn diện (ma trận, ngẫu nhiên); máy chủ sau này dùng lại nguyên gói.

## QĐ-03 · TypeScript, Vite, React cho app; TypeScript thuần cho trang giới thiệu (19/10/2026)

- **Bối cảnh:** app có khoảng 130 màn hai vai, cần điều hướng, thành phần dùng lại, kiểm kiểu. Trang giới thiệu là một trang tĩnh.
- **Quyết định:** app dùng React 19 + React Router 7 + Vite; trang giới thiệu dùng Vite + TypeScript, không khung giao diện. Kiểm kiểu nghiêm (`strict`, `noUncheckedIndexedAccess`).
- **Hệ quả:** trang giới thiệu nhẹ (khoảng 10 KB JS); app khoảng 100 KB gzip.

## QĐ-04 · Danh mục màn là dữ liệu (19/10/2026)

- **Bối cảnh:** cần quản lý nhiều màn (app bán 82, app mua 49) theo giai đoạn và thiết kế độc lập từng màn.
- **Quyết định:** mọi màn khai báo trong `danh-muc-man.ts` (mã, vai, trang, giai đoạn, khu vực bố cục). Màn chưa làm tự hiện khung bố cục; tài liệu danh mục sinh từ tệp này.
- **Hệ quả:** thêm màn = thêm một dòng; test bảo đảm điều hướng không trỏ tới màn không có.

## QĐ-05 · Kiểm phiên bản khi ghi kho (19/10/2026)

- **Bối cảnh:** hai tab (hoặc sau này hai thiết bị) cùng sửa một đơn.
- **Quyết định:** kho đếm phiên bản; ghi chỉ thành công khi phiên bản chưa đổi từ lúc đọc; dịch vụ đọc lại và áp dụng lại một lần.
- **Hệ quả:** không mất thay đổi; bước trùng bị nghiệp vụ chặn.

## QĐ-06 · Tên tiếng Việt không dấu trong code (19/10/2026)

- **Bối cảnh:** đội và tài liệu dùng tiếng Việt; tên tiếng Anh dễ lệch nghĩa nghiệp vụ.
- **Quyết định:** tên biến, hàm, tệp bằng tiếng Việt không dấu (`xacNhanDon`, `con-phai-tra`), trùng thuật ngữ trong tài liệu. Thư viện ngoài giữ tên gốc.
