"""Trích trường đăng lô từ câu nói (đã nhận dạng thành chữ).

Ba chế độ:
- 'luat'    : chỉ luật (so_noi, ngay, danh_muc). Chạy được khi không có GPU/LLM.
- 'llm'     : chỉ LLM cục bộ (Ollama). Dùng để đo, KHÔNG dùng một mình trên production.
- 'ket_hop' : luật trước; LLM bổ sung trường chữ (mặt hàng, nơi giao, hình thức, loại) khi luật
              không thấy; với số (lượng, giá, ngày) LLM chỉ được nhận khi đoạn gốc LLM trích ra
              được luật đọc lại ra cùng con số. Hai bên lệch nhau về TIỀN thì bỏ trống và hỏi lại.

Đầu ra luôn là NHÁP. Không có trường nào tự đăng/ký/xác nhận tiền.
"""
from __future__ import annotations

import datetime as dt
import re
import math
from zoneinfo import ZoneInfo
import time
from dataclasses import asdict, dataclass, field
from typing import Any

from . import danh_muc as dm
from .doc_so import kg_thanh_loi, so_hien_thi, so_thanh_chu
from .ngay import doc_ngay
from .ollama_kh import LoiMoHinh, chat_json
from .so_noi import DV_LUONG, chuan_hoa, tim_cum_so
from .van_ban import bo_dau

TRUONG_SO = ("luong_kg", "gia_mong_muon", "gia_thap_nhat", "co_con_kg", "ngay_giao")
TRUONG_TIEN = ("gia_mong_muon", "gia_thap_nhat")


@dataclass
class GiaTri:
    gia_tri: Any
    nguon: str  # luat | llm | luat+llm | embedding
    tin_cay: float
    doan_goc: str = ""
    ghi_chu: str = ""


@dataclass
class KetQua:
    truong: dict[str, GiaTri] = field(default_factory=dict)
    thieu: list[str] = field(default_factory=list)
    can_xac_nhan: list[str] = field(default_factory=list)
    canh_bao: list[str] = field(default_factory=list)
    cau_hoi_tiep: str = ""
    cau_doc_lai: str = ""
    che_do: str = "luat"
    llm_ms: float | None = None
    loi_mo_hinh: str | None = None

    def phang(self) -> dict[str, Any]:
        return {k: v.gia_tri for k, v in self.truong.items()}

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["chi_luu_nhap"] = True
        d["don_vi_chuan"] = {"luong_kg": "kg", "gia_mong_muon": "VND/kg", "gia_thap_nhat": "VND/kg"}
        d["truong"] = {k: asdict(v) for k, v in self.truong.items()}
        return d


DAU_SAN = r"(thấp nhất|ít nhất|không dưới|giá chót|chót|giá sàn|tối thiểu|bớt lắm|hạ lắm|bét lắm|dưới .{0,12}không bán|thấp hơn .{0,12}không bán)"
DAU_UOC = ("khoảng", "chừng", "cỡ", "tầm", "ước", "độ", "dự kiến", "chắc", "hổng chắc", "áng chừng")


def _gan(kq: KetQua, ten: str, gt: Any, nguon: str, tin: float, doan: str = "", ghi: str = "") -> None:
    kq.truong[ten] = GiaTri(gt, nguon, tin, doan, ghi)


