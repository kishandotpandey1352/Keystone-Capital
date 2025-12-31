import uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Column, Float, ForeignKey, Integer, String, DateTime, func
from datetime import datetime
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"), nullable=False)
    value = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
