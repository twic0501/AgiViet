# 02. Sổ cái tiền và lượng

## Quy ước tiền

`amount_vnd > 0` là vào tài khoản; `< 0` là ra. Đây là sổ vận hành theo các vị trí tiền và quyền đòi, không phải hệ thống tài khoản kế toán doanh nghiệp đầy đủ. Mỗi transaction ít nhất hai entries, tổng bằng 0. Constraint trigger hoãn kiểm cả header rỗng và tổng bút toán tại COMMIT.

| Sự kiện | Các bút toán |
|---|---|
| Ngân hàng báo có đã tra API | `external` bên mua âm, `deposit_pending` theo đơn/khung dương |
| Đủ C + F | `deposit_pending` âm; đúng C vào `deposit_escrow`, F vào `fee_held`, phần thừa vào `excess_held` |
| Tạo lệnh chi/hoàn | Ngăn nguồn âm, `deposit_in_instruction`, `fee_in_instruction` hoặc `excess_in_instruction` dương |
| Lệnh thành công | Ngăn trong lệnh âm, `external` bên nhận dương |
| Lệnh thất bại | Ngăn trong lệnh âm, trả lại ngăn nguồn dương |
| Xác nhận trả thẳng | `external` người trả âm, người nhận dương; giảm/tăng cặp quyền đòi tương ứng |
| Quyết toán | `seller_receivable` tăng theo chênh N, `buyer_payable` giảm đối ứng |
| Chi cọc cho người bán | Đồng thời giảm quyền đòi người bán và nghĩa vụ bên mua |
| Phí không còn hoàn | `fee_held` âm, `platform_revenue` dương |
| Tiền dịch vụ/ứng tiền | `confirmed_external_transfers` tạo hai dòng external sau xác nhận người nhận |
| Sửa tiền sai | Transaction mới trỏ `reverses_id`, cùng tài khoản, ngược dấu; tối đa một lần đảo |

Số dư `external` không biểu diễn số dư tài khoản ngân hàng cá nhân: chỉ biểu diễn dịch chuyển đã xác nhận liên quan hệ thống. Nó có thể âm. Các ngăn cọc, phí giữ, tiền đang trong lệnh và suspense không được âm. Bộ đệm `account_balances` do trigger cập nhật và khóa dòng nguyên tử; nguồn kiểm toán là view tổng `v_account_balances` từ entries.

Một khai báo của bên trả không tạo bút toán. Xác nhận người nhận kiểm thành viên, vai tiền, ngữ cảnh, số còn thiếu, tổng đã báo nếu có và mã ngân hàng UNIQUE trong đơn. Đối soát ngoại lệ cần quyết định hai người. Xác nhận tiền cần OTP đã xác minh, dùng một lần, gắn người nhận + khoản + số tiền + phiên bản hợp đồng; chuyển khoản bắt buộc mã ngân hàng, tiền mặt bắt buộc biên nhận đúng khoản/số tiền, có OTP chữ ký cả bên trả và bên nhận. Từ 20.000.000 đồng mỗi lần xác nhận tiền mặt, DB đặt `cash_warning`, ghi `cash_ge_20m` và outbox cảnh báo; vẫn cho nhận tiền. Auth worker xác minh mã thật, DB kiểm receipt và tiêu thụ trong cùng transaction.

## Quyết toán

`N = V - X_nb + X_bm - vật tư đối trừ`. Hàm `ledger.split_settlement` trả số chia cọc, còn `core.guard_settlement` đối chiếu đầu vào với dữ liệu nghiệm thu, xác nhận trả thẳng, sổ cọc, khoản phạt/phí và tiền đã chi trước.

`C_nb = min(C, max(0, N-D))`. Lần cuối:

- `release = max(0, C_nb - prior_released)`.
- `refund = C - prior_released - release`.
- `T_bm = max(0, N-D-C)`.
- `T_nb = max(0, D-N) + max(0, prior_released-C_nb)`.

Chi trước lớn hơn quyền cuối không đảo lệnh ngân hàng đã đi; tạo khoản người bán hoàn ngoài app. Từ 0021, UNIQUE `(order_id, seq)` giữ số phiên bản và partial UNIQUE `(order_id) WHERE is_effective` giữ duy nhất một bản hiệu lực. Bản mới khóa đơn, nối `previous_settlement_id`, tăng đúng một số rồi hạ cờ bản cũ trong cùng transaction. Không sửa nội dung, entries hay lệnh cũ.

