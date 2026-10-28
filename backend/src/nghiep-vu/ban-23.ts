// Bản 23 (khóa 28/10/2026): API cho hộp việc hồ sơ mở, phân bổ phí kiểm định, khiếu nại sau giao,
// tìm nguồn định kỳ nhiều người bán. Mọi ghi đều qua cmd.* trong DB (DB là nơi giữ luật).
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { appCmd } from '../db/command.ts';
import { loi } from '../loi.ts';

const can = (b: any, keys: string[]) => {
  const thieu = keys.filter((k) => b?.[k] === undefined || b?.[k] === null || b?.[k] === '');
  if (thieu.length) throw loi('DU_LIEU_KHONG_HOP_LE', 'Thiếu: ' + thieu.join(', '));
};
const so = (v: any, ten: string) => { const s = String(v); if (!/^\d+$/.test(s)) throw loi('DU_LIEU_KHONG_HOP_LE', `${ten} phải là số nguyên không âm`); return s; };
const nhanVien = (nd: NguoiDung) => { if (!nd.vaiVanHanh?.length) throw loi('KHONG_CO_QUYEN'); };

// Codex chốt: toàn bộ kế hoạch và giá chỉ cho bên mua (chủ, thu mua, kế toán) và vận hành đúng vai;
// vai vận hành bất kỳ (vd kiểm định) không được xem mọi khách hàng.
const VAI_MUA_XEM_KE_HOACH = ['owner', 'purchaser', 'accountant'];
const VAI_VAN_HANH_XEM_KE_HOACH = ['dispatcher', 'supervisor', 'finance', 'risk'];
// ---------- Hồ sơ mở (hộp việc) ----------
export async function hopViec(t: GiaoDich, nd: NguoiDung, q: any) {
  nhanVien(nd);
  const rows = await t.q(`SELECT order_id, code, order_status, kind, ref_id, note, owner_user_id, due_at, chua_co_nguoi_phu_trach, qua_han
    FROM ops.v_open_dossiers WHERE ($1::boolean IS NULL OR chua_co_nguoi_phu_trach=$1) ORDER BY qua_han DESC NULLS LAST, due_at NULLS FIRST, code LIMIT 500`,
    [q?.chua_giao === undefined ? null : q.chua_giao === 'true']);
  return { items: rows };
}
export async function giaoHoSo(t: GiaoDich, nd: NguoiDung, b: any) {
  can(b, ['order_id', 'kind', 'ref_id', 'owner_user_id', 'due_at']);
  await appCmd(t, nd, 'ops', 'assign_dossier', [b.order_id, b.kind, b.ref_id, b.owner_user_id, b.due_at]);
  return { status: 'assigned' };
}
export async function hoSoDon(t: GiaoDich, nd: NguoiDung, orderId: string) {
  const ok = await t.gtri<boolean>(`SELECT EXISTS(SELECT 1 FROM core.orders WHERE id=$1 AND $2 IN (buyer_org_id,seller_org_id))`, [orderId, nd.thanhVien.orgId]);
  if (!ok && !nd.vaiVanHanh.some((v) => [...VAI_VAN_HANH_XEM_KE_HOACH, 'support'].includes(v))) throw loi('KHONG_TIM_THAY');
  const ds = await t.q(`SELECT kind, ref_id, note FROM core.open_dossiers($1)`, [orderId]);
  const nhan = await t.gtri<string>(`SELECT nhan_hien_thi FROM core.v_order_display_status WHERE order_id=$1`, [orderId]);
  const chuaBaoDam = await t.q(`SELECT dispute_id, claim_kind, inspection_fee_vnd::text, penalty_vnd::text, security_status FROM core.unsecured_claims_of($1)`, [orderId]);
  return { nhan_hien_thi: nhan, ho_so_mo: ds, khoan_doi_them_chua_bao_dam: chuaBaoDam };
}

