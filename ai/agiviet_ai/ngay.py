"""Đọc ngày nói tiếng Việt (giờ Việt Nam), so với một ngày gốc (hôm nay).

Trả về ngày dương lịch + cờ "ước" (cuối tháng, tuần sau...) + cờ "âm lịch" (rằm, mùng: KHÔNG tự
đổi sang dương lịch; phải hỏi lại vì nhầm âm/dương lệch cả tháng).
"""
from __future__ import annotations

import datetime as dt
import re
from dataclasses import dataclass

from .so_noi import chuan_hoa, doc_so_chu, tach_tu

THU = {"hai": 0, "ba": 1, "tư": 2, "năm": 3, "sáu": 4, "bảy": 5, "chủ nhật": 6}


@dataclass
class KetQuaNgay:
    ngay: dt.date | None
    uoc: bool  # ngày ước chừng: phải đọc lại
    am_lich: bool
    doan_goc: str


def _so(chuoi: str) -> int | None:
    chuoi = chuoi.strip()
    if not chuoi:
        return None
    if chuoi.isdigit():
        return int(chuoi)
    kq = doc_so_chu(tach_tu(chuoi), ngay=True)
    return int(kq.gia_tri) if kq and kq.gia_tri == int(kq.gia_tri) else None


SO_CHU = r"(?:\d{1,2}|(?:(?:mười|mươi|một|mốt|hai|ba|bốn|tư|năm|lăm|sáu|bảy|tám|chín)\s?){1,3})"


def doc_ngay(van_ban: str, hom_nay: dt.date) -> KetQuaNgay | None:
    t = chuan_hoa(van_ban)
    # âm lịch: rằm, mùng X (không kèm "tháng" dương), "âm lịch"
    # "mùng năm tháng mười một" thường là dương lịch; "rằm", "âm lịch", tháng giêng/chạp là âm lịch
    m = re.search(r"\b(rằm|âm lịch|ngày âm|tháng giêng|tháng chạp|mùng\s+\S+(?!\s+\S*\s*tháng))\b", t)
    if m and not (m.group(0).startswith("mùng") and re.search(r"mùng\s+\S+(\s+\S+)?\s+tháng", t)):
        return KetQuaNgay(None, True, True, m.group(0))
    # ngày X tháng Y
    m = re.search(r"(?:ngày\s+|mùng\s+)?(" + SO_CHU + r")\s*tháng\s+(" + SO_CHU + r")", t)
    if m:
        d, mo = _so(m.group(1)), _so(m.group(2))
        if d and mo and 1 <= d <= 31 and 1 <= mo <= 12:
            nam = hom_nay.year if mo >= hom_nay.month - 1 else hom_nay.year + 1
            try:
                return KetQuaNgay(dt.date(nam, mo, d), False, False, m.group(0))
            except ValueError:
                return KetQuaNgay(None, True, False, m.group(0))
    m = re.search(r"\b(\d{1,2})\s*/\s*(\d{1,2})\b(?!\s*(?:kg|ký|con))", t)
    if m:
        d, mo = int(m.group(1)), int(m.group(2))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            nam = hom_nay.year if mo >= hom_nay.month - 1 else hom_nay.year + 1
            try:
                return KetQuaNgay(dt.date(nam, mo, d), False, False, m.group(0))
            except ValueError:
                return KetQuaNgay(None, True, False, m.group(0))
    # "ngày hai tám" (tháng này/sau)
    m = re.search(r"\bngày\s+(" + SO_CHU + r")(?!\s*(?:nữa|tới|sau))", t)
    if m:
        d = _so(m.group(1))
        if d and 1 <= d <= 31:
            mo, nam = hom_nay.month, hom_nay.year
            if d < hom_nay.day:
                mo += 1
                if mo == 13:
                    mo, nam = 1, nam + 1
            try:
                return KetQuaNgay(dt.date(nam, mo, d), False, False, m.group(0))
            except ValueError:
                return KetQuaNgay(None, True, False, m.group(0))
    if re.search(r"\b(hôm nay|bữa nay|ngay bây giờ|trong ngày)\b", t):
        return KetQuaNgay(hom_nay, False, False, "hôm nay")
    for m in re.finditer(r"(?:^|(\S+)\s+)mốt\b", t):
        if m.group(1) not in ("mươi", "mười", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín", "trăm"):
            return KetQuaNgay(hom_nay + dt.timedelta(days=2), False, False, "mốt")
    if re.search(r"\b(ngày mai|bữa mai|sáng mai|chiều mai|mai)\b", t):
        return KetQuaNgay(hom_nay + dt.timedelta(days=1), False, False, "mai")
    m = re.search(r"(" + SO_CHU + r")\s*(ngày|bữa|hôm)\s*(nữa|tới)", t)
    if m:
        n = _so(m.group(1))
        if n is not None:
            return KetQuaNgay(hom_nay + dt.timedelta(days=n), "chừng" in t or "khoảng" in t or "cỡ" in t,
                              False, m.group(0))
    m = re.search(r"(?:thứ\s+(hai|ba|tư|năm|sáu|bảy)|(chủ nhật))(\s+(tuần sau|tuần tới|này))?", t)
    if m:
        ten = m.group(1) or m.group(2)
        wd = THU[ten]
        delta = (wd - hom_nay.weekday()) % 7
        if delta == 0:
            delta = 7
        if m.group(4) in ("tuần sau", "tuần tới") and delta < 7 and hom_nay.weekday() < wd:
            delta += 7
        return KetQuaNgay(hom_nay + dt.timedelta(days=delta), False, False, m.group(0))
    if re.search(r"\b(tuần sau|tuần tới)\b", t):
        return KetQuaNgay(hom_nay + dt.timedelta(days=7), True, False, "tuần sau")
    if re.search(r"\bcuối tuần\b", t):
        delta = (5 - hom_nay.weekday()) % 7 or 7
        return KetQuaNgay(hom_nay + dt.timedelta(days=delta), True, False, "cuối tuần")
    if re.search(r"\bcuối tháng\b", t):
        nx = (hom_nay.replace(day=28) + dt.timedelta(days=4))
        return KetQuaNgay(nx - dt.timedelta(days=nx.day), True, False, "cuối tháng")
    if re.search(r"\bđầu tháng (sau|tới)\b", t):
        nx = (hom_nay.replace(day=28) + dt.timedelta(days=4)).replace(day=5)
        return KetQuaNgay(nx, True, False, "đầu tháng sau")
    return None
