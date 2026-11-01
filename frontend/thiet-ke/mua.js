// App MUA AgiViet — bản thiết kế 49 màn (danh mục "App Thu mua"), dữ liệu mẫu theo AgiViet_prompt_app_mua_V2.md.
// Một người mua làm hết (chị Thu Hà, Nhà máy sấy Đồng Xanh). Máy tính + điện thoại dùng chung trạng thái.
import { esc, d, kg, so, icon, taoKho, chayApp } from "./so-lam-an.js";
import { BANG, bangTrang, tenAi } from "./kich-ban-bang.js";
import { DT_PHA, dtTien, tinhTien, docHD, ghiHD, datLaiHD, ngheHD, docTC, ghiTC, ngheTC, quetLienLac, gioNay, moLienLacT1 } from "./giao-dich-chung.js";

// ── Dữ liệu ──
const BOI_HOAN = 1200000, TRA_VP = 32200000 + 1200000;
// Trả sau nghiệm thu: không trả trước khi bốc; chốt nghiệm thu xong mới chuyển phần còn lại (nghiệm thu − cọc), rồi ngân hàng chuyển cọc
const BKK_COC = 1200 * 23000 * 0.3, BKK_HOAN = 13800000 - 1200 * 23000 * 0.3;   // bất khả kháng: còn 1.200 kg
const TS = (h) => h.kb === "tra-sau" || h.kb === "chua-tra" || h.kb === "tien-mat" || h.kb === "ung";
const CK = (h) => h.kb === "nh-cam-ket" || h.kb === "nh-tu-choi";   // trả sau qua ngân hàng: không cọc, ngân hàng cam kết thanh toán
const UNG = 20000000, PHI_UNG = 200000, KD_PHI = 850000;
const TRA_SAU = (h) => tinhTien(h).nt - 13800000;
const TONG_CHUYEN_COC = 13938000, COC = 13800000, PHI = 138000, TRA_THANG = 32200000, NGHIEM_THU = 44350000, COC_CHO_NB = 12150000, HOAN = 1650000;
const BUOC = [
  { ai: "ban", lam: "Đồng ý giá: hàng được giữ 24 giờ", nut: "Đồng ý giá" },
  { ai: "ban", lam: "Soạn và ký thỏa thuận", nut: "Ký và gửi" },
  { ai: "nb", lam: "Người bán xem lại và ký", mp: "Mô phỏng: chị Năm ký" },
  { ai: "ban", lam: `Chuyển cọc ${d(TONG_CHUYEN_COC)}`, nut: `Chuyển cọc ${d(TONG_CHUYEN_COC)}`, han: "48 giờ sau khi người bán ký" },
  { ai: "nh", lam: "Ngân hàng xác nhận cọc · mở liên lạc", mp: "Mô phỏng: ngân hàng xác nhận" },
  { ai: "ban", lam: `Trả thẳng ${d(TRA_THANG)} cho người bán`, nut: "Ghi đã trả", han: "trước 5:30 ngày 28/10" },
  { ai: "nb", lam: "Người bán xác nhận đúng số", mp: "Mô phỏng: chị Năm xác nhận số đã nhận" },
  { ai: "nb", lam: "Xe tới vườn: quét mã 482 917, bốc, niêm phong mẫu M-2291", mp: "Mô phỏng: xe bốc xong" },
  { ai: "ban", lam: "Xem video lúc bốc → Đạt khi bốc", nut: "Đạt khi bốc" },
  { ai: "ban", lam: "Kho ký nhận (bắt đầu 2 giờ nghiệm thu)", nut: "Ký nhận" },
  { ai: "ban", lam: "Nghiệm thu 3 phần", nut: "Gửi kết quả", han: "2 giờ từ lúc ký nhận" },
  { ai: "nb", lam: "Người bán đồng ý kết quả", mp: "Mô phỏng: chị Năm đồng ý", han: "24 giờ" },
  { ai: "nh", lam: "Ngân hàng xử lý cọc", mp: "Mô phỏng: ngân hàng chi cọc" },
  { ai: "ban", lam: `Xác nhận tiền hoàn ${d(HOAN)} đã về`, nut: `Đã nhận lại ${d(HOAN)}` },
  { ai: "ban", lam: "Hoàn tất: nhập kho, bảng kê, đánh giá", nut: "Nhập kho" },
];
const AI = { ban: "Bạn", nb: "Người bán", nh: "Ngân hàng", vh: "Người vận hành" };

const DAU = {
  phien: "mua-v1",
  goi: "free",
  hd: { buoc: 0, daTra: 0, nbXn: 0, traThieu: false, loTra: 0 },
  chao: { rut: 0, chon: null },
  hoiChon: "PN-0042",
};
const kho = taoKho("agv-mua", DAU);
// HĐ-0018 dùng chung với app bán (giao-dich-chung.js): đọc trước mỗi thao tác, ghi lại sau; bên kia đổi thì vẽ lại
kho.s.hd = docHD();
const doi = (f) => kho.doi((s) => { s.hd = docHD(); f(s); ghiHD(s.hd); });
ngheHD(() => kho.doi((s) => { s.hd = docHD(); }));
ngheTC(() => kho.doi(() => {}));

const LO = [
  { ma: "L-0412", ten: "Xoài cát Chu loại 1", nguoi: "Chị Năm", noi: "Mỹ Xương, Cao Lãnh, Đồng Tháp", gia: 23000, con: 3500, hai: "27/10", uy: 4.8, don: 31, anh: "xoai", kiem: true },
  { ma: "L-0431", ten: "Xoài cát Hòa Lộc loại 1", nguoi: "Anh Tư Hòa", noi: "Cái Bè, Tiền Giang", gia: 31500, con: 1800, hai: "29/10", uy: 4.6, don: 12, anh: "xoai", kiem: false },
  { ma: "L-0440", ten: "Thanh long ruột đỏ", nguoi: "HTX Tân Thuận", noi: "Chợ Gạo, Tiền Giang", gia: 14200, con: 6000, hai: "30/10", uy: 4.7, don: 58, anh: "thanh-long", kiem: true },
  { ma: "L-0398", ten: "Bưởi da xanh loại 1", nguoi: "Anh Sáu", noi: "Mỏ Cày Bắc, Bến Tre", gia: 28000, con: 2200, hai: "02/11", uy: 4.9, don: 44, anh: "buoi", kiem: true },
  { ma: "L-0427", ten: "Tôm thẻ chân trắng 60 con/kg", nguoi: "Chị Bảy Hồng", noi: "Đầm Dơi, Cà Mau", gia: 118000, con: 900, hai: "28/10", uy: 4.5, don: 9, anh: "tom", kiem: false },
  { ma: "L-0436", ten: "Sầu riêng Ri6 loại 1", nguoi: "Anh Huỳnh Bảy", noi: "Cai Lậy, Tiền Giang", gia: 62000, con: 1500, hai: "31/10", uy: 4.4, don: 17, anh: "sau", kiem: false },
];
const CHAO = [
  { nguoi: "Chị Năm", lo: "L-0412", gia: 23000, giao: "Tại vườn · bạn tự lo xe 180 km", phiXe: 900, ngay: "28/10", uy: 4.8, luong: 2000, ha: 15000 },
  { nguoi: "Anh Tư Hòa", lo: "L-0431*", gia: 23500, giao: "Giao tận kho Đồng Xanh", phiXe: 0, ngay: "30/10", uy: 4.1, luong: 1500, ha: 16000 },
  { nguoi: "HTX Tân Thuận", lo: "L-0445", gia: 22800, giao: "Tại vườn · bạn tự lo xe 230 km", phiXe: 1500, ngay: "29/10", uy: 4.7, luong: 2000, ha: 14000 },
];
const NHU_CAU = [
  { ma: "PN-0042", hang: "Xoài cát Chu loại 1", luong: 2000, khoang: "27–29/10", tran: 24000, bao: 3, trang: "Đang nhận báo giá" },
  { ma: "PN-0045", hang: "Thanh long ruột đỏ loại 1–2", luong: 5000, khoang: "01–05/11", tran: 15000, bao: 1, trang: "Đang nhận báo giá" },
  { ma: "PN-0039", hang: "Bưởi da xanh loại 1", luong: 1200, khoang: "20–22/10", tran: 29000, bao: 4, trang: "Đã chốt · HĐ-0015" },
];
const DON_KHAC = [
  { ma: "HĐ-0024", hang: "Sầu riêng Ri6 · 800 kg", nguoi: "Anh Huỳnh Bảy", buoc: "Người bán đề nghị đổi ngày giao 28/10 → 29/10", luot: "ban", han: "còn 5 giờ", tien: 49600000 },
  { ma: "HĐ-0021", hang: "Thanh long ruột đỏ · 3.000 kg", nguoi: "HTX Tân Thuận", buoc: "Ngân hàng đang xác nhận cọc", luot: "nh", han: "trong ngày", tien: 42600000 },
  { ma: "HĐ-0012", hang: "Xoài cát Chu · 1.500 kg", nguoi: "Chị Mười", buoc: "Lệch tiền, đang đối soát (bạn báo 32.200.000 · bên bán thấy 20.000.000)", luot: "vh", han: "còn 1 ngày", tien: 34500000 },
  { ma: "HĐ-0015", hang: "Bưởi da xanh · 1.200 kg", nguoi: "Anh Sáu", buoc: "Hoàn tất", luot: "xong", han: "", tien: 33600000 },
];

// ── Trạng thái đơn HĐ-0018 (8 kịch bản, prompt app mua V2 mục 8) ──
const KICH_BAN = [["thuan", "1 · Luồng thuận"], ["doi-ngay", "2 · Người bán đề nghị đổi ngày giao trước khi ký"], ["thieu", "3 · Trả thiếu rồi bổ sung"], ["lech", "4 · Lệch tiền (bạn báo 32,2 tr, bên bán thấy 20 tr)"], ["tra-lai", "5 · Trả lại nhiều (700 kg)"], ["phan-doi", "6 · Người bán phản đối một dòng"], ["can-lech", "7 · Cân tại kho 1.960 kg (trong ±5%)"], ["huy", "8 · Xin hủy sau cọc"], ["khong-giao", "9 · Người bán không giao"], ["im-lang", "10 · Người bán im lặng khi nghiệm thu"], ["tra-sau", "11 · Trả sau nghiệm thu (luồng chính v23)"], ["chua-tra", "12 · Trả sau: bên mua chưa trả"], ["tien-mat", "13 · Tiền mặt khi nhận"], ["bkk", "14 · Bất khả kháng: chỉ giao được 1.200 kg"], ["khac-mau", "15 · Hàng tới khác mẫu lúc bốc"], ["hang-tra", "16 · Xử lý hàng bị trả lại"], ["hai-can", "17 · Lấy tại vườn: hai cân lệch"], ["du-luong", "18 · Dư lượng không đạt"], ["hai-kq", "19 · Hai phòng kiểm cho kết quả khác nhau"], ["nh-cam-ket", "20 · Trả sau qua ngân hàng (cam kết thanh toán)"], ["nh-tu-choi", "21 · Trả sau qua ngân hàng: bên mua từ chối hàng đạt"], ["ung", "22 · Người bán ứng tiền từ ngân hàng"], ["bien-the", "23 · Tại vườn: sai người, đòi hạ giá, xe thiếu tải"], ["nhieu-de-nghi", "24 · Trước hợp đồng: nhiều đề nghị, so tiền ròng"], ["bo-cuoc", "25 · Trước hợp đồng: được chọn nhưng không ký"], ["xem-hang", "26 · Trước hợp đồng: đến xem vườn rồi chưa mua"], ["dang-ky", "27 · Người bán đăng ký: xác minh và phân hạng"], ["dau-ra", "28 · Không tìm được đầu ra"], ["dat-truoc", "29 · Đặt trước khi hái"], ...Object.entries(BANG).map(([k, v], i) => [k, `${30 + i} · ${v.meta.tom}`])];
const hdTien = (h) => {
  const bt = bangTrang(h); if (bt) return { banChi: bt.tien[0], nh: bt.tien[1], nb: bt.tien[2] };
  const b = h.buoc, t = tinhTien(h);
  // Người bán vi phạm (không giao): cọc + phí hoàn bạn; người bán trả lại phần đã nhận trước (+ bồi hoàn tiền xe, ghi riêng)
  if (h.kb === "dat-truoc") { const x = dtTien(h); return { banChi: x.banChi, nh: x.nh, nb: x.nb }; }
  if (h.no) return { banChi: COC + PHI, nh: 0, nb: COC };
  if (CK(h)) return { banChi: h.tcXong ? KD_PHI : 0, nh: 0, nb: h.nbXn || 0 };
  if (h.kb === "ung") { const b = h.buoc; return { banChi: (b >= 4 ? COC + PHI : 0) + (h.daTra || 0), nh: b >= 4 && b < 13 ? COC : 0, nb: h.nbXn || 0 }; }
  if (h.kb === "du-luong" && h.dlHoan) return { banChi: PHI + (h.dlXong ? 0 : h.daTra || 0), nh: 0, nb: h.dlXong ? 0 : h.nbXn || 0 };
  if (h.kb === "bkk" && h.bkkXong) return { banChi: COC + PHI - BKK_HOAN, nh: BKK_COC, nb: 0 };
  if (h.vp) return { banChi: (h.huy ? 0 : COC + PHI) + (h.vpXong ? 0 : h.daTra || 0), nh: h.huy ? 0 : COC, nb: h.vpXong ? 0 : h.nbXn || 0 };
  if (h.huy) return { banChi: COC + PHI, nh: 0, nb: COC };
  const banChi = (b >= 4 ? COC + PHI : 0) + (h.daTra || 0) - (h.hoanXn || b >= 14 ? t.hoanMua : 0) - (h.nbHoanXn ? t.nbHoan : 0);
  const nh = b >= 4 && b < 13 ? COC : 0;
  const nb = (h.nbXn || 0) + (b >= 13 ? t.cocNB : 0) - (h.nbHoanXn ? t.nbHoan : 0);
  return { banChi, nh, nb };
};
const hdChan = (h) => {
  if (h.buoc === 7 && h.nbXn < TRA_THANG && h.nbXn > 0 && h.kb !== "lech" && !TS(h)) return `Chưa bốc được: người bán mới xác nhận ${so(h.nbXn)} / ${d(TRA_THANG)}`;
  return "";
};
const hdLuot = (h) => {
  const bt = bangTrang(h); if (bt) return bt.xong ? "xong" : ({ mua: "ban", ban: "nb", nh: "nh" }[bt.b.ai] || "vh");
  if (h.no) return "xong";
  if (h.kb === "bkk" && (h.bkkXong || h.phu)) return h.bkkXong ? "xong" : { bkk: "vh", "bkk-tl": "ban", "bkk-de": "nb", "bkk-ky": "ban", "bkk-cho-ban": "nb", "bkk-hoan": "nh" }[h.phu] || "ban";
  if (h.kb === "khac-mau" && h.phu === "km") return "vh";
  if (h.kb === "dang-ky") return { "": "nb", "dk-xm": "vh", "dk-hang": "nb", "dk-xong": "xong" }[h.phu || ""];
  if (h.kb === "dau-ra") return { "": "vh", "dr-nv": "vh", "dr-tach": "nb", "dr-cb": "ban", "dr-ngay4": "vh", "dr-hoi": "nb", "dr-xong": "xong" }[h.phu || ""];
  if (h.kb === "dat-truoc") return ["ban", "nb", "ban", "nb", "ban", "nb", "ban", "nb", "nh", "xong"][dtTien(h).i];
  if (h.kb === "nhieu-de-nghi" && h.buoc === 0) return "nb";
  if (h.kb === "bo-cuoc" && (h.phu === "mo-lai" || h.phu === "hoi-a" || h.phu === "a-con" || h.phu === "chon-a")) return "xong";
  if (h.kb === "xem-hang" && h.buoc === 0) return { "": "ban", "ks-cho": "nb", "ks-lich": "ban", "ks-xong": "xong" }[h.phu || ""];
  if (h.kb === "bien-the" && h.buoc === 7 && !h.btXong) return { "": "nb", bt1: "ban", bt2: "ban", bt3: "nb", bt4: "ban", bt5: "nb" }[h.phu || ""] || "nb";
  if (h.kb === "hai-can" && h.buoc === 7 && !h.canXong) return { "": "nb", can1: "ban", "can-lech2": "nb", "can-chot": "ban" }[h.phu || ""] || "nb";
  if (h.kb === "du-luong" && h.buoc === 12) return h.dlXong ? "xong" : { "": "nh", "dl-hong": "nb", "dl-kiem-lai": "nh", "dl-loi": "nh", "dl-cho-nb-hoan": "nb", "dl-da-hoan": "ban" }[h.phu || ""] || "nh";
  if (h.kb === "hai-kq" && h.buoc === 12 && !h.hkXong) return { "": "nh", kq1: "nb", "kq2-cho": "nh", trai: "vh", "hk-phi": "ban", "hk-phi-cho": "nb" }[h.phu || ""] || "nh";
  if (h.kb === "hang-tra" && h.buoc === 14 && !h.hangXong) return h.hangChon ? "vh" : "nb";
  if (TS(h) && h.buoc === 12 && !h.traSauXong) return h.phu === "cho-xn-sau" ? "nb" : h.phu === "xu-ly-no" || h.phu === "ung-nh" ? "nh" : "ban";
  if (h.kb === "ung" && h.buoc === 7 && h.phu === "ung-cho") return "nh";
  if (CK(h)) {
    if (h.tcXong) return "xong";
    if (h.buoc === 3) return "nh";
    if (h.phu) return { tc: "vh", "tc-dat": "vh", "tc-duyet": "nh", "tc-phi": "ban", "cho-xn-gn": "nb" }[h.phu] || "nh";
    if (h.buoc === 12) return "nh";
  }
  if (h.kb === "khong-giao") {
    if (h.vpXong) return "xong";
    if (h.phu === "khong-hang" || h.phu === "cho-nb-tra") return "nb";
    if (h.phu === "vi-pham") return "nh";
    if (h.phu === "nb-da-tra-vp") return "ban";
  }
  if (h.kb === "im-lang" && h.buoc === 11 && h.phu === "nhac") return "vh";
  if (h.huy || h.buoc >= BUOC.length) return "xong";
  if (h.phu === "xin-huy") return "nb";
  if (h.phu === "de-nghi" || h.phu === "lech" || h.phu === "phan-doi" || hdChan(h)) return "ban";
  if (h.phu === "cho-vh") return "vh";
  if (h.phu === "can-lai" || h.phu === "kiem-dinh") return "nb";
  if (h.kb === "tra-lai" && h.buoc === 13) return h.phu === "cho-nb-hoan" ? "nb" : "ban";
  return BUOC[h.buoc].ai;
};
const lamBuoc = (i, h) => {
  const t = tinhTien(h);
  if (i === 10) return `Nghiệm thu 3 phần (${so(t.dat)} · ${so(t.ha)} · ${so(t.tra)} kg)`;
  if (i === 12) return t.nbHoan ? "Ngân hàng hoàn hết cọc cho bạn" : `Ngân hàng chi ${so(t.cocNB)} đ cho người bán, hoàn ${so(t.hoanMua)} đ cho bạn`;
  if (i === 13) return t.nbHoan ? `Nhận lại cọc ${d(t.hoanMua)} + người bán hoàn ${d(t.nbHoan)}` : `Xác nhận tiền hoàn ${d(t.hoanMua)} đã về`;
  if (i === 5 && h.ban === 2) return `Trả thẳng ${d(TRA_THANG)} cho người bán (hạn dời theo bản 2)`;
  return BUOC[i].lam;
};
const hdTienSauBuoc = (i, h) => {
  const t = tinhTien(h);
  return ["Hàng được giữ 24 giờ", h.ban === 2 ? "Thỏa thuận bản 2 (giao 29/10)" : "", "", "Đã chuyển cọc, chờ ngân hàng xác nhận", "Ngân hàng giữ 13.800.000 đ · liên lạc mở", TS(h) ? "Không trả trước: trả sau nghiệm thu" : `Đã báo trả ${d(h.daTra || TRA_THANG)}`, TS(h) ? "Bốc trước, trả sau" : `Người bán đã nhận ${d(h.nbXn || TRA_THANG)}`,
    "Rủi ro đường từ đây thuộc bạn", "", "", `Giá trị nghiệm thu ${d(t.nt)}`, h.kb === "phan-doi" ? "Chốt theo kiểm định: hạ cấp 104 kg" : "", t.nbHoan ? `Cọc ${d(TIEN_COC())} hoàn bạn · người bán phải hoàn ${d(t.nbHoan)}` : `${d(t.cocNB)} sang chị Năm · ${d(t.hoanMua)} hoàn bạn`, `Chi ròng cho hàng ${d(t.nt)}`, ""][i];
};
const TIEN_COC = () => COC;
const viecCan = (s) => (hdLuot(s.hd) === "ban" ? 1 : 0) + DON_KHAC.filter((x) => x.luot === "ban").length + 1;

