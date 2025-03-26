-- Fix role synchronization between users and auth.users tables
-- Drop existing role update trigger if exists
DROP TRIGGER IF EXISTS handle_role_update_trigger ON users;
DROP FUNCTION IF EXISTS handle_role_update();

-- Create function to handle role and ent_access updates
CREATE OR REPLACE FUNCTION handle_role_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update both role and ent_access in auth.users when changes occur in users table
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        jsonb_set(
            raw_user_meta_data,
            '{role}',
            to_jsonb(NEW.role::text)
        ),
        '{ent_access}',
        array_to_json(NEW.ent_access::text[])::jsonb
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role and ent_access updates
CREATE TRIGGER handle_role_update_trigger
    AFTER UPDATE OF role, ent_access ON users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.ent_access IS DISTINCT FROM NEW.ent_access)
    EXECUTE FUNCTION handle_role_update();

-- Update the handle_new_user function to ensure proper role sync
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.users (
        id,
        email,
        name,
        department,
        role,
        status,
        employee_code,
        ent_access,
        ent_section
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
        (NEW.raw_user_meta_data->>'department')::department_type,
        (NEW.raw_user_meta_data->>'role')::role_type,
        COALESCE((NEW.raw_user_meta_data->>'status')::user_status, 'active'),
        NEW.raw_user_meta_data->>'employee_code',
        COALESCE(array(select jsonb_array_elements_text(NEW.raw_user_meta_data->'ent_access'))::ent_type[], ARRAY[]::ent_type[]),
        COALESCE(NEW.raw_user_meta_data->>'ent_section', NULL)
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating user record: % %', SQLERRM, SQLSTATE;
        RAISE EXCEPTION 'Failed to create user record: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Fix existing inconsistencies for both role and ent_access
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    jsonb_set(
        raw_user_meta_data,
        '{role}',
        to_jsonb(u.role::text)
    ),
    '{ent_access}',
    array_to_json(u.ent_access::text[])::jsonb
)
FROM public.users u
WHERE auth.users.id = u.id
AND (
    (raw_user_meta_data->>'role') != u.role::text
    OR array(select jsonb_array_elements_text(raw_user_meta_data->'ent_access'))::ent_type[] IS DISTINCT FROM u.ent_access
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_role_update() TO service_role;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role; 