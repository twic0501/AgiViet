// Màn đã làm của app Thu mua. Màn chưa có ở đây hiện khung bố cục từ danh mục màn.
import { conBan, vnd, type NguoiLam } from '@agiviet/nghiep-vu';
import type { ComponentType } from 'react';
import { Link } from 'react-router';
import { loDangBan, viecCanLam } from '../../dich-vu/truy-van.ts';
import { useSo, useUngDung } from '../../giao-dien/ngu-canh.tsx';
import { The, TrangTrong } from '../../giao-dien/thanh-phan/index.tsx';
import { ChiTietDon, DanhSachDon } from '../chung/don.tsx';

function TongQuan({ nguoi }: { nguoi: NguoiLam }) {
  const so = useSo();
  const { dv } = useUngDung();
  const viec = viecCanLam(so, nguoi, dv.bayGio());
  return (
    <div className="chong">
      <h1>Chào {nguoi.ten}</h1>
      <h2>Việc cần làm</h2>
      {!viec.don.length && <TrangTrong tieuDe="Chưa có việc nào">Tìm nguồn hàng hoặc đăng nhu cầu mua; đơn cần bạn đặt cọc, nhập cân, trả tiền sẽ hiện ở đây.</TrangTrong>}
      {viec.don.map(d => <The key={d.ma}><strong>{d.ma} · {d.tenLo} · {d.ban.ten}</strong><Link to={`/mua/chi-tiet-don?ma=${encodeURIComponent(d.ma)}`}>Mở đơn</Link></The>)}
    </div>
  );
}

function NguonHang() {
  const ds = loDangBan(useSo());
  return (
    <div className="chong">
      <h1>Nguồn hàng</h1>
      {!ds.length && <TrangTrong tieuDe="Chưa có lô nào đang bán">Khi người bán đăng lô, lô hiện ở đây cùng vùng, lượng còn bán được và uy tín người bán. Số điện thoại chỉ mở sau khi đặt cọc.</TrangTrong>}
      {ds.map(l => <The key={l.id}><strong>{l.ten} · {l.ban.ten}</strong><span className="so">Còn bán được {vnd(conBan(l))} kg</span></The>)}
    </div>
  );
}

const DonHang = ({ nguoi }: { nguoi: NguoiLam }) => <DanhSachDon nguoi={nguoi} tieuDe="Đơn và lịch nhận" trong="Đơn bạn gửi người bán hiện ở đây, chia theo việc tới lượt ai." />;

export const MAN_MUA: Record<string, ComponentType<{ nguoi: NguoiLam }>> = {
  'tong-quan': TongQuan,
  'nguon-hang': NguonHang,
  'don-hang': DonHang,
  'chi-tiet-don': ChiTietDon,
};
