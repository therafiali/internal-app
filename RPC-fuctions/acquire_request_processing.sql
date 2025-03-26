BEGIN
  -- Try to update the processing state
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

  -- Return true if we successfully updated a row
  RETURN FOUND;
END;
