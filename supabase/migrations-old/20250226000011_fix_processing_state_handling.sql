-- Create required types first
DO $$ 
BEGIN
    -- Create enum for processing status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processing_status') THEN
        CREATE TYPE processing_status AS ENUM ('idle', 'in_progress');
    END IF;

    -- Create enum for modal types if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modal_type') THEN
        CREATE TYPE modal_type AS ENUM (
            'process_modal',
            'reject_modal',
            'approve_modal',
            'verify_modal',
            'payment_modal',
            'none'
        );
    END IF;

    -- Create or replace the composite type for processing state
    DROP TYPE IF EXISTS request_processing_state CASCADE;
    CREATE TYPE request_processing_state AS (
        status processing_status,
        processed_by UUID,
        modal_type modal_type
    );
END $$;

-- Create helper function to create processing state
CREATE OR REPLACE FUNCTION create_processing_state(
    p_status processing_status,
    p_processed_by UUID,
    p_modal_type modal_type
) RETURNS request_processing_state AS $$
BEGIN
    RETURN (p_status, p_processed_by, p_modal_type)::request_processing_state;
END;
$$ LANGUAGE plpgsql;

-- Fix processing state handling and add additional functionality
DO $$ 
DECLARE 
    null_count INTEGER;
    problem_rows RECORD;
    default_state request_processing_state;
BEGIN
    -- Create default state once
    default_state := create_processing_state('idle'::processing_status, NULL, 'none'::modal_type);

    -- First, let's check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'redeem_requests' 
        AND column_name = 'processing_state'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE redeem_requests
        ADD COLUMN processing_state request_processing_state;

        -- Set the default value separately
        ALTER TABLE redeem_requests
        ALTER COLUMN processing_state 
        SET DEFAULT ('idle'::processing_status, NULL, 'none'::modal_type)::request_processing_state;
        
        RAISE NOTICE 'Added processing_state column with default value';
    END IF;

    -- Check for any rows where processing_state is invalid or NULL
    CREATE TEMP TABLE problem_redeem_requests AS
    SELECT id, created_at, updated_at
    FROM redeem_requests
    WHERE processing_state IS NULL;

    GET DIAGNOSTICS null_count = ROW_COUNT;
    RAISE NOTICE 'Found % potentially problematic rows', null_count;

    -- Show sample of problematic rows
    FOR problem_rows IN 
        SELECT * FROM problem_redeem_requests LIMIT 5
    LOOP
        RAISE NOTICE 'Problem row - ID: %, Created: %, Updated: %', 
            problem_rows.id, problem_rows.created_at, problem_rows.updated_at;
    END LOOP;

    -- Update all rows to ensure they have valid processing_state
    UPDATE redeem_requests
    SET processing_state = default_state,
        updated_at = NOW()
    WHERE id IN (SELECT id FROM problem_redeem_requests);

    GET DIAGNOSTICS null_count = ROW_COUNT;
    RAISE NOTICE 'Updated % rows with default processing_state', null_count;

    -- Double check for any remaining NULL values
    SELECT COUNT(*) INTO null_count
    FROM redeem_requests
    WHERE processing_state IS NULL;

    IF null_count > 0 THEN
        RAISE NOTICE 'Still found % NULL values after update', null_count;
        
        -- Try one more time with a different approach
        UPDATE redeem_requests
        SET processing_state = default_state,
            updated_at = NOW()
        WHERE processing_state IS NULL;
        
        GET DIAGNOSTICS null_count = ROW_COUNT;
        RAISE NOTICE 'Updated % additional rows in second attempt', null_count;
    END IF;

    -- Final check for NULL values
    SELECT COUNT(*) INTO null_count
    FROM redeem_requests
    WHERE processing_state IS NULL;

    IF null_count > 0 THEN
        RAISE EXCEPTION 'Still have % NULL values after all attempts', null_count;
    END IF;

    -- Now try to set the default and NOT NULL constraint
    ALTER TABLE redeem_requests
        ALTER COLUMN processing_state 
        SET DEFAULT ('idle'::processing_status, NULL, 'none'::modal_type)::request_processing_state;

    RAISE NOTICE 'Set default value for processing_state';

    -- Remove any existing constraints
    ALTER TABLE redeem_requests
        DROP CONSTRAINT IF EXISTS processing_state_not_null;

    RAISE NOTICE 'Dropped existing constraints';

    -- Add NOT NULL constraint
    ALTER TABLE redeem_requests
        ALTER COLUMN processing_state SET NOT NULL;

    RAISE NOTICE 'Added NOT NULL constraint';

    -- Clean up
    DROP TABLE IF EXISTS problem_redeem_requests;

    RAISE NOTICE 'Successfully completed all processing_state updates and constraints';
