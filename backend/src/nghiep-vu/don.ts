import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Đơn / hợp đồng (03 mục 5): lập từ lời chào đã đồng ý, duyệt nội bộ, ký OTP hai bên (cmd.sign_document dưới login riêng),
// từ chối ký, rút đơn; xem đơn với trạng thái hiển thị, tới lượt ai, các khoản, hạn, lịch sử, tài liệu.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { canQuyen, duocPhep } from '../auth/quyen.ts';
import { damBaoDangNhap } from '../db/dang-nhap-rieng.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { GIO } from '../dong-ho.ts';
import { chuyenTrangThai, dongHan, maMoi, phat, taoHan, dong, kg, dongBoTaiLieu, soGam } from './chung.ts';
import { B, giaTinhCoc, tinhCocPhi, s } from './tinh-tien.ts';
import { giaThamKhao } from './lo.ts';
import { taoTaiLieuPdf } from '../pdf/tai-lieu-pdf.ts';
import { CAU_CHUA_HOP_DONG } from './loi-chao.ts';

export const CAU_BAO_VE = 'Hợp đồng chỉ được app bảo vệ khi cọc qua app. Giao dịch ngoài app hai bên tự chịu.';

export interface LapDon {
  offer_id: string;
  downgrade_price_vnd?: unknown;
  delivery_mode: 'at_farm' | 'at_buyer_warehouse' | 'at_collection_point';
  transport_by: 'buyer' | 'seller' | 'partner_for_buyer' | 'partner_for_seller';
  delivery_from: string; delivery_to: string;
  payment_timing: 'before_loading' | 'inspect_then_before_loading' | 'on_receipt' | 'after_days';
  pay_after_days?: number;
  designated_receiver_user_id?: string;
  acceptance_facility_id?: string;
  silent_accept_hours?: number | null;
  seal_sample_required?: boolean;
  inspection_before_loading?: boolean;
  site_kind?: 'tai_vuon' | 'tai_ao' | 'tai_ruong';
}

const DIEM: Record<string, string> = { at_farm: 'tai_vuon', at_buyer_warehouse: 'tai_kho_ben_mua', at_collection_point: 'tai_diem_gom' };
const TEN_DIEM: Record<string, string> = { tai_vuon: 'Tại vườn', tai_ao: 'Tại ao', tai_ruong: 'Tại ruộng', tai_diem_gom: 'Tại điểm gom', tai_kho_ben_mua: 'Tại kho bên mua' };
const TEN_TRA: Record<string, string> = { before_loading: 'Trả thẳng trước khi bốc', inspect_then_before_loading: 'Kiểm rồi mới trả, trước khi bốc', on_receipt: 'Trả khi nhận', after_days: 'Trả sau N ngày' };
const TEN_XE: Record<string, string> = { buyer: 'Bên mua lo xe', seller: 'Người bán lo xe', partner_for_buyer: 'Xe đối tác do bên mua thuê', partner_for_seller: 'Xe đối tác do người bán thuê' };

async function laDonDau(t: GiaoDich, buyer: string, seller: string): Promise<boolean> {
  // "Đơn đầu" = cặp chưa có đơn hoàn tất TRÊN APP (04 mục 4). core.historical_trades là mẫu giá nhập khẩu, không tính
  // (seed có 4 giao dịch Sáu -> Tư Hùng nhưng TH-015 ghi "đơn đầu"); xem docs/backend/danh-gia-thanh-that.md.
  const n = await t.gtri<number>(`SELECT count(*) FROM core.orders WHERE buyer_org_id=$1 AND seller_org_id=$2 AND status='completed'`, [buyer, seller]);
  return Number(n) === 0;
}

async function goiHienHanh(t: GiaoDich, orgId: string, luc: Date): Promise<string> {
  return (await t.gtri<string>(`SELECT plan_code FROM core.subscriptions WHERE org_id=$1 AND active_during @> $2::timestamptz ORDER BY lower(active_during) DESC LIMIT 1`, [orgId, luc])) ?? 'free';
}

