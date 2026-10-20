// Đơn: danh sách theo nhóm và lịch giao, chi tiết đơn, xác nhận / từ chối, so sánh khách, cọc, liên lạc, kết quả cân,
// các đề nghị đổi lịch / giảm lượng / đổi giá, hủy đơn, đối soát tiền, các bản thỏa thuận.
import { Bao, Chip, ChonNut, Dong, dong, docSo, gioNgay, Icon, luong, NhanNhom, Nut, NutHoiLai, NutLink, O, Sao, so as dinhSo, Tab, The, TheLink, ThanhChang, TrangTrong, tuongDoi, useMayChu } from '@agiviet/giao-dien';
import { deNghiCuaDon, donTheoNhom, hoSoCongKhai, lichGiao, lienLacCua } from '@agiviet/may-chu';
import { conBan, ngayCua, NHAN_BAC, NHAN_NHOM, NHAN_TRANG_THAI, nhom, tien, tinhCoc, tinhPhi, viecTiep, type DeNghi, type Don, type Nhom } from '@agiviet/nghiep-vu';
import { useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Khung, NutNghe, TheDon, useThamSo, useToi } from '../chung.tsx';

const NGAY = 864e5;
const nd = (iso: string) => iso.split('-').reverse().join('/');
export const denDon = (ma: string, man = 'chi-tiet-don') => `/${man}?ma=${encodeURIComponent(ma)}`;

/** Đơn của người bán đang dùng app, theo tham số ?ma=. */
export function useDon(): Don | undefined {
  const { nguoi, so } = useToi();
  const ma = useThamSo('ma');
  return so.don.find(d => d.ma === ma && d.ban.id === nguoi.id);
}
export const KhongCoDon = () => <Khung><TrangTrong tieuDe="Không tìm thấy đơn" hanhDong={<NutLink den="/lich">Về Đơn và lịch</NutLink>}>Đơn không có hoặc không phải đơn của bạn.</TrangTrong></Khung>;

/** Màn chỉ dùng được ở vài bước của đơn: ngoài các bước đó thì nói rõ đơn đang ở đâu. */
function SaiBuoc({ don, can }: { don: Don; can: string }) {
  return <Khung><Bao kieu="thong-tin">Đơn {don.ma} đang ở bước "{NHAN_TRANG_THAI[don.trangThai]}". {can}</Bao><NutLink den={denDon(don.ma)}>Mở chi tiết đơn</NutLink></Khung>;
}

const moTaDeNghi = (d: DeNghi) => (d.loai === 'doi_lich' ? `đổi ngày giao sang ${nd(d.giaTri)}` : d.loai === 'giam_luong' ? `giảm còn ${luong(Number(d.giaTri))}` : `đổi giá thành ${dinhSo(Number(d.giaTri))} đ/kg`);

function Lich() {
  const { nguoi, so, bayGio } = useToi();
  const n = donTheoNhom(so, nguoi, bayGio);
  const [tab, setTab] = useState<Nhom | 'lich'>(n.lam.length || n.loi.length ? 'lam' : 'lich');
  const lich = lichGiao(so, nguoi);
  const theoNgay = lich.reduce<Record<string, Don[]>>((m, d) => ((m[d.ngayGiao] ??= []).push(d), m), {});
  const homNay = ngayCua(bayGio);
  return (
    <Khung>
      <Tab value={tab} onChange={setTab} ds={[
        { gt: 'lam', nhan: NHAN_NHOM.lam, so: n.lam.length }, { gt: 'cho', nhan: NHAN_NHOM.cho }, { gt: 'loi', nhan: NHAN_NHOM.loi, so: n.loi.length },
        { gt: 'lich', nhan: 'Lịch giao' }, { gt: 'xong', nhan: NHAN_NHOM.xong }, { gt: 'het', nhan: NHAN_NHOM.het },
      ]} />
      {tab === 'lich' ? <>
        {!lich.length && <TrangTrong tieuDe="Chưa có lịch giao">Đơn đã xác nhận, chưa cân sẽ xếp theo ngày giao ở đây.</TrangTrong>}
        {Object.entries(theoNgay).map(([ngay, ds]) => (
          <section key={ngay} className="chong">
            <h2>{ngay === homNay ? 'Hôm nay' : ngay < homNay ? `${nd(ngay)} (đã qua)` : nd(ngay)} <span className="phu so">· {luong(ds.reduce((s, d) => s + d.kg, 0))}</span></h2>
            {ds.map(d => <TheDon key={d.ma} don={d} bayGio={bayGio} />)}
          </section>
        ))}
      </> : <>
        {!n[tab].length && <TrangTrong tieuDe="Không có đơn nào">{tab === 'lam' ? 'Không có đơn chờ bạn làm.' : ''}</TrangTrong>}
        {n[tab].map(d => <div key={d.ma} className="chong hep"><TheDon don={d} bayGio={bayGio} />{tab === 'lam' || tab === 'loi' ? <span className="nho phu" style={{ paddingInline: 4 }}>{viecTiep(d, 'ban')}</span> : null}</div>)}
      </>}
    </Khung>
  );
}

