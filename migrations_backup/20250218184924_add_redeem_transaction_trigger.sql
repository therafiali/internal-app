-- Create a function to handle redeem request transactions
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
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create a transaction when a redeem request is created
CREATE TRIGGER create_redeem_transaction
    AFTER INSERT ON redeem_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_redeem_request_transaction();

-- Add a rollback function in case we need to revert
CREATE OR REPLACE FUNCTION remove_redeem_request_transaction()
RETURNS void AS $$
BEGIN
    DROP TRIGGER IF EXISTS create_redeem_transaction ON redeem_requests;
    DROP FUNCTION IF EXISTS handle_redeem_request_transaction();
END;
$$ LANGUAGE plpgsql;
