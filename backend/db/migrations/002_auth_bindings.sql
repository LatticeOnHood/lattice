-- 002_auth_bindings.sql: User Wallet Authentication & Social Account Bindings (X & Telegram)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(LOWER(wallet_address));

CREATE TABLE IF NOT EXISTS x_accounts (
  wallet_address VARCHAR(255) PRIMARY KEY REFERENCES users(wallet_address) ON DELETE CASCADE,
  x_user_id VARCHAR(255) UNIQUE NOT NULL,
  x_handle VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_x_accounts_user_id ON x_accounts(x_user_id);
CREATE INDEX IF NOT EXISTS idx_x_accounts_handle ON x_accounts(LOWER(x_handle));

CREATE TABLE IF NOT EXISTS telegram_accounts (
  wallet_address VARCHAR(255) PRIMARY KEY REFERENCES users(wallet_address) ON DELETE CASCADE,
  telegram_user_id VARCHAR(255) UNIQUE NOT NULL,
  telegram_username VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_accounts_user_id ON telegram_accounts(telegram_user_id);

CREATE TABLE IF NOT EXISTS pending_auth_states (
  state VARCHAR(255) PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'X',
  code_verifier VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes')
);
