// Bắt đầu: chào mừng, đăng ký / đăng nhập bằng số điện thoại (mã mô phỏng 123456), cách bán, mặt hàng, hồ sơ, vườn, xác minh.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;
  const MA = '123456';
  const SDT_MAU = '0918 234 421';
  const NHAP = { sdt: '', dangNhap: false, cachBan: 'ho', matHang: [], ten: '', vung: '' };
  const dk = c => c.nhap('dang-ky', NHAP);
  const chuSo = s => String(s).replace(/\D/g, '');
  const tenTep = v => String(v || '').split(/[\\/]/).pop();

  AM.man('chao-mung', {
    ve: c => ({
      dau: false,
      than: h`<div class="stack" style="align-items:center;text-align:center;padding-top:28px">
          <img src="assets/mark.svg" alt="" style="width:88px;height:88px">
          <strong class="so-lon" style="font-size:34px">AgiViet</strong>
          <p class="h2" style="color:var(--reu)">Tìm đúng mối, chốt đúng giá</p>
          <p class="muted">Sổ làm vườn trong điện thoại. Tới mùa, đăng bán cho nhà máy, doanh nghiệp; tiền đi qua tài khoản đảm bảo của ngân hàng.</p>
        </div>
        ${U.the(h`<div class="row">${U.icon('shield', 28)}<span>Người bán dùng miễn phí. Số điện thoại, địa chỉ nhà chỉ hiện cho bên mua khi họ đã đặt cọc.</span></div>`)}
        ${c.n ? U.bao(h`Máy này đang đăng nhập: <strong>${c.n.ten}</strong>.`, 'tot') : ''}`,
      duoi: h`${c.n ? U.nut('Vào app', { den: 'hom-nay.html' }) : ''}
        ${U.nut('Bắt đầu', { bam: 'batDau', kieu: c.n ? 'phu' : '' })}
        ${U.nut('Tôi đã có tài khoản', { bam: 'coTaiKhoan', kieu: 'phu' })}`,
    }),
    bam: {
      batDau: c => { dk(c).dat({ ...NHAP }, false); c.di('dang-nhap'); },
      coTaiKhoan: c => { dk(c).dat({ ...NHAP, dangNhap: true, sdt: SDT_MAU }, false); c.di('dang-nhap'); },
    },
  });

  AM.man('dang-nhap', {
    ten: c => (dk(c).gt.dangNhap ? 'Đăng nhập' : 'Số điện thoại'),
    st: c => ({ sdt: dk(c).gt.sdt, loi: '' }),
    ve(c) {
      const n = dk(c).gt;
      return {
        than: h`<p class="muted">${n.dangNhap ? 'Nhập số điện thoại đã đăng ký. App gửi mã 6 số để đăng nhập.' : 'Nhập số điện thoại của bạn. App gửi mã 6 số để xác nhận đúng là bạn.'}</p>
          ${U.o(c, { k: 'sdt', nhan: 'Số điện thoại', kieu: 'sdt', ph: SDT_MAU, loi: c.st.loi })}
          ${U.bao(h`Bản mô phỏng: không gửi tin nhắn thật, mã luôn là <strong>${MA}</strong>. Tài khoản mẫu: chị Năm, số <strong>${SDT_MAU}</strong>.`, 'vang')}
          ${n.dangNhap ? '' : U.nut(`Dùng số mẫu ${SDT_MAU} (chị Năm)`, { bam: 'soMau', kieu: 'phu', nho: true })}`,
        duoi: h`${U.nut('Gửi mã', { bam: 'tiep' })}${U.nut('Không đăng nhập được? Trợ giúp', { den: '#tro-giup-truy-cap', kieu: 'phu' })}`,
      };
    },
    bam: {
      soMau: c => c.dat({ sdt: SDT_MAU, loi: '' }),
      tiep(c) {
        const s = chuSo(c.st.sdt);
        if (!/^0\d{9,10}$/.test(s)) return c.dat({ loi: 'Số điện thoại gồm 10 hoặc 11 chữ số, bắt đầu bằng 0.' });
        const co = c.so.nguoiDung.some(x => x.vai === 'ban' && chuSo(x.sdt) === s);
        if (dk(c).gt.dangNhap && !co) return c.dat({ loi: 'Số này chưa có tài khoản người bán. Quay lại, chọn Bắt đầu để đăng ký.' });
        c.dat({ loi: '' }, false);
        dk(c).dat({ sdt: s, dangNhap: co }, false);
        c.di('otp');
      },
    },
  });

  AM.man('otp', {
    st: () => ({ ma: '', loi: '' }),
    ve(c) {
      const sdt = dk(c).gt.sdt;
      if (!sdt) return U.trong('Chưa có số điện thoại', 'Nhập số điện thoại trước.', U.nut('Nhập số', { den: '#dang-nhap', nho: true }));
      return {
        than: h`<p class="muted">Nhập mã 6 số gửi tới <strong class="num">${sdt}</strong>.</p>
          <label class="truong"><span class="label">Mã xác nhận</span><span class="o-nhap ${c.st.loi ? 'co-loi' : ''}"><input class="lon" inputmode="numeric" maxlength="6" autocomplete="one-time-code" data-st="ma" value="${c.st.ma}" placeholder="••••••"></span>${c.st.loi ? h`<span class="loi-chu">${c.st.loi}</span>` : ''}</label>
          <div class="hang-nut">${U.nut('Điền mã mô phỏng', { bam: 'dien', kieu: 'phu', nho: true })}${U.nut('Gọi đọc mã cho tôi', { bam: 'goi', kieu: 'phu', nho: true, icon: 'call' })}</div>`,
        duoi: U.nut('Tiếp tục', { bam: 'tiep' }),
      };
    },
    bam: {
      dien: c => c.dat({ ma: MA, loi: '' }),
      goi: () => window.amDoc?.(`Mã của bạn là ${MA.split('').join(', ')}`),
      tiep(c) {
        if (chuSo(c.st.ma) !== MA) return c.dat({ loi: `Mã chưa đúng. Bản mô phỏng dùng mã ${MA}.` });
        c.dat({ ma: '', loi: '' }, false);
        const n = A.dangNhap('ban', dk(c).gt.sdt);
        if (n) { c.bao(`Chào ${n.ten}.`); location.href = 'hom-nay.html'; } else c.di('vai-tro');
      },
    },
  });

  const CACH = [
    ['ho', 'Hộ nhà vườn, trồng trọt', 'Trái cây, lúa, rau củ, cây công nghiệp', 'garden'],
    ['thuy_san', 'Nuôi trồng thủy sản', 'Tôm, cá, nghêu sò', 'pond'],
    ['htx', 'Hợp tác xã', 'Gộp hàng nhiều hộ, chia tiền theo phần', 'people'],
    ['to_hop', 'Tổ hợp tác', 'Vài hộ bán chung một lô', 'people'],
  ];
  AM.man('vai-tro', {
    ve: c => ({
      than: h`<p class="muted">Chọn cách bạn bán hàng. Đổi được sau trong Tôi.</p>
        ${CACH.map(([gt, ten, moTa, ic]) => h`<button type="button" class="lua-the" aria-pressed="${String(dk(c).gt.cachBan === gt)}" data-bam="_nhap" data-n="dang-ky:cachBan" data-v="${gt}">${U.icon(ic, 32)}<span class="stack" style="gap:2px"><strong>${ten}</strong><span class="small muted">${moTa}</span></span></button>`)}`,
      duoi: U.nut('Tiếp tục', { den: '#mat-hang' }),
    }),
  });

  AM.man('mat-hang', {
    ve(c) {
      const ds = dk(c).gt.matHang || [];
      return {
        than: h`<p class="muted">Chọn mặt hàng bạn trồng, nuôi. App ưu tiên báo tin cần mua đúng các mặt hàng này.</p>${U.chonMH(c, { n: 'dang-ky:matHang' })}`,
        duoi: h`${U.nut(ds.length ? `Tiếp tục (${ds.length} mặt hàng)` : 'Tiếp tục', { den: '#ho-so' })}${ds.length ? '' : U.nut('Bỏ qua, để sau', { den: '#ho-so', kieu: 'phu' })}`,
      };
    },
  });

  AM.man('ho-so', {
    st: () => ({ viTri: '' }),
    ve: c => ({
      than: h`${U.o(c, { n: 'dang-ky:ten', nhan: 'Tên của bạn (hoặc tên hợp tác xã)', ph: 'Ví dụ: Nguyễn Thị Năm' })}
        ${U.o(c, { n: 'dang-ky:vung', nhan: 'Xã, huyện, tỉnh', ph: 'Ví dụ: Mỹ Xương, Cao Lãnh, Đồng Tháp', goiY: 'Bên mua thấy vùng này. Số điện thoại, địa chỉ nhà chỉ hiện khi họ đã đặt cọc.' })}
        ${U.nut('Lấy vị trí đang đứng', { bam: 'viTri', kieu: 'phu', icon: 'pin' })}
        ${c.st.viTri ? U.bao(c.st.viTri) : ''}`,
      duoi: U.nut('Tạo tài khoản', { bam: 'tao' }),
    }),
    bam: {
      viTri(c) {
        if (!navigator.geolocation) return c.dat({ viTri: 'Máy không lấy được vị trí. Gõ xã, huyện, tỉnh.' });
        navigator.geolocation.getCurrentPosition(
          p => c.dat({ viTri: `Đã lấy vị trí (${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}). Ghi thêm tên xã, huyện để bên mua đọc được.` }),
          () => c.dat({ viTri: 'Chưa cho phép lấy vị trí. Gõ xã, huyện, tỉnh.' }));
      },
      tao(c) {
        const n = dk(c).gt;
        const nguoi = { vai: 'ban', id: A.maMoi('ban'), ten: (n.ten || '').trim() };
        const kq = A.lam(nguoi, { loai: 'dang_ky', vai: 'ban', ten: n.ten, sdt: n.sdt, vung: n.vung, loaiBan: n.cachBan === 'htx' ? 'htx' : n.cachBan === 'to_hop' ? 'to_hop' : 'ho' });
        if (!kq.ok) return c.bao(kq.loi, 'loi');
        A.datPhien('ban', nguoi);
        if (n.matHang?.length) A.lam(nguoi, { loai: 'cap_nhat_ho_so', matHang: n.matHang });
        c.bao('Đã tạo tài khoản.');
        c.di('khai-bao-vuon');
      },
    },
  });

  AM.man('khai-bao-vuon', {
    st: () => ({ ten: 'Vườn nhà', loaiVuon: 'vuon', dienTich: '', donVi: 'cong', cay: '', soGoc: '', namTrong: '', vu: '', haiDuKien: '' }),
    ve(c) {
      if (!c.n) return U.trong('Chưa có tài khoản', 'Đăng ký trước rồi khai vườn.', U.nut('Đăng ký', { den: '#chao-mung', nho: true }));
      const da = c.so.vuon.filter(v => v.ban.id === c.n.id);
      return {
        than: h`<p class="muted">Khai vườn, ao để ghi nhật ký và đăng bán có hồ sơ nguồn gốc. Bỏ qua được.</p>
          ${da.map(v => U.the(h`<strong>${v.ten}</strong><span class="small muted">${v.cay} · ${v.dienTich} ${v.donViDienTich === 'cong' ? 'công' : v.donViDienTich}</span>`))}
          ${U.the(h`${U.chon(c, { k: 'loaiVuon', nhan: 'Loại', lua: [['vuon', 'Vườn'], ['ao', 'Ao, đầm'], ['ruong', 'Ruộng']] })}
            ${U.o(c, { k: 'ten', nhan: 'Tên gọi' })}
            ${U.o(c, { k: 'cay', nhan: 'Cây trồng / con nuôi', ph: 'Xoài cát Chu' })}
            <div class="grid2">${U.o(c, { k: 'dienTich', nhan: 'Diện tích', kieu: 'so' })}${U.chon(c, { k: 'donVi', nhan: 'Đơn vị', lua: [['cong', 'công'], ['ha', 'ha'], ['m2', 'm²']] })}</div>
            <div class="grid2">${U.o(c, { k: 'soGoc', nhan: 'Số gốc (nếu có)', kieu: 'so' })}${U.o(c, { k: 'namTrong', nhan: 'Năm trồng', kieu: 'so' })}</div>
            ${U.o(c, { k: 'vu', nhan: 'Vụ đang làm (nếu có)', ph: 'Xoài vụ nghịch 2026', veLai: true })}
            ${c.st.vu ? U.o(c, { k: 'haiDuKien', nhan: 'Ngày hái dự kiến', kieu: 'ngay' }) : ''}
            ${U.nut('Lưu vườn này', { bam: 'luu', kieu: 'phu' })}`)}`,
        duoi: U.nut(da.length ? 'Tiếp tục' : 'Bỏ qua, khai sau', { den: '#xac-minh' }),
      };
    },
    bam: {
      luu(c) {
        const v = c.st;
        const kq = c.lam({ loai: 'them_vuon', ten: v.ten, loaiVuon: v.loaiVuon, dienTich: U.docSo(v.dienTich), donViDienTich: v.donVi, cay: v.cay, soGoc: U.docSo(v.soGoc) || 0, namTrong: U.docSo(v.namTrong) || 0 }, { bao: 'Đã lưu vườn.' });
        if (kq.ok && v.vu.trim() && v.haiDuKien) c.lam({ loai: 'them_mua_vu', vuonId: kq.ma, ten: v.vu, batDau: A.nv.ngayCua(c.bg), sanLuongUoc: 0, haiDuKien: v.haiDuKien });
        if (kq.ok) c.dat({ ten: 'Vườn thứ hai', dienTich: '', cay: '', soGoc: '', namTrong: '', vu: '', haiDuKien: '' });
      },
    },
  });

  AM.man('xac-minh', {
    st: () => ({ anh: '' }),
    ve(c) {
      if (!c.hs) return U.trong('Chưa có tài khoản', '', U.nut('Đăng ký', { den: '#chao-mung', nho: true }));
      const tt = c.hs.xacMinh, daGui = tt === 'cho_duyet' || tt === 'da_xac_minh';
      return {
        than: h`<p class="muted">Chụp mặt trước căn cước. Bên mua thấy huy hiệu "đã xác minh", không thấy ảnh căn cước của bạn.</p>
          ${tt === 'cho_duyet' ? U.bao(`Đang chờ duyệt: ${c.hs.giayTo?.ten}. AgiViet duyệt trong ngày làm việc.`, 'vang') : ''}
          ${tt === 'da_xac_minh' ? U.bao('Tài khoản đã xác minh.', 'tot') : ''}
          ${tt === 'tu_choi' ? U.bao(`Chưa duyệt: ${c.hs.giayTo?.lyDoTuChoi}. Chụp lại rõ hơn.`, 'loi') : ''}
          ${daGui ? '' : h`<label class="card stack" style="align-items:center;text-align:center;border-style:dashed;cursor:pointer">${U.icon('camera', 44)}<strong>${c.st.anh ? `Đã chụp: ${tenTep(c.st.anh)}` : 'Chụp căn cước'}</strong><span class="small muted">Đặt căn cước trên nền tối, đủ sáng, không lóa.</span><input type="file" accept="image/*" capture="environment" class="sr-only" data-st="anh" data-ve-lai></label>`}`,
        duoi: h`${daGui ? '' : U.nut('Gửi xác minh', { bam: 'gui', tat: !c.st.anh })}${U.nut(daGui ? 'Vào app' : 'Để sau', { den: 'hom-nay.html', kieu: daGui ? '' : 'phu' })}`,
      };
    },
    bam: { gui: c => c.lam({ loai: 'gui_xac_minh', giayTo: tenTep(c.st.anh) }, { bao: 'Đã gửi. AgiViet duyệt trong ngày làm việc.' }) },
  });

  AM.man('tro-giup-truy-cap', {
    ve: () => h`${U.the(h`<strong class="h2">Đổi số điện thoại</strong><p>Gọi tổng đài, đọc số cũ và số căn cước. Tài khoản chuyển sang số mới sau khi xác minh lại.</p>`)}
      ${U.the(h`<strong class="h2">Mất máy</strong><p>Gọi tổng đài để khóa tạm tài khoản. Tiền ở tài khoản đảm bảo vẫn an toàn: chỉ chuyển vào tài khoản nhận tiền đã đăng ký.</p>`)}
      ${U.the(h`<strong class="h2">Tổng đài hỗ trợ</strong><p class="so-lon">1900 0000</p><p class="small muted">Bản mô phỏng: số minh họa. Từ 7 giờ tới 21 giờ, cả thứ bảy, chủ nhật.</p>`)}`,
  });

  // Mở bat-dau.html không có # khi đã đăng nhập: vào thẳng app
  if (!location.hash && A.nguoi('ban')) location.replace('hom-nay.html');
})();
