// Client HTTP có giữ phiên, dùng cho dữ liệu mẫu và kiểm thử.
export class Phien {
  constructor(base, phone, ten = phone) { this.base = base; this.phone = phone; this.ten = ten; this.cookie = ''; this.me = null; }
  async goi(method, duong, body, headers = {}) {
    const r = await fetch(this.base + duong, { method, headers: { 'content-type': 'application/json', cookie: this.cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie');
    if (sc) this.cookie = sc.split(';')[0];
    const j = await r.json();
    j.__http = r.status;
    // Phiên hết hạn (30 ngày) trong kịch bản dài: đăng nhập lại rồi gọi lại một lần
    if (r.status === 401 && this.me && !duong.startsWith('/api/auth')) { await this.dangNhap(); return this.goi(method, duong, body, headers); }
    return j;
  }
  // Gọi và ném lỗi nếu hỏng (dùng trong dữ liệu mẫu)
  async lam(method, duong, body, headers) {
    const j = await this.goi(method, duong, body, headers);
    if (!j.ok) throw new Error(`${this.ten} ${method} ${duong} → ${j.ma}: ${j.loi}`);
    return j;
  }
  async dangNhap(dangKy = {}) {
    await this.lam('POST', '/api/auth/otp', { phone: this.phone });
    const j = await this.lam('POST', '/api/auth/verify', { phone: this.phone, code: '123456', ...dangKy });
    this.me = j;
    return j;
  }
  get org() { return this.me.org; }
}
