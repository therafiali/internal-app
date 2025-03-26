-- Add function to validate payment method structure
CREATE OR REPLACE FUNCTION validate_payment_method(payment JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    payment ? 'type' AND
    payment ? 'username' AND
    (payment->>'type')::TEXT IN ('cashapp', 'venmo', 'chime') AND
    (
      NOT (payment ? 'amount') OR 
      (payment->>'amount')::DECIMAL >= 0
    ) AND
    (
      NOT (payment ? 'identifier') OR 
      (payment->>'identifier')::TEXT IS NOT NULL
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to validate payment methods
CREATE OR REPLACE FUNCTION validate_payment_methods()
RETURNS TRIGGER AS $$
DECLARE
  payment_method JSONB;
BEGIN
  IF NEW.payment_methods IS NOT NULL THEN
    FOREACH payment_method IN ARRAY NEW.payment_methods
    LOOP
      IF NOT validate_payment_method(payment_method) THEN
        RAISE EXCEPTION 'Invalid payment method structure: %', payment_method;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate payment methods before insert or update
DROP TRIGGER IF EXISTS validate_payment_methods_trigger ON redeem_requests;
CREATE TRIGGER validate_payment_methods_trigger
  BEFORE INSERT OR UPDATE ON redeem_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_methods();

-- Update the process_payment_with_balance function to handle the payment_methods structure
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
  payment_method JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Validate payment methods structure
    IF p_payment_methods IS NOT NULL THEN
      FOREACH payment_method IN ARRAY p_payment_methods
      LOOP
        IF NOT validate_payment_method(payment_method) THEN
          RAISE EXCEPTION 'Invalid payment method structure: %', payment_method;
        END IF;
      END LOOP;
    END IF;

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
