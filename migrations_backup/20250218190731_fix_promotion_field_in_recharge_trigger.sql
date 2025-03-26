-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_recharge_transaction ON recharge_requests;
DROP FUNCTION IF EXISTS handle_recharge_request_transaction();

-- Create a function to handle recharge request transactions
CREATE OR REPLACE FUNCTION handle_recharge_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new transaction record
    INSERT INTO transactions (
        recharge_id,
        messenger_id,
        page_id,
        current_status,
        payment_status,
        amount,
        bonus_amount,
        credits_loaded,
        game_platform,
        game_username,
        team_code,
        promotion,
        payment_method,
        action_by,
        created_at,
        updated_at
    ) VALUES (
        NEW.id::text,  -- Convert UUID to text for recharge_id
        NEW.messenger_id,
        NEW.manychat_data->>'page_id',  -- Extract page_id from manychat_data
        NEW.status::transaction_status,
        'pending'::payment_status,
        NEW.amount,
        NEW.bonus_amount,
        NEW.credits_loaded,
        NEW.game_platform,
        NEW.game_username,
        NEW.team_code,
        CASE 
            WHEN NEW.promo_code IS NOT NULL OR NEW.promo_type IS NOT NULL THEN 
                jsonb_build_object(
                    'code', NEW.promo_code,
                    'type', NEW.promo_type
                )
            ELSE NULL
        END,
        NEW.payment_method,
        (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create a transaction when a recharge request is created
CREATE TRIGGER create_recharge_transaction
    AFTER INSERT ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_recharge_request_transaction(); 