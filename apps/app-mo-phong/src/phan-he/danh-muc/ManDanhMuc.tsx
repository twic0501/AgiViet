// Danh mục màn: xem toàn bộ màn hai vai, lọc theo vai, giai đoạn, tình trạng; mở từng màn. Công cụ quản lý thiết kế.
import { useState } from 'react';
import { Link } from 'react-router';
import { ChipGiaiDoan } from '../../giao-dien/thanh-phan/index.tsx';
import { DANH_MUC_MAN } from '../danh-muc-man.ts';
import { MAN_BAN } from '../nha-san-xuat/man.tsx';
import { MAN_MUA } from '../thu-mua/man.tsx';

export function ManDanhMuc() {
  const [vai, setVai] = useState<'' | 'ban' | 'mua'>('');
  const [gd, setGd] = useState<0 | 1 | 2 | 3>(0);
  const ds = DANH_MUC_MAN.filter(m => (!vai || m.vai === vai) && (!gd || m.giaiDoan === gd));
  const daLam = (v: string, id: string) => !!(v === 'ban' ? MAN_BAN : MAN_MUA)[id];
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--k5) var(--k4)' }} className="chong">
      <Link to="/" className="nho">← Chọn vai</Link>
      <h1>Danh mục màn</h1>
      <p className="phu">{ds.length} màn · đã có giao diện thật: {ds.filter(m => daLam(m.vai, m.id)).length}. Màn chưa làm mở ra khung bố cục theo các khu vực ghi trong danh mục.</p>
      <div className="hang">
        <label className="tp-truong">Vai
          <select className="tp-o" value={vai} onChange={e => setVai(e.target.value as typeof vai)}>
            <option value="">Cả hai</option><option value="ban">Nhà sản xuất</option><option value="mua">Thu mua</option>
          </select>
        </label>
        <label className="tp-truong">Giai đoạn
          <select className="tp-o" value={gd} onChange={e => setGd(Number(e.target.value) as typeof gd)}>
            <option value={0}>Mọi giai đoạn</option><option value={1}>1 · Mua bán cốt lõi</option><option value={2}>2 · Quản lý</option><option value={3}>3 · Mở rộng</option>
          </select>
        </label>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr>{['Vai', 'Trang', 'Màn', 'Giai đoạn', 'So với bản cũ', 'Giao diện'].map(t => <th key={t} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--vien)' }}>{t}</th>)}</tr></thead>
          <tbody>
            {ds.map(m => (
              <tr key={m.vai + m.id}>
                <td style={{ padding: 8, borderBottom: '1px solid var(--vien)' }}>{m.vai === 'ban' ? 'Bán' : 'Mua'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--vien)' }} className="phu">{m.nhom}</td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--vien)' }}><Link to={`/${m.vai}/${m.id}`}>{m.ten}</Link> <code className="nho phu">{m.id}</code></td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--vien)' }}><ChipGiaiDoan gd={m.giaiDoan} /></td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--vien)' }}>{m.tinhTrangCu}</td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--vien)' }}>{daLam(m.vai, m.id) ? 'Đã có' : 'Khung bố cục'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
