// Ký thỏa thuận khi xác nhận đơn: chọn cách giao dịch → lượng hứa → tóm tắt → (quyền, bản đầy đủ) → mã OTP hoặc ký giấy → xong.
// Bước cuối chạy bước "xác nhận đơn" của nghiệp vụ: giữ lượng, tính cọc và phí. Lựa chọn giữa chừng nằm trong bản nháp của app.
import { Bao, Chip, ChonNut, CongTac, Dong, dong, gioNgay, Icon, luong, Nut, NutLink, O, so as dinhSo, The, TienTrinh } from '@agiviet/giao-dien';
import { conBan, tien, tinhCoc, tinhPhi, type Don, type SoGiaoDich } from '@agiviet/nghiep-vu';
import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { Khung, NutNghe, useToi } from '../chung.tsx';
import { useNhap, xoaNhap } from '../phien.ts';
import { denDon, KhongCoDon, useDon } from './don.tsx';

interface NhapKy { thanhToan: 'dam_bao' | 'truc_tiep'; chacChan: boolean; daNghe: boolean; nguoiChung: string; anhGiay: string[] }
const NHAP_KY: NhapKy = { thanhToan: 'dam_bao', chacChan: false, daNghe: false, nguoiChung: '', anhGiay: [] };
const useNhapKy = (ma: string) => useNhap<NhapKy>(`ky.${ma}`, NHAP_KY);

const BUOC = ['phuong-thuc', 'chon-luong', 'ky', 'ky-otp'];
const nd = (iso: string) => iso.split('-').reverse().join('/');

function soLieu(don: Don, so: SoGiaoDich) {
  const giaTri = tien(don.kg, don.gia);
  const quen = so.don.some(x => x.ma !== don.ma && x.mua.id === don.mua.id && x.ban.id === don.ban.id && x.daCoc);
  return { giaTri, coc: tinhCoc(giaTri, so.chinhSach), phi: tinhPhi(giaTri, quen, so.chinhSach), quen, hanCocGio: so.chinhSach.hanCoc / 3600_000 };
}

/** Toàn văn thỏa thuận (mô phỏng), dùng cho màn bản đầy đủ, nghe đọc và bản in. */
export function banThoaThuan(don: Don, so: SoGiaoDich, thanhToan: NhapKy['thanhToan']) {
  const s = soLieu(don, so);
  return [
    `THỎA THUẬN MUA BÁN NÔNG SẢN số ${don.ma}`,
    `Bên bán: ${don.ban.ten}. Bên mua: ${don.mua.ten}. Lập qua ứng dụng AgiViet.`,
    `Điều 1. Hàng hóa: ${don.tenLo}, ${dinhSo(don.kg)} kg, giá ${dinhSo(don.gia)} đồng/kg, tổng ${dinhSo(s.giaTri)} đồng. Chất lượng theo mô tả và chứng từ của lô trên ứng dụng.`,
    `Điều 2. Giao nhận: giao ngày ${nd(don.ngayGiao)}. Bên mua cân tại nơi nhận và nhập kết quả cân; bên bán xác nhận đúng hoặc không đúng. Số đã xác nhận là căn cứ tính tiền.`,
    `Điều 3. Cọc: bên mua đặt cọc ${dinhSo(s.coc)} đồng (${Math.round(so.chinhSach.tyLeCoc * 100)}% giá trị) vào tài khoản đảm bảo trong ${s.hanCocGio} giờ. Quá hạn không cọc thì thỏa thuận hết hiệu lực. Cọc trừ vào tiền hàng.`,
    `Điều 4. Thanh toán: ${thanhToan === 'dam_bao' ? 'bên mua chuyển phần còn lại vào tài khoản đảm bảo; ngân hàng chuyển cho bên bán sau khi nhận' : 'bên mua trả trực tiếp phần còn lại cho bên bán và ghi trên ứng dụng; bên bán xác nhận khi thấy tiền'}.`,
    `Điều 5. Phí: bên mua trả phí ${s.quen ? 'mối quen' : 'giới thiệu'} ${dinhSo(s.phi)} đồng khi đặt cọc. Bên bán không trả phí.`,
    `Điều 6. Thay đổi, hủy: mọi thay đổi lượng, giá, ngày giao lập thành đề nghị và chỉ có hiệu lực khi bên kia đồng ý. Sau khi cọc, bên nào xin hủy mà bên kia đồng ý thì cọc thuộc về bên kia.`,
    `Điều 7. Tranh chấp: hai bên đối soát trên ứng dụng, gửi chứng từ; đội vận hành AgiViet hỗ trợ ghi nhận. Không giải quyết được thì theo pháp luật Việt Nam.`,
  ];
}

