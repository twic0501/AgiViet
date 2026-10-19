// Thành phần dùng chung của giao diện. Không đọc kho, không gọi dịch vụ: chỉ nhận dữ liệu qua props.
import { CHANG, NHAN_NHOM, changCua, type Don, type Nhom, KET_THUC } from '@agiviet/nghiep-vu';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import type { Man } from '../../phan-he/danh-muc-man.ts';
import './thanh-phan.css';

type KieuNut = 'chinh' | 'phu' | 'canh-bao';

export function Nut({ kieu = 'chinh', nho, rong, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { kieu?: KieuNut; nho?: boolean; rong?: boolean }) {
  return <button type="button" className={['tp-nut', kieu !== 'chinh' && kieu, nho && 'nho', rong && 'rong', className].filter(Boolean).join(' ')} {...p} />;
}

export function NutLink({ den, kieu = 'chinh', nho, children }: { den: string; kieu?: KieuNut; nho?: boolean; children: ReactNode }) {
  return <Link to={den} className={['tp-nut', kieu !== 'chinh' && kieu, nho && 'nho'].filter(Boolean).join(' ')}>{children}</Link>;
}

export function The({ noi, children, className = '' }: { noi?: boolean; children: ReactNode; className?: string }) {
  return <section className={`tp-the ${noi ? 'noi' : ''} ${className}`}>{children}</section>;
}

/** Nhãn "tới lượt ai": màu + hình dấu + chữ. */
export function NhanNhom({ nhom, chiTiet }: { nhom: Nhom; chiTiet?: string }) {
  return <span className={`tp-nhom ${nhom}`}>{NHAN_NHOM[nhom]}{chiTiet ? ` · ${chiTiet}` : ''}</span>;
}

/** Thanh chặng 6 bước của một đơn. */
export function ThanhChang({ don }: { don: Don }) {
  const c = changCua(don);
  return (
    <ol className={`tp-chang ${KET_THUC.includes(don.trangThai) ? 'ket-thuc' : ''}`} aria-label={`Đơn đang ở chặng ${Math.min(c + 1, CHANG.length)} trên ${CHANG.length}`}>
      {CHANG.map((t, i) => <li key={t} className={i < c ? 'qua' : i === c ? 'dang' : ''} aria-current={i === c ? 'step' : undefined}>{t}</li>)}
    </ol>
  );
}

export function TrangTrong({ tieuDe, children, hanhDong }: { tieuDe: string; children?: ReactNode; hanhDong?: ReactNode }) {
  return <div className="tp-trong"><strong>{tieuDe}</strong>{children && <p>{children}</p>}{hanhDong}</div>;
}

export function ChipGiaiDoan({ gd }: { gd: 1 | 2 | 3 }) {
  return <span className={`tp-chip gd${gd}`}>Giai đoạn {gd}</span>;
}

/** Kiểu khối của một khu vực, đoán từ chữ mô tả trong danh mục màn. */
const kieuKhoi = (nhan: string) =>
  /^(nút|bấm)\b/i.test(nhan) || /^[A-ZĐ][^ ]* \/ /.test(nhan) ? 'nut' : /^(ô|chọn)\b/i.test(nhan) ? 'o' : /danh sách|lịch sử|mọi|các /i.test(nhan) ? 'danh-sach' : '';

/** Khung bố cục của màn chưa làm: hiện các khu vực trong danh mục, từ trên xuống. */
export function KhungBoCuc({ man }: { man: Man }) {
  return (
    <div className="tp-khung">
      <div className="tp-khung-dau">
        <div className="hang"><ChipGiaiDoan gd={man.giaiDoan} /><span className="tp-chip">{man.tinhTrangCu === 'Mới' ? 'Màn mới' : man.tinhTrangCu === 'Sửa' ? 'Làm lại' : 'Giữ ý cũ'}</span><code className="nho phu">{man.vai}/{man.id}</code></div>
        <h1>{man.ten}</h1>
        <p className="nho phu">Khung bố cục: chưa có giao diện thật và chưa có dữ liệu. Mỗi khối là một khu vực theo thứ tự trên màn.</p>
      </div>
      {man.khuVuc.map(k => {
        const kieu = kieuKhoi(k);
        return <div key={k} className={`tp-khoi ${kieu}`}>{kieu === 'danh-sach' ? <><span>{k}</span><i /><i /><i /></> : k}</div>;
      })}
    </div>
  );
}
