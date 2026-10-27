// Thang bằng chứng cho các sự thật về tiền. Một sự thật về tiền chỉ được ghi sổ khi có bằng chứng đủ hạng.
//
// Hạng A (tự động ghi được): sự kiện ngân hàng đã xác minh chữ ký VÀ đã tra lại API ngân hàng khớp lệnh;
//                           dòng sao kê/đối soát định kỳ của ngân hàng khớp mã tham chiếu.
// Hạng B (ghi được, chỉ cho trả thẳng): người NHẬN tiền tự xác nhận trong app kèm số tiền, có OTP
//                           (xác nhận bất lợi cho chính mình nên đáng tin; người giúp không được làm).
// Hạng C (chỉ qua phê duyệt hai người): kết quả tra soát do ngân hàng trả lời bằng văn bản/API,
//                           sao kê do người nhận cung cấp có xác minh từ ngân hàng, biên bản kiểm định có chữ ký.
// KHÔNG phải bằng chứng: ảnh/ PDF ủy nhiệm chi do bên trả gửi, ảnh chụp màn hình app ngân hàng, lời báo của bên trả,
//                           tin nhắn, cuộc gọi, lời nhân viên hiện trường.
// Lý do: ảnh UNC chỉ chứng minh "đã lập lệnh" (có thể bị hủy, bị trả lại, bị sửa ảnh); chỉ bên nhận hoặc ngân hàng
// chứng minh được tiền đã vào.

export const EVIDENCE = Object.freeze({
  bank_webhook_requeried: 'A',
  bank_statement_line: 'A',
  payee_in_app_confirmation_otp: 'B',
  bank_trace_reply: 'C',
  payee_statement_bank_verified: 'C',
  inspection_report_signed: 'C',
  // không có giá trị chứng minh tiền
  payer_transfer_receipt_image: null,
  payer_claim: null,
  screenshot: null,
  chat_message: null,
  phone_call: null,
  field_staff_statement: null,
});

const RULES = {
  // cọc vào tài khoản ngân hàng đối tác
  deposit_received: { auto: ['A'], manual: ['A', 'C'] },
  // tiền bên mua trả thẳng người bán
  direct_payment_received: { auto: ['A', 'B'], manual: ['A', 'B', 'C'] },
  // lệnh chi/hoàn của ngân hàng đối tác đã thực hiện
  payout_executed: { auto: ['A'], manual: ['A', 'C'] },
  // kết quả chất lượng quyết định phạt/hoàn
  inspection_result: { auto: [], manual: ['C'] },
};

/** mode: 'auto' (máy ghi) hoặc 'manual' (qua four-eyes). */
export function evidenceSufficient(fact, evidenceList, mode = 'manual') {
  const r = RULES[fact];
  if (!r) return { ok: false, reason: 'su_that_khong_biet' };
  const grades = (evidenceList || []).map((e) => EVIDENCE[e.type]).filter(Boolean);
  const accepted = grades.filter((g) => r[mode].includes(g));
  if (accepted.length === 0) {
    const onlyWeak = (evidenceList || []).length > 0;
    return { ok: false, reason: onlyWeak ? 'chi_co_bang_chung_khong_gia_tri' : 'khong_co_bang_chung' };
  }
  return { ok: true, grade: accepted.sort()[0] };
}
