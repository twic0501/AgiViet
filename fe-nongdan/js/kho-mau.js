// Kho giao dịch mẫu dùng chung hai app (cùng tên miền → cùng localStorage "av.demo"). Chép giống hệt ở fe-nongdan và fe-thumua.
// Một giao dịch đi hết vòng: nhu cầu → kết nối → đồng ý → đơn → hai bên xác nhận → kết quả cân (tự khai) → người bán xác nhận
// → khoản tiền → bên mua báo đã trả → người bán xác nhận. Cùng một mã đơn ở cả hai app; hai tab tự cập nhật qua sự kiện "storage".
(() => {
  const KHOA = 'av.demo';
  const NGUOI_BAN = 'Chị Năm · Mỹ Xương';
  // Tên bên mua: tổ chức vừa đăng ký ở trang đăng nhập bản thử (fe-thumua/dang-nhap.html), mặc định Nhà máy sấy Đồng Xanh
  const NGUOI_MUA = (() => { try { return JSON.parse(localStorage.getItem('tm.tai-khoan'))?.to_chuc || 'Nhà máy sấy Đồng Xanh'; } catch { return 'Nhà máy sấy Đồng Xanh'; } })();
  const macDinh = () => ({
    phien_ban: 2,
    lots: [
      { id: 'xoai', ten: 'Xoài cát Chu', sp: 'mango', kg: 10000, coSo: 'uoc_tinh', gia: null, hua: 10000, huaVoi: 'Bên mua B', giao: 5000, anh: 'assets/anh/mh/mango.jpg' },
      { id: 'thanh-long', ten: 'Thanh long ruột đỏ', sp: 'dragon-fruit', kg: 3200, coSo: 'da_can', gia: 18000, hua: 0, huaVoi: null, giao: 0, anh: 'assets/anh/mh/dragon-fruit.jpg' },
      { id: 'tom', ten: 'Tôm thẻ', sp: 'shrimp', kg: 1500, coSo: 'uoc_tinh', gia: null, hua: 800, huaVoi: 'Vựa Út Hiền', giao: 0, anh: 'assets/anh/mh/shrimp.jpg' },
    ],
    needs: [], conns: [], orders: [], coc: 'da_nhan',
    luot: { tin: null, ket_noi: null },          // bộ đếm do app mua khởi tạo từ số mẫu
    so: { nhu_cau: 15, don: 250 },
  });
  const doc = () => { try { const d = JSON.parse(localStorage.getItem(KHOA)); return d && d.phien_ban === 2 ? d : macDinh(); } catch { return macDinh(); } };
  const ghi = d => { try { localStorage.setItem(KHOA, JSON.stringify(d)); } catch { /* bỏ qua */ } nghe.forEach(f => f(d)); };
  const nghe = [];
  const doi = fn => { const d = doc(); const kq = fn(d); ghi(d); return kq; };
  const tien = (kg, gia) => Math.round(kg * gia);
  const bayGio = () => Date.now();

  const AV = {
    NGUOI_BAN, NGUOI_MUA,
    doc, doi, datLai: () => { localStorage.removeItem(KHOA); nghe.forEach(f => f(doc())); },
    theoDoi: f => { nghe.push(f); },
    tien,
    TRANG_THAI: {
      cho_ban_xac_nhan: 'Chờ người bán xác nhận đơn', da_xac_nhan: 'Hai bên đã xác nhận · chờ giao, cân',
      cho_ban_xn_kq: 'Kết quả cân chờ người bán xác nhận', da_chot: 'Đã chốt kết quả · chờ trả tiền',
      bao_da_tra: 'Bên mua báo đã trả · chờ người bán xác nhận', da_nhan_tien: 'Người bán đã nhận đủ · đóng', chua_thay_tien: 'Người bán chưa thấy tiền · đang đối soát',
    },
    // Bên mua
    dangNhuCau: ({ sp, kg, tu, den }) => doi(d => { const n = { code: 'N-' + String(d.so.nhu_cau++).padStart(3, '0'), sp, kg, tu, den, luc: bayGio() }; d.needs.unshift(n); return n; }),
    ketNoi: loId => doi(d => { const lo = d.lots.find(l => l.id === loId); if (!lo) return null; let c = d.conns.find(x => x.lot === loId); if (!c) { c = { id: 'kn-' + bayGio().toString(36), lot: loId, tenLo: lo.ten, nguoiMua: NGUOI_MUA, trangThai: 'cho', luc: bayGio() }; d.conns.unshift(c); } return c; }),
    taoDon: (loId, kg, gia) => doi(d => { const lo = d.lots.find(l => l.id === loId); const o = { code: 'HĐ-0' + d.so.don++, lot: loId, tenLo: lo.ten, anh: lo.anh, kg, gia, nguoiMua: NGUOI_MUA, nguoiBan: NGUOI_BAN, trangThai: 'cho_ban_xac_nhan', luc: bayGio(), ls: [['Bên mua tạo đơn', bayGio()]] }; d.orders.unshift(o); return o; }),
    nhapKetQua: (code, nhan, tuChoi) => doi(d => { const o = d.orders.find(x => x.code === code); o.kq = { nhan, tuChoi, nhan_luc: bayGio(), nhan_nguon: 'tu_khai' }; o.trangThai = 'cho_ban_xn_kq'; o.ls.push([`Bên mua nhập cân: nhận ${nhan} kg, không nhận ${tuChoi} kg (tự khai)`, bayGio()]); return o; }),
    baoDaTra: (code, so) => doi(d => { const o = d.orders.find(x => x.code === code); o.tra = { so, luc: bayGio() }; o.trangThai = 'bao_da_tra'; o.ls.push([`Bên mua báo đã trả ${so.toLocaleString('vi-VN')} đ`, bayGio()]); return o; }),
    // Bên bán
    traLoiKetNoi: (id, dongY) => doi(d => { const c = d.conns.find(x => x.id === id); if (c) { c.trangThai = dongY ? 'dong_y' : 'tu_choi'; c.traLoi = bayGio(); } return c; }),
    xacNhanDon: code => doi(d => { const o = d.orders.find(x => x.code === code); const lo = d.lots.find(l => l.id === o.lot); o.trangThai = 'da_xac_nhan'; lo.hua += o.kg; lo.huaVoi = NGUOI_MUA; o.ls.push(['Người bán xác nhận đơn · giữ ' + o.kg + ' kg', bayGio()]); return o; }),
    xacNhanKetQua: (code, dung) => doi(d => {
      const o = d.orders.find(x => x.code === code);
      if (dung) { o.trangThai = 'da_chot'; o.kq.nhan_nguon = 'ben_kia_xac_nhan'; o.phaiTra = tien(o.kq.nhan, o.gia); const lo = d.lots.find(l => l.id === o.lot); lo.giao += o.kq.nhan; o.ls.push([`Người bán xác nhận kết quả · phải trả ${o.phaiTra.toLocaleString('vi-VN')} đ`, bayGio()]); }
      else { o.trangThai = 'da_xac_nhan'; o.kq.phanDoi = true; o.ls.push(['Người bán không đồng ý kết quả cân · bên mua nhập lại hoặc mở đối soát', bayGio()]); }
      return o;
    }),
    xacNhanTien: (code, du) => doi(d => { const o = d.orders.find(x => x.code === code); const doiSoat = o.trangThai === 'chua_thay_tien'; o.trangThai = du ? 'da_nhan_tien' : 'chua_thay_tien'; o.ls.push([du ? (doiSoat ? 'Người bán thấy tiền · đóng đối soát, đã nhận đủ' : 'Người bán xác nhận đã nhận đủ') : 'Người bán báo chưa thấy tiền · mở đối soát', bayGio()]); return o; }),
    // Lượng còn bán được = lượng lô − đã hứa (đơn đã hai bên xác nhận)
    conBan: lo => Math.max(0, lo.kg - (lo.hua || 0)),
    // Đối soát: chứng từ và ghi chú của từng bên, gắn vào đúng một đơn
    guiChungTu: (code, ten) => doi(d => { const o = d.orders.find(x => x.code === code); (o.chungTu ||= []).push({ ten, ben: 'mua', luc: bayGio() }); o.ls.push([`Bên mua gửi chứng từ: ${ten}`, bayGio()]); return o; }),
    ghiDoiSoat: (code, ben, noiDung) => doi(d => { const o = d.orders.find(x => x.code === code); (o.doiSoat ||= []).push({ ben, noiDung, luc: bayGio() }); o.ls.push([`${ben === 'ban' ? 'Người bán' : 'Bên mua'}: ${noiDung}`, bayGio()]); return o; }),
  };
  window.AV = AV;
  window.addEventListener('storage', e => { if (e.key === KHOA || e.key === null) nghe.forEach(f => f(doc())); });
})();
