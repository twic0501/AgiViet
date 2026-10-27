# Tham số chính sách của backend

Mọi tham số nằm ở một file: `backend/src/chinh-sach.ts` (`CHINH_SACH`, phiên bản `v2-thu-2026-10-26`). Mã nghiệp vụ chỉ đọc từ đây; số đã ghi vào hợp đồng (cọc, phí, giá tính cọc, thang phạt) được chụp vào `core.order_versions` lúc lập đơn nên đổi chính sách không ảnh hưởng đơn cũ. Giá trị trùng `core.policy_versions` id=1 và `ref.plans` của seed. SLA hàng việc đọc từ `ref.sla_policies` (DB). Đổi chính sách ở production cần quy trình hai người + chờ 24 giờ (N-09, migration 0031) — backend CHƯA có màn/lệnh cho việc này.

## Tám câu hỏi mở (TẠM theo đề xuất kỹ sư nghiệp vụ)

| # | Câu hỏi | Giá trị tạm | Khóa trong file |
|---|---|---|---|
| 1 | Thang phạt thiếu lượng (Q04) | % cọc phần thiếu: bất khả kháng 0, báo trước ≥ 3 ngày 10%, báo < 3 ngày 50%, không báo 100% | `thangPhatThieuLuongBps` |
| 2 | Hoàn phí khi trả lại nhiều | Không hoàn (đơn hoàn tất kể cả trả lại nhiều, Q05/Q06) | `hoanPhiKhiTraLaiNhieu = false` |
| 3 | Hàng không đạt an toàn (Q17) | Khóa lô, khóa bán gấp và kênh kém loại; đơn đóng lý do người bán không giao; không phạt cọc; hoàn phí | `hangKhongDatAnToan` |
| 4 | Che liên lạc tới khi cọc, ngưỡng (Q11) | Che tới khi cọc; số thật khi giá trị ≥ 3.000.000 đ hoặc ≥ 2 đơn hoàn tất (DB `core.refresh_contact_grant` cũng dùng 3.000.000) | `moLienLac` |
| 5 | Giá gói | Miễn phí 0; Thu mua 1.500.000/tháng; Doanh nghiệp 4.000.000; Bếp 490.000 | `goi.*.giaThangVnd` |
| 6 | Số thành viên gói Thu mua | 5 (Miễn phí 1, Doanh nghiệp 10, Bếp 2) | `goi.*.soThanhVienToiDa` |
| 7 | Vùng pilot | DT, CT, VL, TN, AG, HCM | `vungPilot` |
| 8 | Chốt theo biên bản khi người bán im lặng | 72 giờ, cần 2 người vận hành | `chotTheoBienBanSauGio` |

Ghi chú: (5), (6), (7), (8) đã có trong file nhưng backend CHƯA dùng (chưa có gói, mời thành viên, lọc vùng, lệnh chốt theo biên bản).

## Tiền và giá

| Tham số | Giá trị | Khóa |
|---|---|---|
| Tỷ lệ cọc | 30% | `cocBps` |
| Làm tròn cọc | nửa lên tới 1.000 đ | `cocLamTronVnd` |
| Giá tính cọc | max(P, làm tròn lên 70% × P_tk) | `giaTinhCocSanBps` |
| Giá tham khảo đủ dữ liệu | ≥ 3 đơn, ≥ 2 cặp | `giaThamKhaoToiThieuDon/Cap` |
| Chặn chào giá | < 60% tham khảo | `chanChaoDuoiBps` |
| Cảnh báo giá thấp | < 80% tham khảo | `canhBaoGiaThapBps` |
| Cờ giá bất thường | < 60% tham khảo | `giaBatThuongBps` |
| Cam kết tối đa lô ước tính | 80% | `uocTinhCamKetToiDaBps` |
| Phí theo gói | Miễn phí 1% đơn đầu / 0,5% đơn sau, sàn 20.000, trần 2.000.000; Thu mua 0,3% / 0%, sàn 20.000, trần 1.500.000; Doanh nghiệp 0,2%, trần 3.000.000; Bếp 0% | `goi` |
| Cảnh báo tiền mặt | ≥ 20.000.000 đ một lần (N-14, không chặn) | `canhBaoTienMatVnd` |
| Giữ lệnh chi tài khoản mới | < 72 giờ và ≥ 20.000.000 đ (DB cưỡng chế, 0031) | `giuLenhTaiKhoanMoiGio`, `giuLenhTuVnd` |
| Hao hụt đường cho phép | 2% | `hauHutDuongChoPhepBps` |
| Trả giá tối đa mỗi bên | 2 | `luotTraGiaToiDaMoiBen` |
| Rút lời chào mỗi phiếu | 2 | `luotRutToiDaMoiPhieu` |
| Chào vượt lượng (Q12) | ≤ 2 × lượng cần | `chaoVuotLuongToiDaLan` |

## Hạn (giờ, trừ khi ghi khác) — `han`

Trả lời lời chào 24; giữ lượng 24 (gia hạn tới hạn cọc khi người bán ký); người bán ký 24; cọc 48, hàng tươi (thời gian sống ≤ 10 ngày) 12; trả lời đề nghị/xin hủy 24; xác nhận trả thẳng sau khi bên mua báo 48; người bán xác nhận kết quả tại điểm 60 phút, tại kho 24; kiểm nơi đến 2; cân lại 24; kiểm định 48; thỏa thuận khi không kết luận 14 ngày; công nợ 72; tin lô hiển thị 14 ngày; bán gấp 3 ngày; đổi tài khoản 24 (72 sau khôi phục); OTP 300 giây; phiên đăng nhập 12 giờ.
