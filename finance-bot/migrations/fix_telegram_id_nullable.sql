-- Make telegram_id nullable for email-registered users
-- PRAGMA foreign_keys = OFF prevents cascade-delete of transactions

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE,
    telegram_username TEXT,
    email TEXT,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'Europe/Warsaw',
    subscription_tier TEXT DEFAULT 'free',
    subscription_expires_at TEXT,
    saltedge_customer_id TEXT,
    daily_reminder INTEGER DEFAULT 1,
    monthly_report INTEGER DEFAULT 1,
    reminder_hour INTEGER DEFAULT 21,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO users_new (
    id, telegram_id, telegram_username, email, password_hash,
    display_name, language, currency, timezone, subscription_tier,
    subscription_expires_at, saltedge_customer_id,
    daily_reminder, monthly_report, reminder_hour, created_at, updated_at
)
SELECT
    id, telegram_id, telegram_username, email, password_hash,
    display_name, language, currency, timezone, subscription_tier,
    subscription_expires_at, saltedge_customer_id,
    daily_reminder, monthly_report, reminder_hour, created_at, updated_at
FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

PRAGMA foreign_keys = ON;
