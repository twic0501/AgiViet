// Khung kiểm thử API: gọi app qua fastify.inject (không cần cổng mạng), đăng nhập bằng OTP thử 123456, mỗi tình huống chạy trên dữ liệu nền vừa đặt lại.
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { HeThong } from '../src/he-thong.ts';

export const SDT = {
  ha: '0909000210', lan: '0909000211', phuc: '0909000212', thinh: '0909000213',
  nam: '0918000421', teo: '0918000422', sau: '0939000160', hai: '0939000120', utLan: '0939000140',
  bay: '0988000770', tuHung: '0938000610', quan: '0903000410',
  tri: '0901000005', thao: '0901000004', vy: '0901000001', tam: '0901000008',
};

export class LoiKiem extends Error {}

export interface KetQuaBuoc { ten: string; dat: boolean; chi_tiet?: string }

export class Phien {
  constructor(private app: FastifyInstance, public token: string, public userId: string, public ten: string) {}
  async post(url: string, body: any = {}, opts: { khongKhoa?: boolean; key?: string } = {}) {
    const payload = opts.khongKhoa ? body : { idempotency_key: opts.key ?? 'k-' + randomBytes(8).toString('hex'), ...body };
    const r = await this.app.inject({ method: 'POST', url, payload, headers: { authorization: `Bearer ${this.token}`, 'x-device-id': 'may-' + this.ten } });
    return { status: r.statusCode, json: r.json() as any };
  }
  async get(url: string) {
    const r = await this.app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${this.token}` } });
    return { status: r.statusCode, json: r.headers['content-type']?.toString().includes('json') ? (r.json() as any) : null, raw: r.rawPayload, headers: r.headers };
  }
  /** Lệnh phải thành công; trả data. */
  async ok(url: string, body: any = {}, opts: { khongKhoa?: boolean; key?: string } = {}) {
    const r = await this.post(url, body, opts);
    if (r.status >= 300) throw new LoiKiem(`${url} -> ${r.status} ${JSON.stringify(r.json).slice(0, 400)}`);
    return r.json;
  }
  async otpKy(documentId: string) {
    const c = await this.ok('/v1/otp/challenges', { purpose: 'contract_sign', document_id: documentId }, { khongKhoa: true });
    return c.challenge_id as string;
  }
  async otpTien(paymentId: string, amount: string | number) {
    const c = await this.ok('/v1/otp/challenges', { purpose: 'money_received', payment_id: paymentId, amount_vnd: String(amount) }, { khongKhoa: true });
    return c.challenge_id as string;
  }
}

export class May {
  constructor(public app: FastifyInstance, public ht: HeThong) {}
  async dangNhap(sdt: string, orgCode?: string): Promise<Phien> {
    const s = await this.app.inject({ method: 'POST', url: '/v1/auth/otp/send', payload: { phone: sdt } });
    if (s.statusCode !== 200) throw new LoiKiem('otp send ' + s.body);
    const v = await this.app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { challenge_id: s.json().challenge_id, phone: sdt, code: '123456', org_code: orgCode } });
    if (v.statusCode !== 200) throw new LoiKiem('otp verify ' + v.body);
    const j = v.json();
    return new Phien(this.app, j.token, j.user.user_id, j.user.name);
  }
  async datLai() { await this.ht.datLai(); }
  async he(url: string, body: any = {}) {
    const r = await this.app.inject({ method: 'POST', url, payload: body });
    if (r.statusCode >= 300) throw new LoiKiem(`${url} -> ${r.statusCode} ${r.body.slice(0, 300)}`);
    return r.json() as any;
  }
  async q<T = any>(sql: string, p: any[] = []) { return this.ht.db.doc((t) => t.q<T>(sql, p)); }
  async v<T = any>(sql: string, p: any[] = []) { return this.ht.db.doc((t) => t.gtri<T>(sql, p)); }
}

export class TinhHuong {
  buoc: KetQuaBuoc[] = [];
  constructor(public ma: string, public ten: string) {}
  kiem(ten: string, dieuKien: boolean, chiTiet?: unknown) {
    this.buoc.push({ ten, dat: !!dieuKien, chi_tiet: dieuKien ? undefined : JSON.stringify(chiTiet)?.slice(0, 400) });
  }
  bang(ten: string, thuc: unknown, mong: unknown) { this.kiem(`${ten} = ${String(mong)}`, String(thuc) === String(mong), { thuc, mong }); }
}