def trich_luat(van_ban: str, hom_nay: dt.date) -> KetQua:
    kq = KetQua(che_do="luat")
    t = chuan_hoa(van_ban)
    toks, cum = tim_cum_so(van_ban)

    # --- mặt hàng
    mh, kieu, khop = dm.tim_mat_hang(van_ban)
    if kieu == "chac":
        _gan(kq, "mat_hang", mh.ma, "luat", 0.95, khop)
    elif kieu == "mo_ho":
        _gan(kq, "mat_hang", mh.ma, "luat", 0.6, khop, "tên chung, cần hỏi lại giống")
        kq.can_xac_nhan.append("mat_hang")
    elif kieu == "ngoai":
        kq.canh_bao.append(f"Mặt hàng '{khop}' chưa hỗ trợ giao dịch trên app (chỉ ghi sổ)")
        _gan(kq, "mat_hang", None, "luat", 0.9, khop, "ngoai_pham_vi")

    # --- giống (lúa, sầu riêng, thanh long)
    for pat, giong in [(r"om\s?18", "OM18"), (r"đài thơm\s?8|dai thom\s?8", "Đài Thơm 8"), (r"st\s?25", "ST25"),
                       (r"5451", "OM5451"), (r"504", "IR50404"), (r"ri\s?6|ri sáu", "Ri6"),
                       (r"mon\s?thong|dona", "Monthong"), (r"ruột đỏ", "ruột đỏ"), (r"ruột trắng", "ruột trắng")]:
        if re.search(pat, t):
            _gan(kq, "giong", giong, "luat", 0.9, pat)
            break

    # --- dùng cụm số
    da_dung: set[int] = set()
    # cỡ trái: "trái ba ký", "mỗi trái bốn lạng", "350 tới 450 gam"
    m = re.search(r"(\d{2,4})\s*(?:-|–|tới|đến|tời)\s*(\d{2,4})\s*(?:g|gam|gram|gờ ram)\b", t)
    can_trai: tuple[float, float] | None = None
    if m:
        can_trai = (float(m.group(1)), float(m.group(2)))
    for idx, c in enumerate(cum):
        truoc = " ".join(toks[max(0, c.bat_dau - 3):c.bat_dau])
        if c.kieu == "gam" and can_trai is None:
            can_trai = (c.gia_tri, c.gia_tri)
            da_dung.add(idx)
        elif c.kieu == "luong" and re.search(r"(trái|quả)\s*(cỡ|chừng|khoảng|tầm)?$", truoc.strip()):
            can_trai = (c.gia_tri * 1000, c.gia_tri * 1000)
            da_dung.add(idx)
        elif c.kieu == "con":
            # chỉ tôm tính cỡ con/kg; cá tra "một ký một con" là kg/con; gà "năm chục con" ngoài phạm vi
            if mh and mh.ma == "TOM_THE":
                _gan(kq, "co_con_kg", int(c.gia_tri), "luat", 0.9, c.doan_goc)
            da_dung.add(idx)
        elif c.kieu == "luong" and c.gia_tri <= 5 and c.ket_thuc < len(toks) and toks[c.ket_thuc:c.ket_thuc + 2] in (["một", "con"], ["mỗi", "con"], ["1", "con"]):
            da_dung.add(idx)  # "một ký một con": cỡ cá, không phải lượng
        elif c.kieu == "tron" and re.search(r"(size|sai|cỡ)$", truoc.strip()) and mh and mh.kieu_chat_luong == "bang_co":
            _gan(kq, "co_con_kg", int(c.gia_tri), "luat", 0.8, c.doan_goc)
            da_dung.add(idx)
        elif c.kieu == "phan_tram" and "ẩm" in truoc:
            _gan(kq, "do_am", c.gia_tri, "luat", 0.9, c.doan_goc)
            da_dung.add(idx)

    # --- loại
    loai = None
    if mh is not None:
        # so trên chữ bỏ dấu để nhận cả câu gõ không dấu
        pat_loai = [(r"loai (mot|1|nhat)\b|hang (mot|1)\b", "L1"), (r"loai (hai|2|nhi)\b", "L2"),
                    (r"loai (ba|3)\b|hang dat\b|\bdat\b(?!\s*(truoc|coc|hang|mua))|hang xau|hang kem", "L3"),
                    (r"loai a\b|hang a\b", "A"), (r"loai b\b", "B"), (r"loai c\b|\bkem\b", "C"),
                    (r"hang xo\b(?! ao)|ban xo\b(?! ao)|chua lua|chua phan loai", "XO")]
        tkd = bo_dau(van_ban)
        for pat, ma in pat_loai:
            if re.search(pat, tkd) and (ma != "XO" or mh.kieu_chat_luong == "loai"):
                loai = ma
                break
        if loai in ("L1", "L2", "L3") and mh.ma == "SAU_RIENG":
            loai = {"L1": "A", "L2": "B", "L3": "C"}[loai]
        if loai and loai != "XO":
            _gan(kq, "loai", loai, "luat", 0.9, loai)
        elif loai == "XO":
            _gan(kq, "loai", "XO", "luat", 0.8, "hàng xô", "chưa chia loại: cần hỏi tỷ lệ hoặc tách lô")
            kq.can_xac_nhan.append("loai")
        if can_trai and mh.kieu_chat_luong == "loai":
            lo = dm.suy_loai_tu_can_nang(mh, *can_trai)
            if lo and "loai" not in kq.truong:
                _gan(kq, "loai", lo.ma, "luat", 0.8, f"{can_trai[0]:.0f}-{can_trai[1]:.0f} g",
                     "suy từ trọng lượng trái")
            elif lo and kq.truong["loai"].gia_tri != lo.ma:
                kq.canh_bao.append("Loại nói ra không khớp trọng lượng trái theo bảng loại")
                kq.can_xac_nhan.append("loai")
            if can_trai:
                _gan(kq, "can_trai_g", list(can_trai), "luat", 0.85, "")

    # --- lượng
    for idx, c in enumerate(cum):
        if idx in da_dung or c.kieu != "luong":
            continue
        truoc = toks[max(0, c.bat_dau - 3):c.bat_dau]
        if "mo_ho_may" in c.ghi_chu:
            kq.canh_bao.append(f"Lượng nói chưa rõ ('{toks[c.bat_dau - 1]} {c.doan_goc}'): hỏi lại")
            da_dung.add(idx)
            break
        uoc = any(w in DAU_UOC for w in truoc) or c.mo_ho or bool(re.search(r"hổng chắc|chưa chắc|ước", t))
        gt = c.khoang[0] if c.mo_ho and c.khoang else c.gia_tri
        _gan(kq, "luong_kg", gt, "luat", 0.7 if (c.mo_ho or c.tat) else 0.9, c.doan_goc,
             "nói khoảng, ghi cận dưới" if c.mo_ho else "")
        _gan(kq, "uoc_tinh", uoc, "luat", 0.8)
        if c.mo_ho:
            kq.can_xac_nhan.append("luong_kg")
        da_dung.add(idx)
        break

    # --- giá
    gia_cum = []
    ref_max = max(mh.gia_tham_khao_ao.values()) if mh else None
    ref_min = min(mh.gia_tham_khao_ao.values()) if mh else None
    for idx, c in enumerate(cum):
        if idx in da_dung:
            continue
        truoc = " ".join(toks[max(0, c.bat_dau - 4):c.bat_dau])
        gan = " ".join(toks[max(0, c.bat_dau - 2):c.bat_dau])
        ngu_canh_gia = bool(re.search(r"(giá|bán|lấy|kêu|muốn|thì|là)\s*$", truoc)) or bool(re.search(DAU_SAN + r"\s*(thì|là)?\s*$", truoc))
        la_ngay = bool(re.search(r"ngày|tháng|thứ|mùng|size|cỡ|ẩm", gan))
        if c.kieu == "tron" and c.mo_ho and c.khoang and ngu_canh_gia:
            # trong ngữ cảnh giá, "hai ba" là 23 (nói tắt), không phải khoảng 2-3
            c.gia_tri = c.khoang[0] * 10 + c.khoang[1]
        if c.kieu == "tien" or (c.kieu == "tron" and ngu_canh_gia and not la_ngay):
            gt = c.gia_tri
            ngam = c.ngam_nghin
            if c.kieu == "tron" and gt < 1000:
                gt *= 1000
                ngam = True
            if c.tren_tan:
                gt = gt / 1000
            gia_cum.append((idx, c, gt, ngam, truoc))
        elif (c.kieu == "tron" and not la_ngay and mh and 1 <= c.gia_tri < 1000 and c.bat_dau > 0
              and toks[c.bat_dau - 1] in (",", ".") and c.ket_thuc >= len(toks) - 1
              and 0.3 * ref_min <= c.gia_tri * 1000 <= 3 * ref_max):
            # số trần cuối câu ("..., mười bốn") nằm trong khoảng giá hợp lý: hiểu là giá nghìn, PHẢI xác nhận
            gia_cum.append((idx, c, c.gia_tri * 1000, True, truoc))
    gia_mm = gia_sn = None
    for idx, c, gt, ngam, truoc in gia_cum:
        sau = " ".join(toks[c.ket_thuc:c.ket_thuc + 4])
        la_san = bool(re.search(DAU_SAN, truoc + " ")) or bool(re.search(r"^(thì|là)?\s*(tui|tôi|em|con|nhà)?\s*(không|hổng|hông|ko) bán", sau)) \
            and bool(re.search(r"dưới|thấp hơn", truoc))
        o = GiaTri(round(gt), "luat", 0.6 if ngam or c.tat else 0.85, c.doan_goc,
                   "ngầm hiểu nghìn" if ngam else "")
        if la_san and gia_sn is None:
            gia_sn = o
        elif gia_mm is None:
            gia_mm = o
        elif gia_sn is None:
            gia_sn = o
    if gia_mm:
        kq.truong["gia_mong_muon"] = gia_mm
    if gia_sn:
        kq.truong["gia_thap_nhat"] = gia_sn

    # --- ngày
    nd = doc_ngay(van_ban, hom_nay)
    if nd:
        if nd.am_lich:
            kq.canh_bao.append("Ngày theo âm lịch: em chưa tự đổi, cần hỏi ngày dương")
            kq.can_xac_nhan.append("ngay_giao")
        elif nd.ngay is None:
            kq.canh_bao.append("Ngày không hợp lệ: cần nói lại ngày dương lịch")
            kq.can_xac_nhan.append("ngay_giao")
        else:
            _gan(kq, "ngay_giao", nd.ngay.isoformat(), "luat", 0.6 if nd.uoc else 0.9, nd.doan_goc,
                 "ngày ước" if nd.uoc else "")
            if nd.uoc:
                kq.can_xac_nhan.append("ngay_giao")

    # --- hình thức
    if re.search(r"chưa hái|còn trên cây|chưa thu|chưa gặt|chưa cắt|đặt trước|cọc trước|chưa tới (ngày|lứa)|"
                 r"chưa bắt|chưa xổ|chưa kéo|mới (thu|hái|gặt|cắt|bắt|xổ)", t):
        _gan(kq, "hinh_thuc", "dat_truoc_khi_hai", "luat", 0.85)
    elif re.search(r"có sẵn|hái rồi|đã hái|giao ngay(?! (mai|mốt|bữa|ngày|thứ|tuần))|lấy liền|bắt liền|hàng sẵn|sẵn hàng|"
                   r"cắt rồi|lấy ngay|bán liền|bán gấp", t):
        _gan(kq, "hinh_thuc", "giao_ngay", "luat", 0.85)

    # --- nơi giao
    for pat, ma in [(r"điểm gom|hợp tác xã gom|htx gom|chỗ gom", "diem_gom"),
                    (r"(chở|giao|đưa|chạy|mang) (tới|đến|lên|tận|qua) .{0,20}(kho|nhà máy|vựa|chợ|cửa)", "giao_toi_kho"),
                    (r"tại ao|bờ ao|ở ao|tới ao|ngay ao|tại đầm|bờ đìa|tại đìa|tại bè|ngay bè", "tai_ao"),
                    (r"ruộng|đầu bờ|bờ kênh|tại đồng|ngoài đồng", "tai_ruong"),
                    (r"tại vườn|ở vườn|tới vườn|vô vườn|ngay vườn|vào vườn|trong vườn|xuống vườn|lấy tại nhà|tại nhà", "tai_vuon")]:
        if re.search(pat, t):
            _gan(kq, "noi_giao", ma, "luat", 0.85, re.search(pat, t).group(0))
            break
    if re.search(r"không phải|à không|sửa (giá|lượng|ngày)|nói lộn|đính chính", t):
        for ten in TRUONG_SO:
            if ten in kq.truong:
                kq.truong.pop(ten)
                kq.can_xac_nhan.append(ten)
        kq.canh_bao.append("Có lời sửa thông tin: hỏi riêng từng số, không lấy số đầu câu")
    return kq


