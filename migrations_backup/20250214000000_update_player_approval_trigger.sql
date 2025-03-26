-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_player_approval ON pending_players;
DROP FUNCTION IF EXISTS handle_player_approval();

-- Create the updated trigger function
CREATE OR REPLACE FUNCTION handle_player_approval()
RETURNS TRIGGER AS $$
DECLARE
    vip_code_val TEXT;
    existing_player_id UUID;
BEGIN
    -- Only proceed if the status is changing to 'approved'
    IF NEW.registration_status = 'approved' AND 
       (OLD.registration_status IS NULL OR OLD.registration_status != 'approved') THEN
        
        -- Check if player already exists with this messenger_id
        SELECT id INTO existing_player_id
        FROM players 
        WHERE messenger_id = (NEW.manychat_data->>'id')::text;

        IF existing_player_id IS NULL THEN
            -- Generate VIP code
            SELECT 'VIP' || TO_CHAR(nextval('employee_code_seq'), 'FM000000') INTO vip_code_val;
            
            -- Insert into players table
            INSERT INTO players (
                vip_code,
                messenger_id,
                player_name,
                team,
                status,
                referred_by,
                referred_by_vip_code,
                profile,
                game_usernames,
                payment_methods,
                game_limits,
                daily_redeem_limit,
                referral_count,
                referral_bonus_balance
            )
            VALUES (
                vip_code_val,
                (NEW.manychat_data->>'id')::text,
                NEW.manychat_data->>'name',
                COALESCE(NEW.manychat_data->'custom_fields'->>'team_code', NEW.team_code),
                'active',
                NEW.referred_by,
                NEW.referrer_code,
                jsonb_build_object(
                    'firstName', NEW.manychat_data->>'first_name',
                    'lastName', NEW.manychat_data->>'last_name',
                    'fullName', NEW.manychat_data->>'name',
                    'gender', COALESCE(NEW.manychat_data->>'gender', 'unknown'),
                    'language', COALESCE(NEW.manychat_data->>'language', 'en'),
                    'timezone', COALESCE(NEW.manychat_data->>'timezone', 'UTC'),
                    'profilePic', NEW.manychat_data->>'profile_pic'
                ),
                jsonb_build_object(
                    'fireKirin', NEW.firekirin_username,
                    'gameVault', NEW.gamevault_username
                ),
                ARRAY[]::jsonb[],  -- Initialize empty payment_methods array
                '{}'::jsonb,       -- Initialize empty game_limits object
                jsonb_build_object(
                    'limit', 2000,
                    'redeemed', 0,
                    'remaining', 2000,
                    'lastUpdated', CURRENT_TIMESTAMP
                ),
                0,                 -- Initial referral_count
                0.0               -- Initial referral_bonus_balance
            );
            
            RAISE NOTICE 'Successfully created new player with VIP code: % and team: %', vip_code_val, COALESCE(NEW.manychat_data->'custom_fields'->>'team_code', NEW.team_code);
        ELSE
            RAISE EXCEPTION 'Player with messenger_id % already exists', (NEW.manychat_data->>'id')::text;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_player_approval
    BEFORE UPDATE ON pending_players
    FOR EACH ROW
    EXECUTE FUNCTION handle_player_approval(); 