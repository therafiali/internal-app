-- Create a function to generate unique recharge ID
CREATE OR REPLACE FUNCTION generate_unique_recharge_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ID in format L-XXXXX (5 random chars)
    new_id := 'L-' || substr(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      floor(random() * 36 + 1)::integer, 1
    );
    FOR i IN 1..4 LOOP
      new_id := new_id || substr(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        floor(random() * 36 + 1)::integer, 1
      );
    END LOOP;
    
    -- Check if ID already exists
    SELECT EXISTS (
      SELECT 1 FROM recharge_requests WHERE id::text = new_id
    ) INTO exists;
    
    -- Exit loop if ID is unique
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create a new table with the desired structure
CREATE TABLE recharge_requests_new (
    id TEXT PRIMARY KEY,
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
    manychat_data JSONB,
    agent_name TEXT,
    agent_department TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Copy data from old table to new table with new IDs
INSERT INTO recharge_requests_new
SELECT 
    generate_unique_recharge_id(),
    vip_code,
    player_name,
    messenger_id,
    team_code,
    game_platform,
    game_username,
    amount,
    bonus_amount,
    credits_loaded,
    status,
    promo_code,
    promo_type,
    payment_method,
    screenshot_url,
    notes,
    manychat_data,
    agent_name,
    agent_department,
    processed_by,
    processed_at,
    created_at,
    updated_at
FROM recharge_requests;

-- Update references in transactions table
WITH id_mapping AS (
    SELECT r.id as old_id, rn.id as new_id
    FROM recharge_requests r
    JOIN recharge_requests_new rn ON 
        r.vip_code = rn.vip_code AND 
        r.player_name = rn.player_name AND 
        r.created_at = rn.created_at
)
UPDATE transactions t
SET recharge_id = m.new_id
FROM id_mapping m
WHERE t.recharge_id = m.old_id::text;

-- Drop old table and rename new table
DROP TABLE recharge_requests CASCADE;
ALTER TABLE recharge_requests_new RENAME TO recharge_requests;

-- Create indexes
CREATE INDEX idx_recharge_requests_vip ON recharge_requests(vip_code);
CREATE INDEX idx_recharge_requests_team ON recharge_requests(team_code);
CREATE INDEX idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX idx_recharge_requests_created ON recharge_requests(created_at);

-- Create a function to generate the ID for new records
CREATE OR REPLACE FUNCTION generate_recharge_request_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.id := generate_unique_recharge_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically generate the ID for new records
CREATE TRIGGER set_recharge_request_id
  BEFORE INSERT ON recharge_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_recharge_request_id();

-- Add comment explaining the new ID format
COMMENT ON TABLE recharge_requests IS 'Table storing all recharge requests from players';
COMMENT ON COLUMN recharge_requests.id IS 'Custom ID format: L-XXXXX (L- prefix followed by 5 random alphanumeric characters)'; 