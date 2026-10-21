// Tôi: hồ sơ, uy tín, dịch vụ đối tác, cài đặt, hỗ trợ, màn lỗi mẫu, người giúp, tài khoản nhận tiền, bảo mật, quyền riêng tư,
// phần hàng của từng hộ trong lô gộp.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const XM = { chua: ['Chưa xác minh', 'lam'], cho_duyet: ['Chờ duyệt', 'cho'], da_xac_minh: ['Đã xác minh', 'xong'], tu_choi: ['Bị từ chối', 'loi'] };
  const tenTep = v => String(v || '').split(/[\\/]/).pop();
  const pct = x => (x === null || x === undefined ? 'chưa có' : `${Math.round(x * 100)}%`);
  const luuMay = (k, v) => { try { localStorage.setItem(`am.${k}`, v); } catch { /* chỉ là tiện ích trên máy */ } };
  const docMay = (k, md) => { try { return localStorage.getItem(`am.${k}`) ?? md; } catch { return md; } };

  const MUC = [['uy-tin', 'star', 'Uy tín của tôi'], ['tai-khoan-nhan', 'wallet', 'Tài khoản nhận tiền'], ['dich-vu', 'delivery', 'Kiểm nghiệm, xe, kho'], ['nguoi-giup', 'people', 'Người giúp'],
    ['phan-cua-toi', 'partial', 'Phần hàng của từng hộ'], ['rieng-tu', 'privacy', 'Quyền riêng tư'], ['bao-mat', 'shield', 'Bảo mật'], ['cai-dat', 'settings', 'Cài đặt'], ['ho-tro', 'help', 'Trung tâm hỗ trợ'], ['trang-thai', 'issue', 'Màn lỗi mẫu']];
  AM.man('toi', {
    ve(c) {
      const ut = NV.uyTin(c.so, c.n.id);
      return h`${U.the(h`<div class="row"><span class="anh-dai-dien">${c.hs.ten.replace(/^(Chị|Anh|Cô|Chú|Bà|Ông)\s+/i, '').charAt(0)}</span><div class="grow stack" style="gap:4px"><strong class="h2">${c.hs.ten}</strong><span class="small muted">${c.hs.sdt} · ${c.hs.vung || 'chưa ghi vùng'}</span>
          <div class="hang-nut" style="gap:6px">${U.chip(XM[c.hs.xacMinh][0], XM[c.hs.xacMinh][1])}${U.chip(`Uy tín ${NV.NHAN_BAC[ut.bac]}`)}</div></div></div>
          ${c.hs.xacMinh !== 'da_xac_minh' ? U.nut('Xác minh tài khoản', { den: 'bat-dau.html#xac-minh', nho: true, icon: 'identity' }) : ''}`)}
        <nav class="menu" aria-label="Các mục"><button type="button" data-bam="huongDan"><span class="ic-menu bg-cho"><img src="assets/ic-loa.svg" alt="" style="width:26px;height:26px"></span><span class="grow">Xem hướng dẫn dùng app</span><span class="chevron">›</span></button>${MUC.map(([id, ic, ten]) => h`<a href="#${id}"><span class="ic-menu bg-la">${U.icon(ic, 26)}</span><span class="grow">${ten}</span><span class="chevron">›</span></a>`)}</nav>
        ${U.nut('Đăng xuất', { bam: 'dangXuat', kieu: 'phu', hoi: 'Đăng xuất?|Dữ liệu vẫn còn trên máy chủ. Đăng nhập lại bằng số điện thoại.|Đăng xuất' })}`;
    },
    bam: { dangXuat: () => { A.dangXuat('ban'); location.href = 'bat-dau.html#chao-mung'; }, huongDan: () => window.moHuongDan?.() },
  });

  AM.man('uy-tin', {
    ve(c) {
      const ut = NV.uyTin(c.so, c.n.id);
      const xong = c.so.don.filter(d => d.ban.id === c.n.id && d.ketQuaCan && d.phaiTra !== undefined);
      const dungHen = xong.length ? xong.filter(d => NV.ngayCua(d.ketQuaCan.luc) <= d.ngayGiao).length / xong.length : null;
      const nx = c.so.danhGia.filter(g => g.cho.id === c.n.id);
      return h`${U.the(h`<span class="muted">Bậc uy tín</span><strong class="so-lon">${NV.NHAN_BAC[ut.bac]}</strong><div class="hang-nut" style="gap:6px">${['moi', 'kha', 'tot', 'rat_tot'].map(b => U.chip(NV.NHAN_BAC[b], b === ut.bac ? 'xong' : ''))}</div>`, { lop: 'noi' })}
        ${U.the(h`${U.dong2('Đơn hoàn tất', ut.soDonXong)}${U.dong2('Giao đủ (kg nhận / kg hứa)', pct(ut.tyLeGiaoDu))}${U.dong2('Đúng hẹn (cân không trễ ngày giao)', pct(dungHen))}${U.dong2('Hủy sau khi cọc do bạn', ut.soHuyDoMinh)}${U.dong2('Đơn có tranh chấp', ut.soTranhChap)}${U.dong2('Điểm từ bên mua', ut.diemDanhGia === null ? 'chưa có' : `${ut.diemDanhGia.toFixed(1)} / 5 (${ut.soDanhGia})`)}`)}
        ${U.the(h`<strong>Cách lên bậc</strong><span class="small">Khá: từ 3 đơn hoàn tất, giao đủ từ 85%, điểm từ 3,5.</span><span class="small">Tốt: giao đủ từ 95%, không hủy sau cọc, điểm từ 4,5.</span><span class="small">Rất tốt: như Tốt và từ 10 đơn hoàn tất.</span>`)}
        <section class="stack s8"><h2 class="h2">Nhận xét từ bên mua</h2>${nx.length ? '' : h`<span class="muted">Chưa có nhận xét.</span>`}${nx.map(g => U.the(h`${U.sao(g.diem)}<span>${g.nhanXet || 'Không ghi nhận xét'}</span><span class="xs muted">${g.tu.ten} · ${g.donMa}</span>`))}</section>`;
    },
  });

  const TEN_DV = { kiem_dinh: 'Kiểm nghiệm dư lượng', van_chuyen: 'Xe chở hàng', kho_lanh: 'Kho lạnh' };
  const NHAN_DV = { cho_bao_gia: ['Chờ đối tác báo giá', 'cho'], da_bao_gia: ['Có báo giá, chờ bạn đặt', 'lam'], da_dat: ['Đã đặt', 'cho'], xong: ['Hoàn tất', 'xong'], huy: ['Đã hủy', 'loi'] };
  AM.man('dich-vu', {
    ve(c) {
      const ds = c.so.dichVu.filter(y => y.nguoi.id === c.n.id);
      return h`<div class="luoi-3">${Object.entries(TEN_DV).map(([l, t]) => U.nut(t, { den: AM.den('dat-dich-vu', { loai: l }), kieu: 'phu', nho: true }))}</div>
        <span class="small muted">Đối tác do AgiViet giới thiệu; giá do đối tác báo, bạn đặt mới tính.</span>
        ${ds.length ? '' : U.trong('Chưa đặt dịch vụ nào')}
        ${ds.map(y => U.the(h`<div class="row between"><strong>${TEN_DV[y.loai]}</strong>${U.chip(NHAN_DV[y.trangThai][0], NHAN_DV[y.trangThai][1])}</div>
          <span class="small muted">Ngày ${U.nd(y.ngay)}${y.donMa ? ` · đơn ${y.donMa}` : ''}${y.loId ? ` · lô ${c.so.lo.find(l => l.id === y.loId)?.ten}` : ''}${y.ghiChu ? ` · ${y.ghiChu}` : ''}</span>
          ${y.baoGia ? U.dong2(y.baoGia.doiTac, U.dong(y.baoGia.gia)) : ''}
          ${y.trangThai === 'da_bao_gia' ? h`<div class="grid2">${U.nut('Không đặt', { bam: 'huy', kieu: 'phu', nho: true, data: { id: y.id } })}${U.nut('Đặt', { bam: 'dat', nho: true, data: { id: y.id } })}</div>` : ''}
          ${y.trangThai === 'cho_bao_gia' ? U.nut('Hủy yêu cầu', { bam: 'huy', kieu: 'phu', nho: true, data: { id: y.id } }) : ''}`, { vien: y.trangThai === 'da_bao_gia' ? 'lam' : '' }))}`;
    },
    bam: {
      huy: (c, el) => c.lam({ loai: 'huy_dich_vu', yeuCauId: el.dataset.id }, { bao: 'Đã hủy yêu cầu.' }),
      dat: (c, el) => c.lam({ loai: 'dat_dich_vu', yeuCauId: el.dataset.id }, { bao: 'Đã đặt. Đối tác liên hệ theo ngày hẹn.' }),
    },
  });

  AM.man('dat-dich-vu', {
    st: c => ({ loai: TEN_DV[c.ts('loai')] ? c.ts('loai') : 'kiem_dinh', ngay: NV.ngayCua(c.bg + 2 * 864e5), gan: '', ghiChu: '' }),
    ve(c) {
      const lo = c.so.lo.filter(l => l.ban.id === c.n.id), don = c.so.don.filter(d => d.ban.id === c.n.id && ['cho_coc', 'cho_giao'].includes(d.trangThai));
      return {
        than: h`${U.chon(c, { k: 'loai', nhan: 'Dịch vụ', lua: Object.entries(TEN_DV) })}${U.o(c, { k: 'ngay', nhan: 'Ngày cần', kieu: 'ngay' })}
          ${U.chonO(c, { k: 'gan', nhan: 'Cho lô hoặc đơn', lua: [['', 'Không gắn'], ...lo.map(l => [`lo:${l.id}`, `Lô ${l.ten}`]), ...don.map(d => [`don:${d.ma}`, `Đơn ${d.ma}`])] })}
          ${U.o(c, { k: 'ghiChu', nhan: 'Ghi chú', ph: c.st.loai === 'van_chuyen' ? '3 tấn, từ Mỹ Xương đi Sa Đéc' : c.st.loai === 'kiem_dinh' ? 'Kiểm dư lượng thuốc trừ sâu' : '2 tấn, 5 ngày' })}`,
        duoi: U.nut('Gửi yêu cầu báo giá', { bam: 'gui' }),
      };
    },
    bam: {
      gui(c) {
        const g = c.st.gan, gan = g.startsWith('lo:') ? { loId: g.slice(3) } : g.startsWith('don:') ? { donMa: g.slice(4) } : {};
        c.lam({ loai: 'yeu_cau_dich_vu', dichVu: c.st.loai, ngay: c.st.ngay, ghiChu: c.st.ghiChu, ...gan }, { bao: 'Đã gửi. Đối tác báo giá trong ít phút (tua đồng hồ ở Giả lập để thấy ngay).', den: 'dich-vu' });
      },
    },
  });

  AM.man('cai-dat', {
    st: () => ({ rung: docMay('rung', '1') === '1', ngonNgu: docMay('ngon-ngu', 'vi') }),
    ve(c) {
      const cd = c.hs.caiDat;
      const nut = (nhan, k, lua, gt) => h`<div class="truong"><span class="label">${nhan}</span><div class="phan-doan">${lua.map(([v, t]) => h`<button type="button" aria-pressed="${String(String(gt) === String(v))}" data-bam="cd" data-k="${k}" data-v="${v}">${t}</button>`)}</div></div>`;
      return h`${nut('Cỡ chữ', 'coChu', [['vua', 'Vừa'], ['lon', 'Lớn'], ['rat_lon', 'Rất lớn']], cd.coChu)}
        ${nut('Tốc độ đọc', 'tocDoDoc', [['0.8', 'Chậm'], ['0.95', 'Vừa'], ['1.15', 'Nhanh']], cd.tocDoDoc)}
        <button type="button" class="cong-tac" aria-pressed="${String(cd.amThanh)}" data-bam="cd" data-k="amThanh" data-v="${String(!cd.amThanh)}"><span class="ray"></span><span class="grow b">Âm thanh khi có việc mới</span></button>
        <button type="button" class="cong-tac" aria-pressed="${String(c.st.rung)}" data-bam="rung"><span class="ray"></span><span class="grow b">Rung</span></button>
        ${U.chon(c, { k: 'ngonNgu', nhan: 'Ngôn ngữ', lua: [['vi', 'Tiếng Việt'], ['km', 'Khmer (sắp có)']] })}
        ${c.st.ngonNgu !== 'vi' ? U.bao('Bản tiếng Khmer đang dịch; app tạm hiện tiếng Việt.') : ''}`;
    },
    sau: c => luuMay('ngon-ngu', c.st.ngonNgu),
    bam: {
      cd(c, el) {
        const k = el.dataset.k, v = el.dataset.v;
        const gt = k === 'tocDoDoc' ? Number(v) : k === 'amThanh' ? v === 'true' : v;
        const kq = c.lam({ loai: 'cap_nhat_cai_dat', [k]: gt }, { bao: 'Đã lưu cài đặt.' });
        if (kq.ok && k === 'coChu') { document.documentElement.classList.toggle('chu-to', v !== 'vua'); luuMay('chuTo', v !== 'vua' ? '1' : '0'); }
        if (kq.ok && k === 'tocDoDoc') { luuMay('tocDo', v); window.amDoc?.('Đây là tốc độ đọc bạn vừa chọn.'); }
      },
      rung(c) { const b = !c.st.rung; luuMay('rung', b ? '1' : '0'); if (b) navigator.vibrate?.(80); c.dat({ rung: b }); },
    },
  });

  const HOI_DAP = [
    ['Vì sao bên mua không thấy số điện thoại của tôi?', 'Để hai bên giao dịch qua app và được bảo vệ. Số mở ngay khi bên mua đặt cọc.'],
    ['Tiền cọc nằm ở đâu?', 'Ở tài khoản đảm bảo do ngân hàng đối tác giữ. Cọc trừ vào tiền hàng khi chốt cân.'],
    ['Bên mua cân thiếu thì sao?', 'Bấm "Không đúng" ở màn Kết quả cân và chụp số trên cân của bạn. Đơn quay về chờ cân.'],
    ['Tôi có phải trả phí không?', 'Không. Phí giới thiệu do bên mua trả khi đặt cọc.'],
    ['Tin của tôi biến mất?', 'Tin tự ẩn sau 14 ngày không xác nhận còn hàng. Bấm "Vẫn còn hàng" để hiện lại.'],
  ];
  const HUONG_DAN = [['Đăng bán lô đầu tiên', 'dang.html#dang'], ['Ghi nhật ký bằng giọng nói', 'vuon.html#ghi'], ['Xác nhận đơn và ký', 'lich.html#lich'], ['Nhận tiền trước', 'tien.html#ung-tien']];
  AM.man('ho-tro', {
    ve(c) {
      const cua = c.so.hoTro.filter(x => x.nguoi.id === c.n.id);
      return h`${U.nut('Tạo yêu cầu hỗ trợ', { den: '#can-ho-tro', icon: 'help' })}
        ${cua.length ? h`<section class="stack s8"><h2 class="h2">Yêu cầu của tôi</h2>${cua.map(x => U.the(h`<div class="row between"><strong>${x.chuDe}</strong>${U.chip(x.trangThai === 'xong' ? 'Đã xong' : x.trangThai === 'moi' ? 'Chờ tiếp nhận' : 'Đang xử lý', x.trangThai === 'xong' ? 'xong' : x.trangThai === 'moi' ? 'cho' : 'lam')}</div>
          <span class="small">${x.noiDung}</span>${x.traLoi.map(t => h`<div class="bong-tin"><span>${t.noiDung}</span><span class="xs muted">Đội AgiViet · ${U.gioNgay(t.luc)}</span></div>`)}`))}</section>` : ''}
        <section class="stack s8"><h2 class="h2">Câu hỏi thường gặp</h2>${HOI_DAP.map(([q, a]) => h`<details class="hoi-dap card"><summary><strong>${q}</strong></summary><p>${a}</p></details>`)}</section>
        <section class="stack s8"><h2 class="h2">Hướng dẫn từng bước</h2>${HUONG_DAN.map(([t, den]) => U.the(t, { den }))}</section>
        <a class="btn phu nho" href="tel:19000000">${U.icon('call', 22)}Gọi tổng đài 1900 0000 (mô phỏng)</a>`;
    },
  });

  AM.man('can-ho-tro', {
    st: c => ({ chuDe: c.ts('don') || c.ts('lo') ? 'Đơn hàng' : 'Cách dùng app', noiDung: c.ts('lo') ? `Về lô ${c.ts('lo')}: ` : '', don: c.ts('don'), anh: '' }),
    ve(c) {
      const don = c.so.don.filter(d => d.ban.id === c.n.id).slice(0, 8);
      return {
        than: h`${U.chon(c, { k: 'chuDe', nhan: 'Chủ đề', boc: true, lua: ['Cách dùng app', 'Đơn hàng', 'Tiền', 'Tài khoản', 'Khác'].map(x => [x, x]) })}
          ${c.st.chuDe === 'Đơn hàng' ? U.chonO(c, { k: 'don', nhan: 'Đơn', lua: [['', 'Không chọn'], ...don.map(d => [d.ma, `${d.ma} · ${d.mua.ten}`])] }) : ''}
          ${U.o(c, { k: 'noiDung', nhan: 'Mô tả', kieu: 'chu-dai', ph: 'Bên mua chưa nhập số cân dù đã giao hôm qua' })}
          <label class="btn phu nho">${U.icon('image', 22)}${c.st.anh ? `Đã thêm ${tenTep(c.st.anh)}` : 'Thêm ảnh'}<input type="file" accept="image/*" class="sr-only" data-st="anh" data-ve-lai></label>`,
        duoi: U.nut('Gửi', { bam: 'gui' }),
      };
    },
    bam: { gui: c => c.lam({ loai: 'gui_ho_tro', chuDe: c.st.chuDe, noiDung: `${c.st.noiDung}${c.st.anh ? ` [ảnh: ${tenTep(c.st.anh)}]` : ''}`, ...(c.st.don ? { donMa: c.st.don } : {}) }, { bao: 'Đã gửi. Đội AgiViet trả lời trong giờ làm việc.', den: 'ho-tro' }) },
  });

  const LOI_MAU = [['offline', 'Mất mạng', 'Việc bạn vừa làm được giữ trên máy và gửi khi có mạng lại.', 'Thử lại'], ['image', 'Ảnh bị mờ', 'Đứng gần hơn, lau ống kính, chụp nơi đủ sáng.', 'Chụp lại'],
    ['lock', 'Hết phiên đăng nhập', 'Vì an toàn, app tự đăng xuất sau 30 ngày không dùng.', 'Đăng nhập lại'], ['waiting', 'Máy chủ đang bận', 'App tự thử lại sau ít giây. Dữ liệu của bạn không mất.', 'Thử lại'],
    ['issue', 'Dữ liệu vừa đổi ở nơi khác', 'Người giúp hoặc bên mua vừa thao tác cùng đơn. Xem lại màn rồi làm tiếp.', 'Tải lại'], ['microphone', 'Không nghe rõ', 'Nói chậm, gần máy hơn, hoặc gõ tay.', 'Nói lại']];
  AM.man('trang-thai', {
    ve: () => h`${LOI_MAU.map(([ic, t, m, n]) => U.the(h`<div class="row top-align">${U.icon(ic, 32)}<div class="grow stack" style="gap:2px"><strong>${t}</strong><span class="small">${m}</span></div></div>${U.nut(n, { bam: 'thu', kieu: 'phu', nho: true, icon: 'retry', data: { n } })}`))}`,
    bam: { thu: (c, el) => c.bao(`${el.dataset.n}: mô phỏng.`) },
  });

  AM.man('nguoi-giup', {
    st: () => ({ ten: '', sdt: '', quyen: 'xem' }),
    ve(c) {
      const ds = c.hs.nguoiGiup;
      return h`${U.bao('Con cháu dùng chung tài khoản để đọc tin, trả lời khách giúp bạn. Người giúp không ký thỏa thuận và không đổi tài khoản nhận tiền được.')}
        ${ds.length ? '' : U.trong('Chưa có người giúp')}
        ${ds.map(x => U.the(h`<div class="row between"><strong>${x.ten}</strong>${U.chip(x.quyen === 'xem' ? 'Chỉ xem' : 'Được thao tác')}</div><span class="small muted">${x.sdt}</span>${U.nut('Gỡ', { bam: 'go', kieu: 'phu', nho: true, data: { sdt: x.sdt }, hoi: `Gỡ ${x.ten}?||Gỡ|canh` })}`))}
        ${ds.length < 3 ? U.the(h`<strong class="h2">Thêm người giúp</strong>${U.o(c, { k: 'ten', nhan: 'Tên', ph: 'Út Tâm (con gái)' })}${U.o(c, { k: 'sdt', nhan: 'Số điện thoại', kieu: 'sdt' })}${U.chon(c, { k: 'quyen', nhan: 'Quyền', lua: [['xem', 'Chỉ xem'], ['thao_tac', 'Được thao tác']] })}${U.nut('Thêm', { bam: 'them', nho: true })}`) : ''}`;
    },
    bam: {
      go: (c, el) => c.lam({ loai: 'go_nguoi_giup', sdt: el.dataset.sdt }, { bao: 'Đã gỡ.' }),
      them(c) { const kq = c.lam({ loai: 'them_nguoi_giup', ten: c.st.ten, sdt: c.st.sdt, quyen: c.st.quyen }, { bao: 'Đã thêm. Người giúp đăng nhập bằng số của họ.' }); if (kq.ok) c.dat({ ten: '', sdt: '', quyen: 'xem' }); },
    },
  });

  AM.man('tai-khoan-nhan', {
    st: c => ({ doi: !c.hs?.taiKhoanNhan, nganHang: '', so: '', chuTaiKhoan: '', otp: '' }),
    ve(c) {
      const tk = c.hs.taiKhoanNhan;
      return h`${tk ? U.the(h`${U.dong2('Ngân hàng', tk.nganHang)}${U.dong2('Số tài khoản', tk.so.replace(/\d(?=\d{4})/g, '•'))}${U.dong2('Chủ tài khoản', tk.chuTaiKhoan)}<span class="xs muted">Cập nhật ${U.gioNgay(tk.doiLuc)}</span>`, { lop: 'noi' }) : ''}
        ${!c.st.doi ? U.nut('Đổi tài khoản', { bam: '_bat', data: { k: 'doi' }, kieu: 'phu' }) : U.the(h`${U.bao(`Tài khoản phải đứng tên ${c.hs.ten.toUpperCase()}. Đổi tài khoản cần mã xác nhận gửi tới số của bạn; người giúp không đổi được.`, 'vang')}
          ${U.o(c, { k: 'nganHang', nhan: 'Ngân hàng', ph: 'Agribank Cao Lãnh' })}${U.o(c, { k: 'so', nhan: 'Số tài khoản', kieu: 'so' })}${U.o(c, { k: 'chuTaiKhoan', nhan: 'Chủ tài khoản (không dấu, chữ in)', ph: 'NGUYEN THI NAM' })}
          ${U.o(c, { k: 'otp', nhan: 'Mã xác nhận', kieu: 'so', goiY: 'Bản mô phỏng: 123456' })}
          <div class="grid2">${tk ? U.nut('Thôi', { bam: '_bat', data: { k: 'doi' }, kieu: 'phu', nho: true }) : ''}${U.nut('Lưu', { bam: 'luu', nho: true })}</div>`)}`;
    },
    bam: {
      luu(c) {
        if (String(c.st.otp).replace(/\D/g, '') !== '123456') return c.bao('Mã xác nhận không đúng.', 'loi');
        const kq = c.lam({ loai: 'cap_nhat_tai_khoan_nhan', nganHang: c.st.nganHang, so: String(c.st.so).replace(/\s/g, ''), chuTaiKhoan: String(c.st.chuTaiKhoan).toUpperCase() }, { bao: 'Đã lưu tài khoản nhận tiền.' });
        if (kq.ok) c.dat({ doi: false, otp: '' });
      },
    },
  });

  AM.man('bao-mat', {
    ve: c => h`<section class="stack s8"><h2 class="h2">Thiết bị đang đăng nhập</h2>${U.the(h`<strong>Máy này</strong><span class="small muted">Đang dùng</span>`)}${c.hs.nguoiGiup.map(x => U.the(h`<strong>Máy của ${x.ten} (người giúp)</strong><span class="small muted">${x.quyen === 'xem' ? 'chỉ xem' : 'được thao tác'}</span>`))}</section>
      ${U.nut('Báo mất máy', { bam: 'mat', kieu: 'canh', hoi: 'Báo mất máy?|App đăng xuất mọi thiết bị, khóa việc đổi tài khoản nhận tiền 24 giờ và báo đội AgiViet gọi lại cho bạn.|Báo mất máy|canh' })}
      <span class="small muted">Mất máy trong lúc chưa đăng nhập được: vào "Trợ giúp đăng nhập" ở màn đầu.</span>`,
    bam: { mat(c) { const kq = c.lam({ loai: 'gui_ho_tro', chuDe: 'Mất máy', noiDung: 'Người bán báo mất máy: đăng xuất mọi thiết bị, tạm khóa đổi tài khoản nhận tiền.' }, { bao: 'Đã báo. Đội AgiViet sẽ gọi lại.' }); if (kq.ok) { A.dangXuat('ban'); location.href = 'bat-dau.html#chao-mung'; } } },
  });

  const RIENG_TU = [['Tên, xã/huyện', 'Có', 'Có'], ['Ảnh, mô tả lô, giấy kiểm nghiệm', 'Có', 'Có'], ['Hồ sơ nguồn gốc vườn', 'Phần bạn chọn', 'Phần bạn chọn'], ['Uy tín, nhận xét', 'Có', 'Có'],
    ['Địa chỉ đến cấp ấp (hẹn xem vườn)', 'Có', 'Có'], ['Số nhà, địa chỉ vườn', 'Không', 'Có'], ['Số điện thoại', 'Không', 'Có'], ['Tài khoản ngân hàng', 'Không', 'Không']];
  AM.man('rieng-tu', {
    ve: () => h`${U.the(h`<div class="luoi-3"><strong class="small">Thông tin</strong><strong class="small">Trước cọc</strong><strong class="small">Sau cọc</strong></div>${RIENG_TU.map(([a, b, c]) => h`<div class="luoi-3"><span class="small">${a}</span><span class="small">${b}</span><span class="small">${c}</span></div>`)}`)}
      ${U.nut('Chọn phần hồ sơ vườn cho xem', { den: 'vuon.html#ho-so-vuon', kieu: 'phu' })}
      <span class="small muted">Tin nhắn có số điện thoại, Zalo, đường dẫn bị che trước khi cọc. Đội vận hành chỉ xem nguyên văn khi có báo cáo vi phạm.</span>`,
  });

  AM.man('phan-cua-toi', {
    st: () => ({ ho: '' }),
    ve(c) {
      const loGop = c.so.lo.filter(l => l.ban.id === c.n.id && l.thanhPhan);
      if (!loGop.length) return U.trong('Chưa có lô gộp', 'Hợp tác xã, tổ hợp tác gom hàng nhiều hộ thành một lô; màn này cho từng hộ xem phần của mình.', U.nut('Tạo lô gộp', { den: 'hang.html#lo-gop', nho: true }));
      const hoDs = [...new Set(loGop.flatMap(l => l.thanhPhan.map(t => t.ho)))], ho = hoDs.includes(c.st.ho) ? c.st.ho : hoDs[0];
      return h`<div class="truong"><span class="label">Hộ</span><div class="chon-boc">${hoDs.map(x => h`<button type="button" aria-pressed="${String(x === ho)}" data-bam="_dat" data-k="ho" data-v="${x}">${x}</button>`)}</div></div>
        ${loGop.map(l => {
          const p = l.thanhPhan.find(t => t.ho === ho);
          if (!p) return '';
          const tl = p.kg / l.kg, tienChia = c.so.don.filter(d => d.loId === l.id && d.trangThai === 'da_nhan_tien').map(d => ({ ma: d.ma, tien: NV.chiaTienLoGop(c.so, d.ma)?.find(x => x.ho === ho)?.tien ?? 0 }));
          return U.the(h`<strong>${l.ten}</strong>${U.dong2('Phần góp', `${U.luong(p.kg)} (${Math.round(tl * 100)}%)`)}${U.dong2('Phần đã giao', U.luong(Math.round(l.giao * tl)))}${U.dong2('Phần đã hứa', U.luong(Math.round(l.hua * tl)))}
            ${tienChia.map(t => U.dong2(`Tiền đơn ${t.ma}`, U.dong(t.tien)))}${U.dong2(h`<strong>Tiền đã chia</strong>`, h`<strong>${U.dong(tienChia.reduce((s, t) => s + t.tien, 0))}</strong>`)}`);
        })}
        <span class="small muted">Tiền chia theo tỷ lệ kg góp; số lẻ dồn cho hộ cuối để tổng khớp đúng tiền nhận.</span>`;
    },
  });
})();
