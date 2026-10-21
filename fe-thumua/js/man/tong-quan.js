// Tổng quan: việc cần làm chia theo nhóm, đơn sắp nhận, tiền sắp trả, nguồn gợi ý, thiếu hàng so với kế hoạch.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A, NV = A.nv;

  AM.man('tong-quan', {
    ve(c) {
      const v = A.mc.viecCanLam(c.so, c.n, c.bg);
      const nhom = A.mc.donTheoNhom(c.so, c.n, c.bg);
      const sapNhan = A.mc.lichGiao(c.so, c.n).filter(d => d.ngayGiao <= NV.ngayCua(c.bg + 7 * 864e5));
      const no = NV.congNo(c.so, c.n.id);
      const choCoc = c.so.don.filter(d => d.mua.id === c.n.id && d.trangThai === 'cho_coc');
      const thieu = NV.phuKeHoach(c.so, c.n.id).filter(k => k.thieu > 0);
      const nc = c.so.nhuCau.filter(n => n.mua.id === c.n.id && n.trangThai === 'mo');
      const loHien = A.mc.loDangBan(c.so, c.bg);
      const goiY = nc.flatMap(n => loHien.map(lo => ({ n, lo, ...U.xepHang(n, lo, c.so) }))).filter(x => x.diem >= 60).sort((a, b) => b.diem - a.diem).slice(0, 3);
      const tong = v.don.length + v.loiMoi.length + v.baoGia.length + v.hen.length + v.deNghi.length;
      const tenBan = kn => c.so.ketNoi.find(k => k.id === kn)?.ban.ten ?? '';
      const so = (nhan, gt, den) => U.the(h`<span class="xs muted">${nhan}</span><strong class="so-lon" style="font-size:24px">${gt}</strong>`, den ? { den } : {});
      return h`<div class="luoi-4">
          ${so('Đơn đang chạy', nhom.lam.length + nhom.cho.length + nhom.loi.length, 'don-hang.html#don-hang')}
          ${so('Đơn sắp nhận (7 ngày)', sapNhan.length, 'don-hang.html#lich-nhan')}
          ${so('Tiền còn phải trả', U.tienGon(no.tongCon + choCoc.reduce((s, d) => s + (d.coc?.so ?? 0) + (d.coc?.phi ?? 0), 0)), 'tien.html#cong-no')}
          ${so('Thiếu hàng so với kế hoạch', thieu.length ? U.luong(thieu.reduce((s, k) => s + k.thieu, 0)) : 'Đủ', 'ke-hoach.html#ke-hoach')}
        </div>
        <div class="hai-cot">
          <section class="stack s8"><h2 class="h2">Việc cần làm ${tong ? h`<span class="muted">(${tong})</span>` : ''}</h2>
            ${tong ? '' : U.trong('Không có việc nào chờ bạn', 'Đơn cần cọc, kết quả cân, chào hàng, báo giá của người bán sẽ hiện ở đây.')}
            ${v.don.map(d => h`<div class="stack s8">${U.theDon(d, c.bg)}<span class="small muted" style="padding:0 4px">${NV.viecTiep(d, 'mua')}</span></div>`)}
            ${v.deNghi.map(d => U.the(h`<strong>${d.donMa}: người bán đề nghị ${d.loai === 'doi_lich' ? 'đổi ngày giao' : d.loai === 'giam_luong' ? `giảm còn ${U.luong(Number(d.giaTri))}` : 'đổi giá'}</strong><span class="small muted">${d.lyDo}</span>`, { den: AM.den('chi-tiet-don', { ma: d.donMa }), vien: 'lam' }))}
            ${v.loiMoi.map(k => U.the(h`<strong>${k.ban.ten} chào hàng ${c.so.lo.find(l => l.id === k.loId)?.ten ?? ''}</strong><span class="small muted">${k.loiNhan || ''} · ${U.tuongDoi(k.guiLuc, c.bg)}</span>`, { den: AM.den('chi-tiet-nhu-cau', { nc: k.nhuCauId }), vien: 'lam' }))}
            ${v.baoGia.map(b => U.the(h`<strong>${tenBan(b.ketNoiId)} báo giá ${U.dong(b.gia)}/kg</strong><span class="small muted">${U.luong(b.kg)} · giao ${U.nd(b.ngayGiao)}</span>`, { den: 'bao-gia.html#bao-gia', vien: 'lam' }))}
            ${v.hen.map(x => U.the(h`<strong>${tenBan(x.ketNoiId)} đề nghị giờ hẹn xem vườn</strong><span class="small muted">${x.luc.replace('T', ' lúc ')}</span>`, { den: AM.den('hen-xem-vuon', { kn: x.ketNoiId }), vien: 'lam' }))}
          </section>
          <section class="stack s8">
            <h2 class="h2">Đơn sắp nhận</h2>
            ${sapNhan.length ? U.bang([['Ngày'], ['Đơn'], ['Lượng', 'so']], sapNhan.map(d => [U.ndNgan(d.ngayGiao), h`<a href="${AM.den('chi-tiet-don', { ma: d.ma })}">${d.ma}</a> · ${d.ban.ten}`, U.luong(d.kg)])) : h`<span class="muted">Không có đơn giao trong 7 ngày tới.</span>`}
            <h2 class="h2">Nguồn gợi ý cho tin cần mua</h2>
            ${goiY.length ? goiY.map(x => U.theNguon(x.lo, c.so, c.bg, h`<span class="xs muted">Khớp ${x.diem}% với "${x.n.ten}": ${x.ly.join(', ')}</span>`)) : h`<span class="muted">Chưa có nguồn khớp. ${nc.length ? '' : 'Đăng tin cần mua để app gợi ý.'}</span>`}
            ${thieu.length ? U.bao(`Thiếu hàng: ${thieu.map(k => `${k.ten} tháng ${k.thang.slice(5)}/${k.thang.slice(0, 4)} còn thiếu ${U.luong(k.thieu)}`).join('; ')}.`, 'vang') : ''}
          </section>
        </div>`;
    },
  });
})();
