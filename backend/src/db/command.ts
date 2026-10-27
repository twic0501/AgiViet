// Hợp đồng command cố định phía server; tên login không lấy từ HTTP.
import type { GiaoDich } from './co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { damBaoDangNhap, type PhiaDangNhap } from './dang-nhap-rieng.ts';
export async function appCmd<T = any>(t: GiaoDich, nd: NguoiDung, side: PhiaDangNhap, command: string, args: any[]): Promise<T> {
 // 0048: người giúp dùng login riêng actor helper; DB kiểm ủy quyền đúng thao tác (require_lot_editor).
 if(nd.thanhVien.nguoiGiup)side='helper';
 const login = await damBaoDangNhap(t,nd.userId,nd.thanhVien.orgId,side);
 return loginCmd<T>(t,login,command,args);
}
export async function loginCmd<T = any>(t: GiaoDich, login: string, command: string, args: any[]): Promise<T> {
 if(!/^[a-z_]+$/.test(command)) throw new Error('Tên command không hợp lệ');
 try{return await t.voiDangNhap(login,()=>t.gtri<T>(`SELECT cmd.${command}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args));}
 catch(e:any){
  if(command==='close_unsigned_order'&&e.hint==='ck_status_transition')throw (await import('../loi.ts')).loi('CHUA_HO_TRO','cmd.close_unsigned_order dùng trạng thái hold released chưa có trong máy trạng thái DB; giao dịch đã rollback.');
  throw e;
 }
}
export async function systemCmd<T = any>(t: GiaoDich, command: string, args: any[]): Promise<T> {
 if(!/^[a-z_]+$/.test(command)) throw new Error('Tên command không hợp lệ');
 return t.voiHeThong(()=>t.gtri<T>(`SELECT cmd.${command}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args));
}
