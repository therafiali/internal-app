-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_redeem_amount_hold()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a P2P assignment (not a CT assignment)
  IF NEW.status = 'assigned' AND 
     NEW.assigned_ct->>'type' = 'PT' AND 
     (OLD.status IS NULL OR OLD.status != 'assigned') THEN
    
    -- Update the amount_hold in redeem_requests
    UPDATE redeem_requests 
    SET amount_hold = COALESCE(amount_hold, 0) + (NEW.assigned_ct->>'amount')::numeric
    WHERE id = (NEW.assigned_ct->>'redeem_id')::text;
    
  -- Check if this is an unassignment from P2P
  ELSIF OLD.status = 'assigned' AND 
        OLD.assigned_ct->>'type' = 'PT' AND 
        NEW.status != 'assigned' THEN
    
    -- Reduce the amount_hold in redeem_requests
    UPDATE redeem_requests 
    SET amount_hold = GREATEST(0, COALESCE(amount_hold, 0) - (OLD.assigned_ct->>'amount')::numeric)
    WHERE id = (OLD.assigned_ct->>'redeem_id')::text;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_redeem_amount_hold_trigger ON recharge_requests;

-- Create the trigger
CREATE TRIGGER update_redeem_amount_hold_trigger
AFTER UPDATE ON recharge_requests
FOR EACH ROW
EXECUTE FUNCTION update_redeem_amount_hold(); 