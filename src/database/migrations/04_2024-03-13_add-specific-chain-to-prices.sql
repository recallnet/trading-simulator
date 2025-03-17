-- Add specific_chain column to prices table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prices' AND column_name = 'specific_chain'
    ) THEN
        ALTER TABLE prices ADD COLUMN specific_chain VARCHAR(20);
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_prices_specific_chain ON prices(specific_chain);
        CREATE INDEX IF NOT EXISTS idx_prices_token_specific_chain ON prices(token, specific_chain);
        
        RAISE NOTICE 'Added specific_chain column to prices table';
    ELSE
        RAISE NOTICE 'specific_chain column already exists in prices table';
    END IF;
END
$$; 