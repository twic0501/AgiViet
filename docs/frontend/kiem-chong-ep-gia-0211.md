# Kiểm cơ chế chống ép giá người bán (02/11/2026)

Bên mua (AI đóng vai qua API thật, backend riêng 18981, chợ mẫu) cố ép giá bằng nhiều cách. Script: `~/.claude/jobs/d88082d5/tmp/thu-ep-gia.mjs`.

| # | Chiêu ép giá | Hệ thống | Kết luận |
|---|---|---|---|
| 1 | Xem giá thấp nhất kín của người bán | Không trả `floor_price_vnd` cho bên mua | Đạt |
| 2 | Chào 9.000 đ/kg (dưới giá kín 21.500) | Tự từ chối, chỉ báo "Chưa tới mức người bán chấp nhận" — không lộ giá kín | Đạt |
| 3 | Đang trả giá thì hạ xuống dưới giá kín (15.000) | Lời chào tự đóng (rejected) | Đạt |
| 4 | Trả giá quá 2 lượt / rút sau khi đã trả giá qua lại | Bị chặn (409; migration 0074) | Đạt |
| 5 | Đơn còn soạn, bên mua đề nghị hạ giá | Chặn: chỉ đề nghị khi đơn đã ký; đề nghị cần người bán đồng ý + ký phụ lục | Đạt |
| 6 | **Giá hạ cấp vô lý** (2.000 đ/kg = 12% giá 16.500) | Backend chỉ kiểm `< giá đơn` → **nhận** | **Kẽ hở** |

**Đã làm cho #6 (phía người bán):** màn ký có ô tích riêng "Hàng bị hạ loại tính X đ/kg (Y% giá)"; dưới 50% giá → viền đỏ, cảnh báo nhận rất ít tiền nếu bị hạ loại nhiều, gợi ý trả giá lại / nhắn bên mua trước khi ký.

**Cần người sáng lập chốt:** có đặt **sàn bắt buộc** cho giá hạ cấp không (ví dụ ≥ 50% giá đơn hoặc ≥ giá tham khảo loại 2) — nếu có, chặn ở backend `lapDon` + cảnh báo ở app mua khi lập đơn.

Ghi chú khác: `phan_tram_gia_tham_khao` của lời chào trên chợ mẫu đang `null` (chưa đủ giao dịch nền cho xoài loại 1 trong view giá tham khảo) — người bán chưa thấy "% giá thị trường" để biết mình có bị ép không.
