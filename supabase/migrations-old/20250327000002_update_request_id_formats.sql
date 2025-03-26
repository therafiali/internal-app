-- Update ID formats for redeem_requests and recharge_requests
BEGIN;

-- First, drop existing triggers that depend on the id column
DROP TRIGGER IF EXISTS auto_generate_recharge_id ON recharge_requests;
DROP TRIGGER IF EXISTS auto_generate_redeem_id ON redeem_requests;

-- Add status columns to both tables first
ALTER TABLE redeem_requests 
    DROP COLUMN IF EXISTS status,
    ADD COLUMN status redeem_status NOT NULL DEFAULT 'pending';

ALTER TABLE recharge_requests 
    DROP COLUMN IF EXISTS status,
    ADD COLUMN status recharge_status NOT NULL DEFAULT 'pending';

-- Create indexes for status columns
CREATE INDEX IF NOT EXISTS idx_redeem_requests_status ON redeem_requests (status);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests (status);

-- Verify status columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'redeem_requests' 
        AND column_name = 'status'
    ) THEN
        RAISE EXCEPTION 'Status column not found in redeem_requests after creation';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recharge_requests' 
        AND column_name = 'status'
    ) THEN
        RAISE EXCEPTION 'Status column not found in recharge_requests after creation';
    END IF;
END $$;

-- First, we need to handle foreign key constraints
-- Temporarily disable foreign key triggers
SET session_replication_role = 'replica';

-- Drop existing check constraints if they exist
ALTER TABLE recharge_requests DROP CONSTRAINT IF EXISTS recharge_id_format;
ALTER TABLE redeem_requests DROP CONSTRAINT IF EXISTS redeem_id_format;

-- Add new check constraints for the new ID formats, allowing both UUID and new format
ALTER TABLE recharge_requests
    ADD CONSTRAINT recharge_id_format 
    CHECK (
        -- Allow UUID format
        id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        OR
        -- Allow new L-number format
        id ~ '^L-[0-9]+[A-Z0-9]{4}$'
    );

ALTER TABLE redeem_requests
    ADD CONSTRAINT redeem_id_format 
    CHECK (
        -- Allow UUID format
        id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        OR
        -- Allow new R-number format
        id ~ '^R-[0-9]+[A-Z0-9]{4}$'
    );

-- Create sequences for request numbers
CREATE SEQUENCE IF NOT EXISTS redeem_request_seq;
CREATE SEQUENCE IF NOT EXISTS recharge_request_seq;

