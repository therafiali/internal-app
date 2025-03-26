-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS calculate_promo_amount_trigger ON recharge_requests;
DROP FUNCTION IF EXISTS calculate_promo_amount();

-- Add promo_amount column if it doesn't exist
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS promo_amount DECIMAL(12,2) DEFAULT 0;

-- Create the trigger function
CREATE OR REPLACE FUNCTION calculate_promo_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if there's a promo_type and bonus_amount
    IF NEW.promo_type IS NOT NULL AND NEW.bonus_amount IS NOT NULL THEN
        -- For FIXED type promos, set promo_amount to bonus_amount
        IF NEW.promo_type = 'FIXED' THEN
            NEW.promo_amount := NEW.bonus_amount;
        -- For PERCENTAGE type promos, calculate the percentage
        ELSIF NEW.promo_type = 'PERCENTAGE' THEN
            NEW.promo_amount := NEW.amount * NEW.bonus_amount / 100;
        END IF;
    ELSE
        -- Reset promo_amount if no promo is applied
        NEW.promo_amount := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER calculate_promo_amount_trigger
    BEFORE INSERT OR UPDATE OF promo_type, bonus_amount
    ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION calculate_promo_amount();

-- Add comment to describe what the trigger does
COMMENT ON FUNCTION calculate_promo_amount() IS 'Calculates the promotional amount based on promo_type and bonus_amount. For FIXED type, uses bonus_amount directly. For PERCENTAGE type, calculates the percentage of the base amount.';

-- Add comment to describe the new column
COMMENT ON COLUMN recharge_requests.promo_amount IS 'The calculated promotional amount based on promo_type and bonus_amount'; 