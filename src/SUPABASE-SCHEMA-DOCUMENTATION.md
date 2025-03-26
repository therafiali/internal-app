# Supabase Schema Documentation

This document provides the complete SQL commands to create all tables and relationships in the Supabase database, converted from the original MongoDB schema.

## Table of Contents
1. [Enums and Types](#enums-and-types)
2. [Activity Log Table](#activity-log-table)
3. [Company Tag Table](#company-tag-table)
4. [Feedback Table](#feedback-table)
5. [Pending Player Table](#pending-player-table)
6. [Player Table](#player-table)
7. [Promotion Table](#promotion-table)
8. [Promotion Usage Table](#promotion-usage-table)
9. [Recharge Request Table](#recharge-request-table)
10. [Redeem Request Table](#redeem-request-table)
11. [Redeem Subscriber Table](#redeem-subscriber-table)
12. [Referral Table](#referral-table)
13. [Reset Password Request Table](#reset-password-request)
14. [Transaction Table](#transaction-table)
15. [User Table](#user-table)

## Enums and Types

First, let's create all the necessary ENUM types that will be used across tables:

```sql
-- Game Platforms
CREATE TYPE game_platform AS ENUM (
    'Orion Stars', 'Fire Kirin', 'Game Vault', 'VBlink', 
    'Vegas Sweeps', 'Ultra Panda', 'Yolo', 'Juwa', 
    'Moolah', 'Panda Master'
);

-- Payment Methods
CREATE TYPE payment_method_type AS ENUM ('cashapp', 'venmo', 'chime', 'crypto');

-- User Departments
CREATE TYPE department_type AS ENUM (
    'Operations', 'Support', 'Verification', 'Finance', 'Admin'
);

-- User Roles
CREATE TYPE role_type AS ENUM (
    'Agent', 'Team Lead', 'Manager', 'Admin', 'Executive'
);

-- Tag Types
CREATE TYPE tag_type AS ENUM ('PT', 'CT');

-- Company Tag Types
CREATE TYPE company_tag_type AS ENUM ('personal', 'business');

-- Company Tag Status
CREATE TYPE company_tag_status AS ENUM ('active', 'paused', 'disabled');

-- Cash Card Status
CREATE TYPE cash_card_status AS ENUM ('activated', 'deactivated', 'pending');

-- Redeem Request Status
CREATE TYPE redeem_status AS ENUM (
    'pending', 'initiated', 'under_processing', 'processed',
    'rejected', 'verification_failed', 'queued', 'paused',
    'queued_partially_paid', 'paused_partially_paid',
    'completed', 'unverified'
);

-- Transaction Status
CREATE TYPE transaction_status AS ENUM (
    'pending', 'under_processing', 'completed', 'rejected', 
    'cancelled', 'assigned', 'assigned_and_hold', 
    'screenshot_processed', 'promo_claimed', 'screenshot_rejected', 
    'queued_partially_paid', 'processed'
);

-- Payment Status
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'disputed');

-- User Status
CREATE TYPE user_status AS ENUM ('active', 'disabled');
```

## Activity Log Table

```sql
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

-- Indexes
CREATE INDEX idx_activity_logs_agent_id_created ON activity_logs(agent_id, created_at DESC);
CREATE INDEX idx_activity_logs_action_type_created ON activity_logs(action_type, created_at DESC);
CREATE INDEX idx_activity_logs_target ON activity_logs(target_resource, target_resource_id);
CREATE INDEX idx_activity_logs_status ON activity_logs(status);
```

## Company Tag Table

```sql
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

-- Indexes
CREATE INDEX idx_company_tags_c_id ON company_tags(c_id);
CREATE INDEX idx_company_tags_cashtag ON company_tags(cashtag);
CREATE INDEX idx_company_tags_status ON company_tags(status);
```

## Feedback Table

```sql
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

-- Indexes
CREATE INDEX idx_feedback_messenger_id ON feedback(messenger_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);
```

## Pending Player Table

```sql
CREATE TABLE pending_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manychat_data JSONB NOT NULL,
    referrer_code TEXT,
    registration_status TEXT DEFAULT 'pending',
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Custom fields from manychat_data
    entry_code TEXT,
    entry_valid BOOLEAN,
    firekirin_username TEXT,
    gamevault_username TEXT,
    juwa_username TEXT,
    load_amount DECIMAL(12,2),
    load_game_platform game_platform,
    orionstars_username TEXT,
    team_code TEXT
);

-- Indexes
CREATE INDEX idx_pending_players_registration ON pending_players(registration_status);
CREATE INDEX idx_pending_players_referrer ON pending_players(referrer_code);
```

## Player Table

```sql
CREATE TABLE players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vip_code TEXT UNIQUE NOT NULL,
    messenger_id TEXT UNIQUE NOT NULL,
    player_name TEXT NOT NULL,
    referred_by UUID REFERENCES players(id),
    referred_by_vip_code TEXT,
    referral_count INTEGER DEFAULT 0,
    referral_bonus_balance DECIMAL(12,2) DEFAULT 0,
    
    -- Profile Information
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
    
    -- Game Usernames
    game_usernames JSONB NOT NULL DEFAULT '{
        "orionStars": null,
        "fireKirin": null,
        "gameVault": null
    }',
    
    -- Payment Methods
    payment_methods JSONB[] DEFAULT ARRAY[]::JSONB[],
    
    -- Game Limits
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

-- Indexes
CREATE INDEX idx_players_vip_code ON players(vip_code);
CREATE INDEX idx_players_messenger_id ON players(messenger_id);
CREATE INDEX idx_players_referred_by ON players(referred_by);
```

## Promotion Table

```sql
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

-- Promotion Assignments Table (Many-to-Many relationship)
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

-- Indexes
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotion_assignments_promotion ON promotion_assignments(promotion_id);
CREATE INDEX idx_promotion_assignments_vip ON promotion_assignments(vip_code);
```

## Promotion Usage Table

```sql
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

-- Indexes
CREATE INDEX idx_promotion_usage_promotion ON promotion_usage(promotion_id, user_id);
CREATE INDEX idx_promotion_usage_team ON promotion_usage(team_id);
```

## Recharge Request Table

```sql
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
    
    -- Payment Information
    payment_method JSONB,
    
    -- Redeem Association
    redeem_id TEXT,
    assigned_redeem JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recharge_requests_recharge_id ON recharge_requests(recharge_id);
CREATE INDEX idx_recharge_requests_messenger ON recharge_requests(messenger_id);
CREATE INDEX idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX idx_recharge_requests_created ON recharge_requests(created_at DESC);
```

## Redeem Request Table

```sql
CREATE TABLE redeem_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manychat_data JSONB NOT NULL,
    entry_code TEXT NOT NULL,
    init_by TEXT DEFAULT 'player' CHECK (init_by IN ('player', 'agent')),
    agent_name TEXT,
    agent_department TEXT,
    username TEXT NOT NULL,
    game_platform game_platform NOT NULL,
    
    -- Financial Details
    total_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_hold DECIMAL(12,2) DEFAULT 0,
    amount_available DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - amount_paid - amount_hold) STORED,
    credits_redeem DECIMAL(12,2),
    
    -- Payment Methods
    payment_methods JSONB[],
    
    -- Status
    status redeem_status DEFAULT 'pending',
    
    -- OTP
    otp JSONB,
    
    -- Request Details
    redeem_id TEXT UNIQUE NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT,
    verification_remarks TEXT,
    payment_remarks TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redeem Assignments Table
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

-- Indexes
CREATE INDEX idx_redeem_requests_redeem_id ON redeem_requests(redeem_id);
CREATE INDEX idx_redeem_requests_status ON redeem_requests(status);
CREATE INDEX idx_redeem_requests_entry ON redeem_requests(entry_code);
CREATE INDEX idx_redeem_assignments_request ON redeem_assignments(redeem_request_id);
CREATE INDEX idx_redeem_assignments_recharge ON redeem_assignments(recharge_id);
```

## Redeem Subscriber Table

```sql
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

-- Redeem History Table
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

-- Indexes
CREATE INDEX idx_redeem_subscribers_messenger ON redeem_subscribers(messenger_id);
CREATE INDEX idx_redeem_subscribers_entry ON redeem_subscribers(entry_code);
CREATE INDEX idx_redeem_history_subscriber ON redeem_history(subscriber_id);
CREATE INDEX idx_redeem_history_redeem ON redeem_history(redeem_id);
```

## Referral Table

```sql
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

-- Referees Table
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

-- Indexes
CREATE INDEX idx_referrals_referrer ON referrals(referrer_vip_code);
CREATE INDEX idx_referees_referee ON referees(referee_vip_code);
CREATE INDEX idx_referees_referral ON referees(referral_id);
```

## Reset Password Request Table

```sql
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

-- Indexes
CREATE INDEX idx_reset_password_request_id ON reset_password_requests(request_id);
CREATE INDEX idx_reset_password_messenger ON reset_password_requests(messenger_id);
CREATE INDEX idx_reset_password_status ON reset_password_requests(status);
```

## Transaction Table

```sql
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
    
    -- Company Tag Details
    company_tag JSONB,
    
    -- Redeem Request Details
    redeem_request JSONB,
    
    -- Assignment Details
    assigned_redeem JSONB,
    
    -- Action Tracking
    action_by UUID REFERENCES users(id) NOT NULL,
    verified_by UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    cancelled_by UUID REFERENCES users(id),
    
    -- Timestamps
    verified_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_ids ON transactions(recharge_id, redeem_id);
CREATE INDEX idx_transactions_messenger ON transactions(messenger_id);
CREATE INDEX idx_transactions_status ON transactions(current_status, payment_status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
```

## User Table

```sql
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    department department_type NOT NULL,
    role role_type NOT NULL,
    status user_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Add constraint to validate role-department combination
    CONSTRAINT valid_role_department CHECK (
        (department = 'Admin' AND role IN ('Admin', 'Executive')) OR
        (department != 'Admin' AND role IN ('Agent', 'Team Lead', 'Manager'))
    )
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department_role ON users(department, role);
CREATE INDEX idx_users_status ON users(status);
```

## Triggers and Functions

Let's add some common triggers and functions that will be useful across tables:

```sql
-- Updated At Trigger Function
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

-- Function to check daily redeem limits
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
```

## Row Level Security (RLS) Policies

Here are some example RLS policies to secure the tables:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Example policies for users table
CREATE POLICY "Users can view their own record"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (auth.jwt() ->> 'role' = 'Admin');

CREATE POLICY "Admins can insert users"
    ON users FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'Admin');

-- Add similar policies for other tables based on your requirements
```

## Notes on Schema Changes

1. **UUID vs ObjectId**: We've replaced MongoDB's ObjectId with UUID as the primary key type.

2. **JSONB for Complex Objects**: We're using JSONB type for complex nested objects that don't need to be queried directly.

3. **Relationships**: We've implemented proper foreign key relationships where MongoDB had references.

4. **Enums**: Created custom ENUM types for better data integrity.

5. **Timestamps**: Using PostgreSQL's TIMESTAMPTZ for all datetime fields.

6. **Computed Columns**: Using GENERATED ALWAYS AS for computed fields.

7. **Indexing**: Implemented appropriate indexes for common query patterns.

8. **Constraints**: Added CHECK constraints and foreign key constraints for data integrity.

To implement this schema:

1. Execute the commands in order (ENUMs first, then tables, then triggers/functions)
2. Verify each creation step
3. Test constraints and relationships
4. Implement RLS policies based on your security requirements
5. Add any additional indexes based on your query patterns

Remember to backup your data before making any schema changes in production. 