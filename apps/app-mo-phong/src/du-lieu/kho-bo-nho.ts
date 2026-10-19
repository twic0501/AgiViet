// Kho trong bộ nhớ: dùng cho bài thử và chạy không có trình duyệt.
import { soTrong } from '@agiviet/nghiep-vu';
import type { BanDoc, HoSo, KhoGiaoDich, KhoHoSo } from './kho.ts';

export function taoKhoBoNho(): KhoGiaoDich {
  let ban: BanDoc = { so: soTrong(), phienBan: 0 };
  const nghe = new Set<(b: BanDoc) => void>();
  const bao = () => nghe.forEach(f => f(ban));
  return {
    doc: () => ban,
    ghi(so, phienBanDaDoc) {
      if (phienBanDaDoc !== ban.phienBan) return { ok: false, loi: 'du_lieu_cu' };
      ban = { so, phienBan: ban.phienBan + 1 };
      bao();
      return { ok: true, phienBan: ban.phienBan };
    },
    theoDoi(f) { nghe.add(f); return () => nghe.delete(f); },
    datLai() { ban = { so: soTrong(), phienBan: ban.phienBan + 1 }; bao(); },
  };
}

export function taoKhoHoSoBoNho(dau: HoSo[] = []): KhoHoSo {
  const ds = new Map(dau.map(h => [h.id, h]));
  return { lay: id => ds.get(id), luu: hs => void ds.set(hs.id, hs), tatCa: () => [...ds.values()] };
}
