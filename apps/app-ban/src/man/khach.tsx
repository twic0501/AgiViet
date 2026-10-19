// Khách: lời mời, cần mua (chào hàng), trả lời kết nối, hồ sơ bên mua, nhắn tin (che liên lạc), báo giá, hẹn xem vườn, báo cáo.
import { Bao, Chip, ChonNut, Dong, docSo, Icon, luong, Nut, NutLink, O, Sao, so as dinhSo, Tab, The, TheLink, TrangTrong, tuongDoi, useMayChu } from '@agiviet/giao-dien';
import { baoGiaCua, henCua, hoSoCongKhai, ketNoiCuaToi, lienLacCua, nhuCauPhuHop, tinNhanCua, type HoSoCongKhai } from '@agiviet/may-chu';
import { conBan, ngayCua, NHAN_BAC, type BaoCaoViPham, type KetNoi } from '@agiviet/nghiep-vu';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { Khung, useThamSo, useToi } from '../chung.tsx';

const pct = (x: number | null) => (x === null ? 'chưa có' : `${Math.round(x * 100)}%`);

function TheBenMua({ hs, den, them }: { hs: HoSoCongKhai | null; den?: string; them?: React.ReactNode }) {
  if (!hs) return null;
  const noi = (
    <>
      <div className="hang ngang"><span className="anh-mh" style={{ display: 'grid', placeItems: 'center', background: 'var(--mau-song-nhat)', color: 'var(--mau-song)' }}><Icon ten="warehouse" co={30} /></span>
        <div className="grow chong hep"><strong>{hs.ten}</strong><span className="nho phu">{hs.toChuc?.loaiHinh ?? 'Bên mua'} · {hs.vung || 'chưa ghi vùng'}</span>
          <div className="hang">{hs.daXacMinh && <Chip kieu="xong">Đã xác minh</Chip>}<Chip>Uy tín {NHAN_BAC[hs.uyTin.bac]}</Chip>{hs.uyTin.diemDanhGia !== null && <Chip>{hs.uyTin.diemDanhGia.toFixed(1)} ★</Chip>}</div>
        </div></div>
      {them}
    </>
  );
  return den ? <TheLink den={den}>{noi}</TheLink> : <The>{noi}</The>;
}

function Khach() {
  const { nguoi, so, bayGio } = useToi();
  const [tab, setTab] = useState<'cho' | 'dang' | 'gui' | 'dong'>('cho');
  const kn = ketNoiCuaToi(so, nguoi);
  const ds = {
    cho: kn.filter(k => k.trangThai === 'cho' && k.tu === 'mua'),
    dang: kn.filter(k => k.trangThai === 'dong_y'),
    gui: kn.filter(k => k.trangThai === 'cho' && k.tu === 'ban'),
    dong: kn.filter(k => k.trangThai === 'tu_choi' || k.trangThai === 'rut'),
  };
  const tinCuoi = (k: KetNoi) => so.tinNhan.filter(t => t.ketNoiId === k.id).at(-1);
  return (
    <Khung>
      <Bao kieu="thong-tin">Bạn thấy tên tổ chức, vùng, uy tín của bên mua. Số điện thoại hai bên chỉ mở khi bên mua đặt cọc.</Bao>
      <NutLink den="/nhu-cau" kieu="phu"><Icon ten="demand" />Tin cần mua phù hợp với hàng của bạn</NutLink>
      <Tab value={tab} onChange={setTab} ds={[{ gt: 'cho', nhan: 'Chờ trả lời', so: ds.cho.length }, { gt: 'dang', nhan: 'Đang trao đổi' }, { gt: 'gui', nhan: 'Đã chào' }, { gt: 'dong', nhan: 'Đã đóng' }]} />
      {!ds[tab].length && <TrangTrong tieuDe={tab === 'cho' ? 'Chưa có lời mời mới' : 'Chưa có ai'}>{tab === 'cho' ? 'Khi bên mua muốn kết nối với lô của bạn, lời mời hiện ở đây.' : ''}</TrangTrong>}
      {ds[tab].map(k => {
        const t = tinCuoi(k), lo = so.lo.find(l => l.id === k.loId);
        return <TheBenMua key={k.id} hs={hoSoCongKhai(so, k.mua.id)} den={k.trangThai === 'cho' && k.tu === 'mua' ? `/ket-noi?kn=${k.id}` : `/chat?kn=${k.id}`}
          them={<><span className="nho">Lô {lo?.ten ?? '—'}{k.nhuCauId ? ' · bạn chào hàng' : ''}</span>{t && <span className="nho phu">{t.vai === 'ban' ? 'Bạn: ' : ''}{t.noiDung.slice(0, 70)} · {tuongDoi(t.luc, bayGio)}</span>}</>} />;
      })}
    </Khung>
  );
}

