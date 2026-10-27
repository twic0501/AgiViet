import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Quyết toán (04 mục 5–6): lập settlements từ chứng cứ và sổ hiện tại, tạo lệnh chi cọc người bán (đích = tài khoản
// trong phiên bản đã ký), lệnh hoàn cọc bên mua (về tài khoản nguồn của sự kiện ngân hàng), nghĩa vụ T_bm/T_nb,
// PDF bảng quyết toán; đơn sang hoàn tất / còn công nợ khi lệnh đã đối soát.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { HeThong } from '../he-thong.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { GIO } from '../dong-ho.ts';
import { chuyenTrangThai, phat, taoHan, dong } from './chung.ts';
import { B, quyetToan, chiTam } from './tinh-tien.ts';
import { taoTaiLieuPdf } from '../pdf/tai-lieu-pdf.ts';
import { guiLenhChoNganHangTheoMa, taoKhoanTraThang } from './tien.ts';

/** Chạy khi mọi đợt ở trạng thái cuối và không còn tranh chấp mở. Trả null nếu chưa đủ điều kiện. */
export async function thuQuyetToan(ht:HeThong,t:GiaoDich,orderId:string){
 const o=await t.mot<any>(`SELECT * FROM core.orders WHERE id=$1 FOR UPDATE`,[orderId]);if(o?.status!=='active')return null;
 if(await t.mot(`SELECT 1 FROM core.deliveries WHERE order_id=$1 AND status NOT IN ('closed','shortfall_ended','cancelled')`,[orderId]))return null;
 if(await t.mot(`SELECT 1 FROM core.disputes WHERE order_id=$1 AND status<>'resolved'`,[orderId]))return null;
 if(await t.mot(`SELECT 1 FROM core.cancellation_requests WHERE order_id=$1 AND status IN ('awaiting_reply','processing_money','done')`,[orderId]))return null;
 if(!await t.mot(`SELECT 1 FROM core.deliveries WHERE order_id=$1 AND status IN ('closed','shortfall_ended')`,[orderId]))return null;
 if(await t.mot(`SELECT 1 FROM core.direct_payments WHERE order_id=$1 AND kind IN ('goods_on_receipt','goods_after_days') AND status NOT IN ('fully_received','cancelled')`,[orderId]))return null;
 return lapQuyetToan(ht,t,o,true);
}

/** Lập một phiên bản quyết toán (cuối hoặc tạm khi tranh chấp) và phát lệnh/nghĩa vụ. Chạy với actor system. */
export async function lapQuyetToan(ht:HeThong,t:GiaoDich,o:any,laCuoi:boolean){
 const prev=await t.mot<any>(`SELECT seq,id FROM core.settlements WHERE order_id=$1 ORDER BY seq DESC LIMIT 1`,[o.id]);
 const key=`settlement:${o.id}:${laCuoi?'final':'interim'}:${prev?.id??'first'}`;
 const id=await systemCmd<string>(t,'create_settlement',[o.id,laCuoi,key]);
 const st=await t.mot<any>(`SELECT * FROM core.settlements WHERE id=$1`,[id]);
 const lenh=await t.q<any>(`SELECT code FROM core.bank_instructions WHERE basis_kind='settlement' AND basis_id=$1`,[id]);
 for(const b of lenh)await guiLenhChoNganHangTheoMa(t,b.code);
 // Các số hiển thị/PDF lấy từ snapshot DB, không tự phân cọc hay tính lại.
 const {danhSachBanTrinhBay}=await import('../pdf/ban-trinh-bay.ts');const prevPdf=danhSachBanTrinhBay(o.id).find(d=>d.version_no===st.seq-1);
 const doc=await taoTaiLieuPdf(t,{docType:'settlement_statement',code:`${o.code}-BQT-${st.seq}`,seriesKey:`${o.code}-BQT`,versionNo:st.seq,prevContentSha256:prevPdf?.content_sha256??null,orderId:o.id,ownerOrgId:null,entity:'settlement',entityId:id,status:'draft',noiDung:{loai:'BQT',settlement_id:id,V:String(st.v_vnd),D:String(st.d_vnd),C:String(st.c_vnd),N:String(st.n_vnd),chi:String(st.release_vnd),hoan:String(st.refund_vnd)},trinhBay:{loai:'BQT',tieuDe:'BẢNG QUYẾT TOÁN',muc:[{tieuDe:'Snapshot quyết toán từ CSDL',dong:[['V',dong(st.v_vnd)],['D',dong(st.d_vnd)],['C',dong(st.c_vnd)],['N',dong(st.n_vnd)],['Chi',dong(st.release_vnd)],['Hoàn',dong(st.refund_vnd)]]}]}});
 const {luuBanTrinhBay}=await import('../pdf/ban-trinh-bay.ts');const docId=luuBanTrinhBay(o.id,doc);
 return {settlement_id:id,seq:st.seq,is_final:laCuoi,V:String(st.v_vnd),D:String(st.d_vnd),C:String(st.c_vnd),N:String(st.n_vnd),release_vnd:String(st.release_vnd),refund_vnd:String(st.refund_vnd),t_bm_vnd:String(st.t_bm_vnd),t_nb_vnd:String(st.t_nb_vnd),lenh:lenh.map(b=>b.code),document_id:docId};
}

/** Kiểm đơn chờ quyết toán / còn công nợ có thể hoàn tất chưa. */
export async function kiemHoanTat(t:GiaoDich,orderId:string){
 const o=await t.mot<any>(`SELECT status FROM core.orders WHERE id=$1`,[orderId]);if(!o||!['awaiting_settlement','outstanding'].includes(o.status))return o?.status;
 if(await t.mot(`SELECT 1 FROM core.bank_instructions WHERE order_id=$1 AND status NOT IN ('reconciled','failed')`,[orderId]))return o.status;
 return systemCmd<string>(t,'finish_order',[orderId]);
}
