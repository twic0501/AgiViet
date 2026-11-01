// Kịch bản theo BẢNG BƯỚC cho các tình huống v23 nhiều đợt / định kỳ / có nhân viên theo sát.
// Một bảng = một tình huống; hai app (mua.js, mau/man-3.js) cùng đọc bảng này qua bangTrang(h):
//   ai: "mua" (chị Thu Hà bấm) · "ban" (chị Năm bấm) · "nh" ngân hàng · "nv" nhân viên AgiViet · "dt" đối tác · "qt" quản trị · "app" hệ thống
//       (các vai không có app bấm qua nút "Mô phỏng" ở app mua)
//   viec / giai: chữ hiện ở thẻ việc · nut: nhãn nút · qt: chỉ số bước v23 (0-based)
//   tien: [bên mua đã chi, ngân hàng giữ, chị Năm đã nhận] SAU khi xong bước (bỏ trống = giữ như trước)
// meta: v23 (mã tình huống trong quy-trinh.json), tom, tongBan (tổng chị Năm phải nhận), dau (tiền lúc bắt đầu), xong (chữ khi hết bước)
// Không có hiệu ứng phụ khi nạp: dùng được cả trong trình duyệt và Node (bài test).
const tr = (n) => n * 1000000;

export const BANG = {
  "bao-tieu": { meta: { v23: "bao-tieu", tom: "Bao tiêu theo vụ: 6 tấn, giao 3 đợt, cọc vụ + ứng vật tư.", tongBan: tr(90), xong: "Hết vụ: 3 đợt × 2 tấn · 90.000.000 đ, vật tư đã trừ đủ" }, ds: [
    { ai: "app", viec: "Soạn hợp đồng vụ: 6 tấn xoài, 3 đợt × 2 tấn, 15.000 đ/kg", giai: "Bên mua cọc vụ 30% và ứng vật tư 5.000.000 đ, trừ dần mỗi đợt.", nut: "hai bên ký hợp đồng vụ", qt: [0] },
    { ai: "mua", viec: "Chuyển cọc vụ 27.000.000 đ + ứng vật tư 5.000.000 đ", giai: "Cọc vụ do ngân hàng giữ tới cuối vụ; vật tư chuyển thẳng cho chị Năm.", nut: "Chuyển cọc vụ và ứng vật tư", qt: [1], tien: [tr(32), tr(27), tr(5)] },
    { ai: "ban", viec: "Ghi nhật ký sản xuất bắt buộc", giai: "Bón phân, phun thuốc, thời gian cách ly. Bên mua theo dõi được.", nut: "Ghi nhật ký: bón phân, phun thuốc, cách ly 14 ngày", qt: [2] },
    { ai: "ban", viec: "Đợt 1: giao 2 tấn, nghiệm thu, chốt số", giai: "", nut: "Đã giao đợt 1, chốt số", qt: [3] },
    { ai: "mua", viec: "Trả đợt 1: 30.000.000 − trừ vật tư 2.500.000 = 27.500.000 đ", giai: "", nut: "Ghi đã trả đợt 1", qt: [4], tien: [tr(59.5), tr(27), tr(5)] },
    { ai: "ban", viec: "Xác nhận đã nhận đợt 1: 27.500.000 đ", giai: "", nut: "Đã nhận 27.500.000 đ", qt: [4], tien: [tr(59.5), tr(27), tr(32.5)] },
    { ai: "ban", viec: "Đợt 2: giao 2 tấn, chốt số", giai: "", nut: "Đã giao đợt 2, chốt số", qt: [3] },
    { ai: "mua", viec: "Trả đợt 2: 30.000.000 − trừ vật tư 2.500.000 = 27.500.000 đ", giai: "", nut: "Ghi đã trả đợt 2", qt: [4], tien: [tr(87), tr(27), tr(32.5)] },
    { ai: "ban", viec: "Xác nhận đợt 2; đợt 3: giao 2 tấn, chốt số", giai: "", nut: "Đã nhận đợt 2, đã giao đợt 3", qt: [3, 4], tien: [tr(87), tr(27), tr(60)] },
    { ai: "mua", viec: "Trả đợt 3 phần còn lại: 30.000.000 − cọc vụ 27.000.000 = 3.000.000 đ", giai: "", nut: "Ghi đã trả đợt 3", qt: [4], tien: [tr(90), tr(27), tr(63)] },
    { ai: "nh", viec: "Cuối vụ: chuyển cọc vụ 27.000.000 đ cho chị Năm", giai: "", nut: "ngân hàng chuyển cọc vụ", qt: [5], tien: [tr(90), 0, tr(90)] },
  ] },
  "khung": { meta: { v23: "khung", tom: "Hợp đồng khung giao hằng tuần, có kiểm mức theo cọc khung.", tongBan: tr(80), xong: "Hết kỳ: 4 tấn · 80.000.000 đ, cọc khung đã hoàn" }, ds: [
    { ai: "app", viec: "Soạn hợp đồng khung: 4 tấn/tháng, mỗi tuần 1 tấn, 20.000 đ/kg", giai: "Mức an toàn: đã giao chưa trả + sắp giao ≤ cọc khung.", nut: "hai bên ký hợp đồng khung", qt: [0] },
    { ai: "mua", viec: "Chuyển cọc khung 40.000.000 đ", giai: "Ngân hàng giữ tới cuối kỳ.", nut: "Chuyển cọc khung", qt: [1], tien: [tr(40), tr(40), 0] },
    { ai: "ban", viec: "Tuần 1: giao 1 tấn theo lịch", giai: "", nut: "Đã giao tuần 1", qt: [2] },
    { ai: "mua", viec: "Xác nhận nhận tuần 1 (20.000.000 đ, chưa trả)", giai: "", nut: "Xác nhận đã nhận tuần 1", qt: [2] },
    { ai: "ban", viec: "Tuần 2: giao 1 tấn theo lịch", giai: "", nut: "Đã giao tuần 2", qt: [2] },
    { ai: "mua", viec: "Xác nhận nhận tuần 2 (20.000.000 đ, chưa trả)", giai: "", nut: "Xác nhận đã nhận tuần 2", qt: [2] },
    { ai: "app", viec: "Kiểm mức: đã giao chưa trả 40 tr + tuần 3 sắp giao 20 tr = 60 tr > cọc khung 40 tr", giai: "Tạm chặn giao tuần 3 tới khi bên mua trả bớt phần đã giao.", nut: "hệ thống kiểm mức", qt: [3] },
    { ai: "mua", viec: "Trả 40.000.000 đ cho 2 tuần đã giao để mở lại giao", giai: "", nut: "Ghi đã trả 40.000.000 đ", qt: [4], tien: [tr(80), tr(40), 0] },
    { ai: "ban", viec: "Xác nhận đã nhận 40.000.000 đ; giao tuần 3 và 4", giai: "", nut: "Đã nhận, đã giao tuần 3 và 4", qt: [2, 4], tien: [tr(80), tr(40), tr(40)] },
    { ai: "mua", viec: "Cuối kỳ: trả 40.000.000 đ cho tuần 3 và 4", giai: "", nut: "Ghi đã trả cuối kỳ", qt: [4], tien: [tr(120), tr(40), tr(40)] },
    { ai: "ban", viec: "Xác nhận đã nhận 40.000.000 đ cuối kỳ", giai: "", nut: "Đã nhận cuối kỳ", qt: [4], tien: [tr(120), tr(40), tr(80)] },
    { ai: "nh", viec: "Hoàn cọc khung 40.000.000 đ cho bên mua", giai: "", nut: "ngân hàng hoàn cọc khung", qt: [4], tien: [tr(80), 0, tr(80)] },
  ] },
  "ket-hop": { meta: { v23: "ket-hop", tom: "Kết hợp: cân lệch + nhận một phần + trả thiếu.", tongBan: tr(75), xong: "Quyết toán xong: 5 tấn · 75.000.000 đ" }, ds: [
    { ai: "app", viec: "Hợp đồng 5 tấn × 15.000 đ/kg, trả trước bàn giao từng đợt", giai: "Cọc 22.500.000 đ do ngân hàng giữ, trừ ở đợt cuối.", nut: "hai bên ký, ngân hàng giữ cọc", qt: [0], tien: [tr(22.5), tr(22.5), 0] },
    { ai: "app", viec: "Đợt 1: cân lại chốt 4.000 kg = 60.000.000 đ", giai: "", nut: "chốt số đợt 1", qt: [1] },
    { ai: "mua", viec: "Trả trước bàn giao đợt 1: cần 60.000.000 đ", giai: "Bên mua chuyển 50.000.000 đ.", nut: "Ghi đã trả 50.000.000 đ", qt: [2], tien: [tr(72.5), tr(22.5), tr(50)] },
    { ai: "ban", viec: "Mới thấy 50.000.000 / 60.000.000 đ", giai: "Báo thiếu 10.000.000 đ; chưa bàn giao.", nut: "Báo thiếu 10.000.000 đ, chưa bàn giao", qt: [3] },
    { ai: "mua", viec: "Chuyển bù 10.000.000 đ", giai: "", nut: "Ghi đã trả bù 10.000.000 đ", qt: [4], tien: [tr(82.5), tr(22.5), tr(60)] },
    { ai: "ban", viec: "Đủ 60.000.000 đ: bàn giao 4 tấn", giai: "", nut: "Đã đủ tiền, bàn giao 4 tấn", qt: [5] },
    { ai: "ban", viec: "Đợt 2: bàn giao 1.000 kg (15.000.000 đ)", giai: "Đợt cuối trừ vào cọc.", nut: "Đã bàn giao đợt 2", qt: [6] },
    { ai: "app", viec: "Quyết toán: cọc 15.000.000 đ cho chị Năm, hoàn 7.500.000 đ bên mua", giai: "", nut: "hệ thống quyết toán", qt: [7] },
    { ai: "nh", viec: "Ngân hàng chuyển và hoàn", giai: "", nut: "ngân hàng chuyển và hoàn", qt: [8], tien: [tr(75), 0, tr(75)] },
  ] },
  "nhieu-trang-trai": { meta: { v23: "nhieu-trang-trai", tom: "Một đơn 20 tấn từ 3 vườn (tiền ghi tổng 3 vườn).", tongBan: tr(300), xong: "20 tấn từ 3 vườn đã nhận đủ, 3 hợp đồng đóng" }, ds: [
    { ai: "mua", viec: "Lập phiếu 20 tấn xoài, nhận từng phần", giai: "", nut: "Gửi phiếu 20 tấn", qt: [0] },
    { ai: "app", viec: "Gợi ý 3 vườn: chị Năm 8 tấn · anh Tư 7 tấn · HTX Tân Thuận 5 tấn", giai: "Soạn 3 hợp đồng riêng, 15.000 đ/kg.", nut: "hệ thống soạn 3 hợp đồng", qt: [1] },
    { ai: "mua", viec: "Cọc 30% từng hợp đồng: 36 + 31,5 + 22,5 = 90.000.000 đ", giai: "", nut: "Chuyển cọc 3 hợp đồng", qt: [2], tien: [tr(90), tr(90), 0] },
    { ai: "nv", viec: "Điều phối một xe ghé 3 vườn theo tuyến", giai: "", nut: "nhân viên điều phối tuyến xe", qt: [3] },
    { ai: "ban", viec: "Vườn chị Năm: bốc 8 tấn, biên bản riêng", giai: "", nut: "Đã bốc 8 tấn, ký biên bản", qt: [4] },
    { ai: "dt", viec: "Xe ghé vườn anh Tư và HTX: bốc 12 tấn, biên bản riêng", giai: "", nut: "xe bốc xong 2 vườn còn lại", qt: [4] },
    { ai: "mua", viec: "Nghiệm thu từng phần theo từng vườn", giai: "", nut: "Gửi kết quả nghiệm thu 3 phần", qt: [5] },
    { ai: "ban", viec: "Chị Năm chốt số: 8 tấn đạt", giai: "Anh Tư và HTX chốt số phần của họ.", nut: "Chốt số 8 tấn", qt: [5] },
    { ai: "mua", viec: "Trả riêng từng người: 84 + 73,5 + 52,5 = 210.000.000 đ", giai: "", nut: "Ghi đã trả 3 người bán", qt: [6], tien: [tr(300), tr(90), 0] },
    { ai: "ban", viec: "Chị Năm xác nhận đã nhận 84.000.000 đ", giai: "Anh Tư và HTX xác nhận phần của họ.", nut: "Đã nhận 84.000.000 đ", qt: [6], tien: [tr(300), tr(90), tr(210)] },
    { ai: "nh", viec: "Chuyển cọc từng hợp đồng cho từng người bán", giai: "", nut: "ngân hàng chuyển cọc 3 hợp đồng", qt: [6], tien: [tr(300), 0, tr(300)] },
  ] },
  "dinh-ky": { meta: { v23: "dinh-ky", tom: "Nhà máy cần 5 tấn/ngày từ nhiều nguồn.", tongBan: tr(40), xong: "Chuyến thứ Hai: 5 tấn đạt; khoản trả theo từng người bán đã lập" }, ds: [
    { ai: "mua", viec: "Lập nhu cầu: xoài loại 1, 300–400 g/trái, dung sai 5%, nhận trước 8:00, có kết quả dư lượng", giai: "Có nhận hàng thay thế cùng hạng.", nut: "Lưu nhu cầu", qt: [0] },
    { ai: "mua", viec: "Chọn chế độ: tìm trong phạm vi đã giao, giá tối đa 21.000 đ/kg", giai: "", nut: "Chọn tìm trong phạm vi", qt: [1] },
    { ai: "mua", viec: "Dự báo tuần sau khoảng 30 tấn; hạn chốt từng ngày 14:00 hôm trước", giai: "Dự báo chưa phải cam kết.", nut: "Gửi dự báo", qt: [2] },
    { ai: "app", viec: "Mời người bán đủ điều kiện, có lượng phù hợp", giai: "", nut: "hệ thống mời người bán", qt: [3] },
    { ai: "mua", viec: "Chủ nhật 14:00: chốt thứ Hai đúng 5 tấn", giai: "", nut: "Chốt chuyến thứ Hai 5 tấn", qt: [4] },
    { ai: "ban", viec: "Xác nhận 2 tấn cho thứ Hai, 20.000 đ/kg", giai: "B xác nhận 2 tấn, C 1 tấn.", nut: "Xác nhận 2 tấn", qt: [5] },
    { ai: "nv", viec: "Kiểm hồ sơ từng nguồn, lấy mẫu lô", giai: "", nut: "nhân viên kiểm hồ sơ, lấy mẫu", qt: [6] },
    { ai: "dt", viec: "Xe gom 3 điểm, giao trước 8:00", giai: "", nut: "xe gom 3 điểm, giao xong", qt: [7] },
    { ai: "mua", viec: "Nghiệm thu từng nguồn", giai: "", nut: "Nghiệm thu: cả 3 nguồn đạt", qt: [8] },
    { ai: "app", viec: "Lập khoản trả theo từng người bán và kỳ họ đã chấp thuận", giai: "Chị Năm 40.000.000 · B 40.000.000 · C 20.000.000 đ.", nut: "hệ thống lập khoản trả", qt: [9] },
    { ai: "app", viec: "Lập kế hoạch kỳ tiếp: nguồn chính và dự phòng", giai: "", nut: "hệ thống lập kế hoạch kỳ tiếp", qt: [10] },
  ] },
  "dinh-ky-tra-tien": { meta: { v23: "dinh-ky-tra-tien", tom: "Định kỳ: mỗi người bán một kỳ trả khác nhau.", tongBan: tr(40), xong: "Chị Năm đã nhận 40.000.000 đ đúng hạn; khiếu nại của B không khóa A, C" }, ds: [
    { ai: "mua", viec: "Đề nghị trả gộp cuối tháng", giai: "", nut: "Gửi đề nghị trả gộp", qt: [0] },
    { ai: "app", viec: "Hỏi từng người bán chấp thuận kỳ trả trước khi cam kết", giai: "", nut: "hệ thống hỏi từng người bán", qt: [1] },
    { ai: "ban", viec: "Chọn kỳ trả của chị Năm", giai: "B: trả trước bàn giao · C: nhận ngay sau nghiệm thu (qua ngân hàng).", nut: "Trả trong 3 ngày, nợ tối đa 80 triệu", qt: [2] },
    { ai: "mua", viec: "6:00 chuyển B 40.000.000 đ trước bàn giao", giai: "", nut: "Ghi đã trả B 40.000.000 đ", qt: [3], tien: [tr(40), 0, 0] },
    { ai: "app", viec: "B thấy đủ tiền, xác nhận; mới bàn giao", giai: "B chưa dùng app trong bản thử.", nut: "B xác nhận và bàn giao", qt: [4] },
    { ai: "mua", viec: "Nghiệm thu A (chị Năm), B, C", giai: "", nut: "Nghiệm thu: cả 3 đạt", qt: [5] },
    { ai: "nh", viec: "Trả C 20.000.000 đ sau nghiệm thu; bên mua trả ngân hàng sau 30 ngày", giai: "", nut: "ngân hàng trả C", qt: [6] },
    { ai: "app", viec: "Ghi khoản của chị Năm 40.000.000 đ, hạn 3 ngày", giai: "Công nợ chị Năm 40/80 triệu.", nut: "hệ thống ghi khoản phải trả", qt: [7] },
    { ai: "mua", viec: "Ngày thứ 3: chuyển chị Năm 40.000.000 đ", giai: "", nut: "Ghi đã trả chị Năm 40.000.000 đ", qt: [8], tien: [tr(80), 0, 0] },
    { ai: "ban", viec: "Xác nhận đã nhận 40.000.000 đ", giai: "", nut: "Đã nhận 40.000.000 đ", qt: [8], tien: [tr(80), 0, tr(40)] },
    { ai: "mua", viec: "Khiếu nại 200 kg của B bị dập", giai: "Gửi 6 giờ sau khi nhận, trong hạn 12 giờ.", nut: "Gửi khiếu nại 200 kg của B", qt: [9] },
    { ai: "app", viec: "B đã nhận đủ: 4.000.000 đ thành nghĩa vụ hoàn nếu B sai; chị Năm và C không bị khóa", giai: "Bảo đảm dùng chung: ghi phần đã phân bổ, phần còn dùng được.", nut: "hệ thống tách khiếu nại", qt: [10, 11] },
  ] },
  "dinh-ky-3-ngay": { meta: { v23: "dinh-ky-3-ngay", tom: "Định kỳ chạy 3 ngày: công nợ chồng, thay nguồn, giảm lượng sau hạn chốt.", tongBan: tr(110), xong: "Ngày 3 giao 4 tấn; chị Năm còn nợ phải thu 70/80 triệu" }, ds: [
    { ai: "app", viec: "Ngày 1: giao đủ 5 tấn, nghiệm thu đạt", giai: "Khoản ngày 1 của chị Năm 40.000.000 đ, hạn ngày 4.", nut: "ngày 1 giao xong", qt: [0] },
    { ai: "ban", viec: "Ngày 2, 5:00: báo lượng thực có", giai: "", nut: "Ngày 2 tôi chỉ có 1,5 tấn", qt: [1] },
    { ai: "app", viec: "D nhận bù 0,5 tấn giá 20.500 (trong giới hạn 21.000); kiểm điều kiện giao chung: đạt", giai: "", nut: "D nhận bù 0,5 tấn", qt: [2, 3] },
    { ai: "app", viec: "Ngày 2 giao xong: ghi nợ chị Năm 30 triệu (1,5 tấn)", giai: "Công nợ chị Năm 70/80 triệu.", nut: "ngày 2 giao xong", qt: [4] },
    { ai: "app", viec: "13:00: lập chuyến ngày 3; chị Năm muốn 2 tấn nhưng chỉ còn 10 triệu mức nợ", giai: "", nut: "hệ thống lập chuyến ngày 3", qt: [5] },
    { ai: "mua", viec: "13:20: trả chị Năm khoản ngày 1 (40 triệu), sớm 2 ngày", giai: "", nut: "Ghi đã trả 40.000.000 đ", qt: [6], tien: [tr(40), 0, 0] },
    { ai: "ban", viec: "13:40: xác nhận đã nhận; cam kết 2 tấn cho ngày 3", giai: "Công nợ còn 30/80 triệu, đủ mức cho 2 tấn.", nut: "Đã nhận 40.000.000 đ, cam kết 2 tấn ngày 3", qt: [7], tien: [tr(40), 0, tr(40)] },
    { ai: "mua", viec: "16:00 (sau hạn chốt 14:00): xin giảm chuyến ngày 3 từ 5 xuống 3 tấn", giai: "", nut: "Xin giảm ngày 3 xuống 3 tấn", qt: [8] },
    { ai: "app", viec: "16:05: hỏi B và C (đề nghị cắt mỗi bên 1 tấn); chuyến của chị Năm giữ nguyên", giai: "", nut: "hệ thống hỏi B và C", qt: [9] },
    { ai: "app", viec: "17:00: C đã hái 1 tấn, báo chi phí hái, bốc 1.500.000 đ kèm ảnh; B chưa hái, đồng ý giảm", giai: "", nut: "B và C trả lời", qt: [10] },
    { ai: "mua", viec: "18:00: chọn cách giảm", giai: "Vẫn nhận 1 tấn của C (đã hái), chỉ giảm B 1 tấn.", nut: "Nhận 1 tấn của C, giảm B 1 tấn", qt: [11] },
    { ai: "app", viec: "Ngày 3: giao 4 tấn trước 8:00", giai: "Chị Năm giao 2 tấn; công nợ của chị Năm 70/80 triệu.", nut: "ngày 3 giao xong", qt: [12] },
  ] },
  "dinh-ky-no-qua-han": { meta: { v23: "dinh-ky-no-qua-han", tom: "Định kỳ: bên mua có khoản quá hạn với chị Năm.", tongBan: tr(30), xong: "Đã trả khoản quá hạn; chị Năm mở lại nhận cam kết từ chuyến ngày 8" }, ds: [
    { ai: "app", viec: "17:00 ngày 5: khoản 30 triệu của chị Năm quá hạn", giai: "", nut: "hệ thống đánh dấu quá hạn", qt: [0] },
    { ai: "app", viec: "Dừng nhận cam kết mới của chị Năm cho bên mua này", giai: "", nut: "hệ thống tạm dừng cam kết mới", qt: [1] },
    { ai: "app", viec: "Chuyến ngày 6 đã chốt: hỏi chị Năm giao tiếp hay dừng", giai: "", nut: "hệ thống hỏi chị Năm", qt: [2] },
    { ai: "ban", viec: "Chuyến ngày 6 đã chốt: giao tiếp hay dừng?", giai: "Bên mua đang nợ 30.000.000 đ quá hạn.", nut: "Dừng chuyến ngày 6", qt: [3] },
    { ai: "nv", viec: "Nhắc bên mua; quá 48 giờ thì theo nhánh chậm thanh toán", giai: "", nut: "nhân viên nhắc bên mua", qt: [4] },
    { ai: "mua", viec: "Ngày 6: trả khoản quá hạn 30.000.000 đ", giai: "", nut: "Ghi đã trả 30.000.000 đ", qt: [5], tien: [tr(30), 0, 0] },
    { ai: "ban", viec: "Xác nhận đã nhận 30.000.000 đ", giai: "Mở lại nhận cam kết từ chuyến ngày 8.", nut: "Đã nhận, mở lại từ chuyến ngày 8", qt: [6], tien: [tr(30), 0, tr(30)] },
  ] },
  "dung-dinh-ky": { meta: { v23: "dung-dinh-ky", tom: "Dừng mua định kỳ, chấm dứt thỏa thuận; bảo đảm 100 triệu.", tongBan: tr(70), dau: [tr(100), tr(100), 0], xong: "Đã chấm dứt: chị Năm nhận đủ 70.000.000 đ; bảo đảm hoàn 98.500.000 đ" }, ds: [
    { ai: "mua", viec: "Báo dừng mua định kỳ từ thứ Hai tuần sau", giai: "Bảo đảm dùng chung 100.000.000 đ đang do ngân hàng giữ.", nut: "Báo dừng định kỳ", qt: [0] },
    { ai: "app", viec: "Tách: dự báo chưa cam kết · chuyến đã chốt · hàng đã chuẩn bị · nợ chưa trả · bảo đảm đã phân bổ", giai: "Dự báo chưa cam kết: hủy, không phát sinh nghĩa vụ. Chuyến đã chốt trước hạn dừng: vẫn giao.", nut: "hệ thống tách nghĩa vụ", qt: [1, 2, 3] },
    { ai: "app", viec: "C báo chi phí hàng đã chuẩn bị 1.500.000 đ có chứng cứ", giai: "", nut: "C gửi chi phí kèm chứng cứ", qt: [4] },
    { ai: "mua", viec: "Xác nhận chi phí của C 1.500.000 đ", giai: "", nut: "Xác nhận chi phí của C", qt: [4] },
    { ai: "mua", viec: "Trả chị Năm 30.000.000 đ và chuyến cuối 40.000.000 đ đúng hạn", giai: "Chưa trả C 1.500.000 đ (quá hạn).", nut: "Ghi đã trả chị Năm 70.000.000 đ", qt: [5], tien: [tr(170), tr(100), 0] },
    { ai: "ban", viec: "Xác nhận đã nhận 70.000.000 đ", giai: "", nut: "Đã nhận 70.000.000 đ", qt: [5], tien: [tr(170), tr(100), tr(70)] },
    { ai: "app", viec: "Đối chiếu: 100.000.000 − chi C 1.500.000 (khoản quá hạn, lệnh ngoại lệ có duyệt) = hoàn 98.500.000 đ", giai: "", nut: "hệ thống đối chiếu, gửi lệnh", qt: [6, 7] },
    { ai: "nh", viec: "Ngân hàng chi C 1.500.000 đ, hoàn bên mua 98.500.000 đ", giai: "", nut: "ngân hàng thực hiện", qt: [8], tien: [tr(71.5), 0, tr(70)] },
    { ai: "app", viec: "Nhận kết quả, đối soát; đóng nghĩa vụ hoàn", giai: "", nut: "hệ thống đóng nghĩa vụ", qt: [9] },
  ] },
  "theo-sat-don": { meta: { v23: "theo-sat-don", tom: "Đơn lớn được nhân viên theo sát xuyên ca.", tongBan: tr(44.35), dau: [tr(13.938), tr(13.8), 0], xong: "Kết thúc theo sát: tiền đủ, giấy tờ bảo hiểm đủ" }, ds: [
    { ai: "app", viec: "Trước khi ký: kiểm đủ người chính, người thay ca, người dự phòng", giai: "", nut: "hệ thống kiểm người theo sát", qt: [0] },
    { ai: "app", viec: "Hồ sơ đơn ghi người phụ trách anh Khoa, số liên hệ, mốc tiếp theo, phạm vi", giai: "", nut: "hệ thống ghi hồ sơ theo sát", qt: [1] },
    { ai: "nv", viec: "Anh Khoa có mặt điểm bốc; kiểm mốc bốc", giai: "", nut: "nhân viên kiểm mốc bốc", qt: [2] },
    { ai: "nv", viec: "22:00 đổi ca: bàn giao; chị Mai xác nhận nhận ca", giai: "", nut: "nhân viên đổi ca", qt: [3] },
    { ai: "dt", viec: "2:00 nhà xe báo hỏng giữa đường", giai: "", nut: "nhà xe báo hỏng", qt: [4] },
    { ai: "nv", viec: "Điều xe thay trong giới hạn chi khẩn đã duyệt; giữ chứng cứ; báo bảo hiểm đúng hạn", giai: "", nut: "nhân viên điều xe thay, báo bảo hiểm", qt: [5, 6] },
    { ai: "mua", viec: "Nhận hàng, nghiệm thu", giai: "", nut: "Nghiệm thu đạt", qt: [7] },
    { ai: "nv", viec: "Nhắc bên mua trả phần còn lại trong hạn", giai: "", nut: "nhân viên nhắc theo mốc tiền", qt: [8] },
    { ai: "mua", viec: "Trả phần còn lại 30.550.000 đ", giai: "", nut: "Ghi đã trả 30.550.000 đ", qt: [8], tien: [tr(44.488), tr(13.8), 0] },
    { ai: "ban", viec: "Xác nhận đã nhận đủ tiền hàng", giai: "", nut: "Đã nhận 30.550.000 đ", qt: [9], tien: [tr(44.488), tr(13.8), tr(30.55)] },
    { ai: "nh", viec: "Chuyển cọc 13.800.000 đ cho chị Năm", giai: "", nut: "ngân hàng chuyển cọc", qt: [9], tien: [tr(44.488), 0, tr(44.35)] },
    { ai: "nv", viec: "Nộp đủ giấy tờ bảo hiểm (biên bản, ảnh, hóa đơn xe thay)", giai: "Hệ thống kiểm điều kiện kết thúc theo sát.", nut: "nhân viên nộp giấy tờ bảo hiểm", qt: [10, 11] },
  ] },
  "theo-sat-thieu-nguoi": { meta: { v23: "theo-sat-thieu-nguoi", tom: "Theo sát: thiếu người, ca sau chưa nhận, mất liên lạc.", tongBan: 0, xong: "Đơn được theo sát từ xa; trưởng ca đã tiếp quản, hai bên biết người mới" }, ds: [
    { ai: "app", viec: "Ba đơn cùng cần người hiện trường đêm thứ 6; chỉ đủ người cho hai", giai: "", nut: "hệ thống phát hiện thiếu người", qt: [0] },
    { ai: "qt", viec: "Báo bên mua trước khi ký: đổi ngày, hoặc theo sát từ xa (không có người hiện trường)", giai: "", nut: "quản trị báo bên mua", qt: [1] },
    { ai: "mua", viec: "Chọn cách theo sát cho đơn này", giai: "Đổi ngày, hoặc theo sát từ xa (không có người hiện trường).", nut: "Chọn theo sát từ xa", qt: [2] },
    { ai: "ban", viec: "Xác nhận phạm vi theo sát mới trước khi ký", giai: "Theo sát từ xa: không có người AgiViet ở điểm bốc.", nut: "Đồng ý phạm vi theo sát từ xa", qt: [3] },
    { ai: "nv", viec: "22:00 ca trước bàn giao; ca sau chưa xác nhận", giai: "", nut: "ca trước bàn giao", qt: [4] },
    { ai: "app", viec: "15 phút chưa nhận ca: báo trưởng ca", giai: "", nut: "hệ thống báo trưởng ca", qt: [5] },
    { ai: "qt", viec: "Giao người dự phòng; người dự phòng xác nhận nhận ca", giai: "", nut: "trưởng ca giao người dự phòng", qt: [6] },
    { ai: "nv", viec: "1:30 sự cố; người phụ trách không trả lời 15 phút", giai: "", nut: "sự cố, mất liên lạc", qt: [7] },
    { ai: "qt", viec: "Trưởng ca tiếp quản ngay, báo hai bên người mới", giai: "", nut: "trưởng ca tiếp quản", qt: [8] },
  ] },
  "khong-con-doi-tac": { meta: { v23: "khong-con-doi-tac", tom: "Không còn xe, kho, phòng thử nghiệm phù hợp.", tongBan: 0, xong: "Đổi sang xe sáng mai; hàng giữ tại vườn trong giới hạn; chi phí đối tác bỏ chuyến đã ghi" }, ds: [
    { ai: "dt", viec: "Nhà xe hủy chuyến lúc 20:00", giai: "", nut: "nhà xe hủy chuyến", qt: [0] },
    { ai: "nv", viec: "Tìm xe thay 2 giờ: không có xe lạnh phù hợp; kho gần đầy", giai: "", nut: "nhân viên tìm xe thay", qt: [1] },
    { ai: "app", viec: "Đưa phương án cho hai bên kèm chi phí tối đa", giai: "(1) xe thường + đá, tối đa 2.000.000 đ · (2) đổi giờ sang 5:00 sáng mai · (3) gửi kho tạm, tối đa 1.200.000 đ.", nut: "hệ thống đưa 3 phương án", qt: [2] },
    { ai: "mua", viec: "Chọn phương án", giai: "(1) xe thường + đá · (2) đổi giờ sáng mai · (3) gửi kho tạm.", nut: "Chọn (2) đổi giờ sáng mai", qt: [3] },
    { ai: "ban", viec: "Bên mua chọn (2) đổi giờ sang 5:00 sáng mai", giai: "Hàng giữ tại vườn trong giới hạn của mặt hàng (xoài: tối đa 24 giờ sau hái).", nut: "Đồng ý (2) đổi giờ", qt: [4, 5] },
    { ai: "nv", viec: "Đặt xe sáng mai; ghi chi phí đối tác bỏ chuyến", giai: "", nut: "nhân viên đặt xe, ghi chi phí", qt: [6] },
  ] },
};

const TEN_AI = { mua: "bên mua", ban: "chị Năm", nh: "ngân hàng", nv: "nhân viên AgiViet", dt: "đối tác", qt: "quản trị AgiViet", app: "hệ thống" };
export const tenAi = (ai) => TEN_AI[ai] || ai;

// Trạng thái hiện tại của một HĐ theo bảng: bước đang tới, tiền hiện tại, đã xong chưa
export function bangTrang(h) {
  const k = BANG[h && h.kb];
  if (!k) return null;
  const pi = Math.max(0, h.pi || 0);
  let tien = k.meta.dau || [0, 0, 0];
  for (let i = 0; i < Math.min(pi, k.ds.length); i++) if (k.ds[i].tien) tien = k.ds[i].tien;
  return { k, pi, b: k.ds[pi] || null, xong: pi >= k.ds.length, tien };
}
