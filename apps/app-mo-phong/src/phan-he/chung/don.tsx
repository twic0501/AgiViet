// Màn đơn dùng chung hai vai: danh sách theo nhóm "tới lượt ai", chi tiết đơn với thanh chặng, việc tiếp theo, bảng bước, liên lạc.
import { NHAN_NHOM, NHAN_TRANG_THAI, buocDuoc, nhom, vnd, viecTiep, type Don, type Lenh, type NguoiLam, type Nhom, type TenBuoc } from '@agiviet/nghiep-vu';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { benKia, donTheoNhom } from '../../dich-vu/truy-van.ts';
import { useSo, useUngDung } from '../../giao-dien/ngu-canh.tsx';
import { KIEU_BUOC, NHAN_BUOC } from '../../giao-dien/nhan-buoc.ts';
import { NhanNhom, Nut, The, ThanhChang, TrangTrong } from '../../giao-dien/thanh-phan/index.tsx';

const THU_TU: Nhom[] = ['lam', 'loi', 'cho', 'xong', 'het'];

export function DanhSachDon({ nguoi, tieuDe, trong }: { nguoi: NguoiLam; tieuDe: string; trong: string }) {
  const so = useSo();
  const { dv } = useUngDung();
  const nhomDon = donTheoNhom(so, nguoi, dv.bayGio());
  const tong = THU_TU.reduce((s, n) => s + nhomDon[n].length, 0);
  return (
    <div className="chong">
      <h1>{tieuDe}</h1>
      {!tong && <TrangTrong tieuDe="Chưa có đơn nào">{trong}</TrangTrong>}
      {THU_TU.filter(n => nhomDon[n].length).map(n => (
        <section key={n} className="chong" aria-label={NHAN_NHOM[n]}>
          <h2>{NHAN_NHOM[n]} <span className="phu so">({nhomDon[n].length})</span></h2>
          {nhomDon[n].map(d => <TheDon key={d.ma} don={d} nguoi={nguoi} />)}
        </section>
      ))}
    </div>
  );
}

