-- Drop existing types if they exist
DO $$ BEGIN
    DROP TYPE IF EXISTS company_tag_type CASCADE;
    DROP TYPE IF EXISTS cash_card_status CASCADE;
    DROP TYPE IF EXISTS company_tag_status CASCADE;
    DROP TYPE IF EXISTS verification_status CASCADE;
    DROP TYPE IF EXISTS ct_type CASCADE;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Create enum types for company tags
CREATE TYPE company_tag_type AS ENUM (
    'cashapp',
    'venmo',
    'chime'
);

CREATE TYPE ct_type AS ENUM (
    'personal',
    'business'
);

CREATE TYPE cash_card_status AS ENUM (
    'pending',
    'ordered',
    'shipped',
    'activated',
    'deactivated',
    'blocked'
);

CREATE TYPE company_tag_status AS ENUM (
    'active',
    'paused',
    'blocked',
    'deleted',
    'disabled'
);

CREATE TYPE verification_status AS ENUM (
    'verified',
    'pending',
    'failed'
);

-- Drop existing table if exists
DROP TABLE IF EXISTS company_tags CASCADE;

-- Create company_tags table
CREATE TABLE company_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    c_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    cashtag TEXT UNIQUE NOT NULL,
    ct_type ct_type NOT NULL,
    full_name TEXT NOT NULL,
    last4_ss TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    pin TEXT NOT NULL,
    verification_status verification_status DEFAULT 'pending',
    procured_by UUID REFERENCES auth.users(id) NOT NULL,
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

-- Create updated_at trigger
CREATE TRIGGER update_company_tags_updated_at
    BEFORE UPDATE ON company_tags
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes for frequently queried columns
CREATE INDEX idx_company_tags_cashtag ON company_tags(cashtag);
CREATE INDEX idx_company_tags_status ON company_tags(status);
CREATE INDEX idx_company_tags_ct_type ON company_tags(ct_type);
CREATE INDEX idx_company_tags_verification_status ON company_tags(verification_status);

-- Create RLS policies
ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON company_tags
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert access for authenticated users with Finance or Admin role
CREATE POLICY "Enable insert for finance and admin" ON company_tags
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.department = 'Finance' OR auth.users.department = 'Admin')
        )
    );

-- Update access for authenticated users with Finance or Admin role
CREATE POLICY "Enable update for finance and admin" ON company_tags
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.department = 'Finance' OR auth.users.department = 'Admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.department = 'Finance' OR auth.users.department = 'Admin')
        )
    );

-- Delete access for authenticated users with Admin role only
CREATE POLICY "Enable delete for admin only" ON company_tags
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.department = 'Admin'
        )
    );

-- Create function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_company_tag_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_tag_last_active
    BEFORE UPDATE OF balance, total_received, total_withdrawn, transaction_count
    ON company_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_company_tag_last_active();

-- Comments
COMMENT ON TABLE company_tags IS 'Table storing company payment method tags and their details';
COMMENT ON COLUMN company_tags.c_id IS 'Unique identifier for the company tag';
COMMENT ON COLUMN company_tags.ct_type IS 'Type of company tag (personal, business)';
COMMENT ON COLUMN company_tags.verification_status IS 'Current verification status of the tag';
COMMENT ON COLUMN company_tags.cash_card IS 'Status of the associated cash card';
COMMENT ON COLUMN company_tags.status IS 'Current operational status of the tag'; 