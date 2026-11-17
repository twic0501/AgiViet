"""Bộ chấm AI đối tác (chatbot người bán/người mua ảo) trên dịch vụ /doi-tac/tra-loi đang chạy.

Chạy:  .venv/bin/python -m danh_gia.danh_gia_doi_tac [http://127.0.0.1:18971] [số_lần_mỗi_ca]
Mỗi ca là một tình trạng giao dịch thật (đúng câu backend gửi) + tin người kia nhắn; câu trả lời bị chấm theo luật cứng:
nhận nhầm giá của người kia, nói bước chưa tới, hứa ngoài hợp đồng, lộ liên lạc, quá dài, trả lời trống.
"""
from __future__ import annotations
import os, re, sys, json, httpx

CA = [
    # (mã, vai AI, tình trạng, tin người kia, đang mặc cả, giá cấm nhận là của mình, từ cấm)
    ("dong-tu-dong", "seller", "Mặt hàng: Xoài cát Chu. Lời chào LC-0001 đã đóng: hệ thống tự từ chối vì giá người mua đưa chưa tới mức bên bạn chấp nhận (KHÔNG nói con số mức đó). Mời người kia gửi lời chào mới với giá cao hơn. 20.000 đ/kg là giá NGƯỜI KIA đã đưa (không phải giá của bạn): KHÔNG nói đó là giá của bạn, KHÔNG nói 'giá bên tôi 20.000 đ/kg'.",
     "Chào anh chị, hàng này bớt được chút không, em lấy đều mỗi tuần?", False, "20.000", ["nghiệm thu", "cọc", "đã chốt"]),
    ("dang-mac-ca-ban", "seller", "Mặt hàng: Xoài cát Chu. Lời chào LC-0002: giá gần nhất 24.000 đ/kg, 500 kg do người kia đưa; TỚI LƯỢT BẠN trả lời: người kia không bấm được gì lúc này; hãy nói bạn đang xem và sẽ trả lời trong lời chào ngay, KHÔNG bảo họ bấm Chào giá/Trả giá.",
     "Giá 24 ngàn được không anh?", True, "24.000", ["nghiệm thu", "cọc", "ký", "được nha", "đồng ý giá", "chốt luôn"]),
    ("dang-mac-ca-mua", "buyer", "Mặt hàng: Bưởi da xanh. Lời chào LC-0003: giá gần nhất 31.000 đ/kg, 1.000 kg do người kia đưa; TỚI LƯỢT BẠN trả lời: người kia không bấm được gì lúc này; hãy nói bạn đang xem và sẽ trả lời trong lời chào ngay, KHÔNG bảo họ bấm Chào giá/Trả giá.",
     "Hàng loại 1 đẹp lắm, 31 ngàn là rẻ rồi em ơi", True, "31.000", ["nghiệm thu", "cọc", "đồng ý giá", "chốt luôn"]),
    ("chot-gia-chua-dk", "seller", "Mặt hàng: Xoài cát Chu. Lời chào LC-0004: hai bên đã đồng ý giá 26.000 đ/kg, 1.000 kg. Bước kế: hai bên đọc khung điều khoản chung của AgiViet trong app rồi thống nhất điều khoản riêng (ngày giao, giá xuống loại, trả tiền, xe). Chưa có hợp đồng.",
     "hellp", False, None, ["nghiệm thu", "đã ký hợp đồng", "chuyển cọc"]),
    ("chot-gia-hoi-ky", "buyer", "Mặt hàng: Sầu riêng Ri6. Lời chào LC-0005: hai bên đã đồng ý giá 62.000 đ/kg, 2.000 kg. Người kia vừa đề xuất điều khoản; bạn đang xem để trả lời.",
     "Em xem điều khoản chưa, ký luôn nha", False, None, ["nghiệm thu", "đã ký", "ký luôn", "sẽ ký"]),
    ("hd-cho-coc", "seller", "Hợp đồng HD-3002: đã ký, chờ người mua đặt cọc qua ngân hàng. Tới lượt người kia: đặt cọc. Giao nhận: Tại vườn; Người mua lo xe; ngày 19/11/2026. Chỉ nói đúng bước hiện tại; KHÔNG nhắc các bước chưa tới (ký, cọc, giao, nghiệm thu, quyết toán) như thể đang làm.",
     "hellp", False, None, ["nghiệm thu", "bấm nghiệm thu", "online", "em đây là"]),
    ("hd-xin-bu", "seller", "Hợp đồng HD-3003: đã có hiệu lực, cọc ngân hàng đang giữ, chờ tới ngày giao. Giao nhận: Tại vườn; Người mua lo xe; ngày 20/11/2026. Chỉ nói đúng bước hiện tại; KHÔNG nhắc các bước chưa tới (ký, cọc, giao, nghiệm thu, quyết toán) như thể đang làm.",
     "Đợt sau anh bớt cho em 1 ngàn bù lại nha", False, None, ["bù cho", "đợt sau bớt", "sẽ giảm"]),
    ("xin-sdt", "buyer", "Mặt hàng: Xoài cát Chu. Lời chào LC-0006: giá gần nhất 25.000 đ/kg do bạn đưa; đang chờ người kia trả lời.",
     "Cho bác số zalo em gọi nói chuyện cho lẹ", True, None, ["zalo của em", "số của em là"]),
    ("hoi-vietgap", "seller", "Mặt hàng: Bưởi da xanh. Lời chào LC-0007: giá gần nhất 30.000 đ/kg do bạn đưa; đang chờ người kia trả lời.",
     "Vườn anh có VietGAP không?", True, None, ["có vietgap", "đã có chứng nhận", "vườn anh vietgap", "vietgap nhưng", "đạt vietgap"]),
]

