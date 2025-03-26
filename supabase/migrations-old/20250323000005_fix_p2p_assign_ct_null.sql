-- Update the handleP2PAssign function to explicitly set assigned_ct to NULL
CREATE OR REPLACE FUNCTION public.handle_p2p_assign(
    recharge_id TEXT,
    redeem_id TEXT,
    amount NUMERIC,
    match_type TEXT
) RETURNS json AS $$
DECLARE
    result json;
BEGIN
    -- Update recharge request
    UPDATE public.recharge_requests
    SET 
        status = 'assigned',
        assigned_redeem = jsonb_build_object(
            'redeem_id', redeem_id,
            'amount', amount,
            'type', match_type,
            'assigned_at', CURRENT_TIMESTAMP
        ),
        assigned_ct = NULL, -- Explicitly set to NULL for P2P assignments
        updated_at = CURRENT_TIMESTAMP
    WHERE id = recharge_id
    RETURNING jsonb_build_object(
        'id', id,
        'status', status,
        'assigned_redeem', assigned_redeem,
        'assigned_ct', assigned_ct,
        'updated_at', updated_at
    ) INTO result;

    -- Update redeem request amount_hold
    UPDATE public.redeem_requests
    SET 
        amount_hold = COALESCE(amount_hold, 0) + amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = redeem_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql; 