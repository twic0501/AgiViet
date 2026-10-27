// App bán (0056–0057): mặt hàng đã xác minh, cơ sở + nhật ký canh tác chỉ thêm, bán gấp,
// đặt trước khi hái và bao tiêu theo vụ. Mọi ghi qua cmd.* dưới login riêng (appCmd), không DML trực tiếp.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { appCmd } from '../db/command.ts';
import { loi } from '../loi.ts';
import { soGam } from './chung.ts';

const NHAN_NGUON: Record<string, string> = { self_recorded: 'Tự ghi', agiviet_confirmed: 'Nhân viên AgiViet xác nhận' };
const TEN_VIEC: Record<string, string> = {
  fertilize: 'Bón phân', spray: 'Phun thuốc', water: 'Tưới', flower: 'Ra hoa', fruit_set: 'Đậu trái', harvest: 'Thu hoạch',
  weather_incident: 'Sự cố thời tiết', pest_incident: 'Sâu bệnh', care: 'Chăm sóc',
};
const phiaBan = (nd: NguoiDung) => (nd.thanhVien.nguoiGiup ? 'helper' : 'seller') as any;
function canBan(nd: NguoiDung) { if (!nd.thanhVien.canSell && !nd.thanhVien.nguoiGiup) throw loi('KHONG_CO_QUYEN', 'Chỉ tổ chức bán.'); }

// ---------------- Mặt hàng đã xác minh ----------------
export async function matHangDaXacMinh(t: GiaoDich, nd: NguoiDung, tatCa = false) {
  canBan(nd);
  const rows = await t.q<any>(`SELECT v.id, v.site_id, s.name site_name, s.kind site_kind, p.code product_code, p.name_vi product_name, v.grade_code,
      g.label_vi grade_label, v.criteria, v.inspection_source, lower(v.valid_during)::text valid_from, (upper(v.valid_during)-1)::text valid_to,
      r.approved_at, x.revoked_at, x.reason revoke_reason,
      CASE WHEN r.verification_id IS NULL THEN 'cho_duyet' WHEN x.verification_id IS NOT NULL THEN 'da_thu_hoi'
           WHEN NOT v.valid_during @> (ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN 'het_han' ELSE 'hieu_luc' END trang_thai
    FROM core.seller_product_verifications v JOIN core.production_sites s ON s.id=v.site_id JOIN core.products p ON p.id=v.product_id
    LEFT JOIN core.product_grades g ON g.product_id=v.product_id AND g.profile_version=v.profile_version AND g.grade_code=v.grade_code
    LEFT JOIN core.seller_product_reviews r ON r.verification_id=v.id LEFT JOIN core.seller_product_revocations x ON x.verification_id=v.id
    WHERE v.org_id=$1 ORDER BY p.name_vi, v.grade_code, v.valid_during DESC`, [nd.thanhVien.orgId]);
  return tatCa ? rows : rows.filter((r) => r.trang_thai === 'hieu_luc');
}

/** Có hồ sơ xác minh hiệu lực cho tổ chức × cơ sở × mặt hàng × loại không (để báo sớm trước khi đăng). */
export async function coXacMinh(t: GiaoDich, orgId: string, siteId: string | null, productId: string, profile: number, grade: string) {
  if (!siteId) return false;
  return !!(await t.mot(`SELECT 1 FROM core.seller_product_verifications v JOIN core.seller_product_reviews r ON r.verification_id=v.id
    WHERE v.org_id=$1 AND v.site_id=$2 AND v.product_id=$3 AND v.profile_version=$4 AND v.grade_code=$5
      AND v.valid_during @> (ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND NOT EXISTS(SELECT 1 FROM core.seller_product_revocations WHERE verification_id=v.id)`,
    [orgId, siteId, productId, profile, grade]));
}

