// Mảnh dùng chung trong app bán: người đang dùng, khung màn, thẻ lô, thẻ đơn, nút nghe đọc.
import { timMatHang } from '@agiviet/danh-muc';
import { Chip, Icon, luong, NhanNhom, so as dinhSo, ThanhChang, TheLink, useBayGio, useLenh, useSo } from '@agiviet/giao-dien';
import { moTaDon, type ThongBao } from '@agiviet/may-chu';
import { NHAN_TRANG_THAI, nhom, type Don, type Lo, type TinhTrangLo } from '@agiviet/nghiep-vu';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { anhMatHang } from './anh.ts';
import { useNguoi } from './phien.ts';
import { coTheDoc, docTo } from './tieng-noi.ts';

/** Người bán đang dùng app, hồ sơ, sổ, giờ, hàm chạy lệnh. */
export function useToi() {
  const nguoi = useNguoi();
  const so = useSo();
  const bayGio = useBayGio();
  const lam = useLenh(nguoi);
  const hoSo = nguoi ? so.nguoiDung.find(n => n.id === nguoi.id) : undefined;
  return { nguoi: nguoi!, hoSo: hoSo!, so, bayGio, lam };
}

export const useThamSo = (ten: string) => useSearchParams()[0].get(ten) ?? '';

/** Khung nội dung một màn: các khối xếp dọc; nút chính dính đáy (nếu có). */
export function Khung({ children, duoi }: { children: ReactNode; duoi?: ReactNode }) {
  return (
    <div className="khung-man">
      <div className="chong">{children}</div>
      {duoi && <div className="man-duoi">{duoi}</div>}
    </div>
  );
}

export function AnhMH({ matHang, anh, lon }: { matHang: string; anh?: string; lon?: boolean }) {
  const src = anhMatHang(matHang, anh);
  return src ? <img className={`anh-mh ${lon ? 'lon' : ''}`} src={src} alt={timMatHang(matHang)?.ten ?? ''} loading="lazy" /> : <span className={`anh-mh ${lon ? 'lon' : ''}`} />;
}

const NHAN_LO: Record<TinhTrangLo, [string, 'xong' | 'cho' | 'lam' | 'loi' | undefined]> = {
  dang_ban: ['Đang bán', 'xong'], con_it: ['Còn ít', 'lam'], sap_an: ['Sắp tự ẩn', 'lam'], da_an: ['Đang ẩn', 'loi'], da_chot_het: ['Đã chốt hết', 'cho'],
};
export const ChipLo = ({ t }: { t: TinhTrangLo }) => <Chip {...(NHAN_LO[t][1] ? { kieu: NHAN_LO[t][1] } : {})}>{NHAN_LO[t][0]}</Chip>;

export function TheLo({ lo, tinhTrang, conBan, soKhach }: { lo: Lo; tinhTrang: TinhTrangLo; conBan: number; soKhach?: number }) {
  return (
    <TheLink den={`/chi-tiet-lo?lo=${lo.id}`} {...(tinhTrang === 'sap_an' || tinhTrang === 'da_an' ? { vien: 'lam' as const } : {})}>
      <div className="hang ngang">
        <AnhMH matHang={lo.matHang} {...(lo.anh[0] ? { anh: lo.anh[0] } : {})} />
        <div className="grow chong hep">
          <strong>{lo.ten}</strong>
          <span className="nho phu so">{luong(lo.kg)} {lo.coSo === 'da_can' ? 'đã cân' : 'ước tính'} · {lo.gia ? `${dinhSo(lo.gia)} đ/kg` : 'nhận báo giá'}</span>
          <div className="hang"><ChipLo t={tinhTrang} />{lo.thanhPhan && <Chip>Lô gộp {lo.thanhPhan.length} hộ</Chip>}{soKhach ? <Chip kieu="cho">{soKhach} khách đang hỏi</Chip> : null}</div>
        </div>
      </div>
      <div className="thanh-luong" aria-label={`Còn bán được ${luong(conBan)} trên ${luong(lo.kg)}`}>
        <i style={{ width: `${(lo.giao / lo.kg) * 100}%` }} className="giao" /><i style={{ width: `${(Math.max(0, lo.hua - lo.giao) / lo.kg) * 100}%` }} className="hua" />
      </div>
      <span className="nho phu so">Còn bán được {luong(conBan)} · đã hứa {luong(lo.hua)} · đã giao {luong(lo.giao)}</span>
    </TheLink>
  );
}

export function TheDon({ don, bayGio, den }: { don: Don; bayGio: number; den?: string }) {
  const n = nhom(don, 'ban', bayGio);
  return (
    <TheLink den={den ?? `/chi-tiet-don?ma=${encodeURIComponent(don.ma)}`} {...(n === 'lam' ? { vien: 'lam' as const } : n === 'loi' ? { vien: 'loi' as const } : {})}>
      <div className="hang ngang">
        <AnhMH matHang={don.matHang} />
        <div className="grow chong hep">
          <strong>{don.ma} · {don.tenLo}</strong>
          <span className="nho phu">{don.mua.ten} · giao {don.ngayGiao.split('-').reverse().slice(0, 2).join('/')}</span>
          <span className="nho so">{moTaDon(don).split(' · ')[0]}</span>
        </div>
      </div>
      <NhanNhom nhom={n} chiTiet={NHAN_TRANG_THAI[don.trangThai]} />
      <ThanhChang don={don} />
    </TheLink>
  );
}

/** Nút nghe đọc to một đoạn (tốc độ theo cài đặt). Máy không đọc được thì ẩn. */
export function NutNghe({ noiDung, nhan = 'Nghe' }: { noiDung: string; nhan?: string }) {
  const { hoSo } = useToi();
  const [dang, setDang] = useState(false);
  useEffect(() => () => { if (dang) docTo(''); }, [dang]);
  if (!coTheDoc()) return null;
  return <button type="button" className="tp-nut nhe nho" aria-pressed={dang} onClick={() => { if (dang) { docTo(''); setDang(false); } else { docTo(noiDung, hoSo?.caiDat.tocDoDoc ?? 0.95); setDang(true); setTimeout(() => setDang(false), Math.min(60_000, noiDung.length * 90)); } }}><Icon ten="volume" co={18} />{dang ? 'Dừng đọc' : nhan}</button>;
}

export const tenMH = (id: string) => timMatHang(id)?.ten ?? id;
export type { ThongBao };