END $$;

-- Drop all versions of the functions first
DROP FUNCTION IF EXISTS acquire_request_processing(text, text, modal_type);
DROP FUNCTION IF EXISTS acquire_request_processing(text, uuid, modal_type);
DROP FUNCTION IF EXISTS acquire_request_processing(uuid, text, modal_type);
DROP FUNCTION IF EXISTS acquire_request_processing(uuid, uuid, modal_type);

-- Create the new version of acquire_request_processing
CREATE OR REPLACE FUNCTION acquire_request_processing(
    request_id text,
    user_id text,
    p_modal_type modal_type DEFAULT 'none'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_state request_processing_state;
    uuid_user_id UUID;
BEGIN
    -- Convert text user_id to UUID
    BEGIN
        uuid_user_id := user_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid UUID format for user_id: %', user_id;
    END;

    -- Get current state with row lock
    SELECT processing_state INTO current_state
    FROM redeem_requests
    WHERE id = request_id::UUID
    FOR UPDATE SKIP LOCKED;

    -- Return false if request doesn't exist
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check if already being processed by someone else
    IF current_state.status = 'in_progress' AND current_state.processed_by != uuid_user_id THEN
        RETURN false;
    END IF;

    -- Update processing state using helper function
    UPDATE redeem_requests
    SET processing_state = create_processing_state('in_progress'::processing_status, uuid_user_id, p_modal_type),
        updated_at = NOW()
    WHERE id = request_id::UUID;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Drop all versions of release_request_processing
DROP FUNCTION IF EXISTS release_request_processing(text, text);
DROP FUNCTION IF EXISTS release_request_processing(text, uuid);
DROP FUNCTION IF EXISTS release_request_processing(uuid, text);
DROP FUNCTION IF EXISTS release_request_processing(uuid, uuid);

-- Create the new version of release_request_processing
CREATE OR REPLACE FUNCTION release_request_processing(
    request_id text,
    user_id text
)
RETURNS BOOLEAN AS $$
DECLARE
    uuid_user_id UUID;
BEGIN
    -- Convert text user_id to UUID
    BEGIN
        uuid_user_id := user_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid UUID format for user_id: %', user_id;
    END;

    UPDATE redeem_requests
    SET processing_state = create_processing_state('idle'::processing_status, NULL, 'none'::modal_type),
        updated_at = NOW()
    WHERE id = request_id::UUID
    AND (
        (processing_state).processed_by = uuid_user_id
        OR (processing_state).processed_by IS NULL
    );

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Drop all versions of check_request_processing
DROP FUNCTION IF EXISTS check_request_processing(text);
DROP FUNCTION IF EXISTS check_request_processing(uuid);

-- Create the new version of check_request_processing
CREATE OR REPLACE FUNCTION check_request_processing(
    request_id text
)
RETURNS request_processing_state AS $$
DECLARE
    result request_processing_state;
BEGIN
    SELECT processing_state INTO result
    FROM redeem_requests
    WHERE id = request_id::UUID;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add function to release stale processing states (older than 15 minutes)
CREATE OR REPLACE FUNCTION release_stale_processing_states()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    WITH updated_rows AS (
        UPDATE redeem_requests
        SET processing_state = create_processing_state('idle'::processing_status, NULL, 'none'::modal_type),
            updated_at = NOW()
        WHERE (processing_state).status = 'in_progress'
        AND updated_at < NOW() - INTERVAL '15 minutes'
        RETURNING 1
    )
    SELECT COUNT(*) INTO affected_rows FROM updated_rows;

    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically release stale processing states
CREATE OR REPLACE FUNCTION check_stale_processing_states()
RETURNS trigger AS $$
BEGIN
    -- Release stale processing states if more than 15 minutes old
    IF NEW.processing_state IS NOT NULL 
    AND (NEW.processing_state).status = 'in_progress' 
    AND NEW.updated_at < NOW() - INTERVAL '15 minutes' THEN
        NEW.processing_state = create_processing_state('idle'::processing_status, NULL, 'none'::modal_type);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_stale_processing_states ON redeem_requests;
CREATE TRIGGER trg_check_stale_processing_states
    BEFORE UPDATE ON redeem_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_stale_processing_states();

-- Add an index to help with stale processing state cleanup
CREATE INDEX IF NOT EXISTS idx_redeem_requests_processing_updated_at
    ON redeem_requests (updated_at)
    WHERE ((processing_state).status = 'in_progress');

-- Update initialization code to use helper function
UPDATE redeem_requests
SET processing_state = create_processing_state('idle'::processing_status, NULL, 'none'::modal_type)
WHERE processing_state IS NULL; 