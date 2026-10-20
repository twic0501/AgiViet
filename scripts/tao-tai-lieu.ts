// Sinh tài liệu từ code: bảng trạng thái + bảng luật đơn (tầng nghiệp vụ) và danh mục màn (app mô phỏng).
// Chạy: npm run tai-lieu (Node ≥ 22.18 chạy thẳng TypeScript). Không sửa tay các tệp sinh ra.
import { writeFileSync } from 'node:fs';
import { CHANG, CHANG_CUA, CHINH_SACH_MAC_DINH, LUAT, NHAN_TRANG_THAI, TEN_BUOC, TRANG_THAI, KET_THUC } from '../packages/nghiep-vu/src/index.ts';
import { DANH_MUC_MAN } from '../apps/app-ban/src/danh-muc-man.ts';
import { CA_KIEM_THU_BAN } from '../packages/may-chu/src/ca-kiem-thu.ts';

const goc = new URL('../docs/', import.meta.url);
const DAU = '<!-- Tệp sinh tự động bằng `npm run tai-lieu`. Đừng sửa tay. -->\n\n';
const TEN_VAI: Record<string, string> = { ban: 'Người bán', mua: 'Bên mua', he_thong: 'Hệ thống' };

/* ---- Bảng luật đơn ---- */
const aiLam = (b: (typeof TEN_BUOC)[number]) => {
  const ai = LUAT[b].ai;
  return typeof ai === 'function' ? 'Bên không xin hủy' : ai.map(v => TEN_VAI[v]).join(', ');
};
let luat = `${DAU}# Bảng trạng thái và bảng luật đơn

Nguồn: \`packages/nghiep-vu/src/don/\`. Mọi thay đổi trạng thái đơn đều đi qua bảng luật này; bước không có trong bảng thì không làm được.

## Trạng thái (${TRANG_THAI.length})

| Mã | Nhãn | Chặng | Loại |
|---|---|---|---|
${TRANG_THAI.map(t => `| \`${t}\` | ${NHAN_TRANG_THAI[t]} | ${CHANG_CUA[t] === undefined ? 'giữ chặng lúc hủy' : CHANG_CUA[t] === 6 ? 'đã xong' : `${CHANG_CUA[t]! + 1}. ${CHANG[CHANG_CUA[t]!]}`} | ${t === 'da_nhan_tien' ? 'Đóng, thành công' : KET_THUC.includes(t) ? 'Đóng, không thành' : 'Đang chạy'} |`).join('\n')}

## Các bước (${TEN_BUOC.length})

