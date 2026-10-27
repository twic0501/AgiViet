// Chỉ đổi nhãn trình bày; giữ nguyên dữ liệu và mã nghiệp vụ gửi API.
export const virtualBankName = 'Ngân hàng ảo AgiViet';
export const isTrial = c => c.health?.moi_truong === 'thu';
export const bankName = (c, name) => isTrial(c) ? virtualBankName : name;
export const accountName = (c, account) => isTrial(c) ? `ẢO · ${account || 'Chưa có'}` : account;
export const paymentQr = (c, ref, original) => isTrial(c)
  ? `AGIVIET-TEST-ONLY | Ngân hàng ảo AgiViet | KHONG CHUYEN TIEN THAT | ${ref || 'THU'}`
  : original;
// App bán trông như app thật: người sáng lập yêu cầu bỏ dòng này ở app bán (27/10/2026).
export const virtualMoneyNotice = c => isTrial(c) && c.app !== 'ban'
  ? '<p class="caption virtual-money-notice" style="display:block!important" role="note">Tiền ảo để xem quy trình, không chuyển tiền thật</p>' : '';
