-- Create or replace the function to sync user data with auth.users
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the metadata in auth.users when changes occur in users table
    -- Strictly limit what goes into raw_user_meta_data (JWT token)
    UPDATE auth.users
    SET 
    -- Only absolute essentials in raw_user_meta_data (goes into JWT)
    raw_user_meta_data = jsonb_build_object(
        'name', NEW.name,
        'role', NEW.role
    ),
    -- Everything else goes into app_metadata (not included in JWT)
    raw_app_meta_data = jsonb_build_object(
        'email', NEW.email,
        'department', NEW.department,
        'employee_code', NEW.employee_code,
        'ent_access', NEW.ent_access,
        'ent_section', NEW.ent_section,
        'email_verified', true,
        'phone_verified', false
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON users;

-- Create the trigger
CREATE TRIGGER sync_user_metadata_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_metadata();

-- Also modify the profile pic sync to use app_metadata
CREATE OR REPLACE FUNCTION sync_user_profile_pic()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
                           jsonb_build_object('user_profile_pic', NEW.user_profile_pic)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync existing users to new format
UPDATE users
SET updated_at = NOW(); 