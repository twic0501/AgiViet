// Hàng đang bán: danh sách lô, chi tiết lô, báo lượng còn lại, sắp có hàng, chứng từ, lô gộp nhiều hộ.
import { mauCua, timMatHang } from '@agiviet/danh-muc';
import { Bao, Chip, ChonNut, dong, Dong, docSo, Icon, luong, Nut, NutHoiLai, NutLink, O, so as dinhSo, Tab, The, TheLink, TrangTrong, useMayChu } from '@agiviet/giao-dien';
import { loCuaToi } from '@agiviet/may-chu';
import { conBan, hetCachLy, ngayCua, tinhTrangLo } from '@agiviet/nghiep-vu';
import { useState, type ComponentType } from 'react';
import { anhNho } from '../anh-chup.ts';
import { AnhMH, ChipLo, Khung, TheDon, TheLo, useThamSo, useToi } from '../chung.tsx';
import { ChonNhieuMatHang } from './bat-dau.tsx';

function Hang() {
  const { nguoi, so, bayGio } = useToi();
  const [tab, setTab] = useState<'ban' | 'het' | 'tat'>('ban');
  const ds = loCuaToi(so, nguoi, bayGio);
  const loc = ds.filter(l => (tab === 'tat' ? true : tab === 'ban' ? ['dang_ban', 'con_it', 'sap_an'].includes(l.tinhTrang) : ['da_an', 'da_chot_het'].includes(l.tinhTrang)));
  const soKhach = (id: string) => so.ketNoi.filter(k => k.loId === id && ['cho', 'dong_y'].includes(k.trangThai)).length;
  return (
    <Khung>
      <div className="luoi-3">
        <NutLink den="/dang" nho><Icon ten="plus" co={18} />Đăng</NutLink>
        <NutLink den="/sap-co-hang" kieu="phu" nho>Sắp có</NutLink>
        <NutLink den="/lo-gop" kieu="phu" nho>Lô gộp</NutLink>
      </div>
      <Tab value={tab} onChange={setTab} ds={[{ gt: 'ban', nhan: 'Đang bán', so: ds.filter(l => ['dang_ban', 'con_it', 'sap_an'].includes(l.tinhTrang)).length }, { gt: 'het', nhan: 'Hết, ẩn' }, { gt: 'tat', nhan: 'Tất cả' }]} />
      {!loc.length && <TrangTrong tieuDe={tab === 'ban' ? 'Chưa có lô nào đang bán' : 'Không có lô nào'} hanhDong={tab === 'ban' ? <NutLink den="/dang">Đăng hàng</NutLink> : undefined}>Chụp ảnh hoặc nói để đăng một lô. Bên mua tìm thấy lô đang bán và còn lượng.</TrangTrong>}
      {loc.map(l => <TheLo key={l.id} lo={l} tinhTrang={l.tinhTrang} conBan={l.conBanDuoc} soKhach={soKhach(l.id)} />)}
    </Khung>
  );
}

function useLo() {
  const { nguoi, so, bayGio } = useToi();
  const id = useThamSo('lo');
  const lo = so.lo.find(l => l.id === id && l.ban.id === nguoi.id);
  return lo ? { lo, tinhTrang: tinhTrangLo(lo, bayGio, so.chinhSach.hanHienThiLo) } : null;
}
const KhongCoLo = () => <Khung><TrangTrong tieuDe="Không tìm thấy lô" hanhDong={<NutLink den="/hang">Về Hàng đang bán</NutLink>} /></Khung>;

