-- Drop existing table and related objects
DROP TRIGGER IF EXISTS trigger_update_redeem_requests_timestamp ON redeem_requests;
DROP FUNCTION IF EXISTS update_redeem_requests_updated_at();
DROP TABLE IF EXISTS redeem_requests CASCADE;

-- Create redeem_requests table
CREATE TABLE redeem_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vip_code TEXT NOT NULL,
    player_name TEXT NOT NULL,
    messenger_id TEXT,
    team_code TEXT,
    game_platform TEXT NOT NULL,
    game_username TEXT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_methods JSONB[], -- Array of payment method objects
    notes TEXT,
    manychat_data JSONB, -- Store the complete player data
    agent_name TEXT,
    agent_department TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    verification_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for frequently queried columns
CREATE INDEX idx_redeem_requests_vip ON redeem_requests(vip_code);
CREATE INDEX idx_redeem_requests_team ON redeem_requests(team_code);
CREATE INDEX idx_redeem_requests_status ON redeem_requests(status);
CREATE INDEX idx_redeem_requests_created ON redeem_requests(created_at);

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_redeem_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_redeem_requests_timestamp
    BEFORE UPDATE ON redeem_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_redeem_requests_updated_at();

-- Add comments to the table and columns for better documentation
COMMENT ON TABLE redeem_requests IS 'Table storing all redeem requests from players';
COMMENT ON COLUMN redeem_requests.id IS 'Unique identifier for the redeem request';
COMMENT ON COLUMN redeem_requests.vip_code IS 'VIP code of the player making the request';
COMMENT ON COLUMN redeem_requests.player_name IS 'Name of the player making the request';
COMMENT ON COLUMN redeem_requests.messenger_id IS 'Messenger ID of the player';
COMMENT ON COLUMN redeem_requests.team_code IS 'Team code of the player';
COMMENT ON COLUMN redeem_requests.game_platform IS 'Gaming platform for the redeem request';
COMMENT ON COLUMN redeem_requests.game_username IS 'Username in the gaming platform';
COMMENT ON COLUMN redeem_requests.total_amount IS 'Total amount requested for redemption';
COMMENT ON COLUMN redeem_requests.status IS 'Current status of the redeem request (pending, verified, completed, rejected)';
COMMENT ON COLUMN redeem_requests.payment_methods IS 'Array of payment methods selected for this request';
COMMENT ON COLUMN redeem_requests.notes IS 'Additional notes for the redeem request';
COMMENT ON COLUMN redeem_requests.manychat_data IS 'Complete ManyChat data of the player';
COMMENT ON COLUMN redeem_requests.agent_name IS 'Name of the agent handling the request';
COMMENT ON COLUMN redeem_requests.agent_department IS 'Department of the agent handling the request';
COMMENT ON COLUMN redeem_requests.processed_by IS 'ID of the user who processed the request';
COMMENT ON COLUMN redeem_requests.processed_at IS 'Timestamp when the request was processed';
COMMENT ON COLUMN redeem_requests.verified_by IS 'ID of the user who verified the request';
COMMENT ON COLUMN redeem_requests.verified_at IS 'Timestamp when the request was verified';
COMMENT ON COLUMN redeem_requests.verification_remarks IS 'Remarks added during verification';
COMMENT ON COLUMN redeem_requests.created_at IS 'Timestamp when the request was created';
COMMENT ON COLUMN redeem_requests.updated_at IS 'Timestamp when the request was last updated'; 