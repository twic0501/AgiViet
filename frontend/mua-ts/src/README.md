# mua-ts/src/ · Mã nguồn app người mua

| Tệp | Việc |
|---|---|
| `main.ts` | khởi động, điều hướng theo `#`, nạp lại dữ liệu (real-time `agv-thay-doi`, dự phòng 30 giây), Analytics |
| `api.ts` | gọi API `/v1/*`, phiên đăng nhập (`layPhien`) |
| `du-lieu.ts` | kho dữ liệu dùng chung giữa các màn (`DL`: lô, đơn, tin, tiền…) |
| `kieu.ts` | kiểu dữ liệu API |
| `ui.ts` | hàm vẽ nhỏ: `esc`, `vnd`, `kg`, `trong`… |
| `doi-tac-ao.ts` | bản thử: đánh thức người bán AI; khung "Ting" chỉ cho việc giá/điều khoản/hợp đồng (tin nhắn tự hiện qua real-time) |
| `man/hom-nay.ts` | Hôm nay: việc tới lượt, đủ/thiếu kg theo món |
| `man/nguon.ts` | Nguồn hàng + phiếu tìm nguồn (giá mong muốn giữ kín, giấy tờ, nhật ký canh tác, gom nhiều hộ → `POST /v1/sourcing/search`) |
| `man/nhu-cau.ts` | gửi phiếu cho người bán báo giá, xem phiếu đã gửi |
| `man/don.ts` | danh sách và chi tiết đơn |
| `man/tien.ts` | tiền: cọc ngân hàng giữ, đã trả, còn phải trả |
| `man/tin.ts` | tin nhắn + chat: dải trạng thái một dòng, tấm "Giá và điều khoản" (`<dialog>`) |

Thêm màn: tạo `man/<ten>.ts` xuất `ve<Ten>(o: HTMLElement)`, thêm nhánh trong `veTheoDuong()` ở `main.ts`, thêm tab trong `../index.html` nếu cần; chạy `npm run check`.
