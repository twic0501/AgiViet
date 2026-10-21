// Báo giá: báo giá theo từng kết nối (chờ bạn, bạn đã gửi, đã chốt), so báo giá theo mặt hàng, gửi báo giá.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const NHAN = { cho: ['Chờ trả lời', 'lam'], dong_y: ['Đã chốt', 'xong'], tu_choi: ['Không đồng ý', 'loi'], het: ['Đã thay bằng báo giá mới', ''] };
  const cuaToi = c => { const kn = new Set(A.mc.ketNoiCuaToi(c.so, c.n).map(k => k.id)); return c.so.baoGia.filter(b => kn.has(b.ketNoiId)); };
  const knCua = (c, b) => c.so.ketNoi.find(k => k.id === b.ketNoiId);

  AM.man('bao-gia', {
    st: () => ({ tab: 'cho' }),
    ve(c) {
      const ds = cuaToi(c).slice().sort((a, b) => b.luc - a.luc);
      const nhom = { cho: ds.filter(b => b.trangThai === 'cho' && b.tu === 'ban'), gui: ds.filter(b => b.trangThai === 'cho' && b.tu === 'mua'), chot: ds.filter(b => b.trangThai === 'dong_y'), cu: ds.filter(b => ['tu_choi', 'het'].includes(b.trangThai)) };
      const dong = b => { const k = knCua(c, b), lo = c.so.lo.find(l => l.id === k?.loId), don = c.so.don.find(d => d.baoGiaId === b.id);
        return { lop: b.trangThai === 'cho' && b.tu === 'ban' ? 'lam' : '', o: [h`<strong>${k?.ban.ten}</strong><br><span class="xs muted">${lo?.ten ?? ''}</span>`, `${U.so(b.gia)} đ/kg`, U.luong(b.kg), U.ndNgan(b.ngayGiao), h`${b.tu === 'ban' ? 'Người bán' : 'Bạn'}`, U.chip(NHAN[b.trangThai][0], NHAN[b.trangThai][1]),
          b.trangThai === 'cho' && b.tu === 'ban' ? h`<div class="row" style="gap:6px">${U.nut('Chốt', { bam: 'traLoi', nho: true, data: { id: b.id, v: 1 } })}${U.nut('Không', { bam: 'traLoi', kieu: 'phu', nho: true, data: { id: b.id, v: 0 } })}</div>`
            : b.trangThai === 'dong_y' ? (don ? h`<a href="${AM.den('chi-tiet-don', { ma: don.ma })}">${don.ma}</a>` : U.nut('Lập đơn', { den: AM.den('thoa-thuan', { lo: k?.loId, bg: b.id }), nho: true })) : U.nut('Gửi giá khác', { den: AM.den('gui-bao-gia', { kn: b.ketNoiId }), kieu: 'phu', nho: true })] }; };
      return h`<div class="row between">${U.tab(c, 'tab', [['cho', 'Chờ bạn', nhom.cho.length], ['gui', 'Bạn đã gửi'], ['chot', 'Đã chốt', nhom.chot.filter(b => !c.so.don.some(d => d.baoGiaId === b.id)).length], ['cu', 'Đã đóng']])}</div>
        ${nhom[c.st.tab].length ? U.bang([['Người bán'], ['Giá', 'so'], ['So giá tham khảo'], ['Lượng', 'so'], ['Giao'], ['Ai gửi'], ['Trạng thái'], ['']], nhom[c.st.tab].map(dong)) : U.trong('Không có báo giá', c.st.tab === 'cho' ? 'Người bán gửi báo giá sau khi hai bên kết nối.' : '')}
        <div class="row" style="gap:8px;flex-wrap:wrap">${U.nut('So báo giá theo mặt hàng', { den: '#so-bao-gia', kieu: 'phu', nho: true, icon: 'compare' })}</div>`;
    },
    bam: { traLoi: (c, el) => c.lam({ loai: 'tra_loi_bao_gia', baoGiaId: el.dataset.id, dongY: el.dataset.v === '1' }, { bao: el.dataset.v === '1' ? 'Đã chốt giá. Bấm "Lập đơn" để gửi đơn cho người bán ký.' : 'Đã trả lời không đồng ý.' }) },
  });

  AM.man('so-bao-gia', {
    st: c => ({ mh: c.ts('mh') }),
    ve(c) {
      const ds = cuaToi(c).filter(b => ['cho', 'dong_y'].includes(b.trangThai) && b.tu === 'ban');
      const mhCo = [...new Set(ds.map(b => c.so.lo.find(l => l.id === knCua(c, b)?.loId)?.matHang).filter(Boolean))];
      const mh = mhCo.includes(c.st.mh) ? c.st.mh : mhCo[0];
      const ss = ds.filter(b => c.so.lo.find(l => l.id === knCua(c, b)?.loId)?.matHang === mh);
      if (!ss.length) return U.trong('Chưa có báo giá để so', 'Khi người bán gửi báo giá, bảng so hiện tổng chi phí nhận hàng của từng người.');
      const cs = c.so.chinhSach;
      const tinh = b => { const k = knCua(c, b), gt = NV.tien(b.kg, b.gia), quen = c.so.don.some(d => d.mua.id === c.n.id && d.ban.id === k.ban.id && d.daCoc); const phi = NV.tinhPhi(gt, quen, cs); return { k, gt, phi, tong: gt + phi, coc: NV.tinhCoc(gt, cs), quen, hs: A.mc.hoSoCongKhai(c.so, k.ban.id) }; };
      const re = Math.min(...ss.map(b => tinh(b).tong / b.kg));
      const tk = b => { const lo = c.so.lo.find(l => l.id === knCua(c, b)?.loId); return lo ? NV.danhGiaGia(c.so, lo.matHang, b.gia, c.bg, NV.loaiCua(lo)) : null; };
      return h`${mhCo.length > 1 ? U.chonO(c, { k: 'mh', nhan: 'Mặt hàng', lua: mhCo.map(m => [m, A.tenMH(m)]) }) : h`<strong>${A.tenMH(mh)}</strong>`}
        ${c.hs.goi !== 'business' ? U.bao('Gói Business có thêm cột chấm điểm nhà cung cấp và gợi ý chọn. Bảng so cơ bản dùng được ở mọi gói.') : ''}
        ${U.bang([['Người bán'], ['Giá', 'so'], ['Lượng', 'so'], ['Giao'], ['Phí', 'so'], ['Tổng chi phí nhận hàng', 'so'], ['Bình quân', 'so'], ['Cọc', 'so'], ['Uy tín'], ['']], ss.map(b => { const t = tinh(b), bq = t.tong / b.kg;
          return { lop: bq === re ? 'lam' : '', o: [h`<strong>${t.k.ban.ten}</strong>`, U.so(b.gia), (g => (!g || g.muc === 'chua_du' ? h`<span class="xs muted">chưa đủ dữ liệu</span>` : h`${U.so(g.thamKhao.gia)}<br><span class="xs ${g.muc === 'binh_thuong' ? 'muted' : ''}">${g.lech > 0 ? `thấp hơn ${g.lech}%` : `cao hơn ${-g.lech}%`}</span>`))(tk(b)), U.luong(b.kg), U.ndNgan(b.ngayGiao), h`${U.so(t.phi)}${t.quen ? h`<br><span class="xs muted">mối quen</span>` : ''}`, U.so(t.tong), h`<strong>${U.so(Math.round(bq))}</strong>${bq === re ? h`<br>${U.chip('Rẻ nhất', 'xong')}` : ''}`, U.so(t.coc), t.hs ? NV.NHAN_BAC[t.hs.uyTin.bac] : '',
            b.trangThai === 'cho' ? U.nut('Chốt', { bam: 'chot', nho: true, data: { id: b.id } }) : U.chip('Đã chốt', 'xong')] }; }))}
        <span class="small muted">Tổng chi phí = tiền hàng + phí giới thiệu (đơn đầu ${cs.phiGioiThieu * 100}%) hoặc phí mối quen (${cs.phiMoiQuen * 100}%), sàn ${U.so(cs.phiSan)} đ, trần ${U.so(cs.phiTran)} đ. Chưa tính xe, kiểm định.</span>`;
    },
    bam: { chot: (c, el) => c.lam({ loai: 'tra_loi_bao_gia', baoGiaId: el.dataset.id, dongY: true }, { bao: 'Đã chốt giá.' }) },
  });

  AM.man('gui-bao-gia', {
    st(c) { const k = c.so.ketNoi.find(x => x.id === c.ts('kn')), lo = k && c.so.lo.find(l => l.id === k.loId); return { gia: lo?.gia ? String(Math.round(lo.gia * 0.95 / 100) * 100) : '', kg: lo ? String(Math.min(NV.conBan(lo), 1000)) : '', ngay: NV.ngayCua(c.bg + 4 * 864e5), ghiChu: '' }; },
    ve(c) {
      const k = c.so.ketNoi.find(x => x.id === c.ts('kn') && x.mua.id === c.n.id);
      if (!k) {
        const ds = A.mc.ketNoiCuaToi(c.so, c.n).filter(x => x.trangThai === 'dong_y');
        return h`<p class="muted">Chọn người bán đã kết nối để gửi báo giá.</p>${ds.length ? ds.map(x => U.the(h`<strong>${x.ban.ten}</strong><span class="small muted">${c.so.lo.find(l => l.id === x.loId)?.ten ?? ''}</span>`, { den: AM.den('gui-bao-gia', { kn: x.id }) })) : U.trong('Chưa kết nối với người bán nào', '', U.nut('Tìm nguồn hàng', { den: 'nguon-hang.html#nguon-hang', nho: true }))}`;
      }
      const lo = c.so.lo.find(l => l.id === k.loId), cu = A.mc.baoGiaCua(c.so, k.id).slice().reverse();
      return {
        than: h`<span class="muted">${k.ban.ten} · ${lo?.ten} · còn ${lo ? U.luong(NV.conBan(lo)) : ''} · người bán chào ${lo?.gia ? `${U.so(lo.gia)} đ/kg` : 'nhận báo giá'}</span>
          ${k.trangThai !== 'dong_y' ? U.bao('Người bán chưa đồng ý kết nối: chưa gửi báo giá được.', 'vang') : ''}
          <div class="grid2">${U.o(c, { k: 'gia', nhan: 'Giá', kieu: 'so', donVi: 'đ/kg' })}${U.o(c, { k: 'kg', nhan: 'Lượng', kieu: 'so', donVi: 'kg' })}</div>
          ${U.o(c, { k: 'ngay', nhan: 'Ngày giao', kieu: 'ngay' })}${U.o(c, { k: 'ghiChu', nhan: 'Điều kiện (loại, cách giao, kiểm định)', ph: 'Loại 1, giao tại nhà máy, bên em lo xe' })}
          ${cu.length ? h`<section class="stack s8"><h2 class="h2">Các lần báo giá</h2>${cu.map(b => U.the(h`<div class="row between"><strong>${b.tu === 'ban' ? k.ban.ten : 'Bạn'}: ${U.so(b.gia)} đ/kg × ${U.luong(b.kg)}</strong>${U.chip(NHAN[b.trangThai][0], NHAN[b.trangThai][1])}</div><span class="xs muted">giao ${U.nd(b.ngayGiao)} · ${U.tuongDoi(b.luc, c.bg)}${b.ghiChu ? ` · ${b.ghiChu}` : ''}</span>`))}</section>` : ''}`,
        duoi: U.nut('Gửi báo giá', { bam: 'gui', tat: k.trangThai !== 'dong_y' }),
      };
    },
    bam: { gui: c => c.lam({ loai: 'gui_bao_gia', ketNoiId: c.ts('kn'), gia: U.docSo(c.st.gia), kg: U.docSo(c.st.kg), ngayGiao: c.st.ngay, ghiChu: c.st.ghiChu }, { bao: 'Đã gửi báo giá. Người bán đồng ý thì bạn lập đơn theo giá này.' }) },
  });
})();
