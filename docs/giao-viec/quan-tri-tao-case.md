# Giao việc: app quản trị chỉ trên máy + tạo case thử + tiền ảo (Codex gpt-6.1-sol)

Đọc `docs/giao-viec/frontend-5-cong-khai-va-quan-tri.md`, `frontend/TIEN-DO.md`, `docs/ha-tang/08-chay-tam-cloudflare-tunnel.md`. Làm tiếp, không làm lại: `frontend/quan-tri/` đã có.

## Quyết định của người dùng
1. **Quản trị chỉ chạy trên máy người dùng**, không đưa lên mạng. Ingress công khai 18888 (tunnel agiviet.id.vn) phải trả **404** cho `/quan-tri/` và mọi tệp của nó; chỉ cổng operator **127.0.0.1:18889** phục vụ `/quan-tri/`. Trang gốc công khai chỉ có App bán và App mua. Hiện https://agiviet.id.vn/quan-tri/ trả 401 (sau pilot) — sai, phải 404.
2. **Admin tạo case để thử**: trong `/quan-tri/` thêm mục "Tạo tình huống thử": chọn mẫu (ví dụ: lời chào chờ người bán trả lời; hợp đồng chờ ký; đã ký chờ cọc; cọc đã vào chờ giao; đang giao/nghiệm thu; tranh chấp mở; hủy sau cọc; đã quyết toán tiền về), chọn bên bán/bên mua (tài khoản ảo), mặt hàng, lượng, giá; bấm Tạo → hệ thống tự chạy các bước API tới đúng trạng thái (dùng `/v1/test/impersonate`, `/v1/sim/bank/*`, `/v1/test/clock` có sẵn ở cổng 18889 và các API nghiệp vụ). Có danh sách case đã tạo, mở nhanh bằng app bán/app mua (đóng vai đúng người), và nút "Đặt lại toàn bộ dữ liệu thử" (xác nhận hai lần). Nếu một mẫu cần API backend chưa có thì ghi `docs/frontend/de-xuat-backend.md` và đánh dấu mẫu đó "chưa có", không bịa.
3. **Tiền và tài khoản ngân hàng đều ảo**: mọi số tài khoản, ngân hàng, VietQR trong dữ liệu thử phải là **Ngân hàng ảo AgiViet** (không dùng tên ngân hàng thật như Agribank/Vietcombank trong dữ liệu thử; nếu seed `db/` có tên thật thì phía giao diện hiển thị nhãn "Ngân hàng ảo", và ghi đề xuất đổi seed vào `docs/frontend/de-xuat-backend.md`). Mọi màn có tiền ở môi trường thử hiện một dòng nhỏ "Tiền ảo để xem quy trình, không chuyển tiền thật". VietQR thử không được quét ra tài khoản thật (dùng mã giả có nhãn).
4. Trong quản trị có màn "Ngân hàng ảo": xem số dư tài khoản đảm bảo, lệnh chờ, bấm cho ngân hàng ảo xử lý/giao webhook, để người xem hiểu đường đi của tiền.

## Kiểm chứng
- Khởi động lại stack: `AGV_LOCAL_STATE=$HOME/.local/share/agiviet infra/local-tunnel/dung.sh` rồi `khoi-dong.sh` (nếu sandbox không cho, ghi rõ để người điều phối chạy). Tunnel cloudflared đang chạy riêng, không đụng.
- `curl https://agiviet.id.vn/quan-tri/` → 404; `http://127.0.0.1:18889/quan-tri/` → vào được.
- Playwright trên 18889: tạo ít nhất 4 mẫu case khác nhau, mở case bằng app bán/app mua và thấy đúng trạng thái; ảnh chụp kèm.
- Unit + `test:branches`, `test:round2`, `test:e2e` giữ xanh.

Chỉ ghi `frontend/`, `docs/frontend/`, `infra/local-tunnel/`. KHÔNG sửa giao diện app bán `frontend/ban/` và phần app bán trong `shared/` ngoài mức tối thiểu cho nhãn tiền ảo — Claude đang làm lại app bán. Cập nhật `TIEN-DO.md`, `danh-gia-thanh-that.md`. Không chờ vòng lặp. Xong in tóm tắt rồi dừng.


## Làm tiếp
Lượt trước bị ngắt (hết hạn mức) sau khi đã sửa Caddy (ingress 404 cho /quan-tri/, đã kiểm đạt; người điều phối đã khởi động lại stack: công khai /quan-tri/ = 404, 18889 = 200). Đọc `frontend/TIEN-DO.md` và mã `frontend/quan-tri/`, kiểm phần tạo tình huống thử, ngân hàng ảo, nhãn tiền ảo đã làm tới đâu, làm nốt, chạy kiểm chứng và viết bàn giao. Không làm lại.


## Bổ sung (27/10, người dùng)
- Dữ liệu mô phỏng phải **giống thật nhưng là giả**: tên hộ, HTX, doanh nghiệp, vùng trồng, giấy tờ, nhật ký, giá theo mùa vụ ĐBSCL hợp lý; tiền và ngân hàng đều ảo, có nhãn.
- Thêm nút **dọn dữ liệu rác** từ các lượt kiểm thử tự động (đơn, lời chào 50 kg lặp) và **đặt lại dữ liệu sạch** (cấu hình `AGV_TEST_PG_OWNER_URL` + `AGV_TEST_PG_TEMPLATE` cho local-tunnel nếu cần, chỉ ghi `infra/local-tunnel/`).
- Sửa các bài kiểm thử giao diện (`frontend/tests/branches.mjs`, `round2.mjs`, `flow.mjs`) cho khớp **app bán mới** (Claude đã làm lại trang chủ, lời chào, đăng hàng, tiền, danh sách; ô chọn ít mục đã thành chip radio). Không sửa `shared/seller.js`, `ban/seller.css`.


## Lưu ý từ người sáng lập (27/10)
Ở **app bán** KHÔNG hiện dải "Môi trường thử / Mở app mua" và dòng "Tiền ảo…" (người dùng đã yêu cầu bỏ). Đừng ép hiện lại (`virtualMoneyNotice` trả rỗng khi `c.app === "ban"`). Nhãn tiền ảo vẫn giữ ở app mua và quản trị.

## Bổ sung bắt buộc từ người sáng lập (27/10, 07:35)
- Làm SAU khi xong `doi-chieu-ban-mau`; chuyển lại các ca B*/M* và cơ chế đã có ở `dong-co` (mẫu 1), không dựng lại từ đầu.
- **Hồ sơ mẫu có sẵn case** (người bán và người mua, đã kiểm chạy được): mỗi hồ sơ mở ra là đang ở giữa một tình huống thường gặp, ví dụ: đã thỏa thuận xong nhưng bên mua gửi ảnh báo hụt hàng / cân thiếu; hàng bị hạ cấp một phần; bên mua chậm trả tiền trước bốc; mất mùa xin giảm lượng; giá chào thấp bất thường; lô kém loại không ai hỏi → bán gấp / bao tiêu; tranh chấp cần kiểm định.
- **Bên đối ứng tự động**: hệ thống quản trị đóng vai phía bên kia, phản hồi ngẫu nhiên có kiểm soát (chấp nhận / trả giá / báo hụt kèm ảnh / chậm trả…) theo hành động người dùng, để một người thử đi hết luồng. Có hạt giống (seed) để tái hiện.
- **Mỗi luồng phải có kiểm thử đầu-cuối Playwright chạy trên giao diện thật** (cả app bán và app mua), báo đạt/tổng. Luồng chưa có kiểm thử thì ghi "chưa chứng minh".
