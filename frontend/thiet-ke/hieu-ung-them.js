/* Hiệu ứng bổ sung AgiViet (thu hoạch 01/11/2026 từ bản mẫu app bán thiet-ke/mau). Đi cùng hieu-ung-app.js + hieu-ung-them.css.
   Nguyên tắc như bộ cũ: hiệu ứng chỉ phản ánh việc đã xảy ra, không tự đổi trạng thái; bật "giảm chuyển động" thì đổi ngay. */
(function () {
  const giam = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const E = 'cubic-bezier(.23,1,.32,1)';
  const TICK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';

  const HT = {
    /* Chuyển màn kiểu app: màn mới trượt vào từ phải, màn cũ lùi 24% và tối nhẹ; lùi thì ngược lại.
       khung: phần tử chứa (position:relative; overflow:hidden), các màn position:absolute; inset:0.
       Trả Promise khi xong; tự xóa màn cũ. */
    chuyenMan(khung, moi, huong = 'toi', ms = 340) {
      const cu = khung.lastElementChild;
      if (huong === 'lui' && cu) khung.insertBefore(moi, cu); else khung.appendChild(moi);
      if (!cu || cu === moi || giam()) { if (cu && cu !== moi) cu.remove(); return Promise.resolve(); }
      const a = huong === 'toi'
        ? [moi.animate([{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: ms, easing: E }),
           cu.animate([{ transform: 'none', filter: 'brightness(1)' }, { transform: 'translateX(-24%)', filter: 'brightness(.9)' }], { duration: ms, easing: E, fill: 'forwards' })]
        : [moi.animate([{ transform: 'translateX(-24%)', filter: 'brightness(.9)' }, { transform: 'none', filter: 'brightness(1)' }], { duration: ms, easing: E }),
           cu.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: ms, easing: E, fill: 'forwards' })];
      return Promise.all(a.map((x) => x.finished)).then(() => cu.remove());
    },

    /* Các khối trong màn hiện lần lượt từ dưới lên (dùng khi vào màn). */
    hienLanLuot(ds, buoc = 40) {
      if (giam()) return Promise.resolve();
      return Promise.all([...ds].map((el, i) => el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * buoc, easing: E, fill: 'backwards' }).finished));
    },

    /* Mở tấm (bottom sheet) trong host. Trả hàm đóng. Escape / bấm nền / [data-dong] để đóng. */
    moTam(host, html, gan) {
      const n = document.createElement('div'); n.className = 'hu-che';
      n.innerHTML = `<div class="hu-tam" role="dialog" aria-modal="true"><div class="hu-tam-tay"></div>${html}</div>`;
      const truoc = document.activeElement;
      const dong = () => {
        removeEventListener('keydown', phim);
        const xong = () => { n.remove(); truoc?.focus?.(); };
        if (giam()) return xong();
        n.querySelector('.hu-tam').animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: 220, easing: 'ease-in' });
        n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).onfinish = xong;
      };
      const phim = (e) => { if (e.key === 'Escape') dong(); };
      addEventListener('keydown', phim);
      n.addEventListener('click', (e) => { if (e.target === n || e.target.closest('[data-dong]')) dong(); });
      host.appendChild(n); gan?.(n, dong);
      n.querySelector('button, input, [tabindex]')?.focus();
      return dong;
    },

    /* Thông báo rơi từ trên xuống (2,6 giây). */
    thongBaoRoi(host, chu) {
      host.querySelector('.hu-toast-roi')?.remove();
      const t = document.createElement('div'); t.className = 'hu-toast-roi'; t.setAttribute('role', 'status');
      t.innerHTML = TICK + '<span></span>'; t.querySelector('span').textContent = chu;
      host.appendChild(t); setTimeout(() => t.remove(), 2700);
    },

    /* Nút xác nhận: chấm chờ → dấu tích + chữ, rồi chạy tiếp. Cần hieu-ung-app.js (HieuUng.dangGui/thanhCong).
       Gọi SAU khi việc thật đã xong (vd. máy chủ trả về). */
    async nutXong(btn, chu = 'Đã lưu', choMs = 550) {
      const HU = window.HieuUng; if (!HU || !btn) return;
      HU.dangGui(btn);
      await new Promise((r) => setTimeout(r, choMs));
      await HU.thanhCong(btn, chu);
      await new Promise((r) => setTimeout(r, 350));
    },

    /* Bên kia "đang gõ…" trong khung chat; trả hàm tắt. */
    dangGo(khungChat, lop = '') {
      const g = document.createElement('div'); g.className = lop; g.setAttribute('aria-label', 'Bên kia đang gõ');
      g.innerHTML = '<span class="hu-cham"><i></i><i></i><i></i></span>';
      khungChat.appendChild(g); return () => g.remove();
    },

    /* Rung phần tử một lần khi bị chặn. */
    rung(el) { if (giam()) return; el.classList.remove('hu-rung-ngang'); void el.offsetWidth; el.classList.add('hu-rung-ngang'); },
  };
  window.HieuUngThem = HT;
})();