const QUYEN = [
  'Bạn hứa giao đúng lượng, đúng loại, đúng ngày. Không đủ thì đề nghị giảm lượng hoặc dời ngày trước khi giao.',
  'Số điện thoại và địa chỉ của bạn chỉ mở cho bên mua sau khi họ đặt cọc.',
  'Tiền cọc nằm ở tài khoản đảm bảo, không ai rút ngang được.',
  'Số cân do bên mua nhập; bạn có quyền bấm "Không đúng" và gửi ảnh cân của mình.',
  'Bên mua chậm trả: bạn mở đối soát, app lưu mọi chứng từ.',
  'Bạn không trả phí cho đơn này.',
];

function KhungKy({ buoc, children, duoi }: { buoc: string; children: React.ReactNode; duoi?: React.ReactNode }) {
  const i = BUOC.indexOf(buoc);
  return <Khung {...(duoi ? { duoi } : {})}>{i >= 0 && <TienTrinh phan={(i + 1) / BUOC.length} nhan={`Bước ${i + 1} trên ${BUOC.length}`} />}{children}</Khung>;
}

function useDonCho() {
  const don = useDon();
  return don && don.trangThai === 'cho_ban_xac_nhan' ? don : undefined;
}
function DaXacNhan() {
  const don = useDon();
  if (!don) return <KhongCoDon />;
  return <Khung><Bao kieu="thong-tin">Đơn {don.ma} không còn chờ bạn xác nhận.</Bao><NutLink den={denDon(don.ma)}>Mở chi tiết đơn</NutLink></Khung>;
}

function PhuongThuc() {
  const { so } = useToi();
  const di = useNavigate();
  const don = useDonCho();
  const [nhap, dat] = useNhapKy(don?.ma ?? '');
  if (!don) return <DaXacNhan />;
  const s = soLieu(don, so);
  return (
    <KhungKy buoc="phuong-thuc" duoi={<Nut rong onClick={() => di(denDon(don.ma, 'chon-luong'))}>Tiếp tục</Nut>}>
      <h1>Chọn cách giao dịch</h1>
      <ChonNut value={nhap.thanhToan} onChange={v => dat({ thanhToan: v })} luaChon={[{ gt: 'dam_bao', nhan: 'Thanh toán đảm bảo' }, { gt: 'truc_tiep', nhan: 'Tự giao dịch' }]} />
      {nhap.thanhToan === 'dam_bao'
        ? <Bao kieu="tot">Nên chọn. Bên mua chuyển tiền vào tài khoản đảm bảo, ngân hàng tự chuyển cho bạn. Không lo bên mua "quên" trả.</Bao>
        : <Bao kieu="vang">Bên mua trả thẳng cho bạn rồi ghi trên app. Bạn phải tự kiểm sổ ngân hàng và bấm xác nhận. Cọc vẫn qua tài khoản đảm bảo.</Bao>}
      <The>
        <Dong nhan={`Phí ${s.quen ? 'mối quen' : 'giới thiệu'}`}>{dong(s.phi)}</Dong>
        <Dong nhan="Ai trả phí">Bên mua, khi đặt cọc</Dong>
        <Dong nhan="Bạn trả">0 đ</Dong>
      </The>
    </KhungKy>
  );
}

