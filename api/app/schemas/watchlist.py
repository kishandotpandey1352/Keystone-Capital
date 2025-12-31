from typing import List
from pydantic import BaseModel, Field


class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WatchlistItemCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)


class WatchlistItemRead(BaseModel):
    id: int
    symbol: str

    class Config:
        from_attributes = True


class WatchlistRead(BaseModel):
    id: int
    name: str
    items: List[WatchlistItemRead] = []

    class Config:
        from_attributes = True
