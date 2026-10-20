// Tôi: hồ sơ, uy tín, dịch vụ đối tác, cài đặt, hỗ trợ, màn lỗi mẫu, người giúp, tài khoản nhận tiền, bảo mật, quyền riêng tư,
// phần hàng của từng hộ trong lô gộp.
import { Bao, Chip, ChonNut, CongTac, Dong, dong, gioNgay, Icon, luong, Nut, NutHoiLai, NutLink, O, Sao, so as dinhSo, The, TheLink, TrangTrong, useMayChu } from '@agiviet/giao-dien';
import { chiaTienLoGop, ngayCua, NHAN_BAC, uyTin, type YeuCauDichVu } from '@agiviet/nghiep-vu';
import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { Khung, useThamSo, useToi } from '../chung.tsx';
import { PHIEN } from '../phien.ts';

const NHAN_XAC_MINH = { chua: ['Chưa xác minh', 'lam'], cho_duyet: ['Chờ duyệt', 'cho'], da_xac_minh: ['Đã xác minh', 'xong'], tu_choi: ['Bị từ chối', 'loi'] } as const;

function Toi() {
  const { nguoi, hoSo, so } = useToi();
  const di = useNavigate();
  const ut = uyTin(so, nguoi.id);
  const muc: [string, string, string][] = [
    ['uy-tin', 'star', 'Uy tín của tôi'], ['tai-khoan-nhan', 'wallet', 'Tài khoản nhận tiền'], ['dich-vu', 'delivery', 'Kiểm nghiệm, xe, kho'],
    ['nguoi-giup', 'people', 'Người giúp'], ['phan-cua-toi', 'partial', 'Phần hàng của từng hộ'], ['rieng-tu', 'privacy', 'Quyền riêng tư'],
    ['bao-mat', 'shield', 'Bảo mật'], ['cai-dat', 'settings', 'Cài đặt'], ['ho-tro', 'help', 'Trung tâm hỗ trợ'],
  ];
  return (
    <Khung>
      <The>
        <div className="hang ngang"><span className="anh-mh" style={{ display: 'grid', placeItems: 'center', background: 'var(--mau-chinh-nhat)', color: 'var(--mau-chinh)' }}><Icon ten="user" co={30} /></span>
          <div className="grow chong hep"><strong>{hoSo.ten}</strong><span className="nho phu">{hoSo.sdt} · {hoSo.vung || 'chưa ghi vùng'}</span>
            <div className="hang"><Chip kieu={NHAN_XAC_MINH[hoSo.xacMinh][1]}>{NHAN_XAC_MINH[hoSo.xacMinh][0]}</Chip><Chip>Uy tín {NHAN_BAC[ut.bac]}</Chip></div></div></div>
        <div className="luoi-2"><NutLink den="/ho-so" kieu="phu" nho><Icon ten="edit" co={18} />Sửa hồ sơ</NutLink>{hoSo.xacMinh !== 'da_xac_minh' && <NutLink den="/xac-minh" nho><Icon ten="identity" co={18} />Xác minh</NutLink>}</div>
      </The>
      <nav className="chong hep" aria-label="Các mục">{muc.map(([id, icon, ten]) => <TheLink key={id} den={`/${id}`}><div className="hang ngang"><Icon ten={icon} /><span className="grow">{ten}</span></div></TheLink>)}</nav>
      <NutHoiLai kieu="nhe" tieuDe="Đăng xuất?" noiDung="Dữ liệu vẫn còn trên máy chủ. Đăng nhập lại bằng số điện thoại." nutDongY="Đăng xuất" onDongY={() => { PHIEN.dat(null); di('/chao-mung'); }}>Đăng xuất</NutHoiLai>
    </Khung>
  );
}

