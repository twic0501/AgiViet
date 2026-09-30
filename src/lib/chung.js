// Tiện ích dùng chung giữa các module: quyền, bên trong đơn, gói, lượng khả dụng.
import { one, all, loi, khongThay, nowIso, periodOf } from './core.js';
import { THOI_HAN } from './rules.js';

export const kg = so => Math.round(Number(so) * 1000);          // kg → gam
export const raKg = g => g / 1000;

export function canQuyen(ctx, ...quyen) {
  if (ctx.roles.includes('administer')) return;
  if (!quyen.some(q => ctx.roles.includes(q))) throw loi('E01', `Tài khoản này chưa có quyền: ${quyen.join(' hoặc ')}.`);
}
// Người giúp nhập liệu không được ký, xác nhận tiền, đổi tài khoản nhận tiền (Quy trình v3 mục 5)
export function khongPhaiNguoiGiup(ctx, viec) {
  if (ctx.roles.includes('helper') && !ctx.roles.includes('sign') && !ctx.roles.includes('administer')) throw loi('E01', `Người giúp nhập liệu không được ${viec}. Đưa máy cho chủ hàng hoặc gọi hỗ trợ.`);
}
export function benTrongDon(ctx, don) {
  if (don.buyer_org === ctx.org.id) return 'mua';
  if (don.seller_org === ctx.org.id) return 'ban';
  throw khongThay('Đơn');
}
export const benKia = ben => (ben === 'mua' ? 'ban' : 'mua');
export const orgCuaBen = (don, ben) => (ben === 'mua' ? don.buyer_org : don.seller_org);

export function layDon(id) {
  const d = one('select * from orders where id = ? or code = ?', id, id);
  if (!d) throw khongThay('Đơn');
  return d;
}

// Gói bên mua đang có hiệu lực
export function goiCua(orgId, luc = nowIso()) {
  const s = one("select * from subscriptions where org_id = ? and plan = 'business' and status in ('dang_dung','huy_gia_han') and period_start <= ? and period_end > ? order by period_end desc limit 1", orgId, luc, luc);
  return s ? 'business' : 'free';
}

// Lô: phiên bản mới nhất, lượng khả dụng, trạng thái xác nhận còn hàng (BR-09, BR-10)
export function phienBanLo(loId) {
  return one('select * from lot_versions where lot_id = ? order by revision desc limit 1', loId);
}
export function luongKhaDung(loId, boQuaDatCho = null) {
  const v = phienBanLo(loId);
  if (!v) return 0;
  const camKet = one("select coalesce(sum(qty_g),0) n from lot_commitments where lot_id = ? and status = 'cam_ket'", loId).n;
  const giu = one("select coalesce(sum(qty_g),0) n from reservations where lot_id = ? and status = 'dang_giu' and expires_at > ? and id <> coalesce(?, '')", loId, nowIso(), boQuaDatCho).n;
  return v.qty_g - camKet - giu;
}
export function trangThaiXacNhan(lo) {
  const e = one("select at from availability_events where lot_id = ? and kind in ('con_hang','cap_nhat','mo_lai') order by at desc limit 1", lo.id);
  const lanCuoi = e?.at || lo.created_at;
  const tuoi = Date.parse(nowIso()) - Date.parse(lanCuoi);
  return {
    xac_nhan_lan_cuoi: lanCuoi,
    can_nhac: tuoi > THOI_HAN.nhac_lo[lo.kind],
    chua_xac_nhan_gan_day: tuoi > THOI_HAN.nhac_lo[lo.kind],
    ngung_nhan_de_nghi: tuoi > THOI_HAN.ngung_nhan_de_nghi[lo.kind] || lo.status !== 'cong_khai',
  };
}
export function tenSanPham(id) { return one('select name_vi, custom from products where id = ?', id); }
export const kyHienTai = () => periodOf();
export const danhSach = (sql, ...a) => all(sql, ...a);
