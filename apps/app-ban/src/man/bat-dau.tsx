// Bắt đầu: chào mừng, đăng ký / đăng nhập bằng số điện thoại (mã mô phỏng 123456), cách bán, mặt hàng, hồ sơ, vườn, xác minh.
import { MAT_HANG, NHOM_HANG, timTheoChu } from '@agiviet/danh-muc';
import { Bao, ChonNut, Icon, Nut, NutLink, O, The, useLenh, useMayChu, useSo } from '@agiviet/giao-dien';
import type { NguoiLam } from '@agiviet/nghiep-vu';
import { useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { anhMatHang, iconCuaNhom } from '../anh.ts';
import { Khung, useToi } from '../chung.tsx';
import { PHIEN, useNhap } from '../phien.ts';
import { docTo } from '../tieng-noi.ts';

const MA_MO_PHONG = '123456';
type NhapDangKy = { sdt: string; dangNhap: boolean; cachBan: 'ho' | 'thuy_san' | 'htx' | 'to_hop'; matHang: string[]; ten: string; vung: string };
const MAC_DINH: NhapDangKy = { sdt: '', dangNhap: false, cachBan: 'ho', matHang: [], ten: '', vung: '' };
const chuanSdt = (s: string) => s.replace(/[\s.\-]/g, '');

function ChaoMung() {
  const di = useNavigate();
  const [, dat] = useNhap('dang-ky', MAC_DINH);
  return (
    <Khung duoi={<><Nut rong onClick={() => { dat({ dangNhap: false }); di('/dang-nhap'); }}>Bắt đầu</Nut><Nut kieu="phu" rong onClick={() => { dat({ dangNhap: true }); di('/dang-nhap'); }}>Tôi đã có tài khoản</Nut></>}>
      <div className="chong" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 'var(--k6)' }}>
        <span style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--mau-chinh)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon ten="leaf" co={52} /></span>
        <h1 style={{ fontSize: 30 }}>AgiViet</h1>
        <p className="so-lon" style={{ fontSize: 24, color: 'var(--mau-chinh)' }}>Tìm đúng mối, chốt đúng giá</p>
        <p className="phu">Sổ làm vườn trong điện thoại. Tới mùa, đăng bán cho nhà máy, doanh nghiệp; tiền đi qua tài khoản đảm bảo của ngân hàng.</p>
      </div>
      <The>
        <div className="hang ngang"><Icon ten="shield" /><span>Người bán dùng miễn phí. Số điện thoại của bạn chỉ hiện cho bên mua khi họ đã đặt cọc.</span></div>
      </The>
    </Khung>
  );
}

function DangNhap() {
  const di = useNavigate();
  const so = useSo();
  const [nhap, dat] = useNhap('dang-ky', MAC_DINH);
  const [sdt, setSdt] = useState(nhap.sdt);
  const [loi, setLoi] = useState<string | null>(null);
  const tiep = () => {
    const s = chuanSdt(sdt);
    if (!/^0\d{9,10}$/.test(s)) return setLoi('Số điện thoại gồm 10 hoặc 11 chữ số, bắt đầu bằng 0.');
    const coTaiKhoan = so.nguoiDung.some(n => n.sdt === s && n.vai === 'ban');
    if (nhap.dangNhap && !coTaiKhoan) return setLoi('Số này chưa có tài khoản người bán. Bấm Quay lại, chọn Bắt đầu để đăng ký.');
    dat({ sdt: s, dangNhap: coTaiKhoan });
    di('/otp');
  };
  return (
    <Khung duoi={<><Nut rong onClick={tiep}>Gửi mã</Nut><NutLink kieu="nhe" rong den="/tro-giup-truy-cap">Không đăng nhập được? Trợ giúp</NutLink></>}>
      <p className="phu">{nhap.dangNhap ? 'Nhập số điện thoại đã đăng ký. App gửi mã 6 số để đăng nhập.' : 'Nhập số điện thoại của bạn. App gửi mã 6 số để xác nhận đúng là bạn.'}</p>
      <O nhan="Số điện thoại" kieu="sdt" value={sdt} onChange={v => { setSdt(v); setLoi(null); }} loi={loi} placeholder="0918 234 421" autoFocus />
      <Bao kieu="vang">Bản mô phỏng: app không gửi tin nhắn thật. Mã luôn là {MA_MO_PHONG}.</Bao>
    </Khung>
  );
}

