-- Add page_id column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'page_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN page_id TEXT;
    END IF;
END $$;
