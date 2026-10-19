// Thành phần dùng chung. Không đọc kho, không gọi dịch vụ: chỉ nhận dữ liệu qua props.
import { CHANG, KET_THUC, NHAN_NHOM, changCua, type Don, type Nhom } from '@agiviet/nghiep-vu';
import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import './thanh-phan.css';

type KieuNut = 'chinh' | 'phu' | 'canh-bao' | 'nhe' | 'vang';
const lopNut = (kieu: KieuNut, nho?: boolean, rong?: boolean, them = '') => ['tp-nut', kieu !== 'chinh' && kieu, nho && 'nho', rong && 'rong', them].filter(Boolean).join(' ');

export function Nut({ kieu = 'chinh', nho, rong, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { kieu?: KieuNut; nho?: boolean; rong?: boolean }) {
  return <button type="button" className={lopNut(kieu, nho, rong, className)} {...p} />;
}
export function NutLink({ den, kieu = 'chinh', nho, rong, children }: { den: string; kieu?: KieuNut; nho?: boolean; rong?: boolean; children: ReactNode }) {
  return <Link to={den} className={lopNut(kieu, nho, rong)}>{children}</Link>;
}

export function The({ noi, vien, children, className = '' }: { noi?: boolean; vien?: 'lam' | 'loi'; children: ReactNode; className?: string }) {
  return <section className={['tp-the', noi && 'noi', vien && `vien-${vien}`, className].filter(Boolean).join(' ')}>{children}</section>;
}
export function TheLink({ den, children, vien }: { den: string; children: ReactNode; vien?: 'lam' | 'loi' }) {
  return <Link to={den} className="tp-the-link"><The {...(vien ? { vien } : {})}>{children}</The></Link>;
}

/** Nhãn "tới lượt ai": màu + hình dấu + chữ. */
export function NhanNhom({ nhom, chiTiet }: { nhom: Nhom; chiTiet?: string }) {
  return <span className={`tp-nhom ${nhom}`}>{NHAN_NHOM[nhom]}{chiTiet ? ` · ${chiTiet}` : ''}</span>;
}

/** Thanh chặng 6 bước của một đơn. */
export function ThanhChang({ don }: { don: Don }) {
  const c = changCua(don);
  return (
    <ol className={`tp-chang ${KET_THUC.includes(don.trangThai) ? 'ket-thuc' : ''}`} aria-label={`Chặng ${Math.min(c + 1, CHANG.length)} trên ${CHANG.length}`}>
      {CHANG.map((t, i) => <li key={t} className={i < c ? 'qua' : i === c ? 'dang' : ''} aria-current={i === c ? 'step' : undefined}>{t}</li>)}
    </ol>
  );
}

export function TrangTrong({ tieuDe, children, hanhDong, hinh }: { tieuDe: string; children?: ReactNode; hanhDong?: ReactNode; hinh?: string }) {
  return <div className="tp-trong">{hinh && <img src={hinh} alt="" />}<strong>{tieuDe}</strong>{children && <p>{children}</p>}{hanhDong}</div>;
}

export function Chip({ kieu, children }: { kieu?: 'xong' | 'cho' | 'lam' | 'loi'; children: ReactNode }) {
  return <span className={`tp-chip ${kieu ?? ''}`}>{children}</span>;
}

export function Bao({ kieu = 'loi', children }: { kieu?: 'loi' | 'thong-tin' | 'tot' | 'vang'; children: ReactNode }) {
  return <p role={kieu === 'loi' ? 'alert' : 'status'} className={`tp-bao ${kieu === 'loi' ? '' : kieu}`}>{children}</p>;
}

export function Dong({ nhan, children }: { nhan: ReactNode; children: ReactNode }) {
  return <div className="tp-dong"><span>{nhan}</span><span>{children}</span></div>;
}

type KieuO = 'chu' | 'so' | 'ngay' | 'gio' | 'sdt' | 'chu-dai' | 'thang';
/** Ô nhập có nhãn, đơn vị, gợi ý, lỗi. Ô số nhận chữ số có dấu chấm phân cách. */
export function O({ nhan, value, onChange, kieu = 'chu', donVi, goiY, loi, placeholder, toiThieu, autoFocus }: {
  nhan: ReactNode; value: string; onChange: (v: string) => void; kieu?: KieuO; donVi?: string; goiY?: ReactNode; loi?: string | null; placeholder?: string; toiThieu?: string; autoFocus?: boolean;
}) {
  const id = useId();
  const chung = { id, className: 'tp-o', value, placeholder, autoFocus, 'aria-invalid': !!loi || undefined, 'aria-describedby': goiY || loi ? id + '-gy' : undefined };
  return (
    <label className="tp-truong" htmlFor={id}>
      <span>{nhan}</span>
      <span className={`tp-o-boc ${loi ? 'co-loi' : ''}`}>
        {kieu === 'chu-dai'
          ? <textarea {...chung} onChange={e => onChange(e.target.value)} />
          : <input {...chung} type={kieu === 'ngay' ? 'date' : kieu === 'gio' ? 'datetime-local' : kieu === 'thang' ? 'month' : kieu === 'sdt' ? 'tel' : 'text'}
              inputMode={kieu === 'so' ? 'decimal' : kieu === 'sdt' ? 'tel' : undefined} min={toiThieu} onChange={e => onChange(e.target.value)} />}
        {donVi && <span className="don-vi">{donVi}</span>}
      </span>
      {(loi || goiY) && <span id={id + '-gy'} className={loi ? 'loi-o' : 'goi-y'}>{loi || goiY}</span>}
    </label>
  );
}

export function Chon<T extends string>({ nhan, value, onChange, luaChon }: { nhan: ReactNode; value: T; onChange: (v: T) => void; luaChon: { gt: T; nhan: string }[] }) {
  const id = useId();
  return (
    <label className="tp-truong" htmlFor={id}>
      <span>{nhan}</span>
      <span className="tp-o-boc"><select id={id} className="tp-o" value={value} onChange={e => onChange(e.target.value as T)}>{luaChon.map(l => <option key={l.gt} value={l.gt}>{l.nhan}</option>)}</select></span>
    </label>
  );
}

/** Chọn một trong vài lựa chọn bằng nút (dễ bấm hơn ô thả xuống). */
export function ChonNut<T extends string>({ nhan, value, onChange, luaChon }: { nhan?: ReactNode; value: T; onChange: (v: T) => void; luaChon: { gt: T; nhan: string }[] }) {
  return (
    <div className="tp-truong" role="group" aria-label={typeof nhan === 'string' ? nhan : undefined}>
      {nhan && <span>{nhan}</span>}
      <div className="tp-chon-nut">{luaChon.map(l => <button key={l.gt} type="button" aria-pressed={l.gt === value} onClick={() => onChange(l.gt)}>{l.nhan}</button>)}</div>
    </div>
  );
}

export function CongTac({ nhan, value, onChange }: { nhan: ReactNode; value: boolean; onChange: (v: boolean) => void }) {
  return <label className="tp-cong-tac"><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} /><span>{nhan}</span></label>;
}

