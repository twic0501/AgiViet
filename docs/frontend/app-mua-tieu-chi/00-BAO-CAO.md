# Báo cáo: thiết kế lại app MUA AgiViet (03/11/2026)

## Vì sao làm
App đang nghiêng về người bán, nhưng **bên trả tiền là bên mua**. Vòng 3 chấm app mua 5,5/10 (thấp nhất). Người sáng lập yêu cầu: gọi skill UI/UX Pro Max + tâm lý, có tiêu chí riêng cho app mua, chấm trước, dựng lại, chấm chéo với ChatGPT.

## Cách làm
1. **Skill:** UI/UX Pro Max (design system: tông "Organic" xanh đất + vàng mùa gặt khớp bộ "Sổ làm ăn" đang có → giữ token; bỏ gợi ý font Fira vì kém dấu tiếng Việt; áp quy tắc ≤5 tab, nút ≥44px, tương phản 4.5:1, giảm chuyển động). Marketing Psychology (Jobs to be done, sợ mất, Zeigarnik, neo giá, bằng chứng xã hội, Hick's Law, mặc định có lợi, BJ Fogg).
2. **Tiêu chí riêng 10 mục / 100 điểm** (`01-tieu-chi-va-cham-truoc.md`): chắc nguồn, tìm & so sánh, tin người bán, quyết định giá, việc tới lượt, tiền minh bạch, giao nhận, điều hướng điện thoại, công cụ doanh nghiệp, tin cậy kỹ thuật.
3. **Chấm chéo luân phiên:** bên chấm trước commit điểm trước, bên kia mới phản biện; mỗi điểm có tệp:dòng.

## Bảng điểm
| Lượt | Claude | ChatGPT |
|---|---:|---:|
| App mua cũ (`mua.js`) | 39 | — |
| Bản dựng lại lượt 1 | 70 | **41** |
| Lượt 2 (sửa theo phản biện) | 57 | **49** |
| Lượt 3 (sửa tiếp 6 lỗi ChatGPT nêu ở lượt 2) | chưa chấm | chưa chấm |

Claude lượt 1 chấm quá cao vì chấm "nhìn thấy" chứ chưa kiểm "làm được"; ChatGPT chỉ ra đúng. Khoảng cách hai bên thu từ 29 xuống 8 điểm.

## Bản dựng lại có gì (`frontend/thiet-ke/mua-moi.html`)
- **5 tab cố định:** Hôm nay · Nguồn · Đơn · Tiền · Thêm; tin nhắn ở đầu trang. Không còn menu ẩn.
- **Hôm nay:** nguồn tuần theo từng món (khung / đơn lẻ / thiếu), nút "Tìm 30 kg xoài còn thiếu"; hàng đợi "Tới lượt bạn" làm xong thì biến mất; lịch nhận 7 ngày; tiền đang ở đâu.
- **Nguồn:** tìm, lọc theo món, xếp hạng có lý do (đủ lượng thiếu, đã kiểm vườn, tỉ lệ giao đủ, khoảng cách), so sánh tối đa 3 nguồn cùng món, chào giá có neo giá chợ + thành tiền, gửi nhu cầu cho nhiều người bán.
- **Đơn:** khung tuần (còn gọi được, duyệt/trả giá tuần có vạch giá chợ), buổi giao 5 bước, đặt xe ghi biển số + tiền xe.
- **Tiền:** còn phải trả, theo người bán + hạn, tấm trả tiền theo **đúng khoản** (tiền hàng tuần trả người bán ≠ cọc vào ngân hàng giữ), chép số thật, bắt ảnh biên lai; **tải CSV bảng kê thật**.
- **Thêm:** kế hoạch tuần, lập khung, người bán quen, thành viên & duyệt chi; dịch vụ xe/kho ghi rõ "Mô phỏng".
- Nhãn "Bản mẫu… thao tác chưa lưu" trên toàn trang; không còn thông báo thành công giả.

## Còn thiếu để lên 85+ (theo ChatGPT, Claude đồng ý)
1. **Nối API thật** cho 5 tab + bật theo phiên đăng nhập (T10, ảnh hưởng mọi tiêu chí).
2. Chuyển luồng giao nhận đầy đủ (QR, nhập cân từng món, thiếu, ngưỡng 20%) từ `mua.js` sang bản mới (T7).
3. Trang hồ sơ người bán / hồ sơ lô có báo cáo kiểm, chứng nhận tải được (T3).
4. "Chắc nguồn" theo buổi đã xác nhận, trừ hàng trả lại (T1).
5. Màn kế hoạch tuần, người bán quen, thành viên & duyệt chi thật (T9).
6. Mở hội thoại tin nhắn theo đơn (T8).
