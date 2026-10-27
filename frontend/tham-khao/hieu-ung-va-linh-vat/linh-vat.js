/* Linh vật trâu C01 điều khiển trực tiếp trong trình duyệt.
   Dựng từ bộ lớp tách từ ảnh gốc (3 thân, 6 đầu), không dùng clip lặp: mỗi động tác là một hàm theo thời gian
   cộng với lớp nền luôn chạy (thở, chớp mắt, nhìn theo người dùng). Đổi bức vẽ bằng ẩn/hiện ảnh đã nạp sẵn,
   kèm một cú nhún nhỏ để che chỗ cắt. Khớp cổ ở (47,85%, 64,35%) của khung; đầu nghiêng tối đa 4,5°.

   const tv = new LinhVat(el, { goc: 'lop/', co: 160 });
   tv.lam('chao');                 // động tác một lần: chao, gat, mung, giatminh, lodau  (trả Promise khi xong)
   tv.lam('nghe');                 // trạng thái kéo dài: cho, nghe, nghi, doc, binhtinh, chi
   tv.mucAm(0.6);                  // âm lượng 0–1 khi đang nghe
   tv.nhinVe(x, y) / tv.nhinVe()   // nhìn về điểm trên trang (tọa độ client) / thôi nhìn
*/
(function () {
  const THAN = ['tay-xuoi', 'vay-len', 'vay-vao'];
  const DAU = ['neutral', 'blink', 'happy', 'thinking', 'attention', 'listening'];
  const TAU = Math.PI * 2, cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), seg = (p, a, b) => cl((p - a) / (b - a));
  const lerp = (a, b, u) => a + (b - a) * u, io = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const oo = x => 1 - Math.pow(1 - x, 3), ob = x => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);
  const MOT_LAN = { chao: 1.9, gat: .95, mung: 1.6, giatminh: 1.1, lodau: 3.4 };

  /* Mỗi động tác trả về phần cộng thêm cho khung hiện tại.
     than/dau: bức vẽ; by: dịch cả người (% khung); sx, sy: co giãn quanh chân; hr: nghiêng đầu (độ); hx, hy: dịch đầu (% khung);
     len: độ trồi khi ló đầu (0 = khuất hẳn, 1 = hiện đủ); tho: hệ số thở; chop: cho phép chớp mắt; nhin: mức theo dõi người dùng. */
  const DONG_TAC = {
    cho: (d) => ({ dau: 'neutral' }),
    chao: (d) => {
      const vay = d > .2 && d < 1.55, nhip = Math.floor((d - .2) / .2);
      return { dau: d < .12 ? 'neutral' : 'happy', than: vay ? (nhip % 2 ? 'vay-vao' : 'vay-len') : 'tay-xuoi',
        sy: d < .2 ? -.03 * Math.sin(seg(d, 0, .2) * Math.PI) : 0, hr: vay ? 2.2 * Math.sin((d - .2) / .4 * TAU) : 0, hy: d < .2 ? .6 * Math.sin(seg(d, 0, .2) * Math.PI) : 0, chop: false };
    },
    gat: (d) => {
      /* nhổm lên lấy đà, cúi xuống, nảy về; nhắm mắt đúng lúc cúi sâu nhất */
      const len = -.9 * Math.sin(seg(d, 0, .12) * Math.PI), cui = 2.6 * Math.sin(seg(d, .1, .42) * Math.PI), nay = -.5 * Math.sin(seg(d, .42, .7) * Math.PI);
      return { dau: d > .2 && d < .32 ? 'blink' : 'neutral', hy: len + cui + nay, hr: .7 * cui, chop: false };
    },
    mung: (d) => {
      /* nhún, bật lên, giơ tay ở đỉnh, tiếp đất có nén, nhảy nhỏ lần hai */
      const nen1 = seg(d, 0, .18), bay = seg(d, .18, .62), dat = seg(d, .62, .8), bay2 = seg(d, .86, 1.12), dat2 = seg(d, 1.12, 1.28);
      let by = 0, sy = 0;
      /* thân chỉ là nửa người: nhấc tối đa 4% (mép áo ở 95,7% khung), sức bật dồn vào độ giãn thân và đầu */
      let hy = 0;
      if (d < .18) sy = -.07 * Math.sin(nen1 * Math.PI / 2);
      else if (d < .62) { const u = Math.sin(bay * Math.PI); by = -4 * u; sy = .08 * u; hy = -2.6 * u; }
      else if (d < .8) sy = -.08 * Math.sin(dat * Math.PI);
      else if (d < 1.12) { if (d > .86) { const u = Math.sin(bay2 * Math.PI); by = -2.5 * u; sy = .04 * u; hy = -1.2 * u; } }
      else sy = -.03 * Math.sin(dat2 * Math.PI);
      return { dau: 'happy', than: d > .3 && d < .66 ? 'vay-len' : 'tay-xuoi', by, sy, sx: -sy * .6, hy, chop: false };
    },
    giatminh: (d) => {
      const nay = seg(d, .05, .3);
      return { dau: d < .85 ? 'attention' : 'neutral', by: -3.5 * Math.sin(nay * Math.PI), sy: d < .05 ? -.03 : .03 * Math.sin(nay * Math.PI), hr: -1.5 * Math.sin(seg(d, .3, .8) * Math.PI), chop: false };
    },
    lodau: (d) => {
      /* trồi lên từ mép dưới, nhìn trái, nhìn phải, chớp, rồi lặn xuống */
      const len = d < .55 ? Math.min(1.04, ob(seg(d, 0, .55))) : d < 2.7 ? 1 : 1 - io(seg(d, 2.7, 3.3));
      const hr = d < 1 ? 0 : d < 1.5 ? -3.2 * io(seg(d, 1, 1.25)) : d < 2.2 ? lerp(-3.2, 3.2, io(seg(d, 1.5, 1.8))) : 3.2 * (1 - io(seg(d, 2.2, 2.5)));
      return { dau: d > 2.0 && d < 2.12 ? 'blink' : (d < 1 ? 'attention' : 'neutral'), len, hr, chop: false, nhin: 0 };
    },
    nghe: (d, tv) => {
      /* nghiêng đầu lắng nghe; gật nhẹ theo âm lượng thật */
      const vao = io(seg(d, 0, .35)), am = tv._am;
      return { dau: 'listening', hr: 3.4 * vao + am * .8 * Math.sin(d * 11), hy: am * 1.6 * Math.abs(Math.sin(d * 6.5)), sy: am * .01 * Math.sin(d * 13) };
    },
    nghi: (d) => ({ dau: 'thinking', hr: 2.6 * Math.sin(d * 1.25), hy: .5 * Math.sin(d * .7), by: .4 * Math.sin(d * .62), nghi: true, chop: false }),
    doc: (d) => {
      /* đọc từng dòng: đầu cúi, lia từ trái sang phải, quay về đầu dòng với một cái gật nhỏ */
      const k = (d % 1.3) / 1.3, ve = k > .86;
      return { dau: 'neutral', hy: 1.7 + (ve ? .7 * Math.sin(seg(k, .86, 1) * Math.PI) : 0), hr: ve ? lerp(2.4, -2.4, io(seg(k, .86, 1))) : lerp(-2.4, 2.4, k / .86), chop: false, nhin: .2 };
    },
    binhtinh: (d) => ({ dau: d < .7 ? 'attention' : 'neutral', tho: 2.6, hr: 1.4 * Math.sin(d * .9), hy: .8 * Math.sin(d * TAU / 4.6), nhin: .4 }),
    chi: (d) => {
      const bom = (d % 1.6) > 1.35;
      return { dau: d < .5 ? 'attention' : 'neutral', than: bom ? 'vay-len' : 'vay-vao', hr: 3 * io(seg(d, 0, .4)), hx: .8 * io(seg(d, 0, .4)), nhin: 0 };
    },
  };

  class LinhVat {
    constructor(el, { goc = 'lop/', co = 160 } = {}) {
      this.el = el; el.classList.add('lv'); el.style.setProperty('--lv-co', co + 'px');
      el.innerHTML = `<div class="lv-khung"><div class="lv-than">${THAN.map(n => `<img src="${goc}than-${n}.png" data-n="${n}" alt="" draggable="false">`).join('')}`
        + `<div class="lv-dau">${DAU.map(n => `<img src="${goc}dau-${n}.png" data-n="${n}" alt="" draggable="false">`).join('')}</div></div></div><div class="lv-nghi"><i></i><i></i><i></i></div>`;
      el.setAttribute('role', 'img'); if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Trâu AgiViet');
      this.khung = el.querySelector('.lv-khung'); this.than = el.querySelector('.lv-than'); this.dau = el.querySelector('.lv-dau'); this.bong = el.querySelector('.lv-nghi');
      this.anhThan = Object.fromEntries([...this.than.querySelectorAll(':scope > img')].map(i => [i.dataset.n, i]));
      this.anhDau = Object.fromEntries([...this.dau.querySelectorAll('img')].map(i => [i.dataset.n, i]));
      this.hd = { ten: 'cho', t0: 0 }; this.nen = 'cho';
      this._am = 0; this._amDich = 0; this.dich = null;
      this.lx = { x: 0, v: 0 }; this.ly = { x: 0, v: 0 };
      this.chopLuc = 2 + Math.random() * 2; this.truoc = { than: '', dau: '' }; this.doiLuc = -9;
      this.giam = matchMedia('(prefers-reduced-motion: reduce)');
      this._xong = null; this._chay = true;
      this._t = performance.now() / 1000;
      const vong = now => { if (!this._chay) return; this._buoc(now / 1000); requestAnimationFrame(vong); };
      requestAnimationFrame(vong);
    }
    lam(ten, { sau } = {}) {
      if (!DONG_TAC[ten]) throw new Error('Chưa có động tác ' + ten);
      const t = performance.now() / 1000;
      if (this._xong) { this._xong(); this._xong = null; }
      this.hd = { ten, t0: t };
      if (!(ten in MOT_LAN)) { this.nen = ten; return Promise.resolve(); }
      this.sau = sau || this.nen;
      return new Promise(r => { this._xong = r; });
    }
    mucAm(v) { this._amDich = cl(v); }
    nhinVe(x, y) { this.dich = x == null ? null : { x, y }; }
    dung() { this._chay = false; }

    _loxo(s, dich, dt, k = 10, z = .8) { const a = k * k * (dich - s.x) - 2 * z * k * s.v; s.v += a * dt; s.x += s.v * dt; return s.x; }
    _buoc(t) {
      const dt = Math.min(.05, t - this._t); this._t = t;
      const giam = this.giam.matches;
      let d = t - this.hd.t0;
      const mot = MOT_LAN[this.hd.ten];
      if (mot && d >= mot) { const xong = this._xong; this._xong = null; this.hd = { ten: this.sau || 'cho', t0: t }; d = 0; xong && xong(); }
      this._am += (this._amDich - this._am) * Math.min(1, dt * 12);
      const f = Object.assign({ than: 'tay-xuoi', dau: 'neutral', by: 0, sx: 0, sy: 0, hr: 0, hx: 0, hy: 0, len: 1, tho: 1, chop: true, nhin: 1, nghi: false }, DONG_TAC[this.hd.ten](giam ? 99 : d, this));
      if (giam) Object.assign(f, { by: 0, sx: 0, sy: 0, hr: 0, hx: 0, hy: 0, len: 1 });

      /* nhìn theo người dùng: đầu nghiêng và dịch nhẹ về phía điểm nhìn, lò xo tới hạn để không giật */
      let nx = 0, ny = 0;
      if (this.dich && !giam) {
        const r = this.dau.getBoundingClientRect(), cx = r.left + r.width * .48, cy = r.top + r.height * .45;
        nx = cl((this.dich.x - cx) / (r.width * 2.2), -1, 1); ny = cl((this.dich.y - cy) / (r.height * 2.2), -1, 1);
      }
      const lx = this._loxo(this.lx, nx * f.nhin, dt), ly = this._loxo(this.ly, ny * f.nhin, dt);

      /* chớp mắt ngẫu nhiên khi đang ở mặt thường */
      if (f.chop && f.dau === 'neutral' && t > this.chopLuc) { f.dau = 'blink'; if (t > this.chopLuc + .12) this.chopLuc = t + 2.2 + Math.random() * 2.8; }

      /* đổi bức vẽ: ẩn/hiện ảnh nạp sẵn + nhún che chỗ cắt (chớp mắt không cần nhún) */
      if (f.than !== this.truoc.than || (f.dau !== this.truoc.dau && f.dau !== 'blink' && this.truoc.dau !== 'blink')) this.doiLuc = t;
      if (f.than !== this.truoc.than) for (const [n, im] of Object.entries(this.anhThan)) im.style.visibility = n === f.than ? 'visible' : 'hidden';
      if (f.dau !== this.truoc.dau) for (const [n, im] of Object.entries(this.anhDau)) im.style.visibility = n === f.dau ? 'visible' : 'hidden';
      this.truoc = { than: f.than, dau: f.dau };
      const nh = giam ? 0 : .028 * Math.exp(-(t - this.doiLuc) * 14) * Math.cos((t - this.doiLuc) * 18);

      const tho = giam ? 0 : .007 * f.tho * Math.sin(t * TAU / (2.9 * Math.max(1, f.tho * .7)));
      const sy = 1 + f.sy - nh + tho, sx = 1 + f.sx + nh * .5 - tho * .4;
      const hr = cl(f.hr + lx * 3.4, -4.5, 4.5), hx = f.hx + lx * 1.1, hy = cl(f.hy + ly * 1.2 + nh * 25, -3, 3);
      this.khung.style.transform = `translateY(${Math.max(-4.2, f.by + (1 - f.len) * 92)}%)`;   /* không để lộ mép cắt dưới áo */
      this.than.style.transform = `scale(${sx}, ${sy})`;
      this.dau.style.transform = `translate(${hx}%, ${hy}%) rotate(${hr}deg)`;
      this.bong.classList.toggle('bat', f.nghi && !giam);
    }
  }
  window.LinhVat = LinhVat;
  window.LinhVat.DONG_TAC = Object.keys(DONG_TAC);
})();
