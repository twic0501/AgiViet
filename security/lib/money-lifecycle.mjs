// Vòng đời các khoản tiền ở dạng dữ liệu, để kiểm tự động các tính chất an toàn (tests/unit/money-lifecycle.test.mjs)
// và để backend đối chiếu bảng chuyển của mình. Văn bản giải thích: docs/bao-mat/01-vong-doi-dong-tien.md.
//
// Ký hiệu tác nhân:
//   NB  người bán (chủ hoặc vai có quyền tiền của tổ chức bán)   NG  người giúp (không bao giờ có bước tiền)
//   BM  bên mua (vai kế toán/quản lý có quyền tiền)              NH  ngân hàng đối tác (sự kiện đã xác minh + tra lại)
//   HT  hệ thống (hẹn giờ, phép tính)                            VH2 vận hành, hai người (lập ≠ duyệt)
//   KD  kiểm định đối tác (kênh có chữ ký)
// Hạng bằng chứng: A (ngân hàng), B (bên nhận tiền tự xác nhận + OTP), C (qua VH2), '-' (không đổi tiền).
// pnr: điểm không quay lại (sau khi tới trạng thái này, không chuyển về trạng thái trước nó).
// moneyFact: chuyển này ghi một SỰ THẬT TIỀN vào sổ cái (tiền đã vào/ra/được nhận).

export const ACTORS = ['NB', 'NG', 'BM', 'NH', 'HT', 'VH2', 'KD'];

const t = (from, to, by, evidence, opts = {}) => ({ from, to, by, evidence, ...opts });

