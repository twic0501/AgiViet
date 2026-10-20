// Công cụ mô phỏng (không có trong app thật): Phòng thử chạy các ca kiểm thử của app bán và mở kết quả ngay trên app;
// Giả lập bên mua nạp dữ liệu mẫu, tua đồng hồ, cho các bên mua mẫu làm việc của họ bằng lệnh thật.
import { Bao, Chip, gioNgay, Icon, Nut, NutHoiLai, NutLink, Tab, The, TrangTrong, useMayChu, useSo } from '@agiviet/giao-dien';
import { BoDung, CA_KIEM_THU_BAN, chayCa, chayMotNhip, damBaoNguoiMuaMau, dangKyNguoiBanMau, kichBanMau, lenhNhuCauMau, NGUOI_BAN_MAU, TRE, viecGiaLap, type KetQuaCa, type ViecGiaLap } from '@agiviet/may-chu';
import { soTrong } from '@agiviet/nghiep-vu';
import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { Khung } from '../chung.tsx';
import { PHIEN, useNguoi } from '../phien.ts';

const NHOM_CA = [...new Set(CA_KIEM_THU_BAN.map(c => c.nhom))];

function PhongThu() {
  const { dv, bao } = useMayChu();
  const di = useNavigate();
  const [kq, setKq] = useState<Record<string, KetQuaCa>>({});
  const [mo, setMo] = useState<string | null>(null);
  const chay = (ma: string) => { const ca = CA_KIEM_THU_BAN.find(c => c.ma === ma)!; const r = chayCa(ca); setKq(k => ({ ...k, [ma]: r })); setMo(ma); };
  const chayHet = () => { const t: Record<string, KetQuaCa> = {}; for (const ca of CA_KIEM_THU_BAN) t[ca.ma] = chayCa(ca); setKq(t); bao(`Đã chạy ${CA_KIEM_THU_BAN.length} ca: ${Object.values(t).filter(r => r.dat).length} đạt.`); };
  const xem = (r: KetQuaCa) => {
    if (!r.so) return;
    dv.nap(r.so);
    PHIEN.dat(NGUOI_BAN_MAU);
    bao(`Đã nạp dữ liệu ca ${r.ca.ma}. Bạn đang là ${NGUOI_BAN_MAU.ten}.`);
    di(`/${r.man}`);
  };
  const daChay = Object.values(kq);
  return (
    <Khung>
      <Bao kieu="thong-tin">Mỗi ca dựng tình huống riêng trên máy chủ mô phỏng trong bộ nhớ, làm các bước như người dùng (người bán và bên mua mẫu) rồi kiểm từng điểm. Chạy ca không đụng dữ liệu đang dùng; bấm "Xem trên app" mới thay dữ liệu bằng kết quả của ca.</Bao>
      <div className="hang giua"><Nut onClick={chayHet}><Icon ten="retry" />Chạy tất cả {CA_KIEM_THU_BAN.length} ca</Nut>{daChay.length > 0 && <Chip kieu={daChay.every(r => r.dat) ? 'xong' : 'loi'}>{daChay.filter(r => r.dat).length}/{daChay.length} đạt</Chip>}</div>
      {NHOM_CA.map(nhom => (
        <section key={nhom} className="chong">
          <h2>{nhom}</h2>
          {CA_KIEM_THU_BAN.filter(c => c.nhom === nhom).map(ca => {
            const r = kq[ca.ma];
            return (
              <The key={ca.ma} {...(r && !r.dat ? { vien: 'loi' as const } : {})}>
                <div className="hang giua"><strong>{ca.ma} · {ca.ten}</strong>{r ? <Chip kieu={r.dat ? 'xong' : 'loi'}>{r.dat ? 'Đạt' : 'Không đạt'}</Chip> : <Chip>Chưa chạy</Chip>}</div>
                <span className="nho phu">{ca.kyVong}</span>
                {r && mo === ca.ma && <ul className="chong hep" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {r.kiemTra.map((k, i) => <li key={i} className="hang ngang" style={{ alignItems: 'flex-start' }}><span style={{ color: k.dat ? 'var(--mau-chinh)' : 'var(--mau-gach)' }}><Icon ten={k.dat ? 'done' : 'issue'} co={18} /></span><span className="nho grow">{k.moTa}{k.chiTiet ? <span className="phu"> · {k.chiTiet}</span> : null}</span></li>)}
                  {r.loi && <li className="nho" style={{ color: 'var(--mau-gach)' }}>Lỗi khi chạy: {r.loi}</li>}
                </ul>}
                <div className="luoi-2">
                  <Nut kieu="phu" nho onClick={() => (r && mo !== ca.ma ? setMo(ca.ma) : chay(ca.ma))}>{r && mo !== ca.ma ? 'Xem điểm kiểm' : r ? 'Chạy lại' : 'Chạy'}</Nut>
                  {r?.so && <NutHoiLai nho kieu="chinh" kieuDongY="chinh" tieuDe={`Xem ca ${ca.ma} trên app?`} noiDung="Dữ liệu mô phỏng hiện tại (cả bên app mua) được thay bằng kết quả của ca này. Muốn quay lại dữ liệu mẫu thì vào Giả lập, nạp kịch bản mẫu." nutDongY="Xem trên app" onDongY={() => xem(r)}>Xem trên app</NutHoiLai>}
                </div>
              </The>
            );
          })}
        </section>
      ))}
    </Khung>
  );
}

