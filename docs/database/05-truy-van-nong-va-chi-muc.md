# 05. Truy vấn nóng và chỉ mục

Các chỉ mục là thiết kế ban đầu, chưa phải kết quả benchmark production. Seed nhỏ không chứng minh p95, I/O hay khả năng giữ tốc độ ở hàng triệu bút toán. PostgreSQL tự tạo B-tree cho PRIMARY KEY/UNIQUE, không tự tạo chỉ mục cho mọi FK.

## Danh sách đơn

```sql
SELECT id, code, status, created_at
FROM core.orders
WHERE buyer_org_id = $1
  AND status NOT IN ('completed','closed')
  AND (created_at, id) < ($2::timestamptz, $3::uuid)
ORDER BY created_at DESC, id DESC
LIMIT 30;
```

Dùng `ix_orders_buyer_cursor`; phía bán có chỉ mục tương ứng. Trang đầu bỏ điều kiện cursor. Không dùng OFFSET lớn. Những màn lọc theo một status cụ thể dùng chỉ mục buyer/seller + status + created_at cũ. Đối chiếu mối quen dùng chỉ mục cặp mua-bán và bảng lịch sử nhập.

## Tiền, lượng và hạn

| Truy vấn | Chỉ mục/ràng buộc hỗ trợ |
|---|---|
| Sổ tiền một đơn | `ix_ledger_txn_order`, entry(transaction_id) |
| Dòng tiền một tài khoản | `ix_ledger_entries_account` |
| Chống lặp ngân hàng/confirmation/settlement | UNIQUE theo khóa nguồn bút toán và idempotency |
| Lượng một lô | PK balances(lot,bucket,key), movements(lot,id) |
| Giữ lượng sắp hết | Partial expires_at khi hold active |
| Hạn sắp đến | Partial due_at khi deadline open; order/kind open |
| Lệnh chưa đối soát | Partial status của bank_instructions |
| Kết quả nghiệm thu mới nhất | acceptance_versions(delivery,version DESC) |
| Tranh chấp mở | Partial unique line và order/status |
| Hàng việc | required_role/priority/response_due, assigned_to/resolution_due |
| Outbox | destination/available_at/id khi pending/failed |
| QR và nhiệt độ | token hash UNIQUE, scans(token,time), readings(trip,time) |
| Kho và kiểm định | storage movements(booking,id), inspection results(parent,time) |

Với các màn tiền thông thường dùng bảng số dư do trigger duy trì. Đối chiếu độc lập dùng `ledger.v_account_balances`, chấp nhận chi phí SUM toàn sổ. Đo trước khi chọn cache hoặc phân vùng.

## Tìm nguồn và matching

`mkt.search_lots(product)` chỉ cung cấp cột công khai an toàn. Kết quả ghép thực lưu ở `mkt.match_candidates`, chỉ mục theo dòng nhu cầu/nhóm/điểm giảm dần. Backend phải tính H1–H11, khoảng cách, chứng nhận, loại, cửa sổ ngày, lượng cam kết được và giá kín trước khi ghi cache. Giá không là thành phần điểm. `reasons` giải thích thiếu lượng, lệch ngày và điều kiện; không chứa giá kín hoặc nhãn bán gấp.

Chưa có PostGIS. Tọa độ trong seed chưa đủ để benchmark truy vấn bán kính; không tạo chỉ mục GiST giả trên cột số thường. Khi có dữ liệu địa lý, cân nhắc PostGIS geography và đo lại truy vấn H6.

## Giá tham khảo

`mkt.reference_prices` là materialized view có UNIQUE `(product_id,grade_code,scope)`. Nguồn là dòng accepted đã chốt mới nhất và các đơn nền thử. Dữ liệu 30 ngày, loại cờ bất thường/thông đồng/khung; loại ngoại lệ IQR khi có từ 5 đơn; sau lọc cần từ 3 đơn, 2 cặp. Hàm quantile dùng numeric, không lưu tiền dạng float.

Hiện giá thật chỉ lấy cơ sở tại vườn/điểm gom. Giá giao kho chưa có dòng cước/kg tường minh nên bị loại, không tự đoán cước. Các dòng bảng cỡ/độ ẩm chưa tham gia nguồn giá thật; cần khóa nhóm quan sát theo cỡ/giống/ẩm trước khi mở đủ phạm vi này.

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mkt.reference_prices;
```

Lần đầu view đã có dữ liệu nên có thể dùng CONCURRENTLY trên PostgreSQL thật. Runner hiện dùng REFRESH thường, chỉ kiểm logic dữ liệu. MV lưu `as_of`; đọc tỉnh nếu đủ, nếu thiếu chọn DBSCL; không fallback sang `external_prices` để tính cọc. Tên DBSCL hiện là tổng các nguồn được mở trong MVP, cần cấu hình vùng trước mở rộng ra cả nước.

## Bước đo tiếp theo

Trên PostgreSQL 17 thật dùng `EXPLAIN (ANALYZE, BUFFERS)` với dữ liệu lớn và tải đồng thời, theo dõi `pg_stat_statements`. Đo deadlock, thời gian giữ khóa lô, độ trễ outbox và refresh. Chưa phân vùng lịch sử/entries; chỉ làm khi có số liệu dung lượng và chính sách lưu giữ.

## Bổ sung 0021–0029

Partial UNIQUE settlement(order_id) WHERE is_effective và UNIQUE previous_settlement_id chặn hai bản hiệu lực/phân nhánh. Duyệt số phiên bản vẫn khóa order trước; không thay khóa bằng việc chỉ dựa vào UNIQUE. OTP tra theo PK và FOR UPDATE trước tiêu thụ. Audit chain khóa advisory rồi lấy seq cuối; sequence có thể có khoảng trống do rollback, kiểm chuỗi theo hàng tồn tại.

Lệnh hoàn có chỉ mục source_bank_event_id để kiểm tổng hoàn về một nguồn. membership_role_grants có chỉ mục (membership_id,effective_at); view membership_roles chỉ trả vai đã qua cooling. Chưa đo EXPLAIN/p95 trên PostgreSQL server hoặc dữ liệu lớn.
