// Hàng đang bán: danh sách lô, chi tiết lô, báo lượng còn lại, sắp có hàng, chứng từ, lô gộp nhiều hộ.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;
  const NHAN_LO = { dang_ban: ['Đang bán', 'xong'], con_it: ['Còn ít', 'lam'], sap_an: ['Sắp tự ẩn', 'lam'], da_an: ['Đang ẩn', 'loi'], da_chot_het: ['Đã chốt hết', 'cho'] };
  const chipLo = t => U.chip(NHAN_LO[t][0], NHAN_LO[t][1]);
  const DANG_BAN = ['dang_ban', 'con_it', 'sap_an'];
  const loCua = c => { const lo = c.so.lo.find(l => l.id === c.ts('lo') && l.ban.id === c.n.id); return lo ? { lo, tt: A.nv.tinhTrangLo(lo, c.bg, c.so.chinhSach.hanHienThiLo) } : null; };
  const khongCoLo = () => U.trong('Không tìm thấy lô', '', U.nut('Về Hàng đang bán', { den: '#hang', nho: true }));

  AM.man('hang', {
    st: () => ({ tab: 'ban' }),
    ve(c) {
      const ds = A.mc.loCuaToi(c.so, c.n, c.bg);
      const loc = ds.filter(l => (c.st.tab === 'tat' ? true : c.st.tab === 'ban' ? DANG_BAN.includes(l.tinhTrang) : !DANG_BAN.includes(l.tinhTrang)));
      const soKhach = id => c.so.ketNoi.filter(k => k.loId === id && ['cho', 'dong_y'].includes(k.trangThai)).length;
      const loiMoi = A.mc.loiMoiChoToi(c.so, c.n).length;
      return h`<div class="luoi-3">${U.nut('Đăng', { den: 'dang.html#dang', nho: true, icon: 'plus' })}${U.nut('Sắp có', { den: '#sap-co-hang', kieu: 'phu', nho: true })}${U.nut('Lô gộp', { den: '#lo-gop', kieu: 'phu', nho: true })}</div>
        ${U.the(h`<div class="row">${U.icon('people', 28)}<span class="grow"><strong>Khách hỏi mua</strong><br><span class="small muted">${loiMoi ? `${loiMoi} lời mời chờ bạn trả lời` : 'Lời mời, tin nhắn, báo giá, tin cần mua'}</span></span><span class="chevron">›</span></div>`, { den: 'khach.html#khach', vien: loiMoi ? 'lam' : '' })}
        ${U.tab(c, 'tab', [['ban', 'Đang bán', ds.filter(l => DANG_BAN.includes(l.tinhTrang)).length], ['het', 'Hết, ẩn'], ['tat', 'Tất cả']])}
        ${loc.length ? '' : U.trong(c.st.tab === 'ban' ? 'Chưa có lô nào đang bán' : 'Không có lô nào', 'Chụp ảnh hoặc nói để đăng một lô. Bên mua tìm thấy lô đang bán và còn lượng.', c.st.tab === 'ban' ? U.nut('Đăng hàng', { den: 'dang.html#dang', nho: true }) : '')}
        ${loc.map(l => U.theLo(l, l.tinhTrang, l.conBanDuoc, soKhach(l.id)))}`;
    },
  });

  AM.man('chi-tiet-lo', {
    ten: c => loCua(c)?.lo.ten || 'Chi tiết lô',
    st: () => ({ suaGia: false, gia: '' }),
    ve(c) {
      const x = loCua(c);
      if (!x) return khongCoLo();
      const { lo, tt } = x;
      const anh = lo.anh.filter(a => !a.startsWith('giay|'));
      const don = c.so.don.filter(d => d.loId === lo.id);
      const khach = c.so.ketNoi.filter(k => k.loId === lo.id && ['cho', 'dong_y'].includes(k.trangThai));
      const mau = A.dm.mauCua(lo.matHang);
      const cachLy = lo.vuonId ? A.nv.hetCachLy(c.so, lo.vuonId) : null;
      return h`<div class="anh-lon"><img src="${A.anhMH(lo.matHang, anh[0])}" alt="${lo.ten}"></div>
        ${anh.length > 1 ? h`<div class="hang-anh">${anh.slice(1).map(a => U.anh(lo.matHang, a, 'nho'))}</div>` : ''}
        <div class="row between">${chipLo(tt)}<span class="row" style="gap:6px">${A.nv.dangBanGap(lo, c.bg) ? U.chip('Bán gấp', 'loi') : ''}${U.chip(A.nv.NHAN_LOAI[A.nv.loaiCua(lo)], lo.choCheBien ? 'cho' : '')}</span></div>
        ${lo.moTa ? h`<p>${lo.moTa}</p>` : ''}
        ${U.the(h`${U.dong2('Lượng lô', `${U.luong(lo.kg)} ${lo.coSo === 'da_can' ? 'đã cân' : 'ước tính'}`)}${U.dong2('Còn bán được', U.luong(A.nv.conBan(lo)))}${U.dong2('Đã hứa (đơn đã xác nhận)', U.luong(lo.hua))}${U.dong2('Đã giao', U.luong(lo.giao))}
          ${U.dong2('Giá', lo.gia ? `${U.so(lo.gia)} đ/kg` : 'Nhận báo giá')}
          ${lo.haiTu ? U.dong2('Ngày hái', `${U.nd(lo.haiTu)}${lo.haiDen ? ` – ${U.nd(lo.haiDen)}` : ''}`) : ''}
          ${(mau?.truong || []).filter(t => lo.thuocTinh[t.ma]).map(t => U.dong2(t.nhan, `${lo.thuocTinh[t.ma]}${t.kieu === 'so' ? ` ${t.donVi}` : ''}`))}
          ${U.dong2('Xác nhận còn hàng', U.tuongDoi(lo.conHangLuc, c.bg))}`)}
        ${cachLy && cachLy > A.nv.ngayCua(c.bg) ? U.bao(`Vườn của lô đang cách ly thuốc tới hết ${U.nd(cachLy)}.`, 'vang') : ''}
        ${c.st.suaGia
          ? U.the(h`${U.o(c, { k: 'gia', nhan: 'Giá mới (để trống = nhận báo giá)', kieu: 'so', donVi: 'đ/kg' })}<div class="grid2">${U.nut('Thôi', { bam: '_bat', data: { k: 'suaGia' }, kieu: 'phu', nho: true })}${U.nut('Lưu giá', { bam: 'luuGia', nho: true })}</div>`)
          : h`<div class="grid2">${U.nut('Sửa giá', { bam: 'moGia', kieu: 'phu', nho: true })}${U.nut('Bán bớt / báo lượng', { den: AM.den('cap-nhat-luong', { lo: lo.id }), kieu: 'phu', nho: true })}</div>`}
        <div class="grid2">
          ${['sap_an', 'da_an'].includes(tt) && !lo.an ? U.nut('Vẫn còn hàng', { bam: 'conHang', nho: true })
            : lo.an ? U.nut('Hiện lại tin', { bam: 'hien', nho: true })
            : U.nut('Ẩn tin', { bam: 'an', kieu: 'phu', nho: true, hoi: 'Ẩn tin lô này?|Bên mua không tìm thấy lô nữa. Đơn đang có vẫn chạy bình thường.|Ẩn tin' })}
          ${U.nut('Chứng từ', { den: AM.den('chung-tu', { lo: lo.id }), kieu: 'phu', nho: true })}
        </div>
        ${A.nv.conBan(lo) > 0 ? h`<div class="grid2">${U.nut(A.nv.laKemLoai(lo) ? 'Bán gấp, ai nhận hàng' : 'Ai nhận hàng xấu', { den: AM.den('ban-gap', { lo: lo.id }), kieu: A.nv.laKemLoai(lo) ? '' : 'phu', nho: true })}${!lo.thanhPhan ? U.nut('Tách theo loại', { den: AM.den('tach-lo', { lo: lo.id }), kieu: 'phu', nho: true }) : ''}</div>` : ''}
        ${lo.vuonId ? U.nut('Hồ sơ nguồn gốc của lô', { den: AM.den('ho-so-vuon', { vuon: lo.vuonId }), kieu: 'phu', nho: true, icon: 'origin' }) : ''}
        ${lo.thanhPhan ? U.the(h`<strong class="h2">Phần của từng hộ</strong>${lo.thanhPhan.map(t => U.dong2(t.ho, U.luong(t.kg)))}${U.nut('Xem tiền chia từng hộ', { den: 'toi.html#phan-cua-toi', kieu: 'phu', nho: true })}`) : ''}
        <section class="stack s8"><h2 class="h2">Đơn của lô (${don.length})</h2>${don.length ? don.map(d => U.theDon(d, c.bg)) : h`<span class="muted">Chưa có đơn.</span>`}</section>
        <section class="stack s8"><h2 class="h2">Khách đang hỏi (${khach.length})</h2>${khach.map(k => U.the(h`<div class="row between"><strong>${k.mua.ten}</strong>${U.chip(k.trangThai === 'cho' ? 'Chờ bạn trả lời' : 'Đang trao đổi', k.trangThai === 'cho' ? 'lam' : 'xong')}</div>`, { den: AM.den(k.trangThai === 'cho' ? 'ket-noi' : 'chat', { kn: k.id }) }))}</section>
        ${U.nut('Cần hỗ trợ về lô này', { den: AM.den('can-ho-tro', { lo: lo.ten }), kieu: 'phu', nho: true, icon: 'help' })}`;
    },
    bam: {
      moGia: c => c.dat({ suaGia: true, gia: loCua(c)?.lo.gia ? String(loCua(c).lo.gia) : '' }),
      luuGia(c) { const kq = c.lam({ loai: 'sua_lo', loId: c.ts('lo'), gia: String(c.st.gia).trim() ? U.docSo(c.st.gia) : null }, { bao: 'Đã sửa giá.' }); if (kq.ok) c.dat({ suaGia: false }); },
      conHang: c => c.lam({ loai: 'con_hang', loId: c.ts('lo') }, { bao: 'Đã xác nhận còn hàng. Tin hiện 14 ngày nữa.' }),
      hien: c => c.lam({ loai: 'an_lo', loId: c.ts('lo'), an: false }, { bao: 'Tin đã hiện lại.' }),
      an: c => c.lam({ loai: 'an_lo', loId: c.ts('lo'), an: true }, { bao: 'Đã ẩn tin.' }),
    },
  });

  // Hàng kém loại: bán gấp, ai nhận (bên mua chế biến, tin cần mua, đối tác bao tiêu), giữ hàng hoặc sơ chế thay vì bán đổ
  AM.man('ban-gap', {
    ten: 'Bán gấp, ai nhận hàng',
    st: () => ({ gia: '' }),
    ve(c) {
      const x = loCua(c);
      if (!x) return khongCoLo();
      const { lo } = x, NV = A.nv, con = NV.conBan(lo), loai = NV.loaiCua(lo);
      const gap = NV.dangBanGap(lo, c.bg), ai = NV.nguoiNhanHangKemLoai(c.so, lo);
      const g = NV.giaThamKhao(c.so, lo.matHang, c.bg, { loai });
      return h`<div class="row between"><strong>${lo.ten}</strong>${U.chip(NV.NHAN_LOAI[loai], NV.laKemLoai(lo) ? 'cho' : '')}</div>
        <p class="small muted">Còn ${U.luong(con)} · ${lo.gia ? `${U.so(lo.gia)} đ/kg` : 'nhận báo giá'}. Hàng loại 2, 3, hàng dạt vẫn có người mua: nhà máy sấy, nước ép, đông lạnh, chợ đầu mối. App báo cho họ; bạn không phải hạ giá hàng đẹp.</p>
        ${U.the(gap
          ? h`<div class="row between"><strong class="h2">Đang bán gấp</strong>${U.chip(`tới ${U.gioNgay(lo.banGap.den)}`, 'loi')}</div><span class="small muted">Lô lên đầu danh sách và được báo tới mọi bên mua nhận hàng kém loại.</span>${U.nut('Tắt bán gấp', { bam: 'tat', kieu: 'phu', nho: true })}`
          : h`<strong class="h2">Bật bán gấp ${c.so.chinhSach.hanBanGap ? `${Math.round(c.so.chinhSach.hanBanGap / 864e5)} ngày` : '3 ngày'}</strong>
            <span class="small muted">${g.gia ? `Giá tham khảo ${NV.NHAN_LOAI[loai].toLowerCase()}: ${U.so(g.gia)} đ/kg (${g.soDon} đơn đã chốt 30 ngày qua). App không ép giá: bạn tự đặt.` : 'Chưa đủ đơn đã chốt để có giá tham khảo cho loại này.'}</span>
            ${U.o(c, { k: 'gia', nhan: 'Giá bán gấp (để trống = giữ giá hiện tại)', kieu: 'so', donVi: 'đ/kg' })}
            ${U.nut('Bật bán gấp', { bam: 'bat', nho: true, tat: !con })}`, { vien: gap ? 'loi' : '' })}
        <section class="stack s8"><h2 class="h2">Bên mua nhận hàng kém loại (${ai.nhan.length})</h2>
          ${ai.nhan.length ? ai.nhan.map(n => U.the(h`<div class="row between"><strong>${n.ten}</strong>${U.chip(n.daKetNoi ? 'Đã kết nối' : gap ? 'Đã được báo' : 'Sẽ được báo khi bán gấp', n.daKetNoi ? 'xong' : 'cho')}</div><span class="small muted">${n.vung} · nhận từ ${U.luong(n.kgToiThieu)}</span>`)) : h`<span class="muted small">Chưa có bên mua đăng ký nhận ${A.tenMH(lo.matHang).toLowerCase()} kém loại với lượng này.</span>`}
          ${ai.coNhuCau.map(n => U.the(h`<strong>${n.ten}</strong><span class="small muted">Đang cần ${U.luong(n.kg)}${n.giaTran ? `, giá tới ${U.so(n.giaTran)} đ/kg` : ''}</span>${U.nut('Chào hàng vào tin này', { den: AM.den('nhu-cau', { nc: n.nhuCauId }), kieu: 'phu', nho: true })}`, { den: AM.den('nhu-cau', { nc: n.nhuCauId }) }))}
        </section>
        <section class="stack s8"><h2 class="h2">Người nhận cuối cùng (bao tiêu)</h2>
          ${ai.baoTieu.length ? ai.baoTieu.map(b => U.the(h`<div class="row between"><strong>${b.ten}</strong>${U.chip('Đối tác bao tiêu', 'xong')}</div>
            ${U.dong2('Giá sàn cam kết', `${U.so(b.gia)} đ/kg`)}${U.dong2('Ước tính cho phần còn lại', `${U.so(b.gia * con)} đ`)}${U.dong2('Nơi nhận', b.diemGom)}
            <span class="small muted">AgiViet đã ký thỏa thuận khung: dù không ai mua, lô vẫn có người nhận ở giá sàn này.</span>
            ${U.nut('Nhờ AgiViet nối với đối tác', { bam: 'baoTieu', nho: true, data: { ten: b.ten, gia: b.gia } })}`)) : h`<span class="muted small">Chưa có đối tác bao tiêu cho mặt hàng này.</span>`}
        </section>
        ${U.the(h`<strong class="h2">Giữ hàng chờ giá, hoặc sơ chế</strong><span class="small muted">Thay vì bán đổ: gửi kho lạnh giữ hàng, hoặc thuê sấy, cấp đông để bán được lâu.</span>
          <div class="grid2">${U.nut('Thuê kho lạnh', { bam: 'dichVu', kieu: 'phu', nho: true, data: { dv: 'kho_lanh' } })}${U.nut('Thuê sấy, cấp đông', { bam: 'dichVu', kieu: 'phu', nho: true, data: { dv: 'so_che' } })}</div>`)}
        ${!lo.thanhPhan && loai === 'loai_1' ? U.nut('Tách phần kém loại ra lô riêng', { den: AM.den('tach-lo', { lo: lo.id }), kieu: 'phu', nho: true }) : ''}`;
    },
    bam: {
      bat: c => c.lam({ loai: 'bat_ban_gap', loId: c.ts('lo'), ...(String(c.st.gia).trim() ? { gia: U.docSo(c.st.gia) } : {}) }, { bao: 'Đã bật bán gấp. App báo cho các bên mua nhận hàng kém loại.' }),
      tat: c => c.lam({ loai: 'tat_ban_gap', loId: c.ts('lo') }, { bao: 'Đã tắt bán gấp.' }),
      baoTieu: (c, el) => { const lo = loCua(c)?.lo; c.lam({ loai: 'gui_ho_tro', chuDe: 'Bao tiêu', noiDung: `Nhờ nối ${lo?.ten} (${U.luong(A.nv.conBan(lo))}) với ${el.dataset.ten}, giá sàn ${U.so(Number(el.dataset.gia))} đ/kg` }, { bao: 'Đã gửi. Đội AgiViet gọi lại để hẹn xe nhận hàng.' }); },
      dichVu: (c, el) => c.lam({ loai: 'yeu_cau_dich_vu', dichVu: el.dataset.dv, ngay: A.nv.ngayCua(c.bg + 864e5), loId: c.ts('lo'), ghiChu: el.dataset.dv === 'kho_lanh' ? 'Giữ hàng kém loại chờ giá' : 'Sấy hoặc cấp đông hàng kém loại' }, { bao: 'Đã gửi yêu cầu. Đối tác báo giá trong ít phút.', den: ['dich-vu', {}] }),
    },
  });

  AM.man('tach-lo', {
    ten: 'Tách lô theo loại',
    st: () => ({ loai1: 'loai_2', kg1: '', gia1: '', loai2: 'dat', kg2: '', gia2: '' }),
    ve(c) {
      const x = loCua(c);
      if (!x) return khongCoLo();
      const { lo } = x, NV = A.nv, con = NV.conBan(lo);
      const LUA = NV.LOAI_HANG.filter(l => l !== 'loai_1').map(l => [l, NV.NHAN_LOAI[l]]);
      const tong = (U.docSo(c.st.kg1) || 0) + (U.docSo(c.st.kg2) || 0);
      const gtk = l => { const g = NV.giaThamKhao(c.so, lo.matHang, c.bg, { loai: l }); return g.gia ? `Giá tham khảo ${U.so(g.gia)} đ/kg` : 'Chưa có giá tham khảo'; };
      const phan = i => U.the(h`<strong>Phần ${i}</strong>${U.chon(c, { k: `loai${i}`, nhan: 'Loại', boc: true, lua: LUA })}
        <div class="grid2">${U.o(c, { k: `kg${i}`, nhan: 'Lượng', kieu: 'so', donVi: 'kg', veLai: true })}${U.o(c, { k: `gia${i}`, nhan: 'Giá (trống = báo giá)', kieu: 'so', donVi: 'đ/kg' })}</div>
        <span class="small muted">${gtk(c.st[`loai${i}`])}</span>`);
      return {
        than: h`<p class="muted">${lo.ten}: còn bán được ${U.luong(con)}. Tách phần trái nhỏ, trầy, chín ép ra lô riêng: lô gốc giữ giá hàng đẹp, phần kém loại đi tới bên mua chế biến.</p>
          ${phan(1)}${phan(2)}
          ${U.dong2('Lô gốc còn lại', U.luong(Math.max(0, lo.kg - tong)))}
          ${tong >= con ? U.bao(`Phần tách phải nhỏ hơn ${U.luong(con)} còn bán được.`, 'vang') : ''}`,
        duoi: U.nut('Tách lô', { bam: 'tach' }),
      };
    },
    bam: {
      tach(c) {
        const phan = [1, 2].map(i => ({ loai: c.st[`loai${i}`], kg: U.docSo(c.st[`kg${i}`]) || 0, gia: String(c.st[`gia${i}`]).trim() ? U.docSo(c.st[`gia${i}`]) : null })).filter(p => p.kg > 0);
        if (!phan.length) return c.bao('Nhập lượng cho ít nhất một phần.', 'loi');
        c.lam({ loai: 'tach_lo', loId: c.ts('lo'), phan }, { bao: `Đã tách ${phan.length} lô kém loại.`, den: ma => ['ban-gap', { lo: ma }] });
      },
    },
  });

  AM.man('cap-nhat-luong', {
    st: c => { const lo = loCua(c)?.lo; return { kg: lo ? String(lo.kg) : '', coSo: lo?.coSo ?? 'uoc_tinh' }; },
    ve(c) {
      const x = loCua(c);
      if (!x) return khongCoLo();
      const { lo } = x, moi = U.docSo(c.st.kg);
      return {
        than: h`<p class="muted">${lo.ten}: hiện ${U.luong(lo.kg)}, đã hứa ${U.luong(lo.hua)}, đã giao ${U.luong(lo.giao)}.</p>
          ${lo.thanhPhan ? U.bao('Lô gộp nhiều hộ: sửa phần từng hộ ở màn Lô gộp.') : h`
            ${U.o(c, { k: 'kg', nhan: 'Lượng còn lại của lô', kieu: 'so', donVi: 'kg', veLai: true })}
            <div class="hang-nut">${[-500, -100, 100, 500].map(d => U.nut(`${d > 0 ? '+' : '−'}${Math.abs(d)} kg`, { bam: 'cong', kieu: 'phu', nho: true, data: { d } }))}</div>
            ${U.chon(c, { k: 'coSo', nhan: 'Cơ sở', lua: [['uoc_tinh', 'Ước tính'], ['da_can', 'Đã cân']] })}
            ${moi > 0 && moi < lo.hua ? U.bao(`Lượng mới (${U.luong(moi)}) thấp hơn lượng đã hứa (${U.luong(lo.hua)}). Thỏa thuận cũ vẫn giữ: vào từng đơn gửi đề nghị giảm lượng cho bên mua.`, 'vang') : ''}`}`,
        duoi: lo.thanhPhan ? '' : U.nut('Báo lượng mới', { bam: 'luu' }),
      };
    },
    bam: {
      cong: (c, el) => c.dat({ kg: String(Math.max(0, (U.docSo(c.st.kg) || 0) + Number(el.dataset.d))) }),
      luu: c => c.lam({ loai: 'cap_nhat_luong', loId: c.ts('lo'), kg: U.docSo(c.st.kg), coSo: c.st.coSo }, { bao: `Đã ghi lượng mới ${U.luong(U.docSo(c.st.kg) || 0)}.`, den: ['chi-tiet-lo', { lo: c.ts('lo') }] }),
    },
  });

  AM.man('sap-co-hang', {
    st: () => ({ matHang: [], kg: '', haiTu: '', haiDen: '', vuonId: '', moTa: '' }),
    ve(c) {
      const vuon = c.so.vuon.filter(v => v.ban.id === c.n.id);
      return {
        than: h`<p class="muted">Đăng trước mùa để bên mua lên kế hoạch. Lượng là ước tính; giá để bên mua báo.</p>
          ${U.chonMH(c, { k: 'matHang', mot: true })}
          ${U.o(c, { k: 'kg', nhan: 'Lượng ước', kieu: 'so', donVi: 'kg' })}
          <div class="grid2">${U.o(c, { k: 'haiTu', nhan: 'Hái từ ngày', kieu: 'ngay', min: A.nv.ngayCua(c.bg) })}${U.o(c, { k: 'haiDen', nhan: 'Đến ngày', kieu: 'ngay' })}</div>
          ${vuon.length ? U.chon(c, { k: 'vuonId', nhan: 'Của vườn', boc: true, lua: [['', 'Không ghi'], ...vuon.map(v => [v.id, v.ten])] }) : ''}
          ${U.o(c, { k: 'moTa', nhan: 'Ghi chú cho bên mua', kieu: 'chu-dai' })}`,
        duoi: U.nut('Đăng tin sắp có hàng', { bam: 'dang' }),
      };
    },
    bam: {
      dang(c) {
        const mh = A.dm.timMatHang(c.st.matHang[0] ?? '');
        if (!mh) return c.bao('Chọn mặt hàng sắp có.', 'loi');
        if (!c.st.haiTu) return c.bao('Chọn ngày bắt đầu hái để bên mua lên kế hoạch.', 'loi');
        c.lam({ loai: 'dang_lo', matHang: mh.id, ten: `${mh.ten} (sắp có hàng)`, kg: U.docSo(c.st.kg), coSo: 'uoc_tinh', gia: null, haiTu: c.st.haiTu, ...(c.st.haiDen ? { haiDen: c.st.haiDen } : {}), ...(c.st.vuonId ? { vuonId: c.st.vuonId } : {}), moTa: c.st.moTa || 'Sắp có hàng: nhận đặt trước, báo giá.', anh: mh.anh ? [mh.anh] : [] }, { bao: 'Đã đăng tin sắp có hàng.', den: ma => ['xong', { lo: ma }] });
      },
    },
  });

  AM.man('chung-tu', {
    st: () => ({ loai: 'Giấy kiểm nghiệm' }),
    ve(c) {
      const x = loCua(c);
      if (!x) return khongCoLo();
      const { lo } = x;
      const giay = lo.anh.filter(a => a.startsWith('giay|')), anh = lo.anh.filter(a => !a.startsWith('giay|'));
      return h`<p class="muted">${lo.ten}: giấy tờ và ảnh giúp bên mua tin hàng. Kết quả cân của từng đơn tự lưu ở chi tiết đơn.</p>
        ${U.the(h`<strong class="h2">Giấy tờ (${giay.length})</strong>
          ${giay.map(g => { const [, l, t] = g.split('|'); return h`<div class="row between"><span class="row" style="gap:8px">${U.icon('report', 24)}<span><strong>${l}</strong><br><span class="small muted">${t}</span></span></span>${U.nut('Gỡ', { bam: 'go', kieu: 'phu', nho: true, data: { g }, hoi: 'Gỡ giấy tờ này?||Gỡ|canh' })}</div>`; })}
          ${U.chon(c, { k: 'loai', boc: true, lua: ['Giấy kiểm nghiệm', 'Chứng nhận VietGAP', 'Mã số vùng trồng', 'Khác'].map(v => [v, v]) })}
          <label class="btn phu nho">${U.icon('upload', 22)}Chụp hoặc chọn ${c.st.loai.toLowerCase()}<input type="file" accept="image/*,application/pdf" class="sr-only" data-tep="giay"></label>`)}
        ${U.the(h`<strong class="h2">Ảnh lô (${anh.length})</strong><div class="hang-anh">${anh.map(a => U.anh(lo.matHang, a, 'nho'))}</div>
          <label class="btn phu nho">${U.icon('camera', 22)}Chụp thêm ảnh<input type="file" accept="image/*" capture="environment" class="sr-only" data-tep="anh"></label>`)}`;
    },
    sau(c, el) {
      el.querySelectorAll('input[data-tep]').forEach(o => o.addEventListener('change', async () => {
        const tep = o.files?.[0], lo = loCua(c)?.lo;
        if (!tep || !lo) return;
        try {
          const muc = o.dataset.tep === 'giay' ? `giay|${c.st.loai}|${tep.name}` : await A.anhNho(tep);
          c.lam({ loai: 'sua_lo', loId: lo.id, anh: [...lo.anh, muc] }, { bao: o.dataset.tep === 'giay' ? `Đã thêm ${c.st.loai.toLowerCase()}.` : 'Đã thêm ảnh.' });
        } catch (e) { c.bao(e.message, 'loi'); }
      }));
    },
    bam: { go: (c, el) => { const lo = loCua(c).lo; c.lam({ loai: 'sua_lo', loId: lo.id, anh: lo.anh.filter(a => a !== el.dataset.g) }, { bao: 'Đã gỡ.' }); } },
  });

  AM.man('lo-gop', {
    st: () => ({ matHang: [], gia: '', ho: [{ ho: '', kg: '' }, { ho: '', kg: '' }] }),
    ve(c) {
      const ds = A.mc.loCuaToi(c.so, c.n, c.bg).filter(l => l.thanhPhan);
      const tong = c.st.ho.reduce((s, x) => s + (U.docSo(x.kg) || 0), 0);
      return h`${ds.map(l => U.the(h`<div class="row between"><strong>${l.ten}</strong>${chipLo(l.tinhTrang)}</div>
          ${l.thanhPhan.map(t => U.dong2(t.ho, `${U.luong(t.kg)} · ${Math.round((t.kg / l.kg) * 100)}%`))}
          <div class="grid2">${U.nut('Chi tiết', { den: AM.den('chi-tiet-lo', { lo: l.id }), kieu: 'phu', nho: true })}${U.nut('Nhắc gửi giấy', { bam: 'nhac', kieu: 'phu', nho: true, data: { ten: l.ten } })}</div>`))}
        ${U.the(h`<strong class="h2">Tạo lô gộp mới</strong><p class="small muted">Gộp hàng nhiều hộ thành một lô lớn. Tiền về được chia theo phần kg của từng hộ.</p>
          ${U.chonMH(c, { k: 'matHang', mot: true })}
          ${c.st.ho.map((x, i) => h`<div class="grid2"><label class="truong"><span class="label">Hộ ${i + 1}</span><span class="o-nhap"><input data-ho="${i}" data-truong="ho" value="${x.ho}" placeholder="Tên chủ hộ"></span></label><label class="truong"><span class="label">Lượng</span><span class="o-nhap"><input inputmode="decimal" data-ho="${i}" data-truong="kg" value="${x.kg}"><span class="tien-to">kg</span></span></label></div>`)}
          <div class="hang-nut">${U.nut('Thêm hộ', { bam: 'themHo', kieu: 'phu', nho: true })}${c.st.ho.length > 2 ? U.nut('Bớt hộ cuối', { bam: 'botHo', kieu: 'phu', nho: true }) : ''}</div>
          ${U.dong2('Tổng lượng lô', U.luong(tong))}
          ${U.o(c, { k: 'gia', nhan: 'Giá (để trống = nhận báo giá)', kieu: 'so', donVi: 'đ/kg' })}
          ${U.nut('Đăng lô gộp', { bam: 'dang', nho: true })}`, { lop: 'noi' })}`;
    },
    sau(c, el) {
      el.querySelectorAll('input[data-ho]').forEach(o => o.addEventListener('input', () => {
        c.st.ho[Number(o.dataset.ho)][o.dataset.truong] = o.value;
        c.dat({ ho: c.st.ho }, false);
      }));
    },
    bam: {
      themHo: c => c.dat({ ho: [...c.st.ho, { ho: '', kg: '' }] }),
      botHo: c => c.dat({ ho: c.st.ho.slice(0, -1) }),
      nhac: (c, el) => c.lam({ loai: 'gui_ho_tro', chuDe: 'Lô gộp', noiDung: `Nhắc các hộ của ${el.dataset.ten} gửi giấy kiểm nghiệm` }, { bao: 'Đã gửi nhắc các hộ gửi giấy (qua tổng đài hỗ trợ).' }),
      dang(c) {
        const mh = A.dm.timMatHang(c.st.matHang[0] ?? '');
        const tp = c.st.ho.map(x => ({ ho: x.ho, kg: U.docSo(x.kg) || 0 }));
        c.lam({ loai: 'dang_lo', matHang: mh?.id ?? '', ten: mh ? `${mh.ten} (lô gộp ${tp.length} hộ)` : '', kg: tp.reduce((s, x) => s + x.kg, 0), coSo: 'da_can', gia: String(c.st.gia).trim() ? U.docSo(c.st.gia) : null, thanhPhan: tp, anh: mh?.anh ? [mh.anh] : [] }, { bao: 'Đã đăng lô gộp.', den: ma => ['chi-tiet-lo', { lo: ma }] });
      },
    },
  });
})();
