-- Create enum for modal types
CREATE TYPE modal_type AS ENUM (
    'process_modal',
    'reject_modal',
    'approve_modal',
    'verify_modal',
    'payment_modal',
    'none'
);

-- Drop existing type dependencies
DROP FUNCTION IF EXISTS acquire_request_processing;
DROP FUNCTION IF EXISTS release_request_processing;

-- Create new composite type
CREATE TYPE request_processing_state_new AS (
    status action_status_type,
    processed_by UUID,
    modal_type modal_type
);

-- Update recharge_requests table
ALTER TABLE recharge_requests 
    ALTER COLUMN processing_state DROP DEFAULT,
    ALTER COLUMN processing_state TYPE request_processing_state_new 
    USING ROW((processing_state).status, (processing_state).processed_by, 'none'::modal_type)::request_processing_state_new,
    ALTER COLUMN processing_state SET DEFAULT ROW('idle', NULL, 'none')::request_processing_state_new;

-- Update redeem_requests table
ALTER TABLE redeem_requests 
    ALTER COLUMN processing_state DROP DEFAULT,
    ALTER COLUMN processing_state TYPE request_processing_state_new 
    USING ROW((processing_state).status, (processing_state).processed_by, 'none'::modal_type)::request_processing_state_new,
    ALTER COLUMN processing_state SET DEFAULT ROW('idle', NULL, 'none')::request_processing_state_new;

-- Drop old type
DROP TYPE request_processing_state;

-- Rename new type to original name
ALTER TYPE request_processing_state_new RENAME TO request_processing_state;

-- Recreate functions with updated type
CREATE OR REPLACE FUNCTION acquire_request_processing(
    request_id TEXT,
    user_id UUID,
    p_modal_type modal_type DEFAULT 'none'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to acquire processing on recharge request if it's not already being processed
    UPDATE recharge_requests
    SET processing_state = ROW('in_progress', user_id, p_modal_type)::request_processing_state
    WHERE id = request_id 
    AND (processing_state).status = 'idle'
    AND (processing_state).processed_by IS NULL;

    IF NOT FOUND THEN
        -- If not found in recharge, try redeem request
        UPDATE redeem_requests
        SET processing_state = ROW('in_progress', user_id, p_modal_type)::request_processing_state
        WHERE id = request_id 
        AND (processing_state).status = 'idle'
        AND (processing_state).processed_by IS NULL;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to release processing state
CREATE OR REPLACE FUNCTION release_request_processing(
    request_id TEXT,
    user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to release processing on recharge request if processed by the same user
    UPDATE recharge_requests
    SET processing_state = ROW('idle', NULL, 'none')::request_processing_state
    WHERE id = request_id
    AND (processing_state).processed_by = user_id;

    IF NOT FOUND THEN
        -- If not found in recharge, try redeem request
        UPDATE redeem_requests
        SET processing_state = ROW('idle', NULL, 'none')::request_processing_state
        WHERE id = request_id
        AND (processing_state).processed_by = user_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql; 