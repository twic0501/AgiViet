# Ánh xạ quy trình bản 23 → database hiện có

Ngày 28/10/2026. Căn cứ: mô phỏng quy trình bản 23 (59 tình huống, đã khóa; bản sao chỉ đọc ở `~/Documents/AgiViet/mo-phong-quy-trinh-v23-chot-2026-10-28/`) và database `db/` (57 migration, 157 bảng, khoảng 190 lệnh `cmd.*`).

Mốc kiểm thử trước khi sửa: `npm test` trong `db/` → **602/602 kiểm tra đạt** (PGlite, PostgreSQL 17.5).

Cách đọc:
- **Khớp**: dùng lại, chỉ cần thêm kiểm thử theo tình huống bản 23.
- **Lệch**: DB làm khác bản 23, phải sửa.
- **Thiếu**: chưa có, phải thêm.
- **Chọn**: bản 23 còn "Chưa chốt", DB đang theo một phương án; người sáng lập chọn.

## A. Khớp — dùng lại

| Khái niệm bản 23 | Có trong DB |
|---|---|
| Cọc 30% bên mua, tài khoản riêng mỗi đơn, chỉ nhận cọc | `core.deposits` (tài khoản ảo, mã chuyển khoản), trạng thái chờ chuyển / nhận thiếu / đang giữ |
| Tiền nộp thừa, tiền tới sau khi đóng → hoàn về nguồn, không khôi phục đơn | Sổ `deposit_pending`, `excess_held`, lệnh `refund_excess`, `suspense_return` (0030, 0032) |
| Sổ kép tiền và lượng hàng | `ledger.*` (bút toán hai đầu, số dư theo tài khoản, chuyển lượng theo ngăn) |
| Lệnh ngân hàng có mã, thử lại bằng mã mới, không chi hai lần | `core.bank_instructions` (thay thế lệnh cũ, chống trùng mã) |
| Hai người cho quyết định ngoại lệ (đề xuất ≠ duyệt) | `ops.decision_proposals`, `ops.decisions` (proposed_by, approved_by) |
| Đối soát tiền trả trực tiếp có bằng chứng ngân hàng | `cmd.reconcile_direct_payment` (cần quyết định hai người, lưu chứng từ) |
| Giữ lượng có hạn, hết hạn tự nhả | `core.holds` (active / expired / committed / cancelled) |
| Nhiều đề nghị, rút, hết hạn | `core.offers`, `core.offer_rounds` |
| Giá tối đa của bên mua theo dòng nhu cầu | `core.demand_line_max_prices` |
| Ghép theo luật, có lý do, có bộ lọc bắt buộc | `mkt.match_candidates` (score, hard_filters_passed, reasons, phiên bản thuật toán) |
| Hợp đồng nhiều phiên bản, phụ lục ký đủ mới có hiệu lực | `core.order_versions`, `core.amendments`, `core.documents` (không ký bản cũ) |
| Bất khả kháng: chứng cứ + hai chữ ký rồi mới giảm, hoàn cọc chênh không phạt | Kiểm thử C58 đã chứng minh (đặt trước, bao tiêu) |
| Nghiệm thu từng dòng, chốt lượng, cân lại | `core.acceptance_*`, hạn `reweigh`, `arrival_check` |
| Mốc chuyển rủi ro khi bàn giao | `core.risk_transfers` (điểm chấp nhận, chứng từ) |
| QR chỉ xác minh quyền nhận | `core.qr_tokens`, `evt.qr_scans` |
| Mẫu niêm phong, chuỗi giữ mẫu | `core.sealed_samples`, `core.sample_custody_events` (mở, bàn giao, nhận) |
| Kiểm định có phí, ai ứng trước | `core.inspections` (fee_vnd, prepaid_by_org_id) |
| Tranh chấp theo dòng, kết quả, rút | `core.disputes`, `dispute_resolutions`, `dispute_withdrawals` |
| Hàng trả lại: nơi giữ, lựa chọn, hạn | `core.return_dispositions`, lô con hàng trả lại |
| Tiền mặt, trả trực tiếp có xác nhận, quá hạn | `core.direct_payments` (chưa đến hạn → đến hạn → báo đã trả → nhận đủ / lệch / quá hạn) |
| Hợp đồng khung, gọi hàng, hạn chốt gọi hàng | `core.framework_*`, `calloff_cutoff` |
| Đặt trước khi hái, bao tiêu theo vụ | `core.seasonal_*` (0057) |
| Bán gấp, hàng kém loại | `core.urgent_sale_suggestions`, `substandard_receivers` |
| Hàng việc có hạn, ghi công theo phút | `ops.tasks`, `ops.work_logs` |
| Kiểm toán chuỗi băm, lịch sử trạng thái | `evt.audit_chain`, `evt.state_history` |
| Xác minh người bán theo mặt hàng | `core.seller_product_*`, `ops.owner_verifications` |

