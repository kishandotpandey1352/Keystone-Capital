from __future__ import annotations

import os
import sqlite3
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter(prefix="/tickers", tags=["tickers"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", ".."))
DEFAULT_DB_PATHS = [
    os.path.join("/app", "data", "tickers.db"),
    os.path.join(PROJECT_ROOT, "api", "data", "tickers.db"),
    os.path.join(PROJECT_ROOT, "data", "tickers.db"),
]


def _resolve_db_path() -> str | None:
    env_path = os.getenv("TICKERS_DB_PATH")
    if env_path and os.path.exists(env_path):
        return env_path
    for path in DEFAULT_DB_PATHS:
        if os.path.exists(path):
            return path
    return None


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "symbol": row["display_symbol"] or row["symbol"],
        "description": row["description"] or "",
        "exchange": row["exchange"] or "",
        "currency": row["currency"],
    }


@router.get("/search")
def search_tickers(
    q: str = Query("", min_length=0, max_length=64),
    limit: int = Query(20, ge=1, le=50),
):
    db_path = _resolve_db_path()
    if not db_path:
        return []

    term = q.strip().upper()
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        if term:
            like_term = f"%{term}%"
            cursor.execute(
                """
                SELECT symbol, display_symbol, description, exchange, currency
                FROM tickers
                WHERE symbol LIKE ? OR display_symbol LIKE ? OR description LIKE ?
                ORDER BY symbol ASC
                LIMIT ?
                """,
                (like_term, like_term, like_term, limit),
            )
        else:
            cursor.execute(
                """
                SELECT symbol, display_symbol, description, exchange, currency
                FROM tickers
                ORDER BY symbol ASC
                LIMIT ?
                """,
                (limit,),
            )
        rows = cursor.fetchall()

    return [_row_to_dict(row) for row in rows]
