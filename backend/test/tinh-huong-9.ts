// Ghép qua dịch vụ AI có dự phòng, outbox/thông báo, truy vấn mức Vừa.
import { SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { dangNhapCacBen, chaoVaDongY, lapVaKy, chuyenCoc } from './luong.ts';

const kiemGhep = (th: any, j: any, nguonMong: RegExp) => {
  th.kiem(`Nguồn kết quả ${nguonMong}`, nguonMong.test(j.nguon), j.nguon);
  const l1 = j.dong.find((x: any) => x.grade_code === 'L1') ?? j.dong[0];
  const du = (l1.khop_du ?? []).map((x: any) => x.lot_code);
  const mp = (l1.khop_mot_phan ?? []).map((x: any) => x.lot_code);
  th.kiem('Khớp đủ có L-0414 và L-0412, L-0414 xếp trên', du.includes('L-0414') && du.includes('L-0412') && du.indexOf('L-0414') < du.indexOf('L-0412'), { du, mp });
  th.kiem('Khớp một phần có L-0420', mp.includes('L-0420'), { du, mp });
  th.kiem('Không hiện lô loại L2 (L-0413)', !du.concat(mp).includes('L-0413'), du);
  const s = JSON.stringify(j);
  th.kiem('Không lộ giá kín (21500, 22000) hay giá tối đa', !/2150\d|"22000"|24000/.test(s), null);
};

them('TH-004dp', 'Ghép: AI lỗi → dự phòng bằng luật, cùng nhóm, không lộ giá', async (may, th) => {
  const ha = await may.dangNhap(SDT.ha);
  await may.he('/v1/test/ai', { url: 'http://127.0.0.1:9' });
  const nc = await may.v<string>(`SELECT id FROM core.demands WHERE code='NC-3001'`);
  const j = (await ha.get(`/v1/demands/${nc}/matches`)).json;
  await may.he('/v1/test/ai', { url: null });
  kiemGhep(th, j, /dự phòng/);
});

if (process.env.AGV_TEST_AI_URL) them('TH-004ai', 'Ghép qua dịch vụ AI thật (/match), ghi mkt.match_candidates', async (may, th) => {
  const ha = await may.dangNhap(SDT.ha);
  await may.he('/v1/test/ai', { url: process.env.AGV_TEST_AI_URL });
  const nc = await may.v<string>(`SELECT id FROM core.demands WHERE code='NC-3001'`);
  const j = (await ha.get(`/v1/demands/${nc}/matches`)).json;
  await may.he('/v1/test/ai', { url: null });
  th.kiem('Không lỗi AI', (j.loi_ai ?? []).length === 0, j.loi_ai);
  kiemGhep(th, j, /^ai$/);
  const n = await may.v<number>(`SELECT count(*)::int FROM mkt.match_candidates c JOIN core.demand_lines l ON l.id=c.demand_line_id JOIN core.demands d ON d.id=l.demand_id WHERE d.code='NC-3001'`);
  th.kiem('Đã ghi bộ đệm match_candidates', n > 0, n);
});

them('GD-05', 'Outbox gửi thông báo; sổ tiền; gói; hỗ trợ; hồ sơ nguồn', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b);
  const ob = await may.he('/v1/test/outbox/run', {});
  th.kiem('Worker gửi sự kiện notify/sync', ob.sent > 0, ob);
  const tb = (await b.nam.get('/v1/notifications')).json;
  th.kiem('Người bán có thông báo đơn hiệu lực', tb.some((x: any) => x.event_type === 'don.hieu_luc'), tb.map((x: any) => x.event_type));
  const ngoai = await may.dangNhap(SDT.quan);
  const tb2 = (await ngoai.get('/v1/notifications')).json;
  th.kiem('Tổ chức ngoài không thấy thông báo đơn', !tb2.some((x: any) => x.order_id === b.orderId), tb2.length);
  const st = (await b.nam.get('/v1/money/summary')).json;
  th.bang('Sổ tiền: cọc ngân hàng đang giữ', st.tong.coc_dang_giu, '13800000');
  const goi = (await b.ha.get('/v1/plans')).json;
  th.kiem('Danh mục 4 gói có nhãn giá thử', goi.length === 4 && goi.every((g: any) => g.la_gia_thu), goi.length);
  const thinh = await may.dangNhap(SDT.thinh);
  th.bang('Gói hiện hành Thu mua', (await thinh.get('/v1/org/subscription')).json.plan_code, 'procurement');
  const doi = await thinh.post('/v1/org/subscription', { plan_code: 'kitchen' });
  th.bang('Hạ xuống Bếp (2 thành viên) bị chặn vì đang 4', doi.json.errors?.[0]?.code, 'GOI_HET_THANH_VIEN');
  const nang = await thinh.ok('/v1/org/subscription', { plan_code: 'enterprise' });
  th.bang('Nâng Doanh nghiệp: tháng đầu 29/30', nang.data.tien_thang_dau_vnd, '3866667');
  th.bang('Đọc lại gói sau khi đổi: enterprise', (await thinh.get('/v1/org/subscription')).json.plan_code, 'enterprise');
  const ht = await b.lan.ok('/v1/support', { message: 'Không thấy mã QR', error_code: 'QR_HET_HAN', request_id: 'req-x' });
  th.kiem('Yêu cầu hỗ trợ tạo việc V23 (mã do DB cấp TASK-)', /^TASK-/.test(ht.data.code), ht.data);
  th.bang('Danh sách hỗ trợ', (await b.lan.get('/v1/support')).json.length, 1);
  const hs = (await b.ha.get(`/v1/lots/${b.lotId}/source-profile`)).json;
  th.kiem('Hồ sơ nguồn: không bịa uy tín', hs.uy_tin === null && Array.isArray(hs.giay_to), hs);
});
