"""Tiến trình STT (faster-whisper) chạy trong venv riêng `.venv-stt` (Python 3.11 + thư viện CUDA).

Hai cách chạy:
  python -m agiviet_ai.stt tep.wav        -> in một dòng JSON rồi thoát (nạp mô hình mỗi lần, chậm)
  python -m agiviet_ai.stt --worker       -> nạp mô hình MỘT lần, đọc đường dẫn wav từ stdin mỗi dòng,
                                             trả mỗi dòng một JSON (dịch vụ dùng cách này)
Biến môi trường:
  AGV_STT_MODEL   tên/đường dẫn mô hình CTranslate2 (mặc định large-v3-turbo; phải tải sẵn)
  AGV_STT_DEVICE  cuda | cpu (mặc định cuda);  AGV_STT_COMPUTE float16 | int8 (mặc định float16)
Không tự tải mô hình (local_files_only). Kết quả chỉ là NHÁP chữ, đi tiếp qua /voice/extract.
"""
import json
import os
import sys
import time

GOI_Y = ("Nông dân miền Tây bán xoài cát Chu, chanh không hạt, tôm thẻ, lúa tươi, sầu riêng, bưởi da xanh, "
         "thanh long, cá tra; tấn, tạ, ký, nghìn một ký.")


def _nap():
    from faster_whisper import WhisperModel
    return WhisperModel(os.environ.get('AGV_STT_MODEL', 'large-v3-turbo'),
                        device=os.environ.get('AGV_STT_DEVICE', 'cuda'),
                        compute_type=os.environ.get('AGV_STT_COMPUTE', 'float16'),
                        local_files_only=True)


def _nghe(model, path):
    t0 = time.perf_counter()
    seg, info = model.transcribe(path, language='vi', beam_size=5, vad_filter=False,
                                 condition_on_previous_text=False, initial_prompt=GOI_Y)
    seg = list(seg)
    return {'van_ban': ' '.join(s.text.strip() for s in seg), 'ngon_ngu': 'vi',
            'thoi_luong_giay': round(info.duration, 2),
            # avg_logprob thấp = nghe không chắc; app nên hỏi lại hoặc cho gõ tay
            'tin_cay_tb': round(sum(s.avg_logprob for s in seg) / len(seg), 3) if seg else None,
            'ms': round((time.perf_counter() - t0) * 1000), 'chi_luu_nhap': True}


def main():
    model = _nap()
    if sys.argv[1:] == ['--worker']:
        print(json.dumps({'san_sang': True}), flush=True)
        for line in sys.stdin:
            p = line.strip()
            if not p:
                continue
            try:
                print(json.dumps(_nghe(model, p), ensure_ascii=False), flush=True)
            except Exception as e:  # noqa: BLE001 - trả lỗi dạng JSON để dịch vụ rơi về nhập tay
                print(json.dumps({'loi': type(e).__name__}), flush=True)
    else:
        print(json.dumps(_nghe(model, sys.argv[1]), ensure_ascii=False))


if __name__ == '__main__':
    main()