function ChiTietLo() {
  const { so, bayGio, lam } = useToi();
  const x = useLo();
  const [gia, setGia] = useState<string | null>(null);
  if (!x) return <KhongCoLo />;
  const { lo, tinhTrang } = x;
  const anhLo = lo.anh.filter(a => !a.startsWith('giay|'));
  const don = so.don.filter(d => d.loId === lo.id);
  const khach = so.ketNoi.filter(k => k.loId === lo.id && ['cho', 'dong_y'].includes(k.trangThai));
  const mau = mauCua(lo.matHang);
  const cachLy = lo.vuonId ? hetCachLy(so, lo.vuonId) : null;
  return (
    <Khung>
      <AnhMH matHang={lo.matHang} {...(anhLo[0] ? { anh: anhLo[0] } : {})} lon />
      {anhLo.length > 1 && <div className="hang">{anhLo.slice(1).map((a, i) => <AnhMH key={i} matHang={lo.matHang} anh={a} />)}</div>}
      <div className="hang giua"><h1>{lo.ten}</h1><ChipLo t={tinhTrang} /></div>
      {lo.moTa && <p>{lo.moTa}</p>}
      <The>
        <Dong nhan="Lượng lô">{luong(lo.kg)} {lo.coSo === 'da_can' ? 'đã cân' : 'ước tính'}</Dong>
        <Dong nhan="Còn bán được">{luong(conBan(lo))}</Dong>
        <Dong nhan="Đã hứa (đơn đã xác nhận)">{luong(lo.hua)}</Dong>
        <Dong nhan="Đã giao">{luong(lo.giao)}</Dong>
        <Dong nhan="Giá">{lo.gia ? `${dinhSo(lo.gia)} đ/kg` : 'Nhận báo giá'}</Dong>
        {lo.haiTu && <Dong nhan="Ngày hái">{lo.haiTu.split('-').reverse().join('/')}{lo.haiDen ? ` – ${lo.haiDen.split('-').reverse().join('/')}` : ''}</Dong>}
        {mau?.truong.filter(t => lo.thuocTinh[t.ma]).map(t => <Dong key={t.ma} nhan={t.nhan}>{lo.thuocTinh[t.ma]}{t.kieu === 'so' ? ` ${t.donVi}` : ''}</Dong>)}
        {lo.choCheBien && <Chip kieu="cho">Hàng cho chế biến</Chip>}
      </The>
      {cachLy && cachLy > ngayCua(bayGio) && <Bao kieu="vang">Vườn của lô đang cách ly thuốc tới hết {cachLy.split('-').reverse().join('/')}.</Bao>}
      {gia === null
        ? <div className="luoi-2"><Nut kieu="phu" onClick={() => setGia(lo.gia ? String(lo.gia) : '')}>Sửa giá</Nut><NutLink den={`/cap-nhat-luong?lo=${lo.id}`} kieu="phu">Bán bớt / báo lượng</NutLink></div>
        : <The><O nhan="Giá mới (để trống = nhận báo giá)" kieu="so" donVi="đ/kg" value={gia} onChange={setGia} /><div className="luoi-2"><Nut kieu="phu" onClick={() => setGia(null)}>Thôi</Nut><Nut onClick={() => { const kq = lam({ loai: 'sua_lo', loId: lo.id, gia: gia.trim() ? docSo(gia) : null }, { bao: 'Đã sửa giá.' }); if (kq.ok) setGia(null); }}>Lưu giá</Nut></div></The>}
      <div className="luoi-2">
        {['sap_an', 'da_an'].includes(tinhTrang) && !lo.an ? <Nut onClick={() => lam({ loai: 'con_hang', loId: lo.id }, { bao: 'Đã xác nhận còn hàng.' })}>Vẫn còn hàng</Nut>
          : lo.an ? <Nut onClick={() => lam({ loai: 'an_lo', loId: lo.id, an: false }, { bao: 'Tin đã hiện lại.' })}>Hiện lại tin</Nut>
            : <NutHoiLai tieuDe="Ẩn tin lô này?" noiDung={<p>Bên mua không tìm thấy lô nữa. Đơn đang có vẫn chạy bình thường.</p>} nutDongY="Ẩn tin" kieuDongY="chinh" onDongY={() => lam({ loai: 'an_lo', loId: lo.id, an: true }, { bao: 'Đã ẩn tin.' })}>Ẩn tin</NutHoiLai>}
        <NutLink den={`/chung-tu?lo=${lo.id}`} kieu="phu">Chứng từ</NutLink>
      </div>
      {lo.vuonId && <NutLink den={`/ho-so-vuon?vuon=${lo.vuonId}`} kieu="nhe">Hồ sơ nguồn gốc của lô</NutLink>}
      {lo.thanhPhan && <The><h2>Phần của từng hộ</h2>{lo.thanhPhan.map(t => <Dong key={t.ho} nhan={t.ho}>{luong(t.kg)}</Dong>)}<NutLink den="/phan-cua-toi" kieu="nhe" nho>Xem tiền chia từng hộ</NutLink></The>}
      <section className="chong"><h2>Đơn của lô ({don.length})</h2>{!don.length && <span className="phu">Chưa có đơn.</span>}{don.map(d => <TheDon key={d.ma} don={d} bayGio={bayGio} />)}</section>
      <section className="chong"><h2>Khách đang hỏi ({khach.length})</h2>{khach.map(k => <TheLink key={k.id} den={k.trangThai === 'cho' ? `/ket-noi?kn=${k.id}` : `/chat?kn=${k.id}`}><div className="hang giua"><strong>{k.mua.ten}</strong><Chip kieu={k.trangThai === 'cho' ? 'lam' : 'xong'}>{k.trangThai === 'cho' ? 'Chờ bạn trả lời' : 'Đang trao đổi'}</Chip></div></TheLink>)}</section>
    </Khung>
  );
}