function Otp() {
  const di = useNavigate();
  const so = useSo();
  const [nhap] = useNhap('dang-ky', MAC_DINH);
  const [ma, setMa] = useState(['', '', '', '', '', '']);
  const [loi, setLoi] = useState<string | null>(null);
  const datO = (i: number, v: string) => { const m = [...ma]; m[i] = v.replace(/\D/g, '').slice(-1); setMa(m); setLoi(null); if (v && i < 5) (document.getElementById(`otp-${i + 1}`) as HTMLInputElement | null)?.focus(); };
  const tiep = () => {
    if (ma.join('') !== MA_MO_PHONG) return setLoi(`Mã chưa đúng. Bản mô phỏng dùng mã ${MA_MO_PHONG}.`);
    const n = so.nguoiDung.find(x => x.sdt === nhap.sdt && x.vai === 'ban');
    if (n) { PHIEN.dat({ vai: 'ban', id: n.id, ten: n.ten }); di('/hom-nay'); } else di('/vai-tro');
  };
  return (
    <Khung duoi={<Nut rong onClick={tiep}>Tiếp tục</Nut>}>
      <p className="phu">Nhập mã 6 số gửi tới <strong className="so">{nhap.sdt}</strong>.</p>
      <div className="otp">{ma.map((c, i) => <input key={i} id={`otp-${i}`} aria-label={`Số thứ ${i + 1}`} inputMode="numeric" value={c} onChange={e => datO(i, e.target.value)} />)}</div>
      {loi && <Bao>{loi}</Bao>}
      <div className="hang">
        <Nut kieu="phu" nho onClick={() => setMa(MA_MO_PHONG.split(''))}>Điền mã mô phỏng</Nut>
        <Nut kieu="nhe" nho onClick={() => docTo(`Mã của bạn là ${MA_MO_PHONG.split('').join(', ')}`)}>Gọi đọc mã cho tôi</Nut>
      </div>
    </Khung>
  );
}

function VaiTro() {
  const di = useNavigate();
  const [nhap, dat] = useNhap('dang-ky', MAC_DINH);
  const LUA: { gt: NhapDangKy['cachBan']; nhan: string; moTa: string; icon: string }[] = [
    { gt: 'ho', nhan: 'Hộ nhà vườn, trồng trọt', moTa: 'Trái cây, lúa, rau củ, cây công nghiệp', icon: 'garden' },
    { gt: 'thuy_san', nhan: 'Nuôi trồng thủy sản', moTa: 'Tôm, cá, nghêu sò', icon: 'pond' },
    { gt: 'htx', nhan: 'Hợp tác xã', moTa: 'Gộp hàng nhiều hộ, chia tiền theo phần', icon: 'people' },
    { gt: 'to_hop', nhan: 'Tổ hợp tác', moTa: 'Vài hộ bán chung một lô', icon: 'people' },
  ];
  return (
    <Khung duoi={<Nut rong onClick={() => di('/mat-hang')}>Tiếp tục</Nut>}>
      {LUA.map(l => (
        <button key={l.gt} type="button" className="tp-the" style={{ textAlign: 'left', cursor: 'pointer', borderColor: nhap.cachBan === l.gt ? 'var(--mau-chinh)' : undefined, borderWidth: nhap.cachBan === l.gt ? 2 : 1 }} aria-pressed={nhap.cachBan === l.gt} onClick={() => dat({ cachBan: l.gt })}>
          <span className="hang ngang"><Icon ten={l.icon} co={28} /><span className="chong hep"><strong>{l.nhan}</strong><span className="nho phu">{l.moTa}</span></span></span>
        </button>
      ))}
    </Khung>
  );
}

