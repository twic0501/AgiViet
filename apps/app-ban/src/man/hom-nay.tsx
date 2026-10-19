// Hôm nay: việc cần làm trước, nhắc cách ly, thời tiết, số liệu tuần; tổng kết tuần; thông báo.
import { Bao, Chip, dong, gioNgay, Icon, luong, Nut, NutLink, The, TheLink, TrangTrong, tuongDoi } from '@agiviet/giao-dien';
import { thongBao, viecCanLam } from '@agiviet/may-chu';
import { hoSoNguonGoc, ngayCua, tongKetTuan, viecTiep } from '@agiviet/nghiep-vu';
import type { ComponentType } from 'react';
import { Khung, TheDon, useToi } from '../chung.tsx';

/** Dự báo mô phỏng (cố định theo ngày để không đổi mỗi lần mở). */
function thoiTiet(bayGio: number) {
  return [0, 1, 2].map(i => {
    const ngay = ngayCua(bayGio + i * 864e5);
    const h = [...ngay].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) % 100;
    const mua = h % 3 === 0;
    return { ngay, mua, nhiet: 27 + (h % 7), luong: mua ? 5 + (h % 30) : 0 };
  });
}

function HomNay() {
  const { nguoi, hoSo, so, bayGio, lam } = useToi();
  const viec = viecCanLam(so, nguoi, bayGio);
  const tuan = tongKetTuan(so, nguoi.id, bayGio).nay;
  const cachLy = so.vuon.filter(v => v.ban.id === nguoi.id).map(v => ({ v, h: hoSoNguonGoc(so, v.id, bayGio)! })).filter(x => x.h.dangCachLy);
  const tong = viec.don.length + viec.loiMoi.length + viec.baoGia.length + viec.hen.length + viec.deNghi.length + viec.loSapAn.length;
  const tenKia = (kn: string) => { const k = so.ketNoi.find(x => x.id === kn); return k?.mua.ten ?? ''; };
  return (
    <Khung>
      <div className="chong hep"><span className="phu">Chào</span><h1 style={{ fontSize: 'var(--co-tieu-de-lon)' }}>{hoSo.ten}</h1></div>
      {hoSo.xacMinh !== 'da_xac_minh' && <TheLink den="/xac-minh" vien="lam"><div className="hang ngang"><Icon ten="identity" /><span className="grow">{hoSo.xacMinh === 'cho_duyet' ? 'Đang chờ duyệt xác minh. Bên mua sẽ thấy huy hiệu "đã xác minh" khi xong.' : 'Chưa xác minh. Chụp căn cước để bên mua tin tưởng hơn.'}</span></div></TheLink>}
      <div className="luoi-2">
        <NutLink den="/ghi" kieu="phu"><Icon ten="microphone" />Nói để ghi</NutLink>
        <NutLink den="/dang"><Icon ten="plus" />Đăng hàng</NutLink>
      </div>
      <section className="chong" aria-label="Việc cần làm">
        <h2>Việc cần làm {tong ? <span className="phu so">({tong})</span> : null}</h2>
        {!tong && <TrangTrong tieuDe="Chưa có việc nào cần bạn làm">Đơn, lời mời, báo giá cần bạn trả lời sẽ hiện ở đây.</TrangTrong>}
        {viec.don.map(d => <div key={d.ma} className="chong hep"><TheDon don={d} bayGio={bayGio} /><span className="nho phu" style={{ paddingInline: 4 }}>{viecTiep(d, 'ban')}</span></div>)}
        {viec.deNghi.map(d => <TheLink key={d.id} den={`/chi-tiet-don?ma=${encodeURIComponent(d.donMa)}`} vien="lam"><strong>{d.donMa}: bên mua đề nghị {d.loai === 'doi_lich' ? 'đổi ngày giao' : d.loai === 'giam_luong' ? 'giảm lượng' : 'đổi giá'}</strong><span className="nho phu">{d.lyDo}</span></TheLink>)}
        {viec.loiMoi.map(k => <TheLink key={k.id} den={`/ket-noi?kn=${k.id}`} vien="lam"><strong>{k.mua.ten} {k.tu === 'mua' ? 'muốn kết nối' : ''}</strong><span className="nho phu">{so.lo.find(l => l.id === k.loId)?.ten} · {tuongDoi(k.guiLuc, bayGio)}</span></TheLink>)}
        {viec.baoGia.map(b => <TheLink key={b.id} den={`/bao-gia?kn=${b.ketNoiId}`} vien="lam"><strong>{tenKia(b.ketNoiId)} gửi báo giá {dong(b.gia)}/kg</strong><span className="nho phu">{luong(b.kg)} · giao {b.ngayGiao.split('-').reverse().join('/')}</span></TheLink>)}
        {viec.hen.map(h => <TheLink key={h.id} den={`/hen-xem?kn=${h.ketNoiId}`} vien="lam"><strong>{tenKia(h.ketNoiId)} đề nghị hẹn xem vườn</strong><span className="nho phu">{h.luc.replace('T', ' lúc ')}</span></TheLink>)}
        {viec.loSapAn.map(l => (
          <The key={l.id} vien="lam">
            <strong>Tin {l.ten} {l.tinhTrang === 'da_an' ? 'đã tự ẩn' : 'sắp tự ẩn'}</strong>
            <span className="nho phu">Bên mua chỉ thấy lô khi bạn xác nhận còn hàng trong 14 ngày.</span>
            <Nut nho onClick={() => lam({ loai: 'con_hang', loId: l.id }, { bao: 'Đã xác nhận còn hàng. Tin hiện lại 14 ngày.' })}>Vẫn còn hàng</Nut>
          </The>
        ))}
      </section>
      {cachLy.map(({ v, h }) => <Bao key={v.id} kieu="vang">{v.ten} đang trong thời gian cách ly thuốc tới hết {h.cachLy!.split('-').reverse().join('/')}. Chưa hái bán trước ngày này.</Bao>)}
      <The>
        <div className="hang giua"><h2>Thời tiết 3 ngày</h2><Chip>dự báo mô phỏng</Chip></div>
        <div className="luoi-3">{thoiTiet(bayGio).map((t, i) => <div key={t.ngay} className="chong hep" style={{ alignItems: 'center' }}><span className="nho phu">{i === 0 ? 'Hôm nay' : t.ngay.split('-').reverse().slice(0, 2).join('/')}</span><Icon ten={t.mua ? 'rain' : 'sun'} co={30} /><strong className="so">{t.nhiet}°C</strong><span className="nho phu">{t.mua ? `mưa ${t.luong} mm` : 'nắng'}</span></div>)}</div>
        {thoiTiet(bayGio).some(t => t.mua) && <span className="nho">Có mưa trong 3 ngày tới: tránh phun thuốc, che hàng đã hái.</span>}
      </The>
      <TheLink den="/tong-ket-tuan">
        <div className="hang giua"><h2>7 ngày qua</h2><Icon ten="report" /></div>
        <div className="luoi-3">
          <div className="chong hep"><span className="nho phu">Đã bán</span><strong className="so">{luong(tuan.daBanKg)}</strong></div>
          <div className="chong hep"><span className="nho phu">Đã thu</span><strong className="so">{dong(tuan.daThu)}</strong></div>
          <div className="chong hep"><span className="nho phu">Đã chi</span><strong className="so">{dong(tuan.daChi)}</strong></div>
        </div>
      </TheLink>
    </Khung>
  );
}

