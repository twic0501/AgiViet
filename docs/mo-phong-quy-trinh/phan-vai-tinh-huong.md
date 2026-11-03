# Phân vai 59 tình huống → người dùng mẫu (bản nháp chờ duyệt, 03/11)

Nguyên tắc: người thi đăng nhập **một** vai. Các bên còn lại do AI diễn. Mỗi bên AI là một kiểu khách khác nhau, mang sẵn tình huống của mình. Chọn một vai là gặp nhiều tình huống cùng lúc, như đời thật.

## 1. Chia theo bên trải qua
**Bên bán trải qua (25):**
- Lấy hàng tại vườn: lay-tai-vuon, vuon-du-luong-khong-dat, vuon-bien-the, den-xem-hang.
- Tiền và cách trả: tien-mat, chua-tra, ung-tien, tra-mot-phan, da-nhan-nhieu-hon.
- Bên mua hủy, nghiệm thu và tranh chấp: mua-huy, can-khong-dung, khac-mau, hang-tra-lai, nghiem-thu-thap, tranh-chap-mot-dong, thang-tranh-chap-khong-tra.
- Kiểu đơn: dat-truoc, bao-tieu, khung, nhieu-trang-trai, kem-loai, de-nghi.
- Đăng ký và đầu ra: dang-ky, khong-co-dau-ra.
- Trả sau: tra-sau-mua-vi-pham.

**Bên mua trải qua (20):**
- Người bán không giao, cọc và hoàn tiền: ban-vi-pham, qua-han-coc, coc-sai, coc-thieu-khong-bu, coc-bao-tre, coc-sau-dong, khong-xac-nhan-hoan.
- Chọn đề nghị: nhieu-de-nghi, de-nghi-bo-cuoc.
- Mua định kỳ: dinh-ky, dinh-ky-thieu-luong, dinh-ky-thieu-giay-to, dinh-ky-tra-tien, dinh-ky-3-ngay, dinh-ky-no-qua-han, dung-dinh-ky.
- Đăng ký, nghiệm thu và sau đơn: dang-ky-mua, nghiem-thu-im-lang, phat-hien-sau-xuat, sau-don.

**AgiViet, ngân hàng, đối tác (AI nhân viên diễn, hai bên chỉ thấy kết quả) (13):**
- Trả sau qua ngân hàng: tra-sau-ngan-hang.
- Sự cố và quản trị: ngoai-gio, quan-tri, bat-kha-khang.
- Ngân hàng: lenh-ngan-hang-loi, ngan-hang-bao-sau-huy.
- Theo sát đơn: theo-sat-don, theo-sat-thieu-nguoi.
- Lỗi của AgiViet và đối tác: agiviet-lam-sai, mau-hong, khong-con-doi-tac, hai-ket-qua-khac.
- Ca gộp: ket-hop (gộp từ can-khong-dung + tra-mot-phan).

**Gộp được:**
- can-khong-dung + khac-mau → một bên mua "nghiệm thu khó tính".
- coc-sai + coc-bao-tre → một ca cọc.
- hang-tra-lai + nghiem-thu-thap → ca trả lại 80% (đã có).
- tra-mot-phan + chua-tra + thang-tranh-chap-khong-tra → bên mua "trả chậm".
- 7 ca dinh-ky → một khung định kỳ chạy qua nhiều tuần.

## 2. Gán vào người dùng mẫu: rút ngẫu nhiên (người sáng lập chốt 03/11)
Không cố định cặp. Mỗi lần chọn vai, hệ thống rút ngẫu nhiên **3–4 đối tác AI** ở phía bên kia, mỗi bên một kiểu khách khác nhau. Màn đăng nhập hiện "Bạn sẽ gặp…" trước khi vào app. Kiểu khách nào cũng có thể rơi vào người bán nào: chị Năm gặp được thì anh Bảy cũng gặp được.

| Kiểu bên mua AI (người thi là người bán) | Tình huống |
|---|---|
| Sòng phẳng | chinh |
| Khó tính: hạ loại 10% có ảnh | can-khong-dung, khac-mau |
| Trả lại 80% có ảnh | hang-tra-lai, nghiem-thu-thap |
| Trả tiền hàng thiếu 30% | tra-mot-phan, chua-tra |
| Trả giá gắt 2 lần | de-nghi |

| Kiểu người bán AI (người thi là bên mua) | Tình huống |
|---|---|
| Giao đều | chinh |
| Giữ giá, trả giá 2 lần | nhieu-de-nghi |
| Trả lời chậm | theo-sat-don |
| Xuất thiếu 15% | dinh-ky-thieu-luong |

Mã nguồn: `backend/src/demo/doi-tac-ao.ts` (KIEU_MUA, KIEU_BAN, rutTep) và route `POST /v1/test/tep-khach`. Các tình huống còn lại sẽ thêm dần thành kiểu mới.
