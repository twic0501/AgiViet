# Chuyển động

Chuyển động phải trả lời một trong ba câu: *tôi vừa bấm được chưa*, *việc đi tới đâu rồi*, *có gì vừa thay đổi*.

| Loại | Thời lượng | Đường cong | Mã thiết kế | Ví dụ |
|---|---|---|---|---|
| Phản hồi bấm | 80–150 ms | `ease-out` | `--nhanh` | Nút lún 2 px |
| Đổi trạng thái | 250–400 ms | `cubic-bezier(.2,.8,.2,1)` | `--vua`, `--duong-cong` | Nhãn nhóm đổi màu |
| Đi tới chặng mới | 500–700 ms | như trên | `--cham` | Thanh chặng tô tiếp |
| Lỗi, bị chặn | 300 ms | lắc 3 nhịp, 4 px | | Ô nhập lắc kèm lý do |
| Ăn mừng | ≤ 1.500 ms | vượt đà tối đa 8% | | Tiền về |

- Ăn mừng bấm được để bỏ qua; lần sau chạy bản ngắn.
- Không chặn thao tác trong lúc chạy.
- Máy bật "giảm chuyển động": các mã thời lượng về 0, hiện thẳng khung cuối.
- Animation phức tạp làm bằng Rive (giai đoạn sau): tên input trùng mã trạng thái.