function UyTinMan() {
  const { nguoi, so } = useToi();
  const ut = uyTin(so, nguoi.id);
  const xong = so.don.filter(d => d.ban.id === nguoi.id && d.ketQuaCan && d.phaiTra !== undefined);
  const dungHen = xong.length ? xong.filter(d => ngayCua(d.ketQuaCan!.luc) <= d.ngayGiao).length / xong.length : null;
  const nhanXet = so.danhGia.filter(g => g.cho.id === nguoi.id);
  const pct = (x: number | null) => (x === null ? 'chưa có' : `${Math.round(x * 100)}%`);
  const BAC = ['moi', 'kha', 'tot', 'rat_tot'] as const;
  return (
    <Khung>
      <The>
        <span className="phu">Bậc uy tín</span><strong className="so-lon">{NHAN_BAC[ut.bac]}</strong>
        <div className="hang">{BAC.map(b => <Chip key={b} {...(b === ut.bac ? { kieu: 'xong' as const } : {})}>{NHAN_BAC[b]}</Chip>)}</div>
      </The>
      <The>
        <Dong nhan="Đơn hoàn tất">{ut.soDonXong}</Dong>
        <Dong nhan="Giao đủ (kg nhận / kg hứa)">{pct(ut.tyLeGiaoDu)}</Dong>
        <Dong nhan="Đúng hẹn (cân không trễ ngày giao)">{pct(dungHen)}</Dong>
        <Dong nhan="Hủy sau khi cọc do bạn">{ut.soHuyDoMinh}</Dong>
        <Dong nhan="Đơn có tranh chấp">{ut.soTranhChap}</Dong>
        <Dong nhan="Điểm từ bên mua">{ut.diemDanhGia === null ? 'chưa có' : `${ut.diemDanhGia.toFixed(1)} / 5 (${ut.soDanhGia})`}</Dong>
      </The>
      <The noi>
        <strong>Cách lên bậc</strong>
        <span className="nho">Khá: từ 3 đơn hoàn tất, giao đủ từ 85%, điểm từ 3,5.</span>
        <span className="nho">Tốt: giao đủ từ 95%, không hủy sau cọc, điểm từ 4,5.</span>
        <span className="nho">Rất tốt: như Tốt và từ 10 đơn hoàn tất.</span>
      </The>
      <section className="chong"><h2>Nhận xét từ bên mua</h2>{!nhanXet.length && <span className="phu">Chưa có nhận xét.</span>}{nhanXet.map(g => <The key={g.id}><Sao value={g.diem} /><span>{g.nhanXet || 'Không ghi nhận xét'}</span><span className="nho phu">{g.tu.ten} · {g.donMa}</span></The>)}</section>
    </Khung>
  );
}

const TEN_DV: Record<YeuCauDichVu['loai'], string> = { kiem_dinh: 'Kiểm nghiệm dư lượng', van_chuyen: 'Xe chở hàng', kho_lanh: 'Kho lạnh' };
const NHAN_DV: Record<YeuCauDichVu['trangThai'], [string, 'xong' | 'cho' | 'lam' | 'loi']> = { cho_bao_gia: ['Chờ đối tác báo giá', 'cho'], da_bao_gia: ['Có báo giá, chờ bạn đặt', 'lam'], da_dat: ['Đã đặt', 'cho'], xong: ['Hoàn tất', 'xong'], huy: ['Đã hủy', 'loi'] };

