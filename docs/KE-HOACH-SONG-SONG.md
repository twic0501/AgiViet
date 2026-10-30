# Kế hoạch làm song song — giao diện mới + trâu (từ 30/10/2026)

## Ai làm gì

| | Phạm vi | Nhánh / thư mục | Không đụng |
|---|---|---|---|
| **Claude 1** (`claude`) | Giao diện mới app bán (80 màn) + app mua (49 màn), hiệu ứng mở app, gắn trâu vào giao diện | `production-test` → nhánh `giao-dien-moi`; `~/agiviet-production-v2` | `frontend/trau-rive/`, `docs/trau/` |
| **Claude 2** (`claude2`) | Trâu: bộ góc nhìn, xương, chuyển động toàn thân, xuất `.riv` | nhánh `trau-goc-nhin`; `~/agiviet-trau` | mọi thứ ngoài `frontend/trau-rive/`, `docs/trau/`, `frontend/assets/trau/` |
| **ChatGPT** (Codex, `codex exec -c model_reasoning_effort=high`) | Soi độc lập trước mỗi lần gửi người sáng lập duyệt; chỉ đọc, chỉ nhận xét | — | không sửa repo, không vẽ quạ |
| **Người sáng lập** | Duyệt ở các chốt (G*, T*), quyết các việc nghiệp vụ | — | — |

## Hợp đồng nối trâu ↔ giao diện (chốt từ đầu để không làm lại)

Claude 2 xuất **một tệp** `frontend/assets/trau/trau-v3.riv`:
- Artboard `trau`, khung **512×512**, trâu đứng giữa, chân chạm y≈492 (như V4g).
- State machine tên `trau`, các đầu vào:
  - `hanh_dong` (số): 0 nghỉ (sống: thở, đổi chân, nhìn quanh) · 1 chào · 2 chỉ đường · 3 cầm giấy đọc · 4 mừng · 5 xin lỗi/tiếc · 6 chờ (sốt ruột nhẹ) · 7 đi · 8 suy nghĩ.
  - `huong` (số −1…1): xoay người trái/phải (dùng góc ¾).
  - `cham` (trigger): bị chạm → phản ứng ngắn rồi về hành động hiện tại.
  - `nhin_x`, `nhin_y` (số −1…1): đầu/mắt nhìn theo.
- Mọi hành động phải đạt **luật 8** (chuyển động toàn thân) trong `docs/trau/BAN-GIAO-TRAU.md`.
- Trước khi có `trau-v3.riv`, Claude 1 dùng tạm `trau.riv` (V4g đứng thở) đặt đúng chỗ, cùng kích thước → thay tệp là xong.

Nơi trâu xuất hiện trong app bán (để Claude 2 biết hành động nào cần trước): Hôm nay (1 chào buổi sáng / 0 nghỉ), trống dữ liệu (3 cầm giấy, 8 suy nghĩ), thành công ký/tiền về (4 mừng), lỗi/mất mạng (5 xin lỗi), chờ bên kia (6 chờ), hướng dẫn (2 chỉ đường). **App mua không có trâu** (giao diện doanh nghiệp).

## Các chặng và chốt duyệt

### Chặng 1 — chốt hướng (ưu tiên làm ngay)
- **Claude 1:** màn "Hôm nay" app bán bản có hình (ảnh nông sản thật, trâu, thanh chặng hợp đồng, thẻ lô có vòng đo, thanh tiền, thời tiết 4 ngày) + hiệu ứng mở app "quả cầu nông sản" (bán: nền giấy ngà; mua: nền tối doanh nghiệp) + bộ ảnh nông sản đa loại.
  → **Chốt G1:** người sáng lập duyệt hướng giao diện bán + hiệu ứng mở app.
- **Claude 2:** góc **¾ trái** và **nghiêng trái** bằng vector, đúng màu/nét V4g, tách bộ phận; bật `rive frontend/trau-rive` để xem trực tiếp.
  → **Chốt T1:** người sáng lập duyệt từng góc (ảnh phóng to 2 nền, cạnh C01).

### Chặng 2 — nền tảng
- **Claude 1:** bộ thành phần dùng chung (thẻ đơn + thanh chặng, thẻ lô, thanh tiền, ô nhập, hộp OTP, thông báo, trạng thái tải/trống/lỗi, tab) + **3 màn mẫu app mua** kiểu doanh nghiệp (Tổng quan, Nguồn hàng, Chi tiết đơn).
  → **Chốt G2:** duyệt hướng app mua.
- **Claude 2:** khung xương toàn thân + **dáng nghỉ sống** (`hanh_dong=0`): thở, dồn chân, nhìn quanh, xoay `huong`.
  → **Chốt T2:** duyệt dáng nghỉ (xem trực tiếp).

### Chặng 3 — làm đủ theo luồng nghiệp vụ (mỗi luồng: màn bán + màn mua + E2E trên stack thử 18980/18990)
1. Bắt đầu / đăng nhập OTP / đăng ký (bán 9, mua 4)
2. Hôm nay / Tổng quan / thông báo
3. Lô hàng + đăng hàng ↔ Nguồn hàng + Nhu cầu
4. Chào giá / trả giá ↔ Báo giá
5. Hợp đồng: điều khoản, PDF, ký OTP, phụ lục, hủy
6. Tiền: cọc ngân hàng giữ, trả thẳng, sổ tiền
7. Giao nhận: xe, mã 6 số, cân, nghiệm thu 3 phần, nơi đến, khiếu nại
8. Quyết toán, tranh chấp, kiểm định
9. Vườn / nhật ký (có ngoại tuyến) · Tôi · Tổ chức / Nhà cung cấp / Kho / Thuế / Dịch vụ
- Mỗi luồng xong: Codex soi → người sáng lập xem → sửa → luồng sau.
- **Claude 2** song song: hành động 1→8 theo thứ tự ưu tiên ở trên, **mỗi hành động một lần duyệt**; xong hành động nào Claude 1 gắn ngay vào màn tương ứng.

### Chặng 4 — hoàn thiện
Đo tải giao diện, kiểm ngoại tuyến trên máy thật, đo hiệu năng `.riv` trên điện thoại tầm trung, rà toàn bộ 129 màn bằng Impeccable `polish`/`audit`.

## Cách làm cho hiệu quả
- **Làm nhỏ, duyệt sớm:** không làm cả loạt rồi mới đưa xem. Mỗi màn/góc/hành động là một lần xem.
- **Codex soi trước người sáng lập:** lỗi rõ ràng (sai luật trâu, chữ tràn, sai số liệu, thiếu trạng thái) bị bắt trước khi tới tay người sáng lập.
- **Dữ liệu thật:** màn nào cũng chạy với dữ liệu mẫu backend (`?thu=<sđt>` ở môi trường thử), không chữ giả.
- **Ghi tiến độ:** mỗi bên ghi vào `frontend/TIEN-DO.md` mục của mình; gộp vào `production-test` qua PR.

## Việc người sáng lập cần quyết (đang chờ)
1. Hủy gia hạn dùng thử Higgsfield nếu không dùng (49 USD/tháng).
2. Duyệt thêm cột giờ chụp ảnh (`captured_at`, nhãn "giờ máy khai") — xem `docs/frontend/ngoai-tuyen.md`.
3. Đăng nhập tài khoản Rive khi Claude 2 cần mở tệp trong Rive Editor để chỉnh xương.