export const MACHINES = {
  // Khoản nộp qua app = cọc + phí, một mã nội dung, vào tài khoản đảm bảo tại ngân hàng đối tác.
  nop_coc: {
    initial: 'da_phat_huong_dan',
    terminal: ['da_ghi_so', 'het_han', 'hoan_ve_nguon'],
    pnr: ['da_ghi_so'],
    transitions: [
      t('da_phat_huong_dan', 'bm_bao_da_chuyen', ['BM'], '-', { note: 'chỉ hiển thị; ảnh UNC không phải bằng chứng' }),
      t('da_phat_huong_dan', 'nh_bao_co', ['NH'], '-', { note: 'webhook đúng chữ ký, chưa tin' }),
      t('bm_bao_da_chuyen', 'nh_bao_co', ['NH'], '-'),
      t('nh_bao_co', 'da_ghi_so', ['HT'], 'A', { moneyFact: true, note: 'tra lại API NH khớp số, mã, tài khoản' }),
      t('nh_bao_co', 'treo_doi_soat', ['HT'], 'A', { moneyFact: true, note: 'lệch số/mã/đơn đã đóng: vào tiền treo' }),
      t('treo_doi_soat', 'da_ghi_so', ['VH2'], 'C', { moneyFact: true, note: 'gán tiền treo vào đơn còn mở, đủ số' }),
      t('treo_doi_soat', 'hoan_ve_nguon', ['VH2'], 'C', { moneyFact: true, note: 'hoàn đúng tài khoản nguồn' }),
      t('da_phat_huong_dan', 'het_han', ['HT'], '-'),
      t('bm_bao_da_chuyen', 'het_han', ['HT'], '-'),
    ],
    waits: { da_phat_huong_dan: 'han_coc', bm_bao_da_chuyen: 'han_coc', nh_bao_co: 'tra_lai_NH_5_phut', treo_doi_soat: 'SLA_VH_P1_4_gio' },
  },

  // Cọc đang giữ của một đơn (sau khi đã ghi sổ).
  coc: {
    initial: 'dang_giu',
    terminal: ['da_xu_ly_het'],
    pnr: ['da_khoa_phan_bo', 'da_xu_ly_het'],
    transitions: [
      t('dang_giu', 'da_khoa_phan_bo', ['HT'], '-', { note: 'quyết toán hoặc hủy chốt phân bổ; khóa băm đầu vào' }),
      t('dang_giu', 'da_khoa_phan_bo', ['VH2'], 'C', { note: 'vi phạm thanh toán > 72 giờ, bất khả kháng, quyết định ngoài' }),
      t('da_khoa_phan_bo', 'dang_trong_lenh', ['HT'], '-', { note: 'tạo lệnh; tiền chuyển ngăn chờ chi (không âm)' }),
      t('dang_trong_lenh', 'da_xu_ly_het', ['HT'], 'A', { note: 'mọi lệnh da_doi_soat' }),
    ],
    waits: { dang_giu: 'het_dot_giao_hoac_huy', da_khoa_phan_bo: 'ngay_lap_tuc', dang_trong_lenh: 'lenh_NH' },
  },

  // Lệnh ngân hàng: chi cọc NB, hoàn cọc BM, hoàn thừa, hoàn phí, chuyển phí.
  lenh_ngan_hang: {
    initial: 'da_tao',
    terminal: ['da_doi_soat', 'da_huy_truoc_gui', 'that_bai_cuoi'],
    pnr: ['da_gui', 'thanh_cong', 'da_doi_soat'],
    transitions: [
      t('da_tao', 'cho_kiem_truoc_gui', ['HT'], '-'),
      t('cho_kiem_truoc_gui', 'da_gui', ['HT'], '-', { note: 'tài khoản chụp hợp lệ, không bị giữ; khóa chống lặp = mã lệnh' }),
      t('cho_kiem_truoc_gui', 'giu_cho_xac_minh', ['HT'], '-', { note: 'tài khoản mới đổi, cờ bất thường' }),
      t('giu_cho_xac_minh', 'da_gui', ['VH2'], 'C', { note: 'gọi lại số cũ/liên hệ dự phòng' }),
      t('giu_cho_xac_minh', 'da_huy_truoc_gui', ['VH2'], 'C', { note: 'tạo lệnh mới cùng căn cứ' }),
      t('da_gui', 'dang_xu_ly', ['NH'], '-'),
      t('dang_xu_ly', 'thanh_cong', ['NH'], 'A', { moneyFact: true }),
      t('dang_xu_ly', 'that_bai_cuoi', ['NH'], 'A', { note: 'chỉ khi NH xác nhận thất bại CUỐI qua tra lại; lệnh thay phải duyệt VH2' }),
      t('thanh_cong', 'da_doi_soat', ['HT'], 'A', { note: 'dòng sao kê khớp' }),
    ],
    waits: { da_tao: 'ngay', cho_kiem_truoc_gui: 'ngay', giu_cho_xac_minh: 'SLA_VH_P1_4_gio', da_gui: 'tra_lai_NH_15_phut', dang_xu_ly: 'tra_lai_NH_15_phut', thanh_cong: 'sao_ke_T+1' },
  },

  // Khoản trả thẳng (bên mua -> người bán, ngoài tài khoản đảm bảo).
  tra_thang: {
    initial: 'chua_den_han',
    terminal: ['da_nhan_du'],
    pnr: ['da_nhan_du'],
    transitions: [
      t('chua_den_han', 'den_han', ['HT'], '-'),
      t('den_han', 'bm_da_bao', ['BM'], '-', { note: 'ảnh UNC/biên nhận chỉ đính kèm, không cộng tiền' }),
      t('den_han', 'da_nhan_du', ['NB'], 'B', { moneyFact: true, note: 'OTP money_received gắn số tiền' }),
      t('bm_da_bao', 'da_nhan_du', ['NB'], 'B', { moneyFact: true }),
      t('den_han', 'nhan_mot_phan', ['NB'], 'B', { moneyFact: true }),
      t('bm_da_bao', 'nhan_mot_phan', ['NB'], 'B', { moneyFact: true }),
      t('nhan_mot_phan', 'da_nhan_du', ['NB'], 'B', { moneyFact: true }),
      t('bm_da_bao', 'lech_doi_soat', ['NB', 'HT'], '-', { note: 'NB báo chưa nhận hoặc quá 48 giờ' }),
      t('nhan_mot_phan', 'lech_doi_soat', ['BM'], '-', { note: 'BM khiếu nại NB xác nhận thiếu, kèm tra soát NH' }),
      t('lech_doi_soat', 'da_nhan_du', ['VH2'], 'C', { moneyFact: true }),
      t('lech_doi_soat', 'nhan_mot_phan', ['VH2'], 'C', { moneyFact: true }),
      t('lech_doi_soat', 'den_han', ['VH2'], 'C'),
      t('den_han', 'qua_han', ['HT'], '-'),
      t('qua_han', 'bm_da_bao', ['BM'], '-'),
      t('qua_han', 'da_nhan_du', ['NB'], 'B', { moneyFact: true }),
    ],
    waits: { chua_den_han: 'moc_hop_dong', den_han: 'han_tra', bm_da_bao: '48_gio', nhan_mot_phan: 'han_tra', lech_doi_soat: 'SLA_VH_P2', qua_han: 'VH_xu_ly_vi_pham' },
  },

  // Nghĩa vụ hoàn ngoài app (T_nb: người bán hoàn bên mua) hoặc công nợ sau quyết toán (T_bm).
  cong_no: {
    initial: 'mo',
    terminal: ['da_nhan_du', 'chuyen_co_che_khac'],
    pnr: ['da_nhan_du'],
    transitions: [
      t('mo', 'ben_tra_da_bao', ['NB', 'BM'], '-'),
      t('mo', 'da_nhan_du', ['NB', 'BM'], 'B', { moneyFact: true, note: 'chỉ BÊN NHẬN xác nhận' }),
      t('ben_tra_da_bao', 'da_nhan_du', ['NB', 'BM'], 'B', { moneyFact: true }),
      t('ben_tra_da_bao', 'lech_doi_soat', ['NB', 'BM', 'HT'], '-'),
      t('lech_doi_soat', 'da_nhan_du', ['VH2'], 'C', { moneyFact: true }),
      t('mo', 'qua_han', ['HT'], '-'),
      t('ben_tra_da_bao', 'qua_han', ['HT'], '-'),
      t('qua_han', 'da_nhan_du', ['NB', 'BM'], 'B', { moneyFact: true }),
      t('qua_han', 'chuyen_co_che_khac', ['VH2'], 'C', { note: 'hồ sơ đòi nợ, cọc khung/cọc chi trừ nợ' }),
    ],
    waits: { mo: '72_gio', ben_tra_da_bao: '48_gio', lech_doi_soat: 'SLA_VH_P2', qua_han: 'SLA_VH_P2' },
  },

  // Phí giới thiệu do bên mua trả (người bán không bao giờ trả).
  phi: {
    initial: 'da_thu_cho_ket_qua',
    terminal: ['doanh_thu', 'da_hoan'],
    pnr: ['doanh_thu', 'da_hoan'],
    transitions: [
      t('da_thu_cho_ket_qua', 'doanh_thu', ['HT'], '-', { ledgerOnly: true, note: 'bút toán nội bộ fee_held -> platform_revenue khi đơn hoàn tất hoặc hủy loại không hoàn; không có tiền đi' }),
      t('da_thu_cho_ket_qua', 'cho_hoan', ['HT'], '-', { note: 'theo bảng hoàn phí 04 mục 9' }),
      t('da_thu_cho_ket_qua', 'cho_hoan', ['VH2'], 'C', { note: 'bất khả kháng do VH chấp nhận' }),
      t('cho_hoan', 'da_hoan', ['NH'], 'A', { moneyFact: true, note: 'lệnh hoan_phi từ TK doanh thu, về tài khoản nguồn' }),
    ],
    waits: { da_thu_cho_ket_qua: 'ket_thuc_don', cho_hoan: 'lenh_NH' },
  },

  // Quyết toán (một phiên bản; tranh chấp tạo phiên bản tiếp theo, không sửa phiên bản cũ).
  quyet_toan: {
    initial: 'nhap',
    terminal: ['da_doi_soat', 'bi_thay'],
    pnr: ['da_khoa', 'da_doi_soat'],
    transitions: [
      t('nhap', 'da_khoa', ['HT'], '-', { note: 'khóa hàng đơn FOR UPDATE; băm đầu vào; tạo lệnh và nghĩa vụ trong CÙNG giao dịch DB' }),
      t('nhap', 'bi_thay', ['HT'], '-', { note: 'đầu vào đổi trước khi khóa' }),
      t('da_khoa', 'da_thuc_hien', ['HT'], '-'),
      t('da_thuc_hien', 'da_doi_soat', ['HT'], 'A'),
    ],
    waits: { nhap: 'ngay', da_khoa: 'ngay', da_thuc_hien: 'lenh_NH' },
  },
};

/** Kiểm một chuyển cụ thể (backend có thể gọi trong kiểm thử để so bảng chuyển của mình). */
export function canTransition(machine, from, to, actor) {
  const m = MACHINES[machine];
  if (!m) return { ok: false, reason: 'may_khong_biet' };
  if (actor === 'NG') return { ok: false, reason: 'nguoi_giup_khong_co_buoc_tien' };
  const tr = m.transitions.find((x) => x.from === from && x.to === to);
  if (!tr) return { ok: false, reason: 'chuyen_khong_hop_le' };
  if (!tr.by.includes(actor)) return { ok: false, reason: 'sai_tac_nhan' };
  return { ok: true, evidence: tr.evidence, moneyFact: !!tr.moneyFact };
}
