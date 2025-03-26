-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS check_redeem_availability(UUID, DECIMAL);

-- Recreate the function with fixed parameter names
CREATE OR REPLACE FUNCTION check_redeem_availability(
    p_redeem_request_id UUID,
    p_required_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_redeem_total DECIMAL;
    v_redeem_hold DECIMAL;
    v_redeem_paid DECIMAL;
BEGIN
    -- Get the total amount from redeem_requests
    SELECT total_amount
    INTO v_redeem_total
    FROM redeem_requests
    WHERE id = p_redeem_request_id;

    -- Get the total amount on hold
    SELECT COALESCE(SUM(amount_hold), 0)
    INTO v_redeem_hold
    FROM redeem_requests
    WHERE id = p_redeem_request_id;

    -- Get the total amount already paid
    SELECT COALESCE(SUM(amount), 0)
    INTO v_redeem_paid
    FROM transactions
    WHERE redeem_request_id = p_redeem_request_id
    AND status = 'completed';

    -- Check if the required amount is available
    RETURN (v_redeem_total - v_redeem_hold - v_redeem_paid) >= p_required_amount;
END;
$$ LANGUAGE plpgsql; 