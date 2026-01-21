import sys
from pathlib import Path

# Add parent directories to path if needed
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from shared.celery_app import celery_app
from shared.db.session import SessionLocal
from shared.db.models import Watchlist

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
