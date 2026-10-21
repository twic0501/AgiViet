// AgiViet · khung vẽ màn từ dữ liệu (window.AVN, js/dong-co.js), dùng chung cho app bán và app mua.
// Nguồn ở dong-co/khung/khung.js; npm run dong-co chép vào fe-nongdan/js và fe-thumua/js. Mỗi app khai báo window.KHUNG_CAU_HINH
// trong js/cau-hinh.js (vai, bảng TRANG, trang vào app, trang chủ, có nút Nghe không, số việc trên điều hướng).
// Mỗi trang đăng ký màn bằng AM.man(id, { ve(c), bam: { ten(c, el) }, st(c), sau(c, el) }).
// Khung vẽ lại màn đang mở khi dữ liệu đổi (kể cả do tab hay app khác), giữ chữ đang nhập, chặn trang cần đăng nhập.
(() => {
  const A = window.AVN;
  const CH = window.KHUNG_CAU_HINH;
  const APP = CH.app;
  const { h, tho } = A;

  /* ---------- Màn nào nằm ở trang nào (js/cau-hinh.js) ---------- */
  const TRANG = CH.trang;
  const MAN_O_TRANG = {};
  Object.entries(TRANG).forEach(([tep, ds]) => ds.forEach(id => { MAN_O_TRANG[id] = tep; }));
  const TEN_MAN = Object.fromEntries((APP === 'mua' ? A.DANH_MUC_MAN_MUA : A.DANH_MUC_MAN).map(m => [m.id, m.ten]));
  const trangNay = location.pathname.split('/').pop() || 'index.html';
  const KHONG_CAN_DANG_NHAP = new Set(CH.khongCanDangNhap);

  /* ---------- Khởi động: dữ liệu mẫu, nhịp hệ thống, chặn trang cần đăng nhập ---------- */
  A.batDau();
  if (!KHONG_CAN_DANG_NHAP.has(trangNay) && !A.nguoi(APP)) { location.replace(CH.trangVao); return; }

  /* ---------- Đường dẫn: "trang.html#màn?tham=số" ---------- */
  const tachHash = () => { const [id, q = ''] = location.hash.slice(1).split('?'); return { id: decodeURIComponent(id || ''), q }; };
  function den(id, ts) {
    const tep = MAN_O_TRANG[id] || trangNay;
    const q = ts ? new URLSearchParams(Object.entries(ts).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString() : '';
    return `${tep === trangNay ? '' : tep}#${id}${q ? `?${q}` : ''}`;
  }
  function di(id, ts) { const url = den(id, ts); if (url.startsWith('#')) location.hash = url.slice(1); else location.href = url; }

  /* ---------- Trạng thái theo màn (chữ đang nhập, tab đang chọn) và bản nháp nhiều màn ---------- */
  const docPhien = (k, md) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : md; } catch { return md; } };
  const ghiPhien = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* đầy bộ nhớ: bỏ qua */ } };
  const ST = {};
  const khoaSt = (id, q) => `am.st.${id}?${q}`;
  function nhap(khoa, macDinh) {
    const k = `am.nhap.${khoa}`;
    const gt = { ...macDinh, ...docPhien(k, {}) };
    return { gt, dat(p, veLai = true) { Object.assign(gt, p); ghiPhien(k, gt); if (veLai) ve(); }, xoa() { sessionStorage.removeItem(k); } };
  }

  /* ---------- Thông báo nhỏ, hộp hỏi lại ---------- */
  function bao(chu, loai = 'tot') {
    if (!chu) return;
    window.amToast?.(chu);
    document.querySelector('.toast')?.classList.toggle('loi', loai === 'loi');
  }
  function hoi({ tieuDe, noiDung = '', dongY = 'Đồng ý', kieu = '' }) {
    return new Promise(xong => {
      const nen = document.createElement('div');
      nen.className = 'hop-nen';
      nen.innerHTML = String(h`<div class="hop" role="dialog" aria-modal="true" aria-label="${tieuDe}"><strong class="h2">${tieuDe}</strong>${noiDung ? h`<p>${noiDung}</p>` : ''}<div class="grid2"><button type="button" class="btn phu nho" data-tl="0">Quay lại</button><button type="button" class="btn nho ${kieu}" data-tl="1">${dongY}</button></div></div>`);
      const dong = v => { nen.remove(); xong(v); };
      nen.addEventListener('click', e => { const b = e.target.closest('[data-tl]'); if (b) dong(b.dataset.tl === '1'); else if (e.target === nen) dong(false); });
      document.body.appendChild(nen);
      nen.querySelector('[data-tl="1"]').focus();
    });
  }

  /* ---------- Ngữ cảnh cho hàm vẽ ---------- */
  const MAN = {};
  function ngucCanh(id, q) {
    const ts = new URLSearchParams(q);
    const n = A.nguoi(APP);
    const so = A.so();
    const khoa = khoaSt(id, q);
    const dn = MAN[id];
    if (!ST[khoa]) ST[khoa] = docPhien(khoa, null);
    const c = {
      A, id, n, so, bg: A.bayGio(), hs: n ? so.nguoiDung.find(x => x.id === n.id) : undefined,
      ts: k => ts.get(k) ?? '',
      st: null,
      dat(p, veLai = true) { Object.assign(c.st, p); ghiPhien(khoa, c.st); if (veLai) ve(); },
      nhap, den, di, bao, hoi, h, tho, ui: UI,
      lam(lenh, tc = {}) {
        if (!c.n) { bao('Chưa đăng nhập.', 'loi'); return { ok: false, loi: 'Chưa đăng nhập.' }; }
        const kq = A.lam(c.n, lenh);
        if (!kq.ok) { bao(kq.loi, 'loi'); return kq; }
        if (tc.bao) bao(tc.bao);
        if (tc.den) { const d = typeof tc.den === 'function' ? tc.den(kq.ma) : tc.den; if (Array.isArray(d)) di(d[0], d[1]); else di(d); }
        return kq;
      },
    };
    if (!ST[khoa]) { ST[khoa] = dn?.st ? dn.st(c) : {}; ghiPhien(khoa, ST[khoa]); }
    c.st = ST[khoa];
    return c;
  }

  /* ---------- Vẽ màn đang mở ---------- */
  let dangVe = false, veTiep = false;
  function ve() {
    const { id, q } = tachHash();
    const el = document.querySelector('.screen.active');
    if (!el || (id && el.id !== id && document.getElementById(id))) return;
    const dn = MAN[el.id];
    if (!dn) return;
    if (dangVe) { veTiep = true; return; }   // đang vẽ mà dữ liệu đổi (hàm sau() gọi dat): vẽ thêm một lần khi xong
    dangVe = true;
    try {
      const c = ngucCanh(el.id, el.id === id ? q : '');
      // Giữ ô đang gõ: nhớ ô và vị trí con trỏ, vẽ xong đặt lại
      const o = document.activeElement?.closest?.('[data-st],[data-nhap]');
      const giu = o && el.contains(o) ? { sel: o.dataset.st ? `[data-st="${o.dataset.st}"]` : `[data-nhap="${o.dataset.nhap}"]`, vt: o.selectionStart } : null;
      const kq = dn.ve(c);
      const { than, duoi, dau } = kq instanceof A.Tho || typeof kq === 'string' ? { than: kq } : kq;
      const tieuDe = (typeof dn.ten === 'function' ? dn.ten(c) : dn.ten) || TEN_MAN[el.id] || 'AgiViet';
      el.dataset.title = tieuDe;
      document.title = `${tieuDe} · AgiViet`;
      el.innerHTML = String(h`${dau === false ? '' : dau ?? dauMan(tieuDe, !!el.dataset.nav)}${than}${duoi ? h`<div class="bottom-actions">${duoi}</div>` : ''}`);
      if (giu) { const moi = el.querySelector(giu.sel); if (moi) { moi.focus(); try { if (giu.vt != null) moi.setSelectionRange(giu.vt, giu.vt); } catch { /* ô ngày, ô chọn */ } } }
      dn.sau?.(c, el);
      capNhatNav(c);
    } catch (e) {
      console.error(e);
      el.innerHTML = String(h`${dauMan('Có lỗi')}<div class="bao loi">Màn này gặp lỗi khi vẽ: ${e.message}. Vào Giả lập, nạp lại dữ liệu mẫu rồi thử lại.</div>`);
    } finally {
      dangVe = false;
      if (veTiep) { veTiep = false; queueMicrotask(ve); }
    }
  }
  /** Xóa trạng thái của một màn (để lần mở sau tính lại từ đầu). */
  function xoaSt(id, q = '') { const k = khoaSt(id, q); delete ST[k]; sessionStorage.removeItem(k); }
  // Màn gốc của thanh dưới: không có nút Quay lại, có lối vào Tôi
  const dauMan = (tieuDe, goc = false) => h`<header class="top">${goc ? '' : tho('<button class="icon-btn" type="button" data-bam="_lui" aria-label="Quay lại"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>')}<h1>${tieuDe}</h1>${goc && CH.lienKetToi ? h`<a class="icon-btn" href="${CH.lienKetToi}" aria-label="Tôi">${A.icon('user', 24)}</a>` : ''}${CH.nghe ? tho('<button class="nghe" type="button"><img src="assets/ic-loa.svg" alt="">Nghe</button>') : ''}</header>`;

  /* ---------- Số việc trên điều hướng ---------- */
  function capNhatNav(c) {
    if (!c.n || !CH.soViec) return;
    for (const [tab, so] of Object.entries(CH.soViec(c, A))) {
      document.querySelectorAll(`[data-tab="${tab}"] .ic`).forEach(ic => {
        let b = ic.querySelector('.badge-so');
        if (!so) { b?.remove(); return; }
        if (!b) { b = document.createElement('span'); b.className = 'badge-so'; ic.appendChild(b); }
        b.textContent = so;
      });
    }
  }

  /* ---------- Bấm nút ---------- */
  const SAN = {
    _lui: () => { if (history.length > 1) history.back(); else location.href = CH.trangChu; },
    _dat: (c, el) => c.dat({ [el.dataset.k]: giaTri(el.dataset.v) }),
    _bat: (c, el) => c.dat({ [el.dataset.k]: !c.st[el.dataset.k] }),
    _nhap: (c, el) => { const [khoa, k] = el.dataset.n.split(':'); c.nhap(khoa, {}).dat({ [k]: giaTri(el.dataset.v) }); },
    _nhapBat: (c, el) => { const [khoa, k] = el.dataset.n.split(':'); const n = c.nhap(khoa, {}); n.dat({ [k]: !n.gt[k] }); },
    _mh: (c, el) => {
      const ghi = el.dataset.n ? (() => { const [khoa, k] = el.dataset.n.split(':'); const n = c.nhap(khoa, {}); return [n.gt[k] || [], v => n.dat({ [k]: v })]; })() : [c.st[el.dataset.k] || [], v => c.dat({ [el.dataset.k]: v })];
      const [ds, luu] = ghi, id = el.dataset.id;
      luu(el.dataset.mot ? [id] : ds.includes(id) ? ds.filter(x => x !== id) : [...ds, id]);
    },
    _di: (c, el) => c.di(el.dataset.den, el.dataset.ts ? JSON.parse(el.dataset.ts) : undefined),
  };
  const giaTri = v => (v === 'true' ? true : v === 'false' ? false : v ?? '');
  document.addEventListener('click', async e => {
    const nut = e.target.closest('[data-bam]');
    if (!nut || nut.disabled) return;
    const man = nut.closest('.screen');
    const id = man?.id;
    const dn = id ? MAN[id] : null;
    const ham = SAN[nut.dataset.bam] || dn?.bam?.[nut.dataset.bam];
    if (!ham) return;
    e.preventDefault();
    if (nut.dataset.hoi) {
      const [tieuDe, noiDung, dongY, kieu] = nut.dataset.hoi.split('|');
      if (!(await hoi({ tieuDe, noiDung, dongY, kieu }))) return;
    }
    const { q } = tachHash();
    const c = ngucCanh(id, tachHash().id === id ? q : '');
    await ham(c, nut, e);
  });
  // Ô nhập: ghi vào trạng thái màn (data-st) hoặc bản nháp (data-nhap="khoa:trường"), vẽ lại nếu có data-ve-lai
  const ghiO = e => {
    const o = e.target.closest('[data-st],[data-nhap]');
    if (!o) return;
    const gt = o.type === 'checkbox' ? o.checked : o.value;
    const man = o.closest('.screen');
    if (o.dataset.nhap) { const [khoa, k] = o.dataset.nhap.split(':'); nhap(khoa, {}).dat({ [k]: gt }, false); }
    else { const { id, q } = tachHash(); const khoa = khoaSt(man.id, man.id === id ? q : ''); ST[khoa] ??= docPhien(khoa, null) ?? {}; ST[khoa][o.dataset.st] = gt; ghiPhien(khoa, ST[khoa]); }
    if (o.hasAttribute('data-ve-lai')) ve();
  };
  document.addEventListener('input', ghiO);
  document.addEventListener('change', e => { if (e.target.matches('select,input[type="date"],input[type="datetime-local"],input[type="file"]')) ghiO(e); });

  /* ---------- Mảnh giao diện dùng chung ---------- */
  const NHAN_NHOM = A.nv.NHAN_NHOM;
  const KIEU_CHIP = { xong: 'ok', cho: 'cho', lam: 'lam', loi: 'canh' };
  const thuoc = o => tho(Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => ` data-${k}="${String(v).replace(/"/g, '&quot;')}"`).join(''));
  const UI = {
    icon: A.icon,
    so: A.dd.so, dong: A.dd.dong, luong: A.dd.luong, ngay: A.dd.ngay, gioNgay: A.dd.gioNgay, tuongDoi: A.dd.tuongDoi, docSo: A.dd.docSo, tienGon: A.dd.tienGon,
    nd: iso => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : ''),
    ndNgan: iso => (iso ? iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : ''),
    dong2: (nhan, gt) => h`<div class="row between dong-tt"><span class="muted">${nhan}</span><span class="b">${gt}</span></div>`,
    the: (noi, tc = {}) => (tc.den ? h`<a class="card stack s8 the-link ${tc.vien ? `vien-${tc.vien}` : ''} ${tc.lop || ''}" href="${tc.den}">${noi}</a>` : h`<section class="card stack s8 ${tc.vien ? `vien-${tc.vien}` : ''} ${tc.lop || ''}">${noi}</section>`),
    chip: (chu, kieu) => h`<span class="chip nho ${KIEU_CHIP[kieu] || ''}">${chu}</span>`,
    bao: (chu, kieu = 'thong-tin') => h`<div class="bao ${kieu}" role="${kieu === 'loi' ? 'alert' : 'note'}">${chu}</div>`,
    trong: (tieuDe, chu, hanhDong) => h`<div class="trong-moi"><strong>${tieuDe}</strong>${chu ? h`<p class="small muted">${chu}</p>` : ''}${hanhDong || ''}</div>`,
    nhom: (n, chiTiet) => h`<span class="nhan-nhom ${n}">${NHAN_NHOM[n]}${chiTiet ? ` · ${chiTiet}` : ''}</span>`,
    chang(d) {
      const ch = A.nv.changCua(d), kt = A.nv.KET_THUC.includes(d.trangThai);
      return h`<ol class="chang ${kt ? 'ket-thuc' : ''}" aria-label="Chặng ${Math.min(ch + 1, 6)} trên 6">${A.nv.CHANG.map((t, i) => h`<li class="${i < ch ? 'qua' : i === ch ? 'dang' : ''}">${t}</li>`)}</ol>`;
    },
    /** Nút: bam = tên việc; den = đường dẫn; hoi = "Tiêu đề|Nội dung|Nút đồng ý|kiểu". */
    nut(chu, tc = {}) {
      const lop = `btn ${tc.kieu || ''} ${tc.nho ? 'nho' : ''}`;
      const noi = h`${tc.icon ? A.icon(tc.icon, tc.nho ? 20 : 24) : ''}${chu}`;
      if (tc.den) return h`<a class="${lop}" href="${tc.den}"${thuoc(tc.data)}>${noi}</a>`;
      return h`<button type="button" class="${lop}"${tc.bam ? tho(` data-bam="${tc.bam}"`) : ''}${tc.hoi ? h` data-hoi="${tc.hoi}"` : ''}${thuoc(tc.data)}${tc.tat ? tho(' disabled') : ''}>${noi}</button>`;
    },
    /** Ô nhập gắn với trạng thái màn (k) hoặc bản nháp (n = "khoa:trường"). */
    o(c, tc) {
      const gt = tc.n ? (c.nhap(tc.n.split(':')[0], {}).gt[tc.n.split(':')[1]] ?? '') : (c.st[tc.k] ?? '');
      const gan = tc.n ? h` data-nhap="${tc.n}"` : h` data-st="${tc.k}"`;
      const ve = tc.veLai ? tho(' data-ve-lai') : '';
      const id = `o-${c.id}-${tc.k || tc.n}`.replace(/[^\w-]/g, '-');
      const goi = tc.loi ? h`<span class="loi-chu">${tc.loi}</span>` : tc.goiY ? h`<span class="xs muted">${tc.goiY}</span>` : '';
      if (tc.kieu === 'chu-dai') return h`<label class="truong" for="${id}"><span class="label">${tc.nhan}</span><textarea id="${id}" class="o-van"${gan}${ve} placeholder="${tc.ph || ''}">${gt}</textarea>${goi}</label>`;
      const type = tc.kieu === 'ngay' ? 'date' : tc.kieu === 'gio' ? 'datetime-local' : tc.kieu === 'sdt' ? 'tel' : 'text';
      const im = tc.kieu === 'so' ? tho(' inputmode="decimal"') : tc.kieu === 'sdt' ? tho(' inputmode="tel"') : '';
      return h`<label class="truong" for="${id}"><span class="label">${tc.nhan}</span><span class="o-nhap ${tc.loi ? 'co-loi' : ''}"><input id="${id}" type="${type}"${im}${gan}${ve} value="${gt}" placeholder="${tc.ph || ''}"${tc.min ? h` min="${tc.min}"` : ''}>${tc.donVi ? h`<span class="tien-to">${tc.donVi}</span>` : ''}</span>${goi}</label>`;
    },
    /** Chọn một trong vài lựa chọn bằng nút. lua = [[giá trị, nhãn]]. */
    chon(c, tc) {
      const gt = tc.n ? c.nhap(tc.n.split(':')[0], {}).gt[tc.n.split(':')[1]] : c.st[tc.k];
      const nut = ([v, nhan]) => h`<button type="button" aria-pressed="${String(String(gt) === String(v))}" data-bam="${tc.n ? '_nhap' : '_dat'}"${tc.n ? h` data-n="${tc.n}"` : h` data-k="${tc.k}"`} data-v="${v}">${nhan}</button>`;
      return h`<div class="truong" role="group" aria-label="${tc.nhan || ''}">${tc.nhan ? h`<span class="label">${tc.nhan}</span>` : ''}<div class="${tc.lua.length <= 3 && !tc.boc ? 'phan-doan' : 'chon-boc'}">${tc.lua.map(nut)}</div></div>`;
    },
    chonO(c, tc) {
      const gt = c.st[tc.k] ?? '';
      return h`<label class="truong"><span class="label">${tc.nhan}</span><span class="o-nhap"><select data-st="${tc.k}" data-ve-lai>${tc.lua.map(([v, nhan]) => h`<option value="${v}"${String(v) === String(gt) ? tho(' selected') : ''}>${nhan}</option>`)}</select></span></label>`;
    },
    congTac(c, tc) {
      const bat = tc.n ? !!c.nhap(tc.n.split(':')[0], {}).gt[tc.n.split(':')[1]] : !!c.st[tc.k];
      return h`<button type="button" class="cong-tac" aria-pressed="${String(bat)}" data-bam="${tc.n ? '_nhapBat' : '_bat'}"${tc.n ? h` data-n="${tc.n}"` : h` data-k="${tc.k}"`}><span class="ray"></span><span class="grow b">${tc.nhan}</span></button>`;
    },
    tab(c, k, ds) {
      return h`<div class="phan-doan tab-moi" role="tablist">${ds.map(([v, nhan, so]) => h`<button type="button" role="tab" aria-pressed="${String(c.st[k] === v)}" data-bam="_dat" data-k="${k}" data-v="${v}">${nhan}${so ? h`<span class="badge">${so}</span>` : ''}</button>`)}</div>`;
    },
    anh: (matHang, anhLo, lop = '') => h`<span class="thumb ${lop}"><img src="${A.anhMH(matHang, anhLo)}" alt="${A.tenMH(matHang)}" loading="lazy"></span>`,
    nghe: (noiDung, nhan = 'Nghe') => h`<button type="button" class="btn phu nho" data-noi="${noiDung}"><img src="assets/ic-loa.svg" alt="" style="width:24px;height:24px">${nhan}</button>`,
    tienTrinh: (phan, nhan) => h`<div class="tien-trinh" role="progressbar" aria-label="${nhan}" aria-valuenow="${Math.round(phan * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(0, Math.min(1, phan)) * 100}%"></i></div>`,
    sao: (gt, k) => h`<span class="sao" role="${k ? 'radiogroup' : 'img'}" aria-label="${gt} trên 5 sao">${[1, 2, 3, 4, 5].map(i => (k ? h`<button type="button" class="${i <= gt ? 'co' : ''}" data-bam="_dat" data-k="${k}" data-v="${i}" aria-label="${i} sao">★</button>` : h`<span class="${i <= gt ? 'co' : ''}">★</span>`))}</span>`,
    /** Thẻ lô trong danh sách. */
    theLo(lo, tinhTrang, conBan, soKhach) {
      const NHAN = { dang_ban: ['Đang bán', 'xong'], con_it: ['Còn ít', 'lam'], sap_an: ['Sắp tự ẩn', 'lam'], da_an: ['Đang ẩn', 'loi'], da_chot_het: ['Đã chốt hết', 'cho'] };
      const anh = lo.anh.find(a => !a.startsWith('giay|'));
      return h`<a class="card lo the-link ${tinhTrang === 'sap_an' || tinhTrang === 'da_an' ? 'vien-lam' : ''}" href="${den('chi-tiet-lo', { lo: lo.id })}">
        <div class="row top-align">${UI.anh(lo.matHang, anh)}<div class="grow stack s8"><span class="ten-lo">${lo.ten}</span>
          <div class="row" style="gap:8px;flex-wrap:wrap"><span class="luong">${UI.luong(lo.kg)}</span><span class="qty ${lo.coSo === 'da_can' ? 'can' : 'uoc'}">${lo.coSo === 'da_can' ? 'Đã cân' : 'Ước tính'}</span></div>
          <span class="small muted">${lo.gia ? `${UI.so(lo.gia)} đ/kg` : 'Nhận báo giá'}${lo.haiTu ? ` · hái ${UI.ndNgan(lo.haiTu)}` : ''}</span></div></div>
        <div class="thanh-luong" aria-label="Còn bán được ${UI.luong(conBan)} trên ${UI.luong(lo.kg)}"><i class="giao" style="width:${(lo.giao / lo.kg) * 100}%"></i><i class="hua" style="width:${(Math.max(0, lo.hua - lo.giao) / lo.kg) * 100}%"></i></div>
        <div class="lo-foot">${UI.chip(NHAN[tinhTrang][0], NHAN[tinhTrang][1])}${A.nv.dangBanGap(lo, A.bayGio()) ? UI.chip('Bán gấp', 'loi') : ''}${A.nv.laKemLoai(lo) ? UI.chip(A.nv.NHAN_LOAI[A.nv.loaiCua(lo)]) : ''}${lo.thanhPhan ? UI.chip(`Lô gộp ${lo.thanhPhan.length} hộ`) : ''}${soKhach ? UI.chip(`${soKhach} khách đang hỏi`, 'cho') : ''}<span class="small muted grow" style="text-align:right">còn ${UI.luong(conBan)}</span></div>
      </a>`;
    },
    /** Thẻ đơn trong danh sách. */
    theDon(d, bayGio, dich) {
      const n = A.nv.nhom(d, APP, bayGio);
      const kia = APP === 'ban' ? d.mua.ten : d.ban.ten;
      return h`<a class="card stack s8 the-link ${n === 'lam' ? 'vien-lam' : n === 'loi' ? 'vien-loi' : ''}" href="${dich || den('chi-tiet-don', { ma: d.ma })}">
        <div class="row top-align">${UI.anh(d.matHang, undefined, 'nho')}<div class="grow stack" style="gap:2px"><strong>${d.ma} · ${d.tenLo}</strong><span class="small muted">${kia} · giao ${UI.ndNgan(d.ngayGiao)}</span><span class="small num">${UI.luong(d.kg)} × ${UI.so(d.gia)} đ</span></div></div>
        ${UI.nhom(n, A.nv.NHAN_TRANG_THAI[d.trangThai])}${UI.chang(d)}</a>`;
    },
    /** Thẻ lô nhìn từ bên mua: người bán, vùng, uy tín; không có liên lạc. */
    theNguon(lo, so, bayGio, them = '') {
      const hs = A.mc.hoSoCongKhai(so, lo.ban.id), anh = lo.anh.find(a => !a.startsWith('giay|'));
      return h`<a class="card stack s8 the-link" href="${den('chi-tiet-lo', { lo: lo.id })}">
        <div class="row top-align">${UI.anh(lo.matHang, anh)}<div class="grow stack" style="gap:4px"><span class="ten-lo">${lo.ten}</span>
          <div class="row" style="gap:8px;flex-wrap:wrap"><span class="luong">${UI.luong(A.nv.conBan(lo))}</span><span class="qty ${lo.coSo === 'da_can' ? 'can' : 'uoc'}">${lo.coSo === 'da_can' ? 'Đã cân' : 'Ước tính'}</span></div>
          <span class="small"><strong>${lo.gia ? `${UI.so(lo.gia)} đ/kg` : 'Nhận báo giá'}</strong>${lo.haiTu ? ` · hái ${UI.ndNgan(lo.haiTu)}` : ''}</span></div></div>
        <span class="small muted">${lo.ban.ten} · ${hs?.vung ?? ''}</span>
        <div class="lo-foot">${hs?.daXacMinh ? UI.chip('Đã xác minh', 'xong') : ''}${UI.chip(`Uy tín ${A.nv.NHAN_BAC[hs?.uyTin.bac ?? 'moi']}`)}${A.nv.dangBanGap(lo, bayGio) ? UI.chip('Bán gấp', 'loi') : ''}${A.nv.laKemLoai(lo) ? UI.chip(A.nv.NHAN_LOAI[A.nv.loaiCua(lo)], 'cho') : ''}${lo.vuonId ? UI.chip('Có nguồn gốc', 'xong') : ''}</div>${them}</a>`;
    },
    /** Điểm khớp một lô với một tin cần mua (0–100) và lý do, để xếp nguồn gợi ý. */
    xepHang(n, lo, so) {
      const ly = [];
      let diem = 0;
      if (lo.matHang === n.matHang) { diem += 45; ly.push('Đúng mặt hàng'); } else return { diem: 0, ly };
      const con = A.nv.conBan(lo);
      if (con >= n.kg) { diem += 20; ly.push(`Đủ ${UI.luong(n.kg)}`); } else if (con > 0) { diem += Math.round((con / n.kg) * 20); ly.push(`Có ${UI.luong(con)} / cần ${UI.luong(n.kg)}`); }
      if (n.giaTran && lo.gia && lo.gia <= n.giaTran) { diem += 15; ly.push('Giá dưới giá trần'); } else if (!lo.gia) { diem += 7; ly.push('Nhận báo giá'); }
      if (!lo.haiTu || (lo.haiTu <= n.den && (lo.haiDen ?? lo.haiTu) >= n.tu)) { diem += 10; ly.push('Kịp ngày nhận'); }
      const loai = n.thuocTinh?.loai;
      if (loai && lo.thuocTinh?.loai === loai) { diem += 5; ly.push(`Đúng ${loai}`); }
      const ut = A.mc.hoSoCongKhai(so, lo.ban.id)?.uyTin.bac;
      if (ut === 'tot' || ut === 'rat_tot') { diem += 5; ly.push('Người bán uy tín tốt'); }
      return { diem: Math.min(100, diem), ly };
    },
    /** Bảng dữ liệu: cot = [[nhãn, 'so'?]], dong = mảng các mảng ô (Tho hoặc chữ). */
    bang(cot, dong, chan) {
      return h`<div class="cuon-bang"><table class="bang"><thead><tr>${cot.map(([t, k]) => h`<th class="${k || ''}">${t}</th>`)}</tr></thead>
        <tbody>${dong.map(r => h`<tr class="${r.lop || ''}">${(r.o || r).map((o, i) => h`<td class="${cot[i]?.[1] || ''}">${o}</td>`)}</tr>`)}</tbody>${chan ? h`<tfoot><tr>${chan.map((o, i) => h`<td class="${cot[i]?.[1] || ''}">${o}</td>`)}</tr></tfoot>` : ''}</table></div>`;
    },
    /** Tải bảng thành tệp CSV (mở bằng Excel). */
    taiCsv(ten, dong) {
      const csv = '﻿' + dong.map(r => r.map(o => `"${String(o ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = ten; a.click();
    },
    /** Lưới chọn mặt hàng (một hoặc nhiều). Lưu vào trạng thái màn (k) hoặc bản nháp (n). */
    chonMH(c, tc) {
      const chon = (tc.n ? c.nhap(tc.n.split(':')[0], {}).gt[tc.n.split(':')[1]] : c.st[tc.k]) || [];
      const tim = c.st._timMH || '', nhom = c.st._nhomMH || 'trai-cay';
      const ds = tim.trim() ? A.dm.timTheoChu(tim, 60) : A.dm.MAT_HANG.filter(m => m.nhom === nhom);
      const gan = tc.n ? h` data-n="${tc.n}"` : h` data-k="${tc.k}"`;
      return h`<div class="stack s8">
        ${UI.o(c, { k: '_timMH', nhan: 'Tìm mặt hàng', ph: 'Gõ: xoài, tôm, cà phê…', veLai: true })}
        ${tim.trim() ? '' : h`<div class="cuon-ngang">${A.dm.NHOM_HANG.map(g => h`<button type="button" class="pill-nhom" aria-pressed="${String(g.id === nhom)}" data-bam="_dat" data-k="_nhomMH" data-v="${g.id}"><img src="assets/dm/icon/${g.icon}.svg" alt="">${g.ten}</button>`)}</div>`}
        <div class="luoi-mh-moi">${ds.map(m => h`<button type="button" aria-pressed="${String(chon.includes(m.id))}" data-bam="_mh"${gan} data-id="${m.id}"${tc.mot ? tho(' data-mot="1"') : ''}><img src="${A.anhMH(m.id)}" alt="" loading="lazy"><span>${m.ten}</span>${m.muc === 'D' ? h`<small>có điều kiện</small>` : ''}</button>`)}</div>
        ${!ds.length ? h`<p class="small muted">Không thấy mặt hàng. Thử gõ tên khác.</p>` : ''}
      </div>`;
    },
  };

  /* ---------- Xuất ra cho các trang ---------- */
  window.AM = {
    TRANG, MAN_O_TRANG, APP, den, di, bao, hoi, nhap, ve, xoaSt, ui: UI, tachHash,
    man(id, dn) { MAN[id] = dn; if (document.querySelector('.screen.active')?.id === id) ve(); },
  };
  A.theoDoi(() => ve());
  setInterval(ve, 20000);
})();
