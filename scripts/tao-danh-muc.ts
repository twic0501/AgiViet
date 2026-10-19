// Sinh danh mục mặt hàng (packages/danh-muc/src/mat-hang.ts) từ docs/01-nghiep-vu/mat-hang.csv.
// Chỉ lấy hàng "Nên bán" và "Bán có điều kiện"; gắn 11 nhóm (icon nhóm của bộ asset v1), mẫu chia loại, ảnh nếu có.
// Chạy: node scripts/tao-danh-muc.ts
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const goc = new URL('..', import.meta.url).pathname;
const dong = readFileSync(goc + 'docs/01-nghiep-vu/mat-hang.csv', 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1)
  .map(l => [...l.matchAll(/"((?:[^"]|"")*)"/g)].map(m => m[1]!.replace(/""/g, '"')));

// Nhóm lớn / nhóm nhỏ trong danh sách → 11 nhóm của app
function nhomCua(lon: string, nho: string, ten: string): string {
  if (lon === 'Trái cây') return 'trai-cay';
  if (lon === 'Lúa gạo, hạt' || nho === 'Củ nguyên liệu nhà máy') return 'lua-gao';
  if (lon === 'Rau' || lon === 'Củ' || lon === 'Hoa, cây') return 'rau-cu';
  if (lon === 'Cây công nghiệp' || lon === 'Dược liệu' || lon === 'Phụ phẩm' || lon === 'Khác') return 'cong-nghiep';
  if (lon.startsWith('Chăn nuôi')) return 'chan-nuoi';
  if (lon === 'Thủy sản đánh bắt' && nho === 'Cá biển') return 'ca-bien';
  if (nho === 'Tôm' || /^Cua biển/.test(ten)) return 'tom-cua';
  if (nho === 'Cua, nhuyễn thể' || nho === 'Rong, tảo') return 'nhuyen-the';
  if (nho.startsWith('Cá') || nho === 'Lưỡng cư, bò sát nuôi' || (nho === 'Thủy sản đồng, sông' && /^Cá/.test(ten))) return 'ca-nuoi';
  if (lon === 'Thủy sản đánh bắt' && nho === 'Cá biển') return 'ca-bien';
  return 'hai-san';
}
const NHOM = [
  ['lua-gao', 'Lúa gạo, hạt, củ nhà máy', '01', 'lua'],
  ['trai-cay', 'Trái cây', '02', 'trai-cay'],
  ['rau-cu', 'Rau, củ, nấm, hoa', '03', 'rau-cu'],
  ['cong-nghiep', 'Cây công nghiệp, gia vị, dược liệu', '04', 'cong-nghiep'],
  ['chan-nuoi', 'Gia súc sống, ong, yến', '05', 'chan-nuoi'],
  ['ca-nuoi', 'Cá nuôi, cá đồng', '07', 'ca'],
  ['tom-cua', 'Tôm, cua', '08', 'tom'],
  ['nhuyen-the', 'Nghêu, sò, hàu, rong', '09', 'nhuyen-the'],
  ['ca-bien', 'Cá biển đánh bắt', '10', 'ca'],
  ['hai-san', 'Mực, ghẹ, hải sản khác', '11', 'ca'],
] as const;

