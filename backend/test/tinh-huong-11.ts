// Lối tắt nhà vườn: thời tiết (fixture Open-Meteo), tin RSS (fixture, chỉ tiêu đề/link), lịch sử người bán.
import { SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { dangNhapCacBen, chaoVaDongY, lapVaKy, chuyenCoc } from './luong.ts';
import { xoaBoDemTienIch } from '../src/nghiep-vu/tien-ich.ts';

const OPEN_METEO = {
  daily: {
    time: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'],
    temperature_2m_max: [33, 36, 32, 31, 30, 31, 32], temperature_2m_min: [25, 26, 24, 24, 23, 24, 24],
    precipitation_sum: [0, 2, 35, 5, 0, 0, 1], precipitation_probability_max: [10, 30, 90, 65, 5, 5, 20], wind_speed_10m_max: [12, 15, 45, 20, 10, 9, 11],
  },
};
const RSS = (items: [string, string][]) => `<?xml version="1.0"?><rss><channel>${items.map(([ti, de], i) =>
  `<item><title><![CDATA[${ti}]]></title><link>https://bao.example/bai-${i}</link><pubDate>Mon, 26 Oct 2026 0${i}:00:00 +0700</pubDate><description><![CDATA[${de} NỘI DUNG BẢN QUYỀN]]></description></item>`).join('')}</channel></rss>`;

them('TH-TI-01', 'Thời tiết 7 ngày theo tỉnh, lời khuyên mưa lớn/nắng nóng/gió, bộ đệm 1 giờ, lỗi mạng báo rõ', async (may, th) => {
  xoaBoDemTienIch();
  const nam = await may.dangNhap(SDT.nam);
  let goi = 0; const urls: string[] = [];
  may.ht.layMang = async (u) => { goi++; urls.push(u); return new Response(JSON.stringify(OPEN_METEO), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const r = (await nam.get('/v1/weather')).json;
  th.bang('Mặc định tỉnh của tổ chức', r.tinh?.ma, 'DT');
  th.bang('7 ngày', r.ngay?.length, 7);
  th.kiem('Gọi Open-Meteo đúng tọa độ', urls[0]?.includes('api.open-meteo.com') && urls[0]?.includes('latitude=10.46'), urls);
  th.kiem('Mưa lớn 4/11: nên hái sớm/che hàng', r.ngay[2].loi_khuyen.some((c: string) => c.includes('hái sớm') && c.includes('che hàng')), r.ngay[2]);
  th.kiem('Nắng nóng 3/11: giao sáng sớm', r.ngay[1].loi_khuyen.some((c: string) => c.includes('giao hàng sáng sớm')), r.ngay[1]);
  th.kiem('Gió mạnh 4/11', r.ngay[2].loi_khuyen.some((c: string) => c.includes('Gió mạnh')), r.ngay[2]);
  th.kiem('Ghi nguồn và giờ lấy', /Open-Meteo/.test(r.nguon) && !!r.lay_luc, r);
  await nam.get('/v1/weather');
  th.bang('Lần hai dùng bộ đệm', goi, 1);
  const ct = (await nam.get('/v1/weather?province=CT')).json;
  th.bang('Chọn tỉnh khác', ct.tinh?.ten, 'Cần Thơ');
  may.ht.layMang = async () => { throw new Error('getaddrinfo ENOTFOUND'); };
  const loiMang = await nam.get('/v1/weather?province=AG');
  th.bang('Mạng lỗi: 503 DICH_VU_NGOAI_LOI, không bịa', loiMang.json?.errors?.[0]?.code, 'DICH_VU_NGOAI_LOI');
  th.bang('Tỉnh lạ: 422', (await nam.get('/v1/weather?province=XX')).status, 422);
  may.ht.layMang = (u, i) => fetch(u, i);
});

them('TH-TI-02', 'Tin nông nghiệp lọc theo mặt hàng/tỉnh, chỉ tiêu đề/nguồn/ngày/link, nguồn lỗi được ghi', async (may, th) => {
  xoaBoDemTienIch();
  const nam = await may.dangNhap(SDT.nam);
  may.ht.layMang = async (u) => {
    if (u.includes('vov.vn')) return new Response('loi', { status: 500 });
    if (u.includes('nongnghiepmoitruong')) return new Response(RSS([['Giá xoài cát Chu ở Đồng Tháp tăng mạnh', 'Nhà vườn phấn khởi'], ['Lúa thu đông được mùa', 'Hậu Giang']]), { status: 200 });
    return new Response(RSS([['Chứng khoán hôm nay', 'Thị trường'], ['Xuất khẩu xoài sang Mỹ', 'Tiền Giang']]), { status: 200 });
  };
  const r = (await nam.get('/v1/news?product=XOAI_CAT_CHU')).json;
  th.kiem('Lọc theo xoài', r.tin.length >= 2 && r.tin.every((x: any) => x.tieu_de.toLowerCase().includes('xoài')), r.tin);
  th.kiem('Tin theo tỉnh lên trước', r.tin[0]?.theo_tinh === true, r.tin);
  th.kiem('Chỉ tiêu đề, nguồn, ngày, link (không chép nội dung)', !JSON.stringify(r).includes('NỘI DUNG BẢN QUYỀN') && Object.keys(r.tin[0]).sort().join(',') === 'link,ngay,nguon,theo_tinh,tieu_de', r.tin[0]);
  th.kiem('Ghi nguồn lỗi', r.nguon_loi.includes('VOV Kinh tế'), r.nguon_loi);
  th.bang('Mặt hàng lạ: 422', (await nam.get('/v1/news?product=KHONG_CO')).status, 422);
  may.ht.layMang = (u, i) => fetch(u, i);
});

them('TH-TI-03', 'Lịch sử người bán gộp lô, lời chào, đơn; bên mua không xem được', async (may, th) => {
  const b = await dangNhapCacBen(may);
  await chaoVaDongY(b, null); await lapVaKy(b, null); await chuyenCoc(b);
  const ds = (await b.nam.get('/v1/seller/history?limit=100')).json;
  const loai = new Set(ds.map((x: any) => x.loai));
  th.kiem('Có lô, lời chào, đơn', loai.has('lot') && loai.has('offer') && loai.has('order'), [...loai]);
  th.kiem('Mới nhất trước', ds.every((x: any, i: number) => i === 0 || new Date(ds[i - 1].luc) >= new Date(x.luc)), ds.slice(0, 3));
  th.kiem('Có đơn vừa lập', ds.some((x: any) => x.loai === 'order' && x.order_id === b.orderId), ds.filter((x: any) => x.loai === 'order'));
  th.bang('Bên mua: 403', (await b.ha.get('/v1/seller/history')).status, 403);
});
