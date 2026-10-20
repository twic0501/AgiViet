// Tiền: tiền đang giữ / đã về / còn chờ, tiền đã về của một đơn, bảng quyết toán, lịch sử theo tháng, ứng tiền trước.
import { Bao, Chip, Chon, Dong, dong, docSo, gioNgay, Icon, luong, Nut, NutLink, O, so as dinhSo, The, TheLink, TrangTrong } from '@agiviet/giao-dien';
import { chiaTienLoGop, tien, tienNguoiBan, type Don, type SoGiaoDich } from '@agiviet/nghiep-vu';
import { useState, type ComponentType } from 'react';
import { Khung, NutNghe, useThamSo, useToi } from '../chung.tsx';
import { denDon, KhongCoDon, useDon } from './don.tsx';

const TRANG_THAI_TIEN: Partial<Record<Don['trangThai'], [string, 'xong' | 'cho' | 'lam' | 'loi']>> = {
  cho_giao: ['Cọc đang giữ', 'cho'], cho_dong_y_huy: ['Cọc đang giữ', 'cho'], cho_ban_xn_kq: ['Chờ bạn xác nhận cân', 'lam'],
  da_chot: ['Chờ bên mua trả', 'cho'], tien_dang_giu: ['Ngân hàng đang chuyển', 'cho'], bao_da_tra: ['Bên mua báo đã trả', 'lam'],
  chua_thay_tien: ['Đang đối soát', 'loi'], da_nhan_tien: ['Đã về', 'xong'],
};

/** Các khoản tiền của người bán (để xem lịch sử và lọc theo đơn). */
function khoanTien(so: SoGiaoDich, banId: string) {
  const ds: { luc: number; donMa: string; noiDung: string; so: number }[] = [];
  for (const d of so.don.filter(x => x.ban.id === banId)) {
    if (d.daCoc) ds.push({ luc: d.daCoc.luc, donMa: d.ma, noiDung: 'Cọc vào tài khoản đảm bảo (giữ tới khi chốt)', so: 0 });
    const giaiNgan = d.lichSu.find(l => l.noiDung.startsWith('Ngân hàng chuyển') && !l.noiDung.includes('ứng trước'));
    if (giaiNgan) ds.push({ luc: giaiNgan.luc, donMa: d.ma, noiDung: 'Ngân hàng chuyển tiền hàng (gồm cọc)', so: d.phaiTra ?? 0 });
    for (const l of d.lichSu.filter(x => x.noiDung.startsWith('Người bán nhận '))) ds.push({ luc: l.luc, donMa: d.ma, noiDung: 'Nhận một phần (trả trực tiếp)', so: Number(l.noiDung.match(/nhận ([\d.]+) đ/)?.[1]?.replace(/\./g, '') ?? 0) });
    const du = d.lichSu.find(l => l.noiDung.startsWith('Người bán xác nhận đã nhận đủ') || l.noiDung.startsWith('Người bán thấy tiền'));
    if (du) ds.push({ luc: du.luc, donMa: d.ma, noiDung: 'Nhận đủ (trả trực tiếp)', so: d.tra?.so ?? 0 });
    if (d.trangThai === 'da_nhan_tien' && d.hoanCoc !== undefined) ds.push({ luc: d.lichSu.at(-1)!.luc, donMa: d.ma, noiDung: 'Tiền hàng trừ vào cọc', so: d.phaiTra ?? 0 });
    if (d.trangThai === 'da_huy' && d.huy?.cocVe === 'ban') ds.push({ luc: d.lichSu.at(-1)!.luc, donMa: d.ma, noiDung: 'Cọc thuộc về bạn (bên mua hủy)', so: d.daCoc?.so ?? 0 });
  }
  for (const u of so.ungTien.filter(x => x.ban.id === banId && x.trangThai !== 'cho_duyet' && x.trangThai !== 'tu_choi')) {
    ds.push({ luc: u.luc, donMa: u.donMa, noiDung: `Ứng trước (phí ${dinhSo(u.phi)} đ)`, so: u.so - u.phi });
    if (u.trangThai === 'da_thu_hoi') ds.push({ luc: so.don.find(d => d.ma === u.donMa)?.lichSu.at(-1)?.luc ?? u.luc, donMa: u.donMa, noiDung: 'Thu hồi khoản ứng từ tiền hàng', so: -u.so });
  }
  return ds.sort((a, b) => b.luc - a.luc);
}

