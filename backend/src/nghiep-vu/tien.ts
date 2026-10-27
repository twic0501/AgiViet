import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Tiền: webhook ngân hàng (HMAC + tra lại API + áp bằng vai bank worker), kích hoạt đơn khi đủ cọc,
// khoản trả thẳng (bên trả báo, bên nhận xác nhận OTP qua cmd.confirm_direct_payment), lệnh ngân hàng, đối soát.
// @ts-ignore thư viện JS dùng chung
import { verifyWebhook } from '../../../security/lib/webhook.mjs';
// @ts-ignore
import { buildVietQr } from '../../../security/lib/vietqr.mjs';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import type { HeThong } from '../he-thong.ts';
import { canQuyen } from '../auth/quyen.ts';
import { damBaoDangNhap } from '../db/dang-nhap-rieng.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { GIO } from '../dong-ho.ts';
import { chuyenTrangThai, dongHan, phat, taoHan, soGam, dong } from './chung.ts';
import { B } from './tinh-tien.ts';
import { taoTaiLieuPdf } from '../pdf/tai-lieu-pdf.ts';
import { phatQrNhanHang } from './giao-nhan.ts';

const BIN_NGAN_HANG_THU = '970499';

async function lamHeThong(t: GiaoDich) { await t.q(`SELECT set_config('app.actor_kind','system',true), set_config('app.user_id','',true), set_config('app.org_id','',true)`); }

// ---------------- Webhook ngân hàng ----------------

export async function xuLyWebhookNganHang(ht: HeThong, rawBody: string, headers: Record<string, string>) {
  const v = verifyWebhook({ headers, rawBody, keys: ht.cfg.webhookKeys, nonceStore: ht.nonce, now: Math.floor(Date.now() / 1000), provider: 'bank_sim' } as any);
  if (!v.ok) throw loi('WEBHOOK_KHONG_HOP_LE', undefined, { ly_do: v.reason });
  let ev: any;
  try { ev = JSON.parse(rawBody); } catch { throw loi('DU_LIEU_KHONG_HOP_LE', 'Thân webhook không phải JSON.'); }
  if (typeof ev.event_id !== 'string' || typeof ev.bank_txn_ref !== 'string') throw loi('DU_LIEU_KHONG_HOP_LE', 'Thiếu event_id/bank_txn_ref.');
  // N-01: luôn tra lại API ngân hàng theo mã giao dịch, không tin thân webhook.
  let tra: any = null; let loiTra: string | null = null;
  try { tra = ht.nganHang.traLai(ev.bank_txn_ref); } catch (e: any) { loiTra = e.message; }
  if (loiTra) throw loi('CHUA_TRA_LAI_NGAN_HANG', undefined, { ly_do: loiTra });
  const khop = !!tra && tra.kind === ev.kind && String(tra.amount_vnd) === String(ev.amount_vnd)
    && (tra.payment_ref ?? null) === (ev.payment_ref ?? null) && (tra.instruction_code ?? null) === (ev.instruction_code ?? null);
  const requeriedAt = new Date().toISOString();
  return ht.db.tx({ actor: 'bank', lenh: 'webhook_ngan_hang', requestId: `wh:${ev.event_id}` }, async (t) => {
    const cu = await t.mot<any>(`SELECT e.id, e.apply_result FROM core.bank_events e WHERE e.provider='bank_sim' AND e.provider_event_id=$1`, [ev.event_id]);
    if (cu) return { ket_qua: 'duplicate_ignored', bank_event_id: cu.id, apply_result: cu.apply_result };
    const webhook = { provider: 'bank_sim', provider_event_id: ev.event_id, event_type: ev.kind, signature_valid: true, payload: ev };
    const event = {
      kind: ev.kind, amount_vnd: String(ev.amount_vnd), payment_ref: ev.payment_ref ?? null, instruction_code: ev.instruction_code ?? null,
      bank_txn_ref: ev.bank_txn_ref, occurred_at: ev.occurred_at, payer_bank_code: tra?.payer?.bank_code ?? null,
      payer_account_hash: tra?.payer_account_hash ?? null, payer_account_masked: tra?.payer_account_masked ?? null, payer_account_name: tra?.payer?.name ?? null,
      requeried_at: requeriedAt, requery_status: khop ? 'confirmed' : 'rejected', requery_evidence: { nguon: 'ngan_hang_mo_phong', bank_txn_ref: ev.bank_txn_ref, khop },
    };
    const id = await t.voiVai('agiviet_bank_worker', () => t.gtri<string>(`SELECT cmd.record_bank_event($1::jsonb,$2::jsonb)`, [JSON.stringify(webhook), JSON.stringify(event)]));
    if (!khop) {
      await lamHeThong(t);
      await taoViec(t, 'V09', 1, 'bank_event', id, null, 'finance', `requery:${id}`, 'Webhook không khớp kết quả tra lại ngân hàng');
      return { ket_qua: 'requery_rejected', bank_event_id: id };
    }
    const r = await t.voiVai('agiviet_bank_worker', () => t.gtri<string>(`SELECT core.apply_bank_event($1)`, [id]));
    await lamHeThong(t);
    const sau = await sauSuKienNganHang(ht, t, id, ev, r);
    return { ket_qua: r, bank_event_id: id, ...sau };
  });
}

