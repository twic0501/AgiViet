// Tạo tài liệu hệ thống: chuẩn hóa nội dung (JSON chuẩn tắc, khóa sắp xếp, tiền số nguyên dạng chuỗi),
// băm SHA-256 nội dung, sinh PDF, băm bytes PDF, lưu tệp TRƯỚC rồi mới chèn metadata core.documents.
// Niêm phong manifest bằng Ed25519 mô phỏng (security/lib/pdf-hash.mjs) lưu cạnh tệp.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-ignore thư viện JS dùng chung
import { canonicalJson } from '../../../security/lib/util.mjs';
// @ts-ignore
import { sealVersion } from '../../../security/lib/pdf-hash.mjs';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import { sinhPdf, type NoiDungPdf } from './sinh-pdf.ts';
import { luuTep, sha256Hex } from '../nghiep-vu/tai-lieu.ts';
import type { CauHinh } from '../cau-hinh.ts';

let cfg: CauHinh;
let thuMuc = '';
export function caiDatTaiLieuPdf(c: CauHinh) { cfg = c; thuMuc = c.thuMucTaiLieu; }

/** Chuẩn hóa: bigint → chuỗi, Date → ISO UTC; loại undefined. */
export function chuanHoa(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(chuanHoa);
  if (typeof v === 'object') { const o: any = {}; for (const k of Object.keys(v)) if (v[k] !== undefined) o[k] = chuanHoa(v[k]); return o; }
  if (typeof v === 'number' && !Number.isSafeInteger(v)) return String(v);
  return v;
}

export interface TaoTaiLieu {
  docType: string; code: string; seriesKey: string; versionNo: number; orderId: string | null; ownerOrgId: string | null;
  entity?: string | null; entityId?: string | null; noiDung: Record<string, unknown>; status: 'draft' | 'awaiting_signature' | 'fully_signed';
  prevDocumentId?: string | null; prevContentSha256?: string | null; trinhBay: Omit<NoiDungPdf, 'maBamNoiDung' | 'urlXacMinh' | 'maTaiLieu' | 'phienBan' | 'sinhLuc'>;
  createdBy?: string | null;
}

export async function taoTaiLieuPdf(t: GiaoDich, d: TaoTaiLieu) {
  const noiDung = chuanHoa(d.noiDung);
  const chuan = canonicalJson(noiDung) as string;
  const maBam = sha256Hex(chuan);
  const sinhLuc = new Date(t.thoiDiemMs).toISOString();
  const bytes = await sinhPdf({ ...d.trinhBay, maTaiLieu: d.code, phienBan: d.versionNo, sinhLuc, maBamNoiDung: maBam, urlXacMinh: `https://agiviet.vn/xac-minh/${encodeURIComponent(d.code)}` });
  const { sha256: fileSha, key } = luuTep(bytes);
  let prevSha: string | null = d.prevContentSha256??null;
  if (d.prevDocumentId) prevSha = await t.gtri<string>(`SELECT encode(content_sha256,'hex') FROM core.documents WHERE id=$1`, [d.prevDocumentId]);
  const { manifest, seal } = sealVersion({ docId: d.code, docType: d.docType, version: d.versionNo, bytes, prevSha256: prevSha ?? undefined, kid: cfg.pdfKid, privateKey: cfg.pdfPrivate, issuedAt: sinhLuc });
  writeFileSync(join(thuMuc, key + '.seal.json'), JSON.stringify({ manifest, seal }));
  return { id: '', code:d.code, contentSha256:maBam, fileSha256:fileSha, size:bytes.length,
    payload:{code:d.code,series_key:d.seriesKey,version_no:d.versionNo,prev_document_id:d.prevDocumentId??null,prev_content_sha256:prevSha?'\\x'+prevSha:null,content_sha256:'\\x'+maBam,canonical_content:noiDung,file_sha256:'\\x'+fileSha,storage_key:key,mime_type:'application/pdf',size_bytes:bytes.length,generator_version:'backend-v2/pdf-lib',is_test_data:cfg.moiTruong==='thu'} };
}
