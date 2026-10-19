// Sổ làm vườn: vườn, mùa vụ, nhật ký, thu chi, nói để ghi, kiểm tra dòng vừa ghi, cách ly, hồ sơ nguồn gốc.
import { Bao, Chip, Chon, ChonNut, CongTac, dong, Dong, docSo, Icon, Nut, NutHoiLai, NutLink, O, The, TheLink, TienTrinh, TrangTrong } from '@agiviet/giao-dien';
import { hetCachLy, hoSoNguonGoc, loiLoVu, ngayCua, type GiaiDoanVu, type LoaiNhatKy } from '@agiviet/nghiep-vu';
import qrcode from 'qrcode-generator';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { Khung, useThamSo, useToi } from '../chung.tsx';
import { matHangTuCay, NHAP_LO_TRONG, type NhapLo } from '../nhap-lo.ts';
import { useNhap } from '../phien.ts';
import { coTheNghe, ngheNoi } from '../tieng-noi.ts';
import { tachCau, type LoaiGhi } from '../tro-ly.ts';

const GIAI_DOAN: { gt: GiaiDoanVu; nhan: string }[] = [{ gt: 'chuan_bi', nhan: 'Chuẩn bị' }, { gt: 'ra_hoa', nhan: 'Ra hoa' }, { gt: 'dau_trai', nhan: 'Đậu trái, lớn' }, { gt: 'thu_hoach', nhan: 'Thu hoạch' }, { gt: 'xong', nhan: 'Đã xong' }];
const VIEC: Record<LoaiNhatKy, [string, string]> = { phun_thuoc: ['Phun thuốc', 'spray'], bon_phan: ['Bón phân', 'fertilizer'], tuoi: ['Tưới', 'watering'], thu_hoach: ['Thu hoạch', 'harvest'], cham_soc: ['Chăm sóc', 'leaf'], khac: ['Khác', 'journal'] };
const donViDT = (d: string) => (d === 'cong' ? 'công' : d === 'm2' ? 'm²' : 'ha');

