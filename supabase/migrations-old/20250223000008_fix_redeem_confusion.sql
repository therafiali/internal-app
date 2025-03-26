-- Drop the old function
drop function if exists assign_company_tag(uuid, numeric, uuid, text, text, text);

-- Create updated function with clear distinction between company tags and redeem requests
create or replace function assign_company_tag(
  p_tag_id uuid,
  p_amount numeric,
  p_recharge_id uuid,
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
  v_recharge_status text;
  v_tag_exists boolean;
begin
  -- Start a transaction block
  begin
    -- First, verify the company tag exists and is active
    select exists(
      select 1 from company_tags 
      where id = p_tag_id 
      and status = 'active'
    ) into v_tag_exists;

    if not v_tag_exists then
      raise exception 'Company tag % not found or is not active', p_tag_id;
    end if;

    -- Check if recharge request exists and get its status
    select status into v_recharge_status
    from recharge_requests
    where id = p_recharge_id;

    -- Validate recharge request
    if v_recharge_status is null then
      raise exception 'Recharge request % not found', p_recharge_id;
    end if;

    -- Check if recharge request is in a valid state
    if v_recharge_status not in ('pending', 'assigned') then
      raise exception 'Recharge request % is not in a valid state. Current status: %', p_recharge_id, v_recharge_status;
    end if;

    -- Get current balance and limit
    select balance, "limit"
    into v_current_balance, v_current_limit
    from company_tags
    where id = p_tag_id;

    -- Check if limit is sufficient
    if v_current_limit < p_amount then
      raise exception 'Insufficient limit. Available: $%, Required: $%', v_current_limit, p_amount;
    end if;

    -- If there's an existing assignment, deactivate it
    update assignment_redeem
    set status = 'inactive',
        updated_at = now()
    where recharge_id = p_recharge_id::text
    and status = 'active';

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

    -- Create new assignment record with tag_type
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
      p_recharge_id::text,
      p_tag_id,
      p_amount,
      p_user_email,
      now(),
      p_ct_type,  -- Use the provided tag type
      p_cashtag,
      'active'
    );

    -- Update recharge request status with clear company tag assignment
    update recharge_requests
    set 
      status = 'assigned',
      assigned_redeem = jsonb_build_object(
        'tag_id', p_tag_id,  -- Changed from redeem_id to tag_id
        'amount', p_amount,
        'type', p_ct_type,   -- Use the provided tag type
        'assigned_at', now(),
        'assigned_by', p_user_email,
        'cashtag', p_cashtag,
        'assignment_type', 'company_tag'  -- Explicitly mark as company tag assignment
      ),
      updated_at = now()
    where id = p_recharge_id;

    return v_result;
  exception
    when others then
      -- Rollback any changes if an error occurs
      raise;
  end;
end;
$$; 