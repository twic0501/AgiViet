// <agv-trau> — nhân vật trâu C01 làm điểm nhấn (người sáng lập chốt 29/10/2026: bám mẫu gốc C01, chuyển động kiểu Duolingo).
// Bản 1 dùng 16 ảnh tư thế C01 có sẵn (assets/trau/c01/*.webp): thở, chớp mắt, nghiêng theo ngón tay, chạm thì nhún + vui,
// vẫy chào, đổi dáng theo trạng thái nghiệp vụ. Khi có lớp tách (đầu/mắt/tay…) sẽ thêm chế độ lớp, giữ nguyên API thẻ.
// Quy tắc: trâu không che số tiền/nút; không tự diễn "tiền đã về" — trang chỉ đặt trang-thai="mung" khi backend xác nhận.
// Thuộc tính: trang-thai (xem DANG_THEO_TRANG_THAI), co (px, mặc định 160), tinh (có = không chuyển động).
const GOC = new URL('../assets/trau/c01/', import.meta.url).href;
const ANH = ['angle-left', 'angle-right', 'attention', 'ban-goc', 'blink', 'chinh-dien', 'happy', 'ledger', 'listening', 'neutral', 'point', 'profile', 'thinking', 'wave-in', 'wave-out', 'wave-up'];
const MAT_TRUOC = new Set(['chinh-dien', 'neutral', 'ban-goc']); // dáng nhìn thẳng: chớp mắt bằng ảnh blink
export const DANG_THEO_TRANG_THAI = {
  nghi: 'chinh-dien', chao: 'wave', 'doc-hop-dong': 'ledger', 'nhap-ma': 'listening', 'cho': 'thinking',
  'cho-coc': 'thinking', 'cho-ngan-hang': 'thinking', 'dang-kiem': 'listening', 'thieu-tien': 'attention',
  'chi-dan': 'point', 'loi': 'attention', 'mung': 'happy',
};
const giamChuyenDong = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

class AgvTrau extends HTMLElement {
  static observedAttributes = ['trang-thai', 'co'];
  #anh = []; #hien = 0; #dang = 'chinh-dien'; #raf = 0; #nghiengMuc = 0; #nghiengDich = 0; #ban = false; #hen = 0;

  connectedCallback() {
    const co = Number(this.getAttribute('co') || 160);
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host{display:inline-block;position:relative;width:${co}px;height:${co}px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .khung{position:relative;width:100%;height:100%;transform-origin:50% 100%;will-change:transform}
      img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .16s ease;user-select:none;-webkit-user-drag:none}
      .bong{position:absolute;left:22%;right:22%;bottom:1%;height:5%;border-radius:50%;background:rgba(35,60,49,.16);transform-origin:50% 50%}
    </style><div class="bong"></div><div class="khung"><img alt=""><img alt="" style="opacity:0"></div>`;
    this.#anh = [...this.shadowRoot.querySelectorAll('img')];
    this.khung = this.shadowRoot.querySelector('.khung'); this.bong = this.shadowRoot.querySelector('.bong');
    this.setAttribute('role', 'img'); if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Trâu AgiViet');
    for (const n of ANH) { const i = new Image(); i.src = GOC + n + '.webp'; } // tải trước để đổi dáng không nháy
    this.#datDang(this.#dangCho(this.getAttribute('trang-thai')), true);
    if (this.hasAttribute('tinh') || giamChuyenDong()) return;
    this.addEventListener('pointerdown', () => this.chamVao());
    this.#theoTay = (e) => this.#nhinTheo(e);
    window.addEventListener('pointermove', this.#theoTay, { passive: true });
    this.#lap(); this.#henChop();
  }
  disconnectedCallback() { cancelAnimationFrame(this.#raf); clearTimeout(this.#hen); window.removeEventListener('pointermove', this.#theoTay); }
  attributeChangedCallback(ten, _cu, moi) {
    if (ten === 'trang-thai' && this.#anh.length) this.doiTrangThai(moi);
  }
  #theoTay = null;

  #dangCho(tt) { return DANG_THEO_TRANG_THAI[tt || 'nghi'] ?? 'chinh-dien'; }
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
    if (d === 'wave') return this.vayChao();
    this.#datDang(d);
    if (tt === 'mung' && !giamChuyenDong()) this.#nhun(1.25);
  }
  async vayChao(lan = 2) {
    if (this.#ban) return; this.#ban = true;
    for (let i = 0; i < lan; i++) for (const k of ['wave-in', 'wave-up', 'wave-out', 'wave-up']) { this.#datDang(k); await ngu(170); }
    this.#datDang('chinh-dien'); this.#ban = false;
  }
  async chamVao() {
    if (this.#ban) return; this.#ban = true;
    const cu = this.#dang; this.#datDang('happy'); await this.#nhun(1);
    await ngu(650); this.#datDang(cu); this.#ban = false;
  }
  /** Nhún kiểu "squash & stretch": nén xuống, bật lên, rơi về; bóng co giãn theo. */
  #nhun(muc = 1) {
    const k = [
      { transform: 'scale(1,1)' }, { transform: `scale(${1 + .08 * muc},${1 - .1 * muc})`, offset: .18 },
      { transform: `translateY(${-14 * muc}px) scale(${1 - .05 * muc},${1 + .07 * muc})`, offset: .5 },
      { transform: `scale(${1 + .04 * muc},${1 - .04 * muc})`, offset: .82 }, { transform: 'scale(1,1)' },
    ];
    this.bong.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .18 }, { transform: 'scale(.75)', offset: .5 }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out' });
    return this.khung.animate(k, { duration: 520, easing: 'cubic-bezier(.3,.7,.4,1)', composite: 'add' }).finished;
  }
  #henChop() {
    this.#hen = setTimeout(async () => {
      if (!this.#ban && MAT_TRUOC.has(this.#dang)) { const cu = this.#dang; this.#datDang('blink'); await ngu(110); if (this.#dang === 'blink') this.#datDang(cu); }
      this.#henChop();
    }, 2800 + Math.random() * 3200);
  }
  #nhinTheo(e) {
    const r = this.getBoundingClientRect(); const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(innerWidth / 2, 1);
    this.#nghiengDich = Math.max(-1, Math.min(1, dx));
    if (this.#ban || !['chinh-dien', 'angle-left', 'angle-right', 'neutral'].includes(this.#dang)) return;
    this.#datDang(dx < -0.55 ? 'angle-left' : dx > 0.55 ? 'angle-right' : 'chinh-dien');
  }
  /** Vòng hình: thở (giãn dọc rất nhẹ từ chân) + nghiêng mượt về phía ngón tay. */
  #lap = () => {
    const t = performance.now() / 1000;
    this.#nghiengMuc += (this.#nghiengDich - this.#nghiengMuc) * 0.08;
    const tho = Math.sin(t * 2.1) * 0.012;
    this.khung.style.transform = `rotate(${this.#nghiengMuc * 3.5}deg) scale(${1 - tho / 3},${1 + tho})`;
    this.#raf = requestAnimationFrame(this.#lap);
  };
}
if (!customElements.get('agv-trau')) customElements.define('agv-trau', AgvTrau);
