-- First, backup existing data
CREATE TABLE IF NOT EXISTS pending_players_backup AS SELECT * FROM pending_players;

-- Drop the existing table
DROP TABLE IF EXISTS pending_players CASCADE;

-- Recreate the table with proper relationships
CREATE TABLE pending_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manychat_data JSONB NOT NULL,
    referrer_code TEXT,
    registration_status TEXT DEFAULT 'pending',
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    remarks TEXT,
    entry_code TEXT,
    entry_valid BOOLEAN,
    firekirin_username TEXT,
    gamevault_username TEXT,
    juwa_username TEXT,
    load_amount DECIMAL(12,2),
    load_game_platform game_platform,
    orionstars_username TEXT,
    team_code TEXT,
    referred_by UUID REFERENCES players(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore the data
INSERT INTO pending_players 
SELECT 
    id,
    manychat_data,
    referrer_code,
    registration_status,
    processed_by,
    processed_at,
    remarks,
    entry_code,
    entry_valid,
    firekirin_username,
    gamevault_username,
    juwa_username,
    load_amount,
    load_game_platform,
    orionstars_username,
    team_code,
    referred_by,
    created_at,
    updated_at
FROM pending_players_backup;

-- Create indexes
CREATE INDEX idx_pending_players_registration ON pending_players(registration_status);
CREATE INDEX idx_pending_players_referrer ON pending_players(referrer_code);
CREATE INDEX idx_pending_players_referred_by ON pending_players(referred_by);

-- Drop the backup table
DROP TABLE IF EXISTS pending_players_backup;

-- Create trigger function for handling player approval
CREATE OR REPLACE FUNCTION handle_player_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if the status is changing to 'approved'
    IF NEW.registration_status = 'approved' AND 
       (OLD.registration_status IS NULL OR OLD.registration_status != 'approved') THEN
        
        -- Check if player already exists with this messenger_id
        IF NOT EXISTS (
            SELECT 1 FROM players 
            WHERE messenger_id = (NEW.manychat_data->>'id')::text
        ) THEN
            -- Insert into players table
            INSERT INTO players (
                vip_code,
                messenger_id,
                player_name,
                team,
                referred_by,
                referred_by_vip_code,
                profile,
                game_usernames,
                created_at
            )
            VALUES (
                -- Generate VIP code
                'VIP' || TO_CHAR(nextval('employee_code_seq'), 'FM000000'),
                -- Extract messenger_id from manychat_data
                NEW.manychat_data->>'id',
                -- Use the name from manychat_data
                NEW.manychat_data->>'name',
                -- Add team code
                NEW.team_code,
                -- Use referred_by if exists
                NEW.referred_by,
                -- Get referrer_code
                NEW.referrer_code,
                -- Construct profile JSON
                jsonb_build_object(
                    'firstName', NEW.manychat_data->>'first_name',
                    'lastName', NEW.manychat_data->>'last_name',
                    'fullName', NEW.manychat_data->>'name',
                    'email', NEW.manychat_data->>'email',
                    'phone', NEW.manychat_data->'custom_fields'->>'phone',
                    'gender', COALESCE(NEW.manychat_data->>'gender', 'not_specified'),
                    'profilePic', NEW.manychat_data->>'profile_pic',
                    'language', COALESCE(NEW.manychat_data->>'language', 'en'),
                    'timezone', COALESCE(NEW.manychat_data->>'timezone', 'UTC')
                ),
                -- Construct game_usernames JSON
                jsonb_build_object(
                    'orionStars', NEW.orionstars_username,
                    'fireKirin', NEW.firekirin_username,
                    'gameVault', NEW.gamevault_username,
                    'juwa', NEW.juwa_username
                ),
                NEW.created_at
            );
        ELSE
            -- If player exists, raise an exception with a clear message
            RAISE EXCEPTION 'Player with messenger ID % already exists in the system', NEW.manychat_data->>'id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_player_approval ON pending_players;
CREATE TRIGGER on_player_approval
    BEFORE UPDATE ON pending_players
    FOR EACH ROW
    EXECUTE FUNCTION handle_player_approval();
