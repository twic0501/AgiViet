// Vào app: đăng nhập bằng số điện thoại (mã mô phỏng 123456), đăng ký tổ chức, chọn gói.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;
  const MA = '123456', SDT_MAU = '0277 386 210';
  const NHAP = { sdt: '', dangKy: false, ten: '', toChuc: '', mst: '', diaChi: '', vung: '', loaiHinh: 'Nhà máy chế biến', giayPhep: '' };
  const vao = c => c.nhap('vao-mua', NHAP);
  const chuSo = s => String(s).replace(/\D/g, '');
  const LOAI_HINH = ['Nhà máy chế biến', 'Doanh nghiệp xuất khẩu', 'Vựa, đầu mối', 'Chuỗi bán lẻ', 'Bếp ăn, nhà hàng'];

  AM.man('dang-nhap', {
    st: c => ({ sdt: vao(c).gt.sdt || '', loi: '' }),
    ve(c) {
      const dk = vao(c).gt.dangKy;
      return {
        dau: false,
        than: h`<div class="stack" style="align-items:center;text-align:center;padding-top:20px"><img src="assets/mark.svg" alt="" style="width:64px;height:64px"><strong class="h2" style="font-size:26px">AgiViet Thu mua</strong><span class="muted">Tìm đúng mối, chốt đúng giá. Nguồn nông sản, thủy sản có hồ sơ; tiền đi qua tài khoản đảm bảo của ngân hàng.</span></div>
          ${U.chon(c, { n: 'vao-mua:dangKy', lua: [['false', 'Đăng nhập'], ['true', 'Đăng ký tổ chức']] })}
          ${U.o(c, { k: 'sdt', nhan: dk ? 'Số điện thoại người đại diện' : 'Số điện thoại đã đăng ký', kieu: 'sdt', ph: SDT_MAU, loi: c.st.loi })}
          ${U.bao(h`Bản mô phỏng: không gửi tin nhắn thật, mã luôn là <strong>${MA}</strong>. Tài khoản mẫu: Nhà máy sấy Đồng Xanh, số <strong>${SDT_MAU}</strong>.`, 'vang')}
          ${dk ? '' : U.nut(`Dùng số mẫu ${SDT_MAU} (Đồng Xanh)`, { bam: '_dat', kieu: 'phu', nho: true, data: { k: 'sdt', v: SDT_MAU } })}`,
        duoi: U.nut('Gửi mã', { bam: 'tiep' }),
      };
    },
    bam: {
      tiep(c) {
        const s = chuSo(c.st.sdt);
        if (!/^0\d{9,10}$/.test(s)) return c.dat({ loi: 'Số điện thoại gồm 10 hoặc 11 chữ số, bắt đầu bằng 0.' });
        const co = c.so.nguoiDung.some(n => n.vai === 'mua' && chuSo(n.sdt) === s);
        const dk = String(vao(c).gt.dangKy) === 'true';
        if (!dk && !co) return c.dat({ loi: 'Số này chưa có tài khoản bên mua. Chọn "Đăng ký tổ chức".' });
        if (dk && co) return c.dat({ loi: 'Số này đã có tài khoản. Chọn "Đăng nhập".' });
        c.dat({ loi: '' }, false);
        vao(c).dat({ sdt: s, dangKy: dk }, false);
        c.di('otp');
      },
    },
  });

  AM.man('otp', {
    st: () => ({ ma: '', loi: '' }),
    ve(c) {
      const sdt = vao(c).gt.sdt;
      if (!sdt) return U.trong('Chưa có số điện thoại', '', U.nut('Nhập số', { den: '#dang-nhap', nho: true }));
      return {
        than: h`<p class="muted">Nhập mã 6 số gửi tới <strong class="num">${sdt}</strong>.</p>
          <label class="truong"><span class="label">Mã xác minh</span><span class="o-nhap"><input class="lon" inputmode="numeric" maxlength="6" autocomplete="one-time-code" data-st="ma" value="${c.st.ma}" placeholder="••••••"></span>${c.st.loi ? h`<span class="loi-chu">${c.st.loi}</span>` : ''}</label>
          ${U.nut('Điền mã mô phỏng', { bam: '_dat', kieu: 'phu', nho: true, data: { k: 'ma', v: MA } })}`,
        duoi: U.nut('Tiếp tục', { bam: 'tiep' }),
      };
    },
    bam: {
      tiep(c) {
        if (chuSo(c.st.ma) !== MA) return c.dat({ loi: `Mã chưa đúng. Bản mô phỏng dùng mã ${MA}.` });
        c.dat({ ma: '', loi: '' }, false);
        const n = A.dangNhap('mua', vao(c).gt.sdt);
        if (n) { location.href = 'tong-quan.html'; return; }
        c.di('thong-tin-to-chuc');
      },
    },
  });

  AM.man('thong-tin-to-chuc', {
    ve(c) {
      const n = vao(c).gt;
      if (!n.sdt) return U.trong('Chưa xác minh số điện thoại', '', U.nut('Bắt đầu', { den: '#dang-nhap', nho: true }));
      return {
        than: h`<p class="muted">Người bán thấy tên tổ chức, loại hình, vùng và uy tín của bạn. Mã số thuế, giấy phép chỉ đội AgiViet xem để xác minh.</p>
          ${U.o(c, { n: 'vao-mua:toChuc', nhan: 'Tên tổ chức', ph: 'Công ty TNHH Nông sản Hậu Giang' })}
          ${U.o(c, { n: 'vao-mua:mst', nhan: 'Mã số thuế', kieu: 'so', ph: '6300123456' })}
          ${U.chon(c, { n: 'vao-mua:loaiHinh', nhan: 'Loại hình', boc: true, lua: LOAI_HINH.map(x => [x, x]) })}
          <div class="grid2">${U.o(c, { n: 'vao-mua:ten', nhan: 'Người đại diện', ph: 'Anh Bảo' })}${U.o(c, { n: 'vao-mua:vung', nhan: 'Huyện, tỉnh', ph: 'Vị Thanh, Hậu Giang' })}</div>
          ${U.o(c, { n: 'vao-mua:diaChi', nhan: 'Địa chỉ nhận hàng', ph: 'Lô B3, KCN Sông Hậu', goiY: 'Chỉ hiện cho người bán khi bạn đã đặt cọc.' })}
          <label class="btn phu nho">${U.icon('upload', 20)}${n.giayPhep ? `Giấy phép: ${String(n.giayPhep).split(/[\\/]/).pop()}` : 'Thêm giấy phép kinh doanh để xác minh'}<input type="file" accept="image/*,application/pdf" class="sr-only" data-nhap="vao-mua:giayPhep" data-ve-lai></label>`,
        duoi: U.nut('Tạo tài khoản tổ chức', { bam: 'tao' }),
      };
    },
    bam: {
      tao(c) {
        const n = vao(c).gt;
        const nguoi = { vai: 'mua', id: A.maMoi('mua'), ten: String(n.toChuc).trim() };
        const kq = A.lam(nguoi, { loai: 'dang_ky', vai: 'mua', ten: n.ten, sdt: n.sdt, vung: n.vung, toChuc: { ten: n.toChuc, maSoThue: n.mst, loaiHinh: n.loaiHinh } });
        if (!kq.ok) return c.bao(kq.loi, 'loi');
        A.datPhien('mua', nguoi);
        if (n.diaChi) A.lam(nguoi, { loai: 'cap_nhat_ho_so', diaChi: n.diaChi });
        if (n.giayPhep) A.lam(nguoi, { loai: 'gui_xac_minh', giayTo: String(n.giayPhep).split(/[\\/]/).pop() });
        c.bao('Đã tạo tài khoản tổ chức.');
        c.di('chon-goi');
      },
    },
  });

  AM.man('chon-goi', {
    ve(c) {
      if (!A.nguoi('mua')) return U.trong('Chưa có tài khoản', '', U.nut('Đăng ký', { den: '#dang-nhap', nho: true }));
      const cs = c.so.chinhSach, f = cs.hanMuc.mien_phi, b = cs.hanMuc.business;
      const goi = (ma, ten, gia, hm, them) => U.the(h`<strong class="h2">${ten}</strong><span class="so-lon" style="font-size:24px">${gia}</span>
        ${U.dong2('Lời mời kết nối mỗi tháng', hm.ketNoi)}${U.dong2('Tin cần mua mỗi tháng', hm.nhuCau)}${U.dong2('Tài khoản thành viên', hm.thanhVien)}${them}
        ${U.nut(`Dùng gói ${ten}`, { bam: 'chon', data: { goi: ma }, kieu: ma === 'business' ? '' : 'phu' })}`, { vien: ma === 'business' ? 'tot' : '' });
      return h`<p class="muted">Phí giới thiệu (${cs.phiGioiThieu * 100}% đơn đầu với mỗi người bán, ${cs.phiMoiQuen * 100}% đơn mối quen) như nhau ở mọi gói, trả khi đặt cọc. Đổi gói lúc nào cũng được.</p>
        <div class="grid2">${goi('mien_phi', 'Miễn phí', '0 đ', f, '')}${goi('business', 'Business', `${U.so(cs.giaBusiness)} đ/tháng`, b, h`${U.dong2('So báo giá, chấm điểm nhà cung cấp', 'Có')}${U.dong2('Duyệt chi nhiều cấp', 'Có')}`)}</div>`;
    },
    bam: { chon: (c, el) => { const kq = A.lam(A.nguoi('mua'), { loai: 'chon_goi', goi: el.dataset.goi }); if (!kq.ok) return c.bao(kq.loi, 'loi'); c.nhap('vao-mua', NHAP).xoa(); location.href = 'tong-quan.html'; } },
  });

  if (!location.hash && A.nguoi('mua')) location.replace('tong-quan.html');
})();
