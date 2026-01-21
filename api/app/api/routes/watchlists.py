from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from shared.models.watchlist import Watchlist
from app.crud import watchlist as crud
from shared.celery_app import celery_app

from shared.db.session import get_db
from shared.schemas.watchlist import WatchlistCreate
from datetime import datetime

router = APIRouter(prefix="/watchlists", tags=["watchlists"])


class WatchlistCreate(BaseModel):
    name: str


@router.post("")
def create_watchlist(payload: WatchlistCreate, db: Session = Depends(get_db)):
    return crud.create_watchlist(db, payload.name)


@router.get("")
def list_watchlists(db: Session = Depends(get_db)):
    return crud.get_watchlists(db)

@router.delete("/{watchlist_id}")
def soft_delete_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    wl = db.get(Watchlist, watchlist_id)
    if not wl:
        raise HTTPException(status_code=404)

    wl.is_deleted = True
    wl.deleted_at = datetime.utcnow()
    db.commit()

    celery_app.send_task("app.tasks.cleanup.cleanup_watchlists")
    celery.send_task(
    "tasks.cleanup_watchlist",
    args=[watchlist_id]
)

    return {"status": "deleted"}