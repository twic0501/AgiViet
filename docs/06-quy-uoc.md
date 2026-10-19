# Quy ước làm việc

## Đặt tên

- Code: tiếng Việt không dấu. Biến, hàm theo kiểu lạc đà (`xacNhanDon`, `conPhaiTra`); thành phần React viết hoa chữ đầu (`ThanhChang`); tệp, thư mục, lớp CSS theo kiểu gạch ngang (`truy-van.ts`, `tp-nhom`).
- Thuật ngữ trong code trùng thuật ngữ trong tài liệu (đơn, lô, cọc, chặng, tới lượt ai…). Thuật ngữ mới: thêm vào tài liệu nghiệp vụ trước.
- Mã trạng thái kiểu gạch dưới (`cho_ban_xac_nhan`); không đổi mã đã dùng, chỉ thêm.

## Tầng

- Giao diện không gọi thẳng kho hay `apDung`; mọi thay đổi đi qua `DichVuGiaoDich.thucHien`.
- Thành phần trong `giao-dien/thanh-phan` chỉ nhận props.
- Tầng nghiệp vụ không dùng `Date.now()`, `localStorage`, DOM.
- Trang giới thiệu không nhập gì từ `packages/` hay `apps/app-mo-phong`.

## Nhánh và commit

- Nhánh chính `main` (nên bật bảo vệ nhánh trên GitHub: bắt buộc pull request và kiểm tra xanh); làm trên nhánh theo việc: `giai-doan-1/dang-lo`, `sua/coc-qua-han`.
- Mở pull request vào `main`; kiểm tra tự động phải xanh.
- Thông điệp commit tiếng Việt, dòng đầu ≤ 72 ký tự, nói việc đã làm: `Nghiệp vụ: chặn bán lố khi xác nhận đơn`. Tiền tố theo phần: `Nghiệp vụ:`, `App:`, `Web:`, `Tài liệu:`, `Hạ tầng:`.
- Đổi nghiệp vụ, tài liệu và test trong cùng một commit.

## Chữ trong app

- Viết từ phía người dùng: gọi đúng thứ họ nhận ra (đơn, lô, tiền về), không dùng từ kỹ thuật.
- Nút nói đúng việc sẽ xảy ra ("Xác nhận đơn", "Đặt cọc vào tài khoản đảm bảo"); thông báo sau đó nói việc đã xảy ra.
- Lời báo lỗi nói sai ở đâu và sửa thế nào, có con số cụ thể ("Lô chỉ còn bán được 1.000 kg, đơn cần 3.000 kg").
- Câu ngắn, chủ động. Số tiền, số cân dùng dấu chấm phân cách hàng nghìn, chữ số đều nhau.
- Không dùng: "vui lòng", "thao tác thành công", chữ viết hoa toàn bộ, biểu tượng cảm xúc.
