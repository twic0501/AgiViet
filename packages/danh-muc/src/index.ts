// Danh mục mặt hàng dùng chung hai app: nhóm, mặt hàng (nên bán / có điều kiện), mẫu chia loại.
// Ảnh (anh/*.jpg) và icon nhóm (icon/*.svg) là tệp tĩnh: mỗi app tự nạp bằng công cụ build của mình.
import { MAT_HANG, NHOM_HANG } from './mat-hang.ts';
import { MAU_CHIA_LOAI } from './mau-chia-loai.ts';
import type { MauChiaLoai } from './kieu.ts';

export * from './kieu.ts';
export { MAT_HANG, NHOM_HANG, MAU_CHIA_LOAI };

export const timMatHang = (id: string) => MAT_HANG.find(m => m.id === id);
export const nhomCua = (matHangId: string) => NHOM_HANG.find(n => n.id === timMatHang(matHangId)?.nhom);
export const mauCua = (matHangId: string): MauChiaLoai | undefined => { const n = nhomCua(matHangId); return n ? MAU_CHIA_LOAI[n.mauChiaLoai] : undefined; };
const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
/** Tìm mặt hàng theo chữ gõ (không dấu cũng được). */
export const timTheoChu = (chu: string, toiDa = 30) => { const c = boDau(chu.trim()); return c ? MAT_HANG.filter(m => boDau(m.ten).includes(c)).slice(0, toiDa) : []; };
