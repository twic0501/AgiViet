import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Đề nghị sửa và phụ lục (03 mục 10, 04 mục 4, 07 mục 5.2).
// Một đề nghị một mục: đổi ngày giao, tăng/giảm lượng, giảm lượng bất khả kháng, đổi giá, đổi người nhận (chỉ thông báo).
// Bên kia đồng ý → phiên bản đơn mới + phụ lục PDF (chuỗi mã băm nối hợp đồng) → hai bên ký OTP amendment_sign →
// phiên bản hiệu lực mới: tính lại cọc/phí (giá tính cọc dùng P_tk đã ghi lúc ký), điều chỉnh lượng cam kết, đợt chưa giao,
// khoản trả trước bốc chưa trả; phạt Q04 khi giảm lượng không do bất khả kháng.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import type { HeThong } from '../he-thong.ts';
import { canQuyen } from '../auth/quyen.ts';
import { damBaoDangNhap } from '../db/dang-nhap-rieng.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { GIO } from '../dong-ho.ts';
import { chuyenTrangThai, dongHan, phat, taoHan, soGam, kg, dong, dongBoTaiLieu } from './chung.ts';
import { B, chiaNuaLen, tienDong, phatThieuLuong } from './tinh-tien.ts';
import { taoTaiLieuPdf } from '../pdf/tai-lieu-pdf.ts';
import { guiLenhChoNganHangTheoMa, taoKhoanTraThang, taoViec } from './tien.ts';
import { phatQrNhanHang, thuSanSang } from './giao-nhan.ts';

export type LoaiDeNghi = 'change_date' | 'increase_qty' | 'decrease_qty' | 'force_majeure_reduction' | 'change_price' | 'change_receiver';
const TEN: Record<string, string> = { change_date: 'Đổi ngày giao', increase_qty: 'Tăng lượng', decrease_qty: 'Giảm lượng', force_majeure_reduction: 'Giảm lượng do bất khả kháng', change_price: 'Đổi giá', change_receiver: 'Đổi người nhận', fix_qty_price: 'Chốt lượng và giá đặt trước' };

