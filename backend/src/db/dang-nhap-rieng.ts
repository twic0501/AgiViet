// D-01: mỗi danh tính (user × tổ chức × phía) có một LOGIN PostgreSQL riêng chỉ kế thừa agiviet_app,
// được ánh xạ ở cmd.login_principals bởi bộ quản trị tin cậy (ở đây: backend sau khi xác thực OTP, chạy bằng login broker chỉ quản lý role và login_principals).
// Request web KHÔNG tự chọn login: backend dựng tên login từ phiên đã xác thực.
import { createHash } from 'node:crypto';
import type { GiaoDich } from './co-so-du-lieu.ts';

export type PhiaDangNhap = 'buyer' | 'seller' | 'ops' | 'helper' | 'inspector';

export function tenDangNhap(userId: string, orgId: string, phia: PhiaDangNhap): string {
  return 'agv_u_' + createHash('sha256').update(`${userId}|${orgId}|${phia}`).digest('hex').slice(0, 16);
}

export async function damBaoDangNhap(t: GiaoDich, userId: string, orgId: string, phia: PhiaDangNhap): Promise<string> {
  const login = tenDangNhap(userId, orgId, phia);
  const co = await t.mot(`SELECT 1 FROM cmd.login_principals WHERE login_name=$1 AND active`,[login]);
  if(!co)await t.voiDangNhap('agv_backend_broker',async()=>{
    // Role là toàn cụm: DB thử dựng lại từ template có thể đã có role, chỉ thiếu ánh xạ.
    if (!(await t.mot(`SELECT 1 FROM pg_roles WHERE rolname=$1`, [login]))) await t.q(`CREATE ROLE ${login} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
    await t.q(`GRANT agiviet_app TO ${login}`);
    await capChoCong(t, login);
    await t.q(`INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind,active) VALUES($1,$2,$3,$4,true)`,[login,userId,orgId,phia]);
  });
  return login;
}

/** Login điều phối: một danh tính hệ thống của tổ chức nền tảng có phân công staff active, kế thừa agiviet_orchestrator. */
export async function damBaoDangNhapHeThong(t: GiaoDich): Promise<string> {
  const nd = await t.mot<{ user_id: string; org_id: string }>(
    `SELECT m.user_id, m.org_id FROM core.memberships m JOIN core.organizations o ON o.id=m.org_id AND o.is_platform AND o.status='active'
      JOIN ops.staff_assignments s ON s.user_id=m.user_id AND s.active
     WHERE m.status='active' ORDER BY (s.role_code='supervisor') DESC, m.user_id LIMIT 1`);
  if (!nd) throw new Error('Chưa có nhân sự nền tảng để ánh xạ login điều phối');
  const login = 'agv_s_' + createHash('sha256').update(`${nd.user_id}|${nd.org_id}|system`).digest('hex').slice(0, 16);
  if(!await t.mot(`SELECT 1 FROM cmd.login_principals WHERE login_name=$1 AND active`,[login]))await t.voiDangNhap('agv_backend_broker',async()=>{
    if (!(await t.mot(`SELECT 1 FROM pg_roles WHERE rolname=$1`, [login]))) await t.q(`CREATE ROLE ${login} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);await t.q(`GRANT agiviet_orchestrator TO ${login}`);await capChoCong(t, login);
    await t.q(`INSERT INTO cmd.login_principals(login_name,user_id,org_id,actor_kind,active) VALUES($1,$2,$3,'system',true)`,[login,nd.user_id,nd.org_id]);
  });
  return login;
}

/** Postgres thật: login cổng (agv_backend_gateway, NOINHERIT) phải là thành viên để SET LOCAL ROLE sang danh tính. PGlite không có cổng thì bỏ qua. */
async function capChoCong(t: GiaoDich, login: string) {
  if (await t.mot(`SELECT 1 FROM pg_roles WHERE rolname='agv_backend_gateway'`)) await t.q(`GRANT ${login} TO agv_backend_gateway WITH INHERIT FALSE`);
}
