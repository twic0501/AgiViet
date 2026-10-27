// Đăng nhập bằng số điện thoại + OTP (mô phỏng SMS), phiên, ngữ cảnh người dùng theo tổ chức.
// OTP đăng nhập không có bảng ở DB (evt.otp_challenges chỉ cho ký/tiền): giữ trong bộ nhớ, lưu HMAC không lưu mã rõ.
import { createHash, randomBytes, randomInt, createHmac, timingSafeEqual } from 'node:crypto';
// @ts-ignore thư viện JS dùng chung của nhóm bảo mật
import { SlidingWindowLimiter, OTP_SEND_RULES } from '../../../security/lib/rate-limit.mjs';
import type { CauHinh } from '../cau-hinh.ts';
import type { CoSoDuLieu, GiaoDich, VaiNguCanh } from '../db/co-so-du-lieu.ts';
import type { DongHo } from '../dong-ho.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { loi } from '../loi.ts';
import { soThatCuaDemo } from '../demo/so-demo.ts';

export interface ThanhVien {
  membershipId: string | null;
  orgId: string;
  orgCode: string;
  orgTen: string;
  orgKind: string;
  canSell: boolean;
  canBuy: boolean;
  vai: string[]; // role_code hiệu lực
  hanMucVnd: string | null;
  /** Người giúp: không có membership, chỉ có ủy quyền. */
  nguoiGiup: { principalUserId: string; actions: string[] } | null;
}

export interface NguoiDung {
  phienId: string;
  userId: string;
  ten: string;
  dienThoaiChe: string;
  laNhanVien: boolean;
  vaiVanHanh: string[]; // ops.staff_assignments.role_code
  thanhVien: ThanhVien; // tổ chức đang thao tác
  cacToChuc: { orgId: string; orgCode: string; orgTen: string }[];
  thietBi: string | null;
}

interface Phien { id: string; userId: string; orgId: string; hetHanMs: number; thietBi: string | null; ben?: boolean }
interface ThuThachDangNhap { id: string; phoneHash: string; mac: Buffer; hetHanMs: number; soLanSai: number; daDung: boolean }

export const sha256hex = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');

export class DichVuPhien {
  private phien = new Map<string, Phien>(); // khóa = sha256(token)
  private thuThach = new Map<string, ThuThachDangNhap>();
  private gioiHanSdt = new SlidingWindowLimiter(OTP_SEND_RULES.perPhone);
  /** Tin SMS mô phỏng gần nhất theo số (chỉ môi trường thử, để kiểm thử và màn dev). */
  hopThuSms = new Map<string, { noiDung: string; luc: string }[]>();

  constructor(private cfg: CauHinh, private db: CoSoDuLieu, private dongHo: DongHo) {}

  datLai() { this.phien.clear(); this.thuThach.clear(); this.hopThuSms.clear(); this.gioiHanSdt = new SlidingWindowLimiter(OTP_SEND_RULES.perPhone); }

  private macDangNhap(id: string, ma: string, phoneHash: string) {
    return createHmac('sha256', this.cfg.otpPepper).update(`login|${id}|${ma}|${phoneHash}`).digest();
  }