# ----------------------------------------------------------------------------- LLM

SCHEMA_LLM = {
    "type": "object",
    "properties": {
        "mat_hang": {"type": ["string", "null"], "enum": [m.ma for m in dm.DANH_MUC] + ["NGOAI_DANH_MUC", None]},
        "loai": {"type": ["string", "null"], "enum": ["L1", "L2", "L3", "A", "B", "C", "XO", None]},
        "luong_kg": {"type": ["number", "null"]},
        "luong_doan_goc": {"type": ["string", "null"]},
        "uoc_tinh": {"type": ["boolean", "null"]},
        "co_con_kg": {"type": ["integer", "null"]},
        "ngay_giao": {"type": ["string", "null"]},
        "ngay_doan_goc": {"type": ["string", "null"]},
        "hinh_thuc": {"type": ["string", "null"], "enum": ["giao_ngay", "dat_truoc_khi_hai", None]},
        "noi_giao": {"type": ["string", "null"], "enum": ["tai_vuon", "tai_ao", "tai_ruong", "giao_toi_kho", "diem_gom", None]},
        "gia_mong_muon": {"type": ["number", "null"]},
        "gia_mong_muon_doan_goc": {"type": ["string", "null"]},
        "gia_thap_nhat": {"type": ["number", "null"]},
        "gia_thap_nhat_doan_goc": {"type": ["string", "null"]},
    },
    "required": ["mat_hang", "loai", "luong_kg", "luong_doan_goc", "uoc_tinh", "co_con_kg", "ngay_giao",
                 "ngay_doan_goc", "hinh_thuc", "noi_giao", "gia_mong_muon", "gia_mong_muon_doan_goc",
                 "gia_thap_nhat", "gia_thap_nhat_doan_goc"],
}

