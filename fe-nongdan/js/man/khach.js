// Khách: lời mời, tin cần mua (chào hàng), trả lời kết nối, hồ sơ bên mua, nhắn tin (che liên lạc), báo giá, hẹn xem vườn, báo cáo.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;
  const pct = x => (x === null || x === undefined ? 'chưa có' : `${Math.round(x * 100)}%`);
  const ketNoi = c => c.so.ketNoi.find(k => k.id === c.ts('kn') && k.ban.id === c.n.id);
  const khongCo = () => U.trong('Không tìm thấy cuộc trao đổi', '', U.nut('Về Khách', { den: '#khach', nho: true }));

  const theBenMua = (hs, den, them = '') => hs ? U.the(h`<div class="row top-align"><span class="thumb nho" style="display:grid;place-items:center;color:var(--song)">${U.icon('warehouse', 30)}</span>
      <div class="grow stack" style="gap:4px"><strong>${hs.ten}</strong><span class="small muted">${hs.toChuc?.loaiHinh ?? 'Bên mua'} · ${hs.vung || 'chưa ghi vùng'}</span>
        <div class="hang-nut" style="gap:6px">${hs.daXacMinh ? U.chip('Đã xác minh', 'xong') : ''}${U.chip(`Uy tín ${A.nv.NHAN_BAC[hs.uyTin.bac]}`)}${hs.uyTin.diemDanhGia !== null ? U.chip(`${hs.uyTin.diemDanhGia.toFixed(1)} ★`) : ''}</div></div></div>${them}`, den ? { den } : {}) : '';

  AM.man('khach', {
    st: () => ({ tab: 'cho' }),
    ve(c) {
      const kn = A.mc.ketNoiCuaToi(c.so, c.n);
      const ds = { cho: kn.filter(k => k.trangThai === 'cho' && k.tu === 'mua'), dang: kn.filter(k => k.trangThai === 'dong_y'), gui: kn.filter(k => k.trangThai === 'cho' && k.tu === 'ban'), dong: kn.filter(k => k.trangThai === 'tu_choi' || k.trangThai === 'rut') };
      const tinCuoi = k => c.so.tinNhan.filter(t => t.ketNoiId === k.id).at(-1);
      const nc = A.mc.nhuCauPhuHop(c.so, c.n).filter(n => n.hop && !n.daChao).length;
      return h`${U.bao('Bạn thấy tên tổ chức, vùng, uy tín của bên mua. Số điện thoại hai bên chỉ mở khi bên mua đặt cọc.')}
        ${U.nut(nc ? `${nc} tin cần mua đúng hàng của bạn` : 'Tin cần mua của bên mua', { den: '#nhu-cau', kieu: 'phu', icon: 'demand' })}
        ${U.tab(c, 'tab', [['cho', 'Chờ trả lời', ds.cho.length], ['dang', 'Đang trao đổi'], ['gui', 'Đã chào'], ['dong', 'Đã đóng']])}
        ${ds[c.st.tab].length ? '' : U.trong(c.st.tab === 'cho' ? 'Chưa có lời mời mới' : 'Chưa có ai', c.st.tab === 'cho' ? 'Khi bên mua muốn kết nối với lô của bạn, lời mời hiện ở đây.' : '')}
        ${ds[c.st.tab].map(k => {
          const t = tinCuoi(k), lo = c.so.lo.find(l => l.id === k.loId);
          return theBenMua(A.mc.hoSoCongKhai(c.so, k.mua.id), AM.den(k.trangThai === 'cho' && k.tu === 'mua' ? 'ket-noi' : 'chat', { kn: k.id }),
            h`<span class="small">Lô ${lo?.ten ?? '—'}${k.nhuCauId ? ' · bạn chào hàng' : ''}</span>${t ? h`<span class="small muted">${t.vai === 'ban' ? 'Bạn: ' : ''}${t.noiDung.slice(0, 70)} · ${U.tuongDoi(t.luc, c.bg)}</span>` : ''}`);
        })}`;
    },
  });

  AM.man('nhu-cau', {
    st: () => ({ mo: '', lo: '', loiNhan: '' }),
    ve(c) {
      const ds = A.mc.nhuCauPhuHop(c.so, c.n);
      const loCuaToi = c.so.lo.filter(l => l.ban.id === c.n.id && A.nv.conBan(l) > 0);
      return h`${ds.length ? '' : U.trong('Chưa có tin cần mua', 'Bên mua đăng tin cần mua; tin đúng mặt hàng của bạn xếp lên đầu.')}
        ${ds.map(n => {
          const hs = A.mc.hoSoCongKhai(c.so, n.mua.id), goiY = loCuaToi.filter(l => l.matHang === n.matHang), lua = goiY.length ? goiY : loCuaToi;
          const loChon = c.st.lo || lua[0]?.id || '';
          return U.the(h`<div class="row between"><strong>Cần ${U.luong(n.kg)} ${n.ten}</strong>${n.hop ? U.chip('Đúng hàng của bạn', 'lam') : ''}</div>
            <span class="small muted">${hs?.ten} · ${hs?.vung} · uy tín ${hs ? A.nv.NHAN_BAC[hs.uyTin.bac] : ''}</span>
            ${U.dong2('Nhận hàng', `${U.ndNgan(n.tu)} – ${U.ndNgan(n.den)}`)}${n.giaTran ? U.dong2('Giá trần', `${U.so(n.giaTran)} đ/kg`) : ''}
            ${Object.entries(n.thuocTinh).map(([k, v]) => U.dong2(k === 'loai' ? 'Loại' : k, v))}${n.ghiChu ? h`<span class="small">${n.ghiChu}</span>` : ''}
            <span class="xs muted">Đăng ${U.tuongDoi(n.dangLuc, c.bg)}</span>
            ${n.daChao ? U.chip('Đã chào hàng', 'xong') : c.st.mo === n.id ? (loCuaToi.length ? h`
              <div class="truong"><span class="label">Chào bằng lô</span><div class="chon-boc">${lua.map(l => h`<button type="button" aria-pressed="${String(l.id === loChon)}" data-bam="_dat" data-k="lo" data-v="${l.id}">${l.ten} · còn ${U.luong(A.nv.conBan(l))}</button>`)}</div></div>
              ${U.o(c, { k: 'loiNhan', nhan: 'Lời nhắn', ph: 'Hàng bao trái, hái được tuần này' })}
              <div class="grid2">${U.nut('Thôi', { bam: '_dat', data: { k: 'mo', v: '' }, kieu: 'phu', nho: true })}${U.nut('Gửi chào hàng', { bam: 'chao', nho: true, data: { nc: n.id, lo: loChon } })}</div>` : U.bao('Bạn chưa có lô còn hàng để chào. Đăng lô trước.', 'vang'))
            : U.nut('Chào hàng', { bam: 'mo', nho: true, data: { nc: n.id } })}`, { vien: n.hop ? 'lam' : '' });
        })}`;
    },
    bam: {
      mo: (c, el) => c.dat({ mo: el.dataset.nc, lo: '', loiNhan: '' }),
      chao(c, el) { const kq = c.lam({ loai: 'chao_hang', nhuCauId: el.dataset.nc, loId: el.dataset.lo, loiNhan: c.st.loiNhan }, { bao: 'Đã chào hàng. Bên mua đồng ý thì hai bên trao đổi được.' }); if (kq.ok) c.dat({ mo: '' }); },
    },
  });

  AM.man('ket-noi', {
    ve(c) {
      const k = ketNoi(c);
      if (!k) return khongCo();
      const hs = A.mc.hoSoCongKhai(c.so, k.mua.id), lo = c.so.lo.find(l => l.id === k.loId);
      const choToi = k.trangThai === 'cho' && k.tu === 'mua';
      return {
        than: h`${theBenMua(hs, AM.den('ho-so-ben-mua', { id: k.mua.id }))}
          ${hs ? U.the(h`${U.dong2('Đơn đã hoàn tất', hs.uyTin.soDonXong)}${U.dong2('Trả tiền đúng hạn', pct(hs.uyTin.tyLeTraDungHan))}${U.dong2('Tranh chấp', hs.uyTin.soTranhChap)}`) : ''}
          ${U.the(h`<span class="small muted">${k.tu === 'mua' ? 'Muốn kết nối về lô' : 'Bạn chào hàng lô'} · ${U.tuongDoi(k.guiLuc, c.bg)}</span><strong>${lo?.ten} · còn ${lo ? U.luong(A.nv.conBan(lo)) : ''}</strong>${k.loiNhan ? h`<p>"${k.loiNhan}"</p>` : ''}`)}
          ${k.trangThai !== 'cho' ? U.bao(k.trangThai === 'dong_y' ? 'Đã đồng ý kết nối.' : 'Kết nối đã đóng.', k.trangThai === 'dong_y' ? 'tot' : 'thong-tin') : ''}`,
        duoi: choToi ? h`${U.nut('Đồng ý nói chuyện', { bam: 'dongY' })}<div class="grid2">${U.nut('Không, cảm ơn', { bam: 'tuChoi', kieu: 'phu' })}${U.nut('Báo cáo, chặn', { den: AM.den('bao-cao', { nguoi: k.mua.id }), kieu: 'canh' })}</div>` : U.nut('Mở trao đổi', { den: AM.den('chat', { kn: k.id }) }),
      };
    },
    bam: {
      dongY: c => c.lam({ loai: 'tra_loi_ket_noi', ketNoiId: c.ts('kn'), dongY: true }, { bao: 'Đã đồng ý. Hai bên nhắn tin, báo giá được.', den: ['chat', { kn: c.ts('kn') }] }),
      tuChoi: c => c.lam({ loai: 'tra_loi_ket_noi', ketNoiId: c.ts('kn'), dongY: false }, { bao: 'Đã từ chối. Bên mua không bị báo lý do.', den: 'khach' }),
    },
  });

  AM.man('ho-so-ben-mua', {
    ve(c) {
      const id = c.ts('id'), hs = A.mc.hoSoCongKhai(c.so, id);
      if (!hs || hs.vai !== 'mua') return U.trong('Không tìm thấy bên mua');
      const nhanXet = c.so.danhGia.filter(g => g.cho.id === id), donVoiToi = c.so.don.filter(d => d.mua.id === id && d.ban.id === c.n.id);
      return h`${theBenMua(hs)}
        ${U.the(h`${U.dong2('Tham gia từ', new Date(hs.thamGia).getFullYear())}${U.dong2('Đơn đã hoàn tất', hs.uyTin.soDonXong)}${U.dong2('Trả tiền trong 3 ngày sau chốt cân', pct(hs.uyTin.tyLeTraDungHan))}${U.dong2('Hủy đơn sau khi cọc', hs.uyTin.soHuyDoMinh)}${U.dong2('Đơn có tranh chấp', hs.uyTin.soTranhChap)}`)}
        <section class="stack s8"><h2 class="h2">Nhận xét từ người bán (${nhanXet.length})</h2>${nhanXet.length ? '' : h`<span class="muted">Chưa có nhận xét.</span>`}${nhanXet.map(g => U.the(h`${U.sao(g.diem)}<span>${g.nhanXet || 'Không ghi nhận xét'}</span><span class="xs muted">${g.tu.ten} · ${g.donMa}</span>`))}</section>
        <section class="stack s8"><h2 class="h2">Đơn với bạn (${donVoiToi.length})</h2>${donVoiToi.map(d => U.theDon(d, c.bg))}</section>`;
    },
  });

  AM.man('chat', {
    ten: c => ketNoi(c)?.mua.ten || 'Nhắn tin',
    st: () => ({ chu: '' }),
    ve(c) {
      const k = ketNoi(c);
      if (!k) return khongCo();
      const ll = A.mc.lienLacCua(c.so, c.n, k.mua.id), lo = c.so.lo.find(l => l.id === k.loId), tin = A.mc.tinNhanCua(c.so, k.id);
      return {
        than: h`<span class="small muted">Lô ${lo?.ten ?? '—'}</span>
          ${ll ? U.bao(`Đã mở liên lạc: ${ll.ten} · ${ll.sdt}`, 'tot') : U.bao('Số điện thoại, Zalo, đường dẫn trong tin nhắn được che tới khi bên mua đặt cọc. Gọi qua app thì hai bên không thấy số của nhau.')}
          <div class="luoi-3">${U.nut('Gọi', { bam: 'goi', kieu: 'phu', nho: true, icon: 'call' })}${U.nut('Báo giá', { den: AM.den('bao-gia', { kn: k.id }), kieu: 'phu', nho: true })}${U.nut('Hẹn xem', { den: AM.den('hen-xem', { kn: k.id }), kieu: 'phu', nho: true })}</div>
          ${k.trangThai !== 'dong_y' ? U.bao('Kết nối chưa được đồng ý: chưa nhắn tin được.', 'vang') : ''}
          <div class="khung-chat">${tin.length ? '' : h`<span class="muted" style="text-align:center">Chưa có tin nhắn.</span>`}
            ${tin.map(t => h`<div class="bong-tin ${t.vai === 'ban' ? 'minh' : ''}"><span>${t.noiDung}</span>${t.biChe.length ? h`<span class="xs muted">App đã che liên lạc trong tin này. Giao dịch ngoài app không được bảo vệ.</span>` : ''}<span class="xs muted">${U.tuongDoi(t.luc, c.bg)}</span></div>`)}</div>`,
        duoi: k.trangThai === 'dong_y' ? h`<div class="row" style="align-items:flex-end"><div class="grow">${U.o(c, { k: 'chu', nhan: 'Tin nhắn', ph: 'Nhắn cho bên mua' })}</div>${U.nut('Gửi', { bam: 'gui', nho: true })}</div>` : '',
      };
    },
    sau: (c, el) => el.querySelector('.khung-chat')?.lastElementChild?.scrollIntoView({ block: 'nearest' }),
    bam: {
      goi: c => c.bao('Cuộc gọi qua app (mô phỏng): số của hai bên được che.'),
      gui(c) { if (!String(c.st.chu).trim()) return; const kq = c.lam({ loai: 'gui_tin', ketNoiId: c.ts('kn'), noiDung: c.st.chu }); if (kq.ok) c.dat({ chu: '' }); },
    },
  });

  const NHAN_BG = { cho: ['Chờ trả lời', 'lam'], dong_y: ['Đã chốt', 'xong'], tu_choi: ['Không đồng ý', 'loi'], het: ['Đã thay bằng báo giá mới', ''] };
  AM.man('bao-gia', {
    st(c) { const k = ketNoi(c), lo = k && c.so.lo.find(l => l.id === k.loId); return { gia: lo?.gia ? String(lo.gia) : '', kg: lo ? String(Math.min(A.nv.conBan(lo), 1000)) : '', ngay: A.nv.ngayCua(c.bg + 3 * 864e5), ghiChu: '' }; },
    ve(c) {
      const k = ketNoi(c);
      if (!k) return khongCo();
      const lo = c.so.lo.find(l => l.id === k.loId), ds = A.mc.baoGiaCua(c.so, k.id).slice().reverse();
      return h`<span class="muted">${k.mua.ten} · lô ${lo?.ten}</span>
        ${ds.map(b => U.the(h`<div class="row between"><strong>${b.tu === 'ban' ? 'Bạn báo' : `${k.mua.ten} báo`} ${U.so(b.gia)} đ/kg</strong>${U.chip(NHAN_BG[b.trangThai][0], NHAN_BG[b.trangThai][1])}</div>
          <span class="small">${U.luong(b.kg)} · giao ${U.nd(b.ngayGiao)} · ${U.tuongDoi(b.luc, c.bg)}</span>${b.ghiChu ? h`<span class="small muted">${b.ghiChu}</span>` : ''}
          ${b.trangThai === 'cho' && b.tu === 'mua' ? h`<div class="grid2">${U.nut('Không đồng ý', { bam: 'traLoi', kieu: 'phu', nho: true, data: { id: b.id, v: 0 } })}${U.nut('Đồng ý giá này', { bam: 'traLoi', nho: true, data: { id: b.id, v: 1 } })}</div>` : ''}
          ${b.trangThai === 'dong_y' ? h`<span class="small">${c.so.don.some(d => d.baoGiaId === b.id) ? 'Bên mua đã tạo đơn theo báo giá này.' : 'Chờ bên mua tạo đơn theo báo giá này.'}</span>` : ''}`, { vien: b.trangThai === 'cho' && b.tu === 'mua' ? 'lam' : '' }))}
        ${k.trangThai === 'dong_y' ? U.the(h`<strong class="h2">${ds.some(b => b.tu === 'mua') ? 'Gửi giá khác' : 'Gửi báo giá'}</strong>
          <div class="grid2">${U.o(c, { k: 'gia', nhan: 'Giá', kieu: 'so', donVi: 'đ/kg' })}${U.o(c, { k: 'kg', nhan: 'Lượng', kieu: 'so', donVi: 'kg' })}</div>
          ${U.o(c, { k: 'ngay', nhan: 'Ngày giao', kieu: 'ngay' })}${U.o(c, { k: 'ghiChu', nhan: 'Ghi chú (loại, cách giao)', ph: 'Loại 1, giao tại vườn' })}
          ${U.nut('Gửi báo giá', { bam: 'gui', nho: true })}`) : ''}`;
    },
    bam: {
      traLoi: (c, el) => c.lam({ loai: 'tra_loi_bao_gia', baoGiaId: el.dataset.id, dongY: el.dataset.v === '1' }, { bao: el.dataset.v === '1' ? 'Đã chốt giá. Bên mua tạo đơn theo báo giá này.' : 'Đã trả lời không đồng ý.' }),
      gui: c => c.lam({ loai: 'gui_bao_gia', ketNoiId: c.ts('kn'), gia: U.docSo(c.st.gia), kg: U.docSo(c.st.kg), ngayGiao: c.st.ngay, ghiChu: c.st.ghiChu }, { bao: 'Đã gửi báo giá.' }),
    },
  });

  AM.man('hen-xem', {
    st: c => ({ luc: `${A.nv.ngayCua(c.bg + 864e5)}T08:00`, ghiChu: '' }),
    ve(c) {
      const k = ketNoi(c);
      if (!k) return khongCo();
      const ds = A.mc.henCua(c.so, k.id).slice().reverse(), ap = (c.hs.diaChi || '').split(',')[0]?.trim();
      const nhan = x => (x.trangThai === 'cho' ? ['Chờ trả lời', 'lam'] : x.trangThai === 'dong_y' ? ['Đã hẹn', 'xong'] : x.trangThai === 'huy' ? ['Đã hủy', ''] : ['Không đồng ý', 'loi']);
      return h`${U.bao(`Địa chỉ gửi cho bên mua đến cấp ấp: ${[ap, c.hs.vung].filter(Boolean).join(', ')}. Số nhà, số điện thoại chỉ mở khi có đơn đặt cọc; gọi qua app để chỉ đường.`)}
        ${ds.map(x => U.the(h`<div class="row between"><strong>${U.nd(x.luc)} lúc ${x.luc.slice(11, 16)}</strong>${U.chip(...nhan(x))}</div>
          <span class="small muted">${x.tu === 'ban' ? 'Bạn đề nghị' : `${k.mua.ten} đề nghị`}${x.ghiChu ? ` · ${x.ghiChu}` : ''}</span>
          ${x.trangThai === 'cho' && x.tu === 'mua' ? h`<div class="grid2">${U.nut('Không tiện', { bam: 'traLoi', kieu: 'phu', nho: true, data: { id: x.id, v: 0 } })}${U.nut('Đồng ý lịch này', { bam: 'traLoi', nho: true, data: { id: x.id, v: 1 } })}</div>` : ''}
          ${x.trangThai === 'dong_y' || (x.trangThai === 'cho' && x.tu === 'ban') ? U.nut('Hủy hẹn', { bam: 'huy', kieu: 'phu', nho: true, data: { id: x.id } }) : ''}`, { vien: x.trangThai === 'cho' && x.tu === 'mua' ? 'lam' : '' }))}
        ${k.trangThai === 'dong_y' && !ds.some(x => x.trangThai === 'cho') ? U.the(h`<strong class="h2">Đề nghị giờ hẹn</strong>${U.o(c, { k: 'luc', nhan: 'Ngày giờ', kieu: 'gio' })}${U.o(c, { k: 'ghiChu', nhan: 'Ghi chú', ph: 'Đến cổng ấp, gọi qua app' })}${U.nut('Gửi đề nghị', { bam: 'gui', nho: true })}`) : ''}`;
    },
    bam: {
      traLoi: (c, el) => c.lam({ loai: 'tra_loi_hen', henId: el.dataset.id, dongY: el.dataset.v === '1' }, { bao: el.dataset.v === '1' ? 'Đã đồng ý lịch hẹn.' : 'Đã trả lời không đồng ý.' }),
      huy: (c, el) => c.lam({ loai: 'huy_hen', henId: el.dataset.id }, { bao: 'Đã hủy lịch hẹn.' }),
      gui: c => c.lam({ loai: 'de_nghi_hen', ketNoiId: c.ts('kn'), luc: c.st.luc, ghiChu: c.st.ghiChu }, { bao: 'Đã gửi đề nghị hẹn.' }),
    },
  });

  const LY_DO = ['Hỏi giá rồi không mua, làm phiền', 'Đòi giao dịch ngoài app', 'Lừa đảo, giả danh', 'Lời lẽ xúc phạm', 'Khác'];
  AM.man('bao-cao', {
    st: () => ({ lyDo: LY_DO[0], moTa: '', anh: '' }),
    ve(c) {
      const ten = A.mc.hoSoCongKhai(c.so, c.ts('nguoi'))?.ten ?? c.so.lo.find(l => l.id === c.ts('lo'))?.ten ?? 'tin nhắn';
      return {
        than: h`<p class="muted">Báo cáo ${ten}. Bên kia không biết ai báo cáo.</p>
          ${U.chon(c, { k: 'lyDo', nhan: 'Lý do', boc: true, lua: LY_DO.map(x => [x, x]) })}
          ${U.o(c, { k: 'moTa', nhan: 'Mô tả thêm', kieu: 'chu-dai' })}
          <label class="btn phu nho">${U.icon('image', 22)}${c.st.anh ? `Đã thêm ${String(c.st.anh).split(/[\\/]/).pop()}` : 'Thêm ảnh chụp màn hình'}<input type="file" accept="image/*" class="sr-only" data-st="anh" data-ve-lai></label>`,
        duoi: U.nut('Gửi báo cáo', { bam: 'gui', kieu: 'canh' }),
      };
    },
    bam: {
      gui(c) {
        const doiTuong = c.ts('tin') ? { loai: 'tin_nhan', id: c.ts('tin') } : c.ts('lo') ? { loai: 'lo', id: c.ts('lo') } : { loai: 'nguoi', id: c.ts('nguoi') };
        const anh = c.st.anh ? ` [ảnh: ${String(c.st.anh).split(/[\\/]/).pop()}]` : '';
        c.lam({ loai: 'bao_cao_vi_pham', doiTuong, lyDo: `${c.st.lyDo}${c.st.moTa ? `: ${c.st.moTa}` : ''}${anh}` }, { bao: 'Đã gửi báo cáo. Đội AgiViet xem trong 24 giờ.', den: 'khach' });
      },
    },
  });
})();
