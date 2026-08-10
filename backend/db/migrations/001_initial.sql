-- Initial database schema for Lattice

CREATE TABLE IF NOT EXISTS token_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address VARCHAR(255) NOT NULL,
  chain VARCHAR(50) DEFAULT 'solana',
  token_name VARCHAR(255),
  token_symbol VARCHAR(100),
  holder_count INT DEFAULT 0,
  market_cap NUMERIC(20, 4) DEFAULT 0,
  dev_hold_percentage NUMERIC(5, 2) DEFAULT 0,
  dev_sold_percentage NUMERIC(5, 2) DEFAULT 0,
  bundler_count INT DEFAULT 0,
  bundler_hold_percentage NUMERIC(5, 2) DEFAULT 0,
  risk_score VARCHAR(50) DEFAULT 'LOW',
  raw_gmgn_response JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_audits_ca ON token_audits(contract_address);