function TheDon({ don, nguoi }: { don: Don; nguoi: NguoiLam }) {
  const { dv } = useUngDung();
  const ben = nguoi.vai === 'ban' ? don.mua.ten : don.ban.ten;
  return (
    <Link to={`/${nguoi.vai}/chi-tiet-don?ma=${encodeURIComponent(don.ma)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <The>
        <div className="hang"><strong>{don.ma}</strong><span className="phu">· {don.tenLo} · {ben}</span></div>
        <span className="so nho phu">{vnd(don.kg)} kg × {vnd(don.gia)} đ</span>
        <NhanNhom nhom={nhom(don, nguoi.vai, dv.bayGio())} chiTiet={NHAN_TRANG_THAI[don.trangThai]} />
        <ThanhChang don={don} />
      </The>
    </Link>
  );
}

export function ChiTietDon({ nguoi }: { nguoi: NguoiLam }) {
  const [tham] = useSearchParams();
  const so = useSo();
  const { dv, hoSo } = useUngDung();
  const don = so.don.find(d => d.ma === tham.get('ma'));
  const laCuaToi = don && (nguoi.vai === 'ban' ? don.ban.id : don.mua.id) === nguoi.id;
  if (!don || !laCuaToi) return <TrangTrong tieuDe="Chưa chọn đơn" hanhDong={<Link className="tp-nut phu" to={`/${nguoi.vai}/${nguoi.vai === 'ban' ? 'lich' : 'don-hang'}`}>Về danh sách đơn</Link>}>Mở một đơn từ danh sách đơn để xem chi tiết.</TrangTrong>;
  const vai = nguoi.vai as 'ban' | 'mua';
  const bk = benKia(don, nguoi, hoSo);
  return (
    <div className="chong">
      <div className="chong" style={{ gap: 'var(--k1)' }}>
        <span className="nho phu">{don.tenLo}</span>
        <h1>{don.ma}</h1>
      </div>
      <The noi>
        <NhanNhom nhom={nhom(don, vai, dv.bayGio())} chiTiet={NHAN_TRANG_THAI[don.trangThai]} />
        <ThanhChang don={don} />
        <p><strong>Việc tiếp theo.</strong> {viecTiep(don, vai)}</p>
        <BangBuoc don={don} nguoi={nguoi} />
      </The>
      <The>
        <h2>{vai === 'ban' ? 'Bên mua' : 'Người bán'}</h2>
        <span>{bk.ten} · {bk.vung}{bk.daXacMinh ? ' · đã xác minh' : ''}</span>
        {bk.lienLac
          ? <span>Liên lạc: <strong className="so">{bk.lienLac.sdt || 'chưa điền số'}</strong> · {bk.lienLac.diaChi || 'chưa điền địa chỉ'}</span>
          : <span className="tp-bao thong-tin">Số điện thoại và địa chỉ mở sau khi bên mua đặt cọc vào tài khoản đảm bảo.</span>}
      </The>
      <The>
        <h2>Số liệu</h2>
        <Dong nhan="Lượng × giá" giaTri={`${vnd(don.kg)} kg × ${vnd(don.gia)} đ`} />
        {don.coc && <Dong nhan="Cọc · phí" giaTri={`${vnd(don.coc.so)} đ · ${vnd(don.coc.phi)} đ (${don.coc.loaiPhi === 'moi_quen' ? 'mối quen' : 'giới thiệu'})`} />}
        {don.ketQuaCan && <Dong nhan="Kết quả cân" giaTri={`nhận ${vnd(don.ketQuaCan.nhan)} kg, không nhận ${vnd(don.ketQuaCan.tuChoi)} kg`} />}
        {don.phaiTra !== undefined && <Dong nhan="Tiền hàng · đã trả · còn" giaTri={`${vnd(don.phaiTra)} · ${vnd(don.daTra)} · ${vnd(don.conPhaiTra)} đ`} />}
      </The>
      <details className="tp-the">
        <summary><strong>Lịch sử đơn ({don.lichSu.length})</strong></summary>
        <ol className="chong nho" style={{ paddingLeft: 'var(--k4)', marginTop: 'var(--k2)' }}>
          {don.lichSu.map((l, i) => <li key={i}>{l.noiDung} <span className="phu">· {new Date(l.luc).toLocaleString('vi-VN')}</span></li>)}
        </ol>
      </details>
    </div>
  );
}

const Dong = ({ nhan, giaTri }: { nhan: string; giaTri: string }) => <div className="hang" style={{ justifyContent: 'space-between' }}><span className="phu">{nhan}</span><span className="so">{giaTri}</span></div>;

/** Các bước vai này làm được bây giờ, theo bảng luật. Bước cần số liệu thì hỏi ngay tại chỗ. */
function BangBuoc({ don, nguoi }: { don: Don; nguoi: NguoiLam }) {
  const { dv } = useUngDung();
  const [bao, setBao] = useState<{ loi: boolean; noiDung: string } | null>(null);
  const [o, setO] = useState({ nhan: String(don.kg), tuChoi: '0', so: String(don.conPhaiTra ?? ''), chu: '' });
  const buoc = buocDuoc(don, nguoi.vai);
  if (!buoc.length) return null;
  const so = (s: string) => Number(s.replace(/\D/g, ''));
  const thamSo = (b: TenBuoc): unknown[] =>
    b === 'nhapKetQua' ? [so(o.nhan), so(o.tuChoi)]
      : b === 'baoDaTra' ? [so(o.so)]
        : b === 'chuyenTienDamBao' ? [don.conPhaiTra ?? 0]
          : ['tuChoiDon', 'huyTruocCoc', 'yeuCauHuy', 'guiChungTu', 'ghiDoiSoat'].includes(b) ? (o.chu.trim() ? [o.chu.trim()] : b === 'guiChungTu' || b === 'ghiDoiSoat' ? [''] : []) : [];
  const lam = (b: TenBuoc) => {
    const kq = dv.thucHien(nguoi, { loai: 'buoc_don', ma: don.ma, buoc: b, thamSo: thamSo(b) } as Lenh);
    setBao(kq.ok ? { loi: false, noiDung: `Đã ${NHAN_BUOC[b].toLowerCase()}.` } : { loi: true, noiDung: kq.loi });
  };
  const canChu = buoc.some(b => ['tuChoiDon', 'huyTruocCoc', 'yeuCauHuy', 'guiChungTu', 'ghiDoiSoat'].includes(b));
  return (
    <div className="chong">
      {buoc.includes('nhapKetQua') && (
        <div className="hang" style={{ alignItems: 'end' }}>
          <label className="tp-truong" style={{ flex: 1 }}>Nhận (kg)<input className="tp-o so" inputMode="numeric" value={o.nhan} onChange={e => setO({ ...o, nhan: e.target.value })} /></label>
          <label className="tp-truong" style={{ flex: 1 }}>Không nhận (kg)<input className="tp-o so" inputMode="numeric" value={o.tuChoi} onChange={e => setO({ ...o, tuChoi: e.target.value })} /></label>
        </div>
      )}
      {buoc.includes('baoDaTra') && <label className="tp-truong">Số đã trả trực tiếp (đ)<input className="tp-o so" inputMode="numeric" value={o.so} onChange={e => setO({ ...o, so: e.target.value })} /></label>}
      {canChu && <label className="tp-truong">Lý do, tên chứng từ hoặc ghi chú<input className="tp-o" value={o.chu} onChange={e => setO({ ...o, chu: e.target.value })} /></label>}
      <div className="hang">
        {buoc.map(b => (
          <Nut key={b} kieu={KIEU_BUOC[b] ?? 'chinh'} onClick={() => lam(b)}>
            {b === 'chuyenTienDamBao' ? `${NHAN_BUOC[b]} ${vnd(don.conPhaiTra)} đ` : NHAN_BUOC[b]}
          </Nut>
        ))}
      </div>
      {bao && <p role="status" className={bao.loi ? 'tp-bao' : 'tp-bao thong-tin'}>{bao.noiDung}</p>}
    </div>
  );
}
