from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from shared.celery_app import celery_app
from shared.db.session import get_db

router = APIRouter()


@router.post("/watchlists/{watchlist_id}/compute")
def compute_signal(watchlist_id: int, db: Session = Depends(get_db)):
    exists = db.execute(
        text("SELECT 1 FROM watchlists WHERE id=:id"),
        {"id": watchlist_id}
    ).fetchone()

    if not exists:
        raise HTTPException(404, "Watchlist not found")

    celery_app.send_task("tasks.compute_signal", args=[watchlist_id])
    return {"status": "queued"}
