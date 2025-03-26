-- Add vip_code column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS vip_code TEXT;

-- Add rollback function
CREATE OR REPLACE FUNCTION rollback_vip_code_column()
RETURNS void AS $$
BEGIN
    -- Remove vip_code column
    ALTER TABLE transactions DROP COLUMN IF EXISTS vip_code;
END;
$$ LANGUAGE plpgsql; 