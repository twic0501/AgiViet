// Ghép cung–cầu (05). Gọi dịch vụ AI POST /match (docs/ai/04) nếu cấu hình AI_URL, thời gian chờ 2 s;
// lỗi/quá hạn thì dự phòng bằng luật trong backend. Kết quả AI ghi bộ đệm mkt.match_candidates. Không trả số giá; không xếp theo giá rẻ nhất (xếp theo điểm).
import type { HeThong } from '../he-thong.ts';
import type { NguoiDung } from '../auth/phien.ts';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import { loi } from '../loi.ts';
import { CHINH_SACH } from '../chinh-sach.ts';
import { kg } from './chung.ts';

interface UngVien { lot_id: string; code: string; seller_org_id: string; seller_name: string; province_code: string; qty_basis: string; declared: bigint; available: bigint; held: bigint; committed: bigint; floor: bigint; available_from: string | null }

function camKetDuoc(u: UngVien): bigint {
  if (u.qty_basis === 'weighed') return u.available;
  const tran = (u.declared * BigInt(CHINH_SACH.uocTinhCamKetToiDaBps)) / 10000n - u.held - u.committed;
  return tran < u.available ? (tran > 0n ? tran : 0n) : u.available;
}

export async function ghepTheoLuat(t: GiaoDich, demandId: string) {
  const d = await t.mot<any>(`SELECT * FROM core.demands WHERE id=$1`, [demandId]);
  const lines = await t.q<any>(`SELECT l.*, (SELECT max_price_vnd FROM core.demand_line_max_prices p WHERE p.demand_line_id=l.id ORDER BY id DESC LIMIT 1)::text maxp FROM core.demand_lines l WHERE l.demand_id=$1`, [demandId]);
  const out: any[] = [];
  for (const l of lines) {
    const uv = await t.q<any>(`SELECT l.id lot_id,l.code,l.seller_org_id,o.display_name seller_name,o.province_code,l.qty_basis,l.declared_qty::text declared,l.available_from::text,
        (SELECT floor_price_vnd FROM core.lot_price_versions v WHERE v.lot_id=l.id ORDER BY v.id DESC LIMIT 1)::text floor,
        coalesce((SELECT sum(qty) FROM ledger.qty_balances b WHERE b.lot_id=l.id AND bucket='available'),0)::text available,
        coalesce((SELECT sum(qty) FROM ledger.qty_balances b WHERE b.lot_id=l.id AND bucket='held'),0)::text held,
        coalesce((SELECT sum(qty) FROM ledger.qty_balances b WHERE b.lot_id=l.id AND bucket IN ('committed','in_transit','delivered')),0)::text committed
      FROM core.lots l JOIN core.organizations o ON o.id=l.seller_org_id
      WHERE l.product_id=$1 AND l.grade_code=$2 AND l.status IN ('on_sale','upcoming') AND l.safety_locked_at IS NULL AND l.seller_org_id<>$3`, [d.product_id, l.grade_code, d.buyer_org_id]);
    const can = BigInt(l.qty); const maxp = BigInt(l.maxp);
    const nhom: Record<string, any[]> = { khop_du: [], khop_mot_phan: [], gan_khop_gia: [] };
    for (const r of uv) {
      const u: UngVien = { ...r, declared: BigInt(r.declared), available: BigInt(r.available), held: BigInt(r.held), committed: BigInt(r.committed), floor: BigInt(r.floor ?? '0') };
      const cam = camKetDuoc(u);
      if (cam <= 0n) continue;
      const giaOk = u.floor * 10000n <= maxp * 10500n;
      const ganGia = !giaOk && u.floor * 10000n <= maxp * 11000n;
      const lyDo: string[] = []; const thieu: string[] = [];
      let diem = 50;
      if (u.qty_basis === 'weighed') { diem += 20; lyDo.push('Đã cân'); } else lyDo.push(`Ước tính, cam kết được ${kg(cam)}`);
      if (u.province_code === 'DT') diem += 5;
      if (cam >= can) lyDo.push('Đủ lượng'); else thieu.push(`Thiếu ${kg(can - cam)}`);
      const the = { lot_id: u.lot_id, lot_code: u.code, seller_name: u.seller_name, province_code: u.province_code, kha_dung_cam_ket_g: cam.toString(), diem, ly_do_khop: lyDo, thieu };
      if (giaOk && cam >= can) nhom.khop_du.push(the);
      else if (giaOk) nhom.khop_mot_phan.push(the);
      else if (ganGia) nhom.gan_khop_gia.push({ ...the, ghi_chu: ['Cần thương lượng'] });
    }
    for (const k of Object.keys(nhom)) nhom[k].sort((a, b) => b.diem - a.diem || a.lot_code.localeCompare(b.lot_code));
    // Gợi ý gom: các lô khớp một phần cộng đủ lượng.
    let goiY: any = null;
    const mp = nhom.khop_mot_phan; let tong = 0n; const chon: string[] = [];
    for (const x of mp) { if (tong >= can) break; tong += BigInt(x.kha_dung_cam_ket_g); chon.push(x.lot_code); }
    if (chon.length > 1 && tong >= can) goiY = { lots: chon, tong_g: tong.toString() };
    out.push({ demand_line_id: l.id, grade_code: l.grade_code, qty_g: l.qty, ...nhom, goi_y_gom: goiY });
  }
  return out;
}

