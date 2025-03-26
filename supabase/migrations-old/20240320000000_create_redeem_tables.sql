-- Drop existing types if they exist
DO $$ BEGIN
    DROP TYPE IF EXISTS request_status CASCADE;
    DROP TYPE IF EXISTS modal_type CASCADE;
    DROP TYPE IF EXISTS payment_method CASCADE;
    DROP TYPE IF EXISTS manychat_profile CASCADE;
    DROP TYPE IF EXISTS manychat_platforms CASCADE;
    DROP TYPE IF EXISTS manychat_data CASCADE;
    DROP TYPE IF EXISTS processing_state CASCADE;
    DROP TYPE IF EXISTS action_status CASCADE;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Create enum types for status and departments
CREATE TYPE request_status AS ENUM (
  'pending',
  'verification_pending',
  'verification_failed', 
  'rejected',
  'under_processing',
  'completed',
  'queued',
  'queued_partially_paid',
  'partially_paid',
  'paused_partially_paid',
  'paused'
);

-- Create action_status type
CREATE TYPE action_status AS ENUM (
  'idle',
  'in_progress'
);

CREATE TYPE modal_type AS ENUM (
  'process_modal',
  'reject_modal',
  'approve_modal',
  'verify_modal',
  'payment_modal',
  'none'
);

-- Create extended payment_method type
CREATE TYPE payment_method AS (
  type TEXT,
  username TEXT,
  amount DECIMAL(10,2),
  cashtag TEXT,
  reference TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ,
  identifier TEXT
);

-- Create manychat_profile type
CREATE TYPE manychat_profile AS (
  gender TEXT,
  full_name TEXT,
  language TEXT,
  last_name TEXT,
  timezone TEXT,
  first_name TEXT,
  profile_pic TEXT
);

-- Create manychat_platforms type
CREATE TYPE manychat_platforms AS (
  firekirin_username TEXT,
  orionstars_username TEXT
);

-- Create manychat_data type
CREATE TYPE manychat_data AS (
  _id TEXT,
  team TEXT,
  status TEXT,
  profile manychat_profile,
  vip_code TEXT,
  platforms manychat_platforms,
  player_name TEXT,
  messenger_id TEXT
);

-- Create processing_state type
CREATE TYPE processing_state AS (
  status TEXT,
  processed_by TEXT,
  modal_type modal_type
);

-- Drop existing table and functions if they exist
DROP TABLE IF EXISTS redeem_requests CASCADE;
DROP TABLE IF EXISTS company_tags CASCADE;
DROP FUNCTION IF EXISTS acquire_request_processing CASCADE;
DROP FUNCTION IF EXISTS release_request_processing CASCADE;
DROP FUNCTION IF EXISTS process_redeem_request CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Create redeem_requests table
CREATE TABLE redeem_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_code TEXT NOT NULL,
  player_name TEXT NOT NULL,
  messenger_id TEXT,
  team_code TEXT NOT NULL,
  game_platform TEXT NOT NULL,
  game_username TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_hold DECIMAL(10,2) DEFAULT 0,
  amount_available DECIMAL(10,2) DEFAULT 0,
  action_status action_status NOT NULL DEFAULT 'idle',
  status request_status NOT NULL DEFAULT 'pending',
  payment_methods payment_method[] NOT NULL,
  notes TEXT,
  manychat_data manychat_data NOT NULL,
  agent_name TEXT NOT NULL,
  agent_department TEXT NOT NULL,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_remarks TEXT,
  processing_state processing_state NOT NULL DEFAULT ('idle', NULL, 'none'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create company_tags table for managing payment method balances
CREATE TABLE company_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashtag TEXT NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create function to acquire request processing
CREATE OR REPLACE FUNCTION acquire_request_processing(
  request_id UUID,
  user_id UUID,
  p_modal_type modal_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to update the processing state
  UPDATE redeem_requests
  SET 
    processing_state = ('in_progress', user_id::text, p_modal_type)::processing_state,
    action_status = 'in_progress'
  WHERE id = request_id 
  AND (processing_state).status = 'idle'
  OR ((processing_state).status = 'in_progress' AND (processing_state).processed_by = user_id::text);

  -- Return true if we successfully updated a row
  RETURN FOUND;
END;
$$;

-- Create function to release request processing
CREATE OR REPLACE FUNCTION release_request_processing(
  request_id UUID,
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only release if the current user owns the lock
  UPDATE redeem_requests
  SET 
    processing_state = ('idle', NULL, 'none')::processing_state,
    action_status = 'idle'
  WHERE id = request_id 
  AND (processing_state).processed_by = user_id::text;

  -- Return true if we successfully updated a row
  RETURN FOUND;
END;
$$;

-- Create function to process redeem request
CREATE OR REPLACE FUNCTION process_redeem_request(
  p_redeem_id UUID,
  p_status request_status,
  p_processed_by UUID,
  p_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE redeem_requests
  SET 
    status = p_status,
    processed_by = p_processed_by,
    processed_at = NOW(),
    notes = p_notes,
    processing_state = ('idle', NULL, 'none')::processing_state,
    action_status = 'idle',
    updated_at = NOW()
  WHERE id = p_redeem_id;
END;
$$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_redeem_requests_updated_at
    BEFORE UPDATE ON redeem_requests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_company_tags_updated_at
    BEFORE UPDATE ON company_tags
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create RLS policies
ALTER TABLE redeem_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON redeem_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON redeem_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON redeem_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON company_tags
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for authenticated users" ON company_tags
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true); 