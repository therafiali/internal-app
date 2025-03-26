-- Create a sequence for VIP numbers
CREATE SEQUENCE IF NOT EXISTS vip_number_seq START 1;

-- Create a temporary column to store old VIP codes
ALTER TABLE players ADD COLUMN old_vip_code TEXT;

-- Backup existing VIP codes
UPDATE players SET old_vip_code = vip_code;

-- Update VIP codes to new sequential format
UPDATE players 
SET vip_code = 'VIP' || nextval('vip_number_seq')::text;

-- Create a function to generate the next VIP code
CREATE OR REPLACE FUNCTION generate_sequential_vip_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'VIP' || nextval('vip_number_seq')::text;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically generate VIP codes for new records
CREATE OR REPLACE FUNCTION set_sequential_vip_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.vip_code IS NULL THEN
        NEW.vip_code := generate_sequential_vip_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_set_vip_code ON players;

-- Create new trigger
CREATE TRIGGER trigger_set_vip_code
    BEFORE INSERT ON players
    FOR EACH ROW
    EXECUTE FUNCTION set_sequential_vip_code();

-- Update references in redeem_requests
UPDATE redeem_requests r
SET vip_code = p.vip_code
FROM players p
WHERE r.vip_code = p.old_vip_code;

-- Update references in recharge_requests
UPDATE recharge_requests r
SET vip_code = p.vip_code
FROM players p
WHERE r.vip_code = p.old_vip_code;

-- Drop the temporary column
ALTER TABLE players DROP COLUMN old_vip_code;

-- Add comment explaining the new VIP code format
COMMENT ON COLUMN players.vip_code IS 'VIP code format: VIPn where n is a sequential number (e.g., VIP1, VIP2)'; 