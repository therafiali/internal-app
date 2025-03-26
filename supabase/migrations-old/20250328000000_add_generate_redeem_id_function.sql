-- Create a function to generate a random redeem ID
CREATE OR REPLACE FUNCTION generate_redeem_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding similar looking characters I,1,O,0
    result TEXT := 'R-';
    i INTEGER;
BEGIN
    -- Generate 5 random characters
    FOR i IN 1..5 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Add redeem_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'redeem_requests'
        AND column_name = 'redeem_id'
    ) THEN
        ALTER TABLE redeem_requests ADD COLUMN redeem_id TEXT UNIQUE;
    END IF;
END $$;

-- Create a trigger function to set redeem_id before insert
CREATE OR REPLACE FUNCTION set_redeem_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    new_redeem_id TEXT;
    max_attempts INTEGER := 10;
    current_attempt INTEGER := 0;
BEGIN
    -- Try to generate a unique redeem_id
    LOOP
        new_redeem_id := generate_redeem_id();
        BEGIN
            NEW.redeem_id := new_redeem_id;
            RETURN NEW;
        EXCEPTION WHEN unique_violation THEN
            current_attempt := current_attempt + 1;
            IF current_attempt >= max_attempts THEN
                RAISE EXCEPTION 'Could not generate a unique redeem_id after % attempts', max_attempts;
            END IF;
            -- Continue to next iteration of loop
        END;
    END LOOP;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_set_redeem_id ON redeem_requests;
CREATE TRIGGER tr_set_redeem_id
    BEFORE INSERT ON redeem_requests
    FOR EACH ROW
    WHEN (NEW.redeem_id IS NULL)
    EXECUTE FUNCTION set_redeem_id();

-- Add comment to describe the redeem_id column
COMMENT ON COLUMN redeem_requests.redeem_id IS 'Unique redeem ID in format R-XXXXX (e.g., R-GD1W8)'; 