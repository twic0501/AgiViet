// Đơn: danh sách theo nhóm và lịch giao, chi tiết đơn, xác nhận / từ chối, so sánh khách, cọc, liên lạc, kết quả cân,
// các đề nghị đổi lịch / giảm lượng / đổi giá, hủy đơn, đối soát tiền, các bản thỏa thuận.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const don = c => c.so.don.find(d => d.ma === c.ts('ma') && d.ban.id === c.n.id);
  const denDon = (ma, man = 'chi-tiet-don') => AM.den(man, { ma });
  const khongCo = () => U.trong('Không tìm thấy đơn', 'Đơn không có hoặc không phải đơn của bạn.', U.nut('Về Đơn và lịch', { den: '#lich', nho: true }));
  const saiBuoc = (d, can) => h`${U.bao(`Đơn ${d.ma} đang ở bước "${NV.NHAN_TRANG_THAI[d.trangThai]}". ${can}`)}${U.nut('Mở chi tiết đơn', { den: denDon(d.ma) })}`;
  const moTaDN = d => (d.loai === 'doi_lich' ? `đổi ngày giao sang ${U.nd(d.giaTri)}` : d.loai === 'giam_luong' ? `giảm còn ${U.luong(Number(d.giaTri))}` : `đổi giá thành ${U.so(Number(d.giaTri))} đ/kg`);
  const buoc = (c, ma, b, thamSo = [], tc = {}) => c.lam({ loai: 'buoc_don', ma, buoc: b, thamSo }, tc);

  AM.man('lich', {
    st(c) { const n = A.mc.donTheoNhom(c.so, c.n, c.bg); return { tab: n.lam.length || n.loi.length ? 'lam' : 'lich' }; },
    ve(c) {
      const n = A.mc.donTheoNhom(c.so, c.n, c.bg), lich = A.mc.lichGiao(c.so, c.n), homNay = NV.ngayCua(c.bg);
      const theoNgay = lich.reduce((m, d) => ((m[d.ngayGiao] ??= []).push(d), m), {});
      const tab = c.st.tab;
      return h`<div class="cuon-ngang">${[['lam', NV.NHAN_NHOM.lam, n.lam.length], ['loi', NV.NHAN_NHOM.loi, n.loi.length], ['cho', NV.NHAN_NHOM.cho], ['lich', 'Lịch giao'], ['xong', NV.NHAN_NHOM.xong], ['het', NV.NHAN_NHOM.het]].map(([v, nhan, so]) => h`<button type="button" class="pill-nhom" aria-pressed="${String(tab === v)}" data-bam="_dat" data-k="tab" data-v="${v}">${nhan}${so ? h` <span class="badge-so" style="position:static">${so}</span>` : ''}</button>`)}</div>
        ${tab === 'lich' ? h`${lich.length ? '' : U.trong('Chưa có lịch giao', 'Đơn đã xác nhận, chưa cân sẽ xếp theo ngày giao ở đây.')}
            ${Object.entries(theoNgay).map(([ngay, ds]) => h`<section class="stack s8"><h2 class="h2">${ngay === homNay ? 'Hôm nay' : ngay < homNay ? `${U.nd(ngay)} (đã qua)` : U.nd(ngay)} <span class="muted num">· ${U.luong(ds.reduce((s, d) => s + d.kg, 0))}</span></h2>${ds.map(d => U.theDon(d, c.bg))}</section>`)}`
          : h`${n[tab].length ? '' : U.trong('Không có đơn nào', tab === 'lam' ? 'Không có đơn chờ bạn làm.' : '')}
            ${n[tab].map(d => h`<div class="stack s8">${U.theDon(d, c.bg)}${tab === 'lam' || tab === 'loi' ? h`<span class="small muted" style="padding:0 4px">${NV.viecTiep(d, 'ban')}</span>` : ''}</div>`)}`}`;
    },
  });

  /** Các nút của bước tiếp theo, theo trạng thái đơn (người bán). */
  function buocTiep(c, d) {
    const daDG = c.so.danhGia.some(g => g.donMa === d.ma && g.tu.id === d.ban.id);
    switch (d.trangThai) {
      case 'cho_ban_xac_nhan': return U.nut('Xem và trả lời đơn', { den: denDon(d.ma, 'xac-nhan-don') });
      case 'cho_coc': return h`<div class="grid2">${U.nut('Xem tiền cọc', { den: denDon(d.ma, 'coc'), kieu: 'phu', nho: true })}${U.nut('Hủy đơn', { den: denDon(d.ma, 'huy-don'), kieu: 'canh', nho: true })}</div>`;
      case 'cho_giao': return h`${U.nut('Liên lạc bên mua', { den: denDon(d.ma, 'mo-lien-lac'), icon: 'call' })}<div class="grid2">${U.nut('Xin đổi lịch', { den: denDon(d.ma, 'doi-lich'), kieu: 'phu', nho: true })}${U.nut('Giao thiếu', { den: denDon(d.ma, 'giao-mot-phan'), kieu: 'phu', nho: true })}</div>${U.nut('Xin hủy', { den: denDon(d.ma, 'huy-don'), kieu: 'canh', nho: true })}`;
      case 'cho_dong_y_huy': return d.huy?.ben === 'mua'
        ? h`<div class="grid2">${U.nut('Không đồng ý', { bam: 'tuChoiHuy', kieu: 'phu', nho: true, hoi: 'Không đồng ý hủy?|Đơn tiếp tục như cũ: bạn giao hàng theo lịch.|Không đồng ý' })}${U.nut('Đồng ý hủy', { bam: 'dongYHuy', nho: true, hoi: `Đồng ý hủy đơn?|Đơn đóng, ${U.luong(d.kg)} trả về lô. Cọc ${U.dong(d.daCoc?.so)} thuộc về bạn.|Đồng ý hủy` })}</div>`
        : U.bao('Bạn đã xin hủy. Chờ bên mua trả lời.');
      case 'cho_ban_xn_kq': return U.nut('Xem kết quả cân', { den: denDon(d.ma, 'ket-qua'), icon: 'scale' });
      case 'da_chot': case 'tien_dang_giu': return U.nut('Xem bảng quyết toán', { den: AM.den('quyet-toan', { ma: d.ma }), kieu: 'phu' });
      case 'bao_da_tra': return h`${U.bao(`Bên mua báo đã trả ${U.dong(d.tra?.so)} (còn phải trả ${U.dong(d.conPhaiTra)}). Mở sổ ngân hàng kiểm trước khi bấm.`, 'vang')}
        ${U.nut('Đã nhận đủ', { bam: 'tienDu' })}<div class="grid2">${U.nut('Nhận một phần', { bam: 'motPhan', kieu: 'phu', nho: true })}${U.nut('Chưa thấy tiền', { bam: 'tienChua', kieu: 'canh', nho: true })}</div>`;
      case 'chua_thay_tien': return U.nut('Mở đối soát', { den: denDon(d.ma, 'tranh-chap') });
      case 'da_nhan_tien': return h`${U.nut('Xem tiền đã về', { den: AM.den('tien-ve', { ma: d.ma }), kieu: 'phu' })}
        ${daDG ? h`<span class="small muted">Bạn đã đánh giá bên mua.</span>` : U.the(h`<strong>Đánh giá bên mua</strong>${U.sao(c.st.sao || 5, 'sao')}${U.o(c, { k: 'nhanXet', nhan: 'Nhận xét (không bắt buộc)', ph: 'Trả tiền nhanh, cân sòng phẳng' })}${U.nut('Gửi đánh giá', { bam: 'danhGia', nho: true })}`, { lop: 'noi' })}`;
      default: return '';
    }
  }

  AM.man('chi-tiet-don', {
    ten: c => don(c)?.ma || 'Chi tiết đơn',
    st: () => ({ sao: 5, nhanXet: '' }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const n = NV.nhom(d, 'ban', c.bg), giaTri = NV.tien(d.kg, d.gia), ungs = c.so.ungTien.filter(u => u.donMa === d.ma);
      const dn = A.mc.deNghiCuaDon(c.so, d.ma).find(x => x.trangThai === 'cho');
      return h`<div class="row between"><strong class="h2">${d.mua.ten}</strong>${U.chip(d.tenLo)}</div>
        ${U.chang(d)}${U.nhom(n, NV.NHAN_TRANG_THAI[d.trangThai])}
        ${U.the(h`<strong>Bước tiếp theo</strong><span>${NV.viecTiep(d, 'ban')}</span>
          ${d.trangThai === 'cho_coc' && d.coc ? h`<span class="small muted">Còn ${Math.max(0, Math.round((d.coc.han - c.bg) / 3600e3))} giờ tới hạn cọc.</span>` : ''}${buocTiep(c, d)}`, { vien: n === 'lam' ? 'lam' : n === 'loi' ? 'loi' : '' })}
        ${dn ? (dn.tu === 'ban' ? U.bao(`Bạn đề nghị ${moTaDN(dn)}. Chờ bên mua trả lời.`) : U.the(h`<strong>Bên mua đề nghị ${moTaDN(dn)}</strong><span class="small muted">Lý do: ${dn.lyDo}</span><div class="grid2">${U.nut('Không đồng ý', { bam: 'traLoiDN', kieu: 'phu', nho: true, data: { id: dn.id, v: 0 } })}${U.nut('Đồng ý', { bam: 'traLoiDN', nho: true, data: { id: dn.id, v: 1 } })}</div>`, { vien: 'lam' })) : ''}
        ${U.the(h`${U.dong2('Lô', d.tenLo)}${U.dong2('Lượng', U.luong(d.kg))}${U.dong2('Giá', `${U.so(d.gia)} đ/kg`)}${U.dong2('Giá trị đơn', U.dong(giaTri))}${U.dong2('Ngày giao', U.nd(d.ngayGiao))}
          ${d.coc ? U.dong2('Cọc', `${U.dong(d.coc.so)} ${d.daCoc ? '(đã vào tài khoản đảm bảo)' : '(chưa cọc)'}`) : ''}
          ${d.coc ? U.dong2(`Phí ${d.coc.loaiPhi === 'moi_quen' ? 'mối quen' : 'giới thiệu'} (bên mua trả)`, U.dong(d.coc.phi)) : ''}
          ${d.ketQuaCan ? U.dong2('Cân', `nhận ${U.luong(d.ketQuaCan.nhan)}, trả lại ${U.luong(d.ketQuaCan.tuChoi)}${d.ketQuaCan.phanDoi ? ' (bạn đã báo sai)' : ''}`) : ''}
          ${d.phaiTra !== undefined ? U.dong2('Tiền hàng', U.dong(d.phaiTra)) : ''}${d.conPhaiTra !== undefined ? U.dong2('Còn phải trả', U.dong(d.conPhaiTra)) : ''}
          ${d.huy ? U.dong2('Hủy / từ chối', `${d.huy.ben === 'ban' ? 'Bạn' : 'Bên mua'}: ${d.huy.lyDo}`) : ''}
          ${ungs.map(u => U.dong2('Ứng trước', `${U.dong(u.so)} · ${{ cho_duyet: 'chờ ngân hàng duyệt', da_giai_ngan: 'đã nhận', da_thu_hoi: 'đã trừ vào tiền hàng', tu_choi: 'không duyệt' }[u.trangThai]}`))}`)}
        ${d.ketLuan ? U.bao(`Vận hành ghi nhận: ${d.ketLuan.noiDung}`) : ''}
        <div class="grid2">
          ${U.nut('Các bản', { den: denDon(d.ma, 'so-ban'), kieu: 'phu', nho: true, icon: 'versions' })}
          ${['cho_ban_xac_nhan', 'cho_coc', 'cho_giao'].includes(d.trangThai) ? U.nut('Xin thay đổi', { den: denDon(d.ma, 'yeu-cau-thay-doi'), kieu: 'phu', nho: true, icon: 'change' }) : ''}
          ${['cho_giao', 'cho_ban_xn_kq', 'da_chot'].includes(d.trangThai) && !ungs.some(u => ['cho_duyet', 'da_giai_ngan'].includes(u.trangThai)) ? U.nut('Nhận tiền trước', { den: AM.den('ung-tien', { ma: d.ma }), kieu: 'phu', nho: true, icon: 'wallet' }) : ''}
          ${U.nut('Cần hỗ trợ', { den: AM.den('can-ho-tro', { don: d.ma }), kieu: 'phu', nho: true, icon: 'help' })}
        </div>
        ${U.the(h`<strong class="h2">Lịch sử đơn</strong><ol class="dong-thoi-gian">${[...d.lichSu].reverse().map((l, i) => h`<li class="${i === 0 ? 'dang' : 'qua'}"><div class="stack" style="gap:2px"><span>${l.noiDung}</span><span class="xs muted">${U.gioNgay(l.luc)} · ${{ ban: 'Bạn', mua: 'Bên mua', van_hanh: 'Vận hành', he_thong: 'Hệ thống' }[l.vai]}</span></div></li>`)}</ol>`)}`;
    },
    bam: {
      tuChoiHuy: c => buoc(c, c.ts('ma'), 'tuChoiHuy', [], { bao: 'Đơn tiếp tục.' }),
      dongYHuy: c => buoc(c, c.ts('ma'), 'dongYHuy', [], { bao: 'Đã hủy đơn. Cọc thuộc về bạn.' }),
      tienDu: c => buoc(c, c.ts('ma'), 'tienDu', [], { bao: 'Đã xác nhận nhận đủ. Đơn hoàn tất.' }),
      motPhan: c => buoc(c, c.ts('ma'), 'nhanMotPhan', [], { bao: 'Đã ghi nhận một phần.' }),
      tienChua: c => buoc(c, c.ts('ma'), 'tienChua', [], { bao: 'Đã mở đối soát.' }),
      traLoiDN: (c, el) => c.lam({ loai: 'tra_loi_de_nghi', deNghiId: el.dataset.id, dongY: el.dataset.v === '1' }, { bao: el.dataset.v === '1' ? 'Đã đồng ý. Thỏa thuận có bản mới.' : 'Đã trả lời không đồng ý. Đơn giữ như cũ.' }),
      danhGia: c => c.lam({ loai: 'danh_gia', ma: c.ts('ma'), diem: Number(c.st.sao) || 5, ...(c.st.nhanXet ? { nhanXet: c.st.nhanXet } : {}) }, { bao: 'Cảm ơn bạn đã đánh giá.' }),
    },
  });

  const LY_DO_TU_CHOI = ['Hết hàng', 'Giá thấp quá', 'Ngày giao không kịp', 'Đã hứa bán cho khách khác', 'Khác'];
  AM.man('xac-nhan-don', {
    st: () => ({ tuChoi: false, lyDo: LY_DO_TU_CHOI[0] }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      if (d.trangThai !== 'cho_ban_xac_nhan') return saiBuoc(d, 'Đơn đã được trả lời.');
      const lo = c.so.lo.find(l => l.id === d.loId), con = lo ? NV.conBan(lo) : 0, hs = A.mc.hoSoCongKhai(c.so, d.mua.id);
      const cungLo = c.so.don.filter(x => x.loId === d.loId && x.trangThai === 'cho_ban_xac_nhan'), giaTri = NV.tien(d.kg, d.gia);
      return {
        than: h`<span class="muted">Đơn ${d.ma} · ${U.tuongDoi(d.taoLuc, c.bg)}</span>
          ${U.the(h`<strong class="so-lon">${U.luong(d.kg)} × ${U.so(d.gia)} đ</strong>${U.dong2('Giá trị', U.dong(giaTri))}${U.dong2('Giao ngày', U.nd(d.ngayGiao))}${U.dong2('Cọc bên mua sẽ đặt', U.dong(NV.tinhCoc(giaTri, c.so.chinhSach)))}`, { lop: 'noi' })}
          ${hs ? U.the(h`<strong>${hs.ten}</strong><span class="small muted">${hs.vung} · uy tín ${NV.NHAN_BAC[hs.uyTin.bac]} · ${hs.uyTin.soDonXong} đơn hoàn tất</span>`, { den: AM.den('ho-so-ben-mua', { id: hs.id }) }) : ''}
          ${d.kg > con ? U.bao(`Lô ${lo?.ten} chỉ còn bán được ${U.luong(con)}, đơn cần ${U.luong(d.kg)}. Từ chối, hoặc nhắn bên mua giảm lượng.`, 'loi') : U.bao(`Lô ${lo?.ten} còn bán được ${U.luong(con)}. Xác nhận thì giữ ${U.luong(d.kg)} cho đơn này.`, 'tot')}
          ${lo?.coSo === 'uoc_tinh' ? U.bao('Lượng lô đang là ước tính. Chỉ hứa phần bạn chắc chắn hái được.', 'vang') : ''}
          ${cungLo.length > 1 ? U.nut(`So sánh ${cungLo.length} khách đặt lô này`, { den: AM.den('so-sanh', { lo: d.loId }), kieu: 'phu', icon: 'compare' }) : ''}
          ${c.st.tuChoi ? U.chon(c, { k: 'lyDo', nhan: 'Lý do từ chối (bên mua thấy)', boc: true, lua: LY_DO_TU_CHOI.map(x => [x, x]) }) : ''}`,
        duoi: c.st.tuChoi
          ? h`<div class="grid2">${U.nut('Quay lại', { bam: '_bat', data: { k: 'tuChoi' }, kieu: 'phu' })}${U.nut('Từ chối đơn', { bam: 'tuChoi', kieu: 'canh' })}</div>`
          : h`<div class="grid2">${U.nut('Từ chối', { bam: '_bat', data: { k: 'tuChoi' }, kieu: 'phu' })}${U.nut('Xác nhận và ký', { den: AM.den('phuong-thuc', { ma: d.ma }), ...(d.kg > con ? { bam: 'khongDu', den: undefined } : {}) })}</div>`,
      };
    },
    bam: {
      tuChoi: c => buoc(c, c.ts('ma'), 'tuChoiDon', [c.st.lyDo], { bao: 'Đã từ chối đơn.', den: 'lich' }),
      khongDu: c => c.bao('Lô không còn đủ hàng cho đơn này.', 'loi'),
    },
  });

  AM.man('so-sanh', {
    ve(c) {
      const ds = c.so.don.filter(d => d.loId === c.ts('lo') && d.trangThai === 'cho_ban_xac_nhan'), lo = c.so.lo.find(l => l.id === c.ts('lo'));
      if (!ds.length) return U.trong('Không có đơn chờ để so sánh');
      const cao = Math.max(...ds.map(d => d.gia));
      return h`<span class="muted">${lo?.ten} · còn bán được ${lo ? U.luong(NV.conBan(lo)) : ''}</span>
        <div class="grid2">${ds.map(d => {
          const hs = A.mc.hoSoCongKhai(c.so, d.mua.id), gt = NV.tien(d.kg, d.gia), quen = c.so.don.some(x => x.ma !== d.ma && x.mua.id === d.mua.id && x.ban.id === d.ban.id && x.daCoc);
          return U.the(h`<strong>${d.mua.ten}</strong>${d.gia === cao ? U.chip('Giá cao nhất', 'lam') : ''}
            ${U.dong2('Giá', `${U.so(d.gia)} đ/kg`)}${U.dong2('Lượng', U.luong(d.kg))}${U.dong2('Giá trị', U.tienGon(gt))}${U.dong2('Giao', U.ndNgan(d.ngayGiao))}
            ${U.dong2('Phí bên mua trả', `${U.dong(NV.tinhPhi(gt, quen, c.so.chinhSach))}${quen ? ' (mối quen)' : ''}`)}${U.dong2('Uy tín', hs ? NV.NHAN_BAC[hs.uyTin.bac] : '')}
            ${U.dong2('Trả đúng hạn', hs?.uyTin.tyLeTraDungHan == null ? 'chưa có' : `${Math.round(hs.uyTin.tyLeTraDungHan * 100)}%`)}
            ${U.nut('Chọn đơn này', { den: denDon(d.ma, 'xac-nhan-don'), nho: true })}`, { vien: d.gia === cao ? 'lam' : '' });
        })}</div>
        <span class="small muted">Bạn không phải trả phí. Đơn nào không chọn thì từ chối để bên mua biết sớm.</span>`;
    },
  });

  AM.man('coc', {
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      if (!d.coc) return saiBuoc(d, 'Cọc được tính khi bạn xác nhận đơn.');
      const con = (d.coc.han - c.bg) / 3600e3;
      return h`${U.the(h`<span class="muted">Tiền cọc đơn ${d.ma}</span><strong class="so-lon">${U.dong(d.coc.so)}</strong>
          ${d.daCoc ? h`${U.chip('Đã vào tài khoản đảm bảo', 'xong')}<span class="small">Ngân hàng xác nhận lúc ${U.gioNgay(d.daCoc.luc)}. Cọc được trừ vào tiền hàng khi chốt cân.</span>`
            : d.trangThai === 'qua_han' ? U.chip('Quá hạn, đơn đã đóng', 'loi')
            : h`${U.chip('Chờ bên mua cọc', 'cho')}<span class="small">Hạn ${U.gioNgay(d.coc.han)} (${con > 0 ? `còn ${Math.floor(con)} giờ ${Math.round((con % 1) * 60)} phút` : 'đã quá hạn'}). Quá hạn thì đơn tự đóng và lượng trả về lô.</span>`}`, { lop: 'noi' })}
        ${U.bao('Cọc nằm ở tài khoản đảm bảo do ngân hàng đối tác giữ. App ghi "đã cọc" theo xác nhận của ngân hàng, bạn không cần tự bấm "đã nhận".')}
        ${d.daCoc ? U.nut('Xem liên lạc bên mua', { den: denDon(d.ma, 'mo-lien-lac'), icon: 'unlock' }) : ''}`;
    },
  });

  AM.man('mo-lien-lac', {
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const ll = d.daCoc ? A.mc.lienLacCua(c.so, c.n, d.mua.id) : null;
      if (!ll) return h`${U.bao('Liên lạc mở sau khi bên mua đặt cọc. Trước đó hai bên nhắn tin, gọi qua app (che số).')}${d.ketNoiId ? U.nut('Nhắn qua app', { den: AM.den('chat', { kn: d.ketNoiId }) }) : ''}`;
      return h`${U.bao('Bên mua đã cọc. Hai bên thấy số điện thoại và địa chỉ của nhau.', 'tot')}
        ${U.the(h`<strong class="h2">${d.mua.ten}</strong>${U.dong2('Người liên hệ', ll.ten)}${U.dong2('Số điện thoại', ll.sdt)}${U.dong2('Địa chỉ nhận hàng', ll.diaChi || 'chưa ghi')}
          <div class="grid2"><a class="btn nho" href="tel:${ll.sdt.replace(/\s/g, '')}">${U.icon('call', 20)}Gọi</a>${U.nut('Lưu danh bạ', { bam: 'danhBa', kieu: 'phu', nho: true })}</div>`)}
        ${U.the(h`<strong>Bên mua thấy của bạn</strong>${U.dong2('Số điện thoại', c.hs.sdt)}${U.dong2('Địa chỉ vườn', c.hs.diaChi || c.hs.vung)}`)}
        <span class="small muted">Giao dịch tiếp vẫn ghi trên app để được bảo vệ: kết quả cân, tiền, đổi lịch.</span>`;
    },
    bam: {
      danhBa(c) {
        const d = don(c), ll = A.mc.lienLacCua(c.so, c.n, d.mua.id);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([`BEGIN:VCARD\nVERSION:3.0\nFN:${ll.ten} (${d.mua.ten})\nTEL:${ll.sdt}\nADR:;;${ll.diaChi}\nEND:VCARD`], { type: 'text/vcard' }));
        a.download = `${d.mua.ten}.vcf`; a.click();
        c.bao('Đã tạo tệp danh bạ.');
      },
    },
  });

  AM.man('ket-qua', {
    st: () => ({ anhCan: '' }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const kq = d.ketQuaCan;
      if (d.trangThai !== 'cho_ban_xn_kq' || !kq) return saiBuoc(d, d.trangThai === 'cho_giao' ? 'Chờ bên mua cân và gửi số.' : 'Kết quả cân đã xử lý.');
      const tienHang = NV.tien(kq.nhan, d.gia), coc = d.daCoc?.so ?? 0;
      return {
        than: h`<span class="muted">Bên mua nhập kết quả cân đơn ${d.ma}</span>
          ${U.the(h`${U.dong2('Đơn', U.luong(d.kg))}${U.dong2('Nhận', U.luong(kq.nhan))}${U.dong2('Không nhận (trả lại)', U.luong(kq.tuChoi))}${kq.phieu ? U.dong2('Phiếu cân', kq.phieu) : h`<span class="small muted">Bên mua chưa gửi ảnh phiếu cân.</span>`}`)}
          ${U.the(h`${U.dong2(`${U.luong(kq.nhan)} × ${U.so(d.gia)} đ`, U.dong(tienHang))}${U.dong2('Trừ cọc đã giữ', `− ${U.dong(Math.min(coc, tienHang))}`)}${U.dong2(h`<strong>Bên mua còn phải trả</strong>`, h`<strong>${U.dong(Math.max(0, tienHang - coc))}</strong>`)}`, { lop: 'noi' })}
          <label class="btn phu nho">${U.icon('scale', 22)}${c.st.anhCan ? `Đã chụp: ${String(c.st.anhCan).split(/[\\/]/).pop()}` : 'Chụp số trên cân của tôi'}<input type="file" accept="image/*" capture="environment" class="sr-only" data-st="anhCan" data-ve-lai></label>`,
        duoi: h`<div class="grid2">${U.nut('Không đúng', { bam: 'sai', kieu: 'canh', hoi: 'Báo số cân không đúng?|Đơn quay về chờ cân: bên mua kiểm lại và gửi số mới. Bạn nên chụp số trên cân của mình làm bằng.|Báo không đúng|canh' })}${U.nut('Đúng, chốt số', { bam: 'dung' })}</div>`,
      };
    },
    bam: {
      sai: c => buoc(c, c.ts('ma'), 'ketQuaSai', [], { bao: 'Đã báo số cân không đúng. Bên mua sẽ kiểm lại.', den: ['chi-tiet-don', { ma: c.ts('ma') }] }),
      dung: c => buoc(c, c.ts('ma'), 'ketQuaDung', [], { bao: 'Đã chốt số cân.', den: ['quyet-toan', { ma: c.ts('ma') }] }),
    },
  });

  /** Màn đề nghị dùng chung: đổi lịch, giảm lượng, đổi giá. */
  function manDeNghi(c, d, loai, nhan, kieu, tren) {
    const dangCho = A.mc.deNghiCuaDon(c.so, d.ma).find(x => x.trangThai === 'cho');
    if (dangCho) return h`${U.bao(`Đơn đang có đề nghị chờ trả lời: ${moTaDN(dangCho)}. Mỗi lần chỉ một đề nghị.`)}${U.nut('Về chi tiết đơn', { den: denDon(d.ma) })}`;
    return {
      than: h`${tren}${U.o(c, { k: 'gt', nhan, kieu, ...(kieu === 'so' ? { donVi: loai === 'giam_luong' ? 'kg' : 'đ/kg' } : {}) })}
        ${U.o(c, { k: 'lyDo', nhan: 'Lý do', kieu: 'chu-dai', ph: loai === 'doi_lich' ? 'Mưa lớn, chưa hái được' : loai === 'giam_luong' ? 'Mưa bão rụng trái' : 'Giá thị trường tăng' })}
        <label class="btn phu nho">${U.icon('camera', 22)}${c.st.anh ? `Đã thêm ảnh ${String(c.st.anh).split(/[\\/]/).pop()}` : 'Thêm ảnh làm bằng'}<input type="file" accept="image/*" class="sr-only" data-st="anh" data-ve-lai></label>`,
      duoi: U.nut('Gửi đề nghị', { bam: 'gui', data: { loai, kieu } }),
    };
  }
  const guiDN = (c, el) => {
    const anh = c.st.anh ? ` (ảnh: ${String(c.st.anh).split(/[\\/]/).pop()})` : '';
    c.lam({ loai: 'de_nghi_don', ma: c.ts('ma'), deNghi: el.dataset.loai, giaTri: el.dataset.kieu === 'so' ? String(U.docSo(c.st.gt)) : c.st.gt, lyDo: `${c.st.lyDo || ''}${anh}` }, { bao: 'Đã gửi đề nghị. Bên mua đồng ý thì thỏa thuận có bản mới.', den: ['chi-tiet-don', { ma: c.ts('ma') }] });
  };

  AM.man('doi-lich', {
    st: c => { const d = don(c); return { gt: NV.ngayCua(Math.max(c.bg, d ? Date.parse(d.ngayGiao) : 0) + 2 * 864e5), lyDo: '', anh: '' }; },
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      if (!['cho_coc', 'cho_giao'].includes(d.trangThai)) return saiBuoc(d, 'Chỉ đổi lịch được sau khi xác nhận và trước khi cân.');
      return manDeNghi(c, d, 'doi_lich', 'Ngày giao mới', 'ngay', U.the(U.dong2('Đang hẹn', U.nd(d.ngayGiao))));
    },
    bam: { gui: guiDN },
  });

  AM.man('giao-mot-phan', {
    st: c => ({ gt: String(Math.round((don(c)?.kg ?? 0) * 0.7)), lyDo: '', anh: '' }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      if (!['cho_coc', 'cho_giao'].includes(d.trangThai)) return saiBuoc(d, 'Giảm lượng được sau khi xác nhận và trước khi cân.');
      const lo = c.so.lo.find(l => l.id === d.loId);
      return manDeNghi(c, d, 'giam_luong', 'Lượng giao được', 'so', h`${U.the(h`${U.dong2('Đơn hứa', U.luong(d.kg))}${U.dong2('Lô đã giao (mọi đơn)', lo ? U.luong(lo.giao) : '')}${U.dong2('Lô còn bán được', lo ? U.luong(NV.conBan(lo)) : '')}`)}
        ${U.bao('Không giao đủ: đề nghị giảm lượng. Bên mua đồng ý thì phần thiếu trả về lô, cọc tính lại theo lượng mới (nếu chưa cọc). Phần còn lại giao đợt sau thì tạo đơn mới với bên mua.')}`);
    },
    bam: { gui: guiDN },
  });

  AM.man('yeu-cau-thay-doi', {
    st: c => { const d = don(c); return { loai: d && ['cho_coc', 'cho_giao'].includes(d.trangThai) ? 'doi_lich' : 'doi_gia', gt: d?.ngayGiao ?? '', lyDo: '', anh: '' }; },
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const duoc = [...(['cho_coc', 'cho_giao'].includes(d.trangThai) ? ['doi_lich', 'giam_luong'] : []), ...(['cho_ban_xac_nhan', 'cho_coc'].includes(d.trangThai) ? ['doi_gia'] : [])];
      if (!duoc.length) return saiBuoc(d, 'Ở bước này không đổi điều kiện được nữa.');
      const loai = duoc.includes(c.st.loai) ? c.st.loai : duoc[0];
      const TEN = { doi_lich: 'Ngày giao', giam_luong: 'Lượng', doi_gia: 'Giá' };
      const tren = h`<div class="truong"><span class="label">Đổi gì</span><div class="phan-doan">${duoc.map(x => h`<button type="button" aria-pressed="${String(x === loai)}" data-bam="doiLoai" data-v="${x}">${TEN[x]}</button>`)}</div></div>
        ${U.the(U.dong2('Bản đang có', `${U.luong(d.kg)} × ${U.so(d.gia)} đ, giao ${U.nd(d.ngayGiao)}`))}`;
      return manDeNghi(c, d, loai, loai === 'doi_lich' ? 'Ngày mới' : loai === 'giam_luong' ? 'Lượng mới' : 'Giá mới', loai === 'doi_lich' ? 'ngay' : 'so', tren);
    },
    bam: {
      doiLoai(c, el) { const d = don(c), v = el.dataset.v; c.dat({ loai: v, gt: v === 'doi_lich' ? d.ngayGiao : v === 'giam_luong' ? String(d.kg) : String(d.gia) }); },
      gui: guiDN,
    },
  });

  AM.man('huy-don', {
    st: () => ({ lyDo: 'Mưa bão, hàng hư', anh: '' }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const MO = {
        cho_ban_xac_nhan: 'Chưa xác nhận đơn: từ chối là xong, không ảnh hưởng uy tín.',
        cho_coc: 'Bên mua chưa cọc: hủy ngay, lượng trả về lô, không mất gì.',
        cho_giao: `Bên mua đã cọc ${U.dong(d.daCoc?.so)}. Hủy cần bên mua đồng ý; nếu đồng ý, cọc thuộc về bên mua (hoàn lại cho họ) và đơn tính là bạn hủy khi xếp uy tín.`,
      };
      const mo = MO[d.trangThai];
      if (!mo) return saiBuoc(d, 'Ở bước này không hủy được. Có vấn đề về tiền hay số cân thì mở đối soát hoặc nhờ hỗ trợ.');
      const xin = d.trangThai === 'cho_giao';
      return {
        than: h`${U.bao(mo, 'vang')}${U.chon(c, { k: 'lyDo', nhan: 'Lý do', boc: true, lua: ['Mưa bão, hàng hư', 'Hàng không đạt loại', 'Bên mua đổi điều kiện', 'Việc gia đình', 'Khác'].map(x => [x, x]) })}
          <label class="btn phu nho">${U.icon('camera', 22)}${c.st.anh ? `Bằng chứng: ${String(c.st.anh).split(/[\\/]/).pop()}` : 'Thêm ảnh bằng chứng'}<input type="file" accept="image/*" class="sr-only" data-st="anh" data-ve-lai></label>`,
        duoi: U.nut(xin ? 'Xin hủy đơn' : 'Hủy đơn', { bam: 'huy', kieu: 'canh', hoi: `${xin ? 'Gửi xin hủy?' : 'Hủy đơn?'}|${mo}|${xin ? 'Gửi xin hủy' : 'Hủy đơn'}|canh` }),
      };
    },
    bam: {
      huy(c) {
        const d = don(c), ly = `${c.st.lyDo}${c.st.anh ? ` (ảnh: ${String(c.st.anh).split(/[\\/]/).pop()})` : ''}`;
        const b = { cho_ban_xac_nhan: 'tuChoiDon', cho_coc: 'huyTruocCoc', cho_giao: 'yeuCauHuy' }[d.trangThai];
        buoc(c, d.ma, b, [ly], d.trangThai === 'cho_giao' ? { bao: 'Đã gửi xin hủy. Chờ bên mua trả lời.', den: ['chi-tiet-don', { ma: d.ma }] } : { bao: 'Đã hủy đơn.', den: 'lich' });
      },
    },
  });

  AM.man('tranh-chap', {
    st: () => ({ ghi: '' }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const doi = d.trangThai === 'chua_thay_tien', can = d.trangThai === 'cho_giao' && d.ketQuaCan?.phanDoi;
      if (!doi && !can && !d.doiSoat?.length) return saiBuoc(d, 'Đơn không có đối soát đang mở.');
      return h`${doi ? U.the(h`<strong>Phần đang lệch</strong>${U.dong2('Bên mua báo đã trả', U.dong(d.tra?.so))}${U.dong2('Còn phải trả', U.dong(d.conPhaiTra))}<span class="small">App không kết luận bên nào sai. Xem lại sổ ngân hàng (cả tài khoản khác nếu có).</span>${U.nut('Đã thấy tiền', { bam: 'thay', nho: true })}`, { vien: 'loi' }) : ''}
        ${can ? U.the(h`<strong>Số cân đang lệch</strong><span>Bạn đã báo số cân ${U.luong(d.ketQuaCan.nhan)} không đúng. Chờ bên mua gửi lại số.</span>`, { vien: 'loi' }) : ''}
        ${U.the(h`<strong>Chứng từ hai bên</strong>${d.chungTu?.length ? d.chungTu.map(x => U.dong2(U.gioNgay(x.luc), x.ten)) : h`<span class="muted">Bên mua chưa gửi chứng từ.</span>`}`)}
        ${U.the(h`<strong>Ghi chép đối soát</strong><div class="khung-chat">${(d.doiSoat || []).map(g => h`<div class="bong-tin ${g.vai === 'ban' ? 'minh' : ''}"><span>${g.noiDung}</span><span class="xs muted">${g.vai === 'ban' ? 'Bạn' : g.vai === 'mua' ? 'Bên mua' : 'Vận hành'} · ${U.gioNgay(g.luc)}</span></div>`)}</div>
          ${doi ? h`${U.o(c, { k: 'ghi', nhan: 'Ghi thêm', ph: 'Sổ Agribank chưa có khoản nào từ ngày 12' })}${U.nut('Ghi vào đối soát', { bam: 'ghi', kieu: 'phu', nho: true })}` : ''}`)}
        ${U.the(h`${U.dong2('Người phụ trách', 'Đội vận hành AgiViet')}${d.ketLuan ? h`<span>Kết luận: ${d.ketLuan.noiDung}</span>` : h`<span class="small muted">Vận hành xem chứng từ và ghi kết luận; quyết định cuối vẫn do hai bên.</span>`}`)}
        ${U.nut('Nhờ vận hành hỗ trợ', { den: AM.den('can-ho-tro', { don: d.ma }), kieu: 'phu' })}`;
    },
    bam: {
      thay: c => buoc(c, c.ts('ma'), 'tienDu', [], { bao: 'Đã đóng đối soát.', den: ['chi-tiet-don', { ma: c.ts('ma') }] }),
      ghi(c) { const kq = buoc(c, c.ts('ma'), 'ghiDoiSoat', [c.st.ghi], { bao: 'Đã ghi.' }); if (kq.ok) c.dat({ ghi: '' }); },
    },
  });

  AM.man('so-ban', {
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const dsDn = A.mc.deNghiCuaDon(c.so, d.ma), goc = d.lichSu[0];
      let ban = 1;
      return h`${U.the(h`<div class="row between"><strong>Bản 1 · khi tạo đơn</strong>${U.chip(goc ? U.gioNgay(goc.luc) : '')}</div><span class="small">${goc?.noiDung}</span>`)}
        ${dsDn.map(x => { if (x.trangThai === 'dong_y') ban += 1; return U.the(h`<div class="row between"><strong>${x.trangThai === 'dong_y' ? `Bản ${ban}` : 'Đề nghị'} · ${x.tu === 'ban' ? 'bạn' : 'bên mua'} đề nghị</strong>${U.chip(x.trangThai === 'dong_y' ? 'Hai bên đã đồng ý' : x.trangThai === 'cho' ? 'Chờ trả lời' : 'Không đồng ý', x.trangThai === 'dong_y' ? 'xong' : x.trangThai === 'cho' ? 'lam' : 'loi')}</div>
          <span>${moTaDN(x)}</span><span class="small muted">${x.lyDo} · ${U.gioNgay(x.luc)}</span>`, { vien: x.trangThai === 'cho' ? 'lam' : '' }); })}
        ${U.the(h`<strong>Bản đang có hiệu lực</strong><span>${U.luong(d.kg)} × ${U.so(d.gia)} đ, giao ${U.nd(d.ngayGiao)}</span>`, { lop: 'noi' })}
        ${['cho_ban_xac_nhan', 'cho_coc', 'cho_giao'].includes(d.trangThai) ? U.nut('Đề nghị sửa', { den: denDon(d.ma, 'yeu-cau-thay-doi') }) : ''}`;
    },
  });
})();
