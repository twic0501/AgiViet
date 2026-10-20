// Hướng dẫn lần đầu vào app Nhà sản xuất: 5 thẻ lớn, hình trước chữ, bấm Nghe để nghe đọc.
// Tự hiện lần đầu vào màn Hàng; xem lại ở mục Tôi (nút "Xem hướng dẫn dùng app"). Đã xem lưu ở localStorage "am.da-xem-hd".
(() => {
  const BUOC = [
    { hinh: 'assets/ic-camera.svg', phu: 'assets/ic-mic.svg', tour: 'dang', tieu: 'Đăng hàng', chu: 'Bấm nút <b>+</b> ở giữa thanh dưới. Chụp ảnh hàng, hoặc bấm giữ micro và nói: “10 tấn xoài, hái tuần sau”.', doc: 'Đăng hàng. Bấm nút cộng ở giữa thanh dưới. Chụp ảnh hàng, hoặc bấm giữ micro và nói, ví dụ: 10 tấn xoài, hái tuần sau.' },
    { hinh: 'assets/ic-khach.svg', tour: 'khach', tieu: 'Khách hỏi mua', chu: 'Khách muốn mua sẽ hiện ở mục <b>Khách hỏi</b>. So <b>tiền về tay</b> của từng khách rồi chọn người bạn muốn nói chuyện.', doc: 'Khách hỏi mua. Khách muốn mua sẽ hiện ở mục Khách hỏi. So tiền về tay của từng khách, rồi chọn người bạn muốn nói chuyện.' },
    { hinh: 'assets/ic-can.svg', tieu: 'Chốt đơn, giao hàng', chu: 'Hai bên cùng xác nhận đơn. Khi cân, bạn xem số rồi bấm <b>Đúng</b> hoặc <b>Không đúng</b>. Không trả lời thì không tính là đồng ý.', doc: 'Chốt đơn, giao hàng. Hai bên cùng xác nhận đơn. Khi cân, bạn xem số rồi bấm Đúng hoặc Không đúng. Không trả lời thì không tính là đồng ý.' },
    { hinh: 'assets/ic-tien.svg', tour: 'tien', tieu: 'Tiền hàng', chu: 'Xem tài khoản ngân hàng trước, rồi mới bấm <b>Đã nhận đủ</b>, <b>Nhận một phần</b> hoặc <b>Chưa thấy tiền</b>. Không ai được bắt bạn bấm trước.', doc: 'Tiền hàng. Xem tài khoản ngân hàng trước, rồi mới bấm đã nhận đủ, nhận một phần, hoặc chưa thấy tiền. Không ai được bắt bạn bấm trước.' },
    { hinh: 'assets/ic-loa.svg', tieu: 'Cần giúp?', chu: 'Màn nào cũng có nút <b>Nghe</b> để app đọc cho bạn. Gặp chuyện lạ thì bấm <b>Cần hỗ trợ</b>. Không đọc mã OTP cho ai.', doc: 'Cần giúp? Màn nào cũng có nút Nghe để app đọc cho bạn. Gặp chuyện lạ thì bấm Cần hỗ trợ. Không đọc mã OTP cho ai.' },
  ];
  const KHOA = 'am.da-xem-hd';
  const daXem = () => { try { return localStorage.getItem(KHOA) === '1'; } catch { return true; } };
  const ghiDaXem = () => { try { localStorage.setItem(KHOA, '1'); } catch { /* bỏ qua */ } };
  const doc = t => { if (window.amDoc) return window.amDoc(t); try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'vi-VN'; speechSynthesis.speak(u); } catch { /* bỏ qua */ } };   // giọng thu sẵn qua app.js

  function mo() {
    if (document.getElementById('hd-lop')) return;
    let i = 0;
    const lop = document.createElement('div');
    lop.id = 'hd-lop'; lop.className = 'hd-lop'; lop.setAttribute('role', 'dialog'); lop.setAttribute('aria-modal', 'true'); lop.setAttribute('aria-label', 'Hướng dẫn dùng app');
    document.querySelector('.app')?.appendChild(lop) || document.body.appendChild(lop);
    const ve = () => {
      const b = BUOC[i], cuoi = i === BUOC.length - 1;
      lop.innerHTML = `<div class="hd-the">
        <div class="hd-dau"><span class="xs muted b">Hướng dẫn · ${i + 1}/${BUOC.length}</span><button type="button" class="hd-bo">Bỏ qua</button></div>
        <div class="hd-hinh"><img class="hd-mam" src="assets/linh-vat-chao.svg" alt=""><span class="hd-icon"><img src="${b.hinh}" alt="">${b.phu ? `<img src="${b.phu}" alt="">` : ''}</span></div>
        <h2 class="hd-tieu">${b.tieu}</h2>
        <p class="hd-chu">${b.chu}</p>
        <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="nghe hd-nghe"><img src="assets/ic-loa.svg" alt="">Nghe</button>${b.tour ? `<button type="button" class="btn phu nho" data-tour-mo="${b.tour}">Làm thử từng bước</button>` : ""}</div>
        <div class="hd-cham" aria-hidden="true">${BUOC.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
        <div class="hd-nut">${i ? '<button type="button" class="btn phu hd-lui">Quay lại</button>' : ''}<button type="button" class="btn hd-tiep">${cuoi ? 'Bắt đầu dùng' : 'Tiếp'}</button></div>
      </div>`;
      lop.querySelector('.hd-tiep').focus();
    };
    const dong = () => { ghiDaXem(); try { window.amDungDoc ? window.amDungDoc() : speechSynthesis.cancel(); } catch { /* bỏ qua */ } lop.remove(); };
    lop.addEventListener('click', e => {
      if (e.target.closest('.hd-bo')) dong();
      else if (e.target.closest('.hd-tiep')) { if (i === BUOC.length - 1) dong(); else { i++; ve(); } }
      else if (e.target.closest('.hd-lui')) { i--; ve(); }
      else if (e.target.closest('.hd-nghe')) doc(BUOC[i].doc);
    });
    lop.addEventListener('keydown', e => { if (e.key === 'Escape') dong(); });
    ve();
  }
  window.moHuongDan = mo;

  const trang = location.pathname.split('/').pop();
  // Lần đầu vào màn Hàng
  const thu = () => { if (trang === 'hang.html' && (location.hash === '#hang' || !location.hash) && !daXem()) setTimeout(mo, 500); };
  thu(); window.addEventListener('hashchange', thu);
  // Nút xem lại trong mục Tôi
  const menuToi = document.querySelector('#toi nav.menu');
  if (menuToi && !document.getElementById('hd-xem-lai')) menuToi.insertAdjacentHTML('afterbegin', '<button type="button" id="hd-tung-buoc" onclick="window.moChonTour && moChonTour()"><span class="ic-menu bg-la"><img src="assets/ic-kiem.svg" alt=""></span><span class="grow"><strong>Hướng dẫn từng bước</strong><span class="small muted" style="display:block">App chỉ nút, bạn bấm thật</span></span><svg class="i chevron"><use href="#i-tiep"/></svg></button><button type="button" id="hd-xem-lai"><span class="ic-menu bg-cho"><img src="assets/ic-loa.svg" alt=""></span><span class="grow"><strong>Xem hướng dẫn dùng app</strong></span><svg class="i chevron"><use href="#i-tiep"/></svg></button>');
  document.getElementById('hd-xem-lai')?.addEventListener('click', mo);
})();
