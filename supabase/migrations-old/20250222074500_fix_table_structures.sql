-- First, let's check the current structure and data
DO $$ 
DECLARE
    recharge_id_type text;
    redeem_id_type text;
    recharge_count integer;
    redeem_count integer;
BEGIN
    -- Get column types
    SELECT data_type INTO recharge_id_type
    FROM information_schema.columns
    WHERE table_name = 'recharge_requests'
    AND column_name = 'id';

    SELECT data_type INTO redeem_id_type
    FROM information_schema.columns
    WHERE table_name = 'redeem_requests'
    AND column_name = 'id';

    -- Get record counts
    SELECT COUNT(*) INTO recharge_count FROM recharge_requests;
    SELECT COUNT(*) INTO redeem_count FROM redeem_requests;

    RAISE NOTICE 'Current state: recharge_id_type=%, redeem_id_type=%, recharge_count=%, redeem_count=%',
        recharge_id_type, redeem_id_type, recharge_count, redeem_count;
END $$;

-- Create temporary tables to backup data
CREATE TABLE IF NOT EXISTS temp_recharge_requests AS SELECT * FROM recharge_requests;
CREATE TABLE IF NOT EXISTS temp_redeem_requests AS SELECT * FROM redeem_requests;

-- Drop and recreate recharge_requests table with correct structure
DROP TABLE IF EXISTS recharge_requests CASCADE;
CREATE TABLE recharge_requests (
    id TEXT PRIMARY KEY,
    vip_code TEXT,
    player_name TEXT,
    player_details JSONB,
    messenger_id TEXT,
    team_code TEXT,
    game_platform TEXT,
    game_username TEXT,
    amount NUMERIC,
    bonus_amount NUMERIC DEFAULT 0,
    credits_loaded NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    processing_state JSONB DEFAULT '{"status": "idle"}'::jsonb,
    promo_code TEXT,
    promo_type TEXT,
    payment_method JSONB,
    screenshot_url TEXT,
    notes TEXT,
    manychat_data JSONB,
    agent_name TEXT,
    agent_department TEXT,
    assigned_redeem JSONB,
    processed_by TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop and recreate redeem_requests table with correct structure
DROP TABLE IF EXISTS redeem_requests CASCADE;
CREATE TABLE redeem_requests (
    id TEXT PRIMARY KEY,
    player_name TEXT,
    total_amount NUMERIC,
    amount_hold NUMERIC DEFAULT 0,
    payment_methods JSONB,
    status TEXT DEFAULT 'queued',
    notes TEXT,
    processed_by TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore data from temporary tables
INSERT INTO recharge_requests 
SELECT * FROM temp_recharge_requests;

INSERT INTO redeem_requests 
SELECT * FROM temp_redeem_requests;

-- Drop temporary tables
DROP TABLE IF EXISTS temp_recharge_requests;
DROP TABLE IF EXISTS temp_redeem_requests;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_created_at ON recharge_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redeem_requests_status ON redeem_requests(status);
CREATE INDEX IF NOT EXISTS idx_redeem_requests_created_at ON redeem_requests(created_at DESC);

-- Verify the changes
DO $$ 
BEGIN
    -- Check if tables exist with correct column types
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recharge_requests' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'redeem_requests' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        RAISE NOTICE 'Tables recreated successfully with TEXT id columns';
    ELSE
        RAISE EXCEPTION 'Table recreation failed';
    END IF;
END $$;

-- Add RLS policies
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON recharge_requests
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for authenticated users" ON redeem_requests
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON recharge_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON recharge_requests
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users" ON redeem_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON redeem_requests
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON recharge_requests TO authenticated;
GRANT ALL ON redeem_requests TO authenticated;
GRANT ALL ON recharge_requests TO service_role;
GRANT ALL ON redeem_requests TO service_role; 