export async function ghepNhuCau(ht: HeThong, nd: NguoiDung, demandId: string) {
  const d0 = await ht.db.doc((t) => t.mot<any>(`SELECT buyer_org_id FROM core.demands WHERE id=$1`, [demandId]));
  if (!d0 || d0.buyer_org_id !== nd.thanhVien.orgId) throw loi('KHONG_TIM_THAY');
  if (!ht.cfg.aiUrl) return { demand_id: demandId, nguon: 'luat_backend', chi_goi_y: true, dong: await ht.db.doc((t) => ghepTheoLuat(t, demandId)) };
  // 1) Dựng snapshot trong giao dịch đọc (không giữ khóa khi gọi mạng).
  const snaps = await ht.db.doc((t) => dungSnapshot(t, demandId, ht.dongHo.now()));
  const dong: any[] = []; const loiAi: string[] = [];
  for (const s of snaps) {
    try {
      const r = await fetch(`${ht.cfg.aiUrl}/match`, {
        method: 'POST', signal: AbortSignal.timeout(ht.cfg.aiTimeoutMs),
        headers: { 'content-type': 'application/json', ...(ht.cfg.aiKey ? { 'x-ai-key': ht.cfg.aiKey } : {}) }, body: JSON.stringify(s.yeuCau),
      });
      if (!r.ok) throw new Error(`AI HTTP ${r.status}`);
      const j: any = await r.json();
      const requestId = r.headers.get('x-request-id');
      const mapLo = (x: any) => { const l = s.loTheoMa.get(x.lo_id); return l ? { lot_id: l.lot_id, lot_code: l.code, seller_name: l.seller_name, province_code: l.province_code,
        kha_dung_cam_ket_g: String(Math.round(Number(x.kha_dung_cam_ket_kg ?? 0) * 1000)), diem: x.diem, khoang_cach_km: x.khoang_cach_km ?? null, ly_do_khop: x.ly_do_khop ?? [], thieu: x.thieu ?? [], ghi_chu: x.ghi_chu ?? [] } : null; };
      const nhom = { khop_du: (j.khop_du ?? []).map(mapLo).filter(Boolean), khop_mot_phan: (j.khop_mot_phan ?? []).map(mapLo).filter(Boolean), gan_khop_gia: (j.gan_khop_gia ?? []).map(mapLo).filter(Boolean) };
      // 0049: ghi bộ đệm bằng cmd.cache_match_candidates (login điều phối) trong giao dịch riêng sau khi có kết quả AI.
      await ghiBoDem(ht, s.lineId, j, s, requestId).catch((e) => loiAi.push('cache: ' + String(e?.message ?? e).slice(0, 100)));
      dong.push({ demand_line_id: s.lineId, grade_code: s.grade, qty_g: s.qty, ...nhom, goi_y_gom: j.goi_y_gom ?? null, phien_ban_luat: j.phien_ban_luat ?? null, request_id: requestId });
    } catch (e: any) {
      loiAi.push(String(e?.message ?? e).slice(0, 120));
      const luat = await ht.db.doc((t) => ghepTheoLuat(t, demandId));
      dong.push(luat.find((x) => x.demand_line_id === s.lineId));
    }
  }
  return { demand_id: demandId, nguon: loiAi.length ? 'luat_backend (AI lỗi, dự phòng)' : 'ai', loi_ai: loiAi, chi_goi_y: true, dong };
}

const PK: Record<string, string> = { export: 'xuat_khau', processor: 'che_bien', horeca: 'nha_hang', wholesaler: 'dau_moi' };
const LOAI_NB: Record<string, string> = { household: 'ho', cooperative: 'htx', trader: 'vua', coop_group: 'to_hop_tac', enterprise: 'trang_trai' };
const MAC_DINH = { vi_do: 10.4593, kinh_do: 105.6324 }; // Cao Lãnh: dùng khi chưa có tọa độ (ghi trong lý do)

