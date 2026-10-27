"""Đánh giá ghép cung cầu trên dữ liệu ảo của đặc tả (docs/nghiep-vu/du-lieu-ao.json).

Ba phần:
1. Tình huống có KẾT QUẢ MONG ĐỢI: TH-004 (lấy nguyên văn từ 09) + các tình huống người viết suy ra
   từ luật H1–H11 của 05 (ghi rõ "suy ra", không phải nhãn độc lập).
2. Thuộc tính bắt buộc: không lộ giá; đổi giá kín trong cùng nhóm không đổi thứ tự (không xếp theo giá);
   tất định; người bán mới không bị điểm 0.
3. Độ trễ đo thật với 10, 100, 1.000 lô.

GIẢ ĐỊNH (dữ liệu ảo không có tọa độ, thời điểm xác nhận còn hàng):
- Tọa độ lấy tâm xã/huyện gần đúng (bảng TOA_DO dưới), khoảng cách là đường chim bay.
- Mọi lô xác nhận còn hàng lúc 2026-11-01 08:00 +07; thời điểm ghép = đồng hồ nền 2026-11-02 08:00 +07.
- Nhu cầu có lô "sap_co_hang" trong cửa sổ được coi là "trước mùa" (truoc_mua=True), nếu không H3 loại hết
  sầu riêng, tôm, lúa trong dữ liệu nền.
- Có đối tác kiểm định DT-KD phủ ĐBSCL -> co_kiem_dinh_phu_vung=True.
"""
from __future__ import annotations

import copy
import json
import random
import statistics
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from agiviet_ai.ghep import ghep, ghep_nguoc
from agiviet_ai.mo_hinh import Lo, MatchRequest, NhuCau, ReverseMatchRequest

GOC = Path(__file__).resolve().parents[1]
DL = GOC.parent / "docs" / "nghiep-vu" / "du-lieu-ao.json"
VN = timezone(timedelta(hours=7))
LUC = datetime(2026, 11, 2, 8, 0, tzinfo=VN)
XAC_NHAN = datetime(2026, 11, 1, 8, 0, tzinfo=VN)

TOA_DO = {  # gần đúng, GIẢ ĐỊNH
    "Mỹ Xương": (10.405, 105.700), "Cai Lậy": (10.405, 106.110), "Bến Lức": (10.640, 106.490),
    "Mỏ Cày Nam": (10.110, 106.330), "Mỹ Xuyên": (9.560, 105.980), "Tháp Mười": (10.540, 105.840),
    "Chợ Gạo": (10.360, 106.460), "Châu Phú": (10.580, 105.200),
    "KCN Hiệp Phước": (10.620, 106.760), "Mỹ Tho": (10.360, 106.360), "Trà Nóc": (10.090, 105.720),
    "Cao Lãnh": (10.460, 105.630),
}


def toa(chuoi: str):
    for k, v in TOA_DO.items():
        if k in chuoi:
            return {"vi_do": v[0], "kinh_do": v[1]}
    raise KeyError(chuoi)


def nap():
    d = json.loads(DL.read_text())
    ban = {x["ma"]: x for x in d["to_chuc_ban"]}
    mua = {x["ma"]: x for x in d["to_chuc_mua"]}
    cap_da_mua = {(x["ban"], x["mua"]) for x in d["don_nen"] if x.get("trang_thai") == "hoan_tat"}
    return d, ban, mua, cap_da_mua


def lo_tu_json(x, ban, ben_mua=None, cap=frozenset(), **sua):
    tc = ban[x["ban"]]
    giay = []
    for g in tc.get("giay_to", []):
        ma = g["loai"]
        ds = [f"{ma}:{t}" for t in g.get("thi_truong", [])] or [ma]
        for m in ds:
            giay.append({"ma": m, "trang_thai": g["trang_thai"], "tu_ngay": "2026-01-01",
                         "den_ngay": g.get("hieu_luc_den", "2027-12-31")})
    han = date.fromisoformat(x["ngay_co_hang"]) + timedelta(days=10)
    v = dict(id=x["ma"], ben_ban_id=x["ban"], mat_hang=x["mat_hang"], dang="tuoi", loai=x["loai"],
             luong_khai_kg=x["luong_kg"], da_can=not x["uoc_tinh"], ngay_co_hang=x["ngay_co_hang"],
             han_su_dung=han.isoformat(), het_cach_ly=x.get("het_cach_ly"), vi_tri=toa(tc["dia_ban"]),
             giay_to=giay, gia_thap_nhat_kin=x["gia_thap_nhat_kin"] or 1, uy_tin=tc.get("uy_tin"),
             so_don_hoan_tat=tc.get("so_don_hoan_tat", 0),
             so_don_voi_ben_mua=1 if (x["ban"], ben_mua) in cap else 0,
             xac_nhan_luc=XAC_NHAN.isoformat(), trang_thai=x["trang_thai"],
             co_kiem_dinh_phu_vung=True, loai_nguoi_ban=tc["loai"] if tc["loai"] != "trang_trai" else "trang_trai",
             nguoi_ban_da_xac_minh=tc.get("xac_minh") == "da_xac_minh",
             diem_gom_id="ĐG-01" if "Mỹ Xương" in tc["dia_ban"] else None)
    v.update(sua)
    return Lo.model_validate(v)


