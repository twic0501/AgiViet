// Gốc app: định tuyến /, /danh-muc, /ban/:man, /mua/:man. Màn đã làm hiện giao diện thật; chưa làm hiện khung bố cục.
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useParams } from 'react-router';
import { BoCucBan, BoCucMua } from '../giao-dien/bo-cuc/index.tsx';
import { CungCapUngDung, useNguoi } from '../giao-dien/ngu-canh.tsx';
import { KhungBoCuc, TrangTrong } from '../giao-dien/thanh-phan/index.tsx';
import { ManChonVai } from '../phan-he/chon-vai/ManChonVai.tsx';
import { timMan, type VaiApp } from '../phan-he/danh-muc-man.ts';
import { ManDanhMuc } from '../phan-he/danh-muc/ManDanhMuc.tsx';
import { TRANG_NGOAI } from '../phan-he/dieu-huong.ts';
import { MAN_BAN } from '../phan-he/nha-san-xuat/man.tsx';
import { MAN_MUA } from '../phan-he/thu-mua/man.tsx';

function ManCuaVai({ vai }: { vai: VaiApp }) {
  const { man: id = '' } = useParams();
  const man = timMan(vai, id);
  const nguoi = useNguoi(vai);
  const BoCuc = vai === 'ban' ? BoCucBan : BoCucMua;
  if (!man) return <BoCuc trang="" coThanh={false}><TrangTrong tieuDe="Không có màn này">Mã màn "{id}" không có trong danh mục.</TrangTrong></BoCuc>;
  const coThanh = man.trang !== TRANG_NGOAI[vai];
  // Màn trong app cần đã chọn vai; màn đăng ký, đăng nhập thì không
  if (coThanh && !nguoi) return <Navigate to="/" replace />;
  const ThanhPhan = (vai === 'ban' ? MAN_BAN : MAN_MUA)[man.id];
  return (
    <BoCuc trang={man.trang} coThanh={coThanh} tieuDe={nguoi ? `${nguoi.ten} · ${man.nhom}` : man.nhom}>
      {ThanhPhan && nguoi ? <ThanhPhan nguoi={nguoi} /> : <KhungBoCuc man={man} />}
    </BoCuc>
  );
}

// Mở thẳng từ tệp (bản một tệp HTML) thì đường dẫn thường không dùng được: chuyển sang dạng #/ban/hom-nay
const BoDinhTuyen = location.protocol === 'file:' ? HashRouter : BrowserRouter;

export function UngDung() {
  return (
    <CungCapUngDung>
      <BoDinhTuyen>
        <Routes>
          <Route path="/" element={<ManChonVai />} />
          <Route path="/danh-muc" element={<ManDanhMuc />} />
          <Route path="/ban/:man" element={<ManCuaVai vai="ban" />} />
          <Route path="/mua/:man" element={<ManCuaVai vai="mua" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BoDinhTuyen>
    </CungCapUngDung>
  );
}
