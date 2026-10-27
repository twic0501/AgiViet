// =====================================================================
// Mô hình tải và kịch bản. Cơ sở số liệu: docs/ha-tang/02-kiem-thu-chiu-tai.md mục 2.
//
// "Giờ cao điểm mùa vụ" ở quy mô năm 2–3 (20.000 người bán, 2.000 bên mua) ước ~50 yêu cầu/giây
// API tổng (đã nhân hệ số dự phòng 3). Pilot (≈ 1/10 quy mô) ước ~5 yêu cầu/giây.
// Tỷ lệ các luồng trong một giây cao điểm (tổng = 50):
// =====================================================================
export const FLOWS = ['mua_duyet_lo', 'mua_ghep', 'mua_gia_tk', 'ban_dang_lo', 'webhook', 'qr_quet', 'pdf', 'giong_noi', 'anh'];

export const PEAK = {
  mua_duyet_lo: 15,   // bên mua lướt danh sách lô (phân trang)
  mua_ghep: 6,        // mở phiếu nhu cầu → xem lô phù hợp
  mua_gia_tk: 7.5,    // giá tham khảo hiện ở form đăng lô, form chào giá, màn nhu cầu
  ban_dang_lo: 4,     // người bán đăng lô (10% gửi lại do mạng yếu)
  webhook: 4,         // ngân hàng báo cọc (10% gửi lại)
  qr_quet: 5,         // kho quét QR nhận hàng
  pdf: 2,             // sinh hợp đồng / biên bản PDF
  giong_noi: 1.5,     // nói để đăng lô
  anh: 5,             // ảnh lô 250 KB đã nén ở app
};
const scale = (m, k) => Object.fromEntries(Object.entries(m).map(([f, r]) => [f, +(r * k).toFixed(2)]));

export const SCENARIOS = {
  smoke: { mo_ta: 'Khói: mức pilot ~5 yc/giây trong 60 giây', phases: [{ ten: 'pilot', giay: 60, rps: scale(PEAK, 0.1) }] },
  load: {
    mo_ta: 'Tải: tăng dần 30 giây rồi giữ mức cao điểm mùa vụ 50 yc/giây trong 180 giây',
    phases: [{ ten: 'tang', giay: 30, rps: scale(PEAK, 0.5) }, { ten: 'cao_diem', giay: 180, rps: PEAK }],
  },
  stress: {
    mo_ta: 'Căng: nâng bậc 1×, 2×, 4×, 8×, 12× mức cao điểm, mỗi bậc 60 giây, tìm điểm gãy',
    phases: [1, 2, 4, 8, 12].map((k) => ({ ten: `x${k}`, giay: 60, rps: scale(PEAK, k) })),
  },
  spike: {
    mo_ta: 'Đột biến: nền cao điểm; ngân hàng dồn 300 webhook/giây + 2.000 bên mua mở thông báo giá cùng lúc (150 yc/giây ghép + giá tham khảo) trong 60 giây; rồi 60 giây hồi phục',
    phases: [
      { ten: 'nen', giay: 60, rps: PEAK },
      { ten: 'dot_bien', giay: 60, rps: { ...PEAK, webhook: 300, mua_gia_tk: 100, mua_ghep: 50 } },
      { ten: 'hoi_phuc', giay: 60, rps: PEAK },
    ],
  },
  'qr-sang-som': {
    mo_ta: 'Kho cá tra 5–6 giờ sáng: 300 xe tới trong 30 phút, nén thành 60 giây ở 40 lượt quét/giây, kèm nền',
    phases: [{ ten: 'qr', giay: 60, rps: { ...scale(PEAK, 0.5), qr_quet: 40 } }],
  },
  soak: { mo_ta: 'Ngâm ngắn: 50 yc/giây trong 3 phút (tìm rò bộ nhớ, rò kết nối, trễ trôi dần)', phases: [{ ten: 'ngam', giay: 180, rps: PEAK }] },
  // Kịch bản phục vụ đo trước/sau tối ưu
  'doc-nang': { mo_ta: 'Chỉ đọc nặng: ghép + giá tham khảo 60 yc/giây trong 60 giây', phases: [{ ten: 'doc', giay: 60, rps: { mua_ghep: 30, mua_gia_tk: 30 } }] },
  'webhook-don': { mo_ta: 'Webhook dồn: 200 webhook/giây trong 30 giây', phases: [{ ten: 'webhook', giay: 30, rps: { webhook: 200 } }] },
  'pdf-tron': {
    mo_ta: 'PDF giữa tải trộn: cao điểm nhưng PDF 10/giây (cuối ngày chốt hàng loạt hợp đồng)',
    phases: [{ ten: 'pdf_tron', giay: 90, rps: { ...PEAK, pdf: 10 } }],
  },
};

SCENARIOS['dang-lo-don'] = { mo_ta: 'Đăng lô đồng loạt 100/giây, ảnh 20/giây trong 30 giây', phases: [{ten:'dang_lo', giay:30, rps:{ban_dang_lo:100, anh:20}}] };
