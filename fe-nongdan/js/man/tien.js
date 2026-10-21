// Tiền: tiền đang giữ / đã về / còn chờ, tiền đã về của một đơn, bảng quyết toán, lịch sử theo tháng, ứng tiền trước.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const TT = {
    cho_giao: ['Cọc đang giữ', 'cho'], cho_dong_y_huy: ['Cọc đang giữ', 'cho'], cho_ban_xn_kq: ['Chờ bạn xác nhận cân', 'lam'],
    da_chot: ['Chờ bên mua trả', 'cho'], tien_dang_giu: ['Ngân hàng đang chuyển', 'cho'], bao_da_tra: ['Bên mua báo đã trả', 'lam'],
    chua_thay_tien: ['Đang đối soát', 'loi'], da_nhan_tien: ['Đã về', 'xong'],
  };
  const UNG = { cho_duyet: ['Chờ ngân hàng duyệt', 'cho'], da_giai_ngan: ['Đã nhận', 'xong'], da_thu_hoi: ['Đã trừ vào tiền hàng', 'xong'], tu_choi: ['Không duyệt', 'loi'] };

  /** Các khoản tiền của người bán (để xem lịch sử, lọc theo đơn). */
  function khoan(so, banId) {
    const ds = [];
    for (const d of so.don.filter(x => x.ban.id === banId)) {
      if (d.daCoc) ds.push({ luc: d.daCoc.luc, ma: d.ma, nd: 'Cọc vào tài khoản đảm bảo (giữ tới khi chốt)', so: 0 });
      const gn = d.lichSu.find(l => l.noiDung.startsWith('Ngân hàng chuyển') && !l.noiDung.includes('ứng trước'));
      if (gn) ds.push({ luc: gn.luc, ma: d.ma, nd: 'Ngân hàng chuyển tiền hàng (gồm cọc)', so: d.phaiTra ?? 0 });
      for (const l of d.lichSu.filter(x => x.noiDung.startsWith('Người bán nhận '))) ds.push({ luc: l.luc, ma: d.ma, nd: 'Nhận một phần (trả trực tiếp)', so: Number(l.noiDung.match(/nhận ([\d.]+) đ/)?.[1]?.replace(/\./g, '') ?? 0) });
      const du = d.lichSu.find(l => l.noiDung.startsWith('Người bán xác nhận đã nhận đủ') || l.noiDung.startsWith('Người bán thấy tiền'));
      if (du) ds.push({ luc: du.luc, ma: d.ma, nd: 'Nhận đủ (trả trực tiếp)', so: d.tra?.so ?? 0 });
      if (d.trangThai === 'da_nhan_tien' && d.hoanCoc !== undefined) ds.push({ luc: d.lichSu.at(-1).luc, ma: d.ma, nd: 'Tiền hàng trừ vào cọc', so: d.phaiTra ?? 0 });
      if (d.trangThai === 'da_huy' && d.huy?.cocVe === 'ban') ds.push({ luc: d.lichSu.at(-1).luc, ma: d.ma, nd: 'Cọc thuộc về bạn (bên mua hủy)', so: d.daCoc?.so ?? 0 });
    }
    for (const u of so.ungTien.filter(x => x.ban.id === banId && ['da_giai_ngan', 'da_thu_hoi'].includes(x.trangThai))) {
      ds.push({ luc: u.luc, ma: u.donMa, nd: `Ứng trước (phí ${U.so(u.phi)} đ)`, so: u.so - u.phi });
      if (u.trangThai === 'da_thu_hoi') ds.push({ luc: so.don.find(d => d.ma === u.donMa)?.lichSu.at(-1)?.luc ?? u.luc, ma: u.donMa, nd: 'Thu hồi khoản ứng từ tiền hàng', so: -u.so });
    }
    return ds.sort((a, b) => b.luc - a.luc);
  }

  AM.man('tien', {
    ve(c) {
      const t = NV.tienNguoiBan(c.so, c.n.id), ds = c.so.don.filter(d => d.ban.id === c.n.id && TT[d.trangThai]);
      return h`<div class="grid2">
          ${U.the(h`<span class="xs muted">Đang giữ ở tài khoản đảm bảo</span><strong class="num" style="font-size:20px">${U.tienGon(t.dangGiu)}</strong>`, { lop: 'noi' })}
          ${U.the(h`<span class="xs muted">Đã về</span><strong class="num" style="font-size:20px">${U.tienGon(t.daVe)}</strong>`, { lop: 'noi' })}
          ${U.the(h`<span class="xs muted">Bên mua còn phải trả</span><strong class="num" style="font-size:20px">${U.tienGon(t.conCho)}</strong>`)}
          ${U.the(h`<span class="xs muted">Đã ứng trước</span><strong class="num" style="font-size:20px">${U.tienGon(t.daUng)}</strong>`)}
        </div>
        ${c.hs.taiKhoanNhan ? '' : U.the(h`<strong>Chưa có tài khoản nhận tiền</strong><span class="small">Thêm để ngân hàng chuyển tiền hàng cho bạn.</span>`, { den: 'toi.html#tai-khoan-nhan', vien: 'lam' })}
        <div class="grid2">${U.nut('Nhận tiền trước', { den: '#ung-tien', kieu: 'phu', nho: true, icon: 'wallet' })}${U.nut('Lịch sử tiền', { den: '#lich-su-tien', kieu: 'phu', nho: true, icon: 'receipt' })}</div>
        <section class="stack s8"><h2 class="h2">Từng khoản theo đơn</h2>
          ${ds.length ? '' : U.trong('Chưa có khoản tiền nào', 'Bên mua đặt cọc thì khoản đầu tiên hiện ở đây.')}
          ${ds.map(d => U.the(h`<div class="row between"><strong>${d.ma} · ${d.mua.ten}</strong>${U.chip(TT[d.trangThai][0], TT[d.trangThai][1])}</div>
            <span class="small num">${d.phaiTra !== undefined ? `Tiền hàng ${U.dong(d.phaiTra)} · đã nhận ${U.dong(d.daTra)}` : `Cọc ${U.dong(d.daCoc?.so)} · giá trị đơn ${U.dong(NV.tien(d.kg, d.gia))}`}</span>`,
            { den: d.trangThai === 'da_nhan_tien' ? AM.den('tien-ve', { ma: d.ma }) : d.phaiTra !== undefined ? AM.den('quyet-toan', { ma: d.ma }) : AM.den('chi-tiet-don', { ma: d.ma }), vien: TT[d.trangThai][1] === 'lam' ? 'lam' : TT[d.trangThai][1] === 'loi' ? 'loi' : '' }))}
        </section>`;
    },
  });

  AM.man('tien-ve', {
    ve(c) {
      const d = c.so.don.find(x => x.ma === c.ts('ma') && x.ban.id === c.n.id) ?? c.so.don.find(x => x.ban.id === c.n.id && x.trangThai === 'da_nhan_tien');
      if (!d) return U.trong('Chưa có đơn nào tiền về');
      if (d.trangThai !== 'da_nhan_tien') return h`${U.bao(`Tiền đơn ${d.ma} chưa về đủ.`)}${U.nut('Xem đơn', { den: AM.den('chi-tiet-don', { ma: d.ma }) })}`;
      const chia = NV.chiaTienLoGop(c.so, d.ma), ung = c.so.ungTien.find(u => u.donMa === d.ma && u.trangThai === 'da_thu_hoi'), tk = c.hs.taiKhoanNhan;
      return {
        than: h`<div class="an-mung-moi">${U.icon('payment', 48)}<span>Tiền đã về</span><strong class="so-lon">${U.dong(d.daTra)}</strong><span>${d.ma} · ${d.mua.ten}</span></div>
          ${U.the(h`${U.dong2('Đơn', `${d.tenLo} · ${U.luong(d.ketQuaCan?.nhan ?? d.kg)}`)}${U.dong2('Tài khoản nhận', tk ? `${tk.nganHang} · ${tk.so.replace(/\d(?=\d{4})/g, '•')}` : 'chưa có')}
            ${U.dong2('Cách trả', d.thanhToan === 'dam_bao' ? 'Tài khoản đảm bảo' : d.thanhToan === 'truc_tiep' ? 'Trực tiếp' : 'Trừ vào cọc')}${U.dong2('Thời gian', U.gioNgay(d.lichSu.at(-1).luc))}
            ${ung ? U.dong2('Đã trừ khoản ứng', U.dong(ung.so)) : ''}${d.hoanCoc ? U.dong2('Cọc dư hoàn bên mua', U.dong(d.hoanCoc)) : ''}`)}
          ${chia ? U.the(h`<strong>Chia cho các hộ trong lô gộp</strong>${chia.map(x => U.dong2(`${x.ho} · ${U.luong(x.kgTrongDon)}`, U.dong(x.tien)))}`) : ''}`,
        duoi: U.nut('Xem bảng quyết toán', { den: AM.den('quyet-toan', { ma: d.ma }), kieu: 'phu' }),
      };
    },
  });

  AM.man('quyet-toan', {
    ve(c) {
      const d = c.so.don.find(x => x.ma === c.ts('ma') && x.ban.id === c.n.id);
      if (!d) return U.trong('Không tìm thấy đơn');
      if (!d.ketQuaCan || d.phaiTra === undefined) return h`${U.bao('Bảng quyết toán có sau khi bạn xác nhận số cân.')}${U.nut('Xem đơn', { den: AM.den('chi-tiet-don', { ma: d.ma }) })}`;
      const kq = d.ketQuaCan, coc = d.daCoc?.so ?? 0, ung = c.so.ungTien.find(u => u.donMa === d.ma && ['da_giai_ngan', 'da_thu_hoi'].includes(u.trangThai));
      const doc = `Quyết toán đơn ${d.ma}. ${U.so(kq.nhan)} ký nhân ${U.so(d.gia)} đồng là ${U.so(d.phaiTra)} đồng. Trong đó cọc ${U.so(Math.min(coc, d.phaiTra))} đồng. Bên mua đã trả ${U.so(d.daTra)} đồng, còn ${U.so(d.conPhaiTra)} đồng.${ung ? ` Trừ khoản ứng trước ${U.so(ung.so)} đồng.` : ''} Bạn không trả phí giới thiệu.`;
      return h`<strong class="h2">Quyết toán ${d.ma}</strong>
        ${U.the(h`${U.dong2(`${U.luong(kq.nhan)} × ${U.so(d.gia)} đ`, U.dong(d.phaiTra))}${U.dong2('Trong đó cọc đã giữ', U.dong(Math.min(coc, d.phaiTra)))}${U.dong2('Bên mua đã trả (gồm cọc)', U.dong(d.daTra))}${U.dong2(h`<strong>Bên mua còn phải trả</strong>`, h`<strong>${U.dong(d.conPhaiTra)}</strong>`)}`)}
        ${U.the(h`${U.dong2('Phí giới thiệu', '0 đ (bên mua trả)')}${ung ? U.dong2('Trừ khoản ứng trước', `− ${U.dong(ung.so)}`) : ''}${U.dong2(h`<strong>Bạn nhận về tài khoản</strong>`, h`<strong>${U.dong(d.phaiTra - (ung?.so ?? 0))}</strong>`)}${ung ? h`<span class="small muted">Phí ứng ${U.dong(ung.phi)} đã trừ lúc nhận tiền ứng.</span>` : ''}`, { lop: 'noi' })}
        ${kq.tuChoi > 0 ? h`<span class="small muted">${U.luong(kq.tuChoi)} bên mua không nhận: không tính tiền.</span>` : ''}
        ${U.nghe(doc, 'Nghe bảng tính')}${U.nut('Xem đơn', { den: AM.den('chi-tiet-don', { ma: d.ma }), kieu: 'phu' })}`;
    },
  });

  AM.man('lich-su-tien', {
    st: () => ({ loc: '' }),
    ve(c) {
      const tat = khoan(c.so, c.n.id), ds = tat.filter(k => !c.st.loc || k.ma === c.st.loc);
      const theoThang = ds.reduce((m, k) => { const t = NV.thangCua(k.luc); (m[t] ??= []).push(k); return m; }, {});
      return h`${U.chonO(c, { k: 'loc', nhan: 'Lọc theo đơn', lua: [['', 'Tất cả đơn'], ...[...new Set(tat.map(k => k.ma))].map(m => [m, m])] })}
        ${ds.length ? '' : U.trong('Chưa có khoản nào')}
        ${Object.entries(theoThang).map(([thang, ks]) => h`<section class="stack s8"><h2 class="h2">Tháng ${thang.split('-').reverse().join('/')} <span class="muted num">· ${U.dong(ks.reduce((s, k) => s + k.so, 0))}</span></h2>
          ${ks.map(k => U.the(h`<div class="row between"><span>${k.nd}</span><strong class="num">${k.so ? `${k.so > 0 ? '+' : '−'}${U.dong(Math.abs(k.so))}` : ''}</strong></div><span class="xs muted">${k.ma} · ${U.gioNgay(k.luc)}</span>`, { den: AM.den('chi-tiet-don', { ma: k.ma }) }))}</section>`)}`;
    },
  });

  AM.man('ung-tien', {
    st: c => ({ chon: c.ts('ma'), so: '' }),
    ve(c) {
      const du = c.so.don.filter(d => d.ban.id === c.n.id && ['cho_giao', 'cho_ban_xn_kq', 'da_chot'].includes(d.trangThai) && !c.so.ungTien.some(u => u.donMa === d.ma && ['cho_duyet', 'da_giai_ngan'].includes(u.trangThai)));
      const ma = du.some(d => d.ma === c.st.chon) ? c.st.chon : du[0]?.ma ?? '', d = du.find(x => x.ma === ma);
      const cs = c.so.chinhSach, toiDa = d ? Math.floor(NV.tien(d.kg, d.gia) * cs.ungToiDa / 1000) * 1000 : 0;
      const ung = c.st.so ? U.docSo(c.st.so) || 0 : toiDa, phi = Math.round(ung * cs.phiUng), cua = c.so.ungTien.filter(u => u.ban.id === c.n.id);
      return h`${U.bao(`Ngân hàng đối tác ứng trước tối đa ${Math.round(cs.ungToiDa * 100)}% giá trị đơn đã có cọc, phí ${(cs.phiUng * 100).toLocaleString('vi-VN')}% số ứng. Khi đơn xong, khoản ứng tự trừ vào tiền hàng.`)}
        ${!du.length ? U.trong('Chưa có đơn đủ điều kiện', 'Đơn phải đã đặt cọc và chưa nhận tiền, chưa có khoản ứng.') : U.the(h`
          <label class="truong"><span class="label">Đơn</span><span class="o-nhap"><select data-st="chon" data-ve-lai>${du.map(x => h`<option value="${x.ma}"${x.ma === ma ? A.tho(' selected') : ''}>${x.ma} · ${x.mua.ten} · ${U.tienGon(NV.tien(x.kg, x.gia))}</option>`)}</select></span></label>
          ${U.dong2('Ứng được tối đa', U.dong(toiDa))}
          ${U.o(c, { k: 'so', nhan: 'Số muốn ứng', kieu: 'so', donVi: 'đ', ph: U.so(toiDa), veLai: true })}
          ${U.dong2('Phí', U.dong(phi))}${U.dong2(h`<strong>Bạn nhận</strong>`, h`<strong>${U.dong(ung - phi)}</strong>`)}${U.dong2('Ngân hàng đối tác', 'Agribank (mô phỏng), duyệt trong vài phút')}
          ${U.nut('Đồng ý, nhận tiền trước', { bam: 'xin', nho: true, data: { ma, so: ung } })}`, { lop: 'noi' })}
        ${cua.length ? h`<section class="stack s8"><h2 class="h2">Các khoản ứng</h2>${cua.map(u => U.the(h`<div class="row between"><strong>${u.donMa} · ${U.dong(u.so)}</strong>${U.chip(UNG[u.trangThai][0], UNG[u.trangThai][1])}</div><span class="xs muted">Phí ${U.dong(u.phi)} · ${U.gioNgay(u.luc)}</span>`, { den: AM.den('chi-tiet-don', { ma: u.donMa }) }))}</section>` : ''}`;
    },
    bam: { xin: (c, el) => { const kq = c.lam({ loai: 'xin_ung_tien', donMa: el.dataset.ma, so: Number(el.dataset.so) }, { bao: 'Đã gửi. Ngân hàng duyệt xong sẽ chuyển vào tài khoản của bạn.' }); if (kq.ok) c.dat({ so: '' }); } },
  });
})();
