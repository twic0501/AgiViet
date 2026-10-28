// Tầng dữ liệu. Dev/test chạy PGlite (PostgreSQL 17 WASM, một kết nối) nạp db/migrations + db/seed.
//
// Mô hình quyền (D-01, docs/database/04):
// - Lệnh có danh tính (ký OTP, xác nhận đã nhận tiền) gọi cmd.* dưới LOGIN RIÊNG của người dùng (chỉ kế thừa
//   agiviet_app) đã ánh xạ ở cmd.login_principals; DB tự lấy user/org theo session_user.
// - OTP gọi cmd.record_otp/otp_verification dưới vai agiviet_auth_worker; webhook ngân hàng gọi
//   cmd.record_bank_event + core.apply_bank_event dưới vai agiviet_bank_worker.
// - Runtime mặc định là reader không có DML; nghiệp vụ chỉ qua cmd dưới login riêng.
// - Owner chỉ nạp migrations/seed, tạo vai lúc khởi tạo/đặt lại, hoặc import fixture thử.
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { THU_MUC_BACKEND, THU_MUC_GOC } from '../cau-hinh.ts';
import { anhXaLoiDb } from '../loi.ts';

export type VaiNguCanh = 'buyer' | 'seller' | 'helper' | 'ops' | 'system' | 'bank' | 'inspector' | 'carrier';

export interface NguCanh {
  userId?: string | null;
  orgId?: string | null;
  actor: VaiNguCanh;
  requestId?: string;
  lyDo?: string | null;
  lenh?: string | null;
  thietBi?: string | null;
}

class KhoaTuanTu {
  private duoi: Promise<void> = Promise.resolve();
  async chay<T>(fn: () => Promise<T>): Promise<T> {
    let mo!: () => void;
    const truoc = this.duoi;
    this.duoi = new Promise<void>((r) => (mo = r));
    await truoc;
    try { return await fn(); } finally { mo(); }
  }
}

type PgTx = { query: <T>(sql: string, params?: any[]) => Promise<{ rows: T[] }>; exec: (sql: string) => Promise<unknown> };

export class GiaoDich {
  /** pglite: SET SESSION AUTHORIZATION (một kết nối giả lập nhiều login); pg: SET LOCAL ROLE từ login cổng agv_backend_gateway. */
  constructor(private t: PgTx, public thoiDiemMs: number, private chuSoHuu: string, private cheDo: 'pglite' | 'pg' = 'pglite') {}
  private loginCourant = 'agv_backend_read';
  async q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if(this.loginCourant==='agv_backend_read') {
      // Khóa nghiệp vụ nằm trong command; reader không có UPDATE kể cả để SELECT FOR UPDATE.
      sql=sql.replace(/\s+FOR UPDATE(?: OF [a-z_, ]+)?(?: SKIP LOCKED)?/gi,'');
      if(!/^\s*(SELECT|WITH)\b/i.test(sql)) throw (await import('../loi.ts')).loi('CHUA_HO_TRO','Đường ghi trực tiếp đã khóa; cần command DB theo hướng dẫn 06.');
    }
    const r = await this.t.query<T>(sql, params.map(chuanHoaThamSo));
    return r.rows;
  }
  async mot<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const r = await this.q<T>(sql, params);
    return r[0] ?? null;
  }
  async gtri<T = any>(sql: string, params: any[] = []): Promise<T> {
    const r = await this.q<any>(sql, params);
    const row = r[0];
    return (row ? Object.values(row)[0] : null) as T;
  }
  async datNguCanh(nc: NguCanh, thoiDiemThu?: Date | null) {
    await this.q(
      `SELECT set_config('app.user_id',$1,true), set_config('app.org_id',$2,true), set_config('app.actor_kind',$3,true),
              set_config('app.request_id',$4,true), set_config('app.reason',$5,true), set_config('app.command',$6,true),
              set_config('app.device_id',$7,true), set_config('app.test_time',$8,true)`,
      [nc.userId ?? '', nc.orgId ?? '', nc.actor, nc.requestId ?? '', nc.lyDo ?? '', nc.lenh ?? '', nc.thietBi ?? '',
        thoiDiemThu ? thoiDiemThu.toISOString() : ''],
    );
  }
  async datLyDo(lyDo: string | null, lenh?: string | null) {
    await this.q(`SELECT set_config('app.reason',$1,true), set_config('app.command',$2,true)`, [lyDo ?? '', lenh ?? '']);
  }
  /** Chạy fn dưới login riêng của người dùng (D-01). Luôn trả về login trước đó sau khi thành công; lỗi rollback cả transaction. */
  async voiDangNhap<T>(login: string, fn: () => Promise<T>): Promise<T> {
    if (!/^(agv_[us]_[0-9a-f]{16}|agv_backend_(read|meta|broker|auth|bank|clock))$/.test(login)) throw new Error('Tên login không hợp lệ');
    // PGlite giả lập kết nối riêng trên một kết nối vật lý; original login chỉ dùng để chuyển session.
    // pg: quay về owner của fixture thử bằng RESET ROLE (không có vai tên 'owner').
    const doi = (vai: string) => this.t.exec(this.cheDo === 'pg' ? (vai === 'owner' ? 'RESET ROLE' : `SET LOCAL ROLE ${vai}`) : `SET SESSION AUTHORIZATION ${vai}`);
    await doi(login);
    const previous=this.loginCourant;this.loginCourant=login;
    let r:T;
    try {r=await fn();}catch(e){this.loginCourant=previous;throw e;}
    await doi(previous);this.loginCourant=previous;
    return r;
  }
  /** Môi trường thử: owner ghi đồng hồ nghiệp vụ vào cmd.test_clock (0033); production không bao giờ gọi. */
  async datDongHoThu(gio: Date) {
    await this.voiDangNhap('agv_backend_clock',()=>this.q(`INSERT INTO cmd.test_clock(singleton,at) VALUES(true,$1) ON CONFLICT(singleton) DO UPDATE SET at=EXCLUDED.at`, [gio.toISOString()]));
  }
  /** Chạy fn dưới login điều phối (kế thừa agiviet_orchestrator, actor system) cho các command cmd.* hệ thống. */
  async voiHeThong<T>(fn: () => Promise<T>): Promise<T> {
    const { damBaoDangNhapHeThong } = await import('./dang-nhap-rieng.ts');
    const login = await damBaoDangNhapHeThong(this);
    return this.voiDangNhap(login, fn);
  }
  /** Chạy fn dưới vai worker (auth/bank). */
  async voiVai<T>(vai: 'agiviet_auth_worker' | 'agiviet_bank_worker', fn: () => Promise<T>): Promise<T> {
    return this.voiDangNhap(vai==='agiviet_auth_worker'?'agv_backend_auth':'agv_backend_bank',fn);
  }
}