HE_THONG_LLM = """Bạn trích thông tin đăng bán nông sản, thủy sản từ câu nói của nông dân miền Tây Việt Nam.
Chỉ trích những gì người nói THỰC SỰ nói. Không đoán, không suy giá. Thiếu thì để null.
Danh mục mặt hàng (mã): {danh_muc}. Mặt hàng khác ghi NGOAI_DANH_MUC.
Quy ước:
- luong_kg: đổi ra ký. 1 tấn = 1000, 1 tạ = 100, 1 yến = 10. "rưỡi" = thêm nửa đơn vị ("hai tấn rưỡi" = 2500). "ba chục ký" = 30.
  Nói khoảng ("hai ba tấn") thì lấy số nhỏ và uoc_tinh = true. Có "khoảng, chừng, cỡ, tầm, độ" thì uoc_tinh = true.
- gia_mong_muon, gia_thap_nhat: đồng trên 1 ký. "hai lăm" khi nói giá = 25000. "trăm hai" = 120000. Giá theo tấn thì chia 1000.
  gia_thap_nhat là mức thấp nhất chịu bán ("thấp nhất", "không dưới", "giá chót", "bớt lắm thì").
- *_doan_goc: chép NGUYÊN VĂN đoạn chữ trong câu chứa con số đó.
- ngay_giao: dạng YYYY-MM-DD, hôm nay là {hom_nay} ({thu}). "mai" = +1 ngày, "mốt" = +2 ngày.
- loai: L1/L2/L3 (dạt = L3) cho trái cây; A/B/C cho sầu riêng; XO nếu "hàng xô" chưa lựa. Tôm ghi cỡ con/kg vào co_con_kg.
- hinh_thuc: dat_truoc_khi_hai nếu hàng chưa hái/chưa thu/chưa gặt; giao_ngay nếu có sẵn.
- noi_giao: tai_vuon, tai_ao, tai_ruong, giao_toi_kho (người bán chở tới), diem_gom.
Chỉ trả MỘT đối tượng JSON (không giải thích) có đúng các khóa:
{{"mat_hang": ..., "loai": ..., "luong_kg": ..., "luong_doan_goc": ..., "uoc_tinh": ..., "co_con_kg": ..., "ngay_giao": ..., "ngay_doan_goc": ..., "hinh_thuc": ..., "noi_giao": ..., "gia_mong_muon": ..., "gia_mong_muon_doan_goc": ..., "gia_thap_nhat": ..., "gia_thap_nhat_doan_goc": ...}}"""

