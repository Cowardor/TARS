-- Portfolio history for crypto accounts — one row per sync
CREATE TABLE IF NOT EXISTS crypto_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    total_usd REAL NOT NULL,
    balances_json TEXT, -- JSON [{symbol, amount, usd_value}]
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_crypto_snapshots_account ON crypto_snapshots(account_id, created_at);