async function sauSuKienNganHang(ht: HeThong, t: GiaoDich, eventId: string, ev: any, r: string) {
  if (ev.kind === 'deposit_received') {
    const dep = await t.mot<any>(`SELECT d.*, o.status order_status FROM core.deposits d LEFT JOIN core.orders o ON o.id=d.order_id WHERE d.payment_ref=$1 OR d.id IN (SELECT deposit_id FROM core.deposit_adjustments WHERE payment_ref=$1)`, [ev.payment_ref]);
    if (!dep) return { ghi_chu: 'Tiền vào chưa khớp đơn: tiền treo, chờ đối soát' };
    if (r === 'late_after_closed') {
      await taoViec(t, 'V09', 2, 'deposit', dep.id, dep.order_id, 'finance', `late:${eventId}`, 'Tiền cọc đến sau khi đơn đóng: hoàn về tài khoản nguồn');
      await phat(t, 'deposit', dep.id, 'coc.den_muon', {});
      return {};
    }
    if (r === 'partially_received') {
      const da = await t.gtri<string>(`SELECT coalesce(sum(balance_vnd),0)::text FROM ledger.v_account_balances WHERE order_id=$1 AND account_type='deposit_pending'`, [dep.order_id]);
      const can = B(dep.expected_deposit_vnd) + B(dep.expected_fee_vnd);
      await phat(t, 'deposit', dep.id, 'coc.lech_so', { da_nhan_vnd: da, con_thieu_vnd: (can - B(da)).toString() });
      return { con_thieu_vnd: (can - B(da)).toString() };
    }
    if (r === 'held' && dep.order_status === 'awaiting_deposit') {
      await kichHoatDon(ht, t, dep.order_id);
      const ex = await t.gtri<string>(`SELECT excess_vnd::text FROM core.bank_events WHERE id=$1`, [eventId]);
      if (B(ex) > 0n) await taoLenhHoanThua(t, dep, eventId, B(ex));
      return { order_activated: dep.order_id };
    }
    if (dep.order_status === 'active') {
      // Bổ sung cọc theo phụ lục: hết hạn bổ sung, thử chuyển đợt sang sẵn sàng.

      await phat(t, 'deposit', dep.id, 'coc.bo_sung', { ket_qua: r });
      const { thuSanSang } = await import('./giao-nhan.ts');
      for (const d of await t.q<any>(`SELECT id FROM core.deliveries WHERE order_id=$1 AND status='preparing'`, [dep.order_id])) await thuSanSang(ht, t, d.id);
      return { top_up: r };
    }
    return {};
  }
  // Sự kiện lệnh ngân hàng.
  const b = await t.mot<any>(`SELECT * FROM core.bank_instructions WHERE code=$1`, [ev.instruction_code]);
  if (!b) return {};
  if (ev.kind === 'instruction_succeeded' && r === 'applied') {
    await phat(t, 'bank_instruction', b.id, 'lenh.thanh_cong', { code: b.code, so_tien_vnd: String(b.amount_vnd) });

  }
  if (ev.kind === 'instruction_failed' && r === 'applied') {
    await phat(t, 'bank_instruction', b.id, 'lenh.that_bai', { code: b.code });
    await taoViec(t, 'V10', 1, 'bank_instruction', b.id, b.order_id, 'finance', `fail:${b.id}`, 'Lệnh ngân hàng thất bại: tra lại rồi lập lệnh thay (mã mới)');
  }
  if (r === 'late_after_reconciled') await taoViec(t, 'V10', 3, 'bank_instruction', b.id, b.order_id, 'finance', `late:${eventId}`, 'Sự kiện ngân hàng cũ đến sau khi đã đối soát');
  return { instruction: b.code };
}

