from pydantic import BaseModel
from datetime import datetime

class WatchlistCreate(BaseModel):
    name: str

class WatchlistOut(BaseModel):
    id: int
    name: str
    created_at: datetime

class Config:
    from_attributes = True