/** Hợp đồng vụ (0057): đặt trước khi hái hoặc bao tiêu theo vụ. Dùng chung điều khoản/PDF của đơn thường. */
export interface ThongTinVu {
  loai: 'pre_harvest' | 'offtake';
  qty_max_g?: unknown;                         // đặt trước: lượng tối đa (≥ lượng giữ)
  price_formula?: { floor: number; ref_bps?: number; share_bps?: number; cap?: number; scope: string };
  harvest_from: string; harvest_to: string;   // ngày, gồm cả hai đầu
  materials_advance_vnd?: unknown;             // bao tiêu: vật tư ứng trước
  deposit_vnd?: unknown;                       // bao tiêu: cọc vụ cố định
  batches: { qty_g: unknown; from: string; to: string; materials_offset_vnd?: unknown }[];
}
export async function lapDonVu(t: GiaoDich, nd: NguoiDung, d: LapDon & { vu: ThongTinVu }) {
  const vu = d?.vu;
  if (!vu || !['pre_harvest', 'offtake'].includes(vu.loai)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần vu.loai = pre_harvest | offtake.');
  if (!Array.isArray(vu.batches) || !vu.batches.length) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần lịch đợt vu.batches.');
  if (vu.loai === 'pre_harvest' && vu.batches.length !== 1) throw loi('DU_LIEU_KHONG_HOP_LE', 'Đặt trước chỉ một đợt.');
  if (!vu.harvest_from || !vu.harvest_to) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần vu.harvest_from và vu.harvest_to.');
  const tuDot = vu.batches.map((x) => new Date(x.from)); const denDot = vu.batches.map((x) => new Date(x.to));
  if (tuDot.some((x, i) => !(x < denDot[i]))) throw loi('DU_LIEU_KHONG_HOP_LE', 'Khung giờ đợt không hợp lệ.');
  const tu = new Date(Math.min(...tuDot.map(Number))); const den = new Date(Math.max(...denDot.map(Number)));
  return lapDon(t, nd, { ...d, delivery_from: tu.toISOString(), delivery_to: den.toISOString(),
    payment_timing: vu.loai === 'offtake' ? 'after_days' : d.payment_timing, pay_after_days: vu.loai === 'offtake' ? (d.pay_after_days ?? 7) : d.pay_after_days }, vu);
}

export async function lapDon(t: GiaoDich, nd: NguoiDung, d: LapDon, vu?: ThongTinVu) {
  canQuyen(nd, 'order.create');
  const o = await t.mot<any>(`SELECT * FROM core.offers WHERE id=$1 FOR UPDATE`, [d.offer_id]);
  if (!o || o.buyer_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  if (o.status !== 'accepted') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Lời chào chưa được đồng ý.');
  const hold = await t.mot<any>(`SELECT * FROM core.holds WHERE offer_id=$1 AND status='active' FOR UPDATE`, [o.id]);
  if (!hold || new Date(hold.expires_at).getTime() <= t.thoiDiemMs) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Giữ lượng đã hết hạn.');
  if (hold.order_id) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Lời chào này đã có đơn.');
  const r = await t.mot<any>(`SELECT price_vnd::text price, qty::text qty FROM core.offer_rounds WHERE offer_id=$1 ORDER BY round_no DESC LIMIT 1`, [o.id]);
  const lot = await t.mot<any>(`SELECT l.*, p.code product_code, p.name_vi product_name, pp.qty_tolerance_bps, pp.reject_allowance_bps, pp.shelf_life_days, pp.silent_accept_hours profile_silent
      FROM core.lots l JOIN core.products p ON p.id=l.product_id JOIN core.product_profiles pp ON pp.product_id=l.product_id AND pp.profile_version=l.profile_version WHERE l.id=$1`, [o.lot_id]);
  const seller = await t.mot<any>(`SELECT id, code, display_name, kind, province_code FROM core.organizations WHERE id=$1`, [o.seller_org_id]);
  const buyer = await t.mot<any>(`SELECT id, code, display_name, tax_code FROM core.organizations WHERE id=$1`, [o.buyer_org_id]);
  const P = BigInt(r.price); const Q = BigInt(hold.qty);
  const Phc = d.downgrade_price_vnd == null ? null : B(String(d.downgrade_price_vnd));
  if (Phc !== null && (Phc < 0n || Phc >= P)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Giá hạ cấp phải nhỏ hơn giá đơn.');
  const ptk = await giaThamKhao(t, lot.product_id, lot.grade_code, seller.province_code);
  const Pcoc = giaTinhCoc(P, ptk?.gia ?? null);
  const luc = new Date(t.thoiDiemMs);
  const goi = await goiHienHanh(t, buyer.id, luc);
  const donDau = await laDonDau(t, buyer.id, seller.id);
  const tien = tinhCocPhi(Q, P, Pcoc, goi, donDau);
  // Bao tiêu: cọc vụ là số cố định hai bên thỏa thuận (deposit_rule per_unit), không theo 30%.
  if (vu?.loai === 'offtake') (tien as any).C = soGam(vu.deposit_vnd, 'deposit_vnd');
  const giaBatThuong = !!ptk && P * 10000n < ptk.gia * BigInt(CHINH_SACH.giaBatThuongBps);
  const policy = await t.gtri<number>(`SELECT id FROM core.policy_versions WHERE effective_from<=$1 ORDER BY effective_from DESC, id DESC LIMIT 1`, [luc]);
  const bank = await t.mot<any>(`SELECT id, bank_code, account_masked, holder_name FROM pii.bank_accounts WHERE org_id=$1 AND status='active' ORDER BY activated_at DESC NULLS LAST, created_at DESC LIMIT 1`, [seller.id]);
  if (!bank) throw loi('TAI_KHOAN_DANG_CHO', 'Người bán chưa có tài khoản nhận tiền đang hoạt động.');
  let segment = 'processor'; let demandId: string | null = null;
  if (o.demand_line_id) {
    const dm = await t.mot<any>(`SELECT d.id, d.segment_code FROM core.demands d JOIN core.demand_lines l ON l.demand_id=d.id WHERE l.id=$1`, [o.demand_line_id]);
    segment = dm.segment_code; demandId = dm.id;
  } else {
    segment = (await t.gtri<string>(`SELECT segment_code FROM core.org_buyer_segments WHERE org_id=$1 ORDER BY 1 LIMIT 1`, [buyer.id])) ?? 'processor';
  }
  const diem = d.delivery_mode === 'at_farm' ? (d.site_kind ?? 'tai_vuon') : DIEM[d.delivery_mode];
  if (!diem) throw loi('DU_LIEU_KHONG_HOP_LE', 'Kiểu giao không hỗ trợ.');
  if (d.payment_timing === 'after_days' && !(Number(d.pay_after_days) > 0)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần số ngày trả sau.');
  if (d.designated_receiver_user_id) {
    const rcv = await t.mot(`SELECT 1 FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id WHERE m.user_id=$1 AND m.org_id=$2 AND m.status='active' AND r.role_code IN ('owner','warehouse','site_receiver')`, [d.designated_receiver_user_id, buyer.id]);
    if (!rcv) throw loi('NGUOI_NHAN_KHONG_CHI_DINH', 'Người nhận phải là chủ, kho hoặc người nhận tại điểm của bên mua.');
  }
  const tu = new Date(d.delivery_from); const den = new Date(d.delivery_to);
  if (!(tu < den)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Khung giờ giao không hợp lệ.');
  const code = await maMoi(t, 'core.orders', 'HD', 3001);
  const silent = d.silent_accept_hours === undefined ? (lot.profile_silent ?? null) : d.silent_accept_hours;
  const dieuKhoan = {
    loai_hop_dong: 'spot', ma_don: code, loi_chao: o.code,
    ben_ban: { ten: seller.display_name, ma: seller.code, loai: seller.kind, tai_khoan: { ngan_hang: bank.bank_code, so_che: bank.account_masked, chu: bank.holder_name } },
    ben_mua: { ten: buyer.display_name, ma: buyer.code, mst: buyer.tax_code, nguoi_lap: nd.ten },
    hang: { mat_hang: lot.product_code, ten: lot.product_name, loai: lot.grade_code, ma_lo: lot.code, luong_g: Q, dung_sai_bps: lot.qty_tolerance_bps, co_so_luong: lot.qty_basis },
    gia: { gia_don: P, gia_ha_cap: Phc, gia_tham_khao: ptk ? { gia: ptk.gia, so_don: ptk.soDon, vung: ptk.scope } : null, gia_tinh_coc: Pcoc },
    tien: { gia_tri: tien.G, coc_bps: CHINH_SACH.cocBps, coc: tien.C, phi_bps: tien.phiBps, phi: tien.F, cach_tra: d.payment_timing, tra_sau_ngay: d.pay_after_days ?? null, tra_thang_du_kien: tien.traThang, goi, don_dau: donDau },
    giao: { kieu: d.delivery_mode, diem_nghiem_thu: diem, ai_lo_xe: d.transport_by, tu: tu.toISOString(), den: den.toISOString(), nguoi_nhan: d.designated_receiver_user_id ?? null },
    nghiem_thu: { loi_cho_phep_bps: lot.reject_allowance_bps, im_lang_gio: silent, mau_doi_chung: d.seal_sample_required ?? true, hao_hut_duong_bps: CHINH_SACH.hauHutDuongChoPhepBps },
    thieu_luong: { thang_phat_bps: CHINH_SACH.thangPhatThieuLuongBps },
    cau_bat_buoc: CAU_BAO_VE, chinh_sach: CHINH_SACH.phienBan,
    ...(vu ? { hop_dong_vu: { loai: vu.loai, luong_toi_da_g: vu.qty_max_g ?? null, cong_thuc_gia: vu.price_formula ?? null, thu_hoach: { tu: vu.harvest_from, den: vu.harvest_to },
      vat_tu_ung_vnd: vu.materials_advance_vnd ?? null, coc_vu_vnd: vu.loai === 'offtake' ? vu.deposit_vnd : null,
      lich_dot: vu.batches.map((x, i) => ({ dot: i + 1, luong_g: x.qty_g, tu: x.from, den: x.to, tru_vat_tu_vnd: x.materials_offset_vnd ?? 0 })) } } : {}),
  };
  const doc = await taoTaiLieuPdf(t, {
    docType: 'contract', code: `${code}-HD`, seriesKey: `${code}-HD`, versionNo: 1, orderId: null, ownerOrgId: buyer.id,
    noiDung: dieuKhoan, status: 'awaiting_signature', createdBy: nd.userId,
    trinhBay: { loai: 'HD', tieuDe: 'HỢP ĐỒNG MUA BÁN CÓ ĐẶT CỌC', muc: muc8The(dieuKhoan, { seller, buyer, bank, lot, tien, P, Phc, ptk, Pcoc, Q, d, diem, silent }) },
  });
  const terms={profile_version:lot.profile_version,qty_min:Q.toString(),qty_max:Q.toString(),qty_tolerance_bps:lot.qty_tolerance_bps,price_mode:'fixed',unit_price_vnd:P.toString(),downgrade_price_vnd:Phc?.toString()??null,ref_price_vnd:ptk?.gia.toString()??null,ref_price_order_count:ptk?.soDon??null,ref_price_scope:ptk?.scope??null,ref_price_source:ptk?'trades':'none',ref_price_grade_code:ptk?lot.grade_code:null,ref_price_as_of:ptk?.asOf??null,deposit_price_vnd:Pcoc.toString(),contract_value_vnd:tien.G.toString(),deposit_basis_vnd:tien.Gcoc.toString(),deposit_rule:'percent',deposit_bps:CHINH_SACH.cocBps,deposit_vnd:tien.C.toString(),fee_rule:'standard',fee_bps:tien.phiBps,fee_floor_vnd:tien.phiSan||null,fee_cap_vnd:tien.phiTran||null,fee_vnd:tien.F.toString(),payment_timing:d.payment_timing,pay_after_days:d.payment_timing==='after_days'?d.pay_after_days:null,seller_bank_account_id:bank.id,seller_bank_code:bank.bank_code,seller_account_masked:bank.account_masked,seller_account_holder:bank.holder_name,delivery_mode:d.delivery_mode,acceptance_point:diem,acceptance_facility_id:d.acceptance_facility_id??null,transport_by:d.transport_by,delivery_window:`[${tu.toISOString()},${den.toISOString()})`,designated_receiver_user_id:d.designated_receiver_user_id??null,inspection_before_loading:!!d.inspection_before_loading,reject_allowance_bps:lot.reject_allowance_bps,transit_loss_allowance_bps:CHINH_SACH.hauHutDuongChoPhepBps,seal_sample_required:d.seal_sample_required??true,silent_accept_hours:silent,shortfall_penalty_bps:[CHINH_SACH.thangPhatThieuLuongBps.batKhaKhang,CHINH_SACH.thangPhatThieuLuongBps.baoTruoc3Ngay,CHINH_SACH.thangPhatThieuLuongBps.baoDuoi3Ngay,CHINH_SACH.thangPhatThieuLuongBps.khongBao],price_unit_base_qty:1000,value_basis:'single_product'};
  let id: string;
  if (!vu) id=await appCmd<string>(t,nd,'buyer','create_order',[code,o.id,JSON.parse(JSON.stringify(terms,(_k,v)=>typeof v==='bigint'?v.toString():v)),doc.payload]);
  else {
    const tv: any = terms;
    if (vu.loai === 'pre_harvest') { tv.qty_max = vu.qty_max_g == null ? Q.toString() : soGam(vu.qty_max_g, 'qty_max_g').toString(); tv.deposit_rule = 'percent'; tv.deposit_bps = 3000; }
    else {
      tv.qty_max = Q.toString(); tv.deposit_rule = 'per_unit';
      tv.deposit_vnd = soGam(vu.deposit_vnd, 'deposit_vnd').toString();
    }
    if (vu.price_formula) {
      if (BigInt(vu.price_formula.floor) !== P) throw loi('DU_LIEU_KHONG_HOP_LE', 'Giá công thức: giá chào phải bằng giá sàn.');
      tv.price_mode = 'formula'; tv.price_formula = vu.price_formula; tv.deposit_price_vnd = P.toString();
    }
    const season = { harvest_during: `[${vu.harvest_from},${vu.harvest_to}]`, materials_advance_vnd: vu.materials_advance_vnd == null ? '0' : soGam(vu.materials_advance_vnd, 'materials_advance_vnd').toString() };
    const batches = vu.batches.map((x) => ({ committed_qty: soGam(x.qty_g, 'qty_g').toString(), delivery_window: `[${new Date(x.from).toISOString()},${new Date(x.to).toISOString()})`, materials_offset_vnd: x.materials_offset_vnd == null ? '0' : soGam(x.materials_offset_vnd, 'materials_offset_vnd').toString() }));
    id=await appCmd<string>(t,nd,'buyer','create_seasonal_order',[code,o.id,vu.loai,JSON.parse(JSON.stringify(tv,(_k,v)=>typeof v==='bigint'?v.toString():v)),doc.payload,season,batches]);
  }
  const order=await t.mot<any>(`SELECT id,status,version FROM core.orders WHERE id=$1`,[id]);
  doc.id=await t.gtri<string>(`SELECT document_id FROM core.order_versions WHERE order_id=$1 AND version_no=1`,[id]);
  return {
    id: order.id, code, status: order.status, revision: order.version, document_id: doc.id, content_sha256: doc.contentSha256,
    tinh: { gia_tinh_coc_vnd: s(Pcoc), gia_tri_vnd: s(tien.G), coc_vnd: s(tien.C), phi_vnd: s(tien.F), tra_thang_vnd: s(tien.traThang), gia_bat_thuong: giaBatThuong },
  };
}

function muc8The(dk: any, x: any) {
  const v = (b: bigint | null) => (b === null ? '—' : dong(b));
  return [
    { tieuDe: 'Các bên', dong: [
      ['Bên bán', `${x.seller.display_name} (${x.seller.code})`], ['Tài khoản nhận tiền', `${x.bank.bank_code} ${x.bank.account_masked}, chủ tài khoản ${x.bank.holder_name} (chụp lúc ký)`],
      ['Bên mua', `${x.buyer.display_name} · MST ${x.buyer.tax_code ?? '—'}`]] as [string, string][] },
    { tieuDe: 'Điều 1 · Hàng', dong: [['Mặt hàng', `${x.lot.product_name} · loại ${x.lot.grade_code}`], ['Lượng', `${kg(x.Q)} (dung sai ±${x.lot.qty_tolerance_bps / 100}%)`], ['Mã lô', `${x.lot.code} (${x.lot.qty_basis === 'estimated' ? 'ước tính' : 'đã cân'})`]] as [string, string][] },
    { tieuDe: 'Điều 2 · Giá', dong: [['Giá đơn', `${dong(x.P)}/kg`], ['Giá hạ cấp', x.Phc === null ? '—' : `${dong(x.Phc)}/kg`],
      ['Giá tham khảo lúc ký', x.ptk ? `${dong(x.ptk.gia)}/kg (${x.ptk.soDon} đơn, vùng ${x.ptk.scope})` : 'Chưa đủ dữ liệu'], ['Giá tính cọc', `${dong(x.Pcoc)}/kg`]] as [string, string][] },
    { tieuDe: 'Điều 3 · Tiền', dong: [['Giá trị hợp đồng', v(x.tien.G)], ['Cọc', `${CHINH_SACH.cocBps / 100}% · ${v(x.tien.C)}`], ['Phí bên mua', v(x.tien.F)],
      ['Cách trả phần còn lại', TEN_TRA[x.d.payment_timing] + (x.d.pay_after_days ? ` (${x.d.pay_after_days} ngày)` : '')], ['Trả thẳng dự kiến', v(x.tien.traThang)]] as [string, string][],
      doan: ['Bên mua chỉ trả vào tài khoản ghi tại hợp đồng này.'] },
    { tieuDe: 'Điều 4 · Giao nhận', dong: [['Điểm nghiệm thu = điểm chuyển rủi ro', TEN_DIEM[x.diem]], ['Ai lo xe', TEN_XE[x.d.transport_by]],
      ['Thời gian giao', `${new Date(x.d.delivery_from).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} – ${new Date(x.d.delivery_to).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`]] as [string, string][] },
    { tieuDe: 'Điều 5 · Nghiệm thu', dong: [['Lỗi cho phép (trả lại không cần ảnh)', `${x.lot.reject_allowance_bps / 100}%`], ['Hao hụt đường cho phép', `${CHINH_SACH.hauHutDuongChoPhepBps / 100}%`],
      ['Điều khoản im lặng ở nơi đến', x.silent ? `Có, ${x.silent} giờ` : 'Không']] as [string, string][] },
    { tieuDe: 'Điều 6 · Thiếu, vượt lượng', doan: [`Thang phạt thiếu lượng theo % cọc phần thiếu: bất khả kháng 0%, báo trước ≥ 3 ngày 10%, báo dưới 3 ngày 50%, không báo 100%.`] },
    { tieuDe: 'Điều 7 · Tranh chấp', doan: ['Phản đối đúng dòng; cân lại trong 24 giờ; kiểm định bên thứ ba trong 48 giờ; bên sai chịu phí; không kết luận: 14 ngày rồi chuyển cơ chế khác.'] },
    { tieuDe: 'Điều 8 · Hủy', doan: ['Trước cọc: không mất tiền. Sau cọc: cọc về bên không xin hủy; phí theo bảng hoàn phí; khoản trả thẳng đã nhận người bán hoàn.'] },
    { tieuDe: 'Điều 9 · Hiệu lực', doan: [CAU_BAO_VE, 'Hiệu lực bảo vệ từ khi ngân hàng xác nhận cọc.', CAU_CHUA_HOP_DONG.replace('Đây chưa phải hợp đồng.', '')].filter(Boolean) },
  ];
}

async function layDon(t: GiaoDich, nd: NguoiDung, id: string, khoa = true) {
  const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1 ${khoa ? 'FOR UPDATE' : ''}`, [id]);
  if (!o) throw loi('KHONG_TIM_THAY');
  const phia = o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : o.seller_org_id === nd.thanhVien.orgId ? 'seller' : null;
  if (!phia) throw loi('KHONG_TIM_THAY');
  return { o, phia: phia as 'buyer' | 'seller' };
}

export async function guiDuyet(t:GiaoDich,nd:NguoiDung,id:string){
 const {o}=await layDon(t,nd,id);await appCmd(t,nd,'buyer','request_order_approval',[id]);const row=await t.mot<any>(`SELECT status,version FROM core.orders WHERE id=$1`,[id]);return {id,code:o.code,status:row.status,revision:row.version};
}

export async function duyetNoiBo(t:GiaoDich,nd:NguoiDung,id:string,dongY:boolean,lyDo?:string){
 const {o}=await layDon(t,nd,id);canQuyen(nd,'order.approve');await appCmd(t,nd,'buyer','approve_order',[id,dongY]);const r=await t.mot<any>(`SELECT status,version FROM core.orders WHERE id=$1`,[id]);return {id,code:o.code,status:r.status,revision:r.version,approved:dongY};
}

export interface KyDon { challenge_id: string; device_id?: string; commitment_ack?: boolean; abnormal_price_ack?: boolean }

/** Ký phiên bản hiện hành. OTP đã được xác minh ở giao dịch trước (auth worker); ở đây DB tiêu thụ OTP nguyên tử. */
export async function kyDon(t: GiaoDich, nd: NguoiDung, id: string, d: KyDon, version?: number) {
  const { o, phia } = await layDon(t, nd, id);
  if (version != null && o.version !== version) throw loi('REVISION_XUNG_DOT', undefined, { revision_hien_tai: o.version });
  canQuyen(nd, phia === 'buyer' ? 'order.sign.buyer' : 'order.sign.seller');
  const ver = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 ORDER BY version_no DESC LIMIT 1`, [id]);
  const doc = await t.mot<any>(`SELECT * FROM core.documents WHERE id=$1 FOR UPDATE`, [ver.document_id]);
  if (phia === 'buyer') {
    if (o.status !== 'drafting') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
    const tv = await t.mot<any>(`SELECT m.approval_limit_vnd::text lim, EXISTS(SELECT 1 FROM core.membership_roles r WHERE r.membership_id=m.id AND r.role_code='owner') la_chu
      FROM core.memberships m WHERE m.user_id=$1 AND m.org_id=$2 AND m.status='active'`, [nd.userId, nd.thanhVien.orgId]);
    const can = !tv.la_chu && (tv.lim === null || BigInt(tv.lim) < BigInt(ver.contract_value_vnd));
    if (can && !o.approved_by_user_id) throw loi('CAN_DUYET_NOI_BO');
  } else {
    if (o.status !== 'awaiting_seller') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
    if (!d.commitment_ack) throw loi('DU_LIEU_KHONG_HOP_LE', `Cần tick cam kết "Chắc chắn giao ${kg(ver.qty_min)}".`);
    if (o.flag_abnormal_price && !d.abnormal_price_ack) throw loi('CAN_XAC_NHAN_GIA_BAT_THUONG');
  }
  const login = await damBaoDangNhap(t, nd.userId, nd.thanhVien.orgId, phia);
  const thietBi = d.device_id ?? nd.thietBi ?? 'thiet-bi-chua-dang-ky';
  await t.voiDangNhap(login,()=>t.q(`SELECT cmd.sign_document($1,$2,$3,$4,$5::text[])`,[doc.id,phia,d.challenge_id,thietBi,phia==='seller'?['commitment_ack',...(d.abnormal_price_ack?['abnormal_price_ack']:[])]:[]]));
  await dongBoTaiLieu(t,doc.id,phia==='buyer'?'partially_signed':'fully_signed');
  if(phia==='buyer')await appCmd(t,nd,'buyer','send_order',[id]);
  else {const code=o.code.replace(/-/g,'');await systemCmd(t,'finalize_signed_order',[id,`AGV ${code} COC`,`THU-${code}`,'bank_sim']);}
  const row=await t.mot<any>(`SELECT status,version FROM core.orders WHERE id=$1`,[id]);const luc=new Date(t.thoiDiemMs);
  return { id, code: o.code, status: row.status, revision: row.version, signed_at: luc.toISOString(), document_id: doc.id };
}

export async function tuChoiKy(t: GiaoDich, nd: NguoiDung, id: string, lyDo?: string) {
  const { o, phia } = await layDon(t, nd, id);
  if (phia !== 'seller') throw loi('KHONG_CO_QUYEN');
  canQuyen(nd, 'order.decline');
  return dongDonTruocCoc(t, o, 'seller_declined', 'tu_choi_ky', lyDo ?? 'Người bán từ chối ký');
}

export async function rutDon(t: GiaoDich, nd: NguoiDung, id: string, lyDo?: string) {
  const { o, phia } = await layDon(t, nd, id);
  if (phia !== 'buyer') throw loi('KHONG_CO_QUYEN');
  canQuyen(nd, 'order.withdraw');
  return dongDonTruocCoc(t, o, 'cancel_before_deposit', 'rut_don', lyDo ?? 'Bên mua rút đơn');
}

/** Đóng đơn trước cọc: đơn → closed, giữ lượng hủy (lượng về lô), tài liệu hủy, hạn hủy. */
export async function dongDonTruocCoc(t:GiaoDich,o:any,lyDoDong:string,lenh:string,lyDo:string){
 const u=await t.gtri<string>(`SELECT current_setting('app.user_id',true)`), org=await t.gtri<string>(`SELECT current_setting('app.org_id',true)`);
 const side=o.buyer_org_id===org?'buyer':'seller';const login=await damBaoDangNhap(t,u,org,side);
 await loginCmd(t,login,'close_unsigned_order',[o.id,lyDoDong]);const r=await t.mot<any>(`SELECT status,version FROM core.orders WHERE id=$1`,[o.id]);
 // DB chỉ lưu mã lý do (seller_declined/cancel_before_deposit); lời giải thích cụ thể giữ trong sự kiện bất biến của đơn (B18).
 await phat(t,'order',o.id,'don.dong_truoc_coc',{ma_ly_do:lyDoDong,ly_do:lyDo,ben:side});
 return {id:o.id,code:o.code,status:r.status,revision:r.version,close_reason:lyDoDong,ly_do_dong:lyDo};
}

// ---------------- Xem đơn ----------------

const TEN_TRANG_THAI: Record<string, string> = {
  drafting: 'Đang soạn hợp đồng', internal_approval: 'Chờ quản lý duyệt', awaiting_seller: 'Chờ người bán ký', awaiting_deposit: 'Chờ cọc',
  active: 'Đã cọc · đang thực hiện', awaiting_settlement: 'Chờ quyết toán', outstanding: 'Đã giao xong · còn công nợ', completed: 'Hoàn tất', closed: 'Đã đóng',
};
const TEN_LY_DO_DONG: Record<string, string> = {
  seller_declined: 'Người bán từ chối', sign_expired: 'Quá hạn ký', deposit_expired: 'Quá hạn cọc', cancel_before_deposit: 'Hủy trước cọc',
  cancel_after_deposit: 'Hủy sau cọc', force_majeure: 'Hủy do bất khả kháng', seller_no_delivery: 'Người bán không giao', buyer_no_pickup: 'Bên mua không nhận',
};

/** Trạng thái hiển thị và chặng (03 mục 14). */
export async function trangThaiHienThi(t: GiaoDich, o: any): Promise<{ ten: string; chang: string | null; toi_luot: { phia: string; viec: string } | null }> {
  if (o.status === 'closed') return { ten: `Đã đóng · ${TEN_LY_DO_DONG[o.close_reason] ?? o.close_reason}`, chang: null, toi_luot: null };
  if (o.status === 'completed') return { ten: 'Hoàn tất', chang: 'Xong', toi_luot: null };
  const tranhChap = Number(await t.gtri(`SELECT count(*) FROM core.disputes WHERE order_id=$1 AND status<>'resolved'`, [o.id])) > 0;
  if (tranhChap) return { ten: 'Đã chốt phần không tranh chấp · đang xử lý phần còn lại', chang: 'Giao nhận', toi_luot: { phia: 'ops', viec: 'Xử lý tranh chấp' } };
  if (o.status === 'outstanding') {
    const no = await t.mot<any>(`SELECT direction, (amount_due_vnd - coalesce((SELECT sum(amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0))::text con FROM core.direct_payments p WHERE order_id=$1 AND kind IN ('settlement_buyer_balance','seller_refund') AND status NOT IN ('fully_received','cancelled') LIMIT 1`, [o.id]);
    if (no) return { ten: `Đã giao xong · còn công nợ (${no.direction === 'seller_to_buyer' ? 'người bán còn phải hoàn' : 'bên mua còn phải trả'} ${dong(no.con)})`, chang: 'Thanh toán', toi_luot: { phia: no.direction === 'seller_to_buyer' ? 'seller' : 'buyer', viec: 'Trả công nợ' } };
    return { ten: 'Đã giao xong · còn công nợ', chang: 'Thanh toán', toi_luot: null };
  }
  if (o.status === 'awaiting_settlement') {
    const lenh = Number(await t.gtri(`SELECT count(*) FROM core.bank_instructions WHERE order_id=$1 AND status IN ('sent','processing')`, [o.id]));
    return { ten: lenh > 0 ? 'Đã gửi lệnh cọc' : 'Quyết toán', chang: 'Thanh toán', toi_luot: { phia: 'bank', viec: 'Ngân hàng xử lý lệnh' } };
  }
  if (o.status === 'active') {
    const dots = await t.q<any>(`SELECT status FROM core.deliveries WHERE order_id=$1 ORDER BY batch_no`, [o.id]);
    const st = new Set(dots.map((x) => x.status));
    const chuaTraTruocBoc = Number(await t.gtri(`SELECT count(*) FROM core.direct_payments p WHERE order_id=$1 AND blocks_loading AND status NOT IN ('fully_received','cancelled')`, [o.id])) > 0;
    if (st.has('awaiting_seller')) return { ten: 'Chờ xác nhận số cân', chang: 'Giao nhận', toi_luot: { phia: 'seller', viec: 'Xác nhận kết quả nghiệm thu' } };
    if (st.has('checking') || st.has('arrival_check')) return { ten: 'Chờ nghiệm thu', chang: 'Giao nhận', toi_luot: { phia: 'buyer', viec: 'Nghiệm thu' } };
    if (st.has('in_transit') || st.has('arrived')) return { ten: 'Đang giao', chang: 'Giao nhận', toi_luot: { phia: 'buyer', viec: 'Ký nhận tại nơi đến' } };
    if (st.has('ready')) return { ten: 'Sẵn sàng giao', chang: 'Giao nhận', toi_luot: { phia: 'seller', viec: 'Giao hàng, quét QR nhận hàng' } };
    if (chuaTraTruocBoc) return { ten: 'Đã cọc, chờ giao', chang: 'Thanh toán', toi_luot: { phia: 'buyer', viec: 'Trả khoản trước bốc' } };
    return { ten: 'Đã cọc, chờ giao', chang: 'Giao nhận', toi_luot: { phia: 'buyer', viec: 'Chỉ định người nhận, đặt xe' } };
  }
  if (o.status === 'awaiting_deposit') return { ten: 'Chờ cọc', chang: 'Cọc', toi_luot: { phia: 'buyer', viec: 'Chuyển cọc' } };
  if (o.status === 'awaiting_seller') return { ten: 'Chờ người bán ký', chang: 'Ký', toi_luot: { phia: 'seller', viec: 'Ký hợp đồng' } };
  if (o.status === 'internal_approval') return { ten: 'Chờ quản lý duyệt', chang: 'Ký', toi_luot: { phia: 'buyer', viec: 'Quản lý duyệt' } };
  return { ten: TEN_TRANG_THAI[o.status] ?? o.status, chang: 'Ký', toi_luot: { phia: 'buyer', viec: 'Ký và gửi' } };
}

export async function xemDon(t: GiaoDich, nd: NguoiDung, id: string) {
  const { o, phia } = await layDon(t, nd, id, false);
  canQuyen(nd, phia === 'buyer' ? 'order.view.buyer' : 'order.view.seller');
  const v = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=coalesce($2,(SELECT max(version_no) FROM core.order_versions WHERE order_id=$1))`, [id, o.effective_version_no]);
  const hien = await trangThaiHienThi(t, o);
  const buyer = await t.mot<any>(`SELECT code, display_name FROM core.organizations WHERE id=$1`, [o.buyer_org_id]);
  const seller = await t.mot<any>(`SELECT code, display_name FROM core.organizations WHERE id=$1`, [o.seller_org_id]);
  const han = await t.q<any>(`SELECT id,kind,entity,due_at,status FROM core.deadlines WHERE (order_id=$1 OR entity_id=$1) AND status='open' ORDER BY due_at`, [id]);
  const lichSu = await t.q<any>(`SELECT entity,from_status,to_status,actor_kind,command,reason,at FROM evt.state_history WHERE entity_id=$1 OR entity_id IN (SELECT id FROM core.deliveries WHERE order_id=$1) ORDER BY id`, [id]);
  const taiLieu = await t.q<any>(`SELECT id,code,doc_type,version_no,status,encode(content_sha256,'hex') content_sha256,encode(file_sha256,'hex') file_sha256,created_at FROM core.documents WHERE order_id=$1 AND doc_type<>'evidence' ORDER BY created_at`, [id]);
  const {danhSachBanTrinhBay}=await import('../pdf/ban-trinh-bay.ts');
  for(const doc of danhSachBanTrinhBay(id)){if(await t.mot(`SELECT 1 FROM core.settlements WHERE id=$1 AND order_id=$2`,[doc.canonical_content.settlement_id,id]))taiLieu.push(doc);}
  const dots = await t.q<any>(`SELECT id,code,batch_no,planned_qty::text planned_qty_g,status,version revision,receiver_user_id,lower(delivery_window) window_from,upper(delivery_window) window_to FROM core.deliveries WHERE order_id=$1 ORDER BY batch_no`, [id]);
  const lien = await t.mot<any>(`SELECT mode FROM core.contact_grants WHERE order_id=$1 AND revoked_at IS NULL`, [id]);
  return {
    id: o.id, code: o.code, status: o.status, revision: o.version, close_reason: o.close_reason, phia_cua_ban: phia,
    ly_do_dong: o.status === 'closed' ? await t.gtri<string>(`SELECT payload->>'ly_do' FROM evt.domain_events WHERE aggregate_id=$1 AND event_type='don.dong_truoc_coc' ORDER BY seq DESC LIMIT 1`, [id]) : null,
    dot_hien_hanh_id: await t.gtri<string>(`SELECT id FROM core.deliveries WHERE order_id=$1 AND status NOT IN ('closed','shortfall_ended','cancelled') ORDER BY batch_no LIMIT 1`, [id]),
    hien_thi: hien, buyer, seller, effective_version_no: o.effective_version_no,
    co: { gia_bat_thuong: o.flag_abnormal_price, vi_pham_thanh_toan: o.flag_payment_violation,
      de_nghi_mo: Number(await t.gtri(`SELECT count(*) FROM core.amendments WHERE order_id=$1 AND status='open'`, [id])) > 0,
      dang_xin_huy: Number(await t.gtri(`SELECT count(*) FROM core.cancellation_requests WHERE order_id=$1 AND status='awaiting_reply'`, [id])) > 0 },
    dieu_khoan: v ? {
      version_no: v.version_no, qty_g: v.qty_min.toString(), unit_price_vnd: s(B(v.unit_price_vnd)), downgrade_price_vnd: v.downgrade_price_vnd == null ? null : s(B(v.downgrade_price_vnd)),
      ref_price_vnd: v.ref_price_vnd == null ? null : String(v.ref_price_vnd), deposit_price_vnd: String(v.deposit_price_vnd), contract_value_vnd: String(v.contract_value_vnd),
      deposit_vnd: String(v.deposit_vnd), fee_vnd: String(v.fee_vnd), payment_timing: v.payment_timing, pay_after_days: v.pay_after_days,
      delivery_mode: v.delivery_mode, acceptance_point: v.acceptance_point, transport_by: v.transport_by,
      delivery_from: v.delivery_window ? null : null, seller_account: { bank_code: v.seller_bank_code, masked: v.seller_account_masked, holder: v.seller_account_holder },
      designated_receiver_user_id: v.designated_receiver_user_id, silent_accept_hours: v.silent_accept_hours, reject_allowance_bps: v.reject_allowance_bps,
    } : null,
    lien_lac: lien?.mode ?? 'chua_mo', dot_giao: dots, han, lich_su: lichSu, tai_lieu: taiLieu,
    ky: await trangThaiKy(t, nd, o, phia, v),
    hanh_dong: hanhDongDon(nd, o, phia, await trangThaiKy(t, nd, o, phia, v)),
  };
}

/** Người đang xem có ký được không (vai, hạn mức, duyệt nội bộ). Giao diện dùng để giải thích trước khi gửi OTP. */
async function trangThaiKy(t: GiaoDich, nd: NguoiDung, o: any, phia: string, v: any) {
  if (phia === 'seller') {
    const duoc = o.status === 'awaiting_seller' && duocPhep(nd, 'order.sign.seller');
    return { duoc_ky: duoc, can_duyet_noi_bo: false, da_duyet: null, han_muc_vnd: null, gia_tri_vnd: v ? String(v.contract_value_vnd) : null, ly_do: duoc ? null : (nd.thanhVien.nguoiGiup ? 'Người giúp không ký được' : o.status !== 'awaiting_seller' ? 'Chưa tới lượt người bán ký' : 'Vai không có quyền ký') };
  }
  const tv = await t.mot<any>(`SELECT m.approval_limit_vnd::text lim, EXISTS(SELECT 1 FROM core.membership_roles r WHERE r.membership_id=m.id AND r.role_code='owner') la_chu FROM core.memberships m WHERE m.user_id=$1 AND m.org_id=$2 AND m.status='active'`, [nd.userId, nd.thanhVien.orgId]);
  const gt = v ? BigInt(v.contract_value_vnd) : 0n;
  const can = !!tv && !tv.la_chu && (tv.lim === null || BigInt(tv.lim) < gt);
  const daDuyet = !!o.approved_by_user_id;
  const quyen = duocPhep(nd, 'order.sign.buyer');
  const duoc = o.status === 'drafting' && quyen && (!can || daDuyet);
  return { duoc_ky: duoc, can_duyet_noi_bo: can, da_duyet: daDuyet, han_muc_vnd: tv?.lim ?? null, gia_tri_vnd: v ? String(v.contract_value_vnd) : null,
    ly_do: duoc ? null : !quyen ? 'Vai không có quyền ký' : o.status !== 'drafting' ? 'Đơn không ở bước bên mua ký' : 'Giá trị vượt hạn mức: cần quản lý (khác người lập) duyệt trước' };
}

function hanhDongDon(nd: NguoiDung, o: any, phia: string, ky?: { duoc_ky: boolean; can_duyet_noi_bo: boolean; da_duyet: boolean | null }): string[] {
  const out: string[] = [];
  if (phia === 'buyer') {
    if (o.status === 'drafting') {
      if (ky ? ky.duoc_ky : duocPhep(nd, 'order.sign.buyer')) out.push('sign');
      if (duocPhep(nd, 'order.create')) { if (!ky || (ky.can_duyet_noi_bo && !ky.da_duyet)) out.push('submit_approval'); out.push('withdraw'); }
    }
    if (o.status === 'internal_approval' && duocPhep(nd, 'order.approve') && o.created_by_user_id !== nd.userId) out.push('approve', 'reject_approval');
    if (o.status === 'awaiting_seller' && duocPhep(nd, 'order.withdraw')) out.push('withdraw');
    if (o.status === 'awaiting_deposit') { if (duocPhep(nd, 'money.pay.buyer')) out.push('deposit_instruction'); if (duocPhep(nd, 'cancel.buyer')) out.push('cancel'); }
    if (o.status === 'active' && duocPhep(nd, 'cancel.buyer')) out.push('request_cancel');
  } else {
    if (o.status === 'awaiting_seller' && duocPhep(nd, 'order.sign.seller')) out.push('sign', 'decline');
    if (o.status === 'awaiting_deposit' && duocPhep(nd, 'cancel.seller')) out.push('cancel');
    if (o.status === 'active' && duocPhep(nd, 'cancel.seller')) out.push('request_cancel');
  }
  return out;
}

export async function danhSachDon(t: GiaoDich, nd: NguoiDung) {
  const ds = await t.q<any>(`SELECT o.id,o.code,o.status,o.version revision,o.buyer_org_id,o.seller_org_id,o.close_reason,
      (SELECT contract_value_vnd::text FROM core.order_versions v WHERE v.order_id=o.id ORDER BY version_no DESC LIMIT 1) contract_value_vnd,
      b.display_name buyer_name, s.display_name seller_name, o.created_at
      FROM core.orders o JOIN core.organizations b ON b.id=o.buyer_org_id JOIN core.organizations s ON s.id=o.seller_org_id
      WHERE (o.buyer_org_id=$1 OR o.seller_org_id=$1) ORDER BY o.created_at DESC LIMIT 200`, [nd.thanhVien.orgId]);
  const out = [];
  for (const o of ds) out.push({ id: o.id, code: o.code, status: o.status, revision: o.revision, buyer_name: o.buyer_name, seller_name: o.seller_name,
    contract_value_vnd: o.contract_value_vnd, phia_cua_ban: o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : 'seller', hien_thi: await trangThaiHienThi(t, o) });
  return out;
}

/** Dự thảo/dữ liệu demo không có nội dung chuẩn hóa đủ: tóm tắt từ phiên bản điều khoản trong DB, không sửa tài liệu đã băm. */
async function theTuPhienBan(t: GiaoDich, o: any, id: string, sha: string | null) {
  const v = await t.mot<any>(`SELECT v.*, p.name_vi, (SELECT contract_type FROM core.orders WHERE id=v.order_id) loai FROM core.order_versions v JOIN core.orders oo ON oo.id=v.order_id JOIN core.products p ON p.id=oo.product_id
    WHERE v.order_id=$1 ORDER BY (v.version_no=coalesce(oo.effective_version_no,1)) DESC, v.version_no DESC LIMIT 1`, [id]);
  if (!v) throw loi('KHONG_TIM_THAY', 'Đơn chưa có điều khoản.');
  const f = v.price_formula; const luong = B(v.qty_min) === B(v.qty_max) ? kg(B(v.qty_min)) : `${kg(B(v.qty_min))} – ${kg(B(v.qty_max))}`;
  const gia = v.price_mode === 'formula' && f ? `Theo công thức: sàn ${dong(B(String(f.floor)))}/kg${f.cap ? `, trần ${dong(B(String(f.cap)))}/kg` : ''}${f.ref_bps ? `, ${f.ref_bps / 100}% giá tham khảo` : ''}${f.share_bps ? `, cộng ${f.share_bps / 100}% phần tham khảo vượt sàn` : ''} (vùng ${f.scope ?? '—'})` : `${dong(B(v.unit_price_vnd))}/kg`;
  return {
    order_id: id, code: o.code, content_sha256: sha, nguon_noi_dung: 'phien_ban_dieu_khoan_db',
    canh_bao: 'Tài liệu hợp đồng chưa có nội dung đầy đủ (dự thảo/dữ liệu mô phỏng); thẻ dựng từ điều khoản trong hệ thống. Không phải bản đã ký.',
    the: [
      { so: 1, tieu_de: 'Hàng', noi_dung: `${v.name_vi}, ${luong}, dung sai ±${v.qty_tolerance_bps / 100}%` },
      { so: 2, tieu_de: 'Giá', noi_dung: `${gia}; hạ cấp ${v.downgrade_price_vnd ? dong(B(v.downgrade_price_vnd)) + '/kg' : '—'}` },
      { so: 3, tieu_de: 'Tiền', noi_dung: `Giá trị ${dong(B(v.contract_value_vnd))}; cọc ${dong(B(v.deposit_vnd))}${v.deposit_rule === 'per_unit' ? ' (cọc vụ)' : ''}; phí ${dong(B(v.fee_vnd))}; ${TEN_TRA[v.payment_timing] ?? v.payment_timing}${v.pay_after_days ? ` ${v.pay_after_days} ngày` : ''}` },
      { so: 4, tieu_de: 'Giao nhận', noi_dung: `${TEN_DIEM[v.acceptance_point] ?? v.acceptance_point} (điểm chuyển rủi ro); ${TEN_XE[v.transport_by] ?? v.transport_by}` },
      { so: 5, tieu_de: 'Nghiệm thu', noi_dung: `Lỗi cho phép ${v.reject_allowance_bps / 100}%; im lặng ở nơi đến: ${v.silent_accept_hours ? v.silent_accept_hours + ' giờ' : 'không'}` },
      { so: 6, tieu_de: 'Thiếu, vượt lượng', noi_dung: v.loai === 'offtake' || v.loai === 'pre_harvest' ? 'Mất mùa giảm lượng bằng phụ lục có chứng cứ; thiếu khác phạt theo % cọc phần thiếu' : 'Phạt theo % cọc phần thiếu: 0% / 10% / 50% / 100%' },
      { so: 7, tieu_de: 'Tranh chấp', noi_dung: 'Cân lại 24 giờ, kiểm định 48 giờ, bên sai chịu phí' },
      { so: 8, tieu_de: 'Hủy', noi_dung: 'Cọc về bên không xin hủy; phí theo bảng hoàn' },
    ],
    cau_bat_buoc: CAU_BAO_VE,
  };
}

/** 8 thẻ tóm tắt điều khoản (07 mục 5.1), đọc từ nội dung chuẩn hóa đã băm của phiên bản hiện hành. */
export async function tomTatDieuKhoan(t: GiaoDich, nd: NguoiDung, id: string) {
  const { o } = await layDon(t, nd, id, false);
  const doc = await t.mot<any>(`SELECT d.canonical_content, encode(d.content_sha256,'hex') sha FROM core.order_versions v JOIN core.documents d ON d.id=v.document_id WHERE v.order_id=$1 ORDER BY v.version_no DESC LIMIT 1`, [id]);
  const c = doc?.canonical_content;
  if (!c?.hang || !c?.gia || !c?.tien || !c?.giao || !c?.nghiem_thu) return theTuPhienBan(t, o, id, doc?.sha ?? null);
  return {
    order_id: id, code: o.code, content_sha256: doc.sha, nguon_noi_dung: 'hop_dong_da_bam',
    the: [
      { so: 1, tieu_de: 'Hàng', noi_dung: `${c.hang.ten} loại ${c.hang.loai}, ${kg(c.hang.luong_g)}, dung sai ±${c.hang.dung_sai_bps / 100}%` },
      { so: 2, tieu_de: 'Giá', noi_dung: `${dong(c.gia.gia_don)}/kg; hạ cấp ${c.gia.gia_ha_cap ? dong(c.gia.gia_ha_cap) + '/kg' : '—'}; giá tính cọc ${dong(c.gia.gia_tinh_coc)}/kg` },
      { so: 3, tieu_de: 'Tiền', noi_dung: `Giá trị ${dong(c.tien.gia_tri)}; cọc ${dong(c.tien.coc)}; phí ${dong(c.tien.phi)}; ${TEN_TRA[c.tien.cach_tra]}; trả thẳng dự kiến ${dong(c.tien.tra_thang_du_kien)}` },
      { so: 4, tieu_de: 'Giao nhận', noi_dung: `${TEN_DIEM[c.giao.diem_nghiem_thu]} (điểm chuyển rủi ro); ${TEN_XE[c.giao.ai_lo_xe]}` },
      { so: 5, tieu_de: 'Nghiệm thu', noi_dung: `Lỗi cho phép ${c.nghiem_thu.loi_cho_phep_bps / 100}%; im lặng ở nơi đến: ${c.nghiem_thu.im_lang_gio ? c.nghiem_thu.im_lang_gio + ' giờ' : 'không'}` },
      { so: 6, tieu_de: 'Thiếu, vượt lượng', noi_dung: 'Phạt theo % cọc phần thiếu: 0% / 10% / 50% / 100%' },
      { so: 7, tieu_de: 'Tranh chấp', noi_dung: 'Cân lại 24 giờ, kiểm định 48 giờ, bên sai chịu phí' },
      { so: 8, tieu_de: 'Hủy', noi_dung: 'Cọc về bên không xin hủy; phí theo bảng hoàn' },
    ],
    cau_bat_buoc: CAU_BAO_VE,
  };
}
