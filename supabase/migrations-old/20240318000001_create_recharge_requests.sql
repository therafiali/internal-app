-- Create recharge_requests table
CREATE TABLE IF NOT EXISTS recharge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vip_code TEXT,
    player_name TEXT NOT NULL,
    messenger_id TEXT,
    team_code TEXT,
    game_platform TEXT,
    game_username TEXT,
    amount DECIMAL NOT NULL,
    bonus_amount DECIMAL DEFAULT 0,
    credits_loaded DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    processing_state JSONB DEFAULT '{"status": "idle", "processed_by": null}'::jsonb,
    promo_code TEXT,
    promo_type TEXT,
    payment_method JSONB,
    screenshot_url TEXT,
    notes TEXT,
    manychat_data JSONB,
    agent_name TEXT,
    agent_department TEXT,
    processed_by UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_redeem JSONB DEFAULT NULL,
    assigned_ct JSONB DEFAULT NULL,
    platform_usernames JSONB DEFAULT '{"firekirin": null, "orionstars": null}'::jsonb
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_created_at ON recharge_requests(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_recharge_requests_updated_at
    BEFORE UPDATE ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 