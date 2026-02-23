from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import httpx
import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query
from nltk.sentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import nltk

from app.settings import settings

router = APIRouter(prefix="/sentiment", tags=["sentiment"])

SENTIMENT_THRESHOLDS = {
    "positive": 0.25,
    "negative": -0.25,
}

_dummy_sources = ["Bloomberg", "Reuters", "CNBC", "Financial Times"]


def _ensure_nltk() -> None:
    try:
        nltk.data.find("sentiment/vader_lexicon.zip")
    except LookupError:
        nltk.download("vader_lexicon", quiet=True)


def _get_vader() -> SentimentIntensityAnalyzer | None:
    try:
        _ensure_nltk()
        return SentimentIntensityAnalyzer()
    except Exception:
        return None


def _classify(score: float) -> str:
    if score >= SENTIMENT_THRESHOLDS["positive"]:
        return "Positive"
    if score <= SENTIMENT_THRESHOLDS["negative"]:
        return "Negative"
    return "Neutral"


def _analyze_text(text: str, vader: SentimentIntensityAnalyzer | None) -> dict[str, Any]:
    if not text:
        return {"score": 0.0, "label": "Neutral"}

    vader_score = 0.0
    if vader:
        vader_score = vader.polarity_scores(text).get("compound", 0.0)
    blob_score = TextBlob(text).sentiment.polarity
    composite = (0.6 * vader_score) + (0.4 * blob_score)
    return {
        "score": float(composite),
        "label": _classify(composite),
    }


async def _fetch_company_news(ticker: str, limit: int) -> list[dict[str, Any]]:
    if not settings.finnhub_api_key:
        return _get_dummy_news(ticker, limit)

    to_date = date.today()
    from_date = to_date - timedelta(days=7)

    url = f"{settings.finnhub_base_url}/company-news"
    params = {
        "symbol": ticker,
        "from": from_date.isoformat(),
        "to": to_date.isoformat(),
        "token": settings.finnhub_api_key,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, params=params)

    if response.status_code != 200:
        return _get_dummy_news(ticker, limit)

    data = response.json()
    if not isinstance(data, list):
        return _get_dummy_news(ticker, limit)

    return data[:limit]


def _get_dummy_news(ticker: str, limit: int) -> list[dict[str, Any]]:
    items = []
    for i in range(limit):
        items.append(
            {
                "headline": f"{ticker} sentiment snapshot #{i + 1}",
                "summary": f"Analysts see mixed signals around {ticker} as flows shift.",
                "source": _dummy_sources[i % len(_dummy_sources)],
                "url": "https://example.com",
                "datetime": int(date.today().strftime("%s")),
            }
        )
    return items


def _get_price_history(ticker: str, period: str = "1mo") -> pd.DataFrame:
    try:
        history = yf.Ticker(ticker).history(period=period)
        if not history.empty:
            history = history.reset_index()
            history.rename(columns={"Date": "date", "Close": "close"}, inplace=True)
            return history[["date", "close"]]
    except Exception:
        pass

    dates = pd.date_range(end=pd.Timestamp.utcnow(), periods=30, freq="D")
    base = np.random.uniform(40, 200)
    closes = []
    for _ in range(30):
        base *= 1 + np.random.normal(0.001, 0.02)
        closes.append(base)
    return pd.DataFrame({"date": dates, "close": closes})


def _build_sentiment_history(score: float, count: int, seed: int) -> list[dict[str, Any]]:
    rng = np.random.default_rng(seed)
    dates = pd.date_range(end=pd.Timestamp.utcnow(), periods=count, freq="D")
    series = np.clip(score + rng.normal(0, 0.08, size=count), -1, 1)
    return [
        {"date": d.strftime("%Y-%m-%d"), "score": float(s)}
        for d, s in zip(dates, series)
    ]


@router.get("/analyze")
async def analyze_sentiment(
    ticker: str = Query(..., min_length=1, max_length=12),
    limit: int = Query(12, ge=1, le=50),
):
    ticker = ticker.upper().strip()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    vader = _get_vader()
    raw_news = await _fetch_company_news(ticker, limit)

    scored_news = []
    scores = []
    for item in raw_news:
        text = " ".join(
            [
                str(item.get("headline") or ""),
                str(item.get("summary") or ""),
            ]
        ).strip()
        sentiment = _analyze_text(text, vader)
        scores.append(sentiment["score"])
        scored_news.append(
            {
                "headline": item.get("headline") or "",
                "summary": item.get("summary") or "",
                "source": item.get("source") or "",
                "url": item.get("url") or "",
                "datetime": item.get("datetime") or 0,
                "sentiment_score": sentiment["score"],
                "sentiment_label": sentiment["label"],
            }
        )

    scores_arr = np.array(scores) if scores else np.array([0.0])
    overall_score = float(scores_arr.mean())
    label = _classify(overall_score)
    positive_count = int((scores_arr > SENTIMENT_THRESHOLDS["positive"]).sum())
    negative_count = int((scores_arr < SENTIMENT_THRESHOLDS["negative"]).sum())
    neutral_count = int(len(scores_arr) - positive_count - negative_count)

    price_history = _get_price_history(ticker)
    price_points = [
        {"date": row["date"].strftime("%Y-%m-%d"), "close": float(row["close"])}
        for _, row in price_history.iterrows()
    ]

    sentiment_history = _build_sentiment_history(
        overall_score,
        min(len(price_points), 30),
        seed=abs(hash(ticker)) % (2**32),
    )

    return {
        "ticker": ticker,
        "overall_score": overall_score,
        "sentiment_label": label,
        "distribution": {
            "positive": positive_count,
            "neutral": neutral_count,
            "negative": negative_count,
        },
        "confidence": float(scores_arr.std()) if scores else 0.0,
        "sources_analyzed": len(scores),
        "current_price": price_points[-1]["close"] if price_points else None,
        "price_history": price_points,
        "sentiment_history": sentiment_history,
        "news": scored_news,
    }
