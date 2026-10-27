"""Đánh giá giá tham khảo, bất thường, quét liên lạc, tóm tắt hợp đồng, và thử dịch vụ HTTP đầu-cuối.

Chạy: .venv/bin/python -m danh_gia.danh_gia_khac
"""
from __future__ import annotations

import json
import re
import statistics
import time
from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from agiviet_ai.dich_vu import app
from agiviet_ai.gia_va_rui_ro import bat_thuong, tham_khao, tom_tat
from agiviet_ai.lien_lac import quet
from agiviet_ai.mo_hinh import BatThuongRequest, GiaRequest, TomTatRequest
from danh_gia.danh_gia_ghep import LUC, chay, tinh_huong

GOC = Path(__file__).resolve().parents[1]
DL = json.loads((GOC.parent / "docs/nghiep-vu/du-lieu-ao.json").read_text())


def don_gia(extra=()):
    ds = []
    for x in DL["don_nen"]:
        ds.append(dict(id=x["ma"], ben_ban_id=x["ban"], ben_mua_id=x["mua"], mat_hang=x["mat_hang"], loai=x["loai"],
                       vung="DT", ngay_chot=x["chot_ngay"], gia_vnd_kg=x["gia"],
                       cap_bi_danh_dau=bool(x.get("loai_khoi_gia_tham_khao"))))
    return ds + list(extra)


