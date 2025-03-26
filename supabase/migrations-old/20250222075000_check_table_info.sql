-- Check table column information
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('recharge_requests', 'redeem_requests')
ORDER BY table_name, ordinal_position;

-- Check table constraints (including primary keys and foreign keys)
SELECT
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN
            ccu.table_name || '.' || ccu.column_name
        ELSE NULL
    END as references
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('recharge_requests', 'redeem_requests')
ORDER BY tc.table_name, tc.constraint_type;

-- Check indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('recharge_requests', 'redeem_requests')
ORDER BY tablename, indexname;

-- Check row level security policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('recharge_requests', 'redeem_requests')
ORDER BY tablename, policyname;

-- Check table row counts and basic statistics
SELECT 
    'recharge_requests' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'assigned') as assigned_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count
FROM recharge_requests
UNION ALL
SELECT 
    'redeem_requests' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
    COUNT(*) FILTER (WHERE status = 'queued_partially_assigned') as partially_assigned_count,
    COUNT(*) FILTER (WHERE status = 'queued_fully_assigned') as fully_assigned_count
FROM redeem_requests;

-- Sample data from recharge_requests (latest 5 records)
SELECT 
    id,
    vip_code,
    player_name,
    amount,
    status,
    created_at,
    updated_at
FROM recharge_requests
ORDER BY created_at DESC
LIMIT 5;

-- Sample data from redeem_requests (latest 5 records)
SELECT 
    id,
    player_name,
    total_amount,
    amount_hold,
    status,
    created_at,
    updated_at
FROM redeem_requests
ORDER BY created_at DESC
LIMIT 5;

-- Check table permissions
SELECT 
    table_name,
    grantee,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_name IN ('recharge_requests', 'redeem_requests')
GROUP BY table_name, grantee
ORDER BY table_name, grantee; 