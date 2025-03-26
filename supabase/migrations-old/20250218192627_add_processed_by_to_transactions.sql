-- Add processed_by column to transactions table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'processed_by'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN processed_by UUID REFERENCES users(id);
    END IF;
END $$;