/** Snapshot theo docs/ai/04 mục 3.1; lượng kg thập phân, tiền nguyên đồng; giá kín chỉ đi một chiều vào AI. */
async function dungSnapshot(t: GiaoDich, demandId: string, luc: Date) {
  const d = await t.mot<any>(`SELECT d.*, p.code product_code, lower(d.needed_during)::text tu, (upper(d.needed_during)-1)::text den, f.lat, f.lng, o.code buyer_code
    FROM core.demands d JOIN core.products p ON p.id=d.product_id JOIN core.organizations o ON o.id=d.buyer_org_id LEFT JOIN core.facilities f ON f.id=d.delivery_facility_id WHERE d.id=$1`, [demandId]);
  const lines = await t.q<any>(`SELECT l.*, (SELECT max_price_vnd FROM core.demand_line_max_prices p WHERE p.demand_line_id=l.id ORDER BY id DESC LIMIT 1)::text maxp FROM core.demand_lines l WHERE l.demand_id=$1`, [demandId]);
  const out = [];
  for (const l of lines) {
    const lots = await t.q<any>(`SELECT l.id lot_id,l.code,l.qty_basis,l.declared_qty::text declared,l.available_from::text af,l.harvest_on::text ho,l.spray_clear_on::text sc,l.last_confirmed_at,l.status,l.safety_locked_at,l.urgent_sale_until,
        o.code seller_code,o.display_name seller_name,o.province_code,o.kind,o.verification_level,s.lat,s.lng,pp.shelf_life_days,
        (SELECT floor_price_vnd FROM core.lot_price_versions v WHERE v.lot_id=l.id ORDER BY v.id DESC LIMIT 1)::text floor,
        coalesce((SELECT sum(qty) FROM ledger.qty_balances b WHERE b.lot_id=l.id AND bucket='held'),0)::text held,
        coalesce((SELECT sum(qty) FROM ledger.qty_balances b WHERE b.lot_id=l.id AND bucket IN ('committed','in_transit','delivered')),0)::text committed,
        (SELECT count(*)::int FROM core.orders x WHERE x.seller_org_id=l.seller_org_id AND x.status='completed') so_hoan_tat,
        (SELECT count(*)::int FROM core.orders x WHERE x.seller_org_id=l.seller_org_id AND x.buyer_org_id=$4 AND x.status='completed') so_voi_bm
      FROM core.lots l JOIN core.organizations o ON o.id=l.seller_org_id LEFT JOIN core.production_sites s ON s.id=l.site_id
      JOIN core.product_profiles pp ON pp.product_id=l.product_id AND pp.profile_version=l.profile_version
      WHERE l.product_id=$1 AND l.grade_code=$2 AND l.status IN ('on_sale','upcoming') AND l.seller_org_id<>$3`, [d.product_id, l.grade_code, d.buyer_org_id, d.buyer_org_id]);
    const loTheoMa = new Map<string, any>();
    const lo = [];
    for (const x of lots) {
      if (!x.floor || Number(x.floor) <= 0) continue;
      const giay = await t.q<any>(`SELECT kind, market, lower(valid_during)::text tu, (upper(valid_during)-1)::text den, verified_at, revoked_at FROM core.certifications WHERE org_id=(SELECT seller_org_id FROM core.lots WHERE id=$1) AND valid_during IS NOT NULL`, [x.lot_id]);
      const ngay = x.af ?? luc.toISOString().slice(0, 10);
      const han = new Date(Date.parse(x.ho ?? ngay) + (x.shelf_life_days ?? 30) * 86400_000).toISOString().slice(0, 10);
      loTheoMa.set(x.code, x);
      lo.push({
        id: x.code, ben_ban_id: x.seller_code, mat_hang: d.product_code, dang: 'tuoi', loai: l.grade_code,
        luong_khai_kg: Number(x.declared) / 1000, da_can: x.qty_basis === 'weighed', da_cam_ket_kg: Number(x.committed) / 1000, dang_giu_kg: Number(x.held) / 1000,
        ngay_co_hang: ngay, han_su_dung: han < ngay ? ngay : han, het_cach_ly: x.sc ?? null,
        vi_tri: x.lat != null ? { vi_do: x.lat, kinh_do: x.lng } : MAC_DINH,
        giay_to: [...new Map(giay.map((g) => [g.kind + (g.market ? ':' + g.market : ''), { ma: g.kind + (g.market ? ':' + g.market : ''), trang_thai: g.revoked_at ? 'het_han' : g.verified_at ? 'da_xac_minh' : 'tu_khai', tu_ngay: g.tu, den_ngay: g.den }])).values()],
        gia_thap_nhat_kin: Number(x.floor), so_don_hoan_tat: x.so_hoan_tat, so_don_voi_ben_mua: x.so_voi_bm,
        xac_nhan_luc: new Date(x.last_confirmed_at ?? luc).toISOString(), trang_thai: x.status === 'upcoming' ? 'sap_co_hang' : 'dang_ban',
        khoa_an_toan: !!x.safety_locked_at, ban_gap: !!x.urgent_sale_until, loai_nguoi_ban: LOAI_NB[x.kind] ?? 'ho', nguoi_ban_da_xac_minh: x.verification_level >= 1,
      });
    }
    out.push({ lineId: l.id, grade: l.grade_code, qty: String(l.qty), loTheoMa, yeuCau: {
      nhu_cau: { id: l.id, ben_mua_id: d.buyer_code, phan_khuc: PK[d.segment_code] ?? 'che_bien', mat_hang: d.product_code, dang: 'tuoi', loai: [l.grade_code],
        luong_kg: Number(l.qty) / 1000, toi_thieu_nguon_kg: l.min_source_qty ? Number(l.min_source_qty) / 1000 : null, ngay_tu: d.tu, ngay_den: d.den,
        vi_tri: d.lat != null ? { vi_do: d.lat, kinh_do: d.lng } : MAC_DINH, giay_to_bat_buoc: d.required_docs ?? [], giay_to_uu_tien: d.preferred_docs ?? [],
        gia_toi_da_kin: Number(l.maxp), kieu_giao: d.delivery_mode === 'self_pickup' ? 'tu_lay' : 'giao_toi', trang_thai: 'dang_mo' },
      lo, thoi_diem: luc.toISOString(), phien_ban_du_lieu: `snap-${luc.toISOString()}-${demandId.slice(0, 8)}`,
    } });
  }
  return out;
}

