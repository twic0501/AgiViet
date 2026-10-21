// Dịch vụ đối tác (kiểm định, xe, kho lạnh): yêu cầu đang có, gửi yêu cầu báo giá, đặt lịch.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const TEN = { kiem_dinh: 'Kiểm định chất lượng, dư lượng', van_chuyen: 'Xe chở hàng (xe lạnh)', kho_lanh: 'Thuê kho lạnh' };
  const NHAN = { cho_bao_gia: ['Chờ đối tác báo giá', 'cho'], da_bao_gia: ['Có báo giá, chờ bạn đặt', 'lam'], da_dat: ['Đã đặt', 'cho'], xong: ['Hoàn tất', 'xong'], huy: ['Đã hủy', 'loi'] };

  AM.man('dich-vu', {
    ve(c) {
      const ds = c.so.dichVu.filter(y => y.nguoi.id === c.n.id);
      return h`<div class="luoi-4">${Object.entries(TEN).map(([l, t]) => U.the(h`<strong>${t}</strong>${U.nut('Yêu cầu báo giá', { den: AM.den('yeu-cau-dich-vu', { loai: l }), kieu: 'phu', nho: true })}`))}</div>
        ${ds.length ? U.bang([['Mã'], ['Dịch vụ'], ['Ngày'], ['Gắn với'], ['Báo giá', 'so'], ['Trạng thái'], ['']], ds.map(y => ({ lop: y.trangThai === 'da_bao_gia' ? 'lam' : '', o: [y.id, TEN[y.loai], U.nd(y.ngay), y.donMa ?? (y.loId ? c.so.lo.find(l => l.id === y.loId)?.ten : '') ?? '', y.baoGia ? h`${U.so(y.baoGia.gia)}<br><span class="xs muted">${y.baoGia.doiTac}</span>` : '', U.chip(NHAN[y.trangThai][0], NHAN[y.trangThai][1]),
          y.trangThai === 'da_bao_gia' ? h`<div class="row" style="gap:6px">${U.nut('Đặt', { bam: 'dat', nho: true, data: { id: y.id } })}${U.nut('Không', { bam: 'huy', kieu: 'phu', nho: true, data: { id: y.id } })}</div>` : y.trangThai === 'cho_bao_gia' ? U.nut('Hủy', { bam: 'huy', kieu: 'phu', nho: true, data: { id: y.id } }) : ''] })))
          : U.trong('Chưa có yêu cầu dịch vụ', 'Đối tác do AgiViet giới thiệu báo giá trong ít phút (tua đồng hồ ở Giả lập để thấy ngay).')}`;
    },
    bam: {
      dat: (c, el) => c.lam({ loai: 'dat_dich_vu', yeuCauId: el.dataset.id }, { bao: 'Đã đặt. Đối tác liên hệ theo ngày hẹn.' }),
      huy: (c, el) => c.lam({ loai: 'huy_dich_vu', yeuCauId: el.dataset.id }, { bao: 'Đã hủy yêu cầu.' }),
    },
  });

  AM.man('yeu-cau-dich-vu', {
    st: c => ({ loai: TEN[c.ts('loai')] ? c.ts('loai') : 'kiem_dinh', ngay: NV.ngayCua(c.bg + 2 * 864e5), gan: c.ts('lo') ? `lo:${c.ts('lo')}` : c.ts('ma') ? `don:${c.ts('ma')}` : '', ghiChu: '' }),
    ve(c) {
      const don = c.so.don.filter(d => d.mua.id === c.n.id && ['cho_coc', 'cho_giao'].includes(d.trangThai));
      const lo = [...new Set(c.so.ketNoi.filter(k => k.mua.id === c.n.id && k.loId).map(k => k.loId))].map(id => c.so.lo.find(l => l.id === id)).filter(Boolean);
      const loTs = c.ts('lo') && !lo.some(l => l.id === c.ts('lo')) ? c.so.lo.find(l => l.id === c.ts('lo')) : null;
      return {
        than: h`${U.chon(c, { k: 'loai', nhan: 'Dịch vụ', lua: Object.entries(TEN) })}${U.o(c, { k: 'ngay', nhan: 'Ngày cần', kieu: 'ngay' })}
          ${U.chonO(c, { k: 'gan', nhan: 'Cho lô hoặc đơn', lua: [['', 'Không gắn'], ...[...lo, ...(loTs ? [loTs] : [])].map(l => [`lo:${l.id}`, `Lô ${l.ten} · ${l.ban.ten}`]), ...don.map(d => [`don:${d.ma}`, `Đơn ${d.ma} · ${d.ban.ten}`])] })}
          ${U.o(c, { k: 'ghiChu', nhan: 'Yêu cầu', kieu: 'chu-dai', ph: c.st.loai === 'kiem_dinh' ? 'Kiểm dư lượng thuốc trừ sâu, lấy mẫu tại vườn' : c.st.loai === 'van_chuyen' ? 'Xe lạnh 5 tấn, từ Cao Lãnh về Sa Đéc' : '10 tấn, 7 ngày' })}`,
        duoi: U.nut('Gửi yêu cầu báo giá', { bam: 'gui' }),
      };
    },
    bam: {
      gui(c) {
        const g = c.st.gan, gan = g.startsWith('lo:') ? { loId: g.slice(3) } : g.startsWith('don:') ? { donMa: g.slice(4) } : {};
        c.lam({ loai: 'yeu_cau_dich_vu', dichVu: c.st.loai, ngay: c.st.ngay, ghiChu: c.st.ghiChu, ...gan }, { bao: 'Đã gửi. Đối tác báo giá trong ít phút.', den: 'dich-vu' });
      },
    },
  });
})();
