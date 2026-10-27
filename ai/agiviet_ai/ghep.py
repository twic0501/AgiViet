"""Ghép cung cầu: luật cứng H1–H11 + điểm mềm minh bạch theo docs/nghiep-vu/05 mục 2.

- Không LLM, không GPU, tất định (cùng đầu vào -> cùng đầu ra).
- Giá chỉ dùng để LỌC/CHIA NHÓM bằng hai giá kín (P_min của lô, P_max của nhu cầu); KHÔNG có
  thành phần điểm nào dùng giá; đầu ra không chứa số giá nào.
- Mỗi gợi ý có lý do "khớp" và dòng "thiếu", và điểm từng thành phần (trừ phần cộng bán gấp,
  để không lộ nhãn bán gấp: EG-08).
"""
from __future__ import annotations

from collections import Counter
from datetime import timedelta
from math import asin, cos, radians, sin, sqrt
from zoneinfo import ZoneInfo

from .danh_muc import THEO_MA
from .mo_hinh import MatchRequest, ReverseMatchRequest

PHIEN_BAN_LUAT = '2026-10-25.2'
VN = ZoneInfo('Asia/Ho_Chi_Minh')


def khoang_cach(a, b):
    lat = radians(b.vi_do - a.vi_do); lon = radians(b.kinh_do - a.kinh_do)
    h = sin(lat / 2) ** 2 + cos(radians(a.vi_do)) * cos(radians(b.vi_do)) * sin(lon / 2) ** 2
    return 6371 * 2 * asin(sqrt(min(1, max(0, h))))


def giay_hop_le(lo, ma, tu, den):
    return any(g.ma == ma and g.trang_thai == 'da_xac_minh' and g.tu_ngay <= tu and g.den_ngay >= den
               for g in lo.giay_to)


def toi_thieu_nguon(nc):
    return nc.toi_thieu_nguon_kg or (1000 if nc.phan_khuc == 'xuat_khau' else 20)


