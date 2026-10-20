// Gốc app bán: định tuyến theo danh mục màn; cần đăng nhập trừ màn bắt đầu và công cụ mô phỏng.
import { CungCapMayChu, TrangTrong, useSo } from '@agiviet/giao-dien';
import { useEffect, type ComponentType } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useParams } from 'react-router';
import { BoCuc } from './bo-cuc.tsx';
import { DANH_MUC_MAN, timMan } from './danh-muc-man.ts';
import { MAN_BAT_DAU } from './man/bat-dau.tsx';
import { MAN_HOM_NAY } from './man/hom-nay.tsx';
import { MAN_VUON } from './man/vuon.tsx';
import { MAN_HANG } from './man/hang.tsx';
import { MAN_DANG } from './man/dang.tsx';
import { MAN_KHACH } from './man/khach.tsx';
import { MAN_DON } from './man/don.tsx';
import { MAN_KY } from './man/ky.tsx';
import { MAN_TIEN } from './man/tien.tsx';
import { MAN_TOI } from './man/toi.tsx';
import { MAN_CONG_CU } from './man/cong-cu.tsx';
import { PHIEN, useNguoi } from './phien.ts';

export const MAN: Record<string, ComponentType> = { ...MAN_BAT_DAU, ...MAN_HOM_NAY, ...MAN_VUON, ...MAN_HANG, ...MAN_DANG, ...MAN_KHACH, ...MAN_DON, ...MAN_KY, ...MAN_TIEN, ...MAN_TOI, ...MAN_CONG_CU };
const KHONG_CAN_DANG_NHAP = new Set(['bat-dau', 'cong-cu']);

function KhungChuaLam({ id }: { id: string }) {
  const m = timMan(id)!;
  return <div className="tp-khung"><p className="phu">Màn đang làm. Các khu vực:</p>{m.khuVuc.map(k => <div key={k} className="tp-khoi">{k}</div>)}</div>;
}

function ManTheoMa() {
  const { man: id = '' } = useParams();
  const nguoi = useNguoi();
  const so = useSo();
  const man = timMan(id);
  const hoSo = nguoi ? so.nguoiDung.find(n => n.id === nguoi.id) : undefined;
  // Cỡ chữ theo cài đặt của người dùng
  useEffect(() => { document.documentElement.dataset.coChu = hoSo?.caiDat.coChu ?? 'vua'; }, [hoSo?.caiDat.coChu]);
  // Phiên trỏ tới tài khoản không còn (vừa xóa dữ liệu, nạp kịch bản khác): đăng xuất
  useEffect(() => { if (nguoi && !hoSo) PHIEN.dat(null); }, [nguoi, hoSo]);
  if (!man) return <BoCuc man={{ id, ten: 'Không có màn này', trang: '', nhom: '', tinhTrangCu: 'Mới', khuVuc: [] }} coThanh={false}><TrangTrong tieuDe="Không có màn này">Mã màn "{id}" không có trong danh mục.</TrangTrong></BoCuc>;
  const canDangNhap = !KHONG_CAN_DANG_NHAP.has(man.trang);
  if (canDangNhap && !hoSo) return <Navigate to="/chao-mung" replace />;
  const ThanhPhan = MAN[man.id];
  return <BoCuc man={man} coThanh={man.trang !== 'bat-dau' && !!hoSo}>{ThanhPhan ? <ThanhPhan /> : <KhungChuaLam id={man.id} />}</BoCuc>;
}

function VaoApp() {
  const nguoi = useNguoi();
  return <Navigate to={nguoi ? '/hom-nay' : '/chao-mung'} replace />;
}

// Mở thẳng từ tệp (bản một tệp HTML) thì dùng đường dẫn dạng #/hom-nay
const BoDinhTuyen = typeof location !== 'undefined' && location.protocol === 'file:' ? HashRouter : BrowserRouter;

export function UngDung() {
  return (
    <BoDinhTuyen>
      <CungCapMayChu>
        <Routes>
          <Route path="/" element={<VaoApp />} />
          <Route path="/:man" element={<ManTheoMa />} />
        </Routes>
      </CungCapMayChu>
    </BoDinhTuyen>
  );
}

export { DANH_MUC_MAN };
