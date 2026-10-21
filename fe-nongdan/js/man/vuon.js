// Sổ làm vườn: vườn, mùa vụ, nhật ký, thu chi, nói để ghi, kiểm tra dòng vừa ghi, cách ly, hồ sơ nguồn gốc.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;
  const GIAI_DOAN = [['chuan_bi', 'Chuẩn bị'], ['ra_hoa', 'Ra hoa'], ['dau_trai', 'Đậu trái, lớn'], ['thu_hoach', 'Thu hoạch'], ['xong', 'Đã xong']];
  const VIEC = { phun_thuoc: ['Phun thuốc', 'spray'], bon_phan: ['Bón phân', 'fertilizer'], tuoi: ['Tưới', 'watering'], thu_hoach: ['Thu hoạch', 'harvest'], cham_soc: ['Chăm sóc', 'leaf'], khac: ['Khác', 'journal'] };
  const donViDT = d => (d === 'cong' ? 'công' : d === 'm2' ? 'm²' : 'ha');
  const vuonCuaToi = c => c.so.vuon.filter(v => v.ban.id === c.n.id);
  const vuonChon = c => { const ds = vuonCuaToi(c); return ds.find(v => v.id === c.ts('vuon')) ?? ds[0]; };
  const mau = (so) => (so >= 0 ? 'var(--reu)' : 'var(--gach)');
  const matHangTuCay = cay => A.dm.timTheoChu(cay, 1)[0]?.id ?? A.dm.timTheoChu(cay.split(' ')[0] ?? '', 1)[0]?.id ?? '';
  const NHAP_LO = { cach: 'chup', matHang: '', ten: '', kg: '', coSo: 'uoc_tinh', gia: '', nhanBaoGia: false, thuocTinh: {}, choCheBien: false, haiTu: '', haiDen: '', vuonId: '', anh: [], moTa: '', loiNoi: '' };

  AM.man('vuon', {
    st: () => ({ them: false, ten: '', cay: '', dienTich: '', donVi: 'cong', loai: 'vuon', soGoc: '' }),
    ve(c) {
      const ds = vuonCuaToi(c);
      return {
        than: h`${!ds.length && !c.st.them ? U.trong('Chưa khai vườn, ao nào', 'Khai vườn để ghi nhật ký, biết lời lỗ từng vụ, và đăng bán có hồ sơ nguồn gốc.', U.nut('Thêm vườn', { bam: '_bat', data: { k: 'them' }, nho: true })) : ''}
          ${ds.map(v => {
            const hs = A.nv.hoSoNguonGoc(c.so, v.id, c.bg);
            return U.the(h`<div class="row between"><div class="stack" style="gap:2px"><strong class="h2">${v.ten}</strong><span class="small muted">${v.cay} · ${v.dienTich} ${donViDT(v.donViDienTich)}${v.soGoc ? ` · ${v.soGoc} gốc` : ''}</span></div>${U.icon(v.loai === 'ao' ? 'pond' : 'garden', 30)}</div>
              ${hs.vu ? h`<span>Vụ đang chạy: <strong>${hs.vu.ten}</strong> · ${GIAI_DOAN.find(g => g[0] === hs.vu.giaiDoan)?.[1]}</span>` : h`<span class="muted">Chưa có vụ đang chạy</span>`}
              ${hs.dangCachLy ? U.chip(`Cách ly thuốc tới ${U.nd(hs.cachLy)}`, 'loi') : ''}
              <span class="small">Hồ sơ vườn đầy đủ ${hs.mucDayDu}%</span>${U.tienTrinh(hs.mucDayDu / 100, 'Mức đầy đủ hồ sơ vườn')}
              <div class="luoi-3">${U.nut('Mùa vụ', { den: AM.den('mua-vu', { vuon: v.id }), kieu: 'phu', nho: true })}${U.nut('Nhật ký', { den: AM.den('nhat-ky', { vuon: v.id }), kieu: 'phu', nho: true })}${U.nut('Nguồn gốc', { den: AM.den('ho-so-vuon', { vuon: v.id }), kieu: 'phu', nho: true })}</div>`, { lop: 'noi' });
          })}
          ${ds.length && !c.st.them ? U.nut('Thêm vườn, ao', { bam: '_bat', data: { k: 'them' }, kieu: 'phu', icon: 'plus' }) : ''}
          ${c.st.them ? U.the(h`<strong class="h2">Thêm vườn, ao</strong>
            ${U.chon(c, { k: 'loai', lua: [['vuon', 'Vườn'], ['ao', 'Ao, đầm'], ['ruong', 'Ruộng']] })}
            ${U.o(c, { k: 'ten', nhan: 'Tên gọi', ph: 'Vườn sau nhà' })}${U.o(c, { k: 'cay', nhan: 'Cây trồng / con nuôi', ph: 'Xoài cát Chu' })}
            <div class="grid2">${U.o(c, { k: 'dienTich', nhan: 'Diện tích', kieu: 'so' })}${U.chon(c, { k: 'donVi', nhan: 'Đơn vị', lua: [['cong', 'công'], ['ha', 'ha'], ['m2', 'm²']] })}</div>
            ${U.o(c, { k: 'soGoc', nhan: 'Số gốc', kieu: 'so' })}
            <div class="grid2">${U.nut('Thôi', { bam: '_bat', data: { k: 'them' }, kieu: 'phu', nho: true })}${U.nut('Lưu', { bam: 'luu', nho: true })}</div>`) : ''}
          <nav class="viec-khac" aria-label="Việc khác"><span class="xs muted b">Sổ vườn</span><a href="#thu-chi">${U.icon('income-expense', 20)}Thu chi</a><a href="#cach-ly">${U.icon('quarantine', 20)}Cách ly thuốc</a><a href="#nhat-ky">${U.icon('journal', 20)}Nhật ký</a></nav>`,
        duoi: U.nut('Nói để ghi nhật ký, thu chi', { den: '#ghi', icon: 'microphone' }),
      };
    },
    bam: {
      luu(c) {
        const v = c.st;
        const kq = c.lam({ loai: 'them_vuon', ten: v.ten, loaiVuon: v.loai, dienTich: U.docSo(v.dienTich), donViDienTich: v.donVi, cay: v.cay, soGoc: U.docSo(v.soGoc) || 0 }, { bao: 'Đã thêm vườn.' });
        if (kq.ok) c.dat({ them: false, ten: '', cay: '', dienTich: '', soGoc: '' });
      },
    },
  });

  AM.man('mua-vu', {
    st: c => ({ ten: '', batDau: A.nv.ngayCua(c.bg), san: '', hai: '' }),
    ve(c) {
      const v = vuonChon(c);
      if (!v) return U.trong('Chưa có vườn', '', U.nut('Thêm vườn', { den: '#vuon', nho: true }));
      const vu = c.so.muaVu.find(m => m.vuonId === v.id && m.giaiDoan !== 'xong');
      const cu = c.so.muaVu.filter(m => m.vuonId === v.id && m.giaiDoan === 'xong');
      const iDang = vu ? GIAI_DOAN.findIndex(g => g[0] === vu.giaiDoan) : -1;
      const ll = vu ? A.nv.loiLoVu(c.so, vu.id) : null;
      return {
        than: h`<span class="muted">${v.ten} · ${v.cay}</span>
          ${vu ? h`${U.the(h`<strong class="h2">${vu.ten}</strong>
              <ol class="dong-thoi-gian">${GIAI_DOAN.map((g, i) => h`<li class="${i < iDang ? 'qua' : i === iDang ? 'dang' : ''}"><span>${g[1]}${i === iDang ? ' · đang ở đây' : ''}</span></li>`)}</ol>
              ${iDang < GIAI_DOAN.length - 1 ? U.nut(`Sang giai đoạn "${GIAI_DOAN[iDang + 1][1]}"`, { bam: 'sang', kieu: 'phu', nho: true, data: { vu: vu.id, gd: GIAI_DOAN[iDang + 1][0] } }) : ''}`, { lop: 'noi' })}
            ${U.the(h`${U.dong2('Bắt đầu vụ', U.nd(vu.batDau))}${U.dong2('Sản lượng ước', U.luong(vu.sanLuongUoc))}${U.dong2('Ngày hái dự kiến', U.nd(vu.haiDuKien))}
              ${U.dong2('Lời lỗ vụ tới nay', h`<span style="color:${mau(ll.loi)}">${U.dong(ll.loi)}</span>`)}
              ${U.nut('Xem thu chi của vụ', { den: AM.den('thu-chi', { vu: vu.id }), kieu: 'phu', nho: true })}`)}`
            : U.the(h`<strong class="h2">Bắt đầu vụ mới</strong>
              ${U.o(c, { k: 'ten', nhan: 'Tên vụ', ph: `${v.cay} vụ ${new Date(c.bg).getFullYear()}` })}
              <div class="grid2">${U.o(c, { k: 'batDau', nhan: 'Bắt đầu', kieu: 'ngay' })}${U.o(c, { k: 'hai', nhan: 'Hái dự kiến', kieu: 'ngay' })}</div>
              ${U.o(c, { k: 'san', nhan: 'Sản lượng ước', kieu: 'so', donVi: 'kg' })}
              ${U.nut('Bắt đầu vụ', { bam: 'batDau', nho: true })}`)}
          ${cu.length ? h`<section class="stack s8"><h2 class="h2">Vụ đã xong</h2>${cu.map(m => U.the(h`<strong>${m.ten}</strong>${U.dong2('Lời lỗ', U.dong(A.nv.loiLoVu(c.so, m.id).loi))}`))}</section>` : ''}`,
        duoi: vu ? U.nut('Đăng bán từ vụ này', { bam: 'dangBan', data: { vuon: v.id, vu: vu.id } }) : '',
      };
    },
    bam: {
      sang: (c, el) => c.lam({ loai: 'cap_nhat_mua_vu', muaVuId: el.dataset.vu, giaiDoan: el.dataset.gd }, { bao: 'Đã chuyển giai đoạn.' }),
      batDau(c) {
        const v = vuonChon(c);
        c.lam({ loai: 'them_mua_vu', vuonId: v.id, ten: c.st.ten || `${v.cay} vụ ${new Date(c.bg).getFullYear()}`, batDau: c.st.batDau, haiDuKien: c.st.hai, sanLuongUoc: U.docSo(c.st.san) || 0 }, { bao: 'Đã bắt đầu vụ mới.' });
      },
      dangBan(c, el) {
        const v = c.so.vuon.find(x => x.id === el.dataset.vuon), vu = c.so.muaVu.find(m => m.id === el.dataset.vu);
        const het = A.nv.hetCachLy(c.so, v.id), homNay = A.nv.ngayCua(c.bg);
        const n = c.nhap('dang-lo', NHAP_LO); n.xoa();
        c.nhap('dang-lo', NHAP_LO).dat({ ...NHAP_LO, cach: 'vu', vuonId: v.id, matHang: matHangTuCay(v.cay), ten: v.cay, kg: String(vu.sanLuongUoc || ''), haiTu: het && het > homNay ? het : vu.haiDuKien || homNay }, false);
        c.di('kiem-tra');
      },
    },
  });

  AM.man('nhat-ky', {
    st: c => ({ chon: c.ts('vuon') || 'tat-ca' }),
    ve(c) {
      const ds = vuonCuaToi(c);
      const dong = c.so.nhatKy.filter(k => ds.some(v => v.id === k.vuonId) && (c.st.chon === 'tat-ca' || k.vuonId === c.st.chon));
      return {
        than: h`${ds.length > 1 ? U.chonO(c, { k: 'chon', nhan: 'Vườn', lua: [['tat-ca', 'Tất cả vườn'], ...ds.map(v => [v.id, v.ten])] }) : ''}
          ${dong.length ? '' : U.trong('Chưa có dòng nhật ký', 'Nói "sáng nay phun thuốc trừ rầy cho vườn xoài, cách ly 7 ngày", app tự tách thành dòng nhật ký.')}
          ${dong.map(k => U.the(h`<div class="row between"><span class="row" style="gap:8px">${U.icon(VIEC[k.loai][1], 24)}<strong>${VIEC[k.loai][0]}</strong></span><span class="small muted">${U.nd(k.ngay)}</span></div>
            <span>${k.noiDung}</span>${k.vatTu || k.luong ? h`<span class="small muted">${[k.vatTu, k.luong].filter(Boolean).join(' · ')}</span>` : ''}
            ${k.loai === 'phun_thuoc' ? U.chip(`Cách ly ${k.ngayCachLy} ngày`, 'lam') : ''}
            <div class="row between"><span class="small muted">${ds.find(v => v.id === k.vuonId)?.ten}</span>${U.nut('Xóa', { bam: 'xoa', kieu: 'phu', nho: true, data: { id: k.id }, hoi: 'Xóa dòng nhật ký?|Dòng phun thuốc của vườn đã có đơn sẽ không xóa được: ghi dòng đính chính thay vì xóa.|Xóa|canh' })}</div>`))}`,
        duoi: U.nut('Nói để ghi thêm', { den: '#ghi', icon: 'microphone' }),
      };
    },
    bam: { xoa: (c, el) => c.lam({ loai: 'xoa_nhat_ky', nhatKyId: el.dataset.id }, { bao: 'Đã xóa.' }) },
  });

  AM.man('thu-chi', {
    st: c => ({ chon: c.ts('vu') || c.so.muaVu.find(m => m.ban.id === c.n.id && m.giaiDoan !== 'xong')?.id || 'tat-ca', loai: 'chi', so: '', noiDung: '', ngay: A.nv.ngayCua(c.bg) }),
    ve(c) {
      const vu = c.so.muaVu.filter(m => m.ban.id === c.n.id);
      const tatCa = c.st.chon === 'tat-ca';
      const ds = c.so.thuChi.filter(t => t.ban.id === c.n.id && (tatCa || t.muaVuId === c.st.chon));
      const tienApp = c.so.don.filter(d => d.ban.id === c.n.id && d.trangThai === 'da_nhan_tien');
      const thuApp = tatCa ? tienApp.reduce((s, d) => s + (d.daTra ?? 0), 0) : (A.nv.loiLoVu(c.so, c.st.chon)?.thuApp ?? 0);
      const thu = ds.filter(t => t.loai === 'thu').reduce((s, t) => s + t.so, 0) + thuApp, chi = ds.filter(t => t.loai === 'chi').reduce((s, t) => s + t.so, 0);
      return h`${U.chonO(c, { k: 'chon', nhan: 'Xem theo', lua: [['tat-ca', 'Tất cả'], ...vu.map(m => [m.id, m.ten])] })}
        <div class="luoi-3">${U.the(h`<span class="xs muted">Thu</span><strong class="num">${U.tienGon(thu)}</strong>`)}${U.the(h`<span class="xs muted">Chi</span><strong class="num">${U.tienGon(chi)}</strong>`)}${U.the(h`<span class="xs muted">Lời lỗ</span><strong class="num" style="color:${mau(thu - chi)}">${U.tienGon(thu - chi)}</strong>`)}</div>
        ${U.bao(`Tiền bán qua app tự vào sổ khi đơn nhận đủ tiền${tatCa ? '' : ' (lô gắn với vườn của vụ này)'}: ${U.dong(thuApp)}.`)}
        ${U.the(h`<strong class="h2">Ghi khoản mới</strong>
          ${U.chon(c, { k: 'loai', lua: [['chi', 'Chi'], ['thu', 'Thu']] })}
          ${U.o(c, { k: 'so', nhan: 'Số tiền', kieu: 'so', donVi: 'đ' })}${U.o(c, { k: 'noiDung', nhan: 'Khoản gì', ph: 'Mua 3 bao phân' })}${U.o(c, { k: 'ngay', nhan: 'Ngày', kieu: 'ngay' })}
          ${U.nut('Ghi', { bam: 'ghi', nho: true })}`)}
        ${ds.map(t => U.the(h`<div class="row between"><span>${t.noiDung}</span><strong class="num" style="color:${t.loai === 'thu' ? 'var(--reu)' : 'var(--muc)'}">${t.loai === 'thu' ? '+' : '−'}${U.dong(t.so)}</strong></div>
          <div class="row between"><span class="small muted">${U.nd(t.ngay)}</span>${U.nut('Xóa', { bam: 'xoa', kieu: 'phu', nho: true, data: { id: t.id }, hoi: 'Xóa khoản này?||Xóa|canh' })}</div>`))}
        ${tatCa ? tienApp.map(d => U.the(h`<div class="row between"><span>Tiền bán ${d.tenLo} (${d.ma})</span><strong class="num" style="color:var(--reu)">+${U.dong(d.daTra)}</strong></div><span class="small muted">qua app · ${d.mua.ten}</span>`)) : ''}`;
    },
    bam: {
      ghi(c) {
        const s = c.st;
        const kq = c.lam({ loai: 'ghi_thu_chi', loaiTien: s.loai, so: U.docSo(s.so), noiDung: s.noiDung, ngay: s.ngay, ...(s.chon !== 'tat-ca' ? { muaVuId: s.chon } : {}) }, { bao: 'Đã ghi.' });
        if (kq.ok) c.dat({ so: '', noiDung: '' });
      },
      xoa: (c, el) => c.lam({ loai: 'xoa_thu_chi', thuChiId: el.dataset.id }, { bao: 'Đã xóa.' }),
    },
  });

  const VI_DU = ['Sáng nay phun thuốc trừ rầy cho vườn xoài 2 bình, cách ly 7 ngày', 'Hôm qua mua 3 bao phân NPK hết 900 nghìn', 'Tưới ao tôm, thay 20% nước', 'Bán được 2 triệu tiền chuối'];
  let dungNghe = () => {};
  AM.man('ghi', {
    st: () => ({ nghe: false, loi: '' }),
    ve(c) {
      const n = c.nhap('ghi', { chu: '' }).gt;
      return {
        than: h`<p class="muted">Nói một câu: việc gì, ở vườn nào, dùng gì, bao nhiêu tiền. App tách thành dòng nhật ký hoặc thu chi để bạn kiểm lại.</p>
          <button type="button" class="mic-lon" aria-pressed="${String(!!c.st.nghe)}" data-bam="mic" aria-label="${c.st.nghe ? 'Dừng nghe' : 'Bắt đầu nói'}">${U.icon('microphone', 56)}</button>
          <p class="muted" style="text-align:center">${c.st.nghe ? 'Đang nghe… nói xong bấm lại để dừng' : A.tn.coTheNghe() ? 'Bấm để nói' : 'Máy này chưa nghe được giọng nói: gõ vào ô bên dưới'}</p>
          ${c.st.loi ? U.bao(c.st.loi, 'loi') : ''}
          ${U.o(c, { n: 'ghi:chu', nhan: 'Câu đã ghi (sửa được)', kieu: 'chu-dai' })}
          <label class="btn phu">${U.icon('receipt', 24)}Chụp hóa đơn<input type="file" accept="image/*" capture="environment" class="sr-only" data-st="hoaDon" data-ve-lai></label>
          <section class="stack s8"><span class="small muted">Thử câu mẫu:</span>${VI_DU.map(v => U.nut(v, { bam: 'mau', kieu: 'phu', nho: true, data: { v } }))}</section>`,
        duoi: U.nut('Tiếp: kiểm tra', { bam: 'tiep', tat: !n.chu.trim() }),
      };
    },
    sau(c) {
      // Chụp hóa đơn: thêm tên tệp vào câu để người dùng ghi tiếp số tiền
      if (c.st.hoaDon) { const t = String(c.st.hoaDon).split(/[\\/]/).pop(); const n = c.nhap('ghi', { chu: '' }); c.dat({ hoaDon: '' }, false); n.dat({ chu: `${n.gt.chu ? `${n.gt.chu}. ` : ''}Hóa đơn ${t}: mua vật tư hết ` }); }
    },
    bam: {
      mic(c) {
        if (c.st.nghe) { dungNghe(); return c.dat({ nghe: false }); }
        c.dat({ nghe: true, loi: '' });
        dungNghe = A.tn.ngheNoi(chu => c.nhap('ghi', { chu: '' }).dat({ chu }), loi => c.dat({ loi, nghe: false }), () => c.dat({ nghe: false }));
      },
      mau: (c, el) => c.nhap('ghi', { chu: '' }).dat({ chu: el.dataset.v }),
      tiep(c) { AM.xoaSt('xac-nhan-ghi'); c.di('xac-nhan-ghi'); },
    },
  });

  AM.man('xac-nhan-ghi', {
    st(c) {
      const chu = c.nhap('ghi', { chu: '' }).gt.chu;
      const vuon = vuonCuaToi(c);
      const t = A.tl.tachCau(chu, A.nv.ngayCua(c.bg), vuon);
      const vu = c.so.muaVu.find(m => m.ban.id === c.n.id && m.giaiDoan !== 'xong' && (!t.vuonId || m.vuonId === t.vuonId));
      return { chu, chac: t.chac, loai: t.loai, ngay: t.ngay, noiDung: t.noiDung, vatTu: t.vatTu ?? '', luong: t.luong ?? '', soTien: t.soTien ? String(t.soTien) : '', ngayCachLy: t.ngayCachLy !== undefined ? String(t.ngayCachLy) : '', vuonId: t.vuonId ?? vuon[0]?.id ?? '', muaVuId: vu?.id ?? '' };
    },
    ve(c) {
      const k = c.st, vuon = vuonCuaToi(c), vu = c.so.muaVu.filter(m => m.ban.id === c.n.id);
      if (!k.chu?.trim()) return U.trong('Chưa có câu nào', '', U.nut('Nói để ghi', { den: '#ghi', nho: true }));
      const laTien = k.loai === 'thu' || k.loai === 'chi';
      if (!laTien && !vuon.length) return U.trong('Chưa có vườn để ghi nhật ký', 'Khoản thu chi thì ghi được không cần vườn.', U.nut('Thêm vườn', { den: '#vuon', nho: true }));
      const chac = t => (k.chac.includes(t) ? ' (app tách được)' : '');
      return {
        than: h`${U.bao(`App đọc được: "${k.chu}". Kiểm lại từng ô rồi bấm Lưu.`)}
          ${U.chon(c, { k: 'loai', nhan: `Loại${chac('loai')}`, boc: true, lua: [['phun_thuoc', 'Phun thuốc'], ['bon_phan', 'Bón phân'], ['tuoi', 'Tưới'], ['thu_hoach', 'Thu hoạch'], ['cham_soc', 'Chăm sóc'], ['chi', 'Khoản chi'], ['thu', 'Khoản thu']] })}
          ${U.o(c, { k: 'ngay', nhan: `Ngày${chac('ngay')}`, kieu: 'ngay' })}
          ${laTien ? '' : U.chonO(c, { k: 'vuonId', nhan: `Vườn${chac('vuonId')}`, lua: vuon.map(v => [v.id, v.ten]) })}
          ${U.o(c, { k: 'noiDung', nhan: 'Nội dung' })}
          ${laTien ? '' : h`${U.o(c, { k: 'vatTu', nhan: `Thuốc, phân, vật tư${chac('vatTu')}` })}${U.o(c, { k: 'luong', nhan: `Lượng${chac('luong')}` })}`}
          ${k.loai === 'phun_thuoc' ? U.o(c, { k: 'ngayCachLy', nhan: `Số ngày cách ly trên nhãn thuốc${chac('ngayCachLy')}`, kieu: 'so', donVi: 'ngày', goiY: 'Bắt buộc: app dùng để chặn đăng bán hàng hái trước hạn.' }) : ''}
          ${laTien ? U.o(c, { k: 'soTien', nhan: `Số tiền${chac('soTien')}`, kieu: 'so', donVi: 'đ' }) : ''}
          ${laTien && vu.length ? U.chonO(c, { k: 'muaVuId', nhan: 'Tính vào vụ', lua: [['', 'Không theo vụ'], ...vu.map(m => [m.id, m.ten])] }) : ''}`,
        duoi: h`${U.nut('Lưu', { bam: 'luu' })}${U.nut('Nói lại', { den: '#ghi', kieu: 'phu' })}`,
      };
    },
    bam: {
      luu(c) {
        const k = c.st, laTien = k.loai === 'thu' || k.loai === 'chi';
        const kq = laTien
          ? c.lam({ loai: 'ghi_thu_chi', loaiTien: k.loai, so: U.docSo(k.soTien), noiDung: k.noiDung, ngay: k.ngay, ...(k.muaVuId ? { muaVuId: k.muaVuId } : {}) }, { bao: 'Đã ghi vào sổ thu chi.', den: 'thu-chi' })
          : c.lam({ loai: 'ghi_nhat_ky', vuonId: k.vuonId, ngay: k.ngay, loaiViec: k.loai, noiDung: k.noiDung, ...(k.vatTu ? { vatTu: k.vatTu } : {}), ...(k.luong ? { luong: k.luong } : {}), ...(k.loai === 'phun_thuoc' ? { ngayCachLy: U.docSo(k.ngayCachLy) } : {}) }, { bao: 'Đã ghi vào nhật ký.', den: 'nhat-ky' });
        if (kq.ok) { c.nhap('ghi', { chu: '' }).xoa(); AM.xoaSt('xac-nhan-ghi'); }
      },
    },
  });

  const cong = (ngay, n) => { const d = new Date(`${ngay}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  AM.man('cach-ly', {
    ve(c) {
      const homNay = A.nv.ngayCua(c.bg), vuon = vuonCuaToi(c);
      const phun = c.so.nhatKy.filter(k => k.loai === 'phun_thuoc' && vuon.some(v => v.id === k.vuonId));
      return h`<p class="muted">Mỗi lần phun thuốc có số ngày cách ly trên nhãn. App không cho đăng bán hàng hái trước ngày hết cách ly của vườn.</p>
        ${vuon.map(v => {
          const het = A.nv.hetCachLy(c.so, v.id), dang = het && het > homNay;
          const anh = c.so.lo.filter(l => l.vuonId === v.id && l.kg > l.hua && (!l.haiTu || (het && l.haiTu < het)));
          return U.the(h`<div class="row between"><strong>${v.ten}</strong>${dang ? U.chip('Đang cách ly', 'loi') : U.chip('Hái được', 'xong')}</div>
            <span>${het ? `Được hái từ ngày ${U.nd(het)}` : 'Chưa ghi lần phun thuốc nào'}</span>
            ${dang && anh.length ? U.bao(`Lô đang bán của vườn này có ngày hái trước hạn cách ly: ${anh.map(l => l.ten).join(', ')}. Sửa ngày hái ở chi tiết lô.`, 'loi') : ''}`, { vien: dang ? 'loi' : '' });
        })}
        <h2 class="h2">Các lần phun thuốc</h2>
        ${phun.length ? '' : U.trong('Chưa có lần phun nào')}
        ${phun.map(k => U.the(h`<div class="row between"><strong>${k.vatTu}</strong><span class="small muted">${U.nd(k.ngay)}</span></div><span class="small">${vuon.find(v => v.id === k.vuonId)?.ten} · cách ly ${k.ngayCachLy} ngày · hết ngày ${U.nd(cong(k.ngay, k.ngayCachLy ?? 0))}</span>`))}`;
    },
  });

  AM.man('ho-so-vuon', {
    st: () => ({ dienTich: true, phun: true, bon: true, khac: true }),
    ve(c) {
      const v = vuonChon(c);
      if (!v) return U.trong('Chưa có vườn', '', U.nut('Thêm vườn', { den: '#vuon', nho: true }));
      const hs = A.nv.hoSoNguonGoc(c.so, v.id, c.bg), ma = `AGIVIET-NG-${v.id}`;
      const hien = hs.nhatKy.filter(k => (k.loai === 'phun_thuoc' ? c.st.phun : k.loai === 'bon_phan' ? c.st.bon : c.st.khac)).slice(0, 12);
      return h`${U.the(h`<div class="row between"><strong class="h2">${v.ten}</strong><span class="num b">${hs.mucDayDu}%</span></div>${U.tienTrinh(hs.mucDayDu / 100, 'Mức đầy đủ hồ sơ')}
          <span class="small muted">Đủ khi: có vụ đang chạy, có nhật ký 30 ngày qua, có ghi bón phân, mỗi lần phun có tên thuốc và ngày cách ly, có diện tích và số gốc.</span>`, { lop: 'noi' })}
        ${U.the(h`<strong class="h2">Mã truy xuất</strong><div class="ma-qr">${A.maQr(ma)}</div><span class="small muted" style="text-align:center">${ma} · dán lên thùng hàng; bên mua quét để xem phần bạn cho phép.</span>`)}
        ${U.the(h`<strong class="h2">Cho bên mua xem</strong>
          ${U.congTac(c, { k: 'dienTich', nhan: 'Diện tích, số gốc, cây trồng' })}${U.congTac(c, { k: 'phun', nhan: 'Các lần phun thuốc (tên thuốc, ngày cách ly)' })}
          ${U.congTac(c, { k: 'bon', nhan: 'Bón phân' })}${U.congTac(c, { k: 'khac', nhan: 'Việc khác (tưới, chăm sóc, thu hoạch)' })}
          <span class="small muted">Thu chi, lời lỗ không bao giờ hiện cho bên mua.</span>`)}
        ${U.the(h`<strong class="h2">Bên mua sẽ thấy</strong>
          ${c.st.dienTich ? h`<span>${v.cay} · ${v.dienTich} ${donViDT(v.donViDienTich)}${v.soGoc ? ` · ${v.soGoc} gốc` : ''} · trồng ${v.namTrong || 'chưa ghi năm'}</span>` : ''}
          ${hs.vu ? h`<span>Vụ: ${hs.vu.ten}</span>` : ''}${hs.cachLy ? h`<span>Hết cách ly thuốc: ${U.nd(hs.cachLy)}</span>` : ''}
          <ol class="dong-thoi-gian">${hien.map(k => h`<li class="qua"><span><strong>${U.ndNgan(k.ngay)}</strong> · ${VIEC[k.loai][0]}: ${k.noiDung}${k.vatTu ? ` (${k.vatTu})` : ''}</span></li>`)}</ol>
          ${hien.length ? '' : h`<span class="muted">Chưa có dòng nhật ký để hiện.</span>`}`)}`;
    },
  });
})();
