// Chọn mặt hàng hai tầng (chuyển từ ProductPicker của ~/rnd idea sang JS thuần):
// 1. Bốn ô ảnh lớn: Trồng trọt, Chăn nuôi (Nông sản) · Nuôi trồng, Đánh bắt (Thủy sản).
// 2. Bấm một ô: mở nhóm dạng tab và lưới ảnh mặt hàng để bấm chọn.
// Ô tìm dùng chung: gõ là ra ngay mặt hàng ở mọi lĩnh vực.
//
// Cách dùng: <div data-chon-hang="ten" data-che-do="nhieu|mot" data-mac-dinh="mango,shrimp"></div>
// Lựa chọn lưu ở localStorage "am.hang.<ten>"; phần tử [data-hang-tom-tat="ten"] hiện tóm tắt.
// Không có trong danh mục: ô "+ Mặt hàng khác" cho tự nhập tên và lĩnh vực (nhãn "Tự nhập").
(() => {
  const DM = window.DANH_MUC;
  if (!DM) return;
  const $ = (sel, root = document) => root.querySelector(sel);
  const boDau = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  // Mặt hàng tự nhập (không có trong danh mục): lưu chung ở localStorage "am.hang-khac".
  const khac = () => { try { return JSON.parse(localStorage.getItem('am.hang-khac') || '[]'); } catch { return []; } };
  const luuKhac = ds => { try { localStorage.setItem('am.hang-khac', JSON.stringify(ds)); } catch { /* bỏ qua */ } };
  const sp = id => DM.products.find(p => p.id === id) || khac().find(p => p.id === id);
  const laKhac = id => id.startsWith('khac-');
  const anh = id => laKhac(id) ? 'assets/ic-hang.svg' : `assets/anh/mh/${id}.jpg`;
  const tenHien = id => sp(id).name.vi + (laKhac(id) ? ' (tự nhập)' : '');
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MUI_XUONG = '<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  const DAU_TICH = '<svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const KINH = '<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
  const X = '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  const doc = ten => { try { const v = localStorage.getItem('am.hang.' + ten); return v === null ? null : v.split(',').filter(sp); } catch { return null; } };
  const ghi = (ten, ds) => { try { localStorage.setItem('am.hang.' + ten, ds.join(',')); } catch { /* bỏ qua */ } };

  function tomTat(ten, ds) {
    document.querySelectorAll(`[data-hang-tom-tat="${ten}"]`).forEach(el => {
      el.innerHTML = ds.length
        ? ds.map(id => `<span class="pick-chip tinh${laKhac(id) ? ' khac' : ''}"><img src="${anh(id)}" alt="">${esc(tenHien(id))}</span>`).join('')
        : '<span class="muted small">Chưa chọn mặt hàng nào.</span>';
    });
  }

  function gan(goc) {
    const ten = goc.dataset.chonHang;
    const mot = goc.dataset.cheDo === 'mot';
    let chon = doc(ten) ?? (goc.dataset.macDinh || '').split(',').filter(sp);
    let mo = chon[0] ? sp(chon[0]).branch : null;
    let tab = null;
    let tim = '';
    let form = null;   // { ten, nhanh } khi đang mở ô nhập mặt hàng khác

    goc.classList.add('product-picker');
    goc.innerHTML = `<label class="picker-search">${KINH}<input type="search" placeholder="Tìm: xoài, heo, tôm, mực…" aria-label="Tìm mặt hàng" autocomplete="off">
      <button type="button" class="picker-clear" aria-label="Xóa tìm kiếm" hidden>${X}</button>
      <button class="nut-mic" type="button" aria-label="Nói tên mặt hàng" data-toast="Đang nghe tên mặt hàng…"><img src="assets/ic-mic.svg" alt=""></button></label>
      <div class="pick-tray" aria-live="polite"></div><div class="pick-body"></div>`;
    const o = $('input', goc), xoa = $('.picker-clear', goc), khay = $('.pick-tray', goc), than = $('.pick-body', goc);

    const the = p => { const on = chon.includes(p.id); return `<button type="button" class="pick-card${on ? ' selected' : ''}" role="${mot ? 'radio' : 'checkbox'}" aria-checked="${on}" data-sp="${p.id}">
      <img src="${anh(p.id)}" alt="" loading="lazy"${laKhac(p.id) ? ' class="anh-khac"' : ''}><span class="pick-name">${esc(p.name.vi)}${laKhac(p.id) ? '<small>Tự nhập</small>' : ''}</span><span class="pick-tick" aria-hidden="true">${on ? DAU_TICH : ''}</span></button>`; };

    function bang(nhanh) {
      const ds = DM.groups.filter(g => g.branch === nhanh);
      const hien = ds.find(g => g.id === tab) || ds[0];
      return `<div class="pick-panel"><div class="pick-tabs" role="tablist" aria-label="Nhóm mặt hàng">${ds.map(g => {
        const n = chon.filter(id => sp(id).group === g.id).length;
        return `<button type="button" role="tab" aria-selected="${g.id === hien.id}" class="${g.id === hien.id ? 'active' : ''}" data-tab="${g.id}">${esc(g.name.vi)}<b>${n || ''}</b></button>`;
      }).join('')}</div><div class="pick-grid" role="${mot ? 'radiogroup' : 'group'}">${DM.products.filter(p => p.group === hien.id).map(the).join('')}${khac().filter(p => p.branch === nhanh).map(the).join('')}${nutThem('', nhanh)}</div></div>`;
    }

    function ve() {
      xoa.hidden = !tim;
      khay.hidden = !chon.length;
      khay.innerHTML = chon.map(id => `<button type="button" class="pick-chip${laKhac(id) ? ' khac' : ''}" data-bo="${id}" aria-label="Bỏ chọn ${esc(tenHien(id))}"><img src="${anh(id)}" alt="">${esc(tenHien(id))}${X}</button>`).join('');
      if (form) { than.innerHTML = oNhap(); const o2 = $('#ten-khac-' + ten, than); o2.focus(); o2.setSelectionRange(o2.value.length, o2.value.length); return; }
      const q = boDau(tim.trim());
      if (q) {
        const thay = [...DM.products, ...khac()].filter(p => boDau(p.name.vi).includes(q));
        than.innerHTML = (thay.length ? '' : '<p class="picker-empty">Chưa có mặt hàng này trong danh mục. Bấm nút dưới để tự nhập tên, hoặc chọn mặt hàng gần nhất.</p>')
          + `<div class="pick-grid">${thay.map(the).join('')}${nutThem(tim.trim(), mo)}</div>`;
        return;
      }
      than.innerHTML = DM.sectors.map(nganh => {
        const nhanh = DM.branches.filter(b => b.sector === nganh.id);
        return `<section class="pick-sector"><h3>${esc(nganh.name.vi)}</h3><div class="branch-grid">${nhanh.map(b => {
          const n = chon.filter(id => sp(id).branch === b.id).length;
          return `<button type="button" class="branch-tile${mo === b.id ? ' open' : ''}${n ? ' has' : ''}" aria-expanded="${mo === b.id}" data-nhanh="${b.id}">
            <img src="assets/anh/linh-vuc/${b.id}.jpg" alt=""><span class="branch-copy"><strong>${esc(b.name.vi)}</strong><small>${esc(b.hint.vi)}</small></span>
            ${n ? `<span class="branch-count">${n}</span>` : `<span class="branch-arrow">${MUI_XUONG}</span>`}</button>`;
        }).join('')}</div>${nhanh.some(b => b.id === mo) ? bang(mo) : ''}</section>`;
      }).join('');
    }

    // Ô "+ Mặt hàng khác" ở cuối lưới
    function nutThem(tenSan, nhanh) {
      const nhan = tenSan ? `Thêm “${esc(tenSan)}”` : 'Mặt hàng khác';
      return `<button type="button" class="pick-card them" data-them="${esc(tenSan)}" data-them-nhanh="${nhanh || ''}">
        <span class="them-dau" aria-hidden="true">+</span><span class="pick-name">${nhan}<small>Không có trong danh sách? Tự nhập</small></span></button>`;
    }
    function oNhap() {
      return `<div class="pick-khac" role="group" aria-label="Nhập mặt hàng khác">
        <strong>Mặt hàng của bạn là gì?</strong>
        <label class="small b" for="ten-khac-${ten}">Tên mặt hàng</label>
        <div class="o-nhap"><input id="ten-khac-${ten}" value="${esc(form.ten)}" placeholder="Ví dụ: mít ruột đỏ, cá bống tượng…" maxlength="60" autocomplete="off">
          <button class="nut-mic" type="button" aria-label="Nói tên mặt hàng" data-toast="Đang nghe tên mặt hàng…"><img src="assets/ic-mic.svg" alt=""></button></div>
        <span class="small b">Thuộc lĩnh vực nào?</span>
        <div class="khac-nhanh" role="radiogroup">${DM.branches.map(b => `<button type="button" role="radio" aria-checked="${form.nhanh === b.id}" data-khac-nhanh="${b.id}">${esc(b.name.vi)}</button>`).join('')}</div>
        <p class="xs muted">Tin đăng hiện nhãn <b>Tự nhập</b>. Đội AgiViet xem tên này để thêm vào danh mục; bạn không phải làm gì thêm.</p>
        <div class="row" style="gap:8px"><button type="button" class="btn nho" data-khac-luu>Thêm vào lựa chọn</button><button type="button" class="btn phu nho" data-khac-huy>Hủy</button></div>
      </div>`;
    }
    function luuMoi() {
      const o2 = $('#ten-khac-' + ten, than);
      const tenMoi = o2.value.trim().replace(/\s+/g, ' ');
      if (tenMoi.length < 2) { window.amToast?.('Nhập tên mặt hàng, ít nhất 2 chữ'); o2.focus(); return; }
      if (!form.nhanh) { window.amToast?.('Chọn lĩnh vực của mặt hàng'); return; }
      const ds = khac();
      const trung = [...DM.products, ...ds].find(p => boDau(p.name.vi) === boDau(tenMoi));
      let id = trung?.id;
      if (!trung) { id = 'khac-' + Date.now().toString(36); ds.push({ id, group: 'khac', branch: form.nhanh, name: { vi: tenMoi, en: tenMoi } }); luuKhac(ds); }
      form = null; tim = ''; o.value = ''; mo = sp(id).branch;
      if (!chon.includes(id)) bam(id); else ve();
      window.amToast?.(trung ? `Đã có sẵn: ${sp(id).name.vi}` : `Đã thêm “${tenMoi}”`);
    }

    function bam(id) {
      if (mot) chon = chon[0] === id ? [] : [id];
      else chon = chon.includes(id) ? chon.filter(x => x !== id) : [...chon, id];
      ghi(ten, chon);
      tomTat(ten, chon);
      goc.dispatchEvent(new CustomEvent('doi-hang', { detail: chon, bubbles: true }));
      ve();
    }

    goc.addEventListener('click', e => {
      const n = e.target.closest('[data-nhanh]');
      if (n) { mo = mo === n.dataset.nhanh ? null : n.dataset.nhanh; tab = null; ve(); return; }
      const t = e.target.closest('[data-tab]');
      if (t) { tab = t.dataset.tab; ve(); return; }
      const c = e.target.closest('[data-sp]');
      if (c) { bam(c.dataset.sp); return; }
      const b = e.target.closest('[data-bo]');
      if (b) { bam(b.dataset.bo); return; }
      const th = e.target.closest('[data-them]');
      if (th) { form = { ten: th.dataset.them, nhanh: th.dataset.themNhanh || mo || '' }; ve(); return; }
      const kn = e.target.closest('[data-khac-nhanh]');
      if (kn) { form.ten = $('#ten-khac-' + ten, than).value; form.nhanh = kn.dataset.khacNhanh; ve(); return; }
      if (e.target.closest('[data-khac-luu]')) { luuMoi(); return; }
      if (e.target.closest('[data-khac-huy]')) { form = null; ve(); return; }
      if (e.target.closest('.picker-clear')) { tim = ''; o.value = ''; ve(); o.focus(); }
    });
    o.addEventListener('input', () => { tim = o.value; form = null; ve(); });
    goc.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ten-khac-' + ten) { e.preventDefault(); luuMoi(); } });

    ve();
    tomTat(ten, chon);
  }

  document.querySelectorAll('[data-chon-hang]').forEach(gan);
  // Tóm tắt ở màn khác (vd. Hồ sơ) khi chưa có bộ chọn trên cùng trang
  document.querySelectorAll('[data-hang-tom-tat]').forEach(el => {
    const ten = el.dataset.hangTomTat;
    if (!document.querySelector(`[data-chon-hang="${ten}"]`)) tomTat(ten, doc(ten) ?? []);
  });
})();