def nc_tu_json(x, mua, dong=0, **sua):
    dg = x["dong"][dong]
    tc = mua[x["mua"]]
    v = dict(id=x["ma"] + (f"-{dong + 1}" if len(x["dong"]) > 1 else ""), ben_mua_id=x["mua"],
             phan_khuc=tc["phan_khuc"][0], mat_hang=dg["mat_hang"], dang="tuoi", loai=dg["loai"],
             luong_kg=dg["kg"], toi_thieu_nguon_kg=dg.get("kg_toi_thieu_moi_nguon"),
             ngay_tu=x["cua_so"][0], ngay_den=x["cua_so"][1],
             vi_tri=toa(tc["dia_chi_nhan"]), giay_to_bat_buoc=x["giay_to_bat_buoc"],
             gia_toi_da_kin=dg["gia_toi_da_kin"], truoc_mua=date.fromisoformat(x["cua_so"][0]) > LUC.date(),
             can_gom=x["dang"] == "can_gom", kenh="kem_loai" if any(l in ("L2", "L3") for l in dg["loai"]) else "thuong",
             kieu_giao="giao_toi" if x["kieu_giao"] in ("tai_kho_ben_mua",) else "tu_lay")
    v.update(sua)
    return NhuCau.model_validate(v)


def chay(nc, cac_lo):
    return ghep(MatchRequest(nhu_cau=nc, lo=cac_lo, thoi_diem=LUC, phien_ban_du_lieu="du-lieu-ao-2026-10-25"),
                noi_bo=True)


def nhom_cua(kq):
    ra = {}
    for g in ("khop_du", "khop_mot_phan", "gan_khop_gia"):
        for x in kq[g]:
            ra[x["lo_id"]] = g
    return ra


