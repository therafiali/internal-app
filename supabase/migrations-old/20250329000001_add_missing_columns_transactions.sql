-- Add missing columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS manychat_data JSONB;

-- Update existing records to have empty JSON object if needed
UPDATE transactions 
SET manychat_data = '{}'::jsonb 
WHERE manychat_data IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN transactions.manychat_data IS 'Stores ManyChat related data as JSON, including page_id and other webhook data';

-- Add rollback in case needed
CREATE OR REPLACE FUNCTION remove_manychat_data_column()
RETURNS void AS $$
BEGIN
    ALTER TABLE transactions DROP COLUMN IF EXISTS manychat_data;
END;
$$ LANGUAGE plpgsql; 