/** Các nút của bước tiếp theo, theo trạng thái đơn (người bán). */
function BuocTiep({ don }: { don: Don }) {
  const { so, lam } = useToi();
  const b = (buoc: 'dongYHuy' | 'tuChoiHuy' | 'tienDu' | 'nhanMotPhan' | 'tienChua', bao: string) => lam({ loai: 'buoc_don', ma: don.ma, buoc, thamSo: [] }, { bao });
  const daDanhGia = so.danhGia.some(g => g.donMa === don.ma && g.tu.id === don.ban.id);
  const [sao, setSao] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [nhanXet, setNhanXet] = useState('');
  switch (don.trangThai) {
    case 'cho_ban_xac_nhan': return <NutLink den={denDon(don.ma, 'xac-nhan-don')} rong>Xem và trả lời đơn</NutLink>;
    case 'cho_coc': return <div className="luoi-2"><NutLink den={denDon(don.ma, 'coc')} kieu="phu">Xem tiền cọc</NutLink><NutLink den={denDon(don.ma, 'huy-don')} kieu="nhe">Hủy đơn</NutLink></div>;
    case 'cho_giao': return <div className="luoi-2"><NutLink den={denDon(don.ma, 'mo-lien-lac')}>Liên lạc bên mua</NutLink><NutLink den={denDon(don.ma, 'doi-lich')} kieu="phu">Xin đổi lịch</NutLink><NutLink den={denDon(don.ma, 'giao-mot-phan')} kieu="phu">Giao thiếu, giao đợt sau</NutLink><NutLink den={denDon(don.ma, 'huy-don')} kieu="nhe">Xin hủy</NutLink></div>;
    case 'cho_dong_y_huy': return don.huy?.ben === 'mua' ? <div className="luoi-2">
      <NutHoiLai tieuDe="Không đồng ý hủy?" noiDung="Đơn tiếp tục như cũ: bạn giao hàng theo lịch." nutDongY="Không đồng ý" kieuDongY="chinh" onDongY={() => b('tuChoiHuy', 'Đơn tiếp tục.')}>Không đồng ý</NutHoiLai>
      <NutHoiLai kieu="chinh" tieuDe="Đồng ý hủy đơn?" noiDung={`Đơn đóng, ${luong(don.kg)} trả về lô. Cọc ${dong(don.daCoc?.so)} thuộc về bạn.`} nutDongY="Đồng ý hủy" onDongY={() => b('dongYHuy', 'Đã hủy đơn. Cọc thuộc về bạn.')}>Đồng ý hủy</NutHoiLai>
    </div> : <Bao kieu="thong-tin">Bạn đã xin hủy. Chờ bên mua trả lời.</Bao>;
    case 'cho_ban_xn_kq': return <NutLink den={denDon(don.ma, 'ket-qua')} rong>Xem kết quả cân</NutLink>;
    case 'da_chot': case 'tien_dang_giu': return <NutLink den={denDon(don.ma, 'quyet-toan')} kieu="phu" rong>Xem bảng quyết toán</NutLink>;
    case 'bao_da_tra': return <div className="chong">
      <Bao kieu="vang">Bên mua báo đã trả {dong(don.tra?.so)} (còn phải trả {dong(don.conPhaiTra)}). Mở sổ ngân hàng kiểm trước khi bấm.</Bao>
      <Nut rong onClick={() => b('tienDu', 'Đã xác nhận nhận đủ. Đơn hoàn tất.')}>Đã nhận đủ</Nut>
      <div className="luoi-2"><Nut kieu="phu" onClick={() => b('nhanMotPhan', 'Đã ghi nhận một phần.')}>Nhận một phần</Nut><Nut kieu="canh-bao" onClick={() => b('tienChua', 'Đã mở đối soát.')}>Chưa thấy tiền</Nut></div>
    </div>;
    case 'chua_thay_tien': return <NutLink den={denDon(don.ma, 'tranh-chap')} rong>Mở đối soát</NutLink>;
    case 'da_nhan_tien': return <div className="chong">
      <NutLink den={denDon(don.ma, 'tien-ve')} kieu="phu">Xem tiền đã về</NutLink>
      {daDanhGia ? <span className="nho phu">Bạn đã đánh giá bên mua.</span> : <The noi>
        <strong>Đánh giá bên mua</strong><Sao value={sao} onChange={setSao} />
        <O nhan="Nhận xét (không bắt buộc)" value={nhanXet} onChange={setNhanXet} placeholder="Trả tiền nhanh, cân sòng phẳng" />
        <Nut onClick={() => lam({ loai: 'danh_gia', ma: don.ma, diem: sao, ...(nhanXet ? { nhanXet } : {}) }, { bao: 'Cảm ơn bạn đã đánh giá.' })}>Gửi đánh giá</Nut>
      </The>}
    </div>;
    default: return null;
  }
}

function DeNghiDangCho({ don }: { don: Don }) {
  const { lam } = useToi();
  const dn = deNghiCuaDon(useToi().so, don.ma).find(d => d.trangThai === 'cho');
  if (!dn) return null;
  if (dn.tu === 'ban') return <Bao kieu="thong-tin">Bạn đề nghị {moTaDeNghi(dn)}. Chờ bên mua trả lời.</Bao>;
  return (
    <The vien="lam">
      <strong>Bên mua đề nghị {moTaDeNghi(dn)}</strong>
      <span className="nho phu">Lý do: {dn.lyDo}</span>
      <div className="luoi-2">
        <Nut kieu="phu" onClick={() => lam({ loai: 'tra_loi_de_nghi', deNghiId: dn.id, dongY: false }, { bao: 'Đã trả lời không đồng ý. Đơn giữ như cũ.' })}>Không đồng ý</Nut>
        <Nut onClick={() => lam({ loai: 'tra_loi_de_nghi', deNghiId: dn.id, dongY: true }, { bao: 'Đã đồng ý. Thỏa thuận có bản mới.' })}>Đồng ý</Nut>
      </div>
    </The>
  );
}