THU_VN = ["thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy", "chủ nhật"]


def trich_llm(van_ban: str, hom_nay: dt.date, timeout_s: float = 12.0, model: str | None = None) -> tuple[dict, float]:
    ds = ", ".join(f"{m.ma} ({m.ten})" for m in dm.DANH_MUC)
    he = HE_THONG_LLM.format(danh_muc=ds, hom_nay=hom_nay.isoformat(), thu=THU_VN[hom_nay.weekday()])
    return chat_json(he, f"Câu nói: \"{van_ban}\"", SCHEMA_LLM, timeout_s, model)


def _kq_tu_llm(d: dict) -> KetQua:
    kq = KetQua(che_do="llm")
    if not isinstance(d, dict):
        return kq
    for k in ("mat_hang", "loai", "luong_kg", "uoc_tinh", "co_con_kg", "ngay_giao", "hinh_thuc", "noi_giao",
              "gia_mong_muon", "gia_thap_nhat"):
        v = d.get(k)
        if v is None:
            continue
        if k == "mat_hang" and v == "NGOAI_DANH_MUC":
            _gan(kq, k, None, "llm", 0.7, "", "ngoai_pham_vi")
            continue
        # tự kiểm lược đồ (LLM chạy không ràng buộc ngữ pháp)
        sch = SCHEMA_LLM["properties"][k]
        if "enum" in sch and v not in sch["enum"]:
            continue
        if k in ("luong_kg", "gia_mong_muon", "gia_thap_nhat", "co_con_kg"):
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not 0 < v <= 10**10:
                continue
        if k in TRUONG_TIEN and not float(v).is_integer():
            continue
        if k == "ngay_giao":
            try: dt.date.fromisoformat(str(v))
            except (ValueError, TypeError): continue
        if k == "uoc_tinh" and not isinstance(v, bool):
            continue
        _gan(kq, k, v, "llm", 0.7, d.get(f"{k}_doan_goc") or d.get(k.split("_")[0] + "_doan_goc") or "")
    return kq


def _xac_minh_so(ten: str, gt: float, doan: str) -> bool:
    """Luật đọc lại đoạn gốc LLM chép ra phải ra đúng số LLM đưa."""
    if not doan:
        return False
    _, cum = tim_cum_so(doan)
    for c in cum:
        if ten == "luong_kg" and c.kieu != "luong": continue
        if ten == "co_con_kg" and c.kieu != "con": continue
        if ten in TRUONG_TIEN and c.kieu not in ("tien", "tron"): continue
        v = c.gia_tri
        if ten in TRUONG_TIEN:
            if c.kieu == "tron" and v < 1000:
                v *= 1000
            if c.tren_tan:
                v /= 1000
        if c.mo_ho and c.khoang:
            v = c.khoang[0]
        if abs(v - gt) < 0.5:
            return True
    return False


