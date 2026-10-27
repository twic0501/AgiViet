import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Tranh chấp (03 mục 8, 04 mục 6). Làm: khiếu nại khác mẫu ở nơi đến trong 2 giờ (TH-029) → phiên bản nghiệm thu mới
// (dòng tranh chấp tính theo mức bên mua thừa nhận), đặt kiểm định (phí bên mua ứng), quyết toán tạm có G_them (N-08);
// kết quả kiểm định chỉ nhận qua webhook có chữ ký HMAC của đối tác (N-11) → chốt dòng, phí kiểm định cho bên sai, quyết toán cuối.
// Không kết luận: chờ thỏa thuận 14 ngày rồi chuyển cơ chế khác (tiền tranh chấp tiếp tục giữ).
// Chưa làm: phản đối dòng tại vườn (phan_doi_dong), cân lại, thỏa thuận chia, kiểm định lần 2.
// @ts-ignore thư viện JS dùng chung
import { verifyWebhook, signWebhook } from '../../../security/lib/webhook.mjs';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import type { HeThong } from '../he-thong.ts';
import { canQuyen } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { GIO } from '../dong-ho.ts';
import { chuyenTrangThai, dongHan, phat, taoHan, soGam, kg, dong } from './chung.ts';
import { B, tienDong } from './tinh-tien.ts';
import { taoTaiLieuPdf } from '../pdf/tai-lieu-pdf.ts';
import { lapQuyetToan, thuQuyetToan } from './quyet-toan.ts';
import { taoViec } from './tien.ts';

async function datVai(t: GiaoDich, actor: string, userId?: string | null, orgId?: string | null) {
  await t.q(`SELECT set_config('app.actor_kind',$1,true), set_config('app.user_id',$2,true), set_config('app.org_id',$3,true)`, [actor, userId ?? '', orgId ?? '']);
}

export async function moTranhChap(_ht: HeThong, _t: GiaoDich, _nd: NguoiDung, _d: any, _o: any, _lineNo: number, _lyDo: string, _ben: 'seller' | 'buyer'): Promise<any> {
  throw loi('CHUA_HO_TRO', 'Phản đối dòng tại điểm nghiệm thu chưa làm ở backend (dùng gửi lại kết quả).');
}

/** Tạo phiên bản nghiệm thu mới sao chép dòng hiện hành; hàm sửa(dòng) trả danh sách dòng mới kèm trạng thái đích. */
async function phienBanMoi(t: GiaoDich, d: any, o: any, v: any, nguoiGhi: string, lyDo: string,
  sua: (dong: any[]) => { kind: string; qty: bigint; reason_code: string | null; dich: 'closed' | 'disputed'; evidence: string | null }[]) {
  const cu = await t.mot<any>(`SELECT a.*, doc.canonical_content FROM core.acceptance_versions a JOIN core.documents doc ON doc.id=a.document_id WHERE a.delivery_id=$1 ORDER BY a.version_no DESC LIMIT 1`, [d.id]);
  const dongCu = await t.q<any>(`SELECT * FROM core.acceptance_lines WHERE acceptance_id=$1 ORDER BY line_no`, [cu.id]);
  // Dòng trả lại đã chốt ở bản trước: biên bản đã ký hai bên là chứng cứ của dòng đó.
  const moi = sua(dongCu).map((l) => ({ ...l, evidence: l.evidence ?? (l.kind === 'rejected' ? cu.document_id : null) }));
  const so = cu.version_no + 1;
  const tong = moi.reduce((a, l) => a + l.qty, 0n);
  if (tong !== B(cu.weighed_qty)) throw loi('KET_QUA_KHONG_KHOP_TONG');
  const gia = (k: string) => (k === 'rejected' ? 0n : k === 'downgraded' ? B(v.downgrade_price_vnd) : B(v.unit_price_vnd));
  const ma = `${o.code}-BBNT-D${d.batch_no}`;
  const noiDung = { loai: 'BBNT', don: o.code, dot: d.code, phien_ban_ket_qua: so, ly_do_phien_ban: lyDo, luong_can_g: B(cu.weighed_qty),
    dong: moi.map((l, i) => ({ so: i + 1, loai: l.kind, luong_g: l.qty, gia_vnd: gia(l.kind), gia_tri_vnd: tienDong(l.kind === 'rejected' ? 0n : l.qty, gia(l.kind)), ly_do: l.reason_code, trang_thai: l.dich })) };
  const doc = await taoTaiLieuPdf(t, {
    docType: 'acceptance_record', code: `${ma}-V${so}`, seriesKey: ma, versionNo: so, orderId: o.id, ownerOrgId: o.buyer_org_id, entity: 'delivery', entityId: d.id,
    noiDung, status: 'awaiting_signature', prevDocumentId: cu.document_id,
    trinhBay: { loai: 'BBNT', tieuDe: `BIÊN BẢN NGHIỆM THU (PHIÊN BẢN ${so})`, muc: [
      { tieuDe: 'Lý do phiên bản mới', doan: [lyDo] },
      { tieuDe: 'Kết quả', bang: { cot: ['Dòng', 'Phần', 'Lượng', 'Giá', 'Trạng thái'], hang: moi.map((l, i) => [String(i + 1), l.kind, kg(l.qty), dong(gia(l.kind)), l.dich === 'disputed' ? 'Tranh chấp' : 'Đã chốt']) } },
    ] },
  });
  return {av:{id:'',version_no:so},doc,ids:[] as {id:string;dich:string}[]};
}