function CanMua() {
  const { nguoi, so, bayGio, lam } = useToi();
  const ds = nhuCauPhuHop(so, nguoi);
  const loCuaToi = so.lo.filter(l => l.ban.id === nguoi.id && conBan(l) > 0);
  const [mo, setMo] = useState<string | null>(null);
  const [chon, setChon] = useState({ lo: '', loiNhan: '' });
  return (
    <Khung>
      {!ds.length && <TrangTrong tieuDe="Chưa có tin cần mua">Bên mua đăng tin cần mua; tin đúng mặt hàng của bạn xếp lên đầu.</TrangTrong>}
      {ds.map(n => {
        const hs = hoSoCongKhai(so, n.mua.id);
        const goiY = loCuaToi.filter(l => l.matHang === n.matHang);
        return (
          <The key={n.id} {...(n.hop ? { vien: 'lam' as const } : {})}>
            <div className="hang giua"><strong>Cần {luong(n.kg)} {n.ten}</strong>{n.hop && <Chip kieu="lam">Đúng hàng của bạn</Chip>}</div>
            <span className="nho phu">{hs?.ten} · {hs?.vung} · uy tín {hs ? NHAN_BAC[hs.uyTin.bac] : ''}</span>
            <Dong nhan="Nhận hàng">{n.tu.split('-').reverse().slice(0, 2).join('/')} – {n.den.split('-').reverse().slice(0, 2).join('/')}</Dong>
            {n.giaTran && <Dong nhan="Giá trần">{dinhSo(n.giaTran)} đ/kg</Dong>}
            {Object.entries(n.thuocTinh).map(([k, v]) => <Dong key={k} nhan={k === 'loai' ? 'Loại' : k}>{v}</Dong>)}
            {n.ghiChu && <span className="nho">{n.ghiChu}</span>}
            <span className="nho phu">Đăng {tuongDoi(n.dangLuc, bayGio)}</span>
            {n.daChao ? <Chip kieu="xong">Đã chào hàng</Chip> : mo === n.id ? (
              <div className="chong">
                {!loCuaToi.length ? <Bao kieu="vang">Bạn chưa có lô còn hàng để chào. Đăng lô trước.</Bao> : <>
                  <ChonNut nhan="Chào bằng lô" value={chon.lo || goiY[0]?.id || loCuaToi[0]!.id} onChange={x => setChon({ ...chon, lo: x })} luaChon={(goiY.length ? goiY : loCuaToi).map(l => ({ gt: l.id, nhan: `${l.ten} · còn ${luong(conBan(l))}` }))} />
                  <O nhan="Lời nhắn" value={chon.loiNhan} onChange={x => setChon({ ...chon, loiNhan: x })} placeholder="Hàng bao trái, hái được tuần này" />
                  <div className="luoi-2"><Nut kieu="phu" onClick={() => setMo(null)}>Thôi</Nut><Nut onClick={() => { const kq = lam({ loai: 'chao_hang', nhuCauId: n.id, loId: chon.lo || goiY[0]?.id || loCuaToi[0]!.id, loiNhan: chon.loiNhan }, { bao: 'Đã chào hàng. Bên mua đồng ý thì hai bên trao đổi được.' }); if (kq.ok) setMo(null); }}>Gửi chào hàng</Nut></div>
                </>}
              </div>
            ) : <Nut onClick={() => { setMo(n.id); setChon({ lo: '', loiNhan: '' }); }}>Chào hàng</Nut>}
          </The>
        );
      })}
    </Khung>
  );
}

function useKetNoi() {
  const { nguoi, so } = useToi();
  const id = useThamSo('kn');
  return so.ketNoi.find(k => k.id === id && k.ban.id === nguoi.id);
}
const KhongCoKetNoi = () => <Khung><TrangTrong tieuDe="Không tìm thấy cuộc trao đổi" hanhDong={<NutLink den="/khach">Về Khách</NutLink>} /></Khung>;

