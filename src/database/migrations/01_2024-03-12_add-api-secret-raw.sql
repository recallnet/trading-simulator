-- Migration: Add api_secret_raw column to teams table
-- This column stores the encrypted raw API secret for HMAC signature validation
-- Date: 2024-01-10

-- Check if column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'teams' AND column_name = 'api_secret_raw'
    ) THEN
        -- Add the new column
        ALTER TABLE teams ADD COLUMN api_secret_raw VARCHAR(255);
        
        -- Log the migration
        RAISE NOTICE 'Added api_secret_raw column to teams table';
    ELSE
        RAISE NOTICE 'Column api_secret_raw already exists in teams table';
    END IF;
END $$; 