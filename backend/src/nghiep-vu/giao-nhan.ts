import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Giao nhận (03 mục 6, 06): chỉ định người nhận, đặt xe, thẻ "Sẵn sàng giao" đọc từ dữ liệu, QR nhận hàng động
// (Ed25519 security/lib/qr.mjs bọc token DB một lần) + mã 6 số dự phòng, bắt đầu nghiệm thu, gửi kết quả 3 phần,
// người bán đồng ý (PIN/OTP, N-03) hoặc phản đối dòng, ký nhận nơi đến, xác nhận đến đạt.
// @ts-ignore thư viện JS dùng chung
import { issueQr, verifyQr, fallbackCode, checkFallbackCode } from '../../../security/lib/qr.mjs';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import type { HeThong } from '../he-thong.ts';
import { canQuyen, duocPhep } from '../auth/quyen.ts';
import { damBaoDangNhap } from '../db/dang-nhap-rieng.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { GIO, PHUT } from '../dong-ho.ts';
import { chuyenTrangThai, dongHan, phat, taoHan, soGam, kg, dong, maMoi, dongBoTaiLieu } from './chung.ts';
import { B, tienDong, phatThieuLuong } from './tinh-tien.ts';
import { taoTaiLieuPdf } from '../pdf/tai-lieu-pdf.ts';
import { taoKhoanTraThang, taoViec } from './tien.ts';

const DIEM_TAI_CHO = ['tai_vuon', 'tai_ao', 'tai_ruong', 'tai_diem_gom'];

async function layDot(t: GiaoDich, id: string) {
  const d = await t.mot<any>(`SELECT d.*, upper(d.delivery_window) win_end, lower(d.delivery_window) win_start FROM core.deliveries d WHERE d.id=$1 FOR UPDATE`, [id]);
  if (!d) throw loi('KHONG_TIM_THAY');
  const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1`, [d.order_id]);
  const v = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [d.order_id, d.version_no]);
  return { d, o, v };
}

function phiaCua(nd: NguoiDung, o: any): 'buyer' | 'seller' {
  if (o.buyer_org_id === nd.thanhVien.orgId) return 'buyer';
  if (o.seller_org_id === nd.thanhVien.orgId) return 'seller';
  throw loi('KHONG_TIM_THAY');
}

async function datVai(t: GiaoDich, actor: string, userId?: string | null, orgId?: string | null) {
  await t.q(`SELECT set_config('app.actor_kind',$1,true), set_config('app.user_id',$2,true), set_config('app.org_id',$3,true)`, [actor, userId ?? '', orgId ?? '']);
}

// ---------------- Chuẩn bị ----------------

export async function phatQrNhanHang(ht:HeThong,t:GiaoDich,deliveryId:string){
 // QR chỉ phát bởi assign_receiver dưới login buyer đang thực hiện; không giả người nhận.
 const u=await t.gtri<string>(`SELECT current_setting('app.user_id',true)`), org=await t.gtri<string>(`SELECT current_setting('app.org_id',true)`);
 const {d,o}=await layDot(t,deliveryId);if(!d.receiver_user_id)return null;
 if(org!==o.buyer_org_id||!u)throw loi('CHUA_HO_TRO','Cần bên mua phát lại QR qua command assign_receiver.');
 const login=await damBaoDangNhap(t,u,org,'buyer');const raw=await loginCmd<string>(t,login,'assign_receiver',[deliveryId,d.receiver_user_id]);
 const het=await t.gtri<Date>(`SELECT expires_at FROM core.qr_tokens WHERE token_hash=digest($1,'sha256')`,[raw]);
 ht.qrNhanHang.set(deliveryId,{raw,het:new Date(het).getTime()});return new Date(het);
}

export async function chiDinhNguoiNhan(ht:HeThong,t:GiaoDich,nd:NguoiDung,deliveryId:string,userId:string){
 const {o}=await layDot(t,deliveryId);if(phiaCua(nd,o)!=='buyer')throw loi('KHONG_CO_QUYEN');canQuyen(nd,'delivery.plan');
 const raw=await appCmd<string>(t,nd,'buyer','assign_receiver',[deliveryId,userId]);const het=await t.gtri<Date>(`SELECT expires_at FROM core.qr_tokens WHERE token_hash=digest($1,'sha256')`,[raw]);
 ht.qrNhanHang.set(deliveryId,{raw,het:new Date(het).getTime()});await thuSanSang(ht,t,deliveryId);
 return {id:deliveryId,status:await t.gtri(`SELECT status FROM core.deliveries WHERE id=$1`,[deliveryId])};
}

export async function datXe(ht:HeThong,t:GiaoDich,nd:NguoiDung,deliveryId:string,x:{plate_no:string;freight_vnd?:unknown}){
 const {d,o,v}=await layDot(t,deliveryId);const side=phiaCua(nd,o);canQuyen(nd,side==='buyer'?'delivery.plan':'delivery.ship');
 const xe=await t.mot<any>(`SELECT v.*,(SELECT user_id FROM core.memberships WHERE org_id=v.org_id AND status='active' LIMIT 1) tai_xe FROM core.vehicles v WHERE plate_no=$1`,[x.plate_no]);if(!xe)throw loi('DU_LIEU_KHONG_HOP_LE');
 const id=await appCmd<string>(t,nd,side,'book_trip',[deliveryId,xe.id,xe.tai_xe,d.delivery_window,String(x.freight_vnd??0)]);
 // Cổng nhà xe thử nhận ngay; dispatcher riêng có phân công thật, không giả actor carrier.
 if(!ht.cfg.tinhNangThu)throw loi('CHUA_HO_TRO','Chưa nối cổng nhà xe xác nhận chuyến.');
 const staff=await t.mot<any>(`SELECT s.user_id,m.org_id FROM ops.staff_assignments s JOIN core.memberships m ON m.user_id=s.user_id JOIN core.organizations o ON o.id=m.org_id AND o.is_platform WHERE s.role_code='dispatcher' AND s.active AND m.status='active' LIMIT 1`);
 if(!staff)throw loi('CHUA_HO_TRO','Chưa ánh xạ dispatcher nhận chuyến.');const login=await damBaoDangNhap(t,staff.user_id,staff.org_id,'ops');await loginCmd(t,login,'accept_trip',[id]);
 await thuSanSang(ht,t,deliveryId);return {id,code:await t.gtri(`SELECT code FROM core.trips WHERE id=$1`,[id]),plate_no:x.plate_no,status:'accepted',the_chuyen_token:null,delivery_status:await t.gtri(`SELECT status FROM core.deliveries WHERE id=$1`,[deliveryId])};
}

export interface DongThe { ma: string; ten: string; ok: boolean; ly_do?: string }

/** Thẻ "Sẵn sàng giao": 6 dòng đọc từ dữ liệu, cùng điều kiện với trigger core.guard_delivery_ready. */
export async function theSanSang(t: GiaoDich, deliveryId: string): Promise<DongThe[]> {
  const d = await t.mot<any>(`SELECT * FROM core.deliveries WHERE id=$1`, [deliveryId]);
  const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1`, [d.order_id]);
  const v = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [d.order_id, d.version_no]);
  const camKet = B(await t.gtri<string>(`SELECT coalesce(sum(qty),0)::text FROM ledger.qty_balances WHERE lot_id=$1 AND order_key=$2 AND bucket='committed'`, [o.lot_id, o.id]));
  const khoa = !!(await t.gtri(`SELECT safety_locked_at FROM core.lots WHERE id=$1`, [o.lot_id]));
  const coc = B(await t.gtri<string>(`SELECT coalesce(sum(balance_vnd),0)::text FROM ledger.v_account_balances WHERE order_id=$1 AND account_type='deposit_escrow'`, [o.id]));
  const thieuTien = await t.q<any>(`SELECT p.code,(p.amount_due_vnd-coalesce((SELECT sum(amount_vnd) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id),0))::text con FROM core.direct_payments p
    WHERE order_id=$1 AND blocks_loading AND kind<>'goods_on_receipt' AND status<>'cancelled' AND amount_due_vnd<>(SELECT coalesce(sum(amount_vnd),0) FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id)`, [o.id]);
  const nhanOk = !!d.receiver_user_id && !!(await t.mot(`SELECT 1 FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id WHERE m.user_id=$1 AND m.org_id=$2 AND m.status='active' AND r.role_code IN ('owner','warehouse','site_receiver')`, [d.receiver_user_id, o.buyer_org_id]));
  const qrOk = !!(await t.mot(`SELECT 1 FROM core.qr_tokens WHERE delivery_id=$1 AND kind='receipt' AND designated_user_id=$2 AND revoked_at IS NULL AND expires_at>ref.clock_at()`, [deliveryId, d.receiver_user_id]));
  const canXe = ['buyer', 'partner_for_buyer', 'partner_for_seller'].includes(v.transport_by);
  const xeOk = !canXe || !!(await t.mot(`SELECT 1 FROM core.trip_deliveries td JOIN core.trips x ON x.id=td.trip_id WHERE td.delivery_id=$1 AND x.status IN ('accepted','at_pickup','loading')`, [deliveryId]));
  const hoSoThieu: string[] = [];
  for (const need of (await t.gtri<string[]>(`SELECT required_docs FROM core.demands WHERE id=$1`, [o.demand_id])) ?? []) {
    const kind = need.startsWith('ma_vung_trong') ? 'growing_area_code' : need === 'nhat_ky_cach_ly' ? 'spray_diary' : need === 'nhat_ky_ao' ? 'pond_diary' : need === 'kiem_dinh:cadimi_vang_o' ? 'cadmium_test' : need === 'kiem_dinh:khang_sinh' ? 'antibiotic_test' : need;
    const co = await t.mot(`SELECT 1 FROM core.certifications c WHERE c.org_id=$1 AND c.kind=$2 AND c.verified_at IS NOT NULL AND c.revoked_at IS NULL`, [o.seller_org_id, kind]);
    if (!co) hoSoThieu.push(need);
  }
  const deNghi = Number(await t.gtri(`SELECT count(*) FROM core.amendments WHERE order_id=$1 AND (status='open' OR (status='accepted' AND resulting_version_no>$2))`, [o.id, o.effective_version_no]));
  const huy = Number(await t.gtri(`SELECT count(*) FROM core.cancellation_requests WHERE order_id=$1 AND status IN ('awaiting_reply','processing_money')`, [o.id]));
  return [
    { ma: 'hang', ten: 'Hàng', ok: B(d.planned_qty) <= camKet && !khoa, ly_do: khoa ? 'Lô đang khóa an toàn' : B(d.planned_qty) > camKet ? `Lượng cam kết còn ${kg(camKet)}` : undefined },
    { ma: 'tien', ten: 'Tiền', ok: o.status === 'active' && coc >= B(v.deposit_vnd) && thieuTien.length === 0,
      ly_do: o.status !== 'active' ? 'Ngân hàng chưa xác nhận cọc' : thieuTien.length ? `Khoản ${thieuTien[0].code} còn thiếu ${dong(thieuTien[0].con)}` : undefined },
    { ma: 'nguoi_nhan', ten: 'Người nhận', ok: nhanOk && qrOk, ly_do: !nhanOk ? 'Bên mua chưa chỉ định người nhận' : !qrOk ? 'Chưa phát QR nhận hàng' : undefined },
    { ma: 'xe', ten: 'Xe', ok: xeOk, ly_do: xeOk ? undefined : 'Chưa có chuyến xe nhận chở' },
    { ma: 'ho_so', ten: 'Hồ sơ', ok: hoSoThieu.length === 0, ly_do: hoSoThieu.length ? `Thiếu: ${hoSoThieu.join(', ')}` : undefined },
    { ma: 'de_nghi', ten: 'Không có đề nghị/hủy đang chờ', ok: deNghi === 0 && huy === 0, ly_do: deNghi ? 'Đang có đề nghị sửa' : huy ? 'Đang có yêu cầu hủy' : undefined },
  ];
}

