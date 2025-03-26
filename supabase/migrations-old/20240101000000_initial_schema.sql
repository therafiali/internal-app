-- Safe cleanup of existing objects
DO $$ 
BEGIN
    -- Drop triggers safely
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'sync_user_email'
    ) THEN
        DROP TRIGGER IF EXISTS sync_user_email ON users;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_employee_code'
    ) THEN
        DROP TRIGGER IF EXISTS set_employee_code ON users;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'handle_role_update_trigger'
    ) THEN
        DROP TRIGGER IF EXISTS handle_role_update_trigger ON users;
    END IF;

    -- Drop functions safely
    DROP FUNCTION IF EXISTS sync_user_email() CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    DROP FUNCTION IF EXISTS check_daily_redeem_limit(UUID, DECIMAL) CASCADE;
    DROP FUNCTION IF EXISTS generate_employee_code() CASCADE;
    DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
    DROP FUNCTION IF EXISTS handle_role_update() CASCADE;

    -- Drop sequences safely
    DROP SEQUENCE IF EXISTS employee_code_seq CASCADE;

    -- Drop tables safely (in reverse order of dependencies)
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS reset_password_requests CASCADE;
    DROP TABLE IF EXISTS referees CASCADE;
    DROP TABLE IF EXISTS referrals CASCADE;
    DROP TABLE IF EXISTS redeem_history CASCADE;
    DROP TABLE IF EXISTS redeem_subscribers CASCADE;
    DROP TABLE IF EXISTS redeem_assignments CASCADE;
    DROP TABLE IF EXISTS redeem_requests CASCADE;
    DROP TABLE IF EXISTS recharge_requests CASCADE;
    DROP TABLE IF EXISTS promotion_usage CASCADE;
    DROP TABLE IF EXISTS promotion_assignments CASCADE;
    DROP TABLE IF EXISTS promotions CASCADE;
    DROP TABLE IF EXISTS pending_players CASCADE;
    DROP TABLE IF EXISTS players CASCADE;
    DROP TABLE IF EXISTS feedback CASCADE;
    DROP TABLE IF EXISTS company_tags CASCADE;
    DROP TABLE IF EXISTS activity_logs CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    -- Drop types safely
    DROP TYPE IF EXISTS user_status CASCADE;
    DROP TYPE IF EXISTS payment_status CASCADE;
    DROP TYPE IF EXISTS transaction_status CASCADE;
    DROP TYPE IF EXISTS redeem_status CASCADE;
    DROP TYPE IF EXISTS cash_card_status CASCADE;
    DROP TYPE IF EXISTS company_tag_status CASCADE;
    DROP TYPE IF EXISTS company_tag_type CASCADE;
    DROP TYPE IF EXISTS tag_type CASCADE;
    DROP TYPE IF EXISTS role_type CASCADE;
    DROP TYPE IF EXISTS department_type CASCADE;
    DROP TYPE IF EXISTS payment_method_type CASCADE;
    DROP TYPE IF EXISTS game_platform CASCADE;
END $$;

-- Now create the schema
BEGIN;

-- Create ENUM types
CREATE TYPE game_platform AS ENUM (
    'Orion Stars', 'Fire Kirin', 'Game Vault', 'VBlink', 
    'Vegas Sweeps', 'Ultra Panda', 'Yolo', 'Juwa', 
    'Moolah', 'Panda Master'
);

CREATE TYPE payment_method_type AS ENUM ('cashapp', 'venmo', 'chime', 'crypto');
CREATE TYPE department_type AS ENUM ('Operations', 'Support', 'Verification', 'Finance', 'Admin');
CREATE TYPE role_type AS ENUM ('Agent', 'Team Lead', 'Manager', 'Admin', 'Executive');
CREATE TYPE tag_type AS ENUM ('PT', 'CT');
CREATE TYPE company_tag_type AS ENUM ('personal', 'business');
CREATE TYPE company_tag_status AS ENUM ('active', 'paused', 'disabled');
CREATE TYPE cash_card_status AS ENUM ('activated', 'deactivated', 'pending');
CREATE TYPE redeem_status AS ENUM (
    'pending', 'initiated', 'under_processing', 'processed',
    'rejected', 'verification_failed', 'queued', 'paused',
    'queued_partially_paid', 'paused_partially_paid',
    'completed', 'unverified'
);
CREATE TYPE transaction_status AS ENUM (
    'pending', 'under_processing', 'completed', 'rejected', 
    'cancelled', 'assigned', 'assigned_and_hold', 
    'screenshot_processed', 'promo_claimed', 'screenshot_rejected', 
    'queued_partially_paid', 'processed'
);
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'disputed');
CREATE TYPE user_status AS ENUM ('active', 'disabled');