Sau bản cuối, bản mới là `is_adjustment`: không chia lại cọc (`release/refund/c_nb_formula = 0`), `T_bm=max(0,N_mới-N_cũ)`, `T_nb=max(0,N_cũ-N_mới)`. Trigger tự tạo đúng một nghĩa vụ trả ngoài app và ghi delta quyền đòi hai vế. Chênh 0 không tạo nghĩa vụ/bút toán mới. Đơn đã hoàn tất có thêm nghĩa vụ chuyển `outstanding`; còn nợ không được hoàn tất. Lệnh đang chạy của bản cũ tiếp tục nhận callback; lệnh mới không được dựa vào bản hết hiệu lực hoặc bản điều chỉnh. `080_ls1` kiểm TH-047: 44.350.000 → 45.150.000, thêm 800.000; sau đó giảm 1 triệu và hoàn ngoài app.

Quyết toán tạm cho phép tính dòng tranh chấp theo mức bên mua đã thừa nhận (04 mục 6). Từ 0030, tổng quyền chi tạm là `max(0, min(C, max(0,V_kt-D)) - G_them)`; chi lần này trừ tiếp phần đã chi trước. `ledger.interim_release` tính số, `core.snapshot_dispute_hold` tự chụp `additional_hold_vnd` từ DB, không tin giá trị client. `G_them` gồm `inspections.fee_vnd` có `prepaid_by_org_id` là bên mua trong tranh chấp mở và phạt Q04 tối đa: `round(C_hợp_đồng × lượng_tranh_chấp × max(bps) / (lượng_hợp_đồng × 10000))` cho `claim_kind=shortfall`. Tranh chấp chất lượng không tự phát sinh phạt thiếu lượng. Phí khai ứng trong bảng kiểm định là chứng cứ nghiệp vụ nội bộ, chưa tích hợp xác minh ngân hàng/nhà kiểm định ngoài hệ thống. Quyết toán cuối chỉ tính dòng chốt. Không được gọi phần tạm là giá trị nghiệm thu cuối. Phí bên mua tách khỏi tiền hàng, không khấu trừ thu nhập người bán.

Bất biến cọc cần đối chiếu cả cọc đang giữ, trong lệnh, đã chi và đã hoàn. Tiền chuyển thừa chưa trả lại là một phần nguồn ngân hàng đang giữ, chưa phải cọc được phân bổ theo hợp đồng. `ledger.v_deposit_conservation` đối chiếu C ban đầu + C bổ sung với đang giữ + trong lệnh + đã chi + đã hoàn. F và cả hai ngăn tiền thừa nằm ngoài phép này; bản quyết toán cũng không cộng chúng vào C.

## Sổ lượng

Ngăn thật gồm `available`, `held`, `committed`, `in_transit`, `delivered`, `returned_pending`, `moved_to_child`, `loss`. `source` là ngăn đối ứng nguồn, được âm. Tổng mọi ngăn kể cả source bằng 0; ngăn thật không âm.

1. Đăng lô tự khai nguồn một lần. Lô nháp chưa có tồn kho giao dịch.
2. Tạo hold từ offer accepted tự chuyển `available -> held`; hủy/hết hạn trả lại; committed chuyển `held -> committed`. Ngăn held dùng khóa hold, các ngăn đơn dùng khóa đơn.
3. Bắt đầu giao chuyển `committed -> in_transit`. Nghiệm thu chuyển sang delivered hoặc returned_pending. Backend ghi trạng thái và chuyển lượng cùng transaction, dùng khóa sự kiện ổn định.
4. Tách/đưa hàng trả thành lô con phải có cả vế ra cha và vào con, cùng số lượng. Constraint hoãn chặn thiếu vế.
5. Giao xong không trừ lại khả dụng. Hao hụt sau điểm chuyển rủi ro là sự cố của phần hàng bên mua đã sở hữu, không tự giảm tiền người bán.

Khóa dòng lô `FOR UPDATE` trước mọi chuyển; bộ đệm ngăn có CHECK tức thì. Lô ước tính kiểm tổng lượng đã hứa/giao không vượt 80% nguồn. Kinh nghiệm thiếu hàng hai lần/180 ngày cần worker tính và áp quy tắc bắt buộc cân; hiện chưa có worker đó.

## Làm tròn và phân bổ