## B. Lệch — phải sửa

| # | Lệch | Bản 23 nói | Sửa |
|---|---|---|---|
| B1 | **Chốt đơn quá dễ.** `cmd.finish_order` chỉ kiểm khoản trả trực tiếp còn treo | Ba mức đóng: đã quyết toán mua bán → hồ sơ còn mở (hàng trả lại, tranh chấp, phí, bồi hoàn) → hoàn tất toàn bộ | Thêm điều kiện: không còn tranh chấp mở, hồ sơ hàng trả lại chưa xử lý, hồ sơ phí còn thiếu, nghĩa vụ hoàn chưa xác minh |
| B2 | **Vai HTX gom, điểm gom, hộ thành viên.** Vai `coop_board`, `collection_staff`, `coop_member`; loại tổ chức `coop_group`; loại hợp đồng `pooled_lot` | Bỏ HTX/điểm gom/đầu mối (27/10). Nhiều trang trại thì mỗi trang trại một hợp đồng, một xe ghé từng vườn. HTX chỉ còn là người bán tự sản xuất | Không cho tạo mới các vai và loại này; thêm vai "Quản lý sản xuất". Đơn nhóm chuyển sang "nhiều hợp đồng, một chuyến xe" |
| B3 | **Người giúp / ủy quyền nhập liệu.** `core.delegations`, `cmd.delegate_helper` | Bỏ "người giúp" | Tắt lệnh tạo mới; giữ bảng để không mất lịch sử |
| B4 | **Thương lái.** Loại tổ chức `trader` được mua | Bên mua chỉ doanh nghiệp B2B đã xác minh; chưa áp cho thương lái | Không cho đăng ký mới loại này trong V1 |
| B5 | **Mở liên lạc** theo giá trị đơn (≥ 3 triệu hoặc từ đơn thứ 2) | Chỉ mở sau cọc hoặc cam kết ngân hàng; khảo sát vườn chỉ mở cho đúng chuyến người bán đồng ý; che số chỉ là hỗ trợ | Đổi điều kiện mở; thêm loại mở "khảo sát" có hạn |

## C. Thiếu — phải thêm