def danh_gia(nc, lo, luc):
    """Trả (kết quả | None, danh sách vi phạm). Vi phạm chỉ dùng nội bộ/kiểm toán, không trả app."""
    hn = luc.astimezone(VN).date()
    mh = THEO_MA.get(lo.mat_hang)
    cach = khoang_cach(lo.vi_tri, nc.vi_tri)
    bk = nc.ban_kinh_km or (50 if nc.phan_khuc == 'nha_hang' else 150)
    # K21/CG-03: lượng ước tính chỉ cam kết tối đa 80%; trừ giữ tạm và cam kết đúng một lần
    # (backend cấp cùng một snapshot từ sổ lượng).
    kg = max(0.0, lo.luong_khai_kg * (1 if lo.da_can else .8) - lo.da_cam_ket_kg - lo.dang_giu_kg)
    giao = max(lo.ngay_co_hang, nc.ngay_tu, hn)
    bat_buoc = set(nc.giay_to_bat_buoc)
    # Chính sách MVP (02 mục 5), không phải chứng nhận tuân thủ từng thị trường xuất khẩu.
    if nc.phan_khuc == 'xuat_khau':
        if lo.mat_hang in ('TOM_THE', 'CA_TRA'):
            bat_buoc.update(['nhat_ky_ao', 'kiem_dinh:khang_sinh'])
        else:
            bat_buoc.update(['ma_vung_trong', 'nhat_ky_cach_ly'])
        if lo.mat_hang == 'SAU_RIENG':
            bat_buoc.add('kiem_dinh:cadimi_vang_o')
    # Kết quả kiểm định là điều kiện TRƯỚC KHI BỐC (02 mục 2.1; 01 mục 4.3, 4.5), không phải điều
    # kiện để hiện gợi ý: mẫu chỉ lấy khi đã có đơn (TH NC-3003: gom 6 nguồn rồi mới kiểm định).
    truoc_boc = sorted(x for x in bat_buoc if x.startswith('kiem_dinh') or x == 'ket_qua_kiem_dinh')
    bat_buoc -= set(truoc_boc)
    bat_buoc.discard('ma_co_so_dong_goi')  # của bên mua (01 mục 4.1)
    # Nhật ký cách ly: chứng minh bằng ngày hết cách ly ghi trên lô (kiểm ở H5).
    if 'nhat_ky_cach_ly' in bat_buoc and lo.het_cach_ly is not None:
        bat_buoc.discard('nhat_ky_cach_ly')
    # Mã có hậu tố thị trường (ma_vung_trong:TQ) thay mã chung.
    bat_buoc = {x for x in bat_buoc if ':' in x or not any(y.startswith(x + ':') for y in bat_buoc)}
    thieu_giay = [x for x in sorted(bat_buoc) if not giay_hop_le(lo, x, giao, max(nc.ngay_den, giao))]

    vi_pham = []

    def chan(dieu, ma, ly_do):
        if dieu:
            vi_pham.append({'ma': ma, 'ly_do': ly_do})

    chan(lo.mat_hang != nc.mat_hang or lo.dang != nc.dang, 'H1', 'Khác mặt hàng hoặc dạng sản phẩm')
    chan(lo.loai not in nc.loai, 'H2', 'Loại hàng không thuộc dòng nhu cầu')  # bao luôn H8
    chan(lo.trang_thai != 'dang_ban' and not (lo.trang_thai == 'sap_co_hang' and nc.truoc_mua), 'H3', 'Lô chưa mở bán cho lịch này')
    chan(lo.khoa_an_toan or lo.nguoi_ban_bi_khoa, 'H3', 'Đang khóa an toàn hoặc người bán bị khóa')
    chan(bool(thieu_giay), 'H4', 'Thiếu giấy đã xác minh còn hiệu lực: ' + ', '.join(thieu_giay))
    chan(lo.het_cach_ly is not None and lo.het_cach_ly > giao, 'H5', 'Chưa hết cách ly tại ngày giao sớm nhất')
    chan(cach > bk, 'H6', 'Ngoài bán kính nhận hàng')
    chan(lo.ngay_co_hang > nc.ngay_den + timedelta(days=3) or hn > nc.ngay_den, 'H7', 'Ngoài cửa sổ giao cho phép hoặc nhu cầu đã quá hạn')
    chan(lo.han_su_dung < giao, 'HAN_HANG', 'Hàng hết hạn trước ngày giao dự kiến')
    chan(lo.ben_ban_id == nc.ben_mua_id or lo.ben_ban_id in nc.ben_ban_chan, 'H9', 'Cùng tổ chức hoặc cặp bị chặn')
    chan(not mh or not lo.cap_mo_cho_phep or (mh.cap_mo == 2 and nc.phan_khuc == 'xuat_khau' and not lo.co_kiem_dinh_phu_vung),
         'H10', 'Chưa được mở giao dịch hoặc chưa có kiểm định phủ vùng')
    chan(nc.phan_khuc == 'xuat_khau' and not lo.nguoi_ban_da_xac_minh, 'H10', 'Người bán chưa xác minh không ghép xuất khẩu (TH-001)')
    chan(lo.gia_thap_nhat_kin * 100 > nc.gia_toi_da_kin * 110, 'H11', 'Chưa phù hợp điều kiện giao dịch')
    chan(kg < toi_thieu_nguon(nc), 'LUONG_TOI_THIEU', 'Không đủ lượng tối thiểu mỗi nguồn')
    chan(luc - lo.xac_nhan_luc > timedelta(days=14) or lo.xac_nhan_luc > luc, 'XAC_NHAN', 'Cần xác nhận lại còn hàng (CG-02)')
    chan(nc.trang_thai != 'dang_mo', 'NHU_CAU_DONG', 'Nhu cầu không còn mở')
    chan(nc.phan_khuc == 'nha_hang' and (lo.loai_nguoi_ban not in ('htx', 'vua') or not lo.nguoi_ban_da_xac_minh),
         'DAU_MOI', 'Nhà hàng cần HTX hoặc vựa đã xác minh')
    if vi_pham:
        return None, vi_pham

    lech = max(0, (giao - nc.ngay_den).days)
    thieu, ghi_chu = [], []
    if kg < nc.luong_kg:
        thieu.append(f'Thiếu {nc.luong_kg - kg:g} kg')
    if lech:
        thieu.append(f'Giao chậm {lech} ngày; cần hai bên đồng ý')
    # Ước tính nhưng phần cam kết được (80%) đã đủ: TH-004 xếp "khớp đủ" -> chỉ ghi chú.
    if not lo.da_can:
        (thieu if kg < nc.luong_kg else ghi_chu).append('Lượng ước tính; chỉ cam kết tối đa 80%')
    if nc.kieu_giao == 'giao_toi' and lo.giao_duoc is not True:
        thieu.append('Cần xác nhận người bán hoặc nhà xe giao tới nơi')
    uu_tien_thieu = [x for x in nc.giay_to_uu_tien if not giay_hop_le(lo, x, giao, max(nc.ngay_den, giao))]
    if uu_tien_thieu:
        thieu.append('Chưa xác minh giấy ưu tiên: ' + ', '.join(uu_tien_thieu))
    if truoc_boc:
        ghi_chu.append('Cần kiểm định trước khi bốc: ' + ', '.join(truoc_boc))

    moi = lo.so_don_hoan_tat < 3 or lo.uy_tin is None
    diem = {
        'luong': 25 * min(1, kg / nc.luong_kg),
        'uy_tin': 15 if moi else 25 * lo.uy_tin / 100,
        'khoang_cach': 15 * (1 - cach / bk),
        'ngay': 10 - 3 * lech,
        'loai': 10 if lo.loai == nc.loai[0] else 5,
        'da_can': 5 if lo.da_can else 0,
        'giay_to_them': min(5, 2.5 * sum(giay_hop_le(lo, x, giao, max(nc.ngay_den, giao))
                                         for x in set(nc.giay_to_uu_tien) - bat_buoc)),
        'moi_quen': 5 if lo.so_don_voi_ben_mua else 0,
        'hanh_vi': -20 if lo.vi_pham_90_ngay else 0,
    }
    gan_gia = lo.gia_thap_nhat_kin * 100 > nc.gia_toi_da_kin * 105
    nhom = 'gan_khop_gia' if gan_gia else ('khop_mot_phan' if thieu else 'khop_du')
    ly_do = ['Cùng mặt hàng, dạng và loại cần mua', f'Có thể góp {min(kg, nc.luong_kg):g} kg',
             f'Cách nơi nhận khoảng {cach:.1f} km đường chim bay',
             'Đủ giấy tờ bắt buộc đã xác minh' if bat_buoc else 'Phiếu không yêu cầu giấy tờ bắt buộc']
    if not lech:
        ly_do.append('Ngày có hàng trong cửa sổ cần')
    if moi:
        ly_do.append('Người bán mới: dùng điểm uy tín mặc định 15/25')
    if lo.so_don_voi_ben_mua:
        ly_do.append('Hai bên từng hoàn tất đơn trên app')
    if giao <= hn + timedelta(days=2):
        ly_do.append('Giao được trong 48 giờ')
    if gan_gia:
        ghi_chu.append('Cần thương lượng')
    hien = sum(diem.values())
    return {'lo_id': lo.id, 'nhom': nhom, 'nhan_gia': 'can_thuong_luong' if gan_gia else 'trong_khoang',
            'kha_dung_cam_ket_kg': round(kg, 3), 'khoang_cach_km': round(cach, 2),
            'ngay_giao_du_kien': giao.isoformat(), 'diem': round(hien, 1),
            'diem_thanh_phan': {k: round(v, 2) for k, v in diem.items()},
            'ly_do_khop': ly_do, 'thieu': thieu, 'ghi_chu': ghi_chu,
            '_diem': hien + (10 if lo.ban_gap else 0), '_xac_nhan': lo.xac_nhan_luc.timestamp(),
            '_chi_thieu_luong': not lech and not uu_tien_thieu and (nc.kieu_giao == 'tu_lay' or lo.giao_duoc is True)}, []


