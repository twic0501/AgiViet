// Đăng hàng: chọn cách (chụp, nói, gõ, từ mùa vụ) → mặt hàng → ảnh / lời nói → kiểm tra → xem lại như bên mua thấy → đã đăng.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;
  const NHAP_LO = { cach: 'chup', matHang: '', ten: '', kg: '', coSo: 'uoc_tinh', gia: '', nhanBaoGia: false, thuocTinh: {}, choCheBien: false, loaiHang: 'loai_1', haiTu: '', haiDen: '', vuonId: '', anh: [], moTa: '', loiNoi: '' };
  const lo = c => c.nhap('dang-lo', NHAP_LO);
  const matHangTuCay = cay => A.dm.timTheoChu(cay, 1)[0]?.id ?? A.dm.timTheoChu(cay.split(' ')[0] ?? '', 1)[0]?.id ?? '';
  const batDauMoi = (c, gt) => { const n = lo(c); n.xoa(); lo(c).dat({ ...NHAP_LO, ...gt }, false); };

  const CACH = [
    ['chup', 'Chụp ảnh', 'Chụp 2–3 tấm, app điền sẵn mặt hàng', 'camera', 'chon-mat-hang'],
    ['noi', 'Nói', '"Xoài cát Chu 10 tấn, giá 25 nghìn"', 'microphone', 'nghe'],
    ['go', 'Tự gõ', 'Chọn mặt hàng, điền lượng, giá', 'keyboard', 'chon-mat-hang'],
  ];
  AM.man('dang', {
    ve(c) {
      const vu = c.so.muaVu.filter(m => m.ban.id === c.n.id && m.giaiDoan !== 'xong');
      return h`<ol class="steps" aria-label="Bước 1 trên 4"><li class="cur"><span class="dot">1</span>Chụp, nói</li><li class="line"></li><li><span class="dot">2</span>Kiểm tra</li><li class="line"></li><li><span class="dot">3</span>Xem lại</li><li class="line"></li><li><span class="dot">4</span>Đăng</li></ol>
        ${CACH.map(([cach, ten, moTa, ic, den]) => h`<button type="button" class="lua-the" data-bam="bat" data-cach="${cach}" data-den="${den}">${U.icon(ic, 34)}<span class="stack" style="gap:2px"><strong class="h2">${ten}</strong><span class="small muted">${moTa}</span></span></button>`)}
        ${vu.length ? h`<section class="stack s8"><h2 class="h2">Từ mùa vụ đang có</h2>${vu.map(m => { const v = c.so.vuon.find(x => x.id === m.vuonId); return h`<button type="button" class="lua-the" data-bam="tuVu" data-vu="${m.id}">${U.icon('season', 30)}<span class="stack" style="gap:2px"><strong>${m.ten}</strong><span class="small muted">${v?.ten} · ước ${U.luong(m.sanLuongUoc)} · hái ${U.nd(m.haiDuKien)}</span></span></button>`; })}</section>` : ''}
        ${U.nut('Ghi nhật ký hoặc thu chi thay vì đăng hàng', { den: 'vuon.html#ghi', kieu: 'phu', nho: true, icon: 'journal' })}`;
    },
    bam: {
      bat: (c, el) => { batDauMoi(c, { cach: el.dataset.cach }); AM.xoaSt('nghe'); c.di(el.dataset.den); },
      tuVu(c, el) {
        const m = c.so.muaVu.find(x => x.id === el.dataset.vu), v = c.so.vuon.find(x => x.id === m.vuonId);
        batDauMoi(c, { cach: 'vu', vuonId: v.id, matHang: matHangTuCay(v.cay), ten: v.cay, kg: String(m.sanLuongUoc || ''), haiTu: m.haiDuKien });
        c.di('kiem-tra');
      },
    },
  });

  AM.man('chon-mat-hang', {
    ve(c) {
      const n = lo(c).gt;
      return {
        than: U.chonMH(c, { n: 'dang-lo:dsMH', mot: true }),
        duoi: U.nut('Tiếp tục', { bam: 'tiep', tat: !(n.dsMH?.length || n.matHang) }),
      };
    },
    bam: {
      tiep(c) {
        const n = lo(c), mh = A.dm.timMatHang(n.gt.dsMH?.[0] ?? n.gt.matHang);
        if (!mh) return c.bao('Chọn mặt hàng.', 'loi');
        n.dat({ matHang: mh.id, ten: n.gt.matHang === mh.id && n.gt.ten ? n.gt.ten : mh.ten }, false);
        c.di(n.gt.cach === 'chup' ? 'chup' : 'kiem-tra');
      },
    },
  });

  AM.man('chup', {
    st: () => ({ loi: '' }),
    ve(c) {
      const n = lo(c).gt;
      return {
        than: h`${U.the(h`<strong class="h2">Gợi ý chụp</strong><ul class="small" style="margin:0;padding-left:20px"><li>Một tấm toàn cảnh đống hàng hoặc vườn.</li><li>Một tấm cận trái, để thấy cỡ và màu.</li><li>Một tấm cắt đôi trái (nếu được), để thấy ruột.</li><li>Đủ sáng, không chụp ngược nắng.</li></ul>`)}
          <label class="card stack" style="align-items:center;text-align:center;border-style:dashed;cursor:pointer">${U.icon('camera', 44)}<strong>Chụp ảnh hàng</strong><span class="small muted">Tối đa 4 tấm (${n.anh.length}/4)</span><input type="file" accept="image/*" capture="environment" multiple class="sr-only" data-chup></label>
          ${c.st.loi ? U.bao(c.st.loi, 'loi') : ''}
          <div class="hang-anh">${n.anh.map((a, i) => h`<span class="stack s8" style="align-items:center">${U.anh(n.matHang, a, 'nho')}${U.nut('Bỏ', { bam: 'bo', kieu: 'phu', nho: true, data: { i } })}</span>`)}</div>`,
        duoi: U.nut(n.anh.length ? `Tiếp tục (${n.anh.length} ảnh)` : 'Bỏ qua, dùng ảnh mẫu', { den: '#kiem-tra' }),
      };
    },
    sau(c, el) {
      el.querySelector('input[data-chup]')?.addEventListener('change', async e => {
        const n = lo(c);
        try { const moi = await Promise.all([...e.target.files].slice(0, 4 - n.gt.anh.length).map(f => A.anhNho(f))); n.dat({ anh: [...n.gt.anh, ...moi] }); c.dat({ loi: '' }); } catch (er) { c.dat({ loi: er.message }); }
      });
    },
    bam: { bo: (c, el) => { const n = lo(c); n.dat({ anh: n.gt.anh.filter((_, j) => j !== Number(el.dataset.i)) }); } },
  });

  let dungNghe = () => {};
  AM.man('nghe', {
    st: () => ({ dang: false, loi: '' }),
    ve(c) {
      const n = lo(c).gt, t = A.tl.tachLoiDang(n.loiNoi || '');
      return {
        than: h`<button type="button" class="mic-lon" aria-pressed="${String(!!c.st.dang)}" data-bam="mic" aria-label="${c.st.dang ? 'Dừng nghe' : 'Bắt đầu nói'}">${U.icon('microphone', 56)}</button>
          <p class="muted" style="text-align:center">${c.st.dang ? 'Đang nghe…' : A.tn.coTheNghe() ? 'Bấm và nói: mặt hàng, bao nhiêu, giá, khi nào hái' : 'Máy này chưa nghe được: gõ vào ô bên dưới'}</p>
          ${c.st.loi ? U.bao(c.st.loi, 'loi') : ''}
          ${U.o(c, { n: 'dang-lo:loiNoi', nhan: 'Lời nói (sửa được)', kieu: 'chu-dai', ph: 'Xoài cát Chu 10 tấn, giá 25 nghìn một ký, hái từ cuối tuần' })}
          ${n.loiNoi ? U.the(h`<strong class="h2">App hiểu</strong>${U.dong2('Mặt hàng', t.matHang ? A.tenMH(t.matHang) : 'chưa rõ, sẽ hỏi')}${U.dong2('Lượng', t.kg ? U.luong(t.kg) : 'chưa rõ')}${U.dong2('Giá', t.gia ? `${U.so(t.gia)} đ/kg` : 'chưa rõ')}${U.nut('Hiểu lại câu vừa sửa', { bam: '_dat', kieu: 'phu', nho: true, data: { k: 'x', v: Date.now() } })}`) : U.nut('Thử câu mẫu', { bam: 'mau', kieu: 'phu', nho: true })}`,
        duoi: h`${U.nut('Nói xong', { bam: 'tiep', tat: !(n.loiNoi || '').trim() })}${U.nut('Nói lại', { bam: 'lai', kieu: 'phu' })}`,
      };
    },
    bam: {
      mic(c) {
        if (c.st.dang) { dungNghe(); return c.dat({ dang: false }); }
        c.dat({ dang: true, loi: '' });
        dungNghe = A.tn.ngheNoi(chu => lo(c).dat({ loiNoi: chu }), loi => c.dat({ loi, dang: false }), () => c.dat({ dang: false }));
      },
      mau: c => lo(c).dat({ loiNoi: 'Xoài cát Chu 8 tấn, giá 24 nghìn một ký, hái cuối tuần' }),
      lai: c => lo(c).dat({ loiNoi: '' }),
      tiep(c) {
        const n = lo(c), t = A.tl.tachLoiDang(n.gt.loiNoi);
        const mh = t.matHang ? A.dm.timMatHang(t.matHang) : undefined;
        n.dat({ ...(mh ? { matHang: mh.id, ten: mh.ten, dsMH: [mh.id] } : {}), ...(t.kg ? { kg: String(t.kg) } : {}), ...(t.gia ? { gia: String(t.gia) } : {}), moTa: n.gt.moTa || n.gt.loiNoi }, false);
        c.di(mh ? 'kiem-tra' : 'chon-mat-hang');
      },
    },
  });

  AM.man('kiem-tra', {
    ve(c) {
      const n = lo(c).gt, mh = A.dm.timMatHang(n.matHang), mau = A.dm.mauCua(n.matHang);
      if (!mh) return U.trong('Chưa chọn mặt hàng', '', U.nut('Chọn mặt hàng', { den: '#chon-mat-hang', nho: true }));
      const vuon = c.so.vuon.filter(v => v.ban.id === c.n.id);
      const het = n.vuonId ? A.nv.hetCachLy(c.so, n.vuonId) : null;
      const viPham = het && het > (n.haiTu || A.nv.ngayCua(c.bg));
      const NV = A.nv, loai = n.loaiHang || 'loai_1', gia = U.docSo(n.gia);
      const g = NV.danhGiaGia(c.so, mh.id, gia, c.bg, loai), von = NV.giaVonCuaVuon(c.so, n.vuonId);
      const nc = c.so.nhuCau.filter(x => x.trangThai === 'mo' && x.matHang === mh.id).length;
      const truong = t => (t.kieu === 'chon'
        ? h`<div class="truong"><span class="label">${t.nhan}</span><div class="chon-boc">${t.luaChon.map(l => h`<button type="button" aria-pressed="${String(n.thuocTinh[t.ma] === l)}" data-bam="tt" data-ma="${t.ma}" data-v="${l}">${l}</button>`)}</div></div>`
        : h`<label class="truong"><span class="label">${t.nhan}</span><span class="o-nhap"><input inputmode="decimal" data-tt="${t.ma}" value="${n.thuocTinh[t.ma] ?? ''}" placeholder="${t.goiY || ''}"><span class="tien-to">${t.donVi}</span></span></label>`);
      return {
        than: h`<ol class="steps"><li class="xong"><span class="dot">✓</span>Chụp, nói</li><li class="line xong"></li><li class="cur"><span class="dot">2</span>Kiểm tra</li><li class="line"></li><li><span class="dot">3</span>Xem lại</li><li class="line"></li><li><span class="dot">4</span>Đăng</li></ol>
          ${U.the(h`<div class="row">${U.anh(mh.id, n.anh[0], 'nho')}<div class="grow stack" style="gap:2px"><strong>${mh.ten}</strong><span class="small muted">Bấm để đổi mặt hàng</span></div></div>`, { den: '#chon-mat-hang' })}
          ${mh.muc === 'D' ? U.bao(`Mặt hàng bán có điều kiện: ${mh.dieuKien}`, 'vang') : ''}
          ${U.o(c, { n: 'dang-lo:ten', nhan: 'Tên trên tin' })}
          <div class="grid2">${U.o(c, { n: 'dang-lo:kg', nhan: 'Lượng', kieu: 'so', donVi: 'kg' })}${U.chon(c, { n: 'dang-lo:coSo', nhan: 'Cơ sở', lua: [['uoc_tinh', 'Ước tính'], ['da_can', 'Đã cân']] })}</div>
          ${U.congTac(c, { n: 'dang-lo:nhanBaoGia', nhan: 'Nhận báo giá (chưa đặt giá)' })}
          ${U.chon(c, { n: 'dang-lo:loaiHang', nhan: 'Loại hàng', boc: true, lua: NV.LOAI_HANG.map(l => [l, NV.NHAN_LOAI[l]]) })}
          ${loai !== 'loai_1' ? U.bao('Hàng loại 2, 3, hàng dạt chỉ hiện cho bên mua nhận hàng chế biến (nhà máy sấy, nước ép, đông lạnh) và được báo cho họ. Một lần hái có cả hàng đẹp lẫn hàng xấu thì đăng hàng đẹp trước, rồi tách phần xấu ra ở chi tiết lô.') : ''}
          ${n.nhanBaoGia ? '' : U.o(c, { n: 'dang-lo:gia', nhan: 'Giá', kieu: 'so', donVi: 'đ/kg', veLai: true, goiY: g.thamKhao.gia ? `Giá tham khảo ${NV.NHAN_LOAI[loai].toLowerCase()}: ${U.so(g.thamKhao.gia)} đ/kg (${g.thamKhao.soDon} đơn đã chốt 30 ngày qua, từ ${U.so(g.thamKhao.thap)} đến ${U.so(g.thamKhao.cao)})` : 'Chưa đủ đơn đã chốt để có giá tham khảo cho loại này.' })}
          ${!n.nhanBaoGia && gia > 0 && (g.muc === 'thap' || g.muc === 'bat_thuong') ? U.bao(`Giá thấp hơn mặt bằng ${g.lech}%. App không ép giá, nhưng bạn đang để mất tiền: ${nc ? `${nc} bên mua đang cần mặt hàng này, ` : ''}hãy đợi khách trả giá hoặc nhận báo giá.`, g.muc === 'bat_thuong' ? 'loi' : 'vang') : ''}
          ${!n.nhanBaoGia && gia > 0 && von && gia < von ? U.bao(`Giá này dưới giá vốn ước tính của bạn (${U.so(von)} đ/kg, theo sổ thu chi của vụ).`, 'vang') : ''}
          ${mau ? U.the(h`<strong class="h2">Chia loại (${mau.ten})</strong>${mau.truong.map(truong)}`) : ''}
          ${vuon.length ? U.chon(c, { n: 'dang-lo:vuonId', nhan: 'Của vườn (để có hồ sơ nguồn gốc)', boc: true, lua: [['', 'Không ghi'], ...vuon.map(v => [v.id, v.ten])] }) : ''}
          <div class="grid2">${U.o(c, { n: 'dang-lo:haiTu', nhan: 'Hái từ ngày', kieu: 'ngay' })}${U.o(c, { n: 'dang-lo:haiDen', nhan: 'Đến ngày', kieu: 'ngay' })}</div>
          ${viPham ? h`${U.bao(`Vườn này còn trong thời gian cách ly thuốc tới hết ${U.nd(het)}. Không bán hàng hái trước ngày đó.`, 'loi')}${U.nut(`Đặt ngày hái ${U.nd(het)}`, { bam: '_nhap', kieu: 'phu', nho: true, data: { n: 'dang-lo:haiTu', v: het } })}` : ''}
          ${U.o(c, { n: 'dang-lo:moTa', nhan: 'Mô tả thêm', kieu: 'chu-dai', ph: 'Xoài bao trái, vườn có nhật ký canh tác' })}`,
        duoi: U.nut('Tiếp: xem lại', { bam: 'tiep' }),
      };
    },
    sau(c, el) {
      el.querySelectorAll('input[data-tt]').forEach(o => o.addEventListener('input', () => { const n = lo(c); n.dat({ thuocTinh: { ...n.gt.thuocTinh, [o.dataset.tt]: o.value } }, false); }));
    },
    bam: {
      tt: (c, el) => { const n = lo(c); n.dat({ thuocTinh: { ...n.gt.thuocTinh, [el.dataset.ma]: el.dataset.v } }); },
      tiep(c) {
        const n = lo(c).gt;
        if (!(U.docSo(n.kg) > 0)) return c.bao('Ghi lượng lớn hơn 0.', 'loi');
        if (!n.nhanBaoGia && !(U.docSo(n.gia) > 0)) return c.bao('Ghi giá, hoặc bật "Nhận báo giá".', 'loi');
        const het = n.vuonId ? A.nv.hetCachLy(c.so, n.vuonId) : null;
        if (het && het > (n.haiTu || A.nv.ngayCua(c.bg))) return c.bao(`Vườn còn cách ly thuốc tới hết ${U.nd(het)}. Chọn ngày hái từ ngày đó.`, 'loi');
        c.di('xem-lai');
      },
    },
  });

  AM.man('xem-lai', {
    ve(c) {
      const n = lo(c).gt, mh = A.dm.timMatHang(n.matHang), hs = A.mc.hoSoCongKhai(c.so, c.n.id), mau = A.dm.mauCua(n.matHang);
      if (!mh || !hs) return U.trong('Chưa có tin để xem lại', '', U.nut('Đăng hàng', { den: '#dang', nho: true }));
      const kg = U.docSo(n.kg), gia = n.nhanBaoGia ? null : U.docSo(n.gia);
      const doc = `${n.ten}, ${U.luong(kg)} ${n.coSo === 'da_can' ? 'đã cân' : 'ước tính'}. ${gia ? `Giá ${U.so(gia)} đồng một ký.` : 'Nhận báo giá.'} ${n.haiTu ? `Hái từ ngày ${U.nd(n.haiTu)}.` : ''} Người bán ở ${hs.vung}.`;
      return {
        than: h`<ol class="steps"><li class="xong"><span class="dot">✓</span>Chụp, nói</li><li class="line xong"></li><li class="xong"><span class="dot">✓</span>Kiểm tra</li><li class="line xong"></li><li class="cur"><span class="dot">3</span>Xem lại</li><li class="line"></li><li><span class="dot">4</span>Đăng</li></ol>
          ${U.bao('Bên mua thấy tin như dưới đây. Số điện thoại, địa chỉ nhà của bạn không hiện; chỉ mở khi bên mua đã đặt cọc.')}
          ${U.the(h`<div class="anh-lon"><img src="${A.anhMH(mh.id, n.anh[0] || mh.anh)}" alt=""></div><strong class="h2">${n.ten || mh.ten}</strong>
            <span class="small muted">${hs.ten} · ${hs.vung || 'chưa ghi vùng'}${hs.daXacMinh ? ' · đã xác minh' : ''} · uy tín ${A.nv.NHAN_BAC[hs.uyTin.bac]}</span>
            ${U.dong2('Lượng', `${U.luong(kg)} ${n.coSo === 'da_can' ? 'đã cân' : 'ước tính'}`)}${U.dong2('Giá', gia ? `${U.so(gia)} đ/kg` : 'Nhận báo giá')}
            ${n.haiTu ? U.dong2('Hái', `${U.nd(n.haiTu)}${n.haiDen ? ` – ${U.nd(n.haiDen)}` : ''}`) : ''}
            ${(mau?.truong || []).filter(t => n.thuocTinh[t.ma]).map(t => U.dong2(t.nhan, `${n.thuocTinh[t.ma]} ${t.kieu === 'so' ? t.donVi : ''}`))}
            <div class="hang-nut">${U.chip(A.nv.NHAN_LOAI[n.loaiHang || 'loai_1'], (n.loaiHang || 'loai_1') !== 'loai_1' ? 'cho' : '')}${n.vuonId ? U.chip('Có hồ sơ nguồn gốc', 'xong') : ''}</div>
            ${n.moTa ? h`<p>${n.moTa}</p>` : ''}`, { lop: 'noi' })}
          ${U.nghe(doc, 'Nghe lại tin')}${U.nut('Sửa', { den: '#kiem-tra', kieu: 'phu' })}`,
        duoi: U.nut('Đăng bán', { bam: 'dang' }),
      };
    },
    bam: {
      dang(c) {
        const n = lo(c).gt, mh = A.dm.timMatHang(n.matHang);
        const kq = c.lam({ loai: 'dang_lo', matHang: mh.id, ten: n.ten || mh.ten, kg: U.docSo(n.kg), coSo: n.coSo, gia: n.nhanBaoGia ? null : U.docSo(n.gia), thuocTinh: n.thuocTinh, choCheBien: n.choCheBien, loaiHang: n.loaiHang || 'loai_1', anh: n.anh.length ? n.anh : mh.anh ? [mh.anh] : [], moTa: n.moTa, ...(n.haiTu ? { haiTu: n.haiTu } : {}), ...(n.haiDen ? { haiDen: n.haiDen } : {}), ...(n.vuonId ? { vuonId: n.vuonId } : {}) }, { bao: 'Đã đăng bán.', den: ma => ['xong', { lo: ma }] });
        if (kq.ok) lo(c).xoa();
      },
    },
  });

  AM.man('xong', {
    dau: false,
    ve(c) {
      const l = c.so.lo.find(x => x.id === c.ts('lo'));
      const phuHop = l ? c.so.nhuCau.filter(n => n.trangThai === 'mo' && n.matHang === l.matHang) : [];
      return {
        dau: false,
        than: h`<div class="an-mung-moi">${U.icon('done', 56)}<strong class="so-lon">Đã đăng</strong>${l ? h`<span>${l.ten} · ${U.luong(l.kg)}</span>` : ''}</div>
          ${U.the(h`<strong>${phuHop.length ? `${phuHop.length} bên mua đang cần mặt hàng này` : 'Chưa có tin cần mua đúng mặt hàng này'}</strong>
            <span class="small muted">${phuHop.length ? 'Chào hàng để họ thấy lô của bạn sớm hơn.' : 'Bên mua tìm hàng sẽ thấy lô. Có tin cần mua mới, app báo ở Hôm nay.'}</span>
            ${phuHop.length ? U.nut('Xem và chào hàng', { den: 'khach.html#nhu-cau', kieu: 'phu', nho: true }) : ''}`)}
          ${l && A.nv.laKemLoai(l) ? U.the(h`<strong>Hàng kém loại: bán gấp được</strong><span class="small muted">Xem bên mua nhận hàng kém loại, đối tác bao tiêu giá sàn, và bật bán gấp nếu hàng dễ hư.</span>${U.nut('Ai nhận hàng này', { den: AM.den('ban-gap', { lo: l.id }), kieu: 'phu', nho: true })}`) : ''}`,
        duoi: h`${l ? U.nut('Xem lô', { den: AM.den('chi-tiet-lo', { lo: l.id }) }) : ''}${U.nut('Đăng thêm hàng', { den: '#dang', kieu: 'phu' })}`,
      };
    },
    sau(c) { const l = c.so.lo.find(x => x.id === c.ts('lo')); if (l && !c.st.daDoc) { c.st.daDoc = true; window.amDoc?.(`Đã đăng ${l.ten}`); } },
  });
})();
