# thiet-ke/ · App người bán (đang chạy) + màn dùng chung

App người bán chạy thật ở `agiviet.id.vn/thiet-ke/ban-*.html`. HTML + JS module thuần, Vite đóng gói khi build (mỗi `.html` là một trang), kiểm kiểu bằng `tsc` (checkJs, `tsconfig.json` + `kieu-toan-cuc.d.ts`).

## Màn
| Nhóm | Tệp |
|---|---|
| Đăng nhập, khung máy tính | `dang-nhap.html`; `khung-dt.html` (+`.js`) mở app trong khung điện thoại khi xem trên máy tính |
| App bán: 5 tab | `ban-hom-nay`, `ban-hang-hoa` (chợ), `ban-dang-bai`, `ban-tin-nhan`, `ban-toi` |
| App bán: màn sâu | `ban-don` (chi tiết hợp đồng), `ban-hop-dong`, `ban-lo`, `ban-tien`, `ban-vuon`, `ban-khung`, `ban-nhu-cau`, `ban-thong-bao`, `ban-tro-chuyen`, `ban-tin-tuc`, `ban-thoi-tiet`, `ban-them` (màn phụ) |
| Màn sâu app mua (cũ, đang chuyển sang `mua-ts/`) | `mua.html` + `mua.js`, `mua-app.*`, `mua-moi.html`, `mua-that.js` |
| Trình diễn | `index.html` (mục lục màn), `hai-ben.html`, `testquytrinhapp.html`, `van-hanh.html`, `chon-tinh-nang-demo.html`, `doi-chieu-quy-tac.html` |

## Module dùng chung
| Tệp | Việc |
|---|---|
| `chung.js` | phiên đăng nhập (`phien()`), thanh tab, trợ lý trâu, đọc thành tiếng, đối tác AI bản thử, mở kênh real-time cho app bán |
| `the-giao-dich.js` | thẻ giao dịch trong chat: giá → khung điều khoản chung → điều khoản riêng (thêm/sửa/bỏ mục, ý kiến từng mục) → hợp đồng. Dùng cho **cả hai app** |
| `thoi-gian-thuc.js` | kênh real-time `/v1/events` (Server-Sent Events), phát sự kiện `agv-thay-doi` |
| `tro-chuyen-that.js`, `tro-chuyen.js`, `lien-lac.js` | chat thật; che số điện thoại, Zalo, tài khoản |
| `so-vuon.css`, `so-lam-an.css` (+`.js`) | hệ thiết kế app bán ("Sổ vườn") và app mua ("Sổ làm ăn"), xem `../.interface-design/system.md` |
| `chuyen-trang.*`, `hieu-ung-*`, `lich.js`, `huong-dan.js`, `qua-cau.js` | chuyển trang, hiệu ứng, lịch chọn ngày, hướng dẫn, quả cầu |

## Thêm màn
1. Đọc `../.interface-design/system.md` trước khi viết CSS; lớp mới dùng tiền tố riêng (`hd-`, `vu-`, `nc-`…).
2. Tạo `ban-<ten>.html`, nạp `chung.js` (phiên, thanh tab, real-time có sẵn). Vite tự nhận trang mới khi build.
3. Cần tự cập nhật khi dữ liệu đổi: `addEventListener("agv-thay-doi", (e) => …)` (`e.detail.giao_dich`, `e.detail.tin`).
4. Kiểm: `npm run check`, `node tests/kiem-trung-lop.mjs`, chụp 360 và 390 px.
