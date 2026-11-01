// 10 số đăng nhập mẫu cho trình diễn (CHỈ môi trường thử). Mỗi số là bí danh của một người trong chợ mẫu 5 bán + 5 mua (du-lieu-cho.json); bên kia do đối tác ảo đóng vai;
// tình huống được dựng bằng lệnh nghiệp vụ thật (scripts/demo-10-so.ts). Production không nhận số ngắn này.
export interface SoDemo {
  so: string; sdt: string; ten: string; to_chuc: string; app: 'ban' | 'mua'; tinh_huong: string; man_mo_dau: string;
}
export const SO_DEMO: SoDemo[] = [
  { so: '0001', sdt: '0918000421', ten: 'Nguyễn Thị Năm', to_chuc: 'Hộ Nguyễn Thị Năm (TC-B01) · xoài cát Chu', app: 'ban', tinh_huong: 'Nhà máy sấy Đồng Xanh vừa gửi lời chào mua lô xoài L-0412, cần trả lời', man_mo_dau: '/ban/#/offers/{offer_id}' },
  { so: '0002', sdt: '0977000610', ten: 'Lý Văn Tư', to_chuc: 'Hộ Lý Văn Tư (TC-B02) · sầu riêng', app: 'ban', tinh_huong: 'XNK Sông Tiền đã ký hợp đồng sầu riêng A; chờ người bán ký OTP', man_mo_dau: '/ban/#/order/{order_id}' },
  { so: '0003', sdt: '0907000300', ten: 'Võ Văn Thuận', to_chuc: 'HTX Tân Thuận (TC-B03) · thanh long', app: 'ban', tinh_huong: 'Đã cọc; Nhà hàng Bếp Sen báo đã chuyển tiền trước bốc kèm chứng từ, cần kiểm tiền và xác nhận', man_mo_dau: '/ban/#/order/{order_id}' },
  { so: '0004', sdt: '0945000880', ten: 'Phan Thị Hồng', to_chuc: 'Hộ Phan Thị Hồng (TC-B04) · tôm thẻ', app: 'ban', tinh_huong: 'Đã cân tại ao; Thủy sản Biển Xanh nhập kết quả 3 phần có hạ cấp kèm ảnh và cân thiếu, cần ký đồng ý hoặc "Không đúng"', man_mo_dau: '/ban/#/order/{order_id}/delivery' },
  { so: '0005', sdt: '0919000950', ten: 'Trần Văn Sáu', to_chuc: 'Hộ Trần Văn Sáu (TC-B05) · lúa tươi', app: 'ban', tinh_huong: 'Vựa Ba Cường trả lại/hạ cấp một phần lúa sau nghiệm thu; lô con đang bán, gợi ý bán gấp', man_mo_dau: '/ban/#/lots' },
  { so: '0006', sdt: '0909000210', ten: 'Phạm Thị Hạnh', to_chuc: 'Nhà máy sấy Đồng Xanh (TC-M01) · mua xoài', app: 'mua', tinh_huong: 'Nhu cầu xoài L1 đang mở, đã nhận báo giá của chị Năm và HTX Tân Thuận cần so', man_mo_dau: '/mua/#/demands/{demand_id}' },
  { so: '0007', sdt: '0908000510', ten: 'Võ Thanh Sen', to_chuc: 'Nhà hàng Bếp Sen (TC-M03) · mua thanh long', app: 'mua', tinh_huong: 'Hợp đồng thanh long với HTX Tân Thuận hai bên đã ký, bên mua cần chuyển cọc', man_mo_dau: '/mua/#/order/{order_id}' },
  { so: '0008', sdt: '0903000411', ten: 'Nguyễn Thị Ngọc', to_chuc: 'Công ty XNK Sông Tiền (TC-M02) · mua sầu riêng', app: 'mua', tinh_huong: 'Đến giờ nhận sầu riêng tại vườn anh Tư; là người nhận, cần mở QR/mã 6 số rồi nhập nghiệm thu 3 phần', man_mo_dau: '/mua/#/order/{order_id}/delivery' },
  { so: '0009', sdt: '0902000810', ten: 'Huỳnh Thị Biển', to_chuc: 'Công ty Thủy sản Biển Xanh (TC-M05) · mua tôm', app: 'mua', tinh_huong: 'Đang tranh chấp chất lượng tôm (khác mẫu), chờ kết quả kiểm định', man_mo_dau: '/mua/#/order/{order_id}/disputes' },
  { so: '0010', sdt: '0938000610', ten: 'Lâm Văn Cường', to_chuc: 'Vựa nông sản Ba Cường (TC-M04) · mua lúa, hàng kém loại', app: 'mua', tinh_huong: 'Hợp đồng đặt trước khi hái sầu riêng với anh Tư, gần ngày hái, chờ chốt lượng/giá', man_mo_dau: '/mua/#/order/{order_id}' },
];
const THEO_SO = new Map(SO_DEMO.map((x) => [x.so, x]));
/** Trả số thật nếu là số demo (chỉ khi môi trường thử), ngược lại null. */
export function soThatCuaDemo(so: string, laThu: boolean): string | null {
  if (!laThu) return null;
  return THEO_SO.get(String(so ?? '').trim())?.sdt ?? null;
}
