import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { hashPdf, sealVersion, verifyDocument, verifyChain } from '../../lib/pdf-hash.mjs';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const pub = { 'seal-2026-10': publicKey };

// PDF tối giản hợp lệ một trang (đủ để băm; nội dung "Giá 35.000 đ/kg").
function miniPdf(text) {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  return Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R>>endobj\n` +
    `4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`, 'latin1');
}

const v1 = miniPdf('Gia 35000 d/kg, coc 30%');
const sigs = [{ signer_user_id: 'u-nam', role: 'seller', method: 'otp', challenge_id: 'c1', signed_at: 1_793_000_000 }];
const sealed = sealVersion({ docId: 'HD-2001', docType: 'contract', version: 1, bytes: v1, signatures: sigs, kid: 'seal-2026-10', privateKey, issuedAt: 1_793_000_000 });

test('Bản đã ký xác minh đúng', () => {
  assert.deepEqual(verifyDocument(v1, sealed, pub), { ok: true, reasons: [] });
});

test('Sửa một ký tự giá sau khi ký bị phát hiện', () => {
  const edited = Buffer.from(v1.toString('latin1').replace('35000', '25000'), 'latin1');
  const r = verifyDocument(edited, sealed, pub);
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('ma_bam_khong_khop'));
});

test('Nối thêm "cập nhật tăng dần" sau %%EOF bị phát hiện và gọi đúng tên', () => {
  const appended = Buffer.concat([v1, Buffer.from('4 0 obj<</Length 10>>stream\nGia 1000\nendstream endobj\n%%EOF\n', 'latin1')]);
  const r = verifyDocument(appended, sealed, pub);
  assert.ok(r.reasons.includes('noi_them_sau_khi_ky'));
});

test('Sửa manifest (đổi mã băm cho khớp bản sửa) làm hỏng niêm phong', () => {
  const edited = Buffer.from(v1.toString('latin1').replace('35000', '25000'), 'latin1');
  const fake = { manifest: { ...sealed.manifest, ...hashPdf(edited) }, seal: sealed.seal };
  const r = verifyDocument(edited, fake, pub);
  assert.deepEqual(r.reasons, ['sai_niem_phong']);
});

test('Chuỗi phiên bản: phụ lục trỏ đúng bản trước; đứt chuỗi bị bắt', () => {
  const v2 = miniPdf('Phu luc 1: doi ngay giao');
  const s2 = sealVersion({ docId: 'HD-2001', docType: 'contract', version: 2, bytes: v2, prevSha256: sealed.manifest.sha256, kid: 'seal-2026-10', privateKey, issuedAt: 1_793_100_000 });
  assert.equal(verifyChain([s2.manifest, sealed.manifest]).ok, true);
  const broken = { ...s2.manifest, prev_sha256: '00'.repeat(32) };
  assert.equal(verifyChain([sealed.manifest, broken]).ok, false);
  assert.equal(verifyChain([s2.manifest]).ok, false);
});

test('Không nhận tệp không phải PDF', () => {
  assert.throws(() => hashPdf(Buffer.from('<html>')));
});
