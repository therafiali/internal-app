begin;

-- Drop existing function if it exists
drop function if exists transfer_balance(uuid, uuid, numeric);

-- Create the transfer balance function
create function transfer_balance(
    from_tag_id uuid,
    to_tag_id uuid,
    transfer_amount numeric
) returns jsonb
language plpgsql
security definer
as $$
declare
    from_tag record;
    to_tag record;
begin
    -- Get the source tag and lock it
    select * into from_tag
    from company_tags
    where id = from_tag_id
    for update;

    -- Get the target tag and lock it
    select * into to_tag
    from company_tags
    where id = to_tag_id
    for update;

    -- Check if both tags exist
    if from_tag is null then
        raise exception 'Source tag not found';
    end if;

    if to_tag is null then
        raise exception 'Target tag not found';
    end if;

    -- Check if source tag has sufficient balance
    if from_tag.balance < transfer_amount then
        raise exception 'Insufficient balance';
    end if;

    -- Check if both tags are active
    if from_tag.status != 'active' then
        raise exception 'Source tag is not active';
    end if;

    if to_tag.status != 'active' then
        raise exception 'Target tag is not active';
    end if;

    -- Perform the transfer
    update company_tags
    set 
        balance = balance - transfer_amount,
        total_withdrawn = total_withdrawn + transfer_amount,
        transaction_count = transaction_count + 1,
        last_active = now()
    where id = from_tag_id;

    update company_tags
    set 
        balance = balance + transfer_amount,
        total_received = total_received + transfer_amount,
        transaction_count = transaction_count + 1,
        last_active = now()
    where id = to_tag_id;

    -- Return success response
    return jsonb_build_object(
        'success', true,
        'message', 'Transfer completed successfully',
        'from_tag', from_tag.cashtag,
        'to_tag', to_tag.cashtag,
        'amount', transfer_amount,
        'timestamp', now()
    );
end;
$$;

commit;
