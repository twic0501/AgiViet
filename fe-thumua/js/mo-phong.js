// Bản mô phỏng app Thu mua: nói rõ mô phỏng, chặn đầu vào sai, bộ lọc thật, hạn mức một bộ đếm,
// và một giao dịch khép kín với app bán qua kho chung js/kho-mau.js (localStorage "av.demo"):
// đăng nhu cầu → kết nối lô chị Năm → chị Năm đồng ý → tạo đơn → chị Năm xác nhận → nhập cân → chị Năm xác nhận → ghi trả → chị Năm xác nhận.
// Tự tắt phần mô phỏng khi js/he-thong.js nối được máy chủ; bộ chặn đầu vào vẫn giữ.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const quayVideo = (() => { try { return localStorage.getItem('av.quay-video') === '1'; } catch { return false; } })();   // lúc quay video giới thiệu: ẩn dải và tiền tố “Mô phỏng”
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const AV = window.AV;
  const toast = t => window.tmToast?.(t);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const so = s => Number(String(s ?? '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  const tien = v => Math.round(v).toLocaleString('vi-VN');
  const trang = location.pathname.split('/').pop() || 'index.html';
  const chan = (e, loi, o) => { e.preventDefault(); e.stopImmediatePropagation(); toast(loi); o?.focus(); };
  const goi = () => (new URL(location.href).searchParams.get('goi') || localStorage.getItem('tm.goi') || 'free') === 'bus' ? 'bus' : 'free';
  let bat = false;

  /* ---------- Bộ chặn đầu vào (luôn bật) ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('#tao-nhu-cau [data-luot="tin"], #tao-nhu-cau [data-ok]')) {
      const l = $('#luong'), tu = $('#tu'), den = $('#den');
      if (!(so(l?.value) > 0)) return chan(e, 'Lượng cần mua phải lớn hơn 0.', l);
      if (tu?.value && den?.value && tu.value > den.value) return chan(e, 'Ngày giao “đến” phải sau ngày “từ”.', den);
      const mh = $('#mh'); if (mh?.value === 'khac' && !($('#mh-khac')?.value.trim().length >= 2)) return chan(e, 'Nhập tên mặt hàng khác.', $('#mh-khac'));
    }
    const gui = e.target.closest('#nghiem-thu .btn.lon');
    if (gui) {
      const giao = so($('#nt-giao').value), nhan = so($('#nt-nhan').value), tuChoi = so($('#nt-tu-choi').value);
      if (!(giao > 0) || !(nhan >= 0) || !(tuChoi >= 0)) return chan(e, 'Lượng giao, nhận, không nhận phải là số không âm, lượng giao lớn hơn 0.', $('#nt-giao'));
      if (nhan + tuChoi > giao) return chan(e, `Nhận ${tien(nhan)} + không nhận ${tien(tuChoi)} vượt lượng giao ${tien(giao)} kg.`, $('#nt-nhan'));
      const brix = $$('#o-do input').map(o => so(o.value));
      const sai = brix.findIndex(v => !(v >= 5 && v <= 35));
      if (sai >= 0) return chan(e, `Trái ${sai + 1}: độ ngọt phải trong khoảng 5 – 35 °Bx.`, $$('#o-do input')[sai]);
      gui.dataset.toast = `Đã gửi người bán xác nhận: nhận ${tien(nhan)} kg, không nhận ${tien(tuChoi)} kg. Số này là tự khai tới khi người bán xác nhận.`;
    }
    const ghi = e.target.closest('#ghi-thanh-toan .btn.chi-free, #ghi-thanh-toan .btn.chi-bus');
    if (ghi) {
      const o = $('#tt-tien'); const v = so(o.value);
      const chon = $('#tt-khoan'); const con = so((chon?.selectedOptions?.[0]?.textContent || '').match(/còn ([\d.]+)/)?.[1] || chon?.selectedOptions?.[0]?.dataset?.con || 0);
      if (!(v > 0)) return chan(e, 'Số tiền phải lớn hơn 0.', o);
      if (con > 0 && v > con) return chan(e, `Số tiền vượt khoản còn phải trả (${tien(con)} đ).`, o);
      ghi.dataset.toast = ghi.classList.contains('chi-bus') ? `Đã gửi anh Quang duyệt chi ${tien(v)} đ.` : `Đã ghi ${tien(v)} đ. Chờ người bán xác nhận đã nhận.`;
    }
  }, true);
  document.addEventListener('input', e => { if (e.target.id === 'nt-nhan') $('#o-do input')?.dispatchEvent(new Event('input', { bubbles: true })); });

  /* ---------- Hạn mức: một bộ đếm (lưu tm.demo-luot) ---------- */
  const L = () => window.tmLuot;
  const k = kieu => L()?.[goi()].find(x => x.k === kieu);
  const luuLuot = () => { try { localStorage.setItem('tm.demo-luot', JSON.stringify(L())); } catch { /* bỏ qua */ } };
  function napLuot() {
    try { const cu = JSON.parse(localStorage.getItem('tm.demo-luot')); if (cu) for (const g of ['free', 'bus']) cu[g]?.forEach((x, i) => { if (L()[g][i] && L()[g][i].k === x.k) Object.assign(L()[g][i], x); }); } catch { /* bỏ qua */ }
  }
  function veThanh() {
    const the = $('.the-luot'); if (!the || !L() || !window.tmThanhDo) return;
    $$('.do-luot', the).forEach(d => d.remove());
    $('.tieu', the).insertAdjacentHTML('afterend', L()[goi()].map(window.tmThanhDo).join(''));
    $$('[data-thanh-do]').forEach(o => { const [g, i] = o.dataset.thanhDo.split(':'); if (L()[g]?.[i]) o.innerHTML = window.tmThanhDo(L()[g][i]); });
  }
  // Lời mời tới chị Năm: người bán trả lời bên app bán → đổi tạm giữ thành đã dùng hoặc trả lại (một lần)
  function doiLuotTheoTraLoi() {
    const kn = k('ket-noi'); if (!kn) return;
    if (!AV.doc().conns.some(c => c.trangThai !== 'cho' && !c.daTinhLuot)) return;   // không ghi kho nếu không có gì mới (tránh vòng theoDoi)
    let doiGi = false;
    AV.doi(d => { for (const c of d.conns) if (c.trangThai !== 'cho' && !c.daTinhLuot) { c.daTinhLuot = true; kn.giu = Math.max(0, (kn.giu || 0) - 1); if (c.trangThai === 'dong_y') kn.dung++; doiGi = true; } });
    if (doiGi) { luuLuot(); veThanh(); }
  }

  /* ---------- Phần mô phỏng ---------- */
  function moPhong() {
    if (bat || document.documentElement.dataset.api === 'on') return;
    bat = true;
    if (!quayVideo) ($('.chinh') || document.body).insertAdjacentHTML('afterbegin', '<div class="dai-mo-phong" role="note">Bản mô phỏng · số liệu mẫu, kịch bản minh họa ngày 9/10/2026, chưa có giao dịch thật <button type="button" id="av-lam-lai">Làm lại</button></div>');
    $('#av-lam-lai')?.addEventListener('click', () => { AV.datLai(); localStorage.removeItem('tm.demo-luot'); toast('Đã đưa kịch bản mẫu về ban đầu (cả hai app)'); setTimeout(() => location.reload(), 600); });
    const t = $('.toast');
    if (t && !quayVideo) new MutationObserver(() => { const x = t.textContent; if (x && !x.startsWith('Mô phỏng')) t.textContent = 'Mô phỏng · ' + x; }).observe(t, { childList: true, characterData: true, subtree: true });
    $$('.vet').forEach(v => { if (/^Thứ .*\d+\/\d+\/2026$/.test(v.textContent.trim())) v.textContent += ' · kịch bản minh họa'; });
    // Tài khoản demo vừa đăng ký/đăng nhập (dang-nhap.html): tên tổ chức, người dùng trên khung app; nút đăng xuất
    let tk = null; try { tk = JSON.parse(localStorage.getItem('tm.tai-khoan')); } catch { /* bỏ qua */ }
    if (tk?.to_chuc) {
      const vt = s => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const tc = $('.to-chuc strong'); if (tc) tc.textContent = tk.to_chuc;
      const av = $('.to-chuc .av'); if (av) av.textContent = vt(tk.to_chuc.replace(/^(Nhà máy|Công ty|Vựa)( sấy)?\s+/i, '')) || 'TC';
      const nd = $('.nguoi-dung strong'); if (nd && tk.nguoi) nd.textContent = tk.nguoi;
      const ndAv = $('.nguoi-dung .av'); if (ndAv && tk.nguoi) ndAv.textContent = tk.nguoi.trim().split(/\s+/).at(-1)[0].toUpperCase();
      const chao = $('#tong-quan h1'); if (chao && tk.nguoi) chao.textContent = 'Chào ' + tk.nguoi.replace(/^(Anh|Chị|Cô|Chú)\s/, m => m.toLowerCase());
      const moTa = chao?.parentElement?.querySelector('p'); if (moTa && moTa.textContent.startsWith('Nhà máy sấy Đồng Xanh')) moTa.textContent = moTa.textContent.replace('Nhà máy sấy Đồng Xanh', tk.to_chuc);
    }
    $('.nguoi-dung')?.insertAdjacentHTML('afterend', '<a class="btn nhe nho" href="dang-nhap.html?tab=dang-nhap" id="av-dang-xuat" title="Đăng xuất bản thử">Đăng xuất</a>');
    $$('[data-luot="video"]').forEach(b => { if (b.dataset.ok) b.dataset.ok += ' (mô phỏng, chưa có cuộc gọi thật)'; });
    napLuot();
    const veTatCa = () => { doiLuotTheoTraLoi(); veThanh(); for (const f of [veNhuCau, veNguonHang, veDon, veCongNo, veTongQuan]) { try { f(); } catch (err) { console.error(err); } } };
    AV.theoDoi(veTatCa);
    window.addEventListener('hashchange', veTatCa);
    veTatCa();
    if (trang === 'nguon-hang.html') ganLoc();
  }

  /* ---------- Đăng nhu cầu: lưu thật, đếm một lần, thông báo khớp bộ đếm ---------- */
  let choTinCuoi = false;
  function dangNhuCau() {
    const kt = k('tin');
    const mh = $('#mh')?.value === 'khac' ? $('#mh-khac').value.trim() : ($('#mh')?.selectedOptions?.[0]?.textContent || 'mặt hàng');
    const n = AV.dangNhuCau({ sp: mh.toLowerCase(), kg: so($('#luong').value), tu: $('#tu')?.value || '', den: $('#den')?.value || '' });
    kt.dung++; luuLuot(); veThanh();
    return `Đã đăng ${n.code}. Đã dùng ${kt.dung}/${kt.tran} tin mua tháng này.`;
  }
  document.addEventListener('click', e => {
    if (!bat) return;
    const nut = e.target.closest('#tao-nhu-cau [data-luot="tin"]');
    if (nut) {
      const kt = k('tin');
      if (kt.dung >= kt.tran) return chan(e, `Hết lượt tin mua: đã dùng ${kt.dung}/${kt.tran}. Sửa tin cũ không tính lượt.`);
      if (goi() === 'free' && kt.dung === kt.tran - 1) { choTinCuoi = true; return; }   // để app.js hỏi “tin cuối cùng”
      e.preventDefault(); e.stopImmediatePropagation();
      toast(dangNhuCau()); location.hash = 'nhu-cau';
      return;
    }
    const sau = e.target.closest('[data-sau]');
    if (sau && choTinCuoi && /Đã đăng N-/.test(sau.dataset.sau)) { choTinCuoi = false; sau.dataset.sau = dangNhuCau(); setTimeout(() => { location.hash = 'nhu-cau'; }, 50); }
  }, true);
  function veNhuCau() {
    const tb = $('#nhu-cau tbody'); if (!tb) return;
    $$('.av-nc', tb).forEach(x => x.remove());
    tb.insertAdjacentHTML('afterbegin', AV.doc().needs.map(n => `<tr class="av-nc"><td><strong>${esc(n.code)}</strong> · ${esc(n.sp)}<div class="rat-nho nhat">vừa đăng · người bán trong app thấy được</div></td><td class="so-o">${Number(n.kg).toLocaleString("vi-VN")} t</td><td>${esc(n.tu)} – ${esc(n.den)}</td><td>0</td><td>0 t</td><td><span class="tag ok">Công khai</span></td><td></td></tr>`).join(''));
  }

  /* ---------- Nguồn hàng: lô chị Năm vừa đăng, kết nối, tạo đơn; bộ lọc thật ---------- */
  const anhBan = l => l.anh.startsWith('assets/anh') ? '/ban/' + l.anh : l.anh.replace('assets/', '/ban/assets/');
  function theLoMoi(l, d) {
    const c = d.conns.find(x => x.lot === l.id);
    const don = d.orders.filter(o => o.lot === l.id);
    const con = AV.conBan(l);
    const hanhDong = don.length ? don.map(o => `<a class="btn nho phu" href="don-hang.html#don-hang" data-mo-sau="${esc(o.code)}">${esc(o.code)} · ${esc(AV.TRANG_THAI[o.trangThai])}</a>`).join('')
      : !c ? `<button class="btn nho" type="button" data-kn-lo="${l.id}">Kết nối</button>`
      : c.trangThai === 'cho' ? '<span class="tag cho">Đang chờ chị Năm trả lời · giữ 1 lượt</span>'
      : c.trangThai === 'tu_choi' ? '<span class="tag vien">Người bán từ chối · đã trả lượt</span>'
      : `<span class="tag ok">Đã kết nối</span><button class="btn nho" type="button" data-tao-don="${l.id}">Tạo đơn</button>`;
    return `<article class="card av-lo${con ? '' : ' av-het'}" data-mat-hang="${esc(l.ten)}" data-kg="${con}" data-can="${l.coSo === 'da_can' ? 1 : 0}"${l.gia ? ` data-gia="${l.gia}"` : ''}${l.hai ? ` data-tu="${l.hai[0]}" data-den="${l.hai[1]}"` : ''}><div class="card-than cot">
      <div class="hang tren"><span class="anh-sp" style="width:64px;height:64px;border-radius:14px;overflow:hidden"><img src="${anhBan(l)}" alt="" style="width:100%;height:100%;object-fit:cover"></span>
      <div class="grow cot g4"><strong style="font-size:16px">${esc(l.ten)} · ${esc(AV.NGUOI_BAN)}</strong><span class="nho muted">Tự trồng · Mỹ Xương, Cao Lãnh · vừa đăng bên app bán</span><div class="hang boc" style="gap:6px"><span class="tag ${l.coSo === 'da_can' ? 'ok' : 'dut'}">${(l.kg / 1000).toLocaleString('vi-VN')} tấn ${l.coSo === 'da_can' ? 'đã cân' : 'ước tính'}</span>${l.hai ? `<span class="tag">Hái ${ngayNgan(l.hai)}</span>` : ''}${con ? '<span class="tag ok">Mới</span>' : '<span class="tag cho">Đã chốt hết · đang giao dịch</span>'}</div>
      <span class="con-ban${con ? '' : ' het'}">Còn bán được: ${(con / 1000).toLocaleString('vi-VN')} tấn</span></div>
      <div class="phai"><span class="nho muted">Giá</span><div class="dam">${l.gia ? tien(l.gia) + ' đ/kg' : 'Nhận báo giá'}</div></div></div>
      <div class="av-form-don" hidden></div></div>
      <div class="card-chan"><span class="grow"></span>${hanhDong}</div></article>`;
  }
  function veNguonHang() {
    const luoi = $('#nguon-hang .luoi.l2'); if (!luoi) return;
    $$('.av-lo', luoi).forEach(x => x.remove());
    $('#av-het-khoi')?.remove();
    const d = AV.doc();
    const moi = d.lots.filter(l => l.moi);
    // Còn bán được → vào kết quả tìm hàng; đã chốt hết → khối riêng (không tính vào số lô khớp), vẫn mở được đơn
    luoi.insertAdjacentHTML('afterbegin', moi.filter(l => AV.conBan(l) > 0).map(l => theLoMoi(l, d)).join(''));
    const het = moi.filter(l => !AV.conBan(l) && d.orders.some(o => o.lot === l.id));
    if (het.length) luoi.insertAdjacentHTML('afterend', `<section class="cot g12" id="av-het-khoi"><h2 class="nho muted" style="margin:8px 0 0">Đã chốt hết · bạn đang giao dịch (${het.length})</h2><div class="luoi l2">${het.map(l => theLoMoi(l, d)).join('')}</div></section>`);
    locLai();
  }
  // Giữ 1 lượt kết nối; trả về câu báo hoặc null nếu hết lượt
  function giuLuot(ten) {
    const q = k('ket-noi'); q.giu = q.giu || 0;
    if (q.dung + q.giu >= q.tran) { toast(`Hết lượt: ${q.dung} đã dùng + ${q.giu} đang giữ = ${q.tran}/${q.tran}. Rút một lời mời để lấy lại lượt.`); return null; }
    q.giu++; luuLuot(); veThanh();
    return `Đã gửi lời mời tới ${ten}, tạm giữ 1 lượt: ${q.dung} đã dùng + ${q.giu} đang giữ = ${q.dung + q.giu}/${q.tran}, còn ${q.tran - q.dung - q.giu}. Chỉ tính khi người bán đồng ý; từ chối thì trả lại.`;
  }
  document.addEventListener('click', e => {
    if (!bat) return;
    // Thẻ lô mẫu ở gói Business: dùng cùng bộ đếm (gói Miễn phí để app.js mở hộp thoại)
    const knMau = e.target.closest('#nguon-hang [data-luot="ket-noi"], #chi-tiet-lo [data-luot="ket-noi"], #chi-tiet-nhu-cau [data-luot="ket-noi"]');
    if (knMau && goi() === 'bus') {
      e.preventDefault(); e.stopImmediatePropagation();
      const ten = (knMau.dataset.ok || '').match(/khi (.+?) chấp nhận/)?.[1] || 'người bán';
      const bao = giuLuot(ten); if (bao) toast(bao);
      return;
    }
    const kn = e.target.closest('[data-kn-lo]');
    if (kn) {
      const bao = giuLuot(AV.NGUOI_BAN); if (!bao) return;
      AV.ketNoi(kn.dataset.knLo);
      toast(bao + ' Người bán thấy ở mục Chờ nối.');
      return;
    }
    const td = e.target.closest('[data-tao-don]');
    if (td) {
      const l = AV.doc().lots.find(x => x.id === td.dataset.taoDon);
      const f = td.closest('article').querySelector('.av-form-don');
      f.hidden = false;
      f.innerHTML = `<div class="luoi l3" style="gap:8px;align-items:end"><div class="truong"><label>Lượng (kg)</label><input class="o" data-don-kg value="${AV.conBan(l)}"></div><div class="truong"><label>Giá (đ/kg)</label><input class="o" data-don-gia value="${l.gia || ''}" placeholder="Giá đã thỏa thuận"></div><button class="btn nho" type="button" data-gui-don="${l.id}">Gửi đơn cho người bán</button></div><span class="rat-nho nhat">Tự giao dịch, không phí. Hai bên cùng xác nhận trên app mới thành đơn.</span>`;
      return;
    }
    const gd = e.target.closest('[data-gui-don]');
    if (gd) {
      const f = gd.closest('.av-form-don'); const l = AV.doc().lots.find(x => x.id === gd.dataset.guiDon);
      const kg = so(f.querySelector('[data-don-kg]').value), gia = so(f.querySelector('[data-don-gia]').value);
      if (!(kg > 0) || kg > AV.conBan(l)) return toast(`Lượng phải lớn hơn 0 và không quá ${tien(AV.conBan(l))} kg còn bán được của lô.`);
      if (!(gia > 0)) return toast('Nhập giá đã thỏa thuận (lớn hơn 0).');
      const o = AV.taoDon(l.id, kg, gia);
      toast(`Đã gửi đơn ${o.code}: ${tien(kg)} kg × ${tien(gia)} đ. Chờ ${AV.NGUOI_BAN} xác nhận.`);
    }
  }, true);
  function ganLoc() {
    const chon = $('#l-mh');
    if (chon && !chon.querySelector('option[value=""]')) { chon.insertAdjacentHTML('afterbegin', '<option value="">Mọi mặt hàng</option>'); chon.value = ''; }
    chon?.addEventListener('change', locLai);
    $('#l-luong')?.addEventListener('input', locLai);
    const lich = $('#l-lich');
    if (lich && !lich.querySelector('option[value=""]')) lich.insertAdjacentHTML('beforeend', '<option value="">Mọi thời gian</option>');
    lich?.addEventListener('change', locLai);
    // Bộ lọc chưa có dữ liệu: khóa hẳn (nằm trong “Thêm bộ lọc”, có ghi chú), không để nút giả có phản hồi chọn
    for (const o of $$('#nguon-hang .chua-ap-dung select, #nguon-hang .chua-ap-dung button')) { o.disabled = true; o.title = 'Chưa áp dụng trong bản thử'; }
    // “Chỉ hàng đã cân” và “Xếp theo” chạy sau khi app.js đổi aria-pressed
    $('#loc-da-can')?.addEventListener('click', () => setTimeout(locLai, 0));
    $$('[data-chon="xep-nguon"] button').forEach(b => b.addEventListener('click', () => setTimeout(locLai, 0)));
    // Thẻ lô mẫu: thêm dòng “Còn bán được” (mẫu chưa có đơn nào nên còn nguyên lượng đăng) và nhớ thứ tự gốc
    $$('#nguon-hang .luoi.l2 > article.card:not(.av-lo)').forEach((a, i) => {
      a.dataset.thuTu = i;
      const tag = a.querySelector('.tag')?.textContent || '';
      if (!a.querySelector('.con-ban') && /tấn/.test(tag)) a.querySelector('.hang.boc')?.insertAdjacentHTML('afterend', `<span class="con-ban">Còn bán được: ${tag.match(/([\d,.]+)\s*tấn/)[1]} tấn</span>`);
    });
    locLai();
  }
  // Khoảng ngày có hàng của một thẻ: lô mới có data-tu/den; lô mẫu đọc nhãn “Hái 12 – 15/10”, “Có ngay”; không ghi thì chưa biết
  const ngayNgan = ([tu, den]) => { const a = tu.split('-'), b = den.split('-'); return a[1] === b[1] ? `${+a[2]} – ${+b[2]}/${+a[1]}` : `${+a[2]}/${+a[1]} – ${+b[2]}/${+b[1]}`; };
  function khoangCoHang(a) {
    if (a.dataset.tu) return [a.dataset.tu, a.dataset.den];
    const tag = $$('.tag', a).map(t => t.textContent).join(' ');
    const m = tag.match(/Hái\s*(\d+)\s*–\s*(\d+)\/(\d+)/);
    if (m) return [`2026-${m[3].padStart(2, '0')}-${m[1].padStart(2, '0')}`, `2026-${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}`];
    if (/Có ngay/.test(tag)) return ['2026-10-09', '2026-10-31'];       // ngày kịch bản 9/10
    return null;
  }
  function khoangLoc() {
    const v = $('#l-lich')?.value || '';
    let m = v.match(/(\d+)\s*–\s*(\d+)\/(\d+)/);
    if (m) return [`2026-${m[3].padStart(2, '0')}-${m[1].padStart(2, '0')}`, `2026-${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}`];
    m = v.match(/Tháng (\d+)/);
    if (m) { const t = m[1].padStart(2, '0'); return [`2026-${t}-01`, `2026-${t}-${t === '11' ? '30' : '31'}`]; }
    return null;
  }
  // Giá (đ/kg) và khoảng cách (km) của thẻ để xếp; không có thì xếp cuối
  const giaThe = a => Number(a.dataset.gia) || so((a.querySelector('.phai .dam')?.textContent.match(/([\d.]+)\s*đ/) || [])[1]) || Infinity;
  const kmThe = a => Number((a.querySelector('.nho.muted')?.textContent.match(/(\d+)\s*km/) || [])[1]) || Infinity;
  function locLai() {
    const luoi = $('#nguon-hang .luoi.l2'); if (!luoi) return;
    const mh = ($('#l-mh')?.value || '').toLowerCase().split(' ')[0];
    const tuTan = so($('#l-luong')?.value) || 0;
    const loc = khoangLoc();
    const chiDaCan = $('#loc-da-can')?.getAttribute('aria-pressed') === 'true';
    let n = 0, chuaBiet = 0, anNgay = 0;
    const the = $$(':scope > article.card', luoi);
    the.forEach(a => {
      const ten = (a.dataset.matHang || a.querySelector('.dong-link, strong')?.textContent || '').toLowerCase();
      const kg = a.dataset.kg ? Number(a.dataset.kg) : so((a.querySelector('.tag')?.textContent.match(/([\d,.]+)\s*tấn/) || [])[1]) * 1000;
      const daCan = a.dataset.can ? a.dataset.can === '1' : /đã cân/.test(a.querySelector('.tag')?.textContent || '');
      const kh = khoangCoHang(a);
      const hopNgay = !loc || !kh || (kh[0] <= loc[1] && kh[1] >= loc[0]);   // giao nhau với khoảng lọc
      const hien = (!mh || ten.includes(mh)) && (!tuTan || !(kg >= 0) || kg >= tuTan * 1000) && hopNgay && (!chiDaCan || daCan);
      a.hidden = !hien; if (hien) { n++; if (loc && !kh) chuaBiet++; } else if (!hopNgay) anNgay++;
    });
    // Xếp: Phù hợp = thứ tự gốc (lô mới đăng lên đầu); Giá thấp; Gần
    const xep = $('[data-chon="xep-nguon"] [aria-pressed="true"]')?.dataset.khi || 'hop';
    const khoa = xep === 'gia' ? giaThe : xep === 'gan' ? kmThe : a => (a.classList.contains('av-lo') ? -1 : Number(a.dataset.thuTu || 0));
    the.slice().sort((x, y) => khoa(x) - khoa(y)).forEach(a => luoi.appendChild(a));
    const dem = $('#nguon-hang p.nho.muted');
    if (dem) dem.innerHTML = `<strong>${n} lô</strong> còn bán được, khớp bộ lọc${tuTan ? ` (từ ${tuTan} tấn)` : ''}${loc ? ` · có hàng ${esc($('#l-lich').value)}` : ''}${chiDaCan ? ' · chỉ hàng đã cân' : ''}${xep !== 'hop' ? ` · xếp ${xep === 'gia' ? 'giá thấp trước (lô chờ báo giá ở cuối)' : 'gần trước (chưa rõ khoảng cách ở cuối)'}` : ''}${chuaBiet ? ` · ${chuaBiet} lô chưa ghi ngày hái` : ''}${anNgay ? ` · <strong>${anNgay} lô ẩn vì hái ngoài khoảng này</strong>` : ''}`;
    let rong = $('#av-rong');
    if (!n && !rong) { luoi.insertAdjacentHTML('afterend', '<div class="card card-than" id="av-rong"><strong>Chưa có lô khớp.</strong><p class="nho muted">Lưu nhu cầu để được báo khi có người bán đăng, hoặc nới bộ lọc.</p><a class="btn nho" href="nhu-cau.html#tao-nhu-cau">Tạo nhu cầu</a></div>'); rong = $('#av-rong'); }
    if (rong) rong.hidden = n > 0;
  }

  /* ---------- Đơn với người bán trong app: thẻ bấm được, nút chính theo trạng thái, hồ sơ đơn / đối soát ---------- */
  const moDon = new Set();
  try { const m = sessionStorage.getItem('av.mo-don'); if (m) { moDon.add(m); sessionStorage.removeItem('av.mo-don'); } } catch { /* bỏ qua */ }
  const gio = t => { const x = new Date(t); return `${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')} ${x.getDate()}/${x.getMonth() + 1}`; };
  const CAN_MUA = ['da_xac_nhan', 'da_chot', 'chua_thay_tien'];
  function hoSoDon(o) {
    const doiSoat = o.trangThai === 'chua_thay_tien';
    const baoChua = [...o.ls].reverse().find(([t]) => t.startsWith('Người bán báo chưa thấy tiền'));
    const viec = {
      cho_ban_xac_nhan: 'Người bán: xem và xác nhận đơn. Bạn chờ.',
      da_xac_nhan: 'Bạn: nhận hàng, cân rồi gửi kết quả cân. Người bán xác nhận thì mới chốt tiền.',
      cho_ban_xn_kq: 'Người bán: đối chiếu và xác nhận kết quả cân. Bạn chờ.',
      da_chot: `Bạn: chuyển ${tien(o.phaiTra)} đ vào tài khoản •••• 4421 · Nguyễn Thị Năm · Agribank rồi ghi trả.`,
      bao_da_tra: 'Người bán: xem sổ ngân hàng rồi xác nhận đã nhận. Bạn chờ.',
      chua_thay_tien: 'Bạn: gửi ủy nhiệm chi hoặc ảnh chuyển khoản; nếu chưa chuyển thì ghi lại khoản trả. Người bán: xem lại sổ ngân hàng. App không kết luận bên nào sai.',
      da_nhan_tien: 'Đơn đã đóng. Không còn việc cần làm.',
    }[o.trangThai];
    return `<div class="cot g8 av-ho-so" style="border-top:1px solid var(--vien);padding-top:10px">
      <strong>${doiSoat ? 'Hồ sơ đối soát' : 'Hồ sơ đơn'} ${esc(o.code)}</strong>
      <div class="luoi l2" style="gap:6px 16px">
        <span class="nho">Phải trả: <strong>${o.phaiTra ? tien(o.phaiTra) + ' đ' : 'chưa chốt'}</strong>${o.kq ? ` · ${tien(o.kq.nhan)} kg × ${tien(o.gia)} đ` : ''}</span>
        <span class="nho">Bạn báo đã trả: <strong>${o.tra ? tien(o.tra.so) + ' đ' : 'chưa'}</strong>${o.tra ? ' · ' + gio(o.tra.luc) : ''}</span>
        <span class="nho">Chứng từ: ${o.chungTu?.length ? o.chungTu.map(c => `<strong>${esc(c.ten)}</strong> (${gio(c.luc)})`).join(', ') : '<span class="muted">chưa gửi ủy nhiệm chi</span>'}</span>
        <span class="nho">Người bán phản hồi: ${baoChua ? `<strong>chưa thấy tiền</strong> · ${gio(baoChua[1])}` : o.trangThai === 'da_nhan_tien' ? 'đã nhận đủ' : '<span class="muted">chưa có</span>'}</span>
        ${(o.doiSoat || []).map(g => `<span class="nho">${g.ben === 'ban' ? 'Người bán' : 'Bạn'}: ${esc(g.noiDung)} · ${gio(g.luc)}</span>`).join('')}
      </div>
      <div class="bao thong-tin nho"><svg class="i"><use href="#i-thong-tin"/></svg><span><strong>Việc tiếp theo.</strong> ${viec}</span></div>
      ${doiSoat ? `<div class="hang boc" style="gap:8px"><button class="btn nho" type="button" data-gui-unc="${esc(o.code)}">Gửi ủy nhiệm chi</button><a class="btn nho phu" href="cong-no.html#ghi-thanh-toan" data-tra-don="${esc(o.code)}">Ghi lại khoản trả</a></div>` : ''}
      <details class="nho"><summary class="dam" style="cursor:pointer">Lịch sử đơn (${o.ls.length})</summary><ol style="padding-left:18px;margin-top:6px">${o.ls.map(([t, l]) => `<li>${esc(t)} <span class="muted">· ${gio(l)}</span></li>`).join('')}</ol></details>
    </div>`;
  }
  function veDon() {
    const man = $('#don-hang'); if (!man) return;
    $$('.av-don-khoi', man).forEach(x => x.remove());
    const ds = AV.doc().orders; if (!ds.length) return;
    const bang = $('.card.bang-cuon', man) || $('.card', man);
    bang?.insertAdjacentHTML('beforebegin', `<section class="card av-don-khoi"><div class="card-dau"><h2>Đơn với người bán trong app</h2><span class="tag vien">cùng mã ở app bán</span></div><div class="card-than cot">${ds.map(o => {
      const mo = moDon.has(o.code);
      const xem = nhan => `<button class="btn nho ${nhan === 'Xem đối soát' ? '' : 'phu'}" type="button" data-mo-don="${esc(o.code)}" aria-expanded="${mo}">${mo ? 'Thu gọn' : nhan}</button>`;
      const chinh = o.trangThai === 'chua_thay_tien' ? xem('Xem đối soát')
        : ['da_chot'].includes(o.trangThai) ? `<a class="btn nho" href="cong-no.html#ghi-thanh-toan" data-tra-don="${esc(o.code)}">Ghi trả ${tien(o.phaiTra)} đ</a>${xem('Xem đơn')}`
        : xem('Xem đơn');
      return `<div class="cot g8 av-don" data-don="${esc(o.code)}" style="padding:10px 0;border-bottom:1px solid var(--vien)">
        <div class="hang giua av-don-dau" role="button" tabindex="0" data-mo-don="${esc(o.code)}" aria-expanded="${mo}" style="cursor:pointer"><span><strong>${esc(o.code)}</strong> · ${esc(o.tenLo)} · ${esc(o.nguoiBan)} · ${tien(o.kg)} kg × ${tien(o.gia)} đ${o.phaiTra ? ` · phải trả ${tien(o.phaiTra)} đ` : ''}</span><span class="tag ${o.trangThai === 'da_nhan_tien' ? 'ok' : 'cho'}">${esc(AV.TRANG_THAI[o.trangThai])}</span></div>
        ${o.trangThai === 'da_xac_nhan' ? `<div class="luoi l3" style="gap:8px;align-items:end"><div class="truong"><label>Nhận (kg)</label><input class="o" data-kq-nhan value="${o.kg}"></div><div class="truong"><label>Không nhận (kg)</label><input class="o" data-kq-tu-choi value="0"></div><button class="btn nho" type="button" data-gui-kq="${esc(o.code)}">Gửi kết quả cân</button></div>${o.kq?.phanDoi ? '<span class="rat-nho do">Người bán báo không đúng lần trước. Kiểm lại rồi gửi bản mới.</span>' : ''}` : ''}
        ${o.kq ? `<span class="rat-nho nhat">Cân: nhận ${tien(o.kq.nhan)} kg, không nhận ${tien(o.kq.tuChoi)} kg · ${o.kq.nhan_nguon === 'ben_kia_xac_nhan' ? 'người bán đã xác nhận' : 'tự khai, chờ người bán'}</span>` : ''}
        <div class="hang" style="gap:8px">${chinh}</div>
        ${mo ? hoSoDon(o) : ''}
      </div>`;
    }).join('')}</div></section>`);
  }
  document.addEventListener('click', e => {
    const md = e.target.closest('[data-mo-don]');
    if (md) { const c = md.dataset.moDon; moDon.has(c) ? moDon.delete(c) : moDon.add(c); veDon(); return; }
    const ms = e.target.closest('[data-mo-sau]');
    if (ms) { try { sessionStorage.setItem('av.mo-don', ms.dataset.moSau); } catch { /* bỏ qua */ } }
    const unc = e.target.closest('[data-gui-unc]');
    if (unc) { const o = AV.guiChungTu(unc.dataset.guiUnc, `Ủy nhiệm chi ${tien(o0(unc.dataset.guiUnc)?.tra?.so)} đ (ảnh mẫu)`); toast(`Đã gửi ủy nhiệm chi vào hồ sơ ${o.code}. Người bán thấy ngay trong đối soát.`); return; }
    const b = e.target.closest('[data-gui-kq]');
    if (b) {
      const o = AV.doc().orders.find(x => x.code === b.dataset.guiKq); const hop = b.parentElement;
      const nhan = so(hop.querySelector('[data-kq-nhan]').value), tuChoi = so(hop.querySelector('[data-kq-tu-choi]').value);
      if (!(nhan >= 0) || !(tuChoi >= 0) || nhan + tuChoi <= 0) return toast('Nhập số kg nhận và không nhận (không âm).');
      if (nhan + tuChoi > o.kg) return toast(`Nhận + không nhận vượt ${tien(o.kg)} kg của đơn.`);
      AV.nhapKetQua(o.code, nhan, tuChoi);
      toast(`Đã gửi kết quả ${o.code} (tự khai). Chờ ${AV.NGUOI_BAN} bấm Đúng hoặc Không đúng.`);
    }
    const t = e.target.closest('[data-tra-don]');
    if (t) { try { sessionStorage.setItem('av.tra-don', t.dataset.traDon); } catch { /* bỏ qua */ } }
  });
  const o0 = code => AV.doc().orders.find(x => x.code === code);
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.av-don-dau')) { e.preventDefault(); e.target.click(); } });

  /* ---------- Công nợ: khoản của đơn chung, ghi trả ---------- */
  // Đơn chung: khoản, phép tính, tài khoản nhận, cảnh báo đều lấy từ chính đơn; chọn lại đơn mẫu thì trả nội dung mẫu
  const TK_BAN = { so: '•••• 4421 · Nguyễn Thị Năm · Agribank', doi: null };   // tài khoản chị Năm trong kịch bản, không đổi trong 30 ngày
  function chonKhoan() {
    const don = $('#tt-don'), khoan = $('#tt-khoan'), tienO = $('#tt-tien'), tk = $('#tt-tk');
    const goiY = tienO?.closest('.truong')?.querySelector('.goi-y'), bao = $('#ghi-thanh-toan .bao.canh, #ghi-thanh-toan .av-bao-tk');
    for (const el of [khoan, goiY, bao]) if (el && !('goc' in el.dataset)) el.dataset.goc = el.innerHTML;
    if (tienO && !('goc' in tienO.dataset)) tienO.dataset.goc = tienO.value;
    if (tk && !('goc' in tk.dataset)) tk.dataset.goc = tk.value;
    const code = don.value.startsWith('av:') ? don.value.slice(3) : null;
    const o = AV.doc().orders.find(x => x.code === code);
    if (!o) {                                   // đơn mẫu HĐ-0243 / HĐ-0245
      if (khoan.dataset.avDoi) { khoan.innerHTML = khoan.dataset.goc; tienO.value = tienO.dataset.goc; tk.value = tk.dataset.goc; if (goiY) goiY.innerHTML = goiY.dataset.goc; if (bao) { bao.innerHTML = bao.dataset.goc; bao.className = 'bao canh nho'; } delete khoan.dataset.avDoi; }
      return;
    }
    khoan.dataset.avDoi = '1';
    khoan.innerHTML = `<option data-con="${o.phaiTra}">Tiền hàng ${esc(o.tenLo)} · còn ${tien(o.phaiTra)} đ</option>`;
    tienO.value = tien(o.phaiTra);
    tk.value = TK_BAN.so;
    if (goiY) goiY.innerHTML = `${tien(o.kq.nhan)} kg nhận × ${tien(o.gia)} đ = ${tien(o.phaiTra)} đ · đơn ${esc(o.code)} không có cọc`;
    if (bao) {
      bao.className = 'bao thong-tin nho av-bao-tk';
      bao.innerHTML = `<svg class="i"><use href="#i-thong-tin"/></svg><span><strong>Tài khoản nhận của ${esc(o.nguoiBan)} không đổi trong 30 ngày qua.</strong> Chỉ chuyển theo tài khoản đang hiện ở đây; app không chặn được tiền chuyển theo hướng dẫn ngoài app.${o.trangThai === 'chua_thay_tien' ? ' <strong>Người bán báo chưa thấy tiền:</strong> đang đối soát, gửi kèm ủy nhiệm chi.' : ''}</span>`;
    }
  }
  function veCongNo() {
    const don = $('#tt-don'); if (!don || !bat) return;
    const ds = AV.doc().orders.filter(o => ['da_chot', 'chua_thay_tien'].includes(o.trangThai));
    const dangChon = don.value;
    $$('option.av-opt', don).forEach(x => x.remove());
    don.insertAdjacentHTML('afterbegin', ds.map(o => `<option class="av-opt" value="av:${esc(o.code)}">${esc(o.code)} · ${esc(o.nguoiBan)}</option>`).join(''));
    let muon = null; try { muon = sessionStorage.getItem('av.tra-don'); sessionStorage.removeItem('av.tra-don'); } catch { /* bỏ qua */ }
    if (muon && ds.some(o => o.code === muon)) don.value = 'av:' + muon;
    else if (!don.dataset.avChon && ds.length) don.value = 'av:' + ds[0].code;     // lần đầu: chọn đơn đang chờ trả
    else if ([...don.options].some(x => x.value === dangChon)) don.value = dangChon;
    if (ds.length) don.dataset.avChon = '1';
    if (!don.dataset.avGan) { don.dataset.avGan = '1'; don.addEventListener('change', chonKhoan); }
    chonKhoan();
    // Bảng khoản của đơn
    const bangKhoan = $$('#cong-no .card').find(c => c.querySelector('h2')?.textContent === 'Các khoản của đơn đang có')?.querySelector('tbody');
    if (bangKhoan) { $$('.av-k', bangKhoan).forEach(x => x.remove()); bangKhoan.insertAdjacentHTML('afterbegin', AV.doc().orders.filter(o => o.phaiTra).map(o => `<tr class="av-k"><td>—</td><td>${esc(o.code)} · ${esc(o.nguoiBan)}</td><td>Tiền hàng ${esc(o.tenLo)}</td><td class="so-o">${tien(o.phaiTra)}</td><td><span class="tag ${o.trangThai === 'da_nhan_tien' ? 'ok' : 'cho'}">${esc(AV.TRANG_THAI[o.trangThai])}</span></td></tr>`).join('')); }
  }
  document.addEventListener('click', e => {
    if (!bat) return;
    const ghi = e.target.closest('#ghi-thanh-toan .btn.chi-free, #ghi-thanh-toan .btn.chi-bus');
    const don = $('#tt-don');
    if (!ghi || !don?.value.startsWith('av:')) return;
    const code = don.value.slice(3); const v = so($('#tt-tien').value);
    const o = AV.doc().orders.find(x => x.code === code);
    if (!(v > 0) || v > o.phaiTra) return;                 // bộ chặn phía trên đã báo lỗi
    AV.baoDaTra(code, v);
    ghi.dataset.toast = `Đã ghi trả ${tien(v)} đ cho ${code}. Chờ ${AV.NGUOI_BAN} xác nhận đã nhận.`;
  }, true);

  /* ---------- Tổng quan: việc cần làm từ giao dịch chung ---------- */
  function veTongQuan() {
    const tb = $$('#tong-quan .card').find(c => c.querySelector('h2')?.textContent === 'Việc cần làm')?.querySelector('tbody'); if (!tb) return;
    $$('.av-v', tb).forEach(x => x.remove());
    const d = AV.doc();
    const viec = [
      ...d.conns.filter(c => c.trangThai === 'dong_y' && !d.orders.some(o => o.lot === c.lot)).map(c => [`${AV.NGUOI_BAN} đồng ý kết nối lô ${c.tenLo}`, 'nguon-hang.html#nguon-hang', 'Tạo đơn']),
      ...d.orders.filter(o => o.trangThai === 'da_xac_nhan').map(o => [`${o.code} đã xác nhận · nhập kết quả cân`, 'don-hang.html#don-hang', 'Nhập']),
      ...d.orders.filter(o => o.trangThai === 'da_chot').map(o => [`${o.code} đã chốt · trả ${tien(o.phaiTra)} đ`, 'cong-no.html#ghi-thanh-toan', 'Ghi trả', o.code]),
      ...d.orders.filter(o => o.trangThai === 'chua_thay_tien').map(o => [`${o.code} · người bán chưa thấy tiền ${tien(o.tra?.so)} đ · đang đối soát`, 'don-hang.html#don-hang', 'Xem đối soát', o.code]),
    ];
    tb.insertAdjacentHTML('afterbegin', viec.map(([t, h, n, ma]) => `<tr class="av-v"><td style="width:36px"><span class="tag cho" style="padding:0 6px"><span class="sh sh-vuong"></span></span></td><td><a class="dong-link" href="${h}"${ma ? ` data-mo-sau="${esc(ma)}"` : ''}>${esc(t)}</a><div class="rat-nho nhat">từ app bán</div></td><td class="phai"><a class="btn nho" href="${h}"${ma ? ` data-mo-sau="${esc(ma)}"` : ''}>${n}</a></td></tr>`).join(''));
  }

  document.addEventListener('av-api', () => { if (bat) location.reload(); });
  const meta = document.querySelector('meta[name="agiviet-api"][content="off"]');
  if (meta || !location.pathname.startsWith('/mua/') || !location.protocol.startsWith('http')) moPhong();
  else setTimeout(moPhong, 2500);
})();
