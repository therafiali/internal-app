-- Create function to sync recharge updates with transactions
CREATE OR REPLACE FUNCTION sync_recharge_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update transaction record when recharge request is updated
    UPDATE transactions
    SET 
        messenger_id = NEW.messenger_id,
        page_id = NEW.manychat_data->>'page_id',
        current_status = NEW.status::transaction_status,
        amount = NEW.amount,
        bonus_amount = NEW.bonus_amount,
        credits_loaded = NEW.credits_loaded,
        game_platform = NEW.game_platform,
        game_username = NEW.game_username,
        team_code = NEW.team_code,
        promotion = CASE 
            WHEN NEW.promo_code IS NOT NULL OR NEW.promo_type IS NOT NULL THEN 
                jsonb_build_object(
                    'code', NEW.promo_code,
                    'type', NEW.promo_type
                )
            ELSE NULL
        END,
        payment_method = NEW.payment_method,
        manychat_data = NEW.manychat_data,
        updated_at = NOW()
    WHERE recharge_id = NEW.id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to sync redeem updates with transactions
CREATE OR REPLACE FUNCTION sync_redeem_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update transaction record when redeem request is updated
    UPDATE transactions
    SET 
        messenger_id = NEW.messenger_id,
        page_id = NEW.manychat_data->>'page_id',
        current_status = NEW.status::transaction_status,
        amount = NEW.total_amount,
        game_platform = NEW.game_platform,
        game_username = NEW.game_username,
        team_code = NEW.team_code,
        payment_method = NEW.payment_methods[1],
        manychat_data = NEW.manychat_data,
        updated_at = NOW()
    WHERE redeem_id = NEW.id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing sync triggers if they exist
DROP TRIGGER IF EXISTS sync_recharge_transaction_trigger ON recharge_requests;
DROP TRIGGER IF EXISTS sync_redeem_transaction_trigger ON redeem_requests;

-- Create trigger for recharge updates
CREATE TRIGGER sync_recharge_transaction_trigger
    AFTER UPDATE ON recharge_requests
    FOR EACH ROW
    WHEN (
        OLD.* IS DISTINCT FROM NEW.* AND
        OLD.id = NEW.id  -- Ensure we're updating the same record
    )
    EXECUTE FUNCTION sync_recharge_transaction();

-- Create trigger for redeem updates
CREATE TRIGGER sync_redeem_transaction_trigger
    AFTER UPDATE ON redeem_requests
    FOR EACH ROW
    WHEN (
        OLD.* IS DISTINCT FROM NEW.* AND
        OLD.id = NEW.id  -- Ensure we're updating the same record
    )
    EXECUTE FUNCTION sync_redeem_transaction();

-- Add rollback functions in case we need to revert
CREATE OR REPLACE FUNCTION remove_sync_triggers()
RETURNS void AS $$
BEGIN
    DROP TRIGGER IF EXISTS sync_recharge_transaction_trigger ON recharge_requests;
    DROP TRIGGER IF EXISTS sync_redeem_transaction_trigger ON redeem_requests;
    DROP FUNCTION IF EXISTS sync_recharge_transaction();
    DROP FUNCTION IF EXISTS sync_redeem_transaction();
END;
$$ LANGUAGE plpgsql; 