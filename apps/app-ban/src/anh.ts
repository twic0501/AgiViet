// Ảnh mặt hàng và icon nhóm từ gói danh mục; Vite nạp và băm tên khi build (nhúng thẳng ở bản một tệp).
import { nhomCua, timMatHang } from '@agiviet/danh-muc';

const ANH = import.meta.glob<string>('../../../packages/danh-muc/anh/*.jpg', { eager: true, query: '?url', import: 'default' });
const ICON = import.meta.glob<string>('../../../packages/danh-muc/icon/*.svg', { eager: true, query: '?url', import: 'default' });
const ten = (duong: string) => duong.split('/').pop()!.replace(/\.\w+$/, '');
const BANG_ANH = Object.fromEntries(Object.entries(ANH).map(([k, v]) => [ten(k), v]));
const BANG_ICON = Object.fromEntries(Object.entries(ICON).map(([k, v]) => [ten(k), v]));

/** Ảnh của một lô hoặc mặt hàng: ảnh lô (tên ảnh mẫu hoặc ảnh người dùng chụp) → ảnh mặt hàng → icon nhóm. */
export function anhMatHang(matHangId: string, anhLo?: string): string | undefined {
  if (anhLo) return anhLo.startsWith('data:') || anhLo.startsWith('blob:') ? anhLo : BANG_ANH[anhLo] ?? anhMatHang(matHangId);
  const mh = timMatHang(matHangId);
  return (mh?.anh && BANG_ANH[mh.anh]) || iconNhom(matHangId);
}
export const iconNhom = (matHangId: string) => { const n = nhomCua(matHangId); return n ? BANG_ICON[n.icon] : undefined; };
export const iconCuaNhom = (icon: string) => BANG_ICON[icon];