async function taoLenhHoanThua(t:GiaoDich,dep:any,eventId:string,soTien:bigint){
 await systemCmd(t,'refund_excess',[eventId]);
 for(const b of await t.q<any>(`SELECT code FROM core.bank_instructions WHERE source_bank_event_id=$1 AND status='created'`,[eventId]))await guiLenhChoNganHangTheoMa(t,b.code);
}

/** Đơn đủ cọc: hiệu lực, giữ lượng → cam kết, khoản trả thẳng, đợt giao 1, hạn. */
export async function kichHoatDon(ht:HeThong,t:GiaoDich,orderId:string){
 const deliveryId=await systemCmd<string>(t,'activate_order_after_deposit',[orderId]);return {delivery_id:deliveryId};
}

function lowerWindow(v: any): string {
  const w = String(v.delivery_window);
  const m = /^[\[(]"?([^",]+)"?,/.exec(w);
  return m ? m[1] : new Date().toISOString();
}

export async function taoKhoanTraThang(..._args:any[]):Promise<any>{
 throw loi('CHUA_HO_TRO','Không có command tạo khoản trả tùy ý. Dùng command kích hoạt, nghiệm thu, phụ lục, hủy hoặc quyết toán.');
}

// ---------------- Hướng dẫn chuyển cọc (VietQR) ----------------

