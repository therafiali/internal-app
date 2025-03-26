-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_redeem_amount_hold_trigger ON recharge_requests;
DROP FUNCTION IF EXISTS update_redeem_amount_hold();

-- Create or replace the trigger function with debug logging
CREATE OR REPLACE FUNCTION update_redeem_amount_hold()
RETURNS TRIGGER AS $$
DECLARE
  v_redeem_id text;
  v_amount numeric;
BEGIN
  -- Debug logging
  RAISE NOTICE 'Trigger called with OLD status: %, NEW status: %', OLD.status, NEW.status;
  RAISE NOTICE 'OLD assigned_ct: %, NEW assigned_ct: %', OLD.assigned_ct, NEW.assigned_ct;

  -- Check if this is a P2P assignment (not a CT assignment)
  IF NEW.status = 'assigned' AND 
     NEW.assigned_ct IS NOT NULL AND
     NEW.assigned_ct->>'type' = 'PT' THEN
    
    -- Extract values with debug logging
    v_redeem_id := NEW.assigned_ct->>'redeem_id';
    v_amount := (NEW.assigned_ct->>'amount')::numeric;
    
    RAISE NOTICE 'P2P Assignment - Redeem ID: %, Amount: %', v_redeem_id, v_amount;
    
    -- Update the amount_hold in redeem_requests
    UPDATE redeem_requests 
    SET 
      amount_hold = COALESCE(amount_hold, 0) + v_amount,
      updated_at = NOW()
    WHERE id = v_redeem_id;
    
    RAISE NOTICE 'Updated redeem_requests amount_hold for ID: %', v_redeem_id;
    
  -- Check if this is an unassignment from P2P
  ELSIF OLD.status = 'assigned' AND 
        OLD.assigned_ct IS NOT NULL AND
        OLD.assigned_ct->>'type' = 'PT' AND 
        (NEW.status != 'assigned' OR NEW.assigned_ct IS NULL) THEN
    
    -- Extract values for unassignment
    v_redeem_id := OLD.assigned_ct->>'redeem_id';
    v_amount := (OLD.assigned_ct->>'amount')::numeric;
    
    RAISE NOTICE 'P2P Unassignment - Redeem ID: %, Amount: %', v_redeem_id, v_amount;
    
    -- Reduce the amount_hold in redeem_requests
    UPDATE redeem_requests 
    SET 
      amount_hold = GREATEST(0, COALESCE(amount_hold, 0) - v_amount),
      updated_at = NOW()
    WHERE id = v_redeem_id;
    
    RAISE NOTICE 'Reduced amount_hold for redeem ID: %', v_redeem_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_redeem_amount_hold_trigger
AFTER UPDATE ON recharge_requests
FOR EACH ROW
EXECUTE FUNCTION update_redeem_amount_hold(); 