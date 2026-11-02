// Truy vấn cho giao diện (docs/frontend/de-xuat-backend.md, mức Cao): yêu cầu hủy hiện hành, tranh chấp của đơn,
// hướng dẫn trả thẳng (VietQR tới tài khoản trong hợp đồng, theo quyền), đổi vai thành viên.
// @ts-ignore thư viện JS dùng chung
import { buildVietQr } from '../../../security/lib/vietqr.mjs';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { canQuyen, duocPhep } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { phat } from './chung.ts';
import { B } from './tinh-tien.ts';

async function phiaDon(t: GiaoDich, nd: NguoiDung, orderId: string) {
  const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1`, [orderId]);
  if (!o) throw loi('KHONG_TIM_THAY');
  const phia = o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : o.seller_org_id === nd.thanhVien.orgId ? 'seller' : null;
  if (!phia) throw loi('KHONG_TIM_THAY');
  return { o, phia: phia as 'buyer' | 'seller' };
}

export async function yeuCauHuyCuaDon(t: GiaoDich, nd: NguoiDung, orderId: string) {
  const { phia } = await phiaDon(t, nd, orderId);
  const ds = await t.q<any>(`SELECT c.id, c.status, c.reason_kind, c.reason_text, c.outcome, c.created_at, c.requested_by_org_id, u.display_name requested_by_name,
      CASE WHEN c.requested_by_org_id=(SELECT buyer_org_id FROM core.orders WHERE id=c.order_id) THEN 'buyer' ELSE 'seller' END requested_by_side,
      (SELECT due_at FROM core.deadlines d WHERE d.entity_id=c.id AND d.kind='cancellation_reply' AND d.status='open') reply_due_at
      FROM core.cancellation_requests c JOIN core.users u ON u.id=c.requested_by_user_id WHERE c.order_id=$1 ORDER BY c.created_at DESC`, [orderId]);
  const quyen = duocPhep(nd, phia === 'buyer' ? 'cancel.buyer' : 'cancel.seller');
  return ds.map((c) => ({
    id: c.id, status: c.status, reason_kind: c.reason_kind, reason_text: c.reason_text, outcome: c.outcome, created_at: c.created_at,
    requested_by_side: c.requested_by_side, requested_by_name: c.requested_by_name, reply_due_at: c.reply_due_at,
    la_cua_toi: c.requested_by_org_id === nd.thanhVien.orgId,
    hanh_dong: c.status === 'awaiting_reply' && c.requested_by_org_id !== nd.thanhVien.orgId && quyen && !nd.thanhVien.nguoiGiup ? ['accept', 'reject'] : [],
  }));
}

export async function tranhChapCuaDon(t: GiaoDich, nd: NguoiDung, orderId: string) {
  const { phia } = await phiaDon(t, nd, orderId);
  const ds = await t.q<any>(`SELECT d.id, d.status, d.reason, d.claim_kind, d.disputed_qty::text disputed_qty_g, d.created_at, d.opened_by,
      l.line_no, l.kind line_kind, a.delivery_id, dl.code delivery_code, dl.status delivery_status,
      (SELECT json_agg(json_build_object('id',i.id,'fee_vnd',i.fee_vnd::text,'due_at',i.due_at,'prepaid_by_side',CASE WHEN i.prepaid_by_org_id=o.buyer_org_id THEN 'buyer' ELSE 'seller' END,
        'result',(SELECT r.result FROM core.inspection_results r WHERE r.inspection_id=i.id ORDER BY r.issued_at DESC LIMIT 1))) FROM core.inspections i WHERE i.dispute_id=d.id) inspections,
      (SELECT due_at FROM core.deadlines x WHERE x.entity_id=d.id AND x.status='open' ORDER BY due_at LIMIT 1) next_due_at,
      EXISTS(SELECT 1 FROM core.documents r WHERE r.doc_type='return_record' AND r.entity='dispute' AND r.entity_id=d.id) co_bien_ban_rut,
      CASE WHEN EXISTS(SELECT 1 FROM core.memberships m WHERE m.user_id=d.opened_by AND m.org_id=o.buyer_org_id) THEN 'buyer' ELSE 'seller' END opened_by_side
      FROM core.disputes d JOIN core.orders o ON o.id=d.order_id JOIN core.acceptance_lines l ON l.id=d.line_id JOIN core.acceptance_versions a ON a.id=l.acceptance_id JOIN core.deliveries dl ON dl.id=a.delivery_id
      WHERE d.order_id=$1 ORDER BY d.created_at`, [orderId]);
  return ds.map((d) => {
    const hd: string[] = [];
    if (d.status === 'open' && phia === 'buyer' && ['disputed', 'awaiting_seller'].includes(d.delivery_status) && duocPhep(nd, 'delivery.check')) hd.push('resubmit_acceptance');
    if (d.status === 'awaiting_seller' && phia === 'seller' && duocPhep(nd, 'acceptance.respond')) hd.push('agree_acceptance');
    return { id: d.id, status: d.status, reason: d.reason, claim_kind: d.claim_kind, disputed_qty_g: d.disputed_qty_g, created_at: d.created_at, opened_by_side: d.opened_by_side,
      line_no: d.line_no, line_kind: d.line_kind, delivery_id: d.delivery_id, delivery_code: d.delivery_code, inspections: d.inspections ?? [], next_due_at: d.next_due_at, hanh_dong: hd };
  });
}

/** Hướng dẫn trả thẳng: tài khoản người bán ĐÃ CHỤP trong phiên bản hợp đồng (F05), VietQR nội dung mã khoản. Chỉ bên trả có quyền tiền. */
export async function huongDanTraThang(t: GiaoDich, nd: NguoiDung, paymentId: string) {
  const p = await t.mot<any>(`SELECT p.*, coalesce(o.code, f.code) order_code, o.effective_version_no, coalesce(o.seller_org_id, f.seller_org_id) seller_org_id, coalesce(o.buyer_org_id, f.buyer_org_id) buyer_org_id
    FROM core.direct_payments p LEFT JOIN core.orders o ON o.id=p.order_id LEFT JOIN core.framework_contracts f ON f.id=p.framework_id WHERE p.id=$1`, [paymentId]);
  if (!p || p.payer_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  canQuyen(nd, p.direction === 'buyer_to_seller' ? 'money.pay.buyer' : 'money.confirm.seller');
  const daNhan = B(await t.gtri<string>(`SELECT coalesce(sum(amount_vnd),0)::text FROM core.direct_payment_confirmations WHERE direct_payment_id=$1`, [paymentId]));
  const con = B(p.amount_due_vnd) - daNhan;
  const noiDung = `AGV ${String(p.order_code).replace(/-/g, '')} ${String(p.code).split('-').pop()}`;
  if (p.direction === 'seller_to_buyer') {
    // Người bán hoàn: chỉ vào tài khoản ĐÃ XÁC MINH, đang hoạt động của tổ chức bên mua (khai qua OTP, có thời gian chờ khi đổi).
    // Không dùng số tài khoản bên mua tự gõ trong tin nhắn (chống lừa đổi tài khoản).
    const tkm = await t.mot<any>(`SELECT id, bank_code, account_masked, holder_name, replace(convert_from(account_number_enc,'UTF8'),'TEST:','') so, activated_at
        FROM pii.bank_accounts WHERE org_id=$1 AND status='active' AND (cooldown_until IS NULL OR cooldown_until <= ref.clock_at()) ORDER BY activated_at DESC NULLS LAST LIMIT 1`, [p.payee_org_id]);
    if (!tkm) return { payment_id: paymentId, code: p.code, direction: p.direction, status: p.status, so_tien_con_vnd: con.toString(), due_at: p.due_at, noi_dung: noiDung, tai_khoan: null, vietqr: null,
      cau: 'Bên mua chưa có tài khoản nhận tiền đã xác minh. App bên mua đang hiện chỗ để họ khai; khi có, số tài khoản sẽ hiện ở đây. Bác đừng chuyển theo số tài khoản gửi qua tin nhắn.' };
    const doiGanDayM = tkm.activated_at && new Date(tkm.activated_at).getTime() > t.thoiDiemMs - 30 * 864e5;
    let vqr: string | null = null;
    try { vqr = buildVietQr({ bin: '970499', accountNumber: tkm.so.replace(/[^0-9A-Z]/gi, ''), amountVnd: Number(con), addInfo: noiDung }); } catch { vqr = null; }
    return { payment_id: paymentId, code: p.code, direction: p.direction, status: p.status, so_tien_con_vnd: con.toString(), due_at: p.due_at, noi_dung: noiDung,
      tai_khoan: { ngan_hang: tkm.bank_code, so_tai_khoan: tkm.so, so_che: tkm.account_masked, chu_tai_khoan: tkm.holder_name, ghi_chu: 'Tài khoản đã xác minh của bên mua (DỮ LIỆU THỬ)' },
      vietqr: vqr, canh_bao: doiGanDayM ? `Tài khoản nhận tiền của bên mua vừa đổi ngày ${new Date(tkm.activated_at).toISOString().slice(0, 10)}` : null,
      cau: `Chỉ hoàn vào tài khoản đã xác minh của bên mua: ${tkm.bank_code} •••• ${String(tkm.account_masked).slice(-4)}, đúng tên ${tkm.holder_name}.` };
  }
  // Khoản trả gộp tuần (không gắn đơn): tài khoản chụp trong hợp đồng khung.
  const v = p.order_id ? await t.mot<any>(`SELECT seller_bank_account_id, seller_bank_code, seller_account_masked, seller_account_holder FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [p.order_id, p.effective_version_no])
    : await t.mot<any>(`SELECT seller_bank_account_id, seller_bank_code, seller_account_masked, seller_account_holder FROM core.framework_terms WHERE framework_id=$1`, [p.framework_id]);
  if (!v) throw loi('KHONG_TIM_THAY');
  const tk = await t.mot<any>(`SELECT replace(convert_from(account_number_enc,'UTF8'),'TEST:','') so, activated_at, status FROM pii.bank_accounts WHERE id=$1`, [v.seller_bank_account_id]);
  const doiGanDay = await t.mot<any>(`SELECT max(activated_at) luc FROM pii.bank_accounts WHERE org_id=$1 AND activated_at > now()-interval '30 days'`, [p.seller_org_id]);
  let vietqr: string | null = null;
  try { vietqr = buildVietQr({ bin: '970499', accountNumber: tk.so.replace(/[^0-9A-Z]/gi, ''), amountVnd: Number(con), addInfo: noiDung }); } catch { vietqr = null; }
  return {
    payment_id: paymentId, code: p.code, direction: p.direction, status: p.status, so_tien_con_vnd: con.toString(), due_at: p.due_at, noi_dung: noiDung,
    tai_khoan: { ngan_hang: v.seller_bank_code, so_tai_khoan: tk.so, so_che: v.seller_account_masked, chu_tai_khoan: v.seller_account_holder, ghi_chu: 'Số chụp trong phiên bản hợp đồng hiện hành (DỮ LIỆU THỬ)' },
    vietqr, canh_bao: doiGanDay?.luc ? `Tài khoản nhận tiền của người bán vừa đổi ngày ${new Date(doiGanDay.luc).toISOString().slice(0, 10)}` : null,
    cau: `Chỉ chuyển vào tài khoản ghi trong hợp đồng: ${v.seller_bank_code} •••• ${String(v.seller_account_masked).slice(-4)}, đúng tên ${v.seller_account_holder}.`,
  };
}

