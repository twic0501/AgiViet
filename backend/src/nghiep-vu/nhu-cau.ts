import { appCmd, systemCmd, loginCmd } from '../db/command.ts';
// Nhu cầu mua (03 mục 2): tạo, đăng, sửa (giá tối đa chỉ tăng), đóng. Giá tối đa KÍN: chỉ tổ chức mua thấy.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { duocPhep } from '../auth/quyen.ts';
import { loi } from '../loi.ts';
import { chuyenTrangThai, maMoi, phat, soGam } from './chung.ts';

export interface DongNhuCau { grade_code: string; qty_g: unknown; max_price_vnd: unknown; min_source_qty_g?: unknown }
export interface TaoNhuCau {
  product_code: string; segment_code: string; needed_from: string; needed_to: string;
  delivery_mode: 'self_pickup' | 'delivered'; delivery_facility_id?: string; required_docs?: string[];
  accepts_substandard?: boolean; lines: DongNhuCau[];
}

export async function taoNhuCau(t: GiaoDich, nd: NguoiDung, d: TaoNhuCau) {
  const org = await t.mot<any>(`SELECT tax_code, verification_level FROM core.organizations WHERE id=$1`, [nd.thanhVien.orgId]);
  if (!org?.tax_code) throw loi('KHONG_CO_QUYEN', 'Tổ chức chưa xác minh mã số thuế.');
  const sp = await t.mot<any>(`SELECT id, current_profile_version FROM core.products WHERE code=$1`, [d.product_code]);
  if (!sp) throw loi('DU_LIEU_KHONG_HOP_LE', 'Mặt hàng không có trong danh mục.');
  if (!Array.isArray(d.lines) || d.lines.length === 0) throw loi('DU_LIEU_KHONG_HOP_LE', 'Cần ít nhất một dòng loại.');
  if (!(d.needed_from <= d.needed_to)) throw loi('DU_LIEU_KHONG_HOP_LE', 'Ngày cần không hợp lệ.');
  const duong = (v: unknown) => (typeof v === 'string' || typeof v === 'number') && /^[1-9]\d*$/.test(String(v));
  d.lines.forEach((l: any, i: number) => {
    if (!l || typeof l.grade_code !== 'string' || !l.grade_code) throw loi('DU_LIEU_KHONG_HOP_LE', `Dòng ${i + 1}: thiếu grade_code.`);
    for (const k of ['qty_g', 'max_price_vnd', 'min_source_qty_g'])
      if (!duong(l[k])) throw loi('DU_LIEU_KHONG_HOP_LE', `Dòng ${i + 1}: ${k} bắt buộc, là số nguyên dương (gửi chuỗi thập phân).`);
    if (BigInt(l.min_source_qty_g) > BigInt(l.qty_g)) throw loi('DU_LIEU_KHONG_HOP_LE', `Dòng ${i + 1}: min_source_qty_g không lớn hơn qty_g.`);
  });
  const code = await maMoi(t, 'core.demands', 'NC');
  const id=await appCmd<string>(t,nd,'buyer','create_demand',[{code,segment_code:d.segment_code,product_id:sp.id,profile_version:sp.current_profile_version,needed_during:`[${d.needed_from},${d.needed_to}]`,delivery_mode:d.delivery_mode,delivery_facility_id:d.delivery_facility_id??null,required_docs:d.required_docs??[],accepts_substandard:!!d.accepts_substandard},d.lines.map(l=>({grade_code:l.grade_code,qty:String(l.qty_g),min_source_qty:String(l.min_source_qty_g),max_price_vnd:String(l.max_price_vnd)}))]);
  const dem=await t.mot<any>(`SELECT id,status,version FROM core.demands WHERE id=$1`,[id]);
  return { id: dem.id, code, status: dem.status, revision: dem.version };
}

