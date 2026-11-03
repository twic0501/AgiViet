# Triển khai bản đi thi — miễn phí hoàn toàn (Vercel + Render + Neon)

| Phần | Dịch vụ | Gói |
|---|---|---|
| Frontend (bản build Vite `frontend/dist`) | Vercel | Hobby, miễn phí, không thẻ |
| Backend (Node/Fastify + AI đóng vai) | Render, Docker `infra/render/backend.Dockerfile` | Free, 512 MB, Singapore |
| CSDL PostgreSQL 17 | Neon | Free, Singapore |

Đã kiểm trên máy (04/11/2026, Postgres 17 + backend đúng cấu hình này):
- RAM backend đỉnh **~290 MB**, vừa gói Render free 512 MB. Nếu bỏ CSDL ngoài và chạy PGlite nhúng thì cần ~700 MB, không vừa gói free.
- Kịch bản hoàn tiền: 3 đơn hoàn tất, ngân hàng hoàn 1.170.000 cho bên mua.
- Kịch bản bên mua (giao thiếu 85%): ĐẠT.
- Đăng nhập chọn vai qua bản build: chạy được, không có lỗi JS.

## 1. Neon (CSDL)
1. Tạo project ở vùng **Singapore**, Postgres **17**. Lấy chuỗi kết nối của vai chủ (owner), có `sslmode=require`.
2. Từ gốc repo, chạy một lần (mật khẩu gateway tự chọn, dài, không ghi vào repo):
   ```bash
   THU=1 OWNER_URL='<chuỗi owner Neon>' GATEWAY_PASSWORD='<mật khẩu gateway>' node infra/render/nap-csdl.mjs
   ```
   Lệnh này nạp 89 migration, chợ mẫu và các vai runtime. `THU=1` tạo thêm vai đồng hồ để nút tua giờ chạy được; bản production thật **không** đặt cờ này.
3. Chuỗi cho backend: `postgresql://agv_backend_gateway:<mật khẩu gateway>@<host Neon>/<db>?sslmode=require`

## 2. Render (backend)
1. New → Blueprint, trỏ vào repo. File `render.yaml` ở gốc repo tạo dịch vụ `agiviet-api` (free, Singapore, Docker).
2. Nhập biến `DATABASE_URL` = chuỗi gateway ở bước 1.3.
3. Deploy, rồi mở `https://agiviet-api.onrender.com/health/ready`.
4. Gói free ngủ sau ~15 phút không dùng. Dùng UptimeRobot (miễn phí) gọi `/health/ready` mỗi 5 phút để máy luôn thức khi thi.

## 3. Vercel (frontend)
1. Import repo, **Root Directory = `frontend`**. `frontend/vercel.json` lo phần build, thư mục `dist` và chuyển tiếp `/v1/*` sang Render.
2. Nếu tên dịch vụ Render khác `agiviet-api`, sửa URL trong `frontend/vercel.json`.
3. Mở `https://<dự án>.vercel.app/` → màn đăng nhập → chọn vai.

## 4. Gắn domain `agiviet.id.vn`
Vào Vercel → Settings → Domains → thêm `agiviet.id.vn` (và `www`). Ở nhà đăng ký `.id.vn`, thêm đúng bản ghi A / CNAME mà Vercel hiển thị.

## Đặt lại dữ liệu demo
Dữ liệu trên Neon được giữ qua các lần khởi động lại. Muốn làm sạch trước buổi thi: tạo branch mới từ thời điểm ngay sau khi nạp ở Neon (hoặc xóa DB rồi chạy lại bước 1.2), sau đó khởi động lại dịch vụ Render.
