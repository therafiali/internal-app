-- Add login_attempts column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;

-- Create index for login_attempts
CREATE INDEX IF NOT EXISTS idx_users_login_attempts ON users(login_attempts);

-- Create function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment login attempts
    UPDATE users
    SET 
        login_attempts = login_attempts + 1,
        status = CASE 
            WHEN login_attempts >= 5 THEN 'disabled'::user_status 
            ELSE status 
        END
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset login attempts on successful login
CREATE OR REPLACE FUNCTION reset_login_attempts()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset login attempts on successful login
    UPDATE users
    SET login_attempts = 0
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON COLUMN users.login_attempts IS 'Number of failed login attempts. Account is disabled after 5 failed attempts.'; 