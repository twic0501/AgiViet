# shared/ · Thư viện của bản app đầu (`/ban/`, `/mua/`, `/quan-tri/`)

Các app ở `ban/`, `mua/`, `quan-tri/` dựng bằng `app.js` và các module ở đây. App đang trình diễn là `thiet-ke/` (người bán) và `mua-ts/` (người mua); thư mục này giữ cho trang quản trị và bộ E2E luồng chính.

| Tệp | Việc |
|---|---|
| `app.js`, `api.js`, `api-types.d.ts` | khung app, gọi API, kiểu API sinh từ OpenAPI (`npm run types`) |
| `seller.js`, `market.js`, `orders.js`, `amendments.js`, `services.js`, `enrollment.js` | màn bán, chợ, đơn, phụ lục, dịch vụ, đăng ký |
| `format.js`, `ui.js`, `form-errors.js`, `select.css`, `style.css` | định dạng tiền/ngày, thành phần giao diện, lỗi biểu mẫu |
| `virtual-money.js` | đổi nhãn ngân hàng/tài khoản ảo để trình bày |
| `ngoai-tuyen.js` | xem khi mất mạng + hàng đợi lệnh gửi sau |
| `giao-ngay-trang-thai.js`, `login-options.js`, `trau.js` | chọn màn theo trạng thái, cách đăng nhập, nhân vật trâu |