function VuonCuaToi() {
  const { nguoi, so, bayGio, lam } = useToi();
  const [them, setThem] = useState(false);
  const [v, setV] = useState({ ten: '', cay: '', dienTich: '', donVi: 'cong' as 'cong' | 'ha' | 'm2', loai: 'vuon' as 'vuon' | 'ao' | 'ruong', soGoc: '' });
  const ds = so.vuon.filter(x => x.ban.id === nguoi.id);
  const luu = () => { const kq = lam({ loai: 'them_vuon', ten: v.ten, loaiVuon: v.loai, dienTich: docSo(v.dienTich), donViDienTich: v.donVi, cay: v.cay, soGoc: docSo(v.soGoc) || 0 }, { bao: 'Đã thêm vườn.' }); if (kq.ok) { setThem(false); setV({ ...v, ten: '', cay: '', dienTich: '', soGoc: '' }); } };
  return (
    <Khung duoi={<NutLink den="/ghi" rong><Icon ten="microphone" />Nói để ghi nhật ký, thu chi</NutLink>}>
      {!ds.length && !them && <TrangTrong tieuDe="Chưa khai vườn, ao nào" hanhDong={<Nut onClick={() => setThem(true)}>Thêm vườn</Nut>}>Khai vườn để ghi nhật ký, biết lời lỗ từng vụ, và đăng bán có hồ sơ nguồn gốc.</TrangTrong>}
      {ds.map(x => {
        const h = hoSoNguonGoc(so, x.id, bayGio)!;
        return (
          <The key={x.id} noi>
            <div className="hang giua"><div className="chong hep"><strong>{x.ten}</strong><span className="nho phu">{x.cay} · {x.dienTich} {donViDT(x.donViDienTich)}{x.soGoc ? ` · ${x.soGoc} gốc` : ''}</span></div><Icon ten={x.loai === 'ao' ? 'pond' : 'garden'} co={28} /></div>
            {h.vu ? <span>Vụ đang chạy: <strong>{h.vu.ten}</strong> · {GIAI_DOAN.find(g => g.gt === h.vu!.giaiDoan)?.nhan}</span> : <span className="phu">Chưa có vụ đang chạy</span>}
            {h.dangCachLy && <Chip kieu="loi">Cách ly thuốc tới {h.cachLy!.split('-').reverse().join('/')}</Chip>}
            <div className="chong hep"><span className="nho">Hồ sơ vườn đầy đủ {h.mucDayDu}%</span><TienTrinh phan={h.mucDayDu / 100} nhan="Mức đầy đủ hồ sơ vườn" /></div>
            <div className="luoi-3">
              <NutLink den={`/mua-vu?vuon=${x.id}`} kieu="phu" nho>Mùa vụ</NutLink>
              <NutLink den={`/nhat-ky?vuon=${x.id}`} kieu="phu" nho>Nhật ký</NutLink>
              <NutLink den={`/ho-so-vuon?vuon=${x.id}`} kieu="phu" nho>Nguồn gốc</NutLink>
            </div>
          </The>
        );
      })}
      {(ds.length > 0 || them) && !them && <Nut kieu="phu" onClick={() => setThem(true)}><Icon ten="plus" />Thêm vườn, ao</Nut>}
      {them && (
        <The>
          <h2>Thêm vườn, ao</h2>
          <ChonNut value={v.loai} onChange={x => setV({ ...v, loai: x })} luaChon={[{ gt: 'vuon', nhan: 'Vườn' }, { gt: 'ao', nhan: 'Ao, đầm' }, { gt: 'ruong', nhan: 'Ruộng' }]} />
          <O nhan="Tên gọi" value={v.ten} onChange={x => setV({ ...v, ten: x })} placeholder="Vườn sau nhà" />
          <O nhan="Cây trồng / con nuôi" value={v.cay} onChange={x => setV({ ...v, cay: x })} placeholder="Xoài cát Chu" />
          <div className="luoi-2"><O nhan="Diện tích" kieu="so" value={v.dienTich} onChange={x => setV({ ...v, dienTich: x })} /><ChonNut nhan="Đơn vị" value={v.donVi} onChange={x => setV({ ...v, donVi: x })} luaChon={[{ gt: 'cong', nhan: 'công' }, { gt: 'ha', nhan: 'ha' }, { gt: 'm2', nhan: 'm²' }]} /></div>
          <O nhan="Số gốc" kieu="so" value={v.soGoc} onChange={x => setV({ ...v, soGoc: x })} />
          <div className="luoi-2"><Nut kieu="phu" onClick={() => setThem(false)}>Thôi</Nut><Nut onClick={luu}>Lưu</Nut></div>
        </The>
      )}
    </Khung>
  );
}

/** Vườn đang chọn (theo ?vuon=, mặc định vườn đầu tiên). */
function useVuonChon() {
  const { nguoi, so } = useToi();
  const id = useThamSo('vuon');
  const ds = so.vuon.filter(x => x.ban.id === nguoi.id);
  return { ds, vuon: ds.find(x => x.id === id) ?? ds[0] };
}

