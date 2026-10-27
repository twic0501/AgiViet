// Quyền theo HÀNH ĐỘNG (12 mục A6), không theo màn. Mỗi hành động liệt kê vai trong tổ chức được làm;
// người giúp chỉ được các hành động có trong ủy quyền (ref.delegable_actions) và không bao giờ ký/tiền.
import type { NguoiDung } from './phien.ts';
import { loi } from '../loi.ts';

type Phia = 'seller' | 'buyer' | 'ops';
interface LuatHanhDong { phia: Phia; vai: string[]; nguoiGiup?: string; vaiVanHanh?: string[] }

// Vai bên bán: owner (chủ hộ/chủ), coop_board (HTX ban điều hành), accountant (HTX kế toán), collection_staff, coop_member
// Vai bên mua: owner (quản lý), purchaser (mua hàng), accountant (kế toán), warehouse (kho), site_receiver (người nhận)
export const HANH_DONG: Record<string, LuatHanhDong> = {
  'lot.create': { phia: 'seller', vai: ['owner', 'coop_board'], nguoiGiup: 'lot.draft' },
  'lot.publish': { phia: 'seller', vai: ['owner', 'coop_board'], nguoiGiup: 'lot.draft' },
  'lot.update': { phia: 'seller', vai: ['owner', 'coop_board'], nguoiGiup: 'lot.update' },
  'lot.price': { phia: 'seller', vai: ['owner', 'coop_board'] },
  'lot.close': { phia: 'seller', vai: ['owner', 'coop_board'] },
  'lot.view_private': { phia: 'seller', vai: ['owner', 'coop_board', 'accountant', 'collection_staff'], nguoiGiup: 'view' },

  'demand.create': { phia: 'buyer', vai: ['owner', 'purchaser'] },
  'demand.view_private': { phia: 'buyer', vai: ['owner', 'purchaser', 'accountant'] },

  'offer.send.buyer': { phia: 'buyer', vai: ['owner', 'purchaser'] },
  'offer.send.seller': { phia: 'seller', vai: ['owner', 'coop_board'], nguoiGiup: 'quote.reply' },
  'offer.accept.seller': { phia: 'seller', vai: ['owner', 'coop_board'] },
  'offer.accept.buyer': { phia: 'buyer', vai: ['owner', 'purchaser'] },
  'offer.counter.seller': { phia: 'seller', vai: ['owner', 'coop_board'], nguoiGiup: 'quote.reply' },
  'offer.counter.buyer': { phia: 'buyer', vai: ['owner', 'purchaser'] },

  'order.create': { phia: 'buyer', vai: ['owner', 'purchaser'] },
  'order.approve': { phia: 'buyer', vai: ['owner'] },
  'order.sign.buyer': { phia: 'buyer', vai: ['owner', 'purchaser'] },
  'order.sign.seller': { phia: 'seller', vai: ['owner', 'coop_board'] },
  'order.withdraw': { phia: 'buyer', vai: ['owner', 'purchaser'] },
  'order.decline': { phia: 'seller', vai: ['owner', 'coop_board'] },
  'order.view.buyer': { phia: 'buyer', vai: ['owner', 'purchaser', 'accountant', 'warehouse', 'site_receiver'] },
  'order.view.seller': { phia: 'seller', vai: ['owner', 'coop_board', 'accountant', 'collection_staff'], nguoiGiup: 'view' },

  'money.pay.buyer': { phia: 'buyer', vai: ['owner', 'accountant'] },
  'money.confirm.seller': { phia: 'seller', vai: ['owner', 'accountant'] },
  'money.confirm.buyer': { phia: 'buyer', vai: ['owner', 'accountant'] },

  'delivery.plan': { phia: 'buyer', vai: ['owner', 'purchaser', 'accountant'] },
  'delivery.check': { phia: 'buyer', vai: ['owner', 'warehouse', 'site_receiver'] },
  'delivery.ship': { phia: 'seller', vai: ['owner', 'coop_board', 'collection_staff'], nguoiGiup: 'delivery.record' },
  // Bắt đầu cân/ghi giao tại vườn: người bán nhập mã 6 số hoặc quét QR của người nhận bên mua (start-check).
  'delivery.record': { phia: 'seller', vai: ['owner', 'coop_board', 'collection_staff'], nguoiGiup: 'delivery.record' },
  'acceptance.respond': { phia: 'seller', vai: ['owner', 'coop_board'] },
  'delivery.arrival': { phia: 'buyer', vai: ['owner', 'warehouse', 'site_receiver'] },

  'cancel.buyer': { phia: 'buyer', vai: ['owner', 'purchaser'] },
  'cancel.seller': { phia: 'seller', vai: ['owner', 'coop_board'] },
  'dispute.buyer': { phia: 'buyer', vai: ['owner', 'warehouse', 'purchaser'] },
  'dispute.seller': { phia: 'seller', vai: ['owner', 'coop_board'] },

  'ops.task': { phia: 'ops', vai: [], vaiVanHanh: ['dispatcher', 'field', 'finance', 'risk', 'supervisor', 'catalog', 'inspector'] },
  'ops.money': { phia: 'ops', vai: [], vaiVanHanh: ['finance', 'supervisor'] },
  'ops.decision': { phia: 'ops', vai: [], vaiVanHanh: ['finance', 'supervisor', 'risk', 'dispatcher'] },
  'ops.reconcile': { phia: 'ops', vai: [], vaiVanHanh: ['finance', 'supervisor'] },
  'ops.view': { phia: 'ops', vai: [], vaiVanHanh: ['dispatcher', 'field', 'finance', 'risk', 'supervisor', 'catalog'] },
  'inspector.result': { phia: 'ops', vai: [], vaiVanHanh: ['inspector'] },
};

/** Trả true nếu được; dùng để tính "hành động khả dụng" cho giao diện. */
export function duocPhep(nd: NguoiDung, hanhDong: string): boolean {
  const l = HANH_DONG[hanhDong];
  if (!l) return false;
  if (l.phia === 'ops') return nd.vaiVanHanh.some((v) => l.vaiVanHanh!.includes(v));
  const tv = nd.thanhVien;
  if (l.phia === 'seller' && !tv.canSell) return false;
  if (l.phia === 'buyer' && !tv.canBuy) return false;
  if (tv.nguoiGiup) return !!l.nguoiGiup && tv.nguoiGiup.actions.includes(l.nguoiGiup);
  return tv.vai.some((v) => l.vai.includes(v));
}

export function canQuyen(nd: NguoiDung, hanhDong: string, cau?: string): void {
  if (!duocPhep(nd, hanhDong)) throw loi('KHONG_CO_QUYEN', cau, { hanh_dong: hanhDong });
}

export function hanhDongCua(nd: NguoiDung): string[] {
  return Object.keys(HANH_DONG).filter((h) => duocPhep(nd, h));
}
