-- Add last_login column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create index for last_login
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Update existing users to have last_login same as last_sign_in_at from auth.users
UPDATE users u
SET last_login = au.last_sign_in_at
FROM auth.users au
WHERE u.id = au.id AND u.last_login IS NULL; 