from datetime import datetime
from sqlalchemy.sql import func

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship

from app.db.base import Base

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (
        UniqueConstraint(
            "watchlist_id",
            "symbol",
            name="uq_watchlist_symbol",
        ),
    )

    id = Column(Integer, primary_key=True)
    watchlist_id = Column(
        Integer,
        ForeignKey("watchlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    symbol = Column(String(20), nullable=False, index=True)

    watchlist = relationship("Watchlist", back_populates="items")


class SignalSnapshot(Base):
    __tablename__ = "signal_snapshots"
    __table_args__ = (
        Index(
            "ix_signal_symbol_name_ts",
            "symbol",
            "signal_name",
            "ts",
        ),
    )

    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), nullable=False)
    signal_name = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    ts = Column(DateTime, default=datetime.utcnow, nullable=False)