| Bước | Việc | Ai làm | Từ trạng thái | Sang trạng thái | Việc phụ |
|---|---|---|---|---|---|
${TEN_BUOC.map(b => { const L = LUAT[b]; return `| \`${b}\` | ${L.ten} | ${aiLam(b)} | ${L.tu.map(t => `\`${t}\``).join(', ')} | ${L.den ? `\`${L.den}\`` : 'tùy trường hợp / giữ nguyên'} | ${L.phu ? 'có' : ''} |`; }).join('\n')}

"Việc phụ" (rút, hủy, gửi chứng từ, ghi đối soát) không làm đơn chuyển sang nhóm "Bạn cần làm".

## Sơ đồ

\`\`\`mermaid
stateDiagram-v2
${TEN_BUOC.flatMap(b => { const L = LUAT[b]; return L.tu.map(t => `  ${t} --> ${L.den ?? (b === 'tuChoiHuy' ? 'cho_giao' : b === 'ketQuaDung' ? 'da_chot' : t)}: ${L.ten}`); }).filter((x, i, a) => a.indexOf(x) === i).join('\n')}
  ${'cho_ban_xn_kq'} --> da_nhan_tien: xác nhận kết quả cân (tiền hàng ≤ cọc)
\`\`\`

## Chính sách mặc định (mô phỏng)

| Mục | Giá trị |
|---|---|
| Phí giới thiệu (đơn đầu với người bán này) | ${CHINH_SACH_MAC_DINH.phiGioiThieu * 100}% |
| Phí mối quen (đơn sau) | ${CHINH_SACH_MAC_DINH.phiMoiQuen * 100}% |
| Sàn / trần phí | ${CHINH_SACH_MAC_DINH.phiSan.toLocaleString('vi-VN')} đ / ${CHINH_SACH_MAC_DINH.phiTran.toLocaleString('vi-VN')} đ |
| Cọc | ${CHINH_SACH_MAC_DINH.tyLeCoc * 100}% giá trị đơn, làm tròn nghìn đồng |
| Hạn cọc | ${CHINH_SACH_MAC_DINH.hanCoc / 3600_000} giờ kể từ khi người bán xác nhận |
`;
writeFileSync(new URL('01-nghiep-vu/bang-luat-don.md', goc), luat);

/* ---- Danh mục màn ---- */
const TEN_TRANG: Record<string, string> = { 'bat-dau': 'Bắt đầu', 'hom-nay': 'Hôm nay', vuon: 'Vườn', ban: 'Bán hàng', don: 'Đơn', tien: 'Tiền', toi: 'Tôi', 'cong-cu': 'Công cụ mô phỏng' };
let man = `${DAU}# Danh mục màn app Nhà sản xuất (app bán)

Nguồn: \`apps/app-ban/src/danh-muc-man.ts\`. Mỗi màn mở ở \`/<mã>\` trong app; bài thử \`apps/app-ban/test/danh-muc-man.test.ts\` bảo đảm màn nào trong danh mục cũng có giao diện.

Tổng ${DANH_MUC_MAN.length} màn: ${DANH_MUC_MAN.filter(m => m.trang !== 'cong-cu').length} màn của app thật và ${DANH_MUC_MAN.filter(m => m.trang === 'cong-cu').length} màn công cụ mô phỏng (Phòng thử, Giả lập bên mua). "So với bản cũ": Có = giữ ý, Sửa = đổi theo luồng mới, Mới = chưa từng có.
`;
for (const trang of [...new Set(DANH_MUC_MAN.map(m => m.trang))]) {
  man += `\n## ${TEN_TRANG[trang] ?? trang}\n\n| Mã | Màn | Nhóm | So với bản cũ | Khu vực (từ trên xuống) |\n|---|---|---|---|---|\n`;
  man += DANH_MUC_MAN.filter(m => m.trang === trang).map(m => `| \`${m.id}\` | ${m.ten} | ${m.nhom} | ${m.tinhTrangCu} | ${m.khuVuc.join(' · ')} |`).join('\n') + '\n';
}
writeFileSync(new URL('03-giao-dien/danh-muc-man.md', goc), man);

/* ---- Ca kiểm thử app bán ---- */
let ca = `${DAU}# Ca kiểm thử app bán (giai đoạn 1)

Nguồn: \`packages/may-chu/src/ca-kiem-thu.ts\`. Mỗi ca dựng tình huống trên máy chủ mô phỏng trong bộ nhớ, làm các bước như người dùng (người bán mẫu chị Năm và 3 bên mua mẫu), rồi kiểm từng điểm. Chạy được ở hai nơi: \`npm test\` (Vitest) và màn **Phòng thử** trong app bán (\`/phong-thu\`), nơi bấm "Xem trên app" để nạp kết quả của ca và mở đúng màn.

| Mã | Nhóm | Ca | Kỳ vọng |
|---|---|---|---|
${CA_KIEM_THU_BAN.map(c => `| ${c.ma} | ${c.nhom} | ${c.ten} | ${c.kyVong} |`).join('\n')}
`;
writeFileSync(new URL('05-ca-kiem-thu-ban.md', goc), ca);
console.log(`Đã sinh bảng luật (${TEN_BUOC.length} bước, ${TRANG_THAI.length} trạng thái), danh mục (${DANH_MUC_MAN.length} màn) và ${CA_KIEM_THU_BAN.length} ca kiểm thử.`);
