import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Worker outbox (docs/database/06 "Worker outbox"): claim theo lô bằng FOR UPDATE SKIP LOCKED, COMMIT rồi mới "gửi",
// đánh dấu sent/failed (lùi available_at), quá số lần → dead. Đích hỗ trợ: notify (thông báo trong app, đọc qua
// GET /v1/notifications), sync_apps (đồng bộ hai app: chỉ ghi nhận), các đích khác chưa có kênh → failed rồi dead.
// Thông báo SMS/Zalo thật chưa nối.
import { dayLenhSangNganHang } from './tien.ts';
import type { HeThong } from '../he-thong.ts';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';

const TOI_DA_LAN = 10;
const DICH_HO_TRO = new Set(['notify', 'sync_apps']);

export async function chayOutbox(ht:HeThong,gioiHan=200){
 const lo=await ht.db.tx({actor:'system',lenh:'outbox_claim'},async t=>{
 const ds:any[]=[];for(const dest of ['notify','sync_apps','bank'])ds.push(...await t.voiHeThong(()=>t.q<any>(`SELECT * FROM cmd.claim_outbox($1,$2)`,[dest,Math.min(100,Math.max(1,gioiHan))])));return ds;});
 const ok:number[]=[],hong:any[]=[];
 for(const r of lo){let error:string|null=null;try{if(r.destination==='bank')await dayLenhSangNganHang(ht);else if(!DICH_HO_TRO.has(r.destination))error=`Chưa có kênh cho đích ${r.destination}`;}catch(e:any){error=String(e.message??e).slice(0,300);}
 await ht.db.tx({actor:'system',lenh:'outbox_ack'},t=>systemCmd(t,'finish_outbox',[r.id,r.attempts,error]));
 if(error)hong.push(r);else ok.push(r.id);}
 return {claimed:lo.length,sent:ok.length,failed:hong.filter(r=>r.attempts<TOI_DA_LAN).length,dead:hong.filter(r=>r.attempts>=TOI_DA_LAN).length};
}

/** Thông báo trong app cho tổ chức đang đăng nhập: sự kiện có đích notify đã gửi, thuộc đối tượng liên quan tổ chức. */
export async function thongBao(t: GiaoDich, nd: NguoiDung, q: { limit?: number; after_seq?: number }) {
  const org = nd.thanhVien.orgId;
  const rows=await t.q<any>(`WITH lien AS (
      SELECT e.seq, e.id, e.event_type, e.aggregate_type, e.aggregate_id, e.payload, e.occurred_at,
        coalesce(
          CASE e.aggregate_type WHEN 'order' THEN e.aggregate_id END,
          (SELECT order_id FROM core.deliveries WHERE id=e.aggregate_id), (SELECT order_id FROM core.direct_payments WHERE id=e.aggregate_id),
          (SELECT order_id FROM core.deposits WHERE id=e.aggregate_id), (SELECT order_id FROM core.disputes WHERE id=e.aggregate_id),
          (SELECT order_id FROM core.cancellation_requests WHERE id=e.aggregate_id), (SELECT order_id FROM core.amendments WHERE id=e.aggregate_id),
          (SELECT order_id FROM core.bank_instructions WHERE id=e.aggregate_id), (SELECT order_id FROM core.holds WHERE id=e.aggregate_id)) order_id
      FROM evt.domain_events e JOIN evt.outbox ob ON ob.event_id=e.id AND ob.destination='notify' AND ob.status='sent'
      WHERE e.seq > $2)
    SELECT l.seq, l.id, l.event_type, l.aggregate_type, l.aggregate_id, l.order_id, l.occurred_at, l.payload
    FROM lien l LEFT JOIN core.orders o ON o.id=l.order_id
    WHERE (o.buyer_org_id=$1 OR o.seller_org_id=$1)
       OR (l.aggregate_type='lot' AND EXISTS(SELECT 1 FROM core.lots x WHERE x.id=l.aggregate_id AND x.seller_org_id=$1))
       OR (l.aggregate_type='demand' AND EXISTS(SELECT 1 FROM core.demands x WHERE x.id=l.aggregate_id AND x.buyer_org_id=$1))
       OR (l.aggregate_type='offer' AND EXISTS(SELECT 1 FROM core.offers x WHERE x.id=l.aggregate_id AND (x.buyer_org_id=$1 OR (x.seller_org_id=$1 AND l.event_type<>'loi_chao.tu_tu_choi'))))
       OR (l.aggregate_type='organization' AND l.aggregate_id=$1)
    ORDER BY l.seq DESC LIMIT $3`, [org, q.after_seq ?? 0, Math.min(200, q.limit ?? 50)]);
  return rows.map(r=>({...r,event_type:r.event_type==='order.active'?'don.hieu_luc':r.event_type}));
}
