from pathlib import Path
import json,csv,re,collections,datetime
BASE=Path(__file__).resolve().parents[4]; OUT=BASE/'docs/doi-chieu'; EV=OUT/'bang-chung'
M1=Path('/home/twictrn/agiviet-he-thong/.claude/worktrees/he-thong-v4');M2=Path('/home/twictrn/Documents/AgiViet')
rows=[]
def ref(path,term=None,root=BASE):
 p=root/path
 if not p.exists():raise ValueError(str(p))
 ls=p.read_text().splitlines()
 if term is None:return path
 for i,l in enumerate(ls,1):
  if term in l:return f'{path}:{i}'
 raise ValueError((path,term))
def old(path,term=None):return ref(path,term,M1)
def add(group,name,s1,s2,state,evidence,level='vừa',proposal='sửa',why=''):
 assert state in ['có','thiếu','khác','làm sai','chưa kiểm'];assert level in ['nặng','vừa','nhẹ']
 rows.append([group,name,s1,s2,f'{state} — {evidence}',level,proposal+(' — '+why if why else '')])
# Map old screen IDs to current v2 screen/function. "có" is screen coverage, not a claim of complete E2E.
MAP={'ban':{},'mua':{}}
def mapto(role,ids,state,route,path,term,why,level='vừa',proposal='sửa'):
 for k in ids.split():MAP[role][k]=(state,route,ref(path,term),why,level,proposal)