export async function thuSanSang(ht: HeThong, t: GiaoDich, deliveryId: string) {
  const d = await t.mot<any>(`SELECT status, version_no, order_id FROM core.deliveries WHERE id=$1`, [deliveryId]);
  if (d?.status !== 'preparing') return false;
  const o = await t.mot<any>(`SELECT status, effective_version_no FROM core.orders WHERE id=$1`, [d.order_id]);
  if (o.status !== 'active' || o.effective_version_no !== d.version_no) return false;
  const the = await theSanSang(t, deliveryId);
  if (!the.every((x) => x.ok)) return false;
  await systemCmd(t,'ready_delivery',[deliveryId]);
  return true;
}

/** Người nhận được chỉ định mở QR nhận hàng (QR-02) trên máy của mình. */
export async function layQrNhanHang(ht: HeThong, t: GiaoDich, nd: NguoiDung, deliveryId: string) {
  const { d } = await layDot(t, deliveryId);
  if (d.receiver_user_id !== nd.userId) throw loi('NGUOI_NHAN_KHONG_CHI_DINH');
  let q = ht.qrNhanHang.get(deliveryId);
  const conHieuLuc = q && (await t.mot(`SELECT 1 FROM core.qr_tokens WHERE token_hash=digest($1,'sha256') AND revoked_at IS NULL AND used_at IS NULL AND expires_at>ref.clock_at()`, [q.raw]));
  if (!conHieuLuc) { await phatQrNhanHang(ht, t, deliveryId); q = ht.qrNhanHang.get(deliveryId)!; }
  const now = ht.dongHo.giay();
  const ttl = Math.min(Math.max(60, Math.floor(q!.het / 1000) - now), 3 * 24 * 3600);
  const { token } = issueQr({ type: 'recv', sub: deliveryId, aud: nd.userId, ttlSec: ttl, extra: { r: q!.raw }, kid: ht.cfg.qrKid, privateKey: ht.cfg.qrPrivate, now });
  const ma6 = fallbackCode(ht.cfg.maDuPhongBiMat, { deliveryId, receiverUserId: nd.userId, windowStart: new Date(d.win_start).toISOString() });
  return { delivery_id: deliveryId, qr_token: token, ma_6_so: ma6, het_han: new Date(q!.het).toISOString(), lam_moi_sau_giay: 300 };
}