def _khoa_xep(x):
    # Điểm cao trước; hòa: xác nhận còn hàng gần nhất trước; rồi mã lô (05 mục 2.4)
    return (-x['_diem'], -x['_xac_nhan'], x['lo_id'])


def ghep(req: MatchRequest, noi_bo: bool = False):
    nc = req.nhu_cau
    nhom = {x: [] for x in ('khop_du', 'khop_mot_phan', 'gan_khop_gia')}
    loai_bo = Counter()
    chi_tiet_loai = []
    for lo in req.lo:
        r, vp = danh_gia(nc, lo, req.thoi_diem)
        if r:
            nhom[r['nhom']].append(r)
        else:
            for v in vp:
                loai_bo[v['ma']] += 1
            chi_tiet_loai.append({'lo_id': lo.id, 'vi_pham': vp})
    for ds in nhom.values():
        ds.sort(key=_khoa_xep)
    gom = None
    if nc.can_gom and not nhom['khop_du']:
        ung_vien = sorted([r for r in nhom['khop_mot_phan'] if r['_chi_thieu_luong']], key=_khoa_xep)
        con = nc.luong_kg; chon = []; tra = {x.id: x for x in req.lo}
        for r in ung_vien:
            if len(chon) >= (8 if nc.phan_khuc == 'xuat_khau' else 6):
                break
            lo = tra[r['lo_id']]
            if chon and not all((lo.diem_gom_id and lo.diem_gom_id == tra[c['lo_id']].diem_gom_id)
                                or khoang_cach(lo.vi_tri, tra[c['lo_id']].vi_tri) <= 30 for c in chon):
                continue
            n = min(con, r['kha_dung_cam_ket_kg'])
            if n < toi_thieu_nguon(nc):
                continue
            chon.append({'lo_id': lo.id, 'luong_kg': round(n, 3)}); con -= n
            if con <= 1e-6:
                break
        if chon:
            gom = {'nguon': chon, 'da_gom_kg': round(nc.luong_kg - con, 3), 'con_thieu_kg': round(max(0, con), 3),
                   'can_xac_nhan': True, 'ghi_chu': 'Chưa giữ lượng; điểm gom do backend chọn theo hợp đồng điểm gom'}
    for ds in nhom.values():
        for r in ds:
            for k in [k for k in r if k.startswith('_')]:
                del r[k]
    ra = {'phien_ban_luat': PHIEN_BAN_LUAT, 'phien_ban_du_lieu': req.phien_ban_du_lieu, 'nhu_cau_id': nc.id,
          **nhom, 'goi_y_gom': gom,
          'so_cung_cau': {'lo_cung_mat_hang_loai': sum(1 for x in req.lo if x.mat_hang == nc.mat_hang and x.loai in nc.loai)},
          'chi_goi_y': True}
    if noi_bo:  # chỉ cho nhật ký kiểm toán / trang vận hành, không trả app
        ra['_loai_bo'] = {'theo_ma': dict(loai_bo), 'chi_tiet': chi_tiet_loai}
    return ra