S='frontend/shared/seller.js';A='frontend/shared/app.js';O='frontend/shared/orders.js';MK='frontend/shared/market.js';SV='frontend/shared/services.js'
mapto('ban','chao-mung dang-nhap otp','có','home',S,'export function welcome','Có màn chào/đăng nhập OTP; ảnh các trạng thái ở đợt E2E. Chưa thử SMS thật.','nhẹ')
mapto('ban','vai-tro mat-hang ho-so xac-minh','khác','home',S,'Tài khoản người bán do nhân viên','Không còn tự đăng ký theo 4 màn mẫu; UI yêu cầu nhân viên/HTX mở tài khoản. API đăng ký/xác minh có TH-001; không phải luồng onboarding có người đã chạy.','nặng')
mapto('ban','khai-bao-vuon vuon mua-vu ho-so-vuon','thiếu','nhat-ky',A,'case "thoi-tiet"','Thiếu màn quản lý vườn/vụ và QR nguồn như mẫu. Thẻ Vườn trên home chỉ là thời tiết/lô, không phải sổ vườn.','nặng')
mapto('ban','tro-giup-truy-cap','thiếu','home',S,'export function welcome','Màn đăng nhập không có đổi số/mất máy/gọi đọc mã tương đương; chưa kiểm phục hồi danh tính.','nặng')
mapto('ban','hom-nay','khác','home',S,'export async function home','Có ví, việc, lối tắt, thời tiết; thiếu 6 ô theo brief mẫu 2 và bộ việc nhật ký/cách ly đầy đủ.','vừa')
mapto('ban','tong-ket-tuan','thiếu','home',S,'export async function home','Home có tổng tiền; chưa có màn tuần với thu/chi/lời so tuần trước.','vừa')
mapto('ban','thong-bao','khác','notifications',S,'export async function thongBao','Có danh sách sự kiện; cần kiểm câu chữ, trạng thái đã đọc và vào đúng bước. Không có chat.','nặng')
mapto('ban','nhat-ky','thiếu','nhat-ky',S,'const SAP_CO','Màn Nhật ký chỉ báo Đang làm, sắp có; API record_cultivation có TH-NV-02 đạt. Thiếu cầu nối UI, không thiếu toàn bộ backend.','nặng')
mapto('ban','thu-chi ghi xac-nhan-ghi','thiếu','nhat-ky',A,'case "thoi-tiet"','Không có UI ghi nhật ký bằng giọng nói, xác nhận trường AI hay thu chi vụ. Không lấy sổ tiền đơn thay sổ chi phí canh tác.','nặng')
mapto('ban','cach-ly','khác','post',S,'export async function postLot','Form lô có ngày cách ly; backend nhật ký có ngày clear_on. Thiếu màn nhắc cách ly/vườn; TH-003 chỉ kiểm chặn ngày, không chứng minh UI nhật ký.','nặng')
mapto('ban','hang','có','lots',S,'export async function lotList','Danh sách lô có nhóm và Xem thêm; đã mở ảnh ở 390px. Luật hết hạn/nhắc còn hàng xem ca B08.','nhẹ')
mapto('ban','chi-tiet-lo','có','lots/{lot}',S,'export async function lotDetail','Có chi tiết lô, lượng theo bucket, ảnh, sửa giá/xác nhận còn hàng. Không chứng minh đủ tách/gộp.','nhẹ')
mapto('ban','cap-nhat-luong','thiếu','lots/{lot}',S,'export async function lotDetail','Chi tiết lô có còn hàng và sửa giá; không có form báo lượng mới do mất mùa như B09.','nặng')
mapto('ban','sap-co-hang','khác','post',S,'export async function postLot','Có ngày sẵn hàng trong form; không có màn riêng dự báo mùa, lượng ước và đăng từ mùa vụ.','vừa')
mapto('ban','chung-tu','khác','lots/{lot}',S,'export async function lotDetail','Có ảnh lô; không phải quản lý đầy đủ giấy kiểm nghiệm/VietGAP có hiệu lực/phạm vi. Hồ sơ nguồn đọc ở app mua.','nặng')
mapto('ban','lo-gop phan-cua-toi','thiếu','lots',A,'case "lots"','Có bảng core.lot_contributions trong DB, nhưng chưa thấy route/app nhập phần hộ, xác nhận phần và chia tiền.','nặng')
mapto('ban','ban-gap','thiếu','ban-gap',S,'const SAP_CO','Màn sắp có; backend bật/tắt bán gấp đã qua TH-NV-03. Thiếu UI cứu hàng và ghép đối tác nhận hàng kém loại.','nặng')
mapto('ban','tach-lo','thiếu','lots/{lot}',A,'case "lots"','Có bucket Đã tách lô và trigger bảo toàn; chưa có màn/route thao tác tách loại tương đương B39.','nặng')
mapto('ban','dang chon-mat-hang chup kiem-tra','khác','post',S,'export async function postLot','Gộp thành một form đăng có chọn ảnh mặt hàng, trường theo loại và ảnh; khác các bước mẫu. Chưa thử camera thật/ASR.','vừa')
mapto('ban','nghe','thiếu','post',S,'export async function postLot','Nút Nghe là đọc màn bằng TTS, không phải thu giọng nói rồi tự điền lô.','nặng')
mapto('ban','xem-lai xong','khác','post',S,'export async function postLot','Đăng xong chuyển chi tiết lô; chưa có màn xem lại hoàn chỉnh như bên mua trước khi đăng.','vừa')
mapto('ban','khach nhu-cau','khác','lots/ben-mua',S,'export async function benMuaCan','Có nhu cầu cùng mặt hàng, mở chi tiết và chào giá; chưa có hồ sơ/điểm uy tín bên mua như mẫu.','vừa')
mapto('ban','ket-noi','khác','offers',MK,'export async function offers','Thay lời mời kết nối bằng lời chào mua/báo giá chấp nhận; chưa có gói lượt kết nối và hoàn lượt từ chối như B10/M02.','vừa')
mapto('ban','ho-so-ben-mua','thiếu','offers/{offer}',S,'export async function offer(c','Chỉ thấy tên/thỏa thuận; thiếu hồ sơ bên mua và hành vi trả đúng hạn để quyết định bán.','nặng')
mapto('ban','chat','thiếu','messages',A,'Chưa có chức năng gửi tin nhắn','Route chỉ là thông báo chưa có gửi/gọi trong app; không thể kiểm che số trong chat.','nặng')
mapto('ban','bao-gia','có','offers/{offer}',S,'export async function offer(c','Có đồng ý/trả giá/từ chối, backend TH-010/011/012. Chưa đồng nghĩa lời mời chat.','vừa')
mapto('ban','hen-xem','thiếu','offers',A,'case "messages"','Chưa có route/form hẹn xem vườn và phản hồi hẹn.','nặng')
mapto('ban','bao-cao','khác','support',SV,'export async function support','Chuyển thành hỗ trợ chung; chưa có form báo cáo bên mua từ ngữ cảnh hồ sơ/lời mời.','vừa')
mapto('ban','lich','khác','orders',S,'export async function orderList','Có nhóm tới lượt/chờ/xong/đóng; chưa có lịch giao dạng lịch riêng. Cần làm vẫn phụ thuộc API.','vừa')
mapto('ban','chi-tiet-don','có','order/{order}',S,'export async function order(c','Có bước, việc, hạn, liên kết các phần đơn theo API. Luồng giao bị lỗi quyền riêng.','vừa')
mapto('ban','xac-nhan-don ky ban-day-du quyen','khác','order/{order}/terms',S,'async function manHopDong','Đọc điều khoản và PDF rồi ký OTP; khác đơn xác nhận một lần của mẫu 1. Đã chạy UI tới hai bên ký.','nặng')
mapto('ban','so-sanh','thiếu','offers',S,'export async function offerList','Không có màn so sánh khách cho người bán như mẫu; danh sách lời chào không thay bảng so có uy tín/lượng/lịch.','vừa')
mapto('ban','phuong-thuc chon-luong','khác','order/{order}/amendments',O,'export async function orderPart','Phương thức/lượng do app mua lập từ lời chào; người bán ký hoặc đề nghị phụ lục. Không còn chọn tại màn ký như mẫu 1.','vừa')
mapto('ban','ky-otp','có','order/{order}/terms',S,'c.forms.ky =','Có OTP ràng buộc hợp đồng; đã chạy UI ký trên môi trường thử.','nặng')
mapto('ban','ky-xong','khác','order/{order}/terms',S,'const daKy =','Trạng thái hai bên ký hiển thị ngay trong màn; không có màn hoàn tất ký riêng.','nhẹ')
mapto('ban','ky-giay','thiếu','order/{order}/terms',S,'async function manHopDong','Chưa thấy route/form ký giấy/ảnh chữ ký với kiểm xác minh tương đương.','vừa')
mapto('ban','coc','có','order/{order}/deposit',S,'async function manCoc','Có chi tiết cọc theo đơn; ngân hàng mô phỏng xác nhận qua bộ kiểm thử. Ngân hàng thật chưa kiểm.','nặng')
mapto('ban','mo-lien-lac','khác','order/{order}',S,'export async function order(c','Có API contact gating sau cọc và thông tin trong đơn; quy tắc mở khác mẫu 1, xem B19/M13.','nặng')
mapto('ban','ket-qua','làm sai','order/{order}/delivery',S,'c.can("delivery.record")','Màn nhận kết quả có 3 phần/PIN, nhưng đường người bán bắt đầu cân bị ẩn do sai quyền; E2E dừng trước nghiệm thu.','nặng')
mapto('ban','giao-mot-phan doi-lich yeu-cau-thay-doi','khác','order/{order}/amendments','frontend/shared/amendments.js','export','Có đề nghị/phụ lục hai bên ký, đã kiểm API giảm lượng, tăng lượng, giá, im lặng. Chưa chạy từng nhánh qua UI.','nặng')
mapto('ban','huy-don','có','order/{order}/cancel',O,'async function cancel','Có yêu cầu/trả lời hủy và hậu quả tiền; API TH-042/044/045/046/044b đạt. Chưa UI đủ mọi nguyên nhân.','nặng')
mapto('ban','tranh-chap','khác','order/{order}/disputes',O,'async function disputes','Có tranh chấp theo dòng, chứng cứ, cân lại ở API; quản trị toàn sàn còn thiếu.','nặng')
mapto('ban','so-ban hop-dong','có','order/{order}/documents',O,'async function documents','Có danh sách bản PDF và hash; API kiểm PDF/chữ ký, UI đã mở PDF hợp đồng.','vừa')
mapto('ban','tien tien-ve quyet-toan lich-su-tien','khác','ledger',S,'export async function ledger','Có sổ tiền tổng và từng đơn; cọc/tiền trả thẳng phân biệt. Đơn chẩn đoán tới completed sau bypass lỗi UI, không phải E2E thuần đạt.','nặng')
mapto('ban','ung-tien','thiếu','ledger',S,'export async function ledger','Chưa có luồng đề nghị/duyệt/thu hồi ứng tối đa 70% như B31; cần đối tác và chính sách mới.','vừa','bỏ')
mapto('ban','toi','khác','home',S,'<details class="sl-toi">','Menu avatar có thông báo/tổ chức/lịch sử/hỗ trợ/đăng xuất; không có đủ cài đặt/bảo mật/riêng tư.','vừa')
mapto('ban','uy-tin','thiếu','organization','backend/src/nghiep-vu/trung-binh.ts','uy_tin: null','Backend tự trả uy_tin:null; chưa tính điểm, thiếu màn uy tín hai chiều.','nặng')
mapto('ban','dich-vu dat-dich-vu','thiếu','support',A,'case "support"','Không có chọn đối tác/nhận báo giá/đặt kiểm nghiệm-xe-kho. Hỗ trợ chung không thay quy trình dịch vụ.','nặng')
mapto('ban','cai-dat bao-mat rieng-tu','thiếu','home',S,'<details class="sl-toi">','Chưa có màn chữ lớn/tốc độ đọc/quản lý phiên/quyền chia sẻ nguồn gốc tương đương mẫu.','vừa')
mapto('ban','ho-tro can-ho-tro','khác','support',SV,'export async function support','Có gửi yêu cầu và theo dõi người phụ trách/trạng thái. Chưa kiểm trả lời hai chiều/đóng từ UI.','vừa')
mapto('ban','trang-thai','có','support',A,'function fail','Có màn lỗi và mã hỗ trợ; 429 hiện câu chung khó hiểu, kiểm riêng ở UX.','vừa')
mapto('ban','nguoi-giup','khác','organization',SV,'export async function organization','Có thành viên/lời mời/ủy quyền ở API; khác tối đa 3 người giúp mẫu 1, có gói/quyền chờ 24h.','nặng')
mapto('ban','tai-khoan-nhan','có','payout',SV,'export async function payout','Có đổi tài khoản, kiểm người giúp, thời gian chờ; TH-023 đạt API.','nặng')
mapto('ban','phong-thu gia-lap','khác','home',A,'function testStrip','Cổng 18888 ẩn test/sim; công cụ thử ở 18889/quản trị. Không được gọi đây là thiếu công cụ toàn hệ thống.','vừa')
# Buyer
mapto('mua','dang-nhap otp','có','home',A,'async function login','Có đăng nhập OTP; đã chạy UI hai app.','nhẹ')
mapto('mua','thong-tin-to-chuc','khác','register','frontend/shared/enrollment.js','export async function enrollment','Có đăng ký tổ chức bằng OTP/MST; chủ chờ xác minh hai người. Chưa đủ hồ sơ năng lực theo phân khúc.','nặng')
mapto('mua','chon-goi goi-cua-toi so-sanh-goi nang-cap nang-cap-xong','khác','plans',SV,'export async function plans','Gộp vào gói, thanh toán theo kỳ; khác mức Free/Business mẫu 1; chưa có toàn bộ so sánh/nâng cấp qua UI.','vừa')
mapto('mua','tong-quan','có','home',A,'async function home()','Có tổng quan thu mua lấy dữ liệu API, tài khoản/việc/nguồn.','vừa')
mapto('mua','nguon-hang','có','lots',MK,'export async function lots','Có lọc mặt hàng/loại và mở chi tiết, ảnh minh họa có nhãn; giá kín không lộ.','vừa')
mapto('mua','goi-y','có','matches/{demand}',MK,'export async function demands','Có ghép theo dòng nhu cầu, lý do; TH-004dp chạy fallback đạt, AI thật không có trong 65 ca.','nặng')
mapto('mua','chi-tiet-lo ho-so-ban','khác','lots/{lot}',MK,'const source =','Có hồ sơ nguồn theo lô, giấy tờ/ảnh/số đơn; uy tín=null, thiếu thẩm định đúng yêu cầu từng buyer.','nặng')
mapto('mua','hang-kem-loai','thiếu','lots',A,'case "lots"','Lọc loại có sẵn nhưng chưa có đăng ký nhận loại 2/3/dạt, lượng tối thiểu và đối tác bao tiêu như M31/M32.','nặng')
mapto('mua','nhu-cau tao-nhu-cau chi-tiet-nhu-cau','có','demands',MK,'export async function demands','Có phiếu nhiều dòng, giá tối đa kín, ghép từng dòng. Không đồng nghĩa đã có gom nhiều hộ thành một đơn.','nặng')
mapto('mua','bao-gia so-bao-gia gui-bao-gia','khác','offers',MK,'export async function offers','Có lời chào và trả giá, so qua danh sách; chưa bảng so đầy đủ thông tin uy tín. Luồng chào→đồng ý→đơn UI đã đi.','vừa')
mapto('mua','tin-nhan','thiếu','messages',A,'Chưa có chức năng gửi tin nhắn','Chỉ màn thông báo chưa có chat/call.','nặng')
mapto('mua','hen-xem-vuon','thiếu','offers',A,'case "messages"','Không có lịch hẹn xem vườn/trả lời hẹn.','nặng')
mapto('mua','don-hang chi-tiet-don','có','orders',O,'export async function orderList','Có danh sách và chi tiết với các tab. Lỗi quyền bên bán chặn đường giao xuyên hai app.','nặng')
mapto('mua','thoa-thuan hop-dong','khác','create-order/{offer}',O,'export async function createOrder','Có soạn hợp đồng từ lời chào, điểm giao-nghiệm thu/giá hạ cấp/cách trả; cọc 30% khác mẫu 1 10%.','nặng')
mapto('mua','dat-coc','có','order/{order}/deposit',O,'async function deposit','Có số cọc/phí/mã chuyển và xử lý ngân hàng mô phỏng. Chưa ngân hàng thật.','nặng')
mapto('mua','mo-lien-lac','khác','order/{order}',O,'export async function order(c','Liên lạc theo đơn đủ điều kiện, chính sách v2 có ngưỡng/lịch sử; không khẳng định mọi cọc mở ngay.','nặng')
mapto('mua','nghiem-thu','có','order/{order}/delivery',O,'async function delivery','UI có nhập đạt/hạ cấp/trả lại/PIN/ảnh; đã thao tác trong lượt chẩn đoán, sau bypass lỗi bắt đầu cân của seller.','nặng')
mapto('mua','doc-phieu-can','thiếu','order/{order}/delivery',O,'async function delivery','Có đính chứng cứ nhưng chưa thấy OCR phiếu cân rồi đọc số cho sửa như mẫu.','vừa')
mapto('mua','doi-soat','khác','order/{order}/disputes',O,'async function disputes','Có tranh chấp theo dòng/tiền, API kiểm thiếu/trả lại/cân lại; không phải chốt lại toàn đơn như mẫu 1.','nặng')
mapto('mua','lich-nhan','thiếu','orders',O,'export async function orderList','Danh sách hợp đồng có hạn; chưa có màn lịch giao/nhận/trả tiền riêng.','vừa')
mapto('mua','huy-don','có','order/{order}/cancel',O,'async function cancel','Có hủy/trả lời; API TH-044/044b/046 đạt, chưa UI đầy đủ biến thể.','nặng')
mapto('mua','vi-dam-bao cong-no ghi-thanh-toan','khác','ledger',SV,'export async function ledger','Có sổ tiền và khoản trả thẳng theo đơn; v2 chỉ giữ cọc/phí, không giữ toàn tiền hàng như mẫu 1.','nặng')
mapto('mua','ton-kho nhap-kho truy-xuat','thiếu','orders',A,'async function route()','Có giao nhận nhưng không có route/module nhập-xuất-tồn kho thương mại và truy từ phiếu kho về nhật ký.','nặng')
mapto('mua','moi-quen','thiếu','offers',A,'async function route()','Backend có tính phí quan hệ cặp; chưa có danh sách mối quen/mua lại như mẫu.','vừa')
mapto('mua','cham-diem uy-tin','thiếu','organization','backend/src/nghiep-vu/trung-binh.ts','uy_tin: null','Chưa tính uy tín hay form đánh giá hai chiều/mỗi đơn một lần.','nặng')
mapto('mua','ghi-don-ngoai nhap-excel','thiếu','ledger',A,'async function route()','Không có route ghi đơn ngoài app/nhập Excel/mang công nợ ngoài vào sổ.','vừa')
mapto('mua','ke-hoach','thiếu','demands',A,'async function route()','Phiếu nhu cầu không thay kế hoạch tháng và số lượng đã cọc/còn thiếu như M26.','vừa')
mapto('mua','bang-ke bao-cao','thiếu','ledger',A,'async function route()','Sổ tiền không phải bảng kê mua nông sản/báo cáo thuế; chưa có route/xuất bảng theo tháng.','vừa')
mapto('mua','dich-vu yeu-cau-dich-vu','thiếu','support',A,'async function route()','Chưa có luồng yêu cầu→đối tác báo giá→đặt kiểm định/xe/kho.','nặng')
mapto('mua','ho-so-to-chuc thanh-vien','có','organization',SV,'export async function organization','Có hồ sơ thành viên/roles/lời mời; API TH-002/GD-01 đạt. Chưa đủ KYB tín dụng bên mua.','nặng')
mapto('mua','phong-thu gia-lap','khác','home',A,'function testStrip','Có môi trường thử/operator 18889, không lộ qua cổng pilot 18888.','vừa')

