-- Add vip_code column to recharge_requests and redeem_requests tables
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS vip_code TEXT;

ALTER TABLE redeem_requests
ADD COLUMN IF NOT EXISTS vip_code TEXT;

-- Function to update existing transactions with vip_code from recharge requests
CREATE OR REPLACE FUNCTION sync_existing_recharge_vip_codes()
RETURNS void AS $$
BEGIN
    -- Update transactions with vip_code from recharge_requests
    UPDATE transactions t
    SET vip_code = r.vip_code
    FROM recharge_requests r
    WHERE t.recharge_id = r.recharge_id
    AND t.recharge_uuid = r.id
    AND r.vip_code IS NOT NULL;

    RAISE NOTICE 'Updated vip_codes from recharge_requests';
END;
$$ LANGUAGE plpgsql;

-- Function to update existing transactions with vip_code from redeem requests
CREATE OR REPLACE FUNCTION sync_existing_redeem_vip_codes()
RETURNS void AS $$
BEGIN
    -- Update transactions with vip_code from redeem_requests
    UPDATE transactions t
    SET vip_code = r.vip_code
    FROM redeem_requests r
    WHERE t.redeem_id = r.redeem_id
    AND t.redeem_uuid = r.id
    AND r.vip_code IS NOT NULL;

    RAISE NOTICE 'Updated vip_codes from redeem_requests';
END;
$$ LANGUAGE plpgsql;

-- Execute the sync functions
SELECT sync_existing_recharge_vip_codes();
SELECT sync_existing_redeem_vip_codes();

-- Drop the temporary sync functions
DROP FUNCTION IF EXISTS sync_existing_recharge_vip_codes();
DROP FUNCTION IF EXISTS sync_existing_redeem_vip_codes();

-- Add rollback function
CREATE OR REPLACE FUNCTION rollback_vip_code_requests()
RETURNS void AS $$
BEGIN
    -- Remove vip_code columns from request tables
    ALTER TABLE recharge_requests DROP COLUMN IF EXISTS vip_code;
    ALTER TABLE redeem_requests DROP COLUMN IF EXISTS vip_code;
END;
$$ LANGUAGE plpgsql; 