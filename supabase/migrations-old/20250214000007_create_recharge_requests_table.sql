-- Drop existing table and related objects
DROP TRIGGER IF EXISTS trigger_update_recharge_requests_timestamp ON recharge_requests;
DROP FUNCTION IF EXISTS update_recharge_requests_updated_at();
DROP TABLE IF EXISTS recharge_requests CASCADE;

-- Create recharge_requests table
CREATE TABLE recharge_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vip_code TEXT NOT NULL,
    player_name TEXT NOT NULL,
    messenger_id TEXT,
    team_code TEXT,
    game_platform TEXT NOT NULL,
    game_username TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    bonus_amount DECIMAL(12,2) DEFAULT 0,
    credits_loaded DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    promo_code TEXT,
    promo_type TEXT,
    payment_method JSONB,
    screenshot_url TEXT,
    notes TEXT,
    manychat_data JSONB, -- Store the complete player data
    agent_name TEXT,
    agent_department TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for frequently queried columns
CREATE INDEX idx_recharge_requests_vip ON recharge_requests(vip_code);
CREATE INDEX idx_recharge_requests_team ON recharge_requests(team_code);
CREATE INDEX idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX idx_recharge_requests_created ON recharge_requests(created_at);

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_recharge_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recharge_requests_timestamp
    BEFORE UPDATE ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_recharge_requests_updated_at();

-- Add comments to the table and columns for better documentation
COMMENT ON TABLE recharge_requests IS 'Table storing all recharge requests from players';
COMMENT ON COLUMN recharge_requests.id IS 'Unique identifier for the recharge request';
COMMENT ON COLUMN recharge_requests.vip_code IS 'VIP code of the player';
COMMENT ON COLUMN recharge_requests.player_name IS 'Name of the player';
COMMENT ON COLUMN recharge_requests.messenger_id IS 'Messenger ID of the player';
COMMENT ON COLUMN recharge_requests.team_code IS 'Team code of the player';
COMMENT ON COLUMN recharge_requests.game_platform IS 'Gaming platform for the recharge';
COMMENT ON COLUMN recharge_requests.game_username IS 'Username in the gaming platform';
COMMENT ON COLUMN recharge_requests.amount IS 'Amount to be recharged';
COMMENT ON COLUMN recharge_requests.bonus_amount IS 'Bonus amount if applicable';
COMMENT ON COLUMN recharge_requests.credits_loaded IS 'Actual credits loaded';
COMMENT ON COLUMN recharge_requests.status IS 'Current status of the request (pending, assigned, completed, rejected)';
COMMENT ON COLUMN recharge_requests.promo_code IS 'Promotion code if used';
COMMENT ON COLUMN recharge_requests.promo_type IS 'Type of promotion (FIXED, PERCENTAGE)';
COMMENT ON COLUMN recharge_requests.payment_method IS 'Payment method details';
COMMENT ON COLUMN recharge_requests.screenshot_url IS 'URL of the recharge screenshot';
COMMENT ON COLUMN recharge_requests.notes IS 'Additional notes for the request';
COMMENT ON COLUMN recharge_requests.manychat_data IS 'Complete player data from ManyChat';
COMMENT ON COLUMN recharge_requests.agent_name IS 'Name of the agent handling the request';
COMMENT ON COLUMN recharge_requests.agent_department IS 'Department of the agent handling the request';
COMMENT ON COLUMN recharge_requests.processed_by IS 'ID of the user who processed the request';
COMMENT ON COLUMN recharge_requests.processed_at IS 'Timestamp when the request was processed';
COMMENT ON COLUMN recharge_requests.created_at IS 'Timestamp when the request was created';
COMMENT ON COLUMN recharge_requests.updated_at IS 'Timestamp when the request was last updated'; 