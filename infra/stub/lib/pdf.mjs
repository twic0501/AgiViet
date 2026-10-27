// Sinh PDF hợp đồng GIẢ LẬP bằng pdfkit, nhúng phông Liberation Sans (có dấu tiếng Việt).
// Mục đích: chi phí CPU gần với việc sinh PDF thật (nhúng phông con, bảng điều khoản, nhiều trang),
// KHÔNG phải mẫu hợp đồng thật (mẫu thật theo docs/nghiep-vu/07-tai-lieu-pdf.md).
import PDFDocument from 'pdfkit';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONT_CANDIDATES = [
  process.env.PDF_FONT,
  '/usr/share/fonts/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  join(here, '..', 'fonts', 'LiberationSans-Regular.ttf'),
].filter(Boolean);
const fontPath = FONT_CANDIDATES.find((p) => existsSync(p));
const fontBuf = fontPath ? readFileSync(fontPath) : null;

const vnd = (n) => Number(n).toLocaleString('vi-VN') + ' đ';

export function renderContract(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Hợp đồng ${order.code}` } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      resolve({ buf, sha256: createHash('sha256').update(buf).digest() });
    });
    if (fontBuf) doc.registerFont('vn', fontBuf), doc.font('vn');

    doc.fontSize(9).fillColor('#b00').text('DỮ LIỆU THỬ · KHÔNG CÓ GIÁ TRỊ PHÁP LÝ', { align: 'right' });
    doc.fillColor('#000').fontSize(16).text('HỢP ĐỒNG MUA BÁN NÔNG SẢN (CÓ CỌC)', { align: 'center' });
    doc.fontSize(10).text(`Số: ${order.code} · Phiên bản 1`, { align: 'center' }).moveDown();
    doc.fontSize(11).text(`Bên bán: ${order.seller_name}`);
    doc.text(`Bên mua: ${order.buyer_name}`).moveDown(0.5);
    const rows = [
      ['Mặt hàng', order.commodity_name], ['Loại', `Loại ${order.grade}`],
      ['Khối lượng', `${(order.qty_g / 1000).toLocaleString('vi-VN')} kg`],
      ['Đơn giá', vnd(order.unit_price_vnd_per_kg) + '/kg'],
      ['Giá trị hợp đồng', vnd(Math.round(order.qty_g / 1000 * order.unit_price_vnd_per_kg))],
      ['Tiền cọc (30%)', vnd(order.deposit_vnd)], ['Phí giới thiệu (bên mua trả)', vnd(order.fee_vnd)],
      ['Điểm nghiệm thu', 'Tại vườn trước khi bốc (trùng điểm chuyển rủi ro)'],
      ['Hao hụt đường cho phép', '2% với chuyến dưới 24 giờ'],
      ['Hạn khiếu nại khác mẫu', '2 giờ từ khi người được chỉ định ký nhận'],
      ['Thang phạt thiếu lượng', '0% / 10% / 50% / 100% cọc phần thiếu'],
      ['Ngân hàng giữ cọc', 'Ngân hàng đối tác (mô phỏng)'],
    ];
    let y = doc.y + 4;
    for (const [k, v] of rows) {
      doc.rect(50, y, 495, 20).stroke('#999');
      doc.text(k, 56, y + 5, { width: 190 }).text(String(v), 250, y + 5, { width: 290 });
      y += 20;
    }
    doc.y = y + 10; doc.x = 50;
    const para = 'Hai bên đồng ý nghiệm thu ba phần: đạt theo giá đơn, hạ cấp theo giá hạ cấp đã ký, trả lại không tính tiền; phần trả lại quá 5% phải có ảnh. Cọc chỉ có hiệu lực khi ngân hàng đối tác xác nhận. Phần còn lại bên mua trả thẳng cho bên bán và bên bán xác nhận số tiền đã nhận. ';
    for (let i = 1; i <= 14; i++) doc.fontSize(10).text(`Điều ${i}. ${para.repeat(1 + (i % 3))}`, { align: 'justify' }).moveDown(0.4);
    doc.moveDown().text(`Mã xác minh tài liệu: ${order.code}-v1 · mã băm SHA-256 in ở trang xác minh`, { align: 'center' });
    doc.end();
  });
}
