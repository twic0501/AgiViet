// Trung tâm hỗ trợ (mục 18), thông báo, nhật ký công việc cho đo lường pilot (mục 31), việc nền.
import { route } from '../lib/http.js';
import { one, all, run, insert, tx, newId, nowIso, addMs, loi, nextCode, HOUR, DAY } from '../lib/core.js';
import { canQuyen } from '../lib/chung.js';
import { hetHanLoiMoi } from './nguon-hang.js';
import { kichHoatTaiKhoanDenHan } from './dinh-danh.js';
import { xuLyPhiQuaHan } from './tien.js';
import { xuLyTranhChapQuaHan } from './giao-nhan.js';

// Ca trực mẫu: 5–19 giờ giờ Việt Nam (trường phải điền trước pilot)
const trongCa = (iso = nowIso()) => { const h = (new Date(iso).getUTCHours() + 7) % 24; return h >= 5 && h < 19; };
const MUC_TIEU = { P0: 15 * 60e3, P1: 15 * 60e3, P2: 4 * HOUR, P3: DAY };

route('POST', '/api/tickets', ctx => tx(() => {
  const { category = 'khac', priority = 'P3', entity_ref = null, description = null } = ctx.body;
  if (!['P0', 'P1', 'P2', 'P3'].includes(priority)) throw loi('E05', 'Mức khẩn không hợp lệ.', 'priority');
  const ca = trongCa();
  const t = insert('tickets', { id: newId('tk_'), code: nextCode('HT-', 'tickets'), org_id: ctx.org.id, entity_ref, priority, category, description, status: 'moi', next_update_at: ca ? addMs(nowIso(), MUC_TIEU[priority]) : null, created_at: nowIso() });
  // Ngoài ca: nói thật chưa có người trực, không báo "đang có người xử lý"
  return { __status: 201, item: t, trong_ca: ca, thong_bao: ca ? `Đã nhận. Cập nhật tiếp trước ${t.next_update_at.slice(11, 16)} (UTC).` : 'Ngoài giờ trực. Người trực nhận lúc 5 giờ sáng. Việc khẩn về tài khoản đã được khóa tự động nếu bạn bấm “Không phải tôi”.' };
}));
route('GET', '/api/tickets', ctx => ({ items: all('select * from tickets where org_id = ? order by created_at desc', ctx.org.id) }));
route('GET', '/api/notifications', ctx => ({ items: all('select * from notifications where org_id = ? order by at desc limit 50', ctx.org.id), chua_doc: one('select count(*) n from notifications where org_id = ? and read_at is null', ctx.org.id).n }));
route('POST', '/api/notifications/read', ctx => { run('update notifications set read_at = ? where org_id = ? and read_at is null', nowIso(), ctx.org.id); return {}; });

// Nhật ký công việc: 8 nhóm; thời gian của khách và nhân viên để tính tỷ lệ làm thay
route('POST', '/api/work-logs', ctx => tx(() => {
  canQuyen(ctx, 'administer');
  const b = ctx.body;
  const w = insert('work_logs', { id: newId('wl_'), day: b.day || nowIso().slice(0, 10), org_id: b.org_id || null, order_id: b.order_id || null, category: b.category, minutes: Number(b.minutes), external_cost_vnd: Number(b.external_cost_vnd || 0), subsidized: b.subsidized ? 1 : 0, is_estimate: b.is_estimate ? 1 : 0, performed_by: b.performed_by || 'nhan_vien', customer_task: b.customer_task ? 1 : 0 });
  return { __status: 201, item: w };
}));
route('GET', '/api/reports/pilot', ctx => {
  canQuyen(ctx, 'administer');
  const phut = all('select category, performed_by, sum(minutes) phut, sum(is_estimate) uoc_tinh from work_logs group by category, performed_by');
  const thaoTac = all('select performed_by, sum(minutes) phut from work_logs where customer_task = 1 group by performed_by');
  const nv = thaoTac.find(r => r.performed_by === 'nhan_vien')?.phut || 0, kh = thaoTac.find(r => r.performed_by === 'khach')?.phut || 0;
  const pheu = one('select count(*) du_dieu_kien, sum(offered) duoc_gioi_thieu from eligibility_records where eligible = 1');
  const chon = one("select count(distinct order_id) n from service_engagement_versions where status in ('kich_hoat','hoan_tat','ket_thuc_chuyen_co_che')").n;
  const tra = one("select count(distinct order_id) n from fee_invoices where kind = 'phi_thanh_cong' and status = 'da_tra'").n;
  return { phut_theo_nhom: phut, ty_le_lam_thay: nv + kh ? Math.round(nv * 1000 / (nv + kh)) / 10 : null, pheu: { ...pheu, chap_nhan: chon, thuc_tra: tra }, ghi_chu: 'Báo số đếm kèm cỡ mẫu; không suy ra tỷ lệ thị trường.' };
});

/* ---------- Việc nền ---------- */
export function chayViecNen() {
  const ketQua = {
    loi_moi_het_han: hetHanLoiMoi(),
    giu_cho_het_han: tx(() => run("update reservations set status = 'het_han' where status in ('cho_dong_y','dang_giu') and expires_at <= ?", nowIso()).changes),
    tai_khoan_kich_hoat: kichHoatTaiKhoanDenHan(),
    phi_qua_han: tx(() => xuLyPhiQuaHan()),
    tranh_chap: xuLyTranhChapQuaHan(),
  };
  return ketQua;
}
route('POST', '/api/system/run-jobs', ctx => { canQuyen(ctx, 'administer'); return { ket_qua: chayViecNen() }; });
route('GET', '/api/health', () => ({ trang_thai: 'tot', gio: nowIso(), demo: process.env.AGIVIET_DEMO !== '0' }), { moi: true });
