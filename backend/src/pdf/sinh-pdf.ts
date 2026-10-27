// Sinh PDF từ dữ liệu có cấu trúc (07). pdf-lib + fontkit, font Liberation Sans (SIL OFL, đủ dấu tiếng Việt).
// Mỗi trang: dải "DỮ LIỆU THỬ · không có giá trị pháp lý", watermark chéo, chân trang có mã tài liệu, phiên bản,
// 16 ký tự đầu mã băm nội dung, số trang, QR xác minh (QR-06). PDF tất định: ngày tạo lấy từ nội dung.
import { PDFDocument, rgb, degrees, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { THU_MUC_BACKEND } from '../cau-hinh.ts';

const fontThuong = readFileSync(join(THU_MUC_BACKEND, 'assets', 'fonts', 'LiberationSans-Regular.ttf'));
const fontDam = readFileSync(join(THU_MUC_BACKEND, 'assets', 'fonts', 'LiberationSans-Bold.ttf'));

export interface MucPdf { tieuDe: string; dong?: [string, string][]; doan?: string[]; bang?: { cot: string[]; hang: string[][] } }
export interface ChuKyPdf { ben: string; ten: string; vai: string; phuongThuc: string; luc: string; maBam16: string }
export interface NoiDungPdf {
  loai: string; // HD, BBNT, BQT, ...
  tieuDe: string;
  maTaiLieu: string;
  phienBan: number;
  sinhLuc: string; // ISO
  maBamNoiDung: string; // hex
  urlXacMinh: string;
  muc: MucPdf[];
  chuKy?: ChuKyPdf[];
  ghiChuCuoi?: string[];
}

const A4: [number, number] = [595.28, 841.89];
const LE = 48;

function ngatDong(text: string, font: PDFFont, co: number, rong: number): string[] {
  const out: string[] = [];
  for (const doan of String(text).split('\n')) {
    const tu = doan.split(/\s+/);
    let dong = '';
    for (const w of tu) {
      const thu = dong ? dong + ' ' + w : w;
      if (font.widthOfTextAtSize(thu, co) <= rong) dong = thu;
      else { if (dong) out.push(dong); dong = w; }
    }
    out.push(dong);
  }
  return out;
}

export async function sinhPdf(nd: NoiDungPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const f = await pdf.embedFont(fontThuong, { subset: true });
  const fb = await pdf.embedFont(fontDam, { subset: true });
  const ngay = new Date(nd.sinhLuc);
  pdf.setTitle(`${nd.tieuDe} ${nd.maTaiLieu} v${nd.phienBan}`);
  pdf.setAuthor('AgiViet (môi trường thử)');
  pdf.setProducer('agiviet-backend-v2');
  pdf.setCreator('agiviet-backend-v2');
  pdf.setCreationDate(ngay);
  pdf.setModificationDate(ngay);
  pdf.setSubject(`sha256-noi-dung:${nd.maBamNoiDung}`);
  const qrPng = await QRCode.toBuffer(nd.urlXacMinh, { margin: 0, width: 160, errorCorrectionLevel: 'M' });
  const qr = await pdf.embedPng(qrPng);

  const trang: PDFPage[] = [];
  let page!: PDFPage; let y = 0;
  const moTrang = () => {
    page = pdf.addPage(A4); trang.push(page);
    page.drawRectangle({ x: 0, y: A4[1] - 22, width: A4[0], height: 22, color: rgb(0.98, 0.85, 0.3) });
    page.drawText('DỮ LIỆU THỬ · không có giá trị pháp lý', { x: LE, y: A4[1] - 15, size: 10, font: fb, color: rgb(0.2, 0.15, 0) });
    page.drawText('DỮ LIỆU THỬ', { x: 120, y: 300, size: 72, font: fb, color: rgb(0.85, 0.85, 0.85), rotate: degrees(40), opacity: 0.35 });
    y = A4[1] - 50;
  };
  const can = (h: number) => { if (y - h < 90) moTrang(); };
  const viet = (text: string, o: { co?: number; dam?: boolean; thut?: number } = {}) => {
    const co = o.co ?? 10; const font = o.dam ? fb : f; const x = LE + (o.thut ?? 0);
    for (const d of ngatDong(text, font, co, A4[0] - x - LE)) { can(co + 4); page.drawText(d, { x, y, size: co, font }); y -= co + 4; }
  };

  moTrang();
  page.drawText('AgiViet', { x: LE, y, size: 18, font: fb, color: rgb(0.1, 0.4, 0.2) }); y -= 26;
  viet(nd.tieuDe, { co: 15, dam: true });
  viet(`Mã tài liệu: ${nd.maTaiLieu} · Phiên bản ${nd.phienBan} · Sinh lúc ${ngay.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ Việt Nam)`, { co: 9 });
  y -= 6;
  for (const m of nd.muc) {
    can(30); y -= 4; viet(m.tieuDe, { co: 11.5, dam: true }); y -= 2;
    for (const [nhan, gt] of m.dong ?? []) {
      const lines = ngatDong(gt, f, 10, A4[0] - LE * 2 - 170);
      can(14 * lines.length);
      page.drawText(nhan, { x: LE + 6, y, size: 10, font: fb });
      for (const l of lines) { page.drawText(l, { x: LE + 176, y, size: 10, font: f }); y -= 14; }
    }
    for (const p of m.doan ?? []) viet(p, { thut: 6 });
    if (m.bang) {
      const w = (A4[0] - LE * 2 - 6) / m.bang.cot.length;
      can(16); m.bang.cot.forEach((c, i) => page.drawText(c, { x: LE + 6 + i * w, y, size: 9.5, font: fb })); y -= 14;
      for (const h of m.bang.hang) { can(14); h.forEach((c, i) => page.drawText(String(c), { x: LE + 6 + i * w, y, size: 9.5, font: f })); y -= 13; }
    }
    y -= 4;
  }
  if (nd.chuKy?.length) {
    can(40); y -= 4; viet('Chữ ký', { co: 11.5, dam: true });
    for (const c of nd.chuKy) viet(`${c.ben}: ${c.ten} (${c.vai}) · ${c.phuongThuc} · ${c.luc} · mã băm đã ký ${c.maBam16}`, { thut: 6 });
  }
  for (const g of nd.ghiChuCuoi ?? []) { y -= 2; viet(g, { co: 9 }); }

  const tong = trang.length;
  trang.forEach((p, i) => {
    p.drawLine({ start: { x: LE, y: 80 }, end: { x: A4[0] - LE, y: 80 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
    p.drawImage(qr, { x: A4[0] - LE - 60, y: 14, width: 60, height: 60 });
    p.drawText(`${nd.maTaiLieu} · v${nd.phienBan} · SHA-256 nội dung ${nd.maBamNoiDung.slice(0, 16)}`, { x: LE, y: 60, size: 8.5, font: f });
    p.drawText(`Xác minh: ${nd.urlXacMinh}`, { x: LE, y: 46, size: 8, font: f, color: rgb(0.3, 0.3, 0.3) });
    p.drawText(`Trang ${i + 1}/${tong}`, { x: LE, y: 32, size: 8.5, font: f });
  });
  return pdf.save({ useObjectStreams: false });
}