/** Quét QR nhận hàng (hoặc nhập mã 6 số) để mở nghiệm thu tại điểm. Thường do người bán quét trên máy mình;
 *  token là bằng chứng mang theo của người nhận được chỉ định nên lệnh quét ghi dưới danh tính người nhận (cmd.scan_qr). */
export async function batDauNghiemThu(ht: HeThong, t: GiaoDich, nd: NguoiDung, deliveryId: string, x: { qr_token?: string; ma_6_so?: string; device_id?: string; plate_no?: string }) {
  const { d, o, v } = await layDot(t, deliveryId);
  const phia = phiaCua(nd, o);
  canQuyen(nd, phia === 'seller' ? 'delivery.ship' : 'delivery.check');
  const tuongTaiCho = DIEM_TAI_CHO.includes(v.acceptance_point);
  const tu = tuongTaiCho ? 'ready' : 'in_transit';
  if (d.status !== tu) throw loi('TRANG_THAI_KHONG_CHO_PHEP', undefined, { trang_thai: d.status });
  if (!d.receiver_user_id) throw loi('NGUOI_NHAN_KHONG_CHI_DINH');
  if (x.plate_no) {
    const khop = await t.mot(`SELECT 1 FROM core.trip_deliveries td JOIN core.trips tr ON tr.id=td.trip_id JOIN core.vehicles vh ON vh.id=tr.vehicle_id WHERE td.delivery_id=$1 AND vh.plate_no=$2`, [deliveryId, x.plate_no]);
    if (!khop) throw loi('QR_KHONG_DUNG_DOT', 'Biển số không khớp thẻ chuyến.');
  }
  let raw: string;
  if (x.qr_token) {
    const r = verifyQr(x.qr_token, { expectedType: 'recv', publicKeys: { [ht.cfg.qrKid]: ht.cfg.qrPublic }, expectedAud: d.receiver_user_id, jtiStore: ht.nonce, now: ht.dongHo.giay() });
    if (!r.ok) throw loi(r.reason === 'het_han' || r.reason === 'da_dung' ? 'QR_HET_HAN' : r.reason === 'sai_doi_tuong' ? 'NGUOI_NHAN_KHONG_CHI_DINH' : 'QR_KHONG_DUNG_DOT', undefined, { ly_do: r.reason });
    if (r.payload.sub !== deliveryId) throw loi('QR_KHONG_DUNG_DOT');
    raw = r.payload.x.r;
  } else if (x.ma_6_so) {
    const k = ht.saiMa6.get(deliveryId) ?? { n: 0, khoaDen: 0 };
    if (k.khoaDen > ht.dongHo.ms()) throw loi('QR_BI_KHOA');
    const ok = checkFallbackCode(ht.cfg.maDuPhongBiMat, { deliveryId, receiverUserId: d.receiver_user_id, windowStart: new Date(d.win_start).toISOString() }, x.ma_6_so);
    if (!ok) { k.n += 1; if (k.n >= 3) { k.khoaDen = ht.dongHo.ms() + 15 * PHUT; k.n = 0; } ht.saiMa6.set(deliveryId, k); throw loi('QR_KHONG_DUNG_DOT', 'Mã 6 số không đúng.'); }
    ht.saiMa6.delete(deliveryId);
    const cached=ht.qrNhanHang.get(deliveryId);if(!cached)throw loi('QR_HET_HAN','Người nhận cần mở lại QR trên máy mình.');raw=cached.raw;
  } else throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần qr_token hoặc ma_6_so.');
  const login = await damBaoDangNhap(t, d.receiver_user_id, o.buyer_org_id, 'buyer');
  const kq = await t.voiDangNhap(login, () => t.gtri<string>(`SELECT cmd.scan_qr($1,$2,NULL)`, [raw, x.device_id ?? nd.thietBi ?? 'thiet-bi-nguoi-quet']));
  if (kq !== 'accepted') throw loi(kq === 'expired' || kq === 'used' || kq === 'revoked' ? 'QR_HET_HAN' : kq === 'wrong_user' ? 'NGUOI_NHAN_KHONG_CHI_DINH' : 'QR_KHONG_DUNG_DOT', undefined, { ket_qua_db: kq });
  ht.qrNhanHang.delete(deliveryId);
  await loginCmd(t,login,'start_acceptance',[deliveryId]);
  const row=await t.mot<any>(`SELECT status,version FROM core.deliveries WHERE id=$1`,[deliveryId]);
  return {id:deliveryId,status:row.status,revision:row.version};
}

// ---------------- Nghiệm thu ----------------

export interface DongKetQua { kind: 'accepted' | 'downgraded' | 'rejected' | 'transit_damage'; qty_g: unknown; reason_code?: string; evidence_document_id?: string }