function chuanHoaThamSo(v: any) {
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === 'object' && !Buffer.isBuffer(v) && !(v instanceof Uint8Array) && !Array.isArray(v)) return JSON.stringify(v);
  // Mảng object là jsonb (driver pg sẽ biến mảng JS thành mảng PG); mảng giá trị đơn giữ nguyên cho text[]/uuid[].
  if (Array.isArray(v) && v.some((x) => x !== null && typeof x === 'object')) return JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x));
  return v;
}

const EXT = { btree_gist, pgcrypto };

function danhSachSql(): { ten: string; sql: string }[] {
  const out: { ten: string; sql: string }[] = [];
  for (const thuMuc of ['migrations', 'seed']) {
    const dir = join(THU_MUC_GOC, 'db', thuMuc);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) out.push({ ten: `${thuMuc}/${f}`, sql: readFileSync(join(dir, f), 'utf8') });
  }
  return out;
}

export class CoSoDuLieu {
  private pg!: PGlite;
  private khoa = new KhoaTuanTu();
  private banSach: Blob | null = null;
  private chuSoHuu = 'postgres';
  dauVanTay = '';
  danhSachMigration: string[] = [];
  /** Hàm lấy giờ (đồng hồ backend) và cờ môi trường thử để truyền app.test_time. */
  private pool: pg.Pool | null = null;
  /** Chỉ môi trường thử trên Postgres thật: URL owner để dựng lại DB từ template và import fixture. Production không đọc. */
  private ownerUrl: string | null = null;
  private templateDb: string | null = null;
  private ownerPoolDb: pg.Pool | null = null;
  get kieu(): 'pglite' | 'pg' { return this.databaseUrl ? 'pg' : 'pglite'; }
  constructor(private layGio: () => Date, private laThu: boolean, private databaseUrl: string | null = null, private poolMax = 10) {}

