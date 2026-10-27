// Phê duyệt hai người (four-eyes / maker-checker) cho thao tác tiền thủ công của vận hành:
// ghi nhận tiền đã vào khi webhook mất, đảo bút toán, chuyển tiền treo (suspense) vào đơn, hoàn tay, phạt/hoàn cọc
// theo kết quả kiểm định, gia hạn có hệ quả tiền.
//
// Luật:
// 1. Người lập (maker) và người duyệt (checker) khác nhau; cả hai là nhân viên còn hiệu lực có vai phù hợp.
// 2. Người duyệt không thuộc tổ chức nào trong đơn (xung đột lợi ích) và không phải người đã được giao vụ việc đó.
// 3. Người duyệt xác thực tăng cường (step-up) trong 5 phút trước khi bấm duyệt.
// 4. Số tiền từ ngưỡng lớn cần 2 người duyệt khác nhau (tổng 3 người).
// 5. Duyệt cái gì thì chạy đúng cái đó: duyệt trên payloadHash; chạy lại băm, khác là từ chối.
// 6. Yêu cầu hết hạn sau 24 giờ; chạy đúng một lần.
// 7. "Xác nhận tiền đã vào" bằng tay phải có bằng chứng loại ngân hàng (sao kê, kết quả tra soát, API),
//    ảnh ủy nhiệm chi KHÔNG được chấp nhận (xem evidence.mjs).
import { canonicalJson, sha256Hex } from './util.mjs';
import { evidenceSufficient } from './evidence.mjs';

export const MANUAL_KINDS = Object.freeze({
  confirm_bank_credit:   { role: 'ops_finance', fact: 'deposit_received' },
  reverse_ledger_txn:    { role: 'ops_finance', fact: null },
  allocate_suspense:     { role: 'ops_finance', fact: 'deposit_received' },
  manual_refund:         { role: 'ops_finance', fact: null },
  dispute_money_outcome: { role: 'ops_dispute', fact: 'inspection_result' },
  confirm_direct_payment:{ role: 'ops_finance', fact: 'direct_payment_received' },
});

export const POLICY = Object.freeze({
  stepUpMaxAgeSec: 300,
  requestTtlSec: 24 * 3600,
  highValueVnd: 100_000_000, // từ mức này cần 2 người duyệt
});

export function payloadHash(payload) {
  return sha256Hex(canonicalJson(payload));
}

export function createRequest({ id, kind, maker, payload, orderOrgIds = [], evidence = [], now }) {
  const k = MANUAL_KINDS[kind];
  if (!k) throw new TypeError('Loại thao tác không hỗ trợ');
  if (!maker?.isStaff || !maker.roles?.includes(k.role)) throw new Error('nguoi_lap_khong_du_quyen');
  if (!Number.isSafeInteger(payload.amount_vnd) || payload.amount_vnd <= 0) throw new TypeError('amount_vnd phải là số nguyên dương');
  if (k.fact) {
    const ev = evidenceSufficient(k.fact, evidence);
    if (!ev.ok) throw new Error('bang_chung_khong_du:' + ev.reason);
  }
  return {
    id, kind, maker_id: maker.id, payload, payload_hash: payloadHash(payload), order_org_ids: orderOrgIds,
    evidence, created_at: now, expires_at: now + POLICY.requestTtlSec,
    approvals: [], status: 'pending', executed_at: null,
  };
}

export function requiredApprovals(req) {
  return req.payload.amount_vnd >= POLICY.highValueVnd ? 2 : 1;
}

export function approve(req, { checker, seenPayloadHash, now }) {
  const k = MANUAL_KINDS[req.kind];
  if (req.status !== 'pending') return { ok: false, reason: 'khong_o_trang_thai_cho' };
  if (now > req.expires_at) { req.status = 'expired'; return { ok: false, reason: 'het_han' }; }
  if (!checker?.isStaff || !checker.active || !checker.roles?.includes(k.role + '_approver')) return { ok: false, reason: 'nguoi_duyet_khong_du_quyen' };
  if (checker.id === req.maker_id) return { ok: false, reason: 'tu_duyet' };
  if (req.approvals.some((a) => a.by === checker.id)) return { ok: false, reason: 'da_duyet_roi' };
  if ((checker.orgIds || []).some((o) => req.order_org_ids.includes(o))) return { ok: false, reason: 'xung_dot_loi_ich' };
  if (!checker.stepUpAt || now - checker.stepUpAt > POLICY.stepUpMaxAgeSec) return { ok: false, reason: 'can_xac_thuc_tang_cuong' };
  if (seenPayloadHash !== req.payload_hash) return { ok: false, reason: 'noi_dung_duyet_khac' };
  req.approvals.push({ by: checker.id, at: now, hash: seenPayloadHash });
  if (req.approvals.length >= requiredApprovals(req)) req.status = 'approved';
  return { ok: true, status: req.status };
}

/** Chạy: chỉ khi đủ duyệt, đúng nội dung đã duyệt, đúng một lần. */
export function execute(req, { payload, executor, now }) {
  if (req.status !== 'approved') return { ok: false, reason: 'chua_du_duyet' };
  if (now > req.expires_at) return { ok: false, reason: 'het_han' };
  if (payloadHash(payload) !== req.payload_hash) return { ok: false, reason: 'noi_dung_bi_doi_sau_duyet' };
  if (executor?.id && req.approvals.some((a) => a.by === executor.id) && executor.id !== req.maker_id) {
    // người duyệt không tự chạy; chạy là bước của máy (worker) hoặc người lập
    return { ok: false, reason: 'nguoi_duyet_khong_tu_chay' };
  }
  req.status = 'executed';
  req.executed_at = now;
  return { ok: true };
}