export async function guiKetQua(ht: HeThong, t: GiaoDich, nd: NguoiDung, deliveryId: string, x: { weighed_g: unknown; lines: DongKetQua[]; seal_code?: string; device_id?: string; accept_overage?: boolean; withdrawn_g?: unknown; pin?: string }) {
  const { d, o, v } = await layDot(t, deliveryId);
  if (phiaCua(nd, o) !== 'buyer') throw loi('KHONG_CO_QUYEN');
  canQuyen(nd, 'delivery.check');
  // Gửi lại kết quả (chia lại / cân lại sau phản đối dòng) được phép khi đang chờ người bán: tạo phiên bản mới.
  // 0050: gửi lại cả khi đợt đang 'disputed' (người bán phản đối dòng), DB cho disputed → checking.
  if (!['checking', 'awaiting_seller', 'disputed'].includes(d.status)) throw loi('TRANG_THAI_KHONG_CHO_PHEP');
  const guiLai = d.status !== 'checking';
  const can = soGam(x.weighed_g, 'weighed_g');
  const rut = x.withdrawn_g == null ? 0n : soGam(x.withdrawn_g, 'withdrawn_g');
  // 0050: rút phần tranh chấp chỉ khi người bán đã lập + ký biên bản rút (prepare_dispute_withdrawal) đúng lượng; bên mua ký rồi DB lập bản nghiệm thu mới.
  let rutTc: any = null;
  if (rut > 0n) {
    rutTc = await t.mot<any>(`SELECT tc.id, tc.disputed_qty::text q, l.acceptance_id, a.weighed_qty::text w,
        (SELECT id FROM core.documents r WHERE r.doc_type='return_record' AND r.entity='dispute' AND r.entity_id=tc.id ORDER BY r.created_at DESC LIMIT 1) rec
      FROM core.disputes tc JOIN core.acceptance_lines l ON l.id=tc.line_id JOIN core.acceptance_versions a ON a.id=l.acceptance_id
      WHERE a.delivery_id=$1 AND tc.status IN ('open','awaiting_seller') ORDER BY tc.created_at DESC LIMIT 1`, [deliveryId]);
    if (!rutTc || B(rutTc.q) !== rut) throw loi('DU_LIEU_KHONG_HOP_LE', 'Lượng rút phải đúng phần đang tranh chấp.');
    if (!rutTc.rec) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Người bán chưa lập và ký biên bản rút phần tranh chấp.');
    if (can !== B(rutTc.w) - rut) throw loi('KET_QUA_KHONG_KHOP_TONG', 'Lượng cân sau rút phải bằng lượng cân cũ trừ phần rút.');
    const conLai = await t.q<any>(`SELECT kind, qty::text q FROM core.acceptance_lines WHERE acceptance_id=$1 AND id<>(SELECT line_id FROM core.disputes WHERE id=$2) ORDER BY line_no`, [rutTc.acceptance_id, rutTc.id]);
    const nhap = (x.lines ?? []).filter((l) => soGam(l.qty_g) > 0n).map((l) => `${l.kind}:${soGam(l.qty_g)}`).join('|');
    if (nhap !== conLai.map((l) => `${l.kind}:${l.q}`).join('|')) throw loi('DU_LIEU_KHONG_HOP_LE', 'Các dòng còn lại phải giữ nguyên như bản trước khi rút.');
  }
  const keHoach = B(d.planned_qty);
  const dungSai = (keHoach * BigInt(v.qty_tolerance_bps)) / 10000n;
  if (can > keHoach) {
    if(!x.accept_overage)throw loi('DU_LIEU_KHONG_HOP_LE','Chọn nhận phần vượt hoặc chỉ ghi lượng hợp đồng.');
    if(can>keHoach+dungSai)throw loi('DU_LIEU_KHONG_HOP_LE','Phần vượt ngoài dung sai cần phụ lục.');
    // 0050: phần vượt trong dung sai được cam kết khi chốt BBNT (finalize_acceptance_quantity), lựa chọn ghi ở acceptance_overage_choices.
  }
  if (rut > 0n && can + rut > keHoach) throw loi('DU_LIEU_KHONG_HOP_LE', 'Lượng rút cộng lượng cân vượt lượng đợt.');
  if (!Array.isArray(x.lines) || x.lines.length === 0) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần các dòng kết quả.');
  let tong = 0n; let traLai = 0n;
  const dong2 = x.lines.map((l, i) => {
    const q = soGam(l.qty_g);
    if (q < 0n) throw loi('KET_QUA_AM');
    if ((l.kind === 'downgraded' || l.kind === 'rejected') && !l.reason_code) throw loi('THIEU_LY_DO');
    if (l.kind === 'downgraded' && v.downgrade_price_vnd == null) throw loi('DU_LIEU_KHONG_HOP_LE', 'Hợp đồng không có giá hạ cấp.');
    tong += q; if (l.kind === 'rejected') traLai += q;
    const gia = l.kind === 'rejected' ? 0n : l.kind === 'downgraded' ? B(v.downgrade_price_vnd) : B(v.unit_price_vnd);
    const payable = l.kind === 'rejected' ? 0n : q;
    return { ...l, line_no: i + 1, q, gia, payable, value: tienDong(payable, gia) };
  }).filter((l) => l.q > 0n);
  if (tong !== can) throw loi('KET_QUA_KHONG_KHOP_TONG', `Tổng ba phần ${kg(tong)} khác lượng cân ${kg(can)}.`);
  if (traLai * 10000n > can * BigInt(v.reject_allowance_bps) && dong2.some((l) => l.kind === 'rejected' && !l.evidence_document_id)) throw loi('THIEU_ANH_TRA_LAI');
  const truoc = await t.mot<any>(`SELECT id, version_no FROM core.acceptance_versions WHERE delivery_id=$1 ORDER BY version_no DESC LIMIT 1`, [deliveryId]);
  const so = (truoc?.version_no ?? 0) + 1;
  const V = dong2.reduce((a, l) => a + l.value, 0n);
  const ma = `${o.code}-BBNT-D${d.batch_no}`;
  const noiDung = {
    loai: 'BBNT', don: o.code, dot: d.code, phien_ban_ket_qua: so, diem_nghiem_thu: v.acceptance_point, luong_can_g: can,
    luong_dot_g: keHoach, nhan_phan_vuot: !!x.accept_overage && can > keHoach, nguoi_ban_rut_g: rut,
    dong: dong2.map((l) => ({ so: l.line_no, loai: l.kind, luong_g: l.q, gia_vnd: l.gia, gia_tri_vnd: l.value, ly_do: l.reason_code ?? null })),
    gia_tri_vnd: V, mau_niem_phong: x.seal_code ?? null, nguoi_kiem: nd.ten,
  };
  const TEN: Record<string, string> = { accepted: 'Đạt', downgraded: 'Hạ cấp', rejected: 'Trả lại', transit_damage: 'Hư do đường' };
  const doc = await taoTaiLieuPdf(t, {
    docType: 'acceptance_record', code: so === 1 ? ma : `${ma}-V${so}`, seriesKey: ma, versionNo: so, orderId: o.id, ownerOrgId: o.buyer_org_id,
    entity: 'delivery', entityId: deliveryId, noiDung, status: 'awaiting_signature', createdBy: nd.userId,
    prevDocumentId: truoc ? await t.gtri<string>(`SELECT document_id FROM core.acceptance_versions WHERE id=$1`, [truoc.id]) : null,
    trinhBay: { loai: 'BBNT', tieuDe: 'BIÊN BẢN NGHIỆM THU 3 PHẦN', muc: [
      { tieuDe: 'Thông tin', dong: [['Đơn', o.code], ['Đợt', d.code], ['Lượng cân tại điểm nghiệm thu', kg(can)], ['Mẫu niêm phong', x.seal_code ?? '—']] },
      { tieuDe: 'Kết quả', bang: { cot: ['Dòng', 'Phần', 'Lượng', 'Giá', 'Giá trị', 'Lý do'], hang: dong2.map((l) => [String(l.line_no), TEN[l.kind], kg(l.q), dong(l.gia), dong(l.value), l.reason_code ?? '']) } },
      { tieuDe: 'Giá trị nghiệm thu', dong: [['Tổng', dong(V)]] },
    ] },
  });
  // 0052: chia lại sau phản đối của người bán (revise_acceptance_after_objection). Dòng không tranh chấp giữ nguyên;
  // phần chênh theo từng loại (accepted/downgraded/rejected) thay các dòng đang tranh chấp, bảo toàn lượng từng dòng.
  const tcMo = rutTc ? [] : await t.q<any>(`SELECT tc.id, l.id line_id, l.acceptance_id, l.qty::text q FROM core.disputes tc JOIN core.acceptance_lines l ON l.id=tc.line_id JOIN core.acceptance_versions a ON a.id=l.acceptance_id
      WHERE a.delivery_id=$1 AND tc.status='open' AND l.status='disputed' ORDER BY l.line_no`, [deliveryId]);
  if (tcMo.length) {
    const cu = await t.mot<any>(`SELECT id, weighed_qty::text w FROM core.acceptance_versions WHERE id=$1`, [tcMo[0].acceptance_id]);
    if (can !== B(cu.w)) throw loi('KET_QUA_KHONG_KHOP_TONG', 'Chia lại giữ nguyên lượng cân của bản trước.');
    const chungCu = (x as any).evidence_document_id ?? await t.gtri<string>(`SELECT d.id FROM core.documents d WHERE d.order_id=$1 AND d.doc_type='evidence' AND d.owner_org_id=$2
        AND d.created_at > (SELECT max(created_at) FROM core.disputes WHERE id = ANY($3::uuid[])) ORDER BY d.created_at DESC LIMIT 1`, [o.id, o.buyer_org_id, tcMo.map((r) => r.id)]);
    if (!chungCu) throw loi('DU_LIEU_KHONG_HOP_LE', 'Chia lại cần ảnh/phiếu cân lại mới sau phản đối: tải POST /v1/files (entity=order) rồi gửi lại.');
    const giu = await t.q<any>(`SELECT kind, qty::text q FROM core.acceptance_lines WHERE acceptance_id=$1 AND status<>'disputed'`, [cu.id]);
    const conLai: Record<string, bigint> = {};
    for (const l of dong2) conLai[l.kind] = (conLai[l.kind] ?? 0n) + l.q;
    for (const l of giu) { conLai[l.kind] = (conLai[l.kind] ?? 0n) - B(l.q); if (conLai[l.kind] < 0n) throw loi('DU_LIEU_KHONG_HOP_LE', 'Dòng không tranh chấp phải giữ nguyên lượng.'); }
    const phan: any[] = [];
    for (const tc of tcMo) {
      let can2 = B(tc.q);
      for (const kind of ['accepted', 'downgraded', 'rejected', 'transit_damage']) {
        const q = conLai[kind] ?? 0n; if (q <= 0n || can2 <= 0n) continue;
        const lay = q < can2 ? q : can2; conLai[kind] = q - lay; can2 -= lay;
        const goc = dong2.find((l) => l.kind === kind)!;
        const payable = kind === 'rejected' ? 0n : lay;
        phan.push({ source_line_id: tc.line_id, lot_id: o.lot_id, order_line_no: null, kind, qty: lay.toString(), payable_qty: payable.toString(), unit_price_vnd: goc.gia.toString(), value_vnd: tienDong(payable, goc.gia).toString(), reason_code: goc.reason_code ?? null });
      }
      if (can2 !== 0n) throw loi('KET_QUA_KHONG_KHOP_TONG', 'Các phần chia lại phải bằng đúng lượng dòng tranh chấp.');
    }
    const avId = await appCmd<string>(t, nd, 'buyer', 'revise_acceptance_after_objection', [cu.id, doc.payload, phan, chungCu]);
    doc.id = await t.gtri<string>(`SELECT document_id FROM core.acceptance_versions WHERE id=$1`, [avId]);
    await kyBienBan(ht, t, nd, doc.id, 'buyer', x.pin, x.device_id);
    await appCmd(t, nd, 'buyer', 'send_acceptance', [avId]); await dongBoTaiLieu(t, doc.id, 'partially_signed');
    const row = await t.mot<any>(`SELECT status,version FROM core.deliveries WHERE id=$1`, [deliveryId]);
    return { id: deliveryId, status: row.status, revision: row.version, acceptance_id: avId, document_id: doc.id, content_sha256: doc.contentSha256, gia_tri_vnd: V.toString(), chia_lai: true };
  }
  if (rutTc) {
    await kyBienBan(ht, t, nd, rutTc.rec, 'buyer', x.pin, x.device_id);
    const avId = await appCmd<string>(t, nd, 'buyer', 'revise_acceptance_after_withdrawal', [rutTc.id, rutTc.rec, doc.payload]);
    doc.id = await t.gtri<string>(`SELECT document_id FROM core.acceptance_versions WHERE id=$1`, [avId]);
    await kyBienBan(ht, t, nd, doc.id, 'buyer', x.pin, x.device_id);
    await appCmd(t, nd, 'buyer', 'send_acceptance', [avId]); await dongBoTaiLieu(t, doc.id, 'partially_signed');
    const row = await t.mot<any>(`SELECT status,version FROM core.deliveries WHERE id=$1`, [deliveryId]);
    return { id: deliveryId, status: row.status, revision: row.version, acceptance_id: avId, document_id: doc.id, content_sha256: doc.contentSha256, gia_tri_vnd: V.toString(), da_rut_g: rut.toString() };
  }
  const avId=await appCmd<string>(t,nd,'buyer','submit_acceptance',[deliveryId,can.toString(),doc.payload,dong2.map(l=>({lot_id:o.lot_id,kind:l.kind,qty:l.q.toString(),payable_qty:l.payable.toString(),unit_price_vnd:l.gia.toString(),value_vnd:l.value.toString(),reason_code:l.reason_code??null})),!!x.accept_overage&&can>keHoach]);
  doc.id=await t.gtri<string>(`SELECT document_id FROM core.acceptance_versions WHERE id=$1`,[avId]);
  await kyBienBan(ht,t,nd,doc.id,'buyer',x.pin,x.device_id);
  await appCmd(t,nd,'buyer','send_acceptance',[avId]);await dongBoTaiLieu(t,doc.id,'partially_signed');
  const row=await t.mot<any>(`SELECT status,version FROM core.deliveries WHERE id=$1`,[deliveryId]);
  return {id:deliveryId,status:row.status,revision:row.version,acceptance_id:avId,document_id:doc.id,content_sha256:doc.contentSha256,gia_tri_vnd:V.toString()};
}

