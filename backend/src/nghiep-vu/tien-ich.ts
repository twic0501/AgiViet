// Lối tắt cho nhà vườn: thời tiết 7 ngày (Open-Meteo), tin nông nghiệp (RSS báo chính thống, chỉ tiêu đề/nguồn/ngày/link),
// lịch sử hoạt động của người bán (gộp từ dữ liệu sẵn có, không bảng mới). Mạng ngoài lỗi thì báo rõ, không bịa số liệu.
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import type { NguoiDung } from '../auth/phien.ts';
import { loi } from '../loi.ts';

export type LayMang = (url: string, init?: RequestInit) => Promise<Response>;

/** Tọa độ cố định (trung tâm hành chính) các tỉnh trong vùng; từ khóa gồm cả tên trước sáp nhập 2025 để lọc tin. */
export const TINH: Record<string, { ten: string; vi_do: number; kinh_do: number; tu_khoa: string[] }> = {
  DT: { ten: 'Đồng Tháp', vi_do: 10.46, kinh_do: 105.63, tu_khoa: ['đồng tháp', 'tiền giang', 'cao lãnh', 'mỹ tho', 'sa đéc'] },
  CT: { ten: 'Cần Thơ', vi_do: 10.03, kinh_do: 105.78, tu_khoa: ['cần thơ', 'sóc trăng', 'hậu giang'] },
  VL: { ten: 'Vĩnh Long', vi_do: 10.25, kinh_do: 105.97, tu_khoa: ['vĩnh long', 'bến tre', 'trà vinh'] },
  AG: { ten: 'An Giang', vi_do: 10.38, kinh_do: 105.44, tu_khoa: ['an giang', 'kiên giang', 'long xuyên', 'rạch giá'] },
  CM: { ten: 'Cà Mau', vi_do: 9.18, kinh_do: 105.15, tu_khoa: ['cà mau', 'bạc liêu'] },
  TN: { ten: 'Tây Ninh', vi_do: 11.31, kinh_do: 106.1, tu_khoa: ['tây ninh', 'long an'] },
  HCM: { ten: 'TP.HCM', vi_do: 10.78, kinh_do: 106.7, tu_khoa: ['tp.hcm', 'tphcm', 'hồ chí minh', 'bình dương', 'bà rịa'] },
};

/** Nguồn RSS đã kiểm còn chạy 27/10/2026. Báo Đồng Tháp (baodongthap.vn/rss…) trả 500 nên chưa dùng. */
export const NGUON_TIN = [
  { ten: 'Báo Nông nghiệp và Môi trường', url: 'https://nongnghiepmoitruong.vn/kinh-te.rss' },
  { ten: 'VnExpress Kinh doanh', url: 'https://vnexpress.net/rss/kinh-doanh.rss' },
  { ten: 'Tuổi Trẻ Kinh doanh', url: 'https://tuoitre.vn/rss/kinh-doanh.rss' },
  { ten: 'VOV Kinh tế', url: 'https://vov.vn/rss/kinh-te.rss' },
];

const GIO_MS = 3600_000;
const boDem = new Map<string, { het: number; du: any }>();
export function xoaBoDemTienIch() { boDem.clear(); }
async function quaBoDem<T>(khoa: string, fn: () => Promise<T>): Promise<T & { tu_bo_dem?: boolean }> {
  const c = boDem.get(khoa);
  if (c && c.het > Date.now()) return { ...c.du, tu_bo_dem: true };
  const du = await fn();
  boDem.set(khoa, { het: Date.now() + GIO_MS, du });
  return du as any;
}

