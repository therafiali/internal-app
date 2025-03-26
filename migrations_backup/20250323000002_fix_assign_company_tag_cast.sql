-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS assign_company_tag(uuid, numeric, uuid, text, text, text);
DROP FUNCTION IF EXISTS assign_company_tag(uuid, numeric, text, text, text, text);
DROP FUNCTION IF EXISTS assign_company_tag(text, numeric, text, text, text, text);

-- Create updated function with explicit type casts
CREATE OR REPLACE FUNCTION assign_company_tag(
  p_tag_id text,
  p_amount numeric,
  p_recharge_id text,
  p_user_email text,
  p_cashtag text,
  p_ct_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag_exists boolean;
  v_recharge_exists boolean;
  v_current_limit numeric;
  v_result jsonb;
BEGIN
  -- First, verify the company tag exists and is active
  SELECT EXISTS(
    SELECT 1 FROM company_tags 
    WHERE c_id = p_tag_id::text 
    AND status = 'active'
  ) INTO v_tag_exists;

  IF NOT v_tag_exists THEN
    RAISE EXCEPTION 'Company tag % not found or is not active', p_tag_id;
  END IF;

  -- Check if recharge request exists and is in pending state
  SELECT EXISTS(
    SELECT 1 FROM recharge_requests
    WHERE id = p_recharge_id::text
    AND status = 'pending'
  ) INTO v_recharge_exists;

  IF NOT v_recharge_exists THEN
    RAISE EXCEPTION 'Recharge request % not found or is not in pending state', p_recharge_id;
  END IF;

  -- Check if limit is sufficient
  SELECT "limit" INTO v_current_limit
  FROM company_tags
  WHERE c_id = p_tag_id::text;

  IF v_current_limit < p_amount THEN
    RAISE EXCEPTION 'Insufficient limit. Available: $%, Required: $%', v_current_limit, p_amount;
  END IF;

  -- Update recharge request with company tag assignment
  UPDATE recharge_requests
  SET 
    status = 'assigned',
    assigned_ct = jsonb_build_object(
      'c_id', p_tag_id,
      'type', COALESCE(p_ct_type, 'personal'),
      'amount', p_amount,
      'cashtag', p_cashtag,
      'assigned_at', now(),
      'assigned_by', p_user_email
    ),
    updated_at = now()
  WHERE id = p_recharge_id::text
  RETURNING jsonb_build_object(
    'id', id,
    'status', status,
    'assigned_ct', assigned_ct
  ) INTO v_result;

  -- Update company tag balance and limit
  UPDATE company_tags
  SET 
    balance = balance + p_amount,
    "limit" = "limit" - p_amount,
    updated_at = now()
  WHERE c_id = p_tag_id::text;

  RETURN v_result;
END;
$$; 