/** Đổi vai thành viên (chủ tổ chức). Vai đặc quyền mới hiệu lực sau 24 giờ (DB). */
export async function doiVai(t:GiaoDich,nd:NguoiDung,membershipId:string,b:{add?:string[];remove?:string[];approval_limit_vnd?:unknown}){
 const m=await t.mot<any>(`SELECT * FROM core.memberships WHERE id=$1`,[membershipId]);if(!m||m.org_id!==nd.thanhVien.orgId)throw loi('KHONG_TIM_THAY');
 const {appCmd}=await import('../db/command.ts');const side=nd.thanhVien.canSell?'seller':'buyer';
 for(const r of b.add??[])await appCmd(t,nd,side,'grant_member_role',[membershipId,r]);
 for(const r of b.remove??[]){const ids=await t.q<any>(`SELECT id FROM core.membership_role_grants WHERE membership_id=$1 AND role_code=$2 AND revoked_at IS NULL`,[membershipId,r]);for(const g of ids)await appCmd(t,nd,side,'revoke_member_role',[g.id]);}
 if(b.approval_limit_vnd!==undefined)await appCmd(t,nd,side,'update_member',[membershipId,m.status,b.approval_limit_vnd==null?null:String(b.approval_limit_vnd),'Chủ tổ chức sửa hạn mức']);
 const roles=await t.q(`SELECT role_code,effective_at FROM core.membership_role_grants WHERE membership_id=$1`,[membershipId]);return {id:membershipId,status:m.status,roles};
}