| # | Thiếu | Tình huống bản 23 dùng | Thêm gì |
|---|---|---|---|
| C1 | Hồ sơ mở và ba mức đóng (trạng thái "Đã xử lý xong nhánh", "Đã quyết toán mua bán · còn hồ sơ mở") | chinh, nghiem-thu-thap, da-nhan-nhieu-hon, các nhánh thanh toán | Bảng hồ sơ mở theo đơn (loại, người phụ trách, hạn); trạng thái đơn "đã quyết toán, còn hồ sơ" |
| C2 | Hồ sơ phí kiểm định đủ số: ai ứng, ai chịu cuối, đã hoàn, còn thiếu | vuon-du-luong-khong-dat, hai-ket-qua-khac, mau-hong | Bảng phân bổ phí (tổng = ứng = chịu), khoản hoàn phí; trạng thái "chờ xử lý" khi chưa rõ lỗi |
| C3 | Khoản đòi thêm **chưa được bảo đảm**, khoản giữ riêng bên mua nộp thêm | tranh-chap-mot-dong, thang-tranh-chap-khong-tra | Nghĩa vụ chưa bảo đảm có hạn; khoản giữ riêng tùy chọn (xem mục Chọn E1) |
| C4 | Nguồn xác minh cho **mọi** khoản tiền (người nhận xác nhận / đối soát có căn cứ) | khong-xac-nhan-hoan, dinh-ky-tra-tien | Mở rộng cách xác nhận của trả trực tiếp sang khoản hoàn và nghĩa vụ hoàn của người bán |
| C5 | Chờ đối soát cọc khi ngân hàng báo trễ, giữ lượng tối đa 6 giờ | coc-bao-tre, qua-han-coc, de-nghi-bo-cuoc | Trạng thái cọc "chờ đối soát", hạn riêng; không nhả lượng khi đang chờ |
| C6 | Tiêu chí còn kiểm sau giao (dư lượng), hàng cách ly, khiếu nại có hạn | lay-tai-vuon, vuon-du-luong-khong-dat, dinh-ky-tra-tien | Dòng tiêu chí "kiểm sau", hạn kết quả; hạn khiếu nại; khiếu nại quá hạn chỉ ghi phản ánh |
| C7 | **Tìm nguồn định kỳ nhiều người bán**: kế hoạch, ba con số (dự kiến / đã chốt / đã cam kết), hạn chốt từng ngày, nguồn thay | dinh-ky, dinh-ky-thieu-luong, dinh-ky-3-ngay, dung-dinh-ky | Kế hoạch tìm nguồn của bên mua + đợt ngày + phân bổ nguồn; dùng lại đơn/giao nhận cho từng nguồn |
| C8 | Kỳ trả và **mức cho nợ riêng từng người bán**, công nợ chồng, nợ quá hạn dừng cam kết mới | dinh-ky-tra-tien, dinh-ky-3-ngay, dinh-ky-no-qua-han | Điều khoản trả theo cặp bên mua–người bán; kiểm "nợ hiện có + đợt mới ≤ mức" và "không có khoản quá hạn" trước cam kết |
| C9 | Bảo đảm dùng chung cho kế hoạch: phần đã phân bổ, phần còn dùng được, hoàn qua ngân hàng | dung-dinh-ky, dinh-ky-tra-tien | Phân bổ bảo đảm theo nghĩa vụ; lệnh hoàn / giải tỏa |
| C10 | Giới hạn giữ hàng tại chỗ theo mặt hàng, người kiểm, hạn quyết định, phương án ủy quyền trước | khong-con-doi-tac | Thông số mặt hàng (giờ giữ tối đa); phương án mặc định ghi trong hợp đồng |
| C11 | Sự cố mẫu (mất niêm, hỏng, thất lạc) | mau-hong | Thêm hành động "phát hiện hỏng niêm" vào chuỗi giữ mẫu; mẫu không hợp lệ |
| C12 | Lỗi do chính AgiViet, AgiViet chịu chi phí | agiviet-lam-sai | Bên chịu "nền tảng" trong khoản phí, bồi hoàn |
| C13 | Chọn đề nghị chưa là đã bán; hết hạn không ký chỉ ghi lịch sử, không trừ uy tín | nhieu-de-nghi, de-nghi-bo-cuoc | Giữ cho người được chọn có hạn ký; ghi lịch sử hết hạn tách khỏi điểm uy tín |
| C14 | Ghi công và chi phí phục vụ (Q24): chi phí dùng chung (ca trực), phí được hưởng, đã thu | Chi phí phục vụ | Mở rộng `ops.work_logs`: theo khách định kỳ, chi phí dùng chung, phí đã thu |
| C15 | Theo sát đơn: người chính, thay ca, bàn giao có xác nhận, điểm tải ca | theo-sat-don, theo-sat-thieu-nguoi | Giai đoạn đầu chưa làm trang nhân viên → để sau; chỉ giữ chỗ trong thiết kế |

## D. Chuyển lên Supabase

| # | Việc | Ghi chú |
|---|---|---|
| D1 | Nhóm bảng `auth.*` trùng tên nhóm đăng nhập của Supabase | Đổi tên sang `app_auth` |
| D2 | Vai trò DB riêng (`agiviet_app`, `agiviet_orchestrator`…) | Ánh xạ sang vai của Supabase (người dùng đã đăng nhập, máy chủ) |
| D3 | Hạn giờ chạy định kỳ | Supabase có `pg_cron` (PGlite thì không) |
| D4 | Đồng hồ thử `cmd.test_clock` | Chỉ có ở DB thử; không bật trên DB thật |
| D5 | Kiểm thử | Giữ PGlite cho chạy nhanh; thêm một lần chạy trên Postgres của Supabase trước khi đưa lên |

## E. Chọn — cần người sáng lập quyết

| # | Điểm | DB đang làm | Bản 23 đề xuất |
|---|---|---|---|
| E1 | Quyết toán khi còn tranh chấp (Q18) | Bản tạm **giữ lại** phí kiểm định bên mua ứng và tiền phạt, tối đa bằng phần tranh chấp | Trả đủ phần đã công nhận; khoản đòi thêm ghi "chưa bảo đảm"; muốn bảo đảm thì bên mua nộp khoản giữ riêng |
| E2 | Lệnh tiền ngoại lệ khi chỉ có một người vận hành | Bắt buộc hai người khác nhau | Như DB; pilot cần người thứ hai, hoặc không cho lệnh ngoại lệ |

## Thứ tự sửa đề xuất

1. D1 (đổi tên `auth`) và B1–B5: sửa trước vì ảnh hưởng toàn bộ.
2. C1–C6: hoàn thiện giao ngay (nhóm tình huống lớn nhất).
3. C7–C9: tìm nguồn định kỳ (khối lớn mới).
4. C10–C14: vận hành và chi phí.
5. C15: để sau.

Mỗi bước: migration mới (không sửa migration cũ) + kiểm thử theo đúng tình huống bản 23 + chạy lại toàn bộ 602 kiểm tra cũ.
