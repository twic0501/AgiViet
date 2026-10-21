// Thuế, báo cáo: bảng kê mua hàng nông sản không hóa đơn (mẫu 01/TNDN) tự lập từ đơn; báo cáo khối lượng, chi phí, giá bình quân.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;

  AM.man('bang-ke', {
    st: c => ({ thang: NV.thangCua(c.bg) }),
    ve(c) {
      const bk = NV.bangKe01(c.so, c.n.id, c.st.thang);
      const [y, m] = c.st.thang.split('-');
      return h`<div class="row between" style="flex-wrap:wrap;gap:8px"><div style="min-width:200px">${U.o(c, { k: 'thang', nhan: 'Tháng (yyyy-mm)', veLai: true })}</div><div class="row" style="gap:8px">${U.nut('Xuất Excel', { bam: 'xuat', kieu: 'phu', nho: true, icon: 'export' })}${U.nut('In, lưu PDF', { bam: 'in', kieu: 'phu', nho: true })}</div></div>
        ${U.the(h`<strong class="h2" style="text-align:center">BẢNG KÊ THU MUA HÀNG HÓA, DỊCH VỤ MUA VÀO KHÔNG CÓ HÓA ĐƠN</strong><span class="small" style="text-align:center">(Mẫu số 01/TNDN) · Tháng ${m} năm ${y}</span>
          ${U.dong2('Tên doanh nghiệp', c.hs.toChuc?.ten ?? '')}${U.dong2('Mã số thuế', c.hs.toChuc?.maSoThue ?? '')}${U.dong2('Địa chỉ', [c.hs.diaChi, c.hs.vung].filter(Boolean).join(', '))}`)}
        ${bk.dong.length ? U.bang([['STT'], ['Ngày mua'], ['Người bán'], ['Địa chỉ người bán'], ['Hàng hóa'], ['Số lượng (kg)', 'so'], ['Đơn giá', 'so'], ['Thành tiền', 'so'], ['Chứng từ']], bk.dong.map((d, i) => [i + 1, U.nd(d.ngay), d.nguoiBan, d.diaChi, d.matHang, U.so(d.kg), U.so(d.donGia), U.so(d.thanhTien), d.chungTu]), ['', '', '', '', h`<strong>Tổng cộng</strong>`, '', '', h`<strong>${U.so(bk.tong)}</strong>`, ''])
          : U.trong('Tháng này chưa có dòng nào', 'Bảng kê gồm đơn trong app đã nhận đủ tiền và đơn mua ngoài app trong tháng.')}
        <span class="small muted">Đơn trong app có đủ chứng từ: thỏa thuận ký trên app, phiếu cân, chứng từ chuyển tiền qua tài khoản đảm bảo. Kiểm lại với kế toán trước khi nộp.</span>`;
    },
    bam: {
      xuat(c) { const bk = NV.bangKe01(c.so, c.n.id, c.st.thang); U.taiCsv(`bang-ke-01-TNDN-${c.st.thang}.csv`, [['STT', 'Ngày mua', 'Người bán', 'Địa chỉ', 'Hàng hóa', 'Số lượng (kg)', 'Đơn giá', 'Thành tiền', 'Chứng từ'], ...bk.dong.map((d, i) => [i + 1, d.ngay, d.nguoiBan, d.diaChi, d.matHang, d.kg, d.donGia, d.thanhTien, d.chungTu]), ['', '', '', '', 'Tổng cộng', '', '', bk.tong, '']]); c.bao('Đã tải tệp Excel (CSV).'); },
      in: () => window.print(),
    },
  });

  AM.man('bao-cao', {
    st: () => ({ theo: 'mat-hang' }),
    ve(c) {
      const app = c.so.don.filter(d => d.mua.id === c.n.id && d.ketQuaCan && d.phaiTra !== undefined).map(d => ({ mh: d.matHang, ten: A.tenMH(d.matHang), kg: d.ketQuaCan.nhan, tien: d.phaiTra, thang: d.ngayGiao.slice(0, 7), vung: c.so.nguoiDung.find(n => n.id === d.ban.id)?.vung.split(',').at(-1)?.trim() ?? '' }));
      const ngoai = c.so.donNgoai.filter(n => n.mua.id === c.n.id).map(n => ({ mh: n.matHang, ten: A.tenMH(n.matHang), kg: n.kg, tien: NV.tien(n.kg, n.gia), thang: n.ngay.slice(0, 7), vung: n.diaChiNguoiBan.split(',').at(-1)?.trim() ?? '' }));
      const tat = [...app, ...ngoai];
      const khoa = { 'mat-hang': x => x.ten, thang: x => `${x.thang.slice(5)}/${x.thang.slice(0, 4)}`, vung: x => x.vung || 'không rõ' }[c.st.theo];
      const gop = Object.entries(tat.reduce((m, x) => { const k = khoa(x); (m[k] ??= { kg: 0, tien: 0, so: 0 }); m[k].kg += x.kg; m[k].tien += x.tien; m[k].so++; return m; }, {})).sort((a, b) => b[1].tien - a[1].tien);
      const tongKg = tat.reduce((s, x) => s + x.kg, 0), tongTien = tat.reduce((s, x) => s + x.tien, 0);
      return h`${U.chon(c, { k: 'theo', nhan: 'Xem theo', lua: [['mat-hang', 'Mặt hàng'], ['thang', 'Tháng'], ['vung', 'Vùng']] })}
        <div class="luoi-4">${U.the(h`<span class="xs muted">Khối lượng đã mua</span><strong class="so-lon" style="font-size:22px">${U.luong(tongKg)}</strong>`, { lop: 'noi' })}${U.the(h`<span class="xs muted">Chi phí hàng</span><strong class="so-lon" style="font-size:22px">${U.tienGon(tongTien)}</strong>`)}${U.the(h`<span class="xs muted">Giá bình quân</span><strong class="so-lon" style="font-size:22px">${tongKg ? U.so(Math.round(tongTien / tongKg)) : 0} đ/kg</strong>`)}${U.the(h`<span class="xs muted">Số đơn (gồm ngoài app)</span><strong class="so-lon" style="font-size:22px">${tat.length}</strong>`)}</div>
        ${gop.length ? U.bang([[{ 'mat-hang': 'Mặt hàng', thang: 'Tháng', vung: 'Vùng' }[c.st.theo]], ['Số đơn', 'so'], ['Khối lượng', 'so'], ['Chi phí', 'so'], ['Giá bình quân', 'so'], ['Tỷ trọng']], gop.map(([k, v]) => [k, v.so, U.luong(v.kg), U.so(v.tien), `${U.so(Math.round(v.tien / v.kg))} đ/kg`, U.tienTrinh(v.tien / tongTien, `Tỷ trọng ${k}`)])) : U.trong('Chưa có số liệu', 'Báo cáo tính từ đơn đã chốt số cân và đơn mua ngoài app.')}`;
    },
  });
})();
