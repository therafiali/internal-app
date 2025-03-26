-- Drop the existing amount_available column if it exists
ALTER TABLE redeem_requests DROP COLUMN IF EXISTS amount_available;

-- Add amount_available as a generated column
ALTER TABLE redeem_requests
ADD COLUMN amount_available decimal(10,2) GENERATED ALWAYS AS (
    total_amount - COALESCE(amount_paid, 0) - COALESCE(amount_hold, 0)
) STORED;

-- Add comment to describe the column
COMMENT ON COLUMN redeem_requests.amount_available IS 'Available amount for hold or payment (total_amount - amount_paid - amount_hold). This is a generated column.';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_redeem_requests_amount_available ON redeem_requests(amount_available); 