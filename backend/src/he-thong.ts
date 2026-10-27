// Bộ chứa các dịch vụ dùng chung của một tiến trình backend.
// @ts-ignore thư viện JS dùng chung
import { MemoryNonceStore } from '../../security/lib/nonce-store.mjs';
import type { CauHinh } from './cau-hinh.ts';
import { CoSoDuLieu } from './db/co-so-du-lieu.ts';
import { DongHo, T0_THU } from './dong-ho.ts';
import { DichVuPhien } from './auth/phien.ts';
import { DichVuOtpHanhDong } from './auth/otp-hanh-dong.ts';
import { NganHangMoPhong } from './mo-phong/ngan-hang.ts';
import { datThuMucTaiLieu } from './nghiep-vu/tai-lieu.ts';
import { caiDatTaiLieuPdf } from './pdf/tai-lieu-pdf.ts';

export class HeThong {
  dongHo: DongHo;
  db: CoSoDuLieu;
  phien: DichVuPhien;
  otp: DichVuOtpHanhDong;
  nganHang: NganHangMoPhong;
  nonce: any;
  /** Token QR nhận hàng thô đang hiệu lực theo đợt (chỉ hiển thị cho người nhận được chỉ định). */
  qrNhanHang = new Map<string, { raw: string; het: number }>();
  /** Đếm nhập sai mã 6 số theo đợt (khóa 15 phút sau 3 lần). */
  saiMa6 = new Map<string, { n: number; khoaDen: number }>();
  /** Hàm gửi webhook nội bộ (gán khi dựng app). */
  /** Gọi mạng ra ngoài (thời tiết, RSS). Kiểm thử thay bằng fixture. */
  layMang: (url: string, init?: RequestInit) => Promise<Response> = (u, i) => fetch(u, i);
  guiWebhook: (body: string, headers: Record<string, string>) => Promise<unknown> = async () => ({ loi: 'chua_noi' });

  constructor(public cfg: CauHinh) {
    this.dongHo = new DongHo(cfg.tinhNangThu);
    if (cfg.tinhNangThu) this.dongHo.datMoc(T0_THU);
    this.db = new CoSoDuLieu(() => this.dongHo.now(), cfg.tinhNangThu, cfg.databaseUrl, cfg.pgPoolMax);
    this.phien = new DichVuPhien(cfg, this.db, this.dongHo);
    this.otp = new DichVuOtpHanhDong(cfg, this.db, this.phien);
    this.nonce = new MemoryNonceStore();
    this.nganHang = new NganHangMoPhong(cfg.webhookKeys[cfg.webhookKidMacDinh][0], cfg.webhookKidMacDinh, () => this.dongHo.now(), (b, h) => this.guiWebhook(b, h));
    datThuMucTaiLieu(cfg.thuMucTaiLieu);
    caiDatTaiLieuPdf(cfg);
  }

  async khoiTao() { await this.db.khoiTao(); }

  /** Đặt lại dữ liệu nền sạch (chỉ môi trường thử). */
  async datLai() {
    if (!this.cfg.tinhNangThu) throw new Error('Chỉ môi trường thử');
    await this.db.datLai();
    this.phien.datLai();
    this.nganHang.datLai();
    this.qrNhanHang.clear();
    this.saiMa6.clear();
    this.nonce = new MemoryNonceStore();
    this.dongHo.datMoc(T0_THU);
  }
}
