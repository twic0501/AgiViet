// 10 số đăng nhập mẫu cho trình diễn (CHỈ môi trường thử). Mỗi số là bí danh của một người có sẵn trong dữ liệu ảo;
// tình huống được dựng bằng lệnh nghiệp vụ thật (scripts/demo-10-so.ts). Production không nhận số ngắn này.
export interface SoDemo {
  so: string; sdt: string; ten: string; to_chuc: string; app: 'ban' | 'mua'; tinh_huong: string; man_mo_dau: string;
}
export const SO_DEMO: SoDemo[] = [
  { so: '0001', sdt: '0939000140', ten: 'Võ Thị Lan', to_chuc: 'Hộ Võ Thị Lan (TC-B04)', app: 'ban', tinh_huong: 'Lô xoài cát Chu đang bán, có 1 lời chào giá mới cần trả lời', man_mo_dau: '/ban/#/offers/{offer_id}' },
  { so: '0002', sdt: '0939000120', ten: 'Lê Thị Hai', to_chuc: 'Hộ Lê Thị Hai (TC-B05)', app: 'ban', tinh_huong: 'Đã đồng ý giá; hợp đồng chờ người bán ký OTP', man_mo_dau: '/ban/#/order/{order_id}' },
  { so: '0003', sdt: '0988000770', ten: 'Huỳnh Văn Bảy', to_chuc: 'Hộ Huỳnh Văn Bảy (TC-B08)', app: 'ban', tinh_huong: 'Đã cọc; bên mua báo đã chuyển tiền trước bốc kèm chứng từ, cần kiểm tiền và xác nhận', man_mo_dau: '/ban/#/order/{order_id}' },
  { so: '0004', sdt: '0939000160', ten: 'Trần Văn Sáu', to_chuc: 'Hộ Trần Văn Sáu (TC-B02)', app: 'ban', tinh_huong: 'Đã cân tại vườn; bên mua nhập kết quả 3 phần có dòng hạ cấp kèm ảnh và cân thiếu, cần ký đồng ý hoặc "Không đúng"', man_mo_dau: '/ban/#/order/{order_id}/delivery' },
  { so: '0005', sdt: '0966000520', ten: 'Đặng Thị Bích', to_chuc: 'Hộ Đặng Thị Bích (TC-B07)', app: 'ban', tinh_huong: 'Một phần chanh bị trả lại/hạ cấp sau nghiệm thu; lô con loại 2 đang bán, gợi ý bán gấp', man_mo_dau: '/ban/#/lots' },
  { so: '0006', sdt: '0908000510', ten: 'Võ Thanh Sen', to_chuc: 'Nhà hàng Bếp Sen (TC-M05)', app: 'mua', tinh_huong: 'Nhu cầu sầu riêng đang mở, đã nhận 3 báo giá cần so', man_mo_dau: '/mua/#/demands/{demand_id}' },
  { so: '0007', sdt: '0906000105', ten: 'Nguyễn Thị Mười', to_chuc: 'Quán Cơm Nhà Mười (TC-M06)', app: 'mua', tinh_huong: 'Hợp đồng hai bên đã ký, bên mua cần chuyển cọc', man_mo_dau: '/mua/#/order/{order_id}' },
  { so: '0008', sdt: '0903000411', ten: 'Nguyễn Thị Ngọc', to_chuc: 'Công ty XNK Sông Tiền (TC-M02)', app: 'mua', tinh_huong: 'Đến giờ giao tại vườn; là người nhận, cần mở QR/mã 6 số rồi nhập nghiệm thu 3 phần', man_mo_dau: '/mua/#/order/{order_id}/delivery' },
  { so: '0009', sdt: '0937000910', ten: 'Trần Văn Thành', to_chuc: 'Vựa lúa Ba Thành (TC-M08)', app: 'mua', tinh_huong: 'Đang tranh chấp chất lượng (khác mẫu), chờ kết quả kiểm định', man_mo_dau: '/mua/#/order/{order_id}/disputes' },
  { so: '0010', sdt: '0938000610', ten: 'Tạ Văn Hùng', to_chuc: 'Vựa trái cây Tư Hùng (TC-M07)', app: 'mua', tinh_huong: 'Hợp đồng đặt trước khi hái sầu riêng, gần ngày hái, chờ chốt lượng/giá', man_mo_dau: '/mua/#/order/{order_id}' },
];
const THEO_SO = new Map(SO_DEMO.map((x) => [x.so, x]));
/** Trả số thật nếu là số demo (chỉ khi môi trường thử), ngược lại null. */
export function soThatCuaDemo(so: string, laThu: boolean): string | null {
  if (!laThu) return null;
  return THEO_SO.get(String(so ?? '').trim())?.sdt ?? null;
}
