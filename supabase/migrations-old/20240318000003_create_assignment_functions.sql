-- Create type for processing state if not exists
DO $$ BEGIN
    CREATE TYPE request_processing_state AS (
        status TEXT,
        processed_by TEXT,
        modal_type TEXT
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop all existing functions to start fresh
DROP FUNCTION IF EXISTS handle_p2p_assign(uuid, uuid, numeric, text);
DROP FUNCTION IF EXISTS handle_p2p_assign(text, text, numeric, text);
DROP FUNCTION IF EXISTS assign_company_tag(uuid, numeric, uuid, text, text, text);
DROP FUNCTION IF EXISTS assign_company_tag(text, numeric, text, text, text, text);
DROP FUNCTION IF EXISTS assign_p2p(text, text, numeric, text);
DROP FUNCTION IF EXISTS assign_ct(text, text, numeric, text, text, text);
DROP FUNCTION IF EXISTS safe_uuid(text);
DROP FUNCTION IF EXISTS set_processing_state(text, text, text, text);

-- First, let's check and alter the tables if needed
DO $$ 
BEGIN
    -- Check if the columns are UUID and alter them if needed
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'redeem_requests' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE redeem_requests ALTER COLUMN id TYPE TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recharge_requests' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE recharge_requests ALTER COLUMN id TYPE TEXT;
    END IF;
END $$;

-- Helper function to validate ID formats
CREATE OR REPLACE FUNCTION validate_request_id(
    id TEXT,
    request_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    IF request_type = 'recharge' THEN
        RETURN id ~ '^L-[0-9]+[A-Z0-9]{4}$';
    ELSIF request_type = 'redeem' THEN
        RETURN id ~ '^R-[0-9]+[A-Z0-9]{4}$';
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Helper function to set processing state
CREATE OR REPLACE FUNCTION set_processing_state(
    p_recharge_id TEXT,
    p_status TEXT,
    p_processed_by TEXT,
    p_modal_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_processing_state request_processing_state;
BEGIN
    -- Validate recharge ID format
    IF NOT validate_request_id(p_recharge_id, 'recharge') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Invalid recharge ID format: %s', p_recharge_id)
        );
    END IF;

    -- Create processing state
    v_processing_state := ROW(p_status, p_processed_by, p_modal_type)::request_processing_state;

    -- Update recharge request
    UPDATE recharge_requests 
    SET processing_state = v_processing_state
    WHERE id = p_recharge_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Processing state updated successfully'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Function to assign P2P
CREATE OR REPLACE FUNCTION assign_p2p(
    recharge_id TEXT,
    redeem_id TEXT,
    assign_amount NUMERIC,
    match_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_processing_state request_processing_state;
    v_redeem_record RECORD;
    v_recharge_record RECORD;
BEGIN
    -- Validate ID formats
    IF NOT validate_request_id(recharge_id, 'recharge') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Invalid recharge ID format: %s', recharge_id)
        );
    END IF;

    IF NOT validate_request_id(redeem_id, 'redeem') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Invalid redeem ID format: %s', redeem_id)
        );
    END IF;

    -- Check if records exist
    SELECT 
        r.*,
        COALESCE(r.amount_hold, 0) as current_hold,
        r.total_amount - COALESCE(r.amount_hold, 0) as available_amount
    INTO v_redeem_record 
    FROM redeem_requests r
    WHERE r.id = redeem_id
    AND r.status = 'queued'
    FOR UPDATE;  -- Lock the row

    IF v_redeem_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Redeem request not found or not in queued status: %s', redeem_id)
        );
    END IF;

    -- Check available amount
    IF v_redeem_record.available_amount < assign_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Insufficient available amount. Required: %s, Available: %s', 
                assign_amount, 
                v_redeem_record.available_amount
            )
        );
    END IF;

    SELECT * INTO v_recharge_record 
    FROM recharge_requests 
    WHERE id = recharge_id
    AND status = 'pending'
    FOR UPDATE;  -- Lock the row

    IF v_recharge_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Recharge request not found or not in pending status: %s', recharge_id)
        );
    END IF;

    -- Update redeem request
    UPDATE redeem_requests 
    SET amount_hold = v_redeem_record.current_hold + assign_amount
    WHERE id = redeem_id;

    -- Create processing state
    v_processing_state := ROW('idle', NULL, NULL)::request_processing_state;

    -- Update recharge request
    UPDATE recharge_requests 
    SET 
        status = 'assigned',
        assigned_redeem = jsonb_build_object(
            'redeem_id', redeem_id,
            'amount', assign_amount,
            'type', match_type,
            'assigned_at', NOW()
        ),
        processing_state = v_processing_state
    WHERE id = recharge_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Assignment completed successfully'
    );
EXCEPTION WHEN OTHERS THEN
    -- Log the error details
    RAISE NOTICE 'Error details: %', SQLERRM;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', format('Error during assignment: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to assign company tag
CREATE OR REPLACE FUNCTION assign_ct(
    tag_id TEXT,
    recharge_id TEXT,
    assign_amount NUMERIC,
    user_email TEXT,
    cashtag TEXT,
    ct_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_processing_state request_processing_state;
    v_company_tag RECORD;
    v_recharge_record RECORD;
BEGIN
    -- Validate recharge ID format
    IF NOT validate_request_id(recharge_id, 'recharge') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Invalid recharge ID format: %s', recharge_id)
        );
    END IF;

    -- Check if records exist
    SELECT * INTO v_company_tag
    FROM company_tags 
    WHERE c_id = tag_id
    FOR UPDATE;  -- Lock the row

    IF v_company_tag IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Company tag not found: %s', tag_id)
        );
    END IF;

    SELECT * INTO v_recharge_record 
    FROM recharge_requests 
    WHERE id = recharge_id
    AND status = 'pending'
    FOR UPDATE;  -- Lock the row

    IF v_recharge_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Recharge request not found or not in pending status: %s', recharge_id)
        );
    END IF;

    -- Update company tag
    UPDATE company_tags 
    SET 
        balance = balance + assign_amount,
        updated_at = NOW()
    WHERE c_id = tag_id;

    -- Create processing state
    v_processing_state := ROW('idle', NULL, NULL)::request_processing_state;

    -- Update recharge request
    UPDATE recharge_requests 
    SET 
        status = 'assigned',
        assigned_ct = jsonb_build_object(
            'c_id', tag_id,
            'type', ct_type,
            'amount', assign_amount,
            'cashtag', cashtag,
            'assigned_at', NOW(),
            'assigned_by', user_email
        ),
        processing_state = v_processing_state
    WHERE id = recharge_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Assignment completed successfully'
    );
EXCEPTION WHEN OTHERS THEN
    -- Log the error details
    RAISE NOTICE 'Error details: %', SQLERRM;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', format('Error during CT assignment: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql; 