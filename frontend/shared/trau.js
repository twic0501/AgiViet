// <agv-trau> — nhân vật trâu C01 làm điểm nhấn (người sáng lập chốt 29/10/2026: bám mẫu gốc C01, TOÀN THÂN, chuyển động kiểu Duolingo).
// Bộ 10 dáng toàn thân (assets/trau/toan/*.webp, cùng khung, chân cùng đường đất) tạo từ ban-goc.png C01 qua Higgsfield;
// mặt đúng mẫu: mắt chấm đen, mõm chỉ hai lỗ mũi, KHÔNG miệng.
// Chuyển động: thở, nghiêng theo ngón tay, chạm thì nhún + mừng, vẫy chào, bước đi nhún nhịp (đi/gánh), đổi dáng theo trạng thái.
// Quy tắc: trâu không che số tiền/nút; không tự diễn "tiền đã về" — trang chỉ đặt trang-thai="mung"/"tien-ve" khi backend xác nhận.
// Thuộc tính: trang-thai (xem DANG_THEO_TRANG_THAI), co (px, mặc định 160), tinh (có = không chuyển động).
const GOC = new URL('../assets/trau/toan/', import.meta.url).href;
const ANH = ['dung', 'chao', 'di', 'mung', 'doc-so', 'cho', 'chi', 'xin-loi', 'dem-tien', 'ganh'];
const DI_BO = new Set(['di', 'ganh']); // dáng đang bước: nhún theo nhịp chân
export const DANG_THEO_TRANG_THAI = {
  nghi: 'dung', chao: 'vay', 'doc-hop-dong': 'doc-so', 'nhap-ma': 'dem-tien', cho: 'cho', 'cho-coc': 'cho',
  'cho-ngan-hang': 'cho', 'dang-kiem': 'doc-so', 'dang-giao': 'ganh', 'thieu-tien': 'xin-loi', 'chi-dan': 'chi',
  loi: 'xin-loi', 'tien-ve': 'dem-tien', mung: 'mung', di: 'di',
};
const giamChuyenDong = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

class AgvTrau extends HTMLElement {
  static observedAttributes = ['trang-thai'];
  #anh = []; #hien = 0; #dang = 'dung'; #raf = 0; #nghiengMuc = 0; #nghiengDich = 0; #ban = false; #theoTay = null;

  connectedCallback() {
    const co = Number(this.getAttribute('co') || 160);
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host{display:inline-block;position:relative;width:${co}px;height:${co}px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .khung{position:relative;width:100%;height:100%;transform-origin:50% 100%;will-change:transform}
      img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .14s ease;user-select:none;-webkit-user-drag:none}
      .bong{position:absolute;left:24%;right:24%;bottom:2%;height:5%;border-radius:50%;background:rgba(35,60,49,.16)}
    </style><div class="bong"></div><div class="khung"><img alt=""><img alt="" style="opacity:0"></div>`;
    this.#anh = [...this.shadowRoot.querySelectorAll('img')];
    this.khung = this.shadowRoot.querySelector('.khung'); this.bong = this.shadowRoot.querySelector('.bong');
    this.setAttribute('role', 'img'); if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Trâu AgiViet');
    for (const n of ANH) { const i = new Image(); i.src = GOC + n + '.webp'; } // tải trước để đổi dáng không nháy
    const d = this.#dangCho(this.getAttribute('trang-thai'));
    this.#datDang(d === 'vay' ? 'chao' : d, true);
    if (this.hasAttribute('tinh') || giamChuyenDong()) return;
    this.addEventListener('pointerdown', () => this.chamVao());
    this.#theoTay = (e) => this.#nhinTheo(e);
    window.addEventListener('pointermove', this.#theoTay, { passive: true });
    this.#lap();
    if (d === 'vay') this.vayChao();
  }
  disconnectedCallback() { cancelAnimationFrame(this.#raf); if (this.#theoTay) window.removeEventListener('pointermove', this.#theoTay); }
  attributeChangedCallback(_ten, _cu, moi) { if (this.#anh.length) this.doiTrangThai(moi); }

  #dangCho(tt) { return DANG_THEO_TRANG_THAI[tt || 'nghi'] ?? 'dung'; }
  /** Đổi ảnh bằng hòa chéo giữa hai lớp ảnh (không nháy trắng). */
  #datDang(ten, ngay = false) {
    if (ten === this.#dang && !ngay) return;
    this.#dang = ten;
    const moi = this.#anh[1 - this.#hien], cu = this.#anh[this.#hien];
    moi.src = GOC + ten + '.webp';
    if (ngay) { cu.src = moi.src; return; }
    moi.style.opacity = '1'; cu.style.opacity = '0'; this.#hien = 1 - this.#hien;
  }
  async doiTrangThai(tt) {
    const d = this.#dangCho(tt);
    if (d === 'vay') return this.vayChao();
    this.#datDang(d);
    if (d === 'mung' && !giamChuyenDong()) this.#nhun(1.3);
  }
  /** Vẫy chào: đổi qua lại dáng đứng/chào ba nhịp, kèm lắc người nhẹ. */
  async vayChao(lan = 3) {
    if (this.#ban) return; this.#ban = true;
    for (let i = 0; i < lan; i++) { this.#datDang('chao'); await ngu(260); this.#datDang('dung'); await ngu(160); }
    this.#datDang('chao'); this.#ban = false;
  }
  async chamVao() {
    if (this.#ban) return; this.#ban = true;
    const cu = this.#dang; this.#datDang('mung'); await this.#nhun(1);
    await ngu(600); this.#datDang(cu); this.#ban = false;
  }
  /** Nhún kiểu "squash & stretch": nén xuống, bật lên, rơi về; bóng co giãn theo. */
  #nhun(muc = 1) {
    const k = [
      { transform: 'scale(1,1)' }, { transform: `scale(${1 + .08 * muc},${1 - .1 * muc})`, offset: .18 },
      { transform: `translateY(${-16 * muc}px) scale(${1 - .05 * muc},${1 + .07 * muc})`, offset: .5 },
      { transform: `scale(${1 + .04 * muc},${1 - .04 * muc})`, offset: .82 }, { transform: 'scale(1,1)' },
    ];
    this.bong.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .18 }, { transform: 'scale(.72)', offset: .5 }, { transform: 'scale(1)' }], { duration: 540, easing: 'ease-out' });
    return this.khung.animate(k, { duration: 540, easing: 'cubic-bezier(.3,.7,.4,1)', composite: 'add' }).finished;
  }
  #nhinTheo(e) {
    const r = this.getBoundingClientRect();
    this.#nghiengDich = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / Math.max(innerWidth / 2, 1)));
  }
  /** Vòng hình: thở (giãn dọc rất nhẹ từ chân) + nghiêng mượt về phía ngón tay; khi đi/gánh thì nhún theo nhịp bước. */
  #lap = () => {
    const t = performance.now() / 1000;
    this.#nghiengMuc += (this.#nghiengDich - this.#nghiengMuc) * 0.08;
    let y = 0, quay = this.#nghiengMuc * 3, tho = Math.sin(t * 2.1) * 0.012;
    if (DI_BO.has(this.#dang)) { y = -Math.abs(Math.sin(t * 6)) * 5; quay += Math.sin(t * 6) * 1.6; tho = 0; }
    this.khung.style.transform = `translateY(${y}px) rotate(${quay}deg) scale(${1 - tho / 3},${1 + tho})`;
    this.#raf = requestAnimationFrame(this.#lap);
  };
}
if (!customElements.get('agv-trau')) customElements.define('agv-trau', AgvTrau);
