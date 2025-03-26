CREATE OR REPLACE FUNCTION public.process_redeem_request_with_player_update(
  p_redeem_id UUID,
  p_status TEXT,                    -- Keep as TEXT in parameter
  p_processed_by UUID,
  p_notes TEXT,
  p_amount NUMERIC,
  p_game_platform TEXT,
  p_vip_code TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current timestamp
  v_current_time := NOW();

  -- Update redeem_requests table with status cast to request_status
  UPDATE public.redeem_requests
  SET 
    status = p_status::request_status,  -- Cast TEXT to request_status
    processed_by = p_processed_by,
    processed_at = v_current_time,
    notes = p_notes,
    updated_at = v_current_time
  WHERE id = p_redeem_id;

  -- Update players table with new values
  UPDATE public.players
  SET
    updated_at = v_current_time
  WHERE vip_code = p_vip_code;

  -- If player doesn't exist, insert new record
  IF NOT FOUND THEN
    INSERT INTO public.players (
      vip_code,
      created_at,
      updated_at
    ) VALUES (
      p_vip_code,
      v_current_time,
      v_current_time
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Processing completed successfully'
  );
END;
$$;