async function kiemPin(ht: HeThong, nd: NguoiDung, x: { pin?: string; challenge_id?: string; code?: string }) {
  // N-03: ký biên bản tại chỗ phải qua PIN app (thử: 2468) hoặc OTP ngay trước khi ký.
  if (x.pin != null) { if (!ht.cfg.pinThu || x.pin !== ht.cfg.pinThu) throw loi('OTP_SAI', 'PIN không đúng.'); return 'pin'; }
  throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần PIN app (hoặc OTP) ngay trước khi ký biên bản.');
}

/** Người bán đồng ý kết quả: ký BBNT, chốt dòng, chuyển lượng, lô con phần trả lại, chuyển rủi ro. */
export interface XuLyThieu { choice: 'backfill' | 'end' | 'force_majeure'; notice?: 'none' | 'lt3d' | 'ge3d'; backfill_from?: string; backfill_to?: string }

export async function dongYKetQua(ht: HeThong, t: GiaoDich, nd: NguoiDung, deliveryId: string, x: { pin?: string; device_id?: string; expected_sha256?: string; shortfall?: XuLyThieu }) {
  const { d, o, v } = await layDot(t, deliveryId);
  if (phiaCua(nd, o) !== 'seller') throw loi('KHONG_CO_QUYEN');
  canQuyen(nd, 'acceptance.respond');
  if (d.status !== 'awaiting_seller') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
  await kiemPin(ht, nd, x);
  const av = await t.mot<any>(`SELECT a.*, encode(doc.content_sha256,'hex') sha, doc.canonical_content cc FROM core.acceptance_versions a JOIN core.documents doc ON doc.id=a.document_id WHERE a.delivery_id=$1 ORDER BY a.version_no DESC LIMIT 1`, [deliveryId]);
  if (x.expected_sha256 && x.expected_sha256 !== av.sha) throw loi('PHIEN_BAN_DA_DOI');
  // 0052: bản chia lại sau phản đối giữ các phần mới ở 'disputed' tới khi người bán đồng ý; agree_acceptance đóng chúng.
  if (!(await t.mot(`SELECT 1 FROM core.acceptance_revisions WHERE acceptance_id=$1`, [av.id])) && await t.mot(`SELECT 1 FROM core.acceptance_lines WHERE acceptance_id=$1 AND status='disputed'`, [av.id])) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Còn dòng đang tranh chấp: chờ bên mua cân lại/chia lại.');
  // Thiếu lượng (03 mục 6.5): ngoài dung sai thì người bán phải chọn cách xử lý.
  const keHoach = B(d.planned_qty); const canQ = B(av.weighed_qty); const rutQ = B(av.cc?.nguoi_ban_rut_g ?? 0);
  const thieuQ = keHoach - canQ - rutQ;
  const dungSai = (keHoach * BigInt(v.qty_tolerance_bps)) / 10000n;
  if (thieuQ > dungSai && !x.shortfall) throw loi('DU_LIEU_KHONG_HOP_LE', `Thiếu ${kg(thieuQ)} ngoài dung sai: chọn giao bù, kết thúc phần thiếu hoặc bất khả kháng.`, { thieu_g: thieuQ.toString() });
  await kyBienBan(ht,t,nd,av.document_id,'seller',x.pin,x.device_id);
  await appCmd(t,nd,'seller','agree_acceptance',[av.id]);await dongBoTaiLieu(t,av.document_id,'fully_signed');
  let xuLyThieu:any=null;
  if(thieuQ>0n) xuLyThieu=await apDungXuLyThieu(ht,t,nd,d,o,v,thieuQ,x.shortfall??{choice:'end'});
  const status=await sauNghiemThuChot(ht,t,deliveryId,nd);
  let loCon:any=null;
  // 0050: tại nguồn, BBNT hai chữ ký đã chuyển phần trả lại sang returned_pending ngay khi chốt (đợt còn in_transit).
  if(status==='closed'||(status==='in_transit'&&DIEM_TAI_CHO.includes(v.acceptance_point))){
    const qty=B(await t.gtri<string>(`SELECT coalesce(sum(qty),0)::text FROM core.acceptance_lines WHERE acceptance_id=$1 AND kind='rejected'`,[av.id]));
    if(qty>0n && DIEM_TAI_CHO.includes(v.acceptance_point))loCon=await taoLoConTraLai(t,o,qty,av.id,nd);
  }
  const V=await t.gtri<string>(`SELECT coalesce(sum(value_vnd),0)::text FROM core.acceptance_lines WHERE acceptance_id=$1`,[av.id]);
  return {id:deliveryId,status,lo_con:loCon,gia_tri_vnd:V,xu_ly_thieu:xuLyThieu};
}