function ChiTietDon() {
  const { so, bayGio } = useToi();
  const don = useDon();
  if (!don) return <KhongCoDon />;
  const n = nhom(don, 'ban', bayGio);
  const giaTri = tien(don.kg, don.gia);
  const ungs = so.ungTien.filter(u => u.donMa === don.ma);
  return (
    <Khung>
      <div className="hang giua"><h1>{don.ma}</h1><Chip>{don.mua.ten}</Chip></div>
      <ThanhChang don={don} />
      <NhanNhom nhom={n} chiTiet={NHAN_TRANG_THAI[don.trangThai]} />
      <The vien={n === 'lam' ? 'lam' : n === 'loi' ? 'loi' : undefined}>
        <strong>Bước tiếp theo</strong>
        <span>{viecTiep(don, 'ban')}</span>
        {don.trangThai === 'cho_coc' && don.coc && <span className="nho phu">Còn {Math.max(0, Math.round((don.coc.han - bayGio) / 3600_000))} giờ tới hạn cọc.</span>}
        <BuocTiep don={don} />
      </The>
      <DeNghiDangCho don={don} />
      <The>
        <Dong nhan="Lô">{don.tenLo}</Dong>
        <Dong nhan="Lượng">{luong(don.kg)}</Dong>
        <Dong nhan="Giá">{dinhSo(don.gia)} đ/kg</Dong>
        <Dong nhan="Giá trị đơn">{dong(giaTri)}</Dong>
        <Dong nhan="Ngày giao">{nd(don.ngayGiao)}</Dong>
        {don.coc && <Dong nhan="Cọc">{dong(don.coc.so)} {don.daCoc ? '(đã vào tài khoản đảm bảo)' : '(chưa cọc)'}</Dong>}
        {don.coc && <Dong nhan={`Phí ${don.coc.loaiPhi === 'moi_quen' ? 'mối quen' : 'giới thiệu'} (bên mua trả)`}>{dong(don.coc.phi)}</Dong>}
        {don.ketQuaCan && <Dong nhan="Cân">nhận {luong(don.ketQuaCan.nhan)}, trả lại {luong(don.ketQuaCan.tuChoi)}{don.ketQuaCan.phanDoi ? ' (bạn đã báo sai)' : ''}</Dong>}
        {don.phaiTra !== undefined && <Dong nhan="Tiền hàng">{dong(don.phaiTra)}</Dong>}
        {don.conPhaiTra !== undefined && <Dong nhan="Còn phải trả">{dong(don.conPhaiTra)}</Dong>}
        {don.huy && <Dong nhan="Hủy / từ chối">{don.huy.ben === 'ban' ? 'Bạn' : 'Bên mua'}: {don.huy.lyDo}</Dong>}
        {ungs.map(u => <Dong key={u.id} nhan="Ứng trước">{dong(u.so)} · {u.trangThai === 'cho_duyet' ? 'chờ ngân hàng duyệt' : u.trangThai === 'da_giai_ngan' ? 'đã nhận' : u.trangThai === 'da_thu_hoi' ? 'đã trừ vào tiền hàng' : 'không duyệt'}</Dong>)}
      </The>
      {don.ketLuan && <Bao kieu="thong-tin">Vận hành ghi nhận: {don.ketLuan.noiDung}</Bao>}
      <div className="luoi-2">
        <NutLink den={denDon(don.ma, 'so-ban')} kieu="phu" nho><Icon ten="versions" co={18} />Các bản</NutLink>
        {['cho_ban_xac_nhan', 'cho_coc', 'cho_giao'].includes(don.trangThai) && <NutLink den={denDon(don.ma, 'yeu-cau-thay-doi')} kieu="phu" nho><Icon ten="change" co={18} />Xin thay đổi</NutLink>}
        {['cho_giao', 'cho_ban_xn_kq', 'da_chot'].includes(don.trangThai) && !ungs.some(u => ['cho_duyet', 'da_giai_ngan'].includes(u.trangThai)) && <NutLink den={`/ung-tien?ma=${encodeURIComponent(don.ma)}`} kieu="phu" nho><Icon ten="wallet" co={18} />Nhận tiền trước</NutLink>}
        <NutLink den={`/can-ho-tro?don=${encodeURIComponent(don.ma)}`} kieu="nhe" nho><Icon ten="help" co={18} />Cần hỗ trợ</NutLink>
      </div>
      <section className="chong">
        <h2>Lịch sử đơn</h2>
        <ol className="dong-thoi-gian">{[...don.lichSu].reverse().map((l, i) => <li key={i} className={i === 0 ? 'dang' : 'qua'}><div className="chong hep"><span>{l.noiDung}</span><span className="nho phu">{gioNgay(l.luc)} · {l.vai === 'ban' ? 'Bạn' : l.vai === 'mua' ? 'Bên mua' : l.vai === 'van_hanh' ? 'Vận hành' : 'Hệ thống'}</span></div></li>)}</ol>
      </section>
    </Khung>
  );
}

const LY_DO_TU_CHOI = ['Hết hàng', 'Giá thấp quá', 'Ngày giao không kịp', 'Đã hứa bán cho khách khác', 'Khác'];