m2html={x['id']:x for x in json.loads((EV/'du-lieu/man-mau2-html.json').read_text())}
catalog=list(csv.DictReader((M2/'AgiViet_danh_muc_man.csv').open(encoding='utf-8-sig')))
for role in ['ban','mua']:
 ds=json.loads((EV/f'du-lieu/man-mau1-{role}.json').read_text())
 for x in ds:
  id=x['id']; ui=Path(('fe-nongdan' if role=='ban' else 'fe-thumua')+'/js/man/'+x['page'].replace('.html','.js'))
  s1=f"{x['file']}:{x['line']} (đăng ký màn)"
  if (M1/ui).exists():
   try:s1+='; '+old(str(ui),"AM.man('"+id+"'")
   except ValueError:pass
  part='App Nhà sản xuất' if role=='ban' else 'App Thu mua'
  matching=[(i,c) for i,c in enumerate(catalog,2) if c['Phần']==part and c['Mã màn']==id]
  s2=f"AgiViet_danh_muc_man.csv:{matching[0][0]} (danh mục/đặc tả; không phải bằng chứng chạy)" if matching else 'Chưa thấy trong CSV mẫu 2; có thể bổ sung sau danh mục, chưa kiểm render'
  if role=='ban' and id in m2html:s2+='; AgiViet_app_ban.html:'+str(m2html[id]['line'])+' (registry màn trong HTML, chưa chứng minh trọn luồng)'
  name=(matching[0][1]['Tên màn'] if matching else id)
  data=MAP[role].get(id)
  if data:
   state,route,source,why,level,proposal=data
   add('Màn mẫu 1/'+role,f'{role}:{id} — {name}',s1,s2,state,f'/{role}/#/{route}; {source}. {why}',level,proposal,'Chuyển bố cục/quy tắc tương ứng từ mẫu, nối API v2 và kiểm lại; không chép state cứng.' if state!='có' else 'Giữ phần đã có; kiểm hồi quy theo ca liên quan, không dựng lại.')
  else:add('Màn mẫu 1/'+role,f'{role}:{id} — {name}',s1,s2,'chưa kiểm','Chưa có ánh xạ được xác minh cho màn này.','vừa','sửa','Đối chiếu thủ công trước quyết định chuyển/bỏ.')

