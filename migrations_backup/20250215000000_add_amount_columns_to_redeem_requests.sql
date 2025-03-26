-- Create enum type for action status
CREATE TYPE action_status_type AS ENUM ('idle', 'in_progress');

-- Add amount related columns to redeem_requests table
ALTER TABLE redeem_requests
ADD COLUMN IF NOT EXISTS amount_hold decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount decimal(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_available decimal(10,2) GENERATED ALWAYS AS (total_amount - amount_paid - amount_hold) STORED,
ADD COLUMN IF NOT EXISTS action_status action_status_type NOT NULL DEFAULT 'idle';

-- Add a check constraint to ensure amounts are not negative
ALTER TABLE redeem_requests
ADD CONSTRAINT amount_hold_check CHECK (amount_hold >= 0),
ADD CONSTRAINT amount_paid_check CHECK (amount_paid >= 0),
ADD CONSTRAINT total_amount_check CHECK (total_amount >= 0);

-- Add a check constraint to ensure the sum of paid and hold amounts doesn't exceed total amount
ALTER TABLE redeem_requests
ADD CONSTRAINT amounts_sum_check CHECK (amount_paid + amount_hold <= total_amount);

-- Add an index on the status column for better query performance
CREATE INDEX IF NOT EXISTS idx_redeem_requests_status ON redeem_requests(status);
CREATE INDEX IF NOT EXISTS idx_redeem_requests_action_status ON redeem_requests(action_status);

-- Add comment to describe the columns
COMMENT ON COLUMN redeem_requests.amount_hold IS 'Amount currently on hold for processing';
COMMENT ON COLUMN redeem_requests.amount_paid IS 'Amount already paid to the user';
COMMENT ON COLUMN redeem_requests.total_amount IS 'Total amount requested for redemption';
COMMENT ON COLUMN redeem_requests.amount_available IS 'Amount available for hold or payment (total - paid - hold)';
COMMENT ON COLUMN redeem_requests.action_status IS 'Current action status of the request: idle or in_progress'; 
