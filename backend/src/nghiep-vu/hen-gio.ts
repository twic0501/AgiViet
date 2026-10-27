import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Bộ hẹn giờ: xử lý các hạn (core.deadlines) đã tới theo đồng hồ backend (môi trường thử: đồng hồ tua được).
// Mỗi hạn một giao dịch riêng với actor system; lỗi một hạn không chặn hạn khác. Không bao giờ coi tiền là đã nhận khi hết hạn.
import type { HeThong } from '../he-thong.ts';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import { chuyenTrangThai, dongHan, phat } from './chung.ts';
import { taoViec, dayLenhSangNganHang } from './tien.ts';
import { dongDonTruocCoc } from './don.ts';

async function xuLy(ht:HeThong,t:GiaoDich,h:any):Promise<string>{
 const r=await systemCmd<any>(t,'expire_deadline_result',[h.id]);
 if(r.order_id){const {thuQuyetToan}=await import('./quyet-toan.ts');await thuQuyetToan(ht,t,r.order_id);}
 const aliases:Record<string,string>={hold_released:'hold_expired'};return aliases[r.action]??r.action;
}

export async function chayHenGio(ht: HeThong) {
  const now = ht.dongHo.now();
  const ds = await ht.db.doc((t) => t.q<any>(`SELECT id, kind, entity, entity_id, order_id FROM core.deadlines WHERE status='open' AND due_at<=$1 ORDER BY due_at, id`, [now]));
  const kq: { kind: string; entity_id: string; ket_qua: string }[] = [];
  for (const h of ds) {
    try {
      const r = await ht.db.tx({ actor: 'system', lenh: 'hen_gio', requestId: `hg:${h.id}` }, (t) => xuLy(ht, t, h));
      kq.push({ kind: h.kind, entity_id: h.entity_id, ket_qua: r });
    } catch (e: any) {
      kq.push({ kind: h.kind, entity_id: h.entity_id, ket_qua: 'loi: ' + String(e.message ?? e).slice(0, 160) });
    }
  }
  await dayLenhSangNganHang(ht);
  return kq;
}

export { dongHan };
