-- Drop the existing function
DROP FUNCTION IF EXISTS process_redeem_request(UUID, TEXT, UUID, TEXT);

-- Create the function with the correct signature and implementation
CREATE OR REPLACE FUNCTION process_redeem_request(
    p_redeem_id UUID,
    p_status TEXT,
    p_processed_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_request redeem_requests%ROWTYPE;
BEGIN
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
            status = p_status,
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
                WHEN p_status = 'verification_pending' THEN 'pending_verification'
                WHEN p_status = 'rejected' THEN 'rejected'
                ELSE status
            END,
            processed_by = p_processed_by,
            updated_at = NOW()
        WHERE redeem_request_id = p_redeem_id;

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