/** Thiếu ngoài dung sai (03 6.5, 04 7.7–7.8): giao bù = đợt mới; kết thúc = phạt Q04 theo việc báo trước; bất khả kháng = không phạt. */
async function apDungXuLyThieu(ht:HeThong,t:GiaoDich,nd:NguoiDung,d:any,o:any,v:any,thieu:bigint,s:XuLyThieu){
 const window=s.choice==='backfill'?`[${s.backfill_from??new Date(t.thoiDiemMs+24*GIO).toISOString()},${s.backfill_to??new Date(t.thoiDiemMs+30*GIO).toISOString()})`:null;
 const id=await appCmd<string>(t,nd,'seller','resolve_shortfall',[d.id,s.choice,window,(s as any).evidence_document_id??null]);
 const penalty=await t.gtri<string>(`SELECT coalesce(sum(amount_vnd),0)::text FROM core.contract_charges WHERE order_id=$1 AND source_id=$2 AND kind='shortfall_penalty'`,[o.id,d.id]);
 return {choice:s.choice,delivery_id:id,planned_g:thieu.toString(),penalty_vnd:penalty};
}

/** Sau khi chốt dòng: đợt sang in_transit (có nơi đến khác) hoặc closed; chờ đủ tiền trước bốc nếu hợp đồng yêu cầu. */
export async function sauNghiemThuChot(ht:HeThong,t:GiaoDich,deliveryId:string,nd?:NguoiDung):Promise<string>{
 const {d,o,v}=await layDot(t,deliveryId);if(d.status!=='awaiting_seller')return d.status;
 if(await t.mot(`SELECT 1 FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id WHERE a.delivery_id=$1 AND l.status<>'closed' AND a.version_no=(SELECT max(version_no) FROM core.acceptance_versions WHERE delivery_id=$1)`,[deliveryId]))return d.status;
 if(await t.mot(`SELECT 1 FROM core.direct_payments WHERE order_id=$1 AND blocks_loading AND status NOT IN ('fully_received','cancelled')`,[o.id]))return d.status;
 if(!nd || nd.thanhVien.orgId!==o.seller_org_id)return d.status;
 if(DIEM_TAI_CHO.includes(v.acceptance_point))await appCmd(t,nd,'seller','dispatch_delivery',[deliveryId]);
 else {await appCmd(t,nd,'seller','finish_warehouse_delivery',[deliveryId]);if(await t.mot(`SELECT 1 FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id WHERE a.delivery_id=$1 AND l.kind='rejected' AND a.version_no=(SELECT max(version_no) FROM core.acceptance_versions WHERE delivery_id=$1)`,[deliveryId]))await taoViec(t,'V20',2,'delivery',deliveryId,o.id,'dispatcher',`return:${deliveryId}`,'Hàng trả lại tại kho: người bán chọn xử lý');const {thuQuyetToan}=await import('./quyet-toan.ts');await thuQuyetToan(ht,t,o.id);}
 return t.gtri<string>(`SELECT status FROM core.deliveries WHERE id=$1`,[deliveryId]);
}

async function taoLoConTraLai(t:GiaoDich,o:any,qty:bigint,avId:string,nd:NguoiDung){
 const cha=await t.mot<any>(`SELECT * FROM core.lots WHERE id=$1`,[o.lot_id]);const n=Number(await t.gtri(`SELECT count(*) FROM core.lots WHERE parent_lot_id=$1`,[cha.id]))+1;const code=`${cha.code}-T${n}`;
 const grade=await t.gtri<string>(`SELECT grade_code FROM core.product_grades WHERE product_id=$1 AND profile_version=$2 AND rank>(SELECT rank FROM core.product_grades WHERE product_id=$1 AND profile_version=$2 AND grade_code=$3) ORDER BY rank LIMIT 1`,[cha.product_id,cha.profile_version,cha.grade_code])??cha.grade_code;
 const id=await appCmd<string>(t,nd,'seller','create_return_lot',[o.id,qty,grade,code]);return {id,code,grade_code:grade,qty_g:qty.toString()};
}

