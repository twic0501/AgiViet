// Đăng hàng: chọn cách (chụp, nói, gõ, từ mùa vụ) → mặt hàng → ảnh / lời nói → kiểm tra → xem lại như bên mua thấy → đã đăng.
import { MAT_HANG, mauCua, timMatHang } from '@agiviet/danh-muc';
import { Bao, Chip, ChonNut, CongTac, Dong, docSo, Icon, luong, Nut, NutLink, O, so as dinhSo, The, TheLink, TrangTrong, useMayChu } from '@agiviet/giao-dien';
import { hoSoCongKhai } from '@agiviet/may-chu';
import { hetCachLy, ngayCua, NHAN_BAC } from '@agiviet/nghiep-vu';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { anhNho } from '../anh-chup.ts';
import { AnhMH, Khung, NutNghe, useThamSo, useToi } from '../chung.tsx';
import { matHangTuCay, NHAP_LO_TRONG, type NhapLo } from '../nhap-lo.ts';
import { useNhap } from '../phien.ts';
import { coTheNghe, docTo, ngheNoi } from '../tieng-noi.ts';
import { docTien } from '../tro-ly.ts';
import { ChonNhieuMatHang } from './bat-dau.tsx';

const useLo = () => useNhap<NhapLo>('dang-lo', NHAP_LO_TRONG);
const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Tách lời nói đăng hàng: "xoài cát chu 10 tấn giá 25 nghìn một ký, hái tuần sau". */
export function tachLoiDang(chu: string): { matHang?: string; kg?: number; gia?: number } {
  const c = boDau(chu).replace(/(\d)\.(\d{3})/g, '$1$2');
  const kq: { matHang?: string; kg?: number; gia?: number } = {};
  const tan = c.match(/(\d+(?:[.,]\d+)?)\s*tan\b/), kg = c.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|ky|ki lo|kilogam)\b/);
  if (tan) kq.kg = Math.round(Number(tan[1]!.replace(',', '.')) * 1000); else if (kg) kq.kg = Math.round(Number(kg[1]!.replace(',', '.')));
  const doanGia = c.match(/gia[^,.;]*/)?.[0] ?? (c.match(/\d+\s*(?:nghin|ngan|k)\b[^,.;]*/)?.[0] ?? '');
  const g = docTien(doanGia); if (g) kq.gia = g;
  // Ưu tiên khớp trọn tên (dài trước), rồi mới tới hai chữ đầu: "xoài cát Chu" không được lấy nhầm "xoài cát Hòa Lộc"
  const theoDai = [...MAT_HANG].sort((a, b) => b.ten.length - a.ten.length);
  const mh = theoDai.find(m => c.includes(boDau(m.ten.split(/[(,]/)[0]!.trim()))) ?? theoDai.find(m => c.includes(boDau(m.ten.split(' ').slice(0, 2).join(' '))));
  if (mh) kq.matHang = mh.id;
  return kq;
}

function Dang() {
  const di = useNavigate();
  const { nguoi, so } = useToi();
  const [, dat, xoa] = useLo();
  const vu = so.muaVu.filter(m => m.ban.id === nguoi.id && m.giaiDoan !== 'xong');
  const bat = (cach: NhapLo['cach'], den: string) => { xoa(); dat({ ...NHAP_LO_TRONG, cach }); di(den); };
  const CACH = [
    { cach: 'chup' as const, ten: 'Chụp ảnh', moTa: 'Chụp 2–3 tấm, app điền sẵn mặt hàng', icon: 'camera', den: '/chon-mat-hang' },
    { cach: 'noi' as const, ten: 'Nói', moTa: '"Xoài cát Chu 10 tấn, giá 25 nghìn"', icon: 'microphone', den: '/nghe' },
    { cach: 'go' as const, ten: 'Tự gõ', moTa: 'Chọn mặt hàng, điền lượng, giá', icon: 'keyboard', den: '/chon-mat-hang' },
  ];
  return (
    <Khung>
      {CACH.map(c => (
        <button key={c.cach} type="button" className="tp-the" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => bat(c.cach, c.den)}>
          <span className="hang ngang"><Icon ten={c.icon} co={32} /><span className="chong hep"><strong>{c.ten}</strong><span className="nho phu">{c.moTa}</span></span></span>
        </button>
      ))}
      {vu.length > 0 && <section className="chong"><h2>Từ mùa vụ đang có</h2>{vu.map(m => { const v = so.vuon.find(x => x.id === m.vuonId)!; return (
        <button key={m.id} type="button" className="tp-the" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => { xoa(); dat({ ...NHAP_LO_TRONG, cach: 'vu', vuonId: v.id, matHang: matHangTuCay(v.cay), ten: v.cay, kg: String(m.sanLuongUoc || ''), haiTu: m.haiDuKien }); di('/kiem-tra'); }}>
          <strong>{m.ten}</strong><span className="nho phu">{v.ten} · ước {luong(m.sanLuongUoc)} · hái {m.haiDuKien.split('-').reverse().join('/')}</span>
        </button>); })}</section>}
      <NutLink den="/ghi" kieu="nhe"><Icon ten="journal" />Ghi nhật ký hoặc thu chi thay vì đăng hàng</NutLink>
    </Khung>
  );
}

