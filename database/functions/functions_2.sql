-- Request Processing Functions
CREATE OR REPLACE FUNCTION process_recharge_request(
    p_recharge_id text,
    p_status text,
    p_processed_by uuid,
    p_notes text DEFAULT NULL::text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
    v_result JSONB;
    v_request recharge_requests%ROWTYPE;
    v_new_status recharge_status;
BEGIN
    IF p_recharge_id IS NULL THEN
        RAISE EXCEPTION 'recharge_id parameter is required';
    END IF;
    
    IF p_status IS NULL THEN
        RAISE EXCEPTION 'status parameter is required';
    END IF;

    BEGIN
        v_new_status := p_status::recharge_status;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid status value: %. Valid values are: pending, initiated, under_processing, processed, rejected, verification_pending, verification_failed, queued, paused, completed, unverified', p_status;
    END;

    SELECT * INTO v_request
    FROM recharge_requests
    WHERE id = p_recharge_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recharge request not found';
    END IF;

    BEGIN
        UPDATE recharge_requests
        SET 
            status = v_new_status,
            assigned_id = p_processed_by,
            notes = COALESCE(p_notes, notes),
            updated_at = NOW(),
            processing_state = ROW('idle', NULL, 'none')::request_processing_state
        WHERE id = p_recharge_id
        RETURNING to_jsonb(recharge_requests.*) INTO v_result;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update recharge request';
        END IF;

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

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Request processed successfully',
            'data', v_result
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error processing request: %', SQLERRM;
    END;
END;
$$;

-- Processing State Management Functions
CREATE OR REPLACE FUNCTION release_stale_processing_states()
RETURNS integer LANGUAGE plpgsql AS $$
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
$$;

CREATE OR REPLACE FUNCTION check_stale_processing_states()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.processing_state IS NOT NULL 
    AND (NEW.processing_state).status = 'in_progress' 
    AND NEW.updated_at < NOW() - INTERVAL '15 minutes' THEN
        NEW.processing_state = create_processing_state('idle'::processing_status, NULL, 'none'::modal_type);
    END IF;
    RETURN NEW;
END;
$$;

-- Request Processing Functions
CREATE OR REPLACE FUNCTION acquire_request_processing(
    request_id uuid,
    user_id uuid,
    p_modal_type modal_type
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE redeem_requests
    SET 
        processing_state = jsonb_build_object(
            'status', 'in_progress',
            'processed_by', user_id::text,
            'modal_type', p_modal_type
        ),
        action_status = 'in_progress'
    WHERE id = request_id 
    AND (
        processing_state->>'status' = 'idle'
        OR (
            processing_state->>'status' = 'in_progress' 
            AND processing_state->>'processed_by' = user_id::text
        )
    );

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION release_request_processing(
    request_id uuid,
    user_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE redeem_requests
    SET 
        processing_state = jsonb_build_object(
            'status', 'idle',
            'processed_by', NULL,
            'modal_type', 'none'
        ),
        action_status = 'idle'
    WHERE id = request_id 
    AND processing_state->>'processed_by' = user_id::text;

    RETURN FOUND;
END;
$$;

-- Balance Management Functions
CREATE OR REPLACE FUNCTION transfer_balance(
    from_tag_id uuid,
    to_tag_id uuid,
    transfer_amount numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    from_tag record;
    to_tag record;
BEGIN
    SELECT * INTO from_tag
    FROM company_tags
    WHERE id = from_tag_id
    FOR UPDATE;

    SELECT * INTO to_tag
    FROM company_tags
    WHERE id = to_tag_id
    FOR UPDATE;

    IF from_tag IS NULL THEN
        RAISE EXCEPTION 'Source tag not found';
    END IF;

    IF to_tag IS NULL THEN
        RAISE EXCEPTION 'Target tag not found';
    END IF;

    IF from_tag.balance < transfer_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    IF from_tag.status != 'active' THEN
        RAISE EXCEPTION 'Source tag is not active';
    END IF;

    IF to_tag.status != 'active' THEN
        RAISE EXCEPTION 'Target tag is not active';
    END IF;

    UPDATE company_tags
    SET 
        balance = balance - transfer_amount,
        total_withdrawn = total_withdrawn + transfer_amount,
        transaction_count = transaction_count + 1,
        last_active = NOW()
    WHERE id = from_tag_id;

    UPDATE company_tags
    SET 
        balance = balance + transfer_amount,
        total_received = total_received + transfer_amount,
        transaction_count = transaction_count + 1,
        last_active = NOW()
    WHERE id = to_tag_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Transfer completed successfully',
        'from_tag', from_tag.cashtag,
        'to_tag', to_tag.cashtag,
        'amount', transfer_amount,
        'timestamp', NOW()
    );
END;
$$;

-- Validation Functions
CREATE OR REPLACE FUNCTION validate_payment_method(payment jsonb)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
    RETURN (
        payment ? 'type' AND
        payment ? 'username' AND
        (payment->>'type')::TEXT IN ('cashapp', 'venmo', 'chime') AND
        (
            NOT (payment ? 'amount') OR 
            (payment->>'amount')::DECIMAL >= 0
        ) AND
        (
            NOT (payment ? 'identifier') OR 
            (payment->>'identifier')::TEXT IS NOT NULL
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION validate_payment_methods()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    payment_method JSONB;
BEGIN
    IF NEW.payment_methods IS NOT NULL THEN
        FOREACH payment_method IN ARRAY NEW.payment_methods
        LOOP
            IF NOT validate_payment_method(payment_method) THEN
                RAISE EXCEPTION 'Invalid payment method structure: %', payment_method;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

-- ID Generation Functions
CREATE OR REPLACE FUNCTION generate_transfer_id()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    characters text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    id_length integer := 5;
    result text := 'T-';
    i integer;
BEGIN
    FOR i IN 1..id_length LOOP
        result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_unique_transfer_id()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    transfer_id text;
    max_attempts integer := 10;
    current_attempt integer := 0;
BEGIN
    LOOP
        transfer_id := generate_transfer_id();
        EXIT WHEN NOT exists (SELECT 1 FROM transfer_requests WHERE id = transfer_id) OR current_attempt >= max_attempts;
        current_attempt := current_attempt + 1;
    END LOOP;
    
    IF current_attempt >= max_attempts THEN
        RAISE EXCEPTION 'Could not generate unique transfer ID after % attempts', max_attempts;
    END IF;
    
    RETURN transfer_id;
END;
$$; 