function DichVu() {
  const { nguoi, so, lam } = useToi();
  const ds = so.dichVu.filter(y => y.nguoi.id === nguoi.id);
  return (
    <Khung>
      <div className="luoi-3">{(Object.keys(TEN_DV) as YeuCauDichVu['loai'][]).map(l => <NutLink key={l} den={`/dat-dich-vu?loai=${l}`} kieu="phu" nho>{TEN_DV[l]}</NutLink>)}</div>
      <span className="nho phu">Đối tác do AgiViet giới thiệu; giá do đối tác báo, bạn đặt mới tính.</span>
      {!ds.length && <TrangTrong tieuDe="Chưa đặt dịch vụ nào" />}
      {ds.map(y => (
        <The key={y.id} {...(y.trangThai === 'da_bao_gia' ? { vien: 'lam' as const } : {})}>
          <div className="hang giua"><strong>{TEN_DV[y.loai]}</strong><Chip kieu={NHAN_DV[y.trangThai][1]}>{NHAN_DV[y.trangThai][0]}</Chip></div>
          <span className="nho phu">Ngày {y.ngay.split('-').reverse().join('/')}{y.donMa ? ` · đơn ${y.donMa}` : ''}{y.loId ? ` · lô ${so.lo.find(l => l.id === y.loId)?.ten}` : ''}{y.ghiChu ? ` · ${y.ghiChu}` : ''}</span>
          {y.baoGia && <Dong nhan={y.baoGia.doiTac}>{dong(y.baoGia.gia)}</Dong>}
          {y.trangThai === 'da_bao_gia' && <div className="luoi-2"><Nut kieu="phu" onClick={() => lam({ loai: 'huy_dich_vu', yeuCauId: y.id }, { bao: 'Đã hủy yêu cầu.' })}>Không đặt</Nut><Nut onClick={() => lam({ loai: 'dat_dich_vu', yeuCauId: y.id }, { bao: 'Đã đặt. Đối tác liên hệ theo ngày hẹn.' })}>Đặt</Nut></div>}
          {y.trangThai === 'cho_bao_gia' && <Nut kieu="nhe" nho onClick={() => lam({ loai: 'huy_dich_vu', yeuCauId: y.id }, { bao: 'Đã hủy yêu cầu.' })}>Hủy yêu cầu</Nut>}
        </The>
      ))}
    </Khung>
  );
}

function DatDichVu() {
  const { nguoi, so, bayGio, lam } = useToi();
  const loaiTs = useThamSo('loai') as YeuCauDichVu['loai'];
  const [f, setF] = useState({ loai: (TEN_DV[loaiTs] ? loaiTs : 'kiem_dinh') as YeuCauDichVu['loai'], ngay: ngayCua(bayGio + 2 * 864e5), gan: '', ghiChu: '' });
  const lo = so.lo.filter(l => l.ban.id === nguoi.id), don = so.don.filter(d => d.ban.id === nguoi.id && ['cho_coc', 'cho_giao'].includes(d.trangThai));
  const gan = f.gan.startsWith('lo:') ? { loId: f.gan.slice(3) } : f.gan.startsWith('don:') ? { donMa: f.gan.slice(4) } : {};
  return (
    <Khung duoi={<Nut rong onClick={() => lam({ loai: 'yeu_cau_dich_vu', dichVu: f.loai, ngay: f.ngay, ghiChu: f.ghiChu, ...gan }, { bao: 'Đã gửi. Đối tác báo giá trong ít phút.', den: '/dich-vu' })}>Gửi yêu cầu báo giá</Nut>}>
      <ChonNut nhan="Dịch vụ" value={f.loai} onChange={x => setF({ ...f, loai: x })} luaChon={(Object.keys(TEN_DV) as YeuCauDichVu['loai'][]).map(l => ({ gt: l, nhan: TEN_DV[l] }))} />
      <O nhan="Ngày cần" kieu="ngay" value={f.ngay} onChange={x => setF({ ...f, ngay: x })} />
      <ChonNut nhan="Cho lô hoặc đơn" value={f.gan} onChange={x => setF({ ...f, gan: x })} luaChon={[{ gt: '', nhan: 'Không gắn' }, ...lo.map(l => ({ gt: `lo:${l.id}`, nhan: `Lô ${l.ten}` })), ...don.map(d => ({ gt: `don:${d.ma}`, nhan: `Đơn ${d.ma}` }))]} />
      <O nhan="Ghi chú" value={f.ghiChu} onChange={x => setF({ ...f, ghiChu: x })} placeholder={f.loai === 'van_chuyen' ? '3 tấn, từ Mỹ Xương đi Sa Đéc' : f.loai === 'kiem_dinh' ? 'Kiểm dư lượng thuốc trừ sâu' : '2 tấn, 5 ngày'} />
    </Khung>
  );
}

