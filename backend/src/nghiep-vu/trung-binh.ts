// Truy vấn và lệnh mức Vừa cho giao diện (docs/frontend/de-xuat-backend.md): sổ tiền theo kỳ, so lời chào,
// gói (danh mục, gói hiện hành, đổi gói), yêu cầu hỗ trợ, hồ sơ nguồn hàng. Không bịa số: thiếu dữ liệu trả null + lý do.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { duocPhep } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { phat } from './chung.ts';
import { B, chiaNuaLen } from './tinh-tien.ts';
import { taoViec } from './tien.ts';

/** Sổ tiền theo kỳ của tổ chức: cọc ngân hàng đang giữ, đã nhận/đã trả (chỉ số đã xác nhận), còn phải nhận/trả, phí. */
export async function soTien(t: GiaoDich, nd: NguoiDung, q: { from?: string; to?: string }) {
  const org = nd.thanhVien.orgId;
  const tu = q.from ? new Date(q.from) : new Date(0); const den = q.to ? new Date(q.to) : new Date('2100-01-01');
  const r = await t.mot<any>(`WITH don AS (SELECT id, buyer_org_id=$1 la_mua FROM core.orders WHERE buyer_org_id=$1 OR seller_org_id=$1)
    SELECT
     (SELECT coalesce(sum(b.balance_vnd),0)::text FROM ledger.v_account_balances b JOIN don ON don.id=b.order_id WHERE b.account_type='deposit_escrow') coc_dang_giu,
     (SELECT coalesce(sum(b.balance_vnd),0)::text FROM ledger.v_account_balances b JOIN don ON don.id=b.order_id WHERE b.account_type='deposit_pending') tien_treo,
     (SELECT coalesce(sum(c.amount_vnd),0)::text FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.payee_org_id=$1 AND c.confirmed_at BETWEEN $2 AND $3) da_nhan_truc_tiep,
     (SELECT coalesce(sum(c.amount_vnd),0)::text FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.payer_org_id=$1 AND c.confirmed_at BETWEEN $2 AND $3) da_tra_truc_tiep_duoc_xac_nhan,
     (SELECT coalesce(sum(i.amount_vnd),0)::text FROM core.bank_instructions i WHERE i.target_org_id=$1 AND i.status IN ('succeeded','reconciled') AND i.updated_at BETWEEN $2 AND $3) ngan_hang_da_chuyen_den,
     (SELECT coalesce(sum(p.amount_due_vnd-(SELECT coalesce(sum(amount_vnd),0) FROM core.direct_payment_confirmations x WHERE x.direct_payment_id=p.id)),0)::text FROM core.direct_payments p WHERE p.payee_org_id=$1 AND p.status NOT IN ('fully_received','cancelled')) con_phai_nhan,
     (SELECT coalesce(sum(p.amount_due_vnd-(SELECT coalesce(sum(amount_vnd),0) FROM core.direct_payment_confirmations x WHERE x.direct_payment_id=p.id)),0)::text FROM core.direct_payments p WHERE p.payer_org_id=$1 AND p.status NOT IN ('fully_received','cancelled')) con_phai_tra,
     (SELECT coalesce(sum(b.balance_vnd),0)::text FROM ledger.v_account_balances b JOIN don ON don.id=b.order_id AND don.la_mua WHERE b.account_type='fee_held') phi_da_thu_chua_chot`, [org, tu, den]);
  const theoDon = await t.q(`SELECT o.id, o.code, o.status, o.buyer_org_id=$1 la_mua,
      (SELECT d.status FROM core.deposits d WHERE d.order_id=o.id) coc_trang_thai,
      (SELECT coalesce(sum(balance_vnd),0)::text FROM ledger.v_account_balances b WHERE b.order_id=o.id AND b.account_type='deposit_escrow') coc_dang_giu_vnd,
      (SELECT d.expected_fee_vnd::text FROM core.deposits d WHERE d.order_id=o.id) phi_vnd,
      CASE WHEN NOT EXISTS(SELECT 1 FROM core.deposits d WHERE d.order_id=o.id AND d.status IN ('held','processing','fully_processed')) THEN 'chua_thu'
           WHEN o.status='completed' THEN 'khong_hoan' WHEN o.status='closed' THEN 'theo_bang_hoan' ELSE 'da_thu_cho_ket_qua' END phi_trang_thai
      FROM core.orders o WHERE (o.buyer_org_id=$1 OR o.seller_org_id=$1) ORDER BY o.created_at DESC LIMIT 200`, [org]);
  return { ky: { from: q.from ?? null, to: q.to ?? null }, tong: r, theo_don: theoDon,
    ghi_chu: 'Chỉ số đã xác nhận (ngân hàng hoặc bên nhận OTP) được cộng; số bên trả mới báo không tính là đã nhận. Phí "chua_thu" khi cọc chưa được ngân hàng xác nhận.' };
}

