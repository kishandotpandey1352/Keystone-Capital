from app.celery_app import celery_app

@celery_app.task
def compute_signal(watchlist_id: int):
    print(f"Computing signal for watchlist {watchlist_id}")
    return {"status": "ok", "watchlist_id": watchlist_id}