/** Người bán phản đối một dòng: dòng sang tranh chấp, các dòng khác vẫn chốt. */
export async function phanDoiDong(ht:HeThong,t:GiaoDich,nd:NguoiDung,deliveryId:string,x:{line_no:number;reason:string;option?:'chia_lai'|'rut_phan'|'kiem_dinh';pin?:string;device_id?:string}){
 const {d,o}=await layDot(t,deliveryId);if(phiaCua(nd,o)!=='seller')throw loi('KHONG_CO_QUYEN');canQuyen(nd,'dispute.seller');
 const l=await t.mot<any>(`SELECT l.* FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id WHERE a.delivery_id=$1 AND l.line_no=$2 ORDER BY a.version_no DESC LIMIT 1`,[deliveryId,x.line_no]);if(!l)throw loi('KHONG_TIM_THAY');
 const id=await appCmd<string>(t,nd,'seller','open_dispute',[l.id,l.qty,x.reason,'quality']);
 if(x.option==='rut_phan'){
  // 0050: người bán lập biên bản rút đúng phần tranh chấp và ký bằng PIN; bên mua ký khi gửi lại kết quả.
  const noiDung={action:'withdraw_disputed_goods',dispute_id:id,acceptance_id:l.acceptance_id,qty:Number(l.qty)};
  const ma=`${o.code}-RUT-D${d.batch_no}-${l.line_no}`;
  const rec=await taoTaiLieuPdf(t,{docType:'return_record',code:ma,seriesKey:ma,versionNo:1,orderId:o.id,ownerOrgId:o.seller_org_id,entity:'dispute',entityId:id,noiDung,status:'awaiting_signature',createdBy:nd.userId,
   trinhBay:{loai:'BBRUT',tieuDe:'BIÊN BẢN RÚT PHẦN TRANH CHẤP',muc:[{tieuDe:'Thông tin',dong:[['Đơn',o.code],['Đợt',d.code],['Dòng',String(l.line_no)],['Lượng rút',kg(l.qty)],['Lý do',x.reason]]}]}});
  const recId=await appCmd<string>(t,nd,'seller','prepare_dispute_withdrawal',[id,rec.payload]);
  await kyBienBan(ht,t,nd,recId,'seller',x.pin,x.device_id);
  return {id,status:'open',delivery_status:d.status,record_document_id:recId,huong_dan:'Đã ký biên bản rút phần tranh chấp; bên mua gửi lại kết quả với withdrawn_g để ký và lập bản mới.'};
 }
 return {id,status:'open',delivery_status:d.status,huong_dan:'Xử lý bằng command tranh chấp; không tự sửa dòng đã mở.'};
}

// ---------------- Giao tại kho bên mua (người bán lo xe) ----------------

/** Người bán xuất hàng (03 6.4): nhập mã QR nhận hàng của người nhận (DB đòi lượt quét của người nhận trước khi rời "sẵn sàng"),
 *  ghi cân lúc bốc; lượng cam kết → đang giao; rủi ro vẫn ở người bán. */
export async function xuatHang(ht: HeThong, t: GiaoDich, nd: NguoiDung, deliveryId: string, x: { loaded_g: unknown; qr_token?: string; ma_6_so?: string; plate_no?: string; seal_code?: string; device_id?: string }) {
  const { d, o, v } = await layDot(t, deliveryId);
  if (phiaCua(nd, o) !== 'seller') throw loi('KHONG_CO_QUYEN');
  canQuyen(nd, 'delivery.ship');
  if (DIEM_TAI_CHO.includes(v.acceptance_point)) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Đơn nghiệm thu tại điểm giao: dùng start-check.');
  if (d.status !== 'ready') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
  const boc = soGam(x.loaded_g, 'loaded_g');
  const raw = await layTokenNhanHang(ht, t, d, x);
  const login = await damBaoDangNhap(t, d.receiver_user_id, o.buyer_org_id, 'buyer');
  const kq = await t.voiDangNhap(login, () => t.gtri<string>(`SELECT cmd.scan_qr($1,$2,NULL)`, [raw, x.device_id ?? nd.thietBi ?? 'thiet-bi-nguoi-ban']));
  if (kq !== 'accepted') throw loi('QR_HET_HAN', undefined, { ket_qua_db: kq });
  ht.qrNhanHang.delete(deliveryId);
  await appCmd(t,nd,'seller','dispatch_delivery',[deliveryId]);
  const row=await t.mot<any>(`SELECT status,version FROM core.deliveries WHERE id=$1`,[deliveryId]);
  return {id:deliveryId,status:row.status,revision:row.version,boc_g:boc.toString()};
}

async function layTokenNhanHang(ht: HeThong, t: GiaoDich, d: any, x: { qr_token?: string; ma_6_so?: string }) {
  if (x.qr_token) {
    const r = verifyQr(x.qr_token, { expectedType: 'recv', publicKeys: { [ht.cfg.qrKid]: ht.cfg.qrPublic }, expectedAud: d.receiver_user_id, jtiStore: ht.nonce, now: ht.dongHo.giay() });
    if (!r.ok) throw loi(r.reason === 'het_han' || r.reason === 'da_dung' ? 'QR_HET_HAN' : 'QR_KHONG_DUNG_DOT', undefined, { ly_do: r.reason });
    if (r.payload.sub !== d.id) throw loi('QR_KHONG_DUNG_DOT');
    return r.payload.x.r as string;
  }
  if (x.ma_6_so) {
    const k = ht.saiMa6.get(d.id) ?? { n: 0, khoaDen: 0 };
    if (k.khoaDen > ht.dongHo.ms()) throw loi('QR_BI_KHOA');
    if (!checkFallbackCode(ht.cfg.maDuPhongBiMat, { deliveryId: d.id, receiverUserId: d.receiver_user_id, windowStart: new Date(d.win_start).toISOString() }, x.ma_6_so)) {
      k.n += 1; if (k.n >= 3) { k.khoaDen = ht.dongHo.ms() + 15 * PHUT; k.n = 0; } ht.saiMa6.set(d.id, k); throw loi('QR_KHONG_DUNG_DOT', 'Mã 6 số không đúng.');
    }
    ht.saiMa6.delete(d.id);
    const cached=ht.qrNhanHang.get(d.id);if(!cached)throw loi('QR_HET_HAN','Người nhận cần mở lại QR trên máy mình.');return cached.raw;
  }
  throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần qr_token hoặc ma_6_so.');
}

/** Bên mua ký nhận tại kho (đối chiếu biển số thẻ chuyến): đang giao → đang nghiệm thu; hạn gửi kết quả 12/24 giờ. */
export async function kyNhanTaiKho(ht: HeThong, t: GiaoDich, nd: NguoiDung, deliveryId: string, x: { plate_no?: string }) {
  const { d, o, v } = await layDot(t, deliveryId);
  if (phiaCua(nd, o) !== 'buyer') throw loi('KHONG_CO_QUYEN');
  canQuyen(nd, 'delivery.arrival');
  if (d.receiver_user_id !== nd.userId && !nd.thanhVien.vai.includes('owner')) throw loi('NGUOI_NHAN_KHONG_CHI_DINH');
  if (DIEM_TAI_CHO.includes(v.acceptance_point) || d.status !== 'in_transit') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
  if (x?.plate_no) {
    const khop = await t.mot(`SELECT 1 FROM core.trip_deliveries td JOIN core.trips tr ON tr.id=td.trip_id JOIN core.vehicles vh ON vh.id=tr.vehicle_id WHERE td.delivery_id=$1 AND vh.plate_no=$2`, [deliveryId, x.plate_no]);
    if (!khop) throw loi('QR_KHONG_DUNG_DOT', 'Biển số không khớp thẻ chuyến.');
  }
  await appCmd(t,nd,'buyer','start_acceptance',[deliveryId]);
  const row=await t.mot<any>(`SELECT status,version FROM core.deliveries WHERE id=$1`,[deliveryId]);return {id:deliveryId,status:row.status,revision:row.version};
}