# Other CSV-only surfaces: retained so the baseline includes every catalog row.
for i,c in enumerate(catalog,2):
 if c['Phần'] in ['App Nhà sản xuất','App Thu mua']:continue
 if c['Phần']=='Trang giới thiệu':
  add('Màn mẫu 2/web','web:index — Trang giới thiệu', 'site/index.html (chưa kiểm nội dung live toàn trang)',f'AgiViet_danh_muc_man.csv:{i}','khác',ref('frontend/index.html')+'; trang chọn app/pilot, chưa đối chiếu thông điệp landing đầy đủ.','nhẹ','sửa','Giữ đường vào đúng hai app; chuyển nội dung giới thiệu sau luồng lõi.');continue
 lookup={'tong-quan-vh':('home','Tổng quan vận hành'),'duyet-xac-minh':('owners','Xác minh chủ tổ chức'),'chi-tiet-xac-minh':('owners','Xác minh chủ tổ chức'),'kiem-duyet-tin':('organizations','Chưa có chức năng'),'canh-bao-lach':('disputes','Chưa có danh sách'),'tranh-chap':('disputes','Hồ sơ tranh chấp toàn sàn'),'chi-tiet-tranh-chap':('disputes','Hồ sơ tranh chấp toàn sàn'),'tien-dam-bao':('bank','Chưa có chức năng đọc toàn bộ lệnh'),'nguoi-dung':('organizations','Chưa có chức năng tìm tổ chức'),'yeu-cau-ho-tro':('tasks','async function taskPage'),'cau-hinh-phi':('home','export const navigation')}
 route,term=lookup[c['Mã màn']]
 try:source=ref('frontend/quan-tri/admin.js',term)
 except ValueError:source=ref('frontend/quan-tri/admin.js','export const navigation')
 state='khác' if c['Mã màn'] in ['tong-quan-vh','duyet-xac-minh','chi-tiet-xac-minh','yeu-cau-ho-tro'] else 'thiếu'
 add('Màn mẫu 2/vận hành',c['Mã màn']+' — '+c['Tên màn'],'Chưa kiểm nguồn vận hành ngoài hai frontend mẫu 1',f'AgiViet_danh_muc_man.csv:{i}',state,f'/quan-tri/#/{route} qua 18889; {source}. App có hàng việc/xác minh chủ; nhiều màn tự ghi chưa có danh sách/chi tiết toàn sàn.','nặng','sửa','Chuyển nghiệp vụ vận hành kèm quyền xem chứng cứ; không coi trang rỗng là hoàn tất.')

