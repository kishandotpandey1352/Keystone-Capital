from time import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.api.routes import watchlists, signals
from app.db.session import get_db
from app.api.routes import watchlists
from app.db.session import engine
from app.db.base import Base
from app.db import models
from sqlalchemy.exc import OperationalError

app = FastAPI()

app.include_router(watchlists.router)

# app = FastAPI(title="Alerts MVP API")

# --------------------
# Routers
# --------------------
app.include_router(signals.router)

# --------------------
# Health checks
# --------------------

@app.on_event("startup")
def startup():
    retries = 10
    delay = 2

    for attempt in range(retries):
        try:
            Base.metadata.create_all(bind=engine)
            print("Database connected and tables created")
            break
        except OperationalError as e:
            print(f"Waiting for database... ({attempt + 1}/{retries})")
            time.sleep(delay)
    else:
        raise RuntimeError(" Database not available after retries")
    
    
@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}

@app.get("/health/db")
def db_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}

# --------------------
# WebSocket (Phase 6 later)
# --------------------
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    await ws.send_json({"type": "server_hello", "payload": {"msg": "connected"}})
    try:
        while True:
            data = await ws.receive_text()
            await ws.send_json({"type": "echo", "payload": {"text": data}})
    except WebSocketDisconnect:
        pass

app.include_router(
    watchlists.router,
    prefix="/watchlists",
    tags=["watchlists"]
)
