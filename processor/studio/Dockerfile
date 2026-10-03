FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY processor/studio/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY processor/studio/server.py .
COPY processor/python/transcribe.py ./transcribe.py
EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
