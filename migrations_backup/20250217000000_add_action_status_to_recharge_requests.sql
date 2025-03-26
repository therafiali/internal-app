-- Create enum type for action status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE action_status_type AS ENUM ('idle', 'in_progress');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add action_status column with default value 'idle'
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS action_status action_status_type NOT NULL DEFAULT 'idle';

-- Add index on action_status for better performance
CREATE INDEX IF NOT EXISTS idx_recharge_requests_action_status ON recharge_requests(action_status);

-- Add comment to describe the column
COMMENT ON COLUMN recharge_requests.action_status IS 'Current action status of the request: idle or in_progress';

-- Update existing rows to have 'idle' status if they don't have one
UPDATE recharge_requests SET action_status = 'idle' WHERE action_status IS NULL;

-- Add function to check if redeem request is available for assignment
CREATE OR REPLACE FUNCTION check_redeem_availability(p_redeem_id UUID, p_required_amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
    v_redeem_total DECIMAL;
    v_redeem_hold DECIMAL;
    v_redeem_paid DECIMAL;
    v_available_amount DECIMAL;
BEGIN
    -- Get the redeem request details with explicit table reference
    SELECT 
        r.total_amount,
        COALESCE(r.amount_hold, 0),
        COALESCE(r.amount_paid, 0)
    INTO 
        v_redeem_total,
        v_redeem_hold,
        v_redeem_paid
    FROM redeem_requests r
    WHERE r.id = p_redeem_id;

    -- Calculate available amount
    v_available_amount := v_redeem_total - v_redeem_hold - v_redeem_paid;

    -- Check if enough amount is available
    RETURN v_available_amount >= p_required_amount;
END;
$$ language 'plpgsql';

-- Create trigger function to validate assignment availability
CREATE OR REPLACE FUNCTION validate_assignment_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_redeem_id UUID;
    v_amount DECIMAL;
    v_redeem_total DECIMAL;
    v_redeem_hold DECIMAL;
    v_redeem_paid DECIMAL;
    v_redeem_status TEXT;
    v_redeem_action_status TEXT;
    v_redeem_record redeem_requests%ROWTYPE;
    v_new_hold_amount DECIMAL;
    v_rows_affected INTEGER;
BEGIN
    -- Extract values from assigned_redeem JSONB
    v_redeem_id := (NEW.assigned_redeem->>'redeem_id')::UUID;
    v_amount := (NEW.assigned_redeem->>'amount')::DECIMAL;

    -- Get current redeem request record with FOR UPDATE to lock the row
    SELECT * INTO v_redeem_record
    FROM redeem_requests r
    WHERE r.id = v_redeem_id
    FOR UPDATE SKIP LOCKED;  -- Use SKIP LOCKED to handle concurrent updates gracefully

    -- Check if redeem request exists
    IF v_redeem_record.id IS NULL THEN
        RAISE EXCEPTION 'Redeem request % not found or is currently being processed', v_redeem_id;
    END IF;

    -- Set values from record
    v_redeem_total := v_redeem_record.total_amount;
    v_redeem_hold := COALESCE(v_redeem_record.amount_hold, 0);
    v_redeem_paid := COALESCE(v_redeem_record.amount_paid, 0);
    v_redeem_status := v_redeem_record.status;
    v_redeem_action_status := v_redeem_record.action_status::TEXT;

    -- Check if redeem request is in correct status
    IF v_redeem_status != 'queued' AND v_redeem_status != 'queued_partially_paid' THEN
        RAISE EXCEPTION 'Redeem request % is not in queued status (current status: %)', v_redeem_id, v_redeem_status;
    END IF;

    -- Calculate new hold amount
    v_new_hold_amount := v_redeem_hold + v_amount;

    -- Check if enough amount is available
    IF (v_redeem_total - v_redeem_hold - v_redeem_paid) < v_amount THEN
        RAISE EXCEPTION 'Insufficient available amount for redeem request %. Required: %, Available: %', 
            v_redeem_id, v_amount, (v_redeem_total - v_redeem_hold - v_redeem_paid);
    END IF;

    -- Begin atomic update of both tables
    BEGIN
        -- Update only the amount_hold in redeem request
        UPDATE redeem_requests r
        SET amount_hold = v_new_hold_amount
        WHERE r.id = v_redeem_id;

        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

        -- Verify the update was successful
        IF v_rows_affected = 0 THEN
            RAISE EXCEPTION 'Failed to update redeem request %. No rows affected.', v_redeem_id;
        END IF;

        -- Set the recharge request status
        NEW.status := 'assigned';
        NEW.action_status := 'idle'::action_status_type;

        -- Log the successful update
        RAISE NOTICE 'Successfully updated redeem request %. New hold amount: % (Previous: %)', 
            v_redeem_id, v_new_hold_amount, v_redeem_hold;

        RETURN NEW;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error and re-raise
            RAISE NOTICE 'Error in atomic update block: %, SQLSTATE: %', SQLERRM, SQLSTATE;
            RAISE;
    END;
END;
$$ language 'plpgsql';

-- Create trigger to execute before updates on recharge_requests
DROP TRIGGER IF EXISTS validate_assignment_trigger ON recharge_requests;
CREATE TRIGGER validate_assignment_trigger
    BEFORE UPDATE ON recharge_requests
    FOR EACH ROW
    WHEN (
        NEW.assigned_redeem IS NOT NULL AND 
        (
            OLD.assigned_redeem IS NULL OR 
            OLD.assigned_redeem->>'redeem_id' != NEW.assigned_redeem->>'redeem_id' OR
            (OLD.assigned_redeem->>'amount')::decimal != (NEW.assigned_redeem->>'amount')::decimal
        )
    )
    EXECUTE FUNCTION validate_assignment_availability();

-- Add amount_hold column to redeem_requests if it doesn't exist
ALTER TABLE redeem_requests
ADD COLUMN IF NOT EXISTS amount_hold decimal(10,2) DEFAULT 0;

-- Add comment to describe the column
COMMENT ON COLUMN redeem_requests.amount_hold IS 'Amount currently on hold from recharge requests';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_redeem_requests_amount_hold ON redeem_requests(amount_hold);

-- Add check constraint to ensure amount_hold is not negative
ALTER TABLE redeem_requests
ADD CONSTRAINT amount_hold_check CHECK (amount_hold >= 0); 