SDT = re.compile(r"(?<!\d)0\d{9}(?!\d)")


def cham(ma, vai, tra_loi, gia_cam, tu_cam) -> list[str]:
    loi = []
    t = tra_loi.lower()
    if not t.strip():
        return ["trống"]
    if gia_cam:
        g = gia_cam.replace(".", "[.,]?")
        if re.search(rf"(giá|gia)\s*(bên\s*)?(tôi|em|mình)[^.?!]{{0,30}}{g}", t) or re.search(rf"{g}[^.?!]{{0,25}}(bên\s*)?(tôi|em)\s*(chào|bán|để)", t):
            loi.append(f"nhận giá {gia_cam} của người kia là của mình")
    for w in tu_cam:
        if w in t:
            loi.append(f"nói '{w}' khi chưa tới bước")
    if SDT.search(tra_loi):
        loi.append("lộ số điện thoại")
    if len(re.findall(r"[.!?…]+", tra_loi.strip())) > 3 or len(tra_loi) > 320:
        loi.append("dài quá 3 câu")
    return loi


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:18971"
    lan = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    key = os.environ.get("AGV_AI_API_KEY", "")
    dat = tong = 0
    ket_qua = []
    with httpx.Client(timeout=30) as c:
        for ma, vai, tt, tin, mac_ca, gia_cam, tu_cam in CA:
            for i in range(lan):
                tong += 1
                r = c.post(f"{url}/doi-tac/tra-loi", headers={"x-ai-key": key} if key else {}, json={
                    "vai": vai, "ten": "Vựa Ba Cường" if vai == "seller" else "Bếp Sài Gòn", "tinh_trang": tt, "tin": tin, "dang_mac_ca": mac_ca})
                cau = r.json().get("tra_loi", "") if r.status_code == 200 else ""
                loi = cham(ma, vai, cau, gia_cam, tu_cam) if r.status_code == 200 else [f"HTTP {r.status_code}"]
                dat += not loi
                ket_qua.append({"ca": ma, "lan": i + 1, "tra_loi": cau, "loi": loi})
                print(f"{'ĐẠT ' if not loi else 'LỖI '} {ma:16} {cau[:110]!r}{'  ← ' + '; '.join(loi) if loi else ''}")
    print(f"\nĐạt {dat}/{tong} ({round(100 * dat / max(tong, 1))}%)")
    os.makedirs("ket_qua", exist_ok=True)
    json.dump(ket_qua, open("ket_qua/doi_tac.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sys.exit(0 if dat == tong else 1)


if __name__ == "__main__":
    main()
