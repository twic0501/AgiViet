// Tổ chức: hồ sơ tổ chức (người bán thấy gì), thành viên và phân quyền, gói và thanh toán, so sánh gói, nâng cấp, uy tín.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const QUYEN = { quan_ly: 'Quản lý', mua_hang: 'Mua hàng', ke_toan: 'Kế toán (duyệt chi)' };
  const pct = x => (x === null || x === undefined ? 'chưa có' : `${Math.round(x * 100)}%`);

  AM.man('ho-so-to-chuc', {
    st: c => ({ sua: false, ten: c.hs?.toChuc?.ten ?? '', mst: c.hs?.toChuc?.maSoThue ?? '', loaiHinh: c.hs?.toChuc?.loaiHinh ?? '', vung: c.hs?.vung ?? '', diaChi: c.hs?.diaChi ?? '', giay: '' }),
    ve(c) {
      const tc = c.hs.toChuc ?? {}, cong = A.mc.hoSoCongKhai(c.so, c.n.id);
      return h`<div class="hai-cot"><div class="stack">
          ${c.st.sua ? U.the(h`${U.o(c, { k: 'ten', nhan: 'Tên tổ chức' })}<div class="grid2">${U.o(c, { k: 'mst', nhan: 'Mã số thuế', kieu: 'so' })}${U.o(c, { k: 'loaiHinh', nhan: 'Loại hình' })}</div>${U.o(c, { k: 'vung', nhan: 'Huyện, tỉnh' })}${U.o(c, { k: 'diaChi', nhan: 'Địa chỉ nhận hàng' })}
              <div class="row" style="gap:8px">${U.nut('Thôi', { bam: '_bat', data: { k: 'sua' }, kieu: 'phu', nho: true })}${U.nut('Lưu', { bam: 'luu', nho: true })}</div>`)
            : U.the(h`<strong class="h2">${tc.ten}</strong>${U.dong2('Mã số thuế', tc.maSoThue)}${U.dong2('Loại hình', tc.loaiHinh)}${U.dong2('Người đại diện', `${c.hs.ten} · ${c.hs.sdt}`)}${U.dong2('Vùng', c.hs.vung)}${U.dong2('Địa chỉ nhận hàng', c.hs.diaChi || 'chưa ghi')}${U.nut('Sửa thông tin', { bam: '_bat', data: { k: 'sua' }, kieu: 'phu', nho: true })}`)}
          ${U.the(h`<strong>Xác minh</strong>${c.hs.xacMinh === 'da_xac_minh' ? U.chip('Đã xác minh', 'xong') : c.hs.xacMinh === 'cho_duyet' ? U.bao(`Đang chờ duyệt: ${c.hs.giayTo?.ten}`, 'vang') : h`${c.hs.xacMinh === 'tu_choi' ? U.bao(`Chưa duyệt: ${c.hs.giayTo?.lyDoTuChoi}`, 'loi') : ''}<label class="btn phu nho">${U.icon('upload', 20)}${c.st.giay ? String(c.st.giay).split(/[\\/]/).pop() : 'Chọn giấy phép kinh doanh'}<input type="file" accept="image/*,application/pdf" class="sr-only" data-st="giay" data-ve-lai></label>${U.nut('Gửi xác minh', { bam: 'xacMinh', nho: true, tat: !c.st.giay })}`}`)}
        </div>
        ${U.the(h`<strong>Người bán thấy về bạn</strong>${U.dong2('Tên', cong.ten)}${U.dong2('Loại hình', cong.toChuc?.loaiHinh ?? '')}${U.dong2('Vùng', cong.vung)}${U.dong2('Xác minh', cong.daXacMinh ? 'Đã xác minh' : 'Chưa')}${U.dong2('Uy tín', NV.NHAN_BAC[cong.uyTin.bac])}${U.dong2('Trả tiền đúng hạn', pct(cong.uyTin.tyLeTraDungHan))}
          <span class="small muted">Mã số thuế, số điện thoại, địa chỉ nhận hàng không hiện trước khi bạn đặt cọc.</span>`, { lop: 'noi' })}</div>
        <nav class="viec-khac"><a href="#thanh-vien">Thành viên</a><a href="#goi-cua-toi">Gói và thanh toán</a><a href="#uy-tin">Uy tín</a></nav>`;
    },
    bam: {
      luu(c) { const kq = c.lam({ loai: 'cap_nhat_ho_so', toChuc: { ten: c.st.ten, maSoThue: c.st.mst, loaiHinh: c.st.loaiHinh }, vung: c.st.vung, diaChi: c.st.diaChi }, { bao: 'Đã lưu hồ sơ tổ chức.' }); if (kq.ok) c.dat({ sua: false }); },
      xacMinh: c => c.lam({ loai: 'gui_xac_minh', giayTo: String(c.st.giay).split(/[\\/]/).pop() }, { bao: 'Đã gửi. AgiViet duyệt trong ngày làm việc.' }),
    },
  });

  AM.man('thanh-vien', {
    st: () => ({ ten: '', sdt: '', quyen: 'mua_hang' }),
    ve(c) {
      const tran = c.so.chinhSach.hanMuc[c.hs.goi].thanhVien, ds = c.hs.thanhVien;
      return h`${U.bao(`Gói ${c.hs.goi === 'business' ? 'Business' : 'Miễn phí'}: ${ds.length + 1}/${tran} tài khoản. Kế toán duyệt các khoản chi lớn trước khi chuyển tiền.`)}
        ${U.bang([['Tên'], ['Số điện thoại'], ['Quyền'], ['']], [[h`<strong>${c.hs.ten}</strong>`, c.hs.sdt, 'Chủ tài khoản', ''], ...ds.map(t => [t.ten, t.sdt, QUYEN[t.quyen], U.nut('Gỡ', { bam: 'go', kieu: 'phu', nho: true, data: { sdt: t.sdt }, hoi: `Gỡ ${t.ten}?||Gỡ|canh` })])])}
        ${ds.length + 1 < tran ? U.the(h`<strong>Thêm thành viên</strong><div class="grid2">${U.o(c, { k: 'ten', nhan: 'Tên', ph: 'Chị Lan' })}${U.o(c, { k: 'sdt', nhan: 'Số điện thoại', kieu: 'sdt' })}</div>${U.chon(c, { k: 'quyen', nhan: 'Quyền', lua: Object.entries(QUYEN) })}${U.nut('Thêm', { bam: 'them', nho: true })}`)
          : U.the(h`<span>Đã đủ ${tran} tài khoản của gói.</span>${c.hs.goi === 'business' ? '' : U.nut('Nâng cấp Business để thêm thành viên', { den: '#nang-cap', nho: true })}`)}`;
    },
    bam: {
      them(c) { const kq = c.lam({ loai: 'them_thanh_vien', ten: c.st.ten, sdt: c.st.sdt, quyen: c.st.quyen }, { bao: 'Đã thêm thành viên.' }); if (kq.ok) c.dat({ ten: '', sdt: '' }); },
      go: (c, el) => c.lam({ loai: 'go_thanh_vien', sdt: el.dataset.sdt }, { bao: 'Đã gỡ.' }),
    },
  });

  AM.man('goi-cua-toi', {
    ve(c) {
      const luot = NV.luotDaDung(c.so, c.n.id, c.bg), hm = c.so.chinhSach.hanMuc[c.hs.goi], bus = c.hs.goi === 'business';
      const thang = NV.thangCua(c.bg), phi = c.so.don.filter(d => d.mua.id === c.n.id && d.daCoc);
      return h`${U.the(h`<div class="row between"><strong class="h2">Gói ${bus ? 'Business' : 'Miễn phí'}</strong>${bus ? U.chip(`${U.so(c.so.chinhSach.giaBusiness)} đ/tháng`, 'xong') : U.nut('Xem gói Business', { den: '#so-sanh-goi', nho: true })}</div>
          ${U.dong2('Lượt kết nối tháng này', `${luot.ketNoi}/${hm.ketNoi}`)}${U.tienTrinh(luot.ketNoi / hm.ketNoi, 'Lượt kết nối')}
          ${U.dong2('Tin cần mua tháng này', `${luot.nhuCau}/${hm.nhuCau}`)}${U.tienTrinh(luot.nhuCau / hm.nhuCau, 'Tin cần mua')}
          ${U.dong2('Tài khoản thành viên', `${c.hs.thanhVien.length + 1}/${hm.thanhVien}`)}
          ${bus ? U.nut('Về gói Miễn phí', { bam: 'ha', kieu: 'phu', nho: true, hoi: 'Về gói Miễn phí?|Hạn mức giảm ngay; cần gỡ thành viên trước.|Về Miễn phí' }) : ''}`, { lop: bus ? 'noi' : '' })}
        <section class="stack s8"><h2 class="h2">Hóa đơn</h2>${U.bang([['Kỳ'], ['Khoản'], ['Số tiền', 'so'], ['Trạng thái']], [...(bus ? [[thang, 'Gói Business', U.so(c.so.chinhSach.giaBusiness), U.chip('Đã thanh toán (mô phỏng)', 'xong')]] : []), ...phi.map(d => [NV.thangCua(d.daCoc.luc), `Phí ${d.coc.loaiPhi === 'moi_quen' ? 'mối quen' : 'giới thiệu'} · ${d.ma}`, U.so(d.daCoc.phi), U.chip('Đã trả khi cọc', 'xong')])])}</section>`;
    },
    bam: { ha: c => c.lam({ loai: 'chon_goi', goi: 'mien_phi' }, { bao: 'Đã về gói Miễn phí.' }) },
  });

  AM.man('so-sanh-goi', {
    ve(c) {
      const cs = c.so.chinhSach, f = cs.hanMuc.mien_phi, b = cs.hanMuc.business;
      return h`${U.bang([['Quyền lợi'], ['Miễn phí'], ['Business']], [
          ['Giá', '0 đ', `${U.so(cs.giaBusiness)} đ/tháng`],
          ['Lời mời kết nối mỗi tháng', f.ketNoi, b.ketNoi], ['Tin cần mua mỗi tháng', f.nhuCau, b.nhuCau], ['Tài khoản thành viên', f.thanhVien, b.thanhVien],
          ['Phí giới thiệu đơn đầu / mối quen', `${cs.phiGioiThieu * 100}% / ${cs.phiMoiQuen * 100}%`, `${cs.phiGioiThieu * 100}% / ${cs.phiMoiQuen * 100}%`],
          ['Tài khoản đảm bảo, đối soát, bảng kê 01/TNDN', 'Có', 'Có'], ['So báo giá, chấm điểm nhà cung cấp', 'Cơ bản', 'Đầy đủ'], ['Duyệt chi nhiều cấp', 'Không', 'Có'],
        ])}
        ${U.bao('Phí giao dịch như nhau ở mọi gói: Business có lợi khi bạn cần nhiều lượt kết nối, nhiều người cùng làm và duyệt chi, không phải vì phí rẻ hơn.')}
        ${c.hs.goi === 'business' ? U.chip('Bạn đang dùng Business', 'xong') : U.nut('Nâng cấp Business', { den: '#nang-cap' })}`;
    },
  });

  AM.man('nang-cap', {
    st: () => ({ ky: 'thang', hoaDon: true }),
    ve(c) {
      const gia = c.so.chinhSach.giaBusiness, tien = c.st.ky === 'nam' ? gia * 10 : gia;
      if (c.hs.goi === 'business') return h`${U.bao('Bạn đang dùng gói Business.', 'tot')}${U.nut('Gói và thanh toán', { den: '#goi-cua-toi' })}`;
      return {
        than: h`${U.chon(c, { k: 'ky', nhan: 'Kỳ thanh toán', lua: [['thang', 'Theo tháng'], ['nam', 'Theo năm (12 tháng giá 10)']] })}
          ${U.congTac(c, { k: 'hoaDon', nhan: `Xuất hóa đơn điện tử cho ${c.hs.toChuc?.ten} (MST ${c.hs.toChuc?.maSoThue})` })}
          ${U.the(h`${U.dong2('Gói Business', c.st.ky === 'nam' ? '12 tháng' : '1 tháng')}${U.dong2('Tạm tính (chưa VAT)', U.dong(tien))}${U.dong2('VAT 10%', U.dong(Math.round(tien * 0.1)))}${U.dong2(h`<strong>Tổng</strong>`, h`<strong>${U.dong(Math.round(tien * 1.1))}</strong>`)}`, { lop: 'noi' })}
          ${U.bao('Bản mô phỏng: không trừ tiền thật.')}`,
        duoi: U.nut('Thanh toán và nâng cấp', { bam: 'nang' }),
      };
    },
    bam: { nang: c => c.lam({ loai: 'chon_goi', goi: 'business' }, { den: 'nang-cap-xong' }) },
  });

  AM.man('nang-cap-xong', {
    ve: c => ({
      dau: false,
      than: h`<div class="an-mung-moi">${U.icon('done', 52)}<strong class="so-lon" style="font-size:26px">Đã nâng cấp Business</strong><span>${c.hs.toChuc?.ten}</span></div>
        ${U.the(h`${U.dong2('Lời mời kết nối mỗi tháng', c.so.chinhSach.hanMuc.business.ketNoi)}${U.dong2('Tin cần mua mỗi tháng', c.so.chinhSach.hanMuc.business.nhuCau)}${U.dong2('Tài khoản thành viên', c.so.chinhSach.hanMuc.business.thanhVien)}`)}`,
      duoi: h`${U.nut('Mời thành viên', { den: '#thanh-vien' })}${U.nut('Về Tổng quan', { den: 'tong-quan.html', kieu: 'phu' })}`,
    }),
  });

  AM.man('uy-tin', {
    ve(c) {
      const ut = NV.uyTin(c.so, c.n.id), nx = c.so.danhGia.filter(g => g.cho.id === c.n.id);
      return h`<div class="hai-cot">${U.the(h`<span class="muted">Uy tín của tổ chức</span><strong class="so-lon">${NV.NHAN_BAC[ut.bac]}</strong>
          ${U.dong2('Đơn hoàn tất', ut.soDonXong)}${U.dong2('Trả tiền trong 3 ngày sau chốt cân', pct(ut.tyLeTraDungHan))}${U.dong2('Hủy sau cọc do bạn', ut.soHuyDoMinh)}${U.dong2('Đơn có tranh chấp', ut.soTranhChap)}${U.dong2('Điểm từ người bán', ut.diemDanhGia === null ? 'chưa có' : `${ut.diemDanhGia.toFixed(1)} / 5 (${ut.soDanhGia})`)}`, { lop: 'noi' })}
        ${U.the(h`<strong>Cách giữ uy tín tốt</strong><span class="small">Trả tiền trong 3 ngày sau khi chốt số cân; không hủy sau khi cọc; nhập số cân trung thực, gửi ảnh phiếu cân. Người bán thấy chỉ số này trước khi đồng ý kết nối.</span>`)}</div>
        <section class="stack s8"><h2 class="h2">Nhận xét từ người bán (${nx.length})</h2>${nx.length ? nx.map(g => U.the(h`${U.sao(g.diem)}<span>${g.nhanXet || 'Không ghi nhận xét'}</span><span class="xs muted">${g.tu.ten} · ${g.donMa}</span>`)) : h`<span class="muted">Chưa có.</span>`}</section>`;
    },
  });
})();
