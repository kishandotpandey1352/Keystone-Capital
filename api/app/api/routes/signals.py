from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from celery import Celery
import os
from sqlalchemy import text
from shared.db.session import get_db

router = APIRouter()

celery_app = Celery(
    "api",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),
)


@router.post("/watchlists/{watchlist_id}/compute")
def compute_signal(watchlist_id: int, db: Session = Depends(get_db)):
    exists = db.execute(
        text("SELECT 1 FROM watchlists WHERE id=:id"),
        {"id": watchlist_id}
    ).fetchone()

    if not exists:
        raise HTTPException(404, "Watchlist not found")

    celery_app.send_task("compute_signal", args=[watchlist_id])
    return {"status": "queued"}