function ChonMatHang() {
  const di = useNavigate();
  const [lo, dat] = useLo();
  return (
    <Khung duoi={<Nut rong disabled={!lo.matHang} onClick={() => di(lo.cach === 'chup' ? '/chup' : '/kiem-tra')}>Tiếp tục</Nut>}>
      <ChonNhieuMatHang chon={lo.matHang ? [lo.matHang] : []} onChange={ds => { const mh = timMatHang(ds[0] ?? ''); dat({ matHang: mh?.id ?? '', ten: mh?.ten ?? '' }); }} motMon />
    </Khung>
  );
}

function Chup() {
  const di = useNavigate();
  const [lo, dat] = useLo();
  const [loi, setLoi] = useState<string | null>(null);
  const them = async (tep: FileList | null) => {
    if (!tep) return;
    try { const moi = await Promise.all([...tep].slice(0, 4 - lo.anh.length).map(f => anhNho(f))); dat({ anh: [...lo.anh, ...moi] }); setLoi(null); } catch (e) { setLoi((e as Error).message); }
  };
  return (
    <Khung duoi={<Nut rong onClick={() => di('/kiem-tra')}>{lo.anh.length ? `Tiếp tục (${lo.anh.length} ảnh)` : 'Bỏ qua, dùng ảnh mẫu'}</Nut>}>
      <The>
        <h2>Gợi ý chụp</h2>
        <ul className="nho" style={{ margin: 0, paddingLeft: 20 }}><li>Một tấm toàn cảnh đống hàng hoặc vườn.</li><li>Một tấm cận trái, để thấy cỡ và màu.</li><li>Một tấm cắt đôi trái (nếu được), để thấy ruột.</li><li>Đủ sáng, không chụp ngược nắng.</li></ul>
      </The>
      <label className="tp-the" style={{ alignItems: 'center', cursor: 'pointer', borderStyle: 'dashed' }}>
        <Icon ten="camera" co={44} /><strong>Chụp ảnh hàng</strong><span className="nho phu">Tối đa 4 tấm</span>
        <input type="file" accept="image/*" capture="environment" multiple className="an-man" onChange={e => them(e.target.files)} />
      </label>
      {loi && <Bao>{loi}</Bao>}
      <div className="hang">{lo.anh.map((a, i) => <span key={i} className="chong hep" style={{ alignItems: 'center' }}><AnhMH matHang={lo.matHang} anh={a} /><Nut kieu="nhe" nho onClick={() => dat({ anh: lo.anh.filter((_, j) => j !== i) })}>Bỏ</Nut></span>)}</div>
    </Khung>
  );
}