# Additional rows are loaded below; keep data and renderer auditable.
extra=EV/'du-lieu/hang-bo-sung.json'
if extra.exists():
 for x in json.loads(extra.read_text()):add(**x)

# Runtime screenshot/header census. Errors never count as a successful render.
shots=json.loads((EV/'du-lieu/man-v2.json').read_text()) if (EV/'du-lieu/man-v2.json').exists() else []
for x in shots:
 failure=x.get('failure') or any(e.startswith(('429 ','500 ','502 ','503 ')) for e in x.get('errors',[]))
 if failure:state='chưa kiểm';desc='Ảnh lỗi/giới hạn tần suất; không chứng minh header của màn thật. '+str(x.get('errors') or x.get('failure'))[:240]
 elif not x.get('title'):state='chưa kiểm';desc='Không có h1/màn bị từ chối hoặc lỗi. '+x.get('text','')[:150]
 else:
  s=x.get('scroll',{}); moved=abs(s.get('headerYAfter',0)-s.get('headerYBefore',0)) if s.get('headerYAfter') is not None and s.get('headerYBefore') is not None else None
  can_scroll=bool(s.get('appScrollTop') or s.get('windowScrollY'))
  listens=x.get('listen',[]);kind='không có Nghe' if not listens else ('icon' if all(not v.get('text','').strip() for v in listens) else 'chữ Nghe')
  h=next((h for h in x.get('headers',[]) if abs(h.get('y',-999)-s.get('headerYBefore',999))<1 and h.get('height',0)>0),{})
  pinned=(h.get('position') in ['sticky','fixed'] and abs(s.get('headerYAfter',999)-float(h.get('top','0px').replace('px','') or 0))<=3)
  unstable=can_scroll and moved is not None and moved>3 and not pinned
  state='khác' if unstable or kind=='chữ Nghe' else 'có'
  desc=f"Đã render: {x.get('title')}; Nghe={kind}; "
  desc+=f"cuộn app {s.get('appScrollTop',0)}px/window {s.get('windowScrollY',0)}px; header y {s.get('headerYBefore')} → {s.get('headerYAfter')}" if can_scroll else 'không đủ chiều cao để thử cố định header; chưa kiểm sticky bằng cuộn'
  if can_scroll and moved is not None:desc+='; '+('HEADER KHÔNG GIỮ VỊ TRÍ' if unstable else 'header giữ vị trí; sticky bám top sau khoảng đệm đầu')
 evidence=f"bang-chung/anh/{x['filename']}; "+desc
 if x.get('scrollFilename'):evidence+='; ảnh cuộn bang-chung/anh/'+x['scrollFilename']
 add('Ảnh/header v2',f"V2-{x['index']} {x['role']}/#/{x['route']}"+(' ['+x['tag']+']' if x.get('tag') else ''),'Không áp dụng: ảnh v2','AgiViet_brief_app_ban_chot_V1.md:169 (chuẩn khung bán); app mua chưa mặc định cùng khung',state,evidence,'vừa' if state!='có' else 'nhẹ','sửa' if state!='có' else 'chuyển nguyên','Dùng một thành phần header/Nghe; kiểm cùng scroll container. Ảnh lặp trạng thái không phải tính năng độc lập.')

