-- First, drop the existing check constraint
ALTER TABLE recharge_requests
DROP CONSTRAINT IF EXISTS valid_status;

-- Add the new check constraint with additional status values
ALTER TABLE recharge_requests
ADD CONSTRAINT valid_status CHECK (
  status IN (
    'pending',
    'assigned',
    'completed',
    'rejected',
    'hold_in_progress',
    'hold_complete',
    'sc_submitted',
    'sc_processed',
    'sc_rejected'
  )
);

-- Add comment to document the new statuses
COMMENT ON COLUMN recharge_requests.status IS 'Status of the recharge request: 
- pending: Initial state
- assigned: Assigned to a redeem request
- completed: Request fully completed
- rejected: Request rejected
- hold_in_progress: Partial hold in progress
- hold_complete: Hold completed
- sc_submitted: Screenshot submitted
- sc_processed: Screenshot processed
- sc_rejected: Screenshot rejected'; 