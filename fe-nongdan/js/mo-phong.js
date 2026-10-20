// Bản mô phỏng (chưa có máy chủ): nói rõ là mô phỏng, chặn đầu vào sai, giữ một trạng thái mẫu chung cho các màn.
// Kho mẫu lưu ở localStorage "av.demo" (cùng tên miền với app Thu mua nên hai app thấy cùng lô mới đăng).
// Khi nối được hệ thống thật (js/he-thong.js phát sự kiện "av-api"), phần mô phỏng tự tắt; bộ chặn đầu vào vẫn giữ.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const quayVideo = (() => { try { return localStorage.getItem('av.quay-video') === '1'; } catch { return false; } })();   // lúc quay video giới thiệu: ẩn dải và tiền tố “Mô phỏng”
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const coApi = () => document.documentElement.dataset.api === 'on';
  const toast = t => window.amToast?.(t);
  const so = s => Number(String(s ?? '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  const tenTan = kg => kg >= 1000 ? (kg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tấn' : kg.toLocaleString('vi-VN') + ' kg';

  /* ---------- Kho mẫu dùng chung (js/kho-mau.js) ---------- */
  const AV = window.AV;
  const kho = { doc: () => AV.doc(), doi: fn => AV.doi(d => { fn(d); return d; }) };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const loDangXem = () => { try { return sessionStorage.getItem('av.lo-xem') || 'xoai'; } catch { return 'xoai'; } };
  const chonLo = id => { try { sessionStorage.setItem('av.lo-xem', id); } catch { /* bỏ qua */ } };

  /* ---------- Bộ chặn đầu vào (luôn bật, kể cả khi có máy chủ) ---------- */
  const chan = (e, loi, o) => { e.preventDefault(); e.stopImmediatePropagation(); toast(loi); o?.focus(); };
  document.addEventListener('click', e => {
    const nut = e.target.closest('.bottom-actions a, .bottom-actions button, a.btn, button.btn');
    if (!nut) return;
    const man = nut.closest('.screen');
    if (!man) return;
    // Đăng nhập: số điện thoại hợp lệ
    if (man.id === 'dang-nhap' && nut.closest('.bottom-actions')) {
      const o = $('#sdt'); const d = o.value.replace(/\D/g, '');
      if (d.length < 9 || d.length > 11) return chan(e, 'Nhập số điện thoại (9 đến 11 số).', o);
    }
    // OTP đăng nhập và mã ký: đủ 6 số
    if ((man.id === 'otp' || man.id === 'ky-otp') && nut.closest('.bottom-actions')) {
      const o = $$('.otp input', man);
      if (!o.every(x => /^\d$/.test(x.value))) return chan(e, 'Nhập đủ mã 6 số.', o.find(x => !x.value));
    }
    // Dịch vụ hỗ trợ chỉ bật khi giá và phương án bất đồng đã chốt (BR-40, BR-41)
    if (man.id === 'phuong-thuc' && nut.closest('.bottom-actions')) {
      const cach = $('[data-chon="cach"] [aria-pressed="true"]', man)?.dataset.khi;
      const chuaChot = !!$('[data-thuoc="cach"][data-khi="ho-tro"] .chua-chot', man);
      if (cach === 'ho-tro' && chuaChot) {
        const hop = $('#av-chua-mo', man) || (() => { man.querySelector('.bottom-actions').insertAdjacentHTML('beforebegin', '<div class="canh-bao-lo" id="av-chua-mo"><img src="assets/ic-canh-bao.svg" alt="" style="width:32px;height:32px"><span>Dịch vụ hỗ trợ <strong>chưa mở</strong>: phí kích hoạt, giá ký và phương án khi không thống nhất còn chưa chốt. Chọn <strong>Tự giao dịch</strong> để đi tiếp, hoặc chờ AgiViet báo giá.</span></div>'); return $('#av-chua-mo', man); })();
        hop.scrollIntoView({ block: 'center' });
        return chan(e, 'Chưa bật được hỗ trợ: giá và phương án chưa chốt. Chọn Tự giao dịch để đi tiếp.');
      }
    }
    // Ô số trên màn: phải lớn hơn 0 (bỏ qua ô ẩn, ô OTP, ô không bắt buộc để trống)
    if (!nut.closest('.bottom-actions, .card-chan, #mot-phan, #gui-he-thong')) return;
    for (const o of $$('input[inputmode="numeric"], input[inputmode="decimal"]', man)) {
      if (o.closest('.otp') || o.offsetParent === null || o.dataset.tuyChon !== undefined) continue;
      if (o.id === 'gia-noi-khac') continue;
      if (o.value.trim() === '' || !(so(o.value) > 0)) return chan(e, 'Số phải lớn hơn 0.', o);
    }
  }, true);

  /* ---------- Phần mô phỏng (chỉ khi chưa có máy chủ) ---------- */
  let batMoPhong = false;
  function moPhong() {
    if (batMoPhong || coApi()) return;
    batMoPhong = true;
    document.body.dataset.moPhong = 'on';
    // Dải nhãn + làm lại kịch bản
    // Dải nhãn ở đầu mỗi màn (không đặt trên khung màn: trình duyệt cuộn tới #id màn sẽ che mất thanh đầu)
    if (!quayVideo) $$('.screen').forEach(m => m.insertAdjacentHTML('afterbegin', '<div class="dai-mo-phong" role="note">Mô phỏng · số liệu mẫu <button type="button" class="av-lam-lai">Làm lại</button></div>'));
    document.addEventListener('click', e => { if (!e.target.closest('.av-lam-lai')) return; AV.datLai(); toast('Đã đưa kịch bản mẫu về ban đầu'); setTimeout(() => location.reload(), 600); });
    // Mọi thông báo đều ghi rõ là mô phỏng
    const t = $('.toast');
    if (t && !quayVideo) new MutationObserver(() => { const x = t.textContent; if (x && !x.startsWith('Mô phỏng')) t.textContent = 'Mô phỏng · ' + x; }).observe(t, { childList: true, characterData: true, subtree: true });

    // Xác minh: không khẳng định đã xác minh thật
    $$('#xac-minh .small.muted').forEach(s => { if (s.textContent.trim() === 'Đã xác minh hôm nay') s.textContent = 'Xác minh mô phỏng · chưa gửi SMS thật'; });
    const xm = $('#xac-minh'); if (xm) xm.dataset.read = xm.dataset.read.replace('Số điện thoại đã xác minh.', 'Bản mô phỏng: số điện thoại chưa được xác minh thật.');
    // Hoàn tất ký: nói rõ là giả lập
    const kx = $('#ky-xong h1');
    if (kx && !$('#av-nhan-ky')) kx.insertAdjacentHTML('afterend', '<p class="canh-bao-lo" id="av-nhan-ky" style="background:var(--cho)"><span style="color:var(--muc)"><strong>Mô phỏng:</strong> chưa có chữ ký thật, mã kiểm tra chỉ để minh họa.</span></p>');
    // "Không phải tôi, khóa ngay": hiện trạng thái đã khóa ngay trên màn
    const khoa = $$('#tai-khoan-nhan a.btn').find(a => a.textContent.includes('Không phải tôi'));
    if (khoa) khoa.addEventListener('click', e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const the = khoa.closest('section.card');
      the.innerHTML = `<div class="row between"><span class="b">Đã khóa yêu cầu •••• 7788</span><span class="chip nho" style="background:var(--gach-nhat);color:var(--gach-dam)">Đã khóa</span></div>
        <span class="small">Tài khoản mới bị hủy. Việc ký và đổi tài khoản nhận tiền tạm khóa cho tới khi xác minh lại. Tài khoản đang dùng •••• 4421 giữ nguyên.</span>
        <span class="xs muted">Mô phỏng: bản thật sẽ tạo mã hỗ trợ P0 và báo người thân dự phòng.</span>
        <button class="btn phu nho" type="button" id="av-mo-khoa">Mở lại (chỉ trong mô phỏng)</button>`;
      $('#av-mo-khoa', the).addEventListener('click', () => location.reload());
      toast('Đã khóa ngay yêu cầu đổi tài khoản');
    }, true);

    // Ngày trong kịch bản
    const hang = $('#hang .hero .tag'); if (hang) hang.textContent = 'Kịch bản minh họa · ngày 8/10/2026';

    const veTatCa = () => { for (const f of [veHang, veChiTietLo, veCapNhat, veXemLai, veTien, veChat, veKhach, veDonChung, veNguCanh, veChungTu, veDangNhap]) { try { f(); } catch (err) { console.error(err); } } };
    window.addEventListener('hashchange', veTatCa);
    AV.theoDoi(veTatCa);                                    // tab bên mua đổi dữ liệu → vẽ lại
    veTatCa();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', veTatCa); else setTimeout(veTatCa, 0);   // danh-muc.js nạp sau file này
  }

  /* ---------- Hàng của tôi: thẻ lô mang ID, lô mới đăng hiện ra ---------- */
  function veHang() {
    const s = $('#hang'); if (!s || !batMoPhong) return;
    const d = kho.doc();
    const the = $$('article.card.lo:not(.av-lo-moi)', s);   // chỉ thẻ mẫu; thẻ lô mới đã có data-lo-mau riêng
    ['xoai', 'thanh-long', 'tom'].forEach((id, i) => { if (the[i]) $$('a[href="#chi-tiet-lo"]', the[i]).forEach(a => { a.dataset.loMau = id; }); });
    $$('.av-lo-moi', s).forEach(x => x.remove());
    const moi = d.lots.filter(l => l.moi);
    const moc = $('.dem', s)?.closest('.row');
    const chan = l => {                                      // chân thẻ theo lượng còn bán được và đơn của lô
      const don = d.orders.filter(o => o.lot === l.id && o.trangThai !== 'cho_ban_xac_nhan');
      const dangGd = don.find(o => o.trangThai !== 'da_nhan_tien');
      const con = AV.conBan(l);
      if (!con) return `<span class="chip cho"><span class="sh sh-vuong"></span>Đã chốt hết · ${dangGd ? 'đang giao dịch' : 'đã xong'}</span><span class="small muted b">${don.map(o => o.code).join(', ')}</span>`;
      return `<span class="chip ok"><span class="sh sh-tron"></span>Đang bán</span><span class="small muted b">Còn bán được ${tenTan(con)}</span>`;
    };
    if (moc) moc.insertAdjacentHTML('afterend', moi.map(l => `<article class="card lo av-lo-moi"><div class="row top-align">
      <span class="thumb" style="overflow:hidden;padding:0"><img src="${l.anh}" alt="" style="width:100%;height:100%;object-fit:cover"></span>
      <div class="grow stack s8"><a class="ten-lo keo-ca" href="#chi-tiet-lo" data-lo-mau="${l.id}">${l.ten}</a>
      <div class="row" style="gap:8px"><span class="luong">${tenTan(l.kg)}</span><span class="qty ${l.coSo === 'da_can' ? 'can' : 'uoc'}"><img src="assets/${l.coSo === 'da_can' ? 'ic-can' : 'ic-uoc'}.svg" alt="">${l.coSo === 'da_can' ? 'Đã cân' : 'Ước tính'}</span></div>
      <span class="meta">Vừa đăng${l.gia ? ' · ' + l.gia.toLocaleString('vi-VN') + ' đ/kg' : ' · chờ khách báo giá'}</span></div></div>
      <div class="lo-foot">${chan(l)}</div></article>`).join(''));
    const dem = $('.dem', s); if (dem) dem.textContent = 3 + moi.length;
    // Lượng đã bán bớt
    for (const l of d.lots.filter(x => !x.moi)) { const a = $(`article.card.lo:not(.av-lo-moi) [data-lo-mau="${l.id}"]`, s); const lg = a?.closest('article')?.querySelector('.luong'); if (lg) lg.textContent = tenTan(l.kg); }
  }
  document.addEventListener('click', e => { const a = e.target.closest('[data-lo-mau]'); if (a) chonLo(a.dataset.loMau); });

  /* ---------- Lô ↔ đơn ↔ chứng từ: chỉ lô xoài mẫu giữ HĐ-0231; lô khác vẽ theo đơn trong kho chung ---------- */
  const gio = t => { const x = new Date(t); return `${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')} ${x.getDate()}/${x.getMonth() + 1}`; };
  const MOC_MAU = { 'thanh-long': ['Đăng tin', '27/9 · bằng giọng nói'], tom: ['Đăng tin', '29/9 · người giúp nhập'] };
  const goc = (el, k = 'goc') => { if (el && !(k in el.dataset)) el.dataset[k] = el.innerHTML; return el?.dataset[k]; };
  const donCuaLo = (d, l) => d.orders.filter(o => o.lot === l.id);
  function veLienKetLo(s, l) {
    const d = kho.doc();
    const hua = $('a.row.between', s), ol = $$('section.card.stack', s).find(x => $('h2', x)?.textContent === 'Đã xảy ra')?.querySelector('ol');
    const hoTro = $('.can-ho-tro-btn', s);
    goc(hua); goc(ol); if (hoTro) hoTro.dataset.maGoc ??= hoTro.dataset.ma; s.dataset.readGoc ??= s.dataset.read || '';
    // Đầu màn: việc của đơn đang chạy trên lô này; chip trạng thái theo lượng còn bán được; nhãn ảnh trung thực
    $$('.av-dau-lo', s).forEach(x => x.remove());
    const chip = $('section.card.row .chip', s); goc(chip);
    const nhanAnh = $('.anh-lo .nhan', s); goc(nhanAnh);
    if (l.id !== 'xoai') {
      const dang = donCuaLo(d, l).filter(o => o.trangThai !== 'da_nhan_tien');
      if (dang.length) $('.xem-truoc', s)?.insertAdjacentHTML('beforebegin', dang.map(o => `<a class="card row av-dau-lo" href="lich.html#lich" data-mo-sau="${o.code}" style="text-decoration:none;color:inherit;border:2px solid var(--mat-ong)"><img src="assets/ic-canh-bao.svg" alt="" style="width:30px;height:30px"><span class="grow stack" style="gap:0"><strong>${o.code} · ${esc(AV.TRANG_THAI[o.trangThai])}${o.phaiTra ? ' · ' + (o.phaiTra / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' triệu' : ''}</strong><span class="small muted">${esc(o.nguoiMua)} · bấm để mở hồ sơ đơn</span></span><svg class="i muted"><use href="#i-tiep"/></svg></a>`).join(''));
      if (chip) chip.innerHTML = AV.conBan(l) ? '<span class="sh sh-tron"></span>Công khai · đang bán' : `<span class="sh sh-vuong"></span>Đã chốt hết · ${dang.length ? 'đang giao dịch' : 'đã xong'}`;
      if (chip) chip.className = 'chip ' + (AV.conBan(l) ? 'ok' : 'cho');
      if (nhanAnh) nhanAnh.textContent = l.moi ? 'Ảnh minh họa · chưa thêm ảnh thật' : nhanAnh.dataset.goc;
    } else {
      if (chip) { chip.innerHTML = chip.dataset.goc; chip.className = 'chip ok'; }
      if (nhanAnh) nhanAnh.textContent = nhanAnh.dataset.goc;
    }
    if (l.id === 'xoai') {
      if (hua) { hua.innerHTML = hua.dataset.goc; hua.setAttribute('href', '#chi-tiet-don'); }
      if (ol) ol.innerHTML = ol.dataset.goc;
      if (hoTro) hoTro.dataset.ma = hoTro.dataset.maGoc;
      s.dataset.read = s.dataset.readGoc;
      const lg = $$('.num', hua)[0]; if (lg) lg.textContent = tenTan(l.hua) + ' ›';
      return;
    }
    const ds = donCuaLo(d, l).filter(o => o.trangThai !== 'cho_ban_xac_nhan');
    const nhan = ds.length ? 'Đã hứa bán · ' + ds.map(o => o.code).join(', ') : l.huaVoi ? 'Đã hứa bán · ' + l.huaVoi : 'Đã hứa bán';
    if (hua) {
      hua.innerHTML = `<span class="b">${esc(nhan)}</span><span class="num" style="font-size:22px">${tenTan(l.hua)}${ds.length ? ' ›' : ''}</span>`;
      if (ds.length) hua.setAttribute('href', 'lich.html#lich'); else hua.removeAttribute('href');
    }
    if (ol) {
      const dau = MOC_MAU[l.id] || ['Đăng tin', l.luc ? gio(l.luc) + ' · vừa đăng' : 'vừa đăng'];
      const moc = [dau, ...donCuaLo(d, l).flatMap(o => o.ls.map(([t, luc]) => [`${o.code} · ${t}`, gio(luc)]))];
      const dangCho = donCuaLo(d, l).find(o => o.trangThai !== 'da_nhan_tien');
      const tiep = dangCho ? `${dangCho.code} · ${AV.TRANG_THAI[dangCho.trangThai]}` : !donCuaLo(d, l).length ? (d.conns.some(c => c.lot === l.id && c.trangThai === 'cho') ? 'Có bên mua chờ bạn trả lời kết nối' : 'Chờ khách hỏi mua') : null;
      ol.innerHTML = moc.map(([t, p]) => `<li class="xong"><span class="cham"><svg class="i i18" style="stroke-width:3"><use href="#i-check"/></svg></span><div class="nd"><strong>${esc(t)}</strong><span class="small muted">${esc(p)}</span></div></li>`).join('')
        + (tiep ? `<li class="cur"><span class="cham">${moc.length + 1}</span><div class="nd"><strong>${esc(tiep)}</strong></div></li>` : '');
    }
    if (hoTro) hoTro.dataset.ma = `Lô ${l.ten.toLowerCase()} · ${tenTan(l.kg)}`;
    s.dataset.read = `Lô ${l.ten}, ${tenTan(l.kg)}, ${l.coSo === 'da_can' ? 'đã cân' : 'ước tính'}. ${nhan}: ${tenTan(l.hua)}. Đã giao ${tenTan(l.giao)}. Còn trống ${tenTan(Math.max(0, l.kg - l.hua))}.`;
  }
  // Chứng từ theo lô đang xem: lô xoài mẫu giữ giấy mẫu; lô khác lấy kết quả cân của đơn chung
  function veChungTu() {
    const s = $('#chung-tu'); if (!s || !batMoPhong) return;
    const khoi = $$('article.card', s);
    const l = kho.doc().lots.find(x => x.id === loDangXem()) || { id: 'xoai' };
    const h1 = $('h1', s);
    $$('.av-ct', s).forEach(x => x.remove());
    khoi.forEach(k => { k.hidden = l.id !== 'xoai'; });
    h1.textContent = l.id === 'xoai' ? 'Chứng từ' : 'Chứng từ · ' + l.ten;
    if (l.id === 'xoai') return;
    const ds = donCuaLo(kho.doc(), l).filter(o => o.kq);
    const html = ds.map(o => `<article class="card stack av-ct"><div class="row"><span class="thumb nho bg-nen"><img src="assets/ic-ky.svg" alt=""></span><span class="grow stack" style="gap:0"><strong>Kết quả cân ${esc(o.code)}</strong><span class="small muted">${esc(o.nguoiMua)} · ${gio(o.kq.nhan_luc)}</span></span></div>
      <div class="bg-nen" style="border-radius:14px;padding:10px 12px"><span class="label">Số trên app</span><p class="small">Nhận ${o.kq.nhan.toLocaleString('vi-VN')} kg · không nhận ${o.kq.tuChoi.toLocaleString('vi-VN')} kg${o.phaiTra ? ' · phải trả ' + o.phaiTra.toLocaleString('vi-VN') + ' đ' : ''}</p></div>
      <span class="chip ${o.kq.nhan_nguon === 'ben_kia_xac_nhan' ? 'ok' : 'cho'} nho" style="align-self:flex-start">${o.kq.nhan_nguon === 'ben_kia_xac_nhan' ? 'Bạn đã xác nhận' : 'Bên mua tự khai · chờ bạn xác nhận'}</span></article>`).join('')
      || `<article class="card stack av-ct"><strong>Lô này chưa có giấy tờ</strong><p class="small muted">Chụp phiếu cân, kết quả kiểm nghiệm hay giấy chứng nhận của lô ${esc(l.ten.toLowerCase())} để khách xem. Kết quả cân của đơn sẽ tự hiện ở đây.</p></article>`;
    s.querySelector('.btn.nang')?.insertAdjacentHTML('afterend', html);
  }

  /* ---------- Chi tiết lô và bán bớt ---------- */
  function veChiTietLo() {
    const s = $('#chi-tiet-lo'); if (!s || !batMoPhong || location.hash !== '#chi-tiet-lo') return;
    const l = kho.doc().lots.find(x => x.id === loDangXem()); if (!l) return;
    $('h1', s).textContent = l.ten;
    s.dataset.title = l.ten;
    $$('.anh-lo img', s).slice(0, 2).forEach(img => { img.src = l.anh; });
    const dong = $$('section.card.stack .row.between .num', s);
    const con = Math.max(0, l.kg - l.hua);
    if (dong[0]) dong[0].innerHTML = `${tenTan(l.kg)} <span class="qty ${l.coSo === 'da_can' ? 'can' : 'uoc'}" style="font-family:var(--f-chu);vertical-align:middle"><img src="assets/${l.coSo === 'da_can' ? 'ic-can' : 'ic-uoc'}.svg" alt="">${l.coSo === 'da_can' ? 'Đã cân' : 'Ước tính'}</span>`;
    if (dong[2]) dong[2].textContent = tenTan(l.hua) + (l.hua ? ' ›' : '');
    if (dong[3]) dong[3].textContent = tenTan(l.giao);
    if (dong[4]) dong[4].textContent = tenTan(con);
    veLienKetLo(s, l);
    const nhanDem = $('#cap-nhat-luong .stack .small.b + .dem-so')?.previousElementSibling; if (nhanDem) nhanDem.textContent = `${l.ten} còn lại`;
    const gt = $('#dem-luong [data-gia-tri]'); if (gt) gt.textContent = (l.kg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('#cap-nhat-luong .bottom-actions a.btn');
    if (!b || !batMoPhong) return;
    const moi = so($('#dem-luong [data-gia-tri]')?.textContent) * 1000;
    if (!(moi > 0)) { e.preventDefault(); e.stopImmediatePropagation(); toast('Lượng còn lại phải lớn hơn 0.'); return; }
    const id = loDangXem();
    const d = kho.doi(x => { const l = x.lots.find(y => y.id === id); if (l) { l.kg = moi; l.coSo = $('#cap-nhat-luong [data-chon="co-so"] [aria-pressed="true"]')?.dataset.khi === 'can' ? 'da_can' : 'uoc_tinh'; } });
    const l = d.lots.find(y => y.id === id);
    b.dataset.toast = moi < l.hua ? `Đã ghi ${tenTan(moi)}: ít hơn ${tenTan(l.hua)} đã hứa với ${l.huaVoi}. Thỏa thuận cũ vẫn giữ; gửi đề nghị điều chỉnh cho bên mua (E03).` : `Đã ghi lượng mới ${tenTan(moi)}.`;
  }, true);
  // Nút +/- của ô đếm (app.js xử lý) → đồng bộ lại màn chi tiết khi quay lại

  /* ---------- Đăng hàng: dùng mặt hàng, lượng, giá vừa nhập ---------- */
  function spDangChon() {
    const id = (localStorage.getItem('am.hang.dang') || 'mango').split(',')[0];
    const dm = window.DANH_MUC?.products.find(p => p.id === id);
    const khac = JSON.parse(localStorage.getItem('am.hang-khac') || '[]').find(p => p.id === id);
    return { id, ten: dm?.name.vi || khac?.name.vi || 'Xoài cát Chu', anh: khac ? 'assets/ic-hang.svg' : `assets/anh/mh/${id}.jpg`, tuNhap: !!khac };
  }
  function veXemLai() {
    if (!batMoPhong || !$('#kiem-tra')) return;
    const sp = spDangChon();
    const kt = $('#kiem-tra');
    const ten = $$('.grow.stack strong', kt)[0]; if (ten) ten.textContent = sp.ten + (sp.tuNhap ? ' (tự nhập)' : '');
    const anhKt = $('.thumb.nho img', kt); if (anhKt) { anhKt.src = sp.anh; anhKt.style.cssText = 'width:100%;height:100%;object-fit:cover'; }
    // Giá tham khảo chỉ có nguồn mẫu cho xoài cát Chu; mặt hàng khác ghi rõ chưa có
    const gtk = $$('.label', kt).find(x => x.textContent.startsWith('Giá tham khảo'))?.parentElement;
    if (gtk) {
      gtk.dataset.goc ??= gtk.innerHTML;
      gtk.innerHTML = sp.id === 'mango' ? gtk.dataset.goc
        : `<span class="label">Giá tham khảo · giá chào mua</span><strong style="font-size:18px">Chưa có giá tham khảo cho ${esc(sp.ten)}</strong><span class="xs muted">Chưa có bản tin giá công khai cho mặt hàng này. Bạn tự nhập giá, hoặc chọn “Nhận báo giá” để khách gửi giá.</span>`;
    }
    const xl = $('#xem-lai'); if (!xl) return;
    if (!$('#av-luong', xl)) xl.querySelector('.bottom-actions')?.insertAdjacentHTML('beforebegin', `<section class="card stack" id="av-luong-khoi"><label class="b" for="av-luong">Lượng đăng bán</label>
      <div class="o-nhap" style="padding-right:12px"><input id="av-luong" inputmode="decimal" value="10" class="lon"><span class="tien-to">tấn</span></div></section>`);
    $('strong.num', xl).textContent = sp.ten;
    $$('.anh-lo img', xl).slice(0, 2).forEach(img => { img.src = sp.anh; img.style.objectFit = 'cover'; });
    const nhanAnh = $('.anh-lo .nhan', xl); if (nhanAnh) nhanAnh.textContent = 'Ảnh minh họa · bạn chưa thêm ảnh';   // bản mô phỏng không chụp ảnh thật
    const tuDat = $('[data-chon="gia"] [aria-pressed="true"]')?.dataset.khi === 'tu';
    const gia = so($('#gia-moi-ky')?.value);
    const oGia = $$('.o-thong-tin', xl).find(o => o.textContent.includes('đ/kg') || o.textContent.includes('Giá'));
    if (oGia) $('strong', oGia).textContent = tuDat ? (gia > 0 ? gia.toLocaleString('vi-VN') + ' đ/kg' : 'Chưa có giá') : 'Khách báo giá';
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('#kiem-tra .bottom-actions a, #kiem-tra .bottom-actions button');
    if (b) {
      const tuDat = $('[data-chon="gia"] [aria-pressed="true"]')?.dataset.khi === 'tu';
      if (tuDat && !(so($('#gia-moi-ky').value) > 0)) { e.preventDefault(); e.stopImmediatePropagation(); toast('Giá phải lớn hơn 0.'); $('#gia-moi-ky').focus(); }
    }
    const dang = e.target.closest('#xem-lai a.btn[href="#xong"]');
    if (!dang || !batMoPhong) return;
    const kg = so($('#av-luong')?.value) * 1000;
    if (!(kg > 0)) { e.preventDefault(); e.stopImmediatePropagation(); toast('Lượng phải lớn hơn 0.'); $('#av-luong')?.focus(); return; }
    const sp = spDangChon();
    const tuDat = $('[data-chon="gia"] [aria-pressed="true"]')?.dataset.khi === 'tu';
    const gia = tuDat ? so($('#gia-moi-ky')?.value) : null;
    const id = 'moi-' + Date.now().toString(36);
    // Ngày hái app ghi được (“5 – 7 tháng 10”) → khoảng ngày để bên mua lọc “Có hàng”
    const nh = ($$('#kiem-tra .xs.muted').find(x => x.textContent === 'Ngày hái')?.nextElementSibling?.textContent || '').match(/(\d+)\s*–\s*(\d+)\s*(?:tháng\s*|\/)(\d+)/);
    const hai = nh ? [`2026-${nh[3].padStart(2, '0')}-${nh[1].padStart(2, '0')}`, `2026-${nh[3].padStart(2, '0')}-${nh[2].padStart(2, '0')}`] : null;
    kho.doi(d => d.lots.unshift({ id, moi: true, ten: sp.ten + (sp.tuNhap ? ' (tự nhập)' : ''), sp: sp.id, kg, coSo: 'uoc_tinh', gia, han: 'Mới đăng', hua: 0, giao: 0, anh: sp.anh, hai, nguoiBan: 'Chị Năm · Mỹ Xương', luc: Date.now() }));
    chonLo(id);
    setTimeout(() => { const x = $('#xong strong.num'); if (x) x.textContent = `${sp.ten} · ${tenTan(kg)}`; }, 0);
  }, true);

  /* ---------- Tiền cọc: một nguồn trạng thái ---------- */
  document.addEventListener('click', e => {
    if (!batMoPhong) return;
    const b = e.target.closest('#coc button');
    if (!b) return;
    if (b.textContent.includes('Chưa thấy tiền')) kho.doi(d => { d.coc = 'chua_thay'; });
    else if (b.textContent.includes('Đã nhận')) kho.doi(d => { d.coc = 'da_nhan'; });
  }, true);
  function veTien() {
    if (!batMoPhong || !$('#tien')) return;
    const coc = kho.doc().coc;
    const dong = $$('#tien .small.muted').find(s => /xác nhận đã nhận 2\/10|chưa thấy tiền cọc/.test(s.textContent));
    if (dong) dong.textContent = coc === 'chua_thay' ? 'Bạn báo chưa thấy tiền cọc · đang đối soát' : 'Bạn xác nhận đã nhận 2/10';
    const tru = $$('#quyet-toan .row.between.small').find(r => r.textContent.includes('cọc'));
    if (tru) tru.innerHTML = coc === 'chua_thay' ? '<span>Tiền cọc: đang đối soát, chưa khấu trừ</span><strong>0</strong>' : '<span>Trừ tiền cọc đã nhận</span><strong>− 10.000.000</strong>';
  }

  /* ---------- Chat mở đúng khách vừa đồng ý ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('#ket-noi .bottom-actions a.btn[href="#chat"]');
    if (a && batMoPhong) { try { sessionStorage.setItem('av.chat', $('#ket-noi strong.num').textContent.trim()); } catch { /* bỏ qua */ } }
  }, true);
  function veChat() {
    if (!batMoPhong || location.hash !== '#chat') return;
    let ten = null; try { ten = sessionStorage.getItem('av.chat'); sessionStorage.removeItem('av.chat'); } catch { /* bỏ qua */ }
    if (!ten) return;
    const s = $('#chat');
    $('.chat-dau .ten strong', s).textContent = ten;
    $('.chat-dau .avatar', s).textContent = ten.trim().split(' ').pop()[0];
    const khung = $('#chat-list', s);
    if (khung) khung.innerHTML = `<p class="xs muted" style="text-align:center">Bắt đầu trò chuyện với ${ten} · hội thoại mô phỏng</p><div class="bong" style="max-width:88%"><span class="xs b muted">${ten}</span>Chào chị, bên em cần xoài cát Chu loại 1 cho đợt sấy giữa tháng.</div>`;
  }

  /* ---------- Bán bớt: bắt đầu từ đúng lô đang xem ---------- */
  function veCapNhat() {
    if (!batMoPhong || location.hash !== '#cap-nhat-luong') return;
    const l = kho.doc().lots.find(x => x.id === loDangXem()); if (!l) return;
    const nhan = $$('#cap-nhat-luong .small.b').find(x => x.nextElementSibling?.id === 'dem-luong'); if (nhan) nhan.textContent = l.ten + ' còn lại';
    window.avDatLuong?.(l.kg / 1000, l.hua / 1000, l.huaVoi || '');
  }

  /* ---------- Thẻ "Thỏa thuận mới · Thanh long 2 tấn" (HĐ-0232) không mở nhầm HĐ-0231 xoài ---------- */
  document.addEventListener('click', e => {
    if (!batMoPhong) return;
    const a = e.target.closest('#lich a.card.row');
    if (!a) return;
    const t = a.textContent;
    const nc = /Thanh long 2 tấn/.test(t) ? { 'HĐ-0231': 'HĐ-0232', 'Bên mua B': 'Bên mua C', 'Xoài cát Chu': 'Thanh long ruột đỏ', 'xoài cát Chu': 'thanh long ruột đỏ', 'Xoài': 'Thanh long', 'xoài': 'thanh long', '10 tấn': '2 tấn', '9 – 10 tấn': '2 tấn', '6.700': '18.000', 'anh/mh/mango.jpg': 'anh/mh/dragon-fruit.jpg' } : null;
    try { nc ? sessionStorage.setItem('av.ngu-canh', JSON.stringify(nc)) : sessionStorage.removeItem('av.ngu-canh'); } catch { /* bỏ qua */ }
  }, true);
  function veNguCanh() {
    if (!batMoPhong || !location.pathname.endsWith('giao-dich.html')) return;
    let nc = null; try { nc = JSON.parse(sessionStorage.getItem('av.ngu-canh')); } catch { /* bỏ qua */ }
    if (!nc || document.body.dataset.nguCanh) return;
    document.body.dataset.nguCanh = 'on';
    const khoa = Object.keys(nc).sort((a, b) => b.length - a.length);
    const thay = x => khoa.reduce((v, k) => v.split(k).join(nc[k]), x);
    const di = document.createTreeWalker(document.querySelector('.app'), NodeFilter.SHOW_TEXT);
    for (let n = di.nextNode(); n; n = di.nextNode()) if (khoa.some(k => n.nodeValue.includes(k))) n.nodeValue = thay(n.nodeValue);
    $$('.app [data-read], .app [data-noi], .app [data-toast], .app img[src]').forEach(el => { for (const at of ['data-read', 'data-noi', 'data-toast', 'src']) { const v = el.getAttribute(at); if (v && khoa.some(k => v.includes(k))) el.setAttribute(at, thay(v)); } });
    $$('.screen').forEach(m => m.insertAdjacentHTML('afterbegin', '')); // giữ cấu trúc
  }

  /* ---------- Khách hỏi mua: nhu cầu và lời mời thật từ app Thu mua ---------- */
  function veKhach() {
    const s = $('#khach'); if (!s || !batMoPhong) return;
    const d = kho.doc();
    const can = $('[data-thuoc="khach-tab"][data-khi="can"]', s);
    if (can) $$('.av-nhu-cau', can).forEach(x => x.remove());
    can?.querySelector('p.small.muted')?.insertAdjacentHTML('afterend', d.needs.map(n => `<div class="card stack av-nhu-cau vien-dam">
      <div class="row"><span class="thumb nho bg-la"><img src="assets/ic-khach.svg" alt=""></span><span class="grow stack" style="gap:0"><strong style="font-size:17px">Cần ${esc(n.kg)} tấn ${esc(n.sp)}</strong><span class="small muted">${esc(AV.NGUOI_MUA)} · ${esc(n.code)} · vừa đăng</span></span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip nho bg-nen">${esc(n.tu || '')} – ${esc(n.den || '')}</span><span class="chip nho ok">Mới</span></div></div>`).join(''));
    const cho = $('[data-thuoc="khach-tab"][data-khi="cho"]', s);
    if (cho) $$('.av-ket-noi', cho).forEach(x => x.remove());
    cho?.insertAdjacentHTML('afterbegin', d.conns.filter(c => c.trangThai === 'cho').map(c => `<div class="card stack vien-dam av-ket-noi">
      <div class="row"><span class="avatar a" style="background:#315c60">Đ</span><span class="grow stack" style="gap:0"><strong style="font-size:17px">${esc(c.nguoiMua)} muốn kết nối</strong><span class="small muted">Về lô ${esc(c.tenLo)} của bạn</span></span></div>
      <div class="grid2" style="gap:8px"><button class="btn" type="button" data-kn-dong-y="${c.id}">Đồng ý</button><button class="btn phu" type="button" data-kn-tu-choi="${c.id}">Không, cảm ơn</button></div></div>`).join(''));
    const nutCho = $('[data-chon="khach-tab"] [data-khi="cho"]', s);
    const soCho = d.conns.filter(c => c.trangThai === 'cho').length;
    if (nutCho) nutCho.innerHTML = 'Chờ nối' + (soCho ? ` <span class="badge-so" style="position:static">${soCho + 1}</span>` : ' <span class="badge-so" style="position:static">1</span>');
  }
  document.addEventListener('click', e => {
    const y = e.target.closest('[data-kn-dong-y]'), n = e.target.closest('[data-kn-tu-choi]');
    if (y) { AV.traLoiKetNoi(y.dataset.knDongY, true); toast('Đã đồng ý. Bên mua được nhắn tin và tạo đơn với lô này.'); }
    if (n) { AV.traLoiKetNoi(n.dataset.knTuChoi, false); toast('Đã từ chối. Bên mua không bị báo lý do, lượt được trả lại.'); }
  });

  /* ---------- Đơn chung với bên mua: thẻ bấm được, nút chính theo trạng thái, hồ sơ đơn / đối soát ---------- */
  const dMoDon = new Set();                                 // mã đơn đang mở hồ sơ (giữ khi vẽ lại)
  try { const m = sessionStorage.getItem('av.mo-don'); if (m) { dMoDon.add(m); sessionStorage.removeItem('av.mo-don'); } } catch { /* bỏ qua */ }
  const vnd = v => Number(v || 0).toLocaleString('vi-VN');
  const CAN_BAN = ['cho_ban_xac_nhan', 'cho_ban_xn_kq', 'bao_da_tra', 'chua_thay_tien'];
  function hoSoDon(o) {
    const doiSoat = o.trangThai === 'chua_thay_tien';
    const baoChua = [...o.ls].reverse().find(([t]) => t.startsWith('Người bán báo chưa thấy tiền'));
    const viec = {
      cho_ban_xac_nhan: 'Bạn: xem lượng, giá rồi bấm Xác nhận đơn. Chưa xác nhận thì lượng chưa bị giữ.',
      da_xac_nhan: 'Bên mua: giao nhận, cân rồi nhập kết quả. Bạn chờ, không cần làm gì.',
      cho_ban_xn_kq: 'Bạn: đối chiếu phiếu cân rồi bấm Đúng hoặc Không đúng.',
      da_chot: `Bên mua: chuyển ${vnd(o.phaiTra)} đ vào tài khoản •••• 4421 rồi ghi trả trên app.`,
      bao_da_tra: 'Bạn: mở sổ ngân hàng. Thấy đủ tiền thì bấm Đã nhận đủ, chưa thấy thì bấm Chưa thấy tiền.',
      chua_thay_tien: 'Bên mua: gửi ủy nhiệm chi. Bạn: xem lại sổ ngân hàng tài khoản •••• 4421. Thấy tiền thì bấm Đã thấy tiền. App không kết luận bên nào sai.',
      da_nhan_tien: 'Đơn đã đóng. Không còn việc cần làm.',
    }[o.trangThai];
    return `<div class="stack av-ho-so" style="gap:10px;border-top:1px solid var(--vien);padding-top:10px">
      ${doiSoat ? '<strong>Hồ sơ đối soát</strong>' : '<strong>Hồ sơ đơn</strong>'}
      <div class="stack small" style="gap:4px">
        <span>Phải trả: <strong>${o.phaiTra ? vnd(o.phaiTra) + ' đ' : 'chưa chốt'}</strong>${o.kq ? ` · ${vnd(o.kq.nhan)} kg × ${vnd(o.gia)} đ` : ''}</span>
        <span>Bên mua báo đã trả: <strong>${o.tra ? vnd(o.tra.so) + ' đ' : 'chưa'}</strong>${o.tra ? ' · ' + gio(o.tra.luc) : ''}</span>
        <span>Chứng từ: ${o.chungTu?.length ? o.chungTu.map(c => `<strong>${esc(c.ten)}</strong> (${gio(c.luc)})`).join(', ') : '<span class="muted">bên mua chưa gửi ủy nhiệm chi</span>'}</span>
        <span>Bạn đã báo: ${baoChua ? `chưa thấy tiền · ${gio(baoChua[1])}` : o.trangThai === 'da_nhan_tien' ? 'đã nhận đủ' : '<span class="muted">chưa có</span>'}</span>
        ${(o.doiSoat || []).map(g => `<span>${g.ben === 'ban' ? 'Bạn' : 'Bên mua'}: ${esc(g.noiDung)} · ${gio(g.luc)}</span>`).join('')}
      </div>
      <div class="card small" style="border:none;background:var(--nen,#f4f1e8);padding:10px 12px"><strong>Việc tiếp theo.</strong> ${viec}</div>
      ${doiSoat ? `<div class="grid2" style="gap:8px"><button class="btn" type="button" data-tien-du="${o.code}">Đã thấy tiền</button><button class="btn phu" type="button" data-ds-van-chua="${o.code}">Vẫn chưa thấy</button></div>` : ''}
      <details class="small"><summary class="b">Lịch sử đơn (${o.ls.length})</summary><ol class="stack" style="gap:4px;padding-left:18px;margin-top:6px">${o.ls.map(([t, l]) => `<li>${esc(t)} <span class="muted">· ${gio(l)}</span></li>`).join('')}</ol></details>
    </div>`;
  }
  function theDon(o) {
    const mo = dMoDon.has(o.code);
    const xem = (nhan, chinh) => `<button class="btn ${chinh ? '' : 'phu'}" type="button" data-mo-don="${o.code}" aria-expanded="${mo}">${mo ? 'Thu gọn' : nhan}</button>`;
    const nut = {
      cho_ban_xac_nhan: () => `<button class="btn" type="button" data-don-xn="${o.code}">Xác nhận đơn</button>`,
      cho_ban_xn_kq: () => `<span class="small">Bên mua nhập (tự khai): nhận <strong>${vnd(o.kq.nhan)} kg</strong>, không nhận ${vnd(o.kq.tuChoi)} kg</span>
        <div class="grid2" style="gap:8px"><button class="btn" type="button" data-kq-dung="${o.code}">Đúng</button><button class="btn canh" type="button" data-kq-sai="${o.code}">Không đúng</button></div>`,
      bao_da_tra: () => `<span class="small">Bên mua báo đã trả <strong>${vnd(o.tra.so)} đ</strong>. Xem tài khoản trước khi bấm.</span>
        <div class="grid2" style="gap:8px"><button class="btn" type="button" data-tien-du="${o.code}">Đã nhận đủ</button><button class="btn phu" type="button" data-tien-chua="${o.code}">Chưa thấy tiền</button></div>`,
      chua_thay_tien: () => xem('Xem đối soát', true),
    }[o.trangThai]?.() || xem('Xem đơn', false);
    const can = CAN_BAN.includes(o.trangThai);
    return `<article class="card stack av-don" data-don="${o.code}" style="border:2px solid ${can ? 'var(--mat-ong)' : 'var(--vien)'}">
      <div class="row av-don-dau" role="button" tabindex="0" data-mo-don="${o.code}" aria-expanded="${mo}" style="cursor:pointer"><span class="thumb nho" style="overflow:hidden;padding:0"><img src="${o.anh}" alt="" style="width:100%;height:100%;object-fit:cover"></span>
      <span class="grow stack" style="gap:2px"><strong>${o.code} · ${esc(o.nguoiMua)}</strong><span class="small muted">${esc(o.tenLo)} · ${vnd(o.kg)} kg × ${vnd(o.gia)} đ${o.phaiTra ? ' · phải trả ' + vnd(o.phaiTra) + ' đ' : ''}</span>
      <span class="chip nho ${can ? 'cho' : 'ok'}" style="align-self:flex-start">${AV.TRANG_THAI[o.trangThai]}</span></span><svg class="i muted" style="transform:rotate(${mo ? 90 : 0}deg)"><use href="#i-tiep"/></svg></div>
      ${nut}${mo ? hoSoDon(o) : ''}</article>`;
  }
  function veDonChung() {
    if (!batMoPhong) return;
    const d = kho.doc();
    const lich = $('#lich');
    if (lich) {
      $$('.av-don, .av-don-tieu', lich).forEach(x => x.remove());
      const h2 = $$('h2.h2', lich).find(h => h.textContent.includes('Đơn đang có'));
      if (h2 && d.orders.length) h2.insertAdjacentHTML('beforebegin', '<h2 class="h2 av-don-tieu">Đơn với bên mua trong app</h2>' + d.orders.map(theDon).join(''));
    }
    const hang = $('#hang');
    if (hang) {
      $$('.av-viec', hang).forEach(x => x.remove());
      const viec = d.orders.filter(o => CAN_BAN.includes(o.trangThai)).length + d.conns.filter(c => c.trangThai === 'cho').length;
      const dau = d.orders.find(o => CAN_BAN.includes(o.trangThai));
      if (viec) $('.hero', hang)?.insertAdjacentHTML('afterend', `<a class="card row av-viec" href="${dau ? 'lich.html#lich' : 'khach.html#khach'}" ${dau ? `data-mo-sau="${dau.code}"` : ''} style="text-decoration:none;color:inherit;border:2px solid var(--mat-ong)"><img src="assets/ic-canh-bao.svg" alt="" style="width:32px;height:32px"><span class="grow"><strong>${viec} việc cần bạn trả lời</strong><span class="small muted" style="display:block">${dau ? `${dau.code} · ${esc(AV.TRANG_THAI[dau.trangThai])}` : 'Từ ' + esc(AV.NGUOI_MUA)}</span></span><svg class="i muted"><use href="#i-tiep"/></svg></a>`);
    }
  }
  document.addEventListener('click', e => {
    const f = (sel, fn) => { const b = e.target.closest(sel); if (b) fn(b); };
    f('[data-mo-sau]', b => { try { sessionStorage.setItem('av.mo-don', b.dataset.moSau); } catch { /* bỏ qua */ } });
    f('[data-mo-don]', b => { const c = b.dataset.moDon; dMoDon.has(c) ? dMoDon.delete(c) : dMoDon.add(c); veDonChung(); document.querySelector(`.av-don[data-don="${c}"]`)?.scrollIntoView({ block: 'nearest' }); });
    f('[data-don-xn]', b => { AV.xacNhanDon(b.dataset.donXn); toast('Đã xác nhận đơn ' + b.dataset.donXn + ' (xác nhận trên app, mô phỏng).'); });
    f('[data-kq-dung]', b => { const o = AV.xacNhanKetQua(b.dataset.kqDung, true); toast(`Đã chốt kết quả. Khoản phải trả ${vnd(o.phaiTra)} đ.`); });
    f('[data-kq-sai]', b => { AV.xacNhanKetQua(b.dataset.kqSai, false); toast('Đã báo không đúng. App giữ số của bên mua, chưa trừ tiền.'); });
    f('[data-tien-du]', b => { const doiSoat = AV.doc().orders.find(o => o.code === b.dataset.tienDu)?.trangThai === 'chua_thay_tien'; AV.xacNhanTien(b.dataset.tienDu, true); toast(doiSoat ? 'Đã báo thấy tiền. Đóng đối soát, đơn đóng.' : 'Đã xác nhận nhận đủ. Đơn đóng.'); });
    f('[data-tien-chua]', b => { dMoDon.add(b.dataset.tienChua); AV.xacNhanTien(b.dataset.tienChua, false); toast('Đã báo chưa thấy tiền. Mở đối soát, chưa ai bị kết luận sai.'); });
    f('[data-ds-van-chua]', b => { AV.ghiDoiSoat(b.dataset.dsVanChua, 'ban', 'đã xem lại sổ ngân hàng, vẫn chưa thấy tiền'); toast('Đã ghi vào hồ sơ đối soát. Bên mua thấy ghi chú này.'); });
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.av-don-dau')) { e.preventDefault(); e.target.click(); } });

  /* ---------- Đăng ký / đăng nhập bản thử (bat-dau.html) → vào app → mời hướng dẫn chỉ tay ---------- */
  const cheDo = () => { try { return sessionStorage.getItem('am.che-do'); } catch { return null; } };
  const datCheDo = v => { try { v ? sessionStorage.setItem('am.che-do', v) : sessionStorage.removeItem('am.che-do'); } catch { /* bỏ qua */ } };
  const vaoApp = () => { try { sessionStorage.setItem('av.moi-vao', 'ban'); } catch { /* bỏ qua */ } datCheDo(null); };
  function veDangNhap() {
    if (!batMoPhong || !$('#chao-mung')) return;
    const dn = $('#dang-nhap'), otp = $('#otp');
    if (dn && !$('.av-demo', dn)) dn.querySelector('.bottom-actions')?.insertAdjacentHTML('beforebegin', '<div class="card row av-demo" style="gap:10px;border:2px dashed var(--mat-ong)"><img src="assets/ic-canh-bao.svg" alt="" style="width:28px;height:28px"><span class="small"><b>Bản thử:</b> số đã điền sẵn, app không gửi tin nhắn thật. Bấm <b>Gửi mã</b> để đi tiếp.</span></div>');
    if (otp && !$('.av-demo', otp)) otp.querySelector('.otp')?.insertAdjacentHTML('afterend', '<div class="card row av-demo" style="gap:10px;border:2px dashed var(--mat-ong)"><span class="grow small"><b>Bản thử:</b> mã là <b style="letter-spacing:.1em">123456</b></span><button class="btn nho" type="button" data-demo-otp>Điền mã</button></div>');
    const dangNhap = cheDo() === 'dang-nhap';
    for (const man of [dn, otp]) {
      if (!man) continue;
      $('[aria-label="Các bước"]', man)?.toggleAttribute('hidden', dangNhap);
      const h1 = $('.top h1', man); if (h1) { h1.dataset.goc ??= h1.textContent; h1.textContent = dangNhap ? 'Đăng nhập' : h1.dataset.goc; }
    }
    // Đăng nhập: xong mã thì vào thẳng app, không qua các bước đăng ký
    if (dangNhap && location.hash === '#vai-tro') { vaoApp(); location.href = 'hang.html#hang'; }
  }
  document.addEventListener('click', e => {
    if (!batMoPhong) return;
    const a = e.target.closest('#chao-mung .bottom-actions a');
    if (a) datCheDo(a.classList.contains('link-btn') ? 'dang-nhap' : 'dang-ky');
    if (e.target.closest('#xac-minh .bottom-actions a')) vaoApp();
    const dien = e.target.closest('[data-demo-otp]');
    if (dien) { const o = $$('#otp .otp input'); '123456'.split('').forEach((s, i) => { if (o[i]) { o[i].value = s; o[i].dispatchEvent(new Event('input', { bubbles: true })); } }); }
  });
  window.addEventListener('hashchange', veDangNhap);

  // Bật mô phỏng khi chắc chắn không có máy chủ
  document.addEventListener('av-api', () => { if (batMoPhong) location.reload(); });
  const meta = document.querySelector('meta[name="agiviet-api"][content="off"]');
  if (meta || !location.pathname.startsWith('/ban/') || !location.protocol.startsWith('http')) moPhong();
  else setTimeout(moPhong, 2500);   // chờ he-thong.js dò máy chủ
})();
