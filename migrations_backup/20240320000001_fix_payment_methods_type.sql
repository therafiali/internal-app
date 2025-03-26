-- Drop the existing function
DROP FUNCTION IF EXISTS process_payment_with_balance;

-- Create the function with fixed payment_methods type handling
CREATE OR REPLACE FUNCTION process_payment_with_balance(
  p_redeem_id UUID,
  p_status TEXT,
  p_amount_paid DECIMAL,
  p_amount_hold DECIMAL,
  p_payment_methods JSONB[],
  p_notes TEXT,
  p_cashtag TEXT,
  p_amount DECIMAL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Update redeem request
    UPDATE redeem_requests
    SET 
      status = p_status,
      amount_paid = p_amount_paid,
      amount_hold = p_amount_hold,
      payment_methods = p_payment_methods,
      notes = p_notes,
      processed_at = NOW(),
      updated_at = NOW(),
      action_status = 'idle'
    WHERE id = p_redeem_id
    RETURNING to_jsonb(redeem_requests.*) INTO v_result;

    -- Update company tag balance
    UPDATE company_tags
    SET 
      balance = balance - p_amount,
      updated_at = NOW()
    WHERE cashtag = p_cashtag;

    -- If we got here, commit the transaction
    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    -- If any error occurs, rollback changes
    RAISE EXCEPTION 'Failed to process payment: %', SQLERRM;
  END;
END;
$$; 