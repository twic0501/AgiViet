"""Đổi số thành chữ tiếng Việt để đọc lại bằng TTS (không để TTS tự đọc "25.000")."""
from __future__ import annotations

CS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]


def _ba_so(n: int, day_du: bool) -> str:
    tr, ch, dv = n // 100, (n // 10) % 10, n % 10
    ra: list[str] = []
    if tr or day_du:
        ra += [CS[tr], "trăm"]
    if ch == 0:
        if dv and (tr or day_du):
            ra.append("lẻ")
    elif ch == 1:
        ra.append("mười")
    else:
        ra += [CS[ch], "mươi"]
    if dv:
        if dv == 1 and ch >= 2:
            ra.append("mốt")
        elif dv == 5 and ch >= 1:
            ra.append("lăm")
        elif dv == 4 and ch >= 2:
            ra.append("tư")
        else:
            ra.append(CS[dv])
    return " ".join(ra)


def so_thanh_chu(n: int | float) -> str:
    if n is None:
        return ""
    if isinstance(n, float) and not n.is_integer():
        nguyen, le = str(n).split(".")
        return so_thanh_chu(int(nguyen)) + " phẩy " + " ".join(CS[int(c)] for c in le)
    n = int(n)
    if n == 0:
        return "không"
    bac = ["", "nghìn", "triệu", "tỷ"]
    nhom: list[int] = []
    while n:
        nhom.append(n % 1000)
        n //= 1000
    ra: list[str] = []
    for i in range(len(nhom) - 1, -1, -1):
        g = nhom[i]
        if g == 0:
            continue
        ra.append(_ba_so(g, day_du=i < len(nhom) - 1))
        if bac[i]:
            ra.append(bac[i])
    return " ".join(ra)


def kg_thanh_loi(kg: float) -> str:
    if not float(kg).is_integer():
        return f"{so_thanh_chu(kg)} ký"
    kg = int(kg)
    if kg >= 1000 and kg % 1000 == 0:
        return f"{so_thanh_chu(kg // 1000)} tấn"
    if kg >= 1000 and kg % 1000 == 500:
        return f"{so_thanh_chu(kg // 1000)} tấn rưỡi"
    return f"{so_thanh_chu(kg)} ký"


def so_hien_thi(n: float) -> str:
    return f"{int(n):,}".replace(",", ".")
