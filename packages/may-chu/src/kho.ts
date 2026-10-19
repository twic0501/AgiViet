// Kho của máy chủ mô phỏng. Dịch vụ chỉ biết giao diện này; đổi sang máy chủ thật thì viết thêm một bản cài đặt.
import { soTrong, type SoGiaoDich } from '@agiviet/nghiep-vu';

/** Bản đọc của kho: sổ giao dịch + số phiên bản kho (tăng mỗi lần ghi). */
export interface BanDoc {
  so: SoGiaoDich;
  phienBan: number;
}

export type KetQuaGhi = { ok: true; phienBan: number } | { ok: false; loi: 'du_lieu_cu' };

export interface KhoGiaoDich {
  doc(): BanDoc;
  /** Ghi sổ mới, chỉ khi kho vẫn ở đúng phiên bản đã đọc (tránh ghi đè thay đổi của tab hay app khác). */
  ghi(so: SoGiaoDich, phienBanDaDoc: number): KetQuaGhi;
  /** Báo khi kho đổi (kể cả do tab hay app khác). Trả hàm hủy theo dõi. */
  theoDoi(nghe: (ban: BanDoc) => void): () => void;
  /** Thay toàn bộ sổ (nạp kịch bản mẫu, xóa dữ liệu). */
  thay(so: SoGiaoDich): void;
}

/** Kho trong bộ nhớ: bài thử, chạy ca kiểm thử, dựng kịch bản. */
export function taoKhoBoNho(dau: SoGiaoDich = soTrong()): KhoGiaoDich {
  let ban: BanDoc = { so: dau, phienBan: 0 };
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
    thay(so) { ban = { so, phienBan: ban.phienBan + 1 }; bao(); },
  };
}

/** Nơi lưu chuỗi (localStorage của trình duyệt, hoặc bản giả trong bài thử). */
export interface NoiLuu {
  getItem(khoa: string): string | null;
  setItem(khoa: string, giaTri: string): void;
  removeItem(khoa: string): void;
}

/**
 * Kho trong trình duyệt: app bán và app mua cùng tên miền (hoặc cùng mở từ tệp) dùng chung khóa này, như cùng gọi một máy chủ.
 * Giữ bản đã đọc tới khi chuỗi lưu đổi, để giao diện nhận cùng một đối tượng khi dữ liệu không đổi.
 */
export function taoKhoTrinhDuyet(noiLuu: NoiLuu, khoa = 'agiviet.may-chu-gia.so.v2', ngheSuKien?: (f: (khoaDoi: string | null) => void) => void): KhoGiaoDich {
  let tho: string | null | undefined, banNho: BanDoc = { so: soTrong(), phienBan: 0 };
  const doc = (): BanDoc => {
    const moi = noiLuu.getItem(khoa);
    if (moi === tho) return banNho;
    tho = moi;
    try {
      const b = JSON.parse(moi ?? 'null') as BanDoc | null;
      banNho = b?.so?.phienBan === 2 ? b : { so: soTrong(), phienBan: 0 };
    } catch { banNho = { so: soTrong(), phienBan: 0 }; }
    return banNho;
  };
  const nghe = new Set<(b: BanDoc) => void>();
  const bao = () => { const b = doc(); nghe.forEach(f => f(b)); };
  ngheSuKien?.(k => { if (k === khoa || k === null) bao(); });
  return {
    doc,
    ghi(so, phienBanDaDoc) {
      if (doc().phienBan !== phienBanDaDoc) return { ok: false, loi: 'du_lieu_cu' };
      const phienBan = phienBanDaDoc + 1;
      noiLuu.setItem(khoa, JSON.stringify({ so, phienBan }));
      bao();
      return { ok: true, phienBan };
    },
    theoDoi(f) { nghe.add(f); return () => nghe.delete(f); },
    thay(so) { noiLuu.setItem(khoa, JSON.stringify({ so, phienBan: doc().phienBan + 1 })); bao(); },
  };
}
