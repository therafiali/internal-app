-- Add Shift Incharge to role_type enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type 
        JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid 
        WHERE typname = 'role_type' 
        AND enumlabel = 'Shift Incharge'
    ) THEN
        ALTER TYPE role_type ADD VALUE 'Shift Incharge';
    END IF;
END $$;

COMMIT;

-- Update the department-role validation constraint in a separate transaction
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role_department;

    ALTER TABLE users ADD CONSTRAINT valid_role_department CHECK (
        CASE 
            WHEN department = 'Admin' THEN 
                role IN ('Admin', 'Executive')
            WHEN department = 'Support' THEN 
                role IN ('Agent', 'Team Lead', 'Manager', 'Shift Incharge')
            WHEN department IN ('Operations', 'Verification', 'Finance') THEN 
                role IN ('Agent', 'Team Lead', 'Manager')
            ELSE false
        END
    );
END $$; 