function CaiDat() {
  const { hoSo, lam } = useToi();
  const doc = (k: string, md: string) => { try { return localStorage.getItem(`agiviet.app-ban.${k}`) ?? md; } catch { return md; } };
  const [rung, setRung] = useState(doc('rung', '1') === '1');
  const [ngonNgu, setNgonNgu] = useState(doc('ngon-ngu', 'vi'));
  const luu = (k: string, v: string) => { try { localStorage.setItem(`agiviet.app-ban.${k}`, v); } catch { /* chỉ là tiện ích trên máy */ } };
  return (
    <Khung>
      <ChonNut nhan="Cỡ chữ" value={hoSo.caiDat.coChu} onChange={x => lam({ loai: 'cap_nhat_cai_dat', coChu: x })} luaChon={[{ gt: 'vua', nhan: 'Vừa' }, { gt: 'lon', nhan: 'Lớn' }, { gt: 'rat_lon', nhan: 'Rất lớn' }]} />
      <ChonNut nhan="Tốc độ đọc" value={String(hoSo.caiDat.tocDoDoc)} onChange={x => lam({ loai: 'cap_nhat_cai_dat', tocDoDoc: Number(x) })} luaChon={[{ gt: '0.8', nhan: 'Chậm' }, { gt: '0.95', nhan: 'Vừa' }, { gt: '1.15', nhan: 'Nhanh' }]} />
      <CongTac nhan="Âm thanh khi có việc mới" value={hoSo.caiDat.amThanh} onChange={x => lam({ loai: 'cap_nhat_cai_dat', amThanh: x })} />
      <CongTac nhan="Rung" value={rung} onChange={x => { setRung(x); luu('rung', x ? '1' : '0'); if (x) navigator.vibrate?.(80); }} />
      <ChonNut nhan="Ngôn ngữ" value={ngonNgu} onChange={x => { setNgonNgu(x); luu('ngon-ngu', x); }} luaChon={[{ gt: 'vi', nhan: 'Tiếng Việt' }, { gt: 'km', nhan: 'Khmer (sắp có)' }]} />
      {ngonNgu !== 'vi' && <Bao kieu="thong-tin">Bản tiếng Khmer đang dịch; app tạm hiện tiếng Việt.</Bao>}
    </Khung>
  );
}

const HOI_DAP: [string, string][] = [
  ['Vì sao bên mua không thấy số điện thoại của tôi?', 'Để hai bên giao dịch qua app và được bảo vệ. Số mở ngay khi bên mua đặt cọc.'],
  ['Tiền cọc nằm ở đâu?', 'Ở tài khoản đảm bảo do ngân hàng đối tác giữ. Cọc trừ vào tiền hàng khi chốt cân.'],
  ['Bên mua cân thiếu thì sao?', 'Bấm "Không đúng" ở màn Kết quả cân và chụp số trên cân của bạn. Đơn quay về chờ cân.'],
  ['Tôi có phải trả phí không?', 'Không. Phí giới thiệu do bên mua trả khi đặt cọc.'],
  ['Tin của tôi biến mất?', 'Tin tự ẩn sau 14 ngày không xác nhận còn hàng. Bấm "Vẫn còn hàng" để hiện lại.'],
];
const HUONG_DAN: [string, string][] = [['Đăng bán lô đầu tiên', '/dang'], ['Ghi nhật ký bằng giọng nói', '/ghi'], ['Xác nhận đơn và ký', '/lich'], ['Nhận tiền trước', '/ung-tien']];