const NHAN_NHOM_VIEC: Record<ViecGiaLap['nhom'], string> = { ket_noi: 'Kết nối', trao_doi: 'Trao đổi', don: 'Đơn', tien: 'Tiền', khac: 'Khác' };
const NGAY = 864e5;

function GiaLap() {
  const { dv, dongHo, bao } = useMayChu();
  const so = useSo();
  const nguoi = useNguoi();
  const di = useNavigate();
  const [nhom, setNhom] = useState<ViecGiaLap['nhom']>('don');
  const banId = nguoi?.id ?? NGUOI_BAN_MAU.id;
  const coBan = so.nguoiDung.some(n => n.id === banId && n.vai === 'ban');
  const bayGio = dv.bayGio();
  const viec = coBan ? viecGiaLap(so, banId, bayGio) : [];
  const theoNhom = (n: ViecGiaLap['nhom']) => viec.filter(v => v.nhom === n);

  const napKichBan = () => { dv.nap(kichBanMau(dongHo.bayGio())); PHIEN.dat(NGUOI_BAN_MAU); bao('Đã nạp kịch bản mẫu: 20 ngày làm ăn của chị Năm.'); di('/hom-nay'); };
  const batDauTrong = () => { const b = new BoDung(dongHo.bayGio()); damBaoNguoiMuaMau(b.dv); dangKyNguoiBanMau(b); dv.nap(b.so); PHIEN.dat(NGUOI_BAN_MAU); bao('Chị Năm đã đăng ký, chưa có lô hay đơn nào.'); di('/hom-nay'); };
  const xoaHet = () => { dv.nap(soTrong()); dongHo.datLai(); PHIEN.dat(null); bao('Đã xóa toàn bộ dữ liệu mô phỏng.'); di('/chao-mung'); };
  const tua = (ms: number, nhan: string) => { dongHo.tua(ms); const n = chayMotNhip(dv); bao(`Đã tua ${nhan}.${n ? ` Hệ thống làm ${n} việc tới hạn.` : ''}`); };
  const lam = (v: ViecGiaLap) => { const kq = dv.thucHien(v.nguoi, v.lenh); bao(kq.ok ? `Xong: ${v.nhan}` : kq.loi, kq.ok ? 'tot' : 'loi'); };
  const lech = dongHo.doLech();

  return (
    <Khung>
      <The>
        <h2>Dữ liệu</h2>
        <span className="nho phu">Máy chủ mô phỏng dùng chung cho app bán và app mua trên trình duyệt này. Hiện có {so.nguoiDung.length} người dùng, {so.lo.length} lô, {so.don.length} đơn.</span>
        <NutHoiLai kieu="chinh" kieuDongY="chinh" rong tieuDe="Nạp kịch bản mẫu?" noiDung="Thay toàn bộ dữ liệu bằng kịch bản mẫu: 4 lô, đơn ở đủ 13 trạng thái, tin nhắn, báo giá, sổ vườn, tiền, dịch vụ." nutDongY="Nạp" onDongY={napKichBan}>Nạp kịch bản mẫu (đủ mọi trạng thái)</NutHoiLai>
        <div className="luoi-2">
          <NutHoiLai tieuDe="Bắt đầu trống?" noiDung="Xóa dữ liệu, chỉ giữ chị Năm (đã xác minh) và 3 bên mua mẫu." nutDongY="Bắt đầu" kieuDongY="chinh" onDongY={batDauTrong}>Bắt đầu trống</NutHoiLai>
          <NutHoiLai kieu="canh-bao" tieuDe="Xóa toàn bộ dữ liệu?" noiDung="Xóa mọi người dùng, lô, đơn và về giờ thật. Không hoàn tác được." nutDongY="Xóa hết" onDongY={xoaHet}>Xóa hết</NutHoiLai>
        </div>
      </The>
      <The>
        <h2>Đồng hồ</h2>
        <span className="nho">Giờ mô phỏng: {gioNgay(bayGio)}{lech ? ` (đã tua ${Math.round(lech / 3600_000)} giờ)` : ' (giờ thật)'}</span>
        <div className="luoi-3">
          <Nut kieu="phu" nho onClick={() => tua(TRE.nganHang, `${TRE.nganHang / 60_000} phút: ngân hàng, đối tác phản hồi`)}>+{TRE.nganHang / 60_000} phút</Nut>
          <Nut kieu="phu" nho onClick={() => tua(NGAY, '1 ngày')}>+1 ngày</Nut>
          <Nut kieu="phu" nho onClick={() => tua(2 * NGAY + 3600_000, '49 giờ: quá hạn cọc')}>+49 giờ</Nut>
          <Nut kieu="phu" nho onClick={() => tua(7 * NGAY, '7 ngày: hết cách ly')}>+7 ngày</Nut>
          <Nut kieu="phu" nho onClick={() => tua(15 * NGAY, '15 ngày: tin tự ẩn')}>+15 ngày</Nut>
          <Nut kieu="nhe" nho disabled={!lech} onClick={() => { dongHo.datLai(); bao('Đã về giờ thật.'); }}>Về giờ thật</Nut>
        </div>
      </The>
      <section className="chong">
        <h2>Bên mua làm tiếp</h2>
        {!coBan ? <TrangTrong tieuDe="Chưa có người bán" hanhDong={<Nut onClick={batDauTrong}>Tạo chị Năm</Nut>}>Đăng ký trong app hoặc nạp kịch bản mẫu trước.</TrangTrong> : <>
          <span className="nho phu">Đang giả lập cho người bán: {so.nguoiDung.find(n => n.id === banId)?.ten}. Mỗi nút là một lệnh thật của bên mua mẫu.</span>
          <Tab value={nhom} onChange={setNhom} ds={(Object.keys(NHAN_NHOM_VIEC) as ViecGiaLap['nhom'][]).map(n => ({ gt: n, nhan: NHAN_NHOM_VIEC[n], so: theoNhom(n).length }))} />
          {nhom === 'khac' && [0, 1, 2].map(i => { const m = lenhNhuCauMau(so, bayGio, i); return <Nut key={i} kieu="phu" onClick={() => { const kq = dv.thucHien(m.nguoi, m.lenh); bao(kq.ok ? `${m.nguoi.ten} đăng tin cần mua.` : kq.loi, kq.ok ? 'tot' : 'loi'); }}>{m.nguoi.ten} đăng tin cần mua{'ten' in m.lenh ? ` "${m.lenh.ten}"` : ''}</Nut>; })}
          {!theoNhom(nhom).length && nhom !== 'khac' && <TrangTrong tieuDe="Bên mua chưa có việc ở nhóm này">Làm thêm bước bên người bán (đăng lô, đồng ý kết nối, xác nhận đơn…) rồi quay lại.</TrangTrong>}
          {theoNhom(nhom).map((v, i) => <Nut key={i} kieu="phu" onClick={() => lam(v)}>{v.nhan}</Nut>)}
        </>}
      </section>
      <NutLink den="/phong-thu" kieu="nhe">Mở Phòng thử</NutLink>
    </Khung>
  );
}

export const MAN_CONG_CU: Record<string, ComponentType> = { 'phong-thu': PhongThu, 'gia-lap': GiaLap };