def ket_hop(luat: KetQua, llm: dict, van_ban: str = "", hom_nay: dt.date | None = None) -> KetQua:
    kq = KetQua(truong=dict(luat.truong), thieu=[], can_xac_nhan=list(luat.can_xac_nhan),
                canh_bao=list(luat.canh_bao), che_do="ket_hop")
    l2 = _kq_tu_llm(llm).truong
    for ten, g in l2.items():
        if ten == "uoc_tinh":
            continue
        # Bằng chứng phải có trong câu thật và được luật xác minh đúng NGỮ NGHĨA trường.
        # Không dùng số lượng làm giá, không chép giá mong muốn sang giá sàn.
        if ten == "ngay_giao":
            doan = llm.get("ngay_doan_goc")
        else:
            doan = g.doan_goc or llm.get(f"{ten}_doan_goc")
        if not isinstance(doan, str) or not doan.strip() or chuan_hoa(doan) not in chuan_hoa(van_ban):
            continue
        if ten in TRUONG_SO and ten != "ngay_giao" and not _xac_minh_so(ten, float(g.gia_tri), doan):
            continue
        bang_chung = trich_luat(doan, hom_nay or dt.date.today()).phang()
        if bang_chung.get(ten) != g.gia_tri:
            continue
        cu = kq.truong.get(ten)
        if cu is not None and cu.gia_tri is not None:
            if g.gia_tri == cu.gia_tri or (ten in TRUONG_SO and ten != "ngay_giao" and
                                            isinstance(g.gia_tri, (int, float)) and abs(float(g.gia_tri) - float(cu.gia_tri)) < 0.5):
                cu.nguon, cu.tin_cay = "luat+llm", cu.tin_cay
            elif ten in TRUONG_TIEN:
                # TIỀN lệch: không chọn bên nào, hỏi lại
                kq.truong.pop(ten)
                kq.canh_bao.append(f"Hai cách đọc {ten} khác nhau ({so_hien_thi(cu.gia_tri)} và {so_hien_thi(g.gia_tri)}): hỏi lại")
                kq.can_xac_nhan.append(ten)
            elif ten in TRUONG_SO:
                cu.ghi_chu = (cu.ghi_chu + f"; LLM đọc {g.gia_tri}").strip("; ")
                cu.tin_cay = min(cu.tin_cay, 0.6)
                kq.can_xac_nhan.append(ten)
            # trường chữ lệch: giữ luật (luật khớp cụm cụ thể), hạ tin cậy
            else:
                cu.tin_cay = min(cu.tin_cay, 0.7)
            continue
        if cu is not None and cu.gia_tri is None:
            continue  # luật đã nói ngoài phạm vi
        if ten in TRUONG_SO and ten != "ngay_giao":
            if _xac_minh_so(ten, float(g.gia_tri), g.doan_goc):
                g.nguon, g.tin_cay = "llm(xac_minh)", 0.7
                kq.truong[ten] = g
                kq.can_xac_nhan.append(ten)
            else:
                kq.canh_bao.append(f"LLM đưa {ten}={g.gia_tri} nhưng không xác minh được từ câu nói: bỏ, hỏi lại")
            continue
        if ten == "ngay_giao":
            try:
                dt.date.fromisoformat(str(g.gia_tri))
            except ValueError:
                continue
            g.tin_cay = 0.6
            kq.truong[ten] = g
            kq.can_xac_nhan.append(ten)
            continue
        g.tin_cay = 0.65
        kq.truong[ten] = g
        if ten in ("mat_hang", "loai"):
            kq.can_xac_nhan.append(ten)
    if "luong_kg" in kq.truong and "uoc_tinh" not in kq.truong:
        _gan(kq, "uoc_tinh", bool(llm.get("uoc_tinh")), "llm", 0.6)
    return kq


# ----------------------------------------------------------------------------- hội thoại

THU_TU = ["mat_hang", "luong_kg", "loai", "ngay_giao", "noi_giao", "gia_mong_muon"]


