-- Drop existing functions and triggers first
DROP FUNCTION IF EXISTS public.handle_p2p_assign(text, text, numeric, text);
DROP FUNCTION IF EXISTS public.handle_p2p_assign(text, numeric, text, text);
DROP FUNCTION IF EXISTS public.assign_p2p(text, text, numeric, text);
DROP FUNCTION IF EXISTS public.validate_request_id(text, text);
DROP FUNCTION IF EXISTS public.generate_unique_recharge_id();
DROP FUNCTION IF EXISTS public.generate_redeem_id();
DROP FUNCTION IF EXISTS public.generate_random_chars(integer);

-- Drop existing constraints
ALTER TABLE IF EXISTS public.recharge_requests DROP CONSTRAINT IF EXISTS recharge_id_format;
ALTER TABLE IF EXISTS public.redeem_requests DROP CONSTRAINT IF EXISTS redeem_id_format;

-- Create temporary tables to store data
CREATE TEMP TABLE temp_recharge_requests AS SELECT * FROM recharge_requests;
CREATE TEMP TABLE temp_redeem_requests AS SELECT * FROM redeem_requests;

-- Drop and recreate recharge_requests table with UUID
DROP TABLE IF EXISTS public.recharge_requests CASCADE;
CREATE TABLE public.recharge_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vip_code TEXT NOT NULL,
    player_name TEXT NOT NULL,
    messenger_id TEXT,
    team_code TEXT,
    game_platform TEXT NOT NULL,
    game_username TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    bonus_amount DECIMAL(12,2) DEFAULT 0,
    credits_loaded DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    processing_state JSONB DEFAULT '{"status": "idle", "processed_by": null}'::jsonb,
    promo_code TEXT,
    promo_type TEXT,
    payment_method JSONB,
    screenshot_url TEXT,
    notes TEXT,
    manychat_data JSONB,
    agent_name TEXT,
    agent_department TEXT,
    processed_by UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_redeem JSONB DEFAULT NULL,
    assigned_ct JSONB DEFAULT NULL
);

-- Drop and recreate redeem_requests table with UUID
DROP TABLE IF EXISTS public.redeem_requests CASCADE;
CREATE TABLE public.redeem_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_name TEXT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_hold DECIMAL(12,2) DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    payment_methods JSONB[],
    status TEXT DEFAULT 'queued',
    notes TEXT,
    processed_by UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate indexes
CREATE INDEX idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX idx_recharge_requests_created ON recharge_requests(created_at DESC);
CREATE INDEX idx_redeem_requests_status ON redeem_requests(status);
CREATE INDEX idx_redeem_requests_created ON redeem_requests(created_at DESC);

-- Create the handle_p2p_assign function with UUID support
CREATE OR REPLACE FUNCTION public.handle_p2p_assign(
    p_recharge_id UUID,
    p_redeem_id UUID,
    p_assign_amount NUMERIC,
    p_match_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_recharge_record RECORD;
    v_redeem_record RECORD;
    v_current_hold NUMERIC;
    v_result JSONB;
BEGIN
    -- Input validation
    IF p_recharge_id IS NULL OR p_redeem_id IS NULL OR p_assign_amount IS NULL OR p_match_type IS NULL THEN
        RAISE EXCEPTION 'All parameters are required';
    END IF;

    IF p_assign_amount <= 0 THEN
        RAISE EXCEPTION 'Assignment amount must be greater than 0';
    END IF;

    -- Get recharge request
    SELECT * INTO v_recharge_record
    FROM recharge_requests
    WHERE id = p_recharge_id
    FOR UPDATE;

    -- Get redeem request
    SELECT * INTO v_redeem_record
    FROM redeem_requests
    WHERE id = p_redeem_id
    FOR UPDATE;

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
        RAISE NOTICE 'Error details: %', SQLERRM;
        RAISE EXCEPTION 'Assignment failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_p2p_assign TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_p2p_assign TO service_role; 