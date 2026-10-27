import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Hủy (03 mục 11, 04 mục 8). Trước cọc: bất kỳ bên đóng đơn ngay. Sau cọc: xin hủy, bên kia đồng ý trong 24 giờ
// (im lặng = không đồng ý); cọc về bên KHÔNG xin hủy; phí theo bảng hoàn Q06; khoản trả thẳng đã nhận người bán hoàn ngoài app.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import type { HeThong } from '../he-thong.ts';
import { canQuyen } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { GIO } from '../dong-ho.ts';
import { chuyenTrangThai, dongHan, phat, taoHan, dong, kg } from './chung.ts';
import { B } from './tinh-tien.ts';
import { dongDonTruocCoc } from './don.ts';
import { guiLenhChoNganHangTheoMa, taoKhoanTraThang } from './tien.ts';
import { taoTaiLieuPdf } from '../pdf/tai-lieu-pdf.ts';

type LyDoHuy = 'buyer_request' | 'seller_request' | 'force_majeure';

async function layDon(t: GiaoDich, nd: NguoiDung, id: string) {
  const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1 FOR UPDATE`, [id]);
  if (!o) throw loi('KHONG_TIM_THAY');
  const phia = o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : o.seller_org_id === nd.thanhVien.orgId ? 'seller' : null;
  if (!phia) throw loi('KHONG_TIM_THAY');
  canQuyen(nd, phia === 'buyer' ? 'cancel.buyer' : 'cancel.seller');
  return { o, phia: phia as 'buyer' | 'seller' };
}

/** Hủy trước cọc (chờ cọc): bất kỳ bên; tiền lẻ đã chuyển (nếu thiếu) DB xếp việc hoàn về nguồn. */
export async function huyTruocCoc(ht: HeThong, t: GiaoDich, nd: NguoiDung, id: string, lyDo?: string) {
  const { o } = await layDon(t, nd, id);
  if (o.status !== 'awaiting_deposit') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Chỉ hủy ngay khi đơn đang chờ cọc; trước đó dùng rút đơn/từ chối ký.');
  return dongDonTruocCoc(t, o, 'cancel_before_deposit', 'huy_truoc_coc', lyDo ?? 'Hủy trước cọc');
}

/** Tính trước hệ quả hủy (màn X1): hàng, cọc, phí, trả thẳng. */
export async function heQuaHuy(t: GiaoDich, nd: NguoiDung, id: string, reasonKind?: string) {
  const o = await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1`, [id]);
  if (!o || (o.buyer_org_id !== nd.thanhVien.orgId && o.seller_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
  const phia = o.buyer_org_id === nd.thanhVien.orgId ? 'buyer' : 'seller';
  const rk: LyDoHuy = (reasonKind as LyDoHuy) ?? (phia === 'buyer' ? 'buyer_request' : 'seller_request');
  return tinhHeQua(t, o, rk);
}

async function tinhHeQua(t: GiaoDich, o: any, rk: LyDoHuy) {
  const v = await t.mot<any>(`SELECT * FROM core.order_versions WHERE order_id=$1 AND version_no=$2`, [o.id, o.effective_version_no]);
  const C = B(await t.gtri<string>(`SELECT coalesce(sum(balance_vnd),0)::text FROM ledger.v_account_balances WHERE order_id=$1 AND account_type='deposit_escrow'`, [o.id]));
  const F = B(v.fee_vnd);
  const D = B(await t.gtri<string>(`SELECT coalesce(sum(c.amount_vnd),0)::text FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.order_id=$1 AND p.direction='buyer_to_seller'`, [o.id]));
  const cam = B(await t.gtri<string>(`SELECT coalesce(sum(qty),0)::text FROM ledger.qty_balances WHERE lot_id=$1 AND order_key=$2 AND bucket='committed'`, [o.lot_id, o.id]));
  const cocVeNguoiBan = rk === 'buyer_request';
  const hoanPhi = rk !== 'buyer_request';
  return {
    reason_kind: rk,
    hang: `${kg(cam)} trở về lô (khả dụng)`,
    coc: { so_tien_vnd: C.toString(), ve: cocVeNguoiBan ? 'seller' : 'buyer', cau: cocVeNguoiBan ? `Cọc ${dong(C)} chi cho người bán` : `Cọc ${dong(C)} hoàn bên mua` },
    phi: { so_tien_vnd: F.toString(), hoan: hoanPhi, cau: hoanPhi ? `Hoàn phí ${dong(F)}` : 'Phí không hoàn' },
    tra_thang: { da_nhan_vnd: D.toString(), cau: D > 0n ? `Người bán hoàn ${dong(D)} cho bên mua (ngoài app, bên mua xác nhận)` : 'Chưa có khoản trả thẳng' },
    uy_tin: rk === 'seller_request' ? 'Ghi "hủy sau cọc" cho người bán' : rk === 'buyer_request' ? 'Ghi "hủy sau cọc" cho bên mua' : 'Không ai bị trừ uy tín',
  };
}

export async function xinHuy(ht: HeThong, t: GiaoDich, nd: NguoiDung, id: string, b: { reason_kind?: LyDoHuy; reason_text?: string }) {
  const { o, phia } = await layDon(t, nd, id);
  if (nd.thanhVien.nguoiGiup) throw loi('KHONG_CO_QUYEN', 'Người giúp không xin hủy được.');
  if (o.status !== 'active') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Chỉ xin hủy khi đơn đã cọc và đang thực hiện.');
  const batDau = Number(await t.gtri(`SELECT count(*) FROM core.deliveries WHERE order_id=$1 AND status NOT IN ('preparing','ready','cancelled')`, [id]));
  if (batDau > 0) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Đã có đợt bắt đầu nghiệm thu: chỉ hủy phần chưa giao (chưa làm ở bản này).');
  if (await t.mot(`SELECT 1 FROM core.cancellation_requests WHERE order_id=$1 AND status IN ('awaiting_reply','processing_money')`, [id])) throw loi('DANG_XIN_HUY');
  const rk: LyDoHuy = b.reason_kind ?? (phia === 'buyer' ? 'buyer_request' : 'seller_request');
  if (rk === 'buyer_request' && phia !== 'buyer') throw loi('DU_LIEU_KHONG_HOP_LE');
  if (rk === 'seller_request' && phia !== 'seller') throw loi('DU_LIEU_KHONG_HOP_LE');
  // 0040: bất khả kháng cần chứng cứ của chính bên xin (ảnh/giấy tờ gắn đơn, tải qua POST /v1/files entity=order).
  if (rk === 'force_majeure' && !(await t.mot(`SELECT 1 FROM core.documents WHERE order_id=$1 AND doc_type='evidence' AND owner_org_id=$2`, [id, nd.thanhVien.orgId])))
    throw loi('DU_LIEU_KHONG_HOP_LE', 'Bất khả kháng cần chứng cứ: tải ảnh/giấy tờ vào đơn (POST /v1/files, entity=order) rồi gửi lại.');
  const hq = await tinhHeQua(t, o, rk);
  const idReq=await appCmd<string>(t,nd,phia,'request_cancel',[id,rk,b.reason_text??'',false]);
 const c=await t.mot<any>(`SELECT id,status,version FROM core.cancellation_requests WHERE id=$1`,[idReq]);
  return { id: c.id, status: c.status, revision: c.version, he_qua: hq };
}

export async function traLoiHuy(ht:HeThong,t:GiaoDich,nd:NguoiDung,cancelId:string,dongY:boolean){
 const c=await t.mot<any>(`SELECT * FROM core.cancellation_requests WHERE id=$1`,[cancelId]);if(!c)throw loi('KHONG_TIM_THAY');const {o,phia}=await layDon(t,nd,c.order_id);
 await appCmd(t,nd,phia,'answer_cancel',[cancelId,dongY]);if(!dongY)return {id:cancelId,status:'rejected'};
 const doc=await taoTaiLieuPdf(t,{docType:'cancellation_record',code:`${o.code}-BBHUY`,seriesKey:`${o.code}-BBHUY`,versionNo:1,orderId:o.id,ownerOrgId:null,status:'draft',noiDung:{don:o.code,request_id:cancelId,reason:c.reason_kind},trinhBay:{loai:'BBHUY',tieuDe:'BIÊN BẢN HỦY',muc:[{tieuDe:'Căn cứ',doan:[c.reason_text??c.reason_kind]}]}});
 await systemCmd(t,o.status==='active'?'process_cancellation':'process_unsigned_cancellation',[cancelId,doc.payload]);
 for(const b of await t.q<any>(`SELECT code FROM core.bank_instructions WHERE order_id=$1 AND status='created'`,[o.id]))await guiLenhChoNganHangTheoMa(t,b.code);
 await kiemXongHuy(t,o.id);return {id:cancelId,status:await t.gtri(`SELECT status FROM core.cancellation_requests WHERE id=$1`,[cancelId])};
}

/** Khi mọi lệnh của yêu cầu hủy đã đối soát và người bán đã hoàn trả thẳng: yêu cầu xong, đơn đóng. */
export async function kiemXongHuy(t:GiaoDich,orderId:string){
 const c=await t.mot<any>(`SELECT id FROM core.cancellation_requests WHERE order_id=$1 AND status='processing_money'`,[orderId]);if(!c)return null;
 return systemCmd<string>(t,'finish_cancellation',[c.id]);
}
