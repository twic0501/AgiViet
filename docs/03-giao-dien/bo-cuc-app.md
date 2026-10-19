# Bố cục hai app

## App Nhà sản xuất (điện thoại)

```
┌──────────────────────────────┐
│ AgiViet · Nhà sản xuất  [Đổi vai] [Tôi] │  thanh trên: tên app, Tôi
├──────────────────────────────┤
│                              │
│   Nội dung màn               │  một cột, rộng tối đa 420 px
│   (tiêu đề → thẻ → nút)      │
│                              │
│              (+)             │  nút giữa: Ghi nhật ký / Đăng hàng
├──────┬──────┬──────┬──────┬──────┤
│Hôm nay│ Vườn │ Bán │ Đơn │ Tiền │  thanh dưới 5 mục
└──────┴──────┴──────┴──────┴──────┘
```

| Mục | Màn đầu | Gồm |
|---|---|---|
| Hôm nay | `hom-nay` | Việc cần làm (đơn tới lượt mình, lời mời chờ trả lời), nhắc cách ly thuốc, tổng kết tuần |
| Vườn | `vuon` | Vườn, mùa vụ, nhật ký, thu chi, ghi bằng giọng nói, hồ sơ nguồn gốc (giai đoạn 2) |
| Bán | `hang` | Hàng đang bán, đăng hàng, khách hỏi mua, nhắn tin, báo giá, hẹn xem vườn |
| Đơn | `lich` | Đơn theo nhóm "tới lượt ai", chi tiết đơn, ký, cọc, cân, hủy, đối soát |
| Tiền | `tien` | Tiền đang giữ, tiền đã về, quyết toán, lịch sử |
| Tôi (góc trên) | `toi` | Hồ sơ, uy tín, cài đặt, hỗ trợ, tài khoản nhận tiền |

Trang **Bắt đầu** (đăng ký, đăng nhập) không có thanh.

## App Thu mua (máy tính)

```
┌──────────────┬──────────────────────────────────────┐
│ AgiViet·Thu mua│ Tên người dùng · nhóm màn     [Đổi vai] │
│ HÔM NAY      │                                      │
│  Tổng quan   │   Nội dung màn                       │
│ MUA HÀNG     │   (rộng tối đa 1100 px)              │
│  Nguồn hàng  │                                      │
│  Nhu cầu ... │                                      │
│ GIAO DỊCH    │                                      │
│  Đơn · Tiền  │                                      │
│ QUẢN LÝ      │                                      │
│  Kho · Nhà cung cấp · Kế hoạch · Thuế và báo cáo   │
│ TỔ CHỨC      │                                      │
│  Dịch vụ · Tổ chức                                  │
└──────────────┴──────────────────────────────────────┘
```

Dưới 760 px, thanh bên chuyển thành hàng trên cùng. Trang **Vào app** (đăng nhập, mã, thông tin tổ chức, chọn gói) không có thanh.

## Nguyên tắc từng loại màn

| Loại | Cấu trúc |
|---|---|
| Danh sách (đơn, lô, nhu cầu) | Tiêu đề → nhóm theo "tới lượt ai" (Bạn cần làm, Có vấn đề, Chờ bên kia, Đã xong, Đã kết thúc) → thẻ; trống thì màn trống nói việc đầu tiên nên làm |
| Chi tiết đơn | Mã đơn → thẻ chính (nhãn nhóm, thanh chặng, việc tiếp theo, các nút bước) → bên kia (liên lạc mở khi cọc) → số liệu → lịch sử |
| Biểu mẫu | Một việc một màn; ô số kèm đơn vị; lỗi hiện ngay dưới ô |
| Màn chưa làm | Khung bố cục: mỗi khu vực trong danh mục là một khối, theo thứ tự trên màn |

## Danh mục màn trong app

Mở `/danh-muc` để xem cả 129 màn, lọc theo vai và giai đoạn, bấm vào từng màn. Thêm hoặc sửa màn: sửa `apps/app-mo-phong/src/phan-he/danh-muc-man.ts`, chạy `npm run tai-lieu`.