function ChonLuong() {
  const { so } = useToi();
  const di = useNavigate();
  const don = useDonCho();
  const [nhap, dat] = useNhapKy(don?.ma ?? '');
  if (!don) return <DaXacNhan />;
  const lo = so.lo.find(l => l.id === don.loId);
  const con = lo ? conBan(lo) : 0;
  return (
    <KhungKy buoc="chon-luong" duoi={<Nut rong disabled={!nhap.chacChan || don.kg > con} onClick={() => di(denDon(don.ma, 'ky'))}>Tiếp tục</Nut>}>
      <h1>Hứa bán bao nhiêu?</h1>
      <The><span className="phu">Bên mua đặt</span><strong className="so-lon">{luong(don.kg)}</strong><Dong nhan="Lô còn bán được">{luong(con)}</Dong><Dong nhan="Sau khi hứa còn">{luong(Math.max(0, con - don.kg))}</Dong></The>
      {don.kg > con && <Bao>Lô không còn đủ. Quay lại từ chối, hoặc nhắn bên mua giảm lượng.</Bao>}
      {lo?.coSo === 'uoc_tinh' && <Bao kieu="vang">Lượng lô đang là ước tính. Hứa nhiều hơn số hái được thì phải đề nghị giảm sau, ảnh hưởng uy tín "giao đủ".</Bao>}
      <CongTac nhan={`Tôi chắc chắn giao được ${luong(don.kg)} vào ngày ${nd(don.ngayGiao)}`} value={nhap.chacChan} onChange={v => dat({ chacChan: v })} />
      <span className="nho phu">Muốn hứa ít hơn: từ chối đơn này và nhắn bên mua tạo đơn với lượng bạn chắc chắn.</span>
    </KhungKy>
  );
}

function Ky() {
  const { so } = useToi();
  const di = useNavigate();
  const don = useDonCho();
  const [nhap] = useNhapKy(don?.ma ?? '');
  if (!don) return <DaXacNhan />;
  const s = soLieu(don, so);
  const tomTat = `Bạn bán ${luong(don.kg)} ${don.tenLo} cho ${don.mua.ten}, giá ${dinhSo(don.gia)} đồng một ký, tổng ${dinhSo(s.giaTri)} đồng, giao ngày ${nd(don.ngayGiao)}. Bên mua cọc ${dinhSo(s.coc)} đồng trong ${s.hanCocGio} giờ. ${nhap.thanhToan === 'dam_bao' ? 'Tiền còn lại qua tài khoản đảm bảo.' : 'Tiền còn lại bên mua trả trực tiếp.'} Bạn không trả phí.`;
  return (
    <KhungKy buoc="ky" duoi={<>
      <Nut rong onClick={() => di(denDon(don.ma, 'ky-otp'))}><Icon ten="signature" />Đồng ý, ký bằng mã</Nut>
      <div className="luoi-2"><Nut kieu="phu" onClick={() => di(denDon(don.ma, 'xac-nhan-don'))}>Chưa đồng ý</Nut><NutLink den={denDon(don.ma, 'ky-giay')} kieu="nhe">Ký trên giấy</NutLink></div>
    </>}>
      <h1>Thỏa thuận</h1>
      <The>
        <Dong nhan="Hàng">{don.tenLo}</Dong><Dong nhan="Lượng">{luong(don.kg)}</Dong><Dong nhan="Giá">{dinhSo(don.gia)} đ/kg</Dong>
        <Dong nhan="Tổng">{dong(s.giaTri)}</Dong><Dong nhan="Giao">{nd(don.ngayGiao)}</Dong><Dong nhan="Cọc">{dong(s.coc)} trong {s.hanCocGio} giờ</Dong>
        <Dong nhan="Thanh toán">{nhap.thanhToan === 'dam_bao' ? 'Đảm bảo' : 'Trực tiếp'}</Dong>
      </The>
      <NutNghe noiDung={tomTat} nhan="Nghe tóm tắt" />
      <div className="luoi-2"><NutLink den={denDon(don.ma, 'quyen')} kieu="phu" nho>Quyền và trách nhiệm</NutLink><NutLink den={denDon(don.ma, 'ban-day-du')} kieu="phu" nho>Bản đầy đủ</NutLink></div>
      <NutLink den={`/can-ho-tro?don=${encodeURIComponent(don.ma)}`} kieu="nhe" nho><Icon ten="help" co={18} />Hỏi hỗ trợ trước khi ký</NutLink>
      {nhap.daNghe && <Chip kieu="xong">Đã nghe hết bản đầy đủ{nhap.nguoiChung ? ` · làm chứng: ${nhap.nguoiChung}` : ''}</Chip>}
    </KhungKy>
  );
}

