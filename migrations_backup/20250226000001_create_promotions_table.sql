-- Create enum for promotion types
CREATE TYPE promotion_type AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE promotion_status AS ENUM ('active', 'inactive');

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type promotion_type NOT NULL,
  percentage DECIMAL,
  amount DECIMAL,
  min_amount DECIMAL NOT NULL DEFAULT 0,
  max_amount DECIMAL NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status promotion_status NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_limit INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  team TEXT NOT NULL,
  
  -- Add constraints
  CONSTRAINT check_percentage_or_amount CHECK (
    (type = 'PERCENTAGE' AND percentage IS NOT NULL AND amount IS NULL) OR
    (type = 'FIXED' AND amount IS NOT NULL AND percentage IS NULL)
  ),
  CONSTRAINT check_dates CHECK (start_date < end_date),
  CONSTRAINT check_amounts CHECK (min_amount <= max_amount),
  CONSTRAINT check_usage CHECK (usage_count <= usage_limit)
);

-- Create participants table for tracking promotion usage
CREATE TABLE IF NOT EXISTS promotion_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bonus_amount DECIMAL NOT NULL,
  
  -- Add constraints
  CONSTRAINT unique_participant_per_promotion UNIQUE (promotion_id, email)
);

-- Create indexes
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_team ON promotions(team);
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotion_participants_promotion_id ON promotion_participants(promotion_id);

-- Add RLS policies
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_participants ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to all authenticated users" 
ON promotions FOR SELECT 
TO authenticated 
USING (true);

-- Allow insert/update/delete only for admin users
CREATE POLICY "Allow full access to admin users" 
ON promotions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'department' = 'Admin'
  )
); 