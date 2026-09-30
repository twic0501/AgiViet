// Thông số và quy tắc tính toán thuần (không đụng CSDL), theo Quy trình vận hành v3.
// "Thông số thử" có thể đổi; "trường phải điền" chưa chốt thì dùng giá trị MẪU có cờ chua_chot.
import { DAY, HOUR } from './core.js';

export const HAN_MUC = {
  free: { ket_noi: 5, tin_mua: 5 },
  business: { ket_noi: 50, tin_mua: 30, video_phut: 120 },
  ban: { tin_ban_ngay: 5, ai_ngay: 10, loi_chao_ngay: 5, video_phut: 60 },
};
export const BIEU_PHI = {
  free: { rate_bps: 80, cap_vnd: 3_000_000 },
  business: { rate_bps: 30, cap_vnd: 1_500_000 },
};
export const THUE_BAO_BUSINESS_VND = 1_500_000;

// Trường phải điền trước pilot (mục 24): giá trị mẫu, API trả kèm chua_chot=true
export const MAU_CHUA_CHOT = {
  phi_kich_hoat_vnd: 100_000,
  gia_moc: { ky_doi_tac: 50_000, dieu_phoi_rieng: 300_000, ca_truc_chuyen_biet: 400_000 },
  thue_phi_bps: 1000,                  // 10% thuế GTGT trên phí dịch vụ (cấu hình thuế chưa chốt)
  phuong_an_bat_dong: { confirm_hours: 24, lab_name: 'Đơn vị kiểm định mẫu (chưa chọn)', mediation_days: 5, next_mechanism: 'Trọng tài hoặc tòa án theo thỏa thuận' },
  hotline: null,
};

export const THOI_HAN = {
  ket_noi_het_han: 7 * DAY,
  don_toi_da_ngay: 90,
  phuc_vu_them_ngay: 30,
  bao_gia_dich_vu: 7 * DAY,
  tai_khoan_cho: 24 * HOUR,
  tai_khoan_cho_sau_khoi_phuc: 72 * HOUR,
  khoi_phuc_gan_day: 7 * DAY,
  canh_bao_tai_khoan_moi: 30 * DAY,
  han_tra_phi: 7 * DAY,
  qua_han_phi_chan: 15 * DAY,
  nhac_lo: { san_giao: 24 * HOUR, mua_vu: 7 * DAY },
  ngung_nhan_de_nghi: { san_giao: 7 * DAY, mua_vu: 30 * DAY },
};
export const CHI_BAO_TOI_THIEU_DON = 3;

// Làm tròn đồng theo nửa lên, chỉ dùng số nguyên (BR-29)
export const phanVan = (so, bps) => Math.floor((so * bps + 5000) / 10000);
export const tienHang = (qty_g, gia_vnd_kg) => Math.round(qty_g * gia_vnd_kg / 1000);

// Phí thành công mục tiêu trên cơ sở lũy kế (Kiến trúc v4 mục 8)
export function phiThanhCong(coSo_vnd, rate_bps, cap_vnd) {
  return Math.min(phanVan(coSo_vnd, rate_bps), cap_vnd);
}
export function khoanThuThem({ coSo_vnd, rate_bps, cap_vnd, kichHoatDaTra_vnd, daQuyetToan_vnd }) {
  const muc_tieu = phiThanhCong(coSo_vnd, rate_bps, cap_vnd);
  return { muc_tieu, them: Math.max(0, muc_tieu - kichHoatDaTra_vnd - daQuyetToan_vnd) };
}
// Con số tối đa mỗi bên trả (gồm thuế): phí thành công trần + các mốc đã chọn, nhân phần chia
export function toiDaMoiBen({ gia_tri_du_kien_vnd, rate_bps, cap_vnd, activation_fee_vnd, moc_vnd = 0, payer_mua_bps, tax_bps }) {
  const phi = Math.max(phiThanhCong(gia_tri_du_kien_vnd, rate_bps, cap_vnd), activation_fee_vnd) + moc_vnd;
  const coThue = phi + phanVan(phi, tax_bps);
  const mua = phanVan(coThue, payer_mua_bps);
  return { tong: coThue, mua, ban: coThue - mua };
}
// So sánh gói theo từng đơn có trần (BR-34), phần tiết kiệm là mức tối đa
export function soSanhGoi(coSoCacDon_vnd) {
  const free = coSoCacDon_vnd.reduce((s, v) => s + phiThanhCong(v, 80, 3_000_000), 0);
  const bus = THUE_BAO_BUSINESS_VND + coSoCacDon_vnd.reduce((s, v) => s + phiThanhCong(v, 30, 1_500_000), 0);
  return { free, business: bus, tiet_kiem_toi_da_vnd: free - (bus - THUE_BAO_BUSINESS_VND) };
}
