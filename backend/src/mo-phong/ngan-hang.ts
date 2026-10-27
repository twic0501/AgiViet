// Ngân hàng đối tác MÔ PHỎNG (chỉ môi trường thử). Giữ sổ giao dịch riêng trong bộ nhớ, phát webhook có chữ ký
// HMAC (security/lib/webhook.mjs) vào hàng đợi; giao webhook theo lệnh kiểm thử (đủ, đảo thứ tự, lặp, trễ/giữ lại);
// cung cấp API tra lại giao dịch (requery) và sao kê để đối soát. Không có tiền thật.
import { randomBytes, createHash } from 'node:crypto';
// @ts-ignore thư viện JS dùng chung
import { signWebhook } from '../../../security/lib/webhook.mjs';

export interface GiaoDichNH {
  bank_txn_ref: string; kind: 'deposit_received' | 'instruction_processing' | 'instruction_succeeded' | 'instruction_failed';
  amount_vnd: string; payment_ref?: string | null; virtual_account_no?: string | null; instruction_code?: string | null;
  target_bank_code?: string; target_account_hash?: string; direction?: string;
  payer?: { bank_code: string; account_no: string; name: string } | null; occurred_at: string;
}
export interface SuKienCho { event_id: string; body: string; txn_ref: string; tao_luc: string }
export interface LenhNH { code: string; amount_vnd: string; target_bank_code: string; target_account_masked: string; target_account_hash: string; status: 'received' | 'succeeded' | 'failed'; nhan_luc: string }

export class NganHangMoPhong {
  giaoDich = new Map<string, GiaoDichNH>();
  lenh = new Map<string, LenhNH>();
  hangDoi: SuKienCho[] = [];
  daGiao: { event_id: string; ket_qua: unknown }[] = [];
  /** Cấu hình lỗi giả lập cho lần xử lý lệnh tiếp theo. */
  ketQuaLenhKeTiep: 'succeeded' | 'failed' = 'succeeded';
  /** Requery tạm không trả lời được (mô phỏng ngân hàng chậm). */
  requeryLoi = false;
  private dem = 0;

  constructor(private biMat: Buffer, private kid: string, private gio: () => Date, private giaoWebhook: (body: string, headers: Record<string, string>) => Promise<unknown>) {}

  datLai() { this.giaoDich.clear(); this.lenh.clear(); this.hangDoi = []; this.daGiao = []; this.ketQuaLenhKeTiep = 'succeeded'; this.requeryLoi = false; this.dem = 0; }

  private maGd(tienTo: string) { this.dem += 1; return `${tienTo}${String(this.dem).padStart(6, '0')}${randomBytes(2).toString('hex').toUpperCase()}`; }

  private xepHang(gd: GiaoDichNH) {
    const event_id = `nh-ev-${gd.bank_txn_ref}`;
    const body = JSON.stringify({ provider: 'bank_sim', event_id, ...gd });
    this.hangDoi.push({ event_id, body, txn_ref: gd.bank_txn_ref, tao_luc: this.gio().toISOString() });
    return event_id;
  }

  /** Bên mua chuyển khoản vào tài khoản ảo của đơn (VietQR). */
  chuyenKhoan(d: { virtual_account_no?: string; payment_ref: string; amount_vnd: string | number; payer?: { bank_code: string; account_no: string; name: string } }) {
    const gd: GiaoDichNH = {
      bank_txn_ref: this.maGd('FT'), kind: 'deposit_received', amount_vnd: String(d.amount_vnd), payment_ref: d.payment_ref,
      virtual_account_no: d.virtual_account_no ?? null, payer: d.payer ?? { bank_code: 'TEST', account_no: '9704000000000001', name: 'BEN MUA THU' }, occurred_at: new Date().toISOString(),
    };
    this.giaoDich.set(gd.bank_txn_ref, gd);
    return { bank_txn_ref: gd.bank_txn_ref, event_id: this.xepHang(gd) };
  }

