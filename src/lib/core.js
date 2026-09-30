// Lõi: CSDL, giao dịch, đồng hồ, mã lỗi E01–E16, nhật ký (AuditEvent) và Outbox.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* ---------- Đồng hồ: kiểm thử đặt được giờ giả ---------- */
let gioGia = null;
export const clock = {
  now: () => (gioGia ? new Date(gioGia) : new Date()),
  set: iso => { gioGia = iso ? new Date(iso).getTime() : null; },
  advance: ms => { gioGia = clock.now().getTime() + ms; },
};
export const nowIso = () => clock.now().toISOString();
export const addMs = (iso, ms) => new Date(new Date(iso).getTime() + ms).toISOString();
export const HOUR = 3600e3, DAY = 24 * HOUR;
// Kỳ hạn mức theo tháng dương lịch, giờ Việt Nam (UTC+7)
export const periodOf = (iso = nowIso()) => new Date(new Date(iso).getTime() + 7 * HOUR).toISOString().slice(0, 7);

/* ---------- Mã định danh ---------- */
export const newId = (tien_to = '') => tien_to + randomBytes(9).toString('base64url');
export const sha256 = s => createHash('sha256').update(String(s)).digest('hex');

/* ---------- Lỗi nghiệp vụ theo danh mục E (Quy trình v3 mục 19) ---------- */
export const LOI = {
  E01: 'Chưa rõ quyền bán hoặc ký. Bổ sung phạm vi đại diện hoặc chọn người đúng quyền.',
  E02: 'Mã OTP không đúng hoặc đã hết hạn. Chờ rồi gửi lại, không đọc mã cho ai.',
  E03: 'Lượng còn không đủ so với lượng cần giữ hoặc đã hứa.',
  E04: 'Hàng khác tin hoặc vắng hẹn khảo sát.',
  E05: 'Điều kiện chưa khớp hoặc còn thiếu trường bắt buộc.',
  E06: 'Chưa rõ kết quả ký. Đừng ký lại, app đang kiểm tra.',
  E07: 'Số cân/đo hai bên khác nhau. App giữ cả hai số, chưa trừ tiền.',
  E08: 'Tiền chưa rõ hoặc bấm nhầm. Mở đối soát, không tự đảo tiền.',
  E09: 'Phần của hộ chưa đúng.',
  E10: 'Mạng lỗi hoặc gửi lặp. Kiểm tra trạng thái trước khi thử lại.',
  E11: 'Hết hạn mức. Xem ngày đặt lại hoặc rút lời mời đang chờ.',
  E12: 'Đối tác dịch vụ hủy hoặc chưa sẵn sàng.',
  E13: 'Nghi lộ dữ liệu hoặc truy cập trái phép.',
  E14: 'Muốn thay đổi sau ký: tạo phiên bản hoặc phụ lục mới.',
  E15: 'Tài khoản nhận tiền đang chờ xác minh, chưa dùng được.',
  E16: 'Phí dịch vụ quá hạn: tạm chưa bật được hỗ trợ cho đơn mới.',
};
export class AppError extends Error {
  constructor(ma, chiTiet, http = 400, truong = null) {
    super(chiTiet || LOI[ma] || ma);
    this.ma = ma; this.http = http; this.truong = truong;
  }
  toJSON() { return { ma: this.ma, loi: this.message, goi_y: LOI[this.ma] || null, truong: this.truong, can_ho_tro: true }; }
}
export const loi = (ma, chiTiet, truong) => new AppError(ma, chiTiet, ma === 'E01' ? 403 : 400, truong);
export const khongThay = (vat = 'Hồ sơ') => new AppError('E01', `${vat} không tồn tại hoặc bạn không có quyền xem.`, 404);

/* ---------- CSDL ---------- */
let db = null;
export function moDb(duongDan = process.env.AGIVIET_DB || path.join(goc, 'data', 'agiviet.db')) {
  if (duongDan !== ':memory:') fs.mkdirSync(path.dirname(duongDan), { recursive: true });
  db = new DatabaseSync(duongDan);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (duongDan !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  const coBang = db.prepare("select count(*) n from sqlite_master where type='table' and name='users'").get().n;
  if (!coBang) db.exec(fs.readFileSync(path.join(goc, 'db', 'schema.sql'), 'utf8'));
  return db;
}
export const getDb = () => db;
export const one = (sql, ...a) => db.prepare(sql).get(...a);
export const all = (sql, ...a) => db.prepare(sql).all(...a);
export const run = (sql, ...a) => db.prepare(sql).run(...a);
export function insert(bang, obj) {
  const k = Object.keys(obj);
  db.prepare(`insert into ${bang} (${k.join(',')}) values (${k.map(() => '?').join(',')})`).run(...k.map(x => obj[x] ?? null));
  return obj;
}

// Giao dịch lồng được; BEGIN IMMEDIATE để giữ khóa ghi khi kiểm tra rồi cập nhật (BR-30)
let sau = 0;
export function tx(fn) {
  if (sau > 0) { sau++; try { return fn(); } finally { sau--; } }
  db.exec('BEGIN IMMEDIATE');
  sau = 1;
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
  finally { sau = 0; }
}

/* ---------- Nhật ký, outbox, thông báo (cùng giao dịch với thay đổi) ---------- */
export function audit(ctx, entity, entityId, action, detail) {
  insert('audit_events', { id: newId('ae_'), actor_user: ctx?.user?.id, org_id: ctx?.org?.id, entity, entity_id: entityId, action, detail: detail ? JSON.stringify(detail) : null, request_id: ctx?.requestId, at: nowIso() });
}
export function outbox(kind, payload) {
  insert('outbox_events', { id: newId('ob_'), kind, payload: JSON.stringify(payload), created_at: nowIso() });
}
export function notify(orgId, text, link = null) {
  insert('notifications', { id: newId('nt_'), org_id: orgId, text, link, at: nowIso() });
  outbox('thong_bao', { orgId, text });
}

/* ---------- Mã hồ sơ dễ đọc: HĐ-0231, PDV-1031 ... ---------- */
export function nextCode(tienTo, bang, cot = 'code') {
  const r = one(`select ${cot} c from ${bang} where ${cot} like ? order by length(${cot}) desc, ${cot} desc limit 1`, tienTo + '%');
  const so = r ? Number(r.c.slice(tienTo.length)) + 1 : 1;
  return tienTo + String(so).padStart(4, '0');
}
