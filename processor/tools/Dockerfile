FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer libreoffice-calc libreoffice-impress poppler-utils tesseract-ocr tesseract-ocr-eng tesseract-ocr-urd tesseract-ocr-hin ffmpeg libpango-1.0-0 libpangoft2-1.0-0 fonts-dejavu fonts-noto-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home worker
USER worker
ENV U2NET_HOME=/home/worker/.u2net HF_HOME=/home/worker/.cache/huggingface WHISPER_MODEL=small
RUN python -c "from rembg import new_session; new_session('u2netp')" && python -c "from faster_whisper import WhisperModel; WhisperModel('small',device='cpu',compute_type='int8')"
ENV HF_HUB_OFFLINE=1
COPY --chown=worker:worker convert.py server.py ./
EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--limit-concurrency", "8"]
