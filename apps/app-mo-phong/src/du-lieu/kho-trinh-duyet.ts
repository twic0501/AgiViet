// Kho mô phỏng trong trình duyệt (localStorage). Khóa riêng của app mô phỏng; trang giới thiệu không đọc khóa này.
// Hai tab cùng mở app thấy cùng dữ liệu và tự cập nhật qua sự kiện "storage".
import { soTrong, type SoGiaoDich } from '@agiviet/nghiep-vu';
import type { BanDoc, HoSo, KhoGiaoDich, KhoHoSo } from './kho.ts';

const KHOA_SO = 'agiviet.mo-phong.so.v1';
const KHOA_HO_SO = 'agiviet.mo-phong.ho-so.v1';

const docJson = <T>(khoa: string): T | null => {
  try { return JSON.parse(localStorage.getItem(khoa) ?? 'null') as T | null; } catch { return null; }
};

export function taoKhoTrinhDuyet(): KhoGiaoDich {
  // Giữ bản đã đọc tới khi chuỗi trong localStorage đổi: giao diện (useSyncExternalStore) cần cùng một đối tượng nếu dữ liệu không đổi
  let tho: string | null | undefined, banNho: BanDoc = { so: soTrong(), phienBan: 0 };
  const doc = (): BanDoc => {
    const moi = localStorage.getItem(KHOA_SO);
    if (moi === tho) return banNho;
    tho = moi;
    const ban = docJson<{ so: SoGiaoDich; phienBan: number }>(KHOA_SO);
    banNho = ban?.so?.phienBan === 1 ? ban : { so: soTrong(), phienBan: 0 };
    return banNho;
  };
  const nghe = new Set<(b: BanDoc) => void>();
  const bao = () => { const b = doc(); nghe.forEach(f => f(b)); };
  window.addEventListener('storage', e => { if (e.key === KHOA_SO || e.key === null) bao(); });
  return {
    doc,
    ghi(so, phienBanDaDoc) {
      const hienTai = doc();
      if (hienTai.phienBan !== phienBanDaDoc) return { ok: false, loi: 'du_lieu_cu' };
      const phienBan = phienBanDaDoc + 1;
      localStorage.setItem(KHOA_SO, JSON.stringify({ so, phienBan }));
      bao();
      return { ok: true, phienBan };
    },
    theoDoi(f) { nghe.add(f); return () => nghe.delete(f); },
    datLai() { localStorage.removeItem(KHOA_SO); localStorage.removeItem(KHOA_HO_SO); bao(); },
  };
}

export function taoKhoHoSoTrinhDuyet(): KhoHoSo {
  const docTatCa = () => docJson<HoSo[]>(KHOA_HO_SO) ?? [];
  return {
    lay: id => docTatCa().find(h => h.id === id),
    luu: hs => localStorage.setItem(KHOA_HO_SO, JSON.stringify([...docTatCa().filter(h => h.id !== hs.id), hs])),
    tatCa: docTatCa,
  };
}
