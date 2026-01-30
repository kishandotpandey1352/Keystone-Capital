from datetime import date, datetime

from pydantic import BaseModel


class PortfolioCreate(BaseModel):
    name: str


class PortfolioRead(BaseModel):
    id: int
    name: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class PositionCreate(BaseModel):
    symbol: str
    market: str
    quantity: float
    buy_price: float
    buy_date: date


class PositionRead(BaseModel):
    id: int
    portfolio_id: int
    symbol: str
    market: str
    quantity: float
    buy_price: float
    buy_date: date
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class PortfolioTimelinePoint(BaseModel):
    date: date
    value: float
