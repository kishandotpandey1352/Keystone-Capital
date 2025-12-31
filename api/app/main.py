from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy import text
from app.db.session import engine
from fastapi import FastAPI
from app.api.routes import watchlists
from app.api.routes import signals
from celery import Celery
import os
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db

app = FastAPI(title="Alerts MVP API")

app.include_router(watchlists.router)
app.include_router(signals.router)


celery_app = Celery(
    "api",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),
)

@app.get("/health")
def health():
    # Verify DB is reachable (Day-1 sanity check)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    await ws.send_json({"type": "server_hello", "payload": {"msg": "connected"}})
    try:
        while True:
            data = await ws.receive_text()
            # Day-1: echo. Later: broadcast real events.
            await ws.send_json({"type": "echo", "payload": {"text": data}})
    except WebSocketDisconnect:
        return
    

@app.get("/health/celery")
def celery_health():
    result = celery_app.send_task("health_check")
    return {"task_id": result.id}


@app.get("/health/db")
def db_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
