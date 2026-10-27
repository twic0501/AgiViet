# Giao việc: Đối chiếu bản v2 với hai bản mẫu (ƯU TIÊN SỐ 1, làm trước mọi việc khác)

Người sáng lập phản ánh (27/10): bản v2 dựng mới, bỏ mất tính năng và nghiệp vụ đã có ở hai bản mẫu; không có luồng nào được kiểm chứng. Việc này lập **cơ sở bằng chứng** để quyết định giữ / chuyển / bỏ. KHÔNG sửa mã app trong việc này.

## Nguồn mẫu (chuẩn để so)
1. **Bản đang chạy agiviet-23a94.web.app**: mã ở `/home/twictrn/agiviet-he-thong/.claude/worktrees/he-thong-v4/` (chỉ đọc): `fe-nongdan/` (app bán, ~82 màn, `js/cau-hinh.js`), `fe-thumua/` (app mua), `dong-co/packages/nghiep-vu/src/` (gia.ts: giá tham khảo, giá vốn, giá bất thường; don/: hợp đồng cọc, nghiệm thu 3 phần; lo.ts: tách lô, bán gấp; bao tiêu, hàng kém loại, uy tín), `dong-co/packages/may-chu/src/ca-kiem-thu*.ts` (các ca B*/M*).
2. **Bản motion v2 và tài liệu** ở `/home/twictrn/Documents/AgiViet/`: `AgiViet_danh_muc_man.csv`, `AgiViet_luong_hoat_dong.csv`, `AgiViet_app_ban.html`, `AgiViet_app_mo_phong.html`, `AgiViet_danh_gia_motion_v2*.md`, `AgiViet_co_che_production.md`, `AgiViet_dac_ta_nghiep_vu_app_mua_V1.md`, `AgiViet_brief_app_ban_chot_V1.md`, `AgiViet_gop_y_ban_test_app_ban.md`, `bo-cuc-app-ban/`, `bo-cuc-app-mua/`, `thiet-ke-lai/`.
3. Phỏng vấn người dùng: các phân tích trong `docs/nghien-cuu/` và `docs/` của v2.

## Bản hiện tại
`/home/twictrn/agiviet-production-v2/` (frontend/ban, frontend/mua, frontend/shared, backend, db). Chạy thật ở http://127.0.0.1:18888 (tài khoản pilot, mật khẩu trong biến PILOT_PASS) hoặc đăng nhập phiên thử như `/home/twictrn/.claude/jobs/d88082d5/tmp/chup_moi_man.mjs`.

## Sản phẩm
`docs/doi-chieu/bang-doi-chieu.md` + `docs/doi-chieu/bang-doi-chieu.csv`, mỗi dòng một tính năng/màn/quy tắc nghiệp vụ:
`nhóm | tính năng | có ở mẫu 1 (đường dẫn file:dòng) | có ở mẫu 2 (file) | v2: có/thiếu/khác/làm sai (bằng chứng: file:dòng hoặc ảnh chụp) | mức (nặng/vừa/nhẹ) | đề xuất: chuyển nguyên / sửa / bỏ (lý do)`.
Bắt buộc phủ ít nhất:
- Điều hướng: thanh dưới từng app (mẫu: Đơn hàng gồm tin nhắn, thông báo, lời chào?), lối tắt (cài đặt, hỗ trợ, học kỹ thuật nông nghiệp, tin tức, thời tiết…), header từng màn (chụp TẤT CẢ màn v2, ghi màn nào header không cố định / nút Nghe lúc icon lúc chữ), hành vi danh sách khi bấm (hiện tượng nhảy trái/phải/căn giữa ở danh sách chị Năm: tái hiện, ghi nguyên nhân CSS).
- Nghiệp vụ: giá tham khảo/giá gợi ý, cảnh báo dưới giá vốn, giá tính cọc, giá bất thường, chống lách ngoài app, hợp đồng cọc, nghiệm thu 3 phần + ảnh, cân thiếu/hụt có ảnh chứng minh, hàng kém loại, bán gấp, bao tiêu, tách lô, gộp lô HTX, uy tín hai chiều, tin nhắn, thông báo.
- Mọi ca kiểm thử B*/M* ở mẫu 1: v2 có luồng tương đương chưa, có chạy được trên v2 không.
- Lời người được phỏng vấn: mỗi nhu cầu → mẫu 1/mẫu 2/v2 đáp ứng ở đâu.
Cuối bảng: tóm tắt số lượng theo cột v2, và **danh sách chuyển ưu tiên** (20 mục đầu) để Claude/Codex chuyển từ mẫu sang v2 thay vì dựng mới. Ghi rõ điều gì chưa kiểm được.
Ghi nhận xét thật, không làm mềm. Không đoán: không có bằng chứng thì ghi "chưa kiểm".
