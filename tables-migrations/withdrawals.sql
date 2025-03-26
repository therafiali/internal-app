-- Withdrawals table
create table withdrawals (
    id uuid default uuid_generate_v4() primary key,
    cashtag_id text references company_tags(c_id),
    amount numeric not null,
    method text not null,
    remarks text,
    fees numeric not null,
    status text not null default 'pending',
    initiated_by text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    total_amount numeric not null
);

-- Add RLS policies as needed
alter table withdrawals enable row level security;