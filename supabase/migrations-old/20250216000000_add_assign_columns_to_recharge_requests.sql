-- Add JSONB columns for assigned redeem and payment details
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS assigned_redeem JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_method JSONB DEFAULT NULL;

-- Add comment to describe the columns
COMMENT ON COLUMN recharge_requests.assigned_redeem IS 'Stores assignment details when request is assigned to a redeem request. Structure: { redeem_id, amount, type, assigned_at, assigned_by }';
COMMENT ON COLUMN recharge_requests.payment_method IS 'Stores payment method details. Structure: { type, details, screenshot_url }';

-- Create an index on the status column for better query performance
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests(status);

-- Create a GIN index on the assigned_redeem column for better JSON querying performance
CREATE INDEX IF NOT EXISTS idx_recharge_requests_assigned_redeem ON recharge_requests USING GIN (assigned_redeem);

-- Add check constraint to ensure valid status values
ALTER TABLE recharge_requests
ADD CONSTRAINT valid_status CHECK (
  status IN ('pending', 'assigned', 'completed', 'rejected', 'hold_in_progress', 'hold_complete')
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recharge_requests_updated_at
    BEFORE UPDATE ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to validate assigned_redeem data
CREATE OR REPLACE FUNCTION validate_assigned_redeem()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_redeem IS NOT NULL THEN
        -- Check if all required fields are present
        IF NOT (
            NEW.assigned_redeem ? 'redeem_id' AND
            NEW.assigned_redeem ? 'amount' AND
            NEW.assigned_redeem ? 'type' AND
            NEW.assigned_redeem ? 'assigned_at'
        ) THEN
            RAISE EXCEPTION 'assigned_redeem must contain redeem_id, amount, type, and assigned_at';
        END IF;

        -- Check if amount is a valid number
        IF NOT (jsonb_typeof(NEW.assigned_redeem->'amount') = 'number') THEN
            RAISE EXCEPTION 'assigned_redeem.amount must be a number';
        END IF;

        -- Check if type is valid
        IF NOT (NEW.assigned_redeem->>'type' IN ('PT', 'CT')) THEN
            RAISE EXCEPTION 'assigned_redeem.type must be either PT or CT';
        END IF;

        -- Check if assigned_at is a valid timestamp
        IF NOT (
            jsonb_typeof(NEW.assigned_redeem->'assigned_at') = 'string' AND
            (NEW.assigned_redeem->>'assigned_at')::timestamp IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'assigned_redeem.assigned_at must be a valid timestamp';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_recharge_requests_assigned_redeem
    BEFORE INSERT OR UPDATE ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_assigned_redeem();

-- Add function to check if redeem request is available for assignment
CREATE OR REPLACE FUNCTION check_redeem_availability(redeem_id UUID, required_amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
    total_amount DECIMAL;
    current_hold DECIMAL;
    amount_paid DECIMAL;
    available_amount DECIMAL;
BEGIN
    -- Get the redeem request details
    SELECT 
        total_amount,
        COALESCE(amount_hold, 0),
        COALESCE(amount_paid, 0)
    INTO 
        total_amount,
        current_hold,
        amount_paid
    FROM redeem_requests
    WHERE id = redeem_id;

    -- Calculate available amount
    available_amount := total_amount - current_hold - amount_paid;

    -- Check if enough amount is available
    RETURN available_amount >= required_amount;
END;
$$ language 'plpgsql';

-- Add trigger to validate assignment availability
CREATE OR REPLACE FUNCTION validate_assignment_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_redeem IS NOT NULL AND 
       (OLD.assigned_redeem IS NULL OR OLD.assigned_redeem->>'redeem_id' != NEW.assigned_redeem->>'redeem_id') THEN
        
        IF NOT check_redeem_availability(
            (NEW.assigned_redeem->>'redeem_id')::UUID,
            (NEW.assigned_redeem->>'amount')::DECIMAL
        ) THEN
            RAISE EXCEPTION 'Insufficient available amount in redeem request';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_recharge_requests_assignment
    BEFORE INSERT OR UPDATE ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_assignment_availability(); 