def tinh_huong():
    d, ban, mua, cap = nap()
    lo_json = {x["ma"]: x for x in d["lo"]}
    nc_json = {x["ma"]: x for x in d["nhu_cau"]}

    def cac_lo(ben_mua, extra=None, **sua_theo_lo):
        ds = []
        for x in d["lo"]:
            if x["trang_thai"] == "nhap":
                continue
            ds.append(lo_tu_json(x, ban, ben_mua, cap, **sua_theo_lo.get(x["ma"], {})))
        if extra:
            ds += extra
        return ds

    ths = []
    # TH-004: lấy nguyên văn mong đợi trong 09 (thêm L-0432 cô Hai, P_min 25.800)
    l432 = lo_tu_json(dict(lo_json["L-0431"], ma="L-0432", luong_kg=2000, gia_thap_nhat_kin=25800), ban, "TC-M01", cap)
    ths.append(dict(ma="TH-004 (09, nguyên văn)", nguon="09-tinh-huong-kiem-thu.md",
                    nc=nc_tu_json(nc_json["NC-3001"], mua), lo=cac_lo("TC-M01", [l432]),
                    mong={"L-0412": "khop_du", "L-0414": "khop_du", "L-0420": "khop_mot_phan",
                          "L-0430": "khop_mot_phan", "L-0431": "khop_mot_phan", "L-0432": "gan_khop_gia",
                          "L-0413": None}))
    ths.append(dict(ma="NC-3008 thiếu 500 kg (10, suy ra)", nguon="10 mục 6 + luật 05",
                    nc=nc_tu_json(nc_json["NC-3008"], mua), lo=cac_lo("TC-M01"),
                    mong={"L-0412": "khop_du", "L-0414": "khop_mot_phan", "L-0420": "khop_mot_phan",
                          "L-0430": "khop_mot_phan", "L-0431": "khop_mot_phan", "L-0413": None}))
    ths.append(dict(ma="NC-3002 dòng L2 kém loại, giao tới kho (suy ra)", nguon="luật 05",
                    nc=nc_tu_json(nc_json["NC-3002"], mua, 0), lo=cac_lo("TC-M01"),
                    mong={"L-0413": "khop_mot_phan", "L-0412": None, "L-0451": None}))
    ths.append(dict(ma="NC-3003 sầu riêng xuất khẩu cần gom (suy ra; 09 nêu 6 nguồn)", nguon="09 TH đơn nhóm + luật 05",
                    nc=nc_tu_json(nc_json["NC-3003"], mua), lo=cac_lo("TC-M02"),
                    mong={k: "khop_mot_phan" for k in ["L-0440", "L-0441", "L-0442", "L-0443", "L-0444", "L-0445", "L-0447"]},
                    mong_gom_so_nguon=6))
    ths.append(dict(ma="NC-3004 tôm xuất khẩu (suy ra)", nguon="luật 05",
                    nc=nc_tu_json(nc_json["NC-3004"], mua), lo=cac_lo("TC-M03"),
                    mong={"L-0470": "khop_mot_phan"}))
    ths.append(dict(ma="NC-3005 bưởi (suy ra)", nguon="luật 05", nc=nc_tu_json(nc_json["NC-3005"], mua),
                    lo=cac_lo("TC-M07"), mong={"L-0460": "khop_du"}))
    ths.append(dict(ma="NC-3006 lúa ước tính (suy ra)", nguon="luật 05", nc=nc_tu_json(nc_json["NC-3006"], mua),
                    lo=cac_lo("TC-M08"), mong={"L-0480": "khop_mot_phan"}))
    ths.append(dict(ma="NC-3007 200 kg điểm gom (suy ra)", nguon="luật 05", nc=nc_tu_json(nc_json["NC-3007"], mua),
                    lo=cac_lo("TC-M07"),
                    mong={"L-0412": "khop_du", "L-0420": "khop_du", "L-0430": "khop_du", "L-0431": "khop_du",
                          "L-0414": "khop_mot_phan"}))
    # Tình huống biên (sửa một trường để kích đúng một luật)
    nc1 = nc_tu_json(nc_json["NC-3001"], mua)
    bien = [
        ("H3 khóa an toàn", "L-0412", dict(khoa_an_toan=True)),
        ("H5 chưa hết cách ly", "L-0420", dict(het_cach_ly="2026-11-10")),
        ("H9 cùng tổ chức (vựa hai vai)", "L-0430", dict(ben_ban_id="TC-M01")),
        ("H11 giá kín quá xa", "L-0431", dict(gia_thap_nhat_kin=26500)),
        ("CG-02 quá 14 ngày chưa xác nhận", "L-0420", dict(xac_nhan_luc="2026-10-15T08:00:00+07:00")),
        ("H6 ngoài bán kính", "L-0430", dict(vi_tri={"vi_do": 9.18, "kinh_do": 105.15})),
        ("H2 sai loại", "L-0431", dict(loai="L2")),
    ]
    for ten, ma, sua in bien:
        ths.append(dict(ma=f"Biên: {ten}", nguon="luật 05", nc=nc1, lo=cac_lo("TC-M01", **{ma: sua}), mong={ma: None}))
    # Nhà hàng chỉ mua qua đầu mối (02 mục 2.2)
    nc_nh = NhuCau.model_validate({**nc1.model_dump(), **dict(id="NC-NH", ben_mua_id="TC-M05", phan_khuc="nha_hang",
                                                              luong_kg=30, vi_tri=toa("Cao Lãnh"))})
    htx = lo_tu_json(dict(lo_json["L-0431"], ma="L-HTX", ban="TC-B03"), ban, "TC-M05", cap)
    ths.append(dict(ma="Nhà hàng: chỉ HTX/vựa đã xác minh", nguon="02 mục 2.2", nc=nc_nh, lo=cac_lo("TC-M05", [htx]),
                    mong={"L-HTX": "khop_du", "L-0412": None, "L-0420": None}))
    return ths, d, ban, mua, cap


