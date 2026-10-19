// Cửa vào bản mô phỏng: chọn vai, đặt tên. Hai vai mở được ở hai tab để chạy một giao dịch hai phía.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { docPhien, vaoVai } from '../../dich-vu/phien.ts';
import { useUngDung } from '../../giao-dien/ngu-canh.tsx';
import { Nut, The } from '../../giao-dien/thanh-phan/index.tsx';
import { MAN_VAO } from '../dieu-huong.ts';

const VAI = [
  { vai: 'ban' as const, ten: 'Nhà sản xuất', moTa: 'Nhà vườn, ao nuôi, hợp tác xã. Đăng lô, nhận đơn, theo dõi tiền về. Giao diện điện thoại.', goiY: 'Chị Năm · Mỹ Xương' },
  { vai: 'mua' as const, ten: 'Thu mua', moTa: 'Nhà máy, doanh nghiệp, vựa. Tìm nguồn, đặt cọc, nghiệm thu, trả tiền. Giao diện máy tính.', goiY: 'Nhà máy sấy Đồng Xanh' },
];

export function ManChonVai() {
  const { hoSo, datLai } = useUngDung();
  const di = useNavigate();
  const goiY = useSearchParams()[0].get('vai');            // trang giới thiệu dẫn sang với ?vai=ban | ?vai=mua
  const phien = docPhien();
  const [ten, setTen] = useState<Record<'ban' | 'mua', string>>({ ban: phien.ban?.ten ?? '', mua: phien.mua?.ten ?? '' });
  const [daXoa, setDaXoa] = useState(false);
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: 'var(--k6) var(--k4)' }} className="chong">
      <span className="nho phu">AgiViet · bản mô phỏng · dữ liệu chỉ nằm trong trình duyệt này</span>
      <h1 style={{ fontSize: 'var(--co-tieu-de-lon)' }}>Chọn vai để vào app</h1>
      <p className="phu">Mở hai vai ở hai tab để chạy một giao dịch từ hai phía. Bản này chưa có dữ liệu mẫu: lô, lời mời, đơn đều do bạn tạo.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--k4)' }}>
        {VAI.map(v => (
          <The key={v.vai} noi>
            <h2>{v.ten}</h2>
            <p className="phu">{v.moTa}</p>
            <label className="tp-truong">Tên hiển thị
              <input className="tp-o" autoFocus={goiY === v.vai} value={ten[v.vai]} placeholder={v.goiY} onChange={e => setTen({ ...ten, [v.vai]: e.target.value })} />
            </label>
            <Nut rong onClick={() => { vaoVai(v.vai, ten[v.vai].trim() || v.goiY, hoSo); di(`/${v.vai}/${MAN_VAO[v.vai]}`); }}>Vào app {v.ten}</Nut>
          </The>
        ))}
      </div>
      <div className="hang">
        <Link className="tp-nut phu" to="/danh-muc">Danh mục 129 màn</Link>
        <Nut kieu="phu" onClick={() => { datLai(); setDaXoa(true); }}>Xóa dữ liệu mô phỏng</Nut>
        {daXoa && <span role="status" className="nho phu">Đã xóa sạch lô, lời mời, đơn và hồ sơ.</span>}
      </div>
    </main>
  );
}
