// Hợp đồng khung theo tuần (người sáng lập chốt 02/11/2026: ưu tiên — nhà hàng/quán ăn/đại lý mua định kỳ).
// Bước 1: lập khung (lịch món + ngày giao trong tuần), hai bên ký OTP, cọc khung ở ngân hàng, kích hoạt khi ngân hàng nhận đủ.
// Chính sách: trả gộp cuối tuần, cọc khung phủ đủ phần chưa trả trong tuần (cọc = giá trị một tuần lịch);
// KHÔNG cho nợ thêm ngoài cọc (không mở cmd.grant_framework_credit); giá chốt lại mỗi tuần (bước 2).
// Mọi ghi qua cmd.* dưới login riêng (appCmd/systemCmd), không DML trực tiếp.
import { appCmd, systemCmd } from '../db/command.ts';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { canQuyen } from '../auth/quyen.ts';
import { damBaoDangNhap } from '../db/dang-nhap-rieng.ts';
import { loi } from '../loi.ts';
import { dong, kg, maMoi, soGam, dongBoTaiLieu } from './chung.ts';
import { B } from './tinh-tien.ts';
import { taoTaiLieuPdf } from '../pdf/tai-lieu-pdf.ts';

const THU = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export interface LapKhung {
  seller_org_id: string;
  ngay_giao: number[];               // 0=CN..6=T7, vd [1,4] = thứ 2 và thứ 5
  tu_ngay: string; den_ngay: string; // kỳ khung (YYYY-MM-DD), vd 4 tuần
  mon: { product_code: string; grade_code: string; kg_moi_lan: number; gia_vnd: number; gia_ha_cap_vnd?: number | null }[];
}

