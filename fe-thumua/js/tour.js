// Hướng dẫn từng bước kiểu chỉ tay: làm tối màn, chừa sáng đúng nút cần bấm. Người dùng bấm vào nút đó thì app đi tiếp
// và hướng dẫn sang bước sau (kể cả khi chuyển trang). Bấm chỗ khác bị chặn để không lạc. Chép giống hệt ở fe-nongdan và fe-thumua.
// Mở: window.moTour('dang' | 'khach' | 'tien' | 'nguon' | 'nhu-cau' | 'tra-tien'). Tiến độ giữ trong sessionStorage "av.tour".
(() => {
  const APP = window.tmLuot ? 'mua' : 'ban';
  // bước: t = trang, h = hash (bỏ trống = không đổi), s = nút/khung cần chỉ, c = lời nhắn, x = 'xem' (chỉ xem, bấm Tiếp) hoặc bấm nút
  const TOUR = {
    ban: {
      dang: { ten: 'Đăng hàng', buoc: [
        { t: 'hang.html', h: '#hang', s: 'nav.nav a.dang', c: 'Bấm nút <b>+ Đăng</b> ở giữa thanh dưới để đăng lô hàng mới.' },
        { t: 'dang.html', h: '#dang', s: 'a.nut-noi', c: 'Bấm <b>Bấm để nói</b>. Bạn nói tên hàng, số lượng, ngày hái. Muốn chụp ảnh thì bấm ô Chụp ảnh ở trên.' },
        { t: 'dang.html', h: '#nghe', s: '#nghe .bottom-actions a[href$="#kiem-tra"]', c: 'App đang nghe và ghi lại. Nói xong thì bấm <b>Nói xong</b>.' },
        { t: 'dang.html', h: '#kiem-tra', s: '#kiem-tra .card', x: 'xem', c: 'Đây là những gì app đã ghi. Sai chỗ nào thì bấm cây bút bên phải dòng đó để sửa.' },
        { t: 'dang.html', h: '#kiem-tra', s: '#kiem-tra [data-chon="gia"] [data-khi="bao"]', c: 'Chưa biết giá? Chọn <b>Để khách báo giá</b>. Mỗi khách gửi giá riêng cho bạn.' },
        { t: 'dang.html', h: '#kiem-tra', s: '#kiem-tra .bottom-actions a', c: 'Bấm <b>Tiếp tục</b> để xem tin trước khi đăng.' },
        { t: 'dang.html', h: '#xem-lai', s: '#av-luong-khoi, #xem-lai .card', x: 'xem', c: 'Khách sẽ thấy tin như thế này. Sửa <b>lượng đăng bán</b> nếu cần.' },
        { t: 'dang.html', h: '#xem-lai', s: '#xem-lai a.btn[href$="#xong"]', c: 'Bấm <b>Đăng bán</b>. Tin lên ngay cho bên mua xem.' },
        { t: 'dang.html', h: '#xong', s: '#xong .bottom-actions', x: 'xem', c: 'Xong! Có khách hỏi, app báo bằng chuông và tin nhắn. Lô mới nằm ở màn <b>Hàng</b>.' },
      ] },
      khach: { ten: 'Chọn khách, làm thỏa thuận', buoc: [
        { t: 'hang.html', h: '#hang', s: 'nav.nav a[data-tab="khach"]', c: 'Bấm <b>Khách hỏi</b> để xem ai muốn mua hàng của bạn.' },
        { t: 'khach.html', h: '#khach', s: '#khach article.card, #khach .card', x: 'xem', c: 'Mỗi khách có giá, cách giao, lúc trả tiền và <b>tiền về tay</b>. Đừng chỉ nhìn giá.' },
        { t: 'khach.html', h: '#khach', s: '#khach a.meo[href$="#so-sanh"]', c: 'Bấm <b>So sánh 2 khách</b> để xem ai cho bạn nhiều tiền hơn.' },
        { t: 'giao-dich.html', h: '#so-sanh', s: '#so-sanh .card', x: 'xem', c: 'App đã trừ tiền xe, phí bốc xếp. Khách giá thấp hơn có khi lại cho bạn nhiều tiền hơn.' },
        { t: 'giao-dich.html', h: '#so-sanh', s: '#so-sanh a.btn[href$="#phuong-thuc"]', c: 'Chọn khách về tay nhiều hơn: bấm <b>Chọn B, làm thỏa thuận</b>.' },
        { t: 'giao-dich.html', h: '#phuong-thuc', s: '#phuong-thuc [data-chon="cach"] [data-khi="tu"]', c: 'Chọn <b>Tự giao dịch</b>: không mất phí, vẫn có đơn trên app, ghi cân và phản đối khoản trừ.' },
        { t: 'giao-dich.html', h: '#phuong-thuc', s: '#phuong-thuc .bottom-actions a.btn', c: 'Bấm để sang bước chọn lượng hàng.' },
        { t: 'giao-dich.html', h: '#chon-luong', s: '#chon-luong [data-chon]', x: 'xem', c: 'Hàng chưa cân thì nên <b>hứa một khoảng</b>, ví dụ 9 đến 10 tấn, rồi chốt lượng cuối trước ngày giao.' },
        { t: 'giao-dich.html', h: '#chon-luong', s: '#chon-luong .bottom-actions a', c: 'Bấm <b>Tiếp: xem điều kiện</b>.' },
        { t: 'giao-dich.html', h: '#ky', s: '#ky .bottom-actions, #ky .card', x: 'xem', c: 'Bấm <b>Nghe các điều kiện</b> để app đọc cho bạn. Hiểu hết rồi mới ký. Không ai được ký thay bạn.' },
      ] },
      tien: { ten: 'Xác nhận tiền hàng', buoc: [
        { t: 'hang.html', h: '#hang', s: 'nav.nav a[data-tab="tien"]', c: 'Bấm <b>Tiền hàng</b> để xem khoản bên mua báo đã trả.' },
        { t: 'tien.html', h: '#tien', s: '#tien .hero, #tien .card', x: 'xem', c: 'Bên mua báo đã chuyển số tiền này. Mở <b>tài khoản ngân hàng</b> hoặc tin nhắn ngân hàng để xem tiền đã về chưa.' },
        { t: 'tien.html', h: '#tien', s: '#tien [data-da-nhan]', c: 'Thấy đủ tiền thì bấm <b>Đã nhận đủ</b>. Chưa thấy thì bấm Chưa thấy tiền, app mở đối soát. Không ai được bắt bạn bấm trước.' },
        { t: 'tien.html', h: '#tien', s: '#tien a.pill-btn[href$="#quyet-toan"]', x: 'xem', c: 'Xong đơn thì xem <b>Quyết toán</b>: tiền hàng, tiền cọc, khoản đang đối soát được tính rõ từng dòng.' },
      ] },
    },
    mua: {
      'nhu-cau': { ten: 'Đăng nhu cầu mua', buoc: [
        { t: 'tong-quan.html', h: '#tong-quan', s: '.chinh a[href$="#tao-nhu-cau"], a[href$="#tao-nhu-cau"]', c: 'Bấm <b>Tạo nhu cầu mua</b> để người bán đúng mặt hàng thấy bạn cần gì.' },
        { t: 'nhu-cau.html', h: '#tao-nhu-cau', s: '#mh', x: 'xem', c: 'Chọn <b>mặt hàng</b>. Không có trong danh sách thì chọn Mặt hàng khác và tự nhập.' },
        { t: 'nhu-cau.html', h: '#tao-nhu-cau', s: '#luong', x: 'xem', c: 'Nhập <b>lượng cần</b> (tấn) và ngày nhận. Mục nào chưa yêu cầu thì để trống.' },
        { t: 'nhu-cau.html', h: '#tao-nhu-cau', s: '#tao-nhu-cau [data-luot="tin"]', c: 'Bấm <b>Đăng nhu cầu</b>. Mỗi tin mới tính 1 lượt tin mua.' },
        { t: 'nhu-cau.html', h: '#nhu-cau', s: '#nhu-cau tbody tr', x: 'xem', c: 'Tin của bạn nằm đầu danh sách. Người bán trong app thấy ngay và gửi báo giá riêng cho bạn.' },
      ] },
      nguon: { ten: 'Tìm nguồn và kết nối', buoc: [
        { t: 'tong-quan.html', h: '#tong-quan', s: 'a[data-menu="nguon"]', c: 'Bấm <b>Nguồn hàng</b> để xem các lô người bán đang đăng.' },
        { t: 'nguon-hang.html', h: '#nguon-hang', s: '.loc-chinh', x: 'xem', c: 'Lọc theo <b>mặt hàng</b>, <b>lượng còn bán được</b> và <b>thời gian có hàng</b>. Lô đã chốt hết không hiện ở đây.' },
        { t: 'nguon-hang.html', h: '#nguon-hang', s: '.them-loc > summary', c: 'Bấm <b>Thêm bộ lọc</b> để thấy các lọc khác.' },
        { t: 'nguon-hang.html', h: '#nguon-hang', s: '#loc-da-can', c: 'Bấm <b>Chỉ hàng đã cân</b> để bỏ các lô còn ước tính.' },
        { t: 'nguon-hang.html', h: '#nguon-hang', s: '[data-chon="xep-nguon"] [data-khi="gia"]', c: 'Bấm <b>Giá thấp</b> để xếp lô rẻ lên đầu. Lô chờ báo giá nằm cuối.' },
        { t: 'nguon-hang.html', h: '#nguon-hang', s: '#nguon-hang > .luoi.l2 > article:not([hidden])', x: 'xem', c: 'Mỗi thẻ ghi rõ <b>Còn bán được</b>, điểm hợp và điều <b>chưa biết</b>. Chưa biết nên hỏi trước khi chốt.' },
        { t: 'nguon-hang.html', h: '#nguon-hang', s: '.the-luot', x: 'xem', c: 'Kết nối với người bán tốn 1 lượt, chỉ tính khi họ đồng ý; từ chối thì trả lại lượt.' },
      ] },
      'tra-tien': { ten: 'Ghi trả tiền cho người bán', buoc: [
        { t: 'tong-quan.html', h: '#tong-quan', s: 'a[data-menu="cong-no"]', c: 'Bấm <b>Công nợ</b> để xem khoản nào đến hạn.' },
        { t: 'cong-no.html', h: '#cong-no', s: '#cong-no a[href$="#ghi-thanh-toan"]', c: 'Chuyển khoản xong thì bấm <b>Ghi thanh toán</b>.' },
        { t: 'cong-no.html', h: '#ghi-thanh-toan', s: '#tt-tien', x: 'xem', c: 'Chọn đơn và khoản; số tiền và phép tính điền sẵn theo đơn.' },
        { t: 'cong-no.html', h: '#ghi-thanh-toan', s: '#tt-tk', x: 'xem', c: 'Chỉ chuyển vào <b>tài khoản đang hiện ở đây</b>. Tài khoản vừa đổi thì gọi hỏi lại người bán trước.' },
        { t: 'cong-no.html', h: '#ghi-thanh-toan', s: '#ghi-thanh-toan .card-chan', x: 'xem', c: 'Ghi xong, người bán xác nhận <b>đã nhận</b> thì khoản mới thành đã trả. Người bán báo chưa thấy tiền thì hai bên đối soát.' },
      ] },
    },
  }[APP];
  const KHOA = 'av.tour';
  const $ = (s, r = document) => r.querySelector(s);
  const trang = () => location.pathname.split('/').pop() || 'index.html';
  const docTT = () => { try { return JSON.parse(sessionStorage.getItem(KHOA)); } catch { return null; } };
  const ghiTT = v => { try { v ? sessionStorage.setItem(KHOA, JSON.stringify(v)) : sessionStorage.removeItem(KHOA); } catch { /* bỏ qua */ } };
  const noi = t => { const s = t.replace(/<[^>]+>/g, ''); if (window.amDoc) window.amDoc(s); else try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(s); u.lang = 'vi-VN'; speechSynthesis.speak(u); } catch { /* bỏ qua */ } };

  document.head.insertAdjacentHTML('beforeend', `<style id="tour-css">
    .tour-lo { position: fixed; z-index: 9998; border-radius: 14px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(15, 30, 22, .62); transition: all .25s ease; }
    .tour-lo::after { content: ""; position: absolute; inset: -4px; border-radius: 16px; border: 3px solid #f5b83d; animation: tour-nhip 1.4s ease-in-out infinite; }
    .tour-lo.xem::after { animation: none; border-style: dashed; }
    @keyframes tour-nhip { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .45; transform: scale(1.04); } }
    .tour-the { position: fixed; z-index: 9999; width: min(340px, calc(100vw - 24px)); background: #fff; color: #1f2d25; border-radius: 16px; padding: 14px 16px; box-shadow: 0 12px 32px rgba(0,0,0,.28); font: 500 16px/1.45 'Be Vietnam Pro', system-ui, sans-serif; }
    .tour-the .tour-dau { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #5b6b62; margin-bottom: 6px; }
    .tour-the p { margin: 0 0 12px; }
    .tour-the .tour-nut { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .tour-the button { display: inline-flex; align-items: center; justify-content: center; line-height: 1.2; font: 700 15px 'Be Vietnam Pro', system-ui, sans-serif; border-radius: 12px; min-height: 44px; padding: 0 14px; cursor: pointer; border: 2px solid #235c45; background: #fff; color: #235c45; }
    .tour-the button.chinh { background: #235c45; color: #fff; }
    .tour-the button.nhe { border: none; background: none; text-decoration: underline; min-height: 36px; padding: 0 4px; color: #5b6b62; }
    .tour-the .tour-chi { font-size: 14px; color: #8a5a00; font-weight: 700; }
    .tour-the.lac { animation: tour-lac .35s; }
    @keyframes tour-lac { 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
    .tour-ds { display: grid; gap: 8px; }
    .tour-ds button { text-align: left; }
  </style>`);

  let lo = null, the = null, dich = null, chay = false;
  function don() { lo?.remove(); the?.remove(); lo = the = dich = null; chay = false; }
  function ket(thongBao) { ghiTT(null); don(); if (thongBao) (window.amToast || window.tmToast)?.('Xong hướng dẫn. Bạn có thể xem lại bất cứ lúc nào.'); }
  const hien = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const timNut = s => [...document.querySelectorAll(s)].find(hien);

  function ve() {
    const tt = docTT(); if (!tt) return don();
    const tour = TOUR[tt.ten]; const b = tour?.buoc[tt.i];
    if (!b) return ket(true);
    if (document.querySelector('dialog[open]')) { don(); return setTimeout(ve, 300); }   // chờ người dùng đóng hộp thoại của app
    if (trang() !== b.t) { location.href = b.t + location.search + (b.h || ''); return; }
    if (b.h && location.hash !== b.h) { location.hash = b.h; return; }
    document.getElementById('hd-lop')?.remove();                 // đóng hướng dẫn thẻ nếu đang mở
    don();                                                       // gỡ khung bước cũ ngay, tránh bấm nhầm Tiếp hai lần
    let lan = 0;
    const cho = () => {
      const el = timNut(b.s);
      if (!el && lan++ < 30) return setTimeout(cho, 100);
      dung(tt, tour, b, el);
    };
    cho();
  }
  function dung(tt, tour, b, el) {
    don(); chay = true; dich = el || null;
    lo = document.createElement('div'); lo.className = 'tour-lo' + (b.x ? ' xem' : '');
    the = document.createElement('div'); the.className = 'tour-the'; the.setAttribute('role', 'dialog'); the.setAttribute('aria-live', 'polite');
    const cuoi = tt.i === tour.buoc.length - 1;
    the.innerHTML = `<div class="tour-dau"><span>${tour.ten} · bước ${tt.i + 1}/${tour.buoc.length}</span><button type="button" class="nhe" data-tour="bo">Thoát</button></div>
      <p>${b.c}</p>
      <div class="tour-nut"><button type="button" data-tour="nghe">Nghe</button>
      ${b.x || !el ? `<button type="button" class="chinh" data-tour="tiep">${cuoi ? 'Hoàn tất' : 'Tiếp'}</button>` : '<span class="tour-chi">Bấm vào ô đang sáng</span>'}</div>`;
    document.body.append(lo, the);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    dat();
  }
  function dat() {
    if (!chay || !the) return;
    const vw = innerWidth, vh = innerHeight;
    if (dich && dich.isConnected) {
      const r = dich.getBoundingClientRect(), p = 6;
      Object.assign(lo.style, { left: r.left - p + 'px', top: r.top - p + 'px', width: r.width + p * 2 + 'px', height: Math.min(r.height, vh * .6) + p * 2 + 'px', display: '' });
      const h = the.offsetHeight, w = the.offsetWidth;
      const duoi = r.bottom + 14 + h < vh;
      the.style.top = (duoi ? r.bottom + 14 : Math.max(12, r.top - 14 - h)) + 'px';
      the.style.left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - w - 12) + 'px';
    } else {
      lo.style.display = 'none';
      the.style.top = vh / 2 - the.offsetHeight / 2 + 'px'; the.style.left = vw / 2 - the.offsetWidth / 2 + 'px';
    }
    requestAnimationFrame(dat);
  }
  function tien() { const tt = docTT(); if (!tt) return; tt.i++; ghiTT(tt); }

  // Bấm: trong khung nhắn thì xử lý nút; đúng ô đang sáng thì cho đi và sang bước sau; chỗ khác thì chặn
  window.addEventListener('click', e => {
    const mo = e.target.closest('[data-tour-mo]');
    if (mo) { e.preventDefault(); e.stopImmediatePropagation(); window.moTour(mo.dataset.tourMo); return; }
    if (!chay) return;
    const n = e.target.closest('[data-tour]');
    if (n && the?.contains(n)) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (n.dataset.tour === 'bo') return ket(false);
      const tt = docTT(), b = tt && TOUR[tt.ten]?.buoc[tt.i];
      if (!b) return ket(false);
      if (n.dataset.tour === 'nghe') noi(b.c);
      else { tien(); ve(); }
      return;
    }
    if (the?.contains(e.target)) return;
    const tt = docTT(), b = tt && TOUR[tt.ten].buoc[tt.i];
    if (dich && !b?.x && dich.contains(e.target)) { tien(); don(); setTimeout(ve, 350); return; }   // để app xử lý cú bấm rồi mới vẽ bước sau
    e.preventDefault(); e.stopImmediatePropagation();
    the?.classList.remove('lac'); void the?.offsetWidth; the?.classList.add('lac');
  }, true);
  window.addEventListener('keydown', e => { if (chay && e.key === 'Escape') ket(false); });
  window.addEventListener('hashchange', () => { if (docTT()) setTimeout(ve, 150); });

  window.moTour = ten => {
    if (!TOUR[ten]) return;
    try { localStorage.setItem(APP === 'ban' ? 'am.da-xem-hd' : 'tm.da-xem-hd', '1'); } catch { /* bỏ qua */ }   // không bật lại hướng dẫn thẻ giữa chừng
    ghiTT({ ten, i: 0 }); ve();
  };
  window.dsTour = () => Object.entries(TOUR).map(([k, v]) => ({ k, ten: v.ten, so: v.buoc.length }));
  // Hướng dẫn đã làm xong (để gợi ý học tiếp phần chưa làm)
  const KHOA_XONG = 'av.tour-xong-' + APP;
  const daXong = () => { try { return JSON.parse(localStorage.getItem(KHOA_XONG)) || []; } catch { return []; } };
  // Hộp chọn hướng dẫn: mục Tôi / nút ?, màn chào mừng sau đăng nhập, và sau khi xong một hướng dẫn
  window.moChonTour = (o = {}) => {
    don(); chay = true;
    const xong = daXong();
    const ds = window.dsTour().filter(t => !o.chiChuaXong || !xong.includes(t.k));
    the = document.createElement('div'); the.className = 'tour-the';
    the.innerHTML = `<div class="tour-dau"><span>${o.nhan || 'Hướng dẫn từng bước'}</span><button type="button" class="nhe" data-tour="bo">Đóng</button></div>
      ${o.tieu ? `<h3 style="margin:0 0 6px;font-size:19px">${o.tieu}</h3>` : ''}
      <p>${o.loi || 'Chọn việc muốn làm. App sẽ chỉ đúng nút cần bấm, bạn bấm thật để đi tiếp.'}</p>
      <div class="tour-ds">${ds.map((t, k) => `<button type="button" class="${k === 0 && o.goiY ? 'chinh' : ''}" data-tour-mo="${t.k}">${xong.includes(t.k) ? '✓ ' : ''}${t.ten} · ${t.so} bước</button>`).join('')}
      <button type="button" class="nhe" data-tour="bo">${o.nutBo || 'Để sau, tôi tự xem'}</button></div>`;
    lo = document.createElement('div'); lo.className = 'tour-lo'; lo.style.cssText = 'left:50%;top:50%;width:0;height:0';
    document.body.append(lo, the); dat();
  };
  // Xong trọn một hướng dẫn: ghi lại, gợi ý học tiếp phần chưa làm
  const ketCu = ket;
  ket = (thongBao) => {
    const tt = docTT();
    ketCu(false);
    if (!thongBao || !tt) return;
    const xong = [...new Set([...daXong(), tt.ten])];
    try { localStorage.setItem(KHOA_XONG, JSON.stringify(xong)); } catch { /* bỏ qua */ }
    if (window.dsTour().some(t => !xong.includes(t.k))) window.moChonTour({ nhan: 'Hướng dẫn từng bước', tieu: `Xong: ${TOUR[tt.ten].ten}`, loi: 'Bạn muốn học tiếp việc nào?', chiChuaXong: true, goiY: true, nutBo: 'Xong, tôi tự dùng' });
    else (window.amToast || window.tmToast)?.('Bạn đã xem hết hướng dẫn. Xem lại bất cứ lúc nào ở mục Tôi hoặc nút ?.');
  };

  // Vừa đăng nhập / đăng ký xong (cờ do màn đăng nhập đặt): chào mừng và mời hướng dẫn
  let moiVao = null; try { moiVao = sessionStorage.getItem('av.moi-vao'); } catch { /* bỏ qua */ }
  if (moiVao === APP && !docTT()) {
    try { sessionStorage.removeItem('av.moi-vao'); localStorage.setItem(APP === 'ban' ? 'am.da-xem-hd' : 'tm.da-xem-hd', '1'); } catch { /* bỏ qua */ }
    setTimeout(() => { document.getElementById('hd-lop')?.remove(); window.moChonTour({ nhan: 'Chào mừng tới AgiViet', tieu: APP === 'ban' ? 'Bạn đã vào app. Làm thử cùng app nhé?' : 'Tài khoản demo đã sẵn sàng', loi: 'App sẽ làm sáng đúng nút cần bấm, bạn bấm thật để đi tiếp. Nên bắt đầu từ việc đầu tiên.', goiY: true }); }, 700);
  }

  if (docTT()) setTimeout(ve, 400);                                  // tiếp tục sau khi chuyển trang
})();