function HoTro() {
  const { nguoi, so } = useToi();
  const cuaToi = so.hoTro.filter(h => h.nguoi.id === nguoi.id);
  return (
    <Khung>
      <NutLink den="/can-ho-tro"><Icon ten="help" />Tạo yêu cầu hỗ trợ</NutLink>
      {cuaToi.length > 0 && <section className="chong"><h2>Yêu cầu của tôi</h2>{cuaToi.map(h => (
        <The key={h.id}>
          <div className="hang giua"><strong>{h.chuDe}</strong><Chip kieu={h.trangThai === 'xong' ? 'xong' : h.trangThai === 'moi' ? 'cho' : 'lam'}>{h.trangThai === 'xong' ? 'Đã xong' : h.trangThai === 'moi' ? 'Chờ tiếp nhận' : 'Đang xử lý'}</Chip></div>
          <span className="nho">{h.noiDung}</span>
          {h.traLoi.map((t, i) => <div key={i} className="bong-tin"><span>{t.noiDung}</span><span className="nho phu" style={{ display: 'block' }}>Đội AgiViet · {gioNgay(t.luc)}</span></div>)}
        </The>
      ))}</section>}
      <section className="chong"><h2>Câu hỏi thường gặp</h2>{HOI_DAP.map(([h, d]) => <details key={h} className="tp-the"><summary><strong>{h}</strong></summary><p>{d}</p></details>)}</section>
      <section className="chong"><h2>Hướng dẫn từng bước</h2>{HUONG_DAN.map(([t, den]) => <TheLink key={t} den={den}>{t}</TheLink>)}</section>
      <a className="tp-nut phu" href="tel:19006868"><Icon ten="call" />Gọi tổng đài 1900 6868 (mô phỏng)</a>
    </Khung>
  );
}

function CanHoTro() {
  const { nguoi, so, lam } = useToi();
  const donTs = useThamSo('don');
  const [f, setF] = useState({ chuDe: donTs ? 'Đơn hàng' : 'Cách dùng app', noiDung: '', don: donTs, anh: '' });
  const don = so.don.filter(d => d.ban.id === nguoi.id);
  return (
    <Khung duoi={<Nut rong onClick={() => lam({ loai: 'gui_ho_tro', chuDe: f.chuDe, noiDung: `${f.noiDung}${f.anh ? ` [ảnh: ${f.anh}]` : ''}`, ...(f.don ? { donMa: f.don } : {}) }, { bao: 'Đã gửi. Đội AgiViet trả lời trong giờ làm việc.', den: '/ho-tro' })}>Gửi</Nut>}>
      <ChonNut nhan="Chủ đề" value={f.chuDe} onChange={x => setF({ ...f, chuDe: x })} luaChon={['Cách dùng app', 'Đơn hàng', 'Tiền', 'Tài khoản', 'Khác'].map(x => ({ gt: x, nhan: x }))} />
      {f.chuDe === 'Đơn hàng' && <ChonNut nhan="Đơn" value={f.don} onChange={x => setF({ ...f, don: x })} luaChon={[{ gt: '', nhan: 'Không chọn' }, ...don.slice(0, 8).map(d => ({ gt: d.ma, nhan: d.ma }))]} />}
      <O nhan="Mô tả" kieu="chu-dai" value={f.noiDung} onChange={x => setF({ ...f, noiDung: x })} placeholder="Bên mua chưa nhập số cân dù đã giao hôm qua" />
      <label className="tp-nut phu"><Icon ten="image" />{f.anh ? `Đã thêm ${f.anh}` : 'Thêm ảnh'}<input type="file" accept="image/*" className="an-man" onChange={e => setF({ ...f, anh: e.target.files?.[0]?.name ?? '' })} /></label>
    </Khung>
  );
}

