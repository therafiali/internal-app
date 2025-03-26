-- Function to generate VIP code based on game username and platform
CREATE OR REPLACE FUNCTION generate_vip_code(game_username TEXT, game_platform TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Basic implementation - can be customized based on your requirements
    RETURN UPPER(game_platform || '_' || game_username);
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically set vip_code for recharge requests
CREATE OR REPLACE FUNCTION set_recharge_vip_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Set vip_code if not provided
    IF NEW.vip_code IS NULL THEN
        NEW.vip_code := generate_vip_code(NEW.game_username, NEW.game_platform::TEXT);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically set vip_code for redeem requests
CREATE OR REPLACE FUNCTION set_redeem_vip_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Set vip_code if not provided
    IF NEW.vip_code IS NULL THEN
        NEW.vip_code := generate_vip_code(NEW.game_username, NEW.game_platform::TEXT);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically set vip_code
DROP TRIGGER IF EXISTS set_recharge_vip_code_trigger ON recharge_requests;
CREATE TRIGGER set_recharge_vip_code_trigger
    BEFORE INSERT OR UPDATE ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_recharge_vip_code();

DROP TRIGGER IF EXISTS set_redeem_vip_code_trigger ON redeem_requests;
CREATE TRIGGER set_redeem_vip_code_trigger
    BEFORE INSERT OR UPDATE ON redeem_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_redeem_vip_code();

-- Function to update existing vip_codes
CREATE OR REPLACE FUNCTION update_all_existing_vip_codes()
RETURNS void AS $$
BEGIN
    -- Update recharge_requests
    UPDATE recharge_requests
    SET vip_code = generate_vip_code(game_username, game_platform::TEXT)
    WHERE vip_code IS NULL;

    -- Update redeem_requests
    UPDATE redeem_requests
    SET vip_code = generate_vip_code(game_username, game_platform::TEXT)
    WHERE vip_code IS NULL;

    -- Update transactions from recharge_requests
    UPDATE transactions t
    SET vip_code = r.vip_code
    FROM recharge_requests r
    WHERE t.recharge_id = r.recharge_id
    AND t.recharge_uuid = r.id
    AND t.vip_code IS NULL
    AND r.vip_code IS NOT NULL;

    -- Update transactions from redeem_requests
    UPDATE transactions t
    SET vip_code = r.vip_code
    FROM redeem_requests r
    WHERE t.redeem_id = r.redeem_id
    AND t.redeem_uuid = r.id
    AND t.vip_code IS NULL
    AND r.vip_code IS NOT NULL;

    RAISE NOTICE 'Updated all existing VIP codes';
END;
$$ LANGUAGE plpgsql;

-- Execute the update function for existing records
SELECT update_all_existing_vip_codes();

-- Add rollback function
CREATE OR REPLACE FUNCTION rollback_vip_code_functions()
RETURNS void AS $$
BEGIN
    -- Drop triggers
    DROP TRIGGER IF EXISTS set_recharge_vip_code_trigger ON recharge_requests;
    DROP TRIGGER IF EXISTS set_redeem_vip_code_trigger ON redeem_requests;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS generate_vip_code(TEXT, TEXT);
    DROP FUNCTION IF EXISTS set_recharge_vip_code();
    DROP FUNCTION IF EXISTS set_redeem_vip_code();
    DROP FUNCTION IF EXISTS update_all_existing_vip_codes();
    DROP FUNCTION IF EXISTS rollback_vip_code_functions();
END;
$$ LANGUAGE plpgsql; 