function Nghe() {
  const di = useNavigate();
  const [lo, dat] = useLo();
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const dung = useRef<() => void>(() => {});
  useEffect(() => () => dung.current(), []);
  const tach = tachLoiDang(lo.loiNoi);
  const tiep = () => {
    const mh = tach.matHang ? timMatHang(tach.matHang) : undefined;
    dat({ ...(mh ? { matHang: mh.id, ten: mh.ten } : {}), ...(tach.kg ? { kg: String(tach.kg) } : {}), ...(tach.gia ? { gia: String(tach.gia) } : {}), moTa: lo.moTa || lo.loiNoi });
    di(mh ? '/kiem-tra' : '/chon-mat-hang');
  };
  return (
    <Khung duoi={<><Nut rong disabled={!lo.loiNoi.trim()} onClick={tiep}>Nói xong</Nut><Nut kieu="nhe" rong onClick={() => dat({ loiNoi: '' })}>Nói lại</Nut></>}>
      <button type="button" className="mic" aria-pressed={dang} aria-label={dang ? 'Dừng nghe' : 'Bắt đầu nói'} onClick={() => { if (dang) { dung.current(); setDang(false); } else { setLoi(null); setDang(true); dung.current = ngheNoi(chu => dat({ loiNoi: chu }), l => { setLoi(l); setDang(false); }, () => setDang(false)); } }}><Icon ten="microphone" co={56} /></button>
      <p className="phu" style={{ textAlign: 'center' }}>{dang ? 'Đang nghe…' : coTheNghe() ? 'Bấm và nói: mặt hàng, bao nhiêu, giá, khi nào hái' : 'Máy này chưa nghe được: gõ vào ô bên dưới'}</p>
      {loi && <Bao>{loi}</Bao>}
      <O nhan="Lời nói (sửa được)" kieu="chu-dai" value={lo.loiNoi} onChange={x => dat({ loiNoi: x })} placeholder="Xoài cát Chu 10 tấn, giá 25 nghìn một ký, hái từ cuối tuần" />
      {lo.loiNoi && <The><h2>App hiểu</h2><Dong nhan="Mặt hàng">{tach.matHang ? timMatHang(tach.matHang)?.ten : 'chưa rõ, sẽ hỏi'}</Dong><Dong nhan="Lượng">{tach.kg ? luong(tach.kg) : 'chưa rõ'}</Dong><Dong nhan="Giá">{tach.gia ? `${dinhSo(tach.gia)} đ/kg` : 'chưa rõ'}</Dong></The>}
      {!lo.loiNoi && <Nut kieu="nhe" nho onClick={() => dat({ loiNoi: 'Xoài cát Chu 8 tấn, giá 24 nghìn một ký, hái cuối tuần' })}>Thử câu mẫu</Nut>}
    </Khung>
  );
}

