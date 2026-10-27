"""Đánh giá trích xuất trường trên du_lieu/cau_noi_mau.jsonl.

Mỗi trường của mỗi câu được xếp 1 trong 4:
- dung      : đúng (kể cả cùng để trống)
- bo_sot    : nhãn có giá trị, hệ thống để trống -> hệ thống sẽ HỎI LẠI (an toàn, tốn một lượt nói)
- sai       : hệ thống đưa giá trị khác nhãn -> NGUY HIỂM nếu người bán không nghe kỹ lúc đọc lại
- bia       : nhãn trống, hệ thống tự đưa giá trị

Chạy: .venv/bin/python -m danh_gia.danh_gia_trich_xuat [luat|llm|ket_hop ...]
"""
from __future__ import annotations

import datetime as dt
import json
import statistics
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

from agiviet_ai.trich_xuat import trich

GOC = Path(__file__).resolve().parents[1]
TRUONG = ["mat_hang", "loai", "luong_kg", "uoc_tinh", "co_con_kg", "ngay_giao", "hinh_thuc", "noi_giao",
          "gia_mong_muon", "gia_thap_nhat"]
TIEN = {"gia_mong_muon", "gia_thap_nhat"}


def so_sanh(ten: str, dung, du, nguon: str | None) -> str:
    if ten == "hinh_thuc" and nguon == "mac_dinh":
        du = None  # suy mặc định từ ngày không tính là trích
    if ten == "uoc_tinh" and dung is None:
        return "bo_qua"
    if isinstance(dung, str) and dung.startswith("UOC:"):
        if du is None:
            return "dung"
        a, b = dung[4:].split("..")
        return "dung" if a <= du <= b else "sai"
    if dung is None and du is None:
        return "dung"
    if dung is None:
        return "bia"
    if du is None:
        return "bo_sot"
    if isinstance(dung, (int, float)) and not isinstance(dung, bool) and isinstance(du, (int, float)):
        return "dung" if abs(float(dung) - float(du)) < 0.5 else "sai"
    return "dung" if dung == du else "sai"


def chay(che_do: str, cau: list[dict]) -> dict:
    dem = defaultdict(Counter)
    tg: list[float] = []
    loi_mh = 0
    chi_tiet = []
    tien_sai_khong_canh_bao = 0
    for c in cau:
        hn = dt.date.fromisoformat(c["hom_nay"])
        t0 = time.perf_counter()
        kq = trich(c["van_ban"], hn, che_do=che_do)
        tg.append((time.perf_counter() - t0) * 1000)
        if kq.loi_mo_hinh:
            loi_mh += 1
        ph = kq.phang()
        dong = {"id": c["id"], "van_ban": c["van_ban"], "loi": {}}
        for t in TRUONG:
            g = kq.truong.get(t)
            kqss = so_sanh(t, c["dung"].get(t), ph.get(t), g.nguon if g else None)
            if kqss == "bo_qua":
                continue
            dem[t][kqss] += 1
            if kqss != "dung":
                dong["loi"][t] = {"loai_loi": kqss, "dung": c["dung"].get(t), "he_thong": ph.get(t),
                                  "nguon": g.nguon if g else None}
                if t in TIEN and kqss in ("sai", "bia") and t not in kq.can_xac_nhan:
                    tien_sai_khong_canh_bao += 1
        dong["cau_hoi_tiep"] = kq.cau_hoi_tiep
        dong["canh_bao"] = kq.canh_bao
        chi_tiet.append(dong)
    tong = Counter()
    for t in dem:
        tong.update(dem[t])
    n = sum(tong.values())
    return {
        "che_do": che_do,
        "so_cau": len(cau),
        "so_o_truong": n,
        "ty_le_dung": round(tong["dung"] / n, 4),
        "dem_tong": dict(tong),
        "theo_truong": {t: {**dict(dem[t]), "ty_le_dung": round(dem[t]["dung"] / sum(dem[t].values()), 3)} for t in TRUONG if dem[t]},
        "cau_dung_het": sum(1 for d in chi_tiet if not d["loi"]),
        "tien_sai_hoac_bia": sum(dem[t]["sai"] + dem[t]["bia"] for t in TIEN),
        "tien_sai_khong_bat_xac_nhan": tien_sai_khong_canh_bao,
        "do_tre_ms": {"trung_vi": round(statistics.median(tg), 1), "p95": round(sorted(tg)[int(0.95 * (len(tg) - 1))], 1),
                      "lon_nhat": round(max(tg), 1)},
        "loi_mo_hinh": loi_mh,
        "chi_tiet_loi": [d for d in chi_tiet if d["loi"]],
    }


def main() -> None:
    cac_che_do = sys.argv[1:] or ["luat", "ket_hop", "llm"]
    import os
    tap = os.environ.get("AGV_TAP", "cau_noi_mau")  # cau_noi_mau (52 câu, đã dùng để chỉnh) | cau_noi_doc_lap (25 câu)
    cau = [json.loads(x) for x in (GOC / "du_lieu" / f"{tap}.jsonl").read_text().splitlines() if x.strip()]
    ra = {}
    for cd in cac_che_do:
        r = chay(cd, cau)
        ra[cd] = r
        print(f"== {cd}: đúng {r['ty_le_dung']*100:.1f}% ô trường ({r['dem_tong']}), câu đúng hết {r['cau_dung_het']}/{r['so_cau']}, "
              f"tiền sai/bịa {r['tien_sai_hoac_bia']} (không bắt xác nhận: {r['tien_sai_khong_bat_xac_nhan']}), "
              f"trễ trung vị {r['do_tre_ms']['trung_vi']} ms p95 {r['do_tre_ms']['p95']} ms, lỗi mô hình {r['loi_mo_hinh']}")
        for t, v in r["theo_truong"].items():
            print(f"   {t:15s} {v}")
    out = GOC / "ket_qua" / ("trich_xuat.json" if tap == "cau_noi_mau" else f"trich_xuat_{tap}.json")
    out.parent.mkdir(exist_ok=True)
    cu = json.loads(out.read_text()) if out.exists() else {}
    cu.update(ra)
    cu["_do_luc"] = dt.datetime.now().isoformat(timespec="seconds")
    out.write_text(json.dumps(cu, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
