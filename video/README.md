# Video giới thiệu AgiViet (3:15)

Video dựng từ chính app đang chạy: một trang sân khấu 1920×1080 đặt app Nhà sản xuất (khung điện thoại) và
app Thu mua (khung laptop), tự bấm, tự gõ theo kịch bản, xen cảnh chữ động; lời dẫn tiếng Việt, phụ đề chạy theo
từng từ, nhạc nền tự soạn.

| Tệp | Việc |
|---|---|
| `kich-ban.json` | Lời dẫn 10 cảnh, giọng đọc, thời lượng tối thiểu mỗi cảnh, tổng 195 giây |
| `giong.py` | Đọc lời dẫn bằng edge-tts (HoaiMy, NamMinh), lấy mốc từng từ, lập `lich.json` đúng 195 giây |
| `san-khau.html` | Trang sân khấu: thiết bị, con trỏ, chữ động, phụ đề, kịch bản bấm của 10 cảnh |
| `quay.mjs` | Quay sân khấu bằng screencast của Chromium, ghép khung theo mốc thời gian thành `hinh.mp4` 30 hình/giây |
| `nhac.py` | Nhạc nền tự soạn (Rê trưởng, 92 nhịp/phút), bám theo cảnh |
| `ghep.py` | Ghép hình + lời dẫn đúng mốc + nhạc (tự hạ khi có lời), chuẩn hóa −16 LUFS, xuất mp4 |

## Dựng lại

```bash
python3 -m venv /tmp/tts && /tmp/tts/bin/pip install edge-tts numpy
RA=/tmp/agiviet-video
/tmp/tts/bin/python video/giong.py $RA          # lời dẫn + lịch
node scripts/build-hosting.js
(cd hosting-build && python3 -m http.server 8768) &   # app để quay
node video/quay.mjs $RA                          # ~3,5 phút, ra $RA/hinh.mp4
/tmp/tts/bin/python video/nhac.py $RA
/tmp/tts/bin/python video/ghep.py $RA ~/Videos/AgiViet_gioi_thieu.mp4
```

Lúc quay, sân khấu đặt `localStorage av.quay-video = 1` để app ẩn dải “Mô phỏng” và tiền tố trong thông báo.
`edge-tts` gửi lời dẫn lên dịch vụ đọc của Microsoft để tạo giọng (cần mạng).
Sửa lời dẫn thì chạy lại từ `giong.py`; sửa cách bấm trong app thì chạy lại từ `quay.mjs`.
