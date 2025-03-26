-- Create custom types
CREATE TYPE aal_level AS ENUM ('aal1', 'aal2', 'aal3');
CREATE TYPE action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR');
CREATE TYPE action_status AS ENUM ('idle', 'in_progress');
CREATE TYPE cash_card_status AS ENUM ('pending', 'ordered', 'shipped', 'activated', 'deactivated', 'blocked');
CREATE TYPE company_tag_status AS ENUM ('active', 'paused', 'blocked', 'deleted', 'disabled');
CREATE TYPE company_tag_type AS ENUM ('cashapp', 'venmo', 'chime');
CREATE TYPE ct_type AS ENUM ('personal', 'business');
CREATE TYPE department_type AS ENUM ('Operations', 'Support', 'Verification', 'Finance', 'Admin', 'Audit');
CREATE TYPE deposit_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected', 'disputed', 'sc_processed', 'refunded', 'verified', 'paid');
CREATE TYPE ent_type AS ENUM ('ENT1', 'ENT2', 'ENT3', 'ENT4', 'ENT5', 'ENT6');
CREATE TYPE game_platform AS ENUM ('Orion Stars', 'Fire Kirin', 'Game Vault', 'VBlink', 'Vegas Sweeps', 'Ultra Panda', 'Yolo', 'Juwa', 'Moolah', 'Panda Master');
CREATE TYPE payment_method_type AS ENUM ('cashapp', 'venmo', 'chime', 'crypto');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'disputed');
CREATE TYPE processing_status AS ENUM ('idle', 'in_progress');
CREATE TYPE redeem_status AS ENUM ('pending', 'initiated', 'under_processing', 'processed', 'rejected', 'verification_failed', 'queued', 'paused', 'queued_partially_paid', 'paused_partially_paid', 'completed', 'unverified', 'verification_pending');
CREATE TYPE request_status AS ENUM ('pending', 'verification_pending', 'verification_failed', 'rejected', 'under_processing', 'completed', 'queued', 'queued_partially_paid', 'partially_paid', 'paused_partially_paid', 'paused', 'processed', 'initiated', 'verified', 'disputed', 'assigned', 'assigned_and_hold', 'sc_pending', 'sc_submitted', 'sc_processed', 'sc_rejected', 'sc_verified', 'sc_failed', 'unverified', 'cancel');
CREATE TYPE role_type AS ENUM ('Agent', 'Team Lead', 'Manager', 'Admin', 'Executive', 'Shift Incharge');
CREATE TYPE transfer_init_by AS ENUM ('agent', 'player');
CREATE TYPE transfer_status AS ENUM ('pending', 'completed', 'rejected');
CREATE TYPE user_status AS ENUM ('active', 'disabled');
CREATE TYPE verification_status AS ENUM ('verified', 'pending', 'failed');

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables
CREATE TABLE users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    department text NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'active'::text,
    employee_code text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    ent_access ent_type[] DEFAULT ARRAY['ENT1'::ent_type, 'ENT2'::ent_type, 'ENT3'::ent_type],
    ent_section text,
    user_activity boolean,
    user_profile_pic text DEFAULT 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png'::text,
    last_login timestamptz,
    login_attempts numeric
);

CREATE TABLE players (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    vip_code text NOT NULL,
    messenger_id text NOT NULL,
    player_name text NOT NULL,
    referred_by uuid REFERENCES players(id),
    referred_by_vip_code text,
    referral_count integer DEFAULT 0,
    referral_bonus_balance numeric DEFAULT 0,
    profile jsonb NOT NULL DEFAULT '{"email": null, "phone": null, "gender": null, "fullName": null, "language": null, "lastName": null, "timezone": null, "firstName": null, "profilePic": null}'::jsonb,
    game_usernames jsonb NOT NULL DEFAULT '{"fireKirin": null, "gameVault": null, "orionStars": null}'::jsonb,
    payment_methods jsonb[] DEFAULT ARRAY[]::jsonb[],
    game_limits jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    total_deposits numeric DEFAULT 0,
    total_redeemed numeric DEFAULT 0,
    holding_percentage numeric DEFAULT 0,
    last_seen timestamptz DEFAULT now(),
    team text,
    status text NOT NULL DEFAULT 'active'::text,
    last_reset_time timestamptz,
    daily_redeem_limit text
);

