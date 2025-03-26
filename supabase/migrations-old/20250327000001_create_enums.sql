-- Create enum types
BEGIN;

-- Create redeem_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'redeem_status') THEN
        CREATE TYPE redeem_status AS ENUM (
            'pending',
            'initiated',
            'under_processing',
            'processed',
            'rejected',
            'verification_pending',
            'verification_failed',
            'queued',
            'paused',
            'queued_partially_paid',
            'paused_partially_paid',
            'completed',
            'unverified'
        );
    END IF;

    -- Create recharge_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recharge_status') THEN
        CREATE TYPE recharge_status AS ENUM (
            'pending',
            'initiated',
            'under_processing',
            'processed',
            'rejected',
            'verification_pending',
            'verification_failed',
            'queued',
            'paused',
            'completed',
            'unverified',
            'assigned',
            'sc_processed',
            'sc_rejected',
            'sc_submitted',
            'sc_verified',
            'sc_failed',
            'verified',
            'disputed'
        );
    END IF;

    -- Create transaction_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM (
            'pending',
            'pending_verification',
            'verified',
            'rejected',
            'completed',
            'failed'
        );
    END IF;

    -- Create action_status_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_status_type') THEN
        CREATE TYPE action_status_type AS ENUM (
            'idle',
            'in_progress'
        );
    END IF;

    -- Create modal_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modal_type') THEN
        CREATE TYPE modal_type AS ENUM (
            'process_modal',
            'reject_modal',
            'approve_modal',
            'verify_modal',
            'payment_modal',
            'none'
        );
    END IF;

    -- Create request_processing_state type
    DROP TYPE IF EXISTS request_processing_state CASCADE;
    CREATE TYPE request_processing_state AS (
        state action_status_type,
        processed_by UUID,
        modal_type modal_type
    );
END$$;

COMMIT; 