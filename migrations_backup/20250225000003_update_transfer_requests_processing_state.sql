-- Create enum for modal types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE modal_type AS ENUM (
        'process_modal',
        'reject_modal',
        'approve_modal',
        'verify_modal',
        'payment_modal',
        'none'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create action status type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE action_status_type AS ENUM (
        'idle',
        'in_progress'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create composite type for processing state
DO $$ BEGIN
    CREATE TYPE request_processing_state AS (
        status action_status_type,
        processed_by UUID,
        modal_type modal_type
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update transfer_requests table
ALTER TABLE transfer_requests
    DROP COLUMN IF EXISTS processing_state,
    DROP COLUMN IF EXISTS processing_by,
    DROP COLUMN IF EXISTS processing_type;

ALTER TABLE transfer_requests
    ADD COLUMN processing_state request_processing_state NOT NULL DEFAULT ROW('idle', NULL, 'none')::request_processing_state;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transfer_requests_processing_status 
ON transfer_requests (((processing_state).status));

CREATE INDEX IF NOT EXISTS idx_transfer_requests_processor 
ON transfer_requests (((processing_state).processed_by));

-- Create or replace function to acquire processing
CREATE OR REPLACE FUNCTION acquire_transfer_processing(
    p_transfer_id TEXT,
    p_user_id UUID,
    p_modal_type modal_type DEFAULT 'none'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE transfer_requests
    SET processing_state = ROW('in_progress', p_user_id, p_modal_type)::request_processing_state
    WHERE id = p_transfer_id 
    AND (processing_state).status = 'idle'
    AND (processing_state).processed_by IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to release processing
CREATE OR REPLACE FUNCTION release_transfer_processing(
    p_transfer_id TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE transfer_requests
    SET processing_state = ROW('idle', NULL, 'none')::request_processing_state
    WHERE id = p_transfer_id
    AND (processing_state).processed_by = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql; 