function veBuoc(h, gon = false) {
  const chan = hdChan(h);
  return `<ol class="sl-buoc">${BUOC.map((b, i) => {
    const xong = i < h.buoc, nay = i === h.buoc && !h.huy;
    const lop = xong ? "sl-b-xong" : nay ? (chan && i === 7 || h.phu === "lech" ? "sl-b-nay sl-b-chan" : "sl-b-nay") : "sl-b-cho";
    if (gon && !nay && Math.abs(i - h.buoc) > 2) return "";
    return `<li class="${lop}${xong && i === h.buoc - 1 ? " sl-moi" : ""}"><span class="sl-b-vong">${xong ? icon("tich") : i + 1}</span><div>
      <span class="sl-b-ai">${AI[b.ai]}${b.han && !xong ? ` · hạn ${esc(i === 5 && h.ban === 2 ? "trước 5:30 ngày 29/10" : b.han)}` : ""}</span>
      <b>${esc(lamBuoc(i, h))}</b>
      ${xong && hdTienSauBuoc(i, h) ? `<div class="sl-b-tien">${esc(hdTienSauBuoc(i, h))}</div>` : ""}
      ${nay && chan && i === 7 ? `<div class="sl-b-ly">${esc(chan)}</div>` : ""}
    </div></li>`;
  }).join("")}</ol>`;
}
function veTienO(h) {
  const t = hdTien(h), k = tinhTien(h);
  return `<div class="sl-tien-o" id="tien-o">
    <div><small>Bạn đã chi</small><b class="sl-so" data-v="${t.banChi}">${d(t.banChi)}</b><span class="sl-ghi">${h.vp ? (h.vpXong ? "cọc, phí, tiền trước đã hoàn đủ" : h.huy ? "cọc và phí đã hoàn; chờ chị Năm trả lại" : "người bán vi phạm, chờ hoàn") : h.huy ? "cọc chuyển người bán, phí không hoàn" : h.buoc === 13 && !h.hoanXn ? `chờ hoàn ${so(k.hoanMua)} đ` : h.buoc >= 14 ? (TS(h) ? "cọc chuyển hết cho chị Năm, không có hoàn" : "đã nhận lại tiền hoàn") : "gồm phí 138.000 đ"}</span></div>
    <div><small>Ngân hàng giữ</small><b class="sl-so" data-v="${t.nh}" style="color:var(--chin)">${d(t.nh)}</b><span class="sl-ghi">${t.nh ? (h.buoc === 4 ? "đã chuyển, chờ xác nhận" : "cọc 30%") : h.buoc >= 13 ? "đã xử lý cọc" : "chưa có cọc"}</span></div>
    <div><small>Chị Năm đã nhận</small><b class="sl-so" data-v="${t.nb}" style="color:var(--la)">${d(t.nb)}</b><span class="sl-ghi">${h.vp ? (h.vpXong ? "đã trả lại bạn" : "phải trả lại bạn") : h.phu === "lech" || h.phu === "cho-vh" ? "đang đối soát phần lệch" : (h.daTra || 0) > (h.nbXn || 0) ? `chờ xác nhận ${so(h.daTra - h.nbXn)} đ` : "đã xác nhận đúng số"}</span></div>
  </div>`;
}
const nutMp = (chu, lam) => `<button class="sl-nut sl-mp" data-lam="${lam}">${esc(chu)}</button>`;
const nutVang = (chu, lam) => `<button class="sl-nut sl-vang" data-lam="${lam}">${esc(chu)}</button>`;
const theViec = (lop, tieu, p, nut) => `<div class="sl-viec ${lop}"><div><h2>${esc(tieu)}</h2><p>${p}</p></div><div class="sl-hang-nut">${nut}</div></div>`;
function veViec(h, url) {
  const luot = hdLuot(h), t = tinhTien(h);
  // ── Tình huống theo bảng bước (kich-ban-bang.js) ──
  const bt = bangTrang(h);
  if (bt) {
    if (bt.xong) return theViec("sl-xong", bt.k.meta.xong, "", "");
    const b = bt.b, g = esc(b.giai || "");
    if (b.ai === "mua") return theViec("", b.viec, g, nutVang(b.nut, "bang"));
    if (b.ai === "ban") return theViec("sl-cho", `Đang chờ chị Năm: ${b.viec}`, g, "");
    return theViec("sl-cho", `Đang chờ ${tenAi(b.ai)}: ${b.viec}`, g, nutMp(`Mô phỏng: ${b.nut}`, "bang"));
  }
  // ── Bất khả kháng (v23 bat-kha-khang) ──
  if (h.kb === "bkk") {
    if (h.bkkXong) return theViec("sl-xong", "Đã sửa đơn: còn 1.200 kg (bản 2)", `Ngân hàng đã hoàn ${d(BKK_HOAN)} cọc dư cho bạn; cọc còn giữ ${d(BKK_COC)}. Nhân viên AgiViet đang tìm nguồn bù 800 kg cùng hạng. Không ai bị phạt. Phần giao 1.200 kg chạy tiếp như luồng thuận (mô phỏng dừng ở đây).`, "");
    if (h.phu === "bkk") return theViec("sl-cho", "Chị Năm báo bất khả kháng: mưa đá, chỉ giao được 1.200 kg", "Có ảnh vườn. Nhân viên AgiViet đến vườn xác nhận thiệt hại rồi mới thương lượng. Cọc vẫn do ngân hàng giữ.", nutMp("Mô phỏng: nhân viên xác nhận thiệt hại tại vườn", "bkk-xn"));
    if (h.phu === "bkk-tl") return theViec("", "Thương lượng: giảm lượng, dời lịch hoặc tìm nguồn bù", "Thiệt hại đã được xác nhận và đủ điều kiện miễn trách: không ai bị phạt. Chọn đề nghị gửi chị Năm.", nutVang("Đề nghị: nhận 1.200 kg + tìm nguồn bù 800 kg", "bkk-de"));
    if (h.phu === "bkk-de") return theViec("sl-cho", "Đang chờ chị Năm trả lời đề nghị", "Nhận 1.200 kg theo giá cũ; AgiViet tìm nguồn bù 800 kg cùng hạng.", nutMp("Mô phỏng: chị Năm đồng ý", "bkk-ok"));
    if (h.phu === "bkk-ky") return theViec("", "Ký bản sửa: 1.200 kg · 27.600.000 đ", `Cọc mới ${d(BKK_COC)}. Hai bên ký xong, ngân hàng hoàn bạn ${d(BKK_HOAN)} cọc dư.`, nutVang("Ký bản sửa", "bkk-ky-mua"));
    if (h.phu === "bkk-cho-ban") return theViec("sl-cho", "Đang chờ chị Năm ký bản sửa", "Bạn đã ký bản 2 (1.200 kg).", nutMp("Mô phỏng: chị Năm ký", "bkk-ky-ban"));
    if (h.phu === "bkk-hoan") return theViec("sl-cho", "Hai bên đã ký bản sửa · chờ ngân hàng hoàn cọc dư", `Ngân hàng hoàn ${d(BKK_HOAN)} cho bạn.`, nutMp("Mô phỏng: ngân hàng hoàn cọc dư", "bkk-hoan"));
  }
  // ── Trả sau qua ngân hàng (v23 tra-sau-ngan-hang, tra-sau-mua-vi-pham) ──
  if (CK(h)) {
    if (h.buoc === 3) return theViec("", "Dùng hạn mức vay ở ngân hàng đối tác: không chuyển cọc", "Thỏa thuận chọn \"trả sau qua ngân hàng\". Ngân hàng phát hành cam kết thanh toán theo đơn; cam kết hợp lệ thì liên lạc mở như khi có cọc.", nutMp("Mô phỏng: ngân hàng phát hành cam kết thanh toán", "cam-ket"));
    if (h.tcXong) return theViec("sl-chan-lai", "Đơn đóng: bạn từ chối lô hàng đạt", `Ngân hàng đã chi bồi thường ${d(h.nbXn)} cho chị Năm và ghi nợ bạn khoản này. Bạn đã trả phí kiểm định ${d(KD_PHI)}. Cam kết hết hiệu lực.`, "");
    if (h.phu === "tc") return theViec("sl-cho", "Bạn đã từ chối cả lô · đang kiểm định", "Mẫu niêm phong gửi kiểm định. Nếu hàng đạt, từ chối không có căn cứ: ngân hàng bồi thường người bán và ghi nợ bạn.", nutMp("Mô phỏng: kiểm định: hàng ĐẠT", "tc-dat"));
    if (h.phu === "tc-dat") return theViec("sl-chan-lai", "Kiểm định: hàng đạt · từ chối không có căn cứ", "Lệnh bồi thường vượt ngưỡng nên quản trị AgiViet duyệt trước khi ngân hàng chi.", nutMp("Mô phỏng: quản trị duyệt lệnh bồi thường", "tc-duyet"));
    if (h.phu === "tc-duyet") return theViec("sl-cho", "Chờ ngân hàng chi bồi thường cho chị Năm", "Khoản này ghi nợ bạn theo hạn mức vay.", nutMp("Mô phỏng: ngân hàng chi bồi thường, ghi nợ bạn", "tc-chi"));
    if (h.phu === "tc-phi") return theViec("", `Trả phí kiểm định ${d(KD_PHI)}`, "Bên có kết luận sai chịu phí kiểm định.", nutVang(`Đã trả phí kiểm định ${d(KD_PHI)}`, "tc-phi-tra"));
    if (h.buoc === 12 && h.phu === "cho-xn-gn") return theViec("sl-cho", `Ngân hàng đã giải ngân ${d(h.nbXn)} cho chị Năm`, "Chờ chị Năm xác nhận đã nhận. Bạn trả ngân hàng gốc + lãi sau 30 ngày.", nutMp("Mô phỏng: chị Năm xác nhận đã nhận", "xn-gn"));
    if (h.buoc === 12) return theViec("sl-cho", "Nghiệm thu đã chốt · ngân hàng giải ngân theo giá trị nghiệm thu", `Ngân hàng chuyển thẳng ${d(t.nt)} cho chị Năm. Bạn trả ngân hàng gốc + lãi sau 30 ngày.`, nutMp(`Mô phỏng: ngân hàng giải ngân ${d(t.nt)}`, "giai-ngan"));
  }
  // ── Người bán ứng tiền (v23 ung-tien) ──
  if (h.kb === "ung" && h.buoc === 7 && h.phu === "ung-cho") return theViec("sl-cho", "Chị Năm đề nghị ứng tiền từ ngân hàng", `Ngân hàng ứng ${d(UNG)} cho chị Năm trên đơn này (phí ứng ${d(PHI_UNG)} chị Năm chịu). Bạn trả phần còn lại vào tài khoản đơn ở ngân hàng, không trả thẳng.`, nutMp(`Mô phỏng: ngân hàng ứng ${d(UNG)}`, "ung-ok"));
  if (h.kb === "ung" && h.buoc === 12 && h.phu === "ung-nh") return theViec("sl-cho", "Ngân hàng thu khoản ứng, chuyển phần dư cho chị Năm", `Tài khoản đơn có ${d(COC + h.daTra)}: thu lại ${d(UNG)} ứng, chuyển ${d(COC + h.daTra - UNG)} cho chị Năm.`, nutMp("Mô phỏng: ngân hàng thu ứng, chuyển phần dư", "ung-thu"));
  // ── Người bán đăng ký (v23 dang-ky) ──
  if (h.kb === "dang-ky") {
    const hoSo = (nk) => `<b>Đã kiểm tại vườn</b> (nhân viên AgiViet 24/10): người đăng ký, diện tích 2 ha, mặt hàng xoài cát Chu, giấy tờ đất. <b>Người bán tự khai</b>: sản lượng ước 6 tấn/vụ${nk ? ", nhật ký sản xuất 1 mục (phun thuốc 12/10, cách ly 14 ngày)" : ""}.`;
    if (!h.phu) return theViec("sl-cho", "Chị Năm đang đăng ký bán", "Chưa xác minh thì chưa chào giá, chưa nhận đề nghị được.", "");
    if (h.phu === "dk-xm") return theViec("sl-cho", "Chờ nhân viên AgiViet xác minh tại vườn", "Kiểm người, diện tích, mặt hàng, giấy tờ.", nutMp("Mô phỏng: nhân viên xác minh xong (2 ha xoài cát Chu)", "dk-xm-xong"));
    return theViec(h.phu === "dk-xong" ? "sl-xong" : "", "Hồ sơ chị Năm · hạng: đã xác minh tại vườn", hoSo(h.phu === "dk-xong"), "");
  }
  // ── Không tìm được đầu ra (v23 khong-co-dau-ra) ──
  if (h.kb === "dau-ra") {
    if (!h.phu) return theViec("sl-cho", "Lô L-0415 của chị Năm (6 tấn xoài, cần bán trong 7 ngày) chưa có đề nghị phù hợp", "Sau 48 giờ, hệ thống giao việc cho nhân viên AgiViet tìm đầu ra.", nutMp("Mô phỏng: hết 48 giờ, tạo việc cho nhân viên", "dr-48"));
    if (h.phu === "dr-nv") return theViec("sl-cho", "Nhân viên AgiViet đang tìm đầu ra", "Theo thứ tự: mở rộng vùng mua, đổi quy cách, nguồn chế biến.", nutMp("Mô phỏng: đề xuất tách 2 tấn loại 2 cho nơi chế biến", "dr-de-xuat"));
    if (h.phu === "dr-tach") return theViec("sl-cho", "Chờ chị Năm đồng ý tách lô", "2 tấn loại 2 hợp với nhà máy sấy của bạn.", "");
    if (h.phu === "dr-cb") return theViec("", "Lô 2 tấn xoài loại 2 (tách từ L-0415) hợp với nhà máy sấy", "Gửi đề nghị thì chị Năm giữ 2 tấn cho bạn trong hạn thương lượng.", nutVang("Gửi đề nghị 2 tấn loại 2 · 14.000 đ/kg", "dr-cb-dn"));
    if (h.phu === "dr-ngay4") return theViec("sl-cho", "Đề nghị 2 tấn đã gửi · đang thương lượng", "4 tấn loại 1 còn lại vẫn đang tìm đầu ra.", nutMp("Mô phỏng: ngày 4, 4 tấn loại 1 vẫn chưa có đầu ra", "dr-ngay4"));
    return theViec(h.phu === "dr-xong" ? "sl-xong" : "sl-cho", "Đề nghị 2 tấn loại 2 của bạn đang thương lượng", h.phu === "dr-xong" ? "Chị Năm đã rút 4 tấn loại 1 (tự bán nơi khác). Lô còn 2 tấn đang thương lượng với bạn." : "Chị Năm đang chọn dừng hay tìm tiếp cho 4 tấn loại 1.", "");
  }
  // ── Đặt trước khi hái (v23 dat-truoc) ──
  if (h.kb === "dat-truoc") {
    const i = dtTien(h).i;
    const V = [
      ["", "Hợp đồng đặt trước: 8 tấn xoài × 15.000 đ/kg, hái khoảng 20/12", "Soạn từ nghĩa vụ hai bên. Lượng chốt lại gần ngày hái theo vườn thực tế.", nutVang("Ký hợp đồng đặt trước", "dt-ky")],
      ["sl-cho", "Chờ chị Năm ký", "", ""],
      ["", "Chuyển cọc 30% × 8 tấn × 15.000 = 36.000.000 đ", "Vào tài khoản giữ của đơn ở ngân hàng đối tác.", nutVang("Chuyển cọc 36.000.000 đ", "dt-coc")],
      ["sl-cho", "Ngân hàng giữ 36.000.000 đ · chị Năm cập nhật vườn 2 tuần/lần", "", ""],
      ["", "Gần ngày hái: đề nghị chốt 9 tấn × 15.000", "Vườn đậu trái tốt hơn dự kiến. Chốt 9 tấn thì bổ sung cọc chênh 30% × 1 tấn × 15.000 = 4.500.000 đ.", nutVang("Đồng ý 9 tấn, bổ sung cọc 4.500.000 đ", "dt-bo-sung")],
      ["sl-cho", "Chờ chị Năm giao, nghiệm thu, chốt số", "Ngân hàng giữ cọc 40.500.000 đ.", ""],
      ["", "Trả thẳng phần còn lại 94.500.000 đ", "9 tấn × 15.000 = 135.000.000 − cọc 40.500.000.", nutVang("Ghi đã trả 94.500.000 đ", "dt-tra")],
      ["sl-cho", "Chờ chị Năm xác nhận đã nhận 94.500.000 đ", "", ""],
      ["sl-cho", "Ngân hàng chuyển cọc 40.500.000 đ cho chị Năm", "", nutMp("Mô phỏng: ngân hàng chuyển cọc", "dt-nh")],
      ["sl-xong", "Hoàn tất đặt trước: 9 tấn · 135.000.000 đ", "Chị Năm nhận đủ 135.000.000 đ (94.500.000 trả thẳng + 40.500.000 cọc).", ""],
    ][i];
    return theViec(V[0], V[1], V[2], V[3]);
  }
  // ── Trước hợp đồng (v23 nhieu-de-nghi, de-nghi-bo-cuoc, den-xem-hang) ──
  if (h.kb === "nhieu-de-nghi" && h.buoc === 0) return theViec("sl-cho", "Đã gửi đề nghị: 23.000 đ/kg · tự lấy tại vườn · trả trước bàn giao", "Chị Năm đang so các đề nghị theo tiền ròng (sau chi phí chở). Bạn không thấy giá của bên khác, bên khác cũng không thấy giá của bạn.", "");
  if (h.kb === "bo-cuoc" && h.buoc === 1 && !h.phu) return theViec("", "Chị Năm đã chọn bạn · hàng giữ 24 giờ", "Ký thỏa thuận trong 24 giờ. Quá hạn không ký thì hàng giữ bị hủy và lô mở lại cho bên khác.", nutVang("Ký và gửi", "lam") + nutMp("Mô phỏng: quá 24 giờ bạn không ký", "qua-han-ky"));
  if (h.kb === "bo-cuoc" && h.phu) return theViec("sl-chan-lai", "Đề nghị của bạn đã hết hạn: không ký trong 24 giờ", "Hàng giữ đã hủy, lịch sử ghi rõ hết hạn và lý do. Lô đã mở lại cho bên khác.", "");
  if (h.kb === "xem-hang" && h.buoc === 0) {
    if (!h.phu) return theViec("", "Muốn xem vườn trước khi mua?", "Gửi yêu cầu khảo sát: ngày và người đến. Chưa lộ số điện thoại hai bên tới khi chị Năm đồng ý lịch.", nutVang("Gửi yêu cầu khảo sát: 26/10, chị Thu Hà + 1 người", "ks-gui"));
    if (h.phu === "ks-cho") return theViec("sl-cho", "Đã gửi yêu cầu khảo sát · chờ chị Năm chọn giờ", "Số điện thoại hai bên vẫn được che.", "");
    if (h.phu === "ks-lich") return theViec("", "Lịch khảo sát: 8:00 sáng 26/10", "Địa chỉ: ấp 3, Mỹ Xương, Cao Lãnh · liên hệ chị Năm 0918 000 421 (chỉ dùng cho chuyến này). Xem, chụp ảnh; không bắt buộc mua.", `<button class="sl-nut sl-vien" data-lam="ks-xong">Đã xem, chưa mua</button>` + nutVang("Đã xem, gửi đề nghị mua", "ks-mua"));
    if (h.phu === "ks-xong") return theViec("sl-xong", "Đã xem vườn, chưa mua", "Không phát sinh nghĩa vụ. Ảnh đã chụp lưu ở hồ sơ lô L-0412 của bạn.", "");
  }
  // ── Sự cố tại vườn (v23 vuon-bien-the) ──
  if (h.kb === "bien-the" && h.buoc === 7 && !h.btXong) {
    if (!h.phu) return theViec("sl-cho", "Xe tới vườn · chị Năm đối chiếu người đến và biển số", "Chỉ người có tên trong danh sách bạn khai mới được nhận hàng.", "");
    if (h.phu === "bt1") return theViec("sl-chan-lai", "Người đến không có tên trong danh sách bạn khai", "Chị Năm không cho bốc. Bổ sung người đến (tên, 4 số cuối CCCD) hoặc đổi người.", nutVang("Bổ sung anh Lộc vào danh sách", "bt-them-nguoi"));
    if (h.phu === "bt2") return theViec("", "Đúng người · người kiểm của bạn xem hàng trước khi bốc", "Đạt thỏa thuận thì cho bốc. Giá đã ký không đổi tại chỗ.", `<button class="sl-nut sl-vien" data-lam="bt-ha-gia">Người kiểm đòi hạ giá tại chỗ</button>` + nutVang("Hàng đúng thỏa thuận", "bt-dung"));
    if (h.phu === "bt3") return theViec("sl-chan-lai", "Không đổi giá tại chỗ", "Muốn đổi giá phải gửi đề nghị sửa hợp đồng; chị Năm có quyền từ chối và đơn giữ nguyên bản đã ký.", "");
    if (h.phu === "bt4") return theViec("", "Bốc lên xe", "Xe của bạn chở được bao nhiêu?", `<button class="sl-nut sl-vien" data-lam="bt-thieu-tai">Xe thiếu tải: chỉ chở 1.600 kg</button>` + nutVang("Xe chở đủ 2.000 kg", "bt-du"));
    if (h.phu === "bt5") return theViec("sl-cho", "Chờ chị Năm đồng ý giữ 400 kg tới chuyến sau", "Phần thiếu do xe bên mua vẫn là nghĩa vụ của bạn: lấy chuyến sau trong 24 giờ, hoặc tính theo điều khoản thiếu lượng do bên mua.", "");
  }
  // ── Lấy tại vườn: hai cân (v23 lay-tai-vuon) ──
  if (h.kb === "hai-can" && h.buoc === 7 && !h.canXong) {
    if (!h.phu) return theViec("sl-cho", "Xe tới vườn · chờ chị Năm cân bằng cân của người bán", "Người đến lấy hàng đã khai tên và biển số; chị Năm quét mã đối chiếu rồi cân.", "");
    if (h.phu === "can1") return theViec("", "Chị Năm cân: 2.000 kg · tới lượt cân của bạn", "Cân bằng cân bên mua mang theo, có hai bên chứng kiến, chụp màn hình cân.", nutVang("Cân của tôi: 1.940 kg", "can-mua"));
    if (h.phu === "can-lech2") return theViec("sl-chan-lai", "Hai cân lệch: 2.000 kg và 1.940 kg", "App ghi cả hai kết quả, <b>không tự chọn, không lấy trung bình</b>. Hai bên kiểm bì, cân lại từng sọt. Chưa bốc tới khi chốt số.", "");
    if (h.phu === "can-chot") return theViec("", "Cân lại có hai bên: 1.980 kg", "Đã trừ bì, cân lại từng sọt. Xác nhận thì nghiệm thu theo 1.980 kg và cho bốc.", nutVang("Xác nhận 1.980 kg", "can-xn"));
  }
  // ── Dư lượng không đạt (v23 vuon-du-luong-khong-dat) ──
  if (h.kb === "du-luong" && h.buoc === 12) {
    const tra = (h.daTra || 0) + 1500000;
    if (h.dlXong) return theViec("sl-xong", "Đơn đóng: dư lượng không đạt, bạn đã nhận lại đủ", `Cọc ${d(COC)} đã hoàn; chị Năm đã hoàn ${d(h.daTra)} tiền hàng và 1.500.000 đ phí kiểm lần đầu; hàng đã tiêu hủy có biên bản.`, "");
    if (!h.phu) return theViec("sl-cho", "Hàng cách ly tại kho · chờ kết quả dư lượng", "Không bán, không chế biến tới khi có kết quả. Mẫu đại diện lấy theo phương pháp đã ghi; mẫu lưu niêm phong. Cọc vẫn do ngân hàng giữ.", nutMp("Mô phỏng: kết quả dư lượng KHÔNG đạt", "dl-hong"));
    if (h.phu === "dl-hong") return theViec("sl-chan-lai", "Dư lượng không đạt", "Chị Năm có quyền yêu cầu kiểm lại mẫu lưu. Hàng tiếp tục cách ly.", nutMp("Mô phỏng: chị Năm yêu cầu kiểm lại mẫu lưu", "dl-kiem-lai"));
    if (h.phu === "dl-kiem-lai") return theViec("sl-cho", "Đang kiểm lại mẫu lưu", "Phòng kiểm nghiệm kiểm mẫu lưu niêm phong.", nutMp("Mô phỏng: kiểm lại vẫn không đạt", "dl-loi"));
    if (h.phu === "dl-loi") return theViec("sl-chan-lai", "Kết luận: người bán có lỗi", `Ngân hàng hoàn cọc ${d(COC)} cho bạn. Chị Năm hoàn ${d(h.daTra)} tiền hàng và 1.500.000 đ phí kiểm lần đầu, nhận lại hàng để tiêu hủy có biên bản.`, nutMp("Mô phỏng: ngân hàng hoàn cọc", "dl-hoan-coc"));
    if (h.phu === "dl-cho-nb-hoan") return theViec("sl-cho", `Đang chờ chị Năm hoàn ${d(tra)}`, "Gồm tiền hàng đã trả trước và phí kiểm lần đầu.", nutMp("Mô phỏng: chị Năm đã hoàn", "dl-nb-hoan"));
    if (h.phu === "dl-da-hoan") return theViec("", `Chị Năm báo đã hoàn ${d(tra)}`, "Kiểm tài khoản công ty. Chỉ bấm khi tiền đã về đúng số.", nutVang(`Đã nhận lại ${d(tra)}`, "dl-xong") + `<button class="sl-nut sl-vien" data-lam="chua">Chưa nhận</button>`);
  }
  // ── Hai phòng kiểm cho kết quả khác nhau (v23 hai-ket-qua-khac) ──
  if (h.kb === "hai-kq" && h.buoc === 12 && !h.hkXong) {
    if (!h.phu) return theViec("sl-cho", "Hàng cách ly · chờ kết quả dư lượng (phòng A, bạn đặt)", "Cọc giữ chờ kết quả.", nutMp("Mô phỏng: phòng A báo KHÔNG đạt", "kq1"));
    if (h.phu === "kq1") return theViec("sl-cho", "Phòng A: không đạt · chờ chị Năm", "Chị Năm có quyền gửi mẫu lưu tới phòng B.", nutMp("Mô phỏng: chị Năm yêu cầu kiểm ở phòng B", "kq2"));
    if (h.phu === "kq2-cho") return theViec("sl-cho", "Phòng B đang kiểm mẫu lưu", "", nutMp("Mô phỏng: phòng B báo ĐẠT", "trai"));
    if (h.phu === "trai") return theViec("sl-chan-lai", "Hai kết quả trái nhau: chưa kết luận", "Hàng tiếp tục cách ly. Nhân viên AgiViet gửi mẫu lưu thứ hai tới phòng trọng tài đã thỏa thuận; hai bên ứng đôi phí.", nutMp("Mô phỏng: phòng trọng tài báo ĐẠT", "trong-tai"));
    if (h.phu === "hk-phi") return theViec("", "Phòng trọng tài: đạt · bạn hoàn chị Năm 2.800.000 đ phí kiểm", "Theo điều khoản kết quả trái nhau: bên có kết quả sai chịu phí. Chuyển vào Agribank •••• 2186, nội dung HD0018 PHI.", nutVang("Đã chuyển 2.800.000 đ phí", "hk-phi"));
    if (h.phu === "hk-phi-cho") return theViec("sl-cho", "Chờ chị Năm xác nhận đã nhận phí", "", nutMp("Mô phỏng: chị Năm xác nhận", "hk-phi-xn"));
  }
  // ── Hàng tới khác mẫu (v23 khac-mau) ──
  if (h.kb === "khac-mau" && h.phu === "km") return theViec("sl-cho", "Đã báo hàng tới khác mẫu lúc bốc", "Kho lạnh đối tác tạm giữ 180 kg. Mẫu niêm phong M-2291 gửi kiểm định so mẫu. Chưa nghiệm thu phần này tới khi có kết luận.", nutMp("Mô phỏng: kiểm định kết luận sai từ lúc bốc (lỗi người bán)", "km-kl"));
  // ── Hàng bị trả lại (v23 hang-tra-lai) ──
  if (h.kb === "hang-tra" && h.buoc === 14 && !h.hangXong) {
    if (!h.hangChon) return theViec("sl-cho", "Chờ chị Năm chọn cách xử lý 30 kg trả lại", "Biên bản: 30 kg giữ tại kho Đồng Xanh (Bến Lức). Chị Năm có 48 giờ. Quá hạn: báo trước 24 giờ rồi xử lý theo điều khoản.", nutMp("Mô phỏng: hết 48 giờ chị Năm chưa chọn", "hang-qua-han"));
    return theViec("sl-cho", h.hangChon === "ban-gap" ? "Chị Năm chọn bán gấp tại chỗ" : h.hangChon === "nhan-lai" ? "Chị Năm nhận lại 30 kg, tự lo xe" : "Quá hạn: đã báo trước 24 giờ, xử lý theo điều khoản", "AgiViet báo các bên nhận hàng kém loại gần Long An. Chi phí phát sinh ghi vào phiếu bồi hoàn nếu có.", nutMp("Mô phỏng: 30 kg đã xử lý xong, hồ sơ đóng", "hang-xong"));
  }
  // ── Trả sau nghiệm thu (v23 chinh: CK sau nghiệm thu; chua-tra) ──
  if (h.no) return theViec("sl-chan-lai", "Đơn đóng có nợ: bạn chưa trả phần còn lại", `Ngân hàng đã chuyển cọc ${d(COC)} cho chị Năm (trừ vào tiền hàng). Bạn còn nợ ${d(TRA_SAU(h))}: bị trừ uy tín, khóa đơn mới; AgiViet cấp hồ sơ đòi nợ cho người bán.`, "");
  if (TS(h) && h.buoc === 12 && !h.traSauXong) {
    const x = TRA_SAU(h);
    if (h.phu === "cho-xn-sau") return theViec("sl-cho", `Đang chờ chị Năm đếm và xác nhận ${d(h.daTra)}`, h.kb === "tien-mat" ? "Chị Năm đếm đủ tiền mặt, ký biên nhận rồi mới cho dỡ hàng. Xác nhận xong ngân hàng mới chuyển cọc." : "Chị Năm kiểm tài khoản. Xác nhận xong ngân hàng mới chuyển cọc.", nutMp("Mô phỏng: chị Năm xác nhận đã nhận", "xn-sau"));
    if (h.phu === "qua-han") return theViec("sl-chan-lai", "Quá hạn trả: chị Năm báo chưa nhận tiền", `Bạn có 48 giờ để trả ${d(x)} hoặc gửi chứng từ đã chuyển. Hết hạn: ngân hàng chuyển cọc cho chị Năm, bạn bị trừ uy tín và khóa đơn mới.`, nutVang(`Ghi đã trả ${d(x)}`, "tra-sau") + nutMp("Mô phỏng: hết 48 giờ vẫn chưa trả", "het-48h"));
    if (h.phu === "xu-ly-no") return theViec("sl-cho", "Nhân viên AgiViet đã gọi hai bên: chưa có tiền", "Ngân hàng chuyển cọc cho chị Năm, trừ vào tiền hàng. Phần còn lại ghi thành nợ của bạn.", nutMp("Mô phỏng: ngân hàng chuyển cọc cho chị Năm", "no-chot"));
    if (h.kb === "ung") return theViec("", `Trả phần còn lại ${d(x)} vào tài khoản đơn ở ngân hàng`, `Nghiệm thu ${d(t.nt)} − cọc ${d(COC)}. Chị Năm đã ứng tiền nên KHÔNG trả thẳng cho chị Năm; ngân hàng thu khoản ứng rồi chuyển phần dư.`, nutVang(`Ghi đã trả ${d(x)}`, "tra-sau"));
    if (h.kb === "tien-mat") return theViec("", `Trả tiền mặt ${d(x)} trước khi dỡ hàng`, `Nghiệm thu ${d(t.nt)} − cọc ${d(COC)} ngân hàng giữ. Trả tại kho, hai bên ký biên nhận (chụp ảnh biên nhận vào app). Chị Năm đếm đủ mới dỡ.`, nutVang(`Đã trả tiền mặt ${d(x)}`, "tra-sau"));
    return theViec("", `Chuyển phần còn lại ${d(x)} cho chị Năm`, `Nghiệm thu ${d(t.nt)} − cọc ${d(COC)} ngân hàng giữ. Chuyển thẳng vào Agribank •••• 2186 (đúng tài khoản trong hợp đồng), nội dung HD0018. Hạn 24 giờ sau khi chốt nghiệm thu.`, nutVang(`Ghi đã trả ${d(x)}`, "tra-sau"));
  }
  // ── Người bán không giao (v23 ban-vi-pham) ──
  if (h.kb === "khong-giao") {
    if (h.vpXong) return theViec("sl-xong", "Đơn đóng: người bán không giao, bạn đã nhận lại đủ", `Cọc ${d(COC)} và phí ${d(PHI)} đã hoàn. ${d(TRA_THANG)} trả trước và ${d(BOI_HOAN)} bồi hoàn tiền xe đã về. Chị Năm bị trừ hạng theo quy định.`, "");
    if (h.phu === "khong-hang") return theViec("sl-cho", "Xe đã chờ 2 giờ ở vườn, không có hàng", "Nhân viên AgiViet đang gọi chị Năm. Chưa bốc nên hàng và rủi ro vẫn ở người bán; cọc vẫn do ngân hàng giữ.", nutMp("Mô phỏng: chị Năm xác nhận không giao được", "nb-khong-giao"));
    if (h.phu === "vi-pham") return theViec("sl-cho", "AgiViet ghi người bán vi phạm: không giao", `Ngân hàng hoàn cọc ${d(COC)} cho bạn, phí giới thiệu ${d(PHI)} được hoàn. Chị Năm phải trả lại ${d(TRA_THANG)} đã nhận trước và bồi hoàn tiền xe ${d(BOI_HOAN)}.`, nutMp("Mô phỏng: ngân hàng hoàn cọc", "hoan-coc-vp"));
    if (h.phu === "cho-nb-tra") return theViec("sl-cho", `Đang chờ chị Năm trả lại ${d(TRA_VP)}`, `Gồm ${d(TRA_THANG)} bạn đã trả trước và ${d(BOI_HOAN)} bồi hoàn tiền xe. Hạn 7 ngày; không trả thì chị Năm bị trừ hạng, khóa đơn mới và AgiViet cấp hồ sơ đòi nợ.`, nutMp("Mô phỏng: chị Năm đã chuyển trả", "nb-tra-vp"));
    if (h.phu === "nb-da-tra-vp") return theViec("", `Chị Năm báo đã chuyển ${d(TRA_VP)}`, "Kiểm tài khoản công ty. Chỉ bấm khi tiền đã về đúng số.", nutVang(`Đã nhận lại ${d(TRA_VP)}`, "nhan-vp") + `<button class="sl-nut sl-vien" data-lam="chua">Chưa nhận</button>`);
  }
  // ── Người bán im lặng khi nghiệm thu (v23 nghiem-thu-im-lang) ──
  if (h.kb === "im-lang" && h.buoc === 11 && h.phu === "nhac") return theViec("sl-cho", "Chị Năm chưa chốt kết quả sau 24 giờ", "Đã nhắc 3 lần. <b>Im lặng không phải đồng ý</b>: ngân hàng chưa chi cọc. Nhân viên AgiViet gọi chị Năm, đối chiếu biên bản bốc, ảnh và mẫu.", nutMp("Mô phỏng: nhân viên đã gọi chị Năm", "da-goi"));
  if (h.huy) return theViec("sl-cho", "Đơn đã hủy theo thỏa thuận", `Hàng về lại lô L-0412 của chị Năm. Cọc ${d(COC)} chuyển cho chị Năm, phí ${d(PHI)} không hoàn (đề xuất, chờ chốt). Chưa có khoản trả thẳng.`, "");
  if (luot === "xong") return theViec("sl-xong", "Hoàn tất · hết nghĩa vụ hai bên", `Đã nhập kho ${so(t.dat)} kg loại 1 và ${so(t.ha)} kg hạ cấp. Bảng kê tháng 10 đã có dòng này.`, `<a class="sl-nut sl-vien" href="${url("bang-ke")}">Tải bảng kê</a>`);
  // ── Nhánh kịch bản ──
  if (h.phu === "xin-huy") return theViec("sl-cho", "Đang chờ chị Năm trả lời yêu cầu hủy", "Chị Năm có 24 giờ. <b>Im lặng là không đồng ý</b> — đơn giữ nguyên.", nutMp("Mô phỏng: chị Năm đồng ý hủy", "huy-ok") + nutMp("Mô phỏng: hết 24 giờ, chị Năm im lặng", "huy-khong"));
  if (h.phu === "de-nghi") return theViec("", "Chị Năm đề nghị đổi ngày giao 28/10 → 29/10", "Mục này đang <b>Đang đề nghị</b>: chưa ký, chưa chuyển cọc được. Đồng ý thì sang bản 2, hạn trả thẳng dời theo. Không đồng ý thì giữ bản 1.", `<button class="sl-nut sl-vien" data-lam="de-khong">Không đồng ý</button>` + nutVang("Đồng ý", "de-ok"));
  if (h.phu === "lech") return theViec("sl-chan-lai", "Lệch tiền, đang đối soát", `Bạn báo đã trả ${d(TRA_THANG)}, chị Năm chỉ thấy ${d(20000000)}. Đây là <b>lệch, không phải vi phạm</b>. Chưa bốc tới khi chốt số đúng.`, nutVang("Gửi chứng từ", "gui-ct"));
  if (h.phu === "cho-vh") return theViec("sl-cho", "Người vận hành đang đối chiếu sao kê", "Đã gửi ủy nhiệm chi 2 lần chuyển. Hạn đối soát 48 giờ.", nutMp("Mô phỏng: người vận hành chốt đúng 32.200.000 đ", "vh-ok"));
  if (h.phu === "phan-doi") return theViec("", "Chị Năm phản đối dòng hạ cấp 120 kg", "Các dòng khác (1.850 kg loại 1, 30 kg trả lại) đã chốt. Bạn cân lại dòng hạ cấp, có chị Năm hoặc người được ủy quyền chứng kiến.", nutVang("Cân lại", "can-lai"));
  if (h.phu === "can-lai") return theViec("sl-cho", "Cân lại vẫn 120 kg · chờ chị Năm", "Nếu chị Năm vẫn không đồng ý: gửi mẫu M-2291 đi kiểm định 48 giờ, bên sai chịu phí.", nutMp("Mô phỏng: chị Năm vẫn không đồng ý → kiểm định", "kd"));
  if (h.phu === "kiem-dinh") return theViec("sl-cho", "Đang kiểm định mẫu M-2291 · 48 giờ", "Trung tâm kiểm định Cần Thơ. Phí 850.000 đ do bên sai chịu.", nutMp("Mô phỏng: kết quả 104/120 kg dưới chuẩn", "kd-xong"));
  if (h.kb === "tra-lai" && h.buoc === 13) {
    if (!h.hoanXn) return theViec("", `Ngân hàng hoàn hết cọc ${d(COC)} cho bạn`, `Giá trị nghiệm thu ${d(t.nt)} nhỏ hơn số đã trả thẳng ${d(TRA_THANG)}. Chỉ bấm khi tiền đã về.`, nutVang(`Đã nhận lại ${d(COC)}`, "hoan-xn") + `<button class="sl-nut sl-vien" data-lam="chua">Chưa nhận</button>`);
    if (h.phu !== "nb-da-hoan") return theViec("sl-cho", `Chờ chị Năm hoàn ${d(t.nbHoan)} ngoài app`, "Phần bạn trả thẳng vượt giá trị nghiệm thu. Chị Năm hoàn vào tài khoản công ty, nội dung HD0018 HOAN.", nutMp(`Mô phỏng: chị Năm báo đã hoàn ${d(t.nbHoan)}`, "nb-hoan"));
    return theViec("", `Chị Năm báo đã hoàn ${d(t.nbHoan)}`, "Kiểm tài khoản công ty. Chỉ bấm khi tiền đã về đúng số.", nutVang(`Đã nhận lại ${d(t.nbHoan)}`, "nb-hoan-xn") + `<button class="sl-nut sl-vien" data-lam="chua">Chưa nhận</button>`);
  }
  // ── Luồng chung ──
  const b = BUOC[h.buoc], chan = hdChan(h);
  if (chan) return theViec("sl-chan-lai", chan, `Còn thiếu ${d(TRA_THANG - h.nbXn)}. Trả nốt vào Agribank •••• 2186 (đúng tài khoản trong hợp đồng), nội dung HD0018.`, h.daTra < TRA_THANG ? nutVang(`Ghi đã trả ${d(TRA_THANG - h.daTra)}`, "tra-not") : nutMp("Mô phỏng: chị Năm xác nhận phần còn lại", "mp"));
  if (luot === "ban") {
    const nut = b.nut === "Ghi đã trả" ? `Ghi đã trả ${d(h.kb === "thieu" ? 20000000 : TRA_THANG)}` : h.buoc === 13 ? `Đã nhận lại ${d(t.hoanMua)}` : b.nut;
    const giaHan = h.kb === "im-lang" && h.buoc === 10 && !h.giaHan ? `<button class="sl-nut sl-vien" data-lam="gia-han">Chưa kiểm được: xin gia hạn tới 8:00</button>` : "";
    const km = h.kb === "khac-mau" && h.buoc === 10 && !h.phu ? `<button class="sl-nut sl-vien" data-lam="km">Mở mẫu đối chứng: hàng khác mẫu</button>` : "";
    const tc = h.kb === "nh-tu-choi" && h.buoc === 10 && !h.phu ? `<button class="sl-nut sl-huy" data-lam="tu-choi">Từ chối cả lô</button>` : "";
    const them = giaHan + km + tc + (h.buoc === 10 ? `<a class="sl-nut sl-vien" href="${url("nghiem-thu")}">Mở bảng nghiệm thu</a>` : h.buoc === 1 ? `<a class="sl-nut sl-vien" href="${url("thoa-thuan")}">Xem lại thỏa thuận</a>` : h.buoc === 3 ? `<a class="sl-nut sl-vien" href="${url("dat-coc")}">Xem chi tiết cọc</a>` : "");
    const giai = { 0: "Hàng của chị Năm được giữ 24 giờ cho bạn từ lúc đồng ý.", 3: "Cọc 30% do ngân hàng đối tác giữ. Phí giới thiệu 0,3% bạn trả AgiViet riêng.", 5: `Chuyển thẳng cho chị Năm, chỉ vào Agribank •••• 2186, nội dung HD0018. Bạn đang chịu rủi ro ${d(TRA_THANG)} cho phần trả trước khi bốc.`, 8: "Xem video bốc tại vườn. Bấm xong thì rủi ro đường thuộc bạn.", 9: "Bấm khi xe về kho. Từ lúc này bạn có 2 giờ để nghiệm thu.", 10: h.kb === "can-lech" ? `Cân tại kho 1.960 kg (trong ±5% của 2.000 kg) nên luồng thuận: đạt ${so(t.dat)} · hạ cấp ${so(t.ha)} · trả lại ${so(t.tra)} kg → ${d(t.nt)}.` : `Đạt ${so(t.dat)} kg · hạ cấp ${so(t.ha)} kg · trả lại ${so(t.tra)} kg${t.tra > 100 ? " (trên 5%, phải có ảnh)" : ""} → ${d(t.nt)}.`, 13: "Ngân hàng đã gửi lệnh hoàn. Chỉ bấm khi tiền đã thật sự về tài khoản.", 14: `Nhập ${so(t.dat + t.ha)} kg vào kho nguyên liệu, rồi đánh giá chị Năm.` }[h.buoc] || "";
    const huy = h.kb === "huy" && (h.buoc === 5 || h.buoc === 6) ? `<button class="sl-nut sl-huy" data-lam="xin-huy">Xin hủy</button>` : "";
    return theViec("", lamBuoc(h.buoc, h), `${esc(giai)}${h.kb === "im-lang" && h.giaHan && h.buoc === 10 ? " Đã gia hạn một lần tới 8:00 sáng (theo điều khoản); QC kiểm lúc 7:30." : ""}${b.han ? ` Hạn: ${esc(h.buoc === 5 && h.ban === 2 ? "trước 5:30 ngày 29/10" : b.han)}.` : ""}`, them + huy + nutVang(nut, "lam") + (h.buoc === 13 ? `<button class="sl-nut sl-vien" data-lam="chua">Chưa nhận</button>` : ""));
  }
  // Chờ bên kia: nút "Mô phỏng" (+ nhánh kịch bản)
  let mp = nutMp(b.mp, "mp");
  if (h.kb === "doi-ngay" && h.buoc === 2 && !h.daDeNghi) mp = nutMp("Mô phỏng: chị Năm đề nghị đổi ngày giao 28/10 → 29/10", "de-nghi") + mp;
  if (h.kb === "khong-giao" && h.buoc === 7 && !h.phu) mp = nutMp("Mô phỏng: xe chờ 2 giờ, không có hàng", "khong-hang");
  if (h.kb === "im-lang" && h.buoc === 11 && !h.phu) mp = nutMp("Mô phỏng: hết 24 giờ, chị Năm chưa chốt", "qua-24h");
  if (h.kb === "lech" && h.buoc === 6) mp = nutMp("Mô phỏng: chị Năm chỉ thấy 20.000.000 đ", "lech");
  if (h.kb === "phan-doi" && h.buoc === 11 && !h.daPhanDoi) mp = nutMp("Mô phỏng: chị Năm phản đối dòng hạ cấp 120 kg", "phan-doi");
  return theViec("sl-cho", `Đang chờ ${AI[luot].toLowerCase()}: ${lamBuoc(h.buoc, h).replace(/^Người bán |^Ngân hàng /, "")}`, `Bạn không phải làm gì lúc này${b.han ? ` · hạn ${esc(b.han)}` : ""}. Khi có kết quả, đơn tự sang bước sau.`, mp);
}
function ganNutDon(goc) {
  goc.querySelectorAll("[data-lam]").forEach((n) => n.addEventListener("click", async () => {
    const lam = n.dataset.lam;
    if (lam === "chua") { n.closest(".sl-viec").querySelector("p").textContent = "Đã ghi: chưa nhận. Bên kia và ngân hàng được báo kiểm lại; đơn chưa hoàn tất."; window.HieuUngThem?.rung(n); return; }
    // Nút của mình (vàng): chấm chờ → tích rồi mới đổi trạng thái
    if (n.classList.contains("sl-vang") && window.HieuUngThem) await window.HieuUngThem.nutXong(n, "Đã gửi", 450);
    doi((s) => {
      const h = s.hd;
      const P = {
        "tra-not": () => { h.daTra = TRA_THANG; },
        "de-nghi": () => { h.phu = "de-nghi"; h.daDeNghi = true; },
        "de-ok": () => { h.phu = ""; h.ban = 2; h.ngayGiao = "29/10"; },
        "de-khong": () => { h.phu = ""; h.ban = 1; },
        "lech": () => { h.nbXn = 20000000; h.phu = "lech"; },
        "gui-ct": () => { h.phu = "cho-vh"; },
        "vh-ok": () => { h.nbXn = TRA_THANG; h.phu = ""; h.buoc = 7; },
        "phan-doi": () => { h.phu = "phan-doi"; h.daPhanDoi = true; },
        "can-lai": () => { h.phu = "can-lai"; },
        "kd": () => { h.phu = "kiem-dinh"; },
        "kd-xong": () => { h.phu = "da-kiem-dinh"; h.buoc = 12; },
        "xin-huy": () => { h.phu = "xin-huy"; },
        "huy-ok": () => { h.huy = true; h.phu = ""; },
        "huy-khong": () => { h.phu = ""; },
        "hoan-xn": () => { h.hoanXn = true; h.phu = "cho-nb-hoan"; },
        "nb-hoan": () => { h.phu = "nb-da-hoan"; },
        "bang": () => { h.pi = (h.pi || 0) + 1; },
        "dk-xm-xong": () => { h.phu = "dk-hang"; },
        "dr-48": () => { h.phu = "dr-nv"; },
        "dr-de-xuat": () => { h.phu = "dr-tach"; },
        "dr-cb-dn": () => { h.phu = "dr-ngay4"; },
        "dr-ngay4": () => { h.phu = "dr-hoi"; },
        "dt-ky": () => { h.phu = "dt-ky-ban"; },
        "dt-coc": () => { h.phu = "dt-cap-nhat"; },
        "dt-bo-sung": () => { h.phu = "dt-giao"; },
        "dt-tra": () => { h.phu = "dt-xn"; },
        "dt-nh": () => { h.phu = "dt-xong"; },
        "qua-han-ky": () => { h.phu = "mo-lai"; },
        "ks-gui": () => { h.phu = "ks-cho"; },
        "ks-xong": () => { h.phu = "ks-xong"; },
        "ks-mua": () => { h.phu = ""; h.kb = "thuan"; },
        "bt-them-nguoi": () => { h.phu = "bt2"; },
        "bt-ha-gia": () => { h.phu = "bt3"; },
        "bt-dung": () => { h.phu = "bt4"; },
        "bt-du": () => { h.phu = ""; h.btXong = true; },
        "bt-thieu-tai": () => { h.phu = "bt5"; },
        "can-mua": () => { h.phu = "can-lech2"; },
        "can-xn": () => { h.phu = ""; h.canXong = true; },
        "dl-hong": () => { h.phu = "dl-hong"; },
        "dl-kiem-lai": () => { h.phu = "dl-kiem-lai"; },
        "dl-loi": () => { h.phu = "dl-loi"; },
        "dl-hoan-coc": () => { h.phu = "dl-cho-nb-hoan"; h.dlHoan = true; },
        "dl-nb-hoan": () => { h.phu = "dl-da-hoan"; },
        "dl-xong": () => { h.phu = ""; h.dlXong = true; },
        "kq1": () => { h.phu = "kq1"; },
        "kq2": () => { h.phu = "kq2-cho"; },
        "trai": () => { h.phu = "trai"; },
        "trong-tai": () => { h.phu = "hk-phi"; },
        "hk-phi": () => { h.phu = "hk-phi-cho"; },
        "hk-phi-xn": () => { h.phu = ""; h.hkXong = true; },
        "bkk-xn": () => { h.phu = "bkk-tl"; },
        "bkk-de": () => { h.phu = "bkk-de"; },
        "bkk-ok": () => { h.phu = "bkk-ky"; h.ban = 2; },
        "bkk-ky-mua": () => { h.phu = "bkk-cho-ban"; },
        "bkk-ky-ban": () => { h.phu = "bkk-hoan"; },
        "bkk-hoan": () => { h.phu = ""; h.bkkXong = true; },
        "km": () => { h.phu = "km"; },
        "km-kl": () => { h.phu = "km-kl"; },
        "hang-qua-han": () => { h.hangChon = "qua-han"; },
        "hang-xong": () => { h.hangXong = true; },
        "tra-sau": () => { h.daTra = TRA_SAU(h); h.phu = h.kb === "ung" ? "ung-nh" : "cho-xn-sau"; },
        "ung-ok": () => { h.phu = ""; h.ung = true; h.nbXn = UNG - PHI_UNG; },
        "ung-thu": () => { h.phu = "cho-xn-sau"; },
        "cam-ket": () => { h.camKet = true; h.buoc = 7; },
        "giai-ngan": () => { h.nbXn = tinhTien(h).nt; h.phu = "cho-xn-gn"; },
        "xn-gn": () => { h.phu = ""; h.buoc = 14; },
        "tu-choi": () => { h.phu = "tc"; },
        "tc-dat": () => { h.phu = "tc-dat"; },
        "tc-duyet": () => { h.phu = "tc-duyet"; },
        "tc-chi": () => { h.nbXn = tinhTien(h).nt; h.phu = "tc-phi"; },
        "tc-phi-tra": () => { h.phu = ""; h.tcXong = true; },
        "xn-sau": () => { h.nbXn = h.daTra; h.phu = ""; h.traSauXong = true; },
        "het-48h": () => { h.phu = "xu-ly-no"; },
        "no-chot": () => { h.phu = ""; h.no = true; },
        "khong-hang": () => { h.phu = "khong-hang"; },
        "nb-khong-giao": () => { h.phu = "vi-pham"; h.vp = true; },
        "hoan-coc-vp": () => { h.huy = true; h.phu = "cho-nb-tra"; },
        "nb-tra-vp": () => { h.phu = "nb-da-tra-vp"; },
        "nhan-vp": () => { h.phu = ""; h.vpXong = true; },
        "gia-han": () => { h.giaHan = true; },
        "qua-24h": () => { h.phu = "nhac"; },
        "da-goi": () => { h.phu = "da-goi"; },
        "nb-hoan-xn": () => { h.nbHoanXn = true; h.phu = ""; h.buoc = 14; },
      };
      if (P[lam]) return P[lam]();
      if (h.buoc === 5) { h.daTra = h.kb === "thieu" ? 20000000 : TRA_THANG; h.buoc++; return; }
      if (h.buoc === 6 || (h.buoc === 7 && hdChan(h))) { h.nbXn = h.daTra; if (h.buoc === 6) h.buoc++; return; }
      if (h.buoc === 7 && h.nbXn < TRA_THANG) return;
      if (h.buoc === 4 && TS(h)) { h.buoc = 7; return; }    // trả sau: ngân hàng giữ cọc xong là tới bốc, không có trả trước
      if (h.buoc === 12 && TS(h)) { h.buoc = 14; return; }   // trả sau: cọc chuyển hết cho người bán, không có tiền hoàn
      if (h.buoc === 13) h.hoanXn = true;
      h.buoc = Math.min(BUOC.length, h.buoc + 1);
    });
  }));
}
// Hiệu ứng nghiệp vụ khi trạng thái đổi (kể cả do bên kia bấm): tiền đếm lên, ngân hàng chi cọc thì xu bay, bước vừa xong nảy
function hieuUngDon(goc, h) {
  const HU = window.HieuUng, cu = window.__hdCu;
  const o = [...goc.querySelectorAll("#tien-o b[data-v]")].map((b) => Number(b.dataset.v));
  if (HU && cu) {
    goc.querySelectorAll("#tien-o b[data-v]").forEach((b, i) => { if (cu.o[i] !== o[i]) HU.demSo(b, cu.o[i], o[i]); });
    if (cu.buoc === 12 && h.buoc === 13) { const ds = goc.querySelectorAll("#tien-o > div"); setTimeout(() => HU.xuBay(ds[1], ds[2], 6), 250); }
    if (h.buoc > cu.buoc) { const v = goc.querySelectorAll(".sl-buoc .sl-b-vong")[h.buoc - 1]; if (v) HU.nayDich(v); }
  }
  window.__hdCu = { o, buoc: h.buoc };
}

