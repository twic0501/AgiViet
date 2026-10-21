// AgiViet · App Nhà sản xuất: vỏ app (icon, chuyển màn theo #, thanh dưới, đọc to, ô nhập). Dữ liệu và vẽ màn: js/khung.js.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const luu = {
    doc(k, macDinh) { try { const v = localStorage.getItem('am.' + k); return v === null ? macDinh : v; } catch { return macDinh; } },
    ghi(k, v) { try { localStorage.setItem('am.' + k, v); } catch { /* bỏ qua */ } }
  };


  /* ---------- Bộ icon nét dùng chung ---------- */
  const ICON = {
    lui: '<path d="M15 5l-7 7 7 7"/>',
    tiep: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    cong: '<path d="M12 5v14M5 12h14"/>',
    tru: '<path d="M5 12h14"/>',
    lich: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    ghim: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    'dong-ho': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    xe: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    khoa: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    but: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    cat: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>',
    'lam-lai': '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v5h5"/>',
    'ban-phim': '<rect x="2" y="6" width="20" height="13" rx="3"/><path d="M6 10h1M10 10h1M14 10h1M18 10h1M7 15h10"/>',
    hoi: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17v.01"/>',
    gui: '<path d="M4 12l16-8-6 17-3-7z"/>',
    doi: '<path d="M4 7h11M4 7l3-3M4 7l3 3M20 17H9M20 17l-3-3M20 17l-3 3"/>',
    'thong-tin': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    'mat-mang': '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19v.01M3 3l18 18"/>',
    phat: '<path d="M7 5l12 7-12 7z"/>',
    chuong: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    nguoi: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    tai: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    anh: '<rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 8"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="3"/><path d="M16 10l6-3v10l-6-3z"/>',
    chan: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    co: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
    mua: '<path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4 4 0 1 1 17 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
    mat: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    giay: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    'dau-cham': '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    loc: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
    nha: '<path d="M3 11l9-7 9 7v10H3z"/><path d="M9 21v-6h6v6"/>',
    'nguoi-nhom': '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',
    khien: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    kho: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
    'tro-giup': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
    cai: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    'chu-to': '<path d="M3 19l5-14 5 14M4.8 14h6.4M15 19l3-8 3 8M15.9 16.5h4.2"/>',
    'dien-thoai': '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
    'mui-ten-len': '<path d="M12 19V5M6 11l6-6 6 6"/>',
    'mui-ten-xuong': '<path d="M12 5v14M6 13l6 6 6-6"/>'
  };
  document.body.insertAdjacentHTML('afterbegin',
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
    Object.entries(ICON).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('') + '</svg>');

  /* ---------- Màn nào nằm ở trang nào ---------- */
  const TRANG = window.AM?.TRANG || {};   // khai báo ở js/khung.js
  const MAN_O_TRANG = {};
  Object.entries(TRANG).forEach(([file, ids]) => ids.forEach(id => { MAN_O_TRANG[id] = file; }));

  // Link "#id" trỏ sang màn ở trang khác thì đổi thành "trang.html#id"
  $$('a[href^="#"]').forEach(a => {
    const id = a.getAttribute('href').slice(1);
    if (id && !document.getElementById(id) && MAN_O_TRANG[id]) a.href = `${MAN_O_TRANG[id]}#${id}`;
  });

  /* ---------- Cài đặt người dùng ---------- */
  if (luu.doc('chuTo', '0') === '1') document.documentElement.classList.add('chu-to');

  /* ---------- Thông báo nhỏ ---------- */
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastEl);
  let toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }
  window.amToast = toast;

  /* ---------- Đọc to: ưu tiên giọng thu sẵn (assets/giong), câu không có sẵn thì dùng giọng của máy ---------- */
  // Cùng cách chuẩn hóa + băm với scripts/gom-cau-doc.mjs (repo agiviet-he-thong) để tra đúng tệp
  const chuanCau = t => String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().normalize('NFC');
  const bamCau = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  let giongSan = {};
  fetch('assets/giong/ds.json').then(r => r.ok ? r.json() : null).then(d => { giongSan = d?.cau || {}; }).catch(() => {});
  let dangDoc = null, amThanh = null;
  function dungDoc() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (amThanh) { amThanh.onended = amThanh.onerror = null; amThanh.pause(); amThanh = null; }
    if (dangDoc) dangDoc.classList.remove('dang-doc');
    dangDoc = null;
  }
  function doc(text, btn) {
    if (btn && dangDoc === btn) { dungDoc(); return; }
    dungDoc();
    const cau = chuanCau(text), ma = bamCau(cau);
    dangDoc = btn || null;
    if (btn) btn.classList.add('dang-doc');
    if (giongSan[ma]) {
      const a = new Audio(`assets/giong/${ma}.mp3`);
      a.playbackRate = Number(luu.doc('tocDo', '0.95')) / 0.95;     // tốc độ trong Cài đặt; giữ cao độ giọng
      a.onended = () => { if (amThanh === a) dungDoc(); };
      a.onerror = () => { if (amThanh === a) { amThanh = null; docMay(cau, btn); } };   // mất mạng, thiếu tệp: dùng giọng của máy
      amThanh = a;
      a.play().catch(() => { if (amThanh === a) { amThanh = null; docMay(cau, btn); } });
      return;
    }
    docMay(cau, btn);
  }
  function docMay(text, btn) {
    if (!('speechSynthesis' in window)) { toast('Máy này chưa hỗ trợ đọc to'); if (dangDoc === btn) dungDoc(); return; }
    dangDoc = btn || null;
    if (btn) btn.classList.add('dang-doc');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = Number(luu.doc('tocDo', '0.95'));
    const giong = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('vi'));
    if (giong) u.voice = giong;
    else toast('Máy chưa có giọng tiếng Việt, đang đọc bằng giọng mặc định');
    u.onend = u.onerror = () => { if (dangDoc === btn) dungDoc(); };
    dangDoc = btn || null;
    if (btn) btn.classList.add('dang-doc');
    speechSynthesis.speak(u);
  }
  window.amDoc = doc;
  window.amDungDoc = dungDoc;

  /* ---------- Thanh điều hướng dưới ---------- */
  const TAB = [
    ['hom-nay', 'hom-nay.html#hom-nay', 'home', 'Hôm nay'],
    ['vuon', 'vuon.html#vuon', 'garden', 'Vườn'],
    ['dang', 'dang.html#dang', null, 'Đăng'],
    ['ban', 'hang.html#hang', 'stock', 'Bán'],
    ['don', 'lich.html#lich', 'order', 'Đơn'],
    ['tien', 'tien.html#tien', 'wallet', 'Tiền']
  ];
  let nav = null;
  if ($('.screen[data-nav]') && window.AVN) {
    nav = document.createElement('nav');
    nav.className = 'nav nav-6';
    nav.setAttribute('aria-label', 'Mục chính');
    nav.innerHTML = TAB.map(([key, href, ic, ten]) => key === 'dang'
      ? `<a href="${href}" class="dang"><span class="ic"><svg class="i" style="width:30px;height:30px;color:#fff;stroke-width:3"><use href="#i-cong"/></svg></span>${ten}</a>`
      : `<a href="${href}" data-tab="${key}"><span class="ic">${window.AVN.icon(ic, 28)}</span>${ten}</a>`
    ).join('');
    $('.app').appendChild(nav);
  }

  /* ---------- Báo mất mạng ---------- */
  const matMang = document.createElement('div');
  matMang.className = 'mat-mang';
  matMang.setAttribute('role', 'status');
  matMang.innerHTML = '<svg class="i i20"><use href="#i-mat-mang"/></svg><span>Mất mạng. Việc bạn làm được giữ làm nháp, có mạng sẽ tự gửi.</span>';
  $('.app').prepend(matMang);
  const capNhatMang = () => matMang.classList.toggle('hien', !navigator.onLine);
  window.addEventListener('online', () => { capNhatMang(); toast('Có mạng lại. Đang gửi các nháp…'); });
  window.addEventListener('offline', capNhatMang);
  capNhatMang();

  /* ---------- Thanh bước ---------- */
  const CHECK = '<svg class="i i22" style="color:#fff;stroke-width:3"><use href="#i-check"/></svg>';
  $$('.steps[data-step]').forEach(ol => {
    const n = Number(ol.dataset.step);
    const ten = (ol.dataset.labels || 'Chụp, nói|Kiểm tra|Xem lại|Đăng').split('|');
    ol.innerHTML = ten.map((t, i) => {
      const so = i + 1;
      const cls = so < n ? 'xong' : so === n ? 'cur' : '';
      const line = i ? `<li class="line ${so <= n ? 'xong' : ''}" aria-hidden="true"></li>` : '';
      return `${line}<li class="${cls}"${so === n ? ' aria-current="step"' : ''}><span class="dot">${so < n ? CHECK : so}</span>${t}</li>`;
    }).join('');
  });

  /* ---------- Chuyển màn trong trang ---------- */
  const hooks = {};   // hooks[id] = { vao(), ra() }
  window.amMan = (id, h) => { hooks[id] = h; };
  let manHienTai = null;
  function hienMan() {
    const id = decodeURIComponent(location.hash.slice(1).split('?')[0]);
    const man = (id && document.getElementById(id)?.classList.contains('screen'))
      ? document.getElementById(id)
      : $('.screen');
    if (!man) return;
    if (manHienTai && manHienTai !== man) hooks[manHienTai.id]?.ra?.();
    $$('.screen').forEach(s => s.classList.toggle('active', s === man));
    const tab = man.dataset.nav;
    document.body.dataset.nav = tab ? 'on' : 'off';
    if (nav) $$('a[data-tab]', nav).forEach(a => {
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    dungDoc();
    window.AM?.ve();
    const tieuDe = man.dataset.title || $('h1', man)?.textContent.trim() || 'AgiViet';
    document.title = `${tieuDe} · AgiViet`;
    if (man.id === 'can-ho-tro') {
      let ma = '';
      try { ma = sessionStorage.getItem('am.ma') || ''; } catch { /* bỏ qua */ }
      const o = document.getElementById('ma-lien-quan');
      if (o) o.textContent = ma || 'Chưa chọn đơn hoặc lô';
    }
    const doi = manHienTai !== man;
    if (doi) hooks[man.id]?.vao?.(man);
    manHienTai = man;
    if (doi) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', hienMan);

  /* ---------- Bấm: đọc to, thông báo, chọn một trong nhiều ---------- */
  function apDungChon(nhom) {
    const ten = nhom.dataset.chon;
    const chon = $('[aria-pressed="true"]', nhom)?.dataset.khi;
    if (!ten) return;
    $$(`[data-thuoc="${ten}"]`).forEach(el => { el.hidden = el.dataset.khi !== chon; });
  }
  document.addEventListener('click', e => {
    const noi = e.target.closest('[data-noi]');
    if (noi) { doc(noi.dataset.noi, noi); return; }
    const nghe = e.target.closest('.nghe, [data-doc-man]');
    if (nghe) {
      const man = nghe.closest('.screen');
      if (!man) return;                     // nút Nghe ngoài màn (thẻ hướng dẫn) có bộ xử lý riêng
      doc(man.dataset.read || man.innerText, nghe);
      return;
    }
    const nut = e.target.closest('[aria-pressed]:not([data-bat])');
    if (nut && nut.closest('[data-chon]')) {
      const nhom = nut.closest('[data-chon]');
      $$('[aria-pressed]', nhom).forEach(b => { if (b.closest('[data-chon]') === nhom) b.setAttribute('aria-pressed', String(b === nut)); });
      apDungChon(nhom);
    }
    const bat = e.target.closest('[data-bat]');
    if (bat) {
      bat.setAttribute('aria-pressed', String(bat.getAttribute('aria-pressed') !== 'true'));
      const khoi = bat.closest('[data-dem-khoi]');
      if (khoi) { const o = $('[data-dem]', khoi); if (o) o.textContent = $$('[data-bat][aria-pressed="true"]', khoi).length; }
    }
    const ma = e.target.closest('[data-ma]');
    if (ma) { try { sessionStorage.setItem('am.ma', ma.dataset.ma); } catch { /* bỏ qua */ } }
    const t = e.target.closest('[data-toast]');
    if (t) toast(t.dataset.toast);
    const an = e.target.closest('[data-an]');
    if (an) { const el = document.querySelector(an.dataset.an); if (el) el.hidden = true; }
  });
  $$('[data-chon]').forEach(apDungChon);

  /* ---------- Ô nhập số có dấu chấm nghìn ---------- */
  $$('input[data-so]').forEach(o => o.addEventListener('input', () => {
    const so = o.value.replace(/\D/g, '').slice(0, 10);
    o.value = so ? Number(so).toLocaleString('vi-VN') : '';
  }));

  /* ---------- Mã OTP: tự nhảy ô ---------- */
  $$('.otp').forEach(khung => {
    const o = $$('input', khung);
    o.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(-1);
        if (inp.value && o[i + 1]) o[i + 1].focus();
        if (o.every(x => x.value) && khung.dataset.xong) location.hash = khung.dataset.xong;
      });
      inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && o[i - 1]) o[i - 1].focus(); });
      inp.addEventListener('paste', e => {
        const so = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, o.length);
        if (!so) return;
        e.preventDefault();
        so.split('').forEach((c, k) => { o[k].value = c; });
        o[Math.min(so.length, o.length) - 1].focus();
        if (so.length === o.length && khung.dataset.xong) location.hash = khung.dataset.xong;
      });
    });
  });

  /* ---------- Đếm ngược gửi lại mã ---------- */
  $$('[data-dem-nguoc]').forEach(nutGui => {
    let hen;
    const chay = () => {
      let con = Number(nutGui.dataset.demNguoc);
      nutGui.disabled = true;
      const nhan = nutGui.dataset.nhan || 'Gửi lại mã';
      const ve = () => { nutGui.textContent = con > 0 ? `${nhan} sau ${con} giây` : nhan; };
      ve();
      clearInterval(hen);
      hen = setInterval(() => { con -= 1; ve(); if (con <= 0) { clearInterval(hen); nutGui.disabled = false; } }, 1000);
    };
    nutGui.addEventListener('click', () => { toast('Đã gửi lại mã'); chay(); });
    chay();
  });

  /* ---------- Bấm giữ để nói ---------- */
  $$('[data-giu-noi]').forEach(nut => {
    let batDau = 0;
    const bat = e => { e.preventDefault(); batDau = Date.now(); nut.classList.add('dang-ghi'); nut.dataset.nhanCu ??= nut.lastChild.textContent; nut.lastChild.textContent = 'Đang ghi… thả ra để gửi'; };
    const tha = () => {
      if (!nut.classList.contains('dang-ghi')) return;
      nut.classList.remove('dang-ghi');
      nut.lastChild.textContent = nut.dataset.nhanCu;
      const giay = Math.max(1, Math.round((Date.now() - batDau) / 1000));
      if (Date.now() - batDau < 400) { toast('Bấm và giữ nút để nói'); return; }
      const dich = nut.dataset.giuNoi ? document.querySelector(nut.dataset.giuNoi) : null;
      if (dich) {
        dich.insertAdjacentHTML('beforeend', `<div class="bong ban"><div class="thoai"><button class="phat" type="button" aria-label="Nghe lại tin thoại"><svg class="i i20"><use href="#i-phat"/></svg></button><span class="song-nho" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="xs b">0:${String(giay).padStart(2, '0')}</span></div><span class="gio">Vừa xong · đã gửi</span></div>`);
        dich.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
      toast('Đã gửi tin nhắn thoại');
    };
    nut.addEventListener('pointerdown', bat);
    nut.addEventListener('pointerup', tha);
    nut.addEventListener('pointerleave', tha);
    nut.addEventListener('contextmenu', e => e.preventDefault());
  });

  /* ---------- Cài đặt: chữ to, tốc độ đọc ---------- */
  $$('[data-cai="chu-to"]').forEach(nut => {
    nut.setAttribute('aria-pressed', String(document.documentElement.classList.contains('chu-to')));
    nut.addEventListener('click', () => {
      const bat = nut.getAttribute('aria-pressed') !== 'true';
      nut.setAttribute('aria-pressed', String(bat));
      document.documentElement.classList.toggle('chu-to', bat);
      luu.ghi('chuTo', bat ? '1' : '0');
    });
  });
  $$('[data-cai="toc-do"]').forEach(o => {
    o.value = luu.doc('tocDo', '0.95');
    const nhan = $('[data-toc-do-nhan]');
    const ve = () => { if (nhan) nhan.textContent = Number(o.value) < 0.85 ? 'Chậm' : Number(o.value) > 1.05 ? 'Nhanh' : 'Vừa'; };
    ve();
    o.addEventListener('input', () => { luu.ghi('tocDo', o.value); ve(); });
    o.addEventListener('change', () => doc('Đây là tốc độ đọc bạn vừa chọn.'));
  });

  window.addEventListener('DOMContentLoaded', hienMan);
  if (document.readyState !== 'loading') hienMan();
})();
