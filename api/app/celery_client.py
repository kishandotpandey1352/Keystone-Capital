from celery import Celery
import os

celery_client = Celery(
    "api",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL"),
)