def ghep_nguoc(req: ReverseMatchRequest):
    """Chiều người bán (05 mục 2.6): một lô -> các nhu cầu khớp. Không trả giá tối đa của bên mua."""
    ra = []
    dem_can = 0
    for nc in req.nhu_cau:
        if nc.mat_hang == req.lo.mat_hang and req.lo.loai in nc.loai and nc.trang_thai == 'dang_mo':
            dem_can += 1  # đếm cả nhu cầu bị H11 loại (05 mục 2.6)
        r, _ = danh_gia(nc, req.lo, req.thoi_diem)
        if r:
            ra.append({'nhu_cau_id': nc.id, 'ben_mua_id': nc.ben_mua_id, 'phan_khuc': nc.phan_khuc,
                       'luong_can_kg': nc.luong_kg, 'ngay_tu': nc.ngay_tu.isoformat(), 'ngay_den': nc.ngay_den.isoformat(),
                       'nhom': r['nhom'], 'nhan_gia': r['nhan_gia'], 'diem': r['diem'],
                       'khoang_cach_km': r['khoang_cach_km'], 'ly_do_khop': r['ly_do_khop'], 'thieu': r['thieu'],
                       '_k': (r['nhom'] != 'khop_du', r['nhom'] == 'gan_khop_gia', -r['_diem'], nc.id)})
    ra.sort(key=lambda x: x['_k'])
    for x in ra:
        del x['_k']
    return {'phien_ban_luat': PHIEN_BAN_LUAT, 'phien_ban_du_lieu': req.phien_ban_du_lieu, 'lo_id': req.lo.id,
            'nhu_cau_khop': ra, 'so_nhu_cau_dang_can': dem_can, 'chi_goi_y': True}