CREATE TABLE company_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    c_id text NOT NULL,
    name text NOT NULL,
    cashtag text NOT NULL,
    ct_type ct_type NOT NULL,
    full_name text NOT NULL,
    last4_ss text NOT NULL,
    address text NOT NULL,
    email text NOT NULL,
    pin text NOT NULL,
    verification_status verification_status DEFAULT 'pending'::verification_status,
    procured_by uuid NOT NULL,
    procurement_cost numeric NOT NULL,
    procured_at timestamptz DEFAULT now(),
    balance numeric DEFAULT 0,
    limit numeric NOT NULL,
    total_received numeric DEFAULT 0,
    total_withdrawn numeric DEFAULT 0,
    transaction_count integer DEFAULT 0,
    linked_card text,
    linked_bank text,
    cash_card cash_card_status DEFAULT 'pending'::cash_card_status,
    status company_tag_status DEFAULT 'paused'::company_tag_status,
    last_active timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    payment_method text
);

CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    messenger_id text NOT NULL,
    page_id text,
    previous_status transaction_status,
    current_status transaction_status NOT NULL,
    payment_status payment_status DEFAULT 'pending'::payment_status,
    amount numeric,
    bonus_amount numeric DEFAULT 0,
    credits_loaded numeric,
    game_platform game_platform,
    game_username text,
    team_code text,
    promotion text,
    screenshot_url text,
    payment_method jsonb,
    company_tag jsonb,
    redeem_request jsonb,
    assigned_redeem jsonb,
    action_by uuid,
    verified_by uuid,
    assigned_by uuid,
    processed_by uuid,
    completed_by uuid,
    cancelled_by uuid,
    verified_at timestamptz,
    assigned_at timestamptz,
    processed_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz,
    remarks text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status transaction_status,
    redeem_id text,
    recharge_id text,
    manychat_data jsonb,
    recharge_uuid uuid,
    redeem_uuid uuid,
    assigned_ct jsonb,
    init_by text,
    vip_code text,
    disputed_by jsonb,
    disputed_at timestamptz,
    deposit_status deposit_status NOT NULL DEFAULT 'pending'::deposit_status
);

CREATE TABLE activity_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id uuid NOT NULL,
    agent_name text NOT NULL,
    agent_department department_type NOT NULL,
    agent_role role_type NOT NULL,
    action_type text NOT NULL,
    action_description text NOT NULL,
    target_resource text NOT NULL,
    target_resource_id uuid,
    status text DEFAULT 'success'::text,
    ip_address text,
    browser text,
    operating_system text,
    additional_details jsonb DEFAULT '{}'::jsonb,
    error_details jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE promotions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    amount numeric,
    percentage numeric,
    max_discount numeric,
    min_recharge_amount numeric NOT NULL,
    max_recharge_amount numeric NOT NULL,
    current_usage integer DEFAULT 0,
    max_usage_per_user integer NOT NULL,
    total_usage_limit integer NOT NULL,
    is_referral_promo boolean DEFAULT false,
    referral_balance numeric DEFAULT 0,
    owner_vip_code text,
    applicable_games text[],
    applicable_teams text[],
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE recharge_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vip_code text NOT NULL,
    player_name text NOT NULL,
    messenger_id text,
    team_code text,
    game_platform text NOT NULL,
    game_username text NOT NULL,
    amount numeric NOT NULL,
    bonus_amount numeric DEFAULT 0,
    credits_loaded numeric DEFAULT 0,
    status text DEFAULT 'pending'::text,
    processing_state jsonb DEFAULT '{"status": "idle", "processed_by": null}'::jsonb,
    promo_code text,
    promo_type text,
    payment_method jsonb,
    screenshot_url text,
    notes text,
    manychat_data jsonb,
    agent_name text,
    agent_department text,
    processed_by uuid,
    processed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    assigned_redeem jsonb,
    assigned_ct jsonb,
    identifier text,
    recharge_id text,
    assigned_recharge jsonb,
    promo_amount numeric,
    disputed_by jsonb,
    init_by text,
    deposit_status text DEFAULT 'pending'::text,
    page_name text,
    init_id uuid,
    assigned_id uuid,
    verified_id uuid,
    sc_submit_id uuid
);

