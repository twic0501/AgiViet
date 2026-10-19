// Icon nét (bộ asset v1, lưới 24, nét 1,7): nhúng thẳng SVG, nét lấy màu chữ hiện tại để hợp mọi nền.
const NGUON = import.meta.glob<string>('../icon/*.svg', { eager: true, query: '?raw', import: 'default' });
const BANG: Record<string, string> = Object.fromEntries(Object.entries(NGUON).map(([k, v]) => [
  k.split('/').pop()!.replace('.svg', ''),
  v.replace(/stroke="#[0-9a-fA-F]{3,6}"/g, 'stroke="currentColor"').replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"').replace(/<title>.*?<\/title>/, '').replace(/ role="img" aria-label="[^"]*"/, ''),
]));

export type TenIcon = string;
export const coIcon = (ten: string) => ten in BANG;

/** Icon trang trí (aria-hidden): chữ đi kèm nói nghĩa. */
export function Icon({ ten, co = 22 }: { ten: TenIcon; co?: number }) {
  const svg = BANG[ten];
  if (!svg) return null;
  return <span className="tp-icon" aria-hidden="true" style={{ width: co, height: co }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
