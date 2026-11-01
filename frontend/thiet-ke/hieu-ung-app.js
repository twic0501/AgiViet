/* Hiệu ứng app AgiViet: báo hoặc xác thực một việc trên màn.
   Nguyên tắc: hiệu ứng chỉ PHẢN ÁNH trạng thái đã có (lưu xong, ngân hàng đã xác nhận...), không bao giờ tự đổi trạng thái
   và không chạy "trước" khi việc thật xảy ra. Bật giảm chuyển động thì mọi hiệu ứng rút về đổi ngay, không dịch chuyển.
   Dùng Web Animations API, không cần thư viện. Mọi hàm trả Promise khi xong (nếu có thời lượng). */
(function () {
  const giam = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const E = { ra: 'cubic-bezier(.2,.8,.2,1)', vao: 'cubic-bezier(.4,0,1,1)', nay: 'cubic-bezier(.34,1.56,.64,1)', deu: 'cubic-bezier(.45,0,.55,1)' };
  const so = n => new Intl.NumberFormat('vi-VN').format(Math.round(n));
  const cho = ms => new Promise(r => setTimeout(r, ms));
  const anim = (el, kf, o) => giam() ? (el.animate(kf.slice(-1), { duration: 1, fill: o.fill || 'none' }).finished) : el.animate(kf, o).finished;
  const TICK = '<svg class="hu-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

  const HU = {
    /* ---- Điều hướng ---- */
    vaoMan(el, huong = 'toi') {
      const dx = huong === 'lui' ? -28 : 28;
      return anim(el, [{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: E.ra });
    },
    noiLen(ds, buoc = 45) {
      return Promise.all([...ds].map((el, i) => anim(el, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * buoc, easing: E.ra, fill: 'backwards' })));
    },
    gachTab(gach, tab) {
      const r = tab.getBoundingClientRect(), p = gach.parentElement.getBoundingClientRect();
      return anim(gach, [{ transform: getComputedStyle(gach).transform === 'none' ? 'translateX(0)' : getComputedStyle(gach).transform, width: gach.offsetWidth + 'px' }, { transform: `translateX(${r.left - p.left}px)`, width: r.width + 'px' }], { duration: 280, easing: E.ra, fill: 'forwards' });
    },

    /* ---- Chạm và chọn ---- */
    nhan(el) {
      if (el._huNhan) return; el._huNhan = 1;
      el.addEventListener('pointerdown', () => !giam() && el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.96)' }], { duration: 90, fill: 'forwards', easing: E.ra }));
      const nha = () => !giam() && el.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], { duration: 260, fill: 'forwards', easing: E.nay });
      el.addEventListener('pointerup', nha); el.addEventListener('pointerleave', nha);
    },
    chonThe(the, nhom) {
      nhom && nhom.forEach(x => x !== the && x.classList.remove('hu-chon'));
      the.classList.add('hu-chon');
      return anim(the, [{ transform: 'scale(.97)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 300, easing: E.ra });
    },
    moNut(btn) {
      btn.disabled = false; btn.classList.add('hu-mo');
      return anim(btn, [{ boxShadow: '0 0 0 0 rgba(35,92,69,.45)' }, { boxShadow: '0 0 0 10px rgba(35,92,69,0)' }], { duration: 700, easing: 'ease-out' });
    },

    /* ---- Gửi, lưu, lỗi ---- */
    dangGui(btn) {
      btn.dataset.huCu = btn.innerHTML; btn.style.minWidth = btn.offsetWidth + 'px'; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = '<span class="hu-cham" aria-label="Đang gửi"><i></i><i></i><i></i></span>';
      return () => { btn.innerHTML = btn.dataset.huCu; btn.disabled = false; btn.removeAttribute('aria-busy'); };
    },
    async thanhCong(btn, nhan = 'Đã lưu') {
      btn.disabled = true; btn.removeAttribute('aria-busy'); btn.classList.add('hu-xong');
      btn.innerHTML = TICK + `<span>${nhan}</span>`;
      const p = btn.querySelector('.hu-tick path');
      await Promise.all([anim(p, [{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], { duration: 380, delay: 60, easing: E.ra, fill: 'backwards' }),
        anim(btn, [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 420, easing: E.ra })]);
    },
    async loiTruong(o, tin) {
      o.classList.add('hu-loi'); o.setAttribute('aria-invalid', 'true');
      let m = o.parentElement.querySelector('.hu-tin-loi');
      if (!m) { m = document.createElement('div'); m.className = 'hu-tin-loi'; m.setAttribute('role', 'alert'); o.insertAdjacentElement('afterend', m); }
      m.textContent = tin;
      await Promise.all([anim(o, [0, -6, 6, -4, 4, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 360, easing: E.deu }),
        anim(m, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: E.ra })]);
      o.addEventListener('input', () => { o.classList.remove('hu-loi'); o.removeAttribute('aria-invalid'); m.remove(); }, { once: true });
    },
    thongBao(host, chu, loai = 'ok') {
      const t = document.createElement('div'); t.className = 'hu-toast hu-toast-' + loai; t.setAttribute('role', 'status');
      t.innerHTML = (loai === 'ok' ? TICK : '') + `<span>${chu}</span>`; host.appendChild(t);
      anim(t, [{ opacity: 0, transform: 'translate(-50%,16px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 260, easing: E.ra, fill: 'forwards' });
      return cho(2600).then(() => anim(t, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })).then(() => t.remove());
    },

    /* ---- Số và tiền (chỉ chạy khi số đã được xác nhận) ---- */
    demSo(el, tu, den, { hau = ' đ', ms = 900 } = {}) {
      if (giam()) { el.textContent = so(den) + hau; return HU.nhayNen(el); }
      return new Promise(r => { const t0 = performance.now(); const f = n => { const u = Math.min(1, (n - t0) / ms), k = 1 - Math.pow(1 - u, 3); el.textContent = so(tu + (den - tu) * k) + hau; if (u < 1) requestAnimationFrame(f); else r(HU.nhayNen(el)); }; requestAnimationFrame(f); });
    },
    nhayNen(el, mau = '#fff1c2') { return anim(el, [{ backgroundColor: mau }, { backgroundColor: 'rgba(255,241,194,0)' }], { duration: 1400, easing: 'ease-out' }); },
    async xuBay(tu, den, n = 5) {
      if (giam()) return HU.nayDich(den);
      const a = tu.getBoundingClientRect(), b = den.getBoundingClientRect();
      const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2, cao = Math.min(140, Math.abs(x1 - x0) * .5 + 40);
      const vs = [];
      for (let i = 0; i < n; i++) {
        const c = document.createElement('div'); c.className = 'hu-xu'; document.body.appendChild(c);
        const kf = Array.from({ length: 11 }, (_, k) => { const u = k / 10; return { transform: `translate(${x0 + (x1 - x0) * u - 11}px,${y0 + (y1 - y0) * u - cao * 4 * u * (1 - u) - 11}px) scaleX(${Math.abs(Math.cos(u * Math.PI * 1.5)) * .8 + .2})` }; });
        vs.push(c.animate(kf, { duration: 680, delay: i * 110, easing: 'linear', fill: 'both' }).finished.then(() => { c.remove(); HU.nayDich(den); }));
      }
      return Promise.all(vs);
    },
    nayDich(el) { return anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 260, easing: E.ra }); },

    /* ---- Tiến trình và trạng thái ---- */
    buocTien(lane, i) {
      const ds = [...lane.querySelectorAll('.hu-buoc')], noi = lane.querySelector('.hu-noi i');
      /* i bằng số bước nghĩa là đã xong hết */
      const pct = Math.min(100, ds.length > 1 ? (i / (ds.length - 1)) * 100 : 100);
      ds.forEach((b, k) => { b.classList.toggle('xong', k < i); b.classList.toggle('dang', k === i); });
      const cham = ds[Math.min(i, ds.length - 1)]?.querySelector('b');
      return Promise.all([anim(noi, [{ width: noi.style.width || '0%' }, { width: pct + '%' }], { duration: 520, easing: E.ra, fill: 'forwards' }).then(() => { noi.style.width = pct + '%'; }),
        cham ? anim(cham, [{ transform: 'scale(.6)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 420, delay: 380, easing: E.ra }) : 0]);
    },
    doiTrangThai(chip, chu, loai) {
      return anim(chip, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 140, easing: E.vao }).then(() => {
        chip.textContent = chu; chip.dataset.loai = loai;
        return anim(chip, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: E.ra });
      });
    },
    demNguoc(vong, conLai, tong) {
      const u = Math.max(0, conLai / tong), c = vong.querySelector('circle.chay'), L = 2 * Math.PI * 16;
      c.style.strokeDasharray = L; c.style.strokeDashoffset = L * (1 - u);
      vong.dataset.muc = u > .5 ? 'xanh' : u > .15 ? 'vang' : 'do';
    },
    thanhKetQua(el) {
      return Promise.all([...el.children].map((p, i) => anim(p, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 520, delay: i * 260, easing: E.ra, fill: 'backwards' })));
    },
    tickLanLuot(ds, buoc = 220) {
      return Promise.all([...ds].map((li, i) => cho(giam() ? 0 : i * buoc).then(() => { li.classList.add('xong'); const p = li.querySelector('.hu-tick path'); return p ? anim(p, [{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], { duration: 300, easing: E.ra }) : 0; })));
    },
    hienDong(dong) {
      const h = dong.offsetHeight;
      return Promise.all([anim(dong, [{ height: 0, opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 300, easing: E.ra }), HU.nhayNen(dong, '#e3f1df')]);
    },
    huyHieu(badge, n, chuong) {
      badge.textContent = n;
      const a = anim(badge, [{ transform: 'scale(.3)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 380, easing: E.ra });
      const b = chuong ? anim(chuong, [0, -14, 12, -8, 5, 0].map(r => ({ transform: `rotate(${r}deg)` })), { duration: 560, easing: E.deu }) : 0;
      return Promise.all([a, b]);
    },

    /* ---- Ký, OTP, khóa ---- */
    async otp(o, ma, dung) {
      for (let i = 0; i < o.length; i++) { o[i].textContent = ma[i] || ''; if (!giam()) await anim(o[i], [{ transform: 'translateY(4px)', opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 120, easing: E.ra }); }
      if (dung) return Promise.all([...o].map((x, i) => cho(giam() ? 0 : i * 60).then(() => { x.classList.add('dung'); return anim(x, [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 240, easing: E.ra }); })));
      o.forEach(x => x.classList.add('sai'));
      await anim(o[0].parentElement, [0, -8, 8, -5, 5, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 380, easing: E.deu });
    },
    kyTen(path, ms = 1300) {
      const L = path.getTotalLength(); path.style.strokeDasharray = L;
      return anim(path, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: ms, easing: 'cubic-bezier(.5,.1,.5,.9)', fill: 'both' });
    },
    dongDau(dau) {
      dau.style.visibility = 'visible';
      return Promise.all([anim(dau, [{ opacity: 0, transform: 'scale(1.7) rotate(-14deg)' }, { opacity: .95, transform: 'scale(.94) rotate(-8deg)', offset: .7 }, { opacity: .9, transform: 'scale(1) rotate(-8deg)' }], { duration: 420, easing: E.vao, fill: 'forwards' }),
        anim(dau.parentElement, [{ transform: 'none' }, { transform: 'translateY(2px)', offset: .75 }, { transform: 'none' }], { duration: 520 })]);
    },
    moKhoa(khoa, noiDung) {
      khoa.classList.add('mo');
      return Promise.all([anim(khoa.querySelector('.quai'), [{ transform: 'none' }, { transform: 'translateY(-4px) rotate(-28deg)' }], { duration: 360, easing: E.nay, fill: 'forwards' }),
        anim(noiDung, [{ filter: 'blur(6px)', opacity: .5 }, { filter: 'blur(0)', opacity: 1 }], { duration: 520, delay: 200, easing: E.ra, fill: 'forwards' })]);
    },

    /* ---- Bối cảnh ---- */
    matKetNoi(bang, mat) {
      bang.classList.toggle('mat', mat); bang.querySelector('span').textContent = mat ? 'Mất kết nối · dữ liệu vẫn giữ, chưa gửi được xác nhận' : 'Đã kết nối lại';
      if (mat) return anim(bang, [{ transform: 'translateY(-100%)' }, { transform: 'none' }], { duration: 280, easing: E.ra, fill: 'forwards' });
      return cho(1400).then(() => anim(bang, [{ transform: 'none' }, { transform: 'translateY(-100%)' }], { duration: 240, easing: E.vao, fill: 'forwards' }));
    },
    songAm(cot, muc) { cot.forEach((c, i) => { c.style.transform = `scaleY(${Math.max(.15, muc * (.55 + .45 * Math.sin(performance.now() / 90 + i * 1.7)))})`; }); },
    khungCho(el, bat) { el.classList.toggle('hu-khung', bat); el.setAttribute('aria-busy', bat ? 'true' : 'false'); },
    tuyenGiao(svg, u) {
      const p = svg.querySelector('.tuyen'), xe = svg.querySelector('.xe'), L = p.getTotalLength(), d = p.getPointAtLength(L * u), d2 = p.getPointAtLength(Math.min(L, L * u + 1));
      const goc = Math.atan2(d2.y - d.y, d2.x - d.x) * 57.3;
      xe.setAttribute('transform', `translate(${d.x} ${d.y}) rotate(${goc})`);
      svg.querySelector('.da-di').style.strokeDashoffset = L * (1 - u); svg.querySelector('.da-di').style.strokeDasharray = L;
    },
    veDuong(path) { return HU.kyTen(path, 900); },
    dangGo(el, bat) { el.hidden = !bat; },
  };
  window.HieuUng = HU;
})();