function KetNoiMan() {
  const { so, bayGio, lam } = useToi();
  const di = useNavigate();
  const kn = useKetNoi();
  if (!kn) return <KhongCoKetNoi />;
  const hs = hoSoCongKhai(so, kn.mua.id);
  const lo = so.lo.find(l => l.id === kn.loId);
  return (
    <Khung duoi={kn.trangThai === 'cho' && kn.tu === 'mua' ? <>
      <Nut rong onClick={() => lam({ loai: 'tra_loi_ket_noi', ketNoiId: kn.id, dongY: true }, { bao: 'Đã đồng ý. Hai bên nhắn tin, báo giá được.', den: `/chat?kn=${kn.id}` })}>Đồng ý nói chuyện</Nut>
      <div className="luoi-2"><Nut kieu="phu" onClick={() => lam({ loai: 'tra_loi_ket_noi', ketNoiId: kn.id, dongY: false }, { bao: 'Đã từ chối. Bên mua không bị báo lý do.', den: '/khach' })}>Không, cảm ơn</Nut><NutLink den={`/bao-cao?nguoi=${kn.mua.id}`} kieu="nhe">Báo cáo hoặc chặn</NutLink></div>
    </> : <NutLink den={`/chat?kn=${kn.id}`} rong>Mở trao đổi</NutLink>}>
      <TheBenMua hs={hs} den={`/ho-so-ben-mua?id=${kn.mua.id}`} />
      {hs && <The><Dong nhan="Đơn đã hoàn tất">{hs.uyTin.soDonXong}</Dong><Dong nhan="Trả tiền đúng hạn">{pct(hs.uyTin.tyLeTraDungHan)}</Dong><Dong nhan="Tranh chấp">{hs.uyTin.soTranhChap}</Dong></The>}
      <The>
        <span className="nho phu">{kn.tu === 'mua' ? 'Muốn kết nối về lô' : 'Bạn chào hàng lô'} · {tuongDoi(kn.guiLuc, bayGio)}</span>
        <strong>{lo?.ten} · còn {lo ? luong(conBan(lo)) : ''}</strong>
        {kn.loiNhan && <p>"{kn.loiNhan}"</p>}
      </The>
      {kn.trangThai !== 'cho' && <Bao kieu={kn.trangThai === 'dong_y' ? 'tot' : 'thong-tin'}>{kn.trangThai === 'dong_y' ? 'Đã đồng ý kết nối.' : 'Kết nối đã đóng.'}</Bao>}
      <Nut kieu="nhe" onClick={() => di(-1)}>Quay lại</Nut>
    </Khung>
  );
}

function HoSoBenMua() {
  const { nguoi, so } = useToi();
  const id = useThamSo('id');
  const hs = hoSoCongKhai(so, id);
  if (!hs || hs.vai !== 'mua') return <Khung><TrangTrong tieuDe="Không tìm thấy bên mua" /></Khung>;
  const nhanXet = so.danhGia.filter(g => g.cho.id === id);
  const donVoiToi = so.don.filter(d => d.mua.id === id && d.ban.id === nguoi.id);
  return (
    <Khung>
      <TheBenMua hs={hs} />
      <The>
        <Dong nhan="Tham gia từ">{new Date(hs.thamGia).getFullYear()}</Dong>
        <Dong nhan="Đơn đã hoàn tất">{hs.uyTin.soDonXong}</Dong>
        <Dong nhan="Trả tiền trong 3 ngày sau chốt cân">{pct(hs.uyTin.tyLeTraDungHan)}</Dong>
        <Dong nhan="Hủy đơn sau khi cọc">{hs.uyTin.soHuyDoMinh}</Dong>
        <Dong nhan="Đơn có tranh chấp">{hs.uyTin.soTranhChap}</Dong>
      </The>
      <section className="chong"><h2>Nhận xét từ người bán ({nhanXet.length})</h2>{!nhanXet.length && <span className="phu">Chưa có nhận xét.</span>}{nhanXet.map(g => <The key={g.id}><Sao value={g.diem} /><span>{g.nhanXet || 'Không ghi nhận xét'}</span><span className="nho phu">{g.tu.ten} · {g.donMa}</span></The>)}</section>
      <section className="chong"><h2>Đơn với bạn ({donVoiToi.length})</h2>{donVoiToi.map(d => <TheLink key={d.ma} den={`/chi-tiet-don?ma=${encodeURIComponent(d.ma)}`}><strong>{d.ma} · {d.tenLo}</strong><span className="nho phu">{luong(d.kg)} × {dinhSo(d.gia)} đ</span></TheLink>)}</section>
    </Khung>
  );
}

