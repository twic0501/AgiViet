// OTP cho hành động (ký hợp đồng/phụ lục, xác nhận đã nhận tiền). Binding do DB dựng lại
// (core.signature_binding / core.payment_binding); auth worker (vai agiviet_auth_worker) ghi thử thách và kết quả xác minh;
// DB tiêu thụ OTP nguyên tử trong giao dịch ký/xác nhận. Không lưu mã rõ: chỉ HMAC(pepper, id|mã|băm binding).
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
// @ts-ignore thư viện JS dùng chung
import { otpMessage } from '../../../security/lib/otp.mjs';
import type { CauHinh } from '../cau-hinh.ts';
import type { CoSoDuLieu } from '../db/co-so-du-lieu.ts';
import type { DichVuPhien, NguoiDung } from './phien.ts';
import { loi } from '../loi.ts';

export type MucDichOtp = 'contract_sign' | 'amendment_sign' | 'money_received';

export class DichVuOtpHanhDong {
  constructor(private cfg: CauHinh, private db: CoSoDuLieu, private phien: DichVuPhien) {}

  private mac(id: string, ma: string, bindingHashHex: string) {
    return createHmac('sha256', this.cfg.otpPepper).update(`${id}|${ma}|${bindingHashHex}`).digest();
  }

  /** Tạo thử thách cho người đang đăng nhập. Người giúp không bao giờ nhận được OTP ký/tiền. */
  async taoThuThach(nd: NguoiDung, d: { purpose: MucDichOtp; document_id?: string; payment_id?: string; amount_vnd?: unknown }) {
    if (nd.thanhVien.nguoiGiup) throw loi('KHONG_CO_QUYEN', 'Người giúp không được ký hoặc xác nhận tiền.');
    const id = randomBytes(16).toString('hex');
    const ma = this.cfg.otpThu ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    const kq = await this.db.tx({ actor: 'system', userId: nd.userId, orgId: nd.thanhVien.orgId, lenh: 'otp_tao' }, async (t) => {
      let binding: any;
      if (d.purpose === 'money_received') {
        if (!d.payment_id || d.amount_vnd == null || !/^\d+$/.test(String(d.amount_vnd))) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần payment_id và amount_vnd.');
        const p = await t.mot<any>(`SELECT payee_org_id FROM core.direct_payments WHERE id=$1`, [d.payment_id]);
        if (!p || p.payee_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
        binding = await t.gtri(`SELECT core.payment_binding($1,$2)`, [d.payment_id, String(d.amount_vnd)]);
      } else {
        if (!d.document_id) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần document_id.');
        const doc = await t.mot<any>(`SELECT d.doc_type, o.buyer_org_id, o.seller_org_id FROM core.documents d LEFT JOIN core.orders o ON o.id=d.order_id WHERE d.id=$1`, [d.document_id]);
        if (!doc || (doc.buyer_org_id !== nd.thanhVien.orgId && doc.seller_org_id !== nd.thanhVien.orgId)) throw loi('KHONG_TIM_THAY');
        const can = doc.doc_type === 'annex' ? 'amendment_sign' : 'contract_sign';
        if (can !== d.purpose) throw loi('DU_LIEU_KHONG_HOP_LE', `Tài liệu này cần mục đích ${can}.`);
        binding = await t.gtri(`SELECT core.signature_binding($1)`, [d.document_id]);
      }
      const bh = await t.gtri<string>(`SELECT encode(evt.otp_hash($1,$2,$3::jsonb),'hex')`, [d.purpose, nd.userId, JSON.stringify(binding)]);
      await t.voiVai('agiviet_auth_worker', () => t.q(`SELECT cmd.record_otp($1,$2,$3,$4::jsonb,$5)`, [id, nd.userId, d.purpose, JSON.stringify(binding), this.mac(id, ma, bh)]));
      return binding;
    });
    const phone = await this.db.doc((t) => t.gtri<string>(`SELECT convert_from(phone_enc,'UTF8') FROM pii.user_contacts WHERE user_id=$1`, [nd.userId]));
    const so = String(phone ?? '').replace('TEST-PLAINTEXT:', '');
    let tin = '';
    try { tin = otpMessage(d.purpose, ma, { ...kq, amount_vnd: Number(kq.amount_vnd) }); } catch { tin = `AgiViet: ${ma} la ma xac nhan. Het han 5 phut. KHONG doc ma nay cho bat ky ai.`; }
    this.phien.ghiSms(so, tin);
    return { challenge_id: id, purpose: d.purpose, het_han_giay: 300, binding: kq, ...(this.cfg.otpThu ? { ma_thu: this.cfg.otpThu } : {}) };
  }

  /** Xác minh mã: ghi kết quả bằng vai auth worker (giao dịch riêng để số lần sai được lưu). */
  async xacMinh(nd: NguoiDung, challengeId: string, ma: string): Promise<void> {
    const kq = await this.db.tx({ actor: 'system', userId: nd.userId, lenh: 'otp_xac_minh' }, async (t) => {
      const c = await t.mot<any>(`SELECT user_id, encode(binding_sha256,'hex') bh, code_mac, expires_at, attempts, verified_at, used_at FROM evt.otp_challenges WHERE id=$1 FOR UPDATE`, [challengeId]);
      if (!c || c.user_id !== nd.userId) return 'het_han';
      if (c.used_at || c.verified_at || new Date(c.expires_at).getTime() < Date.now() || c.attempts >= 5) return 'het_han';
      const dung = /^\d{6}$/.test(ma) && timingSafeEqual(this.mac(challengeId, ma, c.bh), Buffer.from(c.code_mac));
      const ok = await t.voiVai('agiviet_auth_worker', () => t.gtri<boolean>(`SELECT cmd.otp_verification($1,$2)`, [challengeId, dung]));
      return ok ? 'ok' : 'sai';
    });
    if (kq === 'het_han') throw loi('OTP_HET_HAN');
    if (kq === 'sai') throw loi('OTP_SAI');
  }
}
