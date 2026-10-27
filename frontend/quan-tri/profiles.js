// Chuyển tình huống từ dong-co mẫu 1; giữ quy tắc tiền/cọc của backend v2, không chép công thức cũ.
export const profiles = [
  {id:'shortfall',name:'Chị Năm · bên mua báo cân thiếu, có ảnh',template:'checking',refs:['B25','B26','M16','M17'],story:'Xoài cát Chu ở Cao Lãnh: đã ký 1.200 kg; phiếu cân thử còn 1.080 kg. Người bán xem ảnh, phản đối hoặc chọn giao bù phần thiếu.'},
  {id:'downgrade',name:'HTX vườn xoài · hạ cấp một phần',template:'checking',refs:['B44','M30'],story:'Mưa cuối vụ làm 120 kg xước vỏ, 60 kg trả lại. Biên bản chia 3 phần, ảnh giả và giá hạ cấp theo hợp đồng.'},
  {id:'late',name:'Cơ sở thu mua · chậm trả trước bốc',template:'active',refs:['B28','B29','M19','M20'],story:'Cọc đã được ngân hàng ảo xác nhận. Tiền trước bốc chưa trả; chưa được coi lời báo trả là tiền đã nhận.'},
  {id:'harvest',name:'Hộ vườn · mưa rụng trái xin giảm lượng',template:'active',refs:['B09','B24'],story:'Người bán gửi ảnh hư cấu, xin giảm 1.200 xuống 960 kg do mưa. Bên mua đọc đề nghị và ký phụ lục; không tự sửa hợp đồng.'},
  {id:'low',name:'Hộ xoài · lời chào thấp hơn mặt bằng',template:'offer',refs:['B42','B43','M29'],price:'18000',story:'Giá chào thử 18.000 đ/kg cho xoài cuối vụ. Quy tắc dưới 60% bị chặn vẫn do backend quyết định; không giả lời chào bất hợp lệ.'},
  {id:'inspection',name:'Hai bên bất đồng · tranh chấp cần kiểm định',template:'dispute',refs:['B26','B36','M17','M27'],story:'Có biên bản và phản đối đang mở. Quyết định kiểm định cần người có quyền và API xử lý; không tự tạo kết luận kiểm định.'},
  {id:'arrival',name:'Khác mẫu tại nơi đến · kiểm định giả có kết luận',template:'checking',refs:['B36','M27'],story:'Đã ký biên bản tại vườn, xe tới nơi và cân xong. Bên mua có 2 giờ gửi khiếu nại 120 kg khác mẫu kèm ảnh giả; API đặt kiểm định thật trong môi trường thử. Người xem chủ động giao kết quả giả từ panel, không coi đó là kiểm định ngoài đời.'},
  {id:'urgent',name:'Lô kém loại không ai hỏi → bán gấp / bao tiêu',template:null,refs:['B39','B40','B41','M31','M32'],story:'Chưa có luồng app mua nhận lời chào bao tiêu và phản hồi trọn vẹn trong v2. API bán gấp/đặt theo vụ đã có; chưa ghép thành case được kiểm hai app.',unavailable:true},
];
export const profileById = id => profiles.find(p=>p.id===id);
// Hash độc lập thời gian/UUID. Cùng seed + sự kiện nghiệp vụ → cùng lựa chọn.
export function decision(seed, event, choices) {
  let hash=2166136261;
  for(const ch of String(seed)+'|'+event) {hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return choices[(hash>>>0)%choices.length];
}
