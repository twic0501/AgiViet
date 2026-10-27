// File chính sách tập trung. Mọi tham số tiền, hạn, ngưỡng mà backend dùng đều đọc từ đây;
// không viết cứng rải rác. Tám câu hỏi mở của đặc tả TẠM theo đề xuất của kỹ sư nghiệp vụ
// (xem docs/backend/tham-so-chinh-sach.md). Giá trị khớp core.policy_versions id=1 và ref.plans của seed;
// khi khởi động backend đối chiếu và ghi cảnh báo nếu lệch.

export const CHINH_SACH = Object.freeze({
  phienBan: 'v2-thu-2026-10-26',

  // ---- Cọc và phí (04 mục 3–4) ----
  cocBps: 3000, // r_coc = 30%
  cocLamTronVnd: 1000, // cọc làm tròn nửa lên tới nghìn đồng
  giaTinhCocSanBps: 7000, // P_coc = max(P, ceil(0,7 × P_tk))
  giaThamKhaoToiThieuDon: 3, // Q18: ≥ 3 đơn
  giaThamKhaoToiThieuCap: 2, // Q18: ≥ 2 cặp
  chanChaoDuoiBps: 6000, // dưới 60% tham khảo: chặn gửi (chiều bên mua)
  canhBaoGiaThapBps: 8000, // dưới 80%: cảnh báo vàng
  giaBatThuongBps: 6000, // dưới 60%: cờ giá bất thường cho đơn
  uocTinhCamKetToiDaBps: 8000, // BT-L2

  // Phí theo gói (02 mục 6, 11). Gói "free" là Miễn phí; đơn đầu = cặp chưa có đơn hoàn tất.
  goi: {
    free: { ten: 'Miễn phí', giaThangVnd: 0, phiDonDauBps: 100, phiDonSauBps: 50, sanVnd: 20000, tranVnd: 2_000_000, soThanhVienToiDa: 1 },
    procurement: { ten: 'Thu mua', giaThangVnd: 1_500_000, phiDonDauBps: 30, phiDonSauBps: 0, sanVnd: 20000, tranVnd: 1_500_000, soThanhVienToiDa: 5 },
    enterprise: { ten: 'Doanh nghiệp', giaThangVnd: 4_000_000, phiDonDauBps: 20, phiDonSauBps: 20, sanVnd: 20000, tranVnd: 3_000_000, soThanhVienToiDa: 10 },
    kitchen: { ten: 'Bếp', giaThangVnd: 490_000, phiDonDauBps: 0, phiDonSauBps: 0, sanVnd: 0, tranVnd: 0, soThanhVienToiDa: 2 },
  } as Record<string, { ten: string; giaThangVnd: number; phiDonDauBps: number; phiDonSauBps: number; sanVnd: number; tranVnd: number; soThanhVienToiDa: number }>,

  // ---- Hạn (03 mục 13), đơn vị giờ trừ khi ghi khác ----
  han: {
    traLoiLoiChaoGio: 24,
    traLoiLoiChaoVuaGio: [6, 12],
    giuLuongGio: 24,
    nguoiBanKyGio: 24,
    cocGio: 48,
    cocHangTuoiGio: 12,
    hangTuoiToiDaNgaySong: 10,
    traLoiDeNghiGio: 24,
    traLoiXinHuyGio: 24,
    xacNhanTraThangGio: 48,
    nbXacNhanTaiChoPhut: 60,
    nbXacNhanTaiKhoGio: 24,
    kiemDenGio: 2,
    canLaiGio: 24,
    kiemDinhGio: 48,
    thoaThuanKhongKetLuanNgay: 14,
    congNoGio: 72,
    viPhamThanhToanGio: 72,
    hienThiLoNgay: 14,
    banGapNgay: 3,
    doiTaiKhoanGio: 24,
    doiTaiKhoanSauKhoiPhucGio: 72,
    otpGiay: 300,
    phienGio: 12,
  },

  // ---- Tám câu hỏi mở (tạm theo đề xuất kỹ sư nghiệp vụ) ----
  /** 1. Thang phạt thiếu lượng Q04: % cọc của phần thiếu. */
  thangPhatThieuLuongBps: { batKhaKhang: 0, baoTruoc3Ngay: 1000, baoDuoi3Ngay: 5000, khongBao: 10000 },
  /** 2. Hoàn phí khi trả lại nhiều: đơn hoàn tất (kể cả trả lại nhiều) không hoàn phí (Q05, Q06). */
  hoanPhiKhiTraLaiNhieu: false,
  /** 3. Hàng không đạt an toàn (Q17): khóa lô, khóa bán gấp và kênh kém loại; đơn đóng lý do người bán không giao, không phạt cọc. */
  hangKhongDatAnToan: { khoaLo: true, khoaBanGap: true, phatCoc: false, hoanPhi: true },
  /** 4. Che liên lạc tới khi cọc; ngưỡng mở số thật (Q11). */
  moLienLac: { cheToiKhiCoc: true, nguongVnd: 3_000_000, soDonHoanTatDeMo: 2 },
  /** 5. Giá gói: xem `goi` ở trên (giá thử). */
  /** 6. Số thành viên gói Thu mua: 5 (xem goi.procurement.soThanhVienToiDa). */
  /** 7. Vùng pilot. */
  vungPilot: ['DT', 'CT', 'VL', 'TN', 'AG', 'HCM'],
  /** 8. Chốt theo biên bản sau 72 giờ người bán im lặng (M04): cần 2 người vận hành. */
  chotTheoBienBanSauGio: 72,

  // ---- Tiền mặt, lệnh chi (N-14, D-07) ----
  canhBaoTienMatVnd: 20_000_000,
  giuLenhTaiKhoanMoiGio: 72,
  giuLenhTuVnd: 20_000_000,

  // ---- Lời chào ----
  luotTraGiaToiDaMoiBen: 2,
  luotRutToiDaMoiPhieu: 2,
  chaoVuotLuongToiDaLan: 2, // Q12

  // ---- Nghiệm thu ----
  hauHutDuongChoPhepBps: 200,

  // SLA hàng việc đọc từ ref.sla_policies (DB), không lặp ở đây.
});

export type ChinhSach = typeof CHINH_SACH;
