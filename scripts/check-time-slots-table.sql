-- =====================================================
-- CHECK TIME_SLOTS TABLE STATUS
-- =====================================================

-- 1. Check if time_slots table exists
SELECT 
    'time_slots table exists' as status,
    TABLE_NAME,
    TABLE_ROWS as estimated_rows,
    DATA_LENGTH,
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'lophoc_online' 
  AND TABLE_NAME = 'time_slots';

-- 2. Count actual records in time_slots (if table exists)
SELECT 'Actual record count' as info, COUNT(*) as total_records 
FROM time_slots;

-- 3. Check for Foreign Key constraints referencing time_slots
SELECT 
    'FK Constraints TO time_slots' as info,
    TABLE_NAME as referencing_table,
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'lophoc_online'
  AND REFERENCED_TABLE_NAME = 'time_slots';

-- 4. Check for Foreign Key constraints FROM time_slots
SELECT 
    'FK Constraints FROM time_slots' as info,
    TABLE_NAME,
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'lophoc_online'
  AND TABLE_NAME = 'time_slots'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 5. Sample data from time_slots (if any)
SELECT 'Sample time_slots data' as info;
SELECT * FROM time_slots LIMIT 5;

-- 6. Check tutor_availability current data count
SELECT 'tutor_availability records' as info, COUNT(*) as total_records 
FROM tutor_availability;

-- 7. Compare tutors with time_slots vs tutor_availability
SELECT 
    'Tutors comparison' as info,
    (SELECT COUNT(DISTINCT tutor_id) FROM time_slots) as tutors_in_time_slots,
    (SELECT COUNT(DISTINCT tutor_id) FROM tutor_availability) as tutors_in_availability;