function MuaVu() {
  const { so, lam, bayGio } = useToi();
  const di = useNavigate();
  const { vuon } = useVuonChon();
  const [, datLo] = useNhap<NhapLo>('dang-lo', NHAP_LO_TRONG);
  const [moi, setMoi] = useState({ ten: '', batDau: ngayCua(bayGio), san: '', hai: '' });
  if (!vuon) return <Khung><TrangTrong tieuDe="Chưa có vườn" hanhDong={<NutLink den="/vuon">Thêm vườn</NutLink>} /></Khung>;
  const vu = so.muaVu.find(m => m.vuonId === vuon.id && m.giaiDoan !== 'xong');
  const cu = so.muaVu.filter(m => m.vuonId === vuon.id && m.giaiDoan === 'xong');
  const iDang = vu ? GIAI_DOAN.findIndex(g => g.gt === vu.giaiDoan) : -1;
  const dangBan = () => {
    const het = hetCachLy(so, vuon.id), homNay = ngayCua(bayGio);
    datLo({ ...NHAP_LO_TRONG, cach: 'vu', vuonId: vuon.id, matHang: matHangTuCay(vuon.cay), ten: vuon.cay, kg: vu ? String(vu.sanLuongUoc) : '', haiTu: het && het > homNay ? het : (vu?.haiDuKien ?? homNay), coSo: 'uoc_tinh' });
    di('/kiem-tra');
  };
  return (
    <Khung duoi={vu && <Nut rong onClick={dangBan}>Đăng bán từ vụ này</Nut>}>
      <span className="phu">{vuon.ten} · {vuon.cay}</span>
      {vu ? (
        <>
          <The noi>
            <h2>{vu.ten}</h2>
            <ol className="dong-thoi-gian">{GIAI_DOAN.map((g, i) => <li key={g.gt} className={i < iDang ? 'qua' : i === iDang ? 'dang' : ''}><span>{g.nhan}{i === iDang ? ' · đang ở đây' : ''}</span></li>)}</ol>
            {iDang < GIAI_DOAN.length - 1 && <Nut kieu="phu" onClick={() => lam({ loai: 'cap_nhat_mua_vu', muaVuId: vu.id, giaiDoan: GIAI_DOAN[iDang + 1]!.gt }, { bao: `Đã chuyển sang "${GIAI_DOAN[iDang + 1]!.nhan}".` })}>Sang giai đoạn "{GIAI_DOAN[iDang + 1]!.nhan}"</Nut>}
          </The>
          <The>
            <Dong nhan="Bắt đầu vụ">{vu.batDau.split('-').reverse().join('/')}</Dong>
            <O nhan="Sản lượng ước (kg)" kieu="so" value={String(vu.sanLuongUoc)} onChange={x => lam({ loai: 'cap_nhat_mua_vu', muaVuId: vu.id, sanLuongUoc: docSo(x) || 0 })} />
            <O nhan="Ngày hái dự kiến" kieu="ngay" value={vu.haiDuKien} onChange={x => x && lam({ loai: 'cap_nhat_mua_vu', muaVuId: vu.id, haiDuKien: x })} />
            {(() => { const ll = loiLoVu(so, vu.id)!; return <Dong nhan="Lời lỗ vụ tới nay"><span style={{ color: ll.loi >= 0 ? 'var(--mau-chinh)' : 'var(--mau-gach)' }}>{dong(ll.loi)}</span></Dong>; })()}
            <NutLink den={`/thu-chi?vu=${vu.id}`} kieu="nhe" nho>Xem thu chi của vụ</NutLink>
          </The>
        </>
      ) : (
        <The>
          <h2>Bắt đầu vụ mới</h2>
          <O nhan="Tên vụ" value={moi.ten} onChange={x => setMoi({ ...moi, ten: x })} placeholder={`${vuon.cay} vụ ${new Date(bayGio).getFullYear()}`} />
          <div className="luoi-2"><O nhan="Bắt đầu" kieu="ngay" value={moi.batDau} onChange={x => setMoi({ ...moi, batDau: x })} /><O nhan="Hái dự kiến" kieu="ngay" value={moi.hai} onChange={x => setMoi({ ...moi, hai: x })} /></div>
          <O nhan="Sản lượng ước" kieu="so" donVi="kg" value={moi.san} onChange={x => setMoi({ ...moi, san: x })} />
          <Nut onClick={() => lam({ loai: 'them_mua_vu', vuonId: vuon.id, ten: moi.ten || `${vuon.cay} vụ ${new Date(bayGio).getFullYear()}`, batDau: moi.batDau, haiDuKien: moi.hai, sanLuongUoc: docSo(moi.san) || 0 }, { bao: 'Đã bắt đầu vụ mới.' })}>Bắt đầu vụ</Nut>
        </The>
      )}
      {cu.length > 0 && <section className="chong"><h2>Vụ đã xong</h2>{cu.map(m => { const ll = loiLoVu(so, m.id)!; return <The key={m.id}><strong>{m.ten}</strong><Dong nhan="Lời lỗ">{dong(ll.loi)}</Dong></The>; })}</section>}
    </Khung>
  );
}