export async function lapKhung(t: GiaoDich, nd: NguoiDung, d: LapKhung) {
  canQuyen(nd, 'order.create');
  if (!Array.isArray(d.ngay_giao) || !d.ngay_giao.length || d.ngay_giao.some((x) => !(Number.isInteger(x) && x >= 0 && x <= 6))) throw loi('DU_LIEU_KHONG_HOP_LE', 'Chọn ngày giao trong tuần (thứ 2…CN).');
  if (!Array.isArray(d.mon) || !d.mon.length) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần ít nhất một món trong lịch.');
  if (!(d.tu_ngay < d.den_ngay)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Ngày kết thúc khung phải sau ngày bắt đầu.');
  const seller = await t.mot<any>(`SELECT id, code, display_name FROM core.organizations WHERE id=$1 AND can_sell AND status='active'`, [d.seller_org_id]);
  if (!seller) throw loi('KHONG_TIM_THAY', 'Không tìm thấy người bán.');
  const buyer = await t.mot<any>(`SELECT id, code, display_name FROM core.organizations WHERE id=$1`, [nd.thanhVien.orgId]);
  const bank = await t.mot<any>(`SELECT id, bank_code, account_masked, holder_name FROM pii.bank_accounts WHERE org_id=$1 AND status='active' ORDER BY activated_at DESC NULLS LAST LIMIT 1`, [seller.id]);
  if (!bank) throw loi('TAI_KHOAN_DANG_CHO', 'Người bán chưa có tài khoản nhận tiền đang hoạt động.');
  const segment = (await t.gtri<string>(`SELECT segment_code FROM core.org_buyer_segments WHERE org_id=$1 ORDER BY 1 LIMIT 1`, [buyer.id])) ?? 'restaurant';
  const items: any[] = []; let moiLan = 0n;
  for (const m of d.mon) {
    const p = await t.mot<any>(`SELECT id, name_vi, current_profile_version pv FROM core.products WHERE code=$1`, [m.product_code]);
    if (!p) throw loi('DU_LIEU_KHONG_HOP_LE', `Mặt hàng ${m.product_code} không có trong danh mục.`);
    const qty = soGam(Math.round(m.kg_moi_lan * 1000), 'kg_moi_lan'); const gia = B(String(Math.round(m.gia_vnd)));
    const hc = m.gia_ha_cap_vnd == null ? null : B(String(Math.round(m.gia_ha_cap_vnd)));
    if (gia <= 0n || qty <= 0n) throw loi('DU_LIEU_KHONG_HOP_LE', 'Lượng và giá mỗi món phải lớn hơn 0.');
    if (hc !== null && (hc < 0n || hc >= gia)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Giá xuống loại phải nhỏ hơn giá món.');
    items.push({ product_id: p.id, profile_version: p.pv, grade_code: m.grade_code, qty: qty.toString(), unit_price_vnd: gia.toString(), downgrade_price_vnd: hc?.toString() ?? null, _ten: p.name_vi });
    moiLan += (qty * gia) / 1000n;
  }
  // Cọc khung phủ đủ phần chưa trả của MỘT TUẦN (trả gộp cuối tuần) = giá trị mỗi lần × số buổi/tuần.
  const coc = moiLan * BigInt(new Set(d.ngay_giao).size);
  const code = await maMoi(t, 'core.framework_contracts', 'KH', 2101);
  const dieuKhoan = { loai: 'khung_tuan', ben_mua: buyer.display_name, ben_ban: seller.display_name, ngay_giao: d.ngay_giao, ky: [d.tu_ngay, d.den_ngay],
    mon: items.map((x) => ({ mat_hang: x._ten, loai: x.grade_code, luong_g: x.qty, gia_vnd: x.unit_price_vnd, gia_ha_cap_vnd: x.downgrade_price_vnd })),
    coc_khung_vnd: coc.toString(), thanh_toan: 'gộp cuối tuần, trong 72 giờ sau kỳ', gia: 'chốt lại mỗi tuần; không đồng ý giá tuần thì tuần đó tạm dừng', no_them_ngoai_coc: 'không' };
  const doc = await taoTaiLieuPdf(t, {
    docType: 'framework_contract', code: `${code}-HDK`, seriesKey: `${code}-HDK`, versionNo: 1, orderId: null, ownerOrgId: buyer.id,
    noiDung: dieuKhoan, status: 'awaiting_signature', createdBy: nd.userId,
    trinhBay: { loai: 'HD', tieuDe: 'HỢP ĐỒNG KHUNG MUA ĐỊNH KỲ THEO TUẦN', muc: [
      { tieuDe: 'Các bên', dong: [['Bên mua', buyer.display_name], ['Bên bán', seller.display_name], ['Tài khoản nhận tiền', `${bank.bank_code} ${bank.account_masked}`]] },
      { tieuDe: 'Lịch giao', dong: [['Ngày giao', d.ngay_giao.map((x) => THU[x]).join(', ')], ['Kỳ khung', `${d.tu_ngay} → ${d.den_ngay}`]] },
      { tieuDe: 'Món mỗi lần giao', bang: { cot: ['Món', 'Loại', 'Lượng', 'Giá', 'Giá xuống loại'], hang: items.map((x) => [x._ten, x.grade_code, kg(B(x.qty)), dong(B(x.unit_price_vnd)), x.downgrade_price_vnd ? dong(B(x.downgrade_price_vnd)) : '—']) } },
      { tieuDe: 'Tiền', dong: [['Giá trị mỗi lần giao', dong(moiLan)], ['Cọc khung (ngân hàng giữ, phủ một tuần)', dong(coc)], ['Thanh toán', 'Gộp cuối tuần, trong 72 giờ'], ['Nợ thêm ngoài cọc', 'Không'], ['Giá', 'Chốt lại mỗi tuần']] },
    ] },
  });
  const data = { code, seller_org_id: seller.id, segment_code: segment,
    schedule: { weekdays: [...new Set(d.ngay_giao)].sort(), items: items.map(({ _ten, ...x }) => x) },
    price_period: 'week', billing_period: 'week', framework_deposit_vnd: coc.toString(), active_during: `[${d.tu_ngay},${d.den_ngay})` };
  const id = await appCmd<string>(t, nd, 'buyer', 'create_framework', [data, doc.payload, bank.id]);
  return { id, code, coc_khung_vnd: coc.toString(), gia_tri_moi_lan_vnd: moiLan.toString(), trang_thai: 'drafting' };
}

async function layKhung(t: GiaoDich, nd: NguoiDung, id: string) {
  const f = await t.mot<any>(`SELECT f.*, ft.document_id, ft.period_value_vnd::text gia_tri_ky, ft.seller_bank_code, ft.seller_account_masked FROM core.framework_contracts f LEFT JOIN core.framework_terms ft ON ft.framework_id=f.id WHERE f.id=$1`, [id]);
  if (!f) throw loi('KHONG_TIM_THAY');
  const phia = f.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : f.seller_org_id === nd.thanhVien.orgId ? 'seller' : null;
  if (!phia) throw loi('KHONG_TIM_THAY');
  return { f, phia: phia as 'buyer' | 'seller' };
}

/** Ký khung (OTP contract_sign đã xác minh ở route). Bên mua ký → gửi; người bán ký → chốt, mở cọc khung ở ngân hàng. */
export async function kyKhung(t: GiaoDich, nd: NguoiDung, id: string, d: { challenge_id: string; device_id?: string }) {
  const { f, phia } = await layKhung(t, nd, id);
  canQuyen(nd, phia === 'buyer' ? 'order.sign.buyer' : 'order.sign.seller');
  if (phia === 'buyer' && f.status !== 'drafting') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Khung không còn ở bước bên mua ký.');
  if (phia === 'seller' && f.status !== 'awaiting_signature') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Chưa tới lượt người bán ký khung.');
  const login = await damBaoDangNhap(t, nd.userId, nd.thanhVien.orgId, phia);
  await t.voiDangNhap(login, () => t.q(`SELECT cmd.sign_document($1,$2,$3,$4,$5::text[])`, [f.document_id, phia, d.challenge_id, d.device_id ?? nd.thietBi ?? 'thiet-bi', phia === 'seller' ? ['commitment_ack'] : []]));
  if (phia === 'buyer') await appCmd(t, nd, 'buyer', 'send_framework', [id]);
  else {
    const ma = String(f.code).replace(/-/g, '');
    await appCmd(t, nd, 'seller', 'finalize_framework', [id, `AGV ${ma} COC`, `THU-${ma}`, 'ngan-hang-thu']);
    await dongBoTaiLieu(t, f.document_id, 'fully_signed');
  }
  return xemKhung(t, nd, id);
}

/** Ngân hàng báo nhận đủ cọc khung → kích hoạt (gọi từ webhook). */
export async function kichHoatKhung(t: GiaoDich, frameworkId: string) {
  await systemCmd(t, 'activate_framework', [frameworkId]);
}

export async function xemKhung(t: GiaoDich, nd: NguoiDung, id: string) {
  const { f, phia } = await layKhung(t, nd, id);
  const dep = await t.mot<any>(`SELECT status, payment_ref, virtual_account_no, expected_deposit_vnd::text coc_vnd FROM core.deposits WHERE framework_id=$1 ORDER BY created_at DESC LIMIT 1`, [id]);
  const ten = await t.q<any>(`SELECT id, name_vi, code FROM core.products WHERE id = ANY($1::uuid[])`, [(f.schedule?.items ?? []).map((x: any) => x.product_id)]);
  const tenSp = new Map(ten.map((x: any) => [x.id, x.name_vi]));
  const maSp = new Map(ten.map((x: any) => [x.id, x.code]));
  const buyer = await t.gtri<string>(`SELECT display_name FROM core.organizations WHERE id=$1`, [f.buyer_org_id]);
  const seller = await t.gtri<string>(`SELECT display_name FROM core.organizations WHERE id=$1`, [f.seller_org_id]);
  const TT: Record<string, string> = { drafting: 'Bên mua đang soạn', awaiting_signature: 'Chờ người bán ký', awaiting_deposit: 'Chờ bên mua chuyển cọc khung', running: 'Đang chạy', needs_security: 'Tạm dừng: nợ vượt cọc', closed: 'Đã kết thúc' };
  const toiLuot = f.status === 'drafting' ? 'buyer' : f.status === 'awaiting_signature' ? 'seller' : f.status === 'awaiting_deposit' ? 'buyer' : null;
  return {
    id: f.id, code: f.code, seller_org_id: f.seller_org_id, buyer_org_id: f.buyer_org_id, status: f.status, ten_trang_thai: TT[f.status] ?? f.status, phia, toi_luot: toiLuot, ben_mua: buyer, ben_ban: seller,
    ngay_giao: f.schedule?.weekdays ?? null, ky: (() => { const c = String(f.active_during), m = c.match(/^[\[(]"?([^,"]*)"?,"?([^,"\])]*)"?[\])]$/); return { tu: f.active_during?.lower ?? (m?.[1] || null), den: f.active_during?.upper ?? (m?.[2] || null), chuoi: c }; })(), // pg trả daterange dạng chuỗi '[a,b)'
    mon: (f.schedule?.items ?? []).map((x: any) => ({ mat_hang: tenSp.get(x.product_id), ma: maSp.get(x.product_id), loai: x.grade_code, luong_g: x.qty, gia_vnd: x.unit_price_vnd, gia_ha_cap_vnd: x.downgrade_price_vnd })),
    gia_tri_moi_lan_vnd: f.gia_tri_ky, coc_khung_vnd: String(f.framework_deposit_vnd), tai_khoan_ban: f.seller_bank_code ? `${f.seller_bank_code} ${f.seller_account_masked}` : null, document_id: f.document_id,
    nhap_tu_du_lieu_cu: !f.document_id, // khung nạp thẳng từ dữ liệu cũ (chưa có văn bản ký trên app)
    gia_tuan: await giaTuanCuaKhung(t, id),
    han_muc: await t.mot<any>(`SELECT allowed_vnd::text duoc_vnd, used_vnd::text dang_dung_vnd, greatest(allowed_vnd-used_vnd,0)::text con_vnd FROM core.v_framework_limits WHERE id=$1`, [id]),
    buoi: await t.q<any>(`SELECT o.id, o.code, o.status, v.contract_value_vnd::text gia_tri_vnd, (SELECT min(lower(d.delivery_window)) FROM core.deliveries d WHERE d.order_id=o.id) ngay_giao,
      EXISTS(SELECT 1 FROM core.settlements s WHERE s.order_id=o.id AND s.is_final) da_quyet_toan
      FROM core.orders o JOIN core.order_versions v ON v.order_id=o.id AND v.version_no=o.effective_version_no WHERE o.framework_id=$1 ORDER BY 5`, [id]),
    ky_tuan: await t.q<any>(`SELECT p.id, lower(p.period) tu, upper(p.period) den, p.value_vnd::text gia_tri_vnd, p.fee_vnd::text phi_vnd, p.payment_id, dp.status trang_thai_tra, dp.due_at han_tra FROM core.framework_periods p LEFT JOIN core.direct_payments dp ON dp.id=p.payment_id WHERE p.framework_id=$1 ORDER BY p.period`, [id]),
    coc: dep ? { trang_thai: dep.status, payment_ref: dep.payment_ref, virtual_account_no: dep.virtual_account_no, so_tien_vnd: dep.coc_vnd } : null,
  };
}

export async function dsKhung(t: GiaoDich, nd: NguoiDung) {
  const ids = await t.q<any>(`SELECT id FROM core.framework_contracts WHERE buyer_org_id=$1 OR seller_org_id=$1 ORDER BY created_at DESC`, [nd.thanhVien.orgId]);
  return Promise.all(ids.map((x: any) => xemKhung(t, nd, x.id)));
}

// ---------------- Bước 2: giá chốt lại mỗi tuần (0084) ----------------
/** Thứ 2 đầu tuần (giờ VN) của một ngày YYYY-MM-DD. */
export function dauTuan(ngay: string) { const d = new Date(ngay + 'T00:00:00Z'); const thu = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - thu); return d.toISOString().slice(0, 10); }

/** Một bên đề nghị giá tuần (đủ các món của khung theo thứ tự lịch). Bên đề nghị coi như đã đồng ý. */
export async function deNghiGiaTuan(t: GiaoDich, nd: NguoiDung, id: string, d: { tuan: string; mon: { gia_vnd: number; gia_ha_cap_vnd?: number | null }[]; low_downgrade_price_ack?: boolean }) {
  const { f, phia } = await layKhung(t, nd, id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tuan ?? '')) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần tuần (ngày bất kỳ trong tuần, YYYY-MM-DD).');
  const items = f.schedule?.items ?? [];
  if (!Array.isArray(d.mon) || d.mon.length !== items.length) throw loi('DU_LIEU_KHONG_HOP_LE', `Cần giá đủ ${items.length} món của khung.`);
  const gia = items.map((x: any, i: number) => ({ product_id: x.product_id, profile_version: x.profile_version, grade_code: x.grade_code,
    unit_price_vnd: String(Math.round(d.mon[i].gia_vnd)), downgrade_price_vnd: d.mon[i].gia_ha_cap_vnd == null ? null : String(Math.round(d.mon[i].gia_ha_cap_vnd)) }));
  // Người bán tự đề nghị giá có giá xuống loại < 70% cũng phải xác nhận riêng (bên đề nghị coi như đã đồng ý).
  if (phia === 'seller' && gia.some((x: any) => x.downgrade_price_vnd != null && BigInt(x.downgrade_price_vnd) * 10000n < BigInt(x.unit_price_vnd) * 7000n) && !d.low_downgrade_price_ack)
    throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Giá xuống loại thấp hơn 70% giá món. Bác xác nhận riêng rồi mới gửi đề nghị.', { gia_ha_cap_thap: true });
  const wid = await appCmd<string>(t, nd, phia, 'propose_framework_week_price', [id, dauTuan(d.tuan), JSON.stringify(gia)]);
  return { id: wid, tuan: dauTuan(d.tuan), trang_thai: 'proposed', cho: phia === 'buyer' ? 'seller' : 'buyer' };
}

