-- Modify table columns to use TEXT instead of UUID
DO $$ 
BEGIN
    -- Alter recharge_requests table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recharge_requests' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.recharge_requests 
        ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    -- Alter redeem_requests table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'redeem_requests' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.redeem_requests 
        ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;
END $$;

-- Create or modify recharge_requests table if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recharge_requests' AND column_name = 'assigned_redeem') THEN
        ALTER TABLE IF EXISTS public.recharge_requests 
        ADD COLUMN assigned_redeem JSONB;
    END IF;
END $$;

-- Create or modify redeem_requests table if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redeem_requests' AND column_name = 'amount_hold') THEN
        ALTER TABLE IF EXISTS public.redeem_requests 
        ADD COLUMN amount_hold NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Check and modify any foreign key constraints
DO $$ 
DECLARE
    fk_record RECORD;
BEGIN
    -- Get all foreign key constraints referencing recharge_requests.id or redeem_requests.id
    FOR fk_record IN 
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (
            (ccu.table_name = 'recharge_requests' AND ccu.column_name = 'id')
            OR 
            (ccu.table_name = 'redeem_requests' AND ccu.column_name = 'id')
        )
    LOOP
        -- Drop the foreign key constraint
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
            fk_record.table_schema,
            fk_record.table_name,
            fk_record.constraint_name
        );
        
        -- Alter the referencing column to TEXT
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE TEXT USING %I::TEXT',
            fk_record.table_schema,
            fk_record.table_name,
            fk_record.column_name,
            fk_record.column_name
        );
        
        -- Recreate the foreign key constraint
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I)',
            fk_record.table_schema,
            fk_record.table_name,
            fk_record.constraint_name,
            fk_record.column_name,
            fk_record.table_schema,
            fk_record.foreign_table_name,
            fk_record.foreign_column_name
        );
    END LOOP;
END $$;

-- Drop existing function if it exists (with all possible parameter combinations)
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS public.handle_p2p_assign(TEXT, TEXT, NUMERIC, TEXT);
    DROP FUNCTION IF EXISTS public.handle_p2p_assign(UUID, UUID, NUMERIC, TEXT);
EXCEPTION 
    WHEN others THEN 
        NULL;
END $$;

-- Create the handle_p2p_assign function with proper type handling
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
    -- Input validation
    IF p_recharge_id IS NULL OR p_redeem_id IS NULL OR p_assign_amount IS NULL OR p_match_type IS NULL THEN
        RAISE EXCEPTION 'All parameters are required';
    END IF;

    IF p_assign_amount <= 0 THEN
        RAISE EXCEPTION 'Assignment amount must be greater than 0';
    END IF;

    -- Get recharge request with explicit column selection
    SELECT 
        id,
        status,
        amount,
        assigned_redeem,
        updated_at,
        created_at
    INTO v_recharge_record
    FROM recharge_requests
    WHERE id = p_recharge_id
    FOR UPDATE;

    -- Get redeem request with explicit column selection
    SELECT 
        id,
        total_amount,
        amount_hold,
        status,
        updated_at,
        created_at
    INTO v_redeem_record
    FROM redeem_requests
    WHERE id = p_redeem_id
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
