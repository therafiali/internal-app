-- Drop existing table and related objects
DROP TRIGGER IF EXISTS trigger_update_reset_password_requests_timestamp ON reset_password_requests;
DROP FUNCTION IF EXISTS update_reset_password_requests_updated_at();
DROP TABLE IF EXISTS reset_password_requests CASCADE;

-- Create reset_password_requests table
CREATE TABLE reset_password_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vip_code TEXT NOT NULL,
    player_name TEXT NOT NULL,
    messenger_id TEXT,
    team_code TEXT,
    game_platform TEXT NOT NULL,
    suggested_username TEXT NOT NULL,
    new_password TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    additional_message TEXT,
    manychat_data JSONB, -- Store the complete player data
    agent_name TEXT,
    agent_department TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for frequently queried columns
CREATE INDEX idx_reset_password_requests_vip ON reset_password_requests(vip_code);
CREATE INDEX idx_reset_password_requests_team ON reset_password_requests(team_code);
CREATE INDEX idx_reset_password_requests_status ON reset_password_requests(status);
CREATE INDEX idx_reset_password_requests_created ON reset_password_requests(created_at);

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_reset_password_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reset_password_requests_timestamp
    BEFORE UPDATE ON reset_password_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_reset_password_requests_updated_at();

-- Add comments to the table and columns for better documentation
COMMENT ON TABLE reset_password_requests IS 'Table storing all password reset requests from players';
COMMENT ON COLUMN reset_password_requests.id IS 'Unique identifier for the reset request';
COMMENT ON COLUMN reset_password_requests.vip_code IS 'VIP code of the player';
COMMENT ON COLUMN reset_password_requests.player_name IS 'Name of the player';
COMMENT ON COLUMN reset_password_requests.messenger_id IS 'Messenger ID of the player';
COMMENT ON COLUMN reset_password_requests.team_code IS 'Team code of the player';
COMMENT ON COLUMN reset_password_requests.game_platform IS 'Gaming platform for the reset';
COMMENT ON COLUMN reset_password_requests.suggested_username IS 'Suggested username for the platform';
COMMENT ON COLUMN reset_password_requests.new_password IS 'New password to be set';
COMMENT ON COLUMN reset_password_requests.status IS 'Current status of the request (pending, completed, rejected)';
COMMENT ON COLUMN reset_password_requests.additional_message IS 'Additional notes or message';
COMMENT ON COLUMN reset_password_requests.manychat_data IS 'Complete player data from ManyChat';
COMMENT ON COLUMN reset_password_requests.agent_name IS 'Name of the agent handling the request';
COMMENT ON COLUMN reset_password_requests.agent_department IS 'Department of the agent handling the request';
COMMENT ON COLUMN reset_password_requests.processed_by IS 'ID of the user who processed the request';
COMMENT ON COLUMN reset_password_requests.processed_at IS 'Timestamp when the request was processed';
COMMENT ON COLUMN reset_password_requests.created_at IS 'Timestamp when the request was created';
COMMENT ON COLUMN reset_password_requests.updated_at IS 'Timestamp when the request was last updated'; 