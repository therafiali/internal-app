-- Drop the old function
drop function if exists assign_company_tag(uuid, numeric, uuid, text, text, text);

-- Create updated function with improved assignment logic
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
begin
  -- Start a transaction block
  begin
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

    -- Check if tag exists
    if v_current_balance is null then
      raise exception 'Company tag % not found', p_tag_id;
    end if;

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

    -- Create new assignment record
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
      'CT',
      p_cashtag,
      'active'
    );

    -- Update recharge request status
    update recharge_requests
    set 
      status = 'assigned',
      assigned_redeem = jsonb_build_object(
        'redeem_id', p_tag_id,
        'amount', p_amount,
        'type', 'CT',
        'assigned_at', now(),
        'assigned_by', p_user_email,
        'cashtag', p_cashtag
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