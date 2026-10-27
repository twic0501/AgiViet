/* Linh vật trâu C01 bản hình nguyên con, cử động bằng biến dạng lưới (kiểu Live2D) — không cắt, không ghép bộ phận.
   Mỗi tư thế là một hình vẽ hoàn chỉnh (800×800, đáy móng ở y=752). Hình được phủ lưới 48×48 và vẽ bằng WebGL; các "xương mềm"
   kéo lưới: đầu xoay quanh cổ (ảnh hưởng giảm dần qua vùng khăn), tay xoay quanh vai theo một dải mềm từ vai tới bàn tay,
   thân đung đưa quanh chân, thở co giãn theo chiều cao. Vùng chuyển tiếp uốn liền như cao su nên không có đường cắt.
   Biên độ giữ nhỏ (đầu ≤ 6°, tay ≤ 16°) để nét không bị kéo méo.

   const tv = new LinhVatNguyen(el, { goc: 'xuat/', co: 220 });
   tv.dat('nghe') · tv.lam('chao') / tv.lam('mung') (Promise) · tv.nhinVe(x, y) / tv.nhinVe() */
(function () {
  const N = 48, S = 800, DAT = 752;
  const TEP = { dung: '01-dung', chop: '02-chop', chao: '03-chao', nghe: '04-nghe', nghi: '05-nghi', vui: '06-vui', lo: '07-lo', chi: '08-chi', be: '09-be', 'dien-thoai': '10-dien-thoai', mung: '11-mung', 'ghi-so': '12-ghi-so' };
  const TAU = Math.PI * 2, sin = Math.sin, abs = Math.abs, cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const em = x => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
  /* Khung xương từng tư thế (tọa độ trên hình 800×800):
     co: [x, y] điểm xoay đầu (giữa cổ, ngay dưới cằm); tay: [{ vai, ban, r }] dải mềm từ vai tới bàn tay, r = bề rộng ảnh hưởng.
     ve(t, s): trả góc / dịch theo thời gian t (giây) — dau (độ), gat (px), tay [độ...], than (độ), nay (px), tho (hệ số). */
  const TT = {
    dung: { co: [400, 452], tay: [], ve: t => ({ dau: 2.6 * sin(TAU * t / 3.7 + .5), than: 1 * sin(TAU * t / 4.3), tho: .012 }) },
    chao: { co: [404, 440], tay: [{ vai: [292, 492], ban: [196, 398], r: 62 }], ve: t => ({ dau: 3.2 * sin(TAU * t * .82), tay: [8 * sin(TAU * t * 1.65)], than: 1.4 * sin(TAU * t * .82 + 1), tho: .01 }) },
    nghe: { co: [410, 440], tay: [{ vai: [300, 492], ban: [228, 392], r: 58, theoDau: 1 }], ve: t => ({ dau: 3.5 + 1.6 * sin(TAU * t / 2.6), gat: 4 * abs(sin(TAU * t * .9)), tay: [0], than: .8 * sin(TAU * t / 3.4), tho: .01 }) },
    nghi: { co: [400, 448], tay: [{ vai: [450, 575], ban: [462, 462], r: 56, theoDau: 1 }], ve: t => ({ dau: -2 + 2.8 * sin(TAU * t / 4.2), tay: [0], than: 1.2 * sin(TAU * t / 5), tho: .014 }) },
    vui: { co: [400, 452], tay: [{ vai: [310, 515], ban: [182, 440], r: 60 }, { vai: [530, 515], ban: [606, 448], r: 60, nguoc: 1 }], ve: t => ({ dau: 3 * sin(TAU * t * 1.1), tay: [-6 * sin(TAU * t * 1.4), 6 * sin(TAU * t * 1.4)], nay: -9 * abs(sin(Math.PI * t / .5)), tho: .01 }) },
    lo: { co: [400, 452], tay: [], ve: t => ({ dau: 1.6 * sin(TAU * t / 4.8), than: .8 * sin(TAU * t / 5.2), tho: .022 * (1 + .3 * sin(TAU * t / 9)) }) },
    chi: { co: [395, 430], tay: [{ vai: [439, 505], ban: [620, 420], r: 52 }], ve: t => { const n = Math.max(0, sin(TAU * t * .9)); return { dau: 2 * sin(TAU * t * .9 + .6), tay: [-4 * n], gat: 3 * n, than: -1 * n, tho: .01 }; } },
    be: { co: [400, 440], tay: [{ vai: [400, 560], ban: [454, 495], r: 120, nhe: .5 }], ve: t => ({ dau: 2.4 * sin(TAU * t / 2.4), tay: [1.8 * sin(TAU * t / 1.2)], than: 1.6 * sin(TAU * t / 2.4 + 1.2), nay: -3 * abs(sin(TAU * t / 2.4)), tho: .01 }) },
    'dien-thoai': { co: [400, 452], tay: [{ vai: [400, 600], ban: [399, 480], r: 70 }], ve: t => { const g = Math.max(0, sin(TAU * t / 2.2)); return { dau: 1.5 * sin(TAU * t / 3.1), gat: 5 * g * g, tay: [1.6 * sin(TAU * t / 1.6)], than: .8 * sin(TAU * t / 3.6), tho: .01 }; } },
    mung: { co: [400, 440], tay: [{ vai: [305, 474], ban: [179, 379], r: 60 }, { vai: [502, 474], ban: [628, 379], r: 60, nguoc: 1 }], ve: t => ({ dau: 3.5 * sin(TAU * t * 1.2), tay: [-7 * sin(TAU * t * 2), 7 * sin(TAU * t * 2)], nhay: 1, tho: 0 }) },
    'ghi-so': { co: [390, 440], tay: [{ vai: [330, 560], ban: [380, 466], r: 46 }], ve: t => { const dong = (t % 1.6) / 1.6, ve = dong > .85; const k = em((dong - .85) / .15), viet = ve ? 1 - em((dong - .85) / .05) : em(dong / .05); return { dau: ve ? 1.8 + 2.04 * (1 - k) : 1.8 + 2.4 * dong, tay: [viet * 3 * sin(TAU * t * 6)], than: .6 * sin(TAU * t / 3), tho: .01 }; } },
  };
  TT.chop = TT.dung;
  const MOT_LAN = { chao: 2.4, mung: 1.8 };
  const MEM = window.__MEM || [1.6, 1.4, .9];   /* [bán kính ngoài, độ rộng chuyển tiếp, đoạn dốc dọc tay] theo bề rộng tay */

  const VS = 'attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){v=uv;gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision mediump float;varying vec2 v;uniform sampler2D tx;void main(){gl_FragColor=texture2D(tx,v);}';

  class LinhVatNguyen {
    constructor(el, { goc = 'xuat/', co = 220, nen = 'dung', duoi = 'webp' } = {}) {
      this.el = el; el.classList.add('lvg'); el.innerHTML = ''; el.style.width = el.style.height = co + 'px';
      el.setAttribute('role', 'img'); if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Trâu AgiViet');
      const dpr = Math.min(2, window.devicePixelRatio || 1), cv = document.createElement('canvas');
      cv.width = cv.height = Math.round(co * dpr); Object.assign(cv.style, { width: co + 'px', height: co + 'px', display: 'block' });
      const bong = document.createElement('div'); bong.className = 'lvg-bong'; el.append(bong, cv); this.bongEl = bong;
      const gl = this.gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
      const sh = (k, s) => { const o = gl.createShader(k); gl.shaderSource(o, s); gl.compileShader(o); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      this.pr = pr;
      /* lưới: (N+1)² đỉnh, chỉ số tam giác cố định, uv cố định */
      const nv = (N + 1) * (N + 1); this.goc0 = new Float32Array(nv * 2); const uv = new Float32Array(nv * 2), id = [];
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const k = j * (N + 1) + i; this.goc0[2 * k] = i / N * S; this.goc0[2 * k + 1] = j / N * S; uv[2 * k] = i / N; uv[2 * k + 1] = j / N; }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; id.push(a, b, c, b, d, c); }
      this.nId = id.length; this.vt = new Float32Array(nv * 2);
      const buf = (data, ten, dong) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, dong ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, ten); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0); return b; };
      buf(uv, 'uv'); this.bp = buf(this.vt, 'p', true);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(id), gl.STATIC_DRAW);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.viewport(0, 0, cv.width, cv.height);
      /* nạp mọi hình làm texture (đã nhân alpha sẵn để viền mềm không lóe trắng) */
      this.tex = {}; this.san = Promise.all(Object.entries(TEP).map(([k, f]) => new Promise(ok => {
        const im = new Image(); (this._imgs || (this._imgs = {}))[k] = im; im.onload = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.tex[k] = t; ok(); };
        im.onerror = ok; im.src = (window.ANH_TRAU && window.ANH_TRAU[f]) || `${goc}${f}.${duoi}`; })));
      this.nen = nen; this.tt = nen; this.t0 = performance.now() / 1000; this.doiLuc = -9; this.vao = this.t0; this.cho = null;
      this.chopLuc = this.t0 + 2 + Math.random() * 2; this.dich = null; this.ng = 0; this.vn = 0; this.t = this.t0;
      this.giam = matchMedia('(prefers-reduced-motion: reduce)'); this._trongSo(nen);
      this.san.then(() => { const f = n => { if (this.dung_) return; this._buoc(n / 1000); requestAnimationFrame(f); }; requestAnimationFrame(f); });
    }
    dat(tt) { if (!TT[tt]) throw new Error('Chưa có tư thế ' + tt); this.nen = tt; if (!MOT_LAN[this.tt]) this._doi(tt); }
    lam(tt) { if (!TT[tt]) throw new Error('Chưa có tư thế ' + tt); if (this.cho) { this.cho(); this.cho = null; } this._doi(tt); return new Promise(r => { this.cho = r; }); }
    nhinVe(x, y) { this.dich = x == null ? null : [x, y]; }
    huy() { this.dung_ = true; }
    /* Kiểm thử: dừng vòng chạy, vẽ đúng tư thế tt ở giây d (không chớp mắt ngẫu nhiên, không xuất hiện), trả độ méo lớn nhất
       của lưới trong vùng có hình: keo = hệ số giãn lớn nhất của một tam giác (1 = không méo), lat = tam giác bị lật. */
    tua(tt, d, { chop = false } = {}) {
      this.dung_ = true; if (tt !== this.tt) { this.tt = tt; this._trongSo(tt); }
      const T = 1000; this.t = T; this.t0 = T - d; this.vao = -99; this.doiLuc = -99; this.chopLuc = chop ? 0 : 1e9; this.ng = 0; this.vn = 0;
      this._buoc(T);
      return this._meo(tt);
    }
    _meo(tt) {
      const m = this._mat || (this._mat = {});
      if (!m[tt]) {   /* mặt nạ có hình tại tâm mỗi ô lưới, lấy từ ảnh nhúng */
        const src = window.ANH_TRAU && window.ANH_TRAU[TEP[tt]]; if (!src || !this._imgs?.[tt]) return null;
        const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); x.drawImage(this._imgs[tt], 0, 0, N, N);
        const a = x.getImageData(0, 0, N, N).data; m[tt] = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) m[tt][i] = a[4 * i + 3] > 30 ? 1 : 0;
      }
      const g = this.goc0, v = this.vt, mk = m[tt]; let keo = 1, lat = 0;
      const P = (k, arr, s) => arr === g ? [g[2 * k], g[2 * k + 1]] : [(v[2 * k] + 1) * S / 2, (1 - v[2 * k + 1]) * S / 2];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        if (!mk[j * N + i]) continue;
        const a = j * (N + 1) + i, b = a + 1, c = a + N + 1;
        const [x0, y0] = P(a, g), [x1, y1] = P(b, g), [x2, y2] = P(c, g), [u0, w0] = P(a, v), [u1, w1] = P(b, v), [u2, w2] = P(c, v);
        const e = [x1 - x0, y1 - y0, x2 - x0, y2 - y0], f = [u1 - u0, w1 - w0, u2 - u0, w2 - w0];
        const det = e[0] * e[3] - e[1] * e[2], inv = [e[3] / det, -e[1] / det, -e[2] / det, e[0] / det];
        /* J = F · E⁻¹ (cột là cạnh) */
        const J = [f[0] * inv[0] + f[2] * inv[1], f[0] * inv[2] + f[2] * inv[3], f[1] * inv[0] + f[3] * inv[1], f[1] * inv[2] + f[3] * inv[3]];
        const dj = J[0] * J[3] - J[1] * J[2]; if (dj <= 0) { lat++; continue; }
        const q = J[0] * J[0] + J[1] * J[1] + J[2] * J[2] + J[3] * J[3], r = Math.sqrt(Math.max(0, q * q / 4 - dj * dj));
        const s1 = Math.sqrt(q / 2 + r), s2 = Math.sqrt(Math.max(1e-9, q / 2 - r));
        if (s1 / s2 > keo) { keo = s1 / s2; this._oMeo = [Math.round(x0), Math.round(y0)]; }   /* tỉ số giãn: 1 = chỉ xoay / co đều, lớn = méo */
      }
      return { keo, lat, o: this._oMeo };
    }
    _doi(tt) { if (tt === this.tt) return; this.tt = tt; this.t0 = performance.now() / 1000; this.doiLuc = this.t0; this._trongSo(tt); }
    /* trọng số mỗi đỉnh: đầu (mềm qua 70 px quanh cổ), từng tay (dải mềm vai→bàn tay, tăng dần về phía bàn tay), cao (cho đung đưa) */
    _trongSo(tt) {
      const k = TT[tt], nv = this.goc0.length / 2; this.wd = new Float32Array(nv); this.wt = k.tay.map(() => new Float32Array(nv)); this.wc = new Float32Array(nv);
      for (let i = 0; i < nv; i++) {
        const x = this.goc0[2 * i], y = this.goc0[2 * i + 1];
        this.wd[i] = em((k.co[1] + 40 - y) / (window.__DAI_DAU || 140));   /* dải chuyển tiếp đầu rộng: đầu xoay không xé vùng hai bên cổ */
        this.wc[i] = cl((DAT - y) / 600, 0, 1);
        k.tay.forEach((a, j) => {
          const ax = a.ban[0] - a.vai[0], ay = a.ban[1] - a.vai[1], L2 = ax * ax + ay * ay;
          const u = cl(((x - a.vai[0]) * ax + (y - a.vai[1]) * ay) / L2, -.2, 1.05), px = a.vai[0] + u * ax - x, py = a.vai[1] + u * ay - y;
          const d = Math.hypot(px, py), rr = a.r * (1 + .25 * u);
          this.wt[j][i] = em((MEM[0] * rr - d) / (MEM[1] * rr)) * em(u / MEM[2]) * (a.nhe ?? 1);   /* vùng chuyển tiếp rộng để không xé lưới */
        });
      }
    }
    _buoc(t) {
      const dt = Math.min(.05, t - this.t); this.t = t;
      const giam = this.giam.matches, d = t - this.t0, K = TT[this.tt];
      if (MOT_LAN[this.tt] && d >= MOT_LAN[this.tt]) { const x = this.cho; this.cho = null; this._doi(this.nen); x && x(); return; }
      let anh = this.tt;
      if (anh === 'dung' && !giam && t > this.chopLuc) { anh = 'chop'; if (t > this.chopLuc + .13) this.chopLuc = t + 2.4 + Math.random() * 2.8; }
      const v = giam ? { tay: [] } : K.ve(d);
      /* nhảy (mừng): nén → bật → tiếp đất nén → nảy nhỏ */
      let nay = v.nay || 0, nen = 0;
      if (v.nhay) nay += 24;   /* hình mừng vẽ sẵn móng nhấc 24 px: hạ xuống cho chạm đất khi không nhảy */
      if (v.nhay && !giam) { const a = d % 1.8; if (a < .18) nen = .07 * sin(a / .18 * Math.PI / 2); else if (a < .68) nay = -110 * sin((a - .18) / .5 * Math.PI); else if (a < .84) nen = .06 * sin((a - .68) / .16 * Math.PI); else if (a < 1.14) nay = -32 * sin((a - .84) / .3 * Math.PI); }
      /* đổi tư thế: nhún tắt dần; xuất hiện lần đầu: trồi lên */
      const u = t - this.doiLuc, nhun = giam ? 0 : u < .5 ? .05 * Math.exp(-u * 10) * Math.cos(u * 22) : 0;
      const w = Math.min(1, (t - this.vao) / .45), vao = giam || w >= 1 ? 0 : (1 - (1 + 2.4 * Math.pow(w - 1, 3) + 1.4 * Math.pow(w - 1, 2))) * 90;
      /* nghiêng theo điểm nhìn */
      let muc = 0; if (this.dich && !giam) { const r = this.el.getBoundingClientRect(); muc = cl((this.dich[0] - (r.left + r.width / 2)) / r.width, -1, 1); }
      const a2 = 80 * (muc - this.ng) - 18 * this.vn; this.vn += a2 * dt; this.ng += this.vn * dt;
      const RAD = Math.PI / 180, gDau = ((v.dau || 0) + 5 * this.ng) * RAD, gThan = ((v.than || 0) + 1.5 * this.ng) * RAD, gat = v.gat || 0;
      const tho = (v.tho || 0) * sin(TAU * t / 3.2), sy = 1 + tho - nhun - nen, sx = 1 - tho * .5 + nhun * .6 + nen * .6;
      const g0 = this.goc0, vt = this.vt, cx = K.co[0], cy = K.co[1];
      const cDau = Math.cos(gDau), sDau = Math.sin(gDau);
      const tay = K.tay.map((a, j) => { const g = ((v.tay || [])[j] || 0) * RAD + (a.theoDau || 0) * gDau; return [Math.cos(g), Math.sin(g), a.vai[0], a.vai[1]]; });
      for (let i = 0, n = g0.length / 2; i < n; i++) {
        let x = g0[2 * i], y = g0[2 * i + 1];
        /* tay trước (trong hệ tọa độ hình), rồi đầu, rồi thân, rồi co giãn và dịch cả hình */
        for (let j = 0; j < tay.length; j++) { const wv = this.wt[j][i]; if (wv > 0) { const [c, s, px, py] = tay[j], dx = x - px, dy = y - py; x += wv * (px + c * dx - s * dy - x); y += wv * (py + s * dx + c * dy - y); } }
        const wd = this.wd[i]; if (wd > 0) { const dx = x - cx, dy = y - cy; x += wd * (cx + cDau * dx - sDau * dy - x); y += wd * (cy + sDau * dx + cDau * dy - y) + wd * gat; }
        const wc = this.wc[i], gc = gThan * wc, dx = x - 400, dy = y - DAT; x = 400 + Math.cos(gc) * dx - Math.sin(gc) * dy; y = DAT + Math.sin(gc) * dx + Math.cos(gc) * dy;
        x = 400 + (x - 400) * sx; y = DAT + (y - DAT) * sy + nay + vao;
        vt[2 * i] = x / (S / 2) - 1; vt[2 * i + 1] = 1 - y / (S / 2);
      }
      const gl = this.gl; gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (!this.tex[anh]) return;
      gl.bindTexture(gl.TEXTURE_2D, this.tex[anh]); gl.bindBuffer(gl.ARRAY_BUFFER, this.bp); gl.bufferSubData(gl.ARRAY_BUFFER, 0, vt);
      gl.drawElements(gl.TRIANGLES, this.nId, gl.UNSIGNED_SHORT, 0);
      const cao = Math.max(0, -(nay - (v.nhay ? 24 : 0))) / 110; this.bongEl.style.transform = `translateX(-50%) scale(${1 - .45 * cao}, ${1 - .3 * cao})`; this.bongEl.style.opacity = 1 - .5 * cao;
    }
  }
  window.LinhVatNguyen = LinhVatNguyen; window.LinhVatNguyen.TU_THE = Object.keys(TT).filter(k => k !== 'chop');
})();
