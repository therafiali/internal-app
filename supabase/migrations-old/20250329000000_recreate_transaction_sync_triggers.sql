-- First, add missing status values to request_status enum
DO $$ BEGIN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'processed';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'initiated';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'verified';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'disputed';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'assigned';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'assigned_and_hold';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'sc_pending';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'sc_submitted';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'sc_processed';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'sc_rejected';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'sc_verified';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'sc_failed';
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'unverified';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS create_recharge_transaction ON recharge_requests;
DROP TRIGGER IF EXISTS create_redeem_transaction ON redeem_requests;
DROP TRIGGER IF EXISTS sync_recharge_transaction_trigger ON recharge_requests;
DROP TRIGGER IF EXISTS sync_redeem_transaction_trigger ON redeem_requests;
DROP TRIGGER IF EXISTS delete_recharge_transaction_trigger ON recharge_requests;
DROP TRIGGER IF EXISTS delete_redeem_transaction_trigger ON redeem_requests;

DROP FUNCTION IF EXISTS handle_recharge_request_transaction();
DROP FUNCTION IF EXISTS handle_redeem_request_transaction();
DROP FUNCTION IF EXISTS sync_recharge_transaction();
DROP FUNCTION IF EXISTS sync_redeem_transaction();
DROP FUNCTION IF EXISTS handle_recharge_delete();
DROP FUNCTION IF EXISTS handle_redeem_delete();

-- First, add new columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS recharge_uuid UUID,
ADD COLUMN IF NOT EXISTS redeem_uuid UUID;

-- Create function to map request status to transaction status
CREATE OR REPLACE FUNCTION map_status_to_transaction_status(request_status TEXT)
RETURNS transaction_status AS $$
BEGIN
    -- Log the incoming status
    RAISE NOTICE 'Mapping status: %', request_status;
    
    RETURN CASE request_status
        -- Basic statuses
        WHEN 'pending' THEN 'pending'::transaction_status
        WHEN 'initiated' THEN 'initiated'::transaction_status
        WHEN 'under_processing' THEN 'under_processing'::transaction_status
        WHEN 'processed' THEN 'processed'::transaction_status
        WHEN 'completed' THEN 'completed'::transaction_status
        WHEN 'rejected' THEN 'rejected'::transaction_status
        WHEN 'disputed' THEN 'disputed'::transaction_status
        
        -- Verification statuses
        WHEN 'verification_pending' THEN 'verification_pending'::transaction_status
        WHEN 'verification_failed' THEN 'verification_failed'::transaction_status
        WHEN 'verified' THEN 'verified'::transaction_status
        WHEN 'unverified' THEN 'unverified'::transaction_status
        
        -- Queue and pause statuses
        WHEN 'queued' THEN 'queued'::transaction_status
        WHEN 'queued_partially_paid' THEN 'queued_partially_paid'::transaction_status
        WHEN 'paused' THEN 'paused'::transaction_status
        WHEN 'paused_partially_paid' THEN 'paused_partially_paid'::transaction_status
        
        -- Assignment statuses
        WHEN 'assigned' THEN 'assigned'::transaction_status
        WHEN 'assigned_and_hold' THEN 'assigned_and_hold'::transaction_status
        
        -- Screenshot related statuses
        WHEN 'sc_pending' THEN 'sc_pending'::transaction_status
        WHEN 'sc_submitted' THEN 'sc_submitted'::transaction_status
        WHEN 'sc_processed' THEN 'sc_processed'::transaction_status
        WHEN 'sc_rejected' THEN 'sc_rejected'::transaction_status
        WHEN 'sc_verified' THEN 'sc_verified'::transaction_status
        WHEN 'sc_failed' THEN 'sc_failed'::transaction_status
        
        ELSE 'pending'::transaction_status
    END;
END;
$$ LANGUAGE plpgsql;

