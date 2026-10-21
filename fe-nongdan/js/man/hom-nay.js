// Hôm nay: việc cần làm trước, nhắc cách ly, thời tiết, số liệu tuần; tổng kết tuần; thông báo.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;

  /** Đầu màn gốc: chữ đầu tên, lời chào, chuông thông báo, nút Nghe. */
  const dauGoc = c => {
    const soTb = A.mc.viecCanLam(c.so, c.n, c.bg);
    const tong = soTb.don.length + soTb.loiMoi.length + soTb.baoGia.length + soTb.hen.length + soTb.deNghi.length;
    return h`<header class="top"><a class="anh-dai-dien" href="toi.html#toi" aria-label="Trang của tôi">${(c.hs?.ten || '?').replace(/^(Chị|Anh|Cô|Chú|Bà|Ông)\s+/i, '').charAt(0)}</a>
      <div class="chao grow"><span class="small muted">Chào,</span><strong>${c.hs?.ten}</strong></div>
      <a class="icon-btn" href="#thong-bao" aria-label="Thông báo${tong ? `, ${tong} việc mới` : ''}"><svg class="i"><use href="#i-chuong"/></svg>${tong ? h`<span class="badge-so">${tong}</span>` : ''}</a>
      <button class="nghe" type="button"><img src="assets/ic-loa.svg" alt="">Nghe</button></header>`;
  };

  /** Dự báo mô phỏng (cố định theo ngày để không đổi mỗi lần mở). */
  const thoiTiet = bayGio => [0, 1, 2].map(i => {
    const ngay = A.nv.ngayCua(bayGio + i * 864e5);
    const k = [...ngay].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) % 100;
    const mua = k % 3 === 0;
    return { ngay, mua, nhiet: 27 + (k % 7), luong: mua ? 5 + (k % 30) : 0 };
  });

  AM.man('hom-nay', {
    ve(c) {
      const viec = A.mc.viecCanLam(c.so, c.n, c.bg);
      const tuan = A.nv.tongKetTuan(c.so, c.n.id, c.bg).nay;
      const cachLy = c.so.vuon.filter(v => v.ban.id === c.n.id).map(v => ({ v, hs: A.nv.hoSoNguonGoc(c.so, v.id, c.bg) })).filter(x => x.hs?.dangCachLy);
      const banGap = A.nv.loNenBanGap(c.so, c.n.id, c.bg);
      const tong = viec.don.length + viec.loiMoi.length + viec.baoGia.length + viec.hen.length + viec.deNghi.length + viec.loSapAn.length + banGap.length;
      const tenKia = kn => c.so.ketNoi.find(x => x.id === kn)?.mua.ten ?? '';
      const tt = thoiTiet(c.bg);
      return {
        dau: dauGoc(c),
        than: h`${c.hs.xacMinh !== 'da_xac_minh' ? U.the(h`<div class="row">${U.icon('identity', 26)}<span>${c.hs.xacMinh === 'cho_duyet' ? 'Đang chờ duyệt xác minh. Bên mua sẽ thấy huy hiệu "đã xác minh" khi xong.' : 'Chưa xác minh. Chụp căn cước để bên mua tin tưởng hơn.'}</span></div>`, { den: 'bat-dau.html#xac-minh', vien: 'lam' }) : ''}
          <div class="grid2">${U.nut('Nói để ghi', { den: 'vuon.html#ghi', kieu: 'phu', icon: 'microphone' })}${U.nut('Đăng hàng', { den: 'dang.html#dang', icon: 'plus' })}</div>
          <section class="stack" aria-label="Việc cần làm">
            <h2 class="h2">Việc cần làm ${tong ? h`<span class="muted num">(${tong})</span>` : ''}</h2>
            ${tong ? '' : U.trong('Chưa có việc nào cần bạn làm', 'Đơn, lời mời, báo giá cần bạn trả lời sẽ hiện ở đây.')}
            ${viec.don.map(d => h`<div class="stack s8">${U.theDon(d, c.bg)}<span class="small muted" style="padding:0 4px">${A.nv.viecTiep(d, 'ban')}</span></div>`)}
            ${viec.deNghi.map(d => U.the(h`<strong>${d.donMa}: bên mua đề nghị ${d.loai === 'doi_lich' ? 'đổi ngày giao' : d.loai === 'giam_luong' ? 'giảm lượng' : 'đổi giá'}</strong><span class="small muted">${d.lyDo}</span>`, { den: AM.den('chi-tiet-don', { ma: d.donMa }), vien: 'lam' }))}
            ${viec.loiMoi.map(k => U.the(h`<strong>${k.mua.ten} muốn kết nối</strong><span class="small muted">${c.so.lo.find(l => l.id === k.loId)?.ten ?? ''} · ${U.tuongDoi(k.guiLuc, c.bg)}</span>`, { den: AM.den('ket-noi', { kn: k.id }), vien: 'lam' }))}
            ${viec.baoGia.map(b => U.the(h`<strong>${tenKia(b.ketNoiId)} gửi báo giá ${U.dong(b.gia)}/kg</strong><span class="small muted">${U.luong(b.kg)} · giao ${U.nd(b.ngayGiao)}</span>`, { den: AM.den('bao-gia', { kn: b.ketNoiId }), vien: 'lam' }))}
            ${viec.hen.map(x => U.the(h`<strong>${tenKia(x.ketNoiId)} đề nghị hẹn xem vườn</strong><span class="small muted">${x.luc.replace('T', ' lúc ')}</span>`, { den: AM.den('hen-xem', { kn: x.ketNoiId }), vien: 'lam' }))}
            ${viec.loSapAn.map(l => U.the(h`<strong>Tin ${l.ten} ${l.tinhTrang === 'da_an' ? 'đã tự ẩn' : 'sắp tự ẩn'}</strong><span class="small muted">Bên mua chỉ thấy lô khi bạn xác nhận còn hàng trong 14 ngày.</span>${U.nut('Vẫn còn hàng', { bam: 'conHang', nho: true, data: { lo: l.id } })}`, { vien: 'lam' }))}
            ${banGap.map(l => U.the(h`<strong>${l.ten} chưa có khách hỏi sau ${Math.floor((c.bg - l.dangLuc) / 864e5)} ngày</strong><span class="small muted">${A.nv.NHAN_LOAI[A.nv.loaiCua(l)]}, còn ${U.luong(A.nv.conBan(l))}. Bật bán gấp để app báo nhà máy chế biến; có đối tác bao tiêu nhận ở giá sàn.</span>${U.nut('Bán gấp, ai nhận', { den: AM.den('ban-gap', { lo: l.id }), nho: true })}`, { vien: 'lam' }))}
          </section>
          ${cachLy.map(({ v, hs }) => U.bao(`${v.ten} đang trong thời gian cách ly thuốc tới hết ${U.nd(hs.cachLy)}. Chưa hái bán trước ngày này.`, 'vang'))}
          ${U.the(h`<div class="row between"><h2 class="h2">Thời tiết 3 ngày</h2>${U.chip('dự báo mô phỏng')}</div>
            <div class="luoi-3">${tt.map((t, i) => h`<div class="stack s8" style="align-items:center;text-align:center"><span class="small muted">${i === 0 ? 'Hôm nay' : U.ndNgan(t.ngay)}</span>${U.icon(t.mua ? 'rain' : 'sun', 30)}<strong class="num">${t.nhiet}°C</strong><span class="xs muted">${t.mua ? `mưa ${t.luong} mm` : 'nắng'}</span></div>`)}</div>
            ${tt.some(t => t.mua) ? h`<span class="small">Có mưa trong 3 ngày tới: tránh phun thuốc, che hàng đã hái.</span>` : ''}`)}
          ${U.the(h`<div class="row between"><h2 class="h2">7 ngày qua</h2>${U.icon('report', 24)}</div>
            <div class="luoi-3"><div class="stack s8"><span class="xs muted">Đã bán</span><strong class="num">${U.luong(tuan.daBanKg)}</strong></div><div class="stack s8"><span class="xs muted">Đã thu</span><strong class="num">${U.tienGon(tuan.daThu)}</strong></div><div class="stack s8"><span class="xs muted">Đã chi</span><strong class="num">${U.tienGon(tuan.daChi)}</strong></div></div>`, { den: '#tong-ket-tuan' })}`,
      };
    },
    bam: { conHang: (c, el) => c.lam({ loai: 'con_hang', loId: el.dataset.lo }, { bao: 'Đã xác nhận còn hàng. Tin hiện lại 14 ngày.' }) },
  });

  AM.man('tong-ket-tuan', {
    ve(c) {
      const { nay, truoc } = A.nv.tongKetTuan(c.so, c.n.id, c.bg);
      const so2 = (a, b) => (b ? `${a >= b ? 'tăng' : 'giảm'} ${Math.abs(Math.round(((a - b) / b) * 100))}% so với tuần trước` : 'tuần trước chưa có');
      const dong = (nhan, a, b, kg) => U.the(h`<span class="muted">${nhan}</span><span class="so-lon">${kg ? U.luong(a) : U.dong(a)}</span><span class="small muted">${so2(a, b)}</span>`);
      return h`<p class="muted">7 ngày tới ${U.gioNgay(c.bg)}. Tiền thu gồm tiền bán qua app (đơn đã nhận đủ) và khoản thu bạn tự ghi.</p>
        ${dong('Đã bán', nay.daBanKg, truoc.daBanKg, true)}${dong('Đã thu', nay.daThu, truoc.daThu)}${dong('Đã chi', nay.daChi, truoc.daChi)}
        ${U.the(h`<span class="muted">Lời tạm tính</span><span class="so-lon" style="color:${nay.loi >= 0 ? 'var(--reu)' : 'var(--gach)'}">${U.dong(nay.loi)}</span><span class="small muted">${nay.soDon} đơn hoàn tất trong tuần</span>`, { lop: 'noi' })}
        ${U.nut('Xem sổ thu chi', { den: 'vuon.html#thu-chi', kieu: 'phu' })}`;
    },
  });

  const ICON_TB = { don: 'order', ket_noi: 'people', tin: 'chat', bao_gia: 'quote', hen: 'appointment', he_thong: 'bell' };
  AM.man('thong-bao', {
    ve(c) {
      const ds = A.mc.thongBao(c.so, c.n);
      const homNay = A.nv.ngayCua(c.bg);
      const nhom = [['Hôm nay', ds.filter(t => A.nv.ngayCua(t.luc) === homNay)], ['Trước đó', ds.filter(t => A.nv.ngayCua(t.luc) !== homNay)]].filter(([, d]) => d.length);
      const lienKet = man => { const [id, q] = man.split('?'); return AM.den(id, Object.fromEntries(new URLSearchParams(q || ''))); };
      return h`${ds.length ? '' : U.trong('Chưa có thông báo', 'Khi bên mua gửi lời mời, nhắn tin, đặt cọc, nhập cân, chuyển tiền… thông báo hiện ở đây.')}
        ${nhom.map(([ten, d]) => h`<section class="stack s8"><h2 class="h2">${ten}</h2>${d.map(t => U.the(h`<div class="row top-align">${U.icon(ICON_TB[t.loai] || 'bell', 24)}<span class="grow">${t.noiDung}</span></div><span class="xs muted">${U.tuongDoi(t.luc, c.bg)}</span>`, { den: lienKet(t.man) }))}</section>`)}`;
    },
  });
})();
