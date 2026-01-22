from shared.celery_app import celery_app
from shared.db.session import SessionLocal
from shared.models.watchlist import Watchlist

@celery_app.task(name="tasks.cleanup_watchlist")
def cleanup_watchlist(watchlist_id: int):
    db = SessionLocal()
    try:
        wl = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
        if wl:
            db.delete(wl)
            db.commit()
    finally:
        db.close()
