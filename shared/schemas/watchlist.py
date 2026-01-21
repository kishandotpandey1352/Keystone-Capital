from pydantic import BaseModel
from datetime import datetime


class WatchlistCreate(BaseModel):
    name: str


class WatchlistRead(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True