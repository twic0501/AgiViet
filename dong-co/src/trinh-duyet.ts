// Cửa vào động cơ cho bản HTML (app bán /ban/, app mua /mua/): đóng gói thành js/dong-co.js, lộ ra window.AVN.
// Mọi màn đọc dữ liệu và chạy lệnh qua đây; luật nằm ở nghiep-vu, máy chủ mô phỏng ở may-chu (dùng chung hai app qua localStorage).
import * as DM from '@agiviet/danh-muc';
import * as MC from '@agiviet/may-chu';
import * as NV from '@agiviet/nghiep-vu';
import type { Lenh, NguoiLam, SoGiaoDich } from '@agiviet/nghiep-vu';
import qrcode from 'qrcode-generator';
import { anhNho } from './anh-chup.ts';
import { DANH_MUC_MAN } from './danh-muc-man.ts';
import { DANH_MUC_MAN_MUA } from './danh-muc-man-mua.ts';
import * as DD from './dinh-dang.ts';
import * as TN from './tieng-noi.ts';
import * as TL from './tro-ly.ts';

export { DM as dm, MC as mc, NV as nv, DD as dd, TN as tn, TL as tl, anhNho, DANH_MUC_MAN, DANH_MUC_MAN_MUA };

/* ---------------- Kho, đồng hồ, dịch vụ ---------------- */

const KHOA = { so: 'agiviet.web.so.v2', dongHo: 'agiviet.web.dong-ho.v1', phien: (app: App) => `agiviet.web.phien.${app}` };
export type App = 'ban' | 'mua';

const kho = MC.taoKhoTrinhDuyet(localStorage, KHOA.so, f => addEventListener('storage', e => f(e.key)));
export const dongHo = MC.taoDongHo(localStorage, KHOA.dongHo);
export const dv = new MC.DichVu(kho, dongHo);

export const so = (): SoGiaoDich => dv.doc();
export const bayGio = () => dv.bayGio();
/** Gọi lại mỗi khi dữ liệu đổi (cả do tab khác, app khác). Trả hàm hủy. */
export const theoDoi = (f: () => void) => dv.theoDoi(f);

/** Chạy lệnh thay một người: { ok, ma } hoặc { ok: false, loi } với lời báo viết sẵn cho người dùng. */
export function lam(nguoi: NguoiLam, lenh: Lenh): { ok: true; ma: string } | { ok: false; loi: string } {
  const kq = dv.thucHien(nguoi, lenh);
  return kq.ok ? { ok: true, ma: kq.giaTri ?? '' } : { ok: false, loi: kq.loi };
}

/* ---------------- Phiên đăng nhập (mỗi app một phiên, nhớ trên máy) ---------------- */

const chuSo = (s: string) => s.replace(/\D/g, '');
export function nguoi(app: App): NguoiLam | null {
  try {
    const n = JSON.parse(localStorage.getItem(KHOA.phien(app)) ?? 'null') as NguoiLam | null;
    return n && so().nguoiDung.some(x => x.id === n.id && x.vai === app) ? n : null;
  } catch { return null; }
}
export const hoSo = (app: App) => { const n = nguoi(app); return n ? so().nguoiDung.find(x => x.id === n.id) : undefined; };
export function datPhien(app: App, n: NguoiLam | null) {
  if (n) localStorage.setItem(KHOA.phien(app), JSON.stringify(n)); else localStorage.removeItem(KHOA.phien(app));
}
/** Tìm tài khoản theo số điện thoại; có thì đăng nhập luôn. */
export function dangNhap(app: App, sdt: string): NguoiLam | null {
  const nd = so().nguoiDung.find(x => x.vai === app && chuSo(x.sdt) === chuSo(sdt));
  if (!nd) return null;
  const n: NguoiLam = { vai: app, id: nd.id, ten: nd.toChuc?.ten ?? nd.ten };
  datPhien(app, n);
  return n;
}
export const dangXuat = (app: App) => datPhien(app, null);
/** Mã tài khoản mới cho người đăng ký trên máy này. */
export const maMoi = (app: App) => `${app}-${Date.now().toString(36)}`;

/* ---------------- Khởi động: dữ liệu mẫu, nhịp hệ thống ---------------- */

let daChay = false;
/** Gọi một lần mỗi trang: lần đầu (kho trống) nạp kịch bản mẫu; chạy ngân hàng, đối tác, hạn cọc mỗi 3 giây. */
export function batDau() {
  if (daChay) return;
  daChay = true;
  if (!so().nguoiDung.length) dv.nap(MC.kichBanMau(dongHo.bayGio()));
  MC.chayMotNhip(dv);
  setInterval(() => MC.chayMotNhip(dv), 3000);
}

/* ---------------- Công cụ mô phỏng ---------------- */

