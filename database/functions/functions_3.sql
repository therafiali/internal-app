-- User Management Functions
CREATE OR REPLACE FUNCTION create_user(
    p_id uuid,
    p_email text,
    p_name text,
    p_department text,
    p_role text,
    p_status text,
    p_employee_code text,
    p_ent_access ent_type[],
    p_ent_section ent_type
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO users (
        id,
        email,
        name,
        department,
        role,
        status,
        employee_code,
        ent_access,
        ent_section,
        created_at,
        updated_at
    ) VALUES (
        p_id,
        p_email,
        p_name,
        p_department,
        p_role,
        p_status,
        p_employee_code,
        p_ent_access,
        p_ent_section,
        NOW(),
        NOW()
    );
END;
$$;

CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
        'name', NEW.name,
        'role', NEW.role,
        'department', NEW.department,
        'employee_code', NEW.employee_code,
        'ent_access', NEW.ent_access,
        'ent_section', NEW.ent_section,
        'email', NEW.email
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Player Management Functions
CREATE OR REPLACE FUNCTION handle_player_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    vip_code_val TEXT;
    existing_player_id UUID;
BEGIN
    IF NEW.registration_status = 'approved' AND 
       (OLD.registration_status IS NULL OR OLD.registration_status != 'approved') THEN
        
        SELECT id INTO existing_player_id
        FROM players 
        WHERE messenger_id = (NEW.manychat_data->>'id')::text;

        IF existing_player_id IS NULL THEN
            SELECT 'VIP' || nextval('vip_code_seq')::text INTO vip_code_val;
            
            INSERT INTO players (
                vip_code,
                messenger_id,
                player_name,
                team,
                status,
                referred_by,
                referred_by_vip_code,
                referral_count,
                referral_bonus_balance,
                profile,
                game_usernames,
                payment_methods,
                game_limits,
                daily_redeem_limit
            )
            VALUES (
                vip_code_val,
                (NEW.manychat_data->>'id')::text,
                NEW.manychat_data->>'name',
                COALESCE(NEW.manychat_data->'custom_fields'->>'team_code', NEW.team_code),
                'active',
                NEW.referred_by,
                NEW.referrer_code,
                0,
                0.0,
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
                    'orionStars', null,
                    'fireKirin', NEW.firekirin_username,
                    'gameVault', NEW.gamevault_username
                ),
                ARRAY[]::jsonb[],
                '{}'::jsonb,
                jsonb_build_object(
                    'limit', 2000,
                    'redeemed', 0,
                    'remaining', 2000,
                    'lastUpdated', CURRENT_TIMESTAMP
                )
            );
            
            RAISE NOTICE 'Successfully created new player with VIP code: % and team: %', vip_code_val, COALESCE(NEW.manychat_data->'custom_fields'->>'team_code', NEW.team_code);
        ELSE
            RAISE EXCEPTION 'Player with messenger_id % already exists', (NEW.manychat_data->>'id')::text;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Payment Processing Functions
CREATE OR REPLACE FUNCTION process_payment_with_balance(
    p_redeem_id uuid,
    p_status text,
    p_amount_paid numeric,
    p_amount_hold numeric,
    p_payment_methods jsonb[],
    p_notes text,
    p_cashtag text,
    p_amount numeric
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
    v_result JSONB;
    payment_method JSONB;
BEGIN
    BEGIN
        IF p_payment_methods IS NOT NULL THEN
            FOREACH payment_method IN ARRAY p_payment_methods
            LOOP
                IF NOT validate_payment_method(payment_method) THEN
                    RAISE EXCEPTION 'Invalid payment method structure: %', payment_method;
                END IF;
            END LOOP;
        END IF;

        UPDATE redeem_requests
        SET 
            status = p_status,
            amount_paid = p_amount_paid,
            amount_hold = p_amount_hold,
            payment_methods = p_payment_methods,
            notes = p_notes,
            processed_at = NOW(),
            updated_at = NOW(),
            action_status = 'idle'
        WHERE id = p_redeem_id
        RETURNING to_jsonb(redeem_requests.*) INTO v_result;

        UPDATE company_tags
        SET 
            balance = balance - p_amount,
            updated_at = NOW()
        WHERE cashtag = p_cashtag;

        RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process payment: %', SQLERRM;
    END;
END;
$$;

-- Utility Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_company_tag_last_active()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$;

-- Cleanup Functions
CREATE OR REPLACE FUNCTION rollback_vip_code_column()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    ALTER TABLE transactions DROP COLUMN IF EXISTS vip_code;
END;
$$;

CREATE OR REPLACE FUNCTION rollback_deposit_status_changes()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DROP TRIGGER IF EXISTS sync_deposit_status_trigger ON recharge_requests;
    DROP FUNCTION IF EXISTS sync_deposit_status();
    DROP FUNCTION IF EXISTS handle_recharge_request_transaction();
    DROP FUNCTION IF EXISTS sync_existing_deposit_status();
    
    ALTER TABLE recharge_requests DROP COLUMN IF EXISTS deposit_status;
    ALTER TABLE transactions DROP COLUMN IF EXISTS deposit_status;
    
    DROP TYPE IF EXISTS deposit_status;
END;
$$;

CREATE OR REPLACE FUNCTION rollback_vip_code_functions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DROP TRIGGER IF EXISTS set_recharge_vip_code_trigger ON recharge_requests;
    DROP TRIGGER IF EXISTS set_redeem_vip_code_trigger ON redeem_requests;
    
    DROP FUNCTION IF EXISTS generate_vip_code(TEXT, TEXT);
    DROP FUNCTION IF EXISTS set_recharge_vip_code();
    DROP FUNCTION IF EXISTS set_redeem_vip_code();
    DROP FUNCTION IF EXISTS update_all_existing_vip_codes();
    DROP FUNCTION IF EXISTS rollback_vip_code_functions();
END;
$$;

CREATE OR REPLACE FUNCTION remove_all_transaction_triggers()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DROP TRIGGER IF EXISTS create_recharge_transaction ON recharge_requests;
    DROP TRIGGER IF EXISTS create_redeem_transaction ON redeem_requests;
    DROP TRIGGER IF EXISTS sync_recharge_transaction_trigger ON recharge_requests;
    DROP TRIGGER IF EXISTS sync_redeem_transaction_trigger ON redeem_requests;
    DROP TRIGGER IF EXISTS delete_recharge_transaction_trigger ON recharge_requests;
    DROP TRIGGER IF EXISTS delete_redeem_transaction_trigger ON redeem_requests;

    DROP FUNCTION IF EXISTS handle_recharge_request_transaction();
    DROP FUNCTION IF EXISTS handle_redeem_request_transaction();
    DROP FUNCTION IF EXISTS sync_recharge_transaction();
    DROP FUNCTION IF EXISTS sync_redeem_transaction();
    DROP FUNCTION IF EXISTS handle_recharge_delete();
    DROP FUNCTION IF EXISTS handle_redeem_delete();
    DROP FUNCTION IF EXISTS map_status_to_transaction_status();
    DROP FUNCTION IF EXISTS remove_all_transaction_triggers();
END;
$$; 