async function layDon(t: GiaoDich, nd: NguoiDung, id: string) {
  const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1 FOR UPDATE`, [id]);
  if (!o) throw loi('KHONG_TIM_THAY');
  const phia = o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : o.seller_org_id === nd.thanhVien.orgId ? 'seller' : null;
  if (!phia) throw loi('KHONG_TIM_THAY');
  canQuyen(nd, phia === 'buyer' ? 'order.sign.buyer' : 'order.sign.seller', 'Chỉ người có quyền ký mới gửi/đồng ý đề nghị sửa.');
  return { o, phia: phia as 'buyer' | 'seller' };
}

export async function guiDeNghi(ht: HeThong, t: GiaoDich, nd: NguoiDung, orderId: string, d: { kind: LoaiDeNghi; payload: any; reason?: string; evidence_document_ids?: string[]; notice_days_before_delivery?: number }) {
  const { o, phia } = await layDon(t, nd, orderId);
  if (!['awaiting_deposit', 'active'].includes(o.status)) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Chỉ gửi đề nghị khi đơn đã ký (chờ cọc hoặc đang thực hiện).');
  if (await t.mot(`SELECT 1 FROM core.amendments WHERE order_id=$1 AND status='open'`, [orderId])) throw loi('DANG_CO_DE_NGHI');
  if (await t.mot(`SELECT 1 FROM core.amendments a WHERE a.order_id=$1 AND a.status='accepted' AND a.resulting_version_no>$2`, [orderId, o.effective_version_no])) throw loi('DANG_CO_DE_NGHI', 'Phụ lục trước chưa đủ chữ ký.');
  if (!TEN[d.kind]) throw loi('DU_LIEU_KHONG_HOP_LE', 'Loại đề nghị không hỗ trợ.');
  const v = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [orderId, o.effective_version_no]);
  const p = d.payload ?? {};
  if (d.kind === 'change_date' && !(p.delivery_from && p.delivery_to && new Date(p.delivery_from) < new Date(p.delivery_to))) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần delivery_from < delivery_to.');
  if (['increase_qty', 'decrease_qty', 'force_majeure_reduction'].includes(d.kind)) {
    const q = soGam(p.qty_g);
    if (d.kind === 'increase_qty' ? q <= B(v.qty_min) : q >= B(v.qty_min) || q <= 0n) throw loi('DU_LIEU_KHONG_HOP_LE', 'Lượng mới không hợp lệ cho loại đề nghị.');
    const daGiao = B(await t.gtri<string>(`SELECT coalesce(sum(qty),0)::text FROM ledger.qty_balances WHERE order_key=$1 AND bucket IN ('in_transit','delivered')`, [orderId]));
    if (q < daGiao) throw loi('DU_LIEU_KHONG_HOP_LE', 'Lượng mới nhỏ hơn lượng đã giao.');
  }
  if (d.kind === 'force_majeure_reduction' && !(d.evidence_document_ids?.length)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Bất khả kháng cần bằng chứng (ảnh, xác nhận HTX, thông báo thiên tai).');
  if (d.kind === 'force_majeure_reduction' && phia !== 'seller') throw loi('KHONG_CO_QUYEN', 'Giảm lượng bất khả kháng do người bán gửi.');
  if (d.kind === 'change_price' && !(soGam(p.unit_price_vnd, 'unit_price_vnd') > 0n)) throw loi('DU_LIEU_KHONG_HOP_LE');
  if (d.kind === 'change_receiver' && phia !== 'buyer') throw loi('KHONG_CO_QUYEN', 'Bên mua đổi người nhận.');
  const payload=d.kind==='change_date'?{delivery_window:`[${new Date(p.delivery_from).toISOString()},${new Date(p.delivery_to).toISOString()})`,reason:d.reason??null}:{...p,reason:d.reason??null};
 const id=await appCmd<string>(t,nd,phia,'propose_amendment',[orderId,d.kind,payload,d.evidence_document_ids??[]]);
 const a=await t.mot<any>(`SELECT status,version FROM core.amendments WHERE id=$1`,[id]);return {id,status:a.status,revision:a.version,kind:d.kind};
}

async function layDeNghi(t: GiaoDich, nd: NguoiDung, id: string) {
  const a = await t.mot<any>(`SELECT * FROM core.amendments WHERE id=$1 FOR UPDATE`, [id]);
  if (!a) throw loi('KHONG_TIM_THAY');
  const { o, phia } = await layDon(t, nd, a.order_id);
  return { a, o, phia };
}

/** Tính phiên bản mới (chưa ghi). Giá tính cọc giữ P_tk đã ghi lúc ký. */
function tinhPhienBan(v: any, a: any) {
  const p = a.payload;
  const Q = ['increase_qty', 'decrease_qty', 'force_majeure_reduction', 'fix_qty_price'].includes(a.kind) ? BigInt(p.qty_g) : B(v.qty_min);
  const P = ['change_price', 'fix_qty_price'].includes(a.kind) ? BigInt(p.unit_price_vnd) : B(v.unit_price_vnd);
  let Pcoc = P;
  if (v.ref_price_source === 'trades' && v.ref_price_vnd) { const san = (B(v.ref_price_vnd) * 7n + 9n) / 10n; Pcoc = P > san ? P : san; }
  const G = tienDong(Q, P); const Gcoc = tienDong(Q, Pcoc);
  const r = chiaNuaLen(Gcoc * BigInt(v.deposit_bps), 10000n * 1000n) * 1000n;
  const C = G < r ? G : r;
  let F = 0n;
  if (v.fee_bps > 0) { F = chiaNuaLen(Gcoc * BigInt(v.fee_bps), 10000n); if (v.fee_floor_vnd != null && F < B(v.fee_floor_vnd)) F = B(v.fee_floor_vnd); if (v.fee_cap_vnd != null && F > B(v.fee_cap_vnd)) F = B(v.fee_cap_vnd); }
  return { Q, P, Pcoc, G, Gcoc, C, F, tu: a.kind === 'change_date' ? String(p.delivery_window).slice(1,-1).split(',')[0] : null, den: a.kind === 'change_date' ? String(p.delivery_window).slice(1,-1).split(',')[1] : null };
}

/** Bên kia đồng ý → phiên bản mới + phụ lục chờ hai bên ký. */
export async function dongYDeNghi(ht: HeThong, t: GiaoDich, nd: NguoiDung, id: string) {
  const { a, o } = await layDeNghi(t, nd, id);
  if (a.proposed_by_org_id === nd.thanhVien.orgId) throw loi('KHONG_CO_QUYEN', 'Bên gửi không tự đồng ý.');
  if (a.status !== 'open') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
  const v = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [o.id, o.effective_version_no]);
  const m = tinhPhienBan(v, a);
  const so = Number(await t.gtri(`SELECT max(version_no) FROM core.order_versions WHERE order_id=$1`, [o.id])) + 1;
  const prevDoc = await t.mot<any>(`SELECT id, series_key FROM core.documents WHERE id=(SELECT document_id FROM core.order_versions WHERE order_id=$1 AND version_no=$2)`, [o.id, so - 1]);
  const cu = { luong_g: B(v.qty_min), gia: B(v.unit_price_vnd), coc: B(v.deposit_vnd), phi: B(v.fee_vnd), gia_tri: B(v.contract_value_vnd) };
  const moi = { luong_g: m.Q, gia: m.P, coc: m.C, phi: m.F, gia_tri: m.G };
  const doc = await taoTaiLieuPdf(t, {
    docType: 'annex', code: `${o.code}-PL${so}`, seriesKey: prevDoc.series_key, versionNo: so, orderId: o.id, ownerOrgId: o.buyer_org_id, status: 'awaiting_signature',
    prevDocumentId: prevDoc.id, createdBy: nd.userId,
    noiDung: { loai: 'PL', don: o.code, phu_luc: so, de_nghi: a.id, muc: a.kind, cu, moi, ngay_giao_moi: m.tu ? { tu: m.tu, den: m.den } : null, ly_do: a.payload.ly_do ?? null },
    trinhBay: { loai: 'PL', tieuDe: `PHỤ LỤC ${so} · ${TEN[a.kind].toUpperCase()}`, muc: [
      { tieuDe: 'Thay đổi (cũ → mới)', dong: [
        ['Lượng', `${kg(cu.luong_g)} → ${kg(moi.luong_g)}`], ['Giá', `${dong(cu.gia)} → ${dong(moi.gia)}`], ['Giá trị', `${dong(cu.gia_tri)} → ${dong(moi.gia_tri)}`],
        ['Cọc', `${dong(cu.coc)} → ${dong(moi.coc)}`], ['Phí', `${dong(cu.phi)} → ${dong(moi.phi)}`], ...(m.tu ? [['Ngày giao mới', `${m.tu} – ${m.den}`] as [string, string]] : [])] },
      { tieuDe: 'Căn cứ', doan: [`Đề nghị ${a.id}: ${a.payload.ly_do ?? TEN[a.kind]}`] },
    ] },
  });
  const {phia}=await layDeNghi(t,nd,id);
 doc.id=await appCmd<string>(t,nd,phia,'answer_amendment',[id,'accept',doc.payload]);
  return { id: a.id, status: 'accepted', resulting_version_no: so, annex_document_id: doc.id, content_sha256: doc.contentSha256,
    tinh: { coc_vnd: m.C.toString(), phi_vnd: m.F.toString(), gia_tri_vnd: m.G.toString(), chenh_coc_vnd: (m.C - cu.coc).toString(), chenh_phi_vnd: (m.F - cu.phi).toString() } };
}

export async function tuChoiDeNghi(t:GiaoDich,nd:NguoiDung,id:string){
 const {phia}=await layDeNghi(t,nd,id);await appCmd(t,nd,phia,'answer_amendment',[id,'reject',null]);return {id,status:'rejected'};
}

export async function rutDeNghi(t:GiaoDich,nd:NguoiDung,id:string){
 const {phia}=await layDeNghi(t,nd,id);await appCmd(t,nd,phia,'answer_amendment',[id,'withdraw',null]);return {id,status:'withdrawn'};
}

/** Ký phụ lục (OTP amendment_sign đã xác minh). Đủ hai chữ ký → phiên bản hiệu lực mới + hệ quả tiền/lượng. */
export async function kyPhuLuc(ht: HeThong, t: GiaoDich, nd: NguoiDung, amendmentId: string, d: { challenge_id: string; device_id?: string }) {
  const { a, o, phia } = await layDeNghi(t, nd, amendmentId);
  if (a.status !== 'accepted' || !a.resulting_version_no || a.resulting_version_no <= o.effective_version_no) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Không có phụ lục chờ ký.');
  const nv = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [o.id, a.resulting_version_no]);
  const login = await damBaoDangNhap(t, nd.userId, nd.thanhVien.orgId, phia);
  await t.voiDangNhap(login, () => t.q(`SELECT cmd.sign_document($1,$2,$3,$4)`, [nv.document_id, phia, d.challenge_id, d.device_id ?? nd.thietBi ?? 'thiet-bi']));
  const ben = await t.q<{ party: string }>(`SELECT DISTINCT party FROM core.signatures WHERE document_id=$1`, [nv.document_id]);
  const du = ben.some((x) => x.party === 'buyer') && ben.some((x) => x.party === 'seller');
  const actor = await t.gtri<string>(`SELECT current_setting('app.actor_kind',true)`);
  await t.q(`SELECT set_config('app.actor_kind','system',true)`);
  if (!du) {
    await dongBoTaiLieu(t, nv.document_id, 'partially_signed');
    await phat(t, 'amendment', a.id, 'tai_lieu.ky', { party: phia });
    await t.q(`SELECT set_config('app.actor_kind',$1,true)`, [actor]);
    return { id: a.id, status: 'cho_ben_kia_ky', document_id: nv.document_id };
  }
  await dongBoTaiLieu(t, nv.document_id, 'fully_signed');
  await systemCmd(t,'apply_signed_amendment',[a.id]); // 0051: đổi giá hoàn cọc chênh, giữ phí theo Q06.
 for(const b of await t.q<any>(`SELECT code FROM core.bank_instructions WHERE order_id=$1 AND status='created'`,[o.id]))await guiLenhChoNganHangTheoMa(t,b.code);
 const adjustment=await t.mot<any>(`SELECT id,payment_ref,delta_deposit_vnd dc,delta_fee_vnd df FROM core.deposit_adjustments WHERE deposit_id=(SELECT id FROM core.deposits WHERE order_id=$1) AND order_version_no=$2`,[o.id,a.resulting_version_no]);
 const heQua:any={};if(adjustment){heQua.chenh_coc_vnd=String(adjustment.dc);heQua.chenh_phi_vnd=String(adjustment.df);heQua.bo_sung_coc_ref=adjustment.payment_ref;
 const refunds=await t.q<any>(`SELECT kind,code,amount_vnd::text amount FROM core.bank_instructions WHERE basis_id=$1`,[adjustment.id]);
 heQua.hoan_coc_vnd=refunds.filter(r=>r.kind==='refund_deposit_to_buyer').reduce((sum,r)=>sum+BigInt(r.amount),0n).toString();heQua.hoan_phi_vnd=refunds.filter(r=>r.kind==='refund_fee').reduce((sum,r)=>sum+BigInt(r.amount),0n).toString();heQua.lenh_hoan=refunds.map(r=>r.code).join(',');
 }
 const dp=await t.gtri<string>(`SELECT amount_due_vnd::text FROM core.direct_payments WHERE order_id=$1 AND kind='goods_before_loading' AND status<>'cancelled' ORDER BY created_at DESC LIMIT 1`,[o.id]);if(dp)heQua.tra_thang_moi_vnd=dp;
 return {id:a.id,status:'effective',version_no:a.resulting_version_no,he_qua:heQua};
}

async function apHeQua(ht:HeThong,t:GiaoDich,o:any,v:any,nv:any,a:any){
 return systemCmd(t,'apply_signed_amendment',[a.id]);
}

/** Hết 24 giờ: im lặng = không đồng ý; riêng giảm lượng bất khả kháng → việc cho vận hành xét bằng chứng. */
export async function hetHanDeNghi(t:GiaoDich,id:string){
 const h=await t.gtri<string>(`SELECT id FROM core.deadlines WHERE entity_id=$1 AND kind='amendment_reply' AND status='open'`,[id]);return h?(await systemCmd<any>(t,'expire_deadline_result',[h])).action:'noop';
}

export async function danhSachDeNghi(t: GiaoDich, nd: NguoiDung, orderId: string) {
  const o = await t.mot<any>(`SELECT buyer_org_id, seller_org_id FROM core.orders WHERE id=$1`, [orderId]);
  if (!o || (o.buyer_org_id !== nd.thanhVien.orgId && o.seller_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  return t.q(`SELECT a.id,a.kind,a.status,a.payload,a.resulting_version_no,a.created_at,a.proposed_by_org_id=$2 la_cua_toi,
      (SELECT document_id FROM core.order_versions v WHERE v.order_id=a.order_id AND v.version_no=a.resulting_version_no) annex_document_id,
      (SELECT due_at FROM core.deadlines d WHERE d.entity_id=a.id AND d.kind='amendment_reply' AND d.status='open') han
      FROM core.amendments a WHERE a.order_id=$1 ORDER BY a.created_at`, [orderId, nd.thanhVien.orgId]);
}
