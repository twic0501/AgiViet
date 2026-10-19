import type { Lo } from './kieu.ts';

/** Lượng còn bán được = lượng lô − lượng đã hứa cho các đơn người bán đã xác nhận. */
export const conBan = (lo: Pick<Lo, 'kg' | 'hua'>): number => Math.max(0, lo.kg - lo.hua);

/** Trả lại lượng đã hứa khi đơn bị hủy hoặc quá hạn. */
export function traLuong(lo: Lo | undefined, kg: number): void {
  if (lo) lo.hua = Math.max(0, lo.hua - kg);
}