export function Tab<T extends string>({ value, onChange, ds }: { value: T; onChange: (v: T) => void; ds: { gt: T; nhan: string; so?: number }[] }) {
  return (
    <div className="tp-tab" role="tablist">
      {ds.map(t => <button key={t.gt} type="button" role="tab" aria-selected={t.gt === value} onClick={() => onChange(t.gt)}>{t.nhan}{t.so ? <span className="so-dem">{t.so}</span> : null}</button>)}
    </div>
  );
}

export function Sao({ value, onChange }: { value: number; onChange?: (v: 1 | 2 | 3 | 4 | 5) => void }) {
  return (
    <span className="tp-sao" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map(i => <button key={i} type="button" className={i <= value ? 'co' : ''} disabled={!onChange} aria-label={`${i} sao`} onClick={() => onChange?.(i as 1)}>★</button>)}
    </span>
  );
}

export const TienTrinh = ({ phan, nhan }: { phan: number; nhan: string }) => (
  <div className="tp-tien-trinh" role="progressbar" aria-label={nhan} aria-valuenow={Math.round(phan * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(0, Math.min(1, phan)) * 100}%` }} /></div>
);

/** Hộp hỏi lại trước việc có hậu quả (hủy, từ chối…). */
export function HopXacNhan({ mo, tieuDe, children, nutDongY, kieu = 'chinh', onDongY, onDong }: {
  mo: boolean; tieuDe: string; children?: ReactNode; nutDongY: string; kieu?: KieuNut; onDongY: () => void; onDong: () => void;
}) {
  if (!mo) return null;
  return (
    <div className="tp-hop-nen" role="presentation" onClick={e => { if (e.target === e.currentTarget) onDong(); }}>
      <div className="tp-hop" role="dialog" aria-modal="true" aria-label={tieuDe}>
        <h2>{tieuDe}</h2>
        {children}
        <div className="luoi-2"><Nut kieu="phu" onClick={onDong}>Quay lại</Nut><Nut kieu={kieu} onClick={onDongY}>{nutDongY}</Nut></div>
      </div>
    </div>
  );
}

/** Nút mở hộp hỏi lại; bấm đồng ý thì chạy việc. */
export function NutHoiLai({ children, tieuDe, noiDung, nutDongY, kieu = 'phu', kieuDongY = 'canh-bao', nho, rong, onDongY }: {
  children: ReactNode; tieuDe: string; noiDung?: ReactNode; nutDongY: string; kieu?: KieuNut; kieuDongY?: KieuNut; nho?: boolean; rong?: boolean; onDongY: () => void;
}) {
  const [mo, setMo] = useState(false);
  return (
    <>
      <Nut kieu={kieu} nho={nho} rong={rong} onClick={() => setMo(true)}>{children}</Nut>
      <HopXacNhan mo={mo} tieuDe={tieuDe} nutDongY={nutDongY} kieu={kieuDongY} onDong={() => setMo(false)} onDongY={() => { setMo(false); onDongY(); }}>{noiDung}</HopXacNhan>
    </>
  );
}
