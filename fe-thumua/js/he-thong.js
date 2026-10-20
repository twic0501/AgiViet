// Nối giao diện Thu mua với hệ thống AgiViet (~/agiviet-he-thong).
// Chỉ bật khi trang phục vụ qua máy chủ và /api/health trả lời; mở file trực tiếp thì giữ bản mẫu tĩnh.
(async () => {
  if (!location.protocol.startsWith('http') || !location.pathname.startsWith('/mua/')) return;   // chỉ khi chạy qua máy chủ AgiViet
  if (document.querySelector('meta[name="agiviet-api"][content="off"]')) return;   // bản hosting tĩnh (chưa có backend)
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const toast = t => window.tmToast?.(t);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const so = v => Number(v || 0).toLocaleString('vi-VN');
  const kgText = kg => kg >= 1000 ? (kg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tấn' : so(kg) + ' kg';
  const ngay = iso => iso ? new Date(iso).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }) : '';
  async function api(method, duong, body, khoa) {
    const r = await fetch('/api' + duong, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json', ...(khoa ? { 'idempotency-key': khoa } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({ ok: false, loi: 'Không đọc được trả lời' }));
    if (!j.ok) { const e = new Error(j.loi); e.ma = j.ma; throw e; }
    return j;
  }
  const baoLoi = e => toast((e.ma ? e.ma + ': ' : '') + e.message);
  const bo = el => { if (!el) return null; const c = el.cloneNode(true); el.replaceWith(c); c.removeAttribute('data-toast'); c.removeAttribute('data-luot'); c.removeAttribute('data-ok'); return c; };

  try { await api('GET', '/health'); } catch { return; }
  document.documentElement.dataset.api = 'on';
  document.dispatchEvent(new Event('av-api'));
  const trang = location.pathname.split('/').pop() || 'index.html';
  let me = (await api('GET', '/me').catch(() => ({}))).dang_nhap ? await api('GET', '/me') : null;

  /* ---------- Cổng đăng nhập (hộp thoại) ---------- */
  if (!me && trang !== 'index.html') {
    document.body.insertAdjacentHTML('beforeend', `<div class="hop-nen" style="position:fixed;inset:0;background:#0008;display:grid;place-items:center;z-index:99">
      <div class="card" style="width:min(420px,92vw);padding:24px;display:flex;flex-direction:column;gap:12px" role="dialog" aria-label="Đăng nhập">
        <div class="hang"><img src="assets/mark.svg" alt="" style="width:36px;height:36px"><strong style="font:800 22px var(--f-so)">Agi<span style="color:var(--vang)">Viet</span> · Thu mua</strong></div>
        <label class="truong"><span class="nhan">Số điện thoại</span><input class="o" id="dn-sdt" inputmode="tel" value="0909000456"></label>
        <button class="btn" type="button" id="dn-gui">Gửi mã</button>
        <label class="truong" id="dn-o-ma" hidden><span class="nhan">Mã 6 số</span><input class="o" id="dn-ma" inputmode="numeric" maxlength="6"></label>
        <label class="truong" id="dn-o-ten" hidden><span class="nhan">Số mới: tên tổ chức</span><input class="o" id="dn-ten" placeholder="Nhà máy, vựa, công ty"></label>
        <button class="btn" type="button" id="dn-vao" hidden>Đăng nhập</button>
        <span class="rat-nho nhat">Bản demo: mã hiện trên màn hình, không gửi SMS. Ai hỏi xin mã là lừa đảo.</span>
      </div></div>`);
    $('#dn-gui').addEventListener('click', async () => { try { const r = await api('POST', '/auth/otp', { phone: $('#dn-sdt').value }); toast(r.ma_demo ? `Mã demo: ${r.ma_demo}` : 'Đã gửi mã'); $('#dn-o-ma').hidden = false; $('#dn-vao').hidden = false; $('#dn-ma').focus(); } catch (e) { baoLoi(e); } });
    $('#dn-vao').addEventListener('click', async () => {
      const ten = $('#dn-ten').value.trim();
      try { await api('POST', '/auth/verify', { phone: $('#dn-sdt').value, code: $('#dn-ma').value, app: 'mua', ...(ten ? { name: ten, org_name: ten } : {}) }); location.reload(); }
      catch (e) { if (e.ma === 'E05' && !ten) { $('#dn-o-ten').hidden = false; toast('Số mới: nhập tên tổ chức để tạo tài khoản bên mua'); } else baoLoi(e); }
    });
    return;
  }
  if (!me) return;

  /* ---------- Đồng bộ gói hiển thị với gói thật ---------- */
  const goiThat = me.org.goi === 'business' ? 'bus' : 'free';
  const dangXem = localStorage.getItem('tm.goi') || 'free';
  if (dangXem !== goiThat && !new URL(location.href).searchParams.get('goi')) { localStorage.setItem('tm.goi', goiThat); location.reload(); return; }

  /* ---------- Khung: tên tổ chức, người dùng, hạn mức thật ---------- */
  const khung = async () => {
    const q = await api('GET', '/quota');
    const tc = $('.sidebar .to-chuc strong'); if (tc) tc.firstChild.textContent = me.org.name;
    const nd = $('.topbar .nguoi-dung strong'); if (nd) nd.textContent = me.user.name;
    const nhanNd = $('.topbar .nguoi-dung .rat-nho'); if (nhanNd) nhanNd.textContent = me.roles.includes('administer') ? 'Quản trị' : 'Thành viên';
    const the = $('.the-luot');
    if (the && window.tmThanhDo) {
      $$('.do-luot', the).forEach(d => d.remove());
      const tieu = $('.tieu', the);
      tieu.insertAdjacentHTML('afterend', [
        window.tmThanhDo({ ten: 'Kết nối, hỏi giá', dung: q.ket_noi.da_dung, giu: q.ket_noi.dang_giu, tran: q.ket_noi.tran }),
        window.tmThanhDo({ ten: 'Tin mua mới', dung: q.tin_mua.da_dung, tran: q.tin_mua.tran }),
      ].join(''));
      if (tieu.firstChild?.nodeType === 3) tieu.firstChild.textContent = `Lượt tháng ${Number(q.ky.slice(5))} `; const t = $('span', tieu); if (t) t.textContent = `mở lại ${q.dat_lai}`;
    }
    const tb = await api('GET', '/notifications');
    const chuong = $('.topbar button[aria-label="Thông báo"]');
    if (chuong) { const c = bo(chuong); c.addEventListener('click', () => toast(tb.items.slice(0, 3).map(n => n.text).join(' · ') || 'Không có thông báo')); $('.cham', c).hidden = !tb.chua_doc; }
    return q;
  };
  const q = await khung().catch(baoLoi);

  /* ---------- Tổng quan ---------- */
  if (trang === 'tong-quan.html') {
    const [don, req, bg] = await Promise.all([api('GET', '/orders'), api('GET', '/requests'), api('GET', '/quotes')]);
    const kpi = $$('.luoi.l4 .kpi .so');
    if (kpi[0]) kpi[0].textContent = req.items.filter(r => r.status === 'cong_khai').length;
    if (kpi[1]) kpi[1].textContent = bg.items.filter(b => b.status === 'gui').length;
    if (kpi[2]) kpi[2].textContent = don.items.filter(o => !['dong', 'huy'].includes(o.status)).length;
    const h1 = $('.tieu-de h1'); if (h1) h1.textContent = `Chào ${me.user.name}`;
  }

  /* ---------- Nguồn hàng: lô thật, kết nối, hỏi giá riêng ---------- */
  if (trang === 'nguon-hang.html') {
    const { items } = await api('GET', '/lots');
    const kn = await api('GET', '/connections');
    const daKN = new Set(kn.quan_he.map(r => r.seller_org));
    const dangCho = new Set(kn.di.filter(c => c.status === 'cho').map(c => c.to_org));
    const luoi = $('#nguon-hang .luoi.l2');
    const dem = $('#nguon-hang p.nho.muted strong'); if (dem) dem.textContent = items.length + ' lô';
    if (luoi) luoi.innerHTML = items.map(l => `<article class="card"><div class="card-than cot">
        <div class="hang tren"><span class="anh-sp" style="width:64px;height:64px;border-radius:14px;overflow:hidden"><img src="${String(l.product_id).startsWith('khac-') ? 'assets/ic-hang.svg' : '/ban/assets/anh/mh/' + l.product_id + '.jpg'}" alt="" style="width:100%;height:100%;object-fit:cover"></span>
          <div class="grow cot g4"><strong style="font-size:16px">${esc(l.phien_ban.note || l.san_pham)} · ${esc(l.nguoi_ban.name)}</strong><span class="nho muted">${esc(l.code)} · ${esc(l.nguoi_ban.province || '')}${l.tu_nhap ? ' · <span class="tag vien">Tự nhập</span>' : ''}</span>
            <div class="hang boc" style="gap:6px"><span class="tag ${l.luong.co_so === 'da_can' ? 'ok' : 'dut'}">${kgText(l.luong.con_trong_kg)} ${l.luong.co_so === 'da_can' ? 'đã cân' : 'ước tính'}</span><span class="tag ${l.chua_xac_nhan_gan_day ? 'canh' : ''}">Xác nhận ${ngay(l.xac_nhan_lan_cuoi)}</span>${l.ngung_nhan_de_nghi ? '<span class="tag canh">Ngừng nhận đề nghị</span>' : ''}</div></div>
          <div class="phai"><span class="nho muted">Giá</span><div class="dam">${l.phien_ban.ask_price_vnd_per_kg ? so(l.phien_ban.ask_price_vnd_per_kg) + ' đ/kg' : 'Nhận báo giá'}</div></div></div></div>
      <div class="card-chan"><button class="btn nho phu" type="button" data-hoi-gia="${l.id}" ${l.ngung_nhan_de_nghi ? 'disabled' : ''}>Hỏi giá riêng</button><span class="grow"></span>
        ${daKN.has(l.seller_org) ? '<span class="tag ok">Đã kết nối</span>' : dangCho.has(l.seller_org) ? '<span class="tag cho">Đang chờ · giữ 1 lượt</span>' : `<button class="btn nho" type="button" data-ket-noi="${l.seller_org}" data-lo="${l.id}" ${l.ngung_nhan_de_nghi ? 'disabled' : ''}>Kết nối</button>`}</div></article>`).join('');
    luoi?.addEventListener('click', async e => {
      const k = e.target.closest('[data-ket-noi]'), h = e.target.closest('[data-hoi-gia]');
      try {
        if (k) { const r = await api('POST', '/connections', { to_org: k.dataset.ketNoi, lot_id: k.dataset.lo, as: 'mua' }); toast(`Đã gửi lời mời, tạm giữ 1 lượt (còn ${r.han_muc.ket_noi.con}/${r.han_muc.ket_noi.tran}). Từ chối hay hết hạn thì trả lại.`); k.outerHTML = '<span class="tag cho">Đang chờ · giữ 1 lượt</span>'; khung(); }
        if (h) { const r = await api('POST', `/lots/${h.dataset.hoiGia}/inquiries`, {}); toast(`Đã hỏi giá riêng: không đăng công khai, không tốn lượt tin${r.tam_giu_luot_ket_noi ? ', tạm giữ 1 lượt kết nối' : ''}.`); h.disabled = true; khung(); }
      } catch (err) { baoLoi(err); }
    });
  }

  /* ---------- Đơn và lịch nhận ---------- */
  const TT = { nhap: 'Nháp', cho_xac_nhan: 'Chờ xác nhận', da_xac_nhan: 'Đã xác nhận', giao_tung_phan: 'Giao từng phần', cho_quyet_toan: 'Chờ quyết toán', dong: 'Đã đóng', huy: 'Đã hủy' };
  if (trang === 'don-hang.html') {
    const { items } = await api('GET', '/orders');
    const tb = $('#don-hang tbody');
    if (tb) tb.innerHTML = items.filter(o => o.status !== 'dong').map(o => `<tr><td><strong>${esc(o.code)}</strong><div class="rat-nho nhat">tạo ${ngay(o.created_at)}</div></td><td>${esc(o.buyer_org === me.org.id ? o.ten_ban : o.ten_mua)}</td><td>—</td><td class="so-o">—</td>
      <td><span class="tag ${o.cach_giao_dich === 'co_ho_tro' ? 'song' : 'vien'}">${o.cach_giao_dich === 'co_ho_tro' ? 'Có hỗ trợ' : 'Tự giao dịch · không phí'}</span></td><td>—</td><td><span class="tag ${o.status === 'cho_xac_nhan' ? 'cho' : 'ok'}">${TT[o.status]}</span></td></tr>`).join('');
    // Điền hàng và giá trị từ chi tiết
    for (const [i, o] of items.filter(o => o.status !== 'dong').entries()) api('GET', `/orders/${o.id}`).then(({ item }) => {
      const v = item.phien_ban.at(-1); const d = v.dong[0]; const tr = tb.rows[i]; if (!tr || !d) return;
      tr.cells[2].textContent = `${d.san_pham} · ${kgText(d.qty_max_g / 1000)}`;
      tr.cells[3].textContent = so(Math.round(d.qty_max_g * d.unit_price_vnd_per_kg / 1000));
      tr.cells[5].textContent = item.dot_giao.length ? `Đợt ${item.dot_giao.filter(x => x.status === 'da_giao').length}/${item.dot_giao.length}` : '—';
      if (item.tranh_chap.some(t => t.status === 'mo')) tr.cells[6].innerHTML = `<span class="tag canh">Tranh chấp ${esc(item.tranh_chap[0].code)}</span>`;
    });
    const dem = $('[data-chon="loc-don"] [data-khi="dang"]'); if (dem) dem.textContent = `Đang làm · ${items.filter(o => o.status !== 'dong').length}`;
  }

  /* ---------- Công nợ, hóa đơn phí, ghi thanh toán ---------- */
  if (trang === 'cong-no.html') {
    const tien = await api('GET', '/money');
    const bangHD = $$('#cong-no .card').find(c => c.querySelector('h2')?.textContent === 'Hóa đơn phí dịch vụ')?.querySelector('tbody');
    const TTHD = { phat_hanh: ['cho', 'Chưa trả'], da_tra: ['ok', 'Đã trả'], khieu_nai: ['vien', 'Đang khiếu nại'], huy: ['vien', 'Đã hủy'] };
    if (bangHD) bangHD.innerHTML = tien.hoa_don_phi.map(h => `<tr><td><strong>${esc(h.code)}</strong><div class="rat-nho nhat">${({ phi_kich_hoat: 'Phí kích hoạt', phi_moc: 'Phí theo mốc', phi_thanh_cong: 'Phí thành công', thue_bao: 'Thuê bao Business' })[h.kind]}</div></td><td>${esc(h.don || 'Gói')}</td><td>${ngay(h.issued_at)}</td><td class="so-o">${so(h.tong_vnd)}</td><td>${ngay(h.due_at)}</td><td><span class="tag ${TTHD[h.status][0]}">${TTHD[h.status][1]}</span></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Chưa có hóa đơn phí.</td></tr>';
    const bangKhoan = $$('#cong-no .card').find(c => c.querySelector('h2')?.textContent === 'Các khoản của đơn đang có')?.querySelector('tbody');
    const TTK = { phai_tra: ['cho', 'Chưa trả'], cho_doi_chieu: ['cho', 'Chờ người bán xác nhận'], dang_doi_soat: ['canh', 'Đang đối soát'], da_xac_nhan: ['ok', 'Người bán đã xác nhận'] };
    if (bangKhoan) bangKhoan.innerHTML = tien.phai_tra.filter(o => o.kind !== 'phi').map(o => `<tr><td>${ngay(o.due_at)}</td><td>${esc(o.don || '')}</td><td>${esc(o.label || o.kind)}</td><td class="so-o">${so(o.amount_vnd)}</td><td><span class="tag ${TTK[o.trang_thai][0]}">${TTK[o.trang_thai][1]}</span></td></tr>`).join('');
    // Ghi thanh toán thật
    const chon = $('#tt-khoan');
    if (chon) {
      const conNo = tien.phai_tra.filter(o => o.con_lai_vnd - (o.bao_da_tra_vnd - o.da_xac_nhan_vnd) > 0);
      const thay = document.createElement('select'); thay.className = 'o'; thay.id = 'tt-khoan';
      thay.innerHTML = conNo.map(o => `<option value="${o.id}" data-con="${o.amount_vnd - o.bao_da_tra_vnd}">${esc(o.don || 'Phí')} · ${esc(o.label || o.kind)} · còn ${so(o.amount_vnd - o.bao_da_tra_vnd)} đ</option>`).join('');
      chon.replaceWith(thay);
      const donO = $('#tt-don'); if (donO) donO.closest('.truong').hidden = true;
      const huongDan = async () => {
        const o = thay.selectedOptions[0]; if (!o) return;
        $('#tt-tien').value = Number(o.dataset.con).toLocaleString('vi-VN');
        const cu = $('#av-canh-bao'); if (cu) cu.remove();
        try {
          const h = await api('POST', `/obligations/${o.value}/instruction`);
          $('#tt-tk').value = `${h.tai_khoan.number_masked} · ${h.tai_khoan.holder_name || ''} · ${h.tai_khoan.bank}`;
          const bao = $('#ghi-thanh-toan .bao.canh'); if (bao) bao.hidden = !h.canh_bao;
          if (bao && h.canh_bao) $('span', bao).innerHTML = `<strong>${esc(h.canh_bao)}</strong> ${esc(h.gioi_han)}`;
        } catch (e) { $('#tt-tk').value = e.message; const bao = $('#ghi-thanh-toan .bao.canh'); if (bao) bao.hidden = true; }
      };
      thay.addEventListener('change', huongDan); huongDan();
      for (const nut of $$('#ghi-thanh-toan .btn.chi-free, #ghi-thanh-toan .btn.chi-bus')) bo(nut)?.addEventListener('click', async () => {
        const tien_ = Number($('#tt-tien').value.replace(/\D/g, ''));
        try {
          await api('POST', '/payments/report', { amount_vnd: tien_, method: 'chuyen_khoan', allocations: [{ obligation_id: thay.value, amount_vnd: tien_ }] }, 'tt-' + thay.value + '-' + tien_);
          toast(`Đã ghi ${so(tien_)} đ. Chờ người bán xác nhận đã nhận.`); location.hash = 'cong-no'; location.reload();
        } catch (e) { baoLoi(e); }
      });
    }
  }
})();