export const NGUOI_BAN_MAU = MC.NGUOI_BAN_MAU;
export const NGUOI_MUA_MAU = MC.NGUOI_MUA_MAU;
export function napKichBan() { dv.nap(MC.kichBanMau(dongHo.bayGio())); datPhien('ban', MC.NGUOI_BAN_MAU); datPhien('mua', MC.NGUOI_MUA_MAU[0]!.nguoi); }
export function batDauTrong() {
  const b = new MC.BoDung(dongHo.bayGio());
  MC.damBaoNguoiMuaMau(b.dv);
  MC.dangKyNguoiBanMau(b);
  dv.nap(b.so);
  datPhien('ban', MC.NGUOI_BAN_MAU); datPhien('mua', MC.NGUOI_MUA_MAU[0]!.nguoi);
}
export function xoaHet() { dv.nap(NV.soTrong()); dongHo.datLai(); dangXuat('ban'); dangXuat('mua'); }
/** Tua đồng hồ rồi cho hệ thống làm ngay các việc tới hạn. Trả số việc đã làm. */
export function tua(ms: number) { dongHo.tua(ms); return MC.chayMotNhip(dv); }
export const TRE = MC.TRE;
export const viecGiaLap = (banId: string) => MC.viecGiaLap(so(), banId, bayGio());
export const lenhNhuCauMau = (i: number) => MC.lenhNhuCauMau(so(), bayGio(), i);
export const CA_KIEM_THU_BAN = MC.CA_KIEM_THU_BAN;
export const chayCa = (ma: string) => { const ca = MC.CA_KIEM_THU_BAN.find(c => c.ma === ma); return ca ? MC.chayCa(ca) : null; };
/** Nạp dữ liệu kết quả của một ca, đăng nhập người bán mẫu và bên mua mẫu (Đồng Xanh). */
export function xemCa(kq: MC.KetQuaCa) { if (kq.so) { dv.nap(kq.so); datPhien('ban', MC.NGUOI_BAN_MAU); datPhien('mua', MC.NGUOI_MUA_MAU[0]!.nguoi); } }
export const NGUOI_BAN_KHAC = MC.NGUOI_BAN_KHAC;
export const viecGiaLapBan = (muaId: string) => MC.viecGiaLapBan(so(), muaId, bayGio());
export const CA_KIEM_THU_MUA = MC.CA_KIEM_THU_MUA;
export const chayCaMua = (ma: string) => MC.chayCaMua(ma);

/* ---------------- Vẽ giao diện ---------------- */

/** Đoạn HTML đã an toàn (không thoát ký tự lần nữa). */
export class Tho { constructor(readonly s: string) {} toString() { return this.s; } }
const BANG_THOAT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const thoat = (v: unknown): string => (v == null || v === false ? '' : v instanceof Tho ? v.s : Array.isArray(v) ? v.map(thoat).join('') : String(v).replace(/[&<>"']/g, c => BANG_THOAT[c]!));
/** Mẫu HTML: giá trị chèn vào được thoát ký tự; mảng nối lại; Tho giữ nguyên. */
export const h = (chuoi: TemplateStringsArray, ...gt: unknown[]) => new Tho(chuoi.reduce((a, x, i) => a + x + (i < gt.length ? thoat(gt[i]) : ''), ''));
export const tho = (s: string) => new Tho(s);

const NGUON_ICON = import.meta.glob<string>('../icon/*.svg', { eager: true, query: '?raw', import: 'default' });
const BANG_ICON: Record<string, string> = Object.fromEntries(Object.entries(NGUON_ICON).map(([k, v]) => [
  k.split('/').pop()!.replace('.svg', ''),
  v.replace(/stroke="#[0-9a-fA-F]{3,6}"/g, 'stroke="currentColor"').replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"').replace(/<title>.*?<\/title>/, '').replace(/ role="img" aria-label="[^"]*"/, ''),
]));
/** Icon nét bộ v1, lấy màu chữ hiện tại. */
export const icon = (ten: string, co = 22) => new Tho(BANG_ICON[ten] ? `<span class="ic-v1" aria-hidden="true" style="width:${co}px;height:${co}px">${BANG_ICON[ten]}</span>` : '');

/** Ảnh lô hoặc mặt hàng (đường dẫn tương đối trong app): ảnh lô → ảnh mặt hàng → icon nhóm. */
export function anhMH(matHangId: string, anhLo?: string): string {
  if (anhLo) return anhLo.startsWith('data:') ? anhLo : `assets/dm/anh/${anhLo}.jpg`;
  const mh = DM.timMatHang(matHangId);
  if (mh?.anh) return `assets/dm/anh/${mh.anh}.jpg`;
  const n = DM.nhomCua(matHangId);
  return n ? `assets/dm/icon/${n.icon}.svg` : 'assets/mark.svg';
}
export const tenMH = (id: string) => DM.timMatHang(id)?.ten ?? id;

/** Mã QR (SVG co giãn) cho mã truy xuất nguồn gốc. */
export function maQr(noiDung: string) {
  const q = qrcode(0, 'M');
  q.addData(noiDung);
  q.make();
  return new Tho(q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }));
}