async function layNhuCauCuaToi(t: GiaoDich, nd: NguoiDung, id: string) {
  const d = await t.mot<any>(`SELECT * FROM core.demands WHERE id=$1 FOR UPDATE`, [id]);
  if (!d || d.buyer_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  return d;
}

export async function dangNhuCau(t: GiaoDich, nd: NguoiDung, id: string, version?: number) {
 const d=await layNhuCauCuaToi(t,nd,id);
 if(version!=null && d.version!==version) throw loi('REVISION_XUNG_DOT');
 // create_demand đăng nguyên tử; giữ endpoint publish cũ như phép xác nhận.
 if(d.status!=='open') throw loi('CHUA_HO_TRO','DB chưa có command đăng nhu cầu nháp nhập từ ngoài.');
 return {id,status:d.status,revision:d.version};
}

export async function suaGiaToiDa(t: GiaoDich, nd: NguoiDung, id: string, lineId: string, giaMoi: unknown) {
 const d=await layNhuCauCuaToi(t,nd,id);
 if(!await t.mot(`SELECT 1 FROM core.demand_lines WHERE id=$1 AND demand_id=$2`,[lineId,id])) throw loi('KHONG_TIM_THAY');
 const cu=await t.gtri<string>(`SELECT max_price_vnd::text FROM core.demand_line_max_prices WHERE demand_line_id=$1 ORDER BY id DESC LIMIT 1`,[lineId]);
 if(soGam(giaMoi)<BigInt(cu)) throw loi('GIA_KHONG_DUOC_GIAM');
 await appCmd(t,nd,'buyer','raise_demand_price',[lineId,String(giaMoi)]);return {id,status:d.status};
}

export async function dongNhuCau(t: GiaoDich, nd: NguoiDung, id: string) {
 await layNhuCauCuaToi(t,nd,id); await appCmd(t,nd,'buyer','close_demand',[id]);
 const d=await t.mot<any>(`SELECT status,version FROM core.demands WHERE id=$1`,[id]);return {id,status:d.status,revision:d.version};
}

export async function xemNhuCau(t: GiaoDich, nd: NguoiDung, id: string) {
  const d = await t.mot<any>(`SELECT d.id,d.code,d.buyer_org_id,o.display_name buyer_name,p.code product_code,d.segment_code,d.status,d.version,
      lower(d.needed_during)::text needed_from,(upper(d.needed_during)-1)::text needed_to,d.delivery_mode,d.required_docs
      FROM core.demands d JOIN core.organizations o ON o.id=d.buyer_org_id JOIN core.products p ON p.id=d.product_id WHERE d.id=$1`, [id]);
  if (!d) throw loi('KHONG_TIM_THAY');
  const laChu = d.buyer_org_id === nd.thanhVien.orgId && duocPhep(nd, 'demand.view_private');
  if (!laChu && d.status === 'draft') throw loi('KHONG_TIM_THAY');
  const lines = await t.q<any>(`SELECT l.id,l.grade_code,l.qty::text qty_g,l.min_source_qty::text min_source_qty_g,
      (SELECT max_price_vnd::text FROM core.demand_line_max_prices p WHERE p.demand_line_id=l.id ORDER BY p.id DESC LIMIT 1) max_price
      FROM core.demand_lines l WHERE l.demand_id=$1 ORDER BY l.grade_code`, [id]);
  return {
    id: d.id, code: d.code, buyer_name: d.buyer_name, product_code: d.product_code, segment_code: d.segment_code, status: d.status, revision: d.version,
    needed_from: d.needed_from, needed_to: d.needed_to, delivery_mode: d.delivery_mode, required_docs: d.required_docs,
    lines: lines.map((l) => ({ id: l.id, grade_code: l.grade_code, qty_g: l.qty_g, min_source_qty_g: l.min_source_qty_g, ...(laChu ? { max_price_vnd: l.max_price } : {}) })),
  };
}

export async function danhSachNhuCau(t: GiaoDich, nd: NguoiDung, q: { mine?: boolean; product_code?: string }) {
  if (q.mine) return t.q(`SELECT d.id,d.code,p.code product_code,d.status,d.version revision FROM core.demands d JOIN core.products p ON p.id=d.product_id WHERE d.buyer_org_id=$1 ORDER BY d.code`, [nd.thanhVien.orgId]);
  return t.q(`SELECT d.id,d.code,p.code product_code,d.segment_code,d.status,lower(d.needed_during)::text needed_from,(upper(d.needed_during)-1)::text needed_to,o.display_name buyer_name,
      (SELECT json_agg(json_build_object('id',l.id,'grade_code',l.grade_code,'qty_g',l.qty::text)) FROM core.demand_lines l WHERE l.demand_id=d.id) lines
      FROM core.demands d JOIN core.products p ON p.id=d.product_id JOIN core.organizations o ON o.id=d.buyer_org_id
      WHERE d.status='open' AND d.buyer_org_id<>$1 AND ($2::text IS NULL OR p.code=$2) ORDER BY d.code`, [nd.thanhVien.orgId, q.product_code ?? null]);
}
