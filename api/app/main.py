import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, APIRouter
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.api.routes import watchlists, signals
from shared.db.session import get_db
from shared.models.watchlist import Watchlist
from shared.db.base import Base
from shared.db.session import engine
from shared.models.watchlist import Watchlist
from sqlalchemy.exc import OperationalError

app = FastAPI()
api_router = APIRouter(prefix="/api/v1")

# app = FastAPI(title="Alerts MVP API")

# --------------------
# Routers
# --------------------
api_router.include_router(signals.router, tags=["signals"])

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
    
    
@api_router.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}

@api_router.get("/health/db")
def db_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}

# --------------------
# WebSocket (Phase 6 later)
# --------------------
@api_router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    await ws.send_json({"type": "server_hello", "payload": {"msg": "connected"}})
    try:
        while True:
            data = await ws.receive_text()
            await ws.send_json({"type": "echo", "payload": {"text": data}})
    except WebSocketDisconnect:
        pass

api_router.include_router(
    watchlists.router,
    tags=["watchlists"]
)

app.include_router(api_router)
