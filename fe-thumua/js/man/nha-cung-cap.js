// Nhà cung cấp: mối quen (trong app và danh bạ ngoài app), chấm điểm nhà cung cấp, ghi đơn mua ngoài app, nhập danh bạ từ Excel.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;

  AM.man('moi-quen', {
    ve(c) {
      const diem = Object.fromEntries(NV.chamDiemNhaCungCap(c.so, c.n.id).map(x => [x.id, x]));
      const ban = [...new Set(c.so.don.filter(d => d.mua.id === c.n.id && d.daCoc).map(d => d.ban.id))];
      const ngoai = c.so.moiQuenNgoai.filter(m => m.mua.id === c.n.id);
      return h`${U.bao(`Mối quen: từ đơn thứ hai với cùng người bán, phí chỉ ${c.so.chinhSach.phiMoiQuen * 100}% thay vì ${c.so.chinhSach.phiGioiThieu * 100}%.`)}
        <section class="stack s8"><h2 class="h2">Người bán đã giao dịch trong app (${ban.length})</h2>
          ${ban.length ? U.bang([['Người bán'], ['Vùng'], ['Số đơn', 'so'], ['Đơn gần nhất'], ['Điểm', 'so'], ['']], ban.map(id => { const ds = c.so.don.filter(d => d.ban.id === id && d.mua.id === c.n.id), cuoi = ds[0], hs = A.mc.hoSoCongKhai(c.so, id);
            return [h`<a href="${AM.den('ho-so-ban', { id })}">${hs?.ten}</a>`, hs?.vung ?? '', ds.length, h`<a href="${AM.den('chi-tiet-don', { ma: cuoi.ma })}">${cuoi.ma}</a> · ${U.ndNgan(cuoi.ngayGiao)}`, diem[id] ? diem[id].diem : '–', U.nut('Xem lô', { den: AM.den('ho-so-ban', { id }), kieu: 'phu', nho: true })]; })) : h`<span class="muted">Chưa có.</span>`}</section>
        <section class="stack s8"><div class="row between"><h2 class="h2">Danh bạ ngoài app (${ngoai.length})</h2>${U.nut('Nhập từ Excel', { den: '#nhap-excel', kieu: 'phu', nho: true, icon: 'import' })}</div>
          ${ngoai.length ? U.bang([['Tên'], ['Số điện thoại'], ['Vùng'], ['Mặt hàng']], ngoai.map(m => [m.ten, m.sdt, m.vung, m.matHang])) : h`<span class="muted">Chưa có.</span>`}
          <span class="small muted">Danh bạ ngoài app chỉ bạn thấy. Mời mối quen dùng app để đơn sau có hồ sơ, tiền qua tài khoản đảm bảo.</span></section>
        <div class="row" style="gap:8px">${U.nut('Chấm điểm nhà cung cấp', { den: '#cham-diem', kieu: 'phu', nho: true })}${U.nut('Ghi đơn mua ngoài app', { den: '#ghi-don-ngoai', kieu: 'phu', nho: true })}</div>`;
    },
  });

  AM.man('cham-diem', {
    ve(c) {
      const ds = NV.chamDiemNhaCungCap(c.so, c.n.id);
      const pct = x => `${Math.round(x * 100)}%`;
      return h`${U.bao('Điểm = giao đủ (40%) + đúng loại (40%) + đúng hẹn (20%), tính từ các đơn đã chốt số cân.')}
        ${ds.length ? U.bang([['Người bán'], ['Số đơn', 'so'], ['Giao đủ', 'so'], ['Đúng loại', 'so'], ['Đúng hẹn', 'so'], ['Điểm', 'so']], ds.map(x => ({ lop: x.diem < 80 ? 'lam' : '', o: [h`<a href="${AM.den('ho-so-ban', { id: x.id })}">${x.ten}</a>`, x.soDon, pct(x.giaoDu), pct(x.dungLoai), pct(x.dungHen), h`<strong>${x.diem}</strong>`] })))
          : U.trong('Chưa có đơn đã chốt số cân', 'Điểm có sau đơn đầu tiên.')}`;
    },
  });

  AM.man('ghi-don-ngoai', {
    st: c => ({ nguoiBan: '', diaChi: '', matHang: [], ten: '', kg: '', gia: '', ngay: NV.ngayCua(c.bg), daTra: '0' }),
    ve(c) {
      const ds = c.so.donNgoai.filter(n => n.mua.id === c.n.id);
      return {
        than: h`${U.bao('Ghi đơn mua trực tiếp ngoài app để công nợ, kho và bảng kê 01/TNDN đủ. Đơn ngoài app không có cọc, không qua tài khoản đảm bảo.')}
          <div class="hai-cot"><div class="stack">
            <div class="grid2">${U.o(c, { k: 'nguoiBan', nhan: 'Người bán', ph: 'Anh Sáu Lộc' })}${U.o(c, { k: 'diaChi', nhan: 'Địa chỉ người bán', ph: 'Mỹ Hiệp, Cao Lãnh' })}</div>
            ${U.chonMH(c, { k: 'matHang', mot: true })}
            ${U.o(c, { k: 'ten', nhan: 'Tên hàng trên bảng kê', ph: 'Xoài cát Chu loại 2' })}
            <div class="grid2">${U.o(c, { k: 'kg', nhan: 'Lượng', kieu: 'so', donVi: 'kg' })}${U.o(c, { k: 'gia', nhan: 'Giá', kieu: 'so', donVi: 'đ/kg' })}</div>
            <div class="grid2">${U.o(c, { k: 'ngay', nhan: 'Ngày mua', kieu: 'ngay' })}${U.o(c, { k: 'daTra', nhan: 'Đã trả', kieu: 'so', donVi: 'đ' })}</div>
          </div><section class="stack s8"><h2 class="h2">Đơn ngoài app đã ghi (${ds.length})</h2>${ds.length ? U.bang([['Mã'], ['Người bán'], ['Hàng'], ['Tiền', 'so'], ['Còn nợ', 'so']], ds.map(n => [n.id, n.nguoiBan, n.ten, U.so(NV.tien(n.kg, n.gia)), U.so(NV.tien(n.kg, n.gia) - n.daTra)])) : h`<span class="muted">Chưa có.</span>`}</section></div>`,
        duoi: U.nut('Ghi đơn', { bam: 'ghi' }),
      };
    },
    bam: {
      ghi(c) {
        const mh = A.dm.timMatHang(c.st.matHang[0] ?? '');
        const kq = c.lam({ loai: 'ghi_don_ngoai', nguoiBan: c.st.nguoiBan, diaChiNguoiBan: c.st.diaChi, matHang: mh?.id ?? '', ten: c.st.ten || mh?.ten || '', kg: U.docSo(c.st.kg), gia: U.docSo(c.st.gia), ngay: c.st.ngay, daTra: U.docSo(c.st.daTra) || 0 }, { bao: 'Đã ghi đơn ngoài app vào công nợ và bảng kê.' });
        if (kq.ok) c.dat({ nguoiBan: '', diaChi: '', ten: '', kg: '', gia: '', daTra: '0' });
      },
    },
  });

  const MAU_CSV = 'Tên,Số điện thoại,Vùng,Mặt hàng\nAnh Bảy Nhỏ,0918 111 222,Lai Vung, Đồng Tháp,Quýt hồng\nChị Tư Hồng,0939 333 444,Chợ Gạo, Tiền Giang,Thanh long';
  const tachDong = chu => chu.trim().split(/\r?\n/).slice(1).filter(Boolean).map(dong => { const o = dong.split(','); return { ten: (o[0] ?? '').trim(), sdt: (o[1] ?? '').trim(), vung: o.slice(2, -1).join(',').trim(), matHang: (o.at(-1) ?? '').trim() }; });
  AM.man('nhap-excel', {
    st: () => ({ chu: '' }),
    ve(c) {
      const ds = c.st.chu.trim() ? tachDong(c.st.chu) : [];
      return {
        than: h`<p class="muted">Lưu bảng Excel thành CSV (Tệp → Lưu thành → CSV) rồi chọn tệp, hoặc dán nội dung. Cột: Tên, Số điện thoại, Vùng, Mặt hàng. Dòng đầu là tiêu đề.</p>
          <label class="btn phu nho">${U.icon('upload', 20)}Chọn tệp CSV<input type="file" accept=".csv,text/csv" class="sr-only" data-csv></label>
          ${U.o(c, { k: 'chu', nhan: 'Nội dung', kieu: 'chu-dai', veLai: true, ph: MAU_CSV })}
          ${U.nut('Dán dữ liệu mẫu', { bam: '_dat', kieu: 'phu', nho: true, data: { k: 'chu', v: MAU_CSV } })}
          ${ds.length ? h`<h2 class="h2">Xem trước (${ds.length} dòng)</h2>${U.bang([['Tên'], ['Số điện thoại'], ['Vùng'], ['Mặt hàng']], ds.map(m => [m.ten, m.sdt, m.vung, m.matHang]))}` : ''}`,
        duoi: U.nut('Nhập vào danh bạ', { bam: 'nhap', tat: !ds.length }),
      };
    },
    sau(c, el) { el.querySelector('input[data-csv]')?.addEventListener('change', async e => { const f = e.target.files?.[0]; if (f) c.dat({ chu: await f.text() }); }); },
    bam: { nhap: c => c.lam({ loai: 'nhap_moi_quen', danhSach: tachDong(c.st.chu) }, { bao: 'Đã nhập danh bạ (bỏ qua số đã có).', den: 'moi-quen' }) },
  });
})();