  /**
   * PostgreSQL thật: pool đăng nhập bằng login cổng (agv_backend_gateway, NOINHERIT, không owner/superuser).
   * Mỗi giao dịch SET LOCAL ROLE sang reader, rồi sang login danh tính/worker khi gọi command. Migrations, seed và cấp vai
   * do provisioner chạy ngoài backend (scripts/cap-quyen-postgres.sql). Không có khóa tuần tự: pool chạy song song,
   * SERIALIZABLE + thử lại 40001/40P01.
   */
  private async khoiTaoPg(): Promise<void> {
    pg.types.setTypeParser(20, (v) => v); // bigint giữ chuỗi
    if (this.laThu && process.env.AGV_TEST_PG_OWNER_URL) { this.ownerUrl = process.env.AGV_TEST_PG_OWNER_URL; this.templateDb = process.env.AGV_TEST_PG_TEMPLATE ?? null; }
    // Có mẫu chỉ bật khả năng đặt lại (/v1/test/reset). Dựng lại lúc khởi động cần cờ chủ động riêng,
    // để khởi động lại sau sao lưu không tự xóa dữ liệu thử (Codex rà b6c19c3).
    if (this.templateDb && process.env.AGV_DAT_LAI_KHI_KHOI_DONG === '1') await this.dungLaiTuMau();
    this.pool = new pg.Pool({ connectionString: this.databaseUrl!, max: this.poolMax, idleTimeoutMillis: 30_000, application_name: 'agiviet-backend' });
    const c = await this.pool.connect();
    try {
      const r = await c.query(`SELECT session_user u, (SELECT rolsuper FROM pg_roles WHERE rolname=session_user) su,
          (SELECT count(*) FROM public.schema_migrations) n, pg_has_role(session_user,'agv_backend_read','MEMBER') doc`);
      const x = r.rows[0];
      if (x.su) throw new Error('DATABASE_URL đăng nhập superuser: runtime không được chạy owner');
      if (!x.doc) throw new Error('Login cổng chưa được cấp agv_backend_read (chạy scripts/cap-quyen-postgres.sql)');
      this.chuSoHuu = x.u;
      this.danhSachMigration = []; this.dauVanTay = `pg:${x.n}`;
    } finally { c.release(); }
  }

  /** Thử trên Postgres thật: DROP/CREATE DB đích từ template đã migrate+seed+cấp quyền (owner, chỉ kiểm thử). */
  private async dungLaiTuMau(): Promise<void> {
    const ten = new URL(this.databaseUrl!).pathname.slice(1);
    if (!/^[a-z_][a-z0-9_]*$/.test(ten) || !/^[a-z_][a-z0-9_]*$/.test(this.templateDb!)) throw new Error('Tên DB thử lạ');
    const u = new URL(this.ownerUrl!); u.pathname = '/postgres';
    const c = new pg.Client({ connectionString: u.toString() });
    await c.connect();
    try {
      await c.query(`DROP DATABASE IF EXISTS ${ten} WITH (FORCE)`);
      await c.query(`CREATE DATABASE ${ten} TEMPLATE ${this.templateDb}`);
    } finally { await c.end(); }
  }

