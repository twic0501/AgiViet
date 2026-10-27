"""Thống kê có nguồn, không suy đoán giá thị trường và không khóa tài khoản."""
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from statistics import median, quantiles
from .mo_hinh import GiaRequest, BatThuongRequest, TomTatRequest
from .doc_so import so_hien_thi

def dong_nguyen(x): return int(Decimal(str(x)).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

def tham_khao(req: GiaRequest):
    dong=[]; seen=set()
    for d in req.don:
        if d.id in seen: raise ValueError('Trùng mã đơn tham khảo')
        seen.add(d.id)
        if (d.mat_hang != req.mat_hang or d.loai != req.loai or d.mien != req.mien or
            not req.ngay-timedelta(days=30) <= d.ngay_chot <= req.ngay or not d.nghiem_thu_chot or
            d.gia_bat_thuong or d.cap_bi_danh_dau or d.ngoai_app or d.khung_nha_hang or d.ben_ban_id==d.ben_mua_id): continue
        if d.co_so_gia=='giao_kho' and d.cuoc_vnd_kg is None: continue
        p=d.gia_vnd_kg-(d.cuoc_vnd_kg or 0) if d.co_so_gia=='giao_kho' else d.gia_vnd_kg
        if p>0: dong.append((d,p))
    def loc_iqr(ds):
        if len(ds)<5: return ds
        q1,_,q3=quantiles([p for _,p in ds],n=4,method='inclusive');iqr=q3-q1
        return [(d,p) for d,p in ds if q1-1.5*iqr<=p<=q3+1.5*iqr]
    def du(ds):return len(ds)>=3 and len({(d.ben_ban_id,d.ben_mua_id) for d,_ in ds})>=2
    tinh=loc_iqr([(d,p) for d,p in dong if d.vung==req.vung])
    ds=tinh if du(tinh) else loc_iqr(dong)
    vung=req.vung if du(tinh) else req.mien
    base={'mat_hang':req.mat_hang,'loai':req.loai,'den_ngay':req.ngay.isoformat(),'cua_so_ngay':30,'co_so_gia':'tai_nguon','nguon':'don_nghiem_thu_da_chot','chi_tham_khao':True}
    if not du(ds):return {**base,'trang_thai':'chua_du_du_lieu','so_don':len(ds),'do_tin_cay':'khong_du','gia_vnd_kg':None,'khoang_vnd_kg':None}
    values=[p for _,p in ds]; pairs=len({(d.ben_ban_id,d.ben_mua_id) for d,_ in ds})
    q1,_,q3=quantiles(values,n=4,method='inclusive'); med=median(values)
    do='vua' if len(ds)>=10 and pairs>=5 and (q3-q1)/med<=.3 else 'thap'
    return {**base,'trang_thai':'co_du_lieu','gia_vnd_kg':dong_nguyen(med),'khoang_vnd_kg':[dong_nguyen(q1),dong_nguyen(q3)],
            'so_don':len(ds),'so_cap':pairs,'vung':vung,'do_tin_cay':do,
            'giai_thich_tin_cay':'Mức quy ước theo số đơn, số cặp và độ phân tán; chưa hiệu chuẩn xác suất',
            'don_nguon':[d.id for d,_ in ds]}

def bat_thuong(req: BatThuongRequest):
    cap=defaultdict(list); tach=defaultdict(list); flags=[]; ids=set()
    for d in req.giao_dich:
        if d.id in ids: raise ValueError('Trùng mã giao dịch')
        ids.add(d.id)
        if not req.ngay-timedelta(days=90)<=d.ngay<=req.ngay:continue
        low=bool(d.tham_khao_vnd_kg and d.gia_vnd_kg*100<d.tham_khao_vnd_kg*60)
        warn=bool(d.tham_khao_vnd_kg and d.gia_vnd_kg*100<d.tham_khao_vnd_kg*80)
        cap[(d.ben_ban_id,d.ben_mua_id)].append((d,low))
        if warn: flags.append({'ma':'KT-03' if low else 'KT-02','don_id':d.id,'ly_do':'Giá dưới 60% tham khảo' if low else 'Giá dưới 80% tham khảo','can_nguoi_xem':True})
        if req.ngay-timedelta(days=7)<=d.ngay and d.gia_tri_vnd<3000000:
            tach[(d.ben_ban_id,d.ben_mua_id,d.lo_id)].append(d.id)
    for (b,m),ds in cap.items():
        n=sum(low for _,low in ds)
        if n>=3 or (len(ds)>=4 and n*2>=len(ds)):
            flags.append({'ma':'KT-04','cap':[b,m],'so_don':len(ds),'so_bat_thuong':n,'ly_do':'Lặp lại giá bất thường trong 90 ngày; cần kiểm tra nguyên nhân','can_nguoi_xem':True})
    for (b,m,l),ds in tach.items():
        if len(ds)>=3:flags.append({'ma':'KT-06','cap':[b,m],'lo_id':l,'don_id':ds,'ly_do':'Có dấu hiệu chia nhỏ đơn cùng lô trong 7 ngày','can_nguoi_xem':True})
    return {'canh_bao':flags,'tu_khoa_tai_khoan':False,'chi_goi_y':True}

def tom_tat(req: TomTatRequest):
    """Mẫu từ điều khoản backend đã chuẩn hóa; không phân tích PDF tự do, không tính quyết toán."""
    from zoneinfo import ZoneInfo
    from .danh_muc import THEO_MA
    from .doc_so import so_thanh_chu, kg_thanh_loi
    ten = THEO_MA[req.mat_hang].ten if req.mat_hang in THEO_MA else req.mat_hang
    hc = req.han_coc.astimezone(ZoneInfo('Asia/Ho_Chi_Minh'))
    lines=[{'nguon':'mat_hang,loai,luong_kg,gia_vnd_kg',
            'noi_dung':f'Giao {so_hien_thi(req.luong_kg)} kg {ten}, loại {req.loai}; giá đã ghi {so_hien_thi(req.gia_vnd_kg)} đồng một ký.',
            'loi_doc':f'Giao {kg_thanh_loi(req.luong_kg)} {ten}, loại {req.loai}. Giá {so_thanh_chu(req.gia_vnd_kg)} đồng một ký.'},
           {'nguon':'coc_vnd,han_coc',
            'noi_dung':f'Cọc {so_hien_thi(req.coc_vnd)} đồng qua ngân hàng đối tác, hạn {hc:%H:%M} ngày {hc:%d/%m/%Y}. Chỉ khi ngân hàng xác nhận mới tính là có cọc.',
            'loi_doc':f'Cọc {so_thanh_chu(req.coc_vnd)} đồng, chuyển qua ngân hàng, hạn {so_thanh_chu(hc.hour)} giờ ngày {so_thanh_chu(hc.day)} tháng {so_thanh_chu(hc.month)}.'},
           {'nguon':'ngay_giao,diem_nghiem_thu','noi_dung':f'Giao ngày {req.ngay_giao:%d/%m/%Y}; chia loại và cân tại {req.diem_nghiem_thu}.',
            'loi_doc':f'Giao ngày {so_thanh_chu(req.ngay_giao.day)} tháng {so_thanh_chu(req.ngay_giao.month)}, chia loại và cân tại {req.diem_nghiem_thu}.'},
           {'nguon':'cach_tra_con_lai','noi_dung':'Phần còn lại: '+req.cach_tra_con_lai}]
    thieu=[]
    for k,label in [('dieu_khoan_ha_cap','Hạ cấp'),('dieu_khoan_thieu_luong','Thiếu lượng'),('dieu_khoan_im_lang','Hạn phản hồi nghiệm thu')]:
        v=getattr(req,k)
        if v:lines.append({'nguon':k,'noi_dung':label+': '+v})
        else:thieu.append(k)
    lines.append({'nguon':'nguyen_tac_he_thong','noi_dung':'Im lặng không bao giờ là đã nhận tiền. Muốn ký hoặc xác nhận tiền phải dùng bước riêng, đúng quyền của anh chị.'})
    return {'hop_dong_id':req.hop_dong_id,'phien_ban':req.phien_ban,'ma_bam':req.ma_bam,'dong':lines,'dieu_khoan_chua_co':thieu,
            'can_doc_ban_goc':True,'chi_goi_y':True,'ghi_chu':'Không thay thế hợp đồng; chưa xác minh mã băm với kho tài liệu backend.'}
