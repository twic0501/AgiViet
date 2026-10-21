// AgiViet · App Thu mua: vỏ app (thanh bên, thanh trên, điều hướng dưới, dải mô phỏng, chuyển màn theo #, thông báo nhỏ).
// Dữ liệu và vẽ màn: js/khung.js với cấu hình js/cau-hinh.js.
(() => {
  const A = window.AVN, CH = window.KHUNG_CAU_HINH;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const trangNay = location.pathname.split('/').pop() || 'index.html';
  const thoat = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ic = (ten, co = 20) => String(A?.icon(ten, co) ?? '');

  /* ---------- Thông báo nhỏ, đọc to ---------- */
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let hen;
  window.amToast = chu => { toast.textContent = chu; toast.classList.add('show'); clearTimeout(hen); hen = setTimeout(() => toast.classList.remove('show'), 3200); };
  window.amDoc = chu => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(chu); u.lang = 'vi-VN'; speechSynthesis.speak(u); } catch { /* máy không đọc được */ } };
  document.addEventListener('click', e => { const n = e.target.closest('[data-noi]'); if (n) window.amDoc(n.dataset.noi); });

  /* ---------- Thanh bên, thanh trên, điều hướng dưới ---------- */
  const nguoi = A?.nguoi('mua'), hs = A?.hoSo('mua');
  const sidebar = $('.sidebar'), topbar = $('.topbar'), navDuoi = $('.nav-duoi');
  const dangO = href => { const [tep, id] = href.split('#'); return tep === trangNay && ($('.screen.active')?.id === id || (!$('.screen.active') && $('.screen')?.id === id)); };
  function veKhung() {
    if (!nguoi || !hs) { document.body.classList.add('khong-khung'); return; }
    const luot = A.nv.luotDaDung(A.so(), nguoi.id, A.bayGio()), hm = A.so().chinhSach.hanMuc[hs.goi];
    if (sidebar) sidebar.innerHTML = `<a class="logo" href="tong-quan.html"><img src="assets/mark.svg" alt=""><div><strong>Agi<span>Viet</span></strong><small>Thu mua</small></div></a>
      <a class="to-chuc" href="to-chuc.html#ho-so-to-chuc"><span class="av">${thoat(hs.toChuc?.ten?.charAt(0) || 'T')}</span><span><strong>${thoat(hs.toChuc?.ten || nguoi.ten)}</strong><span class="xs muted">${hs.xacMinh === 'da_xac_minh' ? 'Đã xác minh' : 'Chưa xác minh'}</span></span></a>
      <nav class="menu-trai" aria-label="Mục chính">${CH.menu.map(([nhom, ds]) => `${nhom ? `<span class="nhom">${nhom}</span>` : ''}${ds.map(([tab, href, icon, ten]) => `<a href="${href}" data-tab="${tab}"><span class="ic">${ic(icon)}</span>${ten}</a>`).join('')}`).join('')}</nav>
      <div class="the-goi ${hs.goi === 'business' ? 'bus' : ''}"><strong>Gói ${hs.goi === 'business' ? 'Business' : 'Miễn phí'}</strong><span>Lượt kết nối tháng này: ${luot.ketNoi}/${hm.ketNoi}</span><span>Tin cần mua: ${luot.nhuCau}/${hm.nhuCau}</span>${hs.goi === 'business' ? '' : '<a href="to-chuc.html#so-sanh-goi">Xem gói Business</a>'}</div>`;
    if (topbar) topbar.innerHTML = `<button type="button" class="nut-tron mo-ben" aria-label="Mở danh mục">${ic('filter')}</button><span class="gian"></span>
      <a class="nut-tron" href="tong-quan.html#tong-quan" data-tab="tong-quan" aria-label="Việc cần làm"><span class="ic">${ic('bell')}</span></a>
      <span class="nguoi-dung"><span class="av">${thoat((hs.ten || '?').replace(/^(Anh|Chị|Cô|Chú)\s+/i, '').charAt(0))}</span><span><strong>${thoat(hs.ten)}</strong><br><span class="xs muted">${thoat(hs.toChuc?.ten || '')}</span></span></span>
      <button type="button" class="btn phu nho dang-xuat">Đăng xuất</button>`;
    if (navDuoi) navDuoi.innerHTML = CH.menuDuoi.map(([tab, href, icon, ten]) => `<a href="${href}" data-tab="${tab}"><span class="ic">${ic(icon, 22)}</span>${ten}</a>`).join('') + `<a href="#" class="mo-ben"><span class="ic">${ic('filter', 22)}</span>Thêm</a>`;
  }
  function danhDau() { $$('[data-tab][href]').forEach(a => { if (dangO(a.getAttribute('href'))) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  document.addEventListener('click', e => {
    if (e.target.closest('.mo-ben')) { e.preventDefault(); sidebar?.classList.toggle('mo'); return; }
    if (e.target.closest('.sidebar.mo a')) sidebar.classList.remove('mo');
    if (e.target.closest('.dang-xuat')) { A.dangXuat('mua'); location.href = CH.trangVao; }
  });

  /* ---------- Dải mô phỏng ---------- */
  const chinh = $('.chinh') || $('.app');
  if (chinh && A) {
    const dai = document.createElement('div');
    dai.className = 'dai-mo-phong'; dai.setAttribute('role', 'note');
    dai.innerHTML = '<span>Mô phỏng · dữ liệu mẫu</span><a href="cong-cu.html#gia-lap">Giả lập người bán</a><a href="cong-cu.html#phong-thu">Phòng thử</a><a href="../ban/hom-nay.html" target="_blank" rel="noopener">Mở app bán</a>';
    chinh.prepend(dai);
  }

  /* ---------- Chuyển màn theo # ---------- */
  let manCu = null;
  function hienMan() {
    const id = decodeURIComponent(location.hash.slice(1).split('?')[0]);
    const man = (id && document.getElementById(id)?.classList.contains('screen')) ? document.getElementById(id) : $('.screen');
    if (!man) return;
    $$('.screen').forEach(s => s.classList.toggle('active', s === man));
    if (CH.goc.includes(man.id)) man.dataset.nav = 'goc'; else delete man.dataset.nav;
    window.AM?.ve();
    danhDau();
    if (manCu !== man) window.scrollTo(0, 0);
    manCu = man;
  }
  window.addEventListener('hashchange', hienMan);
  veKhung();
  window.AVN?.theoDoi(() => { const mo = sidebar?.classList.contains('mo'); veKhung(); if (mo) sidebar.classList.add('mo'); danhDau(); window.AM?.ve(); });
  window.addEventListener('DOMContentLoaded', hienMan);
  if (document.readyState !== 'loading') hienMan();
})();