-- First, ensure transaction_status enum has all necessary values
DO $$ 
BEGIN
    -- Add all possible status values to transaction_status enum
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'initiated';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'under_processing';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'processed';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'completed';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'rejected';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'disputed';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'verification_pending';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'verification_failed';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'verified';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'unverified';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'queued';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'queued_partially_paid';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'paused';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'paused_partially_paid';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'assigned';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'assigned_and_hold';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_pending';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_submitted';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_processed';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_rejected';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_verified';
    ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'sc_failed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create function to handle new recharge request transactions
CREATE OR REPLACE FUNCTION handle_recharge_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new transaction record
    INSERT INTO transactions (
        recharge_id,
        recharge_uuid,
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
        manychat_data,
        action_by,
        created_at,
        updated_at
    ) VALUES (
        NEW.recharge_id,
        NEW.id,
        NEW.messenger_id,
        to_jsonb(NEW.manychat_data)->>'page_id',
        map_status_to_transaction_status(NEW.status::text),
        'pending'::payment_status,
        NEW.amount,
        NEW.bonus_amount,
        NEW.credits_loaded,
        NEW.game_platform::game_platform,
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
        to_jsonb(NEW.payment_method),
        to_jsonb(NEW.manychat_data),
        (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new redeem request transactions
CREATE OR REPLACE FUNCTION handle_redeem_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new transaction record
    INSERT INTO transactions (
        redeem_id,
        redeem_uuid,
        messenger_id,
        page_id,
        current_status,
        payment_status,
        amount,
        game_platform,
        game_username,
        team_code,
        payment_method,
        manychat_data,
        action_by,
        created_at,
        updated_at
    ) VALUES (
        NEW.redeem_id,
        NEW.id,
        NEW.messenger_id,
        to_jsonb(NEW.manychat_data)->>'page_id',
        map_status_to_transaction_status(NEW.status::text),
        'pending'::payment_status,
        NEW.total_amount,
        NEW.game_platform::game_platform,
        NEW.game_username,
        NEW.team_code,
        to_jsonb(NEW.payment_methods[1]),
        to_jsonb(NEW.manychat_data),
        (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to sync recharge updates with transactions
CREATE OR REPLACE FUNCTION sync_recharge_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Store previous status before update
    UPDATE transactions
    SET 
        previous_status = current_status,
        current_status = map_status_to_transaction_status(NEW.status::text),
        messenger_id = NEW.messenger_id,
        page_id = to_jsonb(NEW.manychat_data)->>'page_id',
        amount = NEW.amount,
        bonus_amount = NEW.bonus_amount,
        credits_loaded = NEW.credits_loaded,
        game_platform = NEW.game_platform::game_platform,
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
        payment_method = to_jsonb(NEW.payment_method),
        manychat_data = to_jsonb(NEW.manychat_data),
        -- Update assigned_by when status changes to assigned
        assigned_by = CASE 
            WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), assigned_by)
            ELSE assigned_by
        END,
        -- Update assigned_at timestamp
        assigned_at = CASE 
            WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN NOW()
            ELSE assigned_at
        END,
        -- Update processed fields
        processed_by = CASE 
            WHEN NEW.status IN ('processed', 'completed') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), processed_by)
            ELSE processed_by
        END,
        processed_at = CASE 
            WHEN NEW.status IN ('processed', 'completed') THEN NOW()
            ELSE processed_at
        END,
        -- Update completed fields
        completed_by = CASE 
            WHEN NEW.status = 'completed' THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), completed_by)
            ELSE completed_by
        END,
        completed_at = CASE 
            WHEN NEW.status = 'completed' THEN NOW()
            ELSE completed_at
        END,
        -- Update verified fields
        verified_by = CASE 
            WHEN NEW.status = 'verified' THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), verified_by)
            ELSE verified_by
        END,
        verified_at = CASE 
            WHEN NEW.status = 'verified' THEN NOW()
            ELSE verified_at
        END,
        -- Update cancelled fields
        cancelled_by = CASE 
            WHEN NEW.status IN ('rejected', 'disputed') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), cancelled_by)
            ELSE cancelled_by
        END,
        cancelled_at = CASE 
            WHEN NEW.status IN ('rejected', 'disputed') THEN NOW()
            ELSE cancelled_at
        END,
        updated_at = NOW()
    WHERE recharge_id = NEW.recharge_id AND recharge_uuid = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to sync redeem updates with transactions
