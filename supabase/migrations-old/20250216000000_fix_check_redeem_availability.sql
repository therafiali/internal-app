-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS check_redeem_availability(UUID, DECIMAL);

-- Create the fixed function
CREATE OR REPLACE FUNCTION check_redeem_availability(
    p_redeem_request_id UUID,
    p_required_amount DECIMAL
)
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
    WHERE r.id = p_redeem_request_id;

    -- Calculate available amount
    v_available_amount := v_redeem_total - v_redeem_hold - v_redeem_paid;

    -- Check if enough amount is available
    RETURN v_available_amount >= p_required_amount;
END;
$$ LANGUAGE plpgsql; 