function Quyen() {
  const don = useDon();
  return (
    <Khung>
      <h1>Quyền và trách nhiệm</h1>
      <ul className="chong" style={{ paddingLeft: 20, margin: 0 }}>{QUYEN.map(q => <li key={q}>{q}</li>)}</ul>
      <NutNghe noiDung={QUYEN.join(' ')} />
      {don && <NutLink den={denDon(don.ma, 'ky')} kieu="phu">Về thỏa thuận</NutLink>}
    </Khung>
  );
}

function BanDayDu() {
  const { so } = useToi();
  const don = useDon();
  const [nhap, dat] = useNhapKy(don?.ma ?? '');
  if (!don) return <KhongCoDon />;
  const ban = banThoaThuan(don, so, nhap.thanhToan);
  return (
    <Khung>
      <div className="van-ban chong">{ban.map((p, i) => i === 0 ? <h2 key={i}>{p}</h2> : <p key={i}>{p}</p>)}</div>
      <NutNghe noiDung={ban.join('. ')} nhan="Nghe cả bản" />
      <CongTac nhan="Tôi đã nghe (đọc) hết bản thỏa thuận" value={nhap.daNghe} onChange={v => dat({ daNghe: v })} />
      <O nhan="Người làm chứng (không bắt buộc)" value={nhap.nguoiChung} onChange={v => dat({ nguoiChung: v })} placeholder="Út Tâm, con gái" />
      {don.trangThai === 'cho_ban_xac_nhan' && <NutLink den={denDon(don.ma, 'ky')}>Về thỏa thuận</NutLink>}
    </Khung>
  );
}

function KyOtp() {
  const { hoSo, lam } = useToi();
  const don = useDonCho();
  const [nhap] = useNhapKy(don?.ma ?? '');
  const [ma, setMa] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  if (!don) return <DaXacNhan />;
  const ky = () => {
    if (ma.replace(/\D/g, '') !== '123456') { setLoi('Mã không đúng. Mã mô phỏng là 123456.'); return; }
    const kq = lam({ loai: 'buoc_don', ma: don.ma, buoc: 'xacNhanDon', thamSo: [] }, { den: denDon(don.ma, 'ky-xong') });
    if (kq.ok) { try { localStorage.setItem(`agiviet.app-ban.ky.${don.ma}`, JSON.stringify({ cach: 'otp', thanhToan: nhap.thanhToan, nguoiChung: nhap.nguoiChung })); } catch { /* chỉ để hiện lại */ } xoaNhap(`ky.${don.ma}`); }
  };
  return (
    <KhungKy buoc="ky-otp" duoi={<Nut rong onClick={ky}>Ký và xác nhận đơn</Nut>}>
      <h1>Xác nhận ký</h1>
      <p>Mã gồm 6 số đã gửi tới {hoSo.sdt.replace(/\d(?=\d{3})/g, '•')}. Không đưa mã cho ai, kể cả người tự xưng nhân viên AgiViet.</p>
      <O nhan="Mã xác nhận" kieu="so" value={ma} onChange={x => { setMa(x); setLoi(null); }} loi={loi} goiY="Bản mô phỏng: 123456" autoFocus />
      <Nut kieu="nhe" nho onClick={() => setMa('123456')}><Icon ten="call" co={18} />Gọi đọc mã cho tôi</Nut>
    </KhungKy>
  );
}