def main():
    ths, d, ban, mua, cap = tinh_huong()
    bao_cao = {"tinh_huong": [], "thuoc_tinh": {}, "do_tre_ms": {}}
    dung = tong = 0
    for t in ths:
        kq = chay(t["nc"], t["lo"])
        nh = nhom_cua(kq)
        sai = []
        for ma, mong in t["mong"].items():
            tong += 1
            if nh.get(ma) == mong:
                dung += 1
            else:
                sai.append({"lo": ma, "mong": mong, "thuc": nh.get(ma)})
        if "mong_gom_so_nguon" in t:
            tong += 1
            so = len(kq["goi_y_gom"]["nguon"]) if kq["goi_y_gom"] else 0
            if so == t["mong_gom_so_nguon"]:
                dung += 1
            else:
                sai.append({"gom_so_nguon": so, "mong": t["mong_gom_so_nguon"]})
        bao_cao["tinh_huong"].append({"ma": t["ma"], "nguon": t["nguon"], "sai": sai,
                                      "thu_tu": {g: [(x["lo_id"], x["diem"]) for x in kq[g]] for g in ("khop_du", "khop_mot_phan", "gan_khop_gia")},
                                      "goi_y_gom": kq["goi_y_gom"], "loai_bo": kq["_loai_bo"]["theo_ma"]})
        print(("OK  " if not sai else "SAI ") + t["ma"], sai or "")
    bao_cao["ty_le_khop_mong_doi"] = f"{dung}/{tong}"
    print(f"Khớp mong đợi: {dung}/{tong}")

    # Thuộc tính 1: không lộ giá (khóa hoặc giá trị)
    lo_ra = 0
    for t in ths:
        kq = chay(t["nc"], t["lo"]); kq.pop("_loai_bo")
        s = json.dumps(kq, ensure_ascii=False)
        gia = {str(x.gia_thap_nhat_kin) for x in t["lo"]} | {str(t["nc"].gia_toi_da_kin)}
        if "gia_thap_nhat" in s or "gia_toi_da" in s or any(f'"{g}"' in s or f": {g}," in s or f": {g}}}" in s for g in gia):
            lo_ra += 1
    bao_cao["thuoc_tinh"]["lo_gia_trong_dau_ra"] = lo_ra
    # Thuộc tính 2: đổi P_min ngẫu nhiên trong cùng nhóm -> thứ tự trong nhóm không đổi
    rng = random.Random(7)
    doi = 0; lan = 300
    t0 = ths[0]
    goc = chay(t0["nc"], t0["lo"])
    for _ in range(lan):
        ds = []
        for x in t0["lo"]:
            pmax = t0["nc"].gia_toi_da_kin
            if x.gia_thap_nhat_kin * 100 <= pmax * 105:  # đang trong nhóm khớp: đổi trong [50%, 105%] P_max
                ds.append(x.model_copy(update={"gia_thap_nhat_kin": rng.randint(pmax // 2, pmax * 105 // 100)}))
            else:
                ds.append(x)
        kq = chay(t0["nc"], ds)
        for g in ("khop_du", "khop_mot_phan"):
            if [x["lo_id"] for x in kq[g]] != [x["lo_id"] for x in goc[g]]:
                doi += 1
                break
    bao_cao["thuoc_tinh"]["doi_thu_tu_khi_doi_gia_kin"] = f"{doi}/{lan}"
    # Thuộc tính 3: tất định
    bao_cao["thuoc_tinh"]["tat_dinh"] = all(chay(t["nc"], t["lo"]) == chay(t["nc"], t["lo"]) for t in ths)
    # Thuộc tính 4: người bán mới (Út Lan, 0 đơn) có điểm uy tín mặc định 15, không 0
    kq = chay(ths[0]["nc"], ths[0]["lo"])
    ut = [x for g in ("khop_du", "khop_mot_phan") for x in kq[g] if x["lo_id"] == "L-0430"]
    bao_cao["thuoc_tinh"]["diem_uy_tin_nguoi_moi"] = ut[0]["diem_thanh_phan"]["uy_tin"] if ut else None
    # Chiều người bán (05 mục 2.6): lô L-0412 thấy NC-3001, NC-3008
    lo412 = lo_tu_json({x["ma"]: x for x in d["lo"]}["L-0412"], ban, "TC-M01", cap)
    ncs = [nc_tu_json(x, mua, i) for x in d["nhu_cau"] for i in range(len(x["dong"]))]
    ng = ghep_nguoc(ReverseMatchRequest(lo=lo412, nhu_cau=ncs, thoi_diem=LUC, phien_ban_du_lieu="du-lieu-ao"))
    bao_cao["thuoc_tinh"]["chieu_nguoi_ban_L0412"] = [x["nhu_cau_id"] for x in ng["nhu_cau_khop"]]
    bao_cao["thuoc_tinh"]["chieu_nguoi_ban_khong_lo_gia"] = "gia_toi_da" not in json.dumps(ng)
    print("Thuộc tính:", bao_cao["thuoc_tinh"])

    # Độ trễ: nhân bản lô xoài với tọa độ lệch ngẫu nhiên
    mau = ths[0]["lo"]
    for n in (10, 100, 1000):
        ds = []
        for i in range(n):
            x = mau[i % len(mau)]
            ds.append(x.model_copy(update={"id": f"S-{i:05d}", "vi_tri": x.vi_tri.model_copy(
                update={"vi_do": x.vi_tri.vi_do + rng.uniform(-.3, .3)})}))
        tg = []
        for _ in range(20):
            a = time.perf_counter(); chay(ths[0]["nc"], ds); tg.append((time.perf_counter() - a) * 1000)
        bao_cao["do_tre_ms"][str(n)] = {"trung_vi": round(statistics.median(tg), 2), "lon_nhat": round(max(tg), 2)}
    print("Độ trễ:", bao_cao["do_tre_ms"])
    (GOC / "ket_qua" / "ghep.json").write_text(json.dumps(bao_cao, ensure_ascii=False, indent=1, default=str))


if __name__ == "__main__":
    main()
