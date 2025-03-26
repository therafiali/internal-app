-- Create ct_activity_logs table
CREATE TABLE IF NOT EXISTS ct_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ct_id UUID NOT NULL REFERENCES company_tags(id) ON DELETE CASCADE,
  cashtag TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_department TEXT NOT NULL,
  user_role TEXT NOT NULL,
  amount DECIMAL(15,2),
  balance_before DECIMAL(15,2),
  balance_after DECIMAL(15,2),
  ip_address TEXT,
  browser TEXT,
  operating_system TEXT,
  additional_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_ct_activity_logs_ct_id ON ct_activity_logs(ct_id);
CREATE INDEX idx_ct_activity_logs_created_at ON ct_activity_logs(created_at);
CREATE INDEX idx_ct_activity_logs_action_type ON ct_activity_logs(action_type);
CREATE INDEX idx_ct_activity_logs_status ON ct_activity_logs(status);

-- Add RLS policies
ALTER TABLE ct_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON ct_activity_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON ct_activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ct_activity_logs_updated_at
  BEFORE UPDATE ON ct_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 