`ref.div_round` dùng numeric để làm tròn nửa ra xa 0; với số không âm là nửa lên. Tiền dòng làm tròn tới đồng, cọc tới nghìn, phí tới đồng rồi áp sàn/trần. `ref.allocate_vnd` chia xuống từng phần và đưa dư vào phần lớn nhất, cùng trọng số thì phần đầu. Cọc phân bổ: chia theo số nghìn rồi nhân lại 1000, xử lý trường hợp cọc chạm trần G theo điều khoản. Tổng nhóm/phần hộ vẫn phải kiểm lại trong transaction chốt; hàm số học không tự thay workflow duyệt nhóm.

## Kiểm soát tiền bổ sung 0024–0029

Bút toán theo đơn chỉ chạm tài khoản cọc/phí của chính đơn; tài khoản quyền đòi khung phải đúng khung của đơn; external chỉ thuộc hai tổ chức của đơn. Constraint hoãn kiểm lúc COMMIT. Điều chỉnh/đảo (`money_type=correction`) phải có `decision_id` đúng mã giao dịch, người lập tài chính và người duyệt tài chính/trưởng ca khác nhau. Ngày hiệu lực nằm trong ±7 ngày `posted_at`; ngoại lệ cần quyết định đó có `detail.allow_backdate=true`.

Đích chi cọc là tài khoản đã chụp trong phiên bản hợp đồng hiệu lực. Mọi hoàn tiền giữ `source_bank_event_id` và hash/ngân hàng/tên/số che đúng nguồn; tổng hoàn không vượt tiền nguồn. `excess_vnd` là phần thừa của riêng sự kiện lúc áp dụng. Căn cứ hoàn thừa không được bịa hay vượt phần này. Hoàn phí cần căn cứ Q06: hủy do người bán/bất khả kháng hoặc điều chỉnh phí âm của phụ lục giảm lượng đã ký.

Từ 0030, tiền tới đơn `closed`/`completed` hoặc cọc đang xử lý/đã đóng nằm ở `deposit_pending` theo đơn/khung, `apply_result=late_after_closed`, tạo `ops.bank_return_tasks`. Tiền thiếu lúc đóng đơn chờ cọc cũng được xếp task hoàn. Tiền chưa khớp được đơn vẫn ở `suspense` toàn cục. Task chụp ngân hàng/hash/số che/tên nguồn. `cmd.complete_bank_return(source_event, proof_event)` chỉ cho bank worker, kiểm statement debit đã tra API, đúng nguồn và số tiền trước ghi `suspense_return` và đánh dấu đã hoàn. Không kích hoạt lại đơn; worker chuyển khoản thật còn cần tích hợp. Tài khoản nguồn chưa đủ dữ liệu phải đối soát, không tự chuyển sang tài khoản mặc định.

LS-2: seed BT-2005 chỉ giữ kế hoạch/đợt nguồn. `090_ls2` tạo đơn 9.000 kg, ký hai bên, tra lại ngân hàng mô phỏng và nhận cọc vụ 9 triệu, nghiệm thu/chốt 3.000 kg đợt 1, đối trừ vật tư 5 triệu và xác nhận trả thẳng 49 triệu bằng OTP. Chưa chạy đợt 2–3 xuyên suốt; không coi nhãn nguồn `da_chot` là chứng cứ tiền. Cọc khung và công nợ KH-2003 là số dư nhập khẩu có nhãn; seed không giả callback ngân hàng cho số dư này.


## Số tiền N-08 được kiểm

| Nhánh | Chi tạm | Chi thêm | Hoàn bên mua | Ngoài app |
|---|---:|---:|---:|---:|
| 7.12 / TH-029 | 9.570.000 | — | Giữ 4.230.000 | — |
| 7.12A, người bán sai | 9.570.000 | 0 | 4.230.000 | 0 |
| 7.12B, người bán đúng | 9.570.000 | 2.580.000 | 1.650.000 | 0 |
| TH-031 chia 50/50 | 9.570.000 | 1.290.000 | 2.940.000 | 0 |

7.12A người bán ròng 41.770.000. TH-031 `X_nb=140.000`, `N=43.060.000`. Công thức quyết toán cuối trong `split_settlement` giữ nguyên; thay số đã chi trước theo N-08. Số cũ trong migration lịch sử và ca thử cố tình sai được giữ để kiểm chặn.