-- Create base tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    employee_code TEXT UNIQUE,
    department department_type NOT NULL,
    role role_type NOT NULL,
    status user_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_role_department CHECK (
        CASE 
            WHEN department = 'Admin' THEN role IN ('Admin', 'Executive')
            WHEN department IN ('Operations', 'Support', 'Verification', 'Finance') THEN 
                role IN ('Agent', 'Team Lead', 'Manager')
            ELSE false
        END
    )
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES users(id) NOT NULL,
    agent_name TEXT NOT NULL,
    agent_department department_type NOT NULL,
    agent_role role_type NOT NULL,
    action_type TEXT NOT NULL,
    action_description TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    target_resource_id UUID,
    status TEXT DEFAULT 'success',
    ip_address TEXT NOT NULL,
    browser TEXT,
    operating_system TEXT,
    additional_details JSONB DEFAULT '{}',
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create company_tags table
CREATE TABLE IF NOT EXISTS company_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    c_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    cashtag TEXT UNIQUE NOT NULL,
    ct_type company_tag_type NOT NULL,
    full_name TEXT NOT NULL,
    last4_ss TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    pin TEXT NOT NULL,
    verification_status TEXT DEFAULT 'pending',
    procured_by UUID REFERENCES users(id) NOT NULL,
    procurement_cost DECIMAL(12,2) NOT NULL,
    procured_at TIMESTAMPTZ DEFAULT NOW(),
    balance DECIMAL(12,2) DEFAULT 0,
    "limit" DECIMAL(12,2) NOT NULL,
    total_received DECIMAL(12,2) DEFAULT 0,
    total_withdrawn DECIMAL(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    linked_card TEXT,
    linked_bank TEXT,
    cash_card cash_card_status DEFAULT 'pending',
    status company_tag_status DEFAULT 'paused',
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vip_code TEXT UNIQUE NOT NULL,
    messenger_id TEXT UNIQUE NOT NULL,
    player_name TEXT NOT NULL,
    referred_by UUID REFERENCES players(id),
    referred_by_vip_code TEXT,
    referral_count INTEGER DEFAULT 0,
    referral_bonus_balance DECIMAL(12,2) DEFAULT 0,
    profile JSONB NOT NULL DEFAULT '{
        "firstName": null,
        "lastName": null,
        "fullName": null,
        "email": null,
        "phone": null,
        "gender": null,
        "profilePic": null,
        "language": null,
        "timezone": null
    }',
    game_usernames JSONB NOT NULL DEFAULT '{
        "orionStars": null,
        "fireKirin": null,
        "gameVault": null
    }',
    payment_methods JSONB[] DEFAULT ARRAY[]::JSONB[],
    game_limits JSONB DEFAULT '{}',
    daily_redeem_limit JSONB NOT NULL DEFAULT '{
        "limit": 2000,
        "redeemed": 0,
        "remaining": 2000,
        "lastUpdated": null
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create redeem_requests table
CREATE TABLE IF NOT EXISTS redeem_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manychat_data JSONB NOT NULL,
    entry_code TEXT NOT NULL,
    init_by TEXT DEFAULT 'player' CHECK (init_by IN ('player', 'agent')),
    agent_name TEXT,
    agent_department TEXT,
    username TEXT NOT NULL,
    game_platform game_platform NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_hold DECIMAL(12,2) DEFAULT 0,
    amount_available DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - amount_paid - amount_hold) STORED,
    credits_redeem DECIMAL(12,2),
    payment_methods JSONB[],
    status redeem_status DEFAULT 'pending',
    otp JSONB,
    redeem_id TEXT UNIQUE NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT,
    verification_remarks TEXT,
    payment_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recharge_requests table
CREATE TABLE IF NOT EXISTS recharge_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recharge_id TEXT UNIQUE NOT NULL,
    messenger_id TEXT NOT NULL,
    page_id TEXT,
    player_name TEXT NOT NULL,
    game_platform game_platform NOT NULL,
    game_username TEXT NOT NULL,
    team_code TEXT DEFAULT 'Default',
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    bonus_amount DECIMAL(12,2) DEFAULT 0,
    credits_loaded DECIMAL(12,2) DEFAULT 0,
    promotion TEXT,
    status transaction_status DEFAULT 'pending',
    init_by TEXT DEFAULT 'player' CHECK (init_by IN ('player', 'agent')),
    agent_name TEXT,
    agent_department TEXT,
    notes TEXT,
    screenshot_url TEXT,
    manychat_data JSONB,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    remarks TEXT,
    payment_method JSONB,
    redeem_id TEXT,
    assigned_redeem JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recharge_id TEXT,
    redeem_id TEXT,
    messenger_id TEXT NOT NULL,
    page_id TEXT,
    previous_status transaction_status,
    current_status transaction_status NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    amount DECIMAL(12,2),
    bonus_amount DECIMAL(12,2) DEFAULT 0,
    credits_loaded DECIMAL(12,2),
    game_platform game_platform,
    game_username TEXT,
    team_code TEXT,
    promotion TEXT,
    screenshot_url TEXT,
    payment_method JSONB,
    company_tag JSONB,
    redeem_request JSONB,
    assigned_redeem JSONB,
    action_by UUID REFERENCES users(id) NOT NULL,
    verified_by UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    cancelled_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create necessary sequences
CREATE SEQUENCE IF NOT EXISTS employee_code_seq START WITH 700001;

-- Create necessary functions
CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_code IS NULL THEN
        NEW.employee_code := LPAD(nextval('employee_code_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create necessary triggers
CREATE TRIGGER set_employee_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_employee_code();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own record"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own basic info"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        COALESCE(CURRENT_SETTING('app.current_user_role', TRUE), '') NOT IN ('Admin', 'Executive')
    );

CREATE POLICY "Admin can do all operations"
    ON users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND department = 'Admin'
            AND role IN ('Admin', 'Executive')
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

COMMIT;
