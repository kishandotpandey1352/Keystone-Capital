FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# COPY THE app FOLDER, NOT worker
COPY app ./app

ENV PYTHONPATH=/app

CMD ["celery", "-A", "app.celery_app", "worker", "--loglevel=info"]
