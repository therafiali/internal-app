-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS create_recharge_transaction ON recharge_requests;
DROP TRIGGER IF EXISTS create_redeem_transaction ON redeem_requests;
DROP FUNCTION IF EXISTS handle_recharge_request_transaction();
DROP FUNCTION IF EXISTS handle_redeem_request_transaction();

-- Create a function to handle recharge request transactions with manychat data
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
        manychat_data,
        created_at,
        updated_at
    ) VALUES (
        NEW.id::text,  -- Convert UUID to text for recharge_id
        NEW.messenger_id,
        NEW.manychat_data->>'page_id',
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
        NEW.manychat_data,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle redeem request transactions with manychat data
CREATE OR REPLACE FUNCTION handle_redeem_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new transaction record
    INSERT INTO transactions (
        redeem_id,
        messenger_id,
        page_id,
        current_status,
        payment_status,
        amount,
        game_platform,
        game_username,
        team_code,
        payment_method,
        action_by,
        manychat_data,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.messenger_id,
        NEW.manychat_data->>'page_id',
        'pending'::transaction_status,
        'pending'::payment_status,
        NEW.total_amount,
        NEW.game_platform,
        NEW.game_username,
        NEW.team_code,
        NEW.payment_methods[1], -- Taking the first payment method
        (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1),
        NEW.manychat_data,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically create transactions
CREATE TRIGGER create_recharge_transaction
    AFTER INSERT ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_recharge_request_transaction();

CREATE TRIGGER create_redeem_transaction
    AFTER INSERT ON redeem_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_redeem_request_transaction();

-- First, check if manychat_data column exists in transactions table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'manychat_data'
    ) THEN
        -- Add manychat_data column to transactions table
        ALTER TABLE transactions ADD COLUMN manychat_data JSONB;
    END IF;
END $$; 