// ── Mẫu dùng lại ──
const nhanLuot = (l) => l === "ban" ? `<span class="sl-nhan sl-n-ban">Tới lượt bạn</span>` : l === "nb" ? `<span class="sl-nhan">Chờ người bán</span>` : l === "nh" ? `<span class="sl-nhan sl-n-nh">Chờ ngân hàng</span>` : l === "vh" ? `<span class="sl-nhan sl-n-nh">Người vận hành kiểm</span>` : `<span class="sl-nhan sl-n-xong">Hoàn tất</span>`;
const sao = (n) => `<span class="sl-so" style="color:var(--chin);font-weight:600">${n.toFixed(1)}★</span>`;
const theLo = (l, url) => `<a class="sl-lo" href="${url("chi-tiet-lo", "&lo=" + l.ma)}"><div class="sl-lo-anh sl-anh-${l.anh}">${l.kiem ? `<span class="sl-nhan sl-n-xong">Đã kiểm tại vườn</span>` : `<span class="sl-nhan">Người bán tự khai</span>`}</div>
  <div class="sl-lo-than"><b>${esc(l.ten)}</b><span class="sl-ghi">${esc(l.nguoi)} · ${esc(l.noi)}</span><span class="sl-gia">${so(l.gia)} đ/kg</span><span class="sl-ghi">Còn ${kg(l.con)} · hái ${esc(l.hai)} · ${sao(l.uy)} · ${l.don} đơn</span></div></a>`;