function XacNhanDon() {
  const { so, bayGio, lam } = useToi();
  const di = useNavigate();
  const don = useDon();
  const [lyDo, setLyDo] = useState(LY_DO_TU_CHOI[0]!);
  const [tuChoi, setTuChoi] = useState(false);
  if (!don) return <KhongCoDon />;
  if (don.trangThai !== 'cho_ban_xac_nhan') return <SaiBuoc don={don} can="Đơn đã được trả lời." />;
  const lo = so.lo.find(l => l.id === don.loId);
  const con = lo ? conBan(lo) : 0;
  const hs = hoSoCongKhai(so, don.mua.id);
  const cungLo = so.don.filter(d => d.loId === don.loId && d.trangThai === 'cho_ban_xac_nhan');
  const giaTri = tien(don.kg, don.gia);
  return (
    <Khung duoi={tuChoi ? <div className="chong">
      <ChonNut nhan="Lý do từ chối (bên mua thấy)" value={lyDo} onChange={setLyDo} luaChon={LY_DO_TU_CHOI.map(x => ({ gt: x, nhan: x }))} />
      <div className="luoi-2"><Nut kieu="phu" onClick={() => setTuChoi(false)}>Quay lại</Nut><Nut kieu="canh-bao" onClick={() => lam({ loai: 'buoc_don', ma: don.ma, buoc: 'tuChoiDon', thamSo: [lyDo] }, { bao: 'Đã từ chối đơn.', den: '/lich' })}>Từ chối đơn</Nut></div>
    </div> : <div className="luoi-2"><Nut kieu="phu" onClick={() => setTuChoi(true)}>Từ chối</Nut><Nut disabled={don.kg > con} onClick={() => di(denDon(don.ma, 'phuong-thuc'))}>Xác nhận và ký</Nut></div>}>
      <span className="phu">Đơn mới · {tuongDoi(don.taoLuc, bayGio)}</span>
      <The>
        <strong className="so-lon">{luong(don.kg)} × {dinhSo(don.gia)} đ</strong>
        <Dong nhan="Giá trị">{dong(giaTri)}</Dong>
        <Dong nhan="Giao ngày">{nd(don.ngayGiao)}</Dong>
        <Dong nhan="Cọc bên mua sẽ đặt">{dong(tinhCoc(giaTri, so.chinhSach))}</Dong>
      </The>
      {hs && <TheLink den={`/ho-so-ben-mua?id=${hs.id}`}><strong>{hs.ten}</strong><span className="nho phu">{hs.vung} · uy tín {NHAN_BAC[hs.uyTin.bac]} · {hs.uyTin.soDonXong} đơn hoàn tất</span></TheLink>}
      {don.kg > con
        ? <Bao>Lô {lo?.ten} chỉ còn bán được {luong(con)}, đơn cần {luong(don.kg)}. Từ chối, hoặc nhắn bên mua giảm lượng.</Bao>
        : <Bao kieu="tot">Lô {lo?.ten} còn bán được {luong(con)}. Xác nhận thì giữ {luong(don.kg)} cho đơn này.</Bao>}
      {lo?.coSo === 'uoc_tinh' && <Bao kieu="vang">Lượng lô đang là ước tính. Chỉ hứa phần bạn chắc chắn hái được.</Bao>}
      {cungLo.length > 1 && <NutLink den={`/so-sanh?lo=${don.loId}`} kieu="phu"><Icon ten="compare" />So sánh {cungLo.length} khách đặt lô này</NutLink>}
    </Khung>
  );
}

function SoSanh() {
  const { so } = useToi();
  const loId = useThamSo('lo');
  const ds = so.don.filter(d => d.loId === loId && d.trangThai === 'cho_ban_xac_nhan');
  const lo = so.lo.find(l => l.id === loId);
  if (!ds.length) return <Khung><TrangTrong tieuDe="Không có đơn chờ để so sánh" /></Khung>;
  const giaCao = Math.max(...ds.map(d => d.gia));
  return (
    <Khung>
      <span className="phu">{lo?.ten} · còn bán được {lo ? luong(conBan(lo)) : ''}</span>
      <div className="luoi-2">
        {ds.map(d => {
          const hs = hoSoCongKhai(so, d.mua.id), gt = tien(d.kg, d.gia);
          const quen = so.don.some(x => x.ma !== d.ma && x.mua.id === d.mua.id && x.ban.id === d.ban.id && x.daCoc);
          return (
            <The key={d.ma} {...(d.gia === giaCao ? { vien: 'lam' as const } : {})}>
              <strong>{d.mua.ten}</strong>
              {d.gia === giaCao && <Chip kieu="lam">Giá cao nhất</Chip>}
              <Dong nhan="Giá">{dinhSo(d.gia)} đ/kg</Dong>
              <Dong nhan="Lượng">{luong(d.kg)}</Dong>
              <Dong nhan="Giá trị">{dong(gt)}</Dong>
              <Dong nhan="Giao">{nd(d.ngayGiao)}</Dong>
              <Dong nhan="Phí bên mua trả">{dong(tinhPhi(gt, quen, so.chinhSach))}{quen ? ' (mối quen)' : ''}</Dong>
              <Dong nhan="Uy tín">{hs ? NHAN_BAC[hs.uyTin.bac] : ''}</Dong>
              <Dong nhan="Trả đúng hạn">{hs?.uyTin.tyLeTraDungHan === null || !hs ? 'chưa có' : `${Math.round(hs.uyTin.tyLeTraDungHan * 100)}%`}</Dong>
              <NutLink den={denDon(d.ma, 'xac-nhan-don')} nho>Chọn đơn này</NutLink>
            </The>
          );
        })}
      </div>
      <span className="nho phu">Bạn không phải trả phí. Đơn nào không chọn thì từ chối để bên mua biết sớm.</span>
    </Khung>
  );
}

