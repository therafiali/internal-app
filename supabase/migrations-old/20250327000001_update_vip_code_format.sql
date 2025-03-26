-- Update VIP code format from VIP700002 to VIP1
BEGIN;

-- Create a sequence for VIP numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS vip_number_seq;

-- Function to generate new VIP code format
CREATE OR REPLACE FUNCTION generate_new_vip_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    next_num integer;
BEGIN
    -- Get next number from sequence
    SELECT nextval('vip_number_seq') INTO next_num;
    -- Return formatted VIP code
    RETURN 'VIP' || next_num::text;
END;
$$;

-- Update existing VIP codes
DO $$
DECLARE
    r RECORD;
    new_vip_code text;
BEGIN
    -- Reset sequence to 1
    ALTER SEQUENCE vip_number_seq RESTART WITH 1;
    
    -- Update each player's VIP code
    FOR r IN SELECT id FROM players WHERE vip_code IS NOT NULL ORDER BY created_at ASC
    LOOP
        SELECT generate_new_vip_code() INTO new_vip_code;
        UPDATE players SET vip_code = new_vip_code WHERE id = r.id;
    END LOOP;
END $$;

-- Create trigger for new VIP code format
CREATE OR REPLACE FUNCTION set_vip_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.vip_code IS NULL THEN
        NEW.vip_code := generate_new_vip_code();
    END IF;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_vip_code_trigger ON players;

-- Create new trigger
CREATE TRIGGER set_vip_code_trigger
    BEFORE INSERT ON players
    FOR EACH ROW
    EXECUTE FUNCTION set_vip_code();

COMMIT; 