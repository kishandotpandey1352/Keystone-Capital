from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy import text
from .db import engine

app = FastAPI(title="Alerts MVP API")

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
