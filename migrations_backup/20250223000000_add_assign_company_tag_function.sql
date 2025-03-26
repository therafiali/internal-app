-- Create function to handle company tag assignment
create or replace function assign_company_tag(
  p_tag_id uuid,
  p_amount numeric,
  p_recharge_id text,
  p_user_email text,
  p_cashtag text,
  p_ct_type text
)
returns json
language plpgsql
security definer
as $$
declare
  v_current_balance numeric;
  v_current_limit numeric;
  v_result json;
begin
  -- Get current balance and limit
  select balance, "limit"
  into v_current_balance, v_current_limit
  from company_tags
  where id = p_tag_id;

  -- Check if limit is sufficient
  if v_current_limit < p_amount then
    raise exception 'Insufficient limit. Available: $%, Required: $%', v_current_limit, p_amount;
  end if;

  -- Update company_tags
  update company_tags
  set 
    balance = balance + p_amount,
    "limit" = "limit" - p_amount,
    updated_at = now()
  where id = p_tag_id
  returning json_build_object(
    'id', id,
    'balance', balance,
    'limit', "limit",
    'updated_at', updated_at
  ) into v_result;

  -- Create assignment record
  insert into assignment_redeem (
    recharge_id,
    tag_id,
    amount,
    assigned_by_email,
    assigned_at,
    tag_type,
    cashtag,
    status
  ) values (
    p_recharge_id,
    p_tag_id,
    p_amount,
    p_user_email,
    now(),
    'CT',
    p_cashtag,
    'active'
  );

  return v_result;
end;
$$; 