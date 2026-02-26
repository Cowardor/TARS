-- Add encrypted passphrase field for exchanges that require it (OKX, KuCoin, Bitget)
ALTER TABLE accounts ADD COLUMN crypto_passphrase TEXT;