/** Chọn nhiều mặt hàng từ danh mục (dùng lại ở hồ sơ và đăng hàng). */
export function ChonNhieuMatHang({ chon, onChange, motMon }: { chon: string[]; onChange: (ds: string[]) => void; motMon?: boolean }) {
  const [nhom, setNhom] = useState(NHOM_HANG[1]!.id);
  const [tim, setTim] = useState('');
  const ds = useMemo(() => (tim.trim() ? timTheoChu(tim, 60) : MAT_HANG.filter(m => m.nhom === nhom)), [tim, nhom]);
  const bat = (id: string) => onChange(motMon ? [id] : chon.includes(id) ? chon.filter(x => x !== id) : [...chon, id]);
  return (
    <div className="chong">
      <O nhan="Tìm mặt hàng" value={tim} onChange={setTim} placeholder="Gõ: xoài, tôm, cà phê…" />
      {!tim && <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {NHOM_HANG.map(n => <button key={n.id} type="button" className="tp-nut phu nho" aria-pressed={n.id === nhom} style={n.id === nhom ? { borderColor: 'var(--mau-chinh)', background: 'var(--mau-chinh-nhat)' } : {}} onClick={() => setNhom(n.id)}><img src={iconCuaNhom(n.icon)} alt="" width={20} height={20} />{n.ten}</button>)}
      </div>}
      <div className="luoi-mh">
        {ds.map(m => (
          <button key={m.id} type="button" aria-pressed={chon.includes(m.id)} onClick={() => bat(m.id)}>
            <img src={anhMatHang(m.id)} alt="" />
            <span>{m.ten}</span>
            {m.muc === 'D' && <span className="nho phu" style={{ fontWeight: 500 }}>có điều kiện</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatHangDangKy() {
  const di = useNavigate();
  const [nhap, dat] = useNhap('dang-ky', MAC_DINH);
  return (
    <Khung duoi={<><Nut rong onClick={() => di('/ho-so')}>{nhap.matHang.length ? `Tiếp tục (${nhap.matHang.length} mặt hàng)` : 'Tiếp tục'}</Nut><Nut kieu="nhe" rong onClick={() => di('/ho-so')}>Bỏ qua, để sau</Nut></>}>
      <p className="phu">Chọn mặt hàng bạn trồng, nuôi. App ưu tiên báo tin cần mua đúng các mặt hàng này.</p>
      <ChonNhieuMatHang chon={nhap.matHang} onChange={ds => dat({ matHang: ds })} />
    </Khung>
  );
}

function HoSo() {
  const di = useNavigate();
  const { dv } = useMayChu();
  const [nhap, dat] = useNhap('dang-ky', MAC_DINH);
  const nguoiTam: NguoiLam = useMemo(() => ({ vai: 'ban', id: `ban-${Date.now().toString(36)}`, ten: nhap.ten || 'Người bán' }), [nhap.ten]);
  const lam = useLenh(nguoiTam);
  const [viTri, setViTri] = useState<string | null>(null);
  const layViTri = () => {
    if (!navigator.geolocation) return setViTri('Máy không lấy được vị trí. Gõ xã, huyện, tỉnh.');
    navigator.geolocation.getCurrentPosition(
      p => setViTri(`Đã lấy vị trí (${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}). Ghi thêm tên xã, huyện để bên mua đọc được.`),
      () => setViTri('Chưa cho phép lấy vị trí. Gõ xã, huyện, tỉnh.'),
    );
  };
  const tiep = () => {
    const kq = lam({ loai: 'dang_ky', vai: 'ban', ten: nhap.ten, sdt: nhap.sdt, vung: nhap.vung, loaiBan: nhap.cachBan === 'htx' ? 'htx' : nhap.cachBan === 'to_hop' ? 'to_hop' : 'ho' });
    if (!kq.ok) return;
    const nguoi = { ...nguoiTam, ten: nhap.ten.trim() };
    PHIEN.dat(nguoi);
    if (nhap.matHang.length) dv.thucHien(nguoi, { loai: 'cap_nhat_ho_so', matHang: nhap.matHang });
    di('/khai-bao-vuon');
  };
  return (
    <Khung duoi={<Nut rong onClick={tiep}>Tạo tài khoản</Nut>}>
      <O nhan="Tên của bạn (hoặc tên hợp tác xã)" value={nhap.ten} onChange={v => dat({ ten: v })} placeholder="Ví dụ: Nguyễn Thị Năm" />
      <O nhan="Xã, huyện, tỉnh" value={nhap.vung} onChange={v => dat({ vung: v })} placeholder="Ví dụ: Mỹ Xương, Cao Lãnh, Đồng Tháp" goiY="Bên mua thấy vùng này. Số điện thoại, địa chỉ nhà chỉ hiện khi họ đã đặt cọc." />
      <Nut kieu="phu" onClick={layViTri}><Icon ten="pin" />Lấy vị trí đang đứng</Nut>
      {viTri && <Bao kieu="thong-tin">{viTri}</Bao>}
    </Khung>
  );
}

function KhaiBaoVuon() {
  const di = useNavigate();
  const { lam, so, nguoi } = useToi();
  const [v, setV] = useState({ ten: 'Vườn nhà', loaiVuon: 'vuon' as 'vuon' | 'ao' | 'ruong', dienTich: '', donVi: 'cong' as 'ha' | 'cong' | 'm2', cay: '', soGoc: '', namTrong: '', vu: '', haiDuKien: '' });
  const da = so.vuon.filter(x => x.ban.id === nguoi?.id);
  const luu = () => {
    const kq = lam({ loai: 'them_vuon', ten: v.ten, loaiVuon: v.loaiVuon, dienTich: Number(v.dienTich.replace(',', '.')), donViDienTich: v.donVi, cay: v.cay, soGoc: Number(v.soGoc) || 0, namTrong: Number(v.namTrong) || 0 }, { bao: 'Đã lưu vườn.' });
    if (kq.ok && v.vu.trim() && v.haiDuKien) lam({ loai: 'them_mua_vu', vuonId: kq.giaTri!, ten: v.vu, batDau: new Date().toISOString().slice(0, 10), sanLuongUoc: 0, haiDuKien: v.haiDuKien });
    if (kq.ok) setV({ ...v, ten: 'Vườn thứ hai', dienTich: '', cay: '', soGoc: '', vu: '', haiDuKien: '' });
  };
  return (
    <Khung duoi={<><Nut rong onClick={() => di('/xac-minh')}>{da.length ? 'Tiếp tục' : 'Bỏ qua, khai sau'}</Nut></>}>
      <p className="phu">Khai vườn, ao để ghi nhật ký và đăng bán có hồ sơ nguồn gốc. Bỏ qua được.</p>
      {da.map(x => <The key={x.id}><strong>{x.ten}</strong><span className="nho phu">{x.cay} · {x.dienTich} {x.donViDienTich === 'cong' ? 'công' : x.donViDienTich}</span></The>)}
      <The>
        <ChonNut nhan="Loại" value={v.loaiVuon} onChange={x => setV({ ...v, loaiVuon: x })} luaChon={[{ gt: 'vuon', nhan: 'Vườn' }, { gt: 'ao', nhan: 'Ao, đầm' }, { gt: 'ruong', nhan: 'Ruộng' }]} />
        <O nhan="Tên gọi" value={v.ten} onChange={x => setV({ ...v, ten: x })} />
        <O nhan="Cây trồng / con nuôi" value={v.cay} onChange={x => setV({ ...v, cay: x })} placeholder="Xoài cát Chu" />
        <div className="luoi-2">
          <O nhan="Diện tích" kieu="so" value={v.dienTich} onChange={x => setV({ ...v, dienTich: x })} />
          <ChonNut nhan="Đơn vị" value={v.donVi} onChange={x => setV({ ...v, donVi: x })} luaChon={[{ gt: 'cong', nhan: 'công' }, { gt: 'ha', nhan: 'ha' }, { gt: 'm2', nhan: 'm²' }]} />
        </div>
        <div className="luoi-2">
          <O nhan="Số gốc (nếu có)" kieu="so" value={v.soGoc} onChange={x => setV({ ...v, soGoc: x })} />
          <O nhan="Năm trồng" kieu="so" value={v.namTrong} onChange={x => setV({ ...v, namTrong: x })} />
        </div>
        <O nhan="Vụ đang làm (nếu có)" value={v.vu} onChange={x => setV({ ...v, vu: x })} placeholder="Xoài vụ nghịch 2026" />
        {v.vu && <O nhan="Ngày hái dự kiến" kieu="ngay" value={v.haiDuKien} onChange={x => setV({ ...v, haiDuKien: x })} />}
        <Nut kieu="phu" onClick={luu}>Lưu vườn này</Nut>
      </The>
    </Khung>
  );
}

function XacMinh() {
  const di = useNavigate();
  const { lam, hoSo } = useToi();
  const [anh, setAnh] = useState<string | null>(null);
  const trangThai = hoSo?.xacMinh;
  return (
    <Khung duoi={<>{trangThai !== 'cho_duyet' && trangThai !== 'da_xac_minh' && <Nut rong disabled={!anh} onClick={() => anh && lam({ loai: 'gui_xac_minh', giayTo: anh }, { bao: 'Đã gửi. AgiViet duyệt trong ngày làm việc.' })}>Gửi xác minh</Nut>}<Nut kieu={trangThai === 'cho_duyet' || trangThai === 'da_xac_minh' ? 'chinh' : 'nhe'} rong onClick={() => di('/hom-nay')}>{trangThai === 'cho_duyet' || trangThai === 'da_xac_minh' ? 'Vào app' : 'Để sau'}</Nut></>}>
      <p className="phu">Chụp mặt trước căn cước. Bên mua thấy huy hiệu "đã xác minh", không thấy ảnh căn cước của bạn.</p>
      {trangThai === 'cho_duyet' && <Bao kieu="vang">Đang chờ duyệt: {hoSo?.giayTo?.ten}</Bao>}
      {trangThai === 'da_xac_minh' && <Bao kieu="tot">Tài khoản đã xác minh.</Bao>}
      {trangThai === 'tu_choi' && <Bao>Chưa duyệt: {hoSo?.giayTo?.lyDoTuChoi}. Chụp lại rõ hơn.</Bao>}
      {trangThai !== 'cho_duyet' && trangThai !== 'da_xac_minh' && (
        <label className="tp-the" style={{ alignItems: 'center', cursor: 'pointer' }}>
          <Icon ten="camera" co={40} />
          <strong>{anh ? `Đã chụp: ${anh}` : 'Chụp căn cước'}</strong>
          <span className="nho phu">Đặt căn cước trên nền tối, đủ sáng, không lóa.</span>
          <input type="file" accept="image/*" capture="environment" className="an-man" onChange={e => setAnh(e.target.files?.[0]?.name ?? null)} />
        </label>
      )}
    </Khung>
  );
}

function TroGiupTruyCap() {
  return (
    <Khung>
      <The><h2>Đổi số điện thoại</h2><p>Gọi tổng đài, đọc số cũ và số căn cước. Tài khoản chuyển sang số mới sau khi xác minh lại.</p></The>
      <The><h2>Mất máy</h2><p>Gọi tổng đài để khóa tạm tài khoản. Tiền ở tài khoản đảm bảo vẫn an toàn: chỉ chuyển vào tài khoản nhận tiền đã đăng ký.</p></The>
      <The><h2>Tổng đài hỗ trợ</h2><p className="so-lon">1900 0000</p><p className="nho phu">Bản mô phỏng: số minh họa. Từ 7 giờ tới 21 giờ, cả thứ bảy, chủ nhật.</p></The>
    </Khung>
  );
}

export const MAN_BAT_DAU: Record<string, ComponentType> = {
  'chao-mung': ChaoMung, 'dang-nhap': DangNhap, otp: Otp, 'vai-tro': VaiTro, 'mat-hang': MatHangDangKy, 'ho-so': HoSo,
  'khai-bao-vuon': KhaiBaoVuon, 'xac-minh': XacMinh, 'tro-giup-truy-cap': TroGiupTruyCap,
};
