// Hàm dùng chung cho mọi lệnh nghiệp vụ: chuyển trạng thái qua MỘT chỗ, phát sự kiện outbox, hạn, mã đối tượng.
// DB cưỡng chế máy trạng thái (evt.guard_status + ref.state_transitions) và ghi state_history trong cùng giao dịch;
// hàm ở đây thêm khóa lạc quan (version), lý do, tên lệnh và sự kiện nghiệp vụ.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import { loi } from '../loi.ts';

export const BANG: Record<string, string> = {
  lot: 'core.lots', demand: 'core.demands', offer: 'core.offers', hold: 'core.holds', order: 'core.orders',
  document: 'core.documents', deposit: 'core.deposits', direct_payment: 'core.direct_payments', delivery: 'core.deliveries',
  acceptance_line: 'core.acceptance_lines', dispute: 'core.disputes', cancellation: 'core.cancellation_requests',
  bank_instruction: 'core.bank_instructions', task: 'ops.tasks', payout_account: 'pii.bank_accounts', organization: 'core.organizations', membership: 'core.memberships', trip: 'core.trips', deadline: 'core.deadlines', amendment: 'core.amendments',
};

const CO_VERSION = new Set(['lot', 'demand', 'offer', 'hold', 'order', 'deposit', 'direct_payment', 'delivery', 'cancellation', 'bank_instruction', 'amendment']);

export interface TuyChonChuyen { lenh: string; lyDo?: string | null; version?: number | null; suKien?: string | null; duLieu?: Record<string, unknown> }

/** Chuyển trạng thái: chỉ từ các trạng thái cho phép; khóa dòng; kiểm version nếu client gửi expected_revision. */
export async function chuyenTrangThai(t:GiaoDich,thucThe:string,id:string,tu:string[],sang:string,o:TuyChonChuyen):Promise<any>{throw loi('CHUA_HO_TRO',`Không có command cho ${thucThe}: ${o.lenh}; đường UPDATE trạng thái trực tiếp đã khóa.`);
}

function aggOf(thucThe: string) { return thucThe; }

/** Phát sự kiện nghiệp vụ (evt.domain_events + evt.outbox) trong cùng giao dịch. */
export async function phat(t: GiaoDich, loaiDoiTuong: string, id: string, suKien: string, duLieu: Record<string, unknown> = {}, dich: string[] = ['notify', 'sync_apps']): Promise<string> {
  return t.voiDangNhap('agv_backend_meta',()=>t.gtri<string>(`SELECT evt.emit($1,$2,$3,$4::jsonb,$5::text[])`, [loaiDoiTuong, id, suKien, JSON.stringify(duLieu, thayBigint), dich]));
}

export const thayBigint = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

/** Tạo hạn (core.deadlines). */
export async function taoHan(..._args:any[]):Promise<string>{throw loi('CHUA_HO_TRO','DB chưa có command tạo hạn riêng; hạn phải nằm trong command nghiệp vụ.');
}

/** Đóng các hạn đang mở của đối tượng (met/cancelled). */
export async function dongHan(..._args:any[]):Promise<void>{throw loi('CHUA_HO_TRO','DB chưa có command đóng hạn riêng; dùng command nghiệp vụ hoặc expire_deadline_result.');
}

/** Sinh mã đối tượng có tiền tố, tăng dần (giao dịch tuần tự nên không trùng; UNIQUE ở DB chặn nếu có). */
export async function maMoi(t: GiaoDich, bang: string, tienTo: string, batDau = 1): Promise<string> {
  const n = await t.gtri<number>(
    `SELECT coalesce(max(nullif(regexp_replace(code,'^'||$1||'-',''),code)::int),0) FROM ${bang} WHERE code ~ ('^'||$1||'-[0-9]+$')`, [tienTo]);
  return `${tienTo}-${String(Math.max(Number(n) + 1, batDau)).padStart(4, '0')}`;
}

export function kg(gam: bigint | string | number): string {
  const g = BigInt(gam);
  const nguyen = g / 1000n;
  const du = (g % 1000n) / 100n;
  return du === 0n ? `${nguyen.toLocaleString('vi-VN')} kg` : `${nguyen.toLocaleString('vi-VN')},${du} kg`;
}

export function dong(v: bigint | string | number): string {
  return BigInt(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
}

export function soGam(x: unknown, ten = 'qty_g'): bigint {
  if (typeof x === 'number' && Number.isSafeInteger(x) && x >= 0) return BigInt(x);
  if (typeof x === 'string' && /^\d{1,15}$/.test(x)) return BigInt(x);
  throw loi('DU_LIEU_KHONG_HOP_LE', `${ten} phải là số nguyên không âm.`);
}

/**
 * Đồng bộ trạng thái ký của tài liệu bằng cmd.sync_document (0036, login điều phối): DB tự suy partially/fully_signed
 * từ chữ ký thật; không có dự phòng ghi trực tiếp.
 */
export async function dongBoTaiLieu(t: GiaoDich, docId: string, dich: 'partially_signed' | 'fully_signed') {
  await t.voiHeThong(() => t.q(`SELECT cmd.sync_document($1)`, [docId]));
  const st = await t.gtri<string>(`SELECT status FROM core.documents WHERE id=$1`, [docId]);
  if (st !== dich && !(dich === 'partially_signed' && st === 'fully_signed')) throw loi('TRANG_THAI_KHONG_CHO_PHEP', 'Chưa đủ chữ ký thật để đồng bộ tài liệu.');
  return st;
}
