// Công cụ mô phỏng của app mua: Phòng thử (ca kiểm thử phía mua) và Giả lập người bán (người bán mẫu làm việc của họ bằng lệnh thật).
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;
  const NHOM_CA = [...new Set(A.CA_KIEM_THU_MUA.map(c => c.nhom))];
  const KQ = {};

  AM.man('phong-thu', {
    st: () => ({ mo: '' }),
    ve(c) {
      const da = Object.values(KQ);
      return h`${U.bao('Mỗi ca dựng tình huống riêng trên máy chủ mô phỏng trong bộ nhớ, làm các bước như người dùng (Nhà máy sấy Đồng Xanh và người bán mẫu) rồi kiểm từng điểm. "Xem trên app" thay dữ liệu đang dùng bằng kết quả của ca.')}
        <div class="row between">${U.nut(`Chạy tất cả ${A.CA_KIEM_THU_MUA.length} ca`, { bam: 'chayHet', nho: true, icon: 'retry' })}${da.length ? U.chip(`${da.filter(r => r.dat).length}/${da.length} đạt`, da.every(r => r.dat) ? 'xong' : 'loi') : ''}</div>
        ${NHOM_CA.map(nhom => h`<section class="stack s8"><h2 class="h2">${nhom}</h2><div class="luoi-the">${A.CA_KIEM_THU_MUA.filter(ca => ca.nhom === nhom).map(ca => {
          const r = KQ[ca.ma], mo = c.st.mo === ca.ma;
          return U.the(h`<div class="row between top-align"><strong>${ca.ma} · ${ca.ten}</strong>${r ? U.chip(r.dat ? 'Đạt' : 'Không đạt', r.dat ? 'xong' : 'loi') : U.chip('Chưa chạy')}</div><span class="small muted">${ca.kyVong}</span>
            ${r && mo ? h`<ul class="stack s8" style="list-style:none;padding:0;margin:0">${r.kiemTra.map(k => h`<li class="row top-align" style="gap:8px"><span style="color:${k.dat ? 'var(--reu)' : 'var(--gach)'}">${U.icon(k.dat ? 'done' : 'issue', 18)}</span><span class="small grow">${k.moTa}${k.chiTiet ? h`<span class="muted"> · ${k.chiTiet}</span>` : ''}</span></li>`)}${r.loi ? h`<li class="small" style="color:var(--gach)">Lỗi: ${r.loi}</li>` : ''}</ul>` : ''}
            <div class="row" style="gap:8px">${U.nut(r && !mo ? 'Xem điểm kiểm' : r ? 'Chạy lại' : 'Chạy', { bam: r && !mo ? 'xem' : 'chay', kieu: 'phu', nho: true, data: { ma: ca.ma } })}${r?.so ? U.nut('Xem trên app', { bam: 'mo', nho: true, data: { ma: ca.ma }, hoi: `Xem ca ${ca.ma} trên app?|Dữ liệu mô phỏng hiện tại (cả app bán) được thay bằng kết quả của ca này.|Xem trên app` }) : ''}</div>`, { vien: r && !r.dat ? 'loi' : '' });
        })}</div></section>`)}`;
    },
    bam: {
      chay: (c, el) => { KQ[el.dataset.ma] = A.chayCaMua(el.dataset.ma); c.dat({ mo: el.dataset.ma }); },
      xem: (c, el) => c.dat({ mo: el.dataset.ma }),
      chayHet(c) { for (const ca of A.CA_KIEM_THU_MUA) KQ[ca.ma] = A.chayCaMua(ca.ma); const n = Object.values(KQ).filter(r => r.dat).length; c.bao(`Đã chạy ${A.CA_KIEM_THU_MUA.length} ca: ${n} đạt.`, n === A.CA_KIEM_THU_MUA.length ? 'tot' : 'loi'); c.dat({}); },
      mo(c, el) {
        const r = KQ[el.dataset.ma];
        A.xemCa(r);
        const [id, q] = r.man.split('?');
        const url = AM.den(id, Object.fromEntries(new URLSearchParams(q || '')));
        location.href = url.startsWith('#') ? `${AM.MAN_O_TRANG[id]}${url}` : url;
      },
    },
  });

  const NHOM_VIEC = { ket_noi: 'Kết nối', trao_doi: 'Trao đổi', don: 'Đơn', tien: 'Tiền', khac: 'Khác' };
  const NGAY = 864e5;
  AM.man('gia-lap', {
    st: () => ({ nhom: 'don' }),
    ve(c) {
      const n = A.nguoi('mua'), muaId = n?.id ?? A.NGUOI_MUA_MAU[0].nguoi.id;
      const co = c.so.nguoiDung.some(x => x.id === muaId && x.vai === 'mua');
      const viec = co ? A.viecGiaLapBan(muaId) : [], theo = k => viec.filter(v => v.nhom === k), lech = A.dongHo.doLech();
      return h`<div class="hai-cot"><div class="stack">
          ${U.the(h`<strong class="h2">Dữ liệu</strong><span class="small muted">Máy chủ mô phỏng dùng chung app bán và app mua trên trình duyệt này: ${c.so.nguoiDung.length} người dùng, ${c.so.lo.length} lô, ${c.so.don.length} đơn.</span>
            ${U.nut('Nạp kịch bản mẫu (đủ mọi trạng thái)', { bam: 'nap', hoi: 'Nạp kịch bản mẫu?|Thay toàn bộ dữ liệu bằng kịch bản mẫu của cả hai app.|Nạp' })}
            <div class="row" style="gap:8px;flex-wrap:wrap">${U.nut('Bắt đầu trống', { bam: 'trong', kieu: 'phu', nho: true, hoi: 'Bắt đầu trống?|Chỉ giữ chị Năm và 3 bên mua mẫu, chưa có lô, đơn.|Bắt đầu' })}${U.nut('Xóa hết', { bam: 'xoa', kieu: 'canh', nho: true, hoi: 'Xóa toàn bộ dữ liệu?|Không hoàn tác được.|Xóa hết|canh' })}${n ? U.nut('Vào app mua', { den: 'tong-quan.html', kieu: 'phu', nho: true }) : U.nut('Đăng nhập Đồng Xanh', { bam: 'dangNhap', kieu: 'phu', nho: true })}</div>`)}
          ${U.the(h`<strong class="h2">Đồng hồ</strong><span class="small">Giờ mô phỏng: ${U.gioNgay(c.bg)}${lech ? ` (đã tua ${Math.round(lech / 3600e3)} giờ)` : ' (giờ thật)'}</span>
            <div class="row" style="gap:6px;flex-wrap:wrap">${[[A.TRE.nganHang, `+${A.TRE.nganHang / 60000} phút`, 'ngân hàng, đối tác phản hồi'], [NGAY, '+1 ngày', '1 ngày'], [2 * NGAY + 3600e3, '+49 giờ', 'quá hạn cọc'], [15 * NGAY, '+15 ngày', 'tin tự ẩn']].map(([ms, nhan, y]) => U.nut(nhan, { bam: 'tua', kieu: 'phu', nho: true, data: { ms, y } }))}${U.nut('Về giờ thật', { bam: 'gioThat', kieu: 'phu', nho: true, tat: !lech })}</div>`)}
        </div>
        <section class="stack s8"><h2 class="h2">Người bán làm tiếp</h2>
          ${!co ? U.trong('Chưa có bên mua', 'Đăng ký trong app hoặc nạp kịch bản mẫu.') : h`<span class="small muted">Đang giả lập cho bên mua: ${c.so.nguoiDung.find(x => x.id === muaId)?.toChuc?.ten}. Mỗi nút là một lệnh thật của người bán mẫu (chị Năm, Anh Tư Bền, Cô Hai Thu).</span>
            <div class="row" style="gap:6px;flex-wrap:wrap">${Object.entries(NHOM_VIEC).map(([k, t]) => h`<button type="button" class="pill-nhom" aria-pressed="${String(c.st.nhom === k)}" data-bam="_dat" data-k="nhom" data-v="${k}">${t}${theo(k).length ? ` (${theo(k).length})` : ''}</button>`)}</div>
            ${theo(c.st.nhom).length ? '' : U.trong('Người bán chưa có việc ở nhóm này', 'Làm thêm bước bên mua (gửi lời mời, lập đơn, đặt cọc, nhập cân, trả tiền…) rồi quay lại.')}
            ${theo(c.st.nhom).map((v, i) => U.nut(v.nhan, { bam: 'lam', kieu: 'phu', nho: true, data: { i, nhom: c.st.nhom } }))}`}
        </section></div>`;
    },
    bam: {
      nap: c => { A.napKichBan(); c.bao('Đã nạp kịch bản mẫu.'); location.href = 'tong-quan.html'; },
      trong: c => { A.batDauTrong(); c.bao('Đã bắt đầu trống.'); location.href = 'tong-quan.html'; },
      xoa: c => { A.xoaHet(); c.bao('Đã xóa toàn bộ dữ liệu mô phỏng.'); location.href = 'vao-app.html#dang-nhap'; },
      dangNhap: () => { A.datPhien('mua', A.NGUOI_MUA_MAU[0].nguoi); location.href = 'tong-quan.html'; },
      tua(c, el) { const n = A.tua(Number(el.dataset.ms)); c.bao(`Đã tua (${el.dataset.y}).${n ? ` Hệ thống làm ${n} việc tới hạn.` : ''}`); c.dat({}); },
      gioThat(c) { A.dongHo.datLai(); c.bao('Đã về giờ thật.'); c.dat({}); },
      lam(c, el) {
        const muaId = A.nguoi('mua')?.id ?? A.NGUOI_MUA_MAU[0].nguoi.id;
        const v = A.viecGiaLapBan(muaId).filter(x => x.nhom === el.dataset.nhom)[Number(el.dataset.i)];
        if (!v) return;
        const kq = A.lam(v.nguoi, v.lenh);
        c.bao(kq.ok ? `Xong: ${v.nhan}` : kq.loi, kq.ok ? 'tot' : 'loi');
      },
    },
  });
})();
