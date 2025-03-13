-- Add chain column to prices table for multi-chain support
ALTER TABLE prices ADD COLUMN IF NOT EXISTS chain VARCHAR(10);

-- Create an index on the chain column for better query performance
CREATE INDEX IF NOT EXISTS idx_prices_chain ON prices(chain);

-- Create a compound index on token and chain for queries that filter by both
CREATE INDEX IF NOT EXISTS idx_prices_token_chain ON prices(token, chain);

-- Add comment to the table
COMMENT ON COLUMN prices.chain IS 'Blockchain type (svm for Solana, evm for Ethereum)'; 