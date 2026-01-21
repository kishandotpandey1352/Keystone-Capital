CREATE TABLE IF NOT EXISTS watchlists (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signals (
    id SERIAL PRIMARY KEY,
    watchlist_id INTEGER NOT NULL REFERENCES watchlists(id),
    value TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);