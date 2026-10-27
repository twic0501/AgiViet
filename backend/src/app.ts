// Dựng Fastify: log, request id, lỗi thống nhất, xác thực, bao lệnh (idempotency + một giao dịch + sự kiện), sức khỏe.
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { randomBytes, createHash } from 'node:crypto';
import { ZodError } from 'zod';
// @ts-ignore thư viện JS dùng chung
import { canonicalJson } from '../../security/lib/util.mjs';
import { docCauHinh, kiemKhoiDong, type CauHinh } from './cau-hinh.ts';
import { HeThong } from './he-thong.ts';
import { LoiNghiepVu, MA_LOI, anhXaLoiDb, loi } from './loi.ts';
import type { NguoiDung } from './auth/phien.ts';
import { vaiDb } from './auth/phien.ts';
import type { GiaoDich } from './db/co-so-du-lieu.ts';
import { dayLenhSangNganHang } from './nghiep-vu/tien.ts';
import { dangKyRoutes } from './routes/v1.ts';

declare module 'fastify' {
  interface FastifyRequest { rawBody?: string }
}

export type Phia = 'buyer' | 'seller' | 'ops' | 'system';

export interface BoLenh {
  ht: HeThong;
  xacThuc(req: FastifyRequest): Promise<NguoiDung>;
  lenh(req: FastifyRequest, ten: string, phia: Phia | ((t: GiaoDich, nd: NguoiDung) => Promise<Phia>), fn: (t: GiaoDich, nd: NguoiDung, body: any) => Promise<any>): Promise<any>;
  doc<T>(fn: (t: GiaoDich) => Promise<T>): Promise<T>;
}

function boKhoa(body: any) {
  if (!body || typeof body !== 'object') return {};
  const { idempotency_key, expected_revision, ...rest } = body;
  return rest;
}

export async function dungApp(cfgVao?: CauHinh): Promise<{ app: FastifyInstance; ht: HeThong }> {
  const cfg = cfgVao ?? docCauHinh();
  kiemKhoiDong(cfg);
  const ht = new HeThong(cfg);
  await ht.khoiTao();
  const app = Fastify({
    logger: cfg.logLevel === 'silent' ? false : { level: cfg.logLevel, redact: ['req.headers.authorization', 'req.headers["x-agv-signature"]'] },
    genReqId: () => 'req-' + randomBytes(8).toString('hex'),
    bodyLimit: 12 * 1024 * 1024,
  });
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as FastifyRequest).rawBody = body as string;
    if (!body) return done(null, {});
    try { done(null, JSON.parse(body as string)); } catch { done(loi('DU_LIEU_KHONG_HOP_LE', 'Thân yêu cầu không phải JSON hợp lệ.'), undefined); }
  });
  app.addHook('onSend', async (req, reply, payload) => { reply.header('x-request-id', req.id); return payload; });

  app.setErrorHandler((err: any, req, reply) => {
    let e: LoiNghiepVu;
    if (err instanceof LoiNghiepVu) e = err;
    else if (err instanceof ZodError) e = loi('DU_LIEU_KHONG_HOP_LE', undefined, err.issues.map((i) => ({ truong: i.path.join('.'), loi: i.message })));
    else if (err?.validation) e = loi('DU_LIEU_KHONG_HOP_LE', undefined, err.validation);
    else e = anhXaLoiDb(err) ?? loi('LOI_HE_THONG');
    if (e.ma === 'LOI_HE_THONG') req.log.error({ err }, 'loi_he_thong');
    else req.log.info({ ma: e.ma, chi_tiet: e.chiTiet, db: err?.hint ?? err?.message?.slice?.(0, 200) }, 'loi_nghiep_vu');
    const mt = MA_LOI[e.ma];
    reply.status(e.http).send({ errors: [{ code: e.ma, message: e.message, fix: mt?.khacPhuc ?? '', details: e.chiTiet ?? null }], request_id: req.id });
  });

  const bo: BoLenh = {
    ht,
    async xacThuc(req) {
      const h = req.headers.authorization;
      const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined;
      return ht.phien.xacThuc(token);
    },
    doc: (fn) => ht.db.doc(fn),
    async lenh(req, ten, phia, fn) {
      const nd = await bo.xacThuc(req);
      const body: any = req.body ?? {};
      const key = body.idempotency_key;
      if (typeof key !== 'string' || key.length < 8 || key.length > 128) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần idempotency_key (8–128 ký tự).');
      const hash = createHash('sha256').update(canonicalJson({ lenh: ten, params: req.params ?? {}, body: boKhoa(body) })).digest();
      const tbi = (req.headers['x-device-id'] as string | undefined) ?? nd.thietBi ?? null;
      const kq = await ht.db.tx({ userId: nd.userId, orgId: nd.thanhVien.orgId, actor: 'system', requestId: req.id, lenh: ten, thietBi: tbi }, async (t) => {
        const c = await t.voiDangNhap('agv_backend_meta',()=>t.mot<any>(`SELECT (r).status, (r).response_body FROM (SELECT evt.claim_idempotency($1,$2,$3) r) x`, [`user:${nd.userId}`, key, hash]));
        if (c.status === 'completed') return { ...c.response_body, replayed: true };
        const p = typeof phia === 'function' ? await phia(t, nd) : phia;
        await t.q(`SELECT set_config('app.actor_kind',$1,true)`, [p === 'system' ? 'system' : vaiDb(nd, p)]);
        const out = await fn(t, nd, body);
        const ev = await t.q<{ event_type: string }>(`SELECT event_type FROM evt.domain_events WHERE request_id=$1 ORDER BY seq`, [req.id]);
        const resp = { id: out?.id ?? null, revision: out?.revision ?? null, status: out?.status ?? null, events: ev.map((x) => x.event_type), errors: [], data: out ?? null };
        await t.voiDangNhap('agv_backend_meta',()=>t.q(`UPDATE evt.idempotency_keys SET status='completed', response_code=200, response_body=$3::jsonb, completed_at=now() WHERE scope=$1 AND key=$2`,
          [`user:${nd.userId}`, key, JSON.stringify(resp, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))]));
        return resp;
      });
      await dayLenhSangNganHang(ht);
      return kq;
    },
  };

  app.get('/health', async () => ({ ok: true, moi_truong: cfg.moiTruong, migrations: ht.db.danhSachMigration.length, dau_van_tay_db: ht.db.dauVanTay, gio: ht.dongHo.now().toISOString() }));
  app.get('/health/ready', async () => {
    const r = await ht.db.doc((t) => t.gtri<number>('SELECT 1'));
    return { ok: r === 1 };
  });

  await dangKyRoutes(app, bo);
  return { app, ht };
}