function NhatKy() {
  const { so, lam } = useToi();
  const { ds, vuon } = useVuonChon();
  const [chon, setChon] = useState(vuon?.id ?? 'tat-ca');
  const dong = so.nhatKy.filter(k => ds.some(v => v.id === k.vuonId) && (chon === 'tat-ca' || k.vuonId === chon));
  return (
    <Khung duoi={<NutLink den="/ghi" rong><Icon ten="microphone" />Nói để ghi thêm</NutLink>}>
      {ds.length > 1 && <Chon nhan="Vườn" value={chon} onChange={setChon} luaChon={[{ gt: 'tat-ca', nhan: 'Tất cả vườn' }, ...ds.map(v => ({ gt: v.id, nhan: v.ten }))]} />}
      {!dong.length && <TrangTrong tieuDe="Chưa có dòng nhật ký">Nói "sáng nay phun thuốc trừ rầy cho vườn xoài, cách ly 7 ngày", app tự tách thành dòng nhật ký.</TrangTrong>}
      {dong.map(k => (
        <The key={k.id}>
          <div className="hang giua"><span className="hang ngang"><Icon ten={VIEC[k.loai][1]} /><strong>{VIEC[k.loai][0]}</strong></span><span className="nho phu">{k.ngay.split('-').reverse().join('/')}</span></div>
          <span>{k.noiDung}</span>
          {(k.vatTu || k.luong) && <span className="nho phu">{[k.vatTu, k.luong].filter(Boolean).join(' · ')}</span>}
          {k.loai === 'phun_thuoc' && <Chip kieu="lam">Cách ly {k.ngayCachLy} ngày</Chip>}
          <span className="nho phu">{ds.find(v => v.id === k.vuonId)?.ten}</span>
          <NutHoiLai nho kieu="nhe" tieuDe="Xóa dòng nhật ký?" noiDung={<p>Dòng phun thuốc của vườn đã có đơn sẽ không xóa được: ghi dòng đính chính thay vì xóa.</p>} nutDongY="Xóa" onDongY={() => lam({ loai: 'xoa_nhat_ky', nhatKyId: k.id }, { bao: 'Đã xóa.' })}>Xóa</NutHoiLai>
        </The>
      ))}
    </Khung>
  );
}

