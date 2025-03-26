-- First, add the amount_available column if it doesn't exist
ALTER TABLE redeem_requests
ADD COLUMN IF NOT EXISTS amount_available DECIMAL(10,2) DEFAULT 0;

-- Create the trigger function
CREATE OR REPLACE FUNCTION calculate_amount_available()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate the new amount_available
  NEW.amount_available = NEW.total_amount - COALESCE(NEW.amount_paid, 0) - COALESCE(NEW.amount_hold, 0);
  
  -- Ensure amount_available is never negative
  IF NEW.amount_available < 0 THEN
    NEW.amount_available = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger that runs before insert or update
CREATE TRIGGER update_amount_available
  BEFORE INSERT OR UPDATE OF total_amount, amount_paid, amount_hold
  ON redeem_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_amount_available();

-- Add constraints to ensure amounts are valid
ALTER TABLE redeem_requests
ADD CONSTRAINT valid_amounts_check
CHECK (
  total_amount >= 0 AND
  amount_paid >= 0 AND
  amount_hold >= 0 AND
  (amount_paid + amount_hold) <= total_amount
);

-- Update existing records to calculate amount_available
UPDATE redeem_requests
SET amount_available = 
  GREATEST(
    total_amount - COALESCE(amount_paid, 0) - COALESCE(amount_hold, 0),
    0
  );