def hoan_thien(kq: KetQua, hom_nay: dt.date, xung_ho: str = "anh chị", da_co: dict | None = None) -> KetQua:
    """Gộp với trường đã có từ lượt trước, kiểm tra hợp lý, sinh câu hỏi tiếp và câu đọc lại."""
    if da_co:
        for k, v in da_co.items():
            if k not in kq.truong and k not in kq.can_xac_nhan and v is not None:
                kq.truong[k] = GiaTri(v, "luot_truoc", 0.9)
    f = kq.phang()
    mh = dm.THEO_MA.get(f.get("mat_hang") or "")
    # loại không bắt buộc với tôm (bảng cỡ), lúa (độ ẩm)
    can = list(THU_TU)
    if mh and mh.kieu_chat_luong == "bang_co":
        can[can.index("loai")] = "co_con_kg" if mh.ma == "TOM_THE" else "loai_skip"
    if mh and mh.kieu_chat_luong == "do_am":
        can[can.index("loai")] = "loai_skip"
    can = [c for c in can if c != "loai_skip"]
    kq.thieu = [c for c in can if f.get(c) is None]

    # hợp lý về tiền
    for ten in TRUONG_TIEN:
        g = kq.truong.get(ten)
        if g is None or g.gia_tri is None:
            continue
        if ten not in kq.can_xac_nhan:
            kq.can_xac_nhan.append(ten)  # TIỀN luôn phải đọc lại và người bán nói "đúng"
        if mh:
            ref = mh.gia_tham_khao_ao.get(f.get("loai") or "") or max(mh.gia_tham_khao_ao.values())
            if g.gia_tri < 0.3 * ref or g.gia_tri > 3 * ref:
                kq.canh_bao.append(f"{ten} {so_hien_thi(g.gia_tri)} đ/kg lệch xa mặt bằng: có thể nghe nhầm số")
                g.tin_cay = min(g.tin_cay, 0.4)
    gm, gs = f.get("gia_mong_muon"), f.get("gia_thap_nhat")
    if gm and gs and gs > gm:
        kq.canh_bao.append("Giá thấp nhất cao hơn giá mong muốn: hỏi lại")
        kq.can_xac_nhan += [x for x in TRUONG_TIEN if x not in kq.can_xac_nhan]
    if f.get("luong_kg") is not None and (f["luong_kg"] <= 0 or f["luong_kg"] > 500_000):
        kq.canh_bao.append("Lượng bất thường: hỏi lại")
        kq.can_xac_nhan.append("luong_kg")
    if f.get("ngay_giao"):
        d = dt.date.fromisoformat(f["ngay_giao"])
        if d < hom_nay:
            kq.canh_bao.append("Ngày giao đã qua: hỏi lại")
            kq.can_xac_nhan.append("ngay_giao")
        if mh and f.get("hinh_thuc") is None:
            _gan(kq, "hinh_thuc", "giao_ngay" if (d - hom_nay).days <= 3 else "dat_truoc_khi_hai", "mac_dinh", 0.5,
                 ghi="suy từ ngày, cần xác nhận")
    kq.can_xac_nhan = list(dict.fromkeys(kq.can_xac_nhan))
    kq.cau_hoi_tiep = cau_hoi(kq, mh, xung_ho)
    kq.cau_doc_lai = doc_lai(kq, mh, xung_ho) if kq.truong else ""
    return kq


def cau_hoi(kq: KetQua, mh: dm.MatHang | None, xh: str) -> str:
    f = kq.phang()
    if "mat_hang" in kq.truong and f.get("mat_hang") is None and kq.truong["mat_hang"].ghi_chu == "ngoai_pham_vi":
        return (f"Dạ mặt hàng này app chưa mở mua bán, {xh} vẫn ghi sổ được. "
                f"{xh.capitalize()} có bán xoài cát Chu, chanh không hạt, tôm thẻ hay lúa tươi không ạ?")
    if "mat_hang" in kq.can_xac_nhan and mh:
        return f"Dạ có phải {mh.ten.lower()} không ạ?"
    if kq.can_xac_nhan:
        ten = kq.can_xac_nhan[0]
        if ten in TRUONG_TIEN: return "Dạ anh chị nói lại riêng số tiền một ký để em xác nhận nhé."
        if ten == "ngay_giao": return "Dạ anh chị nói lại ngày dương lịch cụ thể giúp em."
    if not kq.thieu:
        return ""
    k = kq.thieu[0]
    ten = mh.ten.lower() if mh else "hàng"
    if k == "mat_hang":
        return f"Dạ {xh} muốn bán mặt hàng gì ạ?"
    if k == "luong_kg":
        return f"Dạ {ten} {xh} có khoảng bao nhiêu ký, hay bao nhiêu tấn ạ?"
    if k == "loai":
        if mh and mh.ma == "SAU_RIENG":
            return f"Dạ sầu riêng loại A, B hay C ạ? Hay {xh} nói trái nặng chừng mấy ký cũng được."
        return f"Dạ {ten} loại một, loại hai hay hàng dạt ạ? {xh.capitalize()} nói trái nặng chừng nhiêu gam cũng được."
    if k == "co_con_kg":
        return "Dạ tôm cỡ chừng bao nhiêu con một ký ạ?"
    if k == "ngay_giao":
        return f"Dạ ngày nào {xh} giao được ạ?"
    if k == "noi_giao":
        noi = "tại ao" if mh and mh.nhom == "thuy_san" else ("tại ruộng" if mh and mh.ma == "LUA_TUOI" else "tại vườn")
        return f"Dạ bên mua tới lấy {noi}, hay {xh} chở tới kho ạ?"
    if k == "gia_mong_muon":
        return f"Dạ {xh} muốn bán bao nhiêu tiền một ký ạ?"
    return ""


