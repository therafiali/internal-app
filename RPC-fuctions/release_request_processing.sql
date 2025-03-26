BEGIN
  -- Only release if the current user owns the lock
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

  -- Return true if we successfully updated a row
  RETURN FOUND;
END;
