"""Gọi LLM qua nhà cung cấp ngoài (Gemini, NVIDIA NIM) có chuỗi dự phòng; hỏng hết thì trả câu soạn sẵn.

Ba loại việc:
- "truc_tiep": trả lời người dùng ngay — Gemini → NIM gemma → câu soạn sẵn.
- "may": việc máy nhanh (phân loại, trích) — Gemini → NIM nemotron lightning.
- "soan": soạn sẵn/chấm điểm, không gấp — NIM deepseek → Gemini.
Khóa đọc từ biến môi trường, nếu thiếu thì từ ~/.local/share/agiviet/ai-keys.env. Không bao giờ ghi khóa ra log.
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass

import httpx

TEP_KHOA = os.path.expanduser(os.environ.get("AGV_AI_KEYS", "~/.local/share/agiviet/ai-keys.env"))
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

CAU_SOAN_SAN = "Xin lỗi, trợ lý đang bận. Bạn thử lại sau ít phút hoặc gọi tổng đài AgiViet để được hỗ trợ."
NGHI_SAU_LOI_S = 60.0   # bỏ qua nhà cung cấp vừa lỗi liên tiếp trong khoảng này
LOI_TOI_DA = 2


class LoiNhaCungCap(Exception):
    pass


@dataclass
class KetQua:
    van_ban: str
    nguon: str      # "gemini:<model>" | "nim:<model>" | "soan_san"
    ms: float
    loi: list[str]  # lỗi các bậc đã bỏ qua (không chứa khóa)


def doc_khoa(path: str = TEP_KHOA) -> dict[str, str]:
    out: dict[str, str] = {}
    try:
        for dong in open(path, encoding="utf-8"):
            dong = dong.strip()
            if dong and not dong.startswith("#") and "=" in dong:
                k, v = dong.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    for k in ("GEMINI_API_KEY", "NVIDIA_API_KEY", "AGV_GEMINI_MODEL", "AGV_NIM_MODEL", "AGV_NIM_MODEL_DU_PHONG",
              "AGV_NIM_MODEL_MAY", "AGV_NIM_MODEL_SOAN"):
        if os.environ.get(k):
            out[k] = os.environ[k]
    return out


class NhaCungCap:
    def __init__(self, khoa: dict[str, str] | None = None, client: httpx.Client | None = None):
        self.khoa = doc_khoa() if khoa is None else khoa
        self.client = client or httpx.Client()
        self._loi: dict[str, tuple[int, float]] = {}   # bậc → (số lỗi liên tiếp, thời điểm lỗi cuối)

    # ---- từng nhà cung cấp ----
    def _gemini(self, model: str, he_thong: str, nguoi_dung: str, timeout_s: float, toi_da: int) -> str:
        k = self.khoa.get("GEMINI_API_KEY")
        if not k:
            raise LoiNhaCungCap("thiếu khóa Gemini")
        r = self.client.post(GEMINI_URL.format(m=model), headers={"x-goog-api-key": k}, timeout=timeout_s, json={
            "systemInstruction": {"parts": [{"text": he_thong}]},
            "contents": [{"role": "user", "parts": [{"text": nguoi_dung}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": toi_da},
        })
        if r.status_code != 200:
            raise LoiNhaCungCap(f"Gemini HTTP {r.status_code}")
        try:
            return "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"]).strip()
        except (KeyError, IndexError, ValueError) as e:
            raise LoiNhaCungCap(f"Gemini trả sai dạng: {type(e).__name__}") from e

    def _nim(self, model: str, he_thong: str, nguoi_dung: str, timeout_s: float, toi_da: int) -> str:
        k = self.khoa.get("NVIDIA_API_KEY")
        if not k:
            raise LoiNhaCungCap("thiếu khóa NIM")
        r = self.client.post(NIM_URL, headers={"authorization": "Bearer " + k}, timeout=timeout_s, json={
            "model": model, "temperature": 0.3, "max_tokens": toi_da, "stream": False,
            "messages": [{"role": "system", "content": he_thong}, {"role": "user", "content": nguoi_dung}],
        })
        if r.status_code != 200:
            raise LoiNhaCungCap(f"NIM HTTP {r.status_code}")
        try:
            return (r.json()["choices"][0]["message"]["content"] or "").strip()
        except (KeyError, IndexError, ValueError) as e:
            raise LoiNhaCungCap(f"NIM trả sai dạng: {type(e).__name__}") from e

    # ---- chuỗi dự phòng ----
    def chuoi(self, loai: str) -> list[tuple[str, str]]:
        k = self.khoa
        gemini = ("gemini", k.get("AGV_GEMINI_MODEL") or "gemini-flash-lite-latest")
        if loai == "truc_tiep":
            return [gemini, ("nim", k.get("AGV_NIM_MODEL") or "google/gemma-4-31b-it")]
        if loai == "may":
            return [gemini, ("nim", k.get("AGV_NIM_MODEL_MAY") or "nvidia/nemotron-3.5-lightning-30b-a3b")]
        if loai == "soan":
            return [("nim", k.get("AGV_NIM_MODEL_SOAN") or "deepseek-ai/deepseek-v4.1-flash"), gemini]
        raise ValueError(f"loại việc không hỗ trợ: {loai}")

    def _dang_nghi(self, bac: str) -> bool:
        n, t = self._loi.get(bac, (0, 0.0))
        return n >= LOI_TOI_DA and time.monotonic() - t < NGHI_SAU_LOI_S

    def goi(self, he_thong: str, nguoi_dung: str, loai: str = "truc_tiep", timeout_s: float = 8.0,
            toi_da: int = 400) -> KetQua:
        """Thử lần lượt từng bậc; "truc_tiep" hỏng hết thì trả câu soạn sẵn, loại khác thì ném LoiNhaCungCap."""
        t0 = time.perf_counter(); loi: list[str] = []
        for ten, model in self.chuoi(loai):
            bac = f"{ten}:{model}"
            if self._dang_nghi(bac):
                loi.append(f"{bac} đang nghỉ sau lỗi"); continue
            try:
                f = self._gemini if ten == "gemini" else self._nim
                van_ban = f(model, he_thong, nguoi_dung, timeout_s, toi_da)
                if not van_ban:
                    raise LoiNhaCungCap("trả rỗng")
                self._loi.pop(bac, None)
                return KetQua(van_ban, bac, (time.perf_counter() - t0) * 1000, loi)
            except (LoiNhaCungCap, httpx.HTTPError) as e:
                n, _ = self._loi.get(bac, (0, 0.0))
                self._loi[bac] = (n + 1, time.monotonic())
                loi.append(f"{bac}: {type(e).__name__}: {e}")
        if loai == "truc_tiep":
            return KetQua(CAU_SOAN_SAN, "soan_san", (time.perf_counter() - t0) * 1000, loi)
        raise LoiNhaCungCap("; ".join(loi))