function Tien() {
  const { nguoi, hoSo, so } = useToi();
  const t = tienNguoiBan(so, nguoi.id);
  const don = so.don.filter(d => d.ban.id === nguoi.id && TRANG_THAI_TIEN[d.trangThai]);
  return (
    <Khung>
      <div className="luoi-2">
        <The><span className="nho phu">Đang giữ ở tài khoản đảm bảo</span><strong className="so">{dong(t.dangGiu)}</strong></The>
        <The><span className="nho phu">Đã về</span><strong className="so">{dong(t.daVe)}</strong></The>
        <The><span className="nho phu">Bên mua còn phải trả</span><strong className="so">{dong(t.conCho)}</strong></The>
        <The><span className="nho phu">Đã ứng trước</span><strong className="so">{dong(t.daUng)}</strong></The>
      </div>
      {!hoSo.taiKhoanNhan && <TheLink den="/tai-khoan-nhan" vien="lam"><strong>Chưa có tài khoản nhận tiền</strong><span className="nho">Thêm để ngân hàng chuyển tiền hàng cho bạn.</span></TheLink>}
      <div className="luoi-2"><NutLink den="/ung-tien" kieu="phu"><Icon ten="wallet" />Nhận tiền trước</NutLink><NutLink den="/lich-su-tien" kieu="phu"><Icon ten="receipt" />Lịch sử tiền</NutLink></div>
      <section className="chong">
        <h2>Từng khoản theo đơn</h2>
        {!don.length && <TrangTrong tieuDe="Chưa có khoản tiền nào">Bên mua đặt cọc thì khoản đầu tiên hiện ở đây.</TrangTrong>}
        {don.map(d => {
          const [nhan, kieu] = TRANG_THAI_TIEN[d.trangThai]!;
          return (
            <TheLink key={d.ma} den={d.trangThai === 'da_nhan_tien' ? denDon(d.ma, 'tien-ve') : d.phaiTra !== undefined ? denDon(d.ma, 'quyet-toan') : denDon(d.ma)} {...(kieu === 'lam' ? { vien: 'lam' as const } : kieu === 'loi' ? { vien: 'loi' as const } : {})}>
              <div className="hang giua"><strong>{d.ma} · {d.mua.ten}</strong><Chip kieu={kieu}>{nhan}</Chip></div>
              <span className="nho so">{d.phaiTra !== undefined ? `Tiền hàng ${dong(d.phaiTra)} · đã nhận ${dong(d.daTra)}` : `Cọc ${dong(d.daCoc?.so)} · giá trị đơn ${dong(tien(d.kg, d.gia))}`}</span>
            </TheLink>
          );
        })}
      </section>
    </Khung>
  );
}

function TienVe() {
  const { nguoi, hoSo, so } = useToi();
  const ma = useThamSo('ma');
  const don = so.don.find(d => d.ma === ma && d.ban.id === nguoi.id) ?? so.don.find(d => d.ban.id === nguoi.id && d.trangThai === 'da_nhan_tien');
  if (!don) return <KhongCoDon />;
  if (don.trangThai !== 'da_nhan_tien') return <Khung><Bao kieu="thong-tin">Tiền đơn {don.ma} chưa về đủ.</Bao><NutLink den={denDon(don.ma)}>Xem đơn</NutLink></Khung>;
  const chia = chiaTienLoGop(so, don.ma);
  const ung = so.ungTien.find(u => u.donMa === don.ma && u.trangThai === 'da_thu_hoi');
  return (
    <Khung duoi={<NutLink den={denDon(don.ma, 'quyet-toan')} kieu="phu" rong>Xem bảng quyết toán</NutLink>}>
      <div className="an-mung chong"><Icon ten="payment" co={48} /><span>Tiền đã về</span><strong className="so-lon">{dong(don.daTra)}</strong><span>{don.ma} · {don.mua.ten}</span></div>
      <The>
        <Dong nhan="Đơn">{don.tenLo} · {luong(don.ketQuaCan?.nhan ?? don.kg)}</Dong>
        <Dong nhan="Tài khoản nhận">{hoSo.taiKhoanNhan ? `${hoSo.taiKhoanNhan.nganHang} · ${hoSo.taiKhoanNhan.so.replace(/\d(?=\d{4})/g, '•')}` : 'chưa có'}</Dong>
        <Dong nhan="Cách trả">{don.thanhToan === 'dam_bao' ? 'Tài khoản đảm bảo' : don.thanhToan === 'truc_tiep' ? 'Trực tiếp' : 'Trừ vào cọc'}</Dong>
        <Dong nhan="Thời gian">{gioNgay(don.lichSu.at(-1)!.luc)}</Dong>
        {ung && <Dong nhan="Đã trừ khoản ứng">{dong(ung.so)}</Dong>}
        {don.hoanCoc ? <Dong nhan="Cọc dư hoàn bên mua">{dong(don.hoanCoc)}</Dong> : null}
      </The>
      {chia && <The><strong>Chia cho các hộ trong lô gộp</strong>{chia.map(c => <Dong key={c.ho} nhan={`${c.ho} · ${luong(c.kgTrongDon)}`}>{dong(c.tien)}</Dong>)}</The>}
    </Khung>
  );
}

