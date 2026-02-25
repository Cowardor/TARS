-- ============================================================
-- Multi-Accounts Migration
-- Adds personal accounts per user (separate from family system)
-- ============================================================

-- Personal accounts per user
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '💼',
    type TEXT DEFAULT 'personal', -- 'personal'|'business'|'family_shared'|'crypto'
    color TEXT DEFAULT '#3b82f6',
    sort_order INTEGER DEFAULT 0,
    -- Crypto-only fields
    crypto_exchange TEXT,          -- 'binance'|'okx'|'bybit'|'kucoin'
    crypto_api_key TEXT,           -- AES-256-GCM encrypted (enc: prefix)
    crypto_api_secret TEXT,        -- AES-256-GCM encrypted (enc: prefix)
    crypto_cached_balance TEXT,    -- JSON: [{symbol, amount, usd_value}]
    crypto_synced_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- Link transactions to an account (NULL = implicit personal / legacy)
ALTER TABLE transactions ADD COLUMN account_id INTEGER
    REFERENCES accounts(id) ON DELETE SET NULL;

-- Track active account in session (NULL = implicit personal mode)
ALTER TABLE user_sessions ADD COLUMN active_account_id INTEGER
    REFERENCES accounts(id) ON DELETE SET NULL;

-- Allow categories to be scoped to a specific account (NULL = shared)
ALTER TABLE categories ADD COLUMN account_id INTEGER
    REFERENCES accounts(id) ON DELETE CASCADE;