function Coc() {
  const { bayGio } = useToi();
  const don = useDon();
  if (!don) return <KhongCoDon />;
  if (!don.coc) return <SaiBuoc don={don} can="Cọc được tính khi bạn xác nhận đơn." />;
  const conGio = (don.coc.han - bayGio) / 3600_000;
  return (
    <Khung>
      <The>
        <span className="phu">Tiền cọc đơn {don.ma}</span>
        <strong className="so-lon">{dong(don.coc.so)}</strong>
        {don.daCoc
          ? <><Chip kieu="xong">Đã vào tài khoản đảm bảo</Chip><span className="nho">Ngân hàng xác nhận lúc {gioNgay(don.daCoc.luc)}. Cọc được trừ vào tiền hàng khi chốt cân.</span></>
          : don.trangThai === 'qua_han' ? <Chip kieu="loi">Quá hạn, đơn đã đóng</Chip>
          : <><Chip kieu="cho">Chờ bên mua cọc</Chip><span className="nho">Hạn {gioNgay(don.coc.han)} ({conGio > 0 ? `còn ${Math.floor(conGio)} giờ ${Math.round((conGio % 1) * 60)} phút` : 'đã quá hạn'}). Quá hạn thì đơn tự đóng và lượng trả về lô.</span></>}
      </The>
      <Bao kieu="thong-tin">Cọc nằm ở tài khoản đảm bảo do ngân hàng đối tác giữ. App ghi "đã cọc" theo xác nhận của ngân hàng, bạn không cần tự bấm "đã nhận".</Bao>
      {don.daCoc && <NutLink den={denDon(don.ma, 'mo-lien-lac')}><Icon ten="unlock" />Xem liên lạc bên mua</NutLink>}
    </Khung>
  );
}

