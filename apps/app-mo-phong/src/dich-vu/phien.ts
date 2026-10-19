// Phiên đăng nhập mô phỏng: người dùng chọn vai, đặt tên; app tạo danh tính và hồ sơ trống (chưa có dữ liệu mẫu).
import type { NguoiLam } from '@agiviet/nghiep-vu';
import type { HoSo, KhoHoSo } from '../du-lieu/kho.ts';

const KHOA_PHIEN = 'agiviet.mo-phong.phien.v1';

export interface Phien {
  ban?: NguoiLam;
  mua?: NguoiLam;
}

export function docPhien(): Phien {
  try { return JSON.parse(sessionStorage.getItem(KHOA_PHIEN) ?? '{}') as Phien; } catch { return {}; }
}

/** Vào app với một vai. Hồ sơ mới chỉ có tên; vùng và liên lạc người dùng tự điền ở màn Hồ sơ. */
export function vaoVai(vai: 'ban' | 'mua', ten: string, hoSo: KhoHoSo): NguoiLam {
  const phien = docPhien();
  const cu = phien[vai];
  const nguoi: NguoiLam = cu && cu.ten === ten ? cu : { vai, id: `${vai}-${Date.now().toString(36)}`, ten };
  if (!hoSo.lay(nguoi.id)) {
    const hs: HoSo = { id: nguoi.id, vai, ten, vung: '', daXacMinh: false, lienLac: { sdt: '', diaChi: '' } };
    hoSo.luu(hs);
  }
  sessionStorage.setItem(KHOA_PHIEN, JSON.stringify({ ...phien, [vai]: nguoi }));
  return nguoi;
}

export function roiVai(vai: 'ban' | 'mua') {
  const phien = docPhien();
  delete phien[vai];
  sessionStorage.setItem(KHOA_PHIEN, JSON.stringify(phien));
}