NOI = {"tai_vuon": "lấy tại vườn", "tai_ao": "lấy tại ao", "tai_ruong": "lấy tại ruộng",
       "giao_toi_kho": "người bán chở tới kho", "diem_gom": "giao ở điểm gom"}
HT = {"giao_ngay": "giao ngay", "dat_truoc_khi_hai": "đặt trước khi hái"}


def doc_lai(kq: KetQua, mh: dm.MatHang | None, xh: str) -> str:
    f = kq.phang()
    phan = ["Dạ em đọc lại cho " + xh + " nghe."]
    ten = mh.ten if mh else "hàng"
    loai = f.get("loai")
    if mh and loai:
        lo = dm.loai_theo_ma(mh, loai)
        ten += ", " + (lo.ten.lower() if lo else loai)
    if f.get("co_con_kg"):
        ten += f", cỡ {so_thanh_chu(f['co_con_kg'])} con một ký"
    phan.append(ten + ".")
    if f.get("luong_kg") is not None:
        phan.append(("Khoảng " if f.get("uoc_tinh") else "") + kg_thanh_loi(f["luong_kg"]) + ".")
    if f.get("ngay_giao"):
        d = dt.date.fromisoformat(f["ngay_giao"])
        phan.append(f"Giao ngày {so_thanh_chu(d.day)} tháng {so_thanh_chu(d.month)}"
                    + (f", {HT[f['hinh_thuc']]}" if f.get("hinh_thuc") else "") + ".")
    if f.get("noi_giao"):
        phan.append(NOI[f["noi_giao"]].capitalize() + ".")
    if f.get("gia_mong_muon"):
        phan.append(f"Giá mong muốn {so_thanh_chu(f['gia_mong_muon'])} đồng một ký.")
    if f.get("gia_thap_nhat"):
        phan.append(f"Giá thấp nhất {so_thanh_chu(f['gia_thap_nhat'])} đồng, giữ kín, bên mua không thấy.")
    phan.append(f"Đúng thì {xh} nói \"đúng rồi\". Sai chỗ nào {xh} nói chỗ đó, ví dụ \"sửa giá\". "
                "Em chỉ lưu nháp, chưa đăng.")
    return " ".join(phan)


# ----------------------------------------------------------------------------- điểm vào

def trich(van_ban: str, hom_nay: dt.date | None = None, che_do: str = "ket_hop", xung_ho: str = "anh chị",
          da_co: dict | None = None, timeout_llm_s: float = 12.0, model: str | None = None) -> KetQua:
    hom_nay = hom_nay or dt.datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()
    if che_do not in ("luat", "ket_hop", "llm"): raise ValueError("Chế độ không hợp lệ")
    luat = trich_luat(van_ban, hom_nay)
    if che_do == "luat":
        return hoan_thien(luat, hom_nay, xung_ho, da_co)
    try:
        d, ms = trich_llm(van_ban, hom_nay, timeout_llm_s, model)
    except LoiMoHinh as e:
        luat.che_do = "luat(llm_loi)"
        luat.loi_mo_hinh = str(e)
        return hoan_thien(luat, hom_nay, xung_ho, da_co)
    if che_do == "llm":
        kq = _kq_tu_llm(d)
    else:
        kq = ket_hop(luat, d, van_ban, hom_nay)
    kq.llm_ms = ms
    return hoan_thien(kq, hom_nay, xung_ho, da_co)


if __name__ == "__main__":  # thử nhanh
    import json
    import sys
    t0 = time.perf_counter()
    r = trich(" ".join(sys.argv[2:]), dt.date(2026, 10, 25), che_do=sys.argv[1])
    print(json.dumps(r.to_dict(), ensure_ascii=False, indent=1), f"{(time.perf_counter()-t0)*1000:.0f} ms")