const LOI_MAU: [string, string, string, string][] = [
  ['offline', 'Mất mạng', 'Việc bạn vừa làm được giữ trên máy và gửi khi có mạng lại.', 'Thử lại'],
  ['image', 'Ảnh bị mờ', 'Đứng gần hơn, lau ống kính, chụp nơi đủ sáng.', 'Chụp lại'],
  ['lock', 'Hết phiên đăng nhập', 'Vì an toàn, app tự đăng xuất sau 30 ngày không dùng.', 'Đăng nhập lại'],
  ['waiting', 'Máy chủ đang bận', 'App tự thử lại sau ít giây. Dữ liệu của bạn không mất.', 'Thử lại'],
  ['issue', 'Dữ liệu vừa đổi ở nơi khác', 'Người giúp hoặc bên mua vừa thao tác cùng đơn. Xem lại màn rồi làm tiếp.', 'Tải lại'],
  ['microphone', 'Không nghe rõ', 'Nói chậm, gần máy hơn, hoặc gõ tay.', 'Nói lại'],
];

function TrangThai() {
  const { bao } = useMayChu();
  return <Khung>{LOI_MAU.map(([icon, t, m, n]) => <The key={t}><div className="hang ngang"><Icon ten={icon} co={32} /><div className="grow chong hep"><strong>{t}</strong><span className="nho">{m}</span></div></div><Nut kieu="phu" nho onClick={() => bao(`${n}: mô phỏng.`)}><Icon ten="retry" co={18} />{n}</Nut></The>)}</Khung>;
}

function NguoiGiup() {
  const { hoSo, lam } = useToi();
  const [f, setF] = useState({ ten: '', sdt: '', quyen: 'xem' as 'xem' | 'thao_tac' });
  return (
    <Khung>
      <Bao kieu="thong-tin">Con cháu dùng chung tài khoản để đọc tin, trả lời khách giúp bạn. Người giúp không ký thỏa thuận và không đổi tài khoản nhận tiền được.</Bao>
      {!hoSo.nguoiGiup.length && <TrangTrong tieuDe="Chưa có người giúp" />}
      {hoSo.nguoiGiup.map(n => <The key={n.sdt}><div className="hang giua"><strong>{n.ten}</strong><Chip>{n.quyen === 'xem' ? 'Chỉ xem' : 'Được thao tác'}</Chip></div><span className="nho phu">{n.sdt}</span><NutHoiLai nho kieu="nhe" tieuDe={`Gỡ ${n.ten}?`} nutDongY="Gỡ" onDongY={() => lam({ loai: 'go_nguoi_giup', sdt: n.sdt }, { bao: 'Đã gỡ.' })}>Gỡ</NutHoiLai></The>)}
      {hoSo.nguoiGiup.length < 3 && <The>
        <h2>Thêm người giúp</h2>
        <O nhan="Tên" value={f.ten} onChange={x => setF({ ...f, ten: x })} placeholder="Út Tâm (con gái)" />
        <O nhan="Số điện thoại" kieu="sdt" value={f.sdt} onChange={x => setF({ ...f, sdt: x })} />
        <ChonNut nhan="Quyền" value={f.quyen} onChange={x => setF({ ...f, quyen: x })} luaChon={[{ gt: 'xem', nhan: 'Chỉ xem' }, { gt: 'thao_tac', nhan: 'Được thao tác' }]} />
        <Nut onClick={() => { if (lam({ loai: 'them_nguoi_giup', ...f }, { bao: 'Đã thêm. Người giúp đăng nhập bằng số của họ.' }).ok) setF({ ten: '', sdt: '', quyen: 'xem' }); }}>Thêm</Nut>
      </The>}
    </Khung>
  );
}

