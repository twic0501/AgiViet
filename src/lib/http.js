// HTTP tối giản: router có tham số, phiên cookie, chống gửi lặp (idempotency_key), file tĩnh.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, one, run, insert, nowIso, sha256 } from './core.js';

const tuyen = [];
export function route(method, mau, xuLy, tuyChon = {}) {
  const ten = [];
  const re = new RegExp('^' + mau.replace(/:([a-z_]+)/g, (_, k) => { ten.push(k); return '([^/]+)'; }) + '$');
  tuyen.push({ method, re, ten, xuLy, ...tuyChon });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8' };

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}
async function docBody(req) {
  let n = 0; const phan = [];
  for await (const c of req) { n += c.length; if (n > 1e6) throw new AppError('E05', 'Dữ liệu gửi lên quá lớn.', 413); phan.push(c); }
  if (!phan.length) return {};
  try { return JSON.parse(Buffer.concat(phan).toString('utf8')); } catch { throw new AppError('E05', 'Dữ liệu không đúng định dạng JSON.'); }
}
const guiJson = (res, status, obj, them = {}) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...them });
  res.end(JSON.stringify(obj));
};

// Phiên: cookie av_phien (httpOnly) → user, org, vai trò
export function docPhien(req) {
  const t = cookies(req).av_phien;
  if (!t) return null;
  const s = one('select * from sessions where token_hash = ?', sha256(t));
  if (!s || s.expires_at < nowIso()) return null;
  const user = one('select * from users where id = ?', s.user_id);
  const org = one('select * from organizations where id = ?', s.org_id);
  const m = one("select * from memberships where user_id = ? and org_id = ? and status <> 'revoked'", s.user_id, s.org_id);
  if (!user || !org || !m) return null;
  return { user, org, roles: m.roles.split(','), membership: m };
}

export function taoServer({ tinh = [] }) {
  return async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const requestId = randomUUID();
    try {
      if (url.pathname.startsWith('/api/')) {
        const r = tuyen.find(t => t.method === req.method && t.re.test(url.pathname));
        if (!r) throw new AppError('E05', 'Không có lệnh này.', 404);
        const params = Object.fromEntries(r.ten.map((k, i) => [k, decodeURIComponent(url.pathname.match(r.re)[i + 1])]));
        const body = req.method === 'GET' ? {} : await docBody(req);
        const phien = docPhien(req);
        if (!r.moi && !phien) throw new AppError('E01', 'Bạn cần đăng nhập.', 401);
        const ctx = { ...(phien || {}), requestId, params, query: Object.fromEntries(url.searchParams), body, req, res };
        // Chống gửi lặp: cùng khóa → trả lại đúng kết quả cũ, không tạo tiền/chữ ký/lượt mới (BR-30, E10)
        const khoa = req.headers['idempotency-key'] || body.idempotency_key;
        if (req.method !== 'GET' && khoa && phien) {
          const cu = one('select * from idempotency_keys where key = ? and user_id = ?', khoa, phien.user.id);
          if (cu) return guiJson(res, cu.status, JSON.parse(cu.response), { 'x-lap-lai': '1' });
        }
        const kq = await r.xuLy(ctx);
        const status = kq?.__status || 200;
        if (kq && kq.__status) delete kq.__status;
        const out = { ok: true, request_id: requestId, ...(kq || {}) };
        if (req.method !== 'GET' && khoa && phien) insert('idempotency_keys', { key: khoa, user_id: phien.user.id, status, response: JSON.stringify(out), created_at: nowIso() });
        return guiJson(res, status, out, ctx.datCookie ? { 'set-cookie': ctx.datCookie } : {});
      }
      // File tĩnh: /ban/ → fe-nongdan, /mua/ → fe-thumua
      for (const { tien_to, thu_muc } of tinh) {
        if (url.pathname === tien_to.slice(0, -1)) { res.writeHead(302, { location: tien_to }); return res.end(); }
        if (!url.pathname.startsWith(tien_to)) continue;
        let rel = decodeURIComponent(url.pathname.slice(tien_to.length)) || 'index.html';
        const file = path.resolve(thu_muc, rel);
        if (!file.startsWith(path.resolve(thu_muc))) break;
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) break;
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
        return fs.createReadStream(file).pipe(res);
      }
      if (url.pathname === '/') { res.writeHead(302, { location: '/ban/' }); return res.end(); }
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Không tìm thấy');
    } catch (e) {
      if (e instanceof AppError) return guiJson(res, e.http, { ok: false, request_id: requestId, ...e.toJSON() });
      console.error(requestId, e);
      const rangBuoc = /constraint|CHECK|UNIQUE|FOREIGN KEY/i.test(e.message);
      return guiJson(res, rangBuoc ? 409 : 500, { ok: false, request_id: requestId, ma: rangBuoc ? 'E05' : 'E10', loi: rangBuoc ? 'Dữ liệu vi phạm ràng buộc, không ghi.' : 'Lỗi hệ thống. Mã tra cứu: ' + requestId, can_ho_tro: true });
    }
  };
}
