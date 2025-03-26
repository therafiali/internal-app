-- Drop existing triggers first
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at ON %I CASCADE;', t);
    END LOOP;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS sync_user_email ON users;
DROP TRIGGER IF EXISTS set_employee_code ON users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_role_update_trigger ON users;

-- Drop existing functions
DROP FUNCTION IF EXISTS sync_user_email();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS check_daily_redeem_limit(UUID, DECIMAL);
DROP FUNCTION IF EXISTS generate_employee_code();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_role_update();

-- Drop sequences
DROP SEQUENCE IF EXISTS employee_code_seq;

-- Drop existing tables (in reverse order of dependencies)
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

-- Drop existing types
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

-- Supabase Schema Creation Script
-- This script creates all tables and relationships for the application
-- Execute this in the Supabase SQL editor

-- First, create all ENUM types
CREATE TYPE game_platform AS ENUM (
    'Orion Stars', 'Fire Kirin', 'Game Vault', 'VBlink', 
    'Vegas Sweeps', 'Ultra Panda', 'Yolo', 'Juwa', 
    'Moolah', 'Panda Master'
);

CREATE TYPE payment_method_type AS ENUM ('cashapp', 'venmo', 'chime', 'crypto');

CREATE TYPE department_type AS ENUM (
    'Operations', 'Support', 'Verification', 'Finance', 'Admin'
);

CREATE TYPE role_type AS ENUM (
    'Agent', 'Team Lead', 'Manager', 'Admin', 'Executive'
);

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

-- Create the users table with RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    employee_code TEXT UNIQUE,
    department department_type NOT NULL,
    role role_type NOT NULL,
    status user_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Department-Role validation constraint
    CONSTRAINT valid_role_department CHECK (
        CASE 
            WHEN department = 'Admin' THEN 
                role IN ('Admin', 'Executive')
            WHEN department IN ('Operations', 'Support', 'Verification', 'Finance') THEN 
                role IN ('Agent', 'Team Lead', 'Manager')
            ELSE false
        END
    )
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_code ON users(employee_code);
CREATE INDEX idx_users_department_role ON users(department, role);
CREATE INDEX idx_users_status ON users(status);

-- Create a sequence for employee codes
CREATE SEQUENCE IF NOT EXISTS employee_code_seq START WITH 700001;

