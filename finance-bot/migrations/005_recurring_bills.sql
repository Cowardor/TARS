-- Recurring bills / subscriptions
CREATE TABLE IF NOT EXISTS recurring_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  family_id INTEGER,
  account_id INTEGER,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '💳',
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'PLN',
  day_of_month INTEGER NOT NULL CHECK(day_of_month BETWEEN 1 AND 31),
  category_id INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recurring_bills_user ON recurring_bills(user_id);
