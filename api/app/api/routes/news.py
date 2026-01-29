from __future__ import annotations

import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import watchlist as crud
from app.settings import settings
from shared.db.session import get_db

router = APIRouter(prefix="/news", tags=["news"])

DEFAULT_CATEGORIES = ["general", "forex", "crypto", "merger"]

KEYWORD_TO_CATEGORY = {
    "crypto": "crypto",
    "bitcoin": "crypto",
    "btc": "crypto",
    "eth": "crypto",
    "forex": "forex",
    "fx": "forex",
    "usd": "forex",
    "eur": "forex",
    "inr": "forex",
    "merger": "merger",
    "m&a": "merger",
    "acquisition": "merger",
}

CACHE_TTL_SECONDS = 600
_CACHE: dict[str, dict[str, Any]] = {}


def _derive_categories_from_watchlists(names: list[str]) -> list[str]:
    if not names:
        return DEFAULT_CATEGORIES

    categories: list[str] = []
    for name in names:
        lowered = name.lower()
        matched = False
        for keyword, category in KEYWORD_TO_CATEGORY.items():
            if keyword in lowered:
                if category not in categories:
                    categories.append(category)
                matched = True
        if not matched and "general" not in categories:
            categories.append("general")

    return categories or ["general"]


def _get_cached(category: str) -> list[dict[str, Any]] | None:
    entry = _CACHE.get(category)
    if not entry:
        return None
    if time.time() - entry["ts"] > CACHE_TTL_SECONDS:
        _CACHE.pop(category, None)
        return None
    return entry["data"]


def _set_cache(category: str, data: list[dict[str, Any]]) -> None:
    _CACHE[category] = {"ts": time.time(), "data": data}


async def _fetch_finnhub_news(category: str, limit: int) -> list[dict[str, Any]]:
    if not settings.finnhub_api_key:
        raise HTTPException(status_code=500, detail="Finnhub API key not configured")

    cached = _get_cached(category)
    if cached is not None:
        return cached[:limit]

    url = f"{settings.finnhub_base_url}/news"
    params = {"category": category, "token": settings.finnhub_api_key}

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, params=params)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch news from Finnhub")

    data = response.json()
    if not isinstance(data, list):
        raise HTTPException(status_code=502, detail="Invalid Finnhub response")

    _set_cache(category, data)
    return data[:limit]


@router.get("/home")
async def home_news(
    limit: int = Query(10, ge=1, le=50),
    max_categories: int = Query(4, ge=1, le=10),
    db: Session = Depends(get_db),
):
    watchlists = crud.get_watchlists(db)
    names = [wl.name for wl in watchlists]
    categories = _derive_categories_from_watchlists(names)[:max_categories]

    results = []
    for category in categories:
        articles = await _fetch_finnhub_news(category, limit)
        results.append({"category": category, "articles": articles})

    return {"categories": results}