// Hướng dẫn lần đầu vào app Nhà sản xuất: 5 thẻ lớn, hình trước chữ, bấm Nghe để nghe đọc.
// Tự hiện lần đầu vào màn Hôm nay; xem lại ở mục Tôi (nút "Xem hướng dẫn dùng app", gọi window.moHuongDan). Đã xem lưu ở localStorage "am.da-xem-hd".
(() => {
  const BUOC = [
    { hinh: 'assets/ic-camera.svg', phu: 'assets/ic-mic.svg', tieu: 'Đăng hàng', chu: 'Bấm nút <b>+</b> ở giữa thanh dưới. Chụp ảnh hàng, hoặc bấm micro và nói: “Xoài cát Chu 10 tấn, giá 25 nghìn”.', doc: 'Đăng hàng. Bấm nút cộng ở giữa thanh dưới. Chụp ảnh hàng, hoặc bấm micro và nói, ví dụ: xoài cát Chu 10 tấn, giá 25 nghìn.' },
    { hinh: 'assets/ic-khach.svg', tieu: 'Khách hỏi mua', chu: 'Bên mua muốn kết nối hiện ở mục <b>Bán</b>. Bạn thấy tên, vùng, uy tín của họ. Số điện thoại hai bên chỉ mở khi bên mua <b>đặt cọc</b>.', doc: 'Khách hỏi mua. Bên mua muốn kết nối hiện ở mục Bán. Bạn thấy tên, vùng, uy tín của họ. Số điện thoại hai bên chỉ mở khi bên mua đặt cọc.' },
    { hinh: 'assets/ic-can.svg', tieu: 'Chốt đơn, giao hàng', chu: 'Bạn xác nhận đơn và ký bằng mã. Bên mua cọc 10% vào <b>tài khoản đảm bảo</b> của ngân hàng. Khi cân, bạn bấm <b>Đúng</b> hoặc <b>Không đúng</b>.', doc: 'Chốt đơn, giao hàng. Bạn xác nhận đơn và ký bằng mã. Bên mua cọc mười phần trăm vào tài khoản đảm bảo của ngân hàng. Khi cân, bạn bấm Đúng hoặc Không đúng.' },
    { hinh: 'assets/ic-tien.svg', tieu: 'Tiền hàng', chu: 'Tiền qua tài khoản đảm bảo tự về tài khoản của bạn. Bên mua trả thẳng thì xem sổ ngân hàng trước, rồi mới bấm <b>Đã nhận đủ</b>. Bạn không trả phí.', doc: 'Tiền hàng. Tiền qua tài khoản đảm bảo tự về tài khoản của bạn. Bên mua trả thẳng thì xem sổ ngân hàng trước, rồi mới bấm đã nhận đủ. Bạn không trả phí.' },
    { hinh: 'assets/ic-loa.svg', tieu: 'Cần giúp?', chu: 'Màn nào cũng có nút <b>Nghe</b> để app đọc cho bạn. Gặp chuyện lạ thì vào Tôi, bấm <b>Trung tâm hỗ trợ</b>. Không đọc mã OTP cho ai.', doc: 'Cần giúp? Màn nào cũng có nút Nghe để app đọc cho bạn. Gặp chuyện lạ thì vào Tôi, bấm Trung tâm hỗ trợ. Không đọc mã OTP cho ai.' },
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
        <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="nghe hd-nghe"><img src="assets/ic-loa.svg" alt="">Nghe</button></div>
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
  // Lần đầu vào màn Hôm nay
  const thu = () => { if (trang === 'hom-nay.html' && (location.hash === '#hom-nay' || !location.hash) && !daXem()) setTimeout(mo, 500); };
  thu(); window.addEventListener('hashchange', thu);
})();