function CapNhatLuong() {
  const { lam } = useToi();
  const x = useLo();
  const [kg, setKg] = useState(x ? String(x.lo.kg) : '');
  const [coSo, setCoSo] = useState<'uoc_tinh' | 'da_can'>(x?.lo.coSo ?? 'uoc_tinh');
  if (!x) return <KhongCoLo />;
  const { lo } = x;
  const moi = docSo(kg);
  return (
    <Khung duoi={<Nut rong onClick={() => lam({ loai: 'cap_nhat_luong', loId: lo.id, kg: moi, coSo }, { bao: `Đã ghi lượng mới ${luong(moi)}.`, den: `/chi-tiet-lo?lo=${lo.id}` })}>Báo lượng mới</Nut>}>
      <p className="phu">{lo.ten}: hiện {luong(lo.kg)}, đã hứa {luong(lo.hua)}, đã giao {luong(lo.giao)}.</p>
      {lo.thanhPhan ? <Bao kieu="thong-tin">Lô gộp nhiều hộ: sửa phần từng hộ ở màn Lô gộp.</Bao> : <>
        <O nhan="Lượng còn lại của lô" kieu="so" donVi="kg" value={kg} onChange={setKg} autoFocus />
        <div className="hang">{[-500, -100, 100, 500].map(d => <Nut key={d} kieu="phu" nho onClick={() => setKg(String(Math.max(0, (docSo(kg) || 0) + d)))}>{d > 0 ? '+' : '−'}{Math.abs(d)} kg</Nut>)}</div>
        <ChonNut nhan="Cơ sở" value={coSo} onChange={setCoSo} luaChon={[{ gt: 'uoc_tinh', nhan: 'Ước tính' }, { gt: 'da_can', nhan: 'Đã cân' }]} />
        {moi > 0 && moi < lo.hua && <Bao kieu="vang">Lượng mới ({luong(moi)}) thấp hơn lượng đã hứa ({luong(lo.hua)}). Thỏa thuận cũ vẫn giữ: vào từng đơn gửi đề nghị giảm lượng cho bên mua.</Bao>}
      </>}
    </Khung>
  );
}