function TaiKhoanNhan() {
  const { hoSo, lam } = useToi();
  const { bao } = useMayChu();
  const tk = hoSo.taiKhoanNhan;
  const [doi, setDoi] = useState(!tk);
  const [f, setF] = useState({ nganHang: '', so: '', chuTaiKhoan: '', otp: '' });
  return (
    <Khung>
      {tk && <The><Dong nhan="Ngân hàng">{tk.nganHang}</Dong><Dong nhan="Số tài khoản">{tk.so.replace(/\d(?=\d{4})/g, '•')}</Dong><Dong nhan="Chủ tài khoản">{tk.chuTaiKhoan}</Dong><span className="nho phu">Cập nhật {gioNgay(tk.doiLuc)}</span></The>}
      {!doi ? <Nut kieu="phu" onClick={() => setDoi(true)}>Đổi tài khoản</Nut> : <The>
        <Bao kieu="vang">Tài khoản phải đứng tên {hoSo.ten.toUpperCase()}. Đổi tài khoản cần mã xác nhận gửi tới số của bạn; người giúp không đổi được.</Bao>
        <O nhan="Ngân hàng" value={f.nganHang} onChange={x => setF({ ...f, nganHang: x })} placeholder="Agribank Cao Lãnh" />
        <O nhan="Số tài khoản" kieu="so" value={f.so} onChange={x => setF({ ...f, so: x })} />
        <O nhan="Chủ tài khoản (không dấu)" value={f.chuTaiKhoan} onChange={x => setF({ ...f, chuTaiKhoan: x.toUpperCase() })} />
        <O nhan="Mã xác nhận" kieu="so" value={f.otp} onChange={x => setF({ ...f, otp: x })} goiY="Bản mô phỏng: 123456" />
        <div className="luoi-2">{tk && <Nut kieu="phu" onClick={() => setDoi(false)}>Thôi</Nut>}<Nut onClick={() => {
          if (f.otp !== '123456') { bao('Mã xác nhận không đúng.', 'loi'); return; }
          if (lam({ loai: 'cap_nhat_tai_khoan_nhan', nganHang: f.nganHang, so: f.so, chuTaiKhoan: f.chuTaiKhoan }, { bao: 'Đã lưu tài khoản nhận tiền.' }).ok) setDoi(false);
        }}>Lưu</Nut></div>
      </The>}
    </Khung>
  );
}

function BaoMat() {
  const { lam } = useToi();
  const di = useNavigate();
  const thietBi = [{ ten: 'Máy này', noi: 'Cao Lãnh, Đồng Tháp', luc: 'Đang dùng' }, { ten: 'Máy của Út Tâm (người giúp)', noi: 'TP. Hồ Chí Minh', luc: '2 ngày trước' }];
  return (
    <Khung>
      <section className="chong"><h2>Thiết bị đang đăng nhập</h2>{thietBi.map(t => <The key={t.ten}><strong>{t.ten}</strong><span className="nho phu">{t.noi} · {t.luc}</span></The>)}</section>
      <NutHoiLai kieu="canh-bao" rong tieuDe="Báo mất máy?" noiDung="App đăng xuất mọi thiết bị, khóa việc đổi tài khoản nhận tiền 24 giờ và báo đội AgiViet gọi lại cho bạn." nutDongY="Báo mất máy" onDongY={() => { if (lam({ loai: 'gui_ho_tro', chuDe: 'Mất máy', noiDung: 'Người bán báo mất máy: đăng xuất mọi thiết bị, tạm khóa đổi tài khoản nhận tiền.' }, { bao: 'Đã báo. Đội AgiViet sẽ gọi lại.' }).ok) { PHIEN.dat(null); di('/chao-mung'); } }}>Báo mất máy</NutHoiLai>
      <span className="nho phu">Mất máy trong lúc chưa đăng nhập được: vào "Trợ giúp đăng nhập" ở màn đầu.</span>
    </Khung>
  );
}

