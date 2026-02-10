-- Migration: Add Salt Edge support columns
-- Run: npx wrangler d1 execute finance-bot-db --file=migrations/003_saltedge_support.sql

-- Add Salt Edge customer ID to users table
ALTER TABLE users ADD COLUMN saltedge_customer_id TEXT;

-- Add Salt Edge customer ID to bank_connections table
ALTER TABLE bank_connections ADD COLUMN saltedge_customer_id TEXT;
