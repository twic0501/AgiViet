// Cấu trúc nội dung trang giới thiệu. Tầng nội dung chỉ chứa chữ và đường dẫn; bố cục ở src/khu.
// Chữ chưa chốt ghi bằng choChu("mô tả cần viết"): trang hiện ô chờ để người viết nội dung biết phải điền gì.

export type Chu = string | { cho: string };
export const choChu = (moTa: string): Chu => ({ cho: moTa });
export const laCho = (c: Chu): c is { cho: string } => typeof c !== 'string';

export interface MucNgan { tieuDe: Chu; moTa: Chu }
export interface Hinh { cho: string; tiLe: '16/9' | '4/3' | '1/1' | '9/16' }

export interface NoiDungTrang {
  dauTrang: { menu: { nhan: string; den: string }[]; nutChinh: string };
  hero: { khauHieu: Chu; moTa: Chu; nutBan: string; nutMua: string; hinh: Hinh };
  vanDe: { tieuDe: Chu; muc: MucNgan[] };
  cachHoatDong: { tieuDe: Chu; moTa: Chu; chang: MucNgan[] };
  nhaVuon: { tieuDe: Chu; moTa: Chu; tinhNang: MucNgan[]; hinh: Hinh };
  doanhNghiep: { tieuDe: Chu; moTa: Chu; tinhNang: MucNgan[]; hinh: Hinh };
  anToan: { tieuDe: Chu; moTa: Chu; muc: MucNgan[] };
  matHang: { tieuDe: Chu; moTa: Chu; nhom: MucNgan[] };
  bangGia: { tieuDe: Chu; goi: { ten: string; gia: Chu; doiTuong: Chu; quyen: Chu[] }[]; ghiChu: Chu };
  hoiDap: { tieuDe: Chu; cau: { hoi: Chu; dap: Chu }[] };
  batDau: { tieuDe: Chu; moTa: Chu; nutBan: string; nutMua: string };
  chanTrang: { moTa: Chu; cot: { tieuDe: string; lienKet: { nhan: string; den: string }[] }[]; banQuyen: string };
}
