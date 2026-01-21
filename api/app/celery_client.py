from celery import Celery
import os

celery = Celery(
    "api-client",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL"),
)

celery.conf.task_ignore_result = True
