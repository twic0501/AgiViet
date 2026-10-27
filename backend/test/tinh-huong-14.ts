// 10 số đăng nhập mẫu (0001–0010): dựng bằng API nghiệp vụ thật, đăng nhập bằng số ngắn, kiểm vai và trạng thái.
import { them } from './tinh-huong.ts';
import { dungDemo } from '../src/demo/dung-demo.ts';
import { SO_DEMO } from '../src/demo/so-demo.ts';

them('DEMO-10-SO', 'Dựng 10 tình huống, đăng nhập 0001–0010 bằng OTP 123456, đúng vai và đúng trạng thái; chạy lại giữ nguyên', async (may, th) => {
  const goi = async (method: 'GET' | 'POST', url: string, body?: any, token?: string) => {
    const r = await may.app.inject({ method, url, payload: method === 'POST' ? (body ?? {}) : undefined, headers: token ? { authorization: `Bearer ${token}` } : {} });
    return { status: r.statusCode, json: r.headers['content-type']?.toString().includes('json') ? r.json() : null };
  };
  const kq = await dungDemo(goi);
  th.bang('Dựng đủ 10 tình huống', kq.length, 10);
  const dn = async (so: string) => {
    const s = await goi('POST', '/v1/auth/otp/send', { phone: so });
    const v = await goi('POST', '/v1/auth/otp/verify', { challenge_id: s.json?.challenge_id, phone: so, code: '123456' });
    return v.json?.token as string;
  };
  const vaiMong: Record<string, (me: any) => boolean> = {};
  for (const s of SO_DEMO) vaiMong[s.so] = (me) => (s.app === 'ban' ? me.org?.can_sell ?? me.actions?.includes('lot.create') : me.actions?.some((a: string) => a.startsWith('order.view.buyer') || a === 'delivery.check' || a === 'demand.create'));
  for (const s of SO_DEMO) {
    const token = await dn(s.so);
    th.kiem(`${s.so} đăng nhập được`, !!token, s.so);
    if (!token) continue;
    const me = (await goi('GET', '/v1/me', undefined, token)).json;
    th.kiem(`${s.so} là ${s.ten} (${s.app === 'ban' ? 'bán' : 'mua'})`, me?.name === s.ten || me?.ten === s.ten || JSON.stringify(me).includes(s.ten), me);
    th.kiem(`${s.so} đúng vai app ${s.app}`, vaiMong[s.so](me), me?.actions);
  }
  const theo = Object.fromEntries(kq.map((x) => [x.so, x]));
  const tk = async (so: string) => dn(so);
  // Trạng thái nghiệp vụ đúng mô tả
  const t1 = await tk('0001'); const of1 = (await goi('GET', `/v1/offers/${theo['0001'].ids.offer_id}`, undefined, t1)).json;
  th.bang('0001 lời chào chờ trả lời', of1?.status, 'sent');
  const t2 = await tk('0002'); th.bang('0002 đơn chờ người bán ký', (await goi('GET', `/v1/orders/${theo['0002'].ids.order_id}`, undefined, t2)).json?.status, 'awaiting_seller');
  const t3 = await tk('0003'); const p3 = (await goi('GET', `/v1/orders/${theo['0003'].ids.order_id}/payments`, undefined, t3)).json.find((x: any) => x.id === theo['0003'].ids.payment_id);
  th.bang('0003 khoản trước bốc bên mua đã báo trả', p3?.status, 'payer_reported');
  const t4 = await tk('0004'); const d4 = (await goi('GET', `/v1/deliveries/${theo['0004'].ids.delivery_id}`, undefined, t4)).json;
  th.kiem('0004 chờ người bán ký kết quả cân (có hạ cấp/trả lại, cân thiếu)', d4?.status === 'awaiting_seller' && d4?.hanh_dong?.includes('agree_acceptance') && d4.ket_qua.at(-1).lines.some((l: any) => l.kind === 'downgraded'), d4?.hanh_dong);
  const t5 = await tk('0005'); const l5 = (await goi('GET', '/v1/lots?mine=true', undefined, t5)).json.find((x: any) => x.goi_y_ban_gap);
  th.kiem('0005 có lô con hàng trả lại đang bán, gợi ý bán gấp', !!l5 && l5.status === 'on_sale', l5);
  const t6 = await tk('0006'); const so6 = (await goi('GET', `/v1/demands/${theo['0006'].ids.demand_id}/offer-comparison`, undefined, t6)).json;
  th.kiem('0006 nhu cầu mở có 3 báo giá để so', Array.isArray(so6) && so6.length >= 3, so6);
  const t7 = await tk('0007'); th.bang('0007 đơn chờ cọc', (await goi('GET', `/v1/orders/${theo['0007'].ids.order_id}`, undefined, t7)).json?.status, 'awaiting_deposit');
  const t8 = await tk('0008'); const d8 = (await goi('GET', `/v1/deliveries/${theo['0008'].ids.delivery_id}`, undefined, t8)).json;
  th.kiem('0008 đợt sẵn sàng, mình là người nhận, có hành động mở mã', d8?.status === 'ready' && d8?.hanh_dong?.includes('show_receipt_code'), d8?.hanh_dong);
  const t9 = await tk('0009'); const tc = (await goi('GET', `/v1/orders/${theo['0009'].ids.order_id}/disputes`, undefined, t9)).json;
  th.kiem('0009 tranh chấp chờ kiểm định', tc?.some((x: any) => x.status === 'awaiting_inspection'), tc);
  const t10 = await tk('0010'); const v10 = (await goi('GET', `/v1/seasonal-orders/${theo['0010'].ids.order_id}`, undefined, t10)).json;
  th.kiem('0010 đặt trước đang hiệu lực, chờ chốt lượng/giá', v10?.order_status === 'active' && v10?.contract_type === 'pre_harvest' && v10?.hanh_dong?.includes('propose_harvest_fix'), v10);
  const lai = await dungDemo(goi);
  th.kiem('Chạy lại: giữ nguyên cả 10 (idempotent)', lai.length === 10 && lai.every((x) => x.giu_nguyen), lai.map((x) => [x.so, x.giu_nguyen]));
  const sai = await goi('POST', '/v1/auth/otp/send', { phone: '0011' });
  th.bang('Số ngắn ngoài danh sách vẫn bị từ chối', sai.status, 422);
});