  /** Backend gửi lệnh chi/hoàn (khóa chống lặp = mã lệnh). */
  nhanLenh(l: { code: string; amount_vnd: string; target_bank_code: string; target_account_masked: string; target_account_hash: string }) {
    const cu = this.lenh.get(l.code);
    if (cu) return { trung: true, lenh: cu };
    const ln: LenhNH = { ...l, status: 'received', nhan_luc: this.gio().toISOString() };
    this.lenh.set(l.code, ln);
    return { trung: false, lenh: ln };
  }

  /** Xử lý các lệnh đang nhận: phát webhook thành công/thất bại vào hàng đợi. */
  xuLyLenh(ketQua?: 'succeeded' | 'failed', ma?: string) {
    const out: string[] = [];
    for (const l of this.lenh.values()) {
      if (l.status !== 'received' || (ma && l.code !== ma)) continue;
      const kq = ketQua ?? this.ketQuaLenhKeTiep;
      l.status = kq;
      const gd: GiaoDichNH = { bank_txn_ref: this.maGd('PO'), kind: kq === 'succeeded' ? 'instruction_succeeded' : 'instruction_failed', amount_vnd: l.amount_vnd, instruction_code: l.code, target_bank_code:l.target_bank_code,target_account_hash:l.target_account_hash,direction:'debit',occurred_at: new Date().toISOString() };
      this.giaoDich.set(gd.bank_txn_ref, gd);
      out.push(this.xepHang(gd));
    }
    return out;
  }

  /** API tra lại (requery) theo mã giao dịch: nguồn sự thật tiền là đây, không phải thân webhook. */
  traLai(bankTxnRef: string): (GiaoDichNH & { payer_account_hash?: string; payer_account_masked?: string }) | null {
    if (this.requeryLoi) throw new Error('Ngân hàng mô phỏng tạm không trả lời requery');
    const gd = this.giaoDich.get(bankTxnRef);
    if (!gd) return null;
    if (!gd.payer) return { ...gd };
    return { ...gd, payer_account_hash: createHash('sha256').update(gd.payer.account_no).digest('hex'), payer_account_masked: '****' + gd.payer.account_no.slice(-4) };
  }

  saoKe() { return [...this.giaoDich.values()].filter((g) => g.kind === 'instruction_succeeded'); }

  /** Giao webhook đang chờ. che_do: all | reverse | duplicate | first; giu_lai: số sự kiện cuối giữ lại (trễ). */
  async giao(o: { che_do?: 'all' | 'reverse' | 'duplicate' | 'first'; giu_lai?: number; sai_chu_ky?: boolean } = {}) {
    let ds = [...this.hangDoi];
    const giu = o.giu_lai ? ds.slice(ds.length - o.giu_lai) : [];
    ds = o.giu_lai ? ds.slice(0, ds.length - o.giu_lai) : ds;
    if (o.che_do === 'first') ds = ds.slice(0, 1);
    if (o.che_do === 'reverse') ds.reverse();
    if (o.che_do === 'duplicate') ds = ds.flatMap((x) => [x, x]);
    const conLai = this.hangDoi.filter((x) => !ds.includes(x));
    this.hangDoi = o.che_do === 'first' ? conLai : giu;
    const kq: { event_id: string; ket_qua: unknown }[] = [];
    for (const ev of ds) {
      const headers = signWebhook({ secret: o.sai_chu_ky ? Buffer.from('khoa-sai') : this.biMat, kid: this.kid, rawBody: ev.body, timestamp: Math.floor(Date.now() / 1000), nonce: undefined });
      const r = await this.giaoWebhook(ev.body, headers);
      kq.push({ event_id: ev.event_id, ket_qua: r });
    }
    this.daGiao.push(...kq);
    return kq;
  }

  trangThai() {
    return { giao_dich: [...this.giaoDich.values()], lenh: [...this.lenh.values()], hang_doi: this.hangDoi.map((x) => ({ event_id: x.event_id, txn_ref: x.txn_ref })), ket_qua_lenh_ke_tiep: this.ketQuaLenhKeTiep };
  }
}
