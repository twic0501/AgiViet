// AgiViet · App Thu mua — bản giao diện, số liệu mẫu, không có máy chủ.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const luu = {
    doc(k, d) { try { return localStorage.getItem('tm.' + k) ?? d; } catch { return d; } },
    ghi(k, v) { try { localStorage.setItem('tm.' + k, v); } catch { /* bỏ qua */ } }
  };

  /* ---------- Gói đang xem: Miễn phí hoặc Business ---------- */
  const tuUrl = new URLSearchParams(location.search).get('goi');
  if (tuUrl === 'free' || tuUrl === 'bus') luu.ghi('goi', tuUrl);
  let goi = luu.doc('goi', 'free');
  document.documentElement.dataset.goi = goi;
  const laBus = () => goi === 'bus';

  /* ---------- Icon nét ---------- */
  const ICON = {
    'tong-quan': '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
    'nhu-cau': '<path d="M9 5h10M9 12h10M9 19h10"/><path d="M4 5h.01M4 12h.01M4 19h.01"/>',
    'nguon': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    'bao-gia': '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>',
    'tin': '<path d="M4 5h16v11H9l-5 4z"/>',
    'don': '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 13h3M8 16h6"/>',
    'cong-no': '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h4"/>',
    'moi-quen': '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',
    'ke-hoach': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    'dich-vu': '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    'thanh-vien': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    'goi': '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    'to-chuc': '<path d="M3 21V8l9-5 9 5v13"/><path d="M8 21v-6h8v6M8 11h.01M12 11h.01M16 11h.01"/>',
    chuong: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    khoa: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    cong: '<path d="M12 5v14M5 12h14"/>',
    tiep: '<path d="M9 5l7 7-7 7"/>',
    lui: '<path d="M15 5l-7 7 7 7"/>',
    lich: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    ghim: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    'dong-ho': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'canh-bao': '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    'thong-tin': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    loc: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
    tai: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    'tai-len': '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    'sao': '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    'vuong-mien': '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    'tia-set': '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="3"/><path d="M16 10l6-3v10l-6-3z"/>',
    goi: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    gui: '<path d="M4 12l16-8-6 17-3-7z"/>',
    but: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    'dau-cham': '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    excel: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 12l4 5M14 12l-4 5"/>',
    'nguoi-them': '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 14-5.3M19 14v6M16 17h6"/>',
    khien: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    'mat': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    can: '<path d="M4 20h16l-2-9H6z"/><circle cx="12" cy="7" r="3"/><path d="M12 7l1.5-1.5"/>',
    'doi': '<path d="M4 7h11M4 7l3-3M4 7l3 3M20 17H9M20 17l-3-3M20 17l-3 3"/>',
    'phan-tram': '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    'bieu-do': '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>',
    'thoat': '<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>',
    'cai': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    'kho': '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
    'kiem': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9zM8.5 12l2 2 4-4M9 17h6"/>',
    'hoa-don': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'
  };
  const icon = (k, cls = '') => `<svg class="i ${cls}"><use href="#i-${k}"/></svg>`;
  document.body.insertAdjacentHTML('afterbegin',
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
    Object.entries(ICON).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('') + '</svg>');

  /* ---------- Màn nào ở trang nào ---------- */
  const TRANG = {
    'tong-quan.html': ['tong-quan'],
    'nhu-cau.html': ['nhu-cau', 'tao-nhu-cau', 'chi-tiet-nhu-cau'],
    'nguon-hang.html': ['nguon-hang', 'chi-tiet-lo', 'ho-so-ban'],
    'bao-gia.html': ['bao-gia', 'so-bao-gia', 'gui-bao-gia'],
    'tin-nhan.html': ['tin-nhan'],
    'don-hang.html': ['don-hang', 'chi-tiet-don', 'thoa-thuan', 'nghiem-thu', 'doi-soat', 'lich-nhan'],
    'cong-no.html': ['cong-no', 'ghi-thanh-toan'],
    'moi-quen.html': ['moi-quen', 'nhap-excel'],
    'ke-hoach.html': ['ke-hoach'],
    'dich-vu.html': ['dich-vu', 'yeu-cau-dich-vu'],
    'to-chuc.html': ['thanh-vien', 'goi-cua-toi', 'ho-so-to-chuc'],
    'goi.html': ['so-sanh-goi', 'nang-cap', 'nang-cap-xong']
  };
  const MAN_O = {};
  Object.entries(TRANG).forEach(([f, ids]) => ids.forEach(id => { MAN_O[id] = f; }));
  $$('a[href^="#"]').forEach(a => {
    const id = a.getAttribute('href').slice(1);
    if (id && !document.getElementById(id) && MAN_O[id]) a.href = `${MAN_O[id]}#${id}`;
  });

  /* ---------- Số liệu hạn mức mẫu ---------- */
  const LUOT = {
    free: [
      { k: 'ket-noi', ten: 'Kết nối, hỏi giá', dung: 3, giu: 2, tran: 5 },
      { k: 'tin', ten: 'Tin mua mới', dung: 4, tran: 5 },
      { k: 'ai', ten: 'AI tạo tin', dung: 8, tran: 10 }
    ],
    bus: [
      { k: 'ket-noi', ten: 'Kết nối, hỏi giá', dung: 18, giu: 3, tran: 50 },
      { k: 'tin', ten: 'Tin mua mới', dung: 7, tran: 30 },
      { k: 'video', ten: 'Gọi video', dung: 45, tran: 120, dv: ' phút' },
      { k: 'tv', ten: 'Tài khoản', dung: 3, tran: 3 }
    ]
  };
  const thanhDo = l => {
    const giu = l.giu || 0;
    const tile = (l.dung + giu) / l.tran;
    const cls = tile >= 1 ? 'het' : tile >= .8 ? 'gan' : '';
    return `<div class="do-luot"><div class="dong"><span>${l.ten}</span><span><b>${l.dung + giu}</b>/${l.tran}${l.dv || ''}</span></div><div class="thanh ${cls}"><i style="width:${Math.min(100, l.dung / l.tran * 100)}%"></i>${giu ? `<i class="giu" style="width:${Math.min(100, giu / l.tran * 100)}%"></i>` : ''}</div>${giu ? `<span class="rat-nho nhat">${l.dung} đã dùng · ${giu} đang tạm giữ chờ người bán trả lời</span>` : ''}</div>`;
  };
  window.tmThanhDo = thanhDo;
  window.tmLuot = LUOT;

  /* ---------- Khung: thanh bên + thanh trên ---------- */
  const MENU = [
    ['', [['tong-quan', 'tong-quan.html#tong-quan', 'Tổng quan']]],
    ['Mua hàng', [
      ['nhu-cau', 'nhu-cau.html#nhu-cau', 'Nhu cầu mua'],
      ['nguon', 'nguon-hang.html#nguon-hang', 'Nguồn hàng'],
      ['bao-gia', 'bao-gia.html#bao-gia', 'Báo giá'],
      ['tin', 'tin-nhan.html#tin-nhan', 'Tin nhắn', 3]
    ]],
    ['Thực hiện', [
      ['don', 'don-hang.html#don-hang', 'Đơn và lịch nhận'],
      ['cong-no', 'cong-no.html#cong-no', 'Công nợ']
    ]],
    ['Quản lý nguồn', [
      ['moi-quen', 'moi-quen.html#moi-quen', 'Mối quen', 0, true],
      ['ke-hoach', 'ke-hoach.html#ke-hoach', 'Kế hoạch mua', 0, true],
      ['dich-vu', 'dich-vu.html#dich-vu', 'Kiểm định, xe, kho']
    ]],
    ['Tổ chức', [
      ['thanh-vien', 'to-chuc.html#thanh-vien', 'Thành viên'],
      ['goi', 'to-chuc.html#goi-cua-toi', 'Gói và thanh toán'],
      ['to-chuc', 'to-chuc.html#ho-so-to-chuc', 'Hồ sơ tổ chức']
    ]]
  ];
  const main = $('main');
  if (main && !document.body.classList.contains('khong-khung')) {
    const shell = document.createElement('div');
    shell.className = 'shell';
    const luot = LUOT[goi];
    shell.innerHTML = `
<aside class="sidebar" aria-label="Điều hướng chính">
  <a class="logo" href="index.html"><img src="assets/mark.svg" alt=""><span><strong>Agi<span>Viet</span></strong><small>Thu mua</small></span></a>
  <div class="to-chuc"><span class="av">ĐX</span><span class="grow"><strong>Nhà máy sấy Đồng Xanh</strong>${laBus() ? '<span class="bus-tag">' + icon('vuong-mien', 'i14') + 'Business</span>' : '<span class="tag vien" style="height:20px;font-size:11px">Miễn phí</span>'}</span></div>
  <nav class="menu-trai">${MENU.map(([nhom, ds]) => (nhom ? `<span class="nhom">${nhom}</span>` : '') + ds.map(([k, href, ten, dem, bus]) =>
    `<a href="${href}" data-menu="${k}">${icon(k)}${ten}${dem ? `<span class="dem">${dem}</span>` : ''}${bus ? (laBus() ? '' : `<span class="khoa" title="Có trong Business">${icon('khoa', 'i16')}</span>`) : ''}</a>`).join('')).join('')}</nav>
  ${laBus()
    ? `<div class="the-luot bus"><div class="tieu">${icon('vuong-mien', 'i16')} Thử Business <span>đến 31/10</span></div>${luot.map(thanhDo).join('')}<a class="btn nho phu" href="to-chuc.html#goi-cua-toi" style="background:transparent;color:#e9efe9;border-color:#4a5c55">Xem gói</a></div>`
    : `<div class="the-luot"><div class="tieu">Lượt tháng 10 <span>mở lại 1/11</span></div>${luot.map(thanhDo).join('')}<a class="btn nho bus" href="goi.html#so-sanh-goi">${icon('vuong-mien', 'i16')}Nâng Business</a></div>`}
</aside>
<div class="chinh">
  <header class="topbar">
    <label class="tim">${icon('nguon', 'i18')}<span class="sr-only">Tìm</span><input placeholder="Tìm nguồn hàng, đơn, người bán…"></label>
    <span class="gian"></span>
    <div class="chuyen-goi" role="group" aria-label="Xem giao diện theo gói (bản mẫu)"><span>Xem gói:</span><button type="button" data-goi="free" aria-pressed="${!laBus()}">Miễn phí</button><button type="button" data-goi="bus" aria-pressed="${laBus()}">Business</button></div>
    <a class="nut-tron" href="tin-nhan.html#tin-nhan" aria-label="Tin nhắn, 3 chưa đọc">${icon('tin')}<span class="cham"></span></a>
    <button class="nut-tron" type="button" aria-label="Thông báo" data-toast="3 thông báo mới: báo giá mới cho N-014, kết quả cân chờ người bán xác nhận, HTX Mỹ Xương gửi bản 2">${icon('chuong')}<span class="cham"></span></button>
    <span class="nguoi-dung"><span class="av">T</span><span><strong style="display:block">Anh Trí</strong><span class="nhat rat-nho">Quản lý mua hàng</span></span></span>
  </header>
</div>
<nav class="nav-duoi" aria-label="Mục chính">
  <a href="tong-quan.html#tong-quan" data-menu="tong-quan">${icon('tong-quan')}Tổng quan</a>
  <a href="nhu-cau.html#nhu-cau" data-menu="nhu-cau">${icon('nhu-cau')}Nhu cầu</a>
  <a href="nguon-hang.html#nguon-hang" data-menu="nguon">${icon('nguon')}Nguồn</a>
  <a href="don-hang.html#don-hang" data-menu="don">${icon('don')}Đơn</a>
  <a href="cong-no.html#cong-no" data-menu="cong-no">${icon('cong-no')}Công nợ</a>
</nav>`;
    main.parentNode.insertBefore(shell, main);
    $('.chinh', shell).appendChild(main);
  }

  $$('.chuyen-goi button').forEach(b => b.addEventListener('click', () => {
    luu.ghi('goi', b.dataset.goi);
    const u = new URL(location.href);
    u.searchParams.delete('goi');
    location.href = u.toString();
  }));

  /* ---------- Thông báo nổi ---------- */
  const toastEl = document.createElement('div');
  toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastEl);
  let hen;
  const toast = t => { toastEl.textContent = t; toastEl.classList.add('show'); clearTimeout(hen); hen = setTimeout(() => toastEl.classList.remove('show'), 3000); };
  window.tmToast = toast;

  /* ---------- Hộp thoại hạn mức và tính năng Business ---------- */
  const BUS_UU_DAI = `<div class="cot g4 nho" style="background:var(--nen);border-radius:12px;padding:12px 14px">
      <strong>Business · 1.500.000 đ/tháng (giá thử nghiệm)</strong>
      <span>${icon('check', 'i16 xanh')} 50 kết nối, 30 tin mua mỗi tháng</span>
      <span>${icon('check', 'i16 xanh')} Kế hoạch mua gồm cả đơn tự giao dịch, mối quen, công nợ, xuất Excel</span>
      <span>${icon('check', 'i16 xanh')} 3 tài khoản có phân quyền</span>
      <span>${icon('check', 'i16 xanh')} Ưu đãi khi tự chọn dịch vụ hỗ trợ: 0,3% (trần 1,5 triệu/đơn)</span></div>`;
  const HOP = {
    'ket-noi': {
      mau: 'var(--do-nhat)', ic: 'khoa', mauIc: 'var(--do)',
      tieu: 'Hết lượt kết nối tháng 10: 3 đã dùng, 2 đang tạm giữ',
      than: `${thanhDo(LUOT.free[0])}
        <p>Mỗi lời mời kết nối hoặc hỏi giá người bán mới <strong>tạm giữ 1 lượt</strong> khi gửi. Người bán chấp nhận thì thành đã dùng; từ chối, hết hạn 7 ngày hoặc bạn rút thì <strong>trả lại lượt</strong>.</p>
        <p class="nho muted">Không gửi được quá số lượt còn, nên người bán không bao giờ bị báo lỗi vì hạn mức của bạn.</p>
        <div class="cot g4 nho"><strong>Bạn vẫn làm được:</strong>
          <span>${icon('check', 'i16 xanh')} Nhắn tin, gọi với 5 người bán đã kết nối</span>
          <span>${icon('check', 'i16 xanh')} Nhận người bán chủ động liên hệ (không tính lượt)</span>
          <span>${icon('check', 'i16 xanh')} Xử lý đơn, thỏa thuận, tiền đang có</span></div>
        <p class="nho muted">Lượt mới mở lại ngày <strong>1/11</strong>. Rút một lời mời đang chờ để lấy lại lượt ngay.</p>${BUS_UU_DAI}`,
      nut: 'Xem gói Business'
    },
    'tin': {
      mau: 'var(--cho)', ic: 'canh-bao', mauIc: '#8a5f2c',
      tieu: 'Đây là tin mua cuối cùng của tháng 10',
      than: `${thanhDo(LUOT.free[1])}
        <p>Đăng tin này là dùng hết <strong>5/5</strong> tin mua mới. Sau đó bạn không đăng tin mới được tới 1/11.</p>
        <p class="nho muted">Sửa tin, báo còn nhu cầu, tạm dừng rồi mở lại tin cũ <strong>không</strong> tính lượt. Xóa rồi tạo lại là lượt mới.</p>`,
      nutChinh: 'Vẫn đăng tin này', toastChinh: 'Đã đăng N-015. Bạn đã dùng 5/5 tin mua tháng 10.',
      nut: 'Xem gói Business'
    },
    'ai': {
      mau: 'var(--nen)', ic: 'tia-set', mauIc: 'var(--bus)',
      tieu: 'So báo giá bằng AI có trong Business',
      than: `<p>Gói Miễn phí vẫn so được báo giá <strong>bằng bảng</strong> (giá, lượng, điều kiện). Business thêm:</p>
        <div class="cot g4 nho">
          <span>${icon('check', 'i16 xanh')} Tính tổng chi phí nhận hàng (xe, hao hụt, kiểm định)</span>
          <span>${icon('check', 'i16 xanh')} Đánh dấu điều khoản còn thiếu</span>
          <span>${icon('check', 'i16 xanh')} Soạn nháp thỏa thuận từ báo giá đã chọn</span></div>`,
      nut: 'Xem gói Business'
    },
    'video': {
      mau: 'var(--nen)', ic: 'video', mauIc: 'var(--bus)',
      tieu: 'Chủ động gọi video có trong Business',
      than: `<p>Gói Miễn phí: nhắn tin và gọi thoại trong app. Bạn vẫn <strong>nhận</strong> cuộc gọi video khi người bán gọi.</p>
        <p>Business: chủ động gọi video xem vườn, xem ao, <strong>thử 120 phút mỗi tháng</strong> (công bố trước, không hứa vô hạn).</p>`,
      nut: 'Xem gói Business'
    },
    'thanh-vien': {
      mau: 'var(--nen)', ic: 'nguoi-them', mauIc: 'var(--bus)',
      tieu: 'Gói Miễn phí có một người quản lý',
      than: `<p>Muốn tách người mua hàng, kế toán và người ký, bạn cần Business: <strong>3 tài khoản</strong> riêng, mỗi người một quyền.</p>
        <p class="nho muted">Người ký của công ty vẫn được mời ký từng thỏa thuận qua đường link, không chiếm tài khoản.</p>`,
      nut: 'Xem gói Business'
    },
    'excel': {
      mau: 'var(--nen)', ic: 'excel', mauIc: 'var(--bus)',
      tieu: 'Mối quen và nhập Excel có trong Business',
      than: `<p>Lưu danh sách người bán quen của bạn, nhập từ Excel, theo dõi riêng. Mối quen là dữ liệu riêng của bạn, <strong>không công khai</strong> thành người bán trên app.</p>${BUS_UU_DAI}`,
      nut: 'Xem gói Business'
    },
    'ke-hoach': {
      mau: 'var(--nen)', ic: 'ke-hoach', mauIc: 'var(--bus)',
      tieu: 'Kế hoạch mua và báo thiếu hàng có trong Business',
      than: `<p>Đặt nhu cầu theo tuần, xem lượng đã chắc chắn và phần còn thiếu, nhận cảnh báo sớm khi nguồn không đủ.</p>${BUS_UU_DAI}`,
      nut: 'Xem gói Business'
    }
  };
  function moHop(k) {
    const h = HOP[k];
    if (!h) return;
    let d = document.getElementById('hop-' + k);
    if (!d) {
      d = document.createElement('dialog');
      d.className = 'hop-thoai'; d.id = 'hop-' + k;
      d.setAttribute('aria-labelledby', 'tieu-hop-' + k);
      d.innerHTML = `<div class="dau-hop"><span class="ic" style="background:${h.mau};color:${h.mauIc}">${icon(h.ic, 'i24')}</span><div class="grow"><h2 id="tieu-hop-${k}">${h.tieu}</h2><span class="nho nhat">Gói Miễn phí · chu kỳ 1/10 – 31/10</span></div><button class="nut-tron" type="button" data-dong aria-label="Đóng">${icon('x')}</button></div>
        <div class="than-hop">${h.than}</div>
        <div class="chan-hop">${h.nutChinh ? `<button class="btn phu" type="button" data-dong data-sau="${h.toastChinh}">${h.nutChinh}</button>` : '<button class="btn phu" type="button" data-dong>Để sau</button>'}<a class="btn bus" href="goi.html#so-sanh-goi">${icon('vuong-mien', 'i18')}${h.nut}</a></div>`;
      document.body.appendChild(d);
      d.addEventListener('click', e => {
        const dong = e.target.closest('[data-dong]');
        if (dong || e.target === d) { d.close(); if (dong?.dataset.sau) toast(dong.dataset.sau); }
      });
    }
    d.showModal();
  }
  window.tmMoHop = moHop;

  /* ---------- Chuyển màn trong trang ---------- */
  const hooks = {};
  window.tmMan = (id, h) => { hooks[id] = h; };
  let hienTai = null;
  function hienMan() {
    const id = location.hash.slice(1);
    const el = id && document.getElementById(id);
    const man = el && el.classList.contains('man') ? el : $('.man');
    if (!man) return;
    $$('.man').forEach(s => s.classList.toggle('active', s === man));
    const menu = man.dataset.menu;
    $$('[data-menu]').forEach(a => { if (a.dataset.menu === menu) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = `${man.dataset.title || $('h1', man)?.textContent.trim() || 'Thu mua'} · AgiViet Thu mua`;
    if (hienTai !== man) hooks[man.id]?.(man);
    hienTai = man;
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', hienMan);

  /* ---------- Bấm ---------- */
  function apDungChon(nhom) {
    const ten = nhom.dataset.chon;
    const chon = $$('[aria-pressed="true"]', nhom).find(b => b.closest('[data-chon]') === nhom)?.dataset.khi;
    if (ten) $$(`[data-thuoc="${ten}"]`).forEach(el => { el.hidden = el.dataset.khi !== chon; });
  }
  document.addEventListener('click', e => {
    const luot = e.target.closest('[data-luot]');
    if (luot) {
      e.preventDefault();
      if (!laBus() && luot.dataset.luot !== 'none') { moHop(luot.dataset.luot); return; }
      if (luot.dataset.ok) toast(luot.dataset.ok);
      if (luot.dataset.den) location.href = luot.dataset.den;
      return;
    }
    const nut = e.target.closest('[aria-pressed]:not([data-bat]):not([data-goi])');
    if (nut && nut.closest('[data-chon]')) {
      const nhom = nut.closest('[data-chon]');
      $$('[aria-pressed]', nhom).forEach(b => { if (b.closest('[data-chon]') === nhom) b.setAttribute('aria-pressed', String(b === nut)); });
      apDungChon(nhom);
    }
    const bat = e.target.closest('[data-bat]');
    if (bat) bat.setAttribute('aria-pressed', String(bat.getAttribute('aria-pressed') !== 'true'));
    const t = e.target.closest('[data-toast]');
    if (t) toast(t.dataset.toast);
  });
  $$('[data-chon]').forEach(apDungChon);

  $$('input[data-so]').forEach(o => o.addEventListener('input', () => {
    const so = o.value.replace(/\D/g, '').slice(0, 12);
    o.value = so ? Number(so).toLocaleString('vi-VN') : '';
  }));

  // Chèn thanh đo lượt vào chỗ có data-luot-o="free|bus:chỉ số"
  $$('[data-thanh-do]').forEach(el => {
    const [g, i] = el.dataset.thanhDo.split(':');
    el.innerHTML = thanhDo(LUOT[g][Number(i)]);
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.addEventListener('DOMContentLoaded', hienMan);
  window.addEventListener('load', () => { window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 60); });
})();