/** Bên kia đồng ý / không đồng ý giá tuần. Người bán đồng ý giá có giá xuống loại < 70% phải xác nhận riêng (ngưỡng 02/11). */
export async function traLoiGiaTuan(t: GiaoDich, nd: NguoiDung, priceId: string, d: { dong_y: boolean; low_downgrade_price_ack?: boolean }) {
  const w = await t.mot<any>(`SELECT * FROM core.framework_week_prices WHERE id=$1`, [priceId]);
  if (!w) throw loi('KHONG_TIM_THAY');
  const { phia } = await layKhung(t, nd, w.framework_id);
  if (d.dong_y && phia === 'seller' && (w.items as any[]).some((x) => x.downgrade_price_vnd != null && BigInt(x.downgrade_price_vnd) * 10000n < BigInt(x.unit_price_vnd) * 7000n) && !d.low_downgrade_price_ack)
    throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Giá tuần có giá xuống loại thấp hơn 70% giá món. Bác xác nhận riêng rồi mới đồng ý, hoặc không đồng ý để bên mua đề nghị lại.', { gia_ha_cap_thap: true });
  const kq = await appCmd<string>(t, nd, phia, 'answer_framework_week_price', [priceId, !!d.dong_y]);
  return { id: priceId, trang_thai: kq };
}