function Chat() {
  const { nguoi, so, bayGio, lam } = useToi();
  const { bao } = useMayChu();
  const kn = useKetNoi();
  const [chu, setChu] = useState('');
  const cuoi = useRef<HTMLDivElement>(null);
  const tin = kn ? tinNhanCua(so, kn.id) : [];
  useEffect(() => { cuoi.current?.scrollIntoView({ block: 'end' }); }, [tin.length]);
  if (!kn) return <KhongCoKetNoi />;
  const lienLac = lienLacCua(so, nguoi, kn.mua.id);
  const lo = so.lo.find(l => l.id === kn.loId);
  const gui = () => { const kq = lam({ loai: 'gui_tin', ketNoiId: kn.id, noiDung: chu }); if (kq.ok) setChu(''); };
  return (
    <Khung duoi={kn.trangThai === 'dong_y' ? <div className="hang ngang"><div className="grow"><O nhan="Tin nhắn" value={chu} onChange={setChu} placeholder="Nhắn cho bên mua" /></div><Nut onClick={gui} disabled={!chu.trim()} style={{ alignSelf: 'flex-end' }}>Gửi</Nut></div> : undefined}>
      <div className="hang giua"><strong>{kn.mua.ten}</strong><span className="nho phu">Lô {lo?.ten}</span></div>
      {lienLac ? <Bao kieu="tot">Đã mở liên lạc: {lienLac.ten} · {lienLac.sdt}</Bao> : <Bao kieu="thong-tin">Số điện thoại, Zalo, đường dẫn trong tin nhắn được che tới khi bên mua đặt cọc. Gọi qua app thì hai bên không thấy số của nhau.</Bao>}
      <div className="luoi-3">
        <Nut kieu="phu" nho onClick={() => bao('Cuộc gọi qua app (mô phỏng): số của hai bên được che.')}><Icon ten="call" co={18} />Gọi</Nut>
        <NutLink den={`/bao-gia?kn=${kn.id}`} kieu="phu" nho>Báo giá</NutLink>
        <NutLink den={`/hen-xem?kn=${kn.id}`} kieu="phu" nho>Hẹn xem</NutLink>
      </div>
      {kn.trangThai !== 'dong_y' && <Bao kieu="vang">Kết nối chưa được đồng ý: chưa nhắn tin được.</Bao>}
      <div className="chong">
        {!tin.length && <span className="phu" style={{ textAlign: 'center' }}>Chưa có tin nhắn.</span>}
        {tin.map(t => (
          <div key={t.id} className={`bong-tin ${t.vai === 'ban' ? 'minh' : ''}`}>
            <span>{t.noiDung}</span>
            {t.biChe.length > 0 && <span className="nho phu" style={{ display: 'block' }}>App đã che liên lạc trong tin này. Giao dịch ngoài app không được bảo vệ.</span>}
            <span className="nho phu" style={{ display: 'block' }}>{tuongDoi(t.luc, bayGio)}</span>
          </div>
        ))}
        <div ref={cuoi} />
      </div>
    </Khung>
  );
}

