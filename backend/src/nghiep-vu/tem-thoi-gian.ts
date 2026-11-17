// Đóng dấu thời gian RFC 3161: gửi mã băm SHA-256 sang TSA, nhận tem (TimeStampToken) do TSA ký.
// Mặc định TSA miễn phí của DigiCert; đổi bằng AGV_TSA_URL (VNPT TSA còn cần header X-TSAReq-Signature — chưa làm).
// shortcut: chỉ đọc trạng thái + giờ trong tem, không tự kiểm chữ ký TSA; kiểm đầy đủ bằng `openssl ts -verify` hoặc API xác thực của VNPT.
import { randomBytes } from 'node:crypto';
import { loi } from '../loi.ts';

const dai = (n: number) => n < 128 ? Buffer.from([n]) : n < 256 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 255]);
const tlv = (tag: number, ...noi: Buffer[]) => { const v = Buffer.concat(noi); return Buffer.concat([Buffer.from([tag]), dai(v.length), v]); };
const OID_SHA256 = Buffer.from('0609608648016503040201', 'hex');

/** TimeStampReq DER: version 1, messageImprint(sha256, băm), nonce, certReq=true. */
export function taoYeuCau(bam: Buffer, nonce = randomBytes(8)) {
  if (bam.length !== 32) throw new Error('Cần mã băm SHA-256 32 byte.');
  const so = nonce[0] & 0x80 ? Buffer.concat([Buffer.from([0]), nonce]) : nonce;
  return tlv(0x30, tlv(0x02, Buffer.from([1])), tlv(0x30, tlv(0x30, OID_SHA256, Buffer.from([5, 0])), tlv(0x04, bam)), tlv(0x02, so), Buffer.from([1, 1, 0xff]));
}

/** Đọc TimeStampResp: trạng thái (0/1 là cấp) và giờ genTime đầu tiên trong tem. */
export function docTraLoi(r: Buffer) {
  // TimeStampResp ::= SEQUENCE { status PKIStatusInfo(SEQUENCE { INTEGER ... }), token }
  const doDai = (i: number): [number, number] => { const b = r[i]; if (b < 128) return [b, i + 1]; const k = b & 127; let n = 0; for (let j = 0; j < k; j++) n = n * 256 + r[i + 1 + j]; return [n, i + 1 + k]; };
  if (r[0] !== 0x30) throw loi('LOI_HE_THONG', 'TSA trả dữ liệu lạ.');
  const [, a] = doDai(1); if (r[a] !== 0x30) throw loi('LOI_HE_THONG', 'TSA trả dữ liệu lạ.');
  const [lenSt, b] = doDai(a + 1); const trangThai = r[b] === 0x02 ? r[b + 2] : -1;
  const token = r.subarray(b + lenSt);
  const i = token.indexOf(Buffer.from([0x18, 0x0f])); // GeneralizedTime dạng YYYYMMDDHHMMSSZ
  const gio = i >= 0 ? token.subarray(i + 2, i + 17).toString('ascii') : null;
  return { trangThai, token, gio: gio ? `${gio.slice(0, 4)}-${gio.slice(4, 6)}-${gio.slice(6, 8)}T${gio.slice(8, 10)}:${gio.slice(10, 12)}:${gio.slice(12, 14)}Z` : null };
}

export async function dongDau(bam: Buffer, f: typeof fetch = fetch) {
  const url = process.env.AGV_TSA_URL ?? 'http://timestamp.digicert.com';
  const r = await f(url, { method: 'POST', headers: { 'content-type': 'application/timestamp-query' }, body: taoYeuCau(bam), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw loi('LOI_HE_THONG', `TSA trả HTTP ${r.status}.`);
  const tl = Buffer.from(await r.arrayBuffer()), d = docTraLoi(tl);
  if (d.trangThai !== 0 && d.trangThai !== 1) throw loi('LOI_HE_THONG', `TSA từ chối (trạng thái ${d.trangThai}).`);
  return { tsa: url, gio: d.gio, tra_loi: tl };
}