// ---------------- Cơ sở sản xuất ----------------
export async function danhSachCoSo(t: GiaoDich, nd: NguoiDung) {
  return t.q(`SELECT id, kind, name, commune_code, area_m2, created_at, core.site_clear_on(id)::text clear_on FROM core.production_sites WHERE org_id=$1 AND deleted_at IS NULL ORDER BY created_at`, [nd.thanhVien.orgId]);
}
export async function taoCoSo(t: GiaoDich, nd: NguoiDung, b: any) {
  canBan(nd);
  if (!['orchard', 'pond', 'field'].includes(b?.kind) || !b?.name) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần kind (orchard|pond|field) và name.');
  const data: any = { kind: b.kind, name: String(b.name) };
  for (const k of ['commune_code', 'lat', 'lng', 'area_m2', 'address_detail']) if (b[k] != null) data[k] = b[k];
  const id = await appCmd<string>(t, nd, 'seller', 'create_production_site', [data]);
  return { id, status: 'active' };
}

// ---------------- Nhật ký canh tác ----------------
export async function nhatKy(t: GiaoDich, nd: NguoiDung, q: { site_id?: string; from?: string; to?: string; include_history?: string }) {
  canBan(nd);
  const coSo = await t.q<any>(`SELECT id, name, kind, core.site_clear_on(id)::text clear_on FROM core.production_sites WHERE org_id=$1 AND deleted_at IS NULL AND ($2::uuid IS NULL OR id=$2) ORDER BY created_at`, [nd.thanhVien.orgId, q.site_id ?? null]);
  const lichSu = q.include_history === 'true';
  const ds = await t.q<any>(`SELECT e.id, e.site_id, e.occurred_on::text, e.activity, e.note, e.medicine_name, e.withdrawal_days, e.clear_on::text, e.harvested_qty::text harvested_qty_g,
      e.delivery_id, e.shortfall_reason, e.photo_document_ids, e.source, e.supersedes_id, e.correction_reason, e.recorded_at, u.display_name recorded_by_name,
      EXISTS(SELECT 1 FROM core.cultivation_entries n WHERE n.supersedes_id=e.id) da_sua,
      (SELECT c.order_id FROM core.seasonal_contracts c WHERE c.site_id=e.site_id AND c.harvest_during @> e.occurred_on ORDER BY c.created_at DESC LIMIT 1) seasonal_order_id
    FROM core.cultivation_entries e JOIN core.users u ON u.id=e.recorded_by
    WHERE e.org_id=$1 AND ($2::uuid IS NULL OR e.site_id=$2) AND ($3::date IS NULL OR e.occurred_on>=$3) AND ($4::date IS NULL OR e.occurred_on<=$4)
    ORDER BY e.occurred_on DESC, e.recorded_at DESC`, [nd.thanhVien.orgId, q.site_id ?? null, q.from ?? null, q.to ?? null]);
  const hienHanh = ds.filter((e) => lichSu || !e.da_sua).map((e) => ({ ...e, ten_viec: TEN_VIEC[e.activity], nhan: NHAN_NGUON[e.source] }));
  const homNay = await t.gtri<string>(`SELECT (ref.clock_at() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text`);
  // Nhóm theo vụ: hợp đồng vụ của cơ sở có khoảng thu hoạch chứa ngày việc; còn lại theo năm.
  const vu = new Map<string, any[]>();
  for (const e of hienHanh) { const k = e.seasonal_order_id ? `hop_dong:${e.seasonal_order_id}` : `nam:${e.occurred_on.slice(0, 4)}`; vu.set(k, [...(vu.get(k) ?? []), e]); }
  return {
    hom_nay: homNay,
    co_so: coSo.map((s) => ({ ...s, con_cach_ly: !!s.clear_on && s.clear_on > homNay, ngay_het_cach_ly_gan_nhat: s.clear_on })),
    theo_vu: [...vu.entries()].map(([khoa, viec]) => ({ khoa, seasonal_order_id: khoa.startsWith('hop_dong:') ? khoa.slice(9) : null, viec })),
    viec: hienHanh,
    ghi_chu: 'Ngày hết cách ly lấy mốc lớn nhất của mọi lần phun (kể cả bản đã sửa). Nhật ký là thông tin người ghi khai, không phải kết quả kiểm dư lượng.',
  };
}