function SapCoHang() {
  const { nguoi, so, lam, bayGio } = useToi();
  const { bao } = useMayChu();
  const vuon = so.vuon.filter(v => v.ban.id === nguoi.id);
  const [f, setF] = useState({ matHang: [] as string[], kg: '', haiTu: '', haiDen: '', vuonId: '', moTa: '' });
  const dang = () => {
    const mh = timMatHang(f.matHang[0] ?? '');
    if (!mh) return bao('Chọn mặt hàng sắp có.', 'loi');
    if (!f.haiTu) return bao('Chọn ngày bắt đầu hái để bên mua lên kế hoạch.', 'loi');
    lam({ loai: 'dang_lo', matHang: mh.id, ten: `${mh.ten} (sắp có hàng)`, kg: docSo(f.kg), coSo: 'uoc_tinh', gia: null, haiTu: f.haiTu, ...(f.haiDen ? { haiDen: f.haiDen } : {}), ...(f.vuonId ? { vuonId: f.vuonId } : {}), moTa: f.moTa || 'Sắp có hàng: nhận đặt trước, báo giá.' }, { bao: 'Đã đăng tin sắp có hàng.', den: ma => `/xong?lo=${ma}` });
  };
  return (
    <Khung duoi={<Nut rong onClick={dang}>Đăng tin sắp có hàng</Nut>}>
      <p className="phu">Đăng trước mùa để bên mua lên kế hoạch. Lượng là ước tính; giá để bên mua báo.</p>
      <ChonNhieuMatHang chon={f.matHang} onChange={ds => setF({ ...f, matHang: ds })} motMon />
      <O nhan="Lượng ước" kieu="so" donVi="kg" value={f.kg} onChange={x => setF({ ...f, kg: x })} />
      <div className="luoi-2"><O nhan="Hái từ ngày" kieu="ngay" toiThieu={ngayCua(bayGio)} value={f.haiTu} onChange={x => setF({ ...f, haiTu: x })} /><O nhan="Đến ngày" kieu="ngay" value={f.haiDen} onChange={x => setF({ ...f, haiDen: x })} /></div>
      {vuon.length > 0 && <ChonNut nhan="Của vườn" value={f.vuonId} onChange={x => setF({ ...f, vuonId: x })} luaChon={[{ gt: '', nhan: 'Không ghi' }, ...vuon.map(v => ({ gt: v.id, nhan: v.ten }))]} />}
      <O nhan="Ghi chú cho bên mua" kieu="chu-dai" value={f.moTa} onChange={x => setF({ ...f, moTa: x })} />
    </Khung>
  );
}

function ChungTu() {
  const { lam } = useToi();
  const x = useLo();
  const [loai, setLoai] = useState('Giấy kiểm nghiệm');
  const [dangTai, setDangTai] = useState(false);
  if (!x) return <KhongCoLo />;
  const { lo } = x;
  const giay = lo.anh.filter(a => a.startsWith('giay|'));
  const anh = lo.anh.filter(a => !a.startsWith('giay|'));
  const them = async (tep: File | undefined, laGiay: boolean) => {
    if (!tep) return;
    setDangTai(true);
    try {
      const muc = laGiay ? `giay|${loai}|${tep.name}` : await anhNho(tep);
      lam({ loai: 'sua_lo', loId: lo.id, anh: [...lo.anh, muc] }, { bao: laGiay ? `Đã thêm ${loai.toLowerCase()}.` : 'Đã thêm ảnh.' });
    } finally { setDangTai(false); }
  };
  return (
    <Khung>
      <p className="phu">{lo.ten}: giấy tờ và ảnh giúp bên mua tin hàng. Kết quả cân của từng đơn tự lưu ở chi tiết đơn.</p>
      <The>
        <h2>Giấy tờ ({giay.length})</h2>
        {giay.map((g, i) => { const [, l, t] = g.split('|'); return <div key={i} className="hang giua"><span className="hang ngang"><Icon ten="report" /><span><strong>{l}</strong><br /><span className="nho phu">{t}</span></span></span><NutHoiLai nho kieu="nhe" tieuDe="Gỡ giấy tờ này?" nutDongY="Gỡ" onDongY={() => lam({ loai: 'sua_lo', loId: lo.id, anh: lo.anh.filter(a => a !== g) })}>Gỡ</NutHoiLai></div>; })}
        <ChonNut value={loai} onChange={setLoai} luaChon={['Giấy kiểm nghiệm', 'Chứng nhận VietGAP', 'Mã số vùng trồng', 'Khác'].map(x => ({ gt: x, nhan: x }))} />
        <label className="tp-nut phu"><Icon ten="upload" />Chụp hoặc chọn {loai.toLowerCase()}<input type="file" accept="image/*,application/pdf" className="an-man" onChange={e => them(e.target.files?.[0], true)} /></label>
      </The>
      <The>
        <h2>Ảnh lô ({anh.length})</h2>
        <div className="hang">{anh.map((a, i) => <AnhMH key={i} matHang={lo.matHang} anh={a} />)}</div>
        <label className="tp-nut phu"><Icon ten="camera" />{dangTai ? 'Đang thêm…' : 'Chụp thêm ảnh'}<input type="file" accept="image/*" capture="environment" className="an-man" onChange={e => them(e.target.files?.[0], false)} /></label>
      </The>
    </Khung>
  );
}

