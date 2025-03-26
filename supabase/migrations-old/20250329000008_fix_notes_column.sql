-- Function to format manychat data
CREATE OR REPLACE FUNCTION format_manychat_data(data text)
RETURNS jsonb AS $$
BEGIN
    -- First convert the escaped JSON string to JSONB
    RETURN jsonb_build_object(
        '_id', (data::jsonb)->>'_id',
        'team', (data::jsonb)->>'team',
        'status', (data::jsonb)->>'status',
        'profile', (data::jsonb)->'profile',
        'vipCode', (data::jsonb)->>'vipCode',
        'platforms', (data::jsonb)->'platforms',
        'playerName', (data::jsonb)->>'playerName',
        'messengerId', (data::jsonb)->>'messengerId'
    );
END;
$$ LANGUAGE plpgsql;

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
        created_at,
        updated_at
    ) VALUES (
        NEW.recharge_id,
        NEW.id,
        NEW.messenger_id,
        to_jsonb(format_manychat_data(NEW.manychat_data::text))->>'page_id',
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
        format_manychat_data(NEW.manychat_data::text),
        NULL,
        NEW.vip_code,
        NEW.init_by,
        NEW.screenshot_url,
        NEW.notes,
        NULL,
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
        remarks,
        disputed_by,
        created_at,
        updated_at
    ) VALUES (
        NEW.redeem_id,
        NEW.id,
        NEW.messenger_id,
        to_jsonb(format_manychat_data(NEW.manychat_data::text))->>'page_id',
        map_status_to_transaction_status(NEW.status::text),
        'pending'::payment_status,
        NEW.total_amount,
        NEW.game_platform::game_platform,
        NEW.game_username,
        NEW.team_code,
        to_jsonb(NEW.payment_methods[1]),
        format_manychat_data(NEW.manychat_data::text),
        NULL,
        NEW.vip_code,
        NEW.init_by,
        NEW.notes,
        NULL,
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
        page_id = to_jsonb(format_manychat_data(NEW.manychat_data::text))->>'page_id',
        amount = NEW.amount,
        bonus_amount = NEW.bonus_amount,
        credits_loaded = NEW.credits_loaded,
        game_platform = NEW.game_platform::game_platform,
        game_username = NEW.game_username,
        team_code = NEW.team_code,
        vip_code = NEW.vip_code,
        init_by = NEW.init_by,
        screenshot_url = NEW.screenshot_url,
        remarks = NEW.notes,
        payment_method = to_jsonb(NEW.payment_method),
        manychat_data = format_manychat_data(NEW.manychat_data::text),
        updated_at = NOW()
    WHERE recharge_id = NEW.recharge_id AND recharge_uuid = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the redeem sync function
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
        page_id = to_jsonb(format_manychat_data(NEW.manychat_data::text))->>'page_id',
        amount = NEW.total_amount,
        game_platform = NEW.game_platform::game_platform,
        game_username = NEW.game_username,
        team_code = NEW.team_code,
        vip_code = NEW.vip_code,
        init_by = NEW.init_by,
        remarks = NEW.notes,
        payment_method = to_jsonb(NEW.payment_methods[1]),
        manychat_data = format_manychat_data(NEW.manychat_data::text),
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
                vip_code,
                init_by,
                remarks,
                created_at,
                updated_at
            ) VALUES (
                NEW.redeem_id,
                NEW.id,
                NEW.messenger_id,
                to_jsonb(format_manychat_data(NEW.manychat_data::text))->>'page_id',
                mapped_status,
                NULL,
                'pending'::payment_status,
                NEW.total_amount,
                NEW.game_platform::game_platform,
                NEW.game_username,
                NEW.team_code,
                to_jsonb(NEW.payment_methods[1]),
                format_manychat_data(NEW.manychat_data::text),
                NEW.vip_code,
                NEW.init_by,
                NEW.notes,
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
        remarks = r.notes,
        manychat_data = format_manychat_data(r.manychat_data::text),
        init_by = r.init_by
    FROM recharge_requests r
    WHERE t.recharge_id = r.recharge_id
    AND t.recharge_uuid = r.id;

    -- Update transactions from redeem_requests
    UPDATE transactions t
    SET 
        remarks = r.notes,
        manychat_data = format_manychat_data(r.manychat_data::text),
        init_by = r.init_by
    FROM redeem_requests r
    WHERE t.redeem_id = r.redeem_id
    AND t.redeem_uuid = r.id;

    RAISE NOTICE 'Updated all missing column values';
END;
$$ LANGUAGE plpgsql;

-- Execute the sync function
SELECT sync_existing_missing_columns(); 