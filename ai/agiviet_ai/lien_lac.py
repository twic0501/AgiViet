"""Phát hiện liên lạc lách trong tin nhắn (LA-01, LA-02, LA-04 của 05 mục 7).

Bổ sung cho bộ lọc regex của backend ở chỗ regex thường bỏ sót: số điện thoại ĐỌC BẰNG CHỮ
("không chín một tám ... "), viết lẫn chữ số và chữ, tách bằng dấu cách/chấm/gạch, "dê lô"/"zl".
Không gửi tin ra ngoài máy, không dùng LLM. Chỉ trả vị trí cần che + lý do; backend quyết che.
"""
from __future__ import annotations

import re
import unicodedata

CHU = {"không": "0", "khong": "0", "một": "1", "mot": "1", "hai": "2", "ba": "3", "bốn": "4", "bon": "4",
       "tư": "4", "năm": "5", "nam": "5", "lăm": "5", "sáu": "6", "sau": "6", "bảy": "7", "bay": "7",
       "tám": "8", "tam": "8", "chín": "9", "chin": "9", "o": "0"}
TIEN = re.compile(r"(đ|đồng|dong|nghìn|ngàn|ngan|nghin|k|tr|triệu|trieu)\b", re.I)
NGAN_HANG = r"(stk|số tài khoản|so tai khoan|tk|agribank|vietcombank|vcb|vietinbank|bidv|sacombank|techcombank|mb|acb|tpbank)"


def _token(s):
    return [(m.group(0), m.start(), m.end()) for m in re.finditer(r"\d+|[^\W\d_]+", s)]


def quet(tin: str) -> dict:
    s = unicodedata.normalize("NFC", tin)
    thap = s.lower()
    phat_hien = []
    # 1. dãy chữ số / chữ số đọc bằng chữ liên tiếp
    toks = _token(thap)
    i = 0
    while i < len(toks):
        j, so, bd = i, "", toks[i][1]
        while j < len(toks) and (toks[j][0].isdigit() or toks[j][0] in CHU):
            so += toks[j][0] if toks[j][0].isdigit() else CHU[toks[j][0]]
            j += 1
        if j > i:
            kt = toks[j - 1][2]
            sau = thap[kt:kt + 12]
            doc_chu = any(not toks[k][0].isdigit() for k in range(i, j))
            la_tien = bool(TIEN.match(sau.strip())) or bool(re.fullmatch(r"\d{1,3}(\.\d{3})+", s[bd:kt].strip()))
            if not la_tien:
                if re.fullmatch(r"(0|84)\d{8,10}", so):
                    phat_hien.append({"loai": "so_dien_thoai", "doc_bang_chu": doc_chu, "vi_tri": [bd, kt]})
                elif 8 <= len(so) <= 16 and re.search(NGAN_HANG, thap[max(0, bd - 30):bd]):
                    phat_hien.append({"loai": "so_tai_khoan", "doc_bang_chu": doc_chu, "vi_tri": [bd, kt]})
        i = max(j, i + 1)
    for pat, loai in [(r"\b(zalo|za lô|da lô|dê lô|zl|zalô)\b", "zalo"), (r"https?://\S+|www\.\S+|\b\S+\.(com|vn|me)\b", "duong_dan"),
                      (r"\b[\w.+-]+@[\w-]+\.[\w.]+\b", "email"),
                      (r"(chuyển thẳng|chuyen thang|khỏi qua app|khoi qua app|ck riêng|ck rieng|ngoài app|ngoai app)", "lach_coc")]:
        for m in re.finditer(pat, thap):
            phat_hien.append({"loai": loai, "vi_tri": [m.start(), m.end()]})
    canh_bao = []
    if any(p["loai"] == "lach_coc" for p in phat_hien):
        canh_bao.append("Cọc chỉ được bảo vệ khi chuyển qua app.")
    if TIEN.search(thap) and re.search(r"\d", thap):
        canh_bao.append("Số tiền trong tin nhắn không có giá trị. Dùng nút Chào giá.")  # EG-10
    return {"can_che": [p for p in phat_hien if p["loai"] != "lach_coc"], "phat_hien": phat_hien,
            "canh_bao": canh_bao, "chi_goi_y": True}
