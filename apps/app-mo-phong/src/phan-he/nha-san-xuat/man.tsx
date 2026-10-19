// Màn đã làm của app Nhà sản xuất. Màn chưa có ở đây hiện khung bố cục từ danh mục màn.
import { conBan, vnd, type NguoiLam } from '@agiviet/nghiep-vu';
import type { ComponentType } from 'react';
import { Link } from 'react-router';
import { loCuaToi, viecCanLam } from '../../dich-vu/truy-van.ts';
import { useSo, useUngDung } from '../../giao-dien/ngu-canh.tsx';
import { NutLink, The, TrangTrong } from '../../giao-dien/thanh-phan/index.tsx';
import { ChiTietDon, DanhSachDon } from '../chung/don.tsx';

function HomNay({ nguoi }: { nguoi: NguoiLam }) {
  const so = useSo();
  const { dv } = useUngDung();
  const viec = viecCanLam(so, nguoi, dv.bayGio());
  const tong = viec.don.length + viec.loiMoi.length;
  return (
    <div className="chong">
      <h1>Chào {nguoi.ten}</h1>
      <h2>Việc cần làm {tong ? <span className="phu so">({tong})</span> : null}</h2>
      {!tong && <TrangTrong tieuDe="Chưa có việc nào" hanhDong={<NutLink den="/ban/dang">Đăng lô đầu tiên</NutLink>}>Đăng lô hàng để bên mua tìm thấy bạn. Việc cần trả lời sẽ hiện ở đây.</TrangTrong>}
      {viec.loiMoi.map(k => <The key={k.id}><strong>{k.mua.ten} muốn kết nối</strong><Link to="/ban/ket-noi">Trả lời lời mời</Link></The>)}
      {viec.don.map(d => <The key={d.ma}><strong>{d.ma} · {d.tenLo}</strong><Link to={`/ban/chi-tiet-don?ma=${encodeURIComponent(d.ma)}`}>Mở đơn</Link></The>)}
    </div>
  );
}

function Hang({ nguoi }: { nguoi: NguoiLam }) {
  const ds = loCuaToi(useSo(), nguoi);
  return (
    <div className="chong">
      <h1>Hàng đang bán</h1>
      {!ds.length && <TrangTrong tieuDe="Chưa có lô nào" hanhDong={<NutLink den="/ban/dang">Đăng hàng</NutLink>}>Chụp ảnh hoặc nói để đăng một lô.</TrangTrong>}
      {ds.map(l => (
        <The key={l.id}>
          <strong>{l.ten}</strong>
          <span className="so">{vnd(l.kg)} kg {l.coSo === 'da_can' ? 'đã cân' : 'ước tính'} · còn bán được {vnd(conBan(l))} kg</span>
        </The>
      ))}
    </div>
  );
}

const Don = ({ nguoi }: { nguoi: NguoiLam }) => <DanhSachDon nguoi={nguoi} tieuDe="Đơn và lịch giao" trong="Khi bên mua gửi đơn cho lô của bạn, đơn hiện ở đây, chia theo việc tới lượt ai." />;

export const MAN_BAN: Record<string, ComponentType<{ nguoi: NguoiLam }>> = {
  'hom-nay': HomNay,
  hang: Hang,
  lich: Don,
  'chi-tiet-don': ChiTietDon,
};