function ThuChi() {
  const { nguoi, so, lam, bayGio } = useToi();
  const vuId = useThamSo('vu');
  const vuCuaToi = so.muaVu.filter(m => m.ban.id === nguoi.id);
  const [chon, setChon] = useState(vuId || vuCuaToi.find(m => m.giaiDoan !== 'xong')?.id || 'tat-ca');
  const [moi, setMoi] = useState({ loai: 'chi' as 'thu' | 'chi', so: '', noiDung: '', ngay: ngayCua(bayGio) });
  const ds = so.thuChi.filter(t => t.ban.id === nguoi.id && (chon === 'tat-ca' || t.muaVuId === chon));
  const ll = chon !== 'tat-ca' ? loiLoVu(so, chon) : null;
  const tienApp = so.don.filter(d => d.ban.id === nguoi.id && d.trangThai === 'da_nhan_tien');
  const tong = { thu: ds.filter(t => t.loai === 'thu').reduce((s, t) => s + t.so, 0) + (chon === 'tat-ca' ? tienApp.reduce((s, d) => s + (d.daTra ?? 0), 0) : ll!.thuApp), chi: ds.filter(t => t.loai === 'chi').reduce((s, t) => s + t.so, 0) };
  return (
    <Khung>
      <Chon nhan="Xem theo" value={chon} onChange={setChon} luaChon={[{ gt: 'tat-ca', nhan: 'Tất cả' }, ...vuCuaToi.map(m => ({ gt: m.id, nhan: m.ten }))]} />
      <div className="luoi-3">
        <The><span className="nho phu">Thu</span><strong className="so">{dong(tong.thu)}</strong></The>
        <The><span className="nho phu">Chi</span><strong className="so">{dong(tong.chi)}</strong></The>
        <The><span className="nho phu">Lời lỗ</span><strong className="so" style={{ color: tong.thu - tong.chi >= 0 ? 'var(--mau-chinh)' : 'var(--mau-gach)' }}>{dong(tong.thu - tong.chi)}</strong></The>
      </div>
      <Bao kieu="thong-tin">Tiền bán qua app tự vào sổ khi đơn nhận đủ tiền{chon !== 'tat-ca' ? ' (lô gắn với vườn của vụ này)' : ''}: {dong(chon === 'tat-ca' ? tienApp.reduce((s, d) => s + (d.daTra ?? 0), 0) : ll!.thuApp)}.</Bao>
      <The>
        <h2>Ghi khoản mới</h2>
        <ChonNut value={moi.loai} onChange={x => setMoi({ ...moi, loai: x })} luaChon={[{ gt: 'chi', nhan: 'Chi' }, { gt: 'thu', nhan: 'Thu' }]} />
        <O nhan="Số tiền" kieu="so" donVi="đ" value={moi.so} onChange={x => setMoi({ ...moi, so: x })} />
        <O nhan="Khoản gì" value={moi.noiDung} onChange={x => setMoi({ ...moi, noiDung: x })} placeholder="Mua 3 bao phân" />
        <O nhan="Ngày" kieu="ngay" value={moi.ngay} onChange={x => setMoi({ ...moi, ngay: x })} />
        <Nut onClick={() => { const kq = lam({ loai: 'ghi_thu_chi', loaiTien: moi.loai, so: docSo(moi.so), noiDung: moi.noiDung, ngay: moi.ngay, ...(chon !== 'tat-ca' ? { muaVuId: chon } : {}) }, { bao: 'Đã ghi.' }); if (kq.ok) setMoi({ ...moi, so: '', noiDung: '' }); }}>Ghi</Nut>
      </The>
      {ds.map(t => (
        <The key={t.id}>
          <div className="hang giua"><span>{t.noiDung}</span><strong className="so" style={{ color: t.loai === 'thu' ? 'var(--mau-chinh)' : 'var(--chu)' }}>{t.loai === 'thu' ? '+' : '−'}{dong(t.so)}</strong></div>
          <div className="hang giua"><span className="nho phu">{t.ngay.split('-').reverse().join('/')}</span><NutHoiLai nho kieu="nhe" tieuDe="Xóa khoản này?" nutDongY="Xóa" onDongY={() => lam({ loai: 'xoa_thu_chi', thuChiId: t.id }, { bao: 'Đã xóa.' })}>Xóa</NutHoiLai></div>
        </The>
      ))}
      {chon === 'tat-ca' && tienApp.map(d => <The key={d.ma}><div className="hang giua"><span>Tiền bán {d.tenLo} ({d.ma})</span><strong className="so" style={{ color: 'var(--mau-chinh)' }}>+{dong(d.daTra)}</strong></div><span className="nho phu">qua app · {d.mua.ten}</span></The>)}
    </Khung>
  );
}

const VI_DU = ['Sáng nay phun thuốc trừ rầy cho vườn xoài 2 bình, cách ly 7 ngày', 'Hôm qua mua 3 bao phân NPK hết 900 nghìn', 'Tưới ao tôm, thay 20% nước', 'Bán được 2 triệu tiền chuối'];

function Ghi() {
  const di = useNavigate();
  const [nhap, dat] = useNhap('ghi', { chu: '' });
  const [nghe, setNghe] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const dung = useRef<() => void>(() => {});
  useEffect(() => () => dung.current(), []);
  const batTat = () => {
    if (nghe) { dung.current(); setNghe(false); return; }
    setLoi(null); setNghe(true);
    dung.current = ngheNoi((chu) => dat({ chu }), l => { setLoi(l); setNghe(false); }, () => setNghe(false));
  };
  return (
    <Khung duoi={<Nut rong disabled={!nhap.chu.trim()} onClick={() => di('/xac-nhan-ghi')}>Tiếp: kiểm tra</Nut>}>
      <p className="phu">Nói một câu: việc gì, ở vườn nào, dùng gì, bao nhiêu tiền. App tách thành dòng nhật ký hoặc thu chi để bạn kiểm lại.</p>
      <button type="button" className="mic" aria-pressed={nghe} onClick={batTat} aria-label={nghe ? 'Dừng nghe' : 'Bắt đầu nói'}><Icon ten="microphone" co={56} /></button>
      <p className="phu" style={{ textAlign: 'center' }}>{nghe ? 'Đang nghe… nói xong bấm lại để dừng' : coTheNghe() ? 'Bấm để nói' : 'Máy này chưa nghe được giọng nói: gõ vào ô bên dưới'}</p>
      {loi && <Bao>{loi}</Bao>}
      <O nhan="Câu đã ghi (sửa được)" kieu="chu-dai" value={nhap.chu} onChange={chu => dat({ chu })} />
      <label className="tp-nut phu"><Icon ten="receipt" />Chụp hóa đơn<input type="file" accept="image/*" capture="environment" className="an-man" onChange={e => { const t = e.target.files?.[0]?.name; if (t) dat({ chu: `${nhap.chu ? nhap.chu + '. ' : ''}Hóa đơn ${t}: mua vật tư hết ` }); }} /></label>
      <section className="chong hep"><span className="nho phu">Thử câu mẫu:</span>{VI_DU.map(v => <Nut key={v} kieu="nhe" nho onClick={() => dat({ chu: v })}>{v}</Nut>)}</section>
    </Khung>
  );
}

