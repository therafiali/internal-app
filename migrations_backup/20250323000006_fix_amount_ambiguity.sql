-- Drop existing function
DROP FUNCTION IF EXISTS handle_p2p_assign(text, numeric, text, text);

-- Create updated function with unambiguous column references
CREATE OR REPLACE FUNCTION public.handle_p2p_assign(
    p_recharge_id TEXT,
    p_assign_amount NUMERIC,
    p_redeem_id TEXT,
    p_match_type TEXT
) RETURNS json AS $$
DECLARE
    v_result json;
BEGIN
    -- Update recharge request
    UPDATE public.recharge_requests
    SET 
        status = 'assigned',
        assigned_redeem = jsonb_build_object(
            'redeem_id', p_redeem_id,
            'amount', p_assign_amount,
            'type', p_match_type,
            'assigned_at', CURRENT_TIMESTAMP
        ),
        assigned_ct = NULL, -- Explicitly set to NULL for P2P assignments
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_recharge_id
    RETURNING jsonb_build_object(
        'id', id,
        'status', status,
        'assigned_redeem', assigned_redeem,
        'assigned_ct', assigned_ct,
        'updated_at', updated_at
    ) INTO v_result;

    -- Update redeem request amount_hold
    UPDATE public.redeem_requests
    SET 
        amount_hold = COALESCE(amount_hold, 0) + p_assign_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_redeem_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql; 