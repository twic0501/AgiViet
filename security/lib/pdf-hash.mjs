// Băm, chuỗi phiên bản và "dấu niêm phong" mô phỏng cho tài liệu PDF (Q14).
//
// Mô hình:
//   - Mỗi phiên bản PDF là bất biến. Lưu sha256 của TOÀN BỘ byte tệp + độ dài + sha256 bản trước (chuỗi).
//   - Bản kê (manifest) gồm các trường trên + danh sách chữ ký OTP (mã thử thách, giờ, người ký) được
//     AgiViet ký Ed25519 bằng khóa niêm phong (mô phỏng). Đây KHÔNG phải chữ ký số công cộng theo Luật GDĐT 2023;
//     chỉ chứng minh "bản này đúng là bản AgiViet đã phát hành và hai bên đã ký OTP vào đúng mã băm này".
//   - Xác minh: băm lại byte tải về, so với manifest, kiểm chữ ký manifest, kiểm chuỗi.
//   - Phát hiện "cập nhật tăng dần" (incremental update): kẻ gian nối thêm phần sau %%EOF để thay nội dung
//     hiển thị mà phần đầu vẫn y nguyên. Mọi khác biệt byte đều làm sai mã băm, nhưng hàm này còn báo rõ lý do.
import { sign as edSign, verify as edVerify } from 'node:crypto';
import { canonicalJson, sha256Hex, b64url, fromB64url } from './util.mjs';

export function hashPdf(bytes) {
  const buf = Buffer.from(bytes);
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new TypeError('Không phải tệp PDF');
  return { sha256: sha256Hex(buf), length: buf.length };
}

/** Tạo manifest phiên bản và ký (khóa niêm phong mô phỏng). */
export function sealVersion({ docId, docType, version, bytes, prevSha256, signatures = [], kid, privateKey, issuedAt }) {
  const { sha256, length } = hashPdf(bytes);
  if (version > 1 && !/^[0-9a-f]{64}$/.test(prevSha256 || '')) throw new TypeError('Phiên bản > 1 phải có prev_sha256');
  const manifest = {
    doc_id: docId, doc_type: docType, version, sha256, length,
    prev_sha256: version > 1 ? prevSha256 : null,
    signatures, // [{ signer_user_id, role, method:'otp', challenge_id, signed_at }]
    issued_at: issuedAt, kid, test_data: true, // "DỮ LIỆU THỬ"
  };
  const body = Buffer.from(canonicalJson(manifest), 'utf8');
  return { manifest, seal: b64url(edSign(null, body, privateKey)) };
}

/** Xác minh tệp tải về so với manifest đã niêm phong. */
export function verifyDocument(bytes, { manifest, seal }, publicKeys) {
  const reasons = [];
  const key = publicKeys?.[manifest?.kid];
  if (!key) return { ok: false, reasons: ['khoa_khong_biet'] };
  const body = Buffer.from(canonicalJson(manifest), 'utf8');
  let sigOk = false;
  try { sigOk = edVerify(null, body, key, fromB64url(seal)); } catch { sigOk = false; }
  if (!sigOk) reasons.push('sai_niem_phong');

  const buf = Buffer.from(bytes);
  if (sha256Hex(buf) !== manifest.sha256) {
    reasons.push('ma_bam_khong_khop');
    if (buf.length > manifest.length && sha256Hex(buf.subarray(0, manifest.length)) === manifest.sha256) {
      reasons.push('noi_them_sau_khi_ky'); // incremental update sau bản đã ký
    }
  }
  return { ok: reasons.length === 0, reasons };
}

/** Kiểm chuỗi phiên bản: số phiên bản liên tiếp, prev_sha256 trỏ đúng bản trước, cùng doc_id. */
export function verifyChain(manifests) {
  const sorted = [...manifests].sort((a, b) => a.version - b.version);
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    if (m.version !== i + 1) return { ok: false, reason: `thieu_hoac_trung_phien_ban_${i + 1}` };
    if (m.doc_id !== sorted[0].doc_id) return { ok: false, reason: 'khac_tai_lieu' };
    if (i === 0 && m.prev_sha256 !== null) return { ok: false, reason: 'ban_dau_co_prev' };
    if (i > 0 && m.prev_sha256 !== sorted[i - 1].sha256) return { ok: false, reason: `dut_chuoi_tai_${m.version}` };
  }
  return { ok: true };
}
