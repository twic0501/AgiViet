"""Tiện ích văn bản tiếng Việt: bỏ dấu, tách từ đơn giản."""
from __future__ import annotations

import re
import unicodedata


def bo_dau(s: str) -> str:
    """Chữ thường, bỏ dấu, đ -> d, gom khoảng trắng."""
    s = unicodedata.normalize("NFD", str(s).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("đ", "d")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def lam_sach(s: str) -> str:
    """Bỏ dấu và bỏ dấu câu (giữ chữ số, dấu chấm phẩy trong số, gạch nối, %)."""
    t = bo_dau(s)
    t = re.sub(r"[!?;:\"'“”()\[\]]", " ", t)
    t = re.sub(r"(?<!\d)[.,](?!\d)", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def chua_cum(t: str, cum: str) -> bool:
    """t, cum đã bỏ dấu. Khớp theo ranh giới từ."""
    return re.search(r"(?<![a-z0-9])" + re.escape(cum) + r"(?![a-z0-9])", t) is not None