function KyXong() {
  const { so } = useToi();
  const don = useDon();
  if (!don) return <KhongCoDon />;
  if (!don.coc) return <DaXacNhan />;
  return (
    <Khung duoi={<NutLink den={denDon(don.ma)} rong>Xem đơn</NutLink>}>
      <div className="an-mung chong"><Icon ten="done" co={48} /><h1>Đã ký và xác nhận đơn</h1><span>{don.ma} · {luong(don.kg)} cho {don.mua.ten}</span></div>
      <The>
        <strong>Bước tiếp: chờ bên mua đặt cọc</strong>
        <Dong nhan="Cọc">{dong(don.coc.so)}</Dong>
        <Dong nhan="Hạn">{gioNgay(don.coc.han)}</Dong>
        <span className="nho">Cọc vào tài khoản đảm bảo thì app báo bạn và mở số điện thoại hai bên. Quá hạn thì đơn tự đóng, {luong(don.kg)} trả về lô.</span>
      </The>
      <span className="nho phu">Lô {so.lo.find(l => l.id === don.loId)?.ten} đã giữ {luong(don.kg)} cho đơn này.</span>
    </Khung>
  );
}

function KyGiay() {
  const { so, lam } = useToi();
  const don = useDonCho();
  const [nhap, dat] = useNhapKy(don?.ma ?? '');
  if (!don) return <DaXacNhan />;
  const taiBanIn = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([banThoaThuan(don, so, nhap.thanhToan).join('\n\n') + '\n\n\nBên bán ký, ghi rõ họ tên:\n\n\nBên mua ký, ghi rõ họ tên:\n'], { type: 'text/plain;charset=utf-8' }));
    a.download = `Thoa-thuan-${don.ma}.txt`; a.click();
  };
  return (
    <KhungKy buoc="ky-giay" duoi={<Nut rong disabled={!nhap.anhGiay.length} onClick={() => { if (lam({ loai: 'buoc_don', ma: don.ma, buoc: 'xacNhanDon', thamSo: [] }, { bao: 'Đã gửi bản ký giấy và xác nhận đơn.', den: denDon(don.ma, 'ky-xong') }).ok) xoaNhap(`ky.${don.ma}`); }}>Gửi bản đã ký</Nut>}>
      <h1>Ký trên giấy</h1>
      <p className="phu">Dành cho người quen ký tay hoặc cần đóng dấu hợp tác xã. In bản thỏa thuận, ký từng trang, rồi chụp lại.</p>
      <Nut kieu="phu" onClick={taiBanIn}><Icon ten="export" />Tải bản in</Nut>
      {nhap.anhGiay.map((a, i) => <Dong key={i} nhan={`Trang ${i + 1}`}>{a}</Dong>)}
      <label className="tp-nut phu"><Icon ten="camera" />Chụp trang {nhap.anhGiay.length + 1}<input type="file" accept="image/*" capture="environment" className="an-man" onChange={e => { const t = e.target.files?.[0]?.name; if (t) dat({ anhGiay: [...nhap.anhGiay, t] }); }} /></label>
    </KhungKy>
  );
}

export const MAN_KY: Record<string, ComponentType> = {
  'phuong-thuc': PhuongThuc, 'chon-luong': ChonLuong, ky: Ky, quyen: Quyen, 'ban-day-du': BanDayDu, 'ky-otp': KyOtp, 'ky-xong': KyXong, 'ky-giay': KyGiay,
};