function MoLienLac() {
  const { nguoi, hoSo, so } = useToi();
  const { bao } = useMayChu();
  const don = useDon();
  if (!don) return <KhongCoDon />;
  const ll = don.daCoc ? lienLacCua(so, nguoi, don.mua.id) : null;
  if (!ll) return <Khung><Bao kieu="thong-tin">Liên lạc mở sau khi bên mua đặt cọc. Trước đó hai bên nhắn tin, gọi qua app (che số).</Bao>{don.ketNoiId && <NutLink den={`/chat?kn=${don.ketNoiId}`}>Nhắn qua app</NutLink>}</Khung>;
  const luuDanhBa = () => {
    const vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:${ll.ten} (${don.mua.ten})\nTEL:${ll.sdt}\nADR:;;${ll.diaChi}\nEND:VCARD`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard' })); a.download = `${don.mua.ten}.vcf`; a.click();
    bao('Đã tạo tệp danh bạ.');
  };
  return (
    <Khung>
      <Bao kieu="tot">Bên mua đã cọc. Hai bên thấy số điện thoại và địa chỉ của nhau.</Bao>
      <The>
        <strong>{don.mua.ten}</strong>
        <Dong nhan="Người liên hệ">{ll.ten}</Dong>
        <Dong nhan="Số điện thoại">{ll.sdt}</Dong>
        <Dong nhan="Địa chỉ nhận hàng">{ll.diaChi || 'chưa ghi'}</Dong>
        <div className="luoi-2"><a className="tp-nut chinh" href={`tel:${ll.sdt.replace(/\s/g, '')}`}><Icon ten="call" />Gọi</a><Nut kieu="phu" onClick={luuDanhBa}>Lưu danh bạ</Nut></div>
      </The>
      <The><strong>Bên mua thấy của bạn</strong><Dong nhan="Số điện thoại">{hoSo.sdt}</Dong><Dong nhan="Địa chỉ vườn">{hoSo.diaChi || hoSo.vung}</Dong></The>
      <span className="nho phu">Giao dịch tiếp vẫn ghi trên app để được bảo vệ: kết quả cân, tiền, đổi lịch.</span>
    </Khung>
  );
}

function KetQua() {
  const { lam } = useToi();
  const don = useDon();
  const [anhCan, setAnhCan] = useState<string | null>(null);
  if (!don) return <KhongCoDon />;
  const kq = don.ketQuaCan;
  if (don.trangThai !== 'cho_ban_xn_kq' || !kq) return <SaiBuoc don={don} can={don.trangThai === 'cho_giao' ? 'Chờ bên mua cân và gửi số.' : 'Kết quả cân đã xử lý.'} />;
  const tienHang = tien(kq.nhan, don.gia), coc = don.daCoc?.so ?? 0;
  return (
    <Khung duoi={<div className="luoi-2">
      <NutHoiLai kieu="canh-bao" tieuDe="Báo số cân không đúng?" noiDung="Đơn quay về chờ cân: bên mua kiểm lại và gửi số mới. Bạn nên chụp số trên cân của mình làm bằng." nutDongY="Báo không đúng" onDongY={() => lam({ loai: 'buoc_don', ma: don.ma, buoc: 'ketQuaSai', thamSo: [] }, { bao: 'Đã báo số cân không đúng. Bên mua sẽ kiểm lại.', den: denDon(don.ma) })}>Không đúng</NutHoiLai>
      <Nut onClick={() => lam({ loai: 'buoc_don', ma: don.ma, buoc: 'ketQuaDung', thamSo: [] }, { bao: 'Đã chốt số cân.', den: denDon(don.ma, 'quyet-toan') })}>Đúng, chốt số</Nut>
    </div>}>
      <span className="phu">Bên mua nhập kết quả cân đơn {don.ma}</span>
      <The>
        <Dong nhan="Đơn">{luong(don.kg)}</Dong>
        <Dong nhan="Nhận">{luong(kq.nhan)}</Dong>
        <Dong nhan="Không nhận (trả lại)">{luong(kq.tuChoi)}</Dong>
        {kq.phieu ? <Dong nhan="Phiếu cân">{kq.phieu}</Dong> : <span className="nho phu">Bên mua chưa gửi ảnh phiếu cân.</span>}
      </The>
      <The>
        <Dong nhan={`${luong(kq.nhan)} × ${dinhSo(don.gia)} đ`}>{dong(tienHang)}</Dong>
        <Dong nhan="Trừ cọc đã giữ">− {dong(Math.min(coc, tienHang))}</Dong>
        <Dong nhan={<strong>Bên mua còn phải trả</strong>}><strong>{dong(Math.max(0, tienHang - coc))}</strong></Dong>
      </The>
      <label className="tp-nut phu"><Icon ten="scale" />{anhCan ? `Đã chụp: ${anhCan}` : 'Chụp số trên cân của tôi'}<input type="file" accept="image/*" capture="environment" className="an-man" onChange={e => setAnhCan(e.target.files?.[0]?.name ?? null)} /></label>
    </Khung>
  );
}

/** Form đề nghị dùng chung cho đổi lịch, giảm lượng, đổi giá. */
function FormDeNghi({ don, loai, nhanGiaTri, kieuO, macDinh, tren }: { don: Don; loai: DeNghi['loai']; nhanGiaTri: string; kieuO: 'ngay' | 'so'; macDinh: string; tren?: ReactNode }) {
  const { lam } = useToi();
  const [gt, setGt] = useState(macDinh);
  const [lyDo, setLyDo] = useState('');
  const [anh, setAnh] = useState<string | null>(null);
  const dangCho = deNghiCuaDon(useToi().so, don.ma).find(d => d.trangThai === 'cho');
  if (dangCho) return <Khung><Bao kieu="thong-tin">Đơn đang có đề nghị chờ trả lời: {moTaDeNghi(dangCho)}. Mỗi lần chỉ một đề nghị.</Bao><NutLink den={denDon(don.ma)}>Về chi tiết đơn</NutLink></Khung>;
  const gui = () => lam({ loai: 'de_nghi_don', ma: don.ma, deNghi: loai, giaTri: kieuO === 'so' ? String(docSo(gt)) : gt, lyDo: `${lyDo}${anh ? ` (ảnh: ${anh})` : ''}` }, { bao: 'Đã gửi đề nghị. Bên mua đồng ý thì thỏa thuận có bản mới.', den: denDon(don.ma) });
  return (
    <Khung duoi={<Nut rong onClick={gui}>Gửi đề nghị</Nut>}>
      {tren}
      <O nhan={nhanGiaTri} kieu={kieuO} value={gt} onChange={setGt} {...(kieuO === 'so' ? { donVi: loai === 'giam_luong' ? 'kg' : 'đ/kg' } : {})} />
      <O nhan="Lý do" kieu="chu-dai" value={lyDo} onChange={setLyDo} placeholder={loai === 'doi_lich' ? 'Mưa lớn, chưa hái được' : loai === 'giam_luong' ? 'Mưa bão rụng trái' : 'Giá thị trường tăng'} />
      <label className="tp-nut phu"><Icon ten="camera" />{anh ? `Đã thêm ảnh ${anh}` : 'Thêm ảnh làm bằng'}<input type="file" accept="image/*" className="an-man" onChange={e => setAnh(e.target.files?.[0]?.name ?? null)} /></label>
    </Khung>
  );
}

function DoiLich() {
  const { bayGio } = useToi();
  const don = useDon();
  if (!don) return <KhongCoDon />;
  if (!['cho_coc', 'cho_giao'].includes(don.trangThai)) return <SaiBuoc don={don} can="Chỉ đổi lịch được sau khi xác nhận và trước khi cân." />;
  const macDinh = ngayCua(Math.max(bayGio, Date.parse(don.ngayGiao)) + 2 * NGAY);
  return <FormDeNghi don={don} loai="doi_lich" nhanGiaTri="Ngày giao mới" kieuO="ngay" macDinh={macDinh} tren={<Dong nhan="Đang hẹn">{nd(don.ngayGiao)}</Dong>} />;
}

function GiaoMotPhan() {
  const { so } = useToi();
  const don = useDon();
  if (!don) return <KhongCoDon />;
  if (!['cho_coc', 'cho_giao'].includes(don.trangThai)) return <SaiBuoc don={don} can="Giảm lượng được sau khi xác nhận và trước khi cân." />;
  const lo = so.lo.find(l => l.id === don.loId);
  return <FormDeNghi don={don} loai="giam_luong" nhanGiaTri="Lượng giao được" kieuO="so" macDinh={String(Math.round(don.kg * 0.7))} tren={<>
    <The><Dong nhan="Đơn hứa">{luong(don.kg)}</Dong><Dong nhan="Lô đã giao (mọi đơn)">{lo ? luong(lo.giao) : ''}</Dong><Dong nhan="Lô còn bán được">{lo ? luong(conBan(lo)) : ''}</Dong></The>
    <Bao kieu="thong-tin">Không giao đủ: đề nghị giảm lượng. Bên mua đồng ý thì phần thiếu trả về lô, cọc tính lại theo lượng mới (nếu chưa cọc). Phần còn lại giao đợt sau thì tạo đơn mới với bên mua.</Bao>
  </>} />;
}

function YeuCauThayDoi() {
  const don = useDon();
  const [loai, setLoai] = useState<DeNghi['loai']>('doi_lich');
  if (!don) return <KhongCoDon />;
  const duoc: DeNghi['loai'][] = [
    ...(['cho_coc', 'cho_giao'].includes(don.trangThai) ? ['doi_lich', 'giam_luong'] as const : []),
    ...(['cho_ban_xac_nhan', 'cho_coc'].includes(don.trangThai) ? ['doi_gia'] as const : []),
  ];
  if (!duoc.length) return <SaiBuoc don={don} can="Ở bước này không đổi điều kiện được nữa." />;
  const chon = duoc.includes(loai) ? loai : duoc[0]!;
  const tren = <>
    <ChonNut nhan="Đổi gì" value={chon} onChange={setLoai} luaChon={duoc.map(x => ({ gt: x, nhan: x === 'doi_lich' ? 'Ngày giao' : x === 'giam_luong' ? 'Lượng' : 'Giá' }))} />
    <The><Dong nhan="Bản đang có">{luong(don.kg)} × {dinhSo(don.gia)} đ, giao {nd(don.ngayGiao)}</Dong></The>
  </>;
  return <FormDeNghi key={chon} don={don} loai={chon} kieuO={chon === 'doi_lich' ? 'ngay' : 'so'} nhanGiaTri={chon === 'doi_lich' ? 'Ngày mới' : chon === 'giam_luong' ? 'Lượng mới' : 'Giá mới'} macDinh={chon === 'doi_lich' ? don.ngayGiao : chon === 'giam_luong' ? String(don.kg) : String(don.gia)} tren={tren} />;
}

function HuyDon() {
  const { lam } = useToi();
  const don = useDon();
  const [lyDo, setLyDo] = useState('Mưa bão, hàng hư');
  const [bangChung, setBangChung] = useState<string | null>(null);
  if (!don) return <KhongCoDon />;
  const ly = `${lyDo}${bangChung ? ` (ảnh: ${bangChung})` : ''}`;
  const theo: Record<string, { mo: string; lenh: () => void } | undefined> = {
    cho_ban_xac_nhan: { mo: 'Chưa xác nhận đơn: từ chối là xong, không ảnh hưởng uy tín.', lenh: () => lam({ loai: 'buoc_don', ma: don.ma, buoc: 'tuChoiDon', thamSo: [ly] }, { bao: 'Đã từ chối đơn.', den: '/lich' }) },
    cho_coc: { mo: 'Bên mua chưa cọc: hủy ngay, lượng trả về lô, không mất gì.', lenh: () => lam({ loai: 'buoc_don', ma: don.ma, buoc: 'huyTruocCoc', thamSo: [ly] }, { bao: 'Đã hủy đơn.', den: '/lich' }) },
    cho_giao: { mo: `Bên mua đã cọc ${dong(don.daCoc?.so)}. Hủy cần bên mua đồng ý; nếu đồng ý, cọc thuộc về bên mua (hoàn lại cho họ) và đơn tính là bạn hủy khi xếp uy tín.`, lenh: () => lam({ loai: 'buoc_don', ma: don.ma, buoc: 'yeuCauHuy', thamSo: [ly] }, { bao: 'Đã gửi xin hủy. Chờ bên mua trả lời.', den: denDon(don.ma) }) },
  };
  const t = theo[don.trangThai];
  if (!t) return <SaiBuoc don={don} can="Ở bước này không hủy được. Có vấn đề về tiền hay số cân thì mở đối soát hoặc nhờ hỗ trợ." />;
  return (
    <Khung duoi={<NutHoiLai rong kieu="canh-bao" tieuDe={don.trangThai === 'cho_giao' ? 'Gửi xin hủy?' : 'Hủy đơn?'} noiDung={t.mo} nutDongY={don.trangThai === 'cho_giao' ? 'Gửi xin hủy' : 'Hủy đơn'} onDongY={t.lenh}>{don.trangThai === 'cho_giao' ? 'Xin hủy đơn' : 'Hủy đơn'}</NutHoiLai>}>
      <Bao kieu="vang">{t.mo}</Bao>
      <ChonNut nhan="Lý do" value={lyDo} onChange={setLyDo} luaChon={['Mưa bão, hàng hư', 'Hàng không đạt loại', 'Bên mua đổi điều kiện', 'Việc gia đình', 'Khác'].map(x => ({ gt: x, nhan: x }))} />
      <label className="tp-nut phu"><Icon ten="camera" />{bangChung ? `Bằng chứng: ${bangChung}` : 'Thêm ảnh bằng chứng'}<input type="file" accept="image/*" className="an-man" onChange={e => setBangChung(e.target.files?.[0]?.name ?? null)} /></label>
    </Khung>
  );
}

function TranhChap() {
  const { lam } = useToi();
  const don = useDon();
  const [ghi, setGhi] = useState('');
  if (!don) return <KhongCoDon />;
  const canDoi = don.trangThai === 'chua_thay_tien';
  const canCan = don.trangThai === 'cho_giao' && don.ketQuaCan?.phanDoi;
  if (!canDoi && !canCan && !don.doiSoat?.length) return <SaiBuoc don={don} can="Đơn không có đối soát đang mở." />;
  return (
    <Khung>
      {canDoi && <The vien="loi">
        <strong>Phần đang lệch</strong>
        <Dong nhan="Bên mua báo đã trả">{dong(don.tra?.so)}</Dong>
        <Dong nhan="Còn phải trả">{dong(don.conPhaiTra)}</Dong>
        <span className="nho">App không kết luận bên nào sai. Xem lại sổ ngân hàng (cả tài khoản khác nếu có).</span>
        <Nut onClick={() => lam({ loai: 'buoc_don', ma: don.ma, buoc: 'tienDu', thamSo: [] }, { bao: 'Đã đóng đối soát.', den: denDon(don.ma) })}>Đã thấy tiền</Nut>
      </The>}
      {canCan && <The vien="loi"><strong>Số cân đang lệch</strong><span>Bạn đã báo số cân {luong(don.ketQuaCan!.nhan)} không đúng. Chờ bên mua gửi lại số.</span></The>}
      <The>
        <strong>Chứng từ hai bên</strong>
        {!don.chungTu?.length && <span className="phu">Bên mua chưa gửi chứng từ.</span>}
        {don.chungTu?.map((c, i) => <Dong key={i} nhan={gioNgay(c.luc)}>{c.ten}</Dong>)}
      </The>
      <The>
        <strong>Ghi chép đối soát</strong>
        {don.doiSoat?.map((g, i) => <div key={i} className={`bong-tin ${g.vai === 'ban' ? 'minh' : ''}`}><span>{g.noiDung}</span><span className="nho phu" style={{ display: 'block' }}>{g.vai === 'ban' ? 'Bạn' : g.vai === 'mua' ? 'Bên mua' : 'Vận hành'} · {gioNgay(g.luc)}</span></div>)}
        {canDoi && <><O nhan="Ghi thêm" value={ghi} onChange={setGhi} placeholder="Sổ Agribank chưa có khoản nào từ ngày 12" /><Nut kieu="phu" onClick={() => { if (lam({ loai: 'buoc_don', ma: don.ma, buoc: 'ghiDoiSoat', thamSo: [ghi] }, { bao: 'Đã ghi.' }).ok) setGhi(''); }}>Ghi vào đối soát</Nut></>}
      </The>
      <The><Dong nhan="Người phụ trách">Đội vận hành AgiViet</Dong>{don.ketLuan ? <span>Kết luận: {don.ketLuan.noiDung}</span> : <span className="nho phu">Vận hành xem chứng từ và ghi kết luận; quyết định cuối vẫn do hai bên.</span>}</The>
      <NutLink den={`/can-ho-tro?don=${encodeURIComponent(don.ma)}`} kieu="phu">Nhờ vận hành hỗ trợ</NutLink>
    </Khung>
  );
}

function SoBan() {
  const { so } = useToi();
  const don = useDon();
  if (!don) return <KhongCoDon />;
  const dsDn = deNghiCuaDon(so, don.ma);
  const goc = don.lichSu[0];
  return (
    <Khung>
      <The>
        <div className="hang giua"><strong>Bản 1 · khi tạo đơn</strong><Chip>{goc ? gioNgay(goc.luc) : ''}</Chip></div>
        <span className="nho">{goc?.noiDung}</span>
      </The>
      {dsDn.map((d, i) => (
        <The key={d.id} {...(d.trangThai === 'cho' ? { vien: 'lam' as const } : {})}>
          <div className="hang giua"><strong>{d.trangThai === 'dong_y' ? `Bản ${dsDn.slice(0, i + 1).filter(x => x.trangThai === 'dong_y').length + 1}` : 'Đề nghị'} · {d.tu === 'ban' ? 'bạn' : 'bên mua'} đề nghị</strong><Chip {...(d.trangThai === 'dong_y' ? { kieu: 'xong' as const } : d.trangThai === 'cho' ? { kieu: 'lam' as const } : { kieu: 'loi' as const })}>{d.trangThai === 'dong_y' ? 'Hai bên đã đồng ý' : d.trangThai === 'cho' ? 'Chờ trả lời' : 'Không đồng ý'}</Chip></div>
          <span>{moTaDeNghi(d)}</span><span className="nho phu">{d.lyDo} · {gioNgay(d.luc)}</span>
        </The>
      ))}
      <The noi><strong>Bản đang có hiệu lực</strong><span>{luong(don.kg)} × {dinhSo(don.gia)} đ, giao {nd(don.ngayGiao)}</span></The>
      {['cho_ban_xac_nhan', 'cho_coc', 'cho_giao'].includes(don.trangThai) && <NutLink den={denDon(don.ma, 'yeu-cau-thay-doi')}>Đề nghị sửa</NutLink>}
    </Khung>
  );
}

export const MAN_DON: Record<string, ComponentType> = {
  lich: Lich, 'chi-tiet-don': ChiTietDon, 'xac-nhan-don': XacNhanDon, 'so-sanh': SoSanh, coc: Coc, 'mo-lien-lac': MoLienLac, 'ket-qua': KetQua,
  'giao-mot-phan': GiaoMotPhan, 'doi-lich': DoiLich, 'yeu-cau-thay-doi': YeuCauThayDoi, 'huy-don': HuyDon, 'tranh-chap': TranhChap, 'so-ban': SoBan,
};