  private async txPg<T>(nc: NguCanh, fn: (t: GiaoDich) => Promise<T>, ghi: boolean): Promise<T> {
    for (let lan = 1; ; lan++) {
      const c = await this.pool!.connect();
      const gio = this.layGio();
      try {
        await c.query(ghi ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY');
        const raw: PgTx = { query: (sql, params) => c.query(sql, params) as any, exec: (sql) => c.query(sql) };
        const t = new GiaoDich(raw, gio.getTime(), this.chuSoHuu, 'pg');
        await c.query('SET LOCAL ROLE agv_backend_read');
        const gioThu = this.templateDb ? gio : null;
        await t.datNguCanh(nc, gioThu);
        if (gioThu && ghi) await t.datDongHoThu(gioThu);
        const kq = await fn(t);
        await c.query('COMMIT');
        return kq;
      } catch (e: any) {
        await c.query('ROLLBACK').catch(() => {});
        if (ghi && ['40001', '40P01'].includes(e?.code) && lan < 4) { await new Promise((r) => setTimeout(r, 20 * lan + Math.random() * 30)); continue; }
        const m = anhXaLoiDb(e);
        if (m && !(e as any).ma) throw m;
        throw e;
      } finally { c.release(); }
    }
  }

  async khoiTao(): Promise<void> {
    if (this.databaseUrl) return this.khoiTaoPg();
    const files = danhSachSql();
    this.danhSachMigration = files.filter((f) => f.ten.startsWith('migrations/')).map((f) => f.ten);
    const h = createHash('sha256');
    for (const f of files) h.update(f.ten).update('\0').update(f.sql).update('\0');
    this.dauVanTay = h.digest('hex').slice(0, 16);
    const cacheDir = join(THU_MUC_BACKEND, '.du-lieu', 'pglite-cache');
    const cacheFile = join(cacheDir, `snapshot-${this.dauVanTay}.tar.gz`);
    if (existsSync(cacheFile)) {
      const buf = readFileSync(cacheFile);
      this.banSach = new Blob([buf]);
      this.pg = new PGlite({ loadDataDir: this.banSach, extensions: EXT });
      await this.pg.query('SELECT 1');
    } else {
      this.pg = new PGlite({ extensions: EXT });
      await this.pg.query(`SET timezone='Asia/Ho_Chi_Minh'`);
      await this.pg.exec('CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
      for (const f of files) {
        try {
          await this.pg.exec('BEGIN;\n' + f.sql + '\nCOMMIT;');
        } catch (e: any) {
          throw new Error(`Nạp ${f.ten} lỗi: ${e.message}`);
        }
        if (f.ten.startsWith('migrations/')) {
          await this.pg.query('INSERT INTO public.schema_migrations(name,sha256) VALUES($1,$2)', [f.ten, createHash('sha256').update(f.sql).digest('hex')]);
        }
      }
      this.banSach = (await this.pg.dumpDataDir('gzip')) as Blob;
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cacheFile, Buffer.from(await this.banSach.arrayBuffer()));
    }
    await this.pg.query(`SET timezone='Asia/Ho_Chi_Minh'`);
    const cu = (await this.pg.query<{ u: string }>('SELECT current_user u')).rows[0].u;
    if (!/^[a-z_][a-z0-9_]*$/.test(cu)) throw new Error('Tên owner lạ');
    this.chuSoHuu = cu;
    await this.chuanBiRuntime();
  }

  /** Đặt lại về dữ liệu nền sạch (chỉ môi trường thử). */
  async datLai(): Promise<void> {
    if (!this.laThu) throw new Error('Chỉ môi trường thử');
    if (this.pool) {
      if (!this.templateDb) throw new Error('Đặt lại trên Postgres thật cần AGV_TEST_PG_OWNER_URL + AGV_TEST_PG_TEMPLATE (chỉ thử)');
      await this.pool.end(); if (this.ownerPoolDb) { await this.ownerPoolDb.end(); this.ownerPoolDb = null; }
      await this.dungLaiTuMau();
      this.pool = new pg.Pool({ connectionString: this.databaseUrl!, max: this.poolMax, idleTimeoutMillis: 30_000, application_name: 'agiviet-backend' });
      return;
    }
    await this.khoa.chay(async () => {
      const cu = this.pg;
      this.pg = new PGlite({ loadDataDir: this.banSach!, extensions: EXT });
      await this.pg.query(`SET timezone='Asia/Ho_Chi_Minh'`);
      await cu.close().catch(() => {});
      await this.chuanBiRuntime();
    });
  }

  /** Giao dịch ghi: SERIALIZABLE, ngữ cảnh actor đặt bằng set_config(..., true). */
  async tx<T>(nc: NguCanh, fn: (t: GiaoDich) => Promise<T>): Promise<T> {
    if (this.pool) return this.txPg(nc, fn, true);
    return this.khoa.chay(async () => {
      const gio = this.layGio();
      try {
        return await this.pg.transaction(async (raw) => {
          await raw.exec('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
          const t = new GiaoDich(raw as unknown as PgTx, gio.getTime(), this.chuSoHuu);
          await raw.exec('SET SESSION AUTHORIZATION agv_backend_read');
          await t.datNguCanh(nc, this.laThu ? gio : null);
          if (this.laThu) await t.datDongHoThu(gio);
          return fn(t);
        });
      } catch (e: any) {
        // PGlite có thể để lại session authorization nếu lỗi giữa chừng: trả về owner.
        await this.pg.exec(`SET SESSION AUTHORIZATION ${this.chuSoHuu}; RESET ROLE`).catch(() => {});
        const m = anhXaLoiDb(e);
        if (m && !(e as any).ma) throw m;
        throw e;
      }
    });
  }

  /** Đọc: cùng khóa tuần tự để không chen vào giữa giao dịch khác. */
  async doc<T>(fn: (t: GiaoDich) => Promise<T>): Promise<T> {
    if (this.pool) return this.txPg({ actor: 'system' }, fn, false);
    return this.khoa.chay(async () => {
      const gio = this.layGio();
      return this.pg.transaction(async (raw) => {
        const t = new GiaoDich(raw as unknown as PgTx, gio.getTime(), this.chuSoHuu);
        await raw.exec('SET SESSION AUTHORIZATION agv_backend_read');
        await t.datNguCanh({ actor: 'system' }, this.laThu ? gio : null);
        return fn(t);
      });
    });
  }

  /** Chỉ lúc nạp/đặt lại môi trường: owner cấp các vai hạ tầng hẹp, không cấp DML nghiệp vụ. */
  private async chuanBiRuntime(){
    await this.pg.exec(`SET SESSION AUTHORIZATION ${this.chuSoHuu}`);
    await this.pg.exec(`
      CREATE ROLE agv_backend_read LOGIN NOSUPERUSER BYPASSRLS;
      CREATE ROLE agv_backend_meta LOGIN NOSUPERUSER BYPASSRLS;
      CREATE ROLE agv_backend_broker LOGIN NOSUPERUSER BYPASSRLS CREATEROLE;
      CREATE ROLE agv_backend_auth LOGIN NOSUPERUSER NOBYPASSRLS;
      CREATE ROLE agv_backend_bank LOGIN NOSUPERUSER NOBYPASSRLS;
      CREATE ROLE agv_backend_clock LOGIN NOSUPERUSER BYPASSRLS;
      GRANT agiviet_app,agiviet_orchestrator TO agv_backend_broker WITH ADMIN OPTION;
      GRANT agiviet_auth_worker TO agv_backend_auth;
      GRANT agiviet_bank_worker TO agv_backend_bank;
      GRANT USAGE ON SCHEMA core,pii,ref,ledger,mkt,evt,ops,cmd,app_auth TO agv_backend_read;
      GRANT SELECT ON ALL TABLES IN SCHEMA core,pii,ref,ledger,mkt,evt,ops,cmd,app_auth TO agv_backend_read;
      GRANT EXECUTE ON FUNCTION ref.clock_at(),core.signature_binding(uuid),core.payment_binding(uuid,bigint),core.invitation_binding(uuid),evt.otp_hash(text,uuid,jsonb) TO agv_backend_read;
      GRANT USAGE ON SCHEMA cmd TO agv_backend_broker,agv_backend_clock;
      GRANT SELECT,INSERT,UPDATE ON cmd.login_principals TO agv_backend_broker;
      GRANT SELECT,INSERT,UPDATE ON cmd.test_clock TO agv_backend_clock;
      GRANT USAGE ON SCHEMA evt,ref TO agv_backend_meta;
      GRANT SELECT,INSERT,UPDATE ON evt.idempotency_keys TO agv_backend_meta;
      GRANT INSERT,SELECT ON evt.domain_events,evt.outbox TO agv_backend_meta;
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA evt TO agv_backend_meta;
      GRANT EXECUTE ON FUNCTION ref.ctx_user(),ref.ctx_org(),ref.ctx(text) TO agv_backend_meta;
      GRANT EXECUTE ON FUNCTION evt.claim_idempotency(text,text,bytea),evt.emit(text,uuid,text,jsonb,text[]) TO agv_backend_meta;
    `);
  }

  /** Import fixture duy nhất, không dùng trong API. */
  async nhapDuLieuThu<T>(fn:(t:GiaoDich)=>Promise<T>):Promise<T>{
    if(!this.laThu)throw new Error('Chỉ import môi trường thử');
    if(this.pool){
      if(!this.ownerUrl)throw new Error('Import fixture trên Postgres thật cần AGV_TEST_PG_OWNER_URL (chỉ thử)');
      if(!this.ownerPoolDb){const u=new URL(this.ownerUrl);u.pathname=new URL(this.databaseUrl!).pathname;this.ownerPoolDb=new pg.Pool({connectionString:u.toString(),max:1});}
      const c=await this.ownerPoolDb.connect();
      try{
        await c.query('BEGIN');
        const t=new GiaoDich({query:(q,p)=>c.query(q,p) as any,exec:(q)=>c.query(q)},this.layGio().getTime(),'owner','pg');
        (t as any).loginCourant='owner';
        await t.datNguCanh({actor:'system'});const kq=await fn(t);await c.query('COMMIT');return kq;
      }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
    }
    return this.khoa.chay(async()=>{
      await this.pg.exec(`SET SESSION AUTHORIZATION ${this.chuSoHuu}`);
      try{return await this.pg.transaction(async raw=>{
        const t=new GiaoDich(raw as unknown as PgTx,this.layGio().getTime(),this.chuSoHuu);
        (t as any).loginCourant=this.chuSoHuu;
        await t.datNguCanh({actor:'system'});return fn(t);
      });}finally{await this.pg.exec('SET SESSION AUTHORIZATION agv_backend_read');}
    });
  }

  async dong() { if (this.pool) { await this.pool.end(); if (this.ownerPoolDb) await this.ownerPoolDb.end(); } else await this.pg.close(); }
}
