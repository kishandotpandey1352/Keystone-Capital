import os
from celery import Celery

celery = Celery(broker=os.getenv("REDIS_URL"))

celery.send_task("worker.app.tasks.cleanup.cleanup_watchlists")
