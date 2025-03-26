-- Drop existing function
drop function if exists assign_company_tag(uuid, numeric, uuid, text, text, text);

-- Create updated function matching the working data structure
create or replace function assign_company_tag(
  p_tag_id uuid,
  p_amount numeric,
  p_recharge_id uuid,
  p_user_email text,
  p_cashtag text,
  p_ct_type text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_tag_exists boolean;
  v_recharge_exists boolean;
  v_current_limit numeric;
  v_result jsonb;
begin
  -- Check if company tag exists and is active
  select exists(
    select 1 from company_tags 
    where id = p_tag_id 
    and status = 'active'
  ) into v_tag_exists;

  if not v_tag_exists then
    raise exception 'Company tag % not found or is not active', p_tag_id;
  end if;

  -- Check if recharge request exists and is in pending state
  select exists(
    select 1 from recharge_requests
    where id = p_recharge_id
    and status = 'pending'
  ) into v_recharge_exists;

  if not v_recharge_exists then
    raise exception 'Recharge request % not found or is not in pending state', p_recharge_id;
  end if;

  -- Check if limit is sufficient
  select "limit" into v_current_limit
  from company_tags
  where id = p_tag_id;

  if v_current_limit < p_amount then
    raise exception 'Insufficient limit. Available: $%, Required: $%', v_current_limit, p_amount;
  end if;

  -- Update recharge request with company tag assignment
  update recharge_requests
  set 
    status = 'assigned',
    assigned_ct = jsonb_build_object(
      'c_id', p_tag_id,
      'type', coalesce(p_ct_type, 'personal'),
      'amount', p_amount,
      'cashtag', p_cashtag,
      'assigned_at', now(),
      'assigned_by', p_user_email
    ),
    updated_at = now()
  where id = p_recharge_id
  returning jsonb_build_object(
    'id', id,
    'status', status,
    'assigned_ct', assigned_ct
  ) into v_result;

  -- Update company tag balance and limit
  update company_tags
  set 
    balance = balance + p_amount,
    "limit" = "limit" - p_amount,
    updated_at = now()
  where id = p_tag_id;

  return v_result;
end;
$$; 