# Dịch vụ AI (trợ lý, ghép nguồn, quét tin) trên Render free. Đo trên máy: ~65 MB RAM, trả lời ~1 s (Gemini).
# Khóa GEMINI_API_KEY, NVIDIA_API_KEY nhập tay trên Render; AGV_AI_API_KEY do Render sinh, backend nhận cùng giá trị.
# Build từ gốc repo: docker build -f infra/render/ai.Dockerfile .
FROM python:3.11-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 AGV_STT_TAT=1 PORT=10000
WORKDIR /opt/ai
COPY ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 1000 --create-home agiviet
COPY ai/agiviet_ai ./agiviet_ai
COPY ai/thu_nghiem ./thu_nghiem
RUN mkdir ket_qua && chown agiviet:agiviet ket_qua
USER agiviet
EXPOSE 10000
CMD ["sh", "-c", "python -m uvicorn agiviet_ai.dich_vu:app --host 0.0.0.0 --port ${PORT} --workers 1 --no-access-log"]
