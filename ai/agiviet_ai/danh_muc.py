"""Danh mục 8 mặt hàng MVP v2 (theo docs/nghiep-vu/01-mat-hang.md, bản 25/10/2026).

Đây là bản sao TỐI THIỂU phục vụ AI (tên gọi địa phương, chia loại theo cỡ, thời gian sống,
giá tham khảo ảo). Nguồn sự thật là bảng hồ sơ ngành hàng của backend; khi backend có API
danh mục, dịch vụ AI phải nạp từ đó (xem docs/ai/04-api-cho-backend.md mục 6).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .van_ban import bo_dau, chua_cum


@dataclass
class Loai:
    ma: str
    ten: str
    # khoảng trọng lượng một trái (gam) hoặc cỡ (con/kg) dùng để suy loại từ mô tả
    min_g: float | None = None
    max_g: float | None = None
    kem_loai: bool = False  # loại dưới (L2/L3/dạt/C): chỉ gợi ý cho bên mua nhận hàng kém loại


@dataclass
class MatHang:
    ma: str
    ten: str
    nhom: str
    cap_mo: int
    kieu_chat_luong: str  # loai | bang_co | do_am
    ten_goi: list[str]  # cách nói thường gặp (đã bỏ dấu khi so)
    ten_chung: list[str] = field(default_factory=list)  # tên chung, mơ hồ: cần hỏi lại
    loai: list[Loai] = field(default_factory=list)
    song_ngay: int = 7  # thời gian sống ở nhiệt thường (ngày) từ khi thu
    giay_to_xuat_khau: list[str] = field(default_factory=list)
    gia_tham_khao_ao: dict[str, int] = field(default_factory=dict)  # đ/kg, DỮ LIỆU ẢO


DANH_MUC: list[MatHang] = [
    MatHang(
        "XOAI_CAT_CHU", "Xoài cát Chu", "trai_cay", 1, "loai",
        ["xoai cat chu", "cat chu", "xoai chu", "xoai cat chu dong thap"],
        ten_chung=["xoai", "xoai cat"],
        loai=[Loai("L1", "Loại một", 300, 450), Loai("L2", "Loại hai", 220, 299, True),
              Loai("L3", "Loại ba, hàng dạt", 0, 219, True)],
        song_ngay=6,
        giay_to_xuat_khau=["ma_vung_trong", "nhat_ky_cach_ly"],
        gia_tham_khao_ao={"L1": 25000, "L2": 15000, "L3": 6000},
    ),
    MatHang(
        "CHANH_KHONG_HAT", "Chanh không hạt", "trai_cay", 1, "loai",
        ["chanh khong hat", "chanh ko hat", "chanh k hat", "chanh tahiti", "chanh khong hot"],
        ten_chung=["chanh"],
        loai=[Loai("L1", "Loại một"), Loai("L2", "Loại hai", kem_loai=True), Loai("L3", "Dạt", kem_loai=True)],
        song_ngay=8,
        giay_to_xuat_khau=["ma_vung_trong"],
        gia_tham_khao_ao={"L1": 14000, "L2": 9000},
    ),
    MatHang(
        "TOM_THE", "Tôm thẻ chân trắng", "thuy_san", 1, "bang_co",
        ["tom the chan trang", "tom the", "tom chan trang", "the chan trang"],
        ten_chung=["tom"],
        loai=[Loai("CO_CHUAN", "Cỡ theo bảng (con/kg)")],
        song_ngay=1,
        giay_to_xuat_khau=["nhat_ky_ao", "test_khang_sinh"],
        gia_tham_khao_ao={"CO_CHUAN": 120000},
    ),
    MatHang(
        "LUA_TUOI", "Lúa tươi", "luong_thuc", 1, "do_am",
        ["lua tuoi", "lua uot", "lua om18", "lua om 18", "lua dai thom", "lua dai thom 8", "lua st25",
         "lua st 25", "lua 5451", "lua om5451", "lua ir50404", "lua ir 50404", "lua 504", "lua thom"],
        ten_chung=["lua"],
        loai=[Loai("AM25", "Độ ẩm chuẩn 25%")],
        song_ngay=1,
        gia_tham_khao_ao={"AM25": 6600},
    ),
    MatHang(
        "SAU_RIENG", "Sầu riêng Ri6/Monthong", "trai_cay", 2, "loai",
        ["sau rieng ri6", "sau rieng ri 6", "ri6", "ri 6", "sau rieng monthong", "monthong", "mon thong",
         "sau rieng thai", "sau rieng dona", "dona"],
        ten_chung=["sau rieng"],
        loai=[Loai("A", "Loại A", 2000, 5000), Loai("B", "Loại B", 1500, 1999, True),
              Loai("C", "Loại C/kem", 0, 1499, True)],
        song_ngay=4,
        giay_to_xuat_khau=["ma_vung_trong", "ma_co_so_dong_goi", "kiem_cadimi_vang_o", "nhat_ky_cach_ly"],
        gia_tham_khao_ao={"A": 75000},
    ),
    MatHang(
        "BUOI_DA_XANH", "Bưởi da xanh", "trai_cay", 2, "loai",
        ["buoi da xanh", "buoi xanh", "da xanh"],
        ten_chung=["buoi"],
        loai=[Loai("L1", "Loại một", 1200, 2200), Loai("L2", "Loại hai", 800, 1199, True),
              Loai("L3", "Dạt", 0, 799, True)],
        song_ngay=25,
        giay_to_xuat_khau=["ma_vung_trong"],
        gia_tham_khao_ao={"L1": 32000},
    ),
    MatHang(
        "THANH_LONG", "Thanh long", "trai_cay", 3, "loai",
        ["thanh long ruot do", "thanh long ruot trang", "thanh long", "thanh long do", "thanh long trang"],
        loai=[Loai("L1", "Loại một", 350, 2000), Loai("L2", "Loại hai", 250, 349, True),
              Loai("L3", "Dạt", 0, 249, True)],
        song_ngay=6,
        gia_tham_khao_ao={"L1": 18000, "L2": 9000},
    ),
    MatHang(
        "CA_TRA", "Cá tra nguyên liệu", "thuy_san", 3, "bang_co",
        ["ca tra", "ca tra nguyen lieu", "ca tra thit trang"],
        loai=[Loai("CO_CHUAN", "0,8–1,2 kg/con")],
        song_ngay=1,
        gia_tham_khao_ao={"CO_CHUAN": 30000},
    ),
]

THEO_MA = {m.ma: m for m in DANH_MUC}

# Mặt hàng ngoài phạm vi v2: nhận ra để trả lời đúng ("chưa hỗ trợ giao dịch"), không ghép.
NGOAI_PHAM_VI = {
    "rau": "rau ăn lá", "rau muong": "rau ăn lá", "cai": "rau ăn lá", "heo": "heo", "ga": "gà",
    "vit": "vịt", "trung": "trứng", "sua": "sữa", "go": "gỗ", "mat ong": "mật ong", "yen": "yến",
    "khom": "khóm (dứa)", "dua": "dừa/dứa", "mit": "mít", "chom chom": "chôm chôm", "nhan": "nhãn",
    "chanh tau": "chanh có hạt", "chanh giay": "chanh có hạt", "ca loc": "cá lóc", "cua": "cua",
}


def tim_mat_hang(van_ban: str) -> tuple[MatHang | None, str, str]:
    """Tìm mặt hàng bằng luật. Trả (mặt hàng, kiểu, cụm khớp).

    kiểu: 'chac' (khớp tên cụ thể), 'mo_ho' (chỉ tên chung, ví dụ "xoài"), 'ngoai' (ngoài phạm vi),
    'khong' (không thấy).
    """
    t = bo_dau(van_ban)
    # tên cụ thể dài nhất thắng
    best: tuple[int, MatHang, str] | None = None
    for m in DANH_MUC:
        for g in m.ten_goi:
            if chua_cum(t, g) and (best is None or len(g) > best[0]):
                best = (len(g), m, g)
    # ngoài phạm vi cụ thể (chanh tàu) phải thắng tên chung "chanh"
    for k in sorted(NGOAI_PHAM_VI, key=len, reverse=True):
        if chua_cum(t, k) and (best is None or len(k) > best[0]):
            if " " in k or best is None:
                return None, "ngoai", k
    if best:
        return best[1], "chac", best[2]
    for m in DANH_MUC:
        for g in m.ten_chung:
            if chua_cum(t, g):
                return m, "mo_ho", g
    return None, "khong", ""


def suy_loai_tu_can_nang(m: MatHang, gam_min: float, gam_max: float | None = None) -> Loai | None:
    """Suy loại từ khoảng trọng lượng trái (gam). Chỉ khi cả khoảng nằm trong một loại."""
    gam_max = gam_max if gam_max is not None else gam_min
    for lo in m.loai:
        if lo.min_g is None:
            continue
        if lo.min_g <= gam_min and gam_max <= lo.max_g:
            return lo
    return None


def loai_theo_ma(m: MatHang, ma: str) -> Loai | None:
    return next((x for x in m.loai if x.ma == ma), None)