export async function ghiNhatKy(t: GiaoDich, nd: NguoiDung, b: any) {
  if (!b?.site_id || !b?.request_key) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần site_id và request_key (khóa chống gửi lặp).');
  if (!TEN_VIEC[b.activity]) throw loi('DU_LIEU_KHONG_HOP_LE', `activity phải là: ${Object.keys(TEN_VIEC).join(', ')}.`);
  if (!b.occurred_on || !b.note) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần occurred_on (YYYY-MM-DD) và note.');
  if (b.activity === 'spray' && (!b.medicine_name || !(Number.isInteger(b.withdrawal_days) && b.withdrawal_days >= 0 && b.withdrawal_days <= 365)))
    throw loi('DU_LIEU_KHONG_HOP_LE', 'Phun thuốc cần medicine_name và withdrawal_days (0–365 ngày cách ly).');
  if (b.activity === 'harvest' && b.harvested_qty_g == null) throw loi('DU_LIEU_KHONG_HOP_LE', 'Thu hoạch cần harvested_qty_g.');
  const data: any = { occurred_on: b.occurred_on, activity: b.activity, note: String(b.note) };
  if (b.activity === 'spray') { data.medicine_name = b.medicine_name; data.withdrawal_days = b.withdrawal_days; }
  if (b.activity === 'harvest') { data.harvested_qty = soGam(b.harvested_qty_g, 'harvested_qty_g').toString(); if (b.delivery_id) data.delivery_id = b.delivery_id; if (b.shortfall_reason) data.shortfall_reason = b.shortfall_reason; }
  if (Array.isArray(b.photo_document_ids) && b.photo_document_ids.length) data.photo_document_ids = b.photo_document_ids;
  if (b.supersedes_id) { if (!b.correction_reason) throw loi('DU_LIEU_KHONG_HOP_LE', 'Sửa nhật ký cần correction_reason.'); data.supersedes_id = b.supersedes_id; data.correction_reason = b.correction_reason; }
  const siteOrg = await t.gtri<string>(`SELECT org_id FROM core.production_sites WHERE id=$1`, [b.site_id]);
  if (!siteOrg) throw loi('KHONG_TIM_THAY', 'Không có cơ sở.');
  // Nhân viên AgiViet ghi cho vườn của tổ chức khác → nhãn "nhân viên xác nhận"; chủ/người giúp → "tự ghi".
  const laNhanVien = siteOrg !== nd.thanhVien.orgId && nd.vaiVanHanh.some((v) => ['field', 'risk', 'supervisor'].includes(v));
  if (!laNhanVien && siteOrg !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  const id = await appCmd<string>(t, nd, laNhanVien ? 'ops' : phiaBan(nd), 'record_cultivation', [b.site_id, data, String(b.request_key)]);
  const e = await t.mot<any>(`SELECT source, clear_on::text FROM core.cultivation_entries WHERE id=$1`, [id]);
  return { id, status: 'recorded', source: e?.source, nhan: NHAN_NGUON[e?.source], clear_on: e?.clear_on ?? null, ngay_het_cach_ly_gan_nhat: await t.gtri<string>(`SELECT core.site_clear_on($1)::text`, [b.site_id]) };
}

// ---------------- Bán gấp ----------------
export async function banGap(t: GiaoDich, nd: NguoiDung, lotId: string, b: { on?: boolean; until?: string | null; reason?: string }) {
  const tat = b?.on === false || b?.until === null;
  if (!tat && (!b?.until || !b?.reason)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Bật bán gấp cần until (thời điểm kết thúc) và reason; tắt gửi {on:false}.');
  await appCmd(t, nd, 'seller', 'set_urgent_sale', [lotId, tat ? null : new Date(b.until!).toISOString(), tat ? null : b.reason]);
  const l = await t.mot<any>(`SELECT id, status, version, urgent_sale_from, urgent_sale_until, urgent_sale_reason FROM core.lots WHERE id=$1`, [lotId]);
  return { id: lotId, status: l.status, revision: l.version, ban_gap: l.urgent_sale_until ? { tu: l.urgent_sale_from, den: l.urgent_sale_until, ly_do: l.urgent_sale_reason } : null };
}

// ---------------- Hợp đồng vụ (đặt trước / bao tiêu) ----------------
async function layDonVu(t: GiaoDich, nd: NguoiDung, id: string) {
  const o = await t.mot<any>(`SELECT o.*, c.site_id, lower(c.harvest_during)::text harvest_from, (upper(c.harvest_during)-1)::text harvest_to, c.materials_advance_vnd::text
      FROM core.orders o JOIN core.seasonal_contracts c ON c.order_id=o.id WHERE o.id=$1`, [id]);
  if (!o || (o.seller_org_id !== nd.thanhVien.orgId && o.buyer_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  return { o, phia: (o.seller_org_id === nd.thanhVien.orgId ? 'seller' : 'buyer') as 'seller' | 'buyer' };
}

export async function danhSachDonVu(t: GiaoDich, nd: NguoiDung, q: { type?: string }) {
  return t.q(`SELECT o.id, o.code, o.contract_type, o.status order_status, core.seasonal_status(o.id) seasonal_status, p.name_vi product_name,
      s.display_name seller_name, b.display_name buyer_name, v.qty_min::text qty_min_g, v.qty_max::text qty_max_g, v.price_mode, v.unit_price_vnd::text, v.deposit_vnd::text,
      lower(c.harvest_during)::text harvest_from, (upper(c.harvest_during)-1)::text harvest_to, ps.name site_name,
      (SELECT count(*)::int FROM core.seasonal_batches x WHERE x.order_id=o.id) so_dot,
      CASE WHEN o.seller_org_id=$1 THEN 'seller' ELSE 'buyer' END phia
    FROM core.orders o JOIN core.seasonal_contracts c ON c.order_id=o.id JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=coalesce(o.effective_version_no,1)
    JOIN core.products p ON p.id=o.product_id JOIN core.organizations s ON s.id=o.seller_org_id JOIN core.organizations b ON b.id=o.buyer_org_id JOIN core.production_sites ps ON ps.id=c.site_id
    WHERE (o.seller_org_id=$1 OR o.buyer_org_id=$1) AND ($2::text IS NULL OR o.contract_type=$2) ORDER BY o.created_at DESC`, [nd.thanhVien.orgId, q.type ?? null]);
}

export async function chiTietDonVu(t: GiaoDich, nd: NguoiDung, id: string) {
  const { o, phia } = await layDonVu(t, nd, id);
  const v = await t.mot<any>(`SELECT version_no, qty_min::text qty_min_g, qty_max::text qty_max_g, price_mode, price_formula, unit_price_vnd::text, deposit_rule, deposit_bps, deposit_vnd::text,
      fee_vnd::text, payment_timing, pay_after_days, lower(delivery_window) window_from, upper(delivery_window) window_to FROM core.order_versions WHERE order_id=$1 AND version_no=coalesce($2,1)`, [id, o.effective_version_no]);
  const lich = await t.q(`SELECT batch_no, committed_qty::text committed_qty_g, lower(delivery_window) tu, upper(delivery_window) den, materials_offset_vnd::text FROM core.seasonal_batches WHERE order_id=$1 ORDER BY batch_no`, [id]);
  const dot = await t.q(`SELECT d.id, d.code, d.batch_no, d.status, d.planned_qty::text planned_qty_g, lower(d.delivery_window) tu, upper(d.delivery_window) den,
      p.unit_price_vnd::text gia_dot_vnd, p.fixed_at gia_chot_luc, a.gross_vnd::text gia_tri_vnd, a.materials_offset_vnd::text tru_vat_tu_vnd, a.payment_id
    FROM core.deliveries d LEFT JOIN core.seasonal_batch_prices p ON p.delivery_id=d.id LEFT JOIN core.seasonal_batch_accountings a ON a.delivery_id=d.id WHERE d.order_id=$1 ORDER BY d.batch_no`, [id]);
  const capNhat = await t.q(`SELECT u.id, u.qty_min::text qty_min_g, u.qty_max::text qty_max_g, lower(u.harvest_during)::text harvest_from, (upper(u.harvest_during)-1)::text harvest_to,
      u.note, u.photo_document_ids, u.recorded_at, us.display_name recorded_by_name FROM core.production_updates u JOIN core.users us ON us.id=u.recorded_by WHERE u.order_id=$1 ORDER BY u.recorded_at DESC`, [id]);
  const deNghi = await t.q(`SELECT id, kind, status, payload, resulting_version_no, created_at FROM core.amendments WHERE order_id=$1 ORDER BY created_at DESC`, [id]);
  const hanAnh = await t.gtri(`SELECT due_at FROM core.deadlines WHERE order_id=$1 AND kind='pre_harvest_photo' AND status='open' ORDER BY due_at LIMIT 1`, [id]);
  const hanhDong: string[] = [];
  if (phia === 'seller' && o.status === 'active') hanhDong.push('production_update', 'force_majeure_reduction');
  if (o.contract_type === 'pre_harvest' && o.status === 'active') hanhDong.push('propose_harvest_fix');
  if (deNghi.some((a: any) => a.status === 'open')) hanhDong.push('answer_amendment');
  return {
    id, code: o.code, contract_type: o.contract_type, order_status: o.status, seasonal_status: await t.gtri(`SELECT core.seasonal_status($1)`, [id]), phia,
    harvest_from: o.harvest_from, harvest_to: o.harvest_to, materials_advance_vnd: o.materials_advance_vnd, site_id: o.site_id,
    dieu_khoan: v, lich_ban_dau: lich, dot_giao: dot, cap_nhat_san_luong: capNhat, de_nghi: deNghi, han_anh_tiep_theo: hanAnh, hanh_dong: hanhDong,
  };
}

export async function capNhatSanLuong(t: GiaoDich, nd: NguoiDung, id: string, b: any) {
  const { phia } = await layDonVu(t, nd, id);
  if (phia !== 'seller') throw loi('KHONG_CO_QUYEN', 'Chỉ bên bán cập nhật sản lượng ước.');
  if (!b?.note || !b?.harvest_from || !b?.harvest_to || !b?.request_key) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần qty_min_g, qty_max_g, harvest_from, harvest_to, note, request_key.');
  const data: any = { qty_min: soGam(b.qty_min_g, 'qty_min_g').toString(), qty_max: soGam(b.qty_max_g, 'qty_max_g').toString(), harvest_during: `[${b.harvest_from},${b.harvest_to}]`, note: String(b.note) };
  if (Array.isArray(b.photo_document_ids) && b.photo_document_ids.length) data.photo_document_ids = b.photo_document_ids;
  const uid = await appCmd<string>(t, nd, 'seller', 'record_production_update', [id, data, String(b.request_key)]);
  return { id: uid, status: 'recorded', ghi_chu: 'Dự báo không đổi hợp đồng; muốn đổi lượng/giá phải chốt bằng phụ lục.' };
}

export async function deNghiChotLuong(t: GiaoDich, nd: NguoiDung, id: string, b: any) {
  const { phia } = await layDonVu(t, nd, id);
  const aid = await appCmd<string>(t, nd, phia, 'propose_harvest_fix', [id, soGam(b?.qty_g, 'qty_g').toString()]);
  const a = await t.mot<any>(`SELECT id, kind, status, payload FROM core.amendments WHERE id=$1`, [aid]);
  return { id: aid, status: a?.status, kind: a?.kind, payload: a?.payload, tiep_theo: 'Bên kia đồng ý (POST /v1/amendments/{id}/accept), hai bên ký OTP phụ lục; chỉ khi đó lượng, giá và cọc mới đổi.' };
}

export async function chotGiaDot(t: GiaoDich, nd: NguoiDung, deliveryId: string) {
  const o = await t.mot<any>(`SELECT o.seller_org_id, o.buyer_org_id FROM core.deliveries d JOIN core.orders o ON o.id=d.order_id WHERE d.id=$1`, [deliveryId]);
  if (!o || (o.seller_org_id !== nd.thanhVien.orgId && o.buyer_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  const gia = await appCmd<string>(t, nd, o.seller_org_id === nd.thanhVien.orgId ? 'seller' : 'buyer', 'fix_seasonal_batch_price', [deliveryId]);
  return { id: deliveryId, status: 'price_fixed', gia_dot_vnd: String(gia) };
}
