from sqlalchemy.orm import Session

from app.db.models import Watchlist, WatchlistItem


USER_ID = 1  # temporary, until auth


def create_watchlist(db: Session, name: str) -> Watchlist:
    watchlist = Watchlist(
        user_id=USER_ID,
        name=name,
    )
    db.add(watchlist)
    db.commit()
    db.refresh(watchlist)
    return watchlist


def get_watchlists(db: Session):
    return (
        db.query(Watchlist)
        .filter(Watchlist.user_id == USER_ID)
        .all()
    )


def get_watchlist(db: Session, watchlist_id: int) -> Watchlist | None:
    return (
        db.query(Watchlist)
        .filter(
            Watchlist.id == watchlist_id,
            Watchlist.user_id == USER_ID,
        )
        .first()
    )


def add_symbol_to_watchlist(
    db: Session,
    watchlist: Watchlist,
    symbol: str,
) -> WatchlistItem:
    item = WatchlistItem(
        watchlist_id=watchlist.id,
        symbol=symbol.upper(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def delete_watchlist(db: Session, watchlist: Watchlist) -> None:
    db.delete(watchlist)
    db.commit()
