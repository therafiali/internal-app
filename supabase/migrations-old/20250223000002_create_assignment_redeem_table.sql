-- Create assignment_redeem table
create table if not exists assignment_redeem (
    id uuid primary key default uuid_generate_v4(),
    recharge_id text not null,
    tag_id uuid not null references company_tags(id),
    amount numeric not null,
    assigned_by_email text not null,
    assigned_at timestamp with time zone not null default now(),
    tag_type text not null,
    cashtag text not null,
    status text not null default 'active',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Add indexes for better query performance
create index if not exists idx_assignment_redeem_recharge_id on assignment_redeem(recharge_id);
create index if not exists idx_assignment_redeem_tag_id on assignment_redeem(tag_id);
create index if not exists idx_assignment_redeem_status on assignment_redeem(status);

-- Add comment to table
comment on table assignment_redeem is 'Table to store company tag assignment records for recharge requests'; 