function QuyetToan() {
  const { so } = useToi();
  const don = useDon();
  if (!don) return <KhongCoDon />;
  if (!don.ketQuaCan || don.phaiTra === undefined) return <Khung><Bao kieu="thong-tin">Bảng quyết toán có sau khi bạn xác nhận số cân.</Bao><NutLink den={denDon(don.ma)}>Xem đơn</NutLink></Khung>;
  const kq = don.ketQuaCan, coc = don.daCoc?.so ?? 0;
  const ung = so.ungTien.find(u => u.donMa === don.ma && (u.trangThai === 'da_giai_ngan' || u.trangThai === 'da_thu_hoi'));
  const veTaiKhoan = (don.phaiTra ?? 0) - (ung?.so ?? 0);
  const doc = `Quyết toán đơn ${don.ma}. ${dinhSo(kq.nhan)} ký nhân ${dinhSo(don.gia)} đồng là ${dinhSo(don.phaiTra)} đồng. Trong đó cọc ${dinhSo(Math.min(coc, don.phaiTra))} đồng. Bên mua đã trả ${dinhSo(don.daTra)} đồng, còn ${dinhSo(don.conPhaiTra)} đồng.${ung ? ` Trừ khoản ứng trước ${dinhSo(ung.so)} đồng.` : ''} Bạn không trả phí giới thiệu.`;
  return (
    <Khung>
      <h1>Quyết toán {don.ma}</h1>
      <The>
        <Dong nhan={`${luong(kq.nhan)} × ${dinhSo(don.gia)} đ`}>{dong(don.phaiTra)}</Dong>
        <Dong nhan="Trong đó cọc đã giữ">{dong(Math.min(coc, don.phaiTra))}</Dong>
        <Dong nhan="Bên mua đã trả (gồm cọc)">{dong(don.daTra)}</Dong>
        <Dong nhan={<strong>Bên mua còn phải trả</strong>}><strong>{dong(don.conPhaiTra)}</strong></Dong>
      </The>
      <The>
        <Dong nhan="Phí giới thiệu">0 đ (bên mua trả)</Dong>
        {ung && <Dong nhan="Trừ khoản ứng trước">− {dong(ung.so)}</Dong>}
        <Dong nhan={<strong>Bạn nhận về tài khoản</strong>}><strong>{dong(veTaiKhoan)}</strong></Dong>
        {ung && <span className="nho phu">Phí ứng {dong(ung.phi)} đã trừ lúc nhận tiền ứng.</span>}
      </The>
      {kq.tuChoi > 0 && <span className="nho phu">{luong(kq.tuChoi)} bên mua không nhận: không tính tiền, lô ghi đã giao phần nhận.</span>}
      <NutNghe noiDung={doc} nhan="Nghe bảng tính" />
    </Khung>
  );
}

function LichSuTien() {
  const { nguoi, so } = useToi();
  const [loc, setLoc] = useState('');
  const ds = khoanTien(so, nguoi.id).filter(k => !loc || k.donMa === loc);
  const theoThang = ds.reduce<Record<string, typeof ds>>((m, k) => { const t = new Date(k.luc + 7 * 3600_000).toISOString().slice(0, 7); (m[t] ??= []).push(k); return m; }, {});
  const maDon = [...new Set(khoanTien(so, nguoi.id).map(k => k.donMa))];
  return (
    <Khung>
      <Chon nhan="Lọc theo đơn" value={loc} onChange={setLoc} luaChon={[{ gt: '', nhan: 'Tất cả đơn' }, ...maDon.map(m => ({ gt: m, nhan: m }))]} />
      {!ds.length && <TrangTrong tieuDe="Chưa có khoản nào" />}
      {Object.entries(theoThang).map(([thang, ks]) => (
        <section key={thang} className="chong">
          <h2>Tháng {thang.split('-').reverse().join('/')} <span className="phu so">· {dong(ks.reduce((s, k) => s + k.so, 0))}</span></h2>
          {ks.map((k, i) => <TheLink key={i} den={denDon(k.donMa)}><div className="hang giua"><span>{k.noiDung}</span><strong className="so">{k.so ? `${k.so > 0 ? '+' : '−'}${dong(Math.abs(k.so))}` : ''}</strong></div><span className="nho phu">{k.donMa} · {gioNgay(k.luc)}</span></TheLink>)}
        </section>
      ))}
    </Khung>
  );
}

