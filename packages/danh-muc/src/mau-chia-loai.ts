// Mẫu chia loại theo cách từng ngành đang mua bán (docs/01-nghiep-vu/mat-hang.md). Người bán điền khi đăng lô, bên mua khi tạo nhu cầu.
import type { MauChiaLoai } from './kieu.ts';

const LOAI_123 = { ma: 'loai', nhan: 'Loại', kieu: 'chon' as const, luaChon: ['Loại 1', 'Loại 2', 'Loại 3', 'Xô (chưa lựa)'] };

export const MAU_CHIA_LOAI: Record<string, MauChiaLoai> = {
  'trai-cay': { ma: 'trai-cay', ten: 'Trái cây', coCheBien: true, truong: [
    LOAI_123,
    { ma: 'co', nhan: 'Cỡ trái', kieu: 'so', donVi: 'g/trái', goiY: 'Ví dụ 350' },
    { ma: 'chin', nhan: 'Độ chín', kieu: 'chon', luaChon: ['Xanh già', 'Chín tới', 'Chín'] },
  ] },
  'rau-cu': { ma: 'rau-cu', ten: 'Rau củ', coCheBien: true, truong: [
    LOAI_123,
    { ma: 'tuoi', nhan: 'Độ tươi', kieu: 'chon', luaChon: ['Thu hoạch trong ngày', '1–2 ngày', 'Đã trữ lạnh'] },
    { ma: 'dong-goi', nhan: 'Đóng gói', kieu: 'chon', luaChon: ['Xá (rời)', 'Bao', 'Thùng', 'Sọt'] },
  ] },
  lua: { ma: 'lua', ten: 'Lúa gạo, hạt', coCheBien: false, truong: [
    { ma: 'giong', nhan: 'Giống', kieu: 'chon', luaChon: ['ST24', 'ST25', 'OM5451', 'Đài thơm 8', 'Jasmine', 'IR50404', 'Nếp', 'Khác'] },
    { ma: 'do-am', nhan: 'Độ ẩm', kieu: 'so', donVi: '%', goiY: 'Lúa tươi khoảng 25' },
    { ma: 'tap-chat', nhan: 'Tạp chất', kieu: 'so', donVi: '%', goiY: 'Ví dụ 2' },
  ] },
  'cong-nghiep': { ma: 'cong-nghiep', ten: 'Cây công nghiệp, gia vị', coCheBien: false, truong: [
    { ma: 'do-am', nhan: 'Độ ẩm', kieu: 'so', donVi: '%', goiY: 'Cà phê nhân khoảng 12,5' },
    { ma: 'chi-tieu', nhan: 'Chỉ tiêu ngành', kieu: 'chon', luaChon: ['Hạt đen vỡ (cà phê)', 'Dung trọng g/l (tiêu)', 'Thu hồi nhân KOR (điều)', 'Cao su khô DRC (mủ)', 'Chữ đường CCS (mía)', 'Trữ bột (khoai mì)', 'Không áp dụng'] },
    { ma: 'gia-tri', nhan: 'Giá trị chỉ tiêu', kieu: 'so', donVi: '', goiY: 'Ví dụ 5 (%), 550 (g/l), 48 (lbs)' },
  ] },
  'chan-nuoi': { ma: 'chan-nuoi', ten: 'Gia súc, ong, yến', coCheBien: false, truong: [
    { ma: 'kg-con', nhan: 'Trọng lượng bình quân', kieu: 'so', donVi: 'kg/con' },
    { ma: 'giay', nhan: 'Giấy tờ', kieu: 'chon', luaChon: ['Có giấy kiểm dịch', 'Có phiếu kiểm nghiệm', 'Chưa có'] },
  ] },
  ca: { ma: 'ca', ten: 'Cá, hải sản', coCheBien: true, truong: [
    { ma: 'kg-con', nhan: 'Cỡ', kieu: 'so', donVi: 'kg/con', goiY: 'Ví dụ 0,8' },
    { ma: 'tuoi', nhan: 'Tình trạng', kieu: 'chon', luaChon: ['Sống', 'Tươi ướp đá', 'Cấp đông'] },
  ] },
  tom: { ma: 'tom', ten: 'Tôm, cua', coCheBien: true, truong: [
    { ma: 'con-kg', nhan: 'Cỡ', kieu: 'so', donVi: 'con/kg', goiY: 'Ví dụ 40' },
    { ma: 'tuoi', nhan: 'Tình trạng', kieu: 'chon', luaChon: ['Sống', 'Tươi ướp đá'] },
    { ma: 'khang-sinh', nhan: 'Kháng sinh', kieu: 'chon', luaChon: ['Đã ngưng đủ thời gian', 'Không dùng', 'Chưa rõ'] },
  ] },
  'nhuyen-the': { ma: 'nhuyen-the', ten: 'Nhuyễn thể, rong', coCheBien: true, truong: [
    { ma: 'con-kg', nhan: 'Cỡ', kieu: 'so', donVi: 'con/kg' },
    { ma: 'tuoi', nhan: 'Tình trạng', kieu: 'chon', luaChon: ['Sống', 'Tươi ướp đá'] },
  ] },
};
