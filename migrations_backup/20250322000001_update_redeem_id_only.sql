-- Create a function to generate random alphanumeric string
CREATE OR REPLACE FUNCTION generate_random_string(length INTEGER)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate unique redeem ID
CREATE OR REPLACE FUNCTION generate_unique_redeem_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ID in format R-XXXXX (5 random chars)
    new_id := 'R-' || generate_random_string(5);
    
    -- Check if ID already exists
    SELECT EXISTS (
      SELECT 1 FROM redeem_requests WHERE id::text = new_id
    ) INTO exists;
    
    -- Exit loop if ID is unique
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create a new table with the desired structure
CREATE TABLE redeem_requests_new (
    id TEXT PRIMARY KEY,
    vip_code TEXT NOT NULL,
    player_name TEXT NOT NULL,
    messenger_id TEXT,
    team_code TEXT,
    game_platform TEXT NOT NULL,
    game_username TEXT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_methods JSONB[],
    notes TEXT,
    manychat_data JSONB,
    agent_name TEXT,
    agent_department TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    verification_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Copy data from old table to new table with new IDs
INSERT INTO redeem_requests_new
SELECT 
    generate_unique_redeem_id(),
    vip_code,
    player_name,
    messenger_id,
    team_code,
    game_platform,
    game_username,
    total_amount,
    status,
    payment_methods,
    notes,
    manychat_data,
    agent_name,
    agent_department,
    processed_by,
    processed_at,
    verified_by,
    verified_at,
    verification_remarks,
    created_at,
    updated_at
FROM redeem_requests;

-- Update references in transactions table
WITH id_mapping AS (
    SELECT r.id as old_id, rn.id as new_id
    FROM redeem_requests r
    JOIN redeem_requests_new rn ON 
        r.vip_code = rn.vip_code AND 
        r.player_name = rn.player_name AND 
        r.created_at = rn.created_at
)
UPDATE transactions t
SET redeem_id = m.new_id
FROM id_mapping m
WHERE t.redeem_id = m.old_id::text;

-- Drop old table and rename new table
DROP TABLE redeem_requests CASCADE;
ALTER TABLE redeem_requests_new RENAME TO redeem_requests;

-- Create indexes
CREATE INDEX idx_redeem_requests_vip ON redeem_requests(vip_code);
CREATE INDEX idx_redeem_requests_team ON redeem_requests(team_code);
CREATE INDEX idx_redeem_requests_status ON redeem_requests(status);
CREATE INDEX idx_redeem_requests_created ON redeem_requests(created_at);

-- Create a function to generate the ID for new records
CREATE OR REPLACE FUNCTION generate_redeem_request_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.id := generate_unique_redeem_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically generate the ID for new records
CREATE TRIGGER set_redeem_request_id
  BEFORE INSERT ON redeem_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_redeem_request_id();

-- Add comment explaining the new ID format
COMMENT ON TABLE redeem_requests IS 'Table storing all redeem requests from players';
COMMENT ON COLUMN redeem_requests.id IS 'Custom ID format: R-XXXXX (R- prefix followed by 5 random alphanumeric characters)'; 