function KiemTra() {
  const di = useNavigate();
  const { nguoi, so, bayGio } = useToi();
  const { bao } = useMayChu();
  const [lo, dat] = useLo();
  const mh = timMatHang(lo.matHang);
  const mau = mauCua(lo.matHang);
  const vuon = so.vuon.filter(v => v.ban.id === nguoi.id);
  const homNay = ngayCua(bayGio);
  const het = lo.vuonId ? hetCachLy(so, lo.vuonId) : null;
  const viPhamCachLy = het && het > (lo.haiTu || homNay);
  const tiep = () => {
    if (!mh) return bao('Chọn mặt hàng.', 'loi');
    if (!(docSo(lo.kg) > 0)) return bao('Ghi lượng lớn hơn 0.', 'loi');
    if (!lo.nhanBaoGia && !(docSo(lo.gia) > 0)) return bao('Ghi giá, hoặc bật "Nhận báo giá".', 'loi');
    if (viPhamCachLy) return bao(`Vườn còn cách ly thuốc tới hết ${het!.split('-').reverse().join('/')}. Chọn ngày hái từ ngày đó.`, 'loi');
    di('/xem-lai');
  };
  if (!mh) return <Khung><TrangTrong tieuDe="Chưa chọn mặt hàng" hanhDong={<NutLink den="/chon-mat-hang">Chọn mặt hàng</NutLink>} /></Khung>;
  return (
    <Khung duoi={<Nut rong onClick={tiep}>Tiếp: xem lại</Nut>}>
      <TheLink den="/chon-mat-hang"><div className="hang ngang"><AnhMH matHang={mh.id} {...(lo.anh[0] ? { anh: lo.anh[0] } : {})} /><div className="grow chong hep"><strong>{mh.ten}</strong><span className="nho phu">Bấm để đổi mặt hàng</span></div></div></TheLink>
      {mh.muc === 'D' && <Bao kieu="vang">Mặt hàng bán có điều kiện: {mh.dieuKien}</Bao>}
      <O nhan="Tên trên tin" value={lo.ten} onChange={x => dat({ ten: x })} />
      <div className="luoi-2">
        <O nhan="Lượng" kieu="so" donVi="kg" value={lo.kg} onChange={x => dat({ kg: x })} goiY={docSo(lo.kg) >= 1000 ? luong(docSo(lo.kg)) : undefined} />
        <ChonNut nhan="Cơ sở" value={lo.coSo} onChange={x => dat({ coSo: x })} luaChon={[{ gt: 'uoc_tinh', nhan: 'Ước tính' }, { gt: 'da_can', nhan: 'Đã cân' }]} />
      </div>
      <CongTac nhan="Nhận báo giá (chưa đặt giá)" value={lo.nhanBaoGia} onChange={x => dat({ nhanBaoGia: x })} />
      {!lo.nhanBaoGia && <O nhan="Giá" kieu="so" donVi="đ/kg" value={lo.gia} onChange={x => dat({ gia: x })} goiY="Giá tham khảo theo vùng sẽ có khi đủ dữ liệu giao dịch." />}
      {mau && <The><h2>Chia loại ({mau.ten})</h2>{mau.truong.map(t => t.kieu === 'chon'
        ? <ChonNut key={t.ma} nhan={t.nhan} value={lo.thuocTinh[t.ma] ?? ''} onChange={x => dat({ thuocTinh: { ...lo.thuocTinh, [t.ma]: x } })} luaChon={t.luaChon.map(l => ({ gt: l, nhan: l }))} />
        : <O key={t.ma} nhan={t.nhan} kieu="so" donVi={t.donVi} value={lo.thuocTinh[t.ma] ?? ''} onChange={x => dat({ thuocTinh: { ...lo.thuocTinh, [t.ma]: x } })} {...(t.goiY ? { placeholder: t.goiY } : {})} />)}
        {mau.coCheBien && <CongTac nhan="Hàng cho chế biến (loại 2, 3 cho nhà máy sấy, nước ép)" value={lo.choCheBien} onChange={x => dat({ choCheBien: x })} />}
      </The>}
      {vuon.length > 0 && <ChonNut nhan="Của vườn (để có hồ sơ nguồn gốc)" value={lo.vuonId} onChange={x => dat({ vuonId: x })} luaChon={[{ gt: '', nhan: 'Không ghi' }, ...vuon.map(v => ({ gt: v.id, nhan: v.ten }))]} />}
      <div className="luoi-2"><O nhan="Hái từ ngày" kieu="ngay" value={lo.haiTu} onChange={x => dat({ haiTu: x })} /><O nhan="Đến ngày" kieu="ngay" value={lo.haiDen} onChange={x => dat({ haiDen: x })} /></div>
      {viPhamCachLy && <Bao>Vườn này còn trong thời gian cách ly thuốc tới hết {het!.split('-').reverse().join('/')}. Không bán hàng hái trước ngày đó. <button type="button" className="tp-nut nhe nho" onClick={() => dat({ haiTu: het! })}>Đặt ngày hái {het!.split('-').reverse().join('/')}</button></Bao>}
      <O nhan="Mô tả thêm" kieu="chu-dai" value={lo.moTa} onChange={x => dat({ moTa: x })} placeholder="Xoài bao trái, vườn có nhật ký canh tác" />
    </Khung>
  );
}