// Ảnh thật có sẵn (packages/danh-muc/anh): từ khóa trong tên mặt hàng → tệp
const ANH: [RegExp, string][] = [
  [/^Xoài/, 'mango'], [/^Sầu riêng/, 'durian'], [/^Thanh long/, 'dragon-fruit'], [/^Bưởi/, 'pomelo'], [/^(Cam|Quýt)/, 'orange'], [/^Nhãn/, 'longan'],
  [/^Vải/, 'lychee'], [/^Chôm chôm/, 'rambutan'], [/^Mít/, 'jackfruit'], [/^Chuối/, 'banana'], [/^(Khóm|Dứa)/, 'pineapple'], [/^Chanh dây/, 'passion-fruit'],
  [/^Bơ/, 'avocado'], [/^Măng cụt/, 'mangosteen'], [/^Dừa (xiêm|ta|sáp)/, 'coconut'], [/^Dưa hấu/, 'watermelon'], [/^Lúa/, 'paddy'], [/^Gạo ST/, 'rice'],
  [/^Gạo (Jasmine|Đài|OM)/, 'rice-fragrant'], [/^Gạo nếp|^Nếp/, 'sticky-rice'], [/^Bắp hạt/, 'corn'], [/^Khoai mì/, 'cassava'], [/^Khoai lang/, 'sweet-potato'],
  [/^Đậu nành/, 'soybean'], [/^(Bắp cải|Cải thảo)/, 'cabbage'], [/^Cà chua/, 'tomato'], [/^Ớt/, 'chili'], [/^(Hành|Tỏi)/, 'onion'], [/^Khoai tây/, 'potato'],
  [/^(Cà rốt|Củ cải)/, 'carrot'], [/^Dưa leo/, 'cucumber'], [/^Nấm/, 'mushroom'], [/^(Ngò|Húng|Tía tô|Rau răm|Kinh giới|Thì là|Lá lốt|Hành lá)/, 'herbs'],
  [/^Măng/, 'bamboo-shoot'], [/^Cà phê (Robusta|Arabica) nhân/, 'coffee'], [/^Cà phê quả/, 'coffee-cherry'], [/^(Hồ tiêu|Tiêu)/, 'pepper'], [/^Hạt điều/, 'cashew'],
  [/^Mủ cao su/, 'rubber-latex'], [/^Chè/, 'tea'], [/^Mía/, 'sugarcane'], [/^Ca cao/, 'cocoa'], [/^(Cơm dừa|Dừa khô)/, 'dried-coconut'], [/^Quế/, 'cinnamon'],
  [/^Hồi/, 'star-anise'], [/^(Đinh lăng|Sâm|Atiso|Hà thủ ô|Đương quy|Ba kích)/, 'medicinal'], [/^Mật ong/, 'honey'], [/^Bò/, 'cattle'], [/^Trâu/, 'buffalo'], [/^Dê/, 'goat'],
  [/^Tôm thẻ/, 'shrimp'], [/^Tôm sú/, 'tiger-shrimp'], [/^Tôm càng/, 'river-prawn'], [/^Tôm hùm/, 'lobster'], [/^Cua biển/, 'mud-crab'], [/^Nghêu/, 'clam'],
  [/^Hàu/, 'oyster'], [/^Rong/, 'seaweed'], [/^Cá tra/, 'pangasius'], [/^Cá basa/, 'basa'], [/^(Cá rô phi|Cá điêu hồng)/, 'tilapia'], [/^Cá lóc/, 'snakehead'],
  [/^(Cá chẽm|Cá bớp)/, 'sea-bass'], [/^Cá ngừ/, 'tuna'], [/^(Cá thu|Cá nục|Cá bạc má)/, 'mackerel'], [/^Cá cơm/, 'anchovy'], [/^Cá hố/, 'hairtail'],
  [/^Mực/, 'squid'], [/^Bạch tuộc/, 'octopus'], [/^Ghẹ/, 'blue-crab'], [/^(Rau ăn lá|Cải|Rau muống|Xà lách|Mồng tơi|Rau dền|Tần ô|Rau lang|Rau ngót)/, 'vegetables'],
];
const coAnh = new Set(readdirSync(goc + 'packages/danh-muc/anh').map(f => f.replace('.jpg', '')));
const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const slug = (s: string) => boDau(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ds: { id: string; ten: string; nhom: string; nhomNho: string; muc: 'N' | 'D'; dieuKien: string; anh?: string }[] = [];
const daCo = new Set<string>();
for (const [, lon, nho, ten, danhGia, lyDo] of dong) {
  if (danhGia === 'Không nên bán') continue;
  let id = slug(ten!); while (daCo.has(id)) id += '-2'; daCo.add(id);
  const anh = ANH.find(([re]) => re.test(ten!))?.[1];
  ds.push({ id, ten: ten!, nhom: nhomCua(lon!, nho!, ten!), nhomNho: nho!, muc: danhGia === 'Nên bán' ? 'N' : 'D', dieuKien: danhGia === 'Nên bán' ? '' : lyDo!, ...(anh && coAnh.has(anh) ? { anh } : {}) });
}
const out = `// Tệp sinh tự động bằng \`node scripts/tao-danh-muc.ts\` từ docs/01-nghiep-vu/mat-hang.csv. Đừng sửa tay.
import type { MatHang, NhomHang } from './kieu.ts';

export const NHOM_HANG: readonly NhomHang[] = ${JSON.stringify(NHOM.map(([id, ten, icon, mau]) => ({ id, ten, icon: `commodity-group-${icon}`, mauChiaLoai: mau })), null, 1).replace(/"(\w+)":/g, '$1:')};

export const MAT_HANG: readonly MatHang[] = ${JSON.stringify(ds).replace(/"(\w+)":/g, '$1:').replace(/\},\{/g, '},\n  {')};
`;
writeFileSync(goc + 'packages/danh-muc/src/mat-hang.ts', out);
const theoNhom = NHOM.map(([id]) => `${id} ${ds.filter(x => x.nhom === id).length}`).join(' · ');
console.log(`${ds.length} mặt hàng (${ds.filter(x => x.muc === 'N').length} nên bán, ${ds.filter(x => x.muc === 'D').length} có điều kiện), ${ds.filter(x => x.anh).length} có ảnh · ${theoNhom}`);
