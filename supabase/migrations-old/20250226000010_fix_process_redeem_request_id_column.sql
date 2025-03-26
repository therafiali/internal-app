-- Drop existing functions
DROP FUNCTION IF EXISTS process_redeem_request(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS process_redeem_request(TEXT, UUID, UUID, TEXT);

-- Create function with all parameters having default values after the first one with a default
CREATE OR REPLACE FUNCTION process_redeem_request(
    p_notes TEXT DEFAULT NULL,
    p_processed_by UUID DEFAULT NULL,
    p_redeem_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_request redeem_requests%ROWTYPE;
    v_new_status redeem_status;
BEGIN
    -- Validate required parameters
    IF p_processed_by IS NULL THEN
        RAISE EXCEPTION 'processed_by parameter is required';
    END IF;
    
    IF p_redeem_id IS NULL THEN
        RAISE EXCEPTION 'redeem_id parameter is required';
    END IF;
    
    IF p_status IS NULL THEN
        RAISE EXCEPTION 'status parameter is required';
    END IF;

    -- Convert input status to enum
    BEGIN
        v_new_status := p_status::redeem_status;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid status value: %. Valid values are: pending, initiated, under_processing, processed, rejected, verification_pending, verification_failed, queued, paused, queued_partially_paid, paused_partially_paid, completed, unverified', p_status;
    END;

    -- Get the current request
    SELECT * INTO v_request
    FROM redeem_requests
    WHERE id = p_redeem_id
    FOR UPDATE;

    -- Check if request exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Redeem request not found';
    END IF;

    -- Start transaction
    BEGIN
        -- Update redeem_requests table
        UPDATE redeem_requests
        SET 
            status = v_new_status,
            processed_by = p_processed_by,
            processed_at = NOW(),
            notes = COALESCE(p_notes, notes),
            updated_at = NOW(),
            -- Reset processing state
            processing_state = ROW('idle', NULL, 'none')::request_processing_state
        WHERE id = p_redeem_id
        RETURNING to_jsonb(redeem_requests.*) INTO v_result;

        -- If no update occurred
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update redeem request';
        END IF;

        -- Update transactions if they exist
        UPDATE transactions
        SET 
            status = CASE 
                WHEN p_status = 'verification_pending' THEN 'pending_verification'::transaction_status
                WHEN p_status = 'rejected' THEN 'rejected'::transaction_status
                ELSE status
            END,
            processed_by = p_processed_by,
            updated_at = NOW()
        WHERE redeem_id = p_redeem_id;  -- Changed from redeem_request_id to redeem_id

        -- Return success result
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Request processed successfully',
            'data', v_result
        );
    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        RAISE EXCEPTION 'Error processing request: %', SQLERRM;
    END;
END;
$$; 