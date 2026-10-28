// Trang chọn vai thử (bản 23): đọc 10 số demo và danh sách tài khoản từ /v1/test/* (chỉ môi trường thử),
// mô tả vai, quyền, tình huống; nút mở tab app đã đăng nhập qua /v1/test/impersonate (như launch.js).
import { Api } from '../shared/api.js';
import { testAccess } from './case-engine.js';

const QUYEN_TO_CHUC = {
  owner: 'Chủ: ký hợp đồng, xác nhận tiền, duyệt mọi việc của tổ chức',
  purchaser: 'Thu mua: lập nhu cầu, so báo giá, đề xuất đơn',
  accountant: 'Kế toán: chuyển cọc/tiền, đối chiếu khoản phải trả',
  receiver: 'Người nhận hàng: mở mã giao, nhập nghiệm thu',
  member: 'Thành viên: xem và làm việc được giao',
};
const QUYEN_VAN_HANH = {
  dispatcher: 'Điều phối: hộp việc, giao hồ sơ, đề xuất nguồn cho kế hoạch định kỳ, gắn nguồn vào đơn',
  supervisor: 'Giám sát: duyệt quyết định hai người, giao hồ sơ, xử lý ngoại lệ',
  finance: 'Tài chính: đối soát tiền, đề xuất/duyệt lệnh tiền, xác minh bồi hoàn đã trả',
  risk: 'Rủi ro: kết luận tranh chấp, quyết định phân bổ phí kiểm định',
  field: 'Hiện trường: xác minh người bán tại chỗ, giữ hàng tại chỗ',
  catalog: 'Danh mục: mặt hàng, thông số giữ hàng',
  inspector: 'Kiểm định (đối tác): chỉ hồ sơ kiểm định được giao',
};
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const trangThai = document.querySelector('#trang-thai');

async function moVai(api, phone, orgCode, app) {
  // Mở tab trước (tránh chặn popup), rồi nạp phiên vào sessionStorage của tab đó.
  const tab = window.open('about:blank', '_blank');
  try {
    const r = await api.post('/v1/test/impersonate', { phone, org_code: orgCode });
    tab.sessionStorage.setItem('agv-session-' + app, JSON.stringify({ token: r.token }));
    tab.location.replace('/' + app + '/#/');
  } catch (e) { tab?.close(); trangThai.textContent = 'Chưa mở được vai: ' + e.message; }
}

try {
  const api = new Api(); await testAccess(api);
  const [so, taiKhoan] = await Promise.all([api.get('/v1/test/demo-numbers'), api.get('/v1/test/accounts')]);
  const theoSdt = new Map(taiKhoan.map((t) => [t.phone, t]));
  const khach = document.querySelector('#khach');
  for (const s of so) {
    const t = theoSdt.get(s.sdt) ?? {};
    const the = el('div', 'the');
    the.append(el('h3', null, `${s.so} · ${s.ten}`), el('div', 'nho', `${s.to_chuc} · app ${s.app === 'ban' ? 'người bán' : 'bên mua'}`));
    const vai = el('div'); for (const r of (t.roles || '').split(',').filter(Boolean)) vai.append(el('span', 'nhan', QUYEN_TO_CHUC[r] ?? r)); the.append(vai);
    the.append(el('div', null, 'Tình huống: ' + s.tinh_huong));
    const nut = el('button', null, 'Mở app với vai này'); nut.type = 'button';
    nut.onclick = () => moVai(api, s.sdt, t.org_code, s.app); the.append(nut);
    khach.append(the);
  }
  const nv = document.querySelector('#nhan-vien');
  for (const t of taiKhoan.filter((x) => x.staff_roles)) {
    const the = el('div', 'the');
    the.append(el('h3', null, t.display_name), el('div', 'nho', `${t.org_name ?? t.org_code} · ${t.phone}`));
    for (const r of t.staff_roles.split(',')) the.append(el('div', null, QUYEN_VAN_HANH[r] ?? r));
    nv.append(the);
  }
  trangThai.textContent = `${so.length} nhân vật khách hàng · ${taiKhoan.filter((x) => x.staff_roles).length} nhân viên.`;
} catch (e) { trangThai.textContent = 'Không đọc được dữ liệu thử: ' + e.message; trangThai.setAttribute('role', 'alert'); }
