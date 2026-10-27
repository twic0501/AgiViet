# Giao việc: nghiên cứu mô hình xác minh người bán có nhân viên + phân hạng để ghép (Codex gpt-6.1-sol)

Bạn là chuyên gia vận hành sàn B2B nông sản. Viết bằng tiếng Việt có dấu, không emoji. Có mạng: tra cứu nguồn thật, ghi link và ngày truy cập, tách rõ **sự thật có nguồn** với **suy luận/đề xuất**. Không bịa số liệu; không chắc thì ghi "chưa kiểm được".

## Bối cảnh
AgiViet: sàn B2B kết nối nông dân, HTX, hộ kinh doanh (bán) với nhà máy chế biến, doanh nghiệp xuất khẩu, nhà hàng/HORECA, vựa (mua); mặt hàng nông sản + thủy sản thô. Đọc nhanh `docs/nghiep-vu/00-tong-quan.md`, `05-ghep-cung-cau-va-chong-lach.md`, `08-van-hanh-thu-cong.md`.
Phỏng vấn một doanh nghiệp thu mua cho thấy: trước đơn đầu họ thẩm định nhà cung cấp (sản xuất hay phân phối; nguồn gốc, nhãn; giấy tờ pháp lý; năng lực cung ứng; thời gian giao; bảo quản/kho lạnh/xe; năng lực tài chính; điều khoản thanh toán/công nợ), mất 1–2 tuần, thử mẫu khoảng 1 tuần; hiếm khi đặt cọc, chủ yếu trả sau theo hạn mức; giao thiếu/trễ thì bắt giao lại và bồi thường chi phí mua thay thế; đổi giá phải báo trước 15–30 ngày. Họ hỏi "sau khi giới thiệu, vai trò AgiViet là gì?".

## Ý tưởng của người sáng lập cần đánh giá
Không thể 100% bằng app. Người bán (và người mua) **đăng ký qua nhân viên AgiViet**: nhân viên lập hồ sơ, đi xác minh giấy tờ (sổ đỏ/hợp đồng thuê đất, giấy phép, chứng nhận VietGAP/GlobalGAP/hữu cơ nếu có, mã số vùng trồng, mã cơ sở đóng gói), **nhật ký canh tác** nếu có, năng lực thực tế (diện tích, sản lượng, lịch thu hoạch, sơ chế, kho, xe). Từ đó **phân hạng người bán theo tiêu chí của từng loại bên mua** (ví dụ: đủ cho xuất khẩu thị trường X / đủ cho nhà máy / đủ cho HORECA / chợ đầu mối) để hệ thống ghép đúng sau này.

## Việc cần làm
1. Tìm **ít nhất 8 trường hợp thực tế nước ngoài** (ưu tiên châu Á, châu Phi, Ấn Độ, Mỹ Latinh, châu Âu) có yếu tố con người trong onboarding/xác minh/phân hạng nhà cung cấp nông sản. Gợi ý để kiểm (tự xác minh, bỏ cái không đúng): DeHaat, Ninjacart, AgroStar (Ấn Độ); Twiga Foods (Kenya); eFishery (Indonesia — có bài học về gian lận số liệu); TaniHub/TaniFund (Indonesia); Kasi Insight/ Wefarm; Farmforce; Sourcetrace; Agrocenta; Frubana (Mỹ Latinh); Tridge (Hàn Quốc, xác minh nhà cung cấp cho xuất nhập khẩu); IndiaMART/ Alibaba Verified Supplier (bên thứ ba kiểm định); GlobalG.A.P. và các hệ thống chứng nhận nhóm (group certification, ICS — internal control system); Fairtrade/Rainforest Alliance cho nông hộ nhỏ. Mỗi trường hợp: họ làm gì, nhân viên/đối tác hiện trường làm khâu nào, xác minh gì, phân hạng ra sao, ai trả chi phí, kết quả và **thất bại/bài học** (ví dụ công ty đóng cửa, gian lận).
2. Rút ra **mô hình đề xuất cho AgiViet**:
   - Quy trình onboarding có người: đăng ký sơ bộ trên app → nhân viên/cộng tác viên hiện trường (có thể là cán bộ HTX, khuyến nông) hẹn lịch → thăm vườn/ao, chụp ảnh có tọa độ thời gian → kiểm giấy tờ → hồ sơ được duyệt bởi người thứ hai → tài khoản xác thực. Thời gian, chi phí mỗi hồ sơ (ước, ghi là ước), ai trả.
   - **Bộ tiêu chí và hạng** người bán ánh xạ với yêu cầu của từng loại bên mua (bảng), mỗi tiêu chí ghi "AgiViet đã kiểm" / "bên thứ ba chứng nhận" / "tự khai"; thời hạn hiệu lực và tái xác minh; xử lý khi phát hiện khai sai.
   - Xác minh **bên mua** (năng lực thanh toán, lịch sử trả tiền, hạn mức trả sau) để bù việc bên mua không thích đặt cọc.
   - Luồng **mẫu thử** trước đơn đầu.
   - Vai trò của AgiViet sau đơn đầu và mô hình thu phí phù hợp (dẫn chứng từ các case).
   - Rủi ro: nhân viên thông đồng, giả giấy tờ, chi phí hiện trường quá cao so với giá trị đơn; cách kiểm soát (luân chuyển, kiểm tra ngẫu nhiên, hai người duyệt).
3. Đề xuất thay đổi cụ thể cho hệ thống hiện có (đặc tả, CSDL, backend, app bán/mua, quản trị) theo mức ưu tiên: **trước cuộc thi** / **sau cuộc thi**. Không sửa mã, chỉ đề xuất.

## Đầu ra
`docs/nghien-cuu/01-xac-minh-nguoi-ban-co-nhan-vien.md` (báo cáo chính, có bảng case, nguồn), `docs/nghien-cuu/02-de-xuat-thay-doi-he-thong.md`. Chỉ ghi trong `docs/nghien-cuu/`. Không chờ vòng lặp. Xong in tóm tắt 10 dòng rồi dừng.


## Làm tiếp
Lượt trước bị ngắt (hết hạn mức) sau khi đã viết ghi chú `docs/nghien-cuu/ghi-chu/chau-a.md`, `chau-phi-my-latinh.md` (có case Psaltry/Farmforce). Đọc ghi chú, bổ sung case còn thiếu nếu cần, rồi viết hai báo cáo chính. Không làm lại phần đã có.