// ---------- Phân bổ phí kiểm định (quyết định hai người) ----------
export async function deXuatPhanBoPhi(t: GiaoDich, nd: NguoiDung, inspectionId: string, b: any) {
  can(b, ['reason', 'evidence_document_id', 'buyer_vnd', 'seller_vnd', 'partner_vnd', 'platform_vnd', 'pending_vnd']);
  const detail = Object.fromEntries(['buyer_vnd', 'seller_vnd', 'partner_vnd', 'platform_vnd', 'pending_vnd'].map((k) => [k, Number(so(b[k], k))]));
  const id = await appCmd<string>(t, nd, 'ops', 'propose_decision', ['inspection_fee_allocation', 'inspection', inspectionId, String(b.reason), b.evidence_document_id, JSON.stringify(detail)]);
  return { proposal_id: id, ghi_chu: 'Cần người thứ hai duyệt (E2).' };
}
export async function apPhanBoPhi(t: GiaoDich, nd: NguoiDung, b: any) {
  can(b, ['decision_id']);
  const id = await appCmd<string>(t, nd, 'ops', 'allocate_inspection_fee', [b.decision_id]);
  const hs = await t.q(`SELECT f.* FROM core.v_fee_dossier f JOIN core.inspection_fee_allocations a ON a.inspection_id=f.inspection_id WHERE a.id=$1`, [id]);
  return { allocation_id: id, ho_so_phi: hs[0] ?? null };
}

// ---------- Khiếu nại sau giao ----------
export async function khieuNaiSauGiao(t: GiaoDich, nd: NguoiDung, lineId: string, b: any) {
  can(b, ['qty_g', 'reason', 'claim_kind']);
  const id = await appCmd<string>(t, nd, 'buyer', 'open_post_delivery_claim', [lineId, so(b.qty_g, 'qty_g'), String(b.reason), String(b.claim_kind), b.deferred_check_id ?? null]);
  return { id, status: 'awaiting_seller' };
}