function RiengTu() {
  const HANG: [string, string, string][] = [
    ['Tên, xã/huyện', 'Có', 'Có'], ['Ảnh, mô tả lô, giấy kiểm nghiệm', 'Có', 'Có'], ['Hồ sơ nguồn gốc vườn', 'Phần bạn chọn', 'Phần bạn chọn'],
    ['Uy tín, nhận xét', 'Có', 'Có'], ['Địa chỉ đến cấp ấp (hẹn xem vườn)', 'Có', 'Có'], ['Số nhà, địa chỉ vườn', 'Không', 'Có'],
    ['Số điện thoại', 'Không', 'Có'], ['Tài khoản ngân hàng', 'Không', 'Không'],
  ];
  return (
    <Khung>
      <The><div className="luoi-3"><strong>Thông tin</strong><strong>Trước cọc</strong><strong>Sau cọc</strong></div>{HANG.map(([a, b, c]) => <div key={a} className="luoi-3"><span className="nho">{a}</span><span className="nho">{b}</span><span className="nho">{c}</span></div>)}</The>
      <NutLink den="/ho-so-vuon" kieu="phu">Chọn phần hồ sơ vườn cho xem</NutLink>
      <span className="nho phu">Tin nhắn có số điện thoại, Zalo, đường dẫn bị che trước khi cọc. Đội vận hành chỉ xem nguyên văn khi có báo cáo vi phạm.</span>
    </Khung>
  );
}

function PhanCuaToi() {
  const { nguoi, so } = useToi();
  const loGop = so.lo.filter(l => l.ban.id === nguoi.id && l.thanhPhan);
  const hoDs = [...new Set(loGop.flatMap(l => l.thanhPhan!.map(t => t.ho)))];
  const [ho, setHo] = useState(hoDs[0] ?? '');
  if (!loGop.length) return <Khung><TrangTrong tieuDe="Chưa có lô gộp" hanhDong={<NutLink den="/lo-gop">Tạo lô gộp</NutLink>}>Hợp tác xã, tổ hợp tác gom hàng nhiều hộ thành một lô; màn này cho từng hộ xem phần của mình.</TrangTrong></Khung>;
  return (
    <Khung>
      <ChonNut nhan="Hộ" value={ho} onChange={setHo} luaChon={hoDs.map(h => ({ gt: h, nhan: h }))} />
      {loGop.map(l => {
        const phan = l.thanhPhan!.find(t => t.ho === ho);
        if (!phan) return null;
        const tyLe = phan.kg / l.kg;
        const don = so.don.filter(d => d.loId === l.id && d.trangThai === 'da_nhan_tien');
        const tienChia = don.map(d => ({ ma: d.ma, tien: chiaTienLoGop(so, d.ma)?.find(c => c.ho === ho)?.tien ?? 0 }));
        return (
          <The key={l.id}>
            <strong>{l.ten}</strong>
            <Dong nhan="Phần góp">{luong(phan.kg)} ({Math.round(tyLe * 100)}%)</Dong>
            <Dong nhan="Phần đã giao">{luong(Math.round(l.giao * tyLe))}</Dong>
            <Dong nhan="Phần đã hứa">{luong(Math.round(l.hua * tyLe))}</Dong>
            {tienChia.map(t => <Dong key={t.ma} nhan={`Tiền đơn ${t.ma}`}>{dong(t.tien)}</Dong>)}
            <Dong nhan={<strong>Tiền đã chia</strong>}><strong>{dong(tienChia.reduce((s, t) => s + t.tien, 0))}</strong></Dong>
          </The>
        );
      })}
      <span className="nho phu">Tiền chia theo tỷ lệ kg góp; số lẻ dồn cho hộ cuối để tổng khớp đúng tiền nhận. Giá {dinhSo(loGop[0]!.gia)} đ/kg.</span>
    </Khung>
  );
}

export const MAN_TOI: Record<string, ComponentType> = {
  toi: Toi, 'uy-tin': UyTinMan, 'dich-vu': DichVu, 'dat-dich-vu': DatDichVu, 'cai-dat': CaiDat, 'ho-tro': HoTro, 'can-ho-tro': CanHoTro,
  'trang-thai': TrangThai, 'nguoi-giup': NguoiGiup, 'tai-khoan-nhan': TaiKhoanNhan, 'bao-mat': BaoMat, 'rieng-tu': RiengTu, 'phan-cua-toi': PhanCuaToi,
};
