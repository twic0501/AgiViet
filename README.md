# AgiViet · Hệ thống (API + CSDL)

> **Nhánh `trien-khai`: bản đang chạy** ở https://agiviet-23a94.web.app (Firebase Hosting, bản tĩnh).
> Bản đang thử nghiệm (kho mới chia tầng, app bán 80 màn, máy chủ mô phỏng) nằm ở nhánh **`thu-nghiem`** của cùng kho.
>
> | Thư mục | Lên site ở |
> |---|---|
> | `fe-nongdan/` | `/ban/` app Nhà sản xuất |
> | `fe-thumua/` | `/mua/` app Thu mua |
> | `site/` | `/` trang giới thiệu |
> | `src/`, `db/` | API + CSDL (chưa lên site; site đang tắt API) |
>
> Triển khai lại: `npm run deploy` (đóng gói `hosting-build/` từ ba thư mục trên rồi đẩy lên Firebase).
>
> **Nhánh `lam-lai-html` (đang thử nghiệm):** app bán làm lại theo nghiệp vụ mới, 82 màn vẽ từ động cơ `dong-co/`
> (`js/dong-co.js` = luật + máy chủ mô phỏng, `js/khung.js` = khung vẽ màn, `js/man/*.js` = từng trang). Dữ liệu mẫu tự nạp lần đầu;
> đăng nhập số 0918 234 421, mã 123456; dải "Mô phỏng" mở Giả lập bên mua và Phòng thử.
> - `npm run dong-co`: build lại `js/dong-co.js` sau khi sửa `dong-co/` (`npm --prefix dong-co test` chạy 112 test nghiệp vụ)
> - `npm run trang-ban`: sinh lại các trang HTML của app bán từ bảng `TRANG` trong `js/khung.js`
> - `npm run deploy:thu`: đăng lên link thử nghiệm (kênh `thu-nghiem`, 30 ngày), không đụng site chính
> - `npm run test:ban [base]`: 18 điểm kiểm luồng thật trên trình duyệt

Hệ thống thật phía sau hai giao diện `fe-nongdan/` (Nhà sản xuất) và `fe-thumua/` (Thu mua),
làm theo **Đặc tả kiến trúc v4** và **Quy trình vận hành v3** (`~/Downloads/AgriMatch_*_v3.md`, `_v4.md`).

- Node ≥ 22.5, **không cần cài thư viện** (dùng `node:http`, `node:sqlite`, `node:test`).
- CSDL SQLite quan hệ: khóa ngoại, unique, ràng buộc XOR, giao dịch `BEGIN IMMEDIATE`.
  Tiền là số nguyên đồng, khối lượng là gam (không float). Schema: `db/schema.sql` (~50 bảng).
- Một máy chủ phục vụ API và cả hai giao diện.

## Chạy

```bash
npm run du-lieu-mau     # tạo lại data/agiviet.db với dữ liệu mẫu (chạy qua API, có lịch sử)
npm start               # http://127.0.0.1:8790
npm test                # 20 kiểm thử theo ca T của Quy trình v3
```

| Địa chỉ | Dành cho |
|---|---|
| `/ban/` | App Nhà sản xuất (người bán) |
| `/mua/` | App Thu mua (bên mua) |
| `/api/health` | Kiểm tra máy chủ |

**Đăng nhập demo** (mã OTP luôn là `123456`, hiện trên màn hình, không gửi SMS thật):

| Số điện thoại | Người | Vào |
|---|---|---|
| 0912345123 | Chị Năm (bán xoài, thanh long, tôm) | `/ban/` |
| 0909000456 | Anh Trí · Nhà máy sấy Đồng Xanh (mua) | `/mua/` |
| 0903000222 | Bên mua B (HĐ-0231 với chị Năm) | `/mua/` |
| 0918000772 | Chị Út Mai (HĐ-0243 đang tranh chấp 150 kg) | `/ban/` |
| 0918000771 | Anh Phúc · vựa Phúc Thịnh (HĐ-0245) | `/ban/` |
| 0900000000 | Vận hành AgiViet (chạy việc nền, báo cáo pilot) | API |

Số mới cũng đăng ký được ngay trên giao diện (bên bán: đi qua vai trò → mặt hàng → hồ sơ).

Biến môi trường: `PORT`, `AGIVIET_DB`, `FE_BAN`, `FE_MUA` (thư mục giao diện), `AGIVIET_DEMO=0` để tắt chế độ demo (OTP ngẫu nhiên).

## Deploy (Firebase Hosting, bản tĩnh)

Site **https://agiviet-23a94.web.app** (project `agiviet-23a94`) đã thay bản `rnd idea` từ 30/09/2026:
`/` trang chọn app, `/ban/` Nhà sản xuất, `/mua/` Thu mua; `/san-xuat/`, `/thu-mua/` cũ chuyển hướng sang app mới.

```bash
npm run deploy          # đóng gói ~/fe-nongdan + ~/fe-thumua vào hosting-build/ rồi deploy CHỈ hosting
node test/hosting.mjs https://agiviet-23a94.web.app   # kiểm tra site thật
```

