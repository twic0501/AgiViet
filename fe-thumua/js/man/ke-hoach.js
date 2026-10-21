// Kế hoạch mua: nhu cầu theo tháng, đã có nguồn (đơn đã xác nhận, đơn ngoài app), dự báo thiếu hàng.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;

  AM.man('ke-hoach', {
    st: c => ({ matHang: [], thang: NV.ngayCua(c.bg).slice(0, 7), kg: '' }),
    ve(c) {
      const ds = NV.phuKeHoach(c.so, c.n.id);
      const tongThieu = ds.reduce((s, k) => s + k.thieu, 0);
      return h`${tongThieu ? U.bao(`Dự báo thiếu ${U.luong(tongThieu)} so với kế hoạch. Đăng tin cần mua hoặc xem nguồn gợi ý cho phần thiếu.`, 'vang') : ds.length ? U.bao('Các tháng trong kế hoạch đã đủ nguồn.', 'tot') : ''}
        ${ds.length ? U.bang([['Tháng'], ['Mặt hàng'], ['Cần', 'so'], ['Đã có nguồn', 'so'], ['Thiếu', 'so'], ['Độ phủ'], ['']], ds.map(k => ({ lop: k.thieu ? 'lam' : '', o: [`${k.thang.slice(5)}/${k.thang.slice(0, 4)}`, k.ten, U.luong(k.kgCan), U.luong(k.daCo), h`<strong>${U.luong(k.thieu)}</strong>`, U.tienTrinh(Math.min(1, k.daCo / k.kgCan), `Độ phủ ${k.ten}`),
          h`<div class="row" style="gap:6px">${k.thieu ? U.nut('Tìm nguồn', { den: `nguon-hang.html#nguon-hang`, kieu: 'phu', nho: true }) : ''}${U.nut('Xóa', { bam: 'xoa', kieu: 'phu', nho: true, data: { id: k.id }, hoi: 'Xóa dòng kế hoạch?||Xóa|canh' })}</div>`] })))
          : U.trong('Chưa có kế hoạch mua', 'Ghi lượng cần theo tháng để app tính phần đã có nguồn và phần còn thiếu.')}
        ${U.the(h`<strong class="h2">Thêm dòng kế hoạch</strong>${U.chonMH(c, { k: 'matHang', mot: true })}<div class="grid2">${U.o(c, { k: 'thang', nhan: 'Tháng (yyyy-mm)', ph: '2026-11' })}${U.o(c, { k: 'kg', nhan: 'Lượng cần', kieu: 'so', donVi: 'kg' })}</div>${U.nut('Thêm', { bam: 'them', nho: true })}`)}`;
    },
    bam: {
      them(c) { const mh = A.dm.timMatHang(c.st.matHang[0] ?? ''); if (!mh) return c.bao('Chọn mặt hàng.', 'loi'); const kq = c.lam({ loai: 'them_ke_hoach', matHang: mh.id, ten: mh.ten, thang: String(c.st.thang).trim(), kgCan: U.docSo(c.st.kg) }, { bao: 'Đã thêm vào kế hoạch.' }); if (kq.ok) c.dat({ kg: '' }); },
      xoa: (c, el) => c.lam({ loai: 'xoa_ke_hoach', keHoachId: el.dataset.id }, { bao: 'Đã xóa.' }),
    },
  });
})();