function LoGop() {
  const { nguoi, so, lam, bayGio } = useToi();
  const ds = loCuaToi(so, nguoi, bayGio).filter(l => l.thanhPhan);
  const [f, setF] = useState({ matHang: [] as string[], gia: '', ho: [{ ho: '', kg: '' }, { ho: '', kg: '' }] });
  const tong = f.ho.reduce((s, h) => s + (docSo(h.kg) || 0), 0);
  const dang = () => {
    const mh = timMatHang(f.matHang[0] ?? '');
    lam({ loai: 'dang_lo', matHang: mh?.id ?? '', ten: mh ? `${mh.ten} (lô gộp ${f.ho.length} hộ)` : '', kg: tong, coSo: 'da_can', gia: f.gia.trim() ? docSo(f.gia) : null, thanhPhan: f.ho.map(h => ({ ho: h.ho, kg: docSo(h.kg) || 0 })) }, { bao: 'Đã đăng lô gộp.', den: ma => `/chi-tiet-lo?lo=${ma}` });
  };
  return (
    <Khung>
      {ds.map(l => (
        <The key={l.id}>
          <div className="hang giua"><strong>{l.ten}</strong><ChipLo t={l.tinhTrang} /></div>
          {l.thanhPhan!.map(t => <Dong key={t.ho} nhan={t.ho}>{luong(t.kg)} · {Math.round((t.kg / l.kg) * 100)}%</Dong>)}
          <div className="luoi-2"><NutLink den={`/chi-tiet-lo?lo=${l.id}`} kieu="phu" nho>Chi tiết</NutLink><Nut kieu="nhe" nho onClick={() => lam({ loai: 'gui_ho_tro', chuDe: 'Lô gộp', noiDung: `Nhắc các hộ của ${l.ten} gửi giấy kiểm nghiệm` }, { bao: 'Đã gửi nhắc các hộ gửi giấy (qua tổng đài hỗ trợ).' })}>Nhắc gửi giấy</Nut></div>
        </The>
      ))}
      <The noi>
        <h2>Tạo lô gộp mới</h2>
        <p className="nho phu">Gộp hàng nhiều hộ thành một lô lớn. Tiền về được chia theo phần kg của từng hộ.</p>
        <ChonNhieuMatHang chon={f.matHang} onChange={x => setF({ ...f, matHang: x })} motMon />
        {f.ho.map((h, i) => (
          <div key={i} className="luoi-2">
            <O nhan={`Hộ ${i + 1}`} value={h.ho} onChange={x => setF({ ...f, ho: f.ho.map((y, j) => (j === i ? { ...y, ho: x } : y)) })} placeholder="Tên chủ hộ" />
            <O nhan="Lượng" kieu="so" donVi="kg" value={h.kg} onChange={x => setF({ ...f, ho: f.ho.map((y, j) => (j === i ? { ...y, kg: x } : y)) })} />
          </div>
        ))}
        <div className="hang"><Nut kieu="phu" nho onClick={() => setF({ ...f, ho: [...f.ho, { ho: '', kg: '' }] })}>Thêm hộ</Nut>{f.ho.length > 2 && <Nut kieu="nhe" nho onClick={() => setF({ ...f, ho: f.ho.slice(0, -1) })}>Bớt hộ cuối</Nut>}</div>
        <Dong nhan="Tổng lượng lô">{luong(tong)}</Dong>
        <O nhan="Giá (để trống = nhận báo giá)" kieu="so" donVi="đ/kg" value={f.gia} onChange={x => setF({ ...f, gia: x })} />
        {f.gia && <span className="nho phu">Giá trị lô khoảng {dong(tong * (docSo(f.gia) || 0))}</span>}
        <Nut onClick={dang}>Đăng lô gộp</Nut>
      </The>
    </Khung>
  );
}

export const MAN_HANG: Record<string, ComponentType> = { hang: Hang, 'chi-tiet-lo': ChiTietLo, 'cap-nhat-luong': CapNhatLuong, 'sap-co-hang': SapCoHang, 'chung-tu': ChungTu, 'lo-gop': LoGop };
