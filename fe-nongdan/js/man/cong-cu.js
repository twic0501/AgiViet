// Công cụ mô phỏng (không có trong app thật): Phòng thử chạy các ca kiểm thử của app bán và mở kết quả ngay trên app;
// Giả lập bên mua nạp dữ liệu mẫu, tua đồng hồ, cho các bên mua mẫu làm việc của họ bằng lệnh thật.
(() => {
  if (!window.AM) return;
  const A = window.AVN, U = AM.ui, { h } = A;
  const NHOM_CA = [...new Set(A.CA_KIEM_THU_BAN.map(c => c.nhom))];
  const KQ = {};   // kết quả các ca đã chạy trong lần mở trang này

  AM.man('phong-thu', {
    st: () => ({ mo: '' }),
    ve(c) {
      const da = Object.values(KQ);
      return {
        than: h`${U.bao('Mỗi ca dựng tình huống riêng trên máy chủ mô phỏng trong bộ nhớ, làm các bước như người dùng (người bán và bên mua mẫu) rồi kiểm từng điểm. Chạy ca không đụng dữ liệu đang dùng; bấm "Xem trên app" mới thay dữ liệu bằng kết quả của ca.')}
          <div class="row between">${U.nut(`Chạy tất cả ${A.CA_KIEM_THU_BAN.length} ca`, { bam: 'chayHet', nho: true, icon: 'retry' })}${da.length ? U.chip(`${da.filter(r => r.dat).length}/${da.length} đạt`, da.every(r => r.dat) ? 'xong' : 'loi') : ''}</div>
          ${NHOM_CA.map(nhom => h`<section class="stack s8"><h2 class="h2">${nhom}</h2>${A.CA_KIEM_THU_BAN.filter(ca => ca.nhom === nhom).map(ca => {
            const r = KQ[ca.ma], mo = c.st.mo === ca.ma;
            return U.the(h`<div class="row between top-align"><strong>${ca.ma} · ${ca.ten}</strong>${r ? U.chip(r.dat ? 'Đạt' : 'Không đạt', r.dat ? 'xong' : 'loi') : U.chip('Chưa chạy')}</div>
              <span class="small muted">${ca.kyVong}</span>
              ${r && mo ? h`<ul class="stack s8" style="list-style:none;padding:0;margin:0">${r.kiemTra.map(k => h`<li class="row top-align" style="gap:8px"><span style="color:${k.dat ? 'var(--reu)' : 'var(--gach)'}">${U.icon(k.dat ? 'done' : 'issue', 18)}</span><span class="small grow">${k.moTa}${k.chiTiet ? h`<span class="muted"> · ${k.chiTiet}</span>` : ''}</span></li>`)}${r.loi ? h`<li class="small" style="color:var(--gach)">Lỗi khi chạy: ${r.loi}</li>` : ''}</ul>` : ''}
              <div class="grid2">${U.nut(r && !mo ? 'Xem điểm kiểm' : r ? 'Chạy lại' : 'Chạy', { bam: r && !mo ? 'xem' : 'chay', kieu: 'phu', nho: true, data: { ma: ca.ma } })}
                ${r?.so ? U.nut('Xem trên app', { bam: 'mo', nho: true, data: { ma: ca.ma }, hoi: `Xem ca ${ca.ma} trên app?|Dữ liệu mô phỏng hiện tại (cả bên app mua) được thay bằng kết quả của ca này. Muốn quay lại dữ liệu mẫu thì vào Giả lập, nạp kịch bản mẫu.|Xem trên app` }) : ''}</div>`, { vien: r && !r.dat ? 'loi' : '' });
          })}</section>`)}`,
      };
    },
    bam: {
      chay: (c, el) => { KQ[el.dataset.ma] = A.chayCa(el.dataset.ma); c.dat({ mo: el.dataset.ma }); },
      xem: (c, el) => c.dat({ mo: el.dataset.ma }),
      chayHet(c) { for (const ca of A.CA_KIEM_THU_BAN) KQ[ca.ma] = A.chayCa(ca.ma); const n = Object.values(KQ).filter(r => r.dat).length; c.bao(`Đã chạy ${A.CA_KIEM_THU_BAN.length} ca: ${n} đạt.`, n === A.CA_KIEM_THU_BAN.length ? 'tot' : 'loi'); c.dat({}); },
      mo(c, el) {
        const r = KQ[el.dataset.ma];
        A.xemCa(r);
        c.bao(`Đã nạp dữ liệu ca ${el.dataset.ma}. Bạn đang là ${A.NGUOI_BAN_MAU.ten}.`);
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
      const n = A.nguoi('ban'), banId = n?.id ?? A.NGUOI_BAN_MAU.id;
      const coBan = c.so.nguoiDung.some(x => x.id === banId && x.vai === 'ban');
      const viec = coBan ? A.viecGiaLap(banId) : [];
      const theo = k => viec.filter(v => v.nhom === k), lech = A.dongHo.doLech();
      return {
        than: h`${U.the(h`<strong class="h2">Dữ liệu</strong><span class="small muted">Máy chủ mô phỏng dùng chung cho app bán và app mua trên trình duyệt này. Hiện có ${c.so.nguoiDung.length} người dùng, ${c.so.lo.length} lô, ${c.so.don.length} đơn.</span>
            ${U.nut('Nạp kịch bản mẫu (đủ mọi trạng thái)', { bam: 'nap', hoi: 'Nạp kịch bản mẫu?|Thay toàn bộ dữ liệu bằng kịch bản mẫu: lô, đơn ở đủ 13 trạng thái, tin nhắn, báo giá, sổ vườn, tiền, dịch vụ.|Nạp' })}
            <div class="grid2">${U.nut('Bắt đầu trống', { bam: 'trong', kieu: 'phu', nho: true, hoi: 'Bắt đầu trống?|Xóa dữ liệu, chỉ giữ chị Năm (đã xác minh) và 3 bên mua mẫu.|Bắt đầu' })}${U.nut('Xóa hết', { bam: 'xoa', kieu: 'canh', nho: true, hoi: 'Xóa toàn bộ dữ liệu?|Xóa mọi người dùng, lô, đơn và về giờ thật. Không hoàn tác được.|Xóa hết|canh' })}</div>
            ${n ? U.nut('Vào app bán', { den: 'hom-nay.html', kieu: 'phu', nho: true }) : U.nut('Đăng nhập chị Năm', { bam: 'dangNhap', kieu: 'phu', nho: true })}`)}
          ${U.the(h`<strong class="h2">Đồng hồ</strong><span class="small">Giờ mô phỏng: ${U.gioNgay(c.bg)}${lech ? ` (đã tua ${Math.round(lech / 3600e3)} giờ)` : ' (giờ thật)'}</span>
            <div class="luoi-3">${[[A.TRE.nganHang, `+${A.TRE.nganHang / 60000} phút`, 'ngân hàng, đối tác phản hồi'], [NGAY, '+1 ngày', '1 ngày'], [2 * NGAY + 3600e3, '+49 giờ', 'quá hạn cọc'], [7 * NGAY, '+7 ngày', 'hết cách ly'], [15 * NGAY, '+15 ngày', 'tin tự ẩn']].map(([ms, nhan, y]) => U.nut(nhan, { bam: 'tua', kieu: 'phu', nho: true, data: { ms, y } }))}
              ${U.nut('Về giờ thật', { bam: 'gioThat', kieu: 'phu', nho: true, tat: !lech })}</div>`)}
          <section class="stack s8"><h2 class="h2">Bên mua làm tiếp</h2>
            ${!coBan ? U.trong('Chưa có người bán', 'Đăng ký trong app hoặc nạp kịch bản mẫu trước.', U.nut('Tạo chị Năm', { bam: 'trong', nho: true })) : h`
              <span class="small muted">Đang giả lập cho người bán: ${c.so.nguoiDung.find(x => x.id === banId)?.ten}. Mỗi nút là một lệnh thật của bên mua mẫu.</span>
              <div class="cuon-ngang">${Object.entries(NHOM_VIEC).map(([k, t]) => h`<button type="button" class="pill-nhom" aria-pressed="${String(c.st.nhom === k)}" data-bam="_dat" data-k="nhom" data-v="${k}">${t}${theo(k).length ? ` (${theo(k).length})` : ''}</button>`)}</div>
              ${c.st.nhom === 'khac' ? [0, 1, 2].map(i => { const m = A.lenhNhuCauMau(i); return U.nut(`${m.nguoi.ten} đăng tin cần mua "${m.lenh.ten}"`, { bam: 'nhuCau', kieu: 'phu', nho: true, data: { i } }); }) : ''}
              ${!theo(c.st.nhom).length && c.st.nhom !== 'khac' ? U.trong('Bên mua chưa có việc ở nhóm này', 'Làm thêm bước bên người bán (đăng lô, đồng ý kết nối, xác nhận đơn…) rồi quay lại.') : ''}
              ${theo(c.st.nhom).map((v, i) => U.nut(v.nhan, { bam: 'lam', kieu: 'phu', nho: true, data: { i, nhom: c.st.nhom } }))}`}
          </section>`,
        duoi: U.nut('Mở Phòng thử', { den: '#phong-thu', kieu: 'phu' }),
      };
    },
    bam: {
      nap: c => { A.napKichBan(); c.bao('Đã nạp kịch bản mẫu: 20 ngày làm ăn của chị Năm.'); location.href = 'hom-nay.html'; },
      trong: c => { A.batDauTrong(); c.bao('Chị Năm đã đăng ký, chưa có lô hay đơn nào.'); location.href = 'hom-nay.html'; },
      xoa: c => { A.xoaHet(); c.bao('Đã xóa toàn bộ dữ liệu mô phỏng.'); location.href = 'bat-dau.html#chao-mung'; },
      dangNhap: c => { A.datPhien('ban', A.NGUOI_BAN_MAU); location.href = 'hom-nay.html'; },
      tua(c, el) { const n = A.tua(Number(el.dataset.ms)); c.bao(`Đã tua (${el.dataset.y}).${n ? ` Hệ thống làm ${n} việc tới hạn.` : ''}`); c.dat({}); },
      gioThat(c) { A.dongHo.datLai(); c.bao('Đã về giờ thật.'); c.dat({}); },
      lam(c, el) {
        const banId = A.nguoi('ban')?.id ?? A.NGUOI_BAN_MAU.id;
        const v = A.viecGiaLap(banId).filter(x => x.nhom === el.dataset.nhom)[Number(el.dataset.i)];
        if (!v) return;
        const kq = A.lam(v.nguoi, v.lenh);
        c.bao(kq.ok ? `Xong: ${v.nhan}` : kq.loi, kq.ok ? 'tot' : 'loi');
      },
      nhuCau(c, el) { const m = A.lenhNhuCauMau(Number(el.dataset.i)); const kq = A.lam(m.nguoi, m.lenh); c.bao(kq.ok ? `${m.nguoi.ten} đăng tin cần mua.` : kq.loi, kq.ok ? 'tot' : 'loi'); },
    },
  });
})();
