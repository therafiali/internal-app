-- Add user_activity column to users table
ALTER TABLE users 
ADD COLUMN user_activity BOOLEAN DEFAULT TRUE;

-- Create index for user_activity
CREATE INDEX idx_users_activity ON users(user_activity);

-- Add comment for documentation
COMMENT ON COLUMN users.user_activity IS 'Indicates if the user is currently active. Used for session management.';

-- Update existing users to have user_activity as true
UPDATE users SET user_activity = TRUE WHERE user_activity IS NULL; 