// ---------------- Nơi đến ----------------

export async function kyNhanNoiDen(ht: HeThong, t: GiaoDich, nd: NguoiDung, deliveryId: string, x: { weighed_g: unknown; plate_no?: string }) {
  const { d, o, v } = await layDot(t, deliveryId);
  if (phiaCua(nd, o) !== 'buyer') throw loi('KHONG_CO_QUYEN');
  canQuyen(nd, 'delivery.arrival');
  if (d.receiver_user_id !== nd.userId && !nd.thanhVien.vai.includes('owner')) throw loi('NGUOI_NHAN_KHONG_CHI_DINH');
  if (d.status !== 'in_transit') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
  const den = soGam(x.weighed_g, 'weighed_g');
  const boc = B(await t.gtri<string>(`SELECT coalesce(sum(l.qty),0)::text FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id WHERE a.delivery_id=$1 AND l.status='closed' AND l.kind<>'rejected'`, [deliveryId]));
  const hao = boc - den;
  const vuot = hao * 10000n > boc * BigInt(v.transit_loss_allowance_bps ?? CHINH_SACH.hauHutDuongChoPhepBps);
  await appCmd(t,nd,'buyer','confirm_arrival',[deliveryId]);await appCmd(t,nd,'buyer','begin_arrival_check',[deliveryId,den]);
  const row=await t.mot<any>(`SELECT status,version FROM core.deliveries WHERE id=$1`,[deliveryId]);
  if(vuot)await taoViec(t,'V19',2,'delivery',deliveryId,o.id,'dispatcher',`transit:${deliveryId}`,'Hao hụt vượt mức');
  return { id: deliveryId, status: row.status, revision: row.version, hao_hut_g: hao.toString(), hao_hut_bps: boc > 0n ? Number((hao * 10000n) / boc) : 0, vuot_muc: vuot };
}

export async function xacNhanDenDat(ht:HeThong,t:GiaoDich,nd:NguoiDung,deliveryId:string){
 const {d,o}=await layDot(t,deliveryId);if(phiaCua(nd,o)!=='buyer')throw loi('KHONG_CO_QUYEN');canQuyen(nd,'delivery.arrival');
 if(d.receiver_user_id!==nd.userId)throw loi('NGUOI_NHAN_KHONG_CHI_DINH');if(d.status!=='arrival_check')throw loi('TRANG_THAI_KHONG_CHO_PHEP');
 await systemCmd(t,'close_delivery',[deliveryId]);const qt=await (await import('./quyet-toan.ts')).thuQuyetToan(ht,t,o.id);
 const r=await t.mot<any>(`SELECT status,version FROM core.deliveries WHERE id=$1`,[deliveryId]);return {id:deliveryId,status:r.status,revision:r.version,quyet_toan:qt};
}

export async function xemDot(t: GiaoDich, nd: NguoiDung, deliveryId: string) {
  const { d, o, v } = await layDot(t, deliveryId);
  phiaCua(nd, o);
  const kq = await t.q<any>(`SELECT a.id, a.version_no, a.weighed_qty::text weighed_g, a.document_id, encode(doc.content_sha256,'hex') content_sha256,
      (SELECT max(s.signed_at) FROM core.signatures s WHERE s.document_id=a.document_id AND s.party='seller') seller_agreed_at,
      (SELECT max(s.signed_at) FROM core.signatures s WHERE s.document_id=a.document_id AND s.party='buyer') buyer_agreed_at,
      (SELECT json_agg(json_build_object('line_no',l.line_no,'kind',l.kind,'qty_g',l.qty::text,'unit_price_vnd',l.unit_price_vnd::text,'value_vnd',l.value_vnd::text,'reason_code',l.reason_code,'evidence_document_id',l.evidence_document_id,'status',l.status) ORDER BY l.line_no) FROM core.acceptance_lines l WHERE l.acceptance_id=a.id) lines
      FROM core.acceptance_versions a JOIN core.documents doc ON doc.id=a.document_id WHERE a.delivery_id=$1 ORDER BY a.version_no`, [deliveryId]);
  // Hành động theo phía và trạng thái để UI không phải đoán quyền (NV11/NV26).
  const phia = phiaCua(nd, o);
  const cuoi = kq.at(-1);
  const hd: string[] = [];
  const taiCho = DIEM_TAI_CHO.includes(v.acceptance_point);
  if (phia === 'seller') {
    if (d.status === 'ready' && taiCho && duocPhep(nd, 'delivery.record')) hd.push('start_check');
    if (d.status === 'ready' && !taiCho && duocPhep(nd, 'delivery.ship')) hd.push('dispatch');
    if (d.status === 'awaiting_seller' && cuoi && !cuoi.seller_agreed_at && duocPhep(nd, 'acceptance.respond')) hd.push('agree_acceptance', 'dispute_line');
  } else {
    const laNguoiNhan = d.receiver_user_id === nd.userId;
    if (['ready', 'preparing'].includes(d.status) && laNguoiNhan) hd.push('show_receipt_code');
    if (['checking', 'awaiting_seller', 'disputed'].includes(d.status) && laNguoiNhan && duocPhep(nd, 'delivery.check')) hd.push('submit_acceptance');
    if (d.status === 'in_transit' && laNguoiNhan && duocPhep(nd, 'delivery.arrival')) hd.push('arrival');
  }
  return { id: d.id, code: d.code, order_id: o.id, order_code: o.code, status: d.status, revision: d.version, batch_no: d.batch_no, planned_qty_g: String(d.planned_qty),
    receiver_user_id: d.receiver_user_id, acceptance_point: v.acceptance_point, window_from: d.win_start, window_to: d.win_end, phia, hanh_dong: hd,
    the_san_sang: d.status === 'preparing' || d.status === 'ready' ? await theSanSang(t, deliveryId) : null,
    ket_qua: kq.map((k) => ({ ...k, seller_agreed: !!k.seller_agreed_at, buyer_agreed: !!k.buyer_agreed_at })) };
}

async function kyBienBan(ht:HeThong,t:GiaoDich,nd:NguoiDung,docId:string,side:'buyer'|'seller',pin?:string,device?:string){
 if(!ht.cfg.pinThu || pin!==ht.cfg.pinThu)throw loi('OTP_SAI','Cần PIN đúng ngay trước khi ký biên bản.');
 const dev=device??nd.thietBi??'thiet-bi';
 const receipt=await t.voiVai('agiviet_auth_worker',()=>t.gtri<string>(`SELECT cmd.record_reauthentication($1,$2,$3,'pin')`,[nd.userId,docId,dev]));
 await appCmd(t,nd,side,'sign_record',[docId,side,'qr_confirm',dev,receipt,null]);
}