// ---------------- Thời tiết ----------------
export async function thoiTiet(t: GiaoDich, nd: NguoiDung, layMang: LayMang, province?: string) {
  let ma = province?.toUpperCase();
  if (!ma) ma = (await t.gtri<string>(`SELECT province_code FROM core.organizations WHERE id=$1`, [nd.thanhVien.orgId])) ?? 'DT';
  const tinh = TINH[ma];
  if (!tinh) throw loi('DU_LIEU_KHONG_HOP_LE', `Chưa có tọa độ cho tỉnh ${ma}. Hỗ trợ: ${Object.keys(TINH).join(', ')}.`);
  return quaBoDem(`tt:${ma}`, async () => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${tinh.vi_do}&longitude=${tinh.kinh_do}`
      + '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FHo_Chi_Minh&forecast_days=7';
    let j: any;
    try {
      const r = await layMang(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      j = await r.json();
    } catch (e: any) {
      throw loi('DICH_VU_NGOAI_LOI', `Chưa lấy được dự báo thời tiết (${String(e?.message ?? e).slice(0, 80)}). Thử lại sau ít phút.`);
    }
    const d = j?.daily;
    if (!d || !Array.isArray(d.time)) throw loi('DICH_VU_NGOAI_LOI', 'Nguồn thời tiết trả dữ liệu không đúng định dạng.');
    const ngay = d.time.map((ngayStr: string, i: number) => {
      const muaMm = d.precipitation_sum?.[i] ?? null; const khaNang = d.precipitation_probability_max?.[i] ?? null;
      const max = d.temperature_2m_max?.[i] ?? null; const gio = d.wind_speed_10m_max?.[i] ?? null;
      const loiKhuyen: string[] = [];
      if ((muaMm ?? 0) >= 20 || ((khaNang ?? 0) >= 80 && (muaMm ?? 0) >= 10)) loiKhuyen.push('Mưa lớn: nên hái sớm trước mưa, che hàng, hẹn xe tránh giờ mưa.');
      else if ((khaNang ?? 0) >= 60) loiKhuyen.push('Có thể mưa: chuẩn bị bạt che khi hái và chờ xe.');
      if ((max ?? 0) >= 35) loiKhuyen.push('Nắng nóng: giao hàng sáng sớm, để hàng nơi mát, tránh phơi nắng.');
      if ((gio ?? 0) >= 40) loiKhuyen.push('Gió mạnh: chằng buộc hàng, kiểm tra cây trái dễ gãy cành.');
      return { ngay: ngayStr, nhiet_do_cao_c: max, nhiet_do_thap_c: d.temperature_2m_min?.[i] ?? null, mua_mm: muaMm, kha_nang_mua_phan_tram: khaNang, gio_manh_nhat_kmh: gio, loi_khuyen: loiKhuyen };
    });
    return {
      tinh: { ma, ten: tinh.ten, vi_do: tinh.vi_do, kinh_do: tinh.kinh_do }, ngay,
      canh_bao: ngay.flatMap((x: any) => x.loi_khuyen.map((c: string) => `${x.ngay}: ${c}`)),
      nguon: 'Open-Meteo (open-meteo.com), dự báo theo tọa độ trung tâm tỉnh', lay_luc: new Date().toISOString(),
    };
  });
}

// ---------------- Tin tức ----------------
function boTheCdata(s: string) { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(); }
function the(xml: string, ten: string) { const m = xml.match(new RegExp(`<${ten}[^>]*>([\\s\\S]*?)</${ten}>`, 'i')); return m ? boTheCdata(m[1]) : ''; }
/** Chỉ lấy tiêu đề, link, ngày; KHÔNG giữ mô tả/nội dung bài để tôn trọng bản quyền. */
export function docRss(xml: string) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []).map((it) => ({ tieu_de: the(it, 'title'), link: the(it, 'link'), ngay: the(it, 'pubDate'), _loc: (the(it, 'title') + ' ' + the(it, 'description')).toLowerCase() }));
}

export async function tinTuc(t: GiaoDich, nd: NguoiDung, layMang: LayMang, productCode?: string, province?: string) {
  const tuKhoa: string[] = [];
  let tenSp: string | null = null;
  if (productCode) {
    tenSp = await t.gtri<string>(`SELECT name_vi FROM core.products WHERE code=$1`, [productCode]);
    if (!tenSp) throw loi('DU_LIEU_KHONG_HOP_LE', 'Mặt hàng không có trong danh mục.');
    const thap = tenSp.toLowerCase();
    tuKhoa.push(thap, thap.split(' ')[0]); // "xoài cát chu" và "xoài"
  }
  const ma = (province ?? (await t.gtri<string>(`SELECT province_code FROM core.organizations WHERE id=$1`, [nd.thanhVien.orgId])) ?? '').toUpperCase();
  const tuKhoaTinh = TINH[ma]?.tu_khoa ?? [];
  const nguonDocDuoc: string[] = []; const nguonLoi: string[] = [];
  const tatCa = await quaBoDem('tin:rss', async () => {
    const out: any[] = [];
    await Promise.all(NGUON_TIN.map(async (n) => {
      try {
        const r = await layMang(n.url, { signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'AgiViet/1.0 (+https://agiviet.id.vn)' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        for (const x of docRss(await r.text())) out.push({ ...x, nguon: n.ten });
        nguonDocDuoc.push(n.ten);
      } catch { nguonLoi.push(n.ten); }
    }));
    if (!out.length) throw loi('DICH_VU_NGOAI_LOI', 'Chưa đọc được nguồn tin nào. Thử lại sau.');
    return { items: out, nguon_doc_duoc: nguonDocDuoc, nguon_loi: nguonLoi, lay_luc: new Date().toISOString() };
  });
  const khop = (x: any, ds: string[]) => ds.some((k) => x._loc.includes(k));
  const nongNghiep = ['nông sản', 'trái cây', 'nông dân', 'xuất khẩu', 'giá lúa', 'thủy sản', 'tôm', 'cá tra', 'sầu riêng', 'xoài', 'nhà vườn', 'hợp tác xã', 'đbscl', 'đồng bằng sông cửu long', 'miền tây', 'nông nghiệp'];
  const loc = tatCa.items.filter((x: any) => tuKhoa.length ? khop(x, tuKhoa) : (khop(x, nongNghiep) || khop(x, tuKhoaTinh)))
    .map((x: any) => ({ tieu_de: x.tieu_de, nguon: x.nguon, ngay: x.ngay && !Number.isNaN(Date.parse(x.ngay)) ? new Date(x.ngay).toISOString() : null, link: x.link, theo_tinh: khop(x, tuKhoaTinh) }))
    .sort((a: any, b: any) => Number(b.theo_tinh) - Number(a.theo_tinh) || String(b.ngay).localeCompare(String(a.ngay)))
    .slice(0, 30);
  return { mat_hang: tenSp, tinh: TINH[ma]?.ten ?? null, tu_khoa: tuKhoa.length ? tuKhoa : ['tin nông nghiệp chung'], tin: loc,
    nguon: NGUON_TIN.map((n) => n.ten), nguon_doc_duoc: tatCa.nguon_doc_duoc, nguon_loi: tatCa.nguon_loi, lay_luc: tatCa.lay_luc,
    ghi_chu: 'Chỉ hiển thị tiêu đề và đường dẫn tới bài gốc; mở link để đọc trên trang báo.' };
}

// ---------------- Lịch sử người bán ----------------
export async function lichSuNguoiBan(t: GiaoDich, nd: NguoiDung, q: { limit?: number; before?: string }) {
  if (!nd.thanhVien.canSell) throw loi('KHONG_CO_QUYEN', 'Chỉ tổ chức bán có lịch sử này.');
  const org = nd.thanhVien.orgId; const lim = Math.min(Math.max(Number(q.limit ?? 50), 1), 200);
  const truoc = q.before ? new Date(q.before) : new Date('9999-01-01');
  return t.q(`SELECT * FROM (
      SELECT 'lot' loai, l.id, l.code ma, l.created_at luc, 'Đăng/tạo lô ' || p.name_vi || ' ' || l.grade_code tieu_de, l.status trang_thai, NULL::text so_tien_vnd, NULL::uuid order_id
        FROM core.lots l JOIN core.products p ON p.id=l.product_id WHERE l.seller_org_id=$1
      UNION ALL SELECT 'offer', o.id, o.code, o.created_at, CASE o.direction WHEN 'buyer_bid' THEN 'Nhận lời chào mua' ELSE 'Gửi báo giá' END || ' (lô ' || l.code || ')', o.status, NULL, NULL
        FROM core.offers o JOIN core.lots l ON l.id=o.lot_id WHERE o.seller_org_id=$1
      UNION ALL SELECT 'order', o.id, o.code, o.created_at, 'Đơn ' || o.code || ' với ' || b.display_name, o.status, NULL, o.id
        FROM core.orders o JOIN core.organizations b ON b.id=o.buyer_org_id WHERE o.seller_org_id=$1
      UNION ALL SELECT 'money_in', c.id, p.code, c.confirmed_at, 'Tiền về (xác nhận đã nhận) khoản ' || p.code, p.status, c.amount_vnd::text, p.order_id
        FROM core.direct_payment_confirmations c JOIN core.direct_payments p ON p.id=c.direct_payment_id WHERE p.payee_org_id=$1
      UNION ALL SELECT 'payout', b.id, b.code, coalesce(b.sent_at,b.created_at), 'Lệnh chi cọc về tài khoản', b.status, b.amount_vnd::text, b.order_id
        FROM core.bank_instructions b WHERE b.target_org_id=$1 AND b.kind='release_deposit_to_seller'
      UNION ALL SELECT 'dispute', d.id, NULL, d.created_at, 'Tranh chấp: ' || d.reason, d.status, NULL, d.order_id
        FROM core.disputes d JOIN core.orders o ON o.id=d.order_id WHERE o.seller_org_id=$1
      UNION ALL SELECT 'cancellation', c.id, NULL, c.created_at, 'Đề nghị hủy đơn (' || c.reason_kind || ')', c.status, NULL, c.order_id
        FROM core.cancellation_requests c JOIN core.orders o ON o.id=c.order_id WHERE o.seller_org_id=$1
    ) x WHERE luc < $2 ORDER BY luc DESC, id LIMIT $3`, [org, truoc, lim]);
}