CREATE OR REPLACE FUNCTION sync_redeem_transaction()
RETURNS TRIGGER AS $$
DECLARE
    affected_rows integer;
    mapped_status transaction_status;
BEGIN
    -- Debug logging
    RAISE NOTICE 'sync_redeem_transaction triggered';
    RAISE NOTICE 'OLD record: %', to_json(OLD)::text;
    RAISE NOTICE 'NEW record: %', to_json(NEW)::text;
    
    -- Get mapped status and log it
    mapped_status := map_status_to_transaction_status(NEW.status::text);
    RAISE NOTICE 'Mapped status from % to %', NEW.status, mapped_status;

    -- Store previous status before update
    UPDATE transactions
    SET 
        previous_status = current_status,
        current_status = mapped_status,
        messenger_id = NEW.messenger_id,
        page_id = to_jsonb(NEW.manychat_data)->>'page_id',
        amount = NEW.total_amount,
        game_platform = NEW.game_platform::game_platform,
        game_username = NEW.game_username,
        team_code = NEW.team_code,
        payment_method = to_jsonb(NEW.payment_methods[1]),
        manychat_data = to_jsonb(NEW.manychat_data),
        -- Update assigned_by when status changes to assigned
        assigned_by = CASE 
            WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), assigned_by)
            ELSE assigned_by
        END,
        -- Update assigned_at timestamp
        assigned_at = CASE 
            WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN NOW()
            ELSE assigned_at
        END,
        -- Update processed fields
        processed_by = CASE 
            WHEN NEW.status IN ('processed', 'completed') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), processed_by)
            ELSE processed_by
        END,
        processed_at = CASE 
            WHEN NEW.status IN ('processed', 'completed') THEN NOW()
            ELSE processed_at
        END,
        -- Update completed fields
        completed_by = CASE 
            WHEN NEW.status = 'completed' THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), completed_by)
            ELSE completed_by
        END,
        completed_at = CASE 
            WHEN NEW.status = 'completed' THEN NOW()
            ELSE completed_at
        END,
        -- Update verified fields
        verified_by = CASE 
            WHEN NEW.status = 'verified' THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), verified_by)
            ELSE verified_by
        END,
        verified_at = CASE 
            WHEN NEW.status = 'verified' THEN NOW()
            ELSE verified_at
        END,
        -- Update cancelled fields
        cancelled_by = CASE 
            WHEN NEW.status IN ('rejected', 'disputed') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), cancelled_by)
            ELSE cancelled_by
        END,
        cancelled_at = CASE 
            WHEN NEW.status IN ('rejected', 'disputed') THEN NOW()
            ELSE cancelled_at
        END,
        updated_at = NOW()
    WHERE redeem_id = NEW.redeem_id AND redeem_uuid = NEW.id
    RETURNING 1 INTO affected_rows;

    -- Log the result of the update
    IF affected_rows = 0 THEN
        RAISE WARNING 'No transaction record found for redeem_id: % and redeem_uuid: %. Creating new record.', NEW.redeem_id, NEW.id;
        
        -- If no record exists, create one
        BEGIN
            INSERT INTO transactions (
                redeem_id,
                redeem_uuid,
                messenger_id,
                page_id,
                current_status,
                previous_status,
                payment_status,
                amount,
                game_platform,
                game_username,
                team_code,
                payment_method,
                manychat_data,
                assigned_by,
                assigned_at,
                action_by,
                created_at,
                updated_at
            ) VALUES (
                NEW.redeem_id,
                NEW.id,
                NEW.messenger_id,
                to_jsonb(NEW.manychat_data)->>'page_id',
                mapped_status,
                NULL,
                'pending'::payment_status,
                NEW.total_amount,
                NEW.game_platform::game_platform,
                NEW.game_username,
                NEW.team_code,
                to_jsonb(NEW.payment_methods[1]),
                to_jsonb(NEW.manychat_data),
                CASE WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN 
                    (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1)
                ELSE NULL END,
                CASE WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN NOW() ELSE NULL END,
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), NULL),
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Successfully created new transaction record for redeem_id: % and redeem_uuid: %', NEW.redeem_id, NEW.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error creating transaction record: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Successfully updated transaction for redeem_id: % and redeem_uuid: %', NEW.redeem_id, NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in sync_redeem_transaction: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle recharge request deletions
CREATE OR REPLACE FUNCTION handle_recharge_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete corresponding transaction record
    DELETE FROM transactions WHERE recharge_id = OLD.recharge_id AND recharge_uuid = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle redeem request deletions