export async function huongDanCoc(t: GiaoDich, nd: NguoiDung, orderId: string) {
  const d = await t.mot<any>(`SELECT d.*, o.buyer_org_id, o.code FROM core.deposits d JOIN core.orders o ON o.id=d.order_id WHERE d.order_id=$1`, [orderId]);
  if (!d || d.buyer_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  canQuyen(nd, 'money.pay.buyer');
  const tong = B(d.expected_deposit_vnd) + B(d.expected_fee_vnd);
  const han = await t.mot<any>(`SELECT due_at FROM core.deadlines WHERE entity_id=$1 AND kind='deposit' AND status='open'`, [d.id]);
  const da = await t.gtri<string>(`SELECT coalesce(sum(amount_vnd),0)::text FROM core.bank_events WHERE payment_ref=$1 AND apply_result='applied'`, [d.payment_ref]);
  let vietqr: string | null = null;
  try { vietqr = buildVietQr({ bin: BIN_NGAN_HANG_THU, accountNumber: d.virtual_account_no.replace(/[^0-9A-Z]/gi, ''), amountVnd: Number(tong), addInfo: d.payment_ref }); } catch { vietqr = null; }
  // Cọc/phí bổ sung theo phụ lục (mã nạp ngắn TP… từ 0051, mã cũ TOPUP-… vẫn đọc được): đọc lại được sau tải lại trang.
  const bs = await t.q<any>(`SELECT a.id, a.order_version_no, a.payment_ref, greatest(a.delta_deposit_vnd,0)::text dc, greatest(a.delta_fee_vnd,0)::text df, a.created_at,
      (SELECT coalesce(sum(e.amount_vnd),0)::text FROM core.bank_events e WHERE e.payment_ref=a.payment_ref AND e.apply_result='applied') da,
      (SELECT due_at FROM core.deadlines x WHERE x.entity_id=d_id.id AND x.kind='deposit_top_up' AND x.status='open' ORDER BY due_at LIMIT 1) han
    FROM core.deposit_adjustments a JOIN core.deposits d_id ON d_id.id=a.deposit_id WHERE a.deposit_id=$1 AND a.payment_ref IS NOT NULL ORDER BY a.order_version_no`, [d.id]);
  const boSung = bs.map((x) => {
    const can = B(x.dc) + B(x.df); const daNhan = B(x.da);
    let qr: string | null = null;
    try { qr = buildVietQr({ bin: BIN_NGAN_HANG_THU, accountNumber: d.virtual_account_no.replace(/[^0-9A-Z]/gi, ''), amountVnd: Number(can), addInfo: x.payment_ref }); } catch { qr = null; }
    return { adjustment_id: x.id, version_no: x.order_version_no, payment_ref: x.payment_ref, deposit_vnd: x.dc, fee_vnd: x.df, total_vnd: can.toString(), received_vnd: x.da,
      status: daNhan >= can ? 'received' : daNhan > 0n ? 'partially_received' : 'awaiting_transfer', due_at: x.han ?? null, vietqr: qr };
  });
  return {
    top_ups: boSung,
    order_id: orderId, deposit_id: d.id, status: d.status, virtual_account_no: d.virtual_account_no, payment_ref: d.payment_ref,
    deposit_vnd: String(d.expected_deposit_vnd), fee_vnd: String(d.expected_fee_vnd), total_vnd: tong.toString(), received_vnd: da,
    due_at: han?.due_at ?? null, vietqr, ngan_hang: 'Ngân hàng TMCP Thử Nghiệm (mô phỏng)',
    cau: `Chuyển đúng ${dong(tong)} với nội dung "${d.payment_ref}". Chỉ ngân hàng xác nhận mới tính là đã cọc.`,
  };
}

// ---------------- Khoản trả thẳng ----------------

async function layKhoan(t: GiaoDich, nd: NguoiDung, id: string) {
  const p = await t.mot<any>(`SELECT * FROM core.direct_payments WHERE id=$1 FOR UPDATE`, [id]);
  if (!p || (p.payer_org_id !== nd.thanhVien.orgId && p.payee_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  return p;
}

export async function baoDaTra(t:GiaoDich,nd:NguoiDung,id:string,d:{amount_vnd:unknown;method:'bank_transfer'|'cash';evidence_document_id?:string}){
 const p=await layKhoan(t,nd,id);if(p.payer_org_id!==nd.thanhVien.orgId)throw loi('KHONG_CO_QUYEN');
 canQuyen(nd,p.direction==='buyer_to_seller'?'money.pay.buyer':'money.confirm.seller');
 if(!d.evidence_document_id)throw loi('DU_LIEU_KHONG_HOP_LE','Cần chứng từ đúng đơn.');
 const o=await t.mot<any>(`SELECT buyer_org_id FROM core.orders WHERE id=$1`,[p.order_id]);
 await appCmd(t,nd,o.buyer_org_id===nd.thanhVien.orgId?'buyer':'seller','report_payment',[id,soGam(d.amount_vnd),d.method,d.evidence_document_id]);
 return {id,status:await t.gtri(`SELECT status FROM core.direct_payments WHERE id=$1`,[id]),thong_bao:'Đã báo trả; chỉ tính đã nhận sau xác nhận của bên nhận.'};
}

/** Bên nhận xác nhận đã nhận (OTP money_received đã xác minh trước). Gọi cmd.confirm_direct_payment dưới login riêng. */
export async function xacNhanDaNhan(ht: HeThong, t: GiaoDich, nd: NguoiDung, id: string, d: { challenge_id: string; amount_vnd: unknown; result: 'full' | 'partial'; bank_txn_ref?: string; method?: 'bank_transfer' | 'cash'; receipt_document_id?: string }) {
  const p = await layKhoan(t, nd, id);
  if (p.payee_org_id !== nd.thanhVien.orgId) throw loi('KHONG_CO_QUYEN', 'Chỉ bên nhận tiền xác nhận.');
  const phia = p.direction === 'buyer_to_seller' ? 'seller' : 'buyer';
  canQuyen(nd, phia === 'seller' ? 'money.confirm.seller' : 'money.confirm.buyer');
  const so = soGam(d.amount_vnd, 'amount_vnd');
  const method = d.method ?? 'bank_transfer';
  if (method === 'bank_transfer' && !d.bank_txn_ref) throw loi('DU_LIEU_KHONG_HOP_LE', 'Chuyển khoản bắt buộc mã giao dịch ngân hàng.');
  if (method === 'cash' && !d.receipt_document_id) throw loi('DU_LIEU_KHONG_HOP_LE', 'Tiền mặt cần ảnh biên nhận hai bên ký.');
  if (d.bank_txn_ref) {
    const trung = await t.mot(`SELECT 1 FROM core.direct_payment_confirmations c JOIN core.direct_payments x ON x.id=c.direct_payment_id WHERE x.order_id=$1 AND c.bank_txn_ref=$2`, [p.order_id, d.bank_txn_ref]);
    if (trung) throw loi('MA_GIAO_DICH_TRUNG');
  }
  const daBao = B(await t.gtri<string>(`SELECT coalesce(sum(amount_vnd),0)::text FROM core.direct_payment_reports WHERE direct_payment_id=$1`, [id]));
  const daNhan = B(await t.gtri<string>(`SELECT coalesce(sum(amount_vnd),0)::text FROM core.direct_payment_confirmations WHERE direct_payment_id=$1`, [id]));
  if (daBao > 0n && daNhan + so > daBao) {
    await taoViec(t, 'V08', 2, 'direct_payment', id, p.order_id, 'finance', `vuot:${id}:${daNhan + so}`, 'Xác nhận vượt số bên trả đã báo: đối soát');
    throw loi('TIEN_VUOT_SO_BAO');
  }
  const login = await damBaoDangNhap(t, nd.userId, nd.thanhVien.orgId, phia);
  await t.voiDangNhap(login, () => t.q(`SELECT cmd.confirm_direct_payment($1,$2,$3,$4,$5,$6,$7)`, [id, so, d.result, d.bank_txn_ref ?? null, d.challenge_id, method, d.receipt_document_id ?? null]));
  const sau = await t.mot<any>(`SELECT status, amount_due_vnd::text due, (SELECT coalesce(sum(amount_vnd),0)::text FROM core.direct_payment_confirmations WHERE direct_payment_id=$1) da FROM core.direct_payments WHERE id=$1`, [id]);
  await phat(t, 'direct_payment', id, 'khoan.nb_xac_nhan', { so_tien_vnd: so.toString(), status: sau.status });

  await lamHeThong(t);
  await sauKhiNhanTien(ht, t, p.order_id);
  const canhBao = method === 'cash' && so >= BigInt(CHINH_SACH.canhBaoTienMatVnd) ? [{ ma: 'TIEN_MAT_LON', cau: 'Nên chuyển khoản để có chứng từ ngân hàng.' }] : [];
  const con = B(sau.due) - B(sau.da);
  return { id, status: sau.status, received_vnd: sau.da, remaining_vnd: con.toString(), canh_bao: canhBao,
    thong_bao: con > 0n ? `Còn thiếu ${dong(con)}.` : 'Cọc vẫn ở ngân hàng; xử lý khi hai bên chốt số cân và quyết toán.' };
}

export async function baoChuaNhan(t:GiaoDich,nd:NguoiDung,id:string,b?:{reason?:string}){
 const p=await layKhoan(t,nd,id);if(p.payee_org_id!==nd.thanhVien.orgId)throw loi('KHONG_CO_QUYEN');
 // 0048: mismatch + việc V08 + sự kiện trong một command của bên nhận.
 const lyDo=(b?.reason??'').toString().trim()||'Bên nhận chưa thấy tiền về tài khoản';
 const task=await appCmd<string>(t,nd,(await t.gtri<string>(`SELECT CASE WHEN buyer_org_id=$1 THEN 'buyer' ELSE 'seller' END FROM core.orders WHERE id=$2`,[nd.thanhVien.orgId,p.order_id])) as any,'report_payment_not_received',[id,lyDo]);
 const r=await t.mot<any>(`SELECT status,version FROM core.direct_payments WHERE id=$1`,[id]);
 return {id,status:r.status,revision:r.version,task_id:task};
}

/** Sau khi một khoản được xác nhận: thử chuyển đợt sang sẵn sàng / hoàn tất công nợ. */
export async function sauKhiNhanTien(ht: HeThong, t: GiaoDich, orderId: string) {
  const { thuSanSang } = await import('./giao-nhan.ts');
  const dots = await t.q<any>(`SELECT id FROM core.deliveries WHERE order_id=$1 AND status='preparing'`, [orderId]);
  for (const d of dots) await thuSanSang(ht, t, d.id);
  const { kiemHoanTat, thuQuyetToan } = await import('./quyet-toan.ts');
  await thuQuyetToan(ht, t, orderId);
  await kiemHoanTat(t, orderId);
  const { kiemXongHuy } = await import('./huy.ts');
  await kiemXongHuy(t, orderId);
}

export async function danhSachKhoan(t: GiaoDich, nd: NguoiDung, orderId: string) {
  const o = await t.mot<any>(`SELECT buyer_org_id, seller_org_id FROM core.orders WHERE id=$1`, [orderId]);
  if (!o || (o.buyer_org_id !== nd.thanhVien.orgId && o.seller_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  return t.q(`SELECT p.id,p.code,p.kind,p.direction,p.amount_due_vnd::text amount_due_vnd,p.status,p.due_at,p.blocks_loading,p.payee_bank_code,p.payee_account_masked,p.payee_account_holder,
      (SELECT coalesce(sum(amount_vnd),0)::text FROM core.direct_payment_reports r WHERE r.direct_payment_id=p.id) reported_vnd,
      (SELECT coalesce(sum(amount_vnd),0)::text FROM core.direct_payment_confirmations c WHERE c.direct_payment_id=p.id) confirmed_vnd
      FROM core.direct_payments p WHERE p.order_id=$1 ORDER BY p.created_at`, [orderId]);
}

/** Bảng tiền của đơn (T1): cọc, phí, khoản trả thẳng, lệnh ngân hàng, số dư sổ cái theo ngăn. */
export async function tienCuaDon(t: GiaoDich, nd: NguoiDung, orderId: string) {
  const khoan = await danhSachKhoan(t, nd, orderId);
  const dep = await t.mot<any>(`SELECT id,status,expected_deposit_vnd::text deposit_vnd,expected_fee_vnd::text fee_vnd,payment_ref FROM core.deposits WHERE order_id=$1`, [orderId]);
  const lenh = await t.q(`SELECT id,code,kind,amount_vnd::text amount_vnd,status,target_bank_code,target_account_masked,target_account_holder,callback_required FROM core.bank_instructions WHERE order_id=$1 ORDER BY created_at`, [orderId]);
  const so = await t.q(`SELECT account_type, balance_vnd::text balance_vnd FROM ledger.v_account_balances WHERE order_id=$1 AND balance_vnd<>0 ORDER BY account_type`, [orderId]);
  const qt = await t.q(`SELECT id,seq,is_final,is_effective,v_vnd::text,d_vnd::text,c_vnd::text,x_nb_vnd::text,x_bm_vnd::text,n_vnd::text,release_vnd::text,refund_vnd::text,t_bm_vnd::text,t_nb_vnd::text,prior_released_vnd::text,additional_hold_vnd::text,computed_at FROM core.settlements WHERE order_id=$1 ORDER BY seq`, [orderId]);
  const phiTrangThai = dep ? (['completed'].includes(await t.gtri<string>(`SELECT status FROM core.orders WHERE id=$1`, [orderId])) ? 'Không hoàn' : 'Đã thu · hoàn hay không tùy kết quả đơn') : null;
  return { order_id: orderId, coc: dep, phi: dep ? { so_tien_vnd: dep.fee_vnd, trang_thai: phiTrangThai } : null, khoan_tra_thang: khoan, lenh_ngan_hang: lenh, quyet_toan: qt, so_cai: so };
}

// ---------------- Lệnh ngân hàng ----------------

/** Gửi lệnh (created → sent) cho ngân hàng mô phỏng; khóa chống lặp = mã lệnh. Lệnh cần gọi lại thì giữ. */
export async function guiLenhChoNganHangTheoMa(t: GiaoDich, code: string) {
  const b = await t.mot<any>(`SELECT * FROM core.bank_instructions WHERE code=$1 FOR UPDATE`, [code]);
  if (!b || b.status !== 'created') return;
  if (b.callback_required && !(await t.mot(`SELECT 1 FROM ops.payout_callbacks WHERE instruction_id=$1`, [b.id]))) {
    await taoViec(t, 'V06', 1, 'bank_instruction', b.id, b.order_id, 'finance', `callback:${b.id}`, 'Lệnh chi ≥ 20 triệu tới tài khoản kích hoạt dưới 72 giờ: gọi lại số đã xác minh');
    return;
  }
  await t.datLyDo(null, 'gui_lenh');
  // 0036: created → sent + outbox bank.dispatch nguyên tử, dưới login điều phối.
  await t.voiHeThong(() => t.q(`SELECT cmd.send_instruction($1)`, [b.id]));
  await phat(t, 'bank_instruction', b.id, 'lenh.da_gui', { code });
}

/** Sau COMMIT: đẩy mọi lệnh 'sent' sang ngân hàng mô phỏng (không gọi mạng khi giữ khóa; ngân hàng chống lặp theo mã lệnh). */
export async function dayLenhSangNganHang(ht: HeThong) {
  const ds = await ht.db.doc((t) => t.q<any>(`SELECT b.code,b.amount_vnd::text amount_vnd,b.target_bank_code,b.target_account_masked,encode(coalesce(b.target_account_hash,a.account_number_hash),'hex') target_account_hash FROM core.bank_instructions b LEFT JOIN pii.bank_accounts a ON a.id=b.target_bank_account_id WHERE b.status='sent'`));
  for (const l of ds) ht.nganHang.nhanLenh(l);
  return ds.length;
}

/** Đối soát: so sao kê ngân hàng mô phỏng với lệnh thành công → reconciled; rồi kiểm hoàn tất đơn. */
export async function doiSoat(ht:HeThong,t:GiaoDich){
 const ds=await t.q<any>(`SELECT * FROM core.bank_instructions WHERE status='succeeded'`);const saoKe=new Map(ht.nganHang.saoKe().map(g=>[g.instruction_code,g]));const out:string[]=[];
 for(const b of ds){const g=saoKe.get(b.code);if(!g||String(g.amount_vnd)!==String(b.amount_vnd)||g.bank_txn_ref!==b.bank_txn_ref)continue;
 const eventId=`statement:${g.bank_txn_ref}`;let proof=await t.gtri<string>(`SELECT id FROM core.bank_events WHERE provider='bank_sim' AND provider_event_id=$1`,[eventId]);
 if(!proof){
  const webhook={provider:'bank_sim',provider_event_id:eventId,event_type:'statement_line',signature_valid:true,payload:g};
  const ev={kind:'statement_line',amount_vnd:g.amount_vnd,instruction_code:g.instruction_code,bank_txn_ref:g.bank_txn_ref,occurred_at:g.occurred_at,requeried_at:new Date().toISOString(),requery_status:'confirmed',requery_evidence:{direction:g.direction,target_bank_code:g.target_bank_code,target_account_hash:g.target_account_hash,source:'bank_sim_statement'}};
  proof=await t.voiVai('agiviet_bank_worker',()=>t.gtri<string>(`SELECT cmd.record_bank_event($1::jsonb,$2::jsonb)`,[JSON.stringify(webhook),JSON.stringify(ev)]));
 }
 await systemCmd(t,'reconcile_instruction',[b.id,proof]);out.push(b.code);
 }
 const {kiemHoanTat}=await import('./quyet-toan.ts');const {kiemXongHuy}=await import('./huy.ts');
 for(const id of new Set(ds.map(b=>b.order_id))){await kiemHoanTat(t,id);await kiemXongHuy(t,id);}return {reconciled:out};
}

// ---------------- Hàng việc thủ công ----------------

export async function taoViec(t:GiaoDich,kind:string,priority:number,entity:string,entityId:string,orderId:string|null,role:string,dedup:string,lyDo:string){
 const id=await systemCmd<string>(t,'create_task',[kind,priority,entity,entityId,orderId,role,dedup,lyDo]);
 return {id,code:await t.gtri(`SELECT code FROM ops.tasks WHERE id=$1`,[id])};
}
