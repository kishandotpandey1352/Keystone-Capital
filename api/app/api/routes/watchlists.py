from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import watchlist as crud

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
def delete_watchlist(watchlist_id: int,db: Session = Depends(get_db)):
    
    watchlist = crud.delete_watchlist(db, watchlist_id)
    if not watchlist:
        raise HTTPException(status_code=404, detail="Not Found")
    return {"ok": True}
