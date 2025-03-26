-- Create deposit_status enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE deposit_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'rejected',
        'disputed',
        'sc_processed',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add deposit_status column to recharge_requests table
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS deposit_status deposit_status NOT NULL DEFAULT 'pending';

-- Add deposit_status column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS deposit_status deposit_status NOT NULL DEFAULT 'pending';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recharge_requests_deposit_status ON recharge_requests(deposit_status);
CREATE INDEX IF NOT EXISTS idx_transactions_deposit_status ON transactions(deposit_status);

-- Add comments to document the columns
COMMENT ON COLUMN recharge_requests.deposit_status IS 'Status of the deposit: pending, processing, completed, failed, cancelled, rejected, disputed, refunded';
COMMENT ON COLUMN transactions.deposit_status IS 'Status of the deposit linked to recharge_requests table';

-- Create function to sync deposit_status from recharge_requests to transactions
CREATE OR REPLACE FUNCTION sync_deposit_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the corresponding transaction record with proper type casting
    UPDATE transactions
    SET deposit_status = (NEW.deposit_status::text)::deposit_status
    WHERE recharge_id = NEW.recharge_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_deposit_status_trigger ON recharge_requests;

-- Create trigger to automatically sync deposit_status
CREATE TRIGGER sync_deposit_status_trigger
    AFTER UPDATE OF deposit_status ON recharge_requests
    FOR EACH ROW
    EXECUTE FUNCTION sync_deposit_status();

-- Update the recharge transaction handler function to include deposit_status
CREATE OR REPLACE FUNCTION handle_recharge_request_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_init_by uuid;
    v_deposit_status deposit_status;
BEGIN
    -- Handle UUID conversion
    BEGIN
        v_init_by := NEW.init_by::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_init_by := auth.uid();
    END;

    -- Handle deposit_status
    BEGIN
        v_deposit_status := COALESCE(NEW.deposit_status::deposit_status, 'pending'::deposit_status);
    EXCEPTION WHEN OTHERS THEN
        v_deposit_status := 'pending'::deposit_status;
    END;

    -- Insert a new transaction record
    INSERT INTO transactions (
        recharge_id,
        recharge_uuid,
        messenger_id,
        page_id,
        current_status,
        payment_status,
        deposit_status,
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
        to_jsonb(NEW.manychat_data)->>'page_id',
        map_status_to_transaction_status(NEW.status::text),
        'pending'::payment_status,
        v_deposit_status,
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
        v_init_by,
        NEW.screenshot_url,
        NEW.notes,
        NEW.disputed_by,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to sync existing records
CREATE OR REPLACE FUNCTION sync_existing_deposit_status()
RETURNS void AS $$
DECLARE
    v_status text;
    v_batch_size integer := 1000;
    v_last_id text := '0';
    v_total_processed integer := 0;
    v_batch_processed integer;
BEGIN
    -- First update recharge_requests with a batched approach
    FOR v_status IN 
        SELECT DISTINCT status::text 
        FROM recharge_requests 
    LOOP
        v_last_id := '0';
        LOOP
            WITH batch_update AS (
                SELECT recharge_id
                FROM recharge_requests
                WHERE status::text = v_status
                AND recharge_id::text > v_last_id
                ORDER BY recharge_id
                LIMIT v_batch_size
            )
            UPDATE recharge_requests
            SET deposit_status = (
                CASE v_status
                    WHEN 'pending' THEN 'pending'
                    WHEN 'processing' THEN 'processing'
                    WHEN 'completed' THEN 'completed'
                    WHEN 'failed' THEN 'failed'
                    WHEN 'cancelled' THEN 'cancelled'
                    WHEN 'rejected' THEN 'rejected'
                    WHEN 'disputed' THEN 'disputed'
                    WHEN 'sc_processed' THEN 'sc_processed'
                    ELSE 'pending'
                END
            )::deposit_status
            WHERE recharge_id IN (SELECT recharge_id FROM batch_update);

            GET DIAGNOSTICS v_batch_processed = ROW_COUNT;
            
            EXIT WHEN v_batch_processed = 0;
            
            v_total_processed := v_total_processed + v_batch_processed;
            
            SELECT COALESCE(MAX(recharge_id::text), '0') INTO v_last_id
            FROM recharge_requests
            WHERE status::text = v_status
            AND recharge_id::text > v_last_id;
            
            -- Add a small delay to prevent overwhelming the database
            PERFORM pg_sleep(0.1);
        END LOOP;
    END LOOP;

    -- Reset v_last_id for transactions sync
    v_last_id := '0';
    
    -- Then sync transactions with batched approach
    LOOP
        WITH batch_update AS (
            SELECT t.id, r.deposit_status
            FROM transactions t
            JOIN recharge_requests r ON t.recharge_id = r.recharge_id
            WHERE t.id::text > v_last_id
            ORDER BY t.id
            LIMIT v_batch_size
        )
        UPDATE transactions t
        SET deposit_status = (b.deposit_status::text)::deposit_status
        FROM batch_update b
        WHERE t.id = b.id;

        GET DIAGNOSTICS v_batch_processed = ROW_COUNT;
        
        EXIT WHEN v_batch_processed = 0;
        
        v_total_processed := v_total_processed + v_batch_processed;
        
        SELECT COALESCE(MAX(id::text), '0') INTO v_last_id
        FROM transactions
        WHERE id::text > v_last_id;
        
        -- Add a small delay to prevent overwhelming the database
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Deposit status sync completed. Total records processed: %', v_total_processed;
END;
$$ LANGUAGE plpgsql;

-- Execute the sync function
SELECT sync_existing_deposit_status();

-- Add rollback function
CREATE OR REPLACE FUNCTION rollback_deposit_status_changes()
RETURNS void AS $$
BEGIN
    -- Drop trigger and functions
    DROP TRIGGER IF EXISTS sync_deposit_status_trigger ON recharge_requests;
    DROP FUNCTION IF EXISTS sync_deposit_status();
    DROP FUNCTION IF EXISTS handle_recharge_request_transaction();
    DROP FUNCTION IF EXISTS sync_existing_deposit_status();
    
    -- Remove deposit_status columns
    ALTER TABLE recharge_requests DROP COLUMN IF EXISTS deposit_status;
    ALTER TABLE transactions DROP COLUMN IF EXISTS deposit_status;
    
    -- Drop enum type
    DROP TYPE IF EXISTS deposit_status;
END;
$$ LANGUAGE plpgsql; 