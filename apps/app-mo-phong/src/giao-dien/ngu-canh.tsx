// Nối giao diện với tầng dịch vụ: một chỗ tạo kho, dịch vụ, phiên; các màn lấy qua hook, không tự tạo.
import type { NguoiLam, SoGiaoDich } from '@agiviet/nghiep-vu';
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { KhoHoSo } from '../du-lieu/kho.ts';
import { taoKhoHoSoTrinhDuyet, taoKhoTrinhDuyet } from '../du-lieu/kho-trinh-duyet.ts';
import { DichVuGiaoDich } from '../dich-vu/giao-dich.ts';
import { chayMotNhip } from '../dich-vu/mo-phong-he-thong.ts';
import { docPhien } from '../dich-vu/phien.ts';

interface NguCanh {
  dv: DichVuGiaoDich;
  hoSo: KhoHoSo;
  datLai: () => void;
}
const Ctx = createContext<NguCanh | null>(null);

export function CungCapUngDung({ children }: { children: ReactNode }) {
  const gt = useMemo(() => {
    const kho = taoKhoTrinhDuyet();
    return { dv: new DichVuGiaoDich(kho), hoSo: taoKhoHoSoTrinhDuyet(), datLai: () => kho.datLai() };
  }, []);
  // Mô phỏng ngân hàng và đồng hồ hạn cọc: chạy mỗi 3 giây khi app đang mở
  useEffect(() => { const t = setInterval(() => chayMotNhip(gt.dv), 3000); return () => clearInterval(t); }, [gt]);
  return <Ctx.Provider value={gt}>{children}</Ctx.Provider>;
}

export function useUngDung(): NguCanh {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUngDung phải nằm trong CungCapUngDung');
  return c;
}

/** Sổ giao dịch hiện tại, tự vẽ lại khi kho đổi (kể cả do tab khác). */
export function useSo(): SoGiaoDich {
  const { dv } = useUngDung();
  return useSyncExternalStore(n => dv.theoDoi(n), () => dv.doc());
}

/** Người đang dùng app với vai này (null nếu chưa vào). */
export function useNguoi(vai: 'ban' | 'mua'): NguoiLam | null {
  return docPhien()[vai] ?? null;
}
