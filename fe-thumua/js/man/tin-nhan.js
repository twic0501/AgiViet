// Tin nhắn: hai khung (danh sách hội thoại, hội thoại đang mở), gọi qua app che số, liên lạc bị che kèm lời nhắc; hẹn xem vườn.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;

  AM.man('tin-nhan', {
    st: () => ({ chu: '' }),
    ve(c) {
      const ds = A.mc.ketNoiCuaToi(c.so, c.n).filter(k => ['dong_y', 'cho'].includes(k.trangThai)).map(k => ({ k, cuoi: c.so.tinNhan.filter(t => t.ketNoiId === k.id).at(-1) })).sort((a, b) => (b.cuoi?.luc ?? b.k.guiLuc) - (a.cuoi?.luc ?? a.k.guiLuc));
      const id = c.ts('kn') || ds[0]?.k.id, k = ds.find(x => x.k.id === id)?.k;
      const danhSach = h`<div class="menu">${ds.map(({ k: x, cuoi }) => h`<a href="${AM.den('tin-nhan', { kn: x.id })}" ${x.id === id ? A.tho('aria-current="true" style="background:var(--song-nhat)"') : ''}><span class="grow"><strong>${x.ban.ten}</strong><br><span class="xs muted">${c.so.lo.find(l => l.id === x.loId)?.ten ?? ''}${cuoi ? ` · ${cuoi.noiDung.slice(0, 40)}` : x.trangThai === 'cho' ? ' · chờ người bán đồng ý' : ''}</span></span>${cuoi ? h`<span class="xs muted">${U.tuongDoi(cuoi.luc, c.bg)}</span>` : ''}</a>`)}</div>`;
      if (!k) return U.trong('Chưa có hội thoại', 'Gửi lời mời kết nối ở Nguồn hàng; người bán đồng ý thì nhắn tin được.', U.nut('Tìm nguồn hàng', { den: 'nguon-hang.html#nguon-hang', nho: true }));
      const tin = A.mc.tinNhanCua(c.so, k.id), ll = A.mc.lienLacCua(c.so, c.n, k.ban.id), lo = c.so.lo.find(l => l.id === k.loId);
      return h`<div class="hai-cot hep-trai">${danhSach}
        <div class="card stack">
          <div class="row between"><div><strong>${k.ban.ten}</strong><br><span class="xs muted">${lo?.ten ?? ''}</span></div>
            <div class="row" style="gap:6px">${U.nut('Gọi', { bam: 'goi', kieu: 'phu', nho: true, icon: 'call' })}${U.nut('Báo giá', { den: AM.den('gui-bao-gia', { kn: k.id }), kieu: 'phu', nho: true })}${U.nut('Hẹn xem', { den: AM.den('hen-xem-vuon', { kn: k.id }), kieu: 'phu', nho: true })}${U.nut('Lập đơn', { den: AM.den('thoa-thuan', { lo: k.loId }), nho: true })}</div></div>
          ${ll ? U.bao(`Đã mở liên lạc: ${ll.ten} · ${ll.sdt} · ${ll.diaChi}`, 'tot') : U.bao('Số điện thoại, Zalo, đường dẫn trong tin nhắn được che tới khi bạn đặt cọc. Gọi qua app thì hai bên không thấy số của nhau.')}
          ${k.trangThai !== 'dong_y' ? U.bao('Người bán chưa đồng ý kết nối: chưa nhắn được.', 'vang') : ''}
          <div class="khung-chat">${tin.length ? '' : h`<span class="muted" style="text-align:center">Chưa có tin nhắn.</span>`}${tin.map(t => h`<div class="bong-tin ${t.vai === 'mua' ? 'minh' : ''}"><span>${t.noiDung}</span>${t.biChe.length ? h`<span class="xs muted">App đã che liên lạc trong tin này. Giao dịch ngoài app không được bảo vệ.</span>` : ''}<span class="xs muted">${U.tuongDoi(t.luc, c.bg)}</span></div>`)}</div>
          ${k.trangThai === 'dong_y' ? h`<div class="row" style="align-items:flex-end"><div class="grow">${U.o(c, { k: 'chu', nhan: 'Tin nhắn', ph: 'Nhắn cho người bán' })}</div>${U.nut('Gửi', { bam: 'gui', nho: true, data: { kn: k.id } })}</div>` : ''}
        </div></div>`;
    },
    sau: (c, el) => el.querySelector('.khung-chat')?.lastElementChild?.scrollIntoView({ block: 'nearest' }),
    bam: {
      goi: c => c.bao('Cuộc gọi qua app (mô phỏng): số của hai bên được che.'),
      gui(c, el) { if (!String(c.st.chu).trim()) return; const kq = c.lam({ loai: 'gui_tin', ketNoiId: el.dataset.kn, noiDung: c.st.chu }); if (kq.ok) c.dat({ chu: '' }); },
    },
  });

  AM.man('hen-xem-vuon', {
    st: c => ({ luc: `${NV.ngayCua(c.bg + 2 * 864e5)}T08:00`, ghiChu: '' }),
    ve(c) {
      const k = c.so.ketNoi.find(x => x.id === c.ts('kn') && x.mua.id === c.n.id);
      if (!k) return U.trong('Chọn một hội thoại để hẹn xem vườn', '', U.nut('Tin nhắn', { den: '#tin-nhan', nho: true }));
      const ds = A.mc.henCua(c.so, k.id).slice().reverse(), hs = A.mc.hoSoCongKhai(c.so, k.ban.id);
      const nhan = x => (x.trangThai === 'cho' ? ['Chờ trả lời', 'lam'] : x.trangThai === 'dong_y' ? ['Đã hẹn', 'xong'] : x.trangThai === 'huy' ? ['Đã hủy', ''] : ['Không đồng ý', 'loi']);
      return h`<span class="muted">${k.ban.ten} · ${c.so.lo.find(l => l.id === k.loId)?.ten ?? ''}</span>
        ${U.bao(`Địa chỉ người bán gửi đến cấp xã: ${hs?.vung}. Số nhà, số điện thoại chỉ mở khi có đơn đặt cọc; gọi qua app để được chỉ đường.`)}
        ${ds.map(x => U.the(h`<div class="row between"><strong>${U.nd(x.luc)} lúc ${x.luc.slice(11, 16)}</strong>${U.chip(...nhan(x))}</div><span class="small muted">${x.tu === 'mua' ? 'Bạn đề nghị' : `${k.ban.ten} đề nghị`}${x.ghiChu ? ` · ${x.ghiChu}` : ''}</span>
          ${x.trangThai === 'cho' && x.tu === 'ban' ? h`<div class="grid2">${U.nut('Không tiện', { bam: 'traLoi', kieu: 'phu', nho: true, data: { id: x.id, v: 0 } })}${U.nut('Đồng ý', { bam: 'traLoi', nho: true, data: { id: x.id, v: 1 } })}</div>` : ''}
          ${x.trangThai === 'dong_y' || (x.trangThai === 'cho' && x.tu === 'mua') ? U.nut('Hủy hẹn', { bam: 'huy', kieu: 'phu', nho: true, data: { id: x.id } }) : ''}`, { vien: x.trangThai === 'cho' && x.tu === 'ban' ? 'lam' : '' }))}
        ${k.trangThai === 'dong_y' && !ds.some(x => x.trangThai === 'cho') ? U.the(h`<strong>Đề nghị giờ hẹn</strong>${U.o(c, { k: 'luc', nhan: 'Ngày giờ', kieu: 'gio' })}${U.o(c, { k: 'ghiChu', nhan: 'Ghi chú', ph: 'Bên em ghé xem trái trên cây' })}${U.nut('Gửi đề nghị', { bam: 'gui', nho: true, data: { kn: k.id } })}`) : ''}`;
    },
    bam: {
      traLoi: (c, el) => c.lam({ loai: 'tra_loi_hen', henId: el.dataset.id, dongY: el.dataset.v === '1' }, { bao: el.dataset.v === '1' ? 'Đã đồng ý lịch hẹn.' : 'Đã trả lời.' }),
      huy: (c, el) => c.lam({ loai: 'huy_hen', henId: el.dataset.id }, { bao: 'Đã hủy lịch hẹn.' }),
      gui: (c, el) => c.lam({ loai: 'de_nghi_hen', ketNoiId: el.dataset.kn, luc: c.st.luc, ghiChu: c.st.ghiChu }, { bao: 'Đã gửi đề nghị hẹn.' }),
    },
  });
})();
