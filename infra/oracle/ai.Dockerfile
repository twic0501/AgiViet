# Base Python đa kiến trúc; pip cài dependency cho ARM64 khi build bằng Compose OCI.
FROM python:3.11-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /opt/ai
COPY ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 1000 --create-home agiviet
COPY ai/agiviet_ai ./agiviet_ai
COPY ai/thu_nghiem ./thu_nghiem
RUN mkdir ket_qua && chown agiviet:agiviet ket_qua
USER agiviet
EXPOSE 8091
# Một worker, luật thật; không tải STT, Piper, Ollama hoặc model nặng.
CMD ["python", "-m", "uvicorn", "agiviet_ai.dich_vu:app", "--host", "0.0.0.0", "--port", "8091", "--workers", "1", "--no-access-log"]
