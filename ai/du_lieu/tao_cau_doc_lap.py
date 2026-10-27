"""Tập KIỂM TRA ĐỘC LẬP 25 câu: viết SAU khi đã chỉnh luật trên 52 câu mẫu, chạy MỘT lần, không chỉnh
luật theo kết quả (để đo khả năng tổng quát thật). Ngày gốc 2026-10-25 (chủ nhật).
"""
import json
from pathlib import Path

X = "XOAI_CAT_CHU"; C = "CHANH_KHONG_HAT"; T = "TOM_THE"; L = "LUA_TUOI"
S = "SAU_RIENG"; B = "BUOI_DA_XANH"; TL = "THANH_LONG"; CT = "CA_TRA"
ROWS = [
    ("Nhà tui còn chừng sáu tạ chanh không hạt loại một, thứ hai tuần sau giao được, mười ba ngàn rưỡi",
     dict(mat_hang=C, loai="L1", luong_kg=600, uoc_tinh=True, ngay_giao="UOC:2026-10-26..2026-11-02", gia_mong_muon=13500)),
    ("Tôm thẻ ao nhà em cỡ sáu lăm con, khoảng bảy tạ, bữa mốt bắt, giá chín lăm ngàn",
     dict(mat_hang=T, luong_kg=700, uoc_tinh=True, co_con_kg=65, ngay_giao="2026-10-27", gia_mong_muon=95000)),
    ("bán bốn tấn rưỡi lúa tươi đài thơm tám, ngày ba mốt tháng mười gặt, giá sáu ngàn chín",
     dict(mat_hang=L, luong_kg=4500, uoc_tinh=False, ngay_giao="2026-10-31", gia_mong_muon=6900)),
    ("Sầu riêng Monthong loại B chừng một tấn hai, có sẵn, giá sáu mươi ngàn, thấp nhất năm lăm",
     dict(mat_hang=S, loai="B", luong_kg=1200, uoc_tinh=True, hinh_thuc="giao_ngay", gia_mong_muon=60000, gia_thap_nhat=55000)),
    ("Xoài cát Chu hàng dạt bán gấp ba tạ, ba ngàn rưỡi một ký",
     dict(mat_hang=X, loai="L3", luong_kg=300, uoc_tinh=False, hinh_thuc="giao_ngay", gia_mong_muon=3500)),
    ("Thanh long ruột trắng loại hai tám tấn, cuối tuần giao, giá tám ngàn",
     dict(mat_hang=TL, loai="L2", luong_kg=8000, uoc_tinh=False, ngay_giao="UOC:2026-10-31..2026-11-01", gia_mong_muon=8000)),
    ("Có hai chục tấn cá tra, tháng sau mới xổ, giá ba mốt ngàn",
     dict(mat_hang=CT, luong_kg=20000, uoc_tinh=False, hinh_thuc="dat_truoc_khi_hai", gia_mong_muon=31000)),
    ("Bưởi da xanh loại một, trái chừng một ký tư, một tấn rưỡi, giá ba lăm ngàn, chở tới chợ đầu mối",
     dict(mat_hang=B, loai="L1", luong_kg=1500, uoc_tinh=False, noi_giao="giao_toi_kho", gia_mong_muon=35000)),
    ("Dạ chanh không hạt loại hai năm trăm ký mai giao chín ngàn",
     dict(mat_hang=C, loai="L2", luong_kg=500, uoc_tinh=False, ngay_giao="2026-10-26", gia_mong_muon=9000)),
    ("Tui bán ba tấn xoài cát chu loại một giá hai bốn thấp nhất hai hai ngày hai chín giao",
     dict(mat_hang=X, loai="L1", luong_kg=3000, uoc_tinh=False, ngay_giao="2026-10-29", gia_mong_muon=24000, gia_thap_nhat=22000)),
    ("Lúa OM 5451 mười tám tấn, độ ẩm hai sáu phần trăm, lấy tại ruộng, giá sáu ngàn năm trăm",
     dict(mat_hang=L, luong_kg=18000, uoc_tinh=False, noi_giao="tai_ruong", gia_mong_muon=6500)),
    ("Có một tấn tôm thẻ size năm mươi, bắt liền, trăm mốt một ký",
     dict(mat_hang=T, luong_kg=1000, uoc_tinh=False, co_con_kg=50, hinh_thuc="giao_ngay", gia_mong_muon=110000)),
    ("Sầu riêng Ri6 hàng A, ba tấn, đặt trước, ngày mười lăm tháng mười một cắt, giá bảy mươi hai ngàn",
     dict(mat_hang=S, loai="A", luong_kg=3000, uoc_tinh=False, hinh_thuc="dat_truoc_khi_hai", ngay_giao="2026-11-15", gia_mong_muon=72000)),
    ("Bán năm chục ký bưởi da xanh loại hai cho quán, giá hai mươi ngàn",
     dict(mat_hang=B, loai="L2", luong_kg=50, uoc_tinh=False, gia_mong_muon=20000)),
    ("Thanh long ruột đỏ loại một ba tấn rưỡi, giao tại vườn, giá mười chín ngàn, dưới mười bảy là không bán",
     dict(mat_hang=TL, loai="L1", luong_kg=3500, uoc_tinh=False, noi_giao="tai_vuon", gia_mong_muon=19000, gia_thap_nhat=17000)),
    ("Chanh không hạt dạt hai tấn, ai lấy làm nước cốt thì năm ngàn",
     dict(mat_hang=C, loai="L3", luong_kg=2000, uoc_tinh=False, gia_mong_muon=5000)),
    ("Tui có chừng hai tấn rưỡi tôm, chưa tới lứa, chừng mười ngày nữa bắt",
     dict(mat_hang=T, luong_kg=2500, uoc_tinh=True, hinh_thuc="dat_truoc_khi_hai", ngay_giao="UOC:2026-11-03..2026-11-05")),
    ("Xoài cát chu loại hai, một tấn tám, giá mười bốn ngàn, chở tới kho nhà máy",
     dict(mat_hang=X, loai="L2", luong_kg=1800, uoc_tinh=False, noi_giao="giao_toi_kho", gia_mong_muon=14000)),
    ("Bán khoai lang ba tấn", dict(mat_hang=None, luong_kg=3000, uoc_tinh=False)),
    ("Bưởi da xanh loại một ba tạ, giao hôm nay, giá ba mươi mốt ngàn rưỡi",
     dict(mat_hang=B, loai="L1", luong_kg=300, uoc_tinh=False, ngay_giao="2026-10-25", gia_mong_muon=31500)),
    ("Lúa tươi IR 504 hai mươi lăm tấn, mốt gặt, giá sáu ngàn ba",
     dict(mat_hang=L, luong_kg=25000, uoc_tinh=False, ngay_giao="2026-10-27", gia_mong_muon=6300)),
    ("Cá tra cỡ một ký hai một con, ba mươi tấn, giá hai chín ngàn rưỡi, giao tại bè",
     dict(mat_hang=CT, luong_kg=30000, uoc_tinh=False, noi_giao="tai_ao", gia_mong_muon=29500)),
    ("chanh khong hat loai mot ba tan rưỡi mai giao gia mười hai nghìn",
     dict(mat_hang=C, loai="L1", luong_kg=3500, uoc_tinh=False, ngay_giao="2026-10-26", gia_mong_muon=12000)),
    ("Dạ em là người nhà, bán giùm má em tám tạ xoài cát chu loại một, giá hai sáu ngàn, ngày ba tháng mười một",
     dict(mat_hang=X, loai="L1", luong_kg=800, uoc_tinh=False, ngay_giao="2026-11-03", gia_mong_muon=26000)),
    ("Thanh long đỏ hàng xô năm tấn, tại vườn, bảy ngàn",
     dict(mat_hang=TL, loai="XO", luong_kg=5000, uoc_tinh=False, noi_giao="tai_vuon", gia_mong_muon=7000)),
]
TRUONG = ["mat_hang", "loai", "luong_kg", "uoc_tinh", "co_con_kg", "ngay_giao", "hinh_thuc", "noi_giao",
          "gia_mong_muon", "gia_thap_nhat"]
if __name__ == "__main__":
    out = Path(__file__).with_name("cau_noi_doc_lap.jsonl")
    with out.open("w") as f:
        for i, (vb, g) in enumerate(ROWS, 1):
            f.write(json.dumps({"id": f"DL-{i:03d}", "van_ban": vb, "ghi_chu": "độc lập", "hom_nay": "2026-10-25",
                                "dung": {k: g.get(k) for k in TRUONG}}, ensure_ascii=False) + "\n")
    print(len(ROWS), "->", out)
