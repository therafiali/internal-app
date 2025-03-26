-- Add missing columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS disputed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP WITH TIME ZONE;

-- Add disputed_by to request tables if not exists
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS disputed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE redeem_requests
ADD COLUMN IF NOT EXISTS disputed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP WITH TIME ZONE;

-- Update the recharge transaction handler function
CREATE OR REPLACE FUNCTION handle_recharge_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
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
        vip_code,
        init_by,
        screenshot_url,
        remarks,
        disputed_by,
        disputed_at,
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
        NEW.vip_code,
        COALESCE(NEW.init_by, auth.uid()),
        NEW.screenshot_url,
        NEW.remarks,
        NEW.disputed_by,
        NEW.disputed_at,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the redeem transaction handler function
CREATE OR REPLACE FUNCTION handle_redeem_request_transaction()
RETURNS TRIGGER AS $$
BEGIN
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
        vip_code,
        init_by,
        screenshot_url,
        remarks,
        disputed_by,
        disputed_at,
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
        NEW.vip_code,
        COALESCE(NEW.init_by, auth.uid()),
        NEW.screenshot_url,
        NEW.remarks,
        NEW.disputed_by,
        NEW.disputed_at,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the recharge sync function
CREATE OR REPLACE FUNCTION sync_recharge_transaction()
RETURNS TRIGGER AS $$
BEGIN
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
        vip_code = NEW.vip_code,
        init_by = COALESCE(NEW.init_by, transactions.init_by),
        screenshot_url = NEW.screenshot_url,
        remarks = NEW.remarks,
        disputed_by = CASE 
            WHEN NEW.status = 'disputed' THEN 
                COALESCE(NEW.disputed_by, (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1))
            ELSE disputed_by
        END,
        disputed_at = CASE 
            WHEN NEW.status = 'disputed' THEN 
                COALESCE(NEW.disputed_at, NOW())
            ELSE disputed_at
        END,
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
        assigned_by = CASE 
            WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), assigned_by)
            ELSE assigned_by
        END,
        assigned_at = CASE 
            WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN NOW()
            ELSE assigned_at
        END,
        processed_by = CASE 
            WHEN NEW.status IN ('processed', 'completed') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), processed_by)
            ELSE processed_by
        END,
        processed_at = CASE 
            WHEN NEW.status IN ('processed', 'completed') THEN NOW()
            ELSE processed_at
        END,
        completed_by = CASE 
            WHEN NEW.status = 'completed' THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), completed_by)
            ELSE completed_by
        END,
        completed_at = CASE 
            WHEN NEW.status = 'completed' THEN NOW()
            ELSE completed_at
        END,
        verified_by = CASE 
            WHEN NEW.status = 'verified' THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), verified_by)
            ELSE verified_by
        END,
        verified_at = CASE 
            WHEN NEW.status = 'verified' THEN NOW()
            ELSE verified_at
        END,
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

