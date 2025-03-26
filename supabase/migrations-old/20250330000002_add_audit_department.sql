-- Add Audit to department_type enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type 
        JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid 
        WHERE typname = 'department_type' 
        AND enumlabel = 'Audit'
    ) THEN
        ALTER TYPE department_type ADD VALUE 'Audit';
    END IF;
END $$;

-- Update the department-role validation constraint
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role_department;

    ALTER TABLE users ADD CONSTRAINT valid_role_department CHECK (
        CASE 
            WHEN department = 'Admin' THEN 
                role IN ('Admin', 'Executive')
            WHEN department = 'Support' THEN 
                role IN ('Agent', 'Team Lead', 'Manager', 'Shift Incharge')
            WHEN department = 'Audit' THEN 
                role IN ('Manager', 'Agent')
            WHEN department IN ('Operations', 'Verification', 'Finance') THEN 
                role IN ('Agent', 'Team Lead', 'Manager')
            ELSE false
        END
    );
END $$; 