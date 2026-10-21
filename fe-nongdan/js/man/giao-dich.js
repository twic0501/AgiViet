// Ký hợp đồng cọc khi xác nhận đơn: cách giao dịch → lượng hứa → tóm tắt → (quyền, bản đầy đủ) → mã OTP hoặc ký giấy → xong.
// Bước cuối chạy bước "xác nhận đơn" của nghiệp vụ: giữ lượng, tính cọc và phí. Lựa chọn giữa chừng nằm trong bản nháp.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const NHAP_KY = { thanhToan: 'dam_bao', chacChan: false, daNghe: false, daHieuGia: false, nguoiChung: '', anhGiay: [] };
  const don = c => c.so.don.find(d => d.ma === c.ts('ma') && d.ban.id === c.n.id);
  const donCho = c => { const d = don(c); return d && d.trangThai === 'cho_ban_xac_nhan' ? d : undefined; };
  const ky = (c, d) => c.nhap(`ky.${d.ma}`, NHAP_KY);
  const BUOC = ['phuong-thuc', 'chon-luong', 'ky', 'ky-otp'];
  const tienTrinh = id => { const i = BUOC.indexOf(id); return i < 0 ? '' : U.tienTrinh((i + 1) / BUOC.length, `Bước ${i + 1} trên ${BUOC.length}`); };
  const daXacNhan = c => { const d = don(c); return d ? h`${U.bao(`Đơn ${d.ma} không còn chờ bạn xác nhận.`)}${U.nut('Mở chi tiết đơn', { den: AM.den('chi-tiet-don', { ma: d.ma }) })}` : U.trong('Không tìm thấy đơn'); };
  const denMa = (c, man) => AM.den(man, { ma: c.ts('ma') });

  /** Số liệu cọc, phí theo giá tính cọc của hợp đồng (không thấp hơn giá sàn theo giá tham khảo). */
  const soLieu = (d, so) => NV.soLieuCoc(d, so);
  /** Toàn văn hợp đồng cọc: dùng chung với app mua (nghiệp vụ sinh). */
  const banThoaThuan = (d, so, thanhToan) => NV.banHopDong(d, so, thanhToan);
  /** Đơn giá bất thường: phải bật xác nhận đã hiểu trước khi ký; tham số gửi kèm bước xác nhận đơn. */
  const thamSoKy = (c, d) => (d.hopDong?.giaBatThuong ? [true] : []);
  const chuaHieuGia = (c, d) => d.hopDong?.giaBatThuong && !ky(c, d).gt.daHieuGia;
  const QUYEN = [
    'Bạn hứa giao đúng lượng, đúng loại, đúng ngày. Không đủ thì đề nghị giảm lượng hoặc dời ngày trước khi giao.',
    'Số điện thoại và địa chỉ của bạn chỉ mở cho bên mua sau khi họ đặt cọc.',
    'Tiền cọc nằm ở tài khoản đảm bảo, không ai rút ngang được.',
    'Số cân do bên mua nhập; bạn có quyền bấm "Không đúng" và gửi ảnh cân của mình.',
    'Bên mua chậm trả: bạn mở đối soát, app lưu mọi chứng từ.',
    'Hàng được nghiệm thu theo loại ghi trong hợp đồng. Bên mua trả lại vượt mức cho phép thì phải gửi ảnh; phần đạt loại dưới tính giá hạ cấp nếu hợp đồng có.',
    'Hàng bị trả lại là của bạn: app giúp đưa thành lô bán gấp, báo nhà máy chế biến và đối tác bao tiêu.',
    'Hợp đồng chỉ được app bảo vệ khi cọc đi qua tài khoản đảm bảo. Tiền trả ngoài app, giá ghi khác giá thật thì app không bảo vệ.',
    'Bạn không trả phí cho đơn này.',
  ];

  AM.man('phuong-thuc', {
    ve(c) {
      const d = donCho(c);
      if (!d) return daXacNhan(c);
      const n = ky(c, d).gt, s = soLieu(d, c.so);
      return {
        than: h`${tienTrinh('phuong-thuc')}<span class="muted">Đơn ${d.ma} · ${d.mua.ten}</span>
          ${U.chon(c, { n: `ky.${d.ma}:thanhToan`, lua: [['dam_bao', 'Thanh toán đảm bảo'], ['truc_tiep', 'Tự giao dịch']] })}
          ${n.thanhToan === 'dam_bao' ? U.bao('Nên chọn. Bên mua chuyển tiền vào tài khoản đảm bảo, ngân hàng tự chuyển cho bạn. Không lo bên mua "quên" trả.', 'tot') : U.bao('Bên mua trả thẳng cho bạn rồi ghi trên app. Bạn phải tự kiểm sổ ngân hàng và bấm xác nhận. Cọc vẫn qua tài khoản đảm bảo.', 'vang')}
          ${U.the(h`${U.dong2(`Phí ${s.quen ? 'mối quen' : 'giới thiệu'}`, U.dong(s.phi))}${U.dong2('Ai trả phí', 'Bên mua, khi đặt cọc')}${U.dong2('Bạn trả', '0 đ')}`)}`,
        duoi: U.nut('Tiếp tục', { den: denMa(c, 'chon-luong') }),
      };
    },
  });

  AM.man('chon-luong', {
    ve(c) {
      const d = donCho(c);
      if (!d) return daXacNhan(c);
      const n = ky(c, d).gt, lo = c.so.lo.find(l => l.id === d.loId), con = lo ? NV.conBan(lo) : 0;
      return {
        than: h`${tienTrinh('chon-luong')}
          ${U.the(h`<span class="muted">Bên mua đặt</span><strong class="so-lon">${U.luong(d.kg)}</strong>${U.dong2('Lô còn bán được', U.luong(con))}${U.dong2('Sau khi hứa còn', U.luong(Math.max(0, con - d.kg)))}`, { lop: 'noi' })}
          ${d.kg > con ? U.bao('Lô không còn đủ. Quay lại từ chối, hoặc nhắn bên mua giảm lượng.', 'loi') : ''}
          ${lo?.coSo === 'uoc_tinh' ? U.bao('Lượng lô đang là ước tính. Hứa nhiều hơn số hái được thì phải đề nghị giảm sau, ảnh hưởng uy tín "giao đủ".', 'vang') : ''}
          ${U.congTac(c, { n: `ky.${d.ma}:chacChan`, nhan: `Tôi chắc chắn giao được ${U.luong(d.kg)} vào ngày ${U.nd(d.ngayGiao)}` })}
          <span class="small muted">Muốn hứa ít hơn: từ chối đơn này và nhắn bên mua tạo đơn với lượng bạn chắc chắn.</span>`,
        duoi: U.nut('Tiếp tục', { den: n.chacChan && d.kg <= con ? denMa(c, 'ky') : undefined, bam: n.chacChan && d.kg <= con ? undefined : 'chuaChac' }),
      };
    },
    bam: { chuaChac: c => c.bao('Bật "Tôi chắc chắn giao được" trước khi ký.', 'loi') },
  });

  AM.man('ky', {
    ve(c) {
      const d = donCho(c);
      if (!d) return daXacNhan(c);
      const n = ky(c, d).gt, s = soLieu(d, c.so);
      const tomTat = `Bạn bán ${U.luong(d.kg)} ${d.tenLo} cho ${d.mua.ten}, giá ${U.so(d.gia)} đồng một ký, tổng ${U.so(s.giaTri)} đồng, giao ngày ${U.nd(d.ngayGiao)}. Bên mua cọc ${U.so(s.coc)} đồng trong ${s.hanCocGio} giờ. ${n.thanhToan === 'dam_bao' ? 'Tiền còn lại qua tài khoản đảm bảo.' : 'Tiền còn lại bên mua trả trực tiếp.'} Bạn không trả phí.`;
      return {
        than: h`${tienTrinh('ky')}
          ${U.the(h`${U.dong2('Hàng', d.tenLo)}${U.dong2('Lượng', U.luong(d.kg))}${U.dong2('Giá', `${U.so(d.gia)} đ/kg`)}${U.dong2('Tổng', U.dong(s.giaTri))}${U.dong2('Giao', U.nd(d.ngayGiao))}${U.dong2('Cọc', `${U.dong(s.coc)} trong ${s.hanCocGio} giờ`)}${U.dong2('Thanh toán', n.thanhToan === 'dam_bao' ? 'Đảm bảo' : 'Trực tiếp')}`, { lop: 'noi' })}
          ${d.hopDong?.giaBatThuong ? U.the(h`<strong>Giá thấp bất thường</strong><span class="small">Giá ${U.so(d.gia)} đ/kg thấp hơn nhiều so với giá tham khảo ${U.so(d.hopDong.giaThamKhao)} đ/kg. Cọc vẫn tính trên ${U.so(s.giaTinhCoc)} đ/kg. Nếu bên mua hứa trả thêm ngoài app, phần đó không được tài khoản đảm bảo bảo vệ, không vào bảng kê, không tính uy tín.</span>
            ${U.congTac(c, { n: `ky.${d.ma}:daHieuGia`, nhan: 'Tôi hiểu, vẫn bán đúng giá ghi trên đơn' })}`, { vien: 'loi' }) : ''}
          ${s.giaTinhCoc !== d.gia ? h`<span class="small muted">Giá tính cọc ${U.so(s.giaTinhCoc)} đ/kg (không thấp hơn ${Math.round((c.so.chinhSach.tyLeGiaTinhCoc ?? 0.7) * 100)}% giá tham khảo): khai giá thấp không làm giảm cọc.</span>` : ''}
          ${U.bao('Hợp đồng cọc chỉ có hiệu lực và được app bảo vệ khi bên mua cọc qua tài khoản đảm bảo. Giao dịch ngoài app hai bên tự chịu.')}
          ${U.nghe(tomTat, 'Nghe tóm tắt')}
          <div class="grid2">${U.nut('Quyền và trách nhiệm', { den: denMa(c, 'quyen'), kieu: 'phu', nho: true })}${U.nut('Bản đầy đủ', { den: denMa(c, 'ban-day-du'), kieu: 'phu', nho: true })}</div>
          ${U.nut('Hỏi hỗ trợ trước khi ký', { den: AM.den('can-ho-tro', { don: d.ma }), kieu: 'phu', nho: true, icon: 'help' })}
          ${n.daNghe ? U.chip(`Đã nghe hết bản đầy đủ${n.nguoiChung ? ` · làm chứng: ${n.nguoiChung}` : ''}`, 'xong') : ''}`,
        duoi: h`${U.nut('Đồng ý, ký bằng mã', chuaHieuGia(c, d) ? { bam: 'chuaHieu', icon: 'signature' } : { den: denMa(c, 'ky-otp'), icon: 'signature' })}<div class="grid2">${U.nut('Chưa đồng ý', { den: AM.den('xac-nhan-don', { ma: d.ma }), kieu: 'phu' })}${U.nut('Ký trên giấy', { den: denMa(c, 'ky-giay'), kieu: 'phu' })}</div>`,
      };
    },
    bam: { chuaHieu: c => c.bao('Đọc cảnh báo giá thấp bất thường và bật "Tôi hiểu" trước khi ký.', 'loi') },
  });

  AM.man('quyen', {
    ve: c => h`<ul class="stack" style="padding-left:20px;margin:0">${QUYEN.map(q => h`<li>${q}</li>`)}</ul>${U.nghe(QUYEN.join(' '))}${c.ts('ma') ? U.nut('Về hợp đồng', { den: denMa(c, 'ky'), kieu: 'phu' }) : ''}`,
  });

  AM.man('ban-day-du', {
    ve(c) {
      const d = don(c);
      if (!d) return U.trong('Không tìm thấy đơn');
      const ban = banThoaThuan(d, c.so, ky(c, d).gt.thanhToan);
      return h`${U.the(h`<div class="van-ban">${ban.map((p, i) => (i === 0 ? h`<strong class="h2">${p}</strong>` : h`<p>${p}</p>`))}</div>`)}
        ${U.nghe(ban.join('. '), 'Nghe cả bản')}
        ${U.congTac(c, { n: `ky.${d.ma}:daNghe`, nhan: 'Tôi đã nghe (đọc) hết hợp đồng cọc' })}
        ${U.o(c, { n: `ky.${d.ma}:nguoiChung`, nhan: 'Người làm chứng (không bắt buộc)', ph: 'Út Tâm, con gái' })}
        ${d.trangThai === 'cho_ban_xac_nhan' ? U.nut('Về hợp đồng', { den: denMa(c, 'ky') }) : ''}`;
    },
  });

  AM.man('ky-otp', {
    st: () => ({ ma: '', loi: '' }),
    ve(c) {
      const d = donCho(c);
      if (!d) return daXacNhan(c);
      return {
        than: h`${tienTrinh('ky-otp')}<p>Mã gồm 6 số đã gửi tới ${String(c.hs.sdt).replace(/\d(?=\d{3})/g, '•')}. Không đưa mã cho ai, kể cả người tự xưng nhân viên AgiViet.</p>
          <label class="truong"><span class="label">Mã xác nhận</span><span class="o-nhap ${c.st.loi ? 'co-loi' : ''}"><input class="lon" inputmode="numeric" maxlength="6" data-st="ma" value="${c.st.ma}" placeholder="••••••"></span>${c.st.loi ? h`<span class="loi-chu">${c.st.loi}</span>` : h`<span class="xs muted">Bản mô phỏng: 123456</span>`}</label>
          ${U.nut('Gọi đọc mã cho tôi', { bam: 'dien', kieu: 'phu', nho: true, icon: 'call' })}`,
        duoi: U.nut('Ký và xác nhận đơn', { bam: 'ky' }),
      };
    },
    bam: {
      dien(c) { window.amDoc?.('Mã của bạn là 1, 2, 3, 4, 5, 6'); c.dat({ ma: '123456', loi: '' }); },
      ky(c) {
        if (String(c.st.ma).replace(/\D/g, '') !== '123456') return c.dat({ loi: 'Mã không đúng. Mã mô phỏng là 123456.' });
        const d = donCho(c);
        if (chuaHieuGia(c, d)) return c.bao('Giá thấp bất thường: quay lại bước ký, bật "Tôi hiểu" rồi ký.', 'loi');
        const kq = c.lam({ loai: 'buoc_don', ma: d.ma, buoc: 'xacNhanDon', thamSo: thamSoKy(c, d) }, { den: ['ky-xong', { ma: d.ma }] });
        if (kq.ok) { c.dat({ ma: '' }, false); ky(c, d).xoa(); }
      },
    },
  });

  AM.man('ky-xong', {
    ve(c) {
      const d = don(c);
      if (!d) return U.trong('Không tìm thấy đơn');
      if (!d.coc) return daXacNhan(c);
      const lo = c.so.lo.find(l => l.id === d.loId);
      return {
        dau: false,
        than: h`<div class="an-mung-moi">${U.icon('done', 52)}<strong class="so-lon" style="font-size:26px">Đã ký và xác nhận đơn</strong><span>${d.ma} · ${U.luong(d.kg)} cho ${d.mua.ten}</span></div>
          ${U.the(h`<strong>Bước tiếp: chờ bên mua đặt cọc</strong>${U.dong2('Cọc', U.dong(d.coc.so))}${U.dong2('Hạn', U.gioNgay(d.coc.han))}<span class="small">Cọc vào tài khoản đảm bảo thì app báo bạn và mở số điện thoại hai bên. Quá hạn thì đơn tự đóng, ${U.luong(d.kg)} trả về lô.</span>`)}
          <span class="small muted">Lô ${lo?.ten} đã giữ ${U.luong(d.kg)} cho đơn này.</span>`,
        duoi: U.nut('Xem đơn', { den: AM.den('chi-tiet-don', { ma: d.ma }) }),
      };
    },
  });

  AM.man('ky-giay', {
    ve(c) {
      const d = donCho(c);
      if (!d) return daXacNhan(c);
      const n = ky(c, d).gt;
      return {
        than: h`<p class="muted">Dành cho người quen ký tay hoặc cần đóng dấu hợp tác xã. In hợp đồng cọc, ký từng trang, rồi chụp lại.</p>
          ${U.nut('Tải bản in', { bam: 'tai', kieu: 'phu', icon: 'export' })}
          ${n.anhGiay.map((a, i) => U.dong2(`Trang ${i + 1}`, a))}
          <label class="btn phu nho">${U.icon('camera', 22)}Chụp trang ${n.anhGiay.length + 1}<input type="file" accept="image/*" capture="environment" class="sr-only" data-trang></label>`,
        duoi: U.nut('Gửi bản đã ký', { bam: 'gui', tat: !n.anhGiay.length }),
      };
    },
    sau(c, el) {
      el.querySelector('input[data-trang]')?.addEventListener('change', e => { const t = e.target.files?.[0]?.name, d = donCho(c); if (t && d) { const n = ky(c, d); n.dat({ anhGiay: [...n.gt.anhGiay, t] }); } });
    },
    bam: {
      tai(c) {
        const d = donCho(c), a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([`${banThoaThuan(d, c.so, ky(c, d).gt.thanhToan).join('\n\n')}\n\n\nBên bán ký, ghi rõ họ tên:\n\n\nBên mua ký, ghi rõ họ tên:\n`], { type: 'text/plain;charset=utf-8' }));
        a.download = `Hop-dong-coc-${d.ma}.txt`; a.click();
      },
      gui(c) { const d = donCho(c); if (chuaHieuGia(c, d)) return c.bao('Giá thấp bất thường: bật "Tôi hiểu" ở bước ký trước.', 'loi'); const kq = c.lam({ loai: 'buoc_don', ma: d.ma, buoc: 'xacNhanDon', thamSo: thamSoKy(c, d) }, { bao: 'Đã gửi bản ký giấy và xác nhận đơn.', den: ['ky-xong', { ma: d.ma }] }); if (kq.ok) ky(c, d).xoa(); },
    },
  });
})();
