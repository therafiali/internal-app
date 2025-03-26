-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.handle_p2p_assign(TEXT, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.handle_p2p_assign(UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.handle_p2p_assign(TEXT, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.handle_p2p_assign(UUID, NUMERIC, UUID, TEXT);

-- Create or replace the request_status type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM (
            'pending',
            'assigned',
            'completed',
            'rejected',
            'queued',
            'queued_partially_assigned',
            'queued_fully_assigned'
        );
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create updated function with player details
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
    v_recharge_player_details JSONB;
    v_redeem_player_details JSONB;
    v_transaction_details JSONB;
    v_recharge_status request_status;
    v_payment_method TEXT;
    v_player_image TEXT;
BEGIN
    -- Input validation
    IF p_recharge_id IS NULL OR p_redeem_id IS NULL OR p_assign_amount IS NULL OR p_match_type IS NULL THEN
        RAISE EXCEPTION 'All parameters are required';
    END IF;

    IF p_assign_amount <= 0 THEN
        RAISE EXCEPTION 'Assignment amount must be greater than 0';
    END IF;

    -- Get recharge request with player details
    SELECT 
        r.*,
        jsonb_build_object(
            'name', r.player_name,
            'image', COALESCE(r.manychat_data->'profile'->>'profilePic', 
                    'https://ui-avatars.com/api/?name=' || r.player_name)
        ) as player_details,
        r.status::request_status as request_status
    INTO v_recharge_record
    FROM recharge_requests r
    WHERE id::text = p_recharge_id::text
    FOR UPDATE;

    -- Get redeem request with player details and payment method
    WITH payment_info AS (
        SELECT DISTINCT ON (r.id)
            r.*,
            -- Extract first non-empty payment method
            (SELECT pm
             FROM unnest(r.payment_methods::text[]) pm
             WHERE pm != '(cashapp,$sarah,,,,,,)'
             LIMIT 1
            ) as active_payment_method
        FROM redeem_requests r
        WHERE id::text = p_redeem_id::text
    )
    SELECT 
        pi.*,
        jsonb_build_object(
            'name', pi.player_name,
            'image', 'https://ui-avatars.com/api/?name=' || pi.player_name,
            'payment_method', CASE 
                WHEN pi.active_payment_method IS NOT NULL 
                THEN jsonb_build_object(
                    'platform', (regexp_match(pi.active_payment_method, '\((.*?),'))[1],
                    'username', (regexp_match(pi.active_payment_method, ',\s*(.*?),'))[1]
                )
                ELSE NULL 
            END
        ) as player_details
    INTO v_redeem_record
    FROM payment_info pi
    FOR UPDATE;

    -- Validate records exist
    IF v_recharge_record IS NULL THEN
        RAISE EXCEPTION 'Recharge request % not found', p_recharge_id;
    END IF;

    IF v_redeem_record IS NULL THEN
        RAISE EXCEPTION 'Redeem request % not found', p_redeem_id;
    END IF;

    -- Store player details
    v_recharge_player_details := v_recharge_record.player_details;
    v_redeem_player_details := v_redeem_record.player_details;
    v_recharge_status := v_recharge_record.request_status;

    -- Validate recharge status
    IF v_recharge_status != 'pending'::request_status THEN
        RAISE EXCEPTION 'Recharge request is not in pending status (current status: %)', v_recharge_status;
    END IF;

    -- Calculate current hold amount
    v_current_hold := COALESCE(v_redeem_record.amount_hold, 0);

    -- Validate available amount
    IF (v_redeem_record.total_amount - v_current_hold) < p_assign_amount THEN
        RAISE EXCEPTION 'Insufficient available amount (available: %, required: %)', 
            (v_redeem_record.total_amount - v_current_hold), 
            p_assign_amount;
    END IF;

    -- Create transaction details
    v_transaction_details := jsonb_build_object(
        'transaction_type', 'p2p_assignment',
        'created_at', NOW(),
        'status', 'active'
    );

    -- Create assignment details JSONB with transaction info
    v_result := jsonb_build_object(
        'redeem_id', p_redeem_id,
        'amount', p_assign_amount,
        'type', p_match_type,
        'assigned_at', NOW(),
        'redeem_player', v_redeem_player_details,
        'recharge_player', v_recharge_player_details,
        'transaction', v_transaction_details
    );

    -- Update recharge request
    UPDATE recharge_requests
    SET 
        status = 'assigned'::request_status,
        assigned_redeem = v_result,
        updated_at = NOW()
    WHERE id::text = p_recharge_id::text;

    -- Update redeem request with full assignment details
    UPDATE redeem_requests
    SET 
        amount_hold = COALESCE(amount_hold, 0) + p_assign_amount,
        assigned_redeem = jsonb_build_object(
            'recharge_id', p_recharge_id,
            'amount', p_assign_amount,
            'type', p_match_type,
            'assigned_at', NOW(),
            'recharge_player', v_recharge_player_details,
            'transaction', v_transaction_details
        ),
        status = 'queued_partially_paid'::request_status,
        updated_at = NOW()
    WHERE id::text = p_redeem_id::text;

    -- Update transactions table with assignment details
    UPDATE transactions
    SET 
        assigned_redeem = jsonb_build_object(
            'redeem_id', p_redeem_id,
            'recharge_id', p_recharge_id,
            'amount', p_assign_amount,
            'type', p_match_type,
            'assigned_at', NOW(),
            'redeem_player', v_redeem_player_details,
            'recharge_player', v_recharge_player_details,
            'transaction', v_transaction_details
        ),
        updated_at = NOW()
    WHERE (recharge_uuid::text = p_recharge_id OR redeem_uuid::text = p_redeem_id);

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error details: %', SQLERRM;
        RAISE EXCEPTION 'Assignment failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_p2p_assign TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_p2p_assign TO service_role;

-- Add assigned_redeem column to redeem_requests if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'redeem_requests' 
        AND column_name = 'assigned_redeem'
    ) THEN
        ALTER TABLE redeem_requests ADD COLUMN assigned_redeem JSONB;
    END IF;
END $$; 