function TongKetTuan() {
  const { nguoi, so, bayGio } = useToi();
  const { nay, truoc } = tongKetTuan(so, nguoi.id, bayGio);
  const so2 = (a: number, b: number) => (b ? `${a >= b ? 'tăng' : 'giảm'} ${Math.abs(Math.round(((a - b) / b) * 100))}% so với tuần trước` : 'tuần trước chưa có');
  const dongTk = (nhan: string, a: number, b: number, kieu: 'tien' | 'kg' = 'tien') => (
    <The key={nhan}><span className="phu">{nhan}</span><span className="so-lon">{kieu === 'kg' ? luong(a) : dong(a)}</span><span className="nho phu">{so2(a, b)}</span></The>
  );
  return (
    <Khung>
      <p className="phu">7 ngày tới {gioNgay(bayGio)}. Tiền thu gồm tiền bán qua app (đơn đã nhận đủ) và khoản thu bạn tự ghi.</p>
      {dongTk('Đã bán', nay.daBanKg, truoc.daBanKg, 'kg')}
      {dongTk('Đã thu', nay.daThu, truoc.daThu)}
      {dongTk('Đã chi', nay.daChi, truoc.daChi)}
      <The noi><span className="phu">Lời tạm tính</span><span className="so-lon" style={{ color: nay.loi >= 0 ? 'var(--mau-chinh)' : 'var(--mau-gach)' }}>{dong(nay.loi)}</span><span className="nho phu">{nay.soDon} đơn hoàn tất trong tuần</span></The>
      <NutLink den="/thu-chi" kieu="phu">Xem sổ thu chi</NutLink>
    </Khung>
  );
}

function ThongBaoMan() {
  const { nguoi, so, bayGio } = useToi();
  const ds = thongBao(so, nguoi);
  const homNay = ngayCua(bayGio);
  const ICON: Record<string, string> = { don: 'order', ket_noi: 'people', tin: 'chat', bao_gia: 'quote', hen: 'appointment', he_thong: 'bell' };
  const nhom = [['Hôm nay', ds.filter(t => ngayCua(t.luc) === homNay)], ['Trước đó', ds.filter(t => ngayCua(t.luc) !== homNay)]] as const;
  return (
    <Khung>
      {!ds.length && <TrangTrong tieuDe="Chưa có thông báo">Khi bên mua gửi lời mời, nhắn tin, đặt cọc, nhập cân, chuyển tiền… thông báo hiện ở đây.</TrangTrong>}
      {nhom.filter(([, d]) => d.length).map(([ten, d]) => (
        <section key={ten} className="chong">
          <h2>{ten}</h2>
          {d.map((t, i) => <TheLink key={i} den={`/${t.man}`}><div className="hang ngang"><Icon ten={ICON[t.loai] ?? 'bell'} /><span className="grow">{t.noiDung}</span></div><span className="nho phu">{tuongDoi(t.luc, bayGio)}</span></TheLink>)}
        </section>
      ))}
    </Khung>
  );
}

export const MAN_HOM_NAY: Record<string, ComponentType> = { 'hom-nay': HomNay, 'tong-ket-tuan': TongKetTuan, 'thong-bao': ThongBaoMan };
