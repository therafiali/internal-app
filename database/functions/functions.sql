-- Player Management Functions
CREATE OR REPLACE FUNCTION generate_new_vip_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    next_num integer;
BEGIN
    SELECT nextval('vip_number_seq') INTO next_num;
    RETURN 'VIP' || next_num::text;
END;
$$;

CREATE OR REPLACE FUNCTION set_vip_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.vip_code IS NULL THEN
        NEW.vip_code := generate_new_vip_code();
    END IF;
    RETURN NEW;
END;
$$;

-- Request Management Functions
CREATE OR REPLACE FUNCTION calculate_amount_available()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.amount_available = NEW.total_amount - COALESCE(NEW.amount_paid, 0) - COALESCE(NEW.amount_hold, 0);
    IF NEW.amount_available < 0 THEN
        NEW.amount_available = 0;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_deposit_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE transactions
    SET deposit_status = (NEW.deposit_status::text)::deposit_status
    WHERE recharge_id = NEW.recharge_id;
    RETURN NEW;
END;
$$;

-- User Management Functions
CREATE OR REPLACE FUNCTION handle_role_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        jsonb_set(
            raw_user_meta_data,
            '{role}',
            to_jsonb(NEW.role::text)
        ),
        '{ent_access}',
        array_to_json(NEW.ent_access::text[])::jsonb
    )
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

-- Transaction Management Functions
CREATE OR REPLACE FUNCTION process_redeem_request_with_player_update(
    p_redeem_id uuid,
    p_status text,
    p_processed_by uuid,
    p_notes text,
    p_amount numeric,
    p_game_platform text,
    p_vip_code text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current_time TIMESTAMP WITH TIME ZONE;
BEGIN
    v_current_time := NOW();

    UPDATE public.redeem_requests
    SET 
        status = p_status::request_status,
        processed_by = p_processed_by,
        processed_at = v_current_time,
        notes = p_notes,
        updated_at = v_current_time
    WHERE id = p_redeem_id;

    UPDATE public.players
    SET
        updated_at = v_current_time
    WHERE vip_code = p_vip_code;

    IF NOT FOUND THEN
        INSERT INTO public.players (
            vip_code,
            created_at,
            updated_at
        ) VALUES (
            p_vip_code,
            v_current_time,
            v_current_time
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Processing completed successfully'
    );
END;
$$;

-- Company Tag Management Functions
CREATE OR REPLACE FUNCTION assign_company_tag(
    p_tag_id text,
    p_amount numeric,
    p_recharge_id text,
    p_user_email text,
    p_cashtag text,
    p_ct_type text,
    p_company_tag text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_tag_exists boolean;
    v_recharge_exists boolean;
    v_current_limit numeric;
    v_result jsonb;
    v_assigned_ct jsonb;
BEGIN
    SELECT exists(
        SELECT 1 FROM company_tags 
        WHERE c_id = p_tag_id 
        AND status = 'active'
    ) INTO v_tag_exists;

    IF NOT v_tag_exists THEN
        RAISE EXCEPTION 'Company tag % not found or is not active', p_tag_id;
    END IF;

    SELECT exists(
        SELECT 1 
        FROM recharge_requests
        WHERE id::text = p_recharge_id
        AND status = 'pending'
    ) INTO v_recharge_exists;

    IF NOT v_recharge_exists THEN
        RAISE EXCEPTION 'Recharge request % not found or is not in pending state', p_recharge_id;
    END IF;

    SELECT "limit" INTO v_current_limit
    FROM company_tags
    WHERE c_id = p_tag_id;

    IF v_current_limit < p_amount THEN
        RAISE EXCEPTION 'Insufficient limit. Available: $%, Required: $%', v_current_limit, p_amount;
    END IF;

    v_assigned_ct := jsonb_build_object(
        'c_id', p_tag_id,
        'type', COALESCE(p_ct_type, 'personal'),
        'amount', p_amount,
        'cashtag', p_cashtag,
        'assigned_at', NOW(),
        'assigned_by', p_user_email,
        'company_tag', p_company_tag
    );

    UPDATE recharge_requests
    SET 
        status = 'assigned',
        assigned_ct = v_assigned_ct,
        updated_at = NOW()
    WHERE id::text = p_recharge_id
    RETURNING jsonb_build_object(
        'id', id,
        'status', status,
        'assigned_ct', assigned_ct
    ) INTO v_result;

    UPDATE company_tags
    SET 
        "limit" = "limit" - p_amount,
        updated_at = NOW()
    WHERE c_id = p_tag_id;

    UPDATE transactions
    SET 
        assigned_ct = v_assigned_ct,
        updated_at = NOW()
    WHERE recharge_uuid::text = p_recharge_id;

    RETURN v_result;
END;
$$;

-- Utility Functions
CREATE OR REPLACE FUNCTION format_manychat_data(data text)
RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
    RETURN jsonb_build_object(
        '_id', (data::jsonb)->>'_id',
        'team', (data::jsonb)->>'team',
        'status', (data::jsonb)->>'status',
        'profile', (data::jsonb)->'profile',
        'vipCode', (data::jsonb)->>'vipCode',
        'platforms', (data::jsonb)->'platforms',
        'playerName', (data::jsonb)->>'playerName',
        'messengerId', (data::jsonb)->>'messengerId'
    );
END;
$$;

-- Transaction Handling Functions
CREATE OR REPLACE FUNCTION handle_recharge_request_transaction()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_init_by uuid;
    v_deposit_status deposit_status;
BEGIN
    BEGIN
        v_init_by := NEW.init_by::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_init_by := auth.uid();
    END;

    BEGIN
        v_deposit_status := COALESCE(NEW.deposit_status::deposit_status, 'pending'::deposit_status);
    EXCEPTION WHEN OTHERS THEN
        v_deposit_status := 'pending'::deposit_status;
    END;

    INSERT INTO transactions (
        recharge_id,
        recharge_uuid,
        messenger_id,
        page_id,
        current_status,
        payment_status,
        deposit_status,
        amount,
        bonus_amount,
        credits_loaded,
        game_platform,
        game_username,
        team_code,
        promotion,
        payment_method,
        manychat_data,
        action_by,
        vip_code,
        init_by,
        screenshot_url,
        remarks,
        disputed_by,
        created_at,
        updated_at
    ) VALUES (
        NEW.recharge_id,
        NEW.id,
        NEW.messenger_id,
        to_jsonb(NEW.manychat_data)->>'page_id',
        map_status_to_transaction_status(NEW.status::text),
        'pending'::payment_status,
        v_deposit_status,
        NEW.amount,
        NEW.bonus_amount,
        NEW.credits_loaded,
        NEW.game_platform::game_platform,
        NEW.game_username,
        NEW.team_code,
        CASE 
            WHEN NEW.promo_code IS NOT NULL OR NEW.promo_type IS NOT NULL THEN 
                jsonb_build_object(
                    'code', NEW.promo_code,
                    'type', NEW.promo_type
                )
            ELSE NULL
        END,
        to_jsonb(NEW.payment_method),
        to_jsonb(NEW.manychat_data),
        (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1),
        NEW.vip_code,
        v_init_by,
        NEW.screenshot_url,
        NEW.notes,
        NEW.disputed_by,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$;

-- Add other functions here...

-- Note: This is a subset of all functions. The complete list is quite long.
-- You may want to organize them into separate files based on functionality. 