function XemLai() {
  const { nguoi, so, lam } = useToi();
  const [lo, , xoa] = useLo();
  const mh = timMatHang(lo.matHang);
  const hs = hoSoCongKhai(so, nguoi.id);
  const mau = mauCua(lo.matHang);
  if (!mh || !hs) return <Khung><TrangTrong tieuDe="Chưa có tin để xem lại" hanhDong={<NutLink den="/dang">Đăng hàng</NutLink>} /></Khung>;
  const kg = docSo(lo.kg), gia = lo.nhanBaoGia ? null : docSo(lo.gia);
  const loiDoc = `${lo.ten}, ${luong(kg)} ${lo.coSo === 'da_can' ? 'đã cân' : 'ước tính'}. ${gia ? `Giá ${dinhSo(gia)} đồng một ký.` : 'Nhận báo giá.'} ${lo.haiTu ? `Hái từ ngày ${lo.haiTu.split('-').reverse().join(' tháng ')}.` : ''} Người bán ở ${hs.vung}.`;
  const dang = () => {
    const kq = lam({ loai: 'dang_lo', matHang: mh.id, ten: lo.ten || mh.ten, kg, coSo: lo.coSo, gia, thuocTinh: lo.thuocTinh, choCheBien: lo.choCheBien, anh: lo.anh.length ? lo.anh : mh.anh ? [mh.anh] : [], moTa: lo.moTa, ...(lo.haiTu ? { haiTu: lo.haiTu } : {}), ...(lo.haiDen ? { haiDen: lo.haiDen } : {}), ...(lo.vuonId ? { vuonId: lo.vuonId } : {}) }, { bao: 'Đã đăng bán.', den: ma => `/xong?lo=${ma}` });
    if (kq.ok) xoa();
  };
  return (
    <Khung duoi={<Nut rong onClick={dang}>Đăng bán</Nut>}>
      <Bao kieu="thong-tin">Bên mua thấy tin như dưới đây. Số điện thoại, địa chỉ nhà của bạn không hiện; chỉ mở khi bên mua đã đặt cọc.</Bao>
      <The noi>
        <AnhMH matHang={mh.id} {...(lo.anh[0] ? { anh: lo.anh[0] } : mh.anh ? { anh: mh.anh } : {})} lon />
        <h2>{lo.ten || mh.ten}</h2>
        <span className="nho phu">{hs.ten} · {hs.vung || 'chưa ghi vùng'}{hs.daXacMinh ? ' · đã xác minh' : ''} · uy tín {NHAN_BAC[hs.uyTin.bac]}</span>
        <Dong nhan="Lượng">{luong(kg)} {lo.coSo === 'da_can' ? 'đã cân' : 'ước tính'}</Dong>
        <Dong nhan="Giá">{gia ? `${dinhSo(gia)} đ/kg` : 'Nhận báo giá'}</Dong>
        {lo.haiTu && <Dong nhan="Hái">{lo.haiTu.split('-').reverse().join('/')}{lo.haiDen ? ` – ${lo.haiDen.split('-').reverse().join('/')}` : ''}</Dong>}
        {mau?.truong.filter(t => lo.thuocTinh[t.ma]).map(t => <Dong key={t.ma} nhan={t.nhan}>{lo.thuocTinh[t.ma]} {t.kieu === 'so' ? t.donVi : ''}</Dong>)}
        {lo.choCheBien && <Chip kieu="cho">Hàng cho chế biến</Chip>}
        {lo.vuonId && <Chip kieu="xong">Có hồ sơ nguồn gốc</Chip>}
        {lo.moTa && <p>{lo.moTa}</p>}
      </The>
      <NutNghe noiDung={loiDoc} nhan="Nghe lại tin" />
      <NutLink den="/kiem-tra" kieu="phu">Sửa</NutLink>
    </Khung>
  );
}

function Xong() {
  const { so } = useToi();
  const id = useThamSo('lo');
  const lo = so.lo.find(l => l.id === id);
  const phuHop = lo ? so.nhuCau.filter(n => n.trangThai === 'mo' && n.matHang === lo.matHang) : [];
  useEffect(() => { if (lo) docTo(`Đã đăng ${lo.ten}`); }, [lo?.id]);
  return (
    <Khung duoi={<><NutLink den={`/chi-tiet-lo?lo=${id}`} rong>Xem lô</NutLink><NutLink den="/dang" kieu="phu" rong>Đăng thêm hàng</NutLink></>}>
      <div className="chong an-mung"><Icon ten="done" co={56} /><h1>Đã đăng</h1>{lo && <p>{lo.ten} · {luong(lo.kg)}</p>}</div>
      <The>
        <strong>{phuHop.length ? `${phuHop.length} bên mua đang cần mặt hàng này` : 'Chưa có tin cần mua đúng mặt hàng này'}</strong>
        <span className="nho phu">{phuHop.length ? 'Chào hàng để họ thấy lô của bạn sớm hơn.' : 'Bên mua tìm hàng sẽ thấy lô. Có tin cần mua mới, app báo ở Hôm nay.'}</span>
        {phuHop.length > 0 && <NutLink den="/nhu-cau" kieu="phu" nho>Xem và chào hàng</NutLink>}
      </The>
    </Khung>
  );
}

export const MAN_DANG: Record<string, ComponentType> = { dang: Dang, 'chon-mat-hang': ChonMatHang, chup: Chup, nghe: Nghe, 'kiem-tra': KiemTra, 'xem-lai': XemLai, xong: Xong };
