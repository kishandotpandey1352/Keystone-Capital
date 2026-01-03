from sqlalchemy.orm import Session
from app.db.models import Watchlist

def create_watchlist(db: Session, name: str) -> Watchlist:
    watchlist = Watchlist(name=name)
    db.add(watchlist)
    db.commit()
    db.refresh(watchlist)
    return watchlist

def get_watchlists(db: Session):
    return db.query(Watchlist).all()

def get_watchlist(db: Session, watchlist_id: int):
    return db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()

def delete_watchlist(db: Session, watchlist_id: int):
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not watchlist:
        return None
    db.delete(watchlist)
    db.commit()
    return watchlist