-- Update the redeem sync function to include new columns
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
    
    mapped_status := map_status_to_transaction_status(NEW.status::text);
    RAISE NOTICE 'Mapped status from % to %', NEW.status, mapped_status;

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
        vip_code = NEW.vip_code,
        init_by = COALESCE(NEW.init_by, transactions.init_by),
        screenshot_url = NEW.screenshot_url,
        remarks = NEW.remarks,
        disputed_by = CASE 
            WHEN NEW.status = 'disputed' THEN 
                COALESCE(NEW.disputed_by, (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1))
            ELSE disputed_by
        END,
        disputed_at = CASE 
            WHEN NEW.status = 'disputed' THEN 
                COALESCE(NEW.disputed_at, NOW())
            ELSE disputed_at
        END,
        payment_method = to_jsonb(NEW.payment_methods[1]),
        manychat_data = to_jsonb(NEW.manychat_data),
        assigned_by = CASE 
            WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), assigned_by)
            ELSE assigned_by
        END,
        assigned_at = CASE 
            WHEN NEW.status IN ('assigned', 'assigned_and_hold') THEN NOW()
            ELSE assigned_at
        END,
        processed_by = CASE 
            WHEN NEW.status IN ('processed', 'completed') THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), processed_by)
            ELSE processed_by
        END,
        processed_at = CASE 
            WHEN NEW.status IN ('processed', 'completed') THEN NOW()
            ELSE processed_at
        END,
        completed_by = CASE 
            WHEN NEW.status = 'completed' THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), completed_by)
            ELSE completed_by
        END,
        completed_at = CASE 
            WHEN NEW.status = 'completed' THEN NOW()
            ELSE completed_at
        END,
        verified_by = CASE 
            WHEN NEW.status = 'verified' THEN 
                COALESCE((SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1), verified_by)
            ELSE verified_by
        END,
        verified_at = CASE 
            WHEN NEW.status = 'verified' THEN NOW()
            ELSE verified_at
        END,
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

    IF affected_rows = 0 THEN
        RAISE WARNING 'No transaction record found for redeem_id: % and redeem_uuid: %. Creating new record.', NEW.redeem_id, NEW.id;
        
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
                vip_code,
                init_by,
                screenshot_url,
                remarks,
                disputed_by,
                disputed_at,
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
                NEW.vip_code,
                COALESCE(NEW.init_by, auth.uid()),
                NEW.screenshot_url,
                NEW.remarks,
                CASE WHEN NEW.status = 'disputed' THEN 
                    COALESCE(NEW.disputed_by, (SELECT id FROM users WHERE name = NEW.agent_name LIMIT 1))
                ELSE NULL END,
                CASE WHEN NEW.status = 'disputed' THEN NOW() ELSE NULL END,
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

-- Function to sync existing data for new columns
CREATE OR REPLACE FUNCTION sync_existing_missing_columns()
RETURNS void AS $$
BEGIN
    -- Update transactions from recharge_requests
    UPDATE transactions t
    SET 
        screenshot_url = r.screenshot_url,
        remarks = r.remarks,
        disputed_by = CASE 
            WHEN r.status = 'disputed' THEN 
                COALESCE(r.disputed_by, (SELECT id FROM users WHERE name = r.agent_name LIMIT 1))
            ELSE t.disputed_by
        END,
        disputed_at = CASE 
            WHEN r.status = 'disputed' THEN 
                COALESCE(r.disputed_at, NOW())
            ELSE t.disputed_at
        END
    FROM recharge_requests r
    WHERE t.recharge_id = r.recharge_id
    AND t.recharge_uuid = r.id;

    -- Update transactions from redeem_requests
    UPDATE transactions t
    SET 
        screenshot_url = r.screenshot_url,
        remarks = r.remarks,
        disputed_by = CASE 
            WHEN r.status = 'disputed' THEN 
                COALESCE(r.disputed_by, (SELECT id FROM users WHERE name = r.agent_name LIMIT 1))
            ELSE t.disputed_by
        END,
        disputed_at = CASE 
            WHEN r.status = 'disputed' THEN 
                COALESCE(r.disputed_at, NOW())
            ELSE t.disputed_at
        END
    FROM redeem_requests r
    WHERE t.redeem_id = r.redeem_id
    AND t.redeem_uuid = r.id;

    RAISE NOTICE 'Updated all missing column values';
END;
$$ LANGUAGE plpgsql;

-- Execute the sync function
SELECT sync_existing_missing_columns();

-- Add rollback function
CREATE OR REPLACE FUNCTION rollback_missing_columns()
RETURNS void AS $$
BEGIN
    -- Remove columns from transactions
    ALTER TABLE transactions 
    DROP COLUMN IF EXISTS screenshot_url,
    DROP COLUMN IF EXISTS remarks,
    DROP COLUMN IF EXISTS disputed_by,
    DROP COLUMN IF EXISTS disputed_at;

    -- Remove columns from recharge_requests
    ALTER TABLE recharge_requests 
    DROP COLUMN IF EXISTS disputed_by,
    DROP COLUMN IF EXISTS disputed_at;

    -- Remove columns from redeem_requests
    ALTER TABLE redeem_requests 
    DROP COLUMN IF EXISTS disputed_by,
    DROP COLUMN IF EXISTS disputed_at;
END;
$$ LANGUAGE plpgsql; 