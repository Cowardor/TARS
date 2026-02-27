-- Fix: UNIQUE constraint must include account_id so the same category name
-- can exist under different accounts for the same user.
-- Old: UNIQUE(owner_type, owner_id, name, type)
-- New: UNIQUE(owner_type, owner_id, name, type, account_id)

PRAGMA foreign_keys = OFF;

-- Step 1: Create new table with correct constraint
CREATE TABLE categories_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_type TEXT NOT NULL,
    owner_id INTEGER,
    name TEXT NOT NULL,
    emoji TEXT,
    type TEXT NOT NULL,
    keywords TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    UNIQUE(owner_type, owner_id, name, type, account_id)
);

-- Step 2: Copy all data
INSERT INTO categories_new (id, owner_type, owner_id, name, emoji, type, keywords, is_active, sort_order, created_at, account_id)
SELECT id, owner_type, owner_id, name, emoji, type, keywords, is_active, sort_order, created_at, account_id
FROM categories;

-- Step 3: Drop old table
DROP TABLE categories;

-- Step 4: Rename new table
ALTER TABLE categories_new RENAME TO categories;

-- Step 5: Recreate index
CREATE INDEX idx_categories_owner ON categories(owner_type, owner_id);

PRAGMA foreign_keys = ON;
