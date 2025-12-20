from .celery_app import celery

@celery.task(name="worker.ping")
def ping():
    return {"ok": True}
