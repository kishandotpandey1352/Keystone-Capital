from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func

from shared.db.base import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False)
    market = Column(String, nullable=False, default="US")
    quantity = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    buy_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())