CREATE TABLE redeem_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vip_code text NOT NULL,
    player_name text NOT NULL,
    messenger_id text,
    team_code text NOT NULL,
    game_platform text NOT NULL,
    game_username text NOT NULL,
    total_amount numeric NOT NULL,
    amount_paid numeric DEFAULT 0,
    amount_hold numeric DEFAULT 0,
    amount_available numeric DEFAULT 0,
    action_status action_status DEFAULT 'idle'::action_status,
    status request_status DEFAULT 'pending'::request_status,
    payment_methods jsonb[] NOT NULL,
    notes text,
    manychat_data jsonb NOT NULL,
    agent_name text,
    agent_department text,
    processed_by uuid,
    processed_at timestamptz,
    verified_by uuid,
    verified_at timestamptz,
    verification_remarks text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    redeem_id text,
    assigned_redeem jsonb,
    assign_ct jsonb,
    player_data jsonb,
    init_by text,
    processing_state jsonb DEFAULT '{"status": "idle", "processed_by": null}'::jsonb,
    page_name text,
    verified_id uuid,
    init_id uuid,
    finance_id uuid,
    hold_details jsonb
);

CREATE TABLE transfer_requests (
    id text PRIMARY KEY DEFAULT get_unique_transfer_id(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    vip_code text NOT NULL,
    player_name text NOT NULL,
    player_image text,
    messenger_id text,
    team_code text,
    init_by transfer_init_by NOT NULL,
    from_platform text NOT NULL,
    from_username text NOT NULL,
    to_platform text NOT NULL,
    to_username text NOT NULL,
    amount numeric NOT NULL,
    status transfer_status NOT NULL DEFAULT 'pending'::transfer_status,
    processed_by text,
    processed_at timestamptz,
    agent_name text NOT NULL,
    agent_department text NOT NULL,
    notes text,
    manychat_data jsonb,
    processing_state jsonb NOT NULL DEFAULT (json_build_object('status', 'idle', 'processed_by', NULL::unknown, 'modal_type', 'none'))::jsonb
);

-- Add indexes
CREATE INDEX idx_players_vip_code ON players(vip_code);
CREATE INDEX idx_transactions_messenger_id ON transactions(messenger_id);
CREATE INDEX idx_company_tags_cashtag ON company_tags(cashtag);
CREATE INDEX idx_recharge_requests_vip_code ON recharge_requests(vip_code);
CREATE INDEX idx_redeem_requests_vip_code ON redeem_requests(vip_code);
CREATE INDEX idx_activity_logs_agent_id ON activity_logs(agent_id);
CREATE INDEX idx_promotions_code ON promotions(code);

-- Add foreign key constraints
ALTER TABLE players 
    ADD CONSTRAINT fk_referred_by 
    FOREIGN KEY (referred_by) 
    REFERENCES players(id);

ALTER TABLE activity_logs
    ADD CONSTRAINT fk_agent_id
    FOREIGN KEY (agent_id)
    REFERENCES users(id);

ALTER TABLE recharge_requests
    ADD CONSTRAINT fk_processed_by
    FOREIGN KEY (processed_by)
    REFERENCES users(id);

ALTER TABLE redeem_requests
    ADD CONSTRAINT fk_processed_by
    FOREIGN KEY (processed_by)
    REFERENCES users(id);

-- Create function for generating unique transfer IDs
CREATE OR REPLACE FUNCTION get_unique_transfer_id()
RETURNS text AS $$
DECLARE
    new_id text;
    done bool;
BEGIN
    done := false;
    WHILE NOT done LOOP
        new_id := 'TR' || to_char(NOW(), 'YYYYMMDD') || LPAD(FLOOR(random() * 10000)::text, 4, '0');
        done := NOT EXISTS (SELECT 1 FROM transfer_requests WHERE id = new_id);
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql; 