- Bản hosting **chưa có backend**: HTML được chèn `<meta name="agiviet-api" content="off">` nên hai app chạy số liệu mẫu tĩnh.
- Firestore rules/indexes của `rnd idea` **không bị đụng tới**.
- `sw.js` là service worker tự hủy để gỡ PWA cũ của `rnd idea` khỏi máy người dùng cũ.
- Quay lại bản cũ: Firebase Console → Hosting → lịch sử phát hành → Rollback.
- Muốn đưa backend lên: cần bật gói Blaze và chọn nơi lưu dữ liệu (Cloud Run + Firestore hoặc Cloud SQL), vì SQLite không bền trên Cloud Run.

## Dữ liệu mẫu có gì

- **Phía chị Năm:** 3 lô (xoài 10 tấn ước tính; thanh long 3,2 tấn đã cân; tôm mùa vụ lâu chưa xác nhận → ngừng nhận đề nghị),
  HĐ-0231 với Bên mua B (có hỗ trợ, cọc 10 triệu đã xác nhận, **kết quả cân đợt 1 chờ chị Năm xác nhận**),
  Bên mua D chờ kết nối (có chỉ báo trả tiền 4 đơn, đúng hạn 3/4), Bên mua F hỏi giá riêng, Đ-0244 tự giao dịch, HĐ-0232 chờ xác nhận.
- **Phía Đồng Xanh:** hạn mức 3 đã dùng + 2 đang tạm giữ, tin mua 4/5; HĐ-0245 anh Phúc (đợt 1 đã trả), HĐ-0243 chị Út Mai
  (phản đối 150 kg → vụ TC-0001, phí chỉ tính 3.850 kg), HĐ-0239 HTX chờ ký bản 2, Đ-0247 tự giao dịch chờ trả tiền,
  báo giá cô Hai Thu cho N-014, hóa đơn phí dịch vụ, tài khoản nhận tiền của chị Út Mai vừa đổi (có cảnh báo khi trả).

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/lib/core.js` | CSDL, giao dịch, đồng hồ (giả được khi kiểm thử), lỗi E01–E16, audit/outbox/thông báo |
| `src/lib/rules.js` | Hạn mức, biểu phí, thời hạn, cách tính phí (thuần, có kiểm thử) |
| `src/modules/dinh-danh.js` | OTP, tổ chức, thành viên, người thân dự phòng, tài khoản nhận tiền (BR-08), báo mất quyền |
| `src/modules/nguon-hang.js` | Danh mục + mặt hàng tự nhập, lô (BR-10), nhu cầu, kết nối tạm giữ lượt (BR-05), hỏi giá (BR-46), báo giá, chỉ báo (BR-43) |
| `src/modules/don-hang.js` | Hợp đồng khung, đơn ≤ 90 ngày (BR-39), phiên bản, xác nhận/ký, giữ chỗ (BR-16), dịch vụ hỗ trợ (BR-40, 41, 44), hủy |
| `src/modules/giao-nhan.js` | Kết quả cân có phiên bản (BR-18), nhãn nguồn (BR-42), bất đồng → chuyển cơ chế tiếp theo (BR-44) |
| `src/modules/tien.js` | Nghĩa vụ, hướng dẫn chuyển tiền, báo đã trả/xác nhận (BR-22), phí thành công lũy kế, hóa đơn phí (BR-45), gói |
| `src/modules/ho-tro.js` | Ticket, thông báo, nhật ký công việc + báo cáo pilot (mục 31), việc nền |
| `scripts/du-lieu-mau.js` | Dữ liệu mẫu qua API |
| `test/` | `nghiep-vu.test.js` (node:test); `giao-dien-ban.mjs`, `giao-dien-mua.mjs` (Playwright, cần server đang chạy); `bao-cao-hai-vai.mjs`, `vong-hai-vai.mjs`, `hosting.mjs` (bản hosting tĩnh, mặc định http://127.0.0.1:8768) |

Giao diện nối API qua `js/he-thong.js` trong mỗi app; chỉ bật khi mở dưới `/ban/` hoặc `/mua/`,
mở file HTML trực tiếp vẫn là bản mẫu tĩnh như cũ.

## Chưa làm (cần đối tác thật hoặc quyết định)

- Ký số, cổng thanh toán, tra tên tài khoản ngân hàng, SMS: đang ở **chế độ demo** có nhãn (v4 mục 9: tắt mặc định khi chưa đủ điều kiện).
- Các trường phải điền trước pilot (phí kích hoạt, giá mốc, thuế phí, X/N trong phương án bất đồng, hotline, ca trực) đang là **giá trị mẫu** trong `src/lib/rules.js` (`MAU_CHUA_CHOT`).
- Khấu trừ cọc vào tiền hàng (offset có liên kết) chưa làm; hiện cọc và tiền hàng là hai khoản riêng.
- Màn A01 hàng đợi vận hành chưa có giao diện (API ticket đã có).
- Giao diện mới nối các màn chính; các màn còn lại vẫn là số liệu mẫu tĩnh.
