// Bố cục hai vai: chỉ lo khung (thanh điều hướng, vùng nội dung), không biết nghiệp vụ.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { MUC_TOI_BAN, THANH_BEN_MUA, THANH_DUOI_BAN } from '../../phan-he/dieu-huong.ts';
import './bo-cuc.css';

export function BoCucBan({ trang, coThanh, children }: { trang: string; coThanh: boolean; children: ReactNode }) {
  if (!coThanh) return <main className="bc-don-gian">{children}</main>;
  return (
    <div className="bc-dien-thoai">
      <header className="bc-dt-dau">
        <span className="ten-app">AgiViet · Nhà sản xuất</span>
        <Link className="tp-nut phu nho" to="/">Đổi vai</Link>
        <Link className={`tp-nut ${trang === MUC_TOI_BAN.trang ? '' : 'phu'} nho`} to={`/ban/${MUC_TOI_BAN.manDau}`}>{MUC_TOI_BAN.ten}</Link>
      </header>
      <main className="bc-dt-than">{children}</main>
      <Link className="bc-dt-them" to="/ban/dang" aria-label="Ghi nhật ký hoặc đăng hàng">+</Link>
      <nav className="bc-dt-duoi" aria-label="Điều hướng chính">
        {THANH_DUOI_BAN.map(m => <Link key={m.trang} to={`/ban/${m.manDau}`} className={m.trang === trang ? 'dang' : ''} aria-current={m.trang === trang ? 'page' : undefined}>{m.ten}</Link>)}
      </nav>
    </div>
  );
}

export function BoCucMua({ trang, coThanh, tieuDe, children }: { trang: string; coThanh: boolean; tieuDe?: string; children: ReactNode }) {
  if (!coThanh) return <main className="bc-don-gian">{children}</main>;
  const nhom = [...new Set(THANH_BEN_MUA.map(m => m.nhom))];
  return (
    <div className="bc-may-tinh">
      <nav className="bc-mt-ben" aria-label="Điều hướng chính">
        <span className="ten-app">AgiViet · Thu mua</span>
        {nhom.map(n => (
          <div key={n} style={{ display: 'contents' }}>
            <span className="nhom">{n}</span>
            {THANH_BEN_MUA.filter(m => m.nhom === n).map(m => <Link key={m.trang} to={`/mua/${m.manDau}`} className={m.trang === trang ? 'dang' : ''} aria-current={m.trang === trang ? 'page' : undefined}>{m.ten}</Link>)}
          </div>
        ))}
      </nav>
      <main className="bc-mt-than">
        <div className="bc-mt-dau"><span className="grow nho phu">{tieuDe}</span><Link className="tp-nut phu nho" to="/">Đổi vai</Link></div>
        {children}
      </main>
    </div>
  );
}
