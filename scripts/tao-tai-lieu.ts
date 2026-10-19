// Sinh tài liệu từ code: bảng trạng thái + bảng luật đơn (tầng nghiệp vụ) và danh mục màn (app mô phỏng).
// Chạy: npm run tai-lieu (Node ≥ 22.18 chạy thẳng TypeScript). Không sửa tay các tệp sinh ra.
import { writeFileSync } from 'node:fs';
import { CHANG, CHANG_CUA, CHINH_SACH_MAC_DINH, LUAT, NHAN_TRANG_THAI, TEN_BUOC, TRANG_THAI, KET_THUC } from '../packages/nghiep-vu/src/index.ts';
import { DANH_MUC_MAN } from '../apps/app-mo-phong/src/phan-he/danh-muc-man.ts';

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
const dem = (f: (m: (typeof DANH_MUC_MAN)[number]) => boolean) => DANH_MUC_MAN.filter(f).length;
let man = `${DAU}# Danh mục màn app mô phỏng

Nguồn: \`apps/app-mo-phong/src/phan-he/danh-muc-man.ts\`. Màn chưa có giao diện thật hiện khung bố cục theo cột "Khu vực" khi mở trong app (\`/ban/<mã>\`, \`/mua/<mã>\`), và xem cả danh mục ở \`/danh-muc\`.

| | Tổng | Giai đoạn 1 | Giai đoạn 2 | Giai đoạn 3 |
|---|---|---|---|---|
${(['ban', 'mua'] as const).map(v => `| ${v === 'ban' ? 'Nhà sản xuất' : 'Thu mua'} | ${dem(m => m.vai === v)} | ${dem(m => m.vai === v && m.giaiDoan === 1)} | ${dem(m => m.vai === v && m.giaiDoan === 2)} | ${dem(m => m.vai === v && m.giaiDoan === 3)} |`).join('\n')}

Giai đoạn 1: luồng mua bán cốt lõi · 2: quản lý (vườn, kho, thuế) · 3: mở rộng (đối tác, gói, uy tín, hợp tác xã). "So với bản cũ": Có = giữ ý, Sửa = đổi theo luồng mới, Mới = chưa từng có.
`;
for (const v of ['ban', 'mua'] as const) {
  man += `\n## ${v === 'ban' ? 'App Nhà sản xuất' : 'App Thu mua'}\n`;
  for (const nhom of [...new Set(DANH_MUC_MAN.filter(m => m.vai === v).map(m => m.nhom))]) {
    man += `\n### ${nhom}\n\n| Mã | Màn | GĐ | So với bản cũ | Khu vực (từ trên xuống) |\n|---|---|---|---|---|\n`;
    man += DANH_MUC_MAN.filter(m => m.vai === v && m.nhom === nhom).map(m => `| \`${m.id}\` | ${m.ten} | ${m.giaiDoan} | ${m.tinhTrangCu} | ${m.khuVuc.join(' · ')} |`).join('\n') + '\n';
  }
}
writeFileSync(new URL('03-giao-dien/danh-muc-man.md', goc), man);
console.log(`Đã sinh bảng luật (${TEN_BUOC.length} bước, ${TRANG_THAI.length} trạng thái) và danh mục (${DANH_MUC_MAN.length} màn).`);
