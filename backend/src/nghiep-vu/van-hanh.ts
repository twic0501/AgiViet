import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Hàng việc thủ công (08): danh sách theo SLA, nhận việc, xong việc có kết quả. Lệnh tiền thủ công cần hai người (DB kiểm).
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { canQuyen } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { chuyenTrangThai, phat } from './chung.ts';
import { damBaoDangNhap } from '../db/dang-nhap-rieng.ts';
import { guiLenhChoNganHangTheoMa } from './tien.ts';

export async function danhSachViec(t: GiaoDich, q: { status?: string; kind?: string }) {
  return t.q(`SELECT t.id,t.code,t.kind,'P'||t.priority priority,t.entity,t.entity_id,t.order_id,o.code order_code,t.required_role,t.trigger_reason,t.status,t.assigned_to,
      u.display_name assigned_name,t.response_due_at,t.resolution_due_at,t.next_update_at,t.result_code,t.created_at
      FROM ops.tasks t LEFT JOIN core.orders o ON o.id=t.order_id LEFT JOIN core.users u ON u.id=t.assigned_to
      WHERE ($1::text IS NULL OR t.status=$1) AND ($2::text IS NULL OR t.kind=$2) ORDER BY t.priority, t.response_due_at`, [q.status ?? null, q.kind ?? null]);
}

export async function nhanViec(t:GiaoDich,nd:NguoiDung,id:string){
 canQuyen(nd,'ops.task');await appCmd(t,nd,'ops','act_on_task',[id,'claim',{}]);return {id,status:await t.gtri(`SELECT status FROM ops.tasks WHERE id=$1`,[id]),code:await t.gtri(`SELECT code FROM ops.tasks WHERE id=$1`,[id])};
}

export async function xongViec(t:GiaoDich,nd:NguoiDung,id:string,b:{result_code:string;note?:string}){
 canQuyen(nd,'ops.task');const status=await t.gtri<string>(`SELECT status FROM ops.tasks WHERE id=$1`,[id]);
 if(status==='claimed')await appCmd(t,nd,'ops','act_on_task',[id,'start',{}]);await appCmd(t,nd,'ops','act_on_task',[id,'finish',{result_code:b.result_code,note:b.note??null}]);return {id,status:await t.gtri(`SELECT status FROM ops.tasks WHERE id=$1`,[id])};
}

/** D-07: lệnh chi ≥ 20 triệu tới tài khoản kích hoạt dưới 72 giờ được giữ tới khi tài chính/rủi ro gọi lại chủ tài khoản
 *  (số đã xác minh) và ghi chứng cứ bằng cmd.confirm_payout_callback; sau đó lệnh mới được gửi. */
export async function xacNhanGoiLai(t: GiaoDich, nd: NguoiDung, instructionId: string, b: { duration_seconds: number; summary: string }) {
  if (!nd.vaiVanHanh.some((v) => v === 'finance' || v === 'risk')) throw loi('KHONG_CO_QUYEN', 'Chỉ tài chính hoặc rủi ro gọi lại.');
  const ins = await t.mot<any>(`SELECT * FROM core.bank_instructions WHERE id=$1 FOR UPDATE`, [instructionId]);
  if (!ins) throw loi('KHONG_TIM_THAY');
  if (!ins.callback_required || ins.status !== 'created') throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Lệnh không chờ gọi lại.');
  const task = await t.mot<any>(`SELECT id FROM ops.tasks WHERE entity='bank_instruction' AND entity_id=$1 ORDER BY created_at DESC LIMIT 1`, [instructionId]);
  if (!task) throw loi('KHONG_TIM_THAY', 'Chưa có việc gọi lại cho lệnh này.');
  const chu = await t.mot<any>(`SELECT m.user_id FROM core.memberships m JOIN core.membership_roles r ON r.membership_id=m.id WHERE m.org_id=$1 AND m.status='active' AND r.role_code='owner' ORDER BY m.created_at LIMIT 1`, [ins.target_org_id]);
  if (!chu) throw loi('KHONG_TIM_THAY', 'Tổ chức nhận không có chủ tài khoản để gọi lại.');
  if (!(b?.duration_seconds > 0) || !b.summary) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần thời lượng cuộc gọi và tóm tắt.');
  const st=await t.gtri<string>(`SELECT status FROM ops.tasks WHERE id=$1`,[task.id]);if(st==='new'||st==='overdue')await nhanViec(t,nd,task.id);
 const call={id:await appCmd<string>(t,nd,'ops','record_call',[task.id,chu.user_id,b.duration_seconds,b.summary])};
  const login = await damBaoDangNhap(t, nd.userId, nd.thanhVien.orgId, 'ops');
  await t.voiDangNhap(login, () => t.q(`SELECT cmd.confirm_payout_callback($1,$2,$3)`, [instructionId, chu.user_id, call.id]));
  await phat(t, 'bank_instruction', instructionId, 'lenh.da_goi_lai', { call_id: call.id });
  await t.q(`SELECT set_config('app.actor_kind','system',true)`);
  await guiLenhChoNganHangTheoMa(t, ins.code);
  return { id: instructionId, status: await t.gtri(`SELECT status FROM core.bank_instructions WHERE id=$1`, [instructionId]) };
}