const LY_DO_HOP_LE = ['product','grade','quantity','distance','schedule','documents','reputation','relationship','price_compatible','partial_quantity','near_price'];
function lyDoChuan(ds: unknown[]): string[] {
  const out = new Set<string>(['product', 'grade']);
  for (const x of ds ?? []) {
    const v = String(x).toLowerCase();
    for (const k of LY_DO_HOP_LE) if (v.includes(k.replace('_', ' ')) || v.includes(k)) out.add(k);
    if (/lượng|so luong|qty/.test(v)) out.add('quantity');
    if (/khoảng cách|km|gần/.test(v)) out.add('distance');
    if (/ngày|lịch|thời gian/.test(v)) out.add('schedule');
    if (/giấy|chứng nhận|vietgap|hồ sơ/.test(v)) out.add('documents');
  }
  return [...out];
}
/** Ghi kết quả AI vào mkt.match_candidates qua command; chỉ lô hợp lệ, lý do theo danh sách trắng, hạn 1 giờ. */
async function ghiBoDem(ht: HeThong, lineId: string, j: any, s: any, requestId: string | null) {
  const { systemCmd } = await import('../db/command.ts');
  const rows: any[] = []; const daCo = new Set<string>();
  for (const [nhom, mg] of [['khop_du', 'full'], ['khop_mot_phan', 'partial'], ['gan_khop_gia', 'near_price']] as const) {
    for (const x of j[nhom] ?? []) {
      const l = s.loTheoMa.get(x.lo_id); if (!l || daCo.has(l.lot_id)) continue; daCo.add(l.lot_id);
      const d = Number(x.diem ?? 0); const bps = Math.max(0, Math.min(11000, Math.round(d <= 1.1 ? d * 10000 : d * 100)));
      rows.push({ lot_id: l.lot_id, match_group: mg, score_bps: bps, distance_m: Math.max(0, Math.round(Number(x.khoang_cach_km ?? 0) * 1000)),
        promiseable_qty: Math.max(0, Math.round(Number(x.kha_dung_cam_ket_kg ?? 0) * 1000)), reasons: lyDoChuan([...(x.ly_do_khop ?? []), mg === 'partial' ? 'partial_quantity' : mg === 'near_price' ? 'near_price' : 'quantity']) });
    }
  }
  if (!rows.length) return;
  await ht.db.tx({ actor: 'system', lenh: 'ghi_bo_dem_ghep' }, async (t) => {
    const het = new Date(t.thoiDiemMs + 55 * 60 * 1000).toISOString();
    const khoa = `match:${lineId}:${requestId ?? t.thoiDiemMs}`;
    await t.voiHeThong(() => t.q(`SELECT cmd.cache_match_candidates($1,$2,$3,$4::jsonb,digest($4::jsonb::text,'sha256'),$5)`, [lineId, khoa, String(j.phien_ban_luat ?? 'ai'), JSON.stringify(rows), het]));
  });
}
