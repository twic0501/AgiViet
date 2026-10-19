// Dữ liệu riêng của app bán (không nằm ở máy chủ): phiên đăng nhập, bản nháp các màn nhiều bước.
import { taoPhien } from '@agiviet/giao-dien';
import { useCallback, useState } from 'react';

export const PHIEN = taoPhien('agiviet.app-ban.phien.v1');
export const useNguoi = PHIEN.useNguoi;

const khoaNhap = (k: string) => `agiviet.app-ban.nhap.${k}`;
export function docNhap<T>(khoa: string, macDinh: T): T {
  try { return { ...macDinh, ...(JSON.parse(sessionStorage.getItem(khoaNhap(khoa)) ?? '{}') as Partial<T>) }; } catch { return macDinh; }
}
export const xoaNhap = (khoa: string) => sessionStorage.removeItem(khoaNhap(khoa));

/** Bản nháp của màn nhiều bước (đăng ký, đăng lô, ký thỏa thuận…): giữ qua các màn, mất khi đóng tab. */
export function useNhap<T extends object>(khoa: string, macDinh: T): [T, (thayDoi: Partial<T>) => void, () => void] {
  const [gt, setGt] = useState<T>(() => docNhap(khoa, macDinh));
  const dat = useCallback((thayDoi: Partial<T>) => setGt(cu => { const moi = { ...cu, ...thayDoi }; sessionStorage.setItem(khoaNhap(khoa), JSON.stringify(moi)); return moi; }), [khoa]);
  const xoa = useCallback(() => { xoaNhap(khoa); setGt(macDinh); }, [khoa, macDinh]);
  return [gt, dat, xoa];
}