export async function giaTuanCuaKhung(t: GiaoDich, frameworkId: string) {
  return t.q<any>(`SELECT id, week_start::text tuan, items, proposed_by_side de_nghi_boi, status trang_thai, proposed_at, answered_at FROM core.framework_week_prices
    WHERE framework_id=$1 AND status IN ('proposed','agreed','rejected') ORDER BY week_start, created_at`, [frameworkId]);
}

// ---------------- Bước 3a: gọi hàng một buổi (đơn con framework_calloff) ----------------
/** Bên mua gọi hàng cho một buổi giao: trước 24 giờ, trong kỳ, đúng ngày lịch, tuần đó đã chốt giá (DB 0084 chặn nếu chưa).
 *  Giao tại vườn, bên mua lo xe, người gọi là người nhận. Đơn con kích hoạt ngay (không cọc riêng — cọc khung bảo đảm). */
export async function goiHang(t: GiaoDich, nd: NguoiDung, id: string, d: { ngay: string; gio_tu?: string; gio_den?: string; dong: { lot_id: string; kg: number }[] }) {
  const { f, phia } = await layKhung(t, nd, id);
  if (phia !== 'buyer') throw loi('KHONG_CO_QUYEN', 'Chỉ bên mua gọi hàng.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.ngay ?? '')) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần ngày giao (YYYY-MM-DD).');
  const thu = new Date(d.ngay + 'T00:00:00Z').getUTCDay();
  if (!(f.schedule?.weekdays ?? []).includes(thu)) throw loi('DU_LIEU_KHONG_HOP_LE', `Ngày ${d.ngay} không phải ngày giao trong lịch khung.`);
  if (!Array.isArray(d.dong) || !d.dong.length) throw loi('DU_LIEU_KHONG_HOP_LE', 'Chọn lô và lượng cho buổi giao.');
  const tu = new Date(`${d.ngay}T${d.gio_tu ?? '07:00'}:00+07:00`), den = new Date(`${d.ngay}T${d.gio_den ?? '15:00'}:00+07:00`);
  if (!(tu < den)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Giờ giao không hợp lệ.');
  const terms = { delivery_window: `[${tu.toISOString()},${den.toISOString()})`, delivery_mode: 'at_farm', acceptance_point: 'tai_vuon', transport_by: 'buyer',
    designated_receiver_user_id: nd.userId, inspection_before_loading: false, silent_accept_hours: 2 };
  const lines = d.dong.map((x) => ({ lot_id: x.lot_id, qty: String(soGam(Math.round(Number(x.kg) * 1000), 'kg')) }));
  const code = await maMoi(t, 'core.orders', 'HD', 3001);
  const orderId = await appCmd<string>(t, nd, 'buyer', 'create_calloff', [id, code, JSON.stringify(terms), JSON.stringify(lines)]);
  const dotId = await systemCmd<string>(t, 'activate_calloff', [orderId]);
  const v = await t.mot<any>(`SELECT contract_value_vnd::text gia_tri FROM core.order_versions WHERE order_id=$1 AND version_no=1`, [orderId]);
  return { order_id: orderId, code, delivery_id: dotId, gia_tri_vnd: v?.gia_tri };
}

// ---------------- Bước 3b: trả gộp cuối tuần + chặn nợ vượt cọc ----------------
/** Chốt kỳ tuần: gộp quyết toán cuối của mọi buổi gọi hàng lập trong tuần thành MỘT khoản bên mua trả thẳng người bán (hạn 72 giờ).
 *  DB (0043) chặn khi tuần chưa hết hoặc còn buổi chưa quyết toán; gọi lại cùng tuần trả về kỳ cũ. Sau đó làm mới trạng thái bảo đảm:
 *  nợ (phải thu người bán + buổi đã gọi chưa quyết toán) vượt cọc → khung "Tạm dừng: nợ vượt cọc", DB chặn gọi hàng mới (0016). Không cấp thêm tín dụng. */
export async function chotTuan(t: GiaoDich, nd: NguoiDung, id: string, d: { tuan: string }) {
  await layKhung(t, nd, id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d?.tuan ?? '')) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần tuần (YYYY-MM-DD).');
  const tu = dauTuan(d.tuan);
  const den = new Date(new Date(tu + 'T00:00:00Z').getTime() + 7 * 864e5).toISOString().slice(0, 10);
  const ky = `[${tu}T00:00:00+07:00,${den}T00:00:00+07:00)`;
  const kyId = await systemCmd<string>(t, 'bill_framework_period', [id, ky]);
  const trangThai = await systemCmd<string>(t, 'refresh_framework_security', [id]);
  const r = await t.mot<any>(`SELECT p.value_vnd::text gia_tri_vnd, p.fee_vnd::text phi_vnd, p.payment_id, dp.code ma_khoan, dp.due_at han_tra FROM core.framework_periods p JOIN core.direct_payments dp ON dp.id=p.payment_id WHERE p.id=$1`, [kyId]);
  return { ky_id: kyId, tuan: tu, ...r, trang_thai_khung: trangThai };
}

/** Làm mới trạng thái bảo đảm sau khi tiền kỳ được xác nhận (nợ giảm → khung chạy lại). */
export async function lamMoiBaoDam(t: GiaoDich, frameworkId: string) {
  return systemCmd<string>(t, 'refresh_framework_security', [frameworkId]);
}