// ---------- Tìm nguồn định kỳ ----------
export async function lapThoaThuanNguon(t: GiaoDich, nd: NguoiDung, b: any) {
  can(b, ['code', 'product_code']);
  const sp = await t.gtri<string>(`SELECT id FROM core.products WHERE code=$1`, [b.product_code]);
  if (!sp) throw loi('DU_LIEU_KHONG_HOP_LE', 'Mặt hàng không tồn tại');
  const id = await appCmd<string>(t, nd, 'buyer', 'create_sourcing_agreement', [String(b.code), sp, JSON.stringify(b.spec ?? {}), b.required_docs ?? [], !!b.accepts_substitution,
    b.mode ?? null, b.max_price_vnd_per_kg == null ? null : so(b.max_price_vnd_per_kg, 'max_price_vnd_per_kg'), b.cutoff_time ?? null]);
  return { id };
}
async function laBenMuaThoaThuan(t: GiaoDich, nd: NguoiDung, id: string) {
  const laBenMua = await t.gtri<boolean>(`SELECT EXISTS(SELECT 1 FROM core.sourcing_agreements WHERE id=$1 AND buyer_org_id=$2)`, [id, nd.thanhVien.orgId]);
  const muaDungVai = laBenMua && nd.thanhVien.vai.some((v) => VAI_MUA_XEM_KE_HOACH.includes(v));
  const vanHanhDungVai = nd.vaiVanHanh.some((v) => VAI_VAN_HANH_XEM_KE_HOACH.includes(v));
  if (!muaDungVai && !vanHanhDungVai) throw loi('KHONG_TIM_THAY');
}
export async function doPhuNguon(t: GiaoDich, nd: NguoiDung, id: string) {
  await laBenMuaThoaThuan(t, nd, id);
  const days = await t.q(`SELECT day_id, delivery_date::text, cutoff_at, confirmed_qty_g::text, committed_qty_g::text, missing_qty_g::text, pending_qty_g::text
    FROM core.v_sourcing_coverage WHERE agreement_id=$1 ORDER BY delivery_date`, [id]);
  const nguon = await t.q(`SELECT a.id, a.day_id, o.display_name AS nguoi_ban, a.qty_g::text, a.unit_price_vnd_per_kg::text, a.status
    FROM core.sourcing_allocations a JOIN core.sourcing_days d ON d.id=a.day_id JOIN core.organizations o ON o.id=a.seller_org_id WHERE d.agreement_id=$1 ORDER BY d.delivery_date, a.created_at`, [id]);
  return { ngay: days, nguon, ghi_chu: 'Dự kiến không là cam kết; chỉ phân bổ đã cam kết mới tính là có hàng.' };
}
export async function chotNgay(t: GiaoDich, nd: NguoiDung, id: string, b: any) {
  can(b, ['delivery_date', 'qty_g']);
  return { day_id: await appCmd<string>(t, nd, 'buyer', 'confirm_sourcing_day', [id, b.delivery_date, so(b.qty_g, 'qty_g')]) };
}
export async function deXuatNguon(t: GiaoDich, nd: NguoiDung, dayId: string, b: any) {
  can(b, ['seller_org_id', 'qty_g', 'unit_price_vnd_per_kg']);
  return { allocation_id: await appCmd<string>(t, nd, 'ops', 'propose_allocation', [dayId, b.seller_org_id, so(b.qty_g, 'qty_g'), so(b.unit_price_vnd_per_kg, 'unit_price_vnd_per_kg')]) };
}
export async function duyetNguon(t: GiaoDich, nd: NguoiDung, id: string) { await appCmd(t, nd, 'buyer', 'approve_allocation', [id]); return { status: 'buyer_approved' }; }
export async function camKetNguon(t: GiaoDich, nd: NguoiDung, id: string) { await appCmd(t, nd, 'seller', 'commit_allocation', [id]); return { status: 'committed' }; }
export async function datDieuKhoanTra(t: GiaoDich, nd: NguoiDung, b: any) {
  can(b, ['buyer_org_id', 'pay_after_days', 'credit_limit_vnd']);
  await appCmd(t, nd, 'seller', 'set_credit_terms', [b.buyer_org_id, Number(so(b.pay_after_days, 'pay_after_days')), so(b.credit_limit_vnd, 'credit_limit_vnd')]);
  return { status: 'saved' };
}
export async function xinDoiLuong(t: GiaoDich, nd: NguoiDung, id: string, b: any) {
  can(b, ['new_qty_g']);
  return { change_id: await appCmd<string>(t, nd, 'buyer', 'request_allocation_change', [id, so(b.new_qty_g, 'new_qty_g')]), ghi_chu: 'Chờ người bán đồng ý.' };
}
export async function traLoiDoiLuong(t: GiaoDich, nd: NguoiDung, id: string, b: any) {
  if (typeof b?.agree !== 'boolean') throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần agree: true/false');
  await appCmd(t, nd, 'seller', 'answer_allocation_change', [id, b.agree, so(b.cost_vnd ?? 0, 'cost_vnd'), b.evidence_document_id ?? null]);
  const claimId = await t.gtri<string>(`SELECT k.id FROM core.sourcing_cost_claims_of($1) k WHERE k.change_id=$2`, [nd.thanhVien.orgId, id]);
  return { status: b.agree ? 'consented' : 'rejected', cost_claim_id: claimId ?? null };
}
export async function baoGiaoThieu(t: GiaoDich, nd: NguoiDung, id: string, b: any) {
  can(b, ['delivered_qty_g']);
  return { event_id: await appCmd<string>(t, nd, 'seller', 'report_shortfall', [id, so(b.delivered_qty_g, 'delivered_qty_g')]), ghi_chu: 'Ghi lịch sử, không tự trừ uy tín (Q28).' };
}
export async function dungNguon(t: GiaoDich, nd: NguoiDung, id: string) {
  return { forecasts_cancelled: await appCmd<number>(t, nd, 'buyer', 'stop_sourcing', [id]), ghi_chu: 'Phân bổ đã cam kết vẫn giữ.' };
}
export async function traLoiChiPhiDoiLuong(t: GiaoDich, nd: NguoiDung, id: string, b: any) {
  if (typeof b?.accept !== 'boolean') throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần accept: true/false');
  await appCmd(t, nd, 'buyer', 'answer_sourcing_cost', [id, b.accept]);
  return { status: b.accept ? 'phai_tra' : 'tranh_chap' };
}
export async function dsChiPhiDoiLuong(t: GiaoDich, nd: NguoiDung) {
  if (!nd.thanhVien.vai.some((v) => ['owner', 'purchaser', 'accountant'].includes(v))) throw loi('KHONG_CO_QUYEN');
  const items = await t.q(`SELECT id, change_id, buyer_org_id, seller_org_id, amount_vnd::text, status, due_at, evidence_document_id, paid_evidence_id, created_at FROM core.sourcing_cost_claims_of($1)`, [nd.thanhVien.orgId]);
  return { items };
}
export async function xacNhanDaTraChiPhi(t: GiaoDich, nd: NguoiDung, id: string, b: any) {
  can(b, ['evidence_document_id']);
  await appCmd(t, nd, 'seller', 'confirm_sourcing_cost_paid', [id, b.evidence_document_id]);
  return { status: 'da_tra' };
}
