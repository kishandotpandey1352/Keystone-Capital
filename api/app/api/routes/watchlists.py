from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.watchlist import (
    WatchlistCreate,
    WatchlistRead,
    WatchlistItemCreate,
)
from app.crud import watchlist as crud

router = APIRouter(prefix="/watchlists", tags=["watchlists"])


@router.post(
    "",
    response_model=WatchlistRead,
    status_code=status.HTTP_201_CREATED,
)
def create_watchlist(
    payload: WatchlistCreate,
    db: Session = Depends(get_db),
):
    return crud.create_watchlist(db, payload.name)


@router.get("", response_model=list[WatchlistRead])
def list_watchlists(db: Session = Depends(get_db)):
    return crud.get_watchlists(db)


@router.post(
    "/{watchlist_id}/symbols",
    status_code=status.HTTP_201_CREATED,
)
def add_symbol(
    watchlist_id: int,
    payload: WatchlistItemCreate,
    db: Session = Depends(get_db),
):
    watchlist = crud.get_watchlist(db, watchlist_id)
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    crud.add_symbol_to_watchlist(db, watchlist, payload.symbol)
    return {"status": "ok"}


@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
):
    watchlist = crud.get_watchlist(db, watchlist_id)
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    crud.delete_watchlist(db, watchlist)
