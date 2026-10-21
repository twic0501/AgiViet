// Đồng hồ của máy chủ mô phỏng: giờ thật cộng một khoảng tua. Tua nhanh để xem quá hạn cọc, tin tự ẩn, hết cách ly.
// Khoảng tua lưu chung (cùng nơi lưu với kho) nên app bán và app mua cùng một giờ.
import type { NoiLuu } from './kho.ts';

export interface DongHo {
  bayGio(): number;
  /** Tua thêm (mili giây, dương). */
  tua(ms: number): void;
  /** Về giờ thật. */
  datLai(): void;
  /** Đang tua bao lâu so với giờ thật. */
  doLech(): number;
}

export function taoDongHo(noiLuu?: NoiLuu, khoa = 'agiviet.may-chu-gia.dong-ho.v1', goc: () => number = () => Date.now()): DongHo {
  let lech = 0;
  const doc = () => (noiLuu ? Number(noiLuu.getItem(khoa) ?? 0) || 0 : lech);
  const ghi = (v: number) => { if (noiLuu) noiLuu.setItem(khoa, String(v)); else lech = v; };
  return {
    bayGio: () => goc() + doc(),
    tua: ms => ghi(doc() + Math.max(0, ms)),
    datLai: () => ghi(0),
    doLech: doc,
  };
}

/** Đồng hồ cố định cho bài thử: chỉ đổi khi tua. */
export function dongHoCoDinh(batDau: number): DongHo & { dat(gio: number): void } {
  let gio = batDau;
  return { bayGio: () => gio, tua: ms => { gio += ms; }, datLai: () => { gio = batDau; }, doLech: () => gio - batDau, dat: g => { gio = g; } };
}
