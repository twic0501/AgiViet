// Đơn hàng: danh sách theo nhóm, chi tiết đơn, lập đơn (thỏa thuận), đặt cọc, liên lạc, nhập kết quả cân, đọc phiếu cân,
// đối soát, lịch nhận và trả tiền theo tháng, hủy đơn.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const don = c => c.so.don.find(d => d.ma === c.ts('ma') && d.mua.id === c.n.id);
  const denDon = (ma, man = 'chi-tiet-don') => AM.den(man, { ma });
  const khongCo = () => U.trong('Không tìm thấy đơn', '', U.nut('Về Đơn hàng', { den: '#don-hang', nho: true }));
  const saiBuoc = (d, can) => h`${U.bao(`Đơn ${d.ma} đang ở bước "${NV.NHAN_TRANG_THAI[d.trangThai]}". ${can}`)}${U.nut('Mở chi tiết đơn', { den: denDon(d.ma) })}`;
  const buoc = (c, ma, b, thamSo = [], tc = {}) => c.lam({ loai: 'buoc_don', ma, buoc: b, thamSo }, tc);
  const moTaDN = d => (d.loai === 'doi_lich' ? `đổi ngày giao sang ${U.nd(d.giaTri)}` : d.loai === 'giam_luong' ? `giảm còn ${U.luong(Number(d.giaTri))}` : `đổi giá thành ${U.so(Number(d.giaTri))} đ/kg`);

  AM.man('don-hang', {
    st(c) { const n = A.mc.donTheoNhom(c.so, c.n, c.bg); return { tab: n.lam.length || n.loi.length ? 'lam' : 'cho' }; },
    ve(c) {
      const n = A.mc.donTheoNhom(c.so, c.n, c.bg), ds = n[c.st.tab];
      return h`${U.tab(c, 'tab', [['lam', NV.NHAN_NHOM.lam, n.lam.length], ['loi', NV.NHAN_NHOM.loi, n.loi.length], ['cho', NV.NHAN_NHOM.cho], ['xong', NV.NHAN_NHOM.xong], ['het', NV.NHAN_NHOM.het]])}
        ${ds.length ? U.bang([['Đơn'], ['Người bán'], ['Lượng × giá', 'so'], ['Giao'], ['Trạng thái'], ['Việc tiếp']], ds.map(d => ({ lop: c.st.tab === 'lam' ? 'lam' : '', o: [h`<a href="${denDon(d.ma)}">${d.ma}</a><br><span class="xs muted">${d.tenLo}</span>`, d.ban.ten, h`${U.luong(d.kg)} × ${U.so(d.gia)}`, U.ndNgan(d.ngayGiao), U.nhom(NV.nhom(d, 'mua', c.bg), NV.NHAN_TRANG_THAI[d.trangThai]), h`<span class="small">${NV.viecTiep(d, 'mua')}</span>`] })))
          : U.trong('Không có đơn nào', c.st.tab === 'lam' ? 'Không có đơn chờ bạn làm.' : '')}
        <div class="row" style="gap:8px">${U.nut('Lịch nhận và trả tiền', { den: '#lich-nhan', kieu: 'phu', nho: true, icon: 'calendar' })}${U.nut('Tìm nguồn hàng', { den: 'nguon-hang.html#nguon-hang', kieu: 'phu', nho: true, icon: 'search' })}</div>`;
    },
  });

  function buocTiep(c, d) {
    const daDG = c.so.danhGia.some(g => g.donMa === d.ma && g.tu.id === c.n.id);
    switch (d.trangThai) {
      case 'cho_ban_xac_nhan': return h`<div class="row" style="gap:8px;flex-wrap:wrap">${U.nut('Rút đơn', { bam: 'rut', kieu: 'phu', nho: true, hoi: 'Rút đơn?|Người bán chưa xác nhận nên rút không mất gì.|Rút đơn' })}${U.nut('Đề nghị đổi giá', { den: AM.den('huy-don', { ma: d.ma, doi: 1 }), kieu: 'phu', nho: true })}</div>`;
      case 'cho_coc': return h`${U.nut(`Đặt cọc ${U.dong(d.coc.so)}`, { den: denDon(d.ma, 'dat-coc'), icon: 'deposit' })}${U.nut('Hủy đơn', { den: denDon(d.ma, 'huy-don'), kieu: 'canh', nho: true })}`;
      case 'cho_giao': return h`${U.nut('Nhập kết quả cân', { den: denDon(d.ma, 'nghiem-thu'), icon: 'scale' })}<div class="row" style="gap:8px;flex-wrap:wrap">${U.nut('Đọc phiếu cân', { den: denDon(d.ma, 'doc-phieu-can'), kieu: 'phu', nho: true, icon: 'camera' })}${U.nut('Liên lạc người bán', { den: denDon(d.ma, 'mo-lien-lac'), kieu: 'phu', nho: true, icon: 'call' })}${U.nut('Dời lịch, xin hủy', { den: denDon(d.ma, 'huy-don'), kieu: 'phu', nho: true })}</div>`;
      case 'cho_dong_y_huy': return d.huy?.ben === 'ban'
        ? h`<div class="row" style="gap:8px">${U.nut('Không đồng ý hủy', { bam: 'tuChoiHuy', kieu: 'phu', nho: true })}${U.nut('Đồng ý hủy', { bam: 'dongYHuy', nho: true, hoi: `Đồng ý hủy?|Đơn đóng; cọc ${U.dong(d.daCoc?.so)} hoàn về bạn.|Đồng ý hủy` })}</div>`
        : U.bao('Bạn đã xin hủy. Chờ người bán trả lời.');
      case 'da_chot': return U.nut(`Trả ${U.dong(d.conPhaiTra)} còn lại`, { den: AM.den('ghi-thanh-toan', { ma: d.ma }), icon: 'payment' });
      case 'chua_thay_tien': return U.nut('Mở đối soát', { den: denDon(d.ma, 'doi-soat') });
      case 'da_nhan_tien': return h`${c.so.kho.some(p => p.donMa === d.ma) ? U.chip('Đã nhập kho', 'xong') : U.nut('Nhập kho', { den: AM.den('nhap-kho', { ma: d.ma }), kieu: 'phu', nho: true, icon: 'warehouse' })}
        ${daDG ? h`<span class="small muted">Bạn đã đánh giá người bán.</span>` : U.the(h`<strong>Đánh giá người bán</strong>${U.sao(c.st.sao || 5, 'sao')}${U.o(c, { k: 'nhanXet', nhan: 'Nhận xét', ph: 'Hàng đúng loại, giao đúng hẹn' })}${U.nut('Gửi đánh giá', { bam: 'danhGia', nho: true })}`, { lop: 'noi' })}`;
      default: return '';
    }
  }

  AM.man('chi-tiet-don', {
    ten: c => don(c)?.ma || 'Chi tiết đơn',
    st: () => ({ sao: 5, nhanXet: '' }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const n = NV.nhom(d, 'mua', c.bg), dn = A.mc.deNghiCuaDon(c.so, d.ma).find(x => x.trangThai === 'cho');
      return h`<div class="row between"><strong class="h2">${d.ban.ten} · ${d.tenLo}</strong>${U.nut('Hồ sơ người bán', { den: AM.den('ho-so-ban', { id: d.ban.id }).replace(/^#/, 'nguon-hang.html#'), kieu: 'phu', nho: true })}</div>
        ${U.chang(d)}${U.nhom(n, NV.NHAN_TRANG_THAI[d.trangThai])}
        <div class="hai-cot"><div class="stack">
          ${U.the(h`<strong>Bước tiếp theo</strong><span>${NV.viecTiep(d, 'mua')}</span>${d.trangThai === 'cho_coc' && d.coc ? h`<span class="small muted">Còn ${Math.max(0, Math.round((d.coc.han - c.bg) / 3600e3))} giờ tới hạn cọc.</span>` : ''}${buocTiep(c, d)}`, { vien: n === 'lam' ? 'lam' : n === 'loi' ? 'loi' : '' })}
          ${dn ? (dn.tu === 'mua' ? U.bao(`Bạn đề nghị ${moTaDN(dn)}. Chờ người bán trả lời.`) : U.the(h`<strong>Người bán đề nghị ${moTaDN(dn)}</strong><span class="small muted">Lý do: ${dn.lyDo}</span><div class="row" style="gap:8px">${U.nut('Không đồng ý', { bam: 'traLoiDN', kieu: 'phu', nho: true, data: { id: dn.id, v: 0 } })}${U.nut('Đồng ý', { bam: 'traLoiDN', nho: true, data: { id: dn.id, v: 1 } })}</div>`, { vien: 'lam' })) : ''}
          ${U.the(h`<strong>Lịch sử đơn</strong><ol class="dong-thoi-gian">${[...d.lichSu].reverse().map((l, i) => h`<li class="${i === 0 ? 'dang' : 'qua'}"><div class="stack" style="gap:2px"><span class="small">${l.noiDung}</span><span class="xs muted">${U.gioNgay(l.luc)} · ${{ ban: 'Người bán', mua: 'Bạn', van_hanh: 'Vận hành', he_thong: 'Hệ thống' }[l.vai]}</span></div></li>`)}</ol>`)}
        </div><div class="stack">
          ${U.the(h`${U.dong2('Lượng', U.luong(d.kg))}${U.dong2('Giá', `${U.so(d.gia)} đ/kg`)}${U.dong2('Giá trị đơn', U.dong(NV.tien(d.kg, d.gia)))}${U.dong2('Ngày giao', U.nd(d.ngayGiao))}
            ${d.coc ? U.dong2('Cọc', `${U.dong(d.coc.so)} ${d.daCoc ? '(đã cọc)' : '(chưa cọc)'}`) : ''}${d.coc ? U.dong2(`Phí ${d.coc.loaiPhi === 'moi_quen' ? 'mối quen' : 'giới thiệu'}`, U.dong(d.coc.phi)) : ''}
            ${d.ketQuaCan ? U.dong2('Kết quả cân', `nhận ${U.luong(d.ketQuaCan.nhan)}, không nhận ${U.luong(d.ketQuaCan.tuChoi)}${d.ketQuaCan.phanDoi ? ' (người bán báo sai)' : ''}`) : ''}
            ${d.phaiTra !== undefined ? U.dong2('Tiền hàng', U.dong(d.phaiTra)) : ''}${d.daTra !== undefined ? U.dong2('Đã trả (gồm cọc)', U.dong(d.daTra)) : ''}${d.conPhaiTra !== undefined ? U.dong2('Còn phải trả', h`<strong>${U.dong(d.conPhaiTra)}</strong>`) : ''}
            ${d.huy ? U.dong2('Hủy', `${d.huy.ben === 'mua' ? 'Bạn' : 'Người bán'}: ${d.huy.lyDo}${d.huy.cocVe ? ` · cọc về ${d.huy.cocVe === 'mua' ? 'bạn' : 'người bán'}` : ''}`) : ''}`)}
          ${d.ketLuan ? U.bao(`Vận hành ghi nhận: ${d.ketLuan.noiDung}`) : ''}
          <div class="row" style="gap:8px;flex-wrap:wrap">${['cho_coc', 'cho_giao'].includes(d.trangThai) ? U.nut('Dời lịch giao', { den: AM.den('huy-don', { ma: d.ma, doi: 1 }), kieu: 'phu', nho: true }) : ''}${d.daCoc ? U.nut('Liên lạc', { den: denDon(d.ma, 'mo-lien-lac'), kieu: 'phu', nho: true }) : ''}${d.ketNoiId ? U.nut('Nhắn tin', { den: `tin-nhan.html#tin-nhan?kn=${d.ketNoiId}`, kieu: 'phu', nho: true }) : ''}</div>
        </div></div>`;
    },
    bam: {
      rut: c => buoc(c, c.ts('ma'), 'rutDon', [], { bao: 'Đã rút đơn.' }),
      tuChoiHuy: c => buoc(c, c.ts('ma'), 'tuChoiHuy', [], { bao: 'Đơn tiếp tục.' }),
      dongYHuy: c => buoc(c, c.ts('ma'), 'dongYHuy', [], { bao: 'Đã hủy đơn. Cọc hoàn về bạn.' }),
      traLoiDN: (c, el) => c.lam({ loai: 'tra_loi_de_nghi', deNghiId: el.dataset.id, dongY: el.dataset.v === '1' }, { bao: 'Đã trả lời đề nghị.' }),
      danhGia: c => c.lam({ loai: 'danh_gia', ma: c.ts('ma'), diem: Number(c.st.sao) || 5, ...(c.st.nhanXet ? { nhanXet: c.st.nhanXet } : {}) }, { bao: 'Cảm ơn bạn đã đánh giá.' }),
    },
  });

  AM.man('thoa-thuan', {
    st(c) { const lo = c.so.lo.find(l => l.id === c.ts('lo')), bg = c.so.baoGia.find(b => b.id === c.ts('bg')); return { kg: bg ? String(bg.kg) : lo ? String(Math.min(NV.conBan(lo), 1000)) : '', gia: bg ? String(bg.gia) : lo?.gia ? String(lo.gia) : '', ngay: bg?.ngayGiao ?? NV.ngayCua(c.bg + 3 * 864e5), dongY: false }; },
    ve(c) {
      const lo = c.so.lo.find(l => l.id === c.ts('lo'));
      if (!lo) return U.trong('Chọn lô để lập đơn', '', U.nut('Nguồn hàng', { den: 'nguon-hang.html#nguon-hang', nho: true }));
      const kn = c.so.ketNoi.find(k => k.loId === lo.id && k.mua.id === c.n.id && k.trangThai === 'dong_y');
      const bg = c.so.baoGia.find(b => b.id === c.ts('bg') && b.trangThai === 'dong_y');
      const kg = U.docSo(c.st.kg) || 0, gia = U.docSo(c.st.gia) || 0, gt = NV.tien(kg, gia), cs = c.so.chinhSach;
      const quen = c.so.don.some(d => d.mua.id === c.n.id && d.ban.id === lo.ban.id && d.daCoc);
      return {
        than: h`<span class="muted">${lo.ban.ten} · ${lo.ten} · còn ${U.luong(NV.conBan(lo))}</span>
          ${!kn ? U.bao('Người bán chưa đồng ý kết nối với bạn cho lô này: gửi lời mời trước.', 'vang') : ''}
          ${bg ? U.bao(`Lập theo báo giá đã chốt: ${U.so(bg.gia)} đ/kg × ${U.luong(bg.kg)}, giao ${U.nd(bg.ngayGiao)}.`, 'tot') : ''}
          <div class="hai-cot"><div class="stack">
            <div class="grid2">${U.o(c, { k: 'kg', nhan: 'Lượng', kieu: 'so', donVi: 'kg', veLai: true })}${U.o(c, { k: 'gia', nhan: 'Giá đã thỏa thuận', kieu: 'so', donVi: 'đ/kg', veLai: true })}</div>
            ${U.o(c, { k: 'ngay', nhan: 'Ngày giao', kieu: 'ngay' })}
            ${U.the(h`<strong>Điều khoản chính</strong><ul class="small" style="margin:0;padding-left:18px"><li>Người bán xác nhận và ký trên app; lượng được giữ cho bạn.</li><li>Bạn đặt cọc ${cs.tyLeCoc * 100}% vào tài khoản đảm bảo trong ${cs.hanCoc / 3600e3} giờ sau khi người bán ký; quá hạn đơn tự đóng.</li><li>Bạn cân tại nơi nhận và nhập kết quả; người bán xác nhận đúng hoặc không đúng.</li><li>Mất mùa, thiếu hàng: người bán đề nghị giảm lượng; bạn đồng ý thì phần thiếu không tính tiền. Hủy sau cọc: bên xin hủy mất cọc nếu bên kia đồng ý.</li><li>Đổi lượng, giá, ngày: lập đề nghị, bên kia đồng ý mới có hiệu lực.</li></ul>`)}
            ${U.congTac(c, { k: 'dongY', nhan: 'Tôi đồng ý các điều khoản trên' })}
          </div>${U.the(h`${U.dong2('Giá trị đơn', U.dong(gt))}${U.dong2(`Cọc (${cs.tyLeCoc * 100}%)`, U.dong(NV.tinhCoc(gt, cs)))}${U.dong2(`Phí ${quen ? 'mối quen' : 'giới thiệu'}`, U.dong(NV.tinhPhi(gt, quen, cs)))}${U.dong2(h`<strong>Chuyển khi đặt cọc</strong>`, h`<strong>${U.dong(NV.tinhCoc(gt, cs) + NV.tinhPhi(gt, quen, cs))}</strong>`)}<span class="xs muted">Phần còn lại trả sau khi chốt số cân. Phí tính khi người bán ký.</span>`, { lop: 'noi' })}</div>`,
        duoi: U.nut('Gửi đơn cho người bán ký', { bam: 'tao', tat: !kn || !c.st.dongY }),
      };
    },
    bam: { tao: c => c.lam({ loai: 'tao_don', loId: c.ts('lo'), kg: U.docSo(c.st.kg), gia: U.docSo(c.st.gia), ngayGiao: c.st.ngay, ...(c.ts('bg') ? { baoGiaId: c.ts('bg') } : {}) }, { bao: 'Đã gửi đơn. Người bán xác nhận và ký thì bạn đặt cọc.', den: ma => ['chi-tiet-don', { ma }] }) },
  });

  AM.man('dat-coc', {
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      if (d.trangThai !== 'cho_coc') return saiBuoc(d, d.daCoc ? `Đã cọc ${U.dong(d.daCoc.so)} lúc ${U.gioNgay(d.daCoc.luc)}.` : 'Đặt cọc được sau khi người bán ký.');
      const con = (d.coc.han - c.bg) / 3600e3, ma = `AGV ${d.ma.replace(/\W/g, '')}`;
      return {
        than: h`<div class="hai-cot">${U.the(h`${U.dong2('Cọc', U.dong(d.coc.so))}${U.dong2(`Phí ${d.coc.loaiPhi === 'moi_quen' ? 'mối quen (đơn thứ hai trở đi)' : 'giới thiệu (đơn đầu với người bán này)'}`, U.dong(d.coc.phi))}${U.dong2(h`<strong>Tổng chuyển</strong>`, h`<strong class="so-lon" style="font-size:22px">${U.dong(d.coc.so + d.coc.phi)}</strong>`)}
            ${U.dong2('Hạn', `${U.gioNgay(d.coc.han)} (${con > 0 ? `còn ${Math.floor(con)} giờ` : 'đã quá hạn'})`)}`, { lop: 'noi' })}
          ${U.the(h`<strong>Chuyển vào tài khoản đảm bảo</strong>${U.dong2('Ngân hàng', 'Agribank (mô phỏng)')}${U.dong2('Số tài khoản', '1500 2066 8888')}${U.dong2('Chủ tài khoản', 'AGIVIET - TK DAM BAO')}${U.dong2('Nội dung chuyển khoản', h`<strong>${ma}</strong>`)}
            <span class="xs muted">Cọc được giữ ở ngân hàng, trừ vào tiền hàng khi chốt cân. Ngân hàng xác nhận thì app mở số điện thoại hai bên.</span>`)}</div>`,
        duoi: U.nut('Tôi đã chuyển (mô phỏng ngân hàng xác nhận)', { bam: 'coc', icon: 'deposit' }),
      };
    },
    bam: { coc: c => buoc(c, c.ts('ma'), 'datCoc', [], { bao: 'Ngân hàng đã xác nhận cọc. Liên lạc người bán đã mở.', den: ['mo-lien-lac', { ma: c.ts('ma') }] }) },
  });

  AM.man('mo-lien-lac', {
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const ll = d.daCoc ? A.mc.lienLacCua(c.so, c.n, d.ban.id) : null;
      if (!ll) return h`${U.bao('Liên lạc mở sau khi bạn đặt cọc. Trước đó nhắn tin, gọi qua app (che số).')}${d.trangThai === 'cho_coc' ? U.nut('Đặt cọc', { den: denDon(d.ma, 'dat-coc') }) : ''}`;
      return h`${U.bao('Bạn đã cọc. Hai bên thấy số điện thoại và địa chỉ của nhau.', 'tot')}
        ${U.the(h`<strong class="h2">${d.ban.ten}</strong>${U.dong2('Người liên hệ', ll.ten)}${U.dong2('Số điện thoại', ll.sdt)}${U.dong2('Địa chỉ vườn, ao', ll.diaChi)}<div class="row" style="gap:8px"><a class="btn nho" href="tel:${ll.sdt}">${U.icon('call', 18)}Gọi</a>${U.nut('Nhắn qua app', { den: `tin-nhan.html#tin-nhan?kn=${d.ketNoiId}`, kieu: 'phu', nho: true })}</div>`)}
        ${U.the(h`<strong>Người bán thấy của bạn</strong>${U.dong2('Số điện thoại', c.hs.sdt)}${U.dong2('Địa chỉ nhận hàng', c.hs.diaChi || c.hs.vung)}`)}
        <span class="small muted">Kết quả cân, tiền, đổi lịch vẫn ghi trên app để được bảo vệ.</span>`;
    },
  });

  AM.man('nghiem-thu', {
    st(c) { const d = don(c), p = c.nhap(`phieu.${c.ts('ma')}`, {}).gt; return { nhan: p.nhan ?? (d ? String(d.kg) : ''), tuChoi: p.tuChoi ?? '0', lyDo: '', phieu: p.phieu ?? '' }; },
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      if (d.trangThai !== 'cho_giao') return saiBuoc(d, d.ketQuaCan ? 'Kết quả cân đã gửi.' : 'Nhập cân được sau khi đặt cọc.');
      const nhan = U.docSo(c.st.nhan) || 0, tc = U.docSo(c.st.tuChoi) || 0;
      return {
        than: h`${d.ketQuaCan?.phanDoi ? U.bao(`Người bán báo số lần trước (${U.luong(d.ketQuaCan.nhan)}) không đúng. Kiểm lại phiếu cân rồi nhập lại.`, 'vang') : ''}
          ${U.the(h`${U.dong2('Đơn', U.luong(d.kg))}<div class="grid2">${U.o(c, { k: 'nhan', nhan: 'Lượng nhận', kieu: 'so', donVi: 'kg', veLai: true })}${U.o(c, { k: 'tuChoi', nhan: 'Không nhận (sai loại, hư)', kieu: 'so', donVi: 'kg', veLai: true })}</div>
            ${tc > 0 ? U.o(c, { k: 'lyDo', nhan: 'Lý do không nhận', ph: 'Trái dập, sai cỡ' }) : ''}
            ${nhan + tc > d.kg ? U.bao(`Nhận + không nhận vượt ${U.luong(d.kg)} của đơn.`, 'loi') : ''}
            ${U.dong2('Tiền hàng tạm tính', U.dong(NV.tien(nhan, d.gia)))}${U.dong2('Trừ cọc', `− ${U.dong(Math.min(d.daCoc?.so ?? 0, NV.tien(nhan, d.gia)))}`)}
            ${c.st.phieu ? U.dong2('Phiếu cân', c.st.phieu) : U.nut('Đọc số từ ảnh phiếu cân', { den: denDon(d.ma, 'doc-phieu-can'), kieu: 'phu', nho: true, icon: 'camera' })}`)}`,
        duoi: U.nut('Gửi kết quả cân cho người bán', { bam: 'gui' }),
      };
    },
    bam: { gui(c) { const kq = buoc(c, c.ts('ma'), 'nhapKetQua', [U.docSo(c.st.nhan) || 0, U.docSo(c.st.tuChoi) || 0], { bao: 'Đã gửi. Người bán xác nhận đúng thì chốt số.', den: ['chi-tiet-don', { ma: c.ts('ma') }] }); if (kq.ok) c.nhap(`phieu.${c.ts('ma')}`, {}).xoa(); } },
  });

  AM.man('doc-phieu-can', {
    st: () => ({ anh: '', nhan: '', tuChoi: '', da: false }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const nhan = U.docSo(c.st.nhan) || 0, lech = d.kg - nhan - (U.docSo(c.st.tuChoi) || 0);
      return {
        than: h`<p class="muted">Chụp phiếu cân; app đọc số (mô phỏng: lấy số trong tên ảnh, không có thì gợi ý theo lượng đơn). Bạn luôn kiểm và sửa trước khi dùng.</p>
          <label class="card stack" style="align-items:center;text-align:center;border-style:dashed;cursor:pointer">${U.icon('camera', 40)}<strong>${c.st.anh ? `Đã chụp: ${String(c.st.anh).split(/[\\/]/).pop()}` : 'Chụp phiếu cân'}</strong><input type="file" accept="image/*" capture="environment" class="sr-only" data-st="anh" data-ve-lai></label>
          ${c.st.anh && !c.st.da ? U.nut('Đọc số', { bam: 'doc', kieu: 'phu' }) : ''}
          ${c.st.da ? U.the(h`<strong>App đọc được</strong><div class="grid2">${U.o(c, { k: 'nhan', nhan: 'Lượng nhận', kieu: 'so', donVi: 'kg', veLai: true })}${U.o(c, { k: 'tuChoi', nhan: 'Không nhận', kieu: 'so', donVi: 'kg', veLai: true })}</div>
            ${lech ? U.bao(`Lệch ${U.luong(Math.abs(lech))} so với đơn ${U.luong(d.kg)}${lech > 0 ? ' (giao thiếu)' : ''}.`, 'vang') : U.bao('Khớp lượng đơn.', 'tot')}`) : ''}`,
        duoi: c.st.da ? U.nut('Dùng số này để nhập kết quả cân', { bam: 'dung' }) : '',
      };
    },
    bam: {
      doc(c) {
        const d = don(c), so = Number(String(c.st.anh).split(/[\\/]/).pop().match(/(\d{3,6})/)?.[1]);
        const nhan = so && so <= d.kg * 1.2 ? so : Math.round(d.kg * 0.98);
        c.dat({ da: true, nhan: String(Math.min(nhan, d.kg)), tuChoi: String(Math.max(0, Math.min(d.kg - nhan, Math.round(d.kg * 0.01)))) });
      },
      dung(c) { c.nhap(`phieu.${c.ts('ma')}`, {}).dat({ nhan: c.st.nhan, tuChoi: c.st.tuChoi, phieu: String(c.st.anh).split(/[\\/]/).pop() }, false); AM.xoaSt('nghiem-thu', new URLSearchParams({ ma: c.ts('ma') }).toString()); c.di('nghiem-thu', { ma: c.ts('ma') }); },
    },
  });

  AM.man('doi-soat', {
    st: () => ({ chungTu: '', ghi: '' }),
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const tienLech = d.trangThai === 'chua_thay_tien', canLech = d.trangThai === 'cho_giao' && d.ketQuaCan?.phanDoi;
      if (!tienLech && !canLech && !d.doiSoat?.length) return saiBuoc(d, 'Đơn không có đối soát đang mở.');
      return h`${tienLech ? U.the(h`<strong>Phần đang lệch</strong>${U.dong2('Bạn báo đã trả', U.dong(d.tra?.so))}${U.dong2('Còn phải trả', U.dong(d.conPhaiTra))}<span class="small">Người bán chưa thấy tiền. Gửi ủy nhiệm chi, ảnh chuyển khoản; app không kết luận bên nào sai.</span>`, { vien: 'loi' }) : ''}
        ${canLech ? U.the(h`<strong>Số cân đang lệch</strong><span class="small">Người bán báo số ${U.luong(d.ketQuaCan.nhan)} không đúng. Kiểm lại phiếu cân rồi nhập lại.</span>${U.nut('Nhập lại kết quả cân', { den: denDon(d.ma, 'nghiem-thu'), nho: true })}`, { vien: 'loi' }) : ''}
        <div class="hai-cot">${U.the(h`<strong>Chứng từ</strong>${(d.chungTu || []).map(x => U.dong2(U.gioNgay(x.luc), x.ten))}${d.chungTu?.length ? '' : h`<span class="muted small">Chưa gửi chứng từ.</span>`}
            ${tienLech ? h`${U.o(c, { k: 'chungTu', nhan: 'Tên chứng từ', ph: `Ủy nhiệm chi ${U.so(d.tra?.so)} đ` })}${U.nut('Gửi chứng từ', { bam: 'gui', kieu: 'phu', nho: true, icon: 'upload' })}` : ''}`)}
          ${U.the(h`<strong>Ghi chép đối soát</strong><div class="khung-chat">${(d.doiSoat || []).map(g => h`<div class="bong-tin ${g.vai === 'mua' ? 'minh' : ''}"><span>${g.noiDung}</span><span class="xs muted">${g.vai === 'mua' ? 'Bạn' : g.vai === 'ban' ? 'Người bán' : 'Vận hành'} · ${U.gioNgay(g.luc)}</span></div>`)}</div>
            ${tienLech ? h`${U.o(c, { k: 'ghi', nhan: 'Ghi thêm', ph: 'Bên em chuyển lúc 9 giờ từ Vietcombank' })}${U.nut('Ghi vào đối soát', { bam: 'ghi', kieu: 'phu', nho: true })}` : ''}`)}</div>
        ${d.ketLuan ? U.bao(`Vận hành ghi nhận: ${d.ketLuan.noiDung}`) : U.bao('Đội vận hành AgiViet xem chứng từ hai bên và ghi kết luận; quyết định cuối vẫn do hai bên.')}`;
    },
    bam: {
      gui(c) { const kq = buoc(c, c.ts('ma'), 'guiChungTu', [c.st.chungTu || ''], { bao: 'Đã gửi chứng từ cho người bán.' }); if (kq.ok) c.dat({ chungTu: '' }); },
      ghi(c) { const kq = buoc(c, c.ts('ma'), 'ghiDoiSoat', [c.st.ghi], { bao: 'Đã ghi.' }); if (kq.ok) c.dat({ ghi: '' }); },
    },
  });

  AM.man('lich-nhan', {
    st: c => ({ thang: NV.ngayCua(c.bg).slice(0, 7) }),
    ve(c) {
      const [y, m] = c.st.thang.split('-').map(Number), soNgay = new Date(Date.UTC(y, m, 0)).getUTCDate(), dau = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
      const don = c.so.don.filter(d => d.mua.id === c.n.id && !['da_huy', 'qua_han', 'ban_tu_choi'].includes(d.trangThai));
      const nhan = don.filter(d => d.ngayGiao.startsWith(c.st.thang) && ['cho_coc', 'cho_giao', 'cho_dong_y_huy', 'cho_ban_xac_nhan'].includes(d.trangThai));
      const tra = don.filter(d => ['da_chot', 'bao_da_tra', 'chua_thay_tien'].includes(d.trangThai));
      const homNay = NV.ngayCua(c.bg);
      const o = i => { const ngay = `${c.st.thang}-${String(i).padStart(2, '0')}`, ds = nhan.filter(d => d.ngayGiao === ngay);
        return h`<div class="card" style="min-height:84px;padding:8px;${ngay === homNay ? 'border-color:var(--song);border-width:2px' : ''}"><span class="xs b">${i}</span>${ds.map(d => h`<a class="xs" style="display:block" href="${denDon(d.ma)}">${d.ma} · ${U.luong(d.kg)}</a>`)}</div>`; };
      const thang = d => { const t = new Date(Date.UTC(y, m - 1 + d, 1)); return t.toISOString().slice(0, 7); };
      return h`<div class="row between">${U.nut('‹ Tháng trước', { bam: '_dat', kieu: 'phu', nho: true, data: { k: 'thang', v: thang(-1) } })}<strong class="h2">Tháng ${m}/${y}</strong>${U.nut('Tháng sau ›', { bam: '_dat', kieu: 'phu', nho: true, data: { k: 'thang', v: thang(1) } })}</div>
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(t => h`<span class="xs muted b" style="text-align:center">${t}</span>`)}${Array.from({ length: dau }, () => h`<span></span>`)}${Array.from({ length: soNgay }, (_, i) => o(i + 1))}</div>
        <section class="stack s8"><h2 class="h2">Tiền phải trả</h2>${tra.length ? U.bang([['Đơn'], ['Người bán'], ['Còn phải trả', 'so'], ['Trạng thái']], tra.map(d => [h`<a href="${denDon(d.ma)}">${d.ma}</a>`, d.ban.ten, U.dong(d.conPhaiTra), NV.NHAN_TRANG_THAI[d.trangThai]])) : h`<span class="muted">Không có khoản phải trả.</span>`}</section>
        ${U.nut('Xuất Excel lịch tháng', { bam: 'xuat', kieu: 'phu', nho: true, icon: 'export' })}`;
    },
    bam: { xuat(c) { const ds = c.so.don.filter(d => d.mua.id === c.n.id && d.ngayGiao.startsWith(c.st.thang)); U.taiCsv(`lich-nhan-${c.st.thang}.csv`, [['Ngày giao', 'Đơn', 'Người bán', 'Hàng', 'Lượng (kg)', 'Giá (đ/kg)', 'Trạng thái', 'Còn phải trả (đ)'], ...ds.map(d => [d.ngayGiao, d.ma, d.ban.ten, d.tenLo, d.kg, d.gia, NV.NHAN_TRANG_THAI[d.trangThai], d.conPhaiTra ?? ''])]); c.bao('Đã tải tệp Excel (CSV).'); } },
  });

  AM.man('huy-don', {
    ten: c => (c.ts('doi') ? 'Đổi điều kiện, hủy đơn' : 'Hủy đơn'),
    st: c => { const d = don(c); return { loai: d?.trangThai === 'cho_ban_xac_nhan' ? 'doi_gia' : 'doi_lich', gt: d ? NV.ngayCua(Date.parse(d.ngayGiao) + 2 * 864e5) : '', lyDo: '' }; },
    ve(c) {
      const d = don(c);
      if (!d) return khongCo();
      const mo = { cho_ban_xac_nhan: 'Người bán chưa xác nhận: rút đơn là xong, không mất gì.', cho_coc: 'Chưa cọc: hủy ngay, không mất gì.', cho_giao: `Đã cọc ${U.dong(d.daCoc?.so)}: hủy cần người bán đồng ý; nếu đồng ý, cọc thuộc về người bán.` }[d.trangThai];
      const doiDuoc = [...(['cho_coc', 'cho_giao'].includes(d.trangThai) ? [['doi_lich', 'Ngày giao']] : []), ...(['cho_ban_xac_nhan', 'cho_coc'].includes(d.trangThai) ? [['doi_gia', 'Giá']] : [])];
      const loai = doiDuoc.some(x => x[0] === c.st.loai) ? c.st.loai : doiDuoc[0]?.[0];
      const dangCho = A.mc.deNghiCuaDon(c.so, d.ma).find(x => x.trangThai === 'cho');
      return h`${doiDuoc.length ? U.the(h`<strong>Đề nghị đổi điều kiện</strong>${dangCho ? U.bao(`Đang chờ trả lời: ${moTaDN(dangCho)}.`) : h`
          <div class="phan-doan">${doiDuoc.map(([v, t]) => h`<button type="button" aria-pressed="${String(v === loai)}" data-bam="doiLoai" data-v="${v}">${t}</button>`)}</div>
          ${U.o(c, { k: 'gt', nhan: loai === 'doi_lich' ? 'Ngày giao mới' : 'Giá mới', kieu: loai === 'doi_lich' ? 'ngay' : 'so', ...(loai === 'doi_gia' ? { donVi: 'đ/kg' } : {}) })}${U.o(c, { k: 'lyDo', nhan: 'Lý do', ph: 'Xe lạnh kẹt lịch' })}
          ${U.nut('Gửi đề nghị', { bam: 'deNghi', kieu: 'phu', nho: true, data: { loai } })}`}`) : ''}
        ${mo ? U.the(h`<strong>Hủy đơn</strong>${U.bao(mo, 'vang')}${U.o(c, { k: 'lyDo', nhan: 'Lý do', ph: 'Đổi kế hoạch sản xuất' })}${U.nut(d.trangThai === 'cho_giao' ? 'Xin hủy đơn' : d.trangThai === 'cho_ban_xac_nhan' ? 'Rút đơn' : 'Hủy đơn', { bam: 'huy', kieu: 'canh', hoi: `Hủy đơn ${d.ma}?|${mo}|Hủy đơn|canh` })}`) : U.bao(`Đơn đang ở bước "${NV.NHAN_TRANG_THAI[d.trangThai]}": không hủy được. Có vấn đề thì mở đối soát.`)}`;
    },
    bam: {
      doiLoai: (c, el) => { const d = don(c); c.dat({ loai: el.dataset.v, gt: el.dataset.v === 'doi_lich' ? NV.ngayCua(Date.parse(d.ngayGiao) + 2 * 864e5) : String(d.gia) }); },
      deNghi: (c, el) => c.lam({ loai: 'de_nghi_don', ma: c.ts('ma'), deNghi: el.dataset.loai, giaTri: el.dataset.loai === 'doi_gia' ? String(U.docSo(c.st.gt)) : c.st.gt, lyDo: c.st.lyDo }, { bao: 'Đã gửi đề nghị. Người bán đồng ý thì đơn đổi theo.', den: ['chi-tiet-don', { ma: c.ts('ma') }] }),
      huy(c) {
        const d = don(c), b = { cho_ban_xac_nhan: 'rutDon', cho_coc: 'huyTruocCoc', cho_giao: 'yeuCauHuy' }[d.trangThai];
        buoc(c, d.ma, b, b === 'rutDon' ? [] : [c.st.lyDo || 'không nêu lý do'], { bao: d.trangThai === 'cho_giao' ? 'Đã gửi xin hủy. Chờ người bán trả lời.' : 'Đã hủy đơn.', den: ['chi-tiet-don', { ma: d.ma }] });
      },
    },
  });
})();
