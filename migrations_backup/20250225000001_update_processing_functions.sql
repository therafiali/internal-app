-- Drop existing functions
DROP FUNCTION IF EXISTS acquire_request_processing;
DROP FUNCTION IF EXISTS release_request_processing;

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