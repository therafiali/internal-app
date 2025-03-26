-- Create a function to process recharge requests and update transactions
CREATE OR REPLACE FUNCTION process_recharge_request(
    p_recharge_id UUID,
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
        -- Update recharge_requests table
        UPDATE recharge_requests
        SET 
            status = p_status,
            processed_by = p_processed_by,
            processed_at = NOW(),
            notes = p_notes,
            updated_at = NOW()
        WHERE id = p_recharge_id;

        -- Update transactions table
        UPDATE transactions
        SET 
            current_status = p_status::transaction_status,
            processed_by = p_processed_by,
            updated_at = NOW()
        WHERE recharge_id = p_recharge_id;

        -- Prepare result
        SELECT jsonb_build_object(
            'success', true,
            'message', 'Request processed successfully',
            'recharge_id', p_recharge_id
        ) INTO v_result;

        -- Commit transaction
        RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
        -- Rollback transaction
        RAISE EXCEPTION 'Error processing request: %', SQLERRM;
    END;
END;
$$; 