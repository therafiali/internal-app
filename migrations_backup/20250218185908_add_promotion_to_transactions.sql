-- Add promotion column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'promotion'
    ) THEN
        ALTER TABLE transactions ADD COLUMN promotion JSONB;
    END IF;
END $$; 