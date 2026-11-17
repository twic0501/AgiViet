// Kiểu dữ liệu API mà app mua dùng (chỉ các trường cần; backend có thể trả thêm).
export interface ToiLuot { phia: "buyer" | "seller" | "ops"; viec: string }
export interface Don {
  id: string; code: string; status: string; offer_id?: string; seller_name?: string;
  contract_value_vnd?: string; deposit_vnd?: string;
  hien_thi?: { ten?: string; toi_luot?: ToiLuot };
}
export interface DieuKhoan {
  qty_g?: string; unit_price_vnd?: string; downgrade_price_vnd?: string; contract_value_vnd?: string; deposit_vnd?: string; fee_vnd?: string;
  payment_timing?: string; pay_after_days?: number; delivery_mode?: string; delivery_from?: string; delivery_to?: string;
  seller_account?: { bank_code?: string; masked?: string };
}
export interface ChiTietDon extends Don {
  seller?: { display_name?: string; name?: string };
  san_pham?: { code?: string; name?: string };
  dieu_khoan?: DieuKhoan;
  hanh_dong?: string[];
  tai_lieu?: { id: string; code: string; doc_type: string; status?: string }[];
  lien_lac_ben_kia?: { ten: string; so_dien_thoai: string } | null;
}
export interface Lo {
  id: string; code: string; product_code: string; product_name?: string; grade_code: string; seller_name?: string; province_code?: string;
  status: string; available_g?: string; qty?: { available?: string }; available_from?: string; qty_basis?: string;
  photos?: { captured_in_app?: boolean }[]; is_substandard?: boolean; ban_gap?: boolean;
}
export interface LoiChao { id: string; code: string; status: string; lot_code?: string; seller_name?: string; product_name?: string; la_ben_mua?: boolean; vong_cuoi?: { price_vnd: string; from_side: string } }
export interface TomTatTin { id: string; offer_id?: string; order_id?: string; body: string; la_cua_toi: boolean; created_at: string }
export interface Tin { id: string; body: string; da_che: boolean; la_cua_toi: boolean; nguoi_gui: string; created_at: string; anh_id?: string | null }
export interface TienTong { tong?: { coc_dang_giu?: string; ngan_hang_da_chuyen_den?: string } }
export interface Khoan { id: string; kind?: string; status: string; amount_due_vnd: string; da_nhan_vnd?: string; confirmed_vnd?: string; received_vnd?: string; due_at?: string; direction?: string; nguon: string; don_id?: string }
export interface Me { user?: { display_name?: string; user_id?: string }; org?: { name?: string } }
