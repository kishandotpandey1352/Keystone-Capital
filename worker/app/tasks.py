from app.celery_app import celery_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from .db import SessionLocal
from sqlalchemy import text
import time

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

@celery_app.task
def example_task():
    return "Worker is running"

@celery_app.task(name="compute_signal")
def compute_signal(watchlist_id: int):
    db = SessionLocal()
    try:
        time.sleep(2)  # simulate work

        db.execute(
            text("""
            INSERT INTO signals (watchlist_id, value)
            VALUES (:id, :value)
            """),
            {"id": watchlist_id, "value": "BUY"}
        )
        db.commit()
    finally:
        db.close()
