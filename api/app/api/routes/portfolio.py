from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import portfolio as crud
from app.settings import settings
from shared.db.session import get_db
from shared.schemas.portfolio import (
    PortfolioCreate,
    PortfolioRead,
    PortfolioTimelinePoint,
    PositionCreate,
    PositionRead,
)

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


@router.post("", response_model=PortfolioRead)
def create_portfolio(payload: PortfolioCreate, db: Session = Depends(get_db)):
    return crud.create_portfolio(db, payload.name)


@router.get("", response_model=list[PortfolioRead])
def list_portfolios(db: Session = Depends(get_db)):
    return crud.list_portfolios(db)


@router.post("/{portfolio_id}/positions", response_model=PositionRead)
def add_position(
    portfolio_id: int,
    payload: PositionCreate,
    db: Session = Depends(get_db),
):
    portfolio = crud.get_portfolio(db, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    return crud.add_position(
        db,
        portfolio_id,
        payload.symbol,
        payload.market,
        payload.quantity,
        payload.buy_price,
        payload.buy_date,
    )


@router.get("/{portfolio_id}/positions", response_model=list[PositionRead])
def list_positions(portfolio_id: int, db: Session = Depends(get_db)):
    portfolio = crud.get_portfolio(db, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    return crud.list_positions(db, portfolio_id)


async def _fetch_finnhub_candles(symbol: str, start: date, end: date) -> dict[str, Any]:
    if not settings.finnhub_api_key:
        raise HTTPException(status_code=500, detail="Finnhub API key not configured")

    start_ts = int(datetime.combine(start, datetime.min.time()).timestamp())
    end_ts = int(datetime.combine(end, datetime.min.time()).timestamp())
    url = f"{settings.finnhub_base_url}/stock/candle"
    params = {
        "symbol": symbol,
        "resolution": "D",
        "from": start_ts,
        "to": end_ts,
        "token": settings.finnhub_api_key,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, params=params)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch candles from Finnhub")

    data = response.json()
    if data.get("s") != "ok":
        raise HTTPException(status_code=404, detail="No candle data for symbol")

    return data


@router.get("/prices/close")
async def price_on_date(
    symbol: str = Query(..., min_length=1),
    market: str = Query("US"),
    trade_date: date = Query(..., alias="date"),
):
    _ = market
    candles = await _fetch_finnhub_candles(symbol, trade_date, trade_date + timedelta(days=1))
    ts_list = candles.get("t", [])
    close_list = candles.get("c", [])

    if not ts_list:
        raise HTTPException(status_code=404, detail="No price for date")

    return {
        "symbol": symbol,
        "date": trade_date,
        "close": close_list[0],
        "source": "finnhub",
    }


@router.get("/{portfolio_id}/timeline", response_model=list[PortfolioTimelinePoint])
async def portfolio_timeline(
    portfolio_id: int,
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    if (end - start).days > 366:
        raise HTTPException(status_code=400, detail="Range too large (max 366 days)")

    portfolio = crud.get_portfolio(db, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    positions = crud.list_positions(db, portfolio_id)
    if not positions:
        return []

    totals: dict[date, float] = {}
    for pos in positions:
        candles = await _fetch_finnhub_candles(pos.symbol, start, end)
        times = candles.get("t", [])
        closes = candles.get("c", [])
        for ts, close in zip(times, closes):
            day = datetime.utcfromtimestamp(ts).date()
            totals[day] = totals.get(day, 0.0) + (close * pos.quantity)

    points = [
        {"date": day, "value": round(value, 2)}
        for day, value in sorted(totals.items())
    ]
    return points