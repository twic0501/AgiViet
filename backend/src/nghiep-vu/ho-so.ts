// Hồ sơ người bán: thông tin tổ chức/vườn, mức xác minh, giấy tờ (đã xác minh / chờ nhân viên đối chiếu).
// Nộp giấy tờ → cmd.submit_certification (0077) + việc V23 cho nhân viên; đổi tên/địa chỉ → đề nghị qua nhân viên (cần xác minh lại).
import { appCmd } from '../db/command.ts';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { loi } from '../loi.ts';
import { taoViec } from './tien.ts';

const MUC = ['Đã xác minh số điện thoại', 'Đã xác minh giấy tờ tùy thân / mã số thuế', 'Nhân viên đã đối chiếu hồ sơ tại chỗ'];

export async function hoSoNguoiBan(t: GiaoDich, nd: NguoiDung) {
  const org = nd.thanhVien.orgId;
  const o = await t.mot<any>(`SELECT o.code, o.display_name, o.kind, o.verification_level, o.province_code, p.name_vi tinh FROM core.organizations o LEFT JOIN ref.provinces p ON p.code=o.province_code WHERE o.id=$1`, [org]);
  if (!o) throw loi('KHONG_TIM_THAY');
  const vuon = await t.q<any>(`SELECT name, kind, area_m2 FROM core.production_sites WHERE org_id=$1 ORDER BY created_at`, [org]);
  const giay = await t.q<any>(`SELECT c.id, c.kind, k.label_vi ten, c.number so, c.market thi_truong, upper(c.valid_during) - 1 het_han, c.verified_at, c.created_at, c.evidence_document_id,
      CASE WHEN c.verified_at IS NOT NULL AND (upper(c.valid_during) IS NULL OR upper(c.valid_during) > (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) THEN 'da_xac_minh'
           WHEN c.verified_at IS NOT NULL THEN 'het_han' ELSE 'cho_doi_chieu' END trang_thai
      FROM core.certifications_of($1) c JOIN ref.document_kinds k ON k.code=c.kind ORDER BY c.created_at DESC`, [org]);
  const loai = await t.q<any>(`SELECT code, label_vi ten FROM ref.document_kinds ORDER BY label_vi`);
  return { to_chuc: { ma: o.code, ten: o.display_name, loai: o.kind, tinh: String(o.tinh ?? '').replace(/\s*\(mã thử\)$/, '') || null }, muc_xac_minh: o.verification_level, muc_ten: MUC[o.verification_level] ?? '',
    vuon, giay_to: giay, loai_giay_to: loai };
}

export async function nopGiayTo(t: GiaoDich, nd: NguoiDung, b: { kind: string; number?: string; market?: string; valid_to?: string; evidence_document_id: string }) {
  const id = await appCmd<string>(t, nd, 'seller', 'submit_certification', [b.kind, b.number ?? null, b.market ?? null, b.valid_to ?? null, b.evidence_document_id]);
  const ten = await t.gtri<string>(`SELECT label_vi FROM ref.document_kinds WHERE code=$1`, [b.kind]);
  await taoViec(t, 'V23', 2, 'organization', nd.thanhVien.orgId, null, 'field', `giayto:${id}`, `Đối chiếu giấy tờ người bán nộp: ${ten}${b.number ? ' số ' + b.number : ''}`);
  return { id, trang_thai: 'cho_doi_chieu', cau: `Đã nộp ${ten}. Nhân viên AgiViet sẽ đối chiếu, thường trong 1–2 ngày làm việc; bác sẽ nhận thông báo.` };
}

export async function deNghiSuaHoSo(t: GiaoDich, nd: NguoiDung, b: { noi_dung: string }) {
  const nd2 = String(b.noi_dung ?? '').trim();
  if (!nd2) throw loi('DU_LIEU_KHONG_HOP_LE', 'Bác ghi điều cần sửa.');
  const v = await taoViec(t, 'V23', 3, 'organization', nd.thanhVien.orgId, null, 'field', `suahs:${nd.userId}:${t.thoiDiemMs}`, `Người bán đề nghị sửa hồ sơ: ${nd2.slice(0, 300)}`);
  return { id: v.id, cau: 'Đã gửi đề nghị. Tên và địa chỉ vườn cần nhân viên xác minh lại nên chưa đổi ngay; nhân viên sẽ gọi cho bác.' };
}
