// Tiền: tài khoản đảm bảo (tiền đang giữ theo đơn, đã chuyển cho người bán), công nợ (trong app và ngoài app), chuyển tiền đơn
// (vào tài khoản đảm bảo hoặc trả trực tiếp; gói Business có duyệt chi nhiều cấp).
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;
  const NGUONG_DUYET = 50_000_000;

  AM.man('vi-dam-bao', {
    ve(c) {
      const don = c.so.don.filter(d => d.mua.id === c.n.id);
      const dangGiu = don.filter(d => d.daCoc && !['da_nhan_tien', 'da_huy', 'qua_han'].includes(d.trangThai)).map(d => ({ d, so: (d.daCoc?.so ?? 0) + (d.trangThai === 'tien_dang_giu' ? d.tra?.so ?? 0 : 0) }));
      const daChuyen = don.filter(d => d.trangThai === 'da_nhan_tien' && d.thanhToan === 'dam_bao');
      const phi = don.filter(d => d.daCoc).reduce((s, d) => s + d.daCoc.phi, 0);
      const hoan = don.filter(d => d.trangThai === 'da_huy' && d.huy?.cocVe === 'mua').reduce((s, d) => s + (d.daCoc?.so ?? 0), 0) + don.reduce((s, d) => s + (d.hoanCoc ?? 0), 0);
      const o = (nhan, gt, lop = '') => U.the(h`<span class="xs muted">${nhan}</span><strong class="so-lon" style="font-size:22px">${gt}</strong>`, { lop });
      return h`<div class="luoi-4">${o('Đang giữ ở tài khoản đảm bảo', U.tienGon(dangGiu.reduce((s, x) => s + x.so, 0)), 'noi')}${o('Đã chuyển cho người bán', U.tienGon(daChuyen.reduce((s, d) => s + (d.daTra ?? 0), 0)))}${o('Phí giới thiệu, mối quen đã trả', U.tienGon(phi))}${o('Cọc hoàn về bạn', U.tienGon(hoan))}</div>
        ${U.bao('Tài khoản đảm bảo do ngân hàng đối tác giữ: cọc và tiền hàng nằm đó tới khi hai bên chốt số cân, rồi ngân hàng chuyển cho người bán. AgiViet không giữ tiền.')}
        <section class="stack s8"><h2 class="h2">Tiền đang giữ theo đơn</h2>${dangGiu.length ? U.bang([['Đơn'], ['Người bán'], ['Đang giữ', 'so'], ['Trạng thái']], dangGiu.map(x => [h`<a href="${AM.den('chi-tiet-don', { ma: x.d.ma })}">${x.d.ma}</a>`, x.d.ban.ten, U.dong(x.so), NV.NHAN_TRANG_THAI[x.d.trangThai]])) : h`<span class="muted">Không có khoản đang giữ.</span>`}</section>
        <section class="stack s8"><h2 class="h2">Đã chuyển cho người bán</h2>${daChuyen.length ? U.bang([['Đơn'], ['Người bán'], ['Tiền hàng', 'so'], ['Ngày']], daChuyen.map(d => [h`<a href="${AM.den('chi-tiet-don', { ma: d.ma })}">${d.ma}</a>`, d.ban.ten, U.dong(d.daTra), U.gioNgay(d.lichSu.at(-1).luc)])) : h`<span class="muted">Chưa có.</span>`}</section>
        <div class="row" style="gap:8px">${U.nut('Công nợ', { den: '#cong-no', kieu: 'phu', nho: true })}${U.nut('Nạp thêm vào tài khoản đảm bảo', { bam: 'nap', kieu: 'phu', nho: true })}</div>`;
    },
    bam: { nap: c => c.bao('Mô phỏng: chuyển khoản vào tài khoản đảm bảo theo nội dung "AGV <mã đơn>"; tiền gắn theo từng đơn.') },
  });

  AM.man('cong-no', {
    ve(c) {
      const no = NV.congNo(c.so, c.n.id);
      const choCoc = c.so.don.filter(d => d.mua.id === c.n.id && d.trangThai === 'cho_coc');
      return h`<div class="luoi-4">${U.the(h`<span class="xs muted">Tổng còn phải trả</span><strong class="so-lon" style="font-size:22px">${U.tienGon(no.tongCon)}</strong>`, { lop: 'noi' })}${U.the(h`<span class="xs muted">Cọc, phí chờ chuyển</span><strong class="so-lon" style="font-size:22px">${U.tienGon(choCoc.reduce((s, d) => s + d.coc.so + d.coc.phi, 0))}</strong>`)}${U.the(h`<span class="xs muted">Số khoản</span><strong class="so-lon" style="font-size:22px">${no.ds.length}</strong>`)}</div>
        ${no.ds.length ? U.bang([['Mã'], ['Người bán'], ['Hàng'], ['Phải trả', 'so'], ['Đã trả', 'so'], ['Còn', 'so'], ['Nguồn'], ['']], no.ds.map(x => ({ lop: x.trangThai === 'da_chot' ? 'lam' : '', o: [x.nguon === 'app' ? h`<a href="${AM.den('chi-tiet-don', { ma: x.ma })}">${x.ma}</a>` : x.ma, x.nguoiBan, x.ten, U.so(x.phaiTra), U.so(x.daTra), h`<strong>${U.so(x.con)}</strong>`, x.nguon === 'app' ? NV.NHAN_TRANG_THAI[x.trangThai] : 'Ngoài app', ['da_chot', 'ngoai'].includes(x.trangThai) ? U.nut('Trả', { den: AM.den('ghi-thanh-toan', x.nguon === 'app' ? { ma: x.ma } : { dng: x.ma }), nho: true }) : ''] })), [h`<strong>Tổng</strong>`, '', '', U.so(no.ds.reduce((s, x) => s + x.phaiTra, 0)), U.so(no.ds.reduce((s, x) => s + x.daTra, 0)), U.so(no.tongCon), '', ''])
          : U.trong('Không còn công nợ', 'Đơn đã chốt số cân chưa trả đủ và đơn ngoài app còn nợ sẽ hiện ở đây.')}
        <div class="row" style="gap:8px">${U.nut('Xuất Excel', { bam: 'xuat', kieu: 'phu', nho: true, icon: 'export' })}${U.nut('Ghi đơn mua ngoài app', { den: 'nha-cung-cap.html#ghi-don-ngoai', kieu: 'phu', nho: true })}</div>`;
    },
    bam: { xuat(c) { const no = NV.congNo(c.so, c.n.id); U.taiCsv('cong-no.csv', [['Mã', 'Người bán', 'Hàng', 'Phải trả', 'Đã trả', 'Còn', 'Nguồn'], ...no.ds.map(x => [x.ma, x.nguoiBan, x.ten, x.phaiTra, x.daTra, x.con, x.nguon === 'app' ? 'Trong app' : 'Ngoài app'])]); c.bao('Đã tải tệp Excel (CSV).'); } },
  });

  AM.man('ghi-thanh-toan', {
    st: () => ({ cach: 'dam_bao', so: '', duyet: false }),
    ve(c) {
      const dng = c.so.donNgoai.find(x => x.id === c.ts('dng') && x.mua.id === c.n.id);
      if (dng) {
        const con = NV.tien(dng.kg, dng.gia) - dng.daTra;
        return { than: h`${U.the(h`<strong>${dng.nguoiBan} · ${dng.ten}</strong>${U.dong2('Tiền hàng', U.dong(NV.tien(dng.kg, dng.gia)))}${U.dong2('Đã trả', U.dong(dng.daTra))}${U.dong2('Còn nợ', h`<strong>${U.dong(con)}</strong>`)}`)}${U.o(c, { k: 'so', nhan: 'Số trả lần này', kieu: 'so', donVi: 'đ', ph: U.so(con) })}${U.bao('Đơn ngoài app: chỉ ghi sổ công nợ, không đi qua tài khoản đảm bảo.')}`, duoi: U.nut('Ghi đã trả', { bam: 'traNgoai', data: { id: dng.id, con } }) };
      }
      const can = c.so.don.filter(d => d.mua.id === c.n.id && d.trangThai === 'da_chot');
      const d = can.find(x => x.ma === c.ts('ma')) ?? c.so.don.find(x => x.ma === c.ts('ma') && x.mua.id === c.n.id);
      if (!d) return can.length ? h`<p class="muted">Chọn đơn cần trả.</p>${can.map(x => U.the(h`<strong>${x.ma} · ${x.ban.ten}</strong><span class="small">Còn phải trả ${U.dong(x.conPhaiTra)}</span>`, { den: AM.den('ghi-thanh-toan', { ma: x.ma }), vien: 'lam' }))}` : U.trong('Không có đơn chờ trả tiền', 'Đơn hiện ở đây sau khi người bán xác nhận số cân.');
      if (d.trangThai !== 'da_chot') return h`${U.bao(`Đơn ${d.ma} đang ở bước "${NV.NHAN_TRANG_THAI[d.trangThai]}": chưa tới lúc trả.`)}${U.nut('Mở chi tiết đơn', { den: AM.den('chi-tiet-don', { ma: d.ma }) })}`;
      const ketoan = c.hs.goi === 'business' && c.hs.thanhVien.some(t => t.quyen === 'ke_toan');
      const soTra = c.st.cach === 'dam_bao' ? d.conPhaiTra : U.docSo(c.st.so) || 0, canDuyet = ketoan && soTra >= NGUONG_DUYET;
      return {
        than: h`<div class="hai-cot"><div class="stack">${U.the(h`<strong>${d.ma} · ${d.ban.ten}</strong>${U.dong2('Tiền hàng', U.dong(d.phaiTra))}${U.dong2('Đã trả (gồm cọc)', U.dong(d.daTra))}${U.dong2('Còn phải trả', h`<strong>${U.dong(d.conPhaiTra)}</strong>`)}`)}
            ${U.chon(c, { k: 'cach', nhan: 'Cách trả', lua: [['dam_bao', 'Qua tài khoản đảm bảo'], ['truc_tiep', 'Trả trực tiếp']] })}
            ${c.st.cach === 'dam_bao' ? U.bao(`Chuyển đúng ${U.dong(d.conPhaiTra)} vào tài khoản đảm bảo, nội dung "AGV ${d.ma.replace(/\W/g, '')}". Ngân hàng chuyển cho người bán sau ít phút (tua đồng hồ ở Giả lập để thấy ngay).`, 'tot')
              : h`${U.o(c, { k: 'so', nhan: 'Số đã chuyển trực tiếp', kieu: 'so', donVi: 'đ', ph: U.so(d.conPhaiTra) })}${U.bao('Người bán xem sổ ngân hàng rồi xác nhận; trả thiếu thì đơn chưa đóng.', 'vang')}`}</div>
          <div class="stack">${ketoan ? U.the(h`<strong>Duyệt chi</strong><span class="small muted">Khoản từ ${U.tienGon(NGUONG_DUYET)} cần kế toán duyệt trước khi chuyển.</span>${canDuyet ? U.congTac(c, { k: 'duyet', nhan: `Kế toán ${c.hs.thanhVien.find(t => t.quyen === 'ke_toan').ten} đã duyệt (mô phỏng)` }) : U.chip('Không cần duyệt', 'xong')}`) : ''}</div></div>`,
        duoi: U.nut(c.st.cach === 'dam_bao' ? `Chuyển ${U.dong(d.conPhaiTra)} vào tài khoản đảm bảo` : 'Ghi đã trả', { bam: 'tra', tat: canDuyet && !c.st.duyet }),
      };
    },
    bam: {
      tra(c) {
        const d = c.so.don.find(x => x.ma === c.ts('ma'));
        if (c.st.cach === 'dam_bao') c.lam({ loai: 'buoc_don', ma: d.ma, buoc: 'chuyenTienDamBao', thamSo: [d.conPhaiTra] }, { bao: 'Đã chuyển vào tài khoản đảm bảo. Ngân hàng sẽ chuyển cho người bán.', den: ['chi-tiet-don', { ma: d.ma }] });
        else c.lam({ loai: 'buoc_don', ma: d.ma, buoc: 'baoDaTra', thamSo: [U.docSo(c.st.so) || 0] }, { bao: 'Đã ghi. Chờ người bán xác nhận thấy tiền.', den: ['chi-tiet-don', { ma: d.ma }] });
      },
      traNgoai: (c, el) => c.lam({ loai: 'tra_don_ngoai', donNgoaiId: el.dataset.id, so: U.docSo(c.st.so) || Number(el.dataset.con) }, { bao: 'Đã ghi trả.', den: 'cong-no' }),
    },
  });
})();
