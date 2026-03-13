-- OAuth Social Login columns
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN apple_id TEXT;
ALTER TABLE users ADD COLUMN facebook_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;
