// Nội dung trang chủ. Giai đoạn 0: dựng đủ khung, chỉ chữ đã chốt mới viết thật; còn lại là ô chờ có mô tả.
// Bám định hướng đã chốt (docs/00-tong-quan.md): sổ làm ăn có chợ ở giữa, liên lạc mở khi cọc, tài khoản đảm bảo.
import { choChu, type NoiDungTrang } from './kieu.ts';

const muc = (tieuDe: string, moTa: string) => ({ tieuDe: choChu(tieuDe), moTa: choChu(moTa) });

export const TRANG_CHU: NoiDungTrang = {
  dauTrang: {
    menu: [
      { nhan: 'Cách hoạt động', den: '#cach-hoat-dong' },
      { nhan: 'Nhà vườn', den: '#nha-vuon' },
      { nhan: 'Doanh nghiệp', den: '#doanh-nghiep' },
      { nhan: 'Bảng giá', den: '#bang-gia' },
      { nhan: 'Hỏi đáp', den: '#hoi-dap' },
    ],
    nutChinh: 'Dùng thử',
  },
  hero: {
    khauHieu: 'Tìm đúng mối, chốt đúng giá',
    moTa: choChu('Một câu (≤ 25 chữ): AgiViet giúp nhà vườn bán được giá và doanh nghiệp mua được nguồn ổn định, tiền đi qua tài khoản đảm bảo.'),
    nutBan: 'Tôi bán nông sản',
    nutMua: 'Tôi thu mua',
    hinh: { cho: 'Ảnh ghép: điện thoại app Nhà sản xuất (màn Hôm nay) và máy tính app Thu mua (màn Tổng quan)', tiLe: '4/3' },
  },
  vanDe: {
    tieuDe: choChu('Tiêu đề khu vấn đề: nỗi lo chung của hai bên, ≤ 10 chữ'),
    muc: [
      muc('Bị ép giá', 'Nhà vườn bán qua nhiều trung gian, không biết giá đúng'),
      muc('Sợ không được trả tiền', 'Giao hàng rồi mới đòi tiền, bị khất, bị "xù"'),
      muc('Khó có nguồn ổn định', 'Doanh nghiệp thiếu hàng đúng loại, đúng ngày, khó kiểm nguồn gốc'),
    ],
  },
  cachHoatDong: {
    tieuDe: choChu('Tiêu đề: một giao dịch đi qua 6 chặng'),
    moTa: choChu('Một câu: mỗi chặng ai làm gì, app báo tới lượt ai'),
    chang: [
      muc('Kết nối', 'Bên mua thấy lô, gửi lời mời; người bán đồng ý'),
      muc('Đơn', 'Bên mua gửi đơn; người bán xác nhận, lượng được giữ'),
      muc('Cọc', 'Bên mua cọc vào tài khoản đảm bảo; số điện thoại hai bên mở'),
      muc('Giao và cân', 'Giao hàng, cân, bên mua nhập số cân'),
      muc('Chốt', 'Người bán xác nhận số cân; app tính tiền đã trừ cọc'),
      muc('Tiền về', 'Tiền từ tài khoản đảm bảo về người bán; đơn đóng'),
    ],
  },
  nhaVuon: {
    tieuDe: choChu('Tiêu đề cho nhà vườn: sổ làm vườn trong điện thoại'),
    moTa: choChu('Một câu: ghi nhật ký, thu chi bằng giọng nói; tới mùa bấm một nút đăng bán'),
    tinhNang: [
      muc('Nói là ghi', 'Nhật ký phun thuốc, bón phân, thu chi không cần gõ chữ'),
      muc('Biết lời lỗ từng vụ', 'Thu chi theo vụ, tiền bán qua app tự vào sổ'),
      muc('Đăng bán từ nhật ký', 'Lô có sẵn ảnh, sản lượng ước, hồ sơ nguồn gốc'),
      muc('Tiền về chắc chắn', 'Bên mua cọc trước, tiền đi qua tài khoản đảm bảo'),
    ],
    hinh: { cho: 'Ảnh điện thoại: màn Vườn của tôi và màn Nói để ghi', tiLe: '9/16' },
  },
  doanhNghiep: {
    tieuDe: choChu('Tiêu đề cho doanh nghiệp: bàn làm việc thu mua'),
    moTa: choChu('Một câu: tìm nguồn, đặt cọc, nghiệm thu, trả tiền, kho và bảng kê trong một chỗ'),
    tinhNang: [
      muc('Nguồn đúng loại, đúng ngày', 'Lọc theo mặt hàng, lượng còn bán, ngày hái, uy tín'),
      muc('Đơn rõ tới lượt ai', 'Mỗi đơn có thanh 6 chặng và việc tiếp theo'),
      muc('Kho và truy xuất', 'Từ đơn nhập kho, truy ngược tới vườn và nhật ký'),
      muc('Bảng kê 01/TNDN', 'Tự lập từ đơn mua của nông dân'),
    ],
    hinh: { cho: 'Ảnh máy tính: màn Đơn và lịch nhận, có nhãn "tới lượt ai"', tiLe: '16/9' },
  },
  anToan: {
    tieuDe: choChu('Tiêu đề khu an toàn tiền và thông tin'),
    moTa: choChu('Một câu: app đứng giữa để hai bên yên tâm'),
    muc: [
      muc('Tài khoản đảm bảo', 'Tiền giữ ở ngân hàng đối tác, chỉ về người bán khi đã chốt cân'),
      muc('Liên lạc mở khi cọc', 'Trước khi cọc chỉ thấy tên, vùng, uy tín'),
      muc('Đối soát công bằng', 'Lệch cân, chưa thấy tiền: hồ sơ hai bên, không kết luận vội'),
    ],
  },
  matHang: {
    tieuDe: choChu('Tiêu đề khu mặt hàng'),
    moTa: choChu('Một câu: hàng thô, bán theo lô cho doanh nghiệp'),
    nhom: [
      muc('Trái cây', 'Ví dụ 3–4 mặt hàng tiêu biểu'),
      muc('Lúa gạo, hạt, củ', 'Ví dụ 3–4 mặt hàng tiêu biểu'),
      muc('Cây công nghiệp', 'Ví dụ: cà phê, tiêu, điều, cao su'),
      muc('Rau củ, nấm', 'Ví dụ 3–4 mặt hàng tiêu biểu'),
      muc('Thủy sản nuôi', 'Ví dụ: tôm, cua, cá tra, nghêu'),
      muc('Hải sản đánh bắt', 'Ví dụ: cá ngừ, mực, ghẹ'),
    ],
  },
  bangGia: {
    tieuDe: choChu('Tiêu đề bảng giá'),
    goi: [
      { ten: 'Người bán', gia: choChu('Miễn phí'), doiTuong: choChu('Nhà vườn, ao nuôi, hợp tác xã'), quyen: [choChu('Quyền 1'), choChu('Quyền 2'), choChu('Quyền 3')] },
      { ten: 'Bên mua · Miễn phí', gia: choChu('0 đ + phí theo đơn'), doiTuong: choChu('Vựa nhỏ, mua vài lô mỗi tháng'), quyen: [choChu('Quyền 1'), choChu('Quyền 2'), choChu('Quyền 3')] },
      { ten: 'Bên mua · Business', gia: choChu('Giá tháng (chưa chốt)'), doiTuong: choChu('Nhà máy, doanh nghiệp mua lặp lại'), quyen: [choChu('Quyền 1'), choChu('Quyền 2'), choChu('Quyền 3')] },
    ],
    ghiChu: choChu('Ghi chú phí giới thiệu đơn đầu, phí mối quen, trần phí; mức chính thức công bố trước khi áp dụng'),
  },
  hoiDap: {
    tieuDe: choChu('Tiêu đề hỏi đáp'),
    cau: [
      { hoi: choChu('Vì sao chưa thấy số điện thoại người bán?'), dap: choChu('Giải thích liên lạc mở khi cọc') },
      { hoi: choChu('Tiền cọc giữ ở đâu?'), dap: choChu('Giải thích tài khoản đảm bảo') },
      { hoi: choChu('Cân lệch thì sao?'), dap: choChu('Giải thích đối soát') },
      { hoi: choChu('Người bán có mất phí không?'), dap: choChu('Giải thích người bán miễn phí') },
    ],
  },
  batDau: {
    tieuDe: choChu('Lời mời dùng thử, ≤ 8 chữ'),
    moTa: choChu('Một câu: bản mô phỏng chạy ngay trên trình duyệt, chọn vai để bắt đầu'),
    nutBan: 'Vào app Nhà sản xuất',
    nutMua: 'Vào app Thu mua',
  },
  chanTrang: {
    moTa: choChu('Một câu giới thiệu AgiViet'),
    cot: [
      { tieuDe: 'Sản phẩm', lienKet: [{ nhan: 'Cách hoạt động', den: '#cach-hoat-dong' }, { nhan: 'Bảng giá', den: '#bang-gia' }] },
      { tieuDe: 'Hỗ trợ', lienKet: [{ nhan: 'Hỏi đáp', den: '#hoi-dap' }] },
    ],
    banQuyen: '© 2026 AgiViet',
  },
};
