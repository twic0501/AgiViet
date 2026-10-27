"""Đọc số nói tiếng Việt (giữ dấu để phân biệt "mốt/một", "tư/từ").

Hỗ trợ:
- số chuẩn: "hai mươi lăm nghìn", "một trăm hai mươi", "hai nghìn năm trăm"
- số nói tắt: "hai lăm" (25), "ba mốt" (31), "trăm hai" (120), "nghìn tư" (1.400),
  "hai triệu ba" (2.300.000), "hai tấn ba" (2.300 kg)
- rưỡi, nửa, phẩy: "hai tấn rưỡi", "nửa tấn", "hai phẩy năm tấn", "chục rưỡi"
- chục: "ba chục ký" (30 kg)
- chữ số: "2,5 tấn", "2.500 kg", "25k", "25.000đ"
- tiếng lóng tiền: "xị" (100 nghìn), "củ" (1 triệu), "lít" (100 nghìn)

Không đoán khi mơ hồ: "hai ba tấn" (2 hoặc 3 tấn, hay 23?) trả về khoảng [2, 3] và cờ mơ hồ.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

CHU_SO = {
    "không": 0, "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4, "năm": 5, "lăm": 5,
    "nhăm": 5, "sáu": 6, "bảy": 7, "bẩy": 7, "tám": 8, "chín": 9,
}
# dạng không dấu (khi người dùng gõ không dấu): bỏ "tu" (từ) và "mot" vẫn = 1
CHU_SO_KHONG_DAU = {
    "khong": 0, "mot": 1, "hai": 2, "ba": 3, "bon": 4, "nam": 5, "lam": 5, "nham": 5, "sau": 6,
    "bay": 7, "tam": 8, "chin": 9,
}
BAC_LON = {"nghìn": 1000, "ngàn": 1000, "ngan": 1000, "nghin": 1000, "triệu": 10**6, "trieu": 10**6,
           "tỷ": 10**9, "tỉ": 10**9, "ty": 10**9}
MUOI = {"mười", "mươi", "muoi"}
TRAM = {"trăm", "tram"}
CHUC = {"chục", "chuc"}
LINH = {"lẻ", "linh", "le"}
RUOI = {"rưỡi", "ruoi"}
NUA = {"nửa", "nua"}
PHAY = {"phẩy", "phay", "chấm"}

# Đơn vị khối lượng -> kg
DV_LUONG = {
    "tấn": 1000, "tan": 1000, "tạ": 100, "ta": 100, "yến": 10, "yen": 10,
    "ký": 1, "kí": 1, "ki": 1, "ky": 1, "kg": 1, "kilô": 1, "kilo": 1, "kilogram": 1, "cân": 1,
    "kílô": 1, "ký-lô": 1,
}
# Đơn vị tiền (sau số) -> hệ số đồng
DV_TIEN = {"đồng": 1, "dong": 1, "đ": 1, "d": 1, "vnd": 1, "k": 1000, "xị": 100000, "xi": 100000,
           "củ": 10**6, "cu": 10**6, "lít": 100000}


def chuan_hoa(s: str) -> str:
    s = unicodedata.normalize("NFC", str(s).lower())
    s = s.replace("ngàn", "nghìn").replace("tỉ", "tỷ").replace("bẩy", "bảy")
    s = re.sub(r"ki\s*-?\s*lô(\s*gam)?|ký\s*lô(\s*gam)?|kilogram|kilô", "kg", s)
    s = re.sub(r"(\d)\s*(kg|k|đ|tấn|g)\b", r"\1 \2", s)
    return s


MA_GIONG = r"\b(om|ir|st|ri|dt|đài thơm|dai thom|jasmine)\s?-?\s?(\d+)\b"


def tach_tu(s: str) -> list[str]:
    s = chuan_hoa(s)
    # "om18", "ir 504", "đài thơm 8": mã giống, không phải số
    s = re.sub(MA_GIONG, lambda m: m.group(1).replace(" ", "") + "#" + m.group(2), s)
    s = re.sub(r"(\d)[.,](?!\d)", r"\1 ,", s)
    return re.findall(r"\d+(?:[.,]\d+)*|[^\W\d_]+(?:#\d+)?|%|/|-|–|[,.;]", s)


def la_so_chu(tok: str, khong_dau: bool) -> bool:
    if tok in CHU_SO or tok in MUOI or tok in TRAM or tok in CHUC or tok in BAC_LON or tok in LINH:
        return True
    if khong_dau and tok in CHU_SO_KHONG_DAU:
        return True
    return False


def gia_tri_chu_so(tok: str, khong_dau: bool) -> int | None:
    if tok in CHU_SO:
        return CHU_SO[tok]
    if khong_dau and tok in CHU_SO_KHONG_DAU:
        return CHU_SO_KHONG_DAU[tok]
    return None


def so_chu_so(tok: str) -> float | None:
    """'2.500' -> 2500; '2,5' -> 2.5; '25' -> 25; '1.250.000' -> 1250000; '20.8.10' -> None."""
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", tok):
        return float(re.sub(r"[.,]", "", tok))
    if re.fullmatch(r"\d+(?:[.,]\d+)?", tok):
        return float(tok.replace(",", "."))
    return None  # dạng lạ (ngày "20.8.10", mã) -> không đoán


@dataclass
class KetQuaSo:
    gia_tri: float
    mo_ho: bool = False  # "hai ba tấn": khoảng
    khoang: tuple[float, float] | None = None
    tat: bool = False  # có dùng lối nói tắt (hai lăm, trăm hai): nên đọc lại
    bac_cuoi: int = 1  # bậc lớn cuối cùng (để xử lý rưỡi, nói tắt sau đơn vị)


def doc_so_chu(toks: list[str], khong_dau: bool = False, ngay: bool = False) -> KetQuaSo | None:
    """Đọc một dãy từ số (đã cắt sẵn, không gồm đơn vị khối lượng)."""
    if not toks:
        return None
    # dạng phẩy: "hai phẩy năm"
    for i, t in enumerate(toks):
        if t in PHAY:
            trai = doc_so_chu(toks[:i], khong_dau)
            phai = [gia_tri_chu_so(x, khong_dau) if not x[0].isdigit() else x for x in toks[i + 1:]]
            if trai is None or not phai or any(p is None for p in phai):
                return None
            le = "".join(str(int(p)) if not isinstance(p, str) else p for p in phai)
            if not le.isdigit():
                return None
            return KetQuaSo(float(f"{int(trai.gia_tri)}.{le}"))

    tong = 0.0
    nhom = 0.0
    cho: float | None = None  # chữ số đang chờ
    sau_nho: str | None = None  # 'tram' | 'muoi' | 'chuc' | 'ghep'
    bac_cuoi = 1
    mo_ho = False
    khoang = None
    tat = False
    truoc_la_chu_so = False
    for t in toks:
        d = gia_tri_chu_so(t, khong_dau)
        if t[0].isdigit():
            v = so_chu_so(t)
            if v is None:
                return None
            if cho is not None:
                nhom += cho
            cho = v
            truoc_la_chu_so = False
            continue
        if d is not None:
            if cho is not None and truoc_la_chu_so:
                # hai chữ số liền nhau
                if ngay or t in ("mốt", "tư", "lăm", "nhăm") or (khong_dau and t in ("lam", "nham")):
                    nhom += cho * 10
                    cho = d
                    sau_nho = "ghep"
                    tat = True
                elif d == cho + 1:
                    # "hai ba tấn", "bảy tám ký": khoảng, không đoán
                    mo_ho = True
                    khoang = (cho, d)
                    cho = d  # tạm lấy cận trên để còn nhân bậc; người dùng phải xác nhận
                    tat = True
                else:
                    # "hai tám" (28) - nói tắt hàng chục
                    nhom += cho * 10
                    cho = d
                    sau_nho = "ghep"
                    tat = True
            else:
                cho = d
            truoc_la_chu_so = True
            continue
        truoc_la_chu_so = False
        if t in MUOI:
            if cho is None:
                nhom += 10
            else:
                nhom += cho * 10
            cho = None
            sau_nho = "muoi"
        elif t in CHUC:
            nhom += (cho if cho is not None else 1) * 10
            cho = None
            sau_nho = "chuc"
        elif t in TRAM:
            nhom += (cho if cho is not None else 1) * 100
            cho = None
            sau_nho = "tram"
        elif t in LINH:
            sau_nho = "linh"
        elif t in BAC_LON:
            b = BAC_LON[t]
            v = nhom + (cho or 0)
            tong += (v if v else 1) * b
            nhom = 0
            cho = None
            sau_nho = None
            bac_cuoi = b
        elif t in RUOI:
            if sau_nho == "tram":
                nhom += 50
            elif sau_nho == "chuc":
                nhom += 5
            elif bac_cuoi > 1 and nhom == 0 and cho is None:
                tong += bac_cuoi / 2
            elif cho is not None:
                nhom += cho + 0.5
                cho = None
            tat = True
        elif t in NUA:
            nhom += 0.5
        else:
            return None
    if cho is not None:
        if sau_nho == "tram" and nhom % 100 == 0:
            nhom += cho * 10  # "trăm hai" = 120
            tat = True
        elif sau_nho is None and bac_cuoi > 1 and nhom == 0:
            tong += cho * bac_cuoi / 10  # "nghìn tư" = 1.400, "hai triệu ba"
            tat = True
        else:
            nhom += cho
    if mo_ho and khoang:
        # nhân khoảng theo bậc nếu có (hiếm: "hai ba trăm")
        he = (tong + nhom) / khoang[1] if khoang[1] else 1
        khoang = (khoang[0] * he, khoang[1] * he)
    return KetQuaSo(tong + nhom, mo_ho=mo_ho, khoang=khoang, tat=tat, bac_cuoi=bac_cuoi)


@dataclass
class CumSo:
    """Một cụm số tìm thấy trong câu, kèm đơn vị và vị trí."""
    bat_dau: int
    ket_thuc: int  # vị trí token sau cụm (gồm đơn vị)
    gia_tri: float
    kieu: str  # 'luong' (kg) | 'tien' (đồng, chưa rõ đơn vị giá) | 'tron' (số trần) | 'phan_tram' | 'con' | 'gam'
    doan_goc: str
    mo_ho: bool = False
    khoang: tuple[float, float] | None = None
    tat: bool = False
    tren_tan: bool = False  # giá tính theo tấn
    tren_kg: bool = False  # có nói "một ký"
    ngam_nghin: bool = False  # "giá hai lăm" -> hiểu 25.000, PHẢI xác nhận
    ghi_chu: list[str] = field(default_factory=list)


def tim_cum_so(van_ban: str) -> tuple[list[str], list[CumSo]]:
    toks = tach_tu(van_ban)
    khong_dau = not re.search(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]",
                              chuan_hoa(van_ban))
    cum: list[CumSo] = []
    i = 0
    n = len(toks)

    def la_so(j: int) -> bool:
        t = toks[j]
        if t[0].isdigit():
            return True
        if t in ("tư",) and not (j > 0 and (toks[j - 1] in BAC_LON or toks[j - 1] in TRAM or
                                           gia_tri_chu_so(toks[j - 1], khong_dau) is not None or
                                           toks[j - 1] in MUOI)):
            return False  # "tư" đứng một mình đầu cụm: thường là "thứ tư" / tên người
        if t in ("năm", "nam") and j + 1 < n and toks[j + 1] in ("nay", "ngoái", "sau", "trước", "ngoai"):
            return False
        if t in ("mốt",) and not (j > 0 and toks[j - 1] in MUOI | {"hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"}):
            return False  # "mốt" = ngày kia
        return la_so_chu(t, khong_dau) or t in RUOI or t in NUA or t in PHAY

    while i < n:
        if not la_so(i) or toks[i] in RUOI or toks[i] in PHAY or toks[i] in LINH:
            i += 1
            continue
        truoc_tu = toks[i - 1] if i > 0 else ""
        if truoc_tu in ("loại", "loai", "thứ", "thu", "hàng", "lứa", "đợt", "số"):
            i += 1  # "loại một", "thứ năm": một chữ số là tên, không phải lượng
            continue
        mo_ho_tu = truoc_tu in ("mấy", "may", "vài", "vai", "dăm")
        j = i
        while j < n and (la_so(j) or (toks[j] in PHAY and j + 1 < n and la_so(j + 1))):
            # chữ số viết (800) không ghép với chữ số nói ở sau ("800 hai") trừ bậc/rưỡi
            if j > i and toks[j - 1][0].isdigit() and not (toks[j] in BAC_LON or toks[j] in RUOI):
                break
            # "hai lăm một ký": "một/mỗi + đơn vị" là "trên mỗi", không thuộc cụm số
            if j > i and toks[j] in ("một", "mot", "1") and j + 1 < n and toks[j + 1] in DV_LUONG:
                break
            j += 1
        doan = toks[i:j]
        # tách "một ký" theo sau cụm tiền: "hai lăm nghìn một ký"
        kq = doc_so_chu(doan, khong_dau)
        if kq is None:
            i = j
            continue
        kieu = "tron"
        he = 1.0
        k = j
        tren_tan = tren_kg = ngam = False
        ghi_chu: list[str] = []
        sau = toks[k] if k < n else ""
        if sau in DV_LUONG:
            kieu = "luong"
            he = DV_LUONG[sau]
            k += 1
            # "hai tấn rưỡi"
            if k < n and toks[k] in RUOI:
                kq.gia_tri += 0.5
                kq.tat = True
                k += 1
            # "hai tấn ba" (ba tạ), "ba tạ hai" (hai yến)
            elif (k < n and gia_tri_chu_so(toks[k], khong_dau) is not None and he >= 100 and
                  (k + 1 >= n or (toks[k + 1] not in DV_LUONG and not la_so(k + 1)))):
                kq.gia_tri += gia_tri_chu_so(toks[k], khong_dau) / 10
                kq.tat = True
                k += 1
        elif sau == "%" or (sau == "phần" and k + 1 < n and toks[k + 1] == "trăm"):
            kieu = "phan_tram"
            k += 1 if sau == "%" else 2
        elif sau in ("con",):
            kieu = "con"
            k += 1
            # "năm chục con một ký" = cỡ 50 con/kg
            if k + 1 < n and toks[k] in ("một", "mỗi", "mot", "moi", "/", "1", "trên") and toks[k + 1] in DV_LUONG:
                k += 2
            elif k < n and toks[k] in ("kg", "ký", "kí"):
                k += 1
        elif sau in ("g", "gam", "gram", "gr", "lạng"):
            kieu = "gam"
            he = 100 if sau == "lạng" else 1
            k += 1
        elif sau in DV_TIEN and not (sau in ("d",) and khong_dau is False):
            kieu = "tien"
            he = DV_TIEN[sau]
            k += 1
            if sau in ("xị", "xi", "củ", "cu", "lít") and k < n and toks[k] in RUOI:
                kq.gia_tri += 0.5
                k += 1
        if kq.bac_cuoi >= 1000 and kieu == "tron":
            kieu = "tien"
            # đồng sau nghìn
            if k < n and toks[k] in ("đồng", "dong", "đ"):
                k += 1
        if (kieu == "tron" and k + 1 < n and toks[k] in ("một", "mỗi", "mot", "moi", "1")
                and toks[k + 1] in DV_LUONG):
            # "hai lăm một ký": số trần + "một ký" = giá; dưới 1.000 thì ngầm nghìn
            kieu = "tien"
            if kq.gia_tri < 1000:
                he = 1000
                ngam = True
        if kieu == "tien":
            # theo sau: "một ký", "mỗi ký", "/kg", "một tấn"
            m = k
            if m < n and toks[m] in ("một", "mỗi", "mot", "moi", "/", "1", "trên"):
                m += 1
            if m < n and toks[m] in DV_LUONG:
                if DV_LUONG[toks[m]] == 1000:
                    tren_tan = True
                elif DV_LUONG[toks[m]] == 1:
                    tren_kg = True
                k = m + 1
        gia = kq.gia_tri * he
        if mo_ho_tu:
            ghi_chu.append("mo_ho_may")
        cum.append(CumSo(i, k, gia, kieu, " ".join(toks[i:k]), kq.mo_ho or mo_ho_tu,
                         (kq.khoang[0] * he, kq.khoang[1] * he) if kq.khoang else None,
                         kq.tat, tren_tan, tren_kg, ngam, ghi_chu))
        i = k
    # "hai tấn ba trăm ký" -> gộp lượng giảm dần đơn vị
    gop: list[CumSo] = []
    for c in cum:
        if (gop and gop[-1].kieu == "luong" and c.kieu == "luong" and c.bat_dau == gop[-1].ket_thuc
                and c.gia_tri < gop[-1].gia_tri):
            p = gop[-1]
            p.gia_tri += c.gia_tri
            p.ket_thuc = c.ket_thuc
            p.doan_goc += " " + c.doan_goc
        else:
            gop.append(c)
    return toks, gop
