// Cấu hình chạy. Mọi tính năng chỉ dành cho môi trường thử (đồng hồ tua, cổng mô phỏng, OTP 123456,
// nạp lại dữ liệu, đóng vai bên kia) bật theo MOI_TRUONG và bị kiểm khi khởi động (N-07).
import { randomBytes, generateKeyPairSync, createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export type MoiTruong = 'thu' | 'production';

const here = dirname(fileURLToPath(import.meta.url));
export const THU_MUC_BACKEND = join(here, '..');
export const THU_MUC_GOC = join(THU_MUC_BACKEND, '..');

function env(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

export interface CauHinh {
  moiTruong: MoiTruong;
  cong: number;
  host: string;
  /** Bật các tính năng thử. Production luôn false; khởi động sẽ từ chối nếu cấu hình mâu thuẫn. */
  tinhNangThu: boolean;
  otpThu: string | null;
  pinThu: string | null;
  phienBiMat: Buffer;
  otpPepper: Buffer;
  webhookKeys: Record<string, Buffer[]>;
  webhookKidMacDinh: string;
  qrKid: string;
  qrPrivate: KeyObject;
  qrPublic: KeyObject;
  pdfKid: string;
  pdfPrivate: KeyObject;
  pdfPublic: KeyObject;
  maDuPhongBiMat: Buffer;
  thuMucTaiLieu: string;
  thuMucDb: string | null;
  aiUrl: string | null;
  aiKey: string | null;
  aiTimeoutMs: number;
  logLevel: string;
  /** PostgreSQL thật (pool). Không đặt → PGlite trong tiến trình (dev/test). */
  databaseUrl: string | null;
  pgPoolMax: number;
}

function khoaEd25519(pemEnv: string | undefined): { priv: KeyObject; pub: KeyObject } {
  if (pemEnv) {
    const priv = createPrivateKey(pemEnv);
    return { priv, pub: createPublicKey(priv) };
  }
  const k = generateKeyPairSync('ed25519');
  return { priv: k.privateKey, pub: k.publicKey };
}

export function docCauHinh(): CauHinh {
  const moiTruong = (env('AGV_MOI_TRUONG', 'thu') as MoiTruong);
  if (moiTruong !== 'thu' && moiTruong !== 'production') throw new Error('AGV_MOI_TRUONG chỉ nhận thu|production');
  const tinhNangThu = moiTruong === 'thu';
  const can = (name: string) => {
    const v = env(name);
    if (!v && moiTruong === 'production') throw new Error(`Thiếu biến môi trường bắt buộc ở production: ${name}`);
    return v;
  };
  const bimat = (name: string) => {
    const v = can(name);
    return v ? Buffer.from(v, 'utf8') : randomBytes(32);
  };
  const qr = khoaEd25519(can('AGV_QR_PRIVATE_PEM'));
  const pdf = khoaEd25519(can('AGV_PDF_PRIVATE_PEM'));
  const webhookSecret = env('AGV_WEBHOOK_SECRET') ?? (moiTruong === 'thu' ? 'bi-mat-webhook-ngan-hang-mo-phong-chi-dung-thu' : undefined);
  if (!webhookSecret) throw new Error('Thiếu AGV_WEBHOOK_SECRET');
  const cfg: CauHinh = {
    moiTruong,
    cong: Number(env('PORT', '8080')),
    host: env('HOST', '127.0.0.1')!,
    tinhNangThu,
    otpThu: tinhNangThu ? '123456' : null,
    pinThu: tinhNangThu ? '2468' : null,
    phienBiMat: bimat('AGV_SESSION_SECRET'),
    otpPepper: bimat('AGV_OTP_PEPPER'),
    webhookKeys: { 'nh-mo-phong-1': [Buffer.from(webhookSecret, 'utf8')], 'kd-mo-phong-1': [Buffer.from(webhookSecret + ':kd', 'utf8')] },
    webhookKidMacDinh: 'nh-mo-phong-1',
    qrKid: env('AGV_QR_KID', 'qr-thu-1')!,
    qrPrivate: qr.priv,
    qrPublic: qr.pub,
    pdfKid: env('AGV_PDF_KID', 'pdf-thu-1')!,
    pdfPrivate: pdf.priv,
    pdfPublic: pdf.pub,
    maDuPhongBiMat: bimat('AGV_FALLBACK_SECRET'),
    thuMucTaiLieu: env('AGV_DOC_DIR', join(THU_MUC_BACKEND, '.du-lieu', 'tai-lieu'))!,
    thuMucDb: env('AGV_PGLITE_DIR') ?? null,
    aiUrl: env('AI_URL') ?? null,
    aiKey: env('AGV_AI_API_KEY') ?? null,
    aiTimeoutMs: Number(env('AI_TIMEOUT_MS', '2000')),
    logLevel: env('LOG_LEVEL', moiTruong === 'thu' ? 'info' : 'warn')!,
    databaseUrl: env('DATABASE_URL') ?? null,
    pgPoolMax: Number(env('AGV_PG_POOL_MAX', '10')),
  };
  kiemKhoiDong(cfg);
  return cfg;
}

/** N-07: production không được mang tính năng thử. Gọi lại khi dựng app để chặn cấu hình sai. */
export function kiemKhoiDong(cfg: CauHinh): void {
  if (cfg.moiTruong === 'production') {
    if (cfg.tinhNangThu || cfg.otpThu || cfg.pinThu) throw new Error('Production không được bật tính năng thử (N-07)');
    if (!cfg.databaseUrl) throw new Error('Production cần DATABASE_URL (PostgreSQL 17 thật, đăng nhập bằng agv_backend_gateway), không dùng PGlite');
    if (/\/\/(postgres|agiviet_owner)[:@]/.test(cfg.databaseUrl)) throw new Error('DATABASE_URL không được dùng owner/superuser');
  }
}