function XacNhanGhi() {
  const di = useNavigate();
  const { nguoi, so, bayGio, lam } = useToi();
  const [nhap, , xoa] = useNhap('ghi', { chu: '' });
  const vuon = so.vuon.filter(v => v.ban.id === nguoi.id);
  // Tách câu một lần khi mở màn; sau đó người dùng sửa từng ô
  const dau = useMemo(() => tachCau(nhap.chu, ngayCua(bayGio), vuon), [nhap.chu]);
  const vuDangChay = so.muaVu.find(m => m.ban.id === nguoi.id && m.giaiDoan !== 'xong' && (!dau.vuonId || m.vuonId === dau.vuonId));
  const [k, setK] = useState({ loai: dau.loai, ngay: dau.ngay, noiDung: dau.noiDung, vatTu: dau.vatTu ?? '', luong: dau.luong ?? '', soTien: dau.soTien ? String(dau.soTien) : '', ngayCachLy: dau.ngayCachLy !== undefined ? String(dau.ngayCachLy) : '', vuonId: dau.vuonId ?? vuon[0]?.id ?? '', muaVuId: vuDangChay?.id ?? '' });
  const laTien = k.loai === 'thu' || k.loai === 'chi';
  const vu = so.muaVu.filter(m => m.ban.id === nguoi.id);
  const chac = (t: string) => (dau.chac.includes(t as never) ? ' (app tách được)' : '');
  const luu = () => {
    const kq = laTien
      ? lam({ loai: 'ghi_thu_chi', loaiTien: k.loai as 'thu' | 'chi', so: docSo(k.soTien), noiDung: k.noiDung, ngay: k.ngay, ...(k.muaVuId ? { muaVuId: k.muaVuId } : {}) }, { bao: 'Đã ghi vào sổ thu chi.', den: '/thu-chi' })
      : lam({ loai: 'ghi_nhat_ky', vuonId: k.vuonId, ngay: k.ngay, loaiViec: k.loai as LoaiNhatKy, noiDung: k.noiDung, ...(k.vatTu ? { vatTu: k.vatTu } : {}), ...(k.luong ? { luong: k.luong } : {}), ...(k.loai === 'phun_thuoc' ? { ngayCachLy: docSo(k.ngayCachLy) } : {}) }, { bao: 'Đã ghi vào nhật ký.', den: '/nhat-ky' });
    if (kq.ok) xoa();
  };
  if (!nhap.chu.trim()) return <Khung><TrangTrong tieuDe="Chưa có câu nào" hanhDong={<NutLink den="/ghi">Nói để ghi</NutLink>} /></Khung>;
  if (!laTien && !vuon.length) return <Khung><TrangTrong tieuDe="Chưa có vườn để ghi nhật ký" hanhDong={<NutLink den="/vuon">Thêm vườn</NutLink>}>Khoản thu chi thì ghi được không cần vườn.</TrangTrong></Khung>;
  return (
    <Khung duoi={<><Nut rong onClick={luu}>Lưu</Nut><Nut kieu="nhe" rong onClick={() => di('/ghi')}>Nói lại</Nut></>}>
      <Bao kieu="thong-tin">App đọc được: "{nhap.chu}". Kiểm lại từng ô rồi bấm Lưu.</Bao>
      <ChonNut nhan={`Loại${chac('loai')}`} value={k.loai} onChange={(x: LoaiGhi) => setK({ ...k, loai: x })} luaChon={[{ gt: 'phun_thuoc', nhan: 'Phun thuốc' }, { gt: 'bon_phan', nhan: 'Bón phân' }, { gt: 'tuoi', nhan: 'Tưới' }, { gt: 'thu_hoach', nhan: 'Thu hoạch' }, { gt: 'cham_soc', nhan: 'Chăm sóc' }, { gt: 'chi', nhan: 'Khoản chi' }, { gt: 'thu', nhan: 'Khoản thu' }]} />
      <O nhan={`Ngày${chac('ngay')}`} kieu="ngay" value={k.ngay} onChange={x => setK({ ...k, ngay: x })} />
      {!laTien && <Chon nhan={`Vườn${chac('vuonId')}`} value={k.vuonId} onChange={x => setK({ ...k, vuonId: x })} luaChon={vuon.map(v => ({ gt: v.id, nhan: v.ten }))} />}
      <O nhan="Nội dung" value={k.noiDung} onChange={x => setK({ ...k, noiDung: x })} />
      {!laTien && <O nhan={`Thuốc, phân, vật tư${chac('vatTu')}`} value={k.vatTu} onChange={x => setK({ ...k, vatTu: x })} />}
      {!laTien && <O nhan={`Lượng${chac('luong')}`} value={k.luong} onChange={x => setK({ ...k, luong: x })} />}
      {k.loai === 'phun_thuoc' && <O nhan={`Số ngày cách ly trên nhãn thuốc${chac('ngayCachLy')}`} kieu="so" donVi="ngày" value={k.ngayCachLy} onChange={x => setK({ ...k, ngayCachLy: x })} goiY="Bắt buộc: app dùng để chặn đăng bán hàng hái trước hạn." />}
      {laTien && <O nhan={`Số tiền${chac('soTien')}`} kieu="so" donVi="đ" value={k.soTien} onChange={x => setK({ ...k, soTien: x })} />}
      {laTien && vu.length > 0 && <Chon nhan="Tính vào vụ" value={k.muaVuId} onChange={x => setK({ ...k, muaVuId: x })} luaChon={[{ gt: '', nhan: 'Không theo vụ' }, ...vu.map(m => ({ gt: m.id, nhan: m.ten }))]} />}
    </Khung>
  );
}

