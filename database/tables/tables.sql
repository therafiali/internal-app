-- Custom Types
CREATE TYPE ent_type AS ENUM ('orion_stars', 'fire_kirin', 'game_vault');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'disputed');
CREATE TYPE deposit_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'agent', 'viewer');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    department text,
    role user_role NOT NULL DEFAULT 'viewer',
    status user_status NOT NULL DEFAULT 'active',
    employee_code text UNIQUE,
    ent_access ent_type[] DEFAULT '{}',
    ent_section ent_type,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Players Table
CREATE TABLE IF NOT EXISTS players (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    vip_code text UNIQUE NOT NULL,
    messenger_id text UNIQUE NOT NULL,
    player_name text NOT NULL,
    team text,
    status text DEFAULT 'active',
    referred_by uuid REFERENCES players(id),
    referred_by_vip_code text,
    referral_count integer DEFAULT 0,
    referral_bonus_balance numeric(10,2) DEFAULT 0.0,
    profile jsonb DEFAULT '{}',
    game_usernames jsonb DEFAULT '{}',
    payment_methods jsonb[] DEFAULT '{}',
    game_limits jsonb DEFAULT '{}',
    daily_redeem_limit jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Company Tags Table
CREATE TABLE IF NOT EXISTS company_tags (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashtag text UNIQUE NOT NULL,
    platform text NOT NULL,
    balance numeric(10,2) DEFAULT 0.0,
    daily_limit numeric(10,2),
    monthly_limit numeric(10,2),
    status text DEFAULT 'active',
    last_active timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Recharge Requests Table
CREATE TABLE IF NOT EXISTS recharge_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id uuid REFERENCES players(id) NOT NULL,
    vip_code text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    deposit_status deposit_status DEFAULT 'pending',
    payment_method jsonb NOT NULL,
    company_tag_id uuid REFERENCES company_tags(id),
    notes text,
    processed_by uuid REFERENCES users(id),
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Redeem Requests Table
CREATE TABLE IF NOT EXISTS redeem_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id uuid REFERENCES players(id) NOT NULL,
    vip_code text NOT NULL,
    amount numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0.0,
    amount_hold numeric(10,2) DEFAULT 0.0,
    status payment_status NOT NULL DEFAULT 'pending',
    payment_methods jsonb[],
    company_tag_id uuid REFERENCES company_tags(id),
    notes text,
    action_status text DEFAULT 'idle',
    processed_by uuid REFERENCES users(id),
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id uuid REFERENCES players(id) NOT NULL,
    vip_code text NOT NULL,
    request_id uuid NOT NULL,
    request_type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text NOT NULL,
    deposit_status deposit_status,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS ct_activity_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_tag_id uuid REFERENCES company_tags(id) NOT NULL,
    cashtag text NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_vip_code ON players(vip_code);
CREATE INDEX IF NOT EXISTS idx_players_messenger_id ON players(messenger_id);
CREATE INDEX IF NOT EXISTS idx_company_tags_cashtag ON company_tags(cashtag);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_player_id ON recharge_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_vip_code ON recharge_requests(vip_code);
CREATE INDEX IF NOT EXISTS idx_redeem_requests_player_id ON redeem_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_redeem_requests_vip_code ON redeem_requests(vip_code);
CREATE INDEX IF NOT EXISTS idx_transactions_player_id ON transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_transactions_vip_code ON transactions(vip_code);
CREATE INDEX IF NOT EXISTS idx_transactions_request_id ON transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_ct_activity_logs_company_tag_id ON ct_activity_logs(company_tag_id);
CREATE INDEX IF NOT EXISTS idx_ct_activity_logs_cashtag ON ct_activity_logs(cashtag); 