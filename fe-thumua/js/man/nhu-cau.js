// Tin cần mua: danh sách, tạo tin (gõ hoặc nói, app điền giúp), chi tiết tin (chào hàng nhận được, lô gợi ý).
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;

  AM.man('nhu-cau', {
    ve(c) {
      const ds = c.so.nhuCau.filter(n => n.mua.id === c.n.id);
      const luot = NV.luotDaDung(c.so, c.n.id, c.bg), hm = c.so.chinhSach.hanMuc[c.hs.goi];
      const chao = n => c.so.ketNoi.filter(k => k.nhuCauId === n.id);
      return {
        than: h`<div class="row between"><span class="muted">Tin cần mua tháng này: ${luot.nhuCau}/${hm.nhuCau}</span>${U.nut('Đăng tin cần mua', { den: '#tao-nhu-cau', nho: true, icon: 'plus' })}</div>
          ${ds.length ? U.bang([['Tin'], ['Lượng', 'so'], ['Nhận hàng'], ['Chào hàng', 'so'], ['Trạng thái']], ds.map(n => {
            const ch = chao(n), cho = ch.filter(k => k.trangThai === 'cho').length;
            return { lop: cho ? 'lam' : '', o: [h`<a href="${AM.den('chi-tiet-nhu-cau', { nc: n.id })}">${n.ten}</a>`, U.luong(n.kg), `${U.ndNgan(n.tu)} – ${U.ndNgan(n.den)}`, h`${ch.length}${cho ? h` <span class="badge-so">${cho} mới</span>` : ''}`, n.trangThai === 'mo' ? U.chip('Đang mở', 'xong') : U.chip('Đã đóng')] };
          })) : U.trong('Chưa có tin cần mua', 'Đăng tin để người bán có hàng phù hợp chào hàng cho bạn.')}`,
      };
    },
  });

  AM.man('tao-nhu-cau', {
    st: c => ({ matHang: [], ten: '', kg: '', tu: NV.ngayCua(c.bg + 864e5), den: NV.ngayCua(c.bg + 15 * 864e5), giaTran: '', loai: '', ghiChu: '', cau: '' }),
    ve(c) {
      const mh = A.dm.timMatHang(c.st.matHang[0] ?? ''), mau = mh ? A.dm.mauCua(mh.id) : null;
      const loai = mau?.truong.find(t => t.ma === 'loai' && t.kieu === 'chon');
      return {
        than: h`${U.the(h`<strong>App điền giúp</strong><span class="small muted">Gõ một câu, app tách mặt hàng, lượng, giá trần. Bạn kiểm lại từng ô.</span>
            <div class="row" style="align-items:flex-end"><div class="grow">${U.o(c, { k: 'cau', nhan: 'Câu mô tả', ph: 'Cần 20 tấn xoài cát Chu loại 2 cho sấy, giá tối đa 14 nghìn' })}</div>${U.nut('Điền giúp', { bam: 'dien', kieu: 'phu', nho: true })}</div>`, { lop: 'noi' })}
          ${U.chonMH(c, { k: 'matHang', mot: true })}
          ${U.o(c, { k: 'ten', nhan: 'Tên tin', ph: mh ? `${mh.ten} loại 1 cho xuất khẩu` : 'Chọn mặt hàng trước' })}
          <div class="grid2">${U.o(c, { k: 'kg', nhan: 'Lượng cần', kieu: 'so', donVi: 'kg' })}${U.o(c, { k: 'giaTran', nhan: 'Giá trần (không bắt buộc)', kieu: 'so', donVi: 'đ/kg' })}</div>
          <div class="grid2">${U.o(c, { k: 'tu', nhan: 'Nhận hàng từ ngày', kieu: 'ngay' })}${U.o(c, { k: 'den', nhan: 'Đến ngày', kieu: 'ngay' })}</div>
          ${loai ? U.chon(c, { k: 'loai', nhan: 'Loại', boc: true, lua: [['', 'Không yêu cầu'], ...loai.luaChon.map(x => [x, x])] }) : ''}
          ${U.o(c, { k: 'ghiChu', nhan: 'Ghi chú cho người bán', kieu: 'chu-dai', ph: 'Ưu tiên hàng có nhật ký canh tác, giao tại nhà máy.' })}`,
        duoi: U.nut('Đăng tin cần mua', { bam: 'dang' }),
      };
    },
    bam: {
      dien(c) {
        const t = A.tl.tachLoiDang(c.st.cau || '');
        const mh = t.matHang ? A.dm.timMatHang(t.matHang) : null;
        c.dat({ ...(mh ? { matHang: [mh.id], ten: c.st.ten || mh.ten } : {}), ...(t.kg ? { kg: String(t.kg) } : {}), ...(t.gia ? { giaTran: String(t.gia) } : {}), ghiChu: c.st.ghiChu || c.st.cau });
        c.bao(mh ? `App hiểu: ${mh.ten}${t.kg ? `, ${U.luong(t.kg)}` : ''}${t.gia ? `, giá trần ${U.so(t.gia)} đ/kg` : ''}.` : 'Chưa nhận ra mặt hàng, chọn ở lưới bên dưới.', mh ? 'tot' : 'loi');
      },
      dang(c) {
        const mh = A.dm.timMatHang(c.st.matHang[0] ?? '');
        if (!mh) return c.bao('Chọn mặt hàng.', 'loi');
        c.lam({ loai: 'dang_nhu_cau', matHang: mh.id, ten: c.st.ten || mh.ten, kg: U.docSo(c.st.kg), tu: c.st.tu, den: c.st.den, giaTran: String(c.st.giaTran).trim() ? U.docSo(c.st.giaTran) : null, thuocTinh: c.st.loai ? { loai: c.st.loai } : {}, ghiChu: c.st.ghiChu }, { bao: 'Đã đăng tin cần mua. Người bán có hàng phù hợp sẽ chào hàng.', den: ma => ['chi-tiet-nhu-cau', { nc: ma }] });
      },
    },
  });

  AM.man('chi-tiet-nhu-cau', {
    ten: c => c.so.nhuCau.find(n => n.id === c.ts('nc'))?.ten || 'Chi tiết tin cần mua',
    ve(c) {
      const n = c.so.nhuCau.find(x => x.id === c.ts('nc') && x.mua.id === c.n.id);
      if (!n) return U.trong('Không tìm thấy tin', '', U.nut('Về Tin cần mua', { den: '#nhu-cau', nho: true }));
      const chao = c.so.ketNoi.filter(k => k.nhuCauId === n.id);
      const lo = A.mc.loDangBan(c.so, c.bg).filter(l => NV.conBan(l) > 0).map(l => ({ l, ...U.xepHang(n, l, c.so) })).filter(x => x.diem >= 45).sort((a, b) => b.diem - a.diem).slice(0, 4);
      const bg = c.so.baoGia.filter(b => chao.some(k => k.id === b.ketNoiId));
      return h`${U.the(h`${U.dong2('Cần', U.luong(n.kg))}${U.dong2('Nhận hàng', `${U.nd(n.tu)} – ${U.nd(n.den)}`)}${n.giaTran ? U.dong2('Giá trần', `${U.so(n.giaTran)} đ/kg`) : ''}${Object.entries(n.thuocTinh).map(([k, v]) => U.dong2(k === 'loai' ? 'Loại' : k, v))}${n.ghiChu ? h`<span class="small">${n.ghiChu}</span>` : ''}
          <div class="row between">${n.trangThai === 'mo' ? U.chip('Đang mở', 'xong') : U.chip('Đã đóng')}${n.trangThai === 'mo' ? U.nut('Đóng tin', { bam: 'dong', kieu: 'phu', nho: true, hoi: 'Đóng tin cần mua?|Người bán không chào hàng thêm vào tin này. Kết nối đang có vẫn giữ.|Đóng tin' }) : ''}</div>`, { lop: 'noi' })}
        <section class="stack s8"><h2 class="h2">Chào hàng nhận được (${chao.length})</h2>
          ${chao.length ? '' : h`<span class="muted">Chưa có người bán chào hàng. Mở Giả lập người bán để thử.</span>`}
          ${chao.map(k => { const l = c.so.lo.find(x => x.id === k.loId), hs = A.mc.hoSoCongKhai(c.so, k.ban.id);
            return U.the(h`<div class="row between"><strong>${k.ban.ten} · ${l?.ten}</strong>${U.chip(k.trangThai === 'cho' ? 'Chờ bạn trả lời' : k.trangThai === 'dong_y' ? 'Đã kết nối' : 'Đã đóng', k.trangThai === 'cho' ? 'lam' : k.trangThai === 'dong_y' ? 'xong' : '')}</div>
              <span class="small muted">${hs?.vung} · uy tín ${NV.NHAN_BAC[hs?.uyTin.bac ?? 'moi']} · còn ${l ? U.luong(NV.conBan(l)) : ''} · ${l?.gia ? `${U.so(l.gia)} đ/kg` : 'nhận báo giá'}</span>${k.loiNhan ? h`<span class="small">"${k.loiNhan}"</span>` : ''}
              ${k.trangThai === 'cho' ? h`<div class="grid2">${U.nut('Không, cảm ơn', { bam: 'traLoi', kieu: 'phu', nho: true, data: { kn: k.id, v: 0 } })}${U.nut('Đồng ý kết nối', { bam: 'traLoi', nho: true, data: { kn: k.id, v: 1 } })}</div>` : k.trangThai === 'dong_y' ? U.nut('Xem lô, lập đơn', { den: AM.den('chi-tiet-lo', { lo: k.loId }), kieu: 'phu', nho: true }) : ''}`, { vien: k.trangThai === 'cho' ? 'lam' : '' }); })}
        </section>
        ${bg.length ? h`<section class="stack s8"><h2 class="h2">Báo giá theo tin này</h2>${U.nut('So báo giá', { den: AM.den('so-bao-gia', { mh: n.matHang }), kieu: 'phu', nho: true })}</section>` : ''}
        <section class="stack s8"><h2 class="h2">Lô gợi ý</h2>${lo.length ? h`<div class="luoi-the">${lo.map(x => U.theNguon(x.l, c.so, c.bg, h`<span class="xs muted">Khớp ${x.diem}%: ${x.ly.join(', ')}</span>`))}</div>` : h`<span class="muted">Chưa có lô cùng mặt hàng.</span>`}</section>`;
    },
    bam: {
      traLoi: (c, el) => c.lam({ loai: 'tra_loi_ket_noi', ketNoiId: el.dataset.kn, dongY: el.dataset.v === '1' }, { bao: el.dataset.v === '1' ? 'Đã kết nối. Nhắn tin, báo giá được với người bán.' : 'Đã trả lời. Người bán không bị báo lý do.' }),
      dong: c => c.lam({ loai: 'dong_nhu_cau', nhuCauId: c.ts('nc') }, { bao: 'Đã đóng tin.' }),
    },
  });
})();