/** So lời chào đã có trả lời của một phiếu: quy về giá tại kho chỉ khi đủ dữ liệu; thiếu thì để null, không tự cộng. */
export async function soSanhLoiChao(t: GiaoDich, nd: NguoiDung, demandId: string) {
  const d = await t.mot<any>(`SELECT buyer_org_id FROM core.demands WHERE id=$1`, [demandId]);
  if (!d || d.buyer_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  const ds = await t.q<any>(`SELECT o.id offer_id, o.code, o.status, l.code lot_code, s.display_name seller_name, s.province_code,
      r.price_vnd::text gia_vnd, r.qty::text luong_g, r.from_side, l.qty_basis
      FROM core.offers o JOIN core.demand_lines dl ON dl.id=o.demand_line_id JOIN core.lots l ON l.id=o.lot_id JOIN core.organizations s ON s.id=o.seller_org_id
      JOIN LATERAL (SELECT * FROM core.offer_rounds x WHERE x.offer_id=o.id ORDER BY round_no DESC LIMIT 1) r ON true
      WHERE dl.demand_id=$1 AND (o.status IN ('accepted') OR (o.status='sent' AND r.from_side='seller') OR o.current_round>1) ORDER BY o.created_at`, [demandId]);
  return ds.map((x) => ({ ...x, gia_tai_kho_vnd: null, thanh_phan_thieu: ['cuoc_xe', 'hao_hut_duong', 'phi_kiem_dinh', 'chi_phi_von_theo_han_tra'],
    ghi_chu: 'Chưa đủ dữ liệu cước xe/hao hụt/kiểm định để quy về giá tại kho; chỉ so giá chào.' }));
}

export async function danhMucGoi(t: GiaoDich) {
  const ds = await t.q<any>(`SELECT code, label_vi, monthly_price_vnd::text monthly_price_vnd, first_order_fee_bps, repeat_fee_bps, fee_floor_vnd::text fee_floor_vnd, fee_cap_vnd::text fee_cap_vnd, max_members FROM ref.plans ORDER BY monthly_price_vnd`);
  return ds.map((g) => ({ ...g, la_gia_thu: true, ghi_chu: 'Giá thử (chưa chốt giá bán); nguồn ref.plans = chinh-sach.ts.' }));
}

export async function goiHienHanh(t: GiaoDich, nd: NguoiDung) {
  return t.mot(`SELECT s.id, s.plan_code, p.label_vi, lower(s.active_during) tu, upper(s.active_during) den,
      (SELECT count(*)::int FROM core.memberships m WHERE m.org_id=s.org_id AND m.status IN ('active','invited')) so_thanh_vien, p.max_members
      FROM core.subscriptions s JOIN ref.plans p ON p.code=s.plan_code WHERE s.org_id=$1 AND s.active_during @> $2::timestamptz`, [nd.thanhVien.orgId, new Date(t.thoiDiemMs)]);
}

/** Đổi gói: kết thúc gói hiện hành ngay, gói mới 30 ngày; tiền tháng đầu tính theo ngày còn lại (11 mục 2). Phí của đơn đã ký giữ nguyên. */
export async function doiGoi(t:GiaoDich,nd:NguoiDung,planCode:string){
 if(!nd.thanhVien.canBuy||!nd.thanhVien.vai.includes('owner'))throw loi('KHONG_CO_QUYEN');
 const goi=await t.mot<any>(`SELECT code,monthly_price_vnd::text gia,max_members FROM ref.plans WHERE code=$1`,[planCode]);
 if(!goi)throw loi('DU_LIEU_KHONG_HOP_LE','Gói không có.');
 const hien=await goiHienHanh(t,nd) as any;
 if(hien&&Number(hien.so_thanh_vien)>Number(goi.max_members))throw loi('GOI_HET_THANH_VIEN',`Gói ${planCode} tối đa ${goi.max_members} thành viên, tổ chức đang có ${hien.so_thanh_vien}.`);
 const { systemCmd } = await import('../db/command.ts');
 const { createHash } = await import('node:crypto');
 // Tiền tháng đầu theo ngày còn lại (11 mục 2) chỉ để hiển thị; billing adapter mô phỏng ghi biên nhận đúng giá tháng như DB yêu cầu.
 const gio=new Date(t.thoiDiemMs+7*3600e3);const ngayTrongThang=new Date(Date.UTC(gio.getUTCFullYear(),gio.getUTCMonth()+1,0)).getUTCDate();
 const conLai=ngayTrongThang-gio.getUTCDate()+1;const gia=BigInt(goi.gia);
 const thangDau=(gia*BigInt(conLai)+BigInt(ngayTrongThang)/2n)/BigInt(ngayTrongThang);
 let proof:string|null=null;
 if(gia>0n){
  const ref=`BILLING-SIM-${nd.thanhVien.orgId.slice(0,8)}-${planCode}-${t.thoiDiemMs}`;
  const noiDung={billing_org_id:nd.thanhVien.orgId,plan_code:planCode,amount_vnd:goi.gia,result:'paid',provider_reference:ref};
  const sha='\\x'+createHash('sha256').update(JSON.stringify(noiDung)).digest('hex');
  proof=await systemCmd<string>(t,'record_subscription_payment',[nd.thanhVien.orgId,planCode,{code:ref,series_key:ref,version_no:1,content_sha256:sha,file_sha256:sha,canonical_content:noiDung,storage_key:`billing-sim/${ref}`,mime_type:'application/json',size_bytes:JSON.stringify(noiDung).length,generator_version:'billing-sim',is_test_data:true}]);
 }
 const id=await systemCmd<string>(t,'change_subscription',[nd.thanhVien.orgId,planCode,`goi:${nd.thanhVien.orgId}:${planCode}:${t.thoiDiemMs}`,proof]);
 return {id,status:'active',plan_code:planCode,tien_thang_dau_vnd:thangDau.toString(),gia_thang_vnd:goi.gia,bien_nhan_mo_phong:proof,thong_bao:'Billing là mô phỏng; chưa thu tiền thật.'};
}

/** Yêu cầu hỗ trợ: tạo việc V23 kèm mã lỗi và request_id; trả mã việc, người phụ trách khi có người nhận. */
export async function taoHoTro(t: GiaoDich, nd: NguoiDung, b: { message: string; error_code?: string; request_id?: string; order_id?: string }) {
  if (!b.message) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần nội dung.');
  const v = await taoViec(t, 'V23', 3, 'organization', nd.thanhVien.orgId, b.order_id ?? null, 'dispatcher', `hotro:${nd.userId}:${t.thoiDiemMs}`,
    `Hỗ trợ: ${b.message.slice(0, 300)}${b.error_code ? ` [${b.error_code}]` : ''}${b.request_id ? ` (${b.request_id})` : ''}`);
  return { id: v!.id, code: v!.code, status: 'new', cau: 'Đã ghi nhận. Chưa có người nhận việc; bạn sẽ thấy tên người phụ trách khi có người nhận.' };
}

export async function danhSachHoTro(t: GiaoDich, nd: NguoiDung) {
  return t.q(`SELECT t.id, t.code, t.status, t.trigger_reason, t.created_at, t.response_due_at, t.next_update_at, u.display_name nguoi_phu_trach
      FROM ops.tasks t LEFT JOIN core.users u ON u.id=t.assigned_to WHERE t.kind='V23' AND t.entity_id=$1 ORDER BY t.created_at DESC`, [nd.thanhVien.orgId]);
}

/** Hồ sơ nguồn hàng của lô: giấy tờ (trạng thái xác minh thật), mức xác minh tổ chức, số đơn hoàn tất trên app, vị trí, ảnh có nhãn.
 *  Không trả điểm uy tín (chưa tính theo 05 mục 5). */
export async function hoSoNguon(t: GiaoDich, nd: NguoiDung, lotId: string) {
  const l = await t.mot<any>(`SELECT l.id, l.code, l.seller_org_id, l.status, l.site_id, o.display_name, o.kind, o.verification_level, o.province_code, s.name site_name, s.kind site_kind,
      (SELECT count(*)::int FROM core.orders x WHERE x.seller_org_id=l.seller_org_id AND x.status='completed') don_hoan_tat_tren_app
      FROM core.lots l JOIN core.organizations o ON o.id=l.seller_org_id LEFT JOIN core.production_sites s ON s.id=l.site_id WHERE l.id=$1`, [lotId]);
  if (!l || (l.status === 'draft' && l.seller_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  const giayTo = await t.q(`SELECT c.kind, k.label_vi, c.market, lower(c.valid_during)::text tu, (upper(c.valid_during)-1)::text den,
      CASE WHEN c.revoked_at IS NOT NULL THEN 'het_hieu_luc' WHEN c.verified_at IS NOT NULL THEN 'da_xac_minh' ELSE 'tu_khai' END trang_thai
      FROM core.certifications c JOIN ref.document_kinds k ON k.code=c.kind WHERE c.org_id=$1 ORDER BY c.kind`, [l.seller_org_id]);
  const anh = await t.q(`SELECT id, CASE WHEN captured_in_app THEN 'chup_trong_app' ELSE 'anh_tai_len' END nhan, captured_at FROM core.documents WHERE entity='lot' AND entity_id=$1 AND doc_type='evidence' ORDER BY created_at`, [lotId]);
  return { lot_id: l.id, lot_code: l.code, nguoi_ban: { ten: l.display_name, loai: l.kind, muc_xac_minh: l.verification_level, tinh: l.province_code },
    vi_tri: l.site_id ? { ten: l.site_name, loai: l.site_kind, ghi_chu: 'Tên vị trí do người bán khai; chưa có tọa độ đối chiếu.' } : null,
    giay_to: giayTo, anh, don_hoan_tat_tren_app: l.don_hoan_tat_tren_app, uy_tin: null, ghi_chu_uy_tin: 'Chưa tính điểm uy tín (05 mục 5) ở backend.' };
}

export { CHINH_SACH, duocPhep };