CREATE OR REPLACE FUNCTION handle_redeem_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete corresponding transaction record
    DELETE FROM transactions WHERE redeem_id = OLD.redeem_id AND redeem_uuid = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for INSERT operations
CREATE TRIGGER create_recharge_transaction
    AFTER INSERT ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_recharge_request_transaction();

CREATE TRIGGER create_redeem_transaction
    AFTER INSERT ON redeem_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_redeem_request_transaction();

-- Create triggers for UPDATE operations
CREATE TRIGGER sync_recharge_transaction_trigger
    AFTER UPDATE ON recharge_requests
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION sync_recharge_transaction();

CREATE TRIGGER sync_redeem_transaction_trigger
    AFTER UPDATE ON redeem_requests
    FOR EACH ROW
    EXECUTE FUNCTION sync_redeem_transaction();

-- Create triggers for DELETE operations
CREATE TRIGGER delete_recharge_transaction_trigger
    BEFORE DELETE ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_recharge_delete();

CREATE TRIGGER delete_redeem_transaction_trigger
    BEFORE DELETE ON redeem_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_redeem_delete();

-- Add rollback function
CREATE OR REPLACE FUNCTION remove_all_transaction_triggers()
RETURNS void AS $$
BEGIN
    -- Drop all triggers
    DROP TRIGGER IF EXISTS create_recharge_transaction ON recharge_requests;
    DROP TRIGGER IF EXISTS create_redeem_transaction ON redeem_requests;
    DROP TRIGGER IF EXISTS sync_recharge_transaction_trigger ON recharge_requests;
    DROP TRIGGER IF EXISTS sync_redeem_transaction_trigger ON redeem_requests;
    DROP TRIGGER IF EXISTS delete_recharge_transaction_trigger ON recharge_requests;
    DROP TRIGGER IF EXISTS delete_redeem_transaction_trigger ON redeem_requests;

    -- Drop all functions
    DROP FUNCTION IF EXISTS handle_recharge_request_transaction();
    DROP FUNCTION IF EXISTS handle_redeem_request_transaction();
    DROP FUNCTION IF EXISTS sync_recharge_transaction();
    DROP FUNCTION IF EXISTS sync_redeem_transaction();
    DROP FUNCTION IF EXISTS handle_recharge_delete();
    DROP FUNCTION IF EXISTS handle_redeem_delete();
    DROP FUNCTION IF EXISTS map_status_to_transaction_status();
    DROP FUNCTION IF EXISTS remove_all_transaction_triggers();
END;
$$ LANGUAGE plpgsql;

-- Add test function to check trigger
CREATE OR REPLACE FUNCTION test_redeem_trigger(redeem_id text, new_status text)
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Starting trigger test for redeem_id: % with new status: %', redeem_id, new_status;
    
    -- Update the status and log the result
    UPDATE redeem_requests 
    SET status = new_status::request_status
    WHERE id::text = redeem_id
    RETURNING id, status, agent_name;

    -- Check transactions table
    RAISE NOTICE 'Checking transactions table after update:';
    PERFORM (
        SELECT json_build_object(
            'redeem_id', redeem_id,
            'current_status', current_status,
            'previous_status', previous_status,
            'updated_at', updated_at
        )
        FROM transactions 
        WHERE redeem_id = redeem_id
    );
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT test_redeem_trigger('your-redeem-id', 'processed'); 