-- First verify and fix table structures
DO $$ 
BEGIN
    -- Check and fix recharge_requests table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recharge_requests' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        -- Create temporary table
        CREATE TEMP TABLE temp_recharge_requests AS SELECT * FROM recharge_requests;
        
        -- Drop and recreate table with TEXT id
        DROP TABLE recharge_requests CASCADE;
        
        CREATE TABLE recharge_requests (
            id TEXT PRIMARY KEY,
            vip_code TEXT,
            player_name TEXT,
            player_details JSONB,
            messenger_id TEXT,
            team_code TEXT,
            game_platform TEXT,
            game_username TEXT,
            amount NUMERIC,
            bonus_amount NUMERIC DEFAULT 0,
            credits_loaded NUMERIC DEFAULT 0,
            status TEXT DEFAULT 'pending',
            processing_state JSONB DEFAULT '{"status": "idle"}'::jsonb,
            promo_code TEXT,
            promo_type TEXT,
            payment_method JSONB,
            screenshot_url TEXT,
            notes TEXT,
            manychat_data JSONB,
            agent_name TEXT,
            agent_department TEXT,
            assigned_redeem JSONB,
            processed_by TEXT,
            processed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Copy data back with TEXT ids
        INSERT INTO recharge_requests 
        SELECT 
            id::TEXT,
            vip_code,
            player_name,
            player_details,
            messenger_id,
            team_code,
            game_platform,
            game_username,
            amount,
            bonus_amount,
            credits_loaded,
            status,
            processing_state,
            promo_code,
            promo_type,
            payment_method,
            screenshot_url,
            notes,
            manychat_data,
            agent_name,
            agent_department,
            assigned_redeem,
            processed_by,
            processed_at,
            created_at,
            updated_at
        FROM temp_recharge_requests;

        -- Drop temp table
        DROP TABLE temp_recharge_requests;
    END IF;

    -- Check and fix redeem_requests table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'redeem_requests' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        -- Create temporary table
        CREATE TEMP TABLE temp_redeem_requests AS SELECT * FROM redeem_requests;
        
        -- Drop and recreate table with TEXT id
        DROP TABLE redeem_requests CASCADE;
        
        CREATE TABLE redeem_requests (
            id TEXT PRIMARY KEY,
            player_name TEXT,
            total_amount NUMERIC,
            amount_hold NUMERIC DEFAULT 0,
            payment_methods JSONB,
            status TEXT DEFAULT 'queued',
            notes TEXT,
            processed_by TEXT,
            processed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Copy data back with TEXT ids
        INSERT INTO redeem_requests 
        SELECT 
            id::TEXT,
            player_name,
            total_amount,
            amount_hold,
            payment_methods,
            status,
            notes,
            processed_by,
            processed_at,
            created_at,
            updated_at
        FROM temp_redeem_requests;

        -- Drop temp table
        DROP TABLE temp_redeem_requests;
    END IF;
END $$;

-- Drop existing function and its dependencies
DROP FUNCTION IF EXISTS public.handle_p2p_assign(TEXT, TEXT, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.handle_p2p_assign(UUID, UUID, NUMERIC, TEXT) CASCADE;

-- Create updated function with proper ID handling and additional validation
CREATE OR REPLACE FUNCTION public.handle_p2p_assign(
    p_recharge_id TEXT,
    p_redeem_id TEXT,
    p_assign_amount NUMERIC,
    p_match_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_recharge_record RECORD;
    v_redeem_record RECORD;
    v_current_hold NUMERIC;
    v_result JSONB;
BEGIN
    -- Debug input parameters
    RAISE NOTICE 'Input parameters: recharge_id=%, redeem_id=%, amount=%, type=%',
        p_recharge_id, p_redeem_id, p_assign_amount, p_match_type;

    -- Input validation with specific format checks
    IF p_recharge_id IS NULL OR p_redeem_id IS NULL OR p_assign_amount IS NULL OR p_match_type IS NULL THEN
        RAISE EXCEPTION 'All parameters are required';
    END IF;

    -- Validate ID formats if needed
    IF NOT (p_recharge_id ~ '^[A-Z]-[0-9A-Z]+$') THEN
        RAISE EXCEPTION 'Invalid recharge_id format: %', p_recharge_id;
    END IF;

    IF NOT (p_redeem_id ~ '^[A-Z]-[0-9A-Z]+$') THEN
        RAISE EXCEPTION 'Invalid redeem_id format: %', p_redeem_id;
    END IF;

    IF p_assign_amount <= 0 THEN
        RAISE EXCEPTION 'Assignment amount must be greater than 0';
    END IF;

    -- Get recharge request
    SELECT * INTO v_recharge_record
    FROM recharge_requests
    WHERE id = p_recharge_id::TEXT  -- Explicit TEXT cast
    FOR UPDATE;

    -- Get redeem request
    SELECT * INTO v_redeem_record
    FROM redeem_requests
    WHERE id = p_redeem_id::TEXT  -- Explicit TEXT cast
    FOR UPDATE;

    -- Debug logging
    RAISE NOTICE 'Recharge Record: %', v_recharge_record;
    RAISE NOTICE 'Redeem Record: %', v_redeem_record;

    -- Validate records exist
    IF v_recharge_record IS NULL THEN
        RAISE EXCEPTION 'Recharge request % not found', p_recharge_id;
    END IF;

    IF v_redeem_record IS NULL THEN
        RAISE EXCEPTION 'Redeem request % not found', p_redeem_id;
    END IF;

    -- Validate recharge status
    IF v_recharge_record.status != 'pending' THEN
        RAISE EXCEPTION 'Recharge request is not in pending status (current status: %)', v_recharge_record.status;
    END IF;

    -- Calculate current hold amount
    v_current_hold := COALESCE(v_redeem_record.amount_hold, 0);

    -- Validate available amount
    IF (v_redeem_record.total_amount - v_current_hold) < p_assign_amount THEN
        RAISE EXCEPTION 'Insufficient available amount (available: %, required: %)', 
            (v_redeem_record.total_amount - v_current_hold), 
            p_assign_amount;
    END IF;

    -- Update recharge request
    UPDATE recharge_requests
    SET 
        status = 'assigned',
        assigned_redeem = jsonb_build_object(
            'redeem_id', p_redeem_id,
            'amount', p_assign_amount,
            'type', p_match_type,
            'assigned_at', NOW()
        ),
        updated_at = NOW()
    WHERE id = p_recharge_id
    RETURNING * INTO v_recharge_record;

    -- Debug logging
    RAISE NOTICE 'Updated Recharge Record: %', v_recharge_record;

    -- Update redeem request
    UPDATE redeem_requests
    SET 
        amount_hold = COALESCE(amount_hold, 0) + p_assign_amount,
        status = CASE 
            WHEN (total_amount - (COALESCE(amount_hold, 0) + p_assign_amount)) <= 0 
            THEN 'queued_fully_assigned'
            ELSE 'queued_partially_assigned'
        END,
        updated_at = NOW()
    WHERE id = p_redeem_id
    RETURNING * INTO v_redeem_record;

    -- Debug logging
    RAISE NOTICE 'Updated Redeem Record: %', v_redeem_record;

    -- Build and return result
    v_result := jsonb_build_object(
        'success', true,
        'recharge_id', p_recharge_id,
        'redeem_id', p_redeem_id,
        'amount', p_assign_amount,
        'type', p_match_type,
        'assigned_at', NOW()
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Roll back any changes and return detailed error
        RAISE NOTICE 'Error details: %', SQLERRM;
        RAISE EXCEPTION 'Assignment failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_p2p_assign TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_p2p_assign TO service_role;

-- Verify function exists with correct parameter types
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'handle_p2p_assign' 
        AND pg_get_function_arguments(oid) = 'p_recharge_id text, p_redeem_id text, p_assign_amount numeric, p_match_type text'
    ) THEN
        RAISE EXCEPTION 'Function verification failed';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX IF NOT EXISTS idx_redeem_requests_status ON redeem_requests(status);

-- Final verification
DO $$ 
DECLARE
    v_recharge_type text;
    v_redeem_type text;
BEGIN
    -- Get column types
    SELECT data_type INTO v_recharge_type
    FROM information_schema.columns 
    WHERE table_name = 'recharge_requests' 
    AND column_name = 'id';

    SELECT data_type INTO v_redeem_type
    FROM information_schema.columns 
    WHERE table_name = 'redeem_requests' 
    AND column_name = 'id';

    -- Verify types
    IF v_recharge_type != 'text' OR v_redeem_type != 'text' THEN
        RAISE EXCEPTION 'Column type verification failed. recharge_requests.id: %, redeem_requests.id: %',
            v_recharge_type, v_redeem_type;
    END IF;

    -- Log success
    RAISE NOTICE 'Table structure verification passed. Both ID columns are TEXT type.';
END $$; 