// Hướng dẫn lần đầu vào app Thu mua: 5 bước, tự hiện lần đầu; nút "?" trên thanh trên để xem lại.
(() => {
  const BUOC = [
    { tour: 'nhu-cau', ic: 'nhu-cau', tieu: 'Tạo nhu cầu mua', chu: 'Ghi mặt hàng, quy cách, lượng, ngày giao. Người bán phù hợp sẽ thấy và chào hàng. Lưu nháp không tính lượt; sửa tin cũ không tính lượt.', link: ['nhu-cau.html#tao-nhu-cau', 'Tạo nhu cầu'] },
    { tour: 'nguon', ic: 'nguon', tieu: 'Tìm nguồn, kết nối, hỏi giá', chu: 'Lọc lô theo mặt hàng, lịch, khoảng cách. Mỗi lời mời hoặc hỏi giá riêng <b>tạm giữ 1 lượt</b>; người bán từ chối hay hết hạn thì trả lại lượt. Người bán tự chào bạn thì không tính lượt.', link: ['nguon-hang.html#nguon-hang', 'Xem nguồn hàng'] },
    { ic: 'bao-gia', tieu: 'So báo giá, chốt đơn', chu: 'So <b>tổng chi phí nhận hàng</b>, không chỉ giá. Chốt thành đơn (tối đa 90 ngày). <b>Tự giao dịch</b> miễn phí vẫn có đơn, ghi cân, lưu bằng chứng; <b>dịch vụ hỗ trợ</b> là tự chọn, có giá riêng.', link: ['bao-gia.html#bao-gia', 'Xem báo giá'] },
    { tour: 'tra-tien', ic: 'don', tieu: 'Nhận hàng, công nợ', chu: 'Nhập kết quả cân, đo; số của bạn là <b>tự khai</b> tới khi người bán xác nhận. Ghi thanh toán theo đúng tài khoản đang hiện; tài khoản vừa đổi sẽ có cảnh báo.', link: ['don-hang.html#don-hang', 'Xem đơn'] },
    { ic: 'vuong-mien', tieu: 'Miễn phí hay Business', chu: 'Miễn phí: 5 kết nối, 5 tin mua mỗi tháng, 1 tài khoản. Business: 50 kết nối, 30 tin, 3 tài khoản, kế hoạch mua, mối quen, công nợ, ưu đãi 0,3% khi tự chọn hỗ trợ.', link: ['goi.html#so-sanh-goi', 'So sánh gói'] },
  ];
  const KHOA = 'tm.da-xem-hd';
  const daXem = () => { try { return localStorage.getItem(KHOA) === '1'; } catch { return true; } };
  function mo() {
    if (document.getElementById('hd-lop')) return;
    let i = 0;
    const lop = document.createElement('div');
    lop.id = 'hd-lop'; lop.className = 'hd-lop'; lop.setAttribute('role', 'dialog'); lop.setAttribute('aria-modal', 'true'); lop.setAttribute('aria-label', 'Hướng dẫn dùng app Thu mua');
    document.body.appendChild(lop);
    const ve = () => {
      const b = BUOC[i], cuoi = i === BUOC.length - 1;
      lop.innerHTML = `<div class="hd-the card">
        <div class="hang giua"><span class="nho muted dam">Bắt đầu với AgiViet Thu mua · ${i + 1}/${BUOC.length}</span><button type="button" class="btn nhe nho hd-bo">Bỏ qua</button></div>
        <div class="hd-buoc">${BUOC.map((x, k) => `<span class="${k === i ? 'on' : k < i ? 'xong' : ''}"><svg class="i i18"><use href="#i-${x.ic}"/></svg>${x.tieu}</span>`).join('')}</div>
        <div class="hd-noi"><span class="hd-ic"><svg class="i"><use href="#i-${b.ic}"/></svg></span><div class="cot g8"><h2>${b.tieu}</h2><p>${b.chu}</p><div class="hang boc" style="gap:12px"><a class="nho dam" href="${b.link[0]}">${b.link[1]} →</a>${b.tour ? `<button type="button" class="btn nho" data-tour-mo="${b.tour}">Làm thử từng bước</button>` : ""}</div></div></div>
        <div class="hang" style="justify-content:flex-end;gap:8px">${i ? '<button type="button" class="btn phu hd-lui">Quay lại</button>' : ''}<button type="button" class="btn hd-tiep">${cuoi ? 'Bắt đầu' : 'Tiếp'}</button></div>
      </div>`;
      lop.querySelector('.hd-tiep').focus();
    };
    const dong = () => { try { localStorage.setItem(KHOA, '1'); } catch { /* bỏ qua */ } lop.remove(); };
    lop.addEventListener('click', e => {
      if (e.target === lop || e.target.closest('.hd-bo')) dong();
      else if (e.target.closest('.hd-tiep')) { if (i === BUOC.length - 1) dong(); else { i++; ve(); } }
      else if (e.target.closest('.hd-lui')) { i--; ve(); }
      else if (e.target.closest('.hd-noi a')) dong();
    });
    lop.addEventListener('keydown', e => { if (e.key === 'Escape') dong(); });
    ve();
  }
  window.moHuongDan = mo;
  // Nút "?" trên thanh trên
  const thanh = document.querySelector('.topbar .gian');
  if (thanh && !document.getElementById('hd-mo')) thanh.insertAdjacentHTML('afterend', '<button class="nut-tron" type="button" id="hd-mo" aria-label="Hướng dẫn dùng app" title="Hướng dẫn dùng app"><svg class="i"><use href="#i-thong-tin"/></svg></button>');
  document.getElementById('hd-mo')?.addEventListener('click', mo);
  // Lần đầu: hiện sau khi trang (và hộp đăng nhập nếu có) sẵn sàng
  if (!daXem()) setTimeout(() => { if (!document.querySelector('.hop-nen')) mo(); }, 700);
})();
