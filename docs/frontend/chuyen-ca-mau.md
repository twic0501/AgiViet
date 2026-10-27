# Chuyển tình huống từ dong-co mẫu 1 · 27/10/2026

Đã đọc kết quả `doi-chieu-ban-mau` trước khi làm tiếp. [Danh mục đầy đủ](chuyen-ca-mau.csv) giữ mã, tên, kỳ vọng và dòng nguồn của 76 ca (44 B và 32 M). Không tự đặt lại một bộ mã mới. `quan-tri/profiles.js` ghi mã nguồn cho từng hồ sơ; `case-engine.js` và `opponent.js` gọi cơ chế nghiệp vụ đang có của backend v2. Không chép công thức cọc/phí cũ vào frontend: mẫu 1 có ví dụ cọc 10%, v2 áp dụng chính sách 30% qua backend.

Các hồ sơ được chuyển từ các tình huống cân thiếu/cân sai, ba phần nghiệm thu, trả thiếu/đối soát, giảm lượng do mất mùa và cảnh báo giá. Đối ứng đọc lượt của offer, hành động của đơn, phụ lục, giao nhận và tiền qua API thật. Seed + sự kiện xác định accept/counter, accept/reject và nhận đủ/hạ cấp; không dùng Math.random hoặc thời gian máy để chọn kết quả. Nhật ký không lưu token. Người thử vẫn tự quyết định/ký phía của mình.

Không thể gọi tất cả 76 ca đã chuyển hoặc đã đạt. Các hành trình mới có điểm đầu là hồ sơ giữa quy trình và điểm cuối được ghi cụ thể trong JSON Playwright, không đồng nghĩa mọi nhánh của một ca gốc đã được bao phủ. Các hàng chưa có bằng chứng UI ghi **chưa chứng minh**; B36/M27 mới chứng minh mở tranh chấp, chưa có hành trình tới kết luận kiểm định. B39–B41/M31–M32 chưa có case trọn vẹn bán gấp/bao tiêu hai app. Giữ bảng đối chiếu 595 dòng là cơ sở cho các lượt chuyển tiếp, không sửa lại bảng đó ở lượt này.

Giá thấp dùng 18.000 đ/kg cho xoài tham khảo thử 25.000 đ/kg. V2 chặn lời chào dưới 60% ngay ở backend; không dựng giả một lời chào dưới ngưỡng đã được nhận. Lượng gợi ý 1.200 kg theo vụ mẫu; tên HTX/hộ/doanh nghiệp, cơ sở và nhật ký dùng seed giả hiện hữu, ảnh phiếu cân/chứng từ gắn nhãn dữ liệu thử. Giá/lượng là giả định vụ ĐBSCL, không phải dữ liệu giá trực tiếp.
