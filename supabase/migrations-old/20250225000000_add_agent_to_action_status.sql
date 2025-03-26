-- Drop existing indexes that depend on action_status
DROP INDEX IF EXISTS idx_recharge_requests_action_status;
DROP INDEX IF EXISTS idx_redeem_requests_action_status;

-- Create a new composite type for processing state
CREATE TYPE request_processing_state AS (
    status action_status_type,  -- reusing existing enum ('idle', 'in_progress')
    processed_by UUID          -- ID of the agent/user who is processing the request
);

-- Alter recharge_requests table
ALTER TABLE recharge_requests 
    DROP COLUMN action_status,
    ADD COLUMN processing_state request_processing_state NOT NULL DEFAULT ROW('idle', NULL);

-- Alter redeem_requests table
ALTER TABLE redeem_requests 
    DROP COLUMN action_status,
    ADD COLUMN processing_state request_processing_state NOT NULL DEFAULT ROW('idle', NULL);

-- Add new indexes using correct syntax for composite types
CREATE INDEX idx_recharge_requests_processing_status ON recharge_requests (((processing_state).status));
CREATE INDEX idx_recharge_requests_processor ON recharge_requests (((processing_state).processed_by));

CREATE INDEX idx_redeem_requests_processing_status ON redeem_requests (((processing_state).status));
CREATE INDEX idx_redeem_requests_processor ON redeem_requests (((processing_state).processed_by));

-- Add comments
COMMENT ON COLUMN recharge_requests.processing_state IS 'Request processing state: {status: idle/in_progress, processed_by: UUID of user who is processing the request}';
COMMENT ON COLUMN redeem_requests.processing_state IS 'Request processing state: {status: idle/in_progress, processed_by: UUID of user who is processing the request}';

-- Function to acquire processing state
CREATE OR REPLACE FUNCTION acquire_request_processing(
    request_id TEXT,
    user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to acquire processing on recharge request if it's not already being processed
    UPDATE recharge_requests
    SET processing_state = ROW('in_progress', user_id)::request_processing_state
    WHERE id = request_id 
    AND (processing_state).status = 'idle'
    AND (processing_state).processed_by IS NULL;

    IF NOT FOUND THEN
        -- If not found in recharge, try redeem request
        UPDATE redeem_requests
        SET processing_state = ROW('in_progress', user_id)::request_processing_state
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
    SET processing_state = ROW('idle', NULL)::request_processing_state
    WHERE id = request_id
    AND (processing_state).processed_by = user_id;

    IF NOT FOUND THEN
        -- If not found in recharge, try redeem request
        UPDATE redeem_requests
        SET processing_state = ROW('idle', NULL)::request_processing_state
        WHERE id = request_id
        AND (processing_state).processed_by = user_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql; 