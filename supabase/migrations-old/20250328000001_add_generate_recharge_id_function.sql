-- Create a function to generate a random recharge ID
CREATE OR REPLACE FUNCTION generate_recharge_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding similar looking characters I,1,O,0
    result TEXT := 'L-';
    i INTEGER;
BEGIN
    -- Generate 5 random characters
    FOR i IN 1..5 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Add recharge_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'recharge_requests'
        AND column_name = 'recharge_id'
    ) THEN
        ALTER TABLE recharge_requests ADD COLUMN recharge_id TEXT UNIQUE;
    END IF;
END $$;

-- Create a trigger function to set recharge_id before insert
CREATE OR REPLACE FUNCTION set_recharge_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    new_recharge_id TEXT;
    max_attempts INTEGER := 10;
    current_attempt INTEGER := 0;
BEGIN
    -- Try to generate a unique recharge_id
    LOOP
        new_recharge_id := generate_recharge_id();
        BEGIN
            NEW.recharge_id := new_recharge_id;
            RETURN NEW;
        EXCEPTION WHEN unique_violation THEN
            current_attempt := current_attempt + 1;
            IF current_attempt >= max_attempts THEN
                RAISE EXCEPTION 'Could not generate a unique recharge_id after % attempts', max_attempts;
            END IF;
            -- Continue to next iteration of loop
        END;
    END LOOP;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_set_recharge_id ON recharge_requests;
CREATE TRIGGER tr_set_recharge_id
    BEFORE INSERT ON recharge_requests
    FOR EACH ROW
    WHEN (NEW.recharge_id IS NULL)
    EXECUTE FUNCTION set_recharge_id();

-- Add comment to describe the recharge_id column
COMMENT ON COLUMN recharge_requests.recharge_id IS 'Unique recharge ID in format L-XXXXX (e.g., L-GD1W8)'; 