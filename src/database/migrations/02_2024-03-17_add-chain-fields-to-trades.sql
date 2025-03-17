-- Add chain fields to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS from_chain VARCHAR(10);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS to_chain VARCHAR(10);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS from_specific_chain VARCHAR(20);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS to_specific_chain VARCHAR(20);

-- Update existing trades with chain detection (based on token address)
-- This is just a basic migration - actual chain detection logic would be more complex in a real application
UPDATE trades 
SET 
  from_chain = 
    CASE 
      WHEN char_length(from_token) <= 44 THEN 'svm' 
      ELSE 'evm' 
    END,
  to_chain = 
    CASE 
      WHEN char_length(to_token) <= 44 THEN 'svm' 
      ELSE 'evm' 
    END,
  from_specific_chain = 
    CASE 
      WHEN char_length(from_token) <= 44 THEN 'svm' 
      ELSE 'eth' -- Default to eth for existing trades
    END,
  to_specific_chain = 
    CASE 
      WHEN char_length(to_token) <= 44 THEN 'svm' 
      ELSE 'eth' -- Default to eth for existing trades
    END; 