function BaoGia() {
  const { so, bayGio, lam } = useToi();
  const kn = useKetNoi();
  const lo = kn ? so.lo.find(l => l.id === kn.loId) : undefined;
  const [f, setF] = useState({ gia: lo?.gia ? String(lo.gia) : '', kg: lo ? String(Math.min(conBan(lo), 1000)) : '', ngay: ngayCua(bayGio + 3 * 864e5), ghiChu: '' });
  if (!kn) return <KhongCoKetNoi />;
  const ds = baoGiaCua(so, kn.id).slice().reverse();
  const NHAN = { cho: ['Chờ trả lời', 'lam'], dong_y: ['Đã chốt', 'xong'], tu_choi: ['Không đồng ý', 'loi'], het: ['Đã thay bằng báo giá mới', undefined] } as const;
  return (
    <Khung>
      <span className="phu">{kn.mua.ten} · lô {lo?.ten}</span>
      {ds.map(b => (
        <The key={b.id} {...(b.trangThai === 'cho' && b.tu === 'mua' ? { vien: 'lam' as const } : {})}>
          <div className="hang giua"><strong>{b.tu === 'ban' ? 'Bạn báo' : `${kn.mua.ten} báo`} {dinhSo(b.gia)} đ/kg</strong><Chip {...(NHAN[b.trangThai][1] ? { kieu: NHAN[b.trangThai][1] } : {})}>{NHAN[b.trangThai][0]}</Chip></div>
          <span className="nho">{luong(b.kg)} · giao {b.ngayGiao.split('-').reverse().join('/')} · {tuongDoi(b.luc, bayGio)}</span>
          {b.ghiChu && <span className="nho phu">{b.ghiChu}</span>}
          {b.trangThai === 'cho' && b.tu === 'mua' && <div className="luoi-2"><Nut kieu="phu" onClick={() => lam({ loai: 'tra_loi_bao_gia', baoGiaId: b.id, dongY: false }, { bao: 'Đã trả lời không đồng ý.' })}>Không đồng ý</Nut><Nut onClick={() => lam({ loai: 'tra_loi_bao_gia', baoGiaId: b.id, dongY: true }, { bao: 'Đã chốt giá. Bên mua tạo đơn theo báo giá này.' })}>Đồng ý giá này</Nut></div>}
          {b.trangThai === 'dong_y' && <span className="nho">{so.don.some(d => d.baoGiaId === b.id) ? 'Bên mua đã tạo đơn theo báo giá này.' : 'Chờ bên mua tạo đơn theo báo giá này.'}</span>}
        </The>
      ))}
      {kn.trangThai === 'dong_y' && <The>
        <h2>{ds.some(b => b.tu === 'mua') ? 'Gửi giá khác' : 'Gửi báo giá'}</h2>
        <div className="luoi-2"><O nhan="Giá" kieu="so" donVi="đ/kg" value={f.gia} onChange={x => setF({ ...f, gia: x })} /><O nhan="Lượng" kieu="so" donVi="kg" value={f.kg} onChange={x => setF({ ...f, kg: x })} /></div>
        <O nhan="Ngày giao" kieu="ngay" value={f.ngay} onChange={x => setF({ ...f, ngay: x })} />
        <O nhan="Ghi chú (loại, cách giao)" value={f.ghiChu} onChange={x => setF({ ...f, ghiChu: x })} placeholder="Loại 1, giao tại vườn" />
        <Nut onClick={() => lam({ loai: 'gui_bao_gia', ketNoiId: kn.id, gia: docSo(f.gia), kg: docSo(f.kg), ngayGiao: f.ngay, ghiChu: f.ghiChu }, { bao: 'Đã gửi báo giá.' })}>Gửi báo giá</Nut>
      </The>}
    </Khung>
  );
}

