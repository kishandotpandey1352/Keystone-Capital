# Real-time Alerts MVP

## MVP Scope (Phase 1)
- Watchlists
- Live signals (stored + streamed)
- Alert rules + alert events
- WebSocket streaming: signal updates + alert fired events

## Local Quickstart
1) Copy env:
   cp .env.example .env

2) Start backend stack:
   docker-compose up --build

3) Run migrations:
   docker-compose exec api alembic upgrade head

4) Frontend (run locally):
   cd frontend
   npm install
   npm start

## API
- Health: GET http://localhost:8000/health
- WebSocket: ws://localhost:8000/ws

## WebSocket Events (v1)
Server -> Client messages (JSON):
- {"type":"signal_update","payload":{...}}
- {"type":"alert_fired","payload":{...}}