  /** Gửi OTP đăng nhập. Không tiết lộ số có tồn tại hay không. */
  async guiOtp(dienThoaiNhap: string): Promise<{ challenge_id: string; het_han_giay: number; ma_thu?: string }> {
    // Số demo 4 chữ số (0001–0010) chỉ ở môi trường thử: bí danh của người có sẵn, không giới hạn gửi, mã sống lâu để trình diễn nhiều lần.
    const soDemo = soThatCuaDemo(dienThoaiNhap, this.cfg.tinhNangThu);
    const dienThoai = soDemo ?? dienThoaiNhap;
    if (!/^0\d{9}$/.test(dienThoai)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Số điện thoại phải có 10 chữ số, bắt đầu bằng 0.');
    const now = this.dongHo.giay();
    if (!soDemo) {
      const rl = this.gioiHanSdt.hit(sha256hex(dienThoai), now);
      if (!rl.ok) throw loi('QUA_NHIEU_YEU_CAU', `Đợi ${rl.retryAfterSec} giây rồi gửi lại mã.`);
    }
    const id = randomBytes(16).toString('hex');
    const ma = this.cfg.otpThu ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    const phoneHash = sha256hex(dienThoai);
    this.thuThach.set(id, { id, phoneHash, mac: this.macDangNhap(id, ma, phoneHash), hetHanMs: Date.now() + (soDemo ? 24 * 3600 : CHINH_SACH.han.otpGiay) * 1000, soLanSai: 0, daDung: false });
    this.ghiSms(dienThoai, `AgiViet: ${ma} la ma dang nhap. Het han 5 phut. KHONG doc ma nay cho bat ky ai, ke ca nhan vien AgiViet.`);
    return { challenge_id: id, het_han_giay: CHINH_SACH.han.otpGiay, ...(this.cfg.otpThu ? { ma_thu: this.cfg.otpThu } : {}) };
  }

  ghiSms(dienThoai: string, noiDung: string) {
    if (!this.cfg.tinhNangThu) return; // production: gửi qua nhà mạng (chưa nối)
    const ds = this.hopThuSms.get(dienThoai) ?? [];
    ds.push({ noiDung, luc: this.dongHo.now().toISOString() });
    this.hopThuSms.set(dienThoai, ds.slice(-20));
  }

  /** Xác nhận OTP, tạo phiên. org_code để chọn tổ chức khi người dùng thuộc nhiều tổ chức. */
  /** Kiểm OTP đăng nhập (dùng chung cho đăng nhập, đăng ký, nhận lời mời). Tiêu thụ thử thách khi đúng. */
  /** Bằng chứng OTP đăng nhập vừa kiểm (để auth worker ghi vào evt.otp_challenges và lưu phiên bền). */
  private otpVuaKiem = new Map<string, { id: string; mac: Buffer }>();
  kiemOtpDangNhap(challengeId: string, ma: string, dienThoaiNhap: string): void {
    const dienThoai = soThatCuaDemo(dienThoaiNhap, this.cfg.tinhNangThu) ?? dienThoaiNhap;
    const c = this.thuThach.get(challengeId);
    const phoneHash = sha256hex(dienThoai ?? '');
    if (!c || c.daDung || Date.now() > c.hetHanMs || c.phoneHash !== phoneHash) throw loi('OTP_HET_HAN');
    if (c.soLanSai >= 5) throw loi('OTP_HET_HAN', 'Đã nhập sai quá 5 lần. Gửi lại mã mới.');
    const ok = /^\d{6}$/.test(ma) && timingSafeEqual(this.macDangNhap(c.id, ma, c.phoneHash), c.mac);
    if (!ok) { c.soLanSai += 1; throw loi('OTP_SAI', undefined, { con_lai: 5 - c.soLanSai }); }
    c.daDung = true;
    this.otpVuaKiem.set(challengeId, { id: c.id, mac: c.mac });
  }

  async xacNhanOtp(challengeId: string, ma: string, dienThoai: string, orgCode?: string, thietBi?: string): Promise<{ token: string; nguoi_dung: NguoiDung }> {
    this.kiemOtpDangNhap(challengeId, ma, dienThoai);
    dienThoai = soThatCuaDemo(dienThoai, this.cfg.tinhNangThu) ?? dienThoai;
    const user = await this.db.doc((t) => t.mot<{ user_id: string }>(
      `SELECT c.user_id FROM pii.user_contacts c JOIN core.users u ON u.id=c.user_id WHERE c.phone_hash=digest($1,'sha256') AND u.disabled_at IS NULL`, [dienThoai]));
    if (!user) throw loi('KHONG_TIM_THAY', 'Số này chưa có tài khoản. Đăng ký mới chưa làm ở backend thử.');
    const bang = this.otpVuaKiem.get(challengeId); this.otpVuaKiem.delete(challengeId);
    return this.taoPhien(user.user_id, orgCode, thietBi ?? null, bang);
  }

  /** Tạo phiên cho user (dùng sau OTP; và công cụ "đóng vai" ở môi trường thử). */
  async taoPhien(userId: string, orgCode?: string, thietBi: string | null = null, otp?: { id: string; mac: Buffer }): Promise<{ token: string; nguoi_dung: NguoiDung }> {
    const ds = await this.db.doc((t) => cacToChucCua(t, userId));
    if (ds.length === 0) throw loi('KHONG_CO_QUYEN', 'Tài khoản chưa thuộc tổ chức nào.');
    const chon = orgCode ? ds.find((x) => x.orgCode === orgCode) : ds[0];
    if (!chon) throw loi('KHONG_CO_QUYEN', 'Bạn không thuộc tổ chức này.');
    const token = randomBytes(32).toString('base64url');
    const p: Phien = { id: randomBytes(8).toString('hex'), userId, orgId: chon.orgId, hetHanMs: Date.now() + CHINH_SACH.han.phienGio * 3600_000, thietBi };
    this.phien.set(sha256hex(token), p);
    if (otp) await this.luuPhienBen(p, token, otp);
    const nd = await this.nguoiDungTuPhien(p);
    return { token, nguoi_dung: nd };
  }

  async doiToChuc(token: string, orgCode: string) {
    const p = this.phien.get(sha256hex(token));
    if (!p) throw loi('CHUA_DANG_NHAP');
    const ds = await this.db.doc((t) => cacToChucCua(t, p.userId));
    const chon = ds.find((x) => x.orgCode === orgCode);
    if (!chon) throw loi('KHONG_CO_QUYEN', 'Bạn không thuộc tổ chức này.');
    p.orgId = chon.orgId;
    return this.nguoiDungTuPhien(p);
  }

  async dangXuat(token: string) {
    this.phien.delete(sha256hex(token));
    const hash = createHash('sha256').update(token).digest();
    await this.db.tx({ actor: 'system', lenh: 'thu_hoi_phien' }, (t) => t.voiVai('agiviet_auth_worker', () => t.q(`SELECT cmd.revoke_session($1)`, [hash]))).catch(() => {});
  }

  /**
   * Lưu phiên bền (0034): auth worker ghi OTP đăng nhập đã kiểm với binding {org_id, device_id, token_sha256},
   * rồi cmd.record_login_session tiêu thụ OTP và lưu SHA-256 token. Tổ chức chờ xác minh/người giúp
   * (không có membership active) chưa có đường DB: giữ phiên trong bộ nhớ.
   */
  private async luuPhienBen(p: Phien, token: string, otp: { id: string; mac: Buffer }) {
    const hash = createHash('sha256').update(token).digest();
    const thietBi = p.thietBi ?? 'khong-ro';
    try {
      await this.db.tx({ actor: 'system', lenh: 'luu_phien' }, (t) => t.voiVai('agiviet_auth_worker', async () => {
        const binding = { org_id: p.orgId, device_id: thietBi, token_sha256: hash.toString('hex') };
        await t.q(`SELECT cmd.record_otp($1,$2,'login',$3::jsonb,$4)`, [otp.id, p.userId, JSON.stringify(binding), otp.mac]);
        await t.q(`SELECT cmd.otp_verification($1,true)`, [otp.id]);
        await t.q(`SELECT cmd.record_login_session($1,$2,$3,$4,$5,$6,'login')`, [p.userId, p.orgId, thietBi, hash, new Date(p.hetHanMs), otp.id]);
      }));
      p.ben = true;
    } catch { p.ben = false; }
  }

  /** Phiên không có trong bộ nhớ (khởi động lại, nhiều tiến trình): tra app_auth.sessions qua cmd.lookup_session. */
  private async timPhienBen(token: string): Promise<Phien | null> {
    const hash = createHash('sha256').update(token).digest();
    const r = await this.db.tx({ actor: 'system', lenh: 'tra_phien' }, (t) => t.voiVai('agiviet_auth_worker', () => t.mot<any>(`SELECT * FROM cmd.lookup_session($1)`, [hash]))).catch(() => null);
    if (!r) return null;
    const p: Phien = { id: r.id, userId: r.user_id, orgId: r.org_id, hetHanMs: Date.now() + 3600_000, thietBi: r.device_id, ben: true };
    this.phien.set(sha256hex(token), p);
    return p;
  }

  async xacThuc(token: string | undefined): Promise<NguoiDung> {
    if (!token) throw loi('CHUA_DANG_NHAP');
    const p = this.phien.get(sha256hex(token)) ?? await this.timPhienBen(token);
    if (!p || Date.now() > p.hetHanMs) throw loi('CHUA_DANG_NHAP');
    return this.nguoiDungTuPhien(p);
  }

  /** Mỗi yêu cầu đọc lại vai từ DB: thu hồi vai có hiệu lực ngay. */
  private async nguoiDungTuPhien(p: Phien): Promise<NguoiDung> {
    return this.db.doc(async (t) => {
      const u = await t.mot<any>(`SELECT u.id,u.display_name,u.is_staff,u.disabled_at,c.phone_masked FROM core.users u LEFT JOIN pii.user_contacts c ON c.user_id=u.id WHERE u.id=$1`, [p.userId]);
      if (!u || u.disabled_at) throw loi('CHUA_DANG_NHAP');
      const ds = await cacToChucCua(t, p.userId);
      const tv = ds.find((x) => x.orgId === p.orgId);
      if (!tv) throw loi('KHONG_CO_QUYEN', 'Bạn không còn thuộc tổ chức này.');
      const staff = await t.q<{ role_code: string }>(`SELECT role_code FROM ops.staff_assignments WHERE user_id=$1 AND active`, [p.userId]);
      return {
        phienId: p.id, userId: u.id, ten: u.display_name, dienThoaiChe: u.phone_masked ?? '', laNhanVien: !!u.is_staff,
        vaiVanHanh: staff.map((s) => s.role_code), thanhVien: tv,
        cacToChuc: ds.map((x) => ({ orgId: x.orgId, orgCode: x.orgCode, orgTen: x.orgTen })), thietBi: p.thietBi,
      };
    });
  }
}

export async function cacToChucCua(t: GiaoDich, userId: string): Promise<ThanhVien[]> {
  const ms = await t.q<any>(
    `SELECT m.id membership_id,o.id org_id,o.code,o.display_name,o.kind,o.can_sell,o.can_buy,m.approval_limit_vnd::text han_muc,
            coalesce((SELECT array_agg(r.role_code ORDER BY r.role_code) FROM core.membership_roles r WHERE r.membership_id=m.id),'{}') vai
     FROM core.memberships m JOIN core.organizations o ON o.id=m.org_id
     WHERE m.user_id=$1 AND m.status='active' AND o.status IN ('active','pending') ORDER BY o.code`, [userId]);
  const out: ThanhVien[] = ms.map((m) => ({
    membershipId: m.membership_id, orgId: m.org_id, orgCode: m.code, orgTen: m.display_name, orgKind: m.kind,
    canSell: m.can_sell, canBuy: m.can_buy, vai: m.vai ?? [], hanMucVnd: m.han_muc, nguoiGiup: null,
  }));
  const ug = await t.q<any>(
    `SELECT d.principal_user_id,d.actions,o.id org_id,o.code,o.display_name,o.kind,o.can_sell,o.can_buy
     FROM core.delegations d JOIN core.organizations o ON o.id=d.org_id
     WHERE d.helper_user_id=$1 AND d.revoked_at IS NULL AND d.valid_during @> ref.clock_at()`, [userId]);
  for (const d of ug) {
    if (out.some((x) => x.orgId === d.org_id)) continue;
    out.push({ membershipId: null, orgId: d.org_id, orgCode: d.code, orgTen: d.display_name, orgKind: d.kind, canSell: d.can_sell, canBuy: d.can_buy,
      vai: ['helper'], hanMucVnd: null, nguoiGiup: { principalUserId: d.principal_user_id, actions: d.actions } });
  }
  return out;
}

/** Vai DB (app.actor_kind) của người dùng khi thao tác ở một phía cụ thể. */
export function vaiDb(nd: NguoiDung, phia: 'buyer' | 'seller' | 'ops'): VaiNguCanh {
  if (phia === 'ops') return 'ops';
  if (nd.thanhVien.nguoiGiup) return 'helper';
  return phia;
}
