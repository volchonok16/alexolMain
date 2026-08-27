FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc-dev \
    libffi-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Whisper качается при первом STT в bot_speak в volume whisper_cache.
# Не прекэшируем в образе: иначе каждый build (и CI) ждёт HF Hub и падает по timeout.

CMD ["python", "main.py", "--mode", "forward"]

