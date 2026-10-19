// Bố cục điện thoại của app bán: chỉ lo khung (thanh trên, thanh dưới, dải mô phỏng), không biết nghiệp vụ.
import { gioNgay, Icon, useMayChu } from '@agiviet/giao-dien';
import { viecCanLam } from '@agiviet/may-chu';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import './bo-cuc.css';
import { useToi } from './chung.tsx';
import type { Man } from './danh-muc-man.ts';

export const THANH_DUOI = [
  { trang: 'hom-nay', ten: 'Hôm nay', den: '/hom-nay', icon: 'home' },
  { trang: 'vuon', ten: 'Vườn', den: '/vuon', icon: 'garden' },
  { trang: 'giua', ten: '', den: '/dang', icon: '' },
  { trang: 'ban', ten: 'Bán', den: '/hang', icon: 'stock' },
  { trang: 'don', ten: 'Đơn', den: '/lich', icon: 'order' },
  { trang: 'tien', ten: 'Tiền', den: '/tien', icon: 'wallet' },
] as const;
/** Màn gốc của mỗi mục: không có nút quay lại. */
const MAN_GOC = new Set(['hom-nay', 'vuon', 'hang', 'lich', 'tien', 'toi']);
const GOC_CUA: Record<string, string> = { 'hom-nay': '/hom-nay', vuon: '/vuon', ban: '/hang', don: '/lich', tien: '/tien', toi: '/toi', 'cong-cu': '/gia-lap', 'bat-dau': '/chao-mung' };

function DaiMoPhong() {
  const { dongHo } = useMayChu();
  const { bayGio } = useToi();
  const lech = dongHo.doLech();
  return (
    <div className="bc-mo-phong" role="note">
      <span className="grow">Mô phỏng{lech > 0 ? ` · giờ ${gioNgay(bayGio)} (đã tua ${Math.round(lech / 3600_000)} giờ)` : ''}</span>
      <Link to="/gia-lap">Giả lập bên mua</Link>
      <Link to="/phong-thu">Phòng thử</Link>
    </div>
  );
}

export function BoCuc({ man, coThanh, children }: { man: Man; coThanh: boolean; children: ReactNode }) {
  const di = useNavigate();
  const { nguoi, so, bayGio } = useToi();
  const viec = nguoi && coThanh ? viecCanLam(so, nguoi, bayGio) : null;
  const soViec = viec ? viec.don.length + viec.loiMoi.length + viec.baoGia.length + viec.hen.length + viec.deNghi.length : 0;
  const quayLai = () => (window.history.length > 1 ? di(-1) : di(GOC_CUA[man.trang] ?? '/'));
  return (
    <div className="bc">
      <DaiMoPhong />
      <header className="bc-dau">
        {!MAN_GOC.has(man.id) && <button type="button" className="bc-nut-tron" onClick={quayLai} aria-label="Quay lại"><span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>‹</span></button>}
        <h1>{man.ten}</h1>
        {coThanh && <Link className="bc-nut-tron" to="/thong-bao" aria-label={`Thông báo${soViec ? `, ${soViec} việc cần làm` : ''}`}><Icon ten="bell" />{soViec > 0 && <span className="dem">{soViec}</span>}</Link>}
        {coThanh && <Link className="bc-nut-tron" to="/toi" aria-label="Tôi"><Icon ten="user" /></Link>}
      </header>
      <main className={`bc-than ${coThanh ? '' : 'khong-thanh'}`}>{children}</main>
      {coThanh && (
        <>
          <Link className="bc-them" to="/dang" aria-label="Đăng hàng hoặc ghi nhật ký"><Icon ten="plus" co={28} /></Link>
          <nav className="bc-duoi" aria-label="Điều hướng chính">
            {THANH_DUOI.map(m => m.trang === 'giua'
              ? <a key="giua" className="giua" aria-hidden="true" tabIndex={-1} />
              : <Link key={m.trang} to={m.den} className={m.trang === man.trang ? 'dang' : ''} aria-current={m.trang === man.trang ? 'page' : undefined}><Icon ten={m.icon} />{m.ten}</Link>)}
          </nav>
        </>
      )}
    </div>
  );
}
