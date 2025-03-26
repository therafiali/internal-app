-- Add assigned_ct column to recharge_requests
alter table recharge_requests
add column if not exists assigned_ct jsonb;

-- Create function for the trigger
create or replace function handle_company_tag_assignment()
returns trigger
language plpgsql
security definer
as $$
declare
  v_old_ct jsonb;
  v_new_ct jsonb;
begin
  -- Get the old and new assigned_ct values
  v_old_ct := OLD.assigned_ct;
  v_new_ct := NEW.assigned_ct;

  -- If we're assigning a new company tag
  if v_old_ct is null and v_new_ct is not null then
    -- Update the company tag balance and limit
    update company_tags
    set 
      balance = balance + (v_new_ct->>'amount')::numeric,
      "limit" = "limit" - (v_new_ct->>'amount')::numeric,
      updated_at = now()
    where id = (v_new_ct->>'c_id')::uuid;

    -- Set the status to assigned
    NEW.status := 'assigned';
  end if;

  return NEW;
end;
$$;

-- Create the trigger
drop trigger if exists company_tag_assignment_trigger on recharge_requests;
create trigger company_tag_assignment_trigger
  before update
  on recharge_requests
  for each row
  when (OLD.assigned_ct is distinct from NEW.assigned_ct)
  execute function handle_company_tag_assignment();

-- Update the assign_company_tag function to use the new column
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

    -- Update recharge request with company tag assignment
    update recharge_requests
    set 
      assigned_ct = jsonb_build_object(
        'type', p_ct_type,
        'amount', p_amount,
        'c_id', p_tag_id,
        'assigned_at', now(),
        'assigned_by', p_user_email,
        'cashtag', p_cashtag
      )
    where id = p_recharge_id
    returning jsonb_build_object(
      'id', id,
      'status', status,
      'assigned_ct', assigned_ct
    ) into v_result;

    return v_result;
  exception
    when others then
      -- Rollback any changes if an error occurs
      raise;
  end;
end;
$$; 