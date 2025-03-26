-- Create ENT type
CREATE TYPE ent_type AS ENUM ('ENT-1', 'ENT-2', 'ENT-3');

-- Add ent_access column to users table
ALTER TABLE users 
ADD COLUMN ent_access ent_type[] DEFAULT ARRAY['ENT1', 'ENT2', 'ENT3']::ent_type[];

-- Create index for ent_access
CREATE INDEX idx_users_ent_access ON users USING GIN (ent_access);

-- Add function to check ENT access
CREATE OR REPLACE FUNCTION check_user_ent_access(user_id UUID, required_ent ent_type)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM users 
        WHERE id = user_id 
        AND required_ent = ANY(ent_access)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN users.ent_access IS 'Array of ENTs that the user has access to. Default is all ENTs.'; 