def main():
    out = {}
    # 1. Giá tham khảo: 10 mục 7 nói trung vị 25.000 từ 14 đơn
    r = tham_khao(GiaRequest(mat_hang="XOAI_CAT_CHU", loai="L1", vung="DT", ngay=date(2026, 11, 2), don=don_gia()))
    out["gia_tham_khao_xoai_L1"] = {k: r[k] for k in ("gia_vnd_kg", "khoang_vnd_kg", "so_don", "so_cap", "do_tin_cay", "trang_thai")}
    out["gia_tham_khao_dung_dac_ta"] = r["gia_vnd_kg"] == 25000 and r["so_don"] == 14
    # Tấn công kéo giá: một cặp thêm 5 đơn rẻ 12.000 (không bị đánh dấu) -> trung vị dịch bao nhiêu?
    re_ = [dict(id=f"X-{i}", ben_ban_id="TC-B09", ben_mua_id="TC-M09", mat_hang="XOAI_CAT_CHU", loai="L1", vung="DT",
                ngay_chot="2026-10-30", gia_vnd_kg=12000) for i in range(5)]
    r2 = tham_khao(GiaRequest(mat_hang="XOAI_CAT_CHU", loai="L1", vung="DT", ngay=date(2026, 11, 2), don=don_gia(re_)))
    out["keo_gia_5_don_re_mot_cap"] = {"gia": r2["gia_vnd_kg"], "so_don": r2["so_don"]}
    # Khi 5 đơn đó đã gắn cờ giá bất thường (KT-03) thì bị loại khỏi P_tk (Q18)
    for x in re_:
        x["gia_bat_thuong"] = True
    r3 = tham_khao(GiaRequest(mat_hang="XOAI_CAT_CHU", loai="L1", vung="DT", ngay=date(2026, 11, 2), don=don_gia(re_)))
    out["keo_gia_khi_da_gan_co"] = r3["gia_vnd_kg"]
    r4 = tham_khao(GiaRequest(mat_hang="XOAI_CAT_CHU", loai="L2", vung="DT", ngay=date(2026, 11, 2), don=don_gia()))
    out["thieu_du_lieu_L2"] = r4["trang_thai"]

    # 2. Bất thường: cặp lặp giá < 60% (KT-04), chia nhỏ (KT-06)
    gd = []
    for i in range(3):
        gd.append(dict(id=f"G{i}", ben_ban_id="B1", ben_mua_id="M1", lo_id="L1", ngay=f"2026-10-{20 + i}",
                       gia_vnd_kg=14000, tham_khao_vnd_kg=25000, gia_tri_vnd=14000000))
    for i in range(3):
        gd.append(dict(id=f"S{i}", ben_ban_id="B2", ben_mua_id="M2", lo_id="L2", ngay=f"2026-10-2{7 + i}",
                       gia_vnd_kg=24000, tham_khao_vnd_kg=25000, gia_tri_vnd=2400000))
    gd.append(dict(id="N1", ben_ban_id="B3", ben_mua_id="M3", lo_id="L3", ngay="2026-10-28",
                   gia_vnd_kg=19000, tham_khao_vnd_kg=25000, gia_tri_vnd=19000000))
    b = bat_thuong(BatThuongRequest(ngay=date(2026, 11, 1), giao_dich=gd))
    out["bat_thuong_ma"] = sorted({c["ma"] for c in b["canh_bao"]})
    out["bat_thuong_khong_tu_khoa"] = b["tu_khoa_tai_khoan"] is False

    # 3. Quét liên lạc: câu tự viết, nhãn tay (True = phải che)
    mau = [
        ("Anh gọi em số 0918 000 421 nha", True), ("Kết bạn zalo em đi anh", True),
        ("không chín một tám không không không bốn hai một gọi em", True),
        ("09.18.00.04.21", True), ("stk agribank 7300000002186 chủ Nguyễn Thị Năm", True),
        ("giá 25.000 đ một ký được không", False), ("em có 2500 ký xoài loại một", False),
        ("hai mươi lăm nghìn một ký nha anh", False), ("mai năm giờ sáng em bốc hàng", False),
        ("ck riêng cho em đỡ phí", True), ("tổng 1.250.000 đồng", False), ("+84 918 000 421", True),
    ]
    dung = 0; sai = []
    for tin, phai_che in mau:
        r = quet(tin)
        co = bool(r["can_che"]) or any(p["loai"] == "lach_coc" for p in r["phat_hien"])
        dung += co == phai_che
        if co != phai_che:
            sai.append(tin)
    out["quet_lien_lac"] = {"dung": f"{dung}/{len(mau)}", "sai": sai}

    # 4. Tóm tắt hợp đồng: mọi con số trong lời tóm tắt phải có trong đầu vào
    tt = TomTatRequest(hop_dong_id="HĐ-2001", phien_ban=1, ma_bam="a" * 64, mat_hang="XOAI_CAT_CHU", loai="L1",
                       luong_kg=2000, gia_vnd_kg=23000, coc_vnd=15000000, han_coc="2026-11-02T20:00:00+07:00",
                       ngay_giao="2026-11-04", diem_nghiem_thu="vườn chị Năm, Mỹ Xương",
                       cach_tra_con_lai="trả thẳng trước khi bốc", dieu_khoan_ha_cap="loại 2 giá 15.000 đồng một ký")
    t = tom_tat(tt)
    so_vao = set(re.findall(r"\d[\d.]*", json.dumps(tt.model_dump(mode="json"), ensure_ascii=False)))
    so_vao |= {x.replace(".", "") for x in so_vao}
    so_ra = set(re.findall(r"\d[\d./:]*", " ".join(d["noi_dung"] for d in t["dong"])))
    la = [s for s in so_ra if s.replace(".", "") not in so_vao and not re.fullmatch(r"[\d/:]+", s)]
    out["tom_tat_so_khong_co_trong_dau_vao"] = la
    out["tom_tat_mau"] = [d.get("loi_doc", d["noi_dung"]) for d in t["dong"]]

    # 5. Dịch vụ HTTP đầu-cuối (TestClient, cùng tiến trình)
    c = TestClient(app)
    ths = tinh_huong()[0]
    body = {"nhu_cau": json.loads(ths[0]["nc"].model_dump_json()), "lo": [json.loads(x.model_dump_json()) for x in ths[0]["lo"]],
            "thoi_diem": LUC.isoformat(), "phien_ban_du_lieu": "du-lieu-ao"}
    tg = []
    for _ in range(30):
        a = time.perf_counter(); resp = c.post("/match", json=body); tg.append((time.perf_counter() - a) * 1000)
    out["http_match"] = {"status": resp.status_code, "trung_vi_ms": round(statistics.median(tg), 2),
                         "khop_du": [x["lo_id"] for x in resp.json()["khop_du"]],
                         "khong_lo_gia": "21500" not in resp.text and "24000" not in resp.text}
    tg = []
    for _ in range(30):
        a = time.perf_counter()
        resp = c.post("/voice/extract", json={"van_ban": "hai tấn rưỡi xoài cát chu loại một mai giao giá hai lăm", "hom_nay": "2026-10-25"})
        tg.append((time.perf_counter() - a) * 1000)
    out["http_voice_luat"] = {"status": resp.status_code, "trung_vi_ms": round(statistics.median(tg), 2),
                              "gia": resp.json()["truong"].get("gia_mong_muon", {}).get("gia_tri")}
    a = time.perf_counter()
    resp = c.post("/voice/extract", json={"van_ban": "hai tấn rưỡi xoài cát chu loại một mai giao giá hai lăm",
                                          "hom_nay": "2026-10-25", "che_do": "ket_hop", "timeout_llm_s": 0.05})
    out["http_voice_llm_qua_han_roi_ve_luat"] = {"status": resp.status_code, "che_do": resp.json()["che_do"],
                                                  "ms": round((time.perf_counter() - a) * 1000, 1)}
    resp = c.post("/match", json={**body, "lo": body["lo"] + [body["lo"][0]]})
    out["http_dau_vao_sai_khong_lo_du_lieu"] = {"status": resp.status_code, "co_gia_trong_loi": "21500" in resp.text}
    print(json.dumps(out, ensure_ascii=False, indent=1))
    (GOC / "ket_qua" / "khac.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
