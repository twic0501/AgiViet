import { escapeHtml as e } from './format.js';

// Số ảo từ seed và hướng dẫn backend; không phụ thuộc API công cụ thử.
export const samplePhones = {
  ban: [['0918000421', 'Nguyễn Thị Năm'], ['0907000300', 'Lê Văn Hòa'], ['0939000140', 'Võ Thị Lan']],
  mua: [['0909000210', 'Trần Thu Hà · mua hàng'], ['0909000211', 'Lê Thị Lan · kế toán'], ['0909000213', 'Nguyễn Đức Thịnh · quản lý']],
  'quan-tri': [['0901000001', 'Ngô Thị Vy · điều phối'], ['0901000002', 'Trần Văn Khoa · xác minh'], ['0901000005', 'Đỗ Minh Trí · tài chính'], ['0901000006', 'Phạm Quốc Bảo · rủi ro'], ['0901000008', 'Nguyễn Hữu Tâm · giám sát']],
};
export function phoneSuggestions(app, health, coCongCu) {
  if (health?.moi_truong !== 'thu' || coCongCu === false) return '';
  return `<div class="phone-suggestions"><p class="caption">Chọn số ảo để thử</p><div class="sample-phones">${samplePhones[app].map(([phone, name]) => `<button type="button" class="secondary" data-phone="${phone}"><span>${e(name)}<small>${phone}</small></span></button>`).join('')}</div><p class="caption">OTP thử: 123456</p></div>`;
}

// Ingress công khai trả false, cổng laptop mới được phép thăm dò test API.
// Mọi lỗi thăm dò đều được cô lập khỏi đăng nhập và các màn nghiệp vụ.
export async function discoverTestTools(api, health) {
  if (health?.moi_truong !== 'thu') return [];
  try {
    const capability = await api.get('/frontend-capabilities.json');
    if (capability.test_tools !== true) return [];
    const accounts = await api.get('/v1/test/accounts');
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}
