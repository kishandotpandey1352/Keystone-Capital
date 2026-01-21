from datetime import datetime
from sqlalchemy.orm import Session
from shared.models.watchlist import Watchlist


def create_watchlist(db: Session, name: str) -> Watchlist:
    watchlist = Watchlist(name=name)
    db.add(watchlist)
    db.commit()
    db.refresh(watchlist)
    return watchlist

def get_watchlists(db: Session):
    return (
        db.query(Watchlist)
        .filter(Watchlist.deleted_at.is_(None))
        .all()
    )

def get_watchlist(db: Session, watchlist_id: int):
    return (
        db.query(Watchlist)
        .filter(
            Watchlist.id == watchlist_id,
            Watchlist.deleted_at.is_(None)
        )
        .first()
    )

def delete_watchlist(db: Session, watchlist_id: int):
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not watchlist:
        return None
    db.delete(watchlist)
    db.commit()
    return watchlist

def soft_delete_watchlist(db: Session, watchlist_id: int):
    watchlist = (
        db.query(Watchlist)
        .filter(
            Watchlist.id == watchlist_id,
            Watchlist.deleted_at.is_(None)
        )
        .first()
    )

    if not watchlist:
        return None

    watchlist.deleted_at = datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(watchlist)
    return watchlist

def restore_watchlist(db: Session, watchlist_id: int):
    watchlist = (
        db.query(Watchlist)
        .filter(Watchlist.id == watchlist_id)
        .first()
    )

    if not watchlist:
        return None

    watchlist.deleted_at = None
    db.commit()
    return watchlist