/** Bên mua khiếu nại khác mẫu ở nơi đến (trong 2 giờ kiểm đến): mở tranh chấp + đặt kiểm định + quyết toán tạm. */
export async function khieuNaiKhacMau(ht: HeThong, t: GiaoDich, nd: NguoiDung, deliveryId: string, x: { line_no: number; qty_g: unknown; reason: string; reason_code?: string; seal_code?: string; inspection_fee_vnd?: unknown; evidence_document_id?: string }) {
  const d = await t.mot<any>(`SELECT * FROM core.deliveries WHERE id=$1 FOR UPDATE`, [deliveryId]);
  if (!d) throw loi('KHONG_TIM_THAY');
  const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1 FOR UPDATE`, [d.order_id]);
  if (o.buyer_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  canQuyen(nd, 'dispute.buyer');
  if (d.status !== 'arrival_check') throw loi('TRANG_THAI_KHONG_CHO_PHEP');
  const han = await t.mot<any>(`SELECT due_at FROM core.deadlines WHERE entity_id=$1 AND kind='arrival_check' AND status='open'`, [deliveryId]);
  if (!han || new Date(han.due_at).getTime() < t.thoiDiemMs) throw loi('HET_HAN_KHIEU_NAI');
  if (!x.reason) throw loi('THIEU_LY_DO');
  const v = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [o.id, d.version_no]);
  const qty = soGam(x.qty_g);
  const lyDoMa = x.reason_code ?? 'SAU_DUC';
  if(!x.evidence_document_id)throw loi('DU_LIEU_KHONG_HOP_LE','Cần chứng cứ khiếu nại đúng đơn.');
 const {doc}=await phienBanMoi(t,d,o,v,nd.userId,`Khiếu nại khác mẫu: ${x.reason}`,cu=>{
 const out:any[]=[];for(const l of cu){if(l.line_no===x.line_no){if(B(l.qty)>qty)out.push({kind:l.kind,qty:B(l.qty)-qty,reason_code:l.reason_code,dich:'closed',evidence:l.evidence_document_id});out.push({kind:'rejected',qty,reason_code:lyDoMa,dich:'disputed',evidence:x.evidence_document_id});}else out.push({kind:l.kind,qty:B(l.qty),reason_code:l.reason_code,dich:'closed',evidence:l.evidence_document_id});}return out;});
 const tc=await appCmd<string>(t,nd,'buyer','claim_arrival_difference',[deliveryId,x.line_no,qty,x.reason,x.evidence_document_id,doc.payload]);
 const provider=await t.gtri<string>(`SELECT id FROM core.organizations WHERE code='DT-KD'`);
 const sample=x.seal_code?await t.gtri<string>(`SELECT id FROM core.sealed_samples WHERE delivery_id=$1 AND code=$2`,[deliveryId,x.seal_code]):null;
 const ins=await appCmd<string>(t,nd,'buyer','request_inspection',[tc,provider,sample,String(x.inspection_fee_vnd??0),x.evidence_document_id]);
 const qt=await lapQuyetToan(ht,t,o,false);return {id:tc,status:'awaiting_inspection',inspection_id:ins,quyet_toan_tam:qt,quyet_toan:qt};
}

export async function xuLyWebhookKiemDinh(ht: HeThong, rawBody: string, headers: Record<string, string>) {
  const kq = verifyWebhook({ headers, rawBody, keys: { 'kd-mo-phong-1': ht.cfg.webhookKeys['kd-mo-phong-1'] }, nonceStore: ht.nonce, now: Math.floor(Date.now() / 1000), provider: 'inspection' } as any);
  if (!kq.ok) throw loi('WEBHOOK_KHONG_HOP_LE', undefined, { ly_do: kq.reason });
  const ev = JSON.parse(rawBody);
  if (!['passed', 'failed', 'inconclusive'].includes(ev.result)) throw loi('DU_LIEU_KHONG_HOP_LE');
  return ht.db.tx({ actor: 'inspector', lenh: 'ket_qua_kiem_dinh', requestId: `kd:${ev.event_id}` }, async (t) => {
    const ins = await t.mot<any>(`SELECT * FROM core.inspections WHERE id=$1 FOR UPDATE`, [ev.inspection_id]);
    if (!ins) throw loi('KHONG_TIM_THAY');
    
    const tc = await t.mot<any>(`SELECT * FROM core.disputes WHERE id=$1 FOR UPDATE`, [ins.dispute_id]);
    const d = await t.mot<any>(`SELECT * FROM core.deliveries WHERE id=$1 FOR UPDATE`, [ins.delivery_id]);
    const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1 FOR UPDATE`, [tc.order_id]);
    const v = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [o.id, d.version_no]);
    // Đối chiếu QR niêm phong mẫu.
    const seal = await t.gtri<string>(`SELECT doc.canonical_content->>'mau_niem_phong' FROM core.acceptance_versions a JOIN core.documents doc ON doc.id=a.document_id WHERE a.delivery_id=$1 AND a.version_no=1`, [d.id]);
    if (seal && ev.sample_code !== seal) throw loi('DU_LIEU_KHONG_HOP_LE', 'Mã mẫu niêm phong không khớp biên bản.');
    const inspector = await t.mot<any>(`SELECT m.user_id FROM core.memberships m JOIN ops.staff_assignments s ON s.user_id=m.user_id WHERE m.org_id=$1 AND s.role_code='inspector' LIMIT 1`, [ins.provider_org_id]);
    await datVai(t, 'inspector', inspector.user_id, ins.provider_org_id);
    const doc = await taoTaiLieuPdf(t, {
      docType: 'inspection_report', code: `${o.code}-BBKD-${ins.id.slice(0, 6)}`, seriesKey: `${o.code}-BBKD-${ins.id.slice(0, 6)}`, versionNo: 1, orderId: o.id, ownerOrgId: ins.provider_org_id,
      entity: 'inspection', entityId: ins.id, status: 'draft', noiDung: { loai: 'BBKD', don: o.code, ket_qua: ev.result, mau: ev.sample_code, do_dac: ev.measurements ?? {} },
      trinhBay: { loai: 'BBKD', tieuDe: 'KẾT QUẢ KIỂM ĐỊNH (ĐỐI TÁC MÔ PHỎNG)', muc: [{ tieuDe: 'Kết quả', dong: [['Đơn', o.code], ['Kết quả', ev.result], ['Mẫu niêm phong', String(ev.sample_code ?? '—')]] }], ghiChuCuoi: ['Ký số mô phỏng của đối tác kiểm định; không phải chữ ký số công cộng.'] },
    });
    const {damBaoDangNhap}=await import('../db/dang-nhap-rieng.ts');
    const login=await damBaoDangNhap(t,inspector.user_id,ins.provider_org_id,'inspector');
    let next:any=null;
    if(ev.result!=='inconclusive'){
     const cur=await t.q<any>(`SELECT l.* FROM core.acceptance_lines l JOIN core.acceptance_versions a ON a.id=l.acceptance_id WHERE a.delivery_id=$1 AND a.version_no=(SELECT max(version_no) FROM core.acceptance_versions WHERE delivery_id=$1) ORDER BY line_no`,[d.id]);
     const target=await t.mot<any>(`SELECT line_no FROM core.acceptance_lines WHERE id=$1`,[tc.line_id]);
     next=(await phienBanMoi(t,d,o,v,inspector.user_id,'Kết luận kiểm định',()=>cur.map(l=>({kind:l.line_no===target.line_no?(ev.result==='passed'?'accepted':'rejected'):l.kind,qty:B(l.qty),reason_code:l.reason_code,dich:'closed',evidence:l.evidence_document_id})))).doc.payload;
    }
    await loginCmd(t,login,'record_inspection_result',[ins.id,ev.event_id,ev.result,doc.payload,{...(ev.measurements??{}),sample_code:ev.sample_code??null},next]);
    if(ev.result!=='inconclusive')await systemCmd(t,'close_resolved_delivery',[d.id]);
    const qt=ev.result!=='inconclusive'?await thuQuyetToan(ht,t,o.id):null;
    return {ket_qua:ev.result,dispute_id:tc.id,quyet_toan:qt};
  });
}

/** Cổng kiểm định mô phỏng: ký HMAC rồi gửi kết quả vào webhook (chỉ môi trường thử). */
export function kyKetQuaKiemDinh(ht: HeThong, ev: Record<string, unknown>) {
  const body = JSON.stringify({ event_id: 'kd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), ...ev });
  const headers = signWebhook({ secret: ht.cfg.webhookKeys['kd-mo-phong-1'][0], kid: 'kd-mo-phong-1', rawBody: body, timestamp: Math.floor(Date.now() / 1000), nonce: undefined });
  return { body, headers };
}

/** Hết 14 ngày không thỏa thuận: chuyển cơ chế khác; tiền tranh chấp tiếp tục giữ. */
export async function hetHanThoaThuan(t:GiaoDich,disputeId:string){
 const h=await t.gtri<string>(`SELECT id FROM core.deadlines WHERE entity_id=$1 AND kind='dispute_agreement' AND status='open'`,[disputeId]);return h?(await systemCmd<any>(t,'expire_deadline_result',[h])).action:'noop';
}
