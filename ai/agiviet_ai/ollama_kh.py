"""Gọi Ollama cục bộ (LLM và embedding) có thời gian chờ; lỗi thì trả None để rơi về luật."""
from __future__ import annotations

import json
import os
import time

import httpx

OLLAMA_URL = os.environ.get("AGV_OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL = os.environ.get("AGV_LLM_MODEL", "qwen3.5:9b")
EMBED_MODEL = os.environ.get("AGV_EMBED_MODEL", "bge-m3")


class LoiMoHinh(Exception):
    pass


def _lay_json(s: str) -> dict:
    s = s.strip()
    if s.startswith("```"):
        s = s.strip("`")
        s = s[s.find("{"):]
    a, b = s.find("{"), s.rfind("}")
    if a < 0 or b < a:
        raise ValueError("không có JSON")
    d = json.loads(s[a:b + 1])
    if not isinstance(d, dict): raise ValueError("JSON phải là đối tượng")
    return d


def chat_json(he_thong: str, nguoi_dung: str, schema: dict | None, timeout_s: float = 10.0,
              model: str | None = None, rang_buoc: bool = False) -> tuple[dict, float]:
    """Trả (đối tượng JSON, số ms). Ném LoiMoHinh khi lỗi, quá giờ hoặc JSON hỏng.

    rang_buoc=True dùng ràng buộc lược đồ của Ollama (đúng cú pháp hơn nhưng đo trên máy này
    cần đo riêng tốc độ; số đo cũ không được xác nhận lại ở môi trường hiện tại). Mặc định không ràng buộc,
    tự kiểm lược đồ sau (xem trich_xuat._kq_tu_llm).
    """
    t0 = time.perf_counter()
    try:
        r = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model or LLM_MODEL,
                "messages": [{"role": "system", "content": he_thong},
                             {"role": "user", "content": nguoi_dung}],
                **({"format": schema} if rang_buoc and schema else {}),
                "stream": False,
                "think": False,
                "keep_alive": "5m",
                "options": {"temperature": 0, "num_ctx": 4096, "num_predict": 384, "seed": 7},
            },
            timeout=timeout_s,
        )
        r.raise_for_status()
        noi_dung = r.json()["message"]["content"]
        return _lay_json(noi_dung), (time.perf_counter() - t0) * 1000
    except (httpx.HTTPError, KeyError, json.JSONDecodeError, ValueError) as e:
        raise LoiMoHinh(f"{type(e).__name__}: {e}") from e


def embed(cac_cau: list[str], timeout_s: float = 10.0) -> list[list[float]]:
    try:
        r = httpx.post(f"{OLLAMA_URL}/api/embed",
                       json={"model": EMBED_MODEL, "input": cac_cau, "keep_alive": "5m"},
                       timeout=timeout_s)
        r.raise_for_status()
        return r.json()["embeddings"]
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise LoiMoHinh(f"{type(e).__name__}: {e}") from e
