// Kho: tồn kho (xuất kho), nhập kho từ đơn đã chốt hoặc đơn ngoài app, truy xuất lô kho về tới nhật ký vườn.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const ton = p => p.kg - p.xuat.reduce((s, x) => s + x.kg, 0);

  AM.man('ton-kho', {
    st: () => ({ xuat: '', kg: '', ghiChu: '' }),
    ve(c) {
      const ds = c.so.kho.filter(p => p.mua.id === c.n.id), homNay = NV.ngayCua(c.bg), sap = NV.ngayCua(c.bg + 3 * 864e5);
      const theoMH = Object.values(ds.reduce((m, p) => { (m[p.matHang] ??= { ten: A.tenMH(p.matHang), kg: 0 }).kg += ton(p); return m; }, {}));
      return h`<div class="luoi-4">${theoMH.map(x => U.the(h`<span class="xs muted">${x.ten}</span><strong class="so-lon" style="font-size:22px">${U.luong(x.kg)}</strong>`))}${U.the(h`<span class="xs muted">Phiếu kho</span><strong class="so-lon" style="font-size:22px">${ds.length}</strong>`)}</div>
        ${ds.some(p => ton(p) > 0 && p.hanDung <= sap) ? U.bao(`Sắp hết hạn dùng: ${ds.filter(p => ton(p) > 0 && p.hanDung <= sap).map(p => `${p.ten} (${p.id}) hạn ${U.nd(p.hanDung)}`).join('; ')}.`, 'vang') : ''}
        <div class="row" style="gap:8px">${U.nut('Nhập kho', { den: '#nhap-kho', nho: true, icon: 'import' })}</div>
        ${ds.length ? U.bang([['Phiếu'], ['Hàng'], ['Loại'], ['Nhập', 'so'], ['Đã xuất', 'so'], ['Tồn', 'so'], ['Vị trí'], ['Hạn dùng'], ['']], ds.map(p => ({ lop: ton(p) > 0 && p.hanDung <= sap ? 'lam' : '', o: [h`<a href="${AM.den('truy-xuat', { phieu: p.id })}">${p.id}</a><br><span class="xs muted">${p.donMa ?? p.donNgoaiId}</span>`, p.ten, p.loai, U.luong(p.kg), U.luong(p.kg - ton(p)), h`<strong>${U.luong(ton(p))}</strong>`, p.viTri, h`${U.nd(p.hanDung)}${p.hanDung < homNay ? h`<br>${U.chip('Quá hạn', 'loi')}` : ''}`, ton(p) > 0 ? U.nut('Xuất', { bam: '_dat', kieu: 'phu', nho: true, data: { k: 'xuat', v: p.id } }) : ''] })))
          : U.trong('Kho trống', 'Nhập kho từ đơn đã chốt số cân hoặc đơn mua ngoài app.')}
        ${c.st.xuat ? U.the(h`<strong>Xuất kho phiếu ${c.st.xuat} (tồn ${U.luong(ton(ds.find(p => p.id === c.st.xuat) ?? { kg: 0, xuat: [] }))})</strong><div class="grid2">${U.o(c, { k: 'kg', nhan: 'Lượng xuất', kieu: 'so', donVi: 'kg' })}${U.o(c, { k: 'ghiChu', nhan: 'Xuất cho', ph: 'Chuyền sấy số 2' })}</div><div class="row" style="gap:8px">${U.nut('Thôi', { bam: '_dat', kieu: 'phu', nho: true, data: { k: 'xuat', v: '' } })}${U.nut('Xuất kho', { bam: 'xuat', nho: true })}</div>`, { vien: 'tot' }) : ''}`;
    },
    bam: { xuat(c) { const kq = c.lam({ loai: 'xuat_kho', phieuId: c.st.xuat, kg: U.docSo(c.st.kg), ngay: NV.ngayCua(c.bg), ghiChu: c.st.ghiChu }, { bao: 'Đã xuất kho.' }); if (kq.ok) c.dat({ xuat: '', kg: '', ghiChu: '' }); } },
  });

  AM.man('nhap-kho', {
    st: c => ({ chon: c.ts('ma') ? `don:${c.ts('ma')}` : c.ts('dng') ? `dng:${c.ts('dng')}` : '', phanLoai: 'Loại 1', kg: '', viTri: 'Kho lạnh A1', ngay: NV.ngayCua(c.bg), han: NV.ngayCua(c.bg + 20 * 864e5) }),
    ve(c) {
      const daNhap = (k, id) => c.so.kho.filter(p => p[k] === id).reduce((s, p) => s + p.kg, 0);
      const don = c.so.don.filter(d => d.mua.id === c.n.id && d.ketQuaCan && ['da_chot', 'tien_dang_giu', 'bao_da_tra', 'chua_thay_tien', 'da_nhan_tien'].includes(d.trangThai)).map(d => ({ id: `don:${d.ma}`, ten: `${d.ma} · ${d.tenLo} · ${d.ban.ten}`, con: d.ketQuaCan.nhan - daNhap('donMa', d.ma) })).filter(x => x.con > 0);
      const ngoai = c.so.donNgoai.filter(n => n.mua.id === c.n.id).map(n => ({ id: `dng:${n.id}`, ten: `${n.id} · ${n.ten} · ${n.nguoiBan} (ngoài app)`, con: n.kg - daNhap('donNgoaiId', n.id) })).filter(x => x.con > 0);
      const ds = [...don, ...ngoai], chon = ds.find(x => x.id === c.st.chon) ?? ds[0];
      if (!chon) return U.trong('Không có hàng chờ nhập kho', 'Đơn hiện ở đây sau khi chốt số cân; đơn ngoài app sau khi ghi sổ.');
      return {
        than: h`${U.chonO(c, { k: 'chon', nhan: 'Nhập từ', lua: ds.map(x => [x.id, `${x.ten} · còn ${U.luong(x.con)}`]) })}
          <div class="grid2">${U.o(c, { k: 'phanLoai', nhan: 'Loại hàng', ph: 'Loại 1' })}${U.o(c, { k: 'kg', nhan: 'Lượng nhập', kieu: 'so', donVi: 'kg', ph: U.so(chon.con) })}</div>
          <div class="grid2">${U.o(c, { k: 'viTri', nhan: 'Vị trí kho', ph: 'Kho lạnh A1' })}${U.o(c, { k: 'ngay', nhan: 'Ngày nhập', kieu: 'ngay' })}</div>
          ${U.o(c, { k: 'han', nhan: 'Hạn dùng', kieu: 'ngay' })}
          ${U.bao('Một đơn có thể chia nhiều phiếu theo loại (loại 1, loại 2), tổng không vượt lượng đã nhận.')}`,
        duoi: U.nut('Nhập kho', { bam: 'nhap', data: { id: chon.id, con: chon.con } }),
      };
    },
    bam: {
      nhap(c, el) {
        const [loai, id] = el.dataset.id.split(':');
        c.lam({ loai: 'nhap_kho', ...(loai === 'don' ? { donMa: id } : { donNgoaiId: id }), phanLoai: c.st.phanLoai, kg: U.docSo(c.st.kg) || Number(el.dataset.con), viTri: c.st.viTri, ngayNhap: c.st.ngay, hanDung: c.st.han }, { bao: 'Đã nhập kho.', den: 'ton-kho' });
      },
    },
  });

  AM.man('truy-xuat', {
    ve(c) {
      const ds = c.so.kho.filter(p => p.mua.id === c.n.id), id = c.ts('phieu') || ds[0]?.id;
      if (!id) return U.trong('Chưa có phiếu kho để truy xuất');
      const tx = NV.truyXuat(c.so, id, c.bg);
      if (!tx) return U.trong('Không tìm thấy phiếu');
      const p = tx.phieu, ng = tx.nguon;
      const buoc = (tieu, noi) => h`<li class="qua"><div class="stack" style="gap:2px"><strong>${tieu}</strong>${noi}</div></li>`;
      return h`${U.chonO(c, { k: '_phieu', nhan: 'Phiếu kho', lua: ds.map(x => [x.id, `${x.id} · ${x.ten} · ${x.loai}`]) })}
        <div class="hai-cot">${U.the(h`<ol class="dong-thoi-gian">
            ${buoc(`Phiếu kho ${p.id}`, h`<span class="small">${p.ten} · ${p.loai} · ${U.luong(p.kg)} · ${p.viTri} · nhập ${U.nd(p.ngayNhap)}</span>`)}
            ${tx.don ? buoc(`Đơn ${tx.don.ma}`, h`<span class="small">${U.luong(tx.don.ketQuaCan?.nhan ?? tx.don.kg)} × ${U.so(tx.don.gia)} đ · giao ${U.nd(tx.don.ngayGiao)}</span>`) : ''}
            ${tx.ngoai ? buoc(`Đơn ngoài app ${tx.ngoai.id}`, h`<span class="small">${tx.ngoai.nguoiBan} · ${tx.ngoai.diaChiNguoiBan} · mua ${U.nd(tx.ngoai.ngay)}</span>`) : ''}
            ${tx.lo ? buoc(`Lô ${tx.lo.ten}`, h`<span class="small">${tx.lo.coSo === 'da_can' ? 'đã cân' : 'ước tính'}${tx.lo.anh.some(a => a.startsWith('giay|')) ? ` · giấy tờ: ${tx.lo.anh.filter(a => a.startsWith('giay|')).map(a => a.split('|')[1]).join(', ')}` : ''}</span>`) : ''}
            ${tx.nguoiBan ? buoc(`Người bán ${tx.nguoiBan.ten}`, h`<span class="small">${tx.nguoiBan.vung} · ${tx.nguoiBan.xacMinh === 'da_xac_minh' ? 'đã xác minh' : 'chưa xác minh'}</span>`) : ''}
            ${ng ? buoc(`Vườn ${ng.vuon.ten}`, h`<span class="small">${ng.vuon.cay} · ${ng.vuon.dienTich} ${ng.vuon.donViDienTich === 'cong' ? 'công' : ng.vuon.donViDienTich}${ng.vu ? ` · ${ng.vu.ten}` : ''} · hồ sơ đầy đủ ${ng.mucDayDu}%</span>`) : buoc('Vườn', h`<span class="small muted">Lô không gắn vườn: không có nhật ký canh tác.</span>`)}
          </ol>`)}
          <div class="stack">${U.the(h`<strong>Mã truy xuất</strong><div class="ma-qr">${A.maQr(`AGIVIET-TX-${p.id}`)}</div><span class="xs muted" style="text-align:center">AGIVIET-TX-${p.id}</span>`)}
            ${ng ? U.the(h`<strong>Nhật ký canh tác</strong>${ng.cachLy ? U.dong2('Hết cách ly thuốc', U.nd(ng.cachLy)) : ''}<ol class="dong-thoi-gian">${ng.nhatKy.slice(0, 10).map(k => h`<li class="qua"><span class="small"><strong>${U.ndNgan(k.ngay)}</strong> · ${k.noiDung}${k.vatTu ? ` (${k.vatTu})` : ''}${k.ngayCachLy ? ` · cách ly ${k.ngayCachLy} ngày` : ''}</span></li>`)}</ol>`) : ''}</div></div>`;
    },
    sau(c) { if (c.st._phieu && c.st._phieu !== c.ts('phieu')) { const v = c.st._phieu; c.dat({ _phieu: '' }, false); c.di('truy-xuat', { phieu: v }); } },
  });
})();
