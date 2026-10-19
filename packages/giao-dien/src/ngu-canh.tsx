// Nối giao diện với máy chủ mô phỏng: một chỗ tạo kho, đồng hồ, dịch vụ; chạy nhịp hệ thống; các màn lấy qua hook.
// Mỗi app tự giữ phiên đăng nhập riêng (khóa có tiền tố của app); dữ liệu giao dịch nằm ở máy chủ mô phỏng chung.
import { chayMotNhip, DichVu, taoDongHo, taoKhoTrinhDuyet, type DongHo } from '@agiviet/may-chu';
import type { KetQua, Lenh, NguoiLam, SoGiaoDich } from '@agiviet/nghiep-vu';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

interface NguCanh {
  dv: DichVu;
  dongHo: DongHo;
  bao: (noiDung: string, loai?: 'tot' | 'loi') => void;
}
const Ctx = createContext<NguCanh | null>(null);

const ngheStorage = (f: (k: string | null) => void) => window.addEventListener('storage', e => f(e.key));

export function CungCapMayChu({ children }: { children: ReactNode }) {
  const [tb, setTb] = useState<{ noiDung: string; loai: 'tot' | 'loi'; id: number } | null>(null);
  const gt = useMemo(() => {
    const dongHo = taoDongHo(window.localStorage);
    const dv = new DichVu(taoKhoTrinhDuyet(window.localStorage, undefined, ngheStorage), dongHo);
    return { dv, dongHo };
  }, []);
  const bao = useCallback((noiDung: string, loai: 'tot' | 'loi' = 'tot') => setTb({ noiDung, loai, id: Date.now() }), []);
  useEffect(() => { if (!tb) return; const t = setTimeout(() => setTb(null), tb.loai === 'loi' ? 6000 : 3500); return () => clearTimeout(t); }, [tb]);
  // Ngân hàng, đối tác, đồng hồ hạn cọc: chạy mỗi 3 giây khi app đang mở
  useEffect(() => { const t = setInterval(() => chayMotNhip(gt.dv), 3000); chayMotNhip(gt.dv); return () => clearInterval(t); }, [gt]);
  const giaTri = useMemo(() => ({ ...gt, bao }), [gt, bao]);
  return (
    <Ctx.Provider value={giaTri}>
      {children}
      {tb && <div key={tb.id} className={`tp-thong-bao ${tb.loai === 'loi' ? 'loi' : ''}`} role={tb.loai === 'loi' ? 'alert' : 'status'}>{tb.noiDung}</div>}
    </Ctx.Provider>
  );
}

export function useMayChu(): NguCanh {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMayChu phải nằm trong CungCapMayChu');
  return c;
}

/** Sổ giao dịch hiện tại, tự vẽ lại khi kho đổi (kể cả do tab hay app khác). */
export function useSo(): SoGiaoDich {
  const { dv } = useMayChu();
  return useSyncExternalStore(n => dv.theoDoi(n), () => dv.doc());
}

/** Giờ của máy chủ mô phỏng (có tính phần tua), cập nhật mỗi chuKy mili giây. */
export function useBayGio(chuKy = 15_000): number {
  const { dv } = useMayChu();
  const [, setNhip] = useState(0);
  useEffect(() => { const t = setInterval(() => setNhip(n => n + 1), chuKy); return () => clearInterval(t); }, [chuKy]);
  useSo();   // dữ liệu đổi (kể cả do tua đồng hồ rồi chạy hệ thống) thì cũng vẽ lại
  return dv.bayGio();
}

/**
 * Chạy lệnh thay người đang dùng app: thành công thì báo và (nếu có) chuyển màn; lỗi thì báo đúng lời của nghiệp vụ.
 * den có thể là hàm nhận mã đối tượng vừa tạo.
 */
export function useLenh(nguoi: NguoiLam | null) {
  const { dv, bao } = useMayChu();
  const di = useNavigate();
  return useCallback((lenh: Lenh, tuyChon: { bao?: string; den?: string | ((ma: string) => string) } = {}): KetQua<string | undefined> => {
    if (!nguoi) { bao('Chưa đăng nhập.', 'loi'); return { ok: false, loi: 'Chưa đăng nhập.' }; }
    const kq = dv.thucHien(nguoi, lenh);
    if (!kq.ok) { bao(kq.loi, 'loi'); return kq; }
    if (tuyChon.bao) bao(tuyChon.bao);
    if (tuyChon.den) di(typeof tuyChon.den === 'function' ? tuyChon.den(kq.giaTri ?? '') : tuyChon.den);
    return kq;
  }, [dv, bao, di, nguoi]);
}

/** Phiên đăng nhập của một app (sessionStorage, khóa riêng từng app). */
export function taoPhien(khoa: string) {
  const nghe = new Set<() => void>();
  let nho: NguoiLam | null | undefined;
  const doc = (): NguoiLam | null => {
    if (nho !== undefined) return nho;
    try { nho = JSON.parse(sessionStorage.getItem(khoa) ?? 'null') as NguoiLam | null; } catch { nho = null; }
    return nho;
  };
  return {
    doc,
    dat(n: NguoiLam | null) { nho = n; if (n) sessionStorage.setItem(khoa, JSON.stringify(n)); else sessionStorage.removeItem(khoa); nghe.forEach(f => f()); },
    useNguoi(): NguoiLam | null { return useSyncExternalStore(f => { nghe.add(f); return () => nghe.delete(f); }, doc); },
  };
}