const the = (tieu, than, phai = "") => `<section class="sl-the"><div class="sl-the-dau"><h2><span class="sl-cham"></span>${esc(tieu)}</h2>${phai}</div>${than}</section>`;
const dong = (a, b, lop = "") => `<div class="sl-dong ${lop}"><span>${a}</span><b>${b}</b></div>`;
const bao = (chu, loai = "") => `<div class="sl-bao ${loai}">${icon(loai === "sl-bao-do" ? "canh" : "khien")}<div>${chu}</div></div>`;
const timO = (goi) => `<label class="sl-tim">${icon("tim")}<input placeholder="${esc(goi)}" aria-label="${esc(goi)}"></label>`;
const loc = (ds, chon = 0) => `<div class="sl-loc" role="group">${ds.map((x, i) => `<button type="button" aria-pressed="${i === chon}">${esc(x)}</button>`).join("")}</div>`;
const ganLoc = (goc) => goc.querySelectorAll(".sl-loc").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
const lo = (ma) => LO.find((x) => x.ma === ma) || LO[0];

// ── Các màn ──
const man = {
  // Vào app
  "dang-nhap": { tieuDe: "Đăng nhập", phu: "App mua AgiViet", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="align-items:center;max-width:960px">
      <section class="sl-the" style="padding:28px;display:grid;gap:16px">
        <h2 style="font-size:var(--c5)">Mua nông sản, thủy sản tận vườn — có hợp đồng, cọc do ngân hàng giữ</h2>
        <label class="sl-o"><span>Số điện thoại hoặc email công việc</span><input inputmode="email" value="0277 386 210"></label>
        <a class="sl-nut sl-vang" href="${url("otp")}" style="min-height:48px">Nhận mã xác minh</a>
        <p class="sl-ghi">Chưa có tài khoản tổ chức? Nhập số điện thoại, bước sau sẽ hỏi thông tin tổ chức.</p>
      </section>
      <div style="display:grid;gap:12px">${bao("Cọc 30% do ngân hàng đối tác giữ tới khi nghiệm thu xong.", "sl-bao-tien")}${bao("Người bán đã xác minh danh tính và tài khoản nhận tiền đúng tên.")}${bao("Số điện thoại hai bên được che tới khi ngân hàng xác nhận cọc.", "sl-bao-nh")}</div>
    </div>` },
  otp: { tieuDe: "Mã xác minh", lui: "dang-nhap", ve: (s, { url }) => `
    <section class="sl-the" style="max-width:440px;display:grid;gap:16px;padding:24px">
      <p>Mã 6 số đã gửi tới <b>0277 386 210</b>. Mã hết hạn sau 5 phút.</p>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">${"123456".split("").map((c) => `<input aria-label="Số mã" maxlength="1" value="${c}" style="min-width:0;width:100%;height:52px;text-align:center;font:700 22px var(--chu);border-radius:10px;border:1px solid var(--ke-dam);background:var(--giay-lot)">`).join("")}</div>
      <a class="sl-nut sl-vang" href="${url("thong-tin-to-chuc")}" style="min-height:48px">Xác minh</a>
      <button class="sl-nut sl-vien" type="button">Gửi lại mã (sau 42 giây)</button>
    </section>` },
  "thong-tin-to-chuc": { tieuDe: "Thông tin tổ chức", lui: "otp", phu: "Bước 1/2 · dùng cho hợp đồng và bảng kê thuế", ve: (s, { url }) => `
    <section class="sl-the" style="max-width:720px;display:grid;gap:14px">
      <div class="sl-luoi sl-l2">
        <label class="sl-o"><span>Tên tổ chức</span><input value="Công ty TNHH Nhà máy sấy Đồng Xanh"></label>
        <label class="sl-o"><span>Mã số thuế</span><input value="1601 234 567" inputmode="numeric"></label>
        <label class="sl-o"><span>Loại hình</span><select><option>Chế biến</option><option>Xuất khẩu</option><option>Bán lẻ, siêu thị</option><option>Vựa, đầu mối</option><option>Nhà hàng, bếp ăn</option><option>Mua thử</option></select><small>Chỉ đổi giá trị điền sẵn khi soạn thỏa thuận, không đổi luồng mua.</small></label>
        <label class="sl-o"><span>Người phụ trách mua</span><input value="Lê Thu Hà"></label>
      </div>
      <label class="sl-o"><span>Địa chỉ kho nhận hàng</span><input value="KCN Sa Đéc, Đồng Tháp"></label>
      <div class="sl-the sl-the-lot" style="display:flex;gap:12px;align-items:center">${icon("phieu")}<div style="flex:1"><b>Giấy phép kinh doanh</b><div class="sl-ghi">Thêm để được nhãn "Tổ chức đã xác minh". Có thể bổ sung sau.</div></div><button class="sl-nut sl-vien" type="button">Tải ảnh lên</button></div>
      <div class="sl-hang-nut" style="justify-content:flex-end"><a class="sl-nut sl-vang" href="${url("chon-goi")}">Tiếp tục</a></div>
    </section>` },
  "chon-goi": { tieuDe: "Chọn gói", lui: "thong-tin-to-chuc", phu: "Bước 2/2 · đổi được bất cứ lúc nào", ve: (s, { url }) => veGoi(url, true) },

  // Tổng quan
  "tong-quan": { tieuDe: "Tổng quan", phu: "Thứ Hai, 27/10 · Nhà máy sấy Đồng Xanh", phai: (s) => `<span class="sl-an-dt">${timO("Tìm lô, đơn, người bán")}</span><a class="sl-nut sl-vang sl-an-dt" href="?man=tao-nhu-cau">${icon("them")}Tạo phiếu nhu cầu</a>`, ve: (s, { url }) => {
    const h = s.hd, luot = hdLuot(h);
    return `
    <div class="sl-dai">
      <div class="sl-gap"><small>Tới lượt bạn</small><b>${viecCan(s)}</b><span>việc cần làm hôm nay</span></div>
      <div ><small>Đơn sắp nhận</small><b>3</b><span>trong 7 ngày · 6.800 kg</span></div>
      <div class="sl-tien"><small>Tiền sắp trả</small><b>${so(h.daTra >= TRA_THANG ? 0 : TRA_THANG - h.daTra)}</b><span>đ · trả thẳng HĐ-0018 trước 5:30 28/10</span></div>
      <div ><small>Ngân hàng đang giữ</small><b>${so(hdTien(h).nh + 12780000)}</b><span>đ · cọc của 2 đơn</span></div>
    </div>
    <div class="sl-luoi sl-chinh-phu">
      <div style="display:grid;gap:16px">
        ${the("Việc cần làm", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Đơn</th><th>Việc</th><th>Hạn</th><th>Lượt</th></tr></thead><tbody>
          <tr><td><a href="${url("chi-tiet-don")}">HĐ-0018</a><div class="sl-ghi">Xoài cát Chu · chị Năm</div></td><td>${esc(luot === "xong" ? "Hoàn tất" : hdChan(h) || BUOC[h.buoc].lam)}</td><td class="sl-so">${esc(luot === "xong" ? "" : BUOC[h.buoc]?.han || "hôm nay")}</td><td>${nhanLuot(luot)}</td></tr>
          ${DON_KHAC.filter((x) => x.luot !== "xong").map((x) => `<tr><td><a href="${url("chi-tiet-don")}">${x.ma}</a><div class="sl-ghi">${esc(x.hang)}</div></td><td>${esc(x.buoc)}</td><td class="sl-so">${esc(x.han)}</td><td>${nhanLuot(x.luot)}</td></tr>`).join("")}
          <tr><td><a href="${url("so-bao-gia")}">PN-0042</a><div class="sl-ghi">Xoài cát Chu · 2.000 kg</div></td><td>3 báo giá mới, chọn trước 18:00</td><td class="sl-so">còn 9 giờ</td><td>${nhanLuot("ban")}</td></tr>
        </tbody></table></div>`, `<a href="${url("don-hang")}">Tất cả đơn</a>`)}
        ${the("Nguồn khớp nhu cầu", `<div class="sl-luoi sl-l3">${LO.slice(0, 3).map((l) => theLo(l, url)).join("")}</div>`, `<a href="${url("goi-y")}">Xem gợi ý</a>`)}
      </div>
      <div style="display:grid;gap:16px">
        ${the("Lịch nhận tuần này", [["T3 28/10", "HĐ-0018 · 2.000 kg xoài", "tại vườn 5:30"], ["T4 29/10", "HĐ-0024 · 800 kg sầu riêng", "giao tận kho"], ["T6 31/10", "HĐ-0021 · 3.000 kg thanh long", "giao tận kho"]].map(([a, b, c]) => dong(`<b style="color:var(--muc)">${a}</b><div class="sl-ghi">${b}</div>`, `<span class="sl-ghi">${c}</span>`)).join(""), `<a href="${url("lich-nhan")}">Lịch tháng</a>`)}
        ${the("Mối quen", [["Chị Năm", "4,8★ · 6 đơn · phí mối quen 0%"], ["Anh Sáu", "4,9★ · 4 đơn"], ["HTX Tân Thuận", "4,7★ · 3 đơn"]].map(([a, b]) => dong(a, `<span class="sl-ghi">${b}</span>`)).join(""), `<a href="${url("moi-quen")}">Mở</a>`)}
      </div>
    </div>`; } },

  // Nguồn hàng
  "nguon-hang": { tieuDe: "Nguồn hàng", phu: "Lô đang bán · cập nhật lượng còn mỗi ngày", phai: () => timO("Xoài, tôm, Đồng Tháp…"), ve: (s, { url }) => `
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">${loc(["Tất cả", "Trái cây", "Thủy sản", "Rau củ", "Hạt, cà phê"])}<span style="margin-left:auto" class="sl-an-dt">${loc(["Gần kho trước", "Hái sớm trước", "Uy tín cao trước"])}</span></div>
    <div class="sl-luoi sl-l3">${LO.map((l) => theLo(l, url)).join("")}</div>
    <p class="sl-ghi">Giá là giá tại vườn người bán chào. So báo giá sẽ quy về giá tại kho của bạn (cộng xe, hao hụt).</p>`, sau: (g) => ganLoc(g) },
  "goi-y": { tieuDe: "Gợi ý khớp nhu cầu", thuoc: "nguon-hang", lui: "nguon-hang", phu: "Xếp theo mức khớp với phiếu PN-0042", ve: (s, { url }) => `
    ${the("PN-0042 · Xoài cát Chu loại 1 · 2.000 kg · 27–29/10 · trần 24.000 đ/kg", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Lô</th><th>Người bán</th><th class="sl-so">Giá vườn</th><th class="sl-so">Còn</th><th>Vì sao khớp</th><th></th></tr></thead><tbody>
      <tr><td><a href="${url("chi-tiet-lo", "&lo=L-0412")}">L-0412</a></td><td>Chị Năm · 4,8★</td><td class="sl-so">23.000 đ</td><td class="sl-so">3.500 kg</td><td>Đúng giống, loại 1, hái 27/10, cách kho 180 km, đã kiểm tại vườn</td><td><span class="sl-nhan sl-n-xong">Khớp cao</span></td></tr>
      <tr><td>L-0445</td><td>HTX Tân Thuận · 4,7★</td><td class="sl-so">22.800 đ</td><td class="sl-so">2.400 kg</td><td>Đúng giống, xa kho 230 km, chưa có mẫu kiểm</td><td><span class="sl-nhan sl-n-tien">Khớp vừa</span></td></tr>
      <tr><td><a href="${url("chi-tiet-lo", "&lo=L-0431")}">L-0431</a></td><td>Anh Tư Hòa · 4,6★</td><td class="sl-so">31.500 đ</td><td class="sl-so">1.800 kg</td><td>Khác giống (Hòa Lộc), vượt giá trần</td><td><span class="sl-nhan">Khớp thấp</span></td></tr>
    </tbody></table></div>`)}
    ${bao("Gợi ý chỉ để tham khảo. AgiViet không xếp theo \"rẻ nhất\"; giá của hộ này không bao giờ đưa cho hộ khác.", "sl-bao-nh")}` },
  "chi-tiet-lo": { tieuDe: (s) => lo(new URLSearchParams(location.search).get("lo")).ten, thuoc: "nguon-hang", lui: "nguon-hang", phu: () => { const l = lo(new URLSearchParams(location.search).get("lo")); return `${l.ma} · ${l.nguoi} · ${l.noi}`; }, ve: (s, { url, q }) => { const l = lo(q.get("lo")); return `
    <div class="sl-luoi sl-chinh-phu">
      <div style="display:grid;gap:16px">
        <div class="sl-luoi sl-l3">${[1, 2, 3].map((i) => `<div class="sl-lo-anh sl-anh-${l.anh}" style="border-radius:12px;filter:brightness(${1 - i * 0.06})"></div>`).join("")}</div>
        ${the("Hàng", dong("Lượng còn bán", kg(l.con)) + dong("Giá chào tại vườn", `${so(l.gia)} đ/kg`) + dong("Giá hạ cấp", "15.000 đ/kg") + dong("Ngày hái", l.hai) + dong("Quy cách", "Trái 350–550 g, không dập, cuống 1 cm") + dong("Đóng gói", "Sọt nhựa 20 kg của người bán"))}
        ${the("Hồ sơ nguồn gốc", dong("Vườn", "1,2 ha · mã vùng trồng VN-DT-0412") + dong("Lần phun gần nhất", "12/10 · hết cách ly 22/10") + dong("Ảnh chụp trong app", "8 ảnh · có giờ và vị trí") + dong("Nhãn", l.kiem ? `<span class="sl-nhan sl-n-xong">Đã kiểm tại vườn 20/10</span>` : `<span class="sl-nhan">Người bán tự khai</span>`), `<a href="${url("truy-xuat")}">Nhật ký</a>`)}
      </div>
      <div style="display:grid;gap:16px;position:sticky;top:80px">
        <section class="sl-the" style="display:grid;gap:12px"><div class="sl-chiso"><small>Giá chào</small><b>${so(l.gia)} đ/kg</b><span>còn ${kg(l.con)}</span></div>
          <button class="sl-nut sl-vang" type="button">Chào giá</button><a class="sl-nut sl-vien" href="${url("tin-nhan")}">Hỏi giá qua tin nhắn</a><a class="sl-nut sl-vien" href="${url("hen-xem-vuon")}">Hẹn xem vườn</a>
          <p class="sl-ghi">Giá bạn chào chỉ người bán này thấy. Chào tối đa 4 tấn đang mở cùng lúc.</p></section>
        <a class="sl-the" href="${url("ho-so-ban")}" style="text-decoration:none;display:flex;gap:12px;align-items:center"><span class="sl-anh" style="width:40px;height:40px;border-radius:50%;background:var(--la-nhat);display:grid;place-items:center;font-weight:700;color:var(--la)">N</span><div><b>${esc(l.nguoi)}</b><div class="sl-ghi">${sao(l.uy)} · ${l.don} đơn · giao đủ 97%</div></div></a>
      </div>
    </div>`; } },
  "ho-so-ban": { tieuDe: "Chị Năm (Nguyễn Thị Năm)", thuoc: "nguon-hang", lui: "chi-tiet-lo", phu: "Mỹ Xương, Cao Lãnh, Đồng Tháp · bán từ 2026", ve: (s, { url }) => `
    <div class="sl-luoi sl-l4">
      <div class="sl-the sl-chiso sl-tien"><small>Uy tín</small><b>4,8★</b><span>31 đơn đã xong</span></div>
      <div class="sl-the sl-chiso"><small>Giao đủ lượng</small><b>97%</b></div>
      <div class="sl-the sl-chiso"><small>Đúng loại</small><b>94%</b></div>
      <div class="sl-the sl-chiso"><small>Đúng hẹn</small><b>100%</b></div>
    </div>
    <div class="sl-luoi sl-l2">
      ${the("Đã xác minh", dong("Danh tính", `<span class="sl-nhan sl-n-xong">Căn cước · 14/09</span>`) + dong("Tài khoản nhận tiền", `Agribank •••• 2186 · đúng tên`) + dong("Vườn", `<span class="sl-nhan sl-n-xong">Nhân viên tới vườn 20/10</span>`) + dong("Số điện thoại", `<span class="sl-ghi">Hiện sau khi ngân hàng xác nhận cọc</span>`))}
      ${the("Nhật ký tóm tắt", ["Tháng 10: tỉa cành, bón kali, phun 1 lần (12/10)", "Tháng 9: bao trái 3.200 trái", "Tháng 8: ra hoa đợt 2"].map((x) => `<p style="padding:8px 0;border-bottom:1px solid var(--ke)">${esc(x)}</p>`).join(""))}
    </div>
    ${the("Nhận xét của bên mua", [["Nhà máy Đồng Xanh", "Hàng đều, cân đúng, bốc đúng giờ.", 5], ["Vựa Ba Cường", "Có 2% dập, chị chủ động báo trước.", 4]].map(([a, b, c]) => dong(`<b style="color:var(--muc)">${a}</b><div class="sl-ghi">${b}</div>`, sao(c))).join(""))}` },

  // Nhu cầu
  "nhu-cau": { tieuDe: "Nhu cầu mua", phu: "Phiếu bạn đăng cho người bán thấy", phai: (s) => `<a class="sl-nut sl-vang" href="?man=tao-nhu-cau">${icon("them")}Tạo phiếu nhu cầu</a>`, ve: (s, { url }) => the("Phiếu của bạn", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Phiếu</th><th>Mặt hàng</th><th class="sl-so">Lượng</th><th>Ngày nhận</th><th class="sl-so">Giá trần</th><th class="sl-so">Báo giá</th><th>Trạng thái</th></tr></thead><tbody>
    ${NHU_CAU.map((n) => `<tr><td><a href="${url("chi-tiet-nhu-cau")}">${n.ma}</a></td><td>${esc(n.hang)}</td><td class="sl-so">${kg(n.luong)}</td><td>${n.khoang}</td><td class="sl-so">${so(n.tran)} đ</td><td class="sl-so">${n.bao}</td><td>${n.trang.startsWith("Đã") ? `<span class="sl-nhan sl-n-xong">${esc(n.trang)}</span>` : `<span class="sl-nhan sl-n-tien">${esc(n.trang)}</span>`}</td></tr>`).join("")}
    </tbody></table></div>`) },
  "tao-nhu-cau": { tieuDe: "Tạo phiếu nhu cầu", thuoc: "nhu-cau", lui: "nhu-cau", ve: (s, { url }) => `
    <div class="sl-luoi sl-chinh-phu">
      <section class="sl-the" style="display:grid;gap:14px">
        <label class="sl-o"><span>Nói hoặc dán yêu cầu, AI điền giúp</span><textarea>Cần 2 tấn xoài cát Chu loại 1, nhận 27 tới 29/10 tại kho Sa Đéc, giá không quá 24 ngàn</textarea><small>AI đã điền các ô bên dưới. Bạn kiểm lại trước khi đăng.</small></label>
        <div class="sl-luoi sl-l2">
          <label class="sl-o"><span>Mặt hàng</span><input value="Xoài cát Chu"></label>
          <label class="sl-o"><span>Loại</span><select><option>Loại 1</option><option>Loại 1 và 2</option><option>Mọi loại</option></select></label>
          <label class="sl-o"><span>Lượng (kg)</span><input value="2.000" inputmode="numeric"></label>
          <label class="sl-o"><span>Giá trần (đ/kg)</span><input value="24.000" inputmode="numeric"><small>Người bán không thấy giá trần.</small></label>
          <label class="sl-o"><span>Nhận từ ngày</span><input type="date" value="2026-10-27"></label>
          <label class="sl-o"><span>Đến ngày</span><input type="date" value="2026-10-29"></label>
        </div>
        <label class="sl-o"><span>Nơi nhận</span><select><option>Kho Đồng Xanh · KCN Sa Đéc (mặc định)</option><option>Nhận tại vườn, tôi lo xe</option></select></label>
        <div class="sl-hang-nut" style="justify-content:flex-end"><a class="sl-nut sl-vien" href="${url("nhu-cau")}">Lưu nháp</a><a class="sl-nut sl-vang" href="${url("chi-tiet-nhu-cau")}">Đăng phiếu nhu cầu</a></div>
      </section>
      ${the("Thị trường tuần này", dong("Giá vườn xoài cát Chu", "21.500–24.000 đ") + dong("Lô đang bán khớp", "3 lô · 7.700 kg") + `<p class="sl-ghi" style="margin-top:8px">Tham khảo từ các lô đang bán trên AgiViet, không phải giá thị trường chính thức.</p>`)}
    </div>` },
  "chi-tiet-nhu-cau": { tieuDe: "PN-0042 · Xoài cát Chu loại 1", thuoc: "nhu-cau", lui: "nhu-cau", phu: "2.000 kg · nhận 27–29/10 · trần 24.000 đ/kg", phai: () => `<a class="sl-nut sl-vang" href="?man=so-bao-gia">So 3 báo giá</a>`, ve: (s, { url }) => `
    ${the("Báo giá nhận được", veBangChao(s, url, false))}
    ${the("Lô gợi ý chưa báo giá", `<div class="sl-luoi sl-l3">${LO.filter((l) => l.anh === "xoai").map((l) => theLo(l, url)).join("")}</div>`)}` },

  // Báo giá
  "bao-gia": { tieuDe: "Báo giá", phu: "Báo giá người bán gửi theo phiếu của bạn, và lời chào bạn gửi", ve: (s, { url }) => `
    ${loc(["Nhận được (4)", "Bạn đã chào (2)", "Đã đóng"])}
    ${the("PN-0042 · Xoài cát Chu · 3 báo giá", veBangChao(s, url, false), `<a href="${url("so-bao-gia")}">So</a>`)}
    ${the("PN-0045 · Thanh long ruột đỏ · 1 báo giá", `<div class="sl-bang-boc"><table class="sl-bang"><tbody><tr><td>HTX Tân Thuận</td><td class="sl-so">14.200 đ/kg</td><td>5.000 kg · giao tận kho 02/11</td><td><span class="sl-nhan sl-n-ban">Hết hạn sau 12 giờ</span></td></tr></tbody></table></div>`)}`, sau: ganLoc },
  "so-bao-gia": { tieuDe: "So báo giá · PN-0042", thuoc: "bao-gia", lui: "chi-tiet-nhu-cau", phu: "Quy về giá tại kho Đồng Xanh (cộng xe ước tính)", ve: (s, { url }) => `
    ${s.chao.chon ? bao(`Đã chọn chị Năm. Sinh ra <b>HĐ-0018</b> (bản nháp thỏa thuận). Hàng được giữ 24 giờ.`) : ""}
    ${the("Bảng so", veBangChao(s, url, true))}
    <div class="sl-luoi sl-l2">${bao("Không xếp theo \"rẻ nhất\". Xem thêm uy tín, ngày giao, ai lo xe. Giá hộ này không đưa sang hộ khác.", "sl-bao-nh")}${bao(`Bạn đã rút lời chào ${s.chao.rut}/2 lần cho phiếu này. Tổng lượng chào đang mở: 2.000 / 4.000 kg.`, "sl-bao-tien")}</div>`, sau: (g, k, { url }) => g.querySelectorAll("[data-chon]").forEach((b) => b.addEventListener("click", () => doi((s) => { s.chao.chon = b.dataset.chon; if (s.hd.buoc === 0) s.hd.buoc = 1; }))) },
  "gui-bao-gia": { tieuDe: "Chào giá", thuoc: "bao-gia", lui: "chi-tiet-lo", phu: "L-0412 · Xoài cát Chu loại 1 · chị Năm", ve: (s, { url }) => `
    <section class="sl-the" style="max-width:720px;display:grid;gap:14px">
      <div class="sl-luoi sl-l2">
        <label class="sl-o"><span>Giá loại 1 (đ/kg)</span><input value="23.000"></label>
        <label class="sl-o"><span>Giá hạ cấp (đ/kg)</span><input value="15.000"></label>
        <label class="sl-o"><span>Lượng (kg)</span><input value="2.000"><small>Còn chào được 2.000 kg trong mức 4 tấn đang mở.</small></label>
        <label class="sl-o"><span>Lời chào hết hạn sau</span><select><option>24 giờ</option><option>12 giờ</option><option>6 giờ</option></select></label>
      </div>
      <label class="sl-o"><span>Giao nhận</span><select><option>Tại vườn · tôi lo xe</option><option>Người bán giao tận kho</option></select></label>
      <label class="sl-o"><span>Cách trả phần còn lại</span><select><option>Trả thẳng trước khi bốc</option><option>Kiểm rồi mới trả (đạt khi kiểm tại vườn)</option><option>Trả khi nhận tại kho</option></select></label>
      ${dong("Cọc qua app (30%)", d(COC)) + dong("Phí giới thiệu 0,3%", d(PHI)) + dong("Trả thẳng người bán", d(TRA_THANG), "sl-tong")}
      <div class="sl-hang-nut" style="justify-content:flex-end"><a class="sl-nut sl-vien" href="${url("chi-tiet-lo")}">Hủy</a><a class="sl-nut sl-vang" href="${url("so-bao-gia")}">Chào giá</a></div>
    </section>` },

  // Tin nhắn
  "tin-nhan": { tieuDe: "Tin nhắn", phu: "Trò chuyện với người bán qua AgiViet", ve: (s, { url }) => {
    const h = docTC().find((x) => x.ma === "T1"), mo = moLienLacT1();
    const tin = (m) => {
      if (m.k === "he") return `<div class="sl-bao ${m.canh ? "sl-bao-do" : "sl-bao-nh"}" style="justify-self:center;max-width:92%">${icon(m.canh ? "canh" : "khien")}<div>${esc(m.t)}</div></div>`;
      if (m.k === "buoc") return `<div class="sl-bao sl-bao-tien" style="justify-self:stretch">${icon("don")}<div>Hai bên đã đồng ý giá. <a href="${url("chi-tiet-don")}" style="font-weight:700">Soạn và ký thỏa thuận HĐ-0018</a></div></div>`;
      const cuaToi = m.ai === "ho";   // dữ liệu lưu theo góc người bán: "ho" = bên mua = mình
      const nen = cuaToi ? "background:var(--la);color:var(--tren-la);justify-self:end;border-radius:14px 14px 4px 14px" : "background:var(--giay-lot);justify-self:start;border-radius:14px 14px 14px 4px";
      if (m.k === "anh") return `<div style="${nen};padding:4px;max-width:75%"><div style="width:220px;aspect-ratio:4/3;border-radius:10px;background:url(${esc(m.anh)}) center/cover"></div><small style="padding:2px 6px;opacity:.7">${esc(m.luc)}</small></div>`;
      if (m.k === "gia") return `<div class="sl-the" style="justify-self:stretch;box-shadow:0 0 0 1.5px ${cuaToi ? "var(--la)" : "#e3c77a"};gap:4px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${cuaToi ? "Bạn trả giá" : "Chị Năm trả giá"}</b>${m.trang === "dong-y" ? `<span class="sl-nhan sl-n-xong">Hai bên đã đồng ý</span>` : m.trang === "khong" ? `<span class="sl-nhan">Người bán không bán</span>` : m.trang === "cho-bac" ? `<span class="sl-nhan">Chờ chị Năm trả lời</span>` : `<span class="sl-nhan">Đã trả lại</span>`}</div><b class="sl-so" style="font-size:var(--c5)">${so(m.gia)} đ/kg</b><span class="sl-ghi">${so(m.luong)} kg · thành tiền ${d(m.gia * m.luong)} · ${esc(m.ghi || "")}</span></div>`;
      return `<p style="${nen};max-width:75%;padding:10px 12px">${m.che ? esc(m.t).replace(/•••[ •]*/g, (x) => `<span style="background:rgba(0,0,0,.14);border-radius:4px;padding:0 3px">${x}</span>`) : esc(m.t)}<small style="display:block;font-size:12px;opacity:.7">${esc(m.luc)}</small></p>`;
    };
    return `
    <div class="sl-hai-cot" style="grid-template-columns:300px minmax(0,1fr)">
      <section class="sl-the" style="padding:8px;align-content:start">${[["Chị Năm", "HĐ-0018 · L-0412", true], ["HTX Tân Thuận", "PN-0045 · báo giá thanh long"], ["Anh Huỳnh Bảy", "HĐ-0024 · xin dời ngày giao"]].map(([a, b, m]) => `<div style="display:flex;gap:10px;padding:10px;border-radius:10px;${m ? "background:var(--giay-lot)" : ""}"><span style="width:36px;height:36px;border-radius:50%;background:var(--la-nhat);color:var(--la);display:grid;place-items:center;font-weight:700;flex:none">${a.split(" ").at(-1)[0]}</span><span style="min-width:0;flex:1"><b style="display:block">${a}</b><span class="sl-ghi" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b}</span></span></div>`).join("")}</section>
      <section class="sl-the" style="display:grid;gap:12px;align-content:start">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--ke);padding-bottom:12px"><b>Chị Năm · L-0412${mo ? " · liên lạc đã mở" : ""}</b><span style="margin-left:auto" class="sl-hang-nut"><button class="sl-nut sl-vien" type="button" id="goi-nb">${icon("dien")}${mo ? "Gọi 0918 234 421" : "Gọi qua app"}</button></span></div>
        <div style="display:grid;gap:8px" id="tn-chat">${h.tin.map(tin).join("")}</div>
        <div class="sl-hang-nut"><button class="sl-nut sl-nhe" type="button" id="tn-tra">${icon("can")}Trả giá</button><button class="sl-nut sl-nhe" type="button" id="tn-anh">Gửi ảnh</button></div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px"><label class="sl-tim" style="min-height:44px">${icon("tin")}<input id="tn-go" placeholder="Nhắn cho chị Năm" aria-label="Nhắn tin"></label><button class="sl-nut sl-vang" type="button" id="tn-gui">Gửi</button></div>
        <p class="sl-ghi">Cùng cuộc trò chuyện chị Năm thấy trong app bán. Số điện thoại hai bên che tới khi ngân hàng giữ cọc.</p>
      </section>
    </div>`; },
    sau: (g) => {
      const ds = docTC(), h = ds.find((x) => x.ma === "T1"), go = g.querySelector("#tn-go");
      const them = (m) => { h.tin.push(m); h.chuaDoc = (h.chuaDoc || 0) + (m.ai === "ho" ? 1 : 0); ghiTC(ds); kho.doi(() => {}); };
      g.querySelector("#tn-gui").addEventListener("click", () => {
        const chu = go.value.trim(); if (!chu) return;
        const q = moLienLacT1() ? { sach: true, che: chu } : quetLienLac(chu);
        them({ k: "tin", ai: "ho", t: q.che, luc: gioNay(), che: !q.sach });
        if (!q.sach) them({ k: "he", canh: true, t: `Tin của bên mua có ${q.loai} nên đã bị che. Trao đổi liên lạc trước khi ngân hàng giữ cọc là vi phạm.`, luc: gioNay() });
      });
      go.addEventListener("keydown", (e) => { if (e.key === "Enter") g.querySelector("#tn-gui").click(); });
      g.querySelector("#tn-anh").addEventListener("click", () => them({ k: "anh", ai: "ho", anh: "/assets/products/xoai-cat-chu.jpg", luc: gioNay() }));
      g.querySelector("#tn-tra").addEventListener("click", () => {
        if (h.tin.some((m) => m.trang === "dong-y")) { window.HieuUngThem?.rung(g.querySelector("#tn-tra")); return; }
        h.tin.forEach((m) => { if (m.trang === "cho-bac") m.trang = "da-tra"; });
        them({ k: "gia", ai: "ho", gia: 23000, luong: 2000, ghi: "Bên mua trả giá", luc: gioNay(), trang: "cho-bac" });
      });
      const c = g.querySelector("#tn-chat"); c.lastElementChild?.scrollIntoView({ block: "nearest" });
    } },
  "hen-xem-vuon": { tieuDe: "Hẹn xem vườn", thuoc: "tin-nhan", lui: "tin-nhan", phu: "Chị Năm · L-0412", ve: () => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <section class="sl-the" style="display:grid;gap:14px">
        <label class="sl-o"><span>Ngày giờ đề nghị</span><input type="datetime-local" value="2026-10-26T08:00"></label>
        <label class="sl-o"><span>Ngày giờ dự phòng</span><input type="datetime-local" value="2026-10-26T14:00"></label>
        <div class="sl-the sl-the-lot">${dong("Địa chỉ", "Ấp 3, Mỹ Xương, Cao Lãnh")}<p class="sl-ghi">Địa chỉ chi tiết hiện khi chị Năm nhận lời hẹn.</p></div>
        <button class="sl-nut sl-vang" type="button">Gửi lời hẹn</button>
      </section>
      ${the("Các lần hẹn", dong("26/10 · 8:00", `<span class="sl-nhan">Chờ chị Năm trả lời</span>`) + dong("19/10 · 9:30", `<span class="sl-nhan sl-n-xong">Đã xem vườn</span>`))}
    </div>` },

  // Đơn
  "don-hang": { tieuDe: "Đơn và lịch nhận", phu: "Xếp theo tới lượt ai và hạn", phai: () => `<a class="sl-nut sl-vien sl-an-dt" href="?man=lich-nhan">${icon("lich")}Lịch tháng</a>`, ve: (s, { url }) => {
    const h = s.hd, luot = hdLuot(h);
    const ds = [{ ma: "HĐ-0018", hang: "Xoài cát Chu · 2.000 kg", nguoi: "Chị Năm", buoc: luot === "xong" ? "Hoàn tất" : hdChan(h) || BUOC[h.buoc].lam, luot, han: luot === "xong" ? "" : BUOC[h.buoc]?.han || "hôm nay", tien: 46000000 }, ...DON_KHAC];
    const nhom = [["Tới lượt bạn", (x) => x.luot === "ban"], ["Đang chờ bên kia", (x) => ["nb", "nh", "vh"].includes(x.luot)], ["Hoàn tất", (x) => x.luot === "xong"]];
    return `${loc(["Tất cả", "Tới lượt bạn", "Có tranh chấp", "Còn công nợ"])}${nhom.map(([t, f]) => { const r = ds.filter(f); return r.length ? the(`${t} (${r.length})`, `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Đơn</th><th>Người bán</th><th>Bước hiện tại</th><th>Hạn</th><th class="sl-so">Giá trị</th><th></th></tr></thead><tbody>${r.map((x) => `<tr><td><a href="${url("chi-tiet-don")}">${x.ma}</a><div class="sl-ghi">${esc(x.hang)}</div></td><td>${esc(x.nguoi)}</td><td>${esc(x.buoc)}</td><td>${esc(x.han)}</td><td class="sl-so">${d(x.tien)}</td><td>${nhanLuot(x.luot)}</td></tr>`).join("")}</tbody></table></div>`) : ""; }).join("")}`; }, sau: ganLoc },
  "chi-tiet-don": { tieuDe: "HĐ-0018 · Xoài cát Chu loại 1", thuoc: "don-hang", lui: "don-hang", phu: "2.000 kg · chị Năm · Mỹ Xương, Cao Lãnh · giao tại vườn, bạn lo xe", phai: (s) => nhanLuot(hdLuot(s.hd)), ve: (s, { url }) => {
    const h = s.hd;
    return `
    ${veViec(h, url)}
    ${veTienO(h)}
    <div class="sl-luoi sl-chinh-phu">
      ${the("Dòng bước của đơn", veBuoc(h), `<span class="sl-phai sl-ghi">${Math.min(h.buoc, 15)}/15 bước</span>`)}
      <div style="display:grid;gap:16px">
        ${the(`Thỏa thuận (bản ${h.ban || 1})`, dong("Ngày giao", `${h.ngayGiao || "28/10"} · 5:30 tại vườn`) + dong("Giá loại 1", "23.000 đ/kg") + dong("Giá hạ cấp", "15.000 đ/kg") + dong("Cọc qua app", d(COC)) + dong("Phí 0,3%", d(PHI)) + dong("Trả thẳng trước bốc", d(TRA_THANG)) + dong("Tài khoản người bán", "Agribank •••• 2186"), `<a href="${url("thoa-thuan")}">Xem</a>`)}
        ${the("Giao nhận", dong("Xe", "66C-123.45 · anh Lộc") + dong("Mã nhận hàng", `<span class="sl-so">482 917</span>`) + dong("Mẫu đối chứng", "M-2291 niêm phong") + dong("Nghiệm thu", "Kho Đồng Xanh · 2 giờ"))}
        ${the("Liên lạc", h.buoc >= 5 ? dong("Chị Năm", `<span class="sl-so">0918 234 421</span>`) + `<a class="sl-nut sl-vien" style="width:100%;margin-top:8px" href="${url("mo-lien-lac")}">${icon("dien")}Gọi chị Năm</a>` : `<p class="sl-ghi">Số điện thoại che tới khi ngân hàng xác nhận cọc. Trước đó nhắn hoặc gọi qua app.</p>`)}
        ${the("Kịch bản thử (mô phỏng)", `<label class="sl-o"><span>Chọn kịch bản rồi bấm Nạp</span><select id="kb-chon">${KICH_BAN.map(([k, t]) => `<option value="${k}" ${h.kb === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label><div class="sl-hang-nut" style="margin-top:8px"><button class="sl-nut sl-nhe" type="button" id="kb-nap">Nạp kịch bản</button><a class="sl-nut sl-vien" href="/thiet-ke/hai-ben.html">Mở 2 bên cạnh nhau</a></div><p class="sl-ghi" style="margin-top:6px">Nạp lại đơn từ bước 1. App bán (chị Năm) thấy cùng đơn này.</p>`)}
      </div>
    </div>`; }, sau: (g, k) => { ganNutDon(g); hieuUngDon(g, k.s.hd); g.querySelector("#kb-nap")?.addEventListener("click", () => { const kb = g.querySelector("#kb-chon").value; datLaiHD(kb); kho.doi((s) => { s.hd = docHD(); s.chao.chon = null; }); }); } },
  "thoa-thuan": { tieuDe: "Lập thỏa thuận · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", phu: "Bản 1 · điền sẵn theo phân khúc Chế biến", ve: (s, { url }) => `
    <div class="sl-luoi sl-chinh-phu">
      <section class="sl-the" style="display:grid;gap:14px">
        <label class="sl-o"><span>Loại hợp đồng</span><select><option>Mua giao ngay</option><option>Hợp đồng khung theo tuần</option><option>Đặt trước khi hái</option><option>Bao tiêu cả vụ</option></select></label>
        <div class="sl-luoi sl-l2">
          <label class="sl-o"><span>Lượng</span><input value="2.000 kg (±5%)"></label><label class="sl-o"><span>Ngày giao</span><input value="28/10 · 5:30 tại vườn"></label>
          <label class="sl-o"><span>Giá loại 1</span><input value="23.000 đ/kg"></label><label class="sl-o"><span>Giá hạ cấp</span><input value="15.000 đ/kg"></label>
        </div>
        <label class="sl-o"><span>Trả phần còn lại</span><select><option>Trả thẳng 32.200.000 đ trước 5:30 ngày 28/10, trước khi bốc</option><option>Kiểm rồi mới trả</option><option>Trả khi nhận tại kho</option></select></label>
        <label class="sl-o"><span>Mất mùa, thiên tai</span><select><option>Hoàn cọc, không phạt bên nào (cần ảnh, biên bản xã)</option></select></label>
        <label class="sl-o"><span>Nghiệm thu</span><input value="Tại kho Đồng Xanh · 2 giờ từ lúc ký nhận · trả lại quá 5% phải có ảnh"></label>
        ${bao("Trước khi ký: bạn đang chịu rủi ro <b>32.200.000 đ</b> cho phần trả trước khi bốc. Cọc 13.800.000 đ do ngân hàng giữ.", "sl-bao-tien")}
        <div class="sl-hang-nut" style="justify-content:flex-end"><a class="sl-nut sl-vien" href="${url("chi-tiet-don")}">Lưu nháp</a><a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Ký và gửi</a></div>
      </section>
      ${the("Tiền theo thỏa thuận", dong("Giá trị hàng", "46.000.000 đ") + dong("Cọc 30% qua app", d(COC)) + dong("Phí giới thiệu 0,3%", d(PHI)) + dong("Chuyển qua app", d(TONG_CHUYEN_COC), "sl-tong") + dong("Trả thẳng người bán", d(TRA_THANG)) + `<p class="sl-ghi" style="margin-top:8px">Phí lưu vào hợp đồng lúc ký, không đổi khi bạn đổi gói.</p>`)}
    </div>` },
  "dat-coc": { tieuDe: "Đặt cọc · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <section class="sl-the" style="display:grid;gap:12px">
        ${dong("Cọc 30%", d(COC)) + dong("Phí giới thiệu (đơn đầu với chị Năm) 0,3%", d(PHI)) + dong("Tổng chuyển", d(TONG_CHUYEN_COC), "sl-tong")}
        <div class="sl-the sl-the-lot" style="display:flex;gap:16px;align-items:center"><div class="sl-qr" role="img" aria-label="Mã QR chuyển khoản"></div><div style="display:grid;gap:4px"><span class="sl-ghi">Tài khoản đảm bảo tại ngân hàng đối tác</span><b class="sl-so">VietinBank 1140 0018 0018</b><span class="sl-ghi">Nội dung</span><b class="sl-so">AGV HD0018 COC</b></div></div>
        <p class="sl-ghi">Hạn: 48 giờ sau khi chị Năm ký. Đơn sau với mối quen: phí mối quen 0% theo gói Thu mua.</p>
        <a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Tôi đã chuyển cọc</a>
      </section>
      ${the("Cọc này đi đâu", `<ol class="sl-buoc">${["Ngân hàng giữ, không ai rút được", "Nghiệm thu chốt + trả thẳng đã xác nhận + không tranh chấp", "Ngân hàng chuyển phần (giá trị nghiệm thu − đã trả thẳng) cho người bán, hoàn phần dư cho bạn"].map((x, i) => `<li class="sl-b-cho"><span class="sl-b-vong">${i + 1}</span><div><b>${x}</b></div></li>`).join("")}</ol>`)}
    </div>` },
  "mo-lien-lac": { tieuDe: "Đã mở liên lạc · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", ve: () => `
    ${bao("Ngân hàng đã xác nhận cọc 13.800.000 đ. Đơn trên 3 triệu nên hiện số thật.")}
    <div class="sl-luoi sl-l2" style="max-width:960px">${the("Người bán", dong("Người liên hệ", "Nguyễn Thị Năm") + dong("Số điện thoại", `<span class="sl-so">0918 234 421</span>`) + dong("Địa chỉ vườn", "Ấp 3, xã Mỹ Xương, Cao Lãnh, Đồng Tháp") + `<div class="sl-hang-nut" style="margin-top:12px"><a class="sl-nut sl-vang" href="tel:0918234421">${icon("dien")}Gọi</a><button class="sl-nut sl-vien" type="button">Chỉ đường</button></div>`)}
    ${the("Gửi cho tài xế", dong("Xe", "66C-123.45 · anh Lộc") + dong("Mã nhận hàng", `<b class="sl-so" style="font-size:var(--c5)">482 917</b>`) + `<p class="sl-ghi">Tài xế đọc mã cho chị Năm quét khi tới vườn. Không đưa mã cho ai khác.</p>`)}</div>` },
  "nghiem-thu": { tieuDe: "Nhập kết quả cân · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", phu: "Kho ký nhận 9:40 · còn 1 giờ 25 phút để gửi", ve: (s, { url }) => { const t = tinhTien(s.hd); return `
    <div class="sl-luoi sl-chinh-phu">
      <section class="sl-the" style="display:grid;gap:14px">
        <div class="sl-hang-nut"><button class="sl-nut sl-nhe" type="button">Nhận đủ, đúng thỏa thuận</button><button class="sl-nut sl-vien" type="button" aria-pressed="true">Có chênh lệch</button></div>
        <div class="sl-luoi sl-l3">
          <label class="sl-o"><span>Đạt loại 1 (kg)</span><input value="${so(t.dat)}"></label>
          <label class="sl-o"><span>Hạ cấp (kg)</span><input value="${so(t.ha)}"></label>
          <label class="sl-o"><span>Trả lại (kg)</span><input value="${so(t.tra)}"><small>${t.tra > 100 ? "Trên 5%: bắt buộc có ảnh" : "Trên 5% phải có ảnh"}</small></label>
        </div>
        <label class="sl-o"><span>Lý do hạ cấp</span><input value="Trái dưới 350 g, dập nhẹ"></label>
        <div class="sl-the sl-the-lot" style="display:flex;gap:12px;align-items:center">${icon("phieu")}<div style="flex:1"><b>Ảnh phiếu cân và hàng</b><div class="sl-ghi">2 ảnh · 9:52</div></div><a class="sl-nut sl-vien" href="${url("doc-phieu-can")}">Đọc phiếu cân</a></div>
        <div class="sl-hang-nut" style="justify-content:flex-end"><button class="sl-nut sl-vien" type="button">Chưa kiểm được (gia hạn 1 lần)</button><a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Gửi kết quả</a></div>
      </section>
      ${the("Thành tiền", dong(`${so(t.dat)} kg × 23.000`, d(t.dat * 23000)) + dong(`${so(t.ha)} kg × 15.000`, d(t.ha * 15000)) + dong(`${so(t.tra)} kg trả lại`, "0 đ") + dong("Giá trị nghiệm thu", d(t.nt), "sl-tong") + dong("Đã trả thẳng", d(TRA_THANG)) + dong("Cọc chuyển chị Năm", d(t.cocNB)) + dong("Cọc hoàn bạn", d(t.hoanMua)) + (t.nbHoan ? dong("Chị Năm phải hoàn bạn", d(t.nbHoan)) : "") + `<p class="sl-ghi" style="margin-top:8px">Tổng ${so(t.dat + t.ha + t.tra)} kg ${s.hd.kb === "can-lech" ? "(cân tại kho, trong ±5%)" : "khớp cân xe"}. Chị Năm có 24 giờ để đồng ý hoặc phản đối từng dòng.</p>`)}
    </div>`; } },
  "doc-phieu-can": { tieuDe: "Đọc phiếu cân", thuoc: "don-hang", lui: "nghiem-thu", ve: () => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <div class="sl-lo-anh" style="border-radius:14px;aspect-ratio:3/4;background:repeating-linear-gradient(0deg,#fbf8f1 0 26px,#e8e1cf 26px 27px)"><span class="sl-nhan sl-n-xong">AI đã đọc</span></div>
      ${the("AI đọc được", dong("Số phiếu", "PC-102841") + dong("Biển số", "66C-123.45") + dong("Cân lần 1 (có hàng)", "9.420 kg") + dong("Cân lần 2 (xe không)", "7.420 kg") + dong("Hàng", "2.000 kg", "sl-tong") + `<div style="margin-top:12px">${bao("Khớp đơn 2.000 kg (trong ±5%).")}</div><p class="sl-ghi" style="margin-top:8px">Sửa nếu AI đọc sai, rồi dùng số này cho nghiệm thu.</p>`)}
    </div>` },
  "doi-soat": { tieuDe: "Đối soát · HĐ-0012", thuoc: "don-hang", lui: "don-hang", phu: "Lệch tiền, không phải vi phạm", ve: () => `
    ${bao("Bạn báo đã trả 32.200.000 đ, chị Mười chỉ thấy 20.000.000 đ. Người vận hành đang kiểm, hạn còn 1 ngày.", "sl-bao-tien")}
    <div class="sl-luoi sl-l2">${the("Phần đang lệch", dong("Bạn báo đã trả", d(32200000)) + dong("Người bán xác nhận", d(20000000)) + dong("Lệch", d(12200000), "sl-tong") + `<div class="sl-hang-nut" style="margin-top:12px"><button class="sl-nut sl-vang" type="button">Gửi chứng từ</button></div>`)}
    ${the("Đã thống nhất (đã chốt)", dong("Nghiệm thu 1.500 kg", `<span class="sl-nhan sl-n-xong">Đã chốt</span>`) + dong("Phần không tranh chấp", d(20000000)) + `<p class="sl-ghi" style="margin-top:8px">Phần không tranh chấp vẫn được xử lý bình thường.</p>`)}</div>
    ${the("Chứng từ", dong("Ủy nhiệm chi 26/10 · 20.000.000 đ", `<span class="sl-nhan sl-n-xong">Khớp</span>`) + dong("Ủy nhiệm chi 26/10 · 12.200.000 đ", `<span class="sl-nhan sl-n-nh">Người vận hành đang kiểm</span>`))}` },
  "lich-nhan": { tieuDe: "Lịch nhận và trả tiền", thuoc: "don-hang", lui: "don-hang", phu: "Tháng 10/2026", phai: () => `<button class="sl-nut sl-vien" type="button">${icon("tai")}Xuất Excel</button>`, ve: () => {
    const su = { 24: [["i", "HĐ-0015 bưởi"]], 26: [["t", "Cọc HĐ-0018"]], 27: [["t", "Trả thẳng 32,2 tr"]], 28: [["i", "HĐ-0018 xoài"]], 29: [["i", "HĐ-0024 sầu riêng"]], 31: [["i", "HĐ-0021 thanh long"], ["t", "Trả HĐ-0021"]] };
    const o = []; ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].forEach((t) => o.push(`<div class="sl-ten-thu">${t}</div>`));
    for (let i = 0; i < 2; i++) o.push(`<div class="sl-ngoai">${29 + i}</div>`);
    for (let n = 1; n <= 31; n++) o.push(`<div class="${n === 27 ? "sl-hom-nay" : ""}"><b>${n}</b>${(su[n] || []).map(([k, t]) => `<i class="${k === "t" ? "sl-i-tien" : ""}">${t}</i>`).join("")}</div>`);
    for (let i = 1; o.length % 7; i++) o.push(`<div class="sl-ngoai">${i}</div>`);
    return `<section class="sl-the"><div class="sl-lich">${o.join("")}</div><div class="sl-hang-nut" style="margin-top:12px"><span class="sl-nhan sl-n-xong">Nhận hàng</span><span class="sl-nhan sl-n-tien">Trả tiền</span></div></section>`; } },
  "huy-don": { tieuDe: "Xin hủy · HĐ-0018", thuoc: "don-hang", lui: "chi-tiet-don", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <section class="sl-the" style="display:grid;gap:12px">
        <label class="sl-o"><span>Lý do</span><select><option>Nhà máy dừng dây chuyền</option><option>Thiên tai, mất mùa (cần chứng từ)</option><option>Lý do khác</option></select></label>
        <label class="sl-o"><span>Ghi thêm cho chị Năm</span><textarea>Dây chuyền sấy hỏng, chưa nhận được hàng tuần này.</textarea></label>
        <a class="sl-nut sl-huy" href="${url("chi-tiet-don")}">Gửi yêu cầu hủy</a>
        <p class="sl-ghi">Chị Năm có 24 giờ để trả lời. Im lặng là không đồng ý — đơn giữ nguyên.</p>
      </section>
      ${the("Nếu hủy sau cọc", dong("Hàng", "Về lại lô L-0412 của chị Năm") + dong("Cọc 13.800.000 đ", "Chuyển cho chị Năm") + dong("Phí 138.000 đ", "Không hoàn (đề xuất, chờ chốt)") + dong("Khoản trả thẳng", "Chưa có") + `<p class="sl-ghi" style="margin-top:8px">Đây là ảnh hưởng theo thỏa thuận bản 1, chưa xảy ra cho tới khi hai bên đồng ý.</p>`)}
    </div>` },

  // Tiền
  "vi-dam-bao": { tieuDe: "Tài khoản đảm bảo", phu: "Tiền do ngân hàng đối tác giữ theo từng đơn", ve: (s, { url }) => { const t = hdTien(s.hd); return `
    <div class="sl-luoi sl-l3">
      <div class="sl-the sl-chiso sl-tien"><small>Đang giữ</small><b>${d(t.nh + 12780000)}</b><span>cọc của 2 đơn</span></div>
      <div class="sl-the sl-chiso"><small>Đã chuyển cho người bán tháng này</small><b>${d((s.hd.buoc >= 13 && !s.hd.huy ? tinhTien(s.hd).cocNB : 0) + 10080000)}</b></div>
      <div class="sl-the sl-chiso"><small>Hoàn về bạn tháng này</small><b>${d(s.hd.buoc >= 14 || s.hd.hoanXn ? tinhTien(s.hd).hoanMua : 0)}</b><span>${s.hd.buoc === 13 && !s.hd.hoanXn ? `${so(tinhTien(s.hd).hoanMua)} đ đã gửi lệnh, chờ về` : ""}</span></div>
    </div>
    ${the("Theo đơn", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Đơn</th><th>Khoản</th><th class="sl-so">Số tiền</th><th>Trạng thái</th></tr></thead><tbody>
      <tr><td><a href="${url("chi-tiet-don")}">HĐ-0018</a></td><td>Cọc</td><td class="sl-so">${d(COC)}</td><td>${s.hd.buoc < 4 ? `<span class="sl-nhan">Chưa chuyển</span>` : s.hd.buoc === 4 ? `<span class="sl-nhan sl-n-nh">Đã chuyển · chờ ngân hàng xác nhận</span>` : s.hd.buoc < 13 ? `<span class="sl-nhan sl-n-tien">Ngân hàng đang giữ</span>` : `<span class="sl-nhan sl-n-xong">Đã xử lý</span>`}</td></tr>
      <tr><td>HĐ-0018</td><td>Phí giới thiệu</td><td class="sl-so">${d(PHI)}</td><td>${s.hd.buoc >= 4 ? `<span class="sl-nhan sl-n-xong">Đã trả · không hoàn</span>` : `<span class="sl-nhan">Chưa</span>`}</td></tr>
      <tr><td>HĐ-0018</td><td>Hoàn cọc dư</td><td class="sl-so">${d(tinhTien(s.hd).hoanMua)}</td><td>${s.hd.buoc < 13 ? `<span class="sl-nhan">Chưa tới bước</span>` : s.hd.buoc === 13 ? `<span class="sl-nhan sl-n-nh">Đã gửi lệnh · chưa về</span>` : `<span class="sl-nhan sl-n-xong">Đã về</span>`}</td></tr>
      <tr><td>HĐ-0021</td><td>Cọc</td><td class="sl-so">${d(12780000)}</td><td><span class="sl-nhan sl-n-nh">Đã chuyển · chờ ngân hàng xác nhận</span></td></tr>
    </tbody></table></div>`)}`; } },
  "cong-no": { tieuDe: "Công nợ", phu: "Theo người bán · chỉ tính khoản đã tới hạn hoặc đã chốt", phai: () => `<button class="sl-nut sl-vien" type="button">${icon("tai")}Xuất Excel</button>`, ve: (s) => `
    ${loc(["Theo người bán", "Theo đơn"])}
    ${the("Theo người bán", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Người bán</th><th class="sl-so">Bạn còn phải trả</th><th class="sl-so">Người bán phải hoàn</th><th>Ghi chú</th></tr></thead><tbody>
      <tr><td>Chị Năm</td><td class="sl-so">${d(s.hd.nbXn >= TRA_THANG || s.hd.buoc < 5 ? 0 : TRA_THANG - s.hd.nbXn)}</td><td class="sl-so">0 đ</td><td>${s.hd.buoc < 5 ? "Chưa tới hạn trả thẳng" : s.hd.nbXn >= TRA_THANG ? "Đã đủ" : "Hạn 5:30 ngày 28/10"}</td></tr>
      <tr><td>Chị Mười</td><td class="sl-so">0 đ</td><td class="sl-so">0 đ</td><td><span class="sl-nhan sl-n-tien">Lệch 12.200.000 đ · đang đối soát</span></td></tr>
      <tr><td>Chị Bảy Hồng</td><td class="sl-so">0 đ</td><td class="sl-so">3.100.000 đ</td><td>Trả lại 700 kg · chị Bảy đã báo hoàn, bạn chưa xác nhận</td></tr>
    </tbody></table></div>`)}
    ${bao("\"Chưa nhận\" có ba trường hợp: chưa tới hạn (vẫn chờ) · lệch (cần đối soát) · quá hạn (mới là vi phạm).", "sl-bao-nh")}`, sau: ganLoc },
  "ghi-thanh-toan": { tieuDe: "Chuyển tiền đơn", phu: "Ghi khoản đã trả thẳng cho người bán", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="max-width:960px">
      <section class="sl-the" style="display:grid;gap:12px">
        <label class="sl-o"><span>Đơn</span><select><option>HĐ-0018 · chị Năm · còn ${d(Math.max(0, TRA_THANG - s.hd.daTra))}</option></select></label>
        <label class="sl-o"><span>Số tiền đã chuyển</span><input value="${so(Math.max(0, TRA_THANG - s.hd.daTra))}"></label>
        <label class="sl-o"><span>Mã giao dịch ngân hàng</span><input placeholder="VD: FT2630012345"></label>
        <div class="sl-the sl-the-lot">${dong("Chỉ chuyển vào", "Agribank •••• 2186 · Nguyễn Thị Năm")}${dong("Nội dung", "HD0018")}</div>
        <a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Ghi đã trả</a>
        <p class="sl-ghi">Tiền chỉ tính là đã trả khi chị Năm xác nhận đúng số. Không có đường nào "coi như đã nhận".</p>
      </section>
      ${the("Các khoản đã ghi", s.hd.daTra ? dong(`HĐ-0018 · ${d(s.hd.daTra)}`, s.hd.nbXn >= s.hd.daTra ? `<span class="sl-nhan sl-n-xong">Người bán đã xác nhận</span>` : `<span class="sl-nhan">Chờ người bán xác nhận</span>`) : `<div class="sl-rong"><b>Chưa ghi khoản nào</b><span>Khoản bạn ghi sẽ hiện ở đây cùng trạng thái xác nhận.</span></div>`)}
    </div>` },

  // Kho
  "nhap-kho": { tieuDe: "Nhập kho", phu: "Từ đơn đã nghiệm thu", ve: (s) => `
    ${s.hd.buoc < 11 ? `<div class="sl-the"><div class="sl-rong"><b>Chưa có đơn chờ nhập</b><span>HĐ-0018 sẽ hiện ở đây sau khi bạn gửi kết quả nghiệm thu.</span></div></div>` : the("HĐ-0018 · Xoài cát Chu", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Loại</th><th class="sl-so">Lượng</th><th>Vị trí kho</th><th>Hạn dùng</th></tr></thead><tbody><tr><td>Loại 1</td><td class="sl-so">1.850 kg</td><td><select style="font:inherit;padding:6px;border-radius:8px;background:var(--giay-lot);border:1px solid var(--ke-dam)"><option>Kho mát A2</option></select></td><td>04/11</td></tr><tr><td>Hạ cấp</td><td class="sl-so">120 kg</td><td><select style="font:inherit;padding:6px;border-radius:8px;background:var(--giay-lot);border:1px solid var(--ke-dam)"><option>Kho chờ sấy B1</option></select></td><td>30/10</td></tr></tbody></table></div><div class="sl-hang-nut" style="justify-content:flex-end;margin-top:12px"><button class="sl-nut sl-vang" type="button">Nhập kho</button></div>`)}` },
  "ton-kho": { tieuDe: "Tồn kho", phu: "Cập nhật 27/10 · 8:00", ve: (s, { url }) => the("Theo mặt hàng", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Lô kho</th><th>Mặt hàng</th><th>Loại</th><th class="sl-so">Lượng</th><th>Ngày nhập</th><th>Hạn dùng</th><th></th></tr></thead><tbody>
    ${[["K-1027-01", "Xoài cát Chu", "Loại 1", 1850, "28/10", "04/11", ""], ["K-1022-03", "Bưởi da xanh", "Loại 1", 640, "22/10", "12/11", ""], ["K-1019-02", "Xoài cát Chu", "Hạ cấp", 85, "19/10", "29/10", "Sắp hết hạn"]].map((r) => `<tr><td><a href="${url("truy-xuat")}">${r[0]}</a></td><td>${r[1]}</td><td>${r[2]}</td><td class="sl-so">${kg(r[3])}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6] ? `<span class="sl-nhan sl-n-ban">${r[6]}</span>` : ""}</td></tr>`).join("")}
  </tbody></table></div>`) },
  "truy-xuat": { tieuDe: "Truy xuất lô K-1027-01", thuoc: "ton-kho", lui: "ton-kho", ve: () => `
    <div class="sl-luoi sl-chinh-phu">
      ${the("Đường đi của lô", `<ol class="sl-buoc">${[["Lô kho K-1027-01", "1.850 kg xoài cát Chu loại 1 · kho mát A2"], ["Đơn HĐ-0018", "Nghiệm thu 28/10 · 9:40–10:55"], ["Người bán: chị Năm", "Đã xác minh · Mỹ Xương, Cao Lãnh"], ["Lô vườn L-0412", "Hái 27/10 · mẫu đối chứng M-2291"], ["Nhật ký vườn", "Phun 12/10, hết cách ly 22/10 · bón kali 05/10"]].map(([a, b]) => `<li class="sl-b-xong"><span class="sl-b-vong">${icon("tich")}</span><div><b>${a}</b><span class="sl-ghi">${b}</span></div></li>`).join("")}</ol>`)}
      <section class="sl-the" style="display:grid;gap:12px;justify-items:center;text-align:center"><div class="sl-qr" style="width:160px" role="img" aria-label="Mã QR truy xuất"></div><b>Mã truy xuất K-1027-01</b><span class="sl-ghi">Dán lên bao thành phẩm. Khách quét xem được vùng trồng và ngày hái, không thấy giá.</span><button class="sl-nut sl-vien" type="button">${icon("tai")}Tải mã QR</button></section>
    </div>` },

  // Nhà cung cấp
  "moi-quen": { tieuDe: "Mối quen", phu: "Người bán bạn đã mua · phí mối quen theo gói", ve: (s, { url }) => the("Danh sách mối", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Người bán</th><th>Mặt hàng</th><th>Đơn gần nhất</th><th class="sl-so">Số đơn</th><th>Điểm</th><th>Phí mối quen</th></tr></thead><tbody>
    ${[["Chị Năm", "Xoài cát Chu", "HĐ-0018 · 28/10", 6, 4.8], ["Anh Sáu", "Bưởi da xanh", "HĐ-0015 · 22/10", 4, 4.9], ["HTX Tân Thuận", "Thanh long", "HĐ-0021 · 31/10", 3, 4.7], ["Chị Mười", "Xoài cát Chu", "HĐ-0012 · 19/10", 2, 4.2]].map((r) => `<tr><td><a href="${url("cham-diem")}">${r[0]}</a></td><td>${r[1]}</td><td>${r[2]}</td><td class="sl-so">${r[3]}</td><td>${sao(r[4])}</td><td>${s.goi === "bus" ? "0%" : "0,3%"}</td></tr>`).join("")}
  </tbody></table></div>`, `<a href="${url("nhap-excel")}">Nhập từ Excel</a>`) },
  "nhap-excel": { tieuDe: "Nhập mối quen từ Excel", thuoc: "moi-quen", lui: "moi-quen", ve: () => `
    <div class="sl-luoi sl-l2">
      <section class="sl-the" style="display:grid;gap:12px"><div class="sl-the sl-the-lot" style="text-align:center;padding:28px;border:1.5px dashed var(--ke-dam)"><b>nha-cung-cap-2026.xlsx</b><div class="sl-ghi">42 dòng · đã đọc</div></div>
        ${dong("Cột A → Tên người bán", `<span class="sl-nhan sl-n-xong">Khớp</span>`) + dong("Cột B → Số điện thoại", `<span class="sl-nhan sl-n-xong">Khớp</span>`) + dong("Cột C → Mặt hàng", `<span class="sl-nhan sl-n-xong">Khớp</span>`) + dong("Cột D → Tỉnh", `<span class="sl-nhan sl-n-tien">Chọn cột</span>`)}</section>
      ${the("Xem trước", dong("Sẽ mời tham gia AgiViet", "31 người") + dong("Đã có trên AgiViet, thêm vào mối quen", "9 người") + dong("Thiếu số điện thoại, bỏ qua", "2 dòng") + `<div class="sl-hang-nut" style="margin-top:12px"><button class="sl-nut sl-vang" type="button">Nhập 40 người</button></div><p class="sl-ghi" style="margin-top:8px">Người được mời nhận tin nhắn từ AgiViet, không thấy danh sách của bạn.</p>`)}
    </div>` },
  "cham-diem": { tieuDe: "Chấm điểm nhà cung cấp", thuoc: "moi-quen", lui: "moi-quen", phu: "Tính từ đơn trên AgiViet và đơn bạn ghi ngoài app", ve: () => the("6 tháng gần nhất", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Người bán</th><th style="min-width:140px">Giao đủ</th><th style="min-width:140px">Đúng loại</th><th style="min-width:140px">Đúng hẹn</th><th class="sl-so">Đơn</th></tr></thead><tbody>
    ${[["Chị Năm", 97, 94, 100, 6], ["Anh Sáu", 100, 96, 100, 4], ["HTX Tân Thuận", 95, 90, 92, 3], ["Chị Mười", 88, 85, 80, 2]].map((r) => `<tr><td>${r[0]}</td>${[1, 2, 3].map((i) => `<td><div style="display:flex;gap:8px;align-items:center"><div class="sl-thanh" style="flex:1"><i style="width:${r[i]}%"></i></div><span class="sl-so">${r[i]}%</span></div></td>`).join("")}<td class="sl-so">${r[4]}</td></tr>`).join("")}
  </tbody></table></div>`) },
  "ghi-don-ngoai": { tieuDe: "Ghi đơn ngoài app", phu: "Để công nợ, kho và bảng kê thuế đủ dòng", ve: () => `
    <section class="sl-the" style="max-width:720px;display:grid;gap:14px">
      <div class="sl-luoi sl-l2"><label class="sl-o"><span>Người bán</span><input value="Ông Tám (mua ở chợ đầu mối)"></label><label class="sl-o"><span>CCCD người bán (cho bảng kê)</span><input value="087•••••1234"></label>
      <label class="sl-o"><span>Mặt hàng</span><input value="Xoài cát Chu hạ cấp"></label><label class="sl-o"><span>Lượng (kg)</span><input value="400"></label>
      <label class="sl-o"><span>Đơn giá</span><input value="12.000 đ/kg"></label><label class="sl-o"><span>Ngày mua</span><input type="date" value="2026-10-25"></label></div>
      ${bao("Đơn ngoài app không có cọc ngân hàng giữ và không được AgiViet hỗ trợ tranh chấp.", "sl-bao-nh")}
      <div class="sl-hang-nut" style="justify-content:flex-end"><button class="sl-nut sl-vang" type="button">Lưu đơn</button></div>
    </section>` },

  // Kế hoạch
  "ke-hoach": { tieuDe: "Kế hoạch mua", phu: "Nguyên liệu tháng 11/2026", ve: (s, { url }) => `
    <div class="sl-luoi sl-l3">
      <div class="sl-the sl-chiso"><small>Cần cả tháng</small><b>24 tấn</b><span>xoài, thanh long, bưởi</span></div>
      <div class="sl-the sl-chiso"><small>Đã có nguồn</small><b>15,8 tấn</b><span>66% · đơn và hợp đồng khung</span></div>
      <div class="sl-the sl-chiso sl-gap"><small>Dự báo thiếu</small><b>8,2 tấn</b><span>xoài cát Chu tuần 3–4</span></div>
    </div>
    ${the("Theo tuần", `<div class="sl-cot">${[[6, 6], [6, 5.2], [6, 2.8], [6, 1.8]].map(([c, co], i) => `<div><div style="display:flex;gap:4px;align-items:flex-end;height:100%;justify-content:center"><i style="height:${co / 6 * 100}%"></i><i class="sl-du-bao" style="height:100%"></i></div><small>Tuần ${i + 1}</small></div>`).join("")}</div><div class="sl-hang-nut" style="margin-top:12px"><span class="sl-nhan sl-n-xong">Đã có nguồn</span><span class="sl-nhan">Cần</span></div>`)}
    ${bao(`Thiếu 8,2 tấn xoài cát Chu tuần 3–4. <a href="${url("tao-nhu-cau")}" style="font-weight:700">Tạo phiếu nhu cầu</a> hoặc đặt trước khi hái với mối quen.`, "sl-bao-tien")}` },

  // Thuế và báo cáo
  "bang-ke": { tieuDe: "Bảng kê mua hàng nông sản", phu: "Mẫu 01/TNDN · tháng 10/2026 · tự lập từ đơn", phai: () => `<button class="sl-nut sl-vien" type="button">${icon("tai")}Tải Excel</button><button class="sl-nut sl-vang" type="button">${icon("tai")}Tải bảng kê PDF</button>`, ve: (s) => the("Bảng kê", `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>STT</th><th>Ngày</th><th>Người bán</th><th>Địa chỉ</th><th>Hàng</th><th class="sl-so">Lượng</th><th class="sl-so">Đơn giá</th><th class="sl-so">Thành tiền</th></tr></thead><tbody>
    ${[["22/10", "Lê Văn Sáu", "Mỏ Cày Bắc, Bến Tre", "Bưởi da xanh", "1.200 kg", "28.000", 33600000], ["25/10", "Ông Tám (ngoài app)", "Cao Lãnh, Đồng Tháp", "Xoài hạ cấp", "400 kg", "12.000", 4800000], ...(s.hd.buoc >= 14 ? [["28/10", "Nguyễn Thị Năm", "Mỹ Xương, Cao Lãnh", "Xoài cát Chu", "1.970 kg", "23.000/15.000", NGHIEM_THU]] : [])].map((r, i) => `<tr><td>${i + 1}</td>${r.slice(0, 6).map((c, j) => `<td class="${j >= 4 ? "sl-so" : ""}">${c}</td>`).join("")}<td class="sl-so">${d(r[6])}</td></tr>`).join("")}
  </tbody></table></div>${s.hd.buoc < 14 ? `<p class="sl-ghi" style="margin-top:8px">HĐ-0018 sẽ vào bảng kê khi đơn hoàn tất.</p>` : ""}`) },
  "bao-cao": { tieuDe: "Báo cáo", phu: "Quý 4/2026", ve: () => `
    <div class="sl-luoi sl-l4">${[["Khối lượng mua", "38,4 tấn"], ["Chi cho hàng", "1,06 tỷ đ"], ["Giá bình quân xoài", "22.900 đ/kg"], ["Đơn đúng hẹn", "92%"]].map(([a, b]) => `<div class="sl-the sl-chiso"><small>${a}</small><b>${b}</b></div>`).join("")}</div>
    <div class="sl-luoi sl-l2">${the("Khối lượng theo mặt hàng (tấn)", `<div class="sl-cot">${[["Xoài", 18], ["Thanh long", 11], ["Bưởi", 6], ["Sầu riêng", 3.4]].map(([a, b]) => `<div><i style="height:${b / 18 * 100}%"></i><small>${a}</small></div>`).join("")}</div>`)}
    ${the("Theo vùng", dong("Đồng Tháp", "21,2 tấn") + dong("Tiền Giang", "11,4 tấn") + dong("Bến Tre", "5,8 tấn"))}</div>` },

  // Dịch vụ
  "dich-vu": { tieuDe: "Kiểm định, xe, kho", phu: "Đối tác dịch vụ của AgiViet", phai: () => `<a class="sl-nut sl-vang" href="?man=yeu-cau-dich-vu">${icon("them")}Yêu cầu dịch vụ</a>`, ve: () => `
    ${the("Yêu cầu đang có", dong("Kiểm dư lượng thuốc · HĐ-0021", `<span class="sl-nhan sl-n-nh">Phòng kiểm nghiệm nhận mẫu 30/10</span>`) + dong("Xe lạnh 5 tấn · 31/10", `<span class="sl-nhan sl-n-xong">Đã đặt</span>`))}
    <div class="sl-luoi sl-l3">${[["khien", "Kiểm định chất lượng", "Lấy mẫu tại vườn hoặc kho, kết quả 24–48 giờ"], ["xe", "Xe chở hàng", "Xe thường, xe lạnh, ghép chuyến"], ["kho", "Kho lạnh", "Gửi theo ngày gần vùng trồng"]].map(([i, a, b]) => `<section class="sl-the" style="display:grid;gap:8px">${icon(i).replace("<svg", '<svg style="width:28px;height:28px;stroke:var(--la);fill:none;stroke-width:1.8"')}<b>${a}</b><span class="sl-ghi">${b}</span></section>`).join("")}</div>` },
  "yeu-cau-dich-vu": { tieuDe: "Yêu cầu dịch vụ", thuoc: "dich-vu", lui: "dich-vu", ve: () => `
    <div class="sl-luoi sl-chinh-phu"><section class="sl-the" style="display:grid;gap:12px">
      <label class="sl-o"><span>Dịch vụ</span><select><option>Kiểm định trước khi bốc</option><option>Xe chở hàng</option><option>Kho lạnh</option></select></label>
      <label class="sl-o"><span>Cho đơn</span><select><option>HĐ-0018 · xoài · tại vườn Mỹ Xương</option></select></label>
      <label class="sl-o"><span>Ngày giờ</span><input type="datetime-local" value="2026-10-28T05:00"></label>
      <div class="sl-hang-nut" style="justify-content:flex-end"><button class="sl-nut sl-vang" type="button">Đặt lịch</button></div></section>
      ${the("Báo giá đối tác", dong("Trung tâm kiểm định Cần Thơ", "850.000 đ · 24 giờ") + dong("Vinacontrol Đồng Tháp", "1.100.000 đ · 12 giờ"))}</div>` },

  // Tổ chức
  "thanh-vien": { tieuDe: "Thành viên và phân quyền", phu: "Gói Miễn phí: 1 người dùng", ve: (s, { url }) => `
    ${the("Người dùng", dong(`<b style="color:var(--muc)">Lê Thu Hà</b><div class="sl-ghi">thuha@dongxanh.vn</div>`, `<span class="sl-nhan sl-n-xong">Chủ tài khoản · làm mọi việc</span>`))}
    ${s.goi === "bus" ? the("Mời thêm", `<div class="sl-luoi sl-l2"><label class="sl-o"><span>Email</span><input placeholder="ketoan@dongxanh.vn"></label><label class="sl-o"><span>Vai trò</span><select><option>Kế toán · xem tiền, xuất bảng kê</option><option>Kho · ký nhận, nghiệm thu</option></select></label></div><div class="sl-hang-nut" style="margin-top:12px"><button class="sl-nut sl-vang" type="button">Gửi lời mời</button></div>`) : bao(`Phân quyền nhiều người (kế toán, kho, duyệt chi) có ở gói Doanh nghiệp. <a href="${url("so-sanh-goi")}" style="font-weight:700">So sánh gói</a>`, "sl-bao-nh")}` },
  "goi-cua-toi": { tieuDe: "Gói và thanh toán", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2">${the("Gói hiện tại", dong("Gói", s.goi === "bus" ? "Business" : "Miễn phí") + dong("Phí giới thiệu đơn đầu", "0,3% giá trị") + dong("Phí mối quen", s.goi === "bus" ? "0%" : "0,3%") + `<div class="sl-hang-nut" style="margin-top:12px"><a class="sl-nut sl-vien" href="${url("so-sanh-goi")}">So sánh gói</a>${s.goi === "bus" ? "" : `<a class="sl-nut sl-vang" href="${url("nang-cap")}">Nâng cấp</a>`}</div>`)}
    ${the("Hóa đơn", s.goi === "bus" ? dong("27/10 · Business tháng 11", "990.000 đ") : `<div class="sl-rong"><b>Chưa có hóa đơn</b><span>Gói Miễn phí không có phí tháng. Phí giới thiệu xuất hóa đơn theo từng đơn.</span></div>`)}</div>` },
  "so-sanh-goi": { tieuDe: "So sánh gói", thuoc: "goi-cua-toi", lui: "goi-cua-toi", ve: (s, { url }) => veGoi(url, false) },
  "nang-cap": { tieuDe: "Nâng cấp lên Business", thuoc: "goi-cua-toi", lui: "so-sanh-goi", ve: (s, { url }) => `
    <div class="sl-luoi sl-l2" style="max-width:960px"><section class="sl-the" style="display:grid;gap:12px">
      <div class="sl-loc" role="radiogroup"><button type="button" aria-pressed="false">Theo tháng · 990.000 đ</button><button type="button" aria-pressed="true">Theo năm · 9.900.000 đ</button></div>
      <label class="sl-o"><span>Xuất hóa đơn cho</span><input value="Công ty TNHH Nhà máy sấy Đồng Xanh · MST 1601 234 567"></label>
      <label class="sl-o"><span>Email nhận hóa đơn</span><input value="ketoan@dongxanh.vn"></label>
      <button class="sl-nut sl-vang" type="button" id="nang">Thanh toán 9.900.000 đ</button></section>
      ${the("Thay đổi khi nâng cấp", dong("Phí mối quen", "0,3% → 0%") + dong("Người dùng", "1 → 5") + dong("Đơn đang chạy", "Giữ phí đã lưu trong hợp đồng"))}</div>`, sau: (g, k, { url }) => { ganLoc(g); g.querySelector("#nang").addEventListener("click", () => { doi((s) => { s.goi = "bus"; }); location.search = url("nang-cap-xong"); }); } },
  "nang-cap-xong": { tieuDe: "Đã nâng cấp", thuoc: "goi-cua-toi", ve: (s, { url }) => `
    <section class="sl-viec sl-xong" style="max-width:720px"><div><h2>Đồng Xanh đang dùng gói Business</h2><p>Hiệu lực tới 27/10/2027. Hóa đơn gửi về ketoan@dongxanh.vn trong 24 giờ.</p></div><div class="sl-hang-nut"><a class="sl-nut sl-vang" href="${url("thanh-vien")}">${icon("them_nguoi")}Mời thành viên</a></div></section>` },
  "ho-so-to-chuc": { tieuDe: "Hồ sơ tổ chức", ve: () => `
    <div class="sl-luoi sl-l2">${the("Doanh nghiệp", dong("Tên", "Công ty TNHH Nhà máy sấy Đồng Xanh") + dong("Mã số thuế", "1601 234 567") + dong("Loại hình", "Chế biến") + dong("Kho nhận hàng", "KCN Sa Đéc, Đồng Tháp") + dong("Người phụ trách", "Lê Thu Hà"))}
    ${the("Giấy tờ xác minh", dong("Giấy phép kinh doanh", `<span class="sl-nhan sl-n-xong">Đã xác minh 15/10</span>`) + dong("Tài khoản ngân hàng công ty", `<span class="sl-nhan sl-n-xong">VietinBank •••• 0277 · đúng tên</span>`) + dong("Giấy chứng nhận ATTP", `<span class="sl-nhan">Chưa tải</span>`))}</div>` },
  "uy-tin": { tieuDe: "Uy tín của tổ chức", phu: "Người bán thấy trước khi nhận lời chào của bạn", ve: () => `
    <div class="sl-luoi sl-l3">${[["Trả đúng hạn", "98%"], ["Đơn đã xong", "15"], ["Nhận xét của người bán", "4,7★"]].map(([a, b]) => `<div class="sl-the sl-chiso"><small>${a}</small><b>${b}</b></div>`).join("")}</div>
    ${the("Người bán nói gì", [["Chị Năm", "Trả tiền đúng giờ, xe tới đúng hẹn."], ["Anh Sáu", "Nghiệm thu nhanh, rõ ràng."], ["Chị Mười", "Có lệch tiền một lần, đã đối soát xong."]].map(([a, b]) => dong(`<b style="color:var(--muc)">${a}</b><div class="sl-ghi">${b}</div>`, "")).join(""))}` },
};

function veBangChao(s, url, coNut) {
  return `<div class="sl-bang-boc"><table class="sl-bang"><thead><tr><th>Người bán</th><th class="sl-so">Giá vườn</th><th>Giao</th><th class="sl-so">Giá tại kho</th><th>Ngày</th><th>Uy tín</th>${coNut ? "<th></th>" : ""}</tr></thead><tbody>
  ${CHAO.map((c) => `<tr class="${s.chao.chon === c.nguoi ? "sl-chon" : ""}"><td><b>${esc(c.nguoi)}</b><div class="sl-ghi">${esc(c.lo)} · ${kg(c.luong)} · hạ cấp ${so(c.ha)}</div></td><td class="sl-so">${so(c.gia)} đ</td><td>${esc(c.giao)}</td><td class="sl-so"><b>${so(c.gia + c.phiXe)} đ</b>${c.phiXe ? `<div class="sl-ghi">xe ~${so(c.phiXe)} đ/kg</div>` : ""}</td><td>${c.ngay}</td><td>${sao(c.uy)}</td>${coNut ? `<td>${s.chao.chon === c.nguoi ? `<a class="sl-nut sl-vang" href="${url("chi-tiet-don")}">Mở HĐ-0018</a>` : s.chao.chon ? "" : `<button class="sl-nut ${c.nguoi === "Chị Năm" ? "sl-vang" : "sl-vien"}" type="button" data-chon="${esc(c.nguoi)}">Đồng ý</button>`}</td>` : ""}</tr>`).join("")}
  </tbody></table></div>`;
}
function veGoi(url, batDau) {
  const g = [["Miễn phí", "0 đ/tháng", ["Phí giới thiệu 0,3% đơn đầu với mỗi người bán", "Phí mối quen 0,3%", "1 người dùng", "Bảng kê thuế, công nợ, kho"], "free"], ["Business", "990.000 đ/tháng", ["Phí giới thiệu 0,3% đơn đầu", "Phí mối quen 0%", "5 người dùng, phân quyền", "Kế hoạch mua, chấm điểm nhà cung cấp, xuất Excel"], "bus"]];
  return `<div class="sl-luoi sl-l2" style="max-width:960px">${g.map(([t, p, ds, ma]) => `<section class="sl-the" style="display:grid;gap:12px;${ma === "bus" ? "box-shadow:0 0 0 2px var(--la)" : ""}"><h2 style="font-size:var(--c4)">${t}</h2><b style="font-size:var(--c5)" class="sl-so">${p}</b><ul style="margin:0;padding-left:18px;display:grid;gap:6px">${ds.map((x) => `<li>${x}</li>`).join("")}</ul><a class="sl-nut ${ma === "bus" ? "sl-vang" : "sl-vien"}" href="${url(batDau ? "tong-quan" : ma === "bus" ? "nang-cap" : "goi-cua-toi")}">${batDau ? `Bắt đầu với ${t}` : ma === "bus" ? "Nâng cấp" : "Giữ gói này"}</a></section>`).join("")}</div>
  <p class="sl-ghi">Phí tính theo giá trị đơn, lưu vào hợp đồng lúc ký. Gói nào cũng có cọc ngân hàng giữ và hỗ trợ tranh chấp.</p>`;
}

const MENU = [
  { muc: [{ ma: "tong-quan", ten: "Tổng quan", icon: "nha", dem: viecCan }] },
  { nhom: "Mua", muc: [{ ma: "nguon-hang", ten: "Nguồn hàng", icon: "la" }, { ma: "nhu-cau", ten: "Nhu cầu", icon: "phieu" }, { ma: "bao-gia", ten: "Báo giá", icon: "can", dem: () => 4 }, { ma: "tin-nhan", ten: "Tin nhắn", icon: "tin" }] },
  { nhom: "Đơn", muc: [{ ma: "don-hang", ten: "Đơn và lịch", icon: "don" }, { ma: "vi-dam-bao", ten: "Tài khoản đảm bảo", icon: "tien" }, { ma: "cong-no", ten: "Công nợ", icon: "ghep" }, { ma: "ghi-thanh-toan", ten: "Chuyển tiền đơn", icon: "tien" }] },
  { nhom: "Kho và nguồn", muc: [{ ma: "nhap-kho", ten: "Nhập kho", icon: "kho" }, { ma: "ton-kho", ten: "Tồn kho", icon: "hop" }, { ma: "moi-quen", ten: "Mối quen", icon: "nguoi" }, { ma: "ghi-don-ngoai", ten: "Đơn ngoài app", icon: "phieu" }, { ma: "ke-hoach", ten: "Kế hoạch mua", icon: "lich" }] },
  { nhom: "Sổ sách", muc: [{ ma: "bang-ke", ten: "Bảng kê thuế", icon: "phieu" }, { ma: "bao-cao", ten: "Báo cáo", icon: "bieu" }, { ma: "dich-vu", ten: "Kiểm định, xe, kho", icon: "xe" }] },
  { nhom: "Tổ chức", muc: [{ ma: "ho-so-to-chuc", ten: "Hồ sơ tổ chức", icon: "toa" }, { ma: "uy-tin", ten: "Uy tín", icon: "sao" }, { ma: "thanh-vien", ten: "Thành viên", icon: "them_nguoi" }, { ma: "goi-cua-toi", ten: "Gói", icon: "cai" }] },
];
const TAB = [
  { ma: "tong-quan", ten: "Hôm nay", icon: "nha", dem: viecCan },
  { ma: "nguon-hang", ten: "Nguồn hàng", icon: "la", gom: ["nhu-cau", "bao-gia"] },
  { ma: "don-hang", ten: "Đơn", icon: "don" },
  { ma: "vi-dam-bao", ten: "Tiền", icon: "tien", gom: ["cong-no", "ghi-thanh-toan"] },
  { ma: "tin-nhan", ten: "Tin nhắn", icon: "tin" },
];
chayApp({ ten: "AgiViet Mua", phu: "Nhà máy sấy Đồng Xanh", menu: MENU, tab: TAB, man, kho, macDinh: "tong-quan", nguoi: { viet: "TH", ten: "Lê Thu Hà", vai: "Phụ trách mua" } });
export { man as MAN_MUA };
