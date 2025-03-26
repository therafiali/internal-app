-- Add identifier and rejected_reason columns to recharge_requests table
ALTER TABLE recharge_requests
ADD COLUMN identifier TEXT,
ADD COLUMN rejected_reason TEXT,
ADD COLUMN reject_notes TEXT;

-- Add comment to document the new columns
COMMENT ON COLUMN recharge_requests.identifier IS 'Identifier used for processing the recharge request';
COMMENT ON COLUMN recharge_requests.rejected_reason IS 'Reason for rejecting the recharge request';
COMMENT ON COLUMN recharge_requests.reject_notes IS 'Additional notes for rejected recharge requests'; 