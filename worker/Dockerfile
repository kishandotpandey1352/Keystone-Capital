FROM python:3.11-slim

WORKDIR /app
ENV PYTHONPATH=/app

RUN addgroup --system appgroup \
	&& adduser --system --ingroup appgroup appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

USER appuser

CMD ["celery", "-A", "shared.celery_app.celery_app", "worker", "--loglevel=info"]
