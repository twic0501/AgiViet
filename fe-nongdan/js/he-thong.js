// Nối giao diện Nhà sản xuất với hệ thống AgiViet (~/agiviet-he-thong).
// Chỉ bật khi trang được phục vụ qua máy chủ (http) và /api/health trả lời; mở file trực tiếp thì giữ bản mẫu tĩnh.
(async () => {
  if (!location.protocol.startsWith('http') || !location.pathname.startsWith('/ban/')) return;   // chỉ khi chạy qua máy chủ AgiViet
  if (document.querySelector('meta[name="agiviet-api"][content="off"]')) return;   // bản hosting tĩnh (chưa có backend)
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const toast = t => window.amToast?.(t);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tien = v => Number(v || 0).toLocaleString('vi-VN') + ' đ';
  const luong = kg => kg >= 1000 ? (kg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tấn' : kg.toLocaleString('vi-VN') + ' kg';
  const anh = id => String(id).startsWith('khac-') ? 'assets/ic-hang.svg' : `assets/anh/mh/${id}.jpg`;
  const ngayVN = iso => iso ? new Date(iso).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }) : '';
  const nho = { doc: k => { try { return JSON.parse(sessionStorage.getItem('av.' + k)); } catch { return null; } }, ghi: (k, v) => { try { sessionStorage.setItem('av.' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } } };

  async function api(method, duong, body, khoa) {
    const r = await fetch('/api' + duong, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json', ...(khoa ? { 'idempotency-key': khoa } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({ ok: false, loi: 'Không đọc được trả lời' }));
    if (!j.ok) { const e = new Error(j.loi); e.ma = j.ma; e.http = r.status; e.truong = j.truong; throw e; }
    return j;
  }
  const baoLoi = e => toast((e.ma ? e.ma + ': ' : '') + e.message);

  try { await api('GET', '/health'); } catch { return; }             // không có máy chủ → bản mẫu tĩnh
  document.documentElement.dataset.api = 'on';
  document.dispatchEvent(new Event('av-api'));
  const trang = location.pathname.split('/').pop() || 'index.html';
  let me = null;
  try { const r = await api('GET', '/me'); me = r.dang_nhap ? r : null; } catch { /* chưa đăng nhập */ }
  const tuDo = ['bat-dau.html', 'index.html', 'nhan-dien.html', 'nguon-anh.html'];
  if (!me && !tuDo.includes(trang)) { location.href = 'bat-dau.html#dang-nhap'; return; }

  const man = {};                                                   // man[id] = hàm vẽ khi vào màn
  const ve = async () => { const id = location.hash.slice(1); if (man[id]) { try { await man[id](); } catch (e) { baoLoi(e); } } };
  window.addEventListener('hashchange', ve);
  const bo = el => { const c = el.cloneNode(true); el.replaceWith(c); c.removeAttribute('data-toast'); return c; };   // bỏ hành vi mẫu

  /* ================= Đăng nhập / đăng ký (bat-dau.html) ================= */
  if (trang === 'bat-dau.html') {
    if (me) { const tieu = $('#chao-mung .bottom-actions .link-btn'); if (tieu) { tieu.textContent = `Vào tiếp: ${me.user.name}`; tieu.href = 'hang.html#hang'; } }
    const guiMa = bo($('#dang-nhap .bottom-actions a.btn'));
    guiMa.addEventListener('click', async e => {
      e.preventDefault();
      const phone = $('#sdt').value;
      try { const r = await api('POST', '/auth/otp', { phone }); nho.ghi('sdt', phone); toast(r.ma_demo ? `Mã demo: ${r.ma_demo} (không gửi SMS thật)` : 'Đã gửi mã'); location.hash = 'otp'; } catch (err) { baoLoi(err); }
    });
    const khung = $('#otp .otp');
    khung.removeAttribute('data-xong');
    const oMa = $$('input', khung);
    const thu = async () => {
      if (!oMa.every(x => x.value)) return;
      const code = oMa.map(x => x.value).join('');
      nho.ghi('ma', code);
      try { await api('POST', '/auth/verify', { phone: nho.doc('sdt'), code, app: 'ban' }); location.href = 'hang.html#hang'; }
      catch (err) { if (err.ma === 'E05') { toast('Số mới: khai vai trò, mặt hàng và hồ sơ để tạo tài khoản'); location.hash = 'vai-tro'; } else { baoLoi(err); oMa.forEach(x => { x.value = ''; }); oMa[0].focus(); } }
    };
    oMa.forEach(o => o.addEventListener('input', () => setTimeout(thu)));
    // Người mới: hoàn tất ở màn Hồ sơ
    const xong = bo($('#ho-so .bottom-actions a.btn'));
    xong.addEventListener('click', async e => {
      e.preventDefault();
      const vaiTro = { tu: 'tu_trong', htx: 'htx' }[$('[data-chon="vai-tro"] [aria-pressed="true"]')?.dataset.khi] || 'tu_trong';
      try {
        if (!me) me = await api('POST', '/auth/verify', { phone: nho.doc('sdt'), code: nho.doc('ma'), app: 'ban', name: $('#ten').value, seller_type: vaiTro, kind: vaiTro === 'htx' ? 'htx' : 'ho', province: $('#tinh').value, commune: $('#xa').value });
        else await api('PUT', '/org/profile', { name: $('#ten').value, province: $('#tinh').value, commune: $('#xa').value, seller_type: vaiTro });
        location.hash = 'xac-minh';
      } catch (err) { baoLoi(err); if (err.ma === 'E02') location.hash = 'dang-nhap'; }
    });
    $$('#xac-minh .bottom-actions a').forEach(a => { a.href = 'hang.html#hang'; });
  }

  /* ================= Hàng của tôi ================= */
  man.hang = async () => {
    const [lots, kn, hg] = await Promise.all([api('GET', '/lots?cua_toi=1'), api('GET', '/connections'), api('GET', '/inquiries')]);
    const s = $('#hang');
    const ten = me.user.name.trim().split(' ').pop();
    $('.chao strong', s).textContent = ten;
    $('.anh-dai-dien', s).textContent = ten[0];
    const cho = kn.den.filter(c => c.status === 'cho').length + hg.den.filter(i => i.status === 'cho').length;
    $('.hero strong', s).textContent = cho ? `${cho} khách đang chờ bạn trả lời` : 'Chưa có khách mới';
    $('.hero .tag', s).textContent = 'Dữ liệu thật';
    $$('article.card.lo', s).forEach(a => a.remove());
    const moc = $('.dem', s).closest('.row');
    $('.dem', s).textContent = lots.items.length;
    moc.insertAdjacentHTML('afterend', lots.items.map(l => `
      <article class="card lo">
        <div class="row top-align">
          <span class="thumb" style="overflow:hidden;padding:0"><img src="${anh(l.product_id)}" alt="" style="width:100%;height:100%;object-fit:cover"></span>
          <div class="grow stack s8">
            <a class="ten-lo keo-ca" href="#chi-tiet-lo" data-lo="${l.id}">${esc(l.phien_ban.note || l.san_pham)}${l.tu_nhap ? ' <span class="chip nho bg-cho">Tự nhập</span>' : ''}</a>
            <div class="row" style="gap:8px"><span class="luong">${luong(l.luong.du_kien_kg)}</span><span class="qty ${l.luong.co_so === 'da_can' ? 'can' : 'uoc'}"><img src="assets/${l.luong.co_so === 'da_can' ? 'ic-can' : 'ic-uoc'}.svg" alt="">${l.luong.co_so === 'da_can' ? 'Đã cân' : 'Ước tính'}</span></div>
            <span class="meta">${l.code} · còn trống ${luong(l.luong.con_trong_kg)} · xác nhận lần cuối ${ngayVN(l.xac_nhan_lan_cuoi)}</span>
          </div>
        </div>
        ${l.ngung_nhan_de_nghi ? `<div class="canh-bao-lo"><img src="assets/ic-canh-bao.svg" alt="" style="width:32px;height:32px"><span>Lâu chưa xác nhận còn hàng. Tin tạm ngừng nhận đề nghị mới.</span><button class="btn nho" type="button" data-vam-con="${l.id}">Vẫn còn</button></div>`
          : `<div class="lo-foot"><span class="chip ${l.chua_xac_nhan_gan_day ? 'cho' : 'ok'}">${l.chua_xac_nhan_gan_day ? 'Chưa xác nhận gần đây' : 'Đang bán'}</span>${l.chua_xac_nhan_gan_day ? `<button class="btn nho" type="button" data-vam-con="${l.id}">Vẫn còn</button>` : `<span class="small muted b">Đã hứa ${luong(l.luong.cam_ket_kg)}</span>`}</div>`}
      </article>`).join('') || '<p class="card small">Chưa có lô nào. Bấm “Chụp để đăng”.</p>');
  };
  document.addEventListener('click', async e => {
    const v = e.target.closest('[data-vam-con]');
    if (v) { try { await api('POST', `/lots/${v.dataset.vamCon}/confirm`); toast('Đã xác nhận còn hàng. App nhắc lại sau 24 giờ.'); ve(); } catch (err) { baoLoi(err); } }
    const lo = e.target.closest('[data-lo]');
    if (lo) nho.ghi('lo', lo.dataset.lo);
  });
  man['chi-tiet-lo'] = async () => {
    const id = nho.doc('lo'); if (!id) return;
    const { item: l } = await api('GET', `/lots/${id}`);
    const s = $('#chi-tiet-lo');
    $('h1', s).textContent = l.phien_ban.note || l.san_pham;
    const tt = $('.card.row .grow.small.muted', s); if (tt) tt.textContent = `Xác nhận lần cuối: ${new Date(l.xac_nhan_lan_cuoi).toLocaleString('vi-VN')}`;
    const nut = $('.grid2 button.btn', s);
    if (nut) bo(nut).addEventListener('click', async () => { try { await api('POST', `/lots/${l.id}/confirm`); toast('Đã xác nhận còn hàng.'); man['chi-tiet-lo'](); } catch (err) { baoLoi(err); } });
  };

  /* ================= Đăng hàng: gửi lô thật ================= */
  if (trang === 'dang.html') {
    $('#xem-lai .bottom-actions')?.insertAdjacentHTML('beforebegin', `<section class="card stack" id="gui-he-thong">
      <span class="b">Gửi lên hệ thống</span>
      <div class="row" style="gap:8px"><div class="o-nhap grow" style="padding-right:12px"><label class="sr-only" for="av-kg">Lượng</label><input id="av-kg" inputmode="numeric" value="10000" class="lon"><span class="tien-to">kg</span></div></div>
      <div class="phan-doan" data-chon="av-co-so" role="group" aria-label="Cân chưa"><button type="button" aria-pressed="true" data-khi="uoc_tinh">Ước tính</button><button type="button" aria-pressed="false" data-khi="da_can">Đã cân</button></div>
      <span class="xs muted">Mặt hàng lấy từ bước Chọn mặt hàng.</span></section>`);
    const nut = $('#xem-lai a.btn[href="#xong"]');
    if (nut) bo(nut).addEventListener('click', async e => {
      e.preventDefault();
      try {
        let sp = (localStorage.getItem('am.hang.dang') || 'mango').split(',')[0];
        if (sp.startsWith('khac-')) {
          const khac = JSON.parse(localStorage.getItem('am.hang-khac') || '[]').find(p => p.id === sp);
          sp = (await api('POST', '/products/custom', { name: khac.name.vi, branch: khac.branch })).item.id;
        }
        const coGia = $('[data-chon="gia"] [aria-pressed="true"]')?.dataset.khi === 'tu';
        const gia = Number(($('#gia-moi-ky')?.value || '').replace(/\D/g, '')) || null;
        const r = await api('POST', '/lots', { product_id: sp, qty_kg: Number($('#av-kg').value.replace(/\D/g, '')), qty_basis: $('[data-chon="av-co-so"] [aria-pressed="true"]').dataset.khi, ask_price: coGia ? gia : null }, 'dang-' + Date.now());
        nho.ghi('lo', r.item.id); location.hash = 'xong';
      } catch (err) { baoLoi(err); }
    });
  }

  /* ================= Khách hỏi mua: kết nối, hỏi giá, chỉ báo bên mua ================= */
  man.khach = async () => {
    const [kn, hg] = await Promise.all([api('GET', '/connections'), api('GET', '/inquiries')]);
    const khoi = $('[data-thuoc="khach-tab"][data-khi="cho"]');
    const loiMoi = kn.den.filter(c => c.status === 'cho' && !c.inquiry_id);   // hỏi giá riêng hiện ở thẻ hỏi giá
    const hoi = hg.den.filter(i => i.status === 'cho');
    khoi.innerHTML = loiMoi.map(c => `<a class="card stack vien-dam" href="#ket-noi" data-ket-noi='${esc(JSON.stringify({ id: c.id, org: c.from_org, ten: c.ten_ben_gui, msg: c.message, ban: c.initiated_by === 'ban' }))}' style="text-decoration:none;color:inherit">
        <div class="row"><span class="avatar a" style="background:#5a4a8a">${esc(c.ten_ben_gui[0])}</span><span class="grow stack" style="gap:0"><strong style="font-size:17px">${esc(c.ten_ben_gui)} muốn nói chuyện</strong><span class="small muted">${c.inquiry_id ? 'Kèm hỏi giá riêng · ' : ''}${new Date(c.created_at).toLocaleString('vi-VN')}</span></span><svg class="i muted"><use href="#i-tiep"/></svg></div></a>`).join('')
      + hoi.map(i => `<a class="card stack" href="#bao-gia" data-hoi-gia='${esc(JSON.stringify({ id: i.id, lo: i.lot_id, ten: i.nguoi_mua, kg: i.qty_g / 1000 }))}' style="text-decoration:none;color:inherit">
        <div class="row"><span class="avatar a" style="background:#2f6f8f">${esc(i.nguoi_mua[0])}</span><span class="grow stack" style="gap:0"><strong style="font-size:17px">${esc(i.nguoi_mua)} hỏi giá riêng</strong><span class="small muted">Lô ${esc(i.lo)} · ${luong(i.qty_g / 1000)}${i.window_text ? ' · giao ' + esc(i.window_text) : ''}</span></span><svg class="i muted"><use href="#i-tiep"/></svg></div>
        <span class="xs muted">Chỉ bạn thấy. Trả lời bằng báo giá.</span></a>`).join('')
      + `<p class="small muted">${loiMoi.length + hoi.length ? '' : 'Chưa có ai chờ. '}Nhận khách, trả lời hỏi giá không tốn gì của bạn.</p>`;
    const nutCho = $('[data-chon="khach-tab"] [data-khi="cho"]'); if (nutCho) nutCho.textContent = `Chờ kết nối${loiMoi.length + hoi.length ? ' · ' + (loiMoi.length + hoi.length) : ''}`;
  };
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-ket-noi]'); if (k) nho.ghi('ket-noi', JSON.parse(k.dataset.ketNoi));
    const h = e.target.closest('[data-hoi-gia]'); if (h) nho.ghi('hoi-gia', JSON.parse(h.dataset.hoiGia));
  });
  man['ket-noi'] = async () => {
    const c = nho.doc('ket-noi'); if (!c) return;
    const s = $('#ket-noi');
    $('strong.num', s).textContent = c.ten;
    $('.avatar', s).textContent = c.ten[0];
    $('.tin-nhan', s).textContent = c.msg ? `“${c.msg}”` : 'Không kèm lời nhắn.';
    const cb = await api('GET', `/orgs/${c.org}/indicator`).catch(() => null);
    const hop = $('.stack.small', s);
    if (hop && cb) hop.innerHTML = cb.du_du_lieu
      ? `<strong>${esc(c.ten)} trả tiền thế nào (có nguồn)</strong><span>${cb.don_da_quyet_toan} đơn đã quyết toán qua app</span><span>Trả đúng hạn <strong>${cb.dot_dung_han}/${cb.tong_dot} đợt</strong>, theo xác nhận của người bán</span>${cb.trung_vi_ngay_tra != null ? `<span>Thường trả sau khi cân <strong>${cb.trung_vi_ngay_tra} ngày</strong></span>` : ''}${cb.nang_luc ? `<span>Năng lực nhận hàng: ${esc(cb.nang_luc)} (đối chiếu ${ngayVN(cb.nang_luc_doi_chieu)})</span>` : ''}<span class="xs muted">${esc(cb.ghi_chu)}</span>`
      : `<strong>${esc(c.ten)} trả tiền thế nào</strong><span>Chưa đủ dữ liệu (dưới 3 đơn đã quyết toán qua app).</span><span class="xs muted">Không phải bảo đảm thanh toán.</span>`;
    const [dongY, khong] = $$('.bottom-actions a.btn', s);
    bo(dongY).addEventListener('click', async e => { e.preventDefault(); try { await api('POST', `/connections/${c.id}/accept`); toast('Đã đồng ý. Hai bên nhắn tin được.'); location.hash = 'khach'; } catch (err) { baoLoi(err); } });
    bo(khong).addEventListener('click', async e => { e.preventDefault(); try { await api('POST', `/connections/${c.id}/decline`); toast('Đã từ chối. Bên kia không bị báo lý do.'); location.hash = 'khach'; } catch (err) { baoLoi(err); } });
  };
  man['bao-gia'] = async () => {
    const h = nho.doc('hoi-gia'); if (!h) return;
    const s = $('#bao-gia');
    const nut = $('.bottom-actions a.btn', s);
    bo(nut).addEventListener('click', async e => {
      e.preventDefault();
      const gia = Number(($('input[inputmode="numeric"]', s)?.value || '').replace(/\D/g, ''));
      const noiKhac = $('#gia-noi-khac')?.value;
      try {
        await api('POST', '/quotes', { lot_id: h.lo, price_inquiry_id: h.id, price: gia, qty_kg: h.kg, alternative: noiKhac ? { terms: noiKhac, co_giay: $('[data-chon="co-giay"] [aria-pressed="true"]')?.dataset.khi === 'giay' } : null });
        toast(`Đã gửi báo giá ${gia.toLocaleString('vi-VN')} đ/kg cho ${h.ten}. Báo giá không giữ hàng.`); nho.ghi('hoi-gia', null); location.hash = 'khach';
      } catch (err) { baoLoi(err); }
    });
  };

  /* ================= Đơn, kết quả cân ================= */
  const TRANG_THAI = { nhap: 'Nháp', cho_xac_nhan: 'Chờ xác nhận', da_xac_nhan: 'Đã xác nhận', giao_tung_phan: 'Đang giao từng phần', cho_quyet_toan: 'Chờ quyết toán', dong: 'Đã đóng', huy: 'Đã hủy' };
  man.lich = async () => {
    const [ds, kq] = await Promise.all([api('GET', '/orders'), api('GET', '/results/pending')]);
    const s = $('#lich');
    const h2 = $$('h2.h2', s).find(h => h.textContent.includes('Đơn đang có'));
    let n = h2.nextElementSibling; while (n && n.matches('a.card.row')) { const x = n.nextElementSibling; n.remove(); n = x; }
    const dang = ds.items.filter(o => !['dong', 'huy'].includes(o.status));
    h2.insertAdjacentHTML('afterend', dang.map(o => {
      const choKq = kq.items.find(r => r.order_id === o.id);
      return `<a class="card row" href="${choKq ? '#ket-qua' : '#chi-tiet-don'}" ${choKq ? `data-kq="${choKq.id}"` : ''} style="text-decoration:none;color:inherit">
        <span class="thumb nho bg-la"><img src="assets/ic-ky.svg" alt=""></span>
        <span class="grow stack" style="gap:2px"><strong>${esc(o.code)} · ${esc(o.ten_mua)}</strong><span class="small muted">${o.cach_giao_dich === 'co_ho_tro' ? 'có hỗ trợ' : 'tự giao dịch, không phí'}</span>
        <span class="chip ${choKq || o.status === 'cho_xac_nhan' ? 'cho' : 'bg-nen'} nho" style="align-self:flex-start">${choKq ? `Chờ bạn xác nhận kết quả đợt ${choKq.seq}` : TRANG_THAI[o.status]}</span></span>
        <svg class="i muted"><use href="#i-tiep"/></svg></a>`;
    }).join('') || '<p class="card small">Chưa có đơn nào.</p>');
  };
  document.addEventListener('click', e => { const k = e.target.closest('[data-kq]'); if (k) nho.ghi('kq', k.dataset.kq); });
  man['ket-qua'] = async () => {
    const { items } = await api('GET', '/results/pending');
    const kq = items.find(r => r.id === nho.doc('kq')) || items[0];
    if (!kq) return;
    const s = $('#ket-qua');
    const m = Object.fromEntries(kq.do.map(d => [d.metric, d.value]));
    $('h1', s).textContent = `Kết quả đợt ${kq.seq}`;
    const cot = $$('.so-can strong', s);
    if (m.ca_bi_g && cot[0]) cot[0].textContent = luong(m.ca_bi_g / 1000).replace(' tấn', ' tấn');
    if (m.bi_g && cot[1]) cot[1].textContent = (m.bi_g / 1000).toLocaleString('vi-VN') + ' kg';
    if (cot[2]) cot[2].textContent = ((kq.accepted_g + kq.rejected_g) / 1000).toLocaleString('vi-VN') + ' kg';
    if (cot[3]) cot[3].textContent = (kq.accepted_g / 1000).toLocaleString('vi-VN') + ' kg';
    if (cot[4]) cot[4].textContent = (kq.rejected_g / 1000).toLocaleString('vi-VN') + ' kg';
    const muc = $('.row.small.muted, .row span.small.muted', s); if (muc) muc.textContent = `${kq.don} · ${kq.ben_nhap} nhập lúc ${new Date(kq.created_at).toLocaleString('vi-VN')} · bản ${kq.version_no}`;
    const gui = $('.bottom-actions a.btn:not(.can-ho-tro-btn)', s);
    bo(gui).addEventListener('click', async e => {
      e.preventDefault();
      const dong = $$('#xac-nhan .dong-xn', s);
      const saiNhan = dong[0]?.querySelector('.sai[aria-pressed="true"]');
      const saiTraLai = dong[1]?.querySelector('.sai[aria-pressed="true"]');
      const phanDoi = saiNhan || saiTraLai || dong[2]?.querySelector('.sai[aria-pressed="true"]');
      try {
        const r = await api('POST', `/results/${kq.id}/confirm`, phanDoi ? { decision: 'phan_doi', disputed_kg: saiTraLai && !saiNhan ? kq.rejected_g / 1000 : undefined, note: 'Người bán không đồng ý kết quả' } : { decision: 'dong_y', hash: kq.hash });
        toast(r.chot ? 'Đã chốt kết quả. Khoản tiền hàng được tạo.' : `Đã phản đối. Phần ${r.khong_tranh_chap_kg} kg không tranh chấp vẫn chốt. Vụ việc ${r.vu_viec.code}.`);
        location.href = r.chot ? 'tien.html#tien' : 'lich.html#tranh-chap';
      } catch (err) { baoLoi(err); }
    });
  };

  /* ================= Tiền hàng ================= */
  man.tien = async () => {
    const tien_ = await api('GET', '/money');
    const cho = [];
    for (const o of tien_.phai_nhan) for (const k of o.khoan_tra) if (!k.xac_nhan) cho.push({ ...k, nv: o });
    const the = $('#tien .the-tien');
    if (!the) return;
    const k = cho[0];
    if (!k) { the.innerHTML = `<span class="b" style="font-size:15px;color:#d5e2d6">Không có khoản nào chờ bạn xác nhận</span><strong class="so">${tien(tien_.phai_nhan.reduce((s, o) => s + o.con_lai_vnd, 0))}</strong><span class="xs" style="color:#d5e2d6">Tổng còn phải nhận · dữ liệu thật</span>`; return; }
    $('.b', the).textContent = `${k.nv.don || ''} · ${k.nv.label || 'Tiền hàng'} · bên mua báo đã trả ${new Date(k.created_at).toLocaleString('vi-VN')}`;
    $('.so', the).textContent = tien(k.amount_vnd);
    const noi = $('[data-noi]', the); if (noi) noi.dataset.noi = `${k.amount_vnd.toLocaleString('vi-VN')} đồng`;
    const nhan = async (kind, amount_vnd) => { try { const r = await api('POST', `/payments/${k.payment_id}/receipt`, { kind, amount_vnd }); toast(kind === 'du' ? 'Đã xác nhận nhận đủ.' : `Đã ghi. Mở đối soát ${r.doi_soat || ''}. Chưa ai bị kết luận sai.`); man.tien(); } catch (err) { baoLoi(err); } };
    bo($('[data-da-nhan]', the)).addEventListener('click', () => nhan('du'));
    const chuaThay = $$('#tra-loi-dot-1 .grid2 button', the)[1]; if (chuaThay) bo(chuaThay).addEventListener('click', () => nhan('chua_thay'));
    const guiMotPhan = $('#mot-phan button.btn', the); if (guiMotPhan) bo(guiMotPhan).addEventListener('click', () => nhan('mot_phan', Number($('#so-da-nhan').value.replace(/\D/g, ''))));
    const oSo = $('#so-da-nhan'); if (oSo) oSo.value = Math.round(k.amount_vnd * 0.9).toLocaleString('vi-VN');
  };

  /* ================= Tôi, tài khoản nhận tiền, thông báo ================= */
  man.toi = async () => {
    const s = $('#toi'); if (!s || $('#av-dang-xuat')) return;
    s.insertAdjacentHTML('beforeend', `<p class="small muted" style="text-align:center">Đang dùng: ${esc(me.user.name)} · ${esc(me.user.phone)} · ${esc(me.org.name)}</p><button class="btn phu" id="av-dang-xuat" type="button">Đăng xuất</button>`);
    $('#av-dang-xuat').addEventListener('click', async () => { await api('POST', '/auth/logout'); location.href = 'bat-dau.html#chao-mung'; });
  };
  man['tai-khoan-nhan'] = async () => {
    const { items } = await api('GET', '/payout-accounts');
    const s = $('#tai-khoan-nhan');
    const dung = items.find(a => a.status === 'dang_dung');
    const cho = items.find(a => a.yeu_cau && ['cho', 'xac_minh_thu_cong'].includes(a.yeu_cau.status));
    const dau = $('section.card.row', s);
    if (dau) dau.innerHTML = dung ? `<span class="thumb nho bg-la"><img src="assets/ic-tien.svg" alt=""></span><span class="grow stack" style="gap:2px"><strong>${esc(dung.number_masked)} · ${esc(dung.holder_name)}</strong><span class="small muted">${esc(dung.bank)} · đang dùng từ ${ngayVN(dung.activated_at)}</span></span><span class="chip nho bg-la">Đang dùng</span>` : '<span class="grow">Chưa có tài khoản nhận tiền đã xác minh.</span>';
    const the = $('section.card.stack[style*="mat-ong"]', s);
    if (the) {
      if (!cho) the.hidden = true;
      else {
        the.hidden = false;
        $('.row.between .b', the).textContent = `Yêu cầu thêm ${cho.number_masked}`;
        $('.row.between .chip', the).textContent = cho.yeu_cau.status === 'xac_minh_thu_cong' ? 'Chờ xác minh thủ công' : 'Chờ xác minh';
        const gio = Math.max(0, Math.ceil((Date.parse(cho.yeu_cau.cooldown_until) - Date.now()) / 3600e3));
        const li = $$('.moc-list li', the)[2]; if (li) $('.small', li).textContent = `Còn ${gio} giờ. Vừa lấy lại tài khoản hoặc đổi SIM thì chờ 72 giờ.`;
        const nut = $('a.btn', the);
        bo(nut).addEventListener('click', async e => { e.preventDefault(); try { const r = await api('POST', `/payout-change-requests/${cho.yeu_cau.id}/deny`); toast(`Đã khóa ngay. Mã hỗ trợ ${r.ticket}.`); man['tai-khoan-nhan'](); } catch (err) { baoLoi(err); } });
      }
    }
  };
  man['thong-bao'] = async () => {
    const { items } = await api('GET', '/notifications');
    const [moi, cu] = $$('#thong-bao nav.menu');
    const dong = n => `<a href="${esc(n.link ? n.link.split('#')[1] ? '#' + n.link.split('#')[1] : '#hang' : '#hang')}"><span class="ic-menu bg-${n.read_at ? 'nen' : 'cho'}"><img src="assets/ic-khach.svg" alt=""></span><span class="grow stack" style="gap:0"><span style="font-size:16px">${esc(n.text)}</span><span class="xs muted">${new Date(n.at).toLocaleString('vi-VN')}</span></span></a>`;
    if (moi) moi.innerHTML = items.filter(n => !n.read_at).map(dong).join('') || '<p class="small muted" style="padding:12px 16px">Không có thông báo mới.</p>';
    if (cu) cu.innerHTML = items.filter(n => n.read_at).map(dong).join('');
    api('POST', '/notifications/read').catch(() => {});
  };

  // Chuông: số thông báo chưa đọc
  if (me) api('GET', '/notifications').then(r => $$('.badge-so').forEach(b => { b.textContent = r.chua_doc; b.hidden = !r.chua_doc; })).catch(() => {});
  ve();
  if (!location.hash && man[$('.screen.active')?.id]) man[$('.screen.active').id]();
})();