function UngTien() {
  const { nguoi, so, lam } = useToi();
  const maChon = useThamSo('ma');
  const duDieuKien = so.don.filter(d => d.ban.id === nguoi.id && ['cho_giao', 'cho_ban_xn_kq', 'da_chot'].includes(d.trangThai) && !so.ungTien.some(u => u.donMa === d.ma && ['cho_duyet', 'da_giai_ngan'].includes(u.trangThai)));
  const [chon, setMa] = useState(maChon);
  const ma = duDieuKien.some(d => d.ma === chon) ? chon : duDieuKien[0]?.ma ?? '';
  const don = duDieuKien.find(d => d.ma === ma);
  const toiDa = don ? Math.floor(tien(don.kg, don.gia) * so.chinhSach.ungToiDa / 1000) * 1000 : 0;
  const [soUng, setSoUng] = useState('');
  const ung = soUng ? docSo(soUng) : toiDa;
  const cuaToi = so.ungTien.filter(u => u.ban.id === nguoi.id);
  return (
    <Khung>
      <Bao kieu="thong-tin">Ngân hàng đối tác ứng trước tối đa {Math.round(so.chinhSach.ungToiDa * 100)}% giá trị đơn đã có cọc, phí {(so.chinhSach.phiUng * 100).toLocaleString('vi-VN')}% số ứng. Khi đơn xong, khoản ứng tự trừ vào tiền hàng.</Bao>
      {!duDieuKien.length ? <TrangTrong tieuDe="Chưa có đơn đủ điều kiện">Đơn phải đã đặt cọc và chưa nhận tiền, chưa có khoản ứng.</TrangTrong> : <The>
        <Chon nhan="Đơn" value={ma} onChange={x => { setMa(x); setSoUng(''); }} luaChon={duDieuKien.map(d => ({ gt: d.ma, nhan: `${d.ma} · ${d.mua.ten} · ${dong(tien(d.kg, d.gia))}` }))} />
        <Dong nhan="Ứng được tối đa">{dong(toiDa)}</Dong>
        <O nhan="Số muốn ứng" kieu="so" donVi="đ" value={soUng || String(toiDa)} onChange={setSoUng} />
        <Dong nhan="Phí">{dong(Math.round(ung * so.chinhSach.phiUng))}</Dong>
        <Dong nhan="Bạn nhận">{dong(ung - Math.round(ung * so.chinhSach.phiUng))}</Dong>
        <Dong nhan="Ngân hàng đối tác">Agribank (mô phỏng), duyệt trong vài phút</Dong>
        <Nut onClick={() => lam({ loai: 'xin_ung_tien', donMa: ma, so: ung }, { bao: 'Đã gửi. Ngân hàng duyệt xong sẽ chuyển vào tài khoản của bạn.' })}>Đồng ý, nhận tiền trước</Nut>
      </The>}
      {cuaToi.length > 0 && <section className="chong"><h2>Các khoản ứng</h2>{cuaToi.map(u => <TheLink key={u.id} den={denDon(u.donMa)}><div className="hang giua"><strong>{u.donMa} · {dong(u.so)}</strong><Chip kieu={u.trangThai === 'cho_duyet' ? 'cho' : u.trangThai === 'tu_choi' ? 'loi' : 'xong'}>{u.trangThai === 'cho_duyet' ? 'Chờ ngân hàng duyệt' : u.trangThai === 'da_giai_ngan' ? 'Đã nhận' : u.trangThai === 'da_thu_hoi' ? 'Đã trừ vào tiền hàng' : 'Không duyệt'}</Chip></div><span className="nho phu">Phí {dong(u.phi)} · {gioNgay(u.luc)}</span></TheLink>)}</section>}
    </Khung>
  );
}

export const MAN_TIEN: Record<string, ComponentType> = { tien: Tien, 'tien-ve': TienVe, 'quyet-toan': QuyetToan, 'lich-su-tien': LichSuTien, 'ung-tien': UngTien };