-- Function to generate random characters (4 characters)
CREATE OR REPLACE FUNCTION generate_random_chars(length integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Function to generate new redeem request ID
CREATE OR REPLACE FUNCTION generate_redeem_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    next_num integer;
    random_part text;
BEGIN
    -- Get next number from sequence
    SELECT nextval('redeem_request_seq') INTO next_num;
    -- Generate random characters
    SELECT generate_random_chars(4) INTO random_part;
    -- Return formatted ID
    RETURN 'R-' || next_num || random_part;
END;
$$;

-- Function to generate new recharge request ID
CREATE OR REPLACE FUNCTION generate_recharge_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    next_num integer;
    random_part text;
BEGIN
    -- Get next number from sequence
    SELECT nextval('recharge_request_seq') INTO next_num;
    -- Generate random characters
    SELECT generate_random_chars(4) INTO random_part;
    -- Return formatted ID
    RETURN 'L-' || next_num || random_part;
END;
$$;

-- Create temporary columns for new IDs
ALTER TABLE redeem_requests ADD COLUMN temp_new_id text;
ALTER TABLE recharge_requests ADD COLUMN temp_new_id text;

-- Update temporary columns with new IDs
DO $$
DECLARE
    r RECORD;
    generated_id text;
BEGIN
    -- Reset sequence
    ALTER SEQUENCE redeem_request_seq RESTART WITH 1;
    
    -- Update each redeem request ID
    FOR r IN SELECT id FROM redeem_requests ORDER BY created_at ASC
    LOOP
        SELECT generate_redeem_id() INTO generated_id;
        UPDATE redeem_requests 
        SET temp_new_id = generated_id 
        WHERE id = r.id;
    END LOOP;
END $$;

DO $$
DECLARE
    r RECORD;
    generated_id text;
BEGIN
    -- Reset sequence
    ALTER SEQUENCE recharge_request_seq RESTART WITH 1;
    
    -- Update each recharge request ID
    FOR r IN SELECT id FROM recharge_requests ORDER BY created_at ASC
    LOOP
        SELECT generate_recharge_id() INTO generated_id;
        UPDATE recharge_requests 
        SET temp_new_id = generated_id 
        WHERE id = r.id;
    END LOOP;
END $$;

-- Drop primary key constraints and foreign key constraints
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    -- Get and drop all foreign keys referencing redeem_requests.id
    FOR fk_record IN 
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name IN ('redeem_requests', 'recharge_requests')
        AND ccu.column_name = 'id'
    LOOP
        EXECUTE 'ALTER TABLE ' || fk_record.table_name || ' DROP CONSTRAINT ' || fk_record.constraint_name;
    END LOOP;
    
    -- Drop primary key constraints
    ALTER TABLE redeem_requests DROP CONSTRAINT IF EXISTS redeem_requests_pkey;
    ALTER TABLE recharge_requests DROP CONSTRAINT IF EXISTS recharge_requests_pkey;
END $$;

-- Update foreign key columns in related tables
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    -- Find and update all foreign key columns
    FOR fk_record IN 
        SELECT DISTINCT
            kcu.table_name,
            kcu.column_name,
            ccu.table_name as referenced_table
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.referential_constraints rc 
            ON kcu.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON rc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name IN ('redeem_requests', 'recharge_requests')
        AND kcu.table_schema = current_schema()
    LOOP
        -- Add new column
        EXECUTE 'ALTER TABLE ' || fk_record.table_name || 
                ' ADD COLUMN ' || fk_record.column_name || '_new text';
                
        -- Update new column from original table
        IF fk_record.referenced_table = 'redeem_requests' THEN
            EXECUTE 'UPDATE ' || fk_record.table_name || ' t ' ||
                    ' SET ' || fk_record.column_name || '_new = r.temp_new_id ' ||
                    ' FROM redeem_requests r ' ||
                    ' WHERE t.' || fk_record.column_name || ' = r.id';
        ELSE
            EXECUTE 'UPDATE ' || fk_record.table_name || ' t ' ||
                    ' SET ' || fk_record.column_name || '_new = r.temp_new_id ' ||
                    ' FROM recharge_requests r ' ||
                    ' WHERE t.' || fk_record.column_name || ' = r.id';
        END IF;
        
        -- Drop old column and rename new column
        EXECUTE 'ALTER TABLE ' || fk_record.table_name || 
                ' DROP COLUMN ' || fk_record.column_name || ' CASCADE';
        EXECUTE 'ALTER TABLE ' || fk_record.table_name || 
                ' RENAME COLUMN ' || fk_record.column_name || '_new TO ' || fk_record.column_name;
    END LOOP;
END $$;

-- Change id column type from uuid to text
ALTER TABLE redeem_requests ALTER COLUMN id TYPE text USING temp_new_id;
ALTER TABLE recharge_requests ALTER COLUMN id TYPE text USING temp_new_id;

-- Add primary key constraints immediately after changing column type
ALTER TABLE redeem_requests ADD PRIMARY KEY (id);
ALTER TABLE recharge_requests ADD PRIMARY KEY (id);

-- Add necessary columns to both tables
ALTER TABLE redeem_requests 
    DROP COLUMN IF EXISTS processed_by,
    ADD COLUMN processed_by UUID,
    DROP COLUMN IF EXISTS processed_at,
    ADD COLUMN processed_at TIMESTAMPTZ,
    DROP COLUMN IF EXISTS notes,
    ADD COLUMN notes TEXT,
    DROP COLUMN IF EXISTS updated_at,
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE recharge_requests 
    DROP COLUMN IF EXISTS processed_by,
    ADD COLUMN processed_by UUID,
    DROP COLUMN IF EXISTS processed_at,
    ADD COLUMN processed_at TIMESTAMPTZ,
    DROP COLUMN IF EXISTS notes,
    ADD COLUMN notes TEXT,
    DROP COLUMN IF EXISTS updated_at,
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add processing_state column to both tables
ALTER TABLE redeem_requests 
    DROP COLUMN IF EXISTS processing_state,
    ADD COLUMN processing_state request_processing_state NOT NULL DEFAULT ROW('idle', NULL, 'none')::request_processing_state;

ALTER TABLE recharge_requests 
    DROP COLUMN IF EXISTS processing_state,
    ADD COLUMN processing_state request_processing_state NOT NULL DEFAULT ROW('idle', NULL, 'none')::request_processing_state;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_redeem_requests_processing_status 
    ON redeem_requests (((processing_state).state));
CREATE INDEX IF NOT EXISTS idx_redeem_requests_processor 
    ON redeem_requests (((processing_state).processed_by));

CREATE INDEX IF NOT EXISTS idx_recharge_requests_processing_status 
    ON recharge_requests (((processing_state).state));
CREATE INDEX IF NOT EXISTS idx_recharge_requests_processor 
    ON recharge_requests (((processing_state).processed_by));

-- Update transactions table columns
ALTER TABLE transactions ADD COLUMN redeem_id_new text;
ALTER TABLE transactions ADD COLUMN recharge_id_new text;

-- Update the new columns with values from redeem_requests and recharge_requests
UPDATE transactions t
SET redeem_id_new = r.temp_new_id
FROM redeem_requests r
WHERE t.redeem_id::text = r.id::text;

UPDATE transactions t
SET recharge_id_new = r.temp_new_id
FROM recharge_requests r
WHERE t.recharge_id::text = r.id::text;

-- Drop old columns and rename new ones
ALTER TABLE transactions DROP COLUMN redeem_id CASCADE;
ALTER TABLE transactions DROP COLUMN recharge_id CASCADE;
ALTER TABLE transactions RENAME COLUMN redeem_id_new TO redeem_id;
ALTER TABLE transactions RENAME COLUMN recharge_id_new TO recharge_id;

-- Add foreign key constraints back for transactions
ALTER TABLE transactions
    ADD CONSTRAINT transactions_redeem_id_fkey
    FOREIGN KEY (redeem_id)
    REFERENCES redeem_requests(id);

ALTER TABLE transactions
    ADD CONSTRAINT transactions_recharge_id_fkey
    FOREIGN KEY (recharge_id)
    REFERENCES recharge_requests(id);

-- Now drop temporary columns
ALTER TABLE redeem_requests DROP COLUMN temp_new_id;
ALTER TABLE recharge_requests DROP COLUMN temp_new_id;

-- Recreate foreign key constraints with text type
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN 
        SELECT DISTINCT
            kcu.table_name,
            kcu.column_name,
            ccu.table_name as referenced_table
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.referential_constraints rc 
            ON kcu.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON rc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name IN ('redeem_requests', 'recharge_requests')
        AND kcu.table_schema = current_schema()
        -- Exclude transactions table since we already handled it
        AND kcu.table_name != 'transactions'
    LOOP
        EXECUTE 'ALTER TABLE ' || fk_record.table_name || 
                ' ADD CONSTRAINT ' || fk_record.table_name || '_' || fk_record.column_name || '_fkey' ||
                ' FOREIGN KEY (' || fk_record.column_name || ') REFERENCES ' || 
                fk_record.referenced_table || '(id)';
    END LOOP;
END $$;

-- Re-enable foreign key triggers
SET session_replication_role = 'origin';

-- Update acquire_request_processing function to handle text IDs
DROP FUNCTION IF EXISTS acquire_request_processing(UUID, UUID, modal_type);
DROP FUNCTION IF EXISTS acquire_request_processing(TEXT, UUID, modal_type);

CREATE OR REPLACE FUNCTION acquire_request_processing(
    request_id TEXT,
    user_id UUID,
    p_modal_type modal_type DEFAULT 'none'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to acquire processing on recharge request if it's not already being processed
    UPDATE recharge_requests
    SET processing_state = ROW('in_progress', user_id, p_modal_type)::request_processing_state
    WHERE id = request_id 
    AND (processing_state).state = 'idle'
    AND (processing_state).processed_by IS NULL;

    IF NOT FOUND THEN
        -- If not found in recharge, try redeem request
        UPDATE redeem_requests
        SET processing_state = ROW('in_progress', user_id, p_modal_type)::request_processing_state
        WHERE id = request_id 
        AND (processing_state).state = 'idle'
        AND (processing_state).processed_by IS NULL;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add release_request_processing function
DROP FUNCTION IF EXISTS release_request_processing(UUID, UUID);
DROP FUNCTION IF EXISTS release_request_processing(TEXT, UUID);

CREATE OR REPLACE FUNCTION release_request_processing(
    request_id TEXT,
    user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to release processing on recharge request if processed by the same user
    UPDATE recharge_requests
    SET processing_state = ROW('idle', NULL, 'none')::request_processing_state
    WHERE id = request_id
    AND (processing_state).processed_by = user_id;

    IF NOT FOUND THEN
        -- If not found in recharge, try redeem request
        UPDATE redeem_requests
        SET processing_state = ROW('idle', NULL, 'none')::request_processing_state
        WHERE id = request_id
        AND (processing_state).processed_by = user_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Update process_redeem_request function to use text IDs
DROP FUNCTION IF EXISTS process_redeem_request(TEXT, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS process_redeem_request(TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS process_redeem_request(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS process_redeem_request(p_redeem_id UUID, p_status TEXT, p_processed_by UUID, p_notes TEXT);
DROP FUNCTION IF EXISTS process_redeem_request(p_notes TEXT, p_processed_by UUID, p_redeem_id UUID, p_status TEXT);
DROP FUNCTION IF EXISTS process_redeem_request(p_notes TEXT, p_processed_by UUID, p_redeem_id TEXT, p_status TEXT);

-- Create single version of process_redeem_request with consistent parameter order
CREATE OR REPLACE FUNCTION process_redeem_request(
    p_redeem_id TEXT,
    p_status TEXT,
    p_processed_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_request redeem_requests%ROWTYPE;
    v_new_status redeem_status;
    v_debug_info JSONB;
BEGIN
    -- Initialize debug info
    v_debug_info := jsonb_build_object(
        'function_name', 'process_redeem_request',
        'input_params', jsonb_build_object(
            'p_redeem_id', p_redeem_id,
            'p_status', p_status,
            'p_processed_by', p_processed_by,
            'p_notes', p_notes
        )
    );

    -- Log table structure
    v_debug_info := v_debug_info || jsonb_build_object(
        'table_info', (
            SELECT jsonb_agg(jsonb_build_object(
                'column_name', column_name,
                'data_type', data_type,
                'udt_name', udt_name
            ))
            FROM information_schema.columns
            WHERE table_name = 'redeem_requests'
        )
    );

    -- Validate required parameters
    IF p_processed_by IS NULL THEN
        RAISE EXCEPTION 'processed_by parameter is required';
    END IF;
    
    IF p_redeem_id IS NULL THEN
        RAISE EXCEPTION 'redeem_id parameter is required';
    END IF;
    
    IF p_status IS NULL THEN
        RAISE EXCEPTION 'status parameter is required';
    END IF;

    -- Convert input status to enum
    BEGIN
        v_new_status := p_status::redeem_status;
        v_debug_info := v_debug_info || jsonb_build_object('status_conversion', 'success');
    EXCEPTION WHEN invalid_text_representation THEN
        v_debug_info := v_debug_info || jsonb_build_object('status_conversion_error', SQLERRM);
        RAISE EXCEPTION 'Invalid status value: %. Valid values are: pending, initiated, under_processing, processed, rejected, verification_pending, verification_failed, queued, paused, queued_partially_paid, paused_partially_paid, completed, unverified. Debug info: %', p_status, v_debug_info;
    END;

    -- Get the current request
    BEGIN
        SELECT * INTO v_request
        FROM redeem_requests
        WHERE id = p_redeem_id
        FOR UPDATE;

        v_debug_info := v_debug_info || jsonb_build_object(
            'request_found', FOUND,
            'request_data', to_jsonb(v_request)
        );
    EXCEPTION WHEN OTHERS THEN
        v_debug_info := v_debug_info || jsonb_build_object('select_error', SQLERRM);
        RAISE EXCEPTION 'Error selecting request: %. Debug info: %', SQLERRM, v_debug_info;
    END;

    -- Check if request exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Redeem request not found. Debug info: %', v_debug_info;
    END IF;

    -- Start transaction
    BEGIN
        -- Update redeem_requests table
        BEGIN
            UPDATE redeem_requests
            SET 
                status = v_new_status,
                processed_by = p_processed_by,
                processed_at = NOW(),
                notes = COALESCE(p_notes, notes),
                updated_at = NOW(),
                -- Reset processing state
                processing_state = ROW('idle', NULL, 'none')::request_processing_state
            WHERE id = p_redeem_id
            RETURNING to_jsonb(redeem_requests.*) INTO v_result;

            v_debug_info := v_debug_info || jsonb_build_object(
                'update_success', FOUND,
                'updated_data', v_result
            );
        EXCEPTION WHEN OTHERS THEN
            v_debug_info := v_debug_info || jsonb_build_object('update_error', SQLERRM);
            RAISE EXCEPTION 'Error updating request: %. Debug info: %', SQLERRM, v_debug_info;
        END;

        -- If no update occurred
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update redeem request. Debug info: %', v_debug_info;
        END IF;

        -- Update transactions if they exist
        BEGIN
            UPDATE transactions
            SET 
                status = CASE 
                    WHEN p_status = 'verification_pending' THEN 'pending_verification'::transaction_status
                    WHEN p_status = 'rejected' THEN 'rejected'::transaction_status
                    ELSE status
                END,
                processed_by = p_processed_by,
                updated_at = NOW()
            WHERE redeem_id = p_redeem_id;

            v_debug_info := v_debug_info || jsonb_build_object(
                'transactions_updated', FOUND
            );
        EXCEPTION WHEN OTHERS THEN
            v_debug_info := v_debug_info || jsonb_build_object('transaction_update_error', SQLERRM);
            RAISE EXCEPTION 'Error updating transactions: %. Debug info: %', SQLERRM, v_debug_info;
        END;

        -- Return success result with debug info
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Request processed successfully',
            'data', v_result,
            'debug_info', v_debug_info
        );
    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        RAISE EXCEPTION 'Error processing request: %. Debug info: %', SQLERRM, v_debug_info;
    END;
END;
$$;

-- Update process_recharge_request function to use text IDs with consistent parameter order
DROP FUNCTION IF EXISTS process_recharge_request(TEXT, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS process_recharge_request(TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS process_recharge_request(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS process_recharge_request(p_recharge_id UUID, p_status TEXT, p_processed_by UUID, p_notes TEXT);
DROP FUNCTION IF EXISTS process_recharge_request(p_notes TEXT, p_processed_by UUID, p_recharge_id UUID, p_status TEXT);
DROP FUNCTION IF EXISTS process_recharge_request(p_notes TEXT, p_processed_by UUID, p_recharge_id TEXT, p_status TEXT);

CREATE OR REPLACE FUNCTION process_recharge_request(
    p_recharge_id TEXT,
    p_status TEXT,
    p_processed_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_request recharge_requests%ROWTYPE;
    v_new_status recharge_status;
BEGIN
    -- Validate required parameters
    IF p_processed_by IS NULL THEN
        RAISE EXCEPTION 'processed_by parameter is required';
    END IF;
    
    IF p_recharge_id IS NULL THEN
        RAISE EXCEPTION 'recharge_id parameter is required';
    END IF;
    
    IF p_status IS NULL THEN
        RAISE EXCEPTION 'status parameter is required';
    END IF;

    -- Convert input status to enum
    BEGIN
        v_new_status := p_status::recharge_status;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid status value: %. Valid values are: pending, initiated, under_processing, processed, rejected, verification_pending, verification_failed, queued, paused, completed, unverified', p_status;
    END;

    -- Get the current request
    SELECT * INTO v_request
    FROM recharge_requests
    WHERE id = p_recharge_id
    FOR UPDATE;

    -- Check if request exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recharge request not found';
    END IF;

    -- Start transaction
    BEGIN
        -- Update recharge_requests table
        UPDATE recharge_requests
        SET 
            status = v_new_status,
            processed_by = p_processed_by,
            processed_at = NOW(),
            notes = COALESCE(p_notes, notes),
            updated_at = NOW(),
            -- Reset processing state
            processing_state = ROW('idle', NULL, 'none')::request_processing_state
        WHERE id = p_recharge_id
        RETURNING to_jsonb(recharge_requests.*) INTO v_result;

        -- If no update occurred
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update recharge request';
        END IF;

        -- Update transactions if they exist
        UPDATE transactions
        SET 
            status = CASE 
                WHEN p_status = 'verification_pending' THEN 'pending_verification'::transaction_status
                WHEN p_status = 'rejected' THEN 'rejected'::transaction_status
                ELSE status
            END,
            processed_by = p_processed_by,
            updated_at = NOW()
        WHERE recharge_id = p_recharge_id;

        -- Return success result
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Request processed successfully',
            'data', v_result
        );
    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        RAISE EXCEPTION 'Error processing request: %', SQLERRM;
    END;
END;
$$;

-- Create trigger function for auto-generating IDs (at the end of the file)
CREATE OR REPLACE FUNCTION generate_request_id()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'recharge_requests' THEN
        NEW.id := generate_recharge_id();
    ELSIF TG_TABLE_NAME = 'redeem_requests' THEN
        NEW.id := generate_redeem_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both tables (after all column modifications are done)
CREATE TRIGGER auto_generate_recharge_id
    BEFORE INSERT ON recharge_requests
    FOR EACH ROW
    WHEN (NEW.id IS NULL OR NEW.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    EXECUTE FUNCTION generate_request_id();

CREATE TRIGGER auto_generate_redeem_id
    BEFORE INSERT ON redeem_requests
    FOR EACH ROW
    WHEN (NEW.id IS NULL OR NEW.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    EXECUTE FUNCTION generate_request_id();

COMMIT; 