function HenXem() {
  const { hoSo, so, bayGio, lam } = useToi();
  const kn = useKetNoi();
  const [f, setF] = useState({ luc: `${ngayCua(bayGio + 864e5)}T08:00`, ghiChu: '' });
  if (!kn) return <KhongCoKetNoi />;
  const ds = henCua(so, kn.id).slice().reverse();
  const ap = hoSo.diaChi.split(',')[0]?.trim();
  return (
    <Khung>
      <Bao kieu="thong-tin">Địa chỉ gửi cho bên mua đến cấp ấp: {[ap, hoSo.vung].filter(Boolean).join(', ')}. Số nhà, số điện thoại chỉ mở khi có đơn đặt cọc; gọi qua app để chỉ đường.</Bao>
      {ds.map(h => (
        <The key={h.id} {...(h.trangThai === 'cho' && h.tu === 'mua' ? { vien: 'lam' as const } : {})}>
          <div className="hang giua"><strong>{h.luc.slice(0, 10).split('-').reverse().join('/')} lúc {h.luc.slice(11, 16)}</strong><Chip {...(h.trangThai === 'dong_y' ? { kieu: 'xong' as const } : h.trangThai === 'cho' ? { kieu: 'lam' as const } : {})}>{h.trangThai === 'cho' ? 'Chờ trả lời' : h.trangThai === 'dong_y' ? 'Đã hẹn' : h.trangThai === 'huy' ? 'Đã hủy' : 'Không đồng ý'}</Chip></div>
          <span className="nho phu">{h.tu === 'ban' ? 'Bạn đề nghị' : `${kn.mua.ten} đề nghị`}{h.ghiChu ? ` · ${h.ghiChu}` : ''}</span>
          {h.trangThai === 'cho' && h.tu === 'mua' && <div className="luoi-2"><Nut kieu="phu" onClick={() => lam({ loai: 'tra_loi_hen', henId: h.id, dongY: false }, { bao: 'Đã trả lời không đồng ý.' })}>Không tiện</Nut><Nut onClick={() => lam({ loai: 'tra_loi_hen', henId: h.id, dongY: true }, { bao: 'Đã đồng ý lịch hẹn.' })}>Đồng ý lịch này</Nut></div>}
          {(h.trangThai === 'dong_y' || (h.trangThai === 'cho' && h.tu === 'ban')) && <Nut kieu="nhe" nho onClick={() => lam({ loai: 'huy_hen', henId: h.id }, { bao: 'Đã hủy lịch hẹn.' })}>Hủy hẹn</Nut>}
        </The>
      ))}
      {kn.trangThai === 'dong_y' && !ds.some(h => h.trangThai === 'cho') && <The>
        <h2>Đề nghị giờ hẹn</h2>
        <O nhan="Ngày giờ" kieu="gio" value={f.luc} onChange={x => setF({ ...f, luc: x })} />
        <O nhan="Ghi chú" value={f.ghiChu} onChange={x => setF({ ...f, ghiChu: x })} placeholder="Đến cổng ấp, gọi qua app" />
        <Nut onClick={() => lam({ loai: 'de_nghi_hen', ketNoiId: kn.id, luc: f.luc, ghiChu: f.ghiChu }, { bao: 'Đã gửi đề nghị hẹn.' })}>Gửi đề nghị</Nut>
      </The>}
    </Khung>
  );
}

function BaoCao() {
  const { so, lam } = useToi();
  const nguoiId = useThamSo('nguoi'), loId = useThamSo('lo'), tinId = useThamSo('tin');
  const doiTuong: BaoCaoViPham['doiTuong'] = tinId ? { loai: 'tin_nhan', id: tinId } : loId ? { loai: 'lo', id: loId } : { loai: 'nguoi', id: nguoiId };
  const ten = hoSoCongKhai(so, nguoiId)?.ten ?? so.lo.find(l => l.id === loId)?.ten ?? 'tin nhắn';
  const [lyDo, setLyDo] = useState('Hỏi giá rồi không mua, làm phiền');
  const [moTa, setMoTa] = useState('');
  return (
    <Khung duoi={<Nut rong onClick={() => lam({ loai: 'bao_cao_vi_pham', doiTuong, lyDo: `${lyDo}${moTa ? `: ${moTa}` : ''}` }, { bao: 'Đã gửi báo cáo. Đội AgiViet xem trong 24 giờ.', den: '/khach' })}>Gửi báo cáo</Nut>}>
      <p className="phu">Báo cáo {ten}. Bên kia không biết ai báo cáo.</p>
      <ChonNut nhan="Lý do" value={lyDo} onChange={setLyDo} luaChon={['Hỏi giá rồi không mua, làm phiền', 'Đòi giao dịch ngoài app', 'Lừa đảo, giả danh', 'Lời lẽ xúc phạm', 'Khác'].map(x => ({ gt: x, nhan: x }))} />
      <O nhan="Mô tả thêm" kieu="chu-dai" value={moTa} onChange={setMoTa} />
      <label className="tp-nut phu"><Icon ten="image" />Thêm ảnh chụp màn hình<input type="file" accept="image/*" className="an-man" onChange={e => setMoTa(m => `${m}${m ? ' ' : ''}[ảnh: ${e.target.files?.[0]?.name}]`)} /></label>
    </Khung>
  );
}

export const MAN_KHACH: Record<string, ComponentType> = {
  khach: Khach, 'nhu-cau': CanMua, 'ket-noi': KetNoiMan, 'ho-so-ben-mua': HoSoBenMua, chat: Chat, 'bao-gia': BaoGia, 'hen-xem': HenXem, 'bao-cao': BaoCao,
};