headers=['nhóm','tính năng','có ở mẫu 1 (đường dẫn file:dòng)','có ở mẫu 2 (file)','v2: có/thiếu/khác/làm sai (bằng chứng: file:dòng hoặc ảnh chụp)','mức (nặng/vừa/nhẹ)','đề xuất: chuyển nguyên / sửa / bỏ (lý do)']
with (OUT/'bang-doi-chieu.csv').open('w',encoding='utf-8-sig',newline='') as f:w=csv.writer(f);w.writerow(headers);w.writerows(rows)
counts=collections.Counter(r[4].split(' — ')[0] for r in rows);by_group={g:dict(collections.Counter(r[4].split(' — ')[0] for r in rows if r[0]==g)) for g in dict.fromkeys(r[0] for r in rows)}
(EV/'du-lieu/thong-ke.json').write_text(json.dumps({'tong':len(rows),'theo_v2':counts,'theo_nhom':by_group},ensure_ascii=False,indent=2))
intro=(EV/'du-lieu/mo-dau.md').read_text() if (EV/'du-lieu/mo-dau.md').exists() else '# Đối chiếu AgiViet v2 với hai mẫu\n'
end=(EV/'du-lieu/ket-luan.md').read_text() if (EV/'du-lieu/ket-luan.md').exists() else ''
def cell(s):
 s=str(s).replace('|','\\|').replace('\n','<br>')
 def link_source(m):
  file,line=m.groups();root=M1 if file.startswith(('fe-nongdan/','fe-thumua/','dong-co/')) else M2 if file.startswith(('AgiViet_','bo-cuc-','thiet-ke-lai/')) else BASE
  return '['+file+':'+line+']('+str(root/file)+':'+line+')'
 s=re.sub(r'((?:(?:fe-nongdan|fe-thumua|dong-co|frontend|backend|db|docs|bo-cuc-app-ban|bo-cuc-app-mua|thiet-ke-lai)/[A-Za-z0-9_./*-]+|AgiViet_[A-Za-z0-9_.*-]+)\.(?:js|ts|md|css|html|sql|csv)):(\d+)',link_source,s)
 s=re.sub(r'(bang-chung/(?:anh|anh-e2e|anh-e2e-chan-doan)/[A-Za-z0-9_.-]+\.png)',lambda m:'[ảnh]('+m[1]+')',s)
 return s
text=[intro,'\n## Bảng đối chiếu\n','| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']
text+=['| '+' | '.join(map(cell,r))+' |' for r in rows]
text+=['\n## Số lượng theo cột v2\n','Đếm đơn vị của bảng, **không phải tỷ lệ hoàn thành sản phẩm**: màn, quy tắc, ca kiểm và ảnh/header có giao nhau.\n','| Nhóm | Có | Thiếu | Khác | Làm sai | Chưa kiểm | Tổng |','|---|---:|---:|---:|---:|---:|---:|']
for g,c in by_group.items():text+=['| '+g+' | '+' | '.join(str(c.get(s,0)) for s in ['có','thiếu','khác','làm sai','chưa kiểm'])+' | '+str(sum(c.values()))+' |']
text+=['| **Tất cả** | '+' | '.join(str(counts.get(s,0)) for s in ['có','thiếu','khác','làm sai','chưa kiểm'])+' | **'+str(len(rows))+'** |',end]
(OUT/'bang-doi-chieu.md').write_text('\n'.join(text)+'\n')
print('rows',len(rows),'states',dict(counts))