function CachLy() {
  const { nguoi, so, bayGio } = useToi();
  const homNay = ngayCua(bayGio);
  const vuon = so.vuon.filter(v => v.ban.id === nguoi.id);
  const phun = so.nhatKy.filter(k => k.loai === 'phun_thuoc' && vuon.some(v => v.id === k.vuonId));
  const hetNgay = (ngay: string, n: number) => { const d = new Date(ngay + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  return (
    <Khung>
      <p className="phu">Mỗi lần phun thuốc có số ngày cách ly trên nhãn. App không cho đăng bán hàng hái trước ngày hết cách ly của vườn.</p>
      {vuon.map(v => {
        const het = hetCachLy(so, v.id);
        const dang = het && het > homNay;
        const loBiAnh = so.lo.filter(l => l.vuonId === v.id && l.kg > l.hua && (!l.haiTu || (het && l.haiTu < het)));
        return (
          <The key={v.id} {...(dang ? { vien: 'loi' as const } : {})}>
            <div className="hang giua"><strong>{v.ten}</strong>{dang ? <Chip kieu="loi">Đang cách ly</Chip> : <Chip kieu="xong">Hái được</Chip>}</div>
            <span>{het ? `Được hái từ ngày ${het.split('-').reverse().join('/')}` : 'Chưa ghi lần phun thuốc nào'}</span>
            {dang && loBiAnh.length > 0 && <Bao>Lô đang bán của vườn này có ngày hái trước hạn cách ly: {loBiAnh.map(l => l.ten).join(', ')}. Sửa ngày hái ở chi tiết lô.</Bao>}
          </The>
        );
      })}
      <h2>Các lần phun thuốc</h2>
      {!phun.length && <TrangTrong tieuDe="Chưa có lần phun nào" />}
      {phun.map(k => <The key={k.id}><div className="hang giua"><strong>{k.vatTu}</strong><span className="nho phu">{k.ngay.split('-').reverse().join('/')}</span></div><span className="nho">{vuon.find(v => v.id === k.vuonId)?.ten} · cách ly {k.ngayCachLy} ngày · hết ngày {hetNgay(k.ngay, k.ngayCachLy ?? 0).split('-').reverse().join('/')}</span></The>)}
    </Khung>
  );
}

function HoSoVuon() {
  const { so, bayGio } = useToi();
  const { vuon } = useVuonChon();
  const [cho, setCho] = useState({ phun: true, bon: true, khac: true, dienTich: true });
  if (!vuon) return <Khung><TrangTrong tieuDe="Chưa có vườn" hanhDong={<NutLink den="/vuon">Thêm vườn</NutLink>} /></Khung>;
  const h = hoSoNguonGoc(so, vuon.id, bayGio)!;
  const ma = `AGIVIET-NG-${vuon.id}`;
  const qr = qrcode(0, 'M'); qr.addData(ma); qr.make();
  const hien = h.nhatKy.filter(k => (k.loai === 'phun_thuoc' ? cho.phun : k.loai === 'bon_phan' ? cho.bon : cho.khac)).slice(0, 12);
  return (
    <Khung>
      <The noi>
        <div className="hang giua"><h2>{vuon.ten}</h2><span className="so dam">{h.mucDayDu}%</span></div>
        <TienTrinh phan={h.mucDayDu / 100} nhan="Mức đầy đủ hồ sơ" />
        <span className="nho phu">Đủ khi: có vụ đang chạy, có nhật ký 30 ngày qua, có ghi bón phân, mỗi lần phun có tên thuốc và ngày cách ly, có diện tích và số gốc.</span>
      </The>
      <The>
        <h2>Mã truy xuất</h2>
        <div style={{ width: 168, alignSelf: 'center' }} dangerouslySetInnerHTML={{ __html: qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) }} />
        <span className="nho phu" style={{ textAlign: 'center' }}>{ma} · dán lên thùng hàng; bên mua quét để xem phần bạn cho phép.</span>
      </The>
      <The>
        <h2>Cho bên mua xem</h2>
        <CongTac nhan="Diện tích, số gốc, cây trồng" value={cho.dienTich} onChange={x => setCho({ ...cho, dienTich: x })} />
        <CongTac nhan="Các lần phun thuốc (tên thuốc, ngày cách ly)" value={cho.phun} onChange={x => setCho({ ...cho, phun: x })} />
        <CongTac nhan="Bón phân" value={cho.bon} onChange={x => setCho({ ...cho, bon: x })} />
        <CongTac nhan="Việc khác (tưới, chăm sóc, thu hoạch)" value={cho.khac} onChange={x => setCho({ ...cho, khac: x })} />
        <span className="nho phu">Thu chi, lời lỗ không bao giờ hiện cho bên mua.</span>
      </The>
      <The>
        <h2>Bên mua sẽ thấy</h2>
        {cho.dienTich && <span>{vuon.cay} · {vuon.dienTich} {donViDT(vuon.donViDienTich)}{vuon.soGoc ? ` · ${vuon.soGoc} gốc` : ''} · trồng {vuon.namTrong || 'chưa ghi năm'}</span>}
        {h.vu && <span>Vụ: {h.vu.ten}</span>}
        {h.cachLy && <span>Hết cách ly thuốc: {h.cachLy.split('-').reverse().join('/')}</span>}
        <ol className="dong-thoi-gian">{hien.map(k => <li key={k.id} className="qua"><span><strong>{k.ngay.split('-').reverse().slice(0, 2).join('/')}</strong> · {VIEC[k.loai][0]}: {k.noiDung}{k.vatTu ? ` (${k.vatTu})` : ''}</span></li>)}</ol>
        {!hien.length && <span className="phu">Chưa có dòng nhật ký để hiện.</span>}
      </The>
    </Khung>
  );
}

export const MAN_VUON: Record<string, ComponentType> = {
  vuon: VuonCuaToi, 'mua-vu': MuaVu, 'nhat-ky': NhatKy, 'thu-chi': ThuChi, ghi: Ghi, 'xac-nhan-ghi': XacNhanGhi, 'cach-ly': CachLy, 'ho-so-vuon': HoSoVuon,
};
