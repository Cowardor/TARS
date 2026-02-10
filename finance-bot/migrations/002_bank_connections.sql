-- Migration: Add bank_connections table for Open Banking (Nordigen)
-- Date: 2026-02-02

CREATE TABLE IF NOT EXISTS bank_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    family_id INTEGER,
    requisition_id TEXT UNIQUE NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT,
    account_ids TEXT,  -- JSON array of account IDs
    status TEXT DEFAULT 'pending',  -- pending, linked, expired, error
    last_sync_at TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
    UNIQUE(user_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);
CREATE INDEX IF NOT EXISTS idx_bank_connections_requisition ON bank_connections(requisition_id);
