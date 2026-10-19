// Tầng bố cục: mỗi khu của trang là một hàm (nội dung) → HTML. Không chứa chữ cố định ngoài nhãn ô chờ.
import { laCho, type Chu, type Hinh, type MucNgan, type NoiDungTrang } from '../noi-dung/kieu.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** Chữ thật hoặc ô chờ (có mô tả cần viết). */
export const chu = (c: Chu, the = 'span') => laCho(c) ? `<${the} class="cho-chu" title="Chưa có chữ">${esc(c.cho)}</${the}>` : `<${the}>${esc(c)}</${the}>`;
const hinh = (h: Hinh) => `<div class="cho-hinh" style="aspect-ratio:${h.tiLe}"><span>${esc(h.cho)}</span></div>`;
const the = (m: MucNgan, so?: number) => `<li class="the">${so ? `<span class="so-buoc">${so}</span>` : ''}${chu(m.tieuDe, 'h3')}${chu(m.moTa, 'p')}</li>`;
const khu = (id: string, ten: string, than: string, lop = '') => `<section id="${id}" class="khu ${lop}" aria-label="${esc(ten)}"><div class="khung">${than}</div></section>`;

export interface CauHinh { duongDanApp: string }

export function dauTrang(n: NoiDungTrang['dauTrang'], ch: CauHinh) {
  return `<header class="dau-trang"><div class="khung"><a class="logo" href="#">AgiViet</a>
    <nav aria-label="Mục lục trang">${n.menu.map(m => `<a href="${m.den}">${esc(m.nhan)}</a>`).join('')}</nav>
    <a class="nut" href="${ch.duongDanApp}">${esc(n.nutChinh)}</a></div></header>`;
}

export function hero(n: NoiDungTrang['hero'], ch: CauHinh) {
  return khu('dau', 'Giới thiệu', `<div class="hai-cot">
    <div class="chong">${chu(n.khauHieu, 'h1')}${chu(n.moTa, 'p')}
      <div class="hang"><a class="nut" href="${ch.duongDanApp}/?vai=ban">${esc(n.nutBan)}</a><a class="nut phu" href="${ch.duongDanApp}/?vai=mua">${esc(n.nutMua)}</a></div></div>
    ${hinh(n.hinh)}</div>`, 'hero');
}

export const vanDe = (n: NoiDungTrang['vanDe']) => khu('van-de', 'Vấn đề', `${chu(n.tieuDe, 'h2')}<ul class="luoi ba">${n.muc.map(m => the(m)).join('')}</ul>`);

export const cachHoatDong = (n: NoiDungTrang['cachHoatDong']) =>
  khu('cach-hoat-dong', 'Cách hoạt động', `${chu(n.tieuDe, 'h2')}${chu(n.moTa, 'p')}<ol class="chang">${n.chang.map((m, i) => the(m, i + 1)).join('')}</ol>`, 'nen-phu');

const khuTinhNang = (id: string, ten: string, n: NoiDungTrang['nhaVuon'], dao: boolean) =>
  khu(id, ten, `<div class="hai-cot ${dao ? 'dao' : ''}"><div class="chong">${chu(n.tieuDe, 'h2')}${chu(n.moTa, 'p')}<ul class="luoi hai">${n.tinhNang.map(m => the(m)).join('')}</ul></div>${hinh(n.hinh)}</div>`);
export const nhaVuon = (n: NoiDungTrang['nhaVuon']) => khuTinhNang('nha-vuon', 'Cho nhà vườn', n, false);
export const doanhNghiep = (n: NoiDungTrang['doanhNghiep']) => khuTinhNang('doanh-nghiep', 'Cho doanh nghiệp', n, true);

export const anToan = (n: NoiDungTrang['anToan']) => khu('an-toan', 'An toàn', `${chu(n.tieuDe, 'h2')}${chu(n.moTa, 'p')}<ul class="luoi ba">${n.muc.map(m => the(m)).join('')}</ul>`, 'nen-dam');

export const matHang = (n: NoiDungTrang['matHang']) => khu('mat-hang', 'Mặt hàng', `${chu(n.tieuDe, 'h2')}${chu(n.moTa, 'p')}<ul class="luoi ba">${n.nhom.map(m => the(m)).join('')}</ul>`);

export const bangGia = (n: NoiDungTrang['bangGia']) => khu('bang-gia', 'Bảng giá', `${chu(n.tieuDe, 'h2')}
  <ul class="luoi ba">${n.goi.map(g => `<li class="the goi"><h3>${esc(g.ten)}</h3>${chu(g.gia, 'p')}${chu(g.doiTuong, 'p')}<ul>${g.quyen.map(q => `<li>${chu(q)}</li>`).join('')}</ul></li>`).join('')}</ul>
  ${chu(n.ghiChu, 'p')}`, 'nen-phu');

export const hoiDap = (n: NoiDungTrang['hoiDap']) => khu('hoi-dap', 'Hỏi đáp', `${chu(n.tieuDe, 'h2')}<div class="chong">${n.cau.map(c => `<details class="the"><summary>${chu(c.hoi)}</summary>${chu(c.dap, 'p')}</details>`).join('')}</div>`);

export const batDau = (n: NoiDungTrang['batDau'], ch: CauHinh) => khu('bat-dau', 'Bắt đầu', `<div class="chong giua">${chu(n.tieuDe, 'h2')}${chu(n.moTa, 'p')}
  <div class="hang"><a class="nut" href="${ch.duongDanApp}/?vai=ban">${esc(n.nutBan)}</a><a class="nut phu" href="${ch.duongDanApp}/?vai=mua">${esc(n.nutMua)}</a></div></div>`, 'nen-dam');

export const chanTrang = (n: NoiDungTrang['chanTrang']) => `<footer class="chan-trang"><div class="khung hai-cot">
  <div class="chong"><strong class="logo">AgiViet</strong>${chu(n.moTa, 'p')}</div>
  <div class="hang tren">${n.cot.map(c => `<div class="chong"><strong>${esc(c.tieuDe)}</strong>${c.lienKet.map(l => `<a href="${l.den}">${esc(l.nhan)}</a>`).join('')}</div>`).join('')}</div>
  </div><p class="khung nho">${esc(n.banQuyen)}</p></footer>`;

/** Ráp cả trang theo thứ tự khu (docs/03-giao-dien/web-gioi-thieu.md). */
export const trang = (n: NoiDungTrang, ch: CauHinh) => [
  dauTrang(n.dauTrang, ch), '<main>', hero(n.hero, ch), vanDe(n.vanDe), cachHoatDong(n.cachHoatDong), nhaVuon(n.nhaVuon), doanhNghiep(n.doanhNghiep),
  anToan(n.anToan), matHang(n.matHang), bangGia(n.bangGia), hoiDap(n.hoiDap), batDau(n.batDau, ch), '</main>', chanTrang(n.chanTrang),
].join('\n');
