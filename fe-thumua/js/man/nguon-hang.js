// Nguồn hàng: lưới lô có bộ lọc, gợi ý khớp tin cần mua, chi tiết lô (kết nối, hỏi giá, hẹn xem, lập đơn, đặt kiểm định), hồ sơ người bán.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const pct = x => (x === null || x === undefined ? 'chưa có' : `${Math.round(x * 100)}%`);
  const ketNoiLo = (c, lo) => c.so.ketNoi.find(k => k.loId === lo.id && k.mua.id === c.n.id && ['cho', 'dong_y'].includes(k.trangThai));

  AM.man('nguon-hang', {
    st: () => ({ tim: '', nhom: '', daCan: false, cheBien: false, banGap: false, xep: 'moi' }),
    ve(c) {
      const boDau = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
      let ds = A.mc.loDangBan(c.so, c.bg).filter(l => NV.conBan(l) > 0);
      if (c.st.tim.trim()) ds = ds.filter(l => boDau(`${l.ten} ${A.tenMH(l.matHang)} ${l.ban.ten}`).includes(boDau(c.st.tim)));
      if (c.st.nhom) ds = ds.filter(l => A.dm.nhomCua(l.matHang)?.id === c.st.nhom);
      if (c.st.daCan) ds = ds.filter(l => l.coSo === 'da_can');
      if (c.st.cheBien) ds = ds.filter(l => NV.laKemLoai(l));
      if (c.st.banGap) ds = ds.filter(l => NV.dangBanGap(l, c.bg));
      const xep = { moi: (a, b) => b.dangLuc - a.dangLuc, gia: (a, b) => (a.gia ?? 9e9) - (b.gia ?? 9e9), luong: (a, b) => NV.conBan(b) - NV.conBan(a) }[c.st.xep];
      ds.sort((a, b) => Number(NV.dangBanGap(b, c.bg)) - Number(NV.dangBanGap(a, c.bg)) || xep(a, b));
      const khop = NV.loKemLoaiKhop(c.so, c.n.id, c.bg);
      return h`${U.bao('Bạn thấy tên, vùng, uy tín người bán. Số điện thoại, địa chỉ vườn chỉ mở khi bạn đặt cọc một đơn.')}
        <div class="card stack s8">
          <div class="grid2">${U.o(c, { k: 'tim', nhan: 'Tìm', ph: 'Xoài, tôm, tên người bán…', veLai: true })}${U.chonO(c, { k: 'nhom', nhan: 'Nhóm hàng', lua: [['', 'Tất cả nhóm'], ...A.dm.NHOM_HANG.map(g => [g.id, g.ten])] })}</div>
          <div class="row" style="flex-wrap:wrap;gap:16px">${U.congTac(c, { k: 'daCan', nhan: 'Chỉ lô đã cân' })}${U.congTac(c, { k: 'cheBien', nhan: 'Hàng loại 2, 3, dạt' })}${U.congTac(c, { k: 'banGap', nhan: 'Đang bán gấp' })}</div>
          ${U.chon(c, { k: 'xep', nhan: 'Sắp xếp', lua: [['moi', 'Mới đăng'], ['gia', 'Giá thấp'], ['luong', 'Lượng nhiều']] })}
        </div>
        ${khop.length ? U.the(h`<div class="row between"><span><strong>${khop.length} lô kém loại khớp hồ sơ nhận hàng của bạn</strong><br><span class="small muted">${khop.filter(x => x.banGap).length} lô đang bán gấp</span></span>${U.nut('Xem', { den: '#hang-kem-loai', nho: true })}</div>`, { vien: 'lam' }) : ''}
        <div class="row between"><span class="muted">${ds.length} lô đang bán</span>${U.nut('Gợi ý khớp tin cần mua', { den: '#goi-y', kieu: 'phu', nho: true, icon: 'search' })}</div>
        ${ds.length ? h`<div class="luoi-the">${ds.map(l => U.theNguon(l, c.so, c.bg, ketNoiLo(c, l) ? U.chip(ketNoiLo(c, l).trangThai === 'dong_y' ? 'Đang trao đổi' : 'Đã gửi lời mời', 'cho') : ''))}</div>` : U.trong('Không có lô khớp bộ lọc', 'Bỏ bớt bộ lọc, hoặc đăng tin cần mua để người bán chào hàng.', U.nut('Đăng tin cần mua', { den: 'nhu-cau.html#tao-nhu-cau', nho: true }))}`;
    },
  });

  // Hàng loại 2, 3, hàng dạt: hồ sơ nhận hàng (để được báo), lô khớp, và (nếu là đối tác bao tiêu) giá sàn đã cam kết
  AM.man('hang-kem-loai', {
    ten: 'Hàng loại 2, 3, hàng dạt',
    st(c) { const k = c.hs?.nhanHangKemLoai; return { bat: !!k, matHang: k?.matHang ?? [], kg: k ? String(k.kgToiThieu) : '500', vung: k?.vung ?? '' }; },
    ve(c) {
      const k = c.hs.nhanHangKemLoai, bt = c.hs.baoTieu, khop = NV.loKemLoaiKhop(c.so, c.n.id, c.bg);
      return h`${U.bao('Hàng kém loại vẫn hợp cho sấy, nước ép, đông lạnh, chợ đầu mối. Đăng ký nhận thì khi người bán đăng hoặc bật bán gấp lô đúng mặt hàng, lô hiện ở đây và trong Nguồn hàng.')}
        <div class="hai-cot hep-trai"><div class="stack">
          ${U.the(h`<strong class="h2">Hồ sơ nhận hàng kém loại</strong>
            ${U.congTac(c, { k: 'bat', nhan: 'Tôi nhận hàng loại 2, 3, hàng dạt' })}
            ${c.st.bat ? h`${U.chonMH(c, { k: 'matHang' })}<span class="xs muted">Không chọn mặt hàng nào = nhận mọi mặt hàng.</span>
              ${U.o(c, { k: 'kg', nhan: 'Lượng tối thiểu mỗi lô', kieu: 'so', donVi: 'kg' })}
              ${U.o(c, { k: 'vung', nhan: 'Chỉ nhận ở tỉnh (trống = mọi nơi)', ph: 'Đồng Tháp' })}` : ''}
            ${U.nut('Lưu', { bam: 'luu', nho: true })}
            ${k ? h`<span class="small muted">Đang nhận: ${k.matHang.length ? k.matHang.map(A.tenMH).join(', ') : 'mọi mặt hàng'}, từ ${U.luong(k.kgToiThieu)}${k.vung ? `, ở ${k.vung}` : ''}.</span>` : ''}`)}
          ${bt ? U.the(h`<div class="row between"><strong class="h2">Đối tác bao tiêu</strong>${U.chip('Thỏa thuận khung với AgiViet', 'xong')}</div>
            <span class="small muted">Bạn cam kết nhận hàng loại 3, hàng dạt ở giá sàn dưới đây. Người bán có lô không ai mua thấy lời chào của bạn.</span>
            ${Object.entries(bt.giaSan).map(([m, g]) => U.dong2(A.tenMH(m), `${U.so(g)} đ/kg`))}${U.dong2('Điểm gom', bt.diemGom)}`) : U.the(h`<strong>Làm đối tác bao tiêu</strong><span class="small muted">Nhà máy cam kết giá sàn hàng dạt theo mùa thì được ưu tiên báo mọi lô kém loại. Đội AgiViet ký thỏa thuận khung rồi ghi lên hồ sơ.</span>${U.nut('Liên hệ AgiViet', { bam: 'lienHe', kieu: 'phu', nho: true })}`)}
        </div><section class="stack s8"><h2 class="h2">Lô khớp hồ sơ (${khop.length})</h2>
          ${khop.length ? h`<div class="luoi-the">${khop.map(x => U.theNguon(x.lo, c.so, c.bg))}</div>` : U.trong(k ? 'Chưa có lô kém loại khớp' : 'Bật nhận hàng kém loại để xem lô khớp', k ? 'Khi người bán đăng hoặc bán gấp lô đúng mặt hàng, lô hiện ở đây.' : '')}
        </section></div>`;
    },
    bam: {
      luu: c => c.lam({ loai: 'cap_nhat_nhan_hang_kem_loai', bat: !!c.st.bat, matHang: c.st.matHang, kgToiThieu: U.docSo(c.st.kg) || 0, vung: c.st.vung }, { bao: c.st.bat ? 'Đã lưu. App báo khi có lô kém loại khớp.' : 'Đã tắt nhận hàng kém loại.' }),
      lienHe: c => c.lam({ loai: 'gui_ho_tro', chuDe: 'Bao tiêu', noiDung: 'Tổ chức muốn ký thỏa thuận khung bao tiêu hàng loại 3, hàng dạt' }, { bao: 'Đã gửi. Đội AgiViet liên hệ để ký thỏa thuận khung.' }),
    },
  });

  AM.man('goi-y', {
    ve(c) {
      const nc = c.so.nhuCau.filter(n => n.mua.id === c.n.id && n.trangThai === 'mo');
      if (!nc.length) return U.trong('Chưa có tin cần mua đang mở', 'App xếp hạng lô theo mặt hàng, lượng, giá trần, ngày nhận và uy tín người bán.', U.nut('Đăng tin cần mua', { den: 'nhu-cau.html#tao-nhu-cau', nho: true }));
      const lo = A.mc.loDangBan(c.so, c.bg).filter(l => NV.conBan(l) > 0);
      return h`${U.bao('Gợi ý tự động theo luật (mặt hàng, lượng còn, giá trần, ngày hái, loại, uy tín). Luôn xem chi tiết lô trước khi kết nối.')}
        ${nc.map(n => { const xh = lo.map(l => ({ l, ...U.xepHang(n, l, c.so) })).filter(x => x.diem > 0).sort((a, b) => b.diem - a.diem).slice(0, 4);
          return h`<section class="stack s8"><h2 class="h2">${n.ten} · cần ${U.luong(n.kg)}</h2>${xh.length ? h`<div class="luoi-the">${xh.map(x => U.theNguon(x.l, c.so, c.bg, h`<strong class="small">Khớp ${x.diem}%</strong><span class="xs muted">${x.ly.join(' · ')}</span>`))}</div>` : h`<span class="muted">Chưa có lô cùng mặt hàng.</span>`}</section>`; })}`;
    },
  });

  AM.man('chi-tiet-lo', {
    ten: c => c.so.lo.find(l => l.id === c.ts('lo'))?.ten || 'Chi tiết lô',
    st: () => ({ loiNhan: '' }),
    ve(c) {
      const lo = c.so.lo.find(l => l.id === c.ts('lo'));
      if (!lo) return U.trong('Không tìm thấy lô', '', U.nut('Về Nguồn hàng', { den: '#nguon-hang', nho: true }));
      const hs = A.mc.hoSoCongKhai(c.so, lo.ban.id), kn = ketNoiLo(c, lo), mau = A.dm.mauCua(lo.matHang);
      const anh = lo.anh.filter(a => !a.startsWith('giay|')), giay = lo.anh.filter(a => a.startsWith('giay|'));
      const ng = lo.vuonId ? NV.hoSoNguonGoc(c.so, lo.vuonId, c.bg) : null;
      const luot = NV.luotDaDung(c.so, c.n.id, c.bg), hm = c.so.chinhSach.hanMuc[c.hs.goi];
      const donCuaLo = c.so.don.filter(d => d.loId === lo.id && d.mua.id === c.n.id);
      return h`<div class="hai-cot">
        <div class="stack">
          <div class="anh-lon"><img src="${A.anhMH(lo.matHang, anh[0])}" alt="${lo.ten}"></div>
          ${U.the(h`${U.dong2('Còn bán được', h`<strong>${U.luong(NV.conBan(lo))}</strong> (${lo.coSo === 'da_can' ? 'đã cân' : 'ước tính'})`)}${U.dong2('Giá', lo.gia ? `${U.so(lo.gia)} đ/kg` : 'Nhận báo giá')}
            ${lo.haiTu ? U.dong2('Ngày hái', `${U.nd(lo.haiTu)}${lo.haiDen ? ` – ${U.nd(lo.haiDen)}` : ''}`) : ''}
            ${(mau?.truong || []).filter(t => lo.thuocTinh[t.ma]).map(t => U.dong2(t.nhan, `${lo.thuocTinh[t.ma]}${t.kieu === 'so' ? ` ${t.donVi}` : ''}`))}
            ${U.dong2('Xác nhận còn hàng', U.tuongDoi(lo.conHangLuc, c.bg))}${lo.choCheBien ? U.chip('Hàng cho chế biến', 'cho') : ''}${lo.moTa ? h`<p class="small">${lo.moTa}</p>` : ''}`)}
          ${U.the(h`<strong>Hồ sơ nguồn gốc</strong>${ng ? h`${U.dong2('Vườn', `${ng.vuon.cay} · ${ng.vuon.dienTich} ${ng.vuon.donViDienTich === 'cong' ? 'công' : ng.vuon.donViDienTich}`)}${ng.vu ? U.dong2('Vụ', ng.vu.ten) : ''}${U.dong2('Nhật ký canh tác', `${ng.nhatKy.length} dòng`)}${U.dong2('Hết cách ly thuốc', ng.cachLy ? U.nd(ng.cachLy) : 'không có lần phun')}${U.dong2('Mức đầy đủ', `${ng.mucDayDu}%`)}` : h`<span class="small muted">Lô chưa gắn vườn: không có nhật ký canh tác.</span>`}
            ${giay.length ? h`<span class="small">Giấy tờ: ${giay.map(g => g.split('|')[1]).join(', ')}</span>` : h`<span class="small muted">Chưa có giấy kiểm nghiệm.</span>`}`)}
        </div>
        <div class="stack">
          ${hs ? U.the(h`<div class="row"><span class="anh-dai-dien">${hs.ten.replace(/^(Chị|Anh|Cô|Chú|Bà|Ông)\s+/i, '').charAt(0)}</span><div class="grow"><strong>${hs.ten}</strong><br><span class="small muted">${hs.vung}</span></div></div>
            <div class="row" style="flex-wrap:wrap;gap:6px">${hs.daXacMinh ? U.chip('Đã xác minh', 'xong') : ''}${U.chip(`Uy tín ${NV.NHAN_BAC[hs.uyTin.bac]}`)}${U.chip(`${hs.uyTin.soDonXong} đơn hoàn tất`)}</div>
            ${U.dong2('Giao đủ', pct(hs.uyTin.tyLeGiaoDu))}${U.nut('Xem hồ sơ người bán', { den: AM.den('ho-so-ban', { id: hs.id }), kieu: 'phu', nho: true })}`) : ''}
          ${!kn ? U.the(h`<strong>Kết nối với người bán</strong><span class="small muted">Người bán đồng ý thì hai bên nhắn tin, báo giá, hẹn xem vườn và lập đơn. Lượt kết nối tháng này: ${luot.ketNoi}/${hm.ketNoi}.</span>
              ${U.o(c, { k: 'loiNhan', nhan: 'Lời nhắn', kieu: 'chu-dai', ph: 'Bên em cần hàng đều cho chuyền sấy, anh chị cho xem thêm ảnh.' })}${U.nut('Gửi lời mời kết nối', { bam: 'moi', icon: 'people' })}`, { vien: 'tot' })
            : kn.trangThai === 'cho' ? U.the(h`${U.chip('Đã gửi lời mời, chờ người bán trả lời', 'cho')}<span class="small muted">Gửi ${U.tuongDoi(kn.guiLuc, c.bg)}. Người bán từ chối thì lượt được trả lại.</span>${U.nut('Rút lời mời', { bam: 'rut', kieu: 'phu', nho: true, data: { kn: kn.id } })}`)
            : U.the(h`${U.chip('Người bán đã đồng ý kết nối', 'xong')}
              <div class="grid2">${U.nut('Nhắn tin', { den: AM.den('tin-nhan', { kn: kn.id }), kieu: 'phu', nho: true, icon: 'chat' })}${U.nut('Hỏi giá, gửi giá', { den: AM.den('gui-bao-gia', { kn: kn.id }), kieu: 'phu', nho: true, icon: 'quote' })}
                ${U.nut('Hẹn xem vườn', { den: AM.den('hen-xem-vuon', { kn: kn.id }), kieu: 'phu', nho: true, icon: 'appointment' })}${U.nut('Đặt kiểm định', { den: AM.den('yeu-cau-dich-vu', { lo: lo.id, loai: 'kiem_dinh' }), kieu: 'phu', nho: true })}</div>
              ${U.nut('Lập đơn mua', { den: AM.den('thoa-thuan', { lo: lo.id }), icon: 'agreement' })}`, { vien: 'tot' })}
          ${donCuaLo.length ? h`<section class="stack s8"><h2 class="h2">Đơn của bạn với lô này</h2>${donCuaLo.map(d => U.theDon(d, c.bg))}</section>` : ''}
        </div></div>`;
    },
    bam: {
      moi: c => c.lam({ loai: 'gui_loi_moi', loId: c.ts('lo'), loiNhan: c.st.loiNhan }, { bao: 'Đã gửi lời mời. Người bán đồng ý thì app báo bạn.' }),
      rut: (c, el) => c.lam({ loai: 'rut_loi_moi', ketNoiId: el.dataset.kn }, { bao: 'Đã rút lời mời, lượt được trả lại.' }),
    },
  });

  AM.man('ho-so-ban', {
    ve(c) {
      const id = c.ts('id'), hs = A.mc.hoSoCongKhai(c.so, id);
      if (!hs || hs.vai !== 'ban') return U.trong('Không tìm thấy người bán');
      const lo = A.mc.loDangBan(c.so, c.bg).filter(l => l.ban.id === id && NV.conBan(l) > 0);
      const nx = c.so.danhGia.filter(g => g.cho.id === id), don = c.so.don.filter(d => d.ban.id === id && d.mua.id === c.n.id);
      const ll = A.mc.lienLacCua(c.so, c.n, id);
      return h`<div class="hai-cot"><div class="stack">
          ${U.the(h`<div class="row"><span class="anh-dai-dien">${hs.ten.replace(/^(Chị|Anh|Cô|Chú|Bà|Ông)\s+/i, '').charAt(0)}</span><div class="grow"><strong class="h2">${hs.ten}</strong><br><span class="small muted">${hs.vung} · tham gia ${new Date(hs.thamGia).getFullYear()}</span></div></div>
            ${U.dong2('Uy tín', NV.NHAN_BAC[hs.uyTin.bac])}${U.dong2('Đơn hoàn tất', hs.uyTin.soDonXong)}${U.dong2('Giao đủ', pct(hs.uyTin.tyLeGiaoDu))}${U.dong2('Hủy sau cọc', hs.uyTin.soHuyDoMinh)}${U.dong2('Tranh chấp', hs.uyTin.soTranhChap)}${U.dong2('Điểm', hs.uyTin.diemDanhGia === null ? 'chưa có' : `${hs.uyTin.diemDanhGia.toFixed(1)} / 5`)}`)}
          ${ll ? U.bao(`Đã có đơn đặt cọc: liên lạc ${ll.ten} · ${ll.sdt} · ${ll.diaChi}`, 'tot') : U.bao('Số điện thoại, địa chỉ vườn chỉ hiện sau khi bạn đặt cọc một đơn với người bán này.')}
          <section class="stack s8"><h2 class="h2">Nhận xét từ bên mua (${nx.length})</h2>${nx.map(g => U.the(h`${U.sao(g.diem)}<span>${g.nhanXet || 'Không ghi nhận xét'}</span><span class="xs muted">${g.tu.ten} · ${g.donMa}</span>`))}</section>
        </div><div class="stack">
          <section class="stack s8"><h2 class="h2">Lô đang bán (${lo.length})</h2>${lo.map(l => U.theNguon(l, c.so, c.bg))}</section>
          ${don.length ? h`<section class="stack s8"><h2 class="h2">Đơn với bạn (${don.length})</h2>${don.map(d => U.theDon(d, c.bg))}</section>` : ''}
        </div></div>`;
    },
  });
})();
