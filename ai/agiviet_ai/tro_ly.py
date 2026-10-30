"""Trợ lý trò chuyện cho app bán (thân thiện, chững chạc) và app mua (chuyên nghiệp).

Rào chắn bằng luật, không phụ thuộc mô hình:
- Trước khi gọi: chặn lừa đảo (xin OTP/mật khẩu, chuyển tiền ngoài hệ thống, đặt cọc vào tài khoản riêng) và câu ngoài lề.
- Sau khi gọi: mọi con số trong câu trả lời phải có trong dữ liệu ngữ cảnh hoặc câu hỏi; có số lạ thì thay bằng câu
  an toàn (không bịa giá, lượng, ngày, phí).
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from agiviet_ai.nha_cung_cap import CAU_SOAN_SAN, NhaCungCap

HE_THONG = {
    "ban": (
        "Bạn là trợ lý của AgiViet trong app NGƯỜI BÁN nông sản, thủy sản. Xưng 'AgiViet', gọi người dùng là 'bác'. "
        "Giọng gần gũi, chững chạc, câu ngắn dễ hiểu, không dùng tiếng lóng hay biểu tượng cảm xúc. "
        "Chỉ hướng dẫn các việc trong app: đăng lô hàng, chụp ảnh, chào giá, hợp đồng, cọc qua ngân hàng, giao nhận, quyết toán. "
        "Tối đa 4 câu. Chỉ dùng con số có trong DỮ LIỆU; không có thì nói chưa có số và chỉ chỗ xem trong app. "
        "Chỉ nhắc tới các mục có thật trong app: " + "{MUC}" + ". Không tự đặt tên mục khác. "
        "Không tự kể quy trình hay chính sách; chỉ nói điều có trong DỮ LIỆU, còn lại bảo bác xem mục Hỗ trợ. "
        "Chỉ nhắc tài khoản đảm bảo ngân hàng khi câu hỏi về tiền. Không bao giờ hỏi mã OTP, mật khẩu, số tài khoản."
    ),
    "mua": (
        "You are AgiViet's assistant in the BUYER app. Reply in Vietnamese, professional and concise, address the user as 'Quý khách'. "
        "Scope only: sourcing, offers, contracts, deposits via the bank escrow, delivery, inspection, settlement, disputes. "
        "Max 4 sentences, prefer short bullet points for steps. Use only numbers present in DỮ LIỆU; if missing, say the figure is "
        "not available yet and where to find it. Only mention these app sections: " + "{MUC}" + "; never invent other menu names. "
        "Never describe a procedure or policy unless it is in DỮ LIỆU; otherwise refer to Hỗ trợ. Mention the bank escrow only "
        "for payment questions. Never ask for OTP, passwords or bank account numbers."
    ),
}

MUC_APP = {"ban": "Hôm nay, Lô hàng, Nhu cầu mua, Hợp đồng, Tiền, Hỗ trợ",
           "mua": "Tổng quan, Nguồn hàng, Báo giá, Hợp đồng, Thanh toán, Giao nhận, Hỗ trợ"}
HE_THONG = {v: t.replace("{MUC}", MUC_APP[v]) for v, t in HE_THONG.items()}

CAU_NGOAI_LE = {
    "ban": "AgiViet chỉ hỗ trợ việc mua bán trong app thôi bác ạ. Bác cần hỏi về lô hàng, giá, hợp đồng hay giao nhận không?",
    "mua": "AgiViet chỉ hỗ trợ các nghiệp vụ mua hàng trong ứng dụng. Quý khách cần hỗ trợ về nguồn hàng, hợp đồng, thanh toán hay giao nhận?",
}
CAU_LUA = {
    "ban": "Bác cẩn thận nhé: AgiViet không bao giờ hỏi mã OTP hay mật khẩu, và tiền chỉ đi qua tài khoản đảm bảo ngân hàng trong app. "
           "Đừng chuyển tiền hay đọc mã cho ai. Nếu có người yêu cầu, bác bấm Báo cáo trong mục Hỗ trợ.",
    "mua": "Lưu ý an toàn: AgiViet không yêu cầu mã OTP, mật khẩu hay chuyển tiền ngoài tài khoản đảm bảo trong ứng dụng. "
           "Quý khách không thực hiện yêu cầu đó và vui lòng báo cáo qua mục Hỗ trợ.",
}
CAU_KHONG_SO = {
    "ban": "Con số này AgiViet chưa có trong dữ liệu của bác. Bác xem trong mục Lô hàng hoặc Hợp đồng để có số chính xác nhé.",
    "mua": "Số liệu này chưa có trong dữ liệu hiện tại. Quý khách vui lòng xem chi tiết trong mục Hợp đồng hoặc Báo giá.",
}


def bo_dau(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower()).replace("đ", "d")
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


# So khớp trên chuỗi đã bỏ dấu, chữ thường.
_MA = r"(\botp\b|\bma xac (nhan|thuc)\b|mat khau|\bpin\b)"
_DUA = r"\b(gui|doc|dua|hoi|xin|nhan tin|cung cap|bao)\b"
LUA = [_DUA + r".*" + _MA, r"\bcho (toi|em|anh|chi|minh|chau|tui)\b.*" + _MA,_MA + r".*\b(cho|gui|doc|dua)\b.*\b(anh|chi|em|toi|chau|minh|nguoi|ho|nhan vien)\b",
       r"chuyen (tien|khoan).*(rieng|ca nhan|ngoai|truoc|thang cho)", r"(tai khoan|stk) (rieng|ca nhan)",
       r"(dat )?coc.*(tai khoan|stk) (rieng|ca nhan|cua (anh|chi|em|toi))", r"ngoai (app|ung dung|he thong)",
       r"(bo qua|vuot|khong qua) (ngan hang|tai khoan dam bao)", r"bo qua (huong dan|quy tac)|ignore (previous|all)"]
TRONG_PHAM_VI = ["lo", "hang", "gia", "ban", "mua", "hop dong", "coc", "giao", "nhan", "can", "kg", "tan", "ta", "ky",
                 "tien", "thanh toan", "quyet toan", "kho", "xe", "anh", "dang", "chao", "don", "tranh chap", "kiem",
                 "xoai", "lua", "gao", "ca phe", "tieu", "tom", "ca", "rau", "trai", "nong san", "thuy san", "vuon",
                 "ngan hang", "phi", "otp", "tai khoan", "app", "agiviet", "ho tro", "huy", "tra", "lo hang", "pham cap",
                 "phieu", "chung tu", "nghiem thu", "pin", "mat khau", "dang nhap", "ma", "hoa don", "nguon", "bao gia", "sourcing", "contract", "deposit", "delivery"]

SO = re.compile(r"\d[\d.,]*")


def la_lua(cau: str) -> bool:
    s = bo_dau(cau)
    return any(re.search(p, s) for p in LUA)


def trong_pham_vi(cau: str) -> bool:
    s = " " + re.sub(r"[^a-z0-9 ]", " ", bo_dau(cau)) + " "
    return any(f" {t} " in s for t in TRONG_PHAM_VI)


def _chuan_so(t: str) -> str:
    return re.sub(r"[.,]", "", t).lstrip("0") or "0"


def so_la(tra_loi: str, nguon: str) -> list[str]:
    """Số trong câu trả lời mà không xuất hiện ở nguồn (dữ liệu + câu hỏi). Bỏ qua số đếm bước 1–9."""
    co = {_chuan_so(t) for t in SO.findall(nguon)}
    la = []
    for t in SO.findall(tra_loi):
        n = _chuan_so(t.rstrip(".,"))
        if len(n) == 1 or n in co:
            continue
        la.append(t)
    return la


@dataclass
class TraLoi:
    van_ban: str
    loai: str           # "mo_hinh" | "lua" | "ngoai_le" | "so_la" | "soan_san"
    nguon: str = ""
    so_la: list[str] = field(default_factory=list)


def tra_loi(cau: str, vai: str = "ban", du_lieu: str = "", ncc: NhaCungCap | None = None) -> TraLoi:
    if vai not in HE_THONG:
        raise ValueError("vai phải là 'ban' hoặc 'mua'")
    if la_lua(cau):
        return TraLoi(CAU_LUA[vai], "lua")
    if not trong_pham_vi(cau):
        return TraLoi(CAU_NGOAI_LE[vai], "ngoai_le")
    ncc = ncc or NhaCungCap()
    kq = ncc.goi(HE_THONG[vai], f"DỮ LIỆU:\n{du_lieu or '(trống)'}\n\nCÂU HỎI:\n{cau}", loai="truc_tiep", toi_da=300)
    if kq.nguon == "soan_san":
        return TraLoi(CAU_SOAN_SAN, "soan_san", kq.nguon)
    la = so_la(kq.van_ban, du_lieu + " " + cau)
    if la:
        return TraLoi(CAU_KHONG_SO[vai], "so_la", kq.nguon, la)
    if la_lua(kq.van_ban) and not re.search(r"khong|đừng|dung|chua bao gio|never", bo_dau(kq.van_ban)):
        return TraLoi(CAU_LUA[vai], "lua", kq.nguon)
    sach = re.sub(r"\s*\b(trong|theo|ở)?\s*(phần )?DỮ LIỆU\b", "", kq.van_ban)   # nhãn nội bộ không lộ ra người dùng
    return TraLoi(re.sub(r"\n{3,}", "\n\n", sach).strip(), "mo_hinh", kq.nguon)
