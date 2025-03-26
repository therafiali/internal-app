-- First, add new values to transaction_status enum
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'verification_pending';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'verification_failed';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'verification_rejected';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'initiated';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'paused_partially_paid';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'unverified';

-- Create or update redeem_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'redeem_status') THEN
        CREATE TYPE redeem_status AS ENUM (
            'pending',
            'initiated',
            'under_processing',
            'processed',
            'rejected',
            'verification_failed',
            'verification_rejected',
            'verification_pending',
            'queued',
            'paused',
            'queued_partially_paid',
            'paused_partially_paid',
            'completed',
            'unverified'
        );
    END IF;
END $$;

-- Create recharge_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recharge_status') THEN
        CREATE TYPE recharge_status AS ENUM (
            -- Basic statuses
            'pending',
            'initiated',
            'under_processing',
            'processed',
            'completed',
            'failed',
            'rejected',
            'disputed',
            -- Verification statuses
            'verification_pending',
            'verification_failed',
            'verification_rejected',
            'verified',
            -- Assignment statuses
            'assigned',
            'assigned_and_hold',
            -- Screenshot statuses
            'sc_pending',
            'sc_submitted',
            'sc_processed',
            'sc_rejected',
            -- Queue statuses
            'queued',
            'queued_partially_paid',
            -- Pause statuses
            'paused',
            'paused_partially_paid',
            -- Other statuses
            'unverified'
        );
    END IF;
END $$;

-- Also add these new statuses to transaction_status if they don't exist
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_pending';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_submitted';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_processed';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_rejected';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'verified';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'assigned_and_hold';

-- Update the process_redeem_request function to handle new statuses
CREATE OR REPLACE FUNCTION process_redeem_request(
    p_redeem_id TEXT,
    p_status TEXT,
    p_processed_by UUID,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Start transaction
    BEGIN
        -- Update redeem_requests table
        UPDATE redeem_requests
        SET 
            status = p_status,
            processed_by = p_processed_by,
            processed_at = NOW(),
            notes = p_notes,
            updated_at = NOW()
        WHERE id = p_redeem_id;

        -- Update transactions table with the new status
        UPDATE transactions
        SET 
            current_status = p_status::transaction_status,
            processed_by = p_processed_by,
            updated_at = NOW()
        WHERE redeem_id = p_redeem_id;

        -- Prepare result
        SELECT jsonb_build_object(
            'success', true,
            'message', 'Request processed successfully',
            'redeem_id', p_redeem_id
        ) INTO v_result;

        -- Commit transaction
        RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
        -- Rollback transaction
        RAISE EXCEPTION 'Error processing request: %', SQLERRM;
    END;
END;
$$; 