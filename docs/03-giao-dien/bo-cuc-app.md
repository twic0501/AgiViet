# Bố cục hai app

## App Nhà sản xuất (điện thoại)

```
┌──────────────────────────────┐
│ Mô phỏng: Giả lập · Phòng thử │  dải công cụ (chỉ bản mô phỏng)
├──────────────────────────────┤
│ [←] Tên màn        [Chuông] [Tôi] │  thanh trên
├──────────────────────────────┤
│                              │
│   Nội dung màn               │  một cột, rộng tối đa 420 px
│   (tiêu đề → thẻ → nút)      │
│                              │
│                              │
├──────┬──────┬──────┬──────┬──────┤
│Hôm nay│ Vườn │ (+) │ Bán │ Đơn │ Tiền │  thanh dưới: 5 mục + nút giữa Đăng hàng
└──────┴──────┴──────┴──────┴──────┘
```

| Mục | Màn đầu | Gồm |
|---|---|---|
| Hôm nay | `hom-nay` | Việc cần làm (đơn tới lượt mình, lời mời chờ trả lời), nhắc cách ly thuốc, tổng kết tuần |
| Vườn | `vuon` | Vườn, mùa vụ, nhật ký, thu chi, ghi bằng giọng nói, cách ly, hồ sơ nguồn gốc |
| Bán | `hang` | Hàng đang bán, đăng hàng, khách hỏi mua, nhắn tin, báo giá, hẹn xem vườn |
| Đơn | `lich` | Đơn theo nhóm "tới lượt ai", chi tiết đơn, ký, cọc, cân, hủy, đối soát |
| Tiền | `tien` | Tiền đang giữ, tiền đã về, quyết toán, lịch sử |
| Tôi (góc trên) | `toi` | Hồ sơ, uy tín, cài đặt, hỗ trợ, tài khoản nhận tiền |

Trang **Bắt đầu** (đăng ký, đăng nhập) không có thanh.

## App Thu mua (máy tính, giai đoạn 2)

```
┌──────────────┬──────────────────────────────────────┐
│ AgiViet·Thu mua│ Tên người dùng · nhóm màn               │
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
| Màn mở sai bước | Nói rõ đơn đang ở bước nào và nút về chi tiết đơn, không hiện nút của bước khác |

## Danh mục màn trong app

Danh mục 82 màn app bán ở `apps/app-ban/src/danh-muc-man.ts`; mỗi màn mở ở `/<mã>`. Thêm màn: thêm vào danh mục, viết giao diện trong `apps/app-ban/src/man/`, đăng ký ở `ung-dung.tsx` (bài thử báo nếu thiếu), chạy `npm run tai-lieu`.