-- Create function to generate employee code
CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_code IS NULL THEN
        NEW.employee_code := LPAD(nextval('employee_code_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-generate employee code
CREATE TRIGGER set_employee_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_employee_code();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log the incoming data for debugging
    RAISE NOTICE 'New auth user data: id=%, email=%, metadata=%', NEW.id, NEW.email, NEW.raw_user_meta_data;
    
    INSERT INTO public.users (
        id,
        email,
        name,
        department,
        role,
        status,
        employee_code
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
        (NEW.raw_user_meta_data->>'department')::department_type,
        (NEW.raw_user_meta_data->>'role')::role_type,
        COALESCE((NEW.raw_user_meta_data->>'status')::user_status, 'active'),
        NEW.raw_user_meta_data->>'employee_code'
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error details
        RAISE NOTICE 'Error creating user record: % %', SQLERRM, SQLSTATE;
        RAISE EXCEPTION 'Failed to create user record: %', SQLERRM;
        RETURN NULL; -- This will rollback the auth.users insert as well
END;
$$;

-- Create the trigger in auth schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions for the trigger to work
GRANT ALL ON public.users TO service_role;
GRANT ALL ON SEQUENCE employee_code_seq TO service_role;

-- Create RLS policies for the trigger to work
CREATE POLICY "service_role can create users"
    ON users FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Create activity_logs table
CREATE TABLE activity_logs (
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

CREATE INDEX idx_activity_logs_agent_id_created ON activity_logs(agent_id, created_at DESC);
CREATE INDEX idx_activity_logs_action_type_created ON activity_logs(action_type, created_at DESC);
CREATE INDEX idx_activity_logs_target ON activity_logs(target_resource, target_resource_id);
CREATE INDEX idx_activity_logs_status ON activity_logs(status);

-- Create company_tags table
CREATE TABLE company_tags (
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

CREATE INDEX idx_company_tags_c_id ON company_tags(c_id);
CREATE INDEX idx_company_tags_cashtag ON company_tags(cashtag);
CREATE INDEX idx_company_tags_status ON company_tags(status);

-- Create feedback table
CREATE TABLE feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    messenger_id TEXT NOT NULL,
    page_id TEXT,
    player_name TEXT,
    category TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    manychat_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_messenger_id ON feedback(messenger_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- Create players table first
CREATE TABLE players (
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

CREATE INDEX idx_players_vip_code ON players(vip_code);
CREATE INDEX idx_players_messenger_id ON players(messenger_id);
CREATE INDEX idx_players_referred_by ON players(referred_by);

-- Then create pending_players table with explicit foreign key
CREATE TABLE pending_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manychat_data JSONB NOT NULL,
    referrer_code TEXT,
    registration_status TEXT DEFAULT 'pending',
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    remarks TEXT,
    entry_code TEXT,
    entry_valid BOOLEAN,
    firekirin_username TEXT,
    gamevault_username TEXT,
    juwa_username TEXT,
    load_amount DECIMAL(12,2),
    load_game_platform game_platform,
    orionstars_username TEXT,
    team_code TEXT,
    referred_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_pending_players_referred_by 
        FOREIGN KEY (referred_by) 
        REFERENCES players(id)
);

CREATE INDEX idx_pending_players_registration ON pending_players(registration_status);
CREATE INDEX idx_pending_players_referrer ON pending_players(referrer_code);
CREATE INDEX idx_pending_players_referred_by ON pending_players(referred_by);

-- Create promotions table
CREATE TABLE promotions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('FIXED', 'PERCENTAGE')),
    amount DECIMAL(12,2),
    percentage DECIMAL(5,2) CHECK (percentage BETWEEN 0 AND 100),
    max_discount DECIMAL(12,2),
    min_recharge_amount DECIMAL(12,2) NOT NULL,
    max_recharge_amount DECIMAL(12,2) NOT NULL,
    current_usage INTEGER DEFAULT 0,
    max_usage_per_user INTEGER NOT NULL,
    total_usage_limit INTEGER NOT NULL,
    is_referral_promo BOOLEAN DEFAULT FALSE,
    referral_balance DECIMAL(12,2) DEFAULT 0,
    owner_vip_code TEXT,
    applicable_games TEXT[],
    applicable_teams TEXT[],
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE promotion_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    promotion_id UUID REFERENCES promotions(id),
    vip_code TEXT NOT NULL,
    player_name TEXT NOT NULL,
    team TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) NOT NULL,
    unassigned_at TIMESTAMPTZ,
    unassigned_by UUID REFERENCES users(id),
    status TEXT DEFAULT 'assigned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotion_assignments_promotion ON promotion_assignments(promotion_id);
CREATE INDEX idx_promotion_assignments_vip ON promotion_assignments(vip_code);

-- Create promotion_usage table
CREATE TABLE promotion_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    promotion_id UUID REFERENCES promotions(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    team_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL,
    final_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotion_usage_promotion ON promotion_usage(promotion_id, user_id);
CREATE INDEX idx_promotion_usage_team ON promotion_usage(team_id);

-- Create recharge_requests table
CREATE TABLE recharge_requests (
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

CREATE INDEX idx_recharge_requests_recharge_id ON recharge_requests(recharge_id);
CREATE INDEX idx_recharge_requests_messenger ON recharge_requests(messenger_id);
CREATE INDEX idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX idx_recharge_requests_created ON recharge_requests(created_at DESC);

-- Create redeem_requests table
CREATE TABLE redeem_requests (
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

CREATE TABLE redeem_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    redeem_request_id UUID REFERENCES redeem_requests(id) NOT NULL,
    recharge_id TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) NOT NULL,
    screenshot_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    payment_methods JSONB[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redeem_requests_redeem_id ON redeem_requests(redeem_id);
CREATE INDEX idx_redeem_requests_status ON redeem_requests(status);
CREATE INDEX idx_redeem_requests_entry ON redeem_requests(entry_code);
CREATE INDEX idx_redeem_assignments_request ON redeem_assignments(redeem_request_id);
CREATE INDEX idx_redeem_assignments_recharge ON redeem_assignments(recharge_id);

-- Create redeem_subscribers table
CREATE TABLE redeem_subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manychat_data JSONB NOT NULL,
    messenger_id TEXT UNIQUE NOT NULL,
    entry_code TEXT,
    team_code TEXT DEFAULT 'Default',
    last_active TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE redeem_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subscriber_id UUID REFERENCES redeem_subscribers(id) NOT NULL,
    redeem_id TEXT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_hold DECIMAL(12,2) DEFAULT 0,
    amount_available DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - amount_paid - amount_hold) STORED,
    credits_redeem DECIMAL(12,2),
    game_platform game_platform NOT NULL,
    status redeem_status DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redeem_subscribers_messenger ON redeem_subscribers(messenger_id);
CREATE INDEX idx_redeem_subscribers_entry ON redeem_subscribers(entry_code);
CREATE INDEX idx_redeem_history_subscriber ON redeem_history(subscriber_id);
CREATE INDEX idx_redeem_history_redeem ON redeem_history(redeem_id);

-- Create referrals table
CREATE TABLE referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_id UUID REFERENCES players(id) NOT NULL,
    referrer_vip_code TEXT NOT NULL,
    referrer_details JSONB NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    completed_referrals INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referral_id UUID REFERENCES referrals(id) NOT NULL,
    referee_id UUID REFERENCES players(id) NOT NULL,
    referee_vip_code TEXT NOT NULL,
    name TEXT,
    profile_pic TEXT,
    team TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    total_deposits DECIMAL(12,2) DEFAULT 0,
    bonus_awarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_vip_code);
CREATE INDEX idx_referees_referee ON referees(referee_vip_code);
CREATE INDEX idx_referees_referral ON referees(referral_id);

-- Create reset_password_requests table
CREATE TABLE reset_password_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id TEXT UNIQUE NOT NULL,
    messenger_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    game_platform game_platform NOT NULL,
    game_username TEXT NOT NULL,
    team_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
    manychat_data JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reset_password_request_id ON reset_password_requests(request_id);
CREATE INDEX idx_reset_password_messenger ON reset_password_requests(messenger_id);
CREATE INDEX idx_reset_password_status ON reset_password_requests(status);

-- Create transactions table
CREATE TABLE transactions (
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

CREATE INDEX idx_transactions_ids ON transactions(recharge_id, redeem_id);
CREATE INDEX idx_transactions_messenger ON transactions(messenger_id);
CREATE INDEX idx_transactions_status ON transactions(current_status, payment_status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t);
    END LOOP;
END;
$$ language 'plpgsql';

-- Create daily redeem limit check function
CREATE OR REPLACE FUNCTION check_daily_redeem_limit(
    p_player_id UUID,
    p_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
    v_daily_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_daily_total
    FROM redeem_requests
    WHERE player_id = p_player_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
    
    RETURN (v_daily_total + p_amount) <= 2000;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE reset_password_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pending_players table
CREATE POLICY "Allow edge functions to insert pending players"
    ON pending_players FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow edge functions to read pending players"
    ON pending_players FOR SELECT
    USING (true);

-- Create RLS policies for users table
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

CREATE POLICY "Managers can view their department"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'Manager'
            AND department = users.department
        )
    );

CREATE POLICY "Team Leads can view their department"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'Team Lead'
            AND department = users.department
        )
    );

CREATE POLICY "Allow initial user creation"
    ON users FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR
        (
            auth.role() = 'authenticated' AND
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND department = 'Admin'
                AND role IN ('Admin', 'Executive')
            )
        )
        OR
        (
            auth.role() = 'anon' AND
            id = auth.uid()
        )
    );

-- Grant necessary permissions (only once)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role; 