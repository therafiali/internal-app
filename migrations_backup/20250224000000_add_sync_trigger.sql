-- Create a trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_transaction_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the transaction status whenever recharge_request status changes
    UPDATE transactions
    SET 
        current_status = NEW.status::transaction_status,
        updated_at = NOW()
    WHERE recharge_id = NEW.id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS sync_transaction_status_trigger ON recharge_requests;

-- Create the trigger
CREATE TRIGGER sync_transaction_status_trigger
AFTER UPDATE OF status ON recharge_requests
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_status();

-- Update the process_recharge_request function to use a single transaction
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
    v_valid_status BOOLEAN;
BEGIN
    -- Check if the status is valid
    SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'transaction_status'::regtype
        AND enumlabel = p_status
    ) INTO v_valid_status;

    IF NOT v_valid_status THEN
        RAISE EXCEPTION 'Invalid status: %. Valid statuses are: %',
            p_status,
            (SELECT string_agg(enumlabel::text, ', ')
             FROM pg_enum
             WHERE enumtypid = 'transaction_status'::regtype);
    END IF;

    -- Start transaction
    BEGIN
        -- Update recharge_requests table (trigger will handle transaction update)
        UPDATE recharge_requests
        SET 
            status = p_status,
            processed_by = p_processed_by,
            processed_at = NOW(),
            notes = p_notes,
            updated_at = NOW()
        WHERE id = p_recharge_id
        RETURNING jsonb_build_object(
            'success', true,
            'message', 'Request processed successfully',
            'recharge_id', p_recharge_id
        ) INTO v_result;

        IF v_result IS NULL THEN
            RAISE EXCEPTION 'Recharge request not found: %', p_recharge_id;
        END IF;

        -- Commit transaction
        RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
        -- Rollback transaction
        RAISE EXCEPTION 'Error processing request: %', SQLERRM;
    END;
END;
$$; 