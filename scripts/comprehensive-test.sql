-- Comprehensive Test Suite for Tutor Availability Consolidation

-- Test 1: Verify all tutors have availability data
SELECT 'Test 1: Tutors with availability' as test_name;
SELECT t.id, t.full_name, COUNT(ta.id) as slot_count
FROM tutors t
LEFT JOIN tutor_availability ta ON t.id = ta.tutor_id
WHERE t.id IN (106, 107, 108, 109, 110, 111, 112, 113, 114, 115)
GROUP BY t.id, t.full_name
ORDER BY t.id;

-- Test 2: Verify JSON format is valid
SELECT 'Test 2: JSON validation' as test_name;
SELECT 
    COUNT(*) as total_with_json,
    SUM(CASE WHEN JSON_VALID(recurring_days) = 1 THEN 1 ELSE 0 END) as valid_json,
    SUM(CASE WHEN JSON_VALID(recurring_days) = 0 THEN 1 ELSE 0 END) as invalid_json
FROM tutor_availability
WHERE recurring_days IS NOT NULL;

-- Test 3: Verify multi-day optimization is working
SELECT 'Test 3: Multi-day optimization examples' as test_name;
SELECT 
    tutor_id,
    recurring_days,
    CONCAT(start_time, '-', end_time) as time_range,
    shift_type,
    LENGTH(recurring_days) - LENGTH(REPLACE(recurring_days, ',', '')) + 1 as day_count
FROM tutor_availability
WHERE recurring_days LIKE '%,%'
ORDER BY tutor_id, start_time
LIMIT 10;

-- Test 4: Data integrity checks
SELECT 'Test 4: Data integrity' as test_name;
SELECT 
    'Orphaned records' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM tutor_availability
WHERE tutor_id NOT IN (SELECT id FROM tutors)
UNION ALL
SELECT 
    'Null time ranges',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM tutor_availability
WHERE start_time IS NULL OR end_time IS NULL
UNION ALL
SELECT 
    'Invalid time ranges',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM tutor_availability
WHERE start_time >= end_time
UNION ALL
SELECT 
    'Missing shift_type',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM tutor_availability
WHERE shift_type IS NULL OR shift_type = '';

-- Test 5: Verify expansion would work (simulate)
SELECT 'Test 5: Simulated day expansion for tutor 106' as test_name;
SELECT 
    id as availability_id,
    tutor_id,
    recurring_days,
    JSON_EXTRACT(recurring_days, CONCAT('$[', seq.n, ']')) as day_of_week,
    shift_type,
    start_time,
    end_time
FROM tutor_availability
CROSS JOIN (
    SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
) seq
WHERE tutor_id = 106 
  AND recurring_days IS NOT NULL
  AND JSON_EXTRACT(recurring_days, CONCAT('$[', seq.n, ']')) IS NOT NULL
ORDER BY start_time, day_of_week
LIMIT 15;

-- Test 6: Compare counts
SELECT 'Test 6: Row count comparison' as test_name;
SELECT 'Before (time_slots)' as source, COUNT(*) as rows FROM time_slots_backup
UNION ALL
SELECT 'Before (teaching_sessions)', COUNT(*) FROM teaching_sessions_backup
UNION ALL
SELECT 'After (tutor_availability)', COUNT(*) FROM tutor_availability;

-- Test 7: Verify no data loss
SELECT 'Test 7: Tutor coverage' as test_name;
SELECT 
    'Tutors in old tables' as source,
    COUNT(DISTINCT tutor_id) as tutor_count
FROM (
    SELECT tutor_id FROM time_slots_backup
    UNION
    SELECT tutor_id FROM teaching_sessions_backup
) old_data
UNION ALL
SELECT 
    'Tutors in new table',
    COUNT(DISTINCT tutor_id)
FROM tutor_availability;

-- Test 8: Check for duplicate time slots
SELECT 'Test 8: Duplicate detection' as test_name;
SELECT 
    tutor_id,
    start_time,
    end_time,
    shift_type,
    COUNT(*) as duplicate_count
FROM tutor_availability
GROUP BY tutor_id, start_time, end_time, shift_type
HAVING COUNT(*) > 1;

-- Final summary
SELECT 'FINAL SUMMARY' as summary;
SELECT 
    'Total availability slots' as metric,
    COUNT(*) as value
FROM tutor_availability
UNION ALL
SELECT 
    'Unique tutors with availability',
    COUNT(DISTINCT tutor_id)
FROM tutor_availability
UNION ALL
SELECT 
    'Slots with multi-day optimization',
    COUNT(*)
FROM tutor_availability
WHERE recurring_days LIKE '%,%'
UNION ALL
SELECT 
    'Storage efficiency gain',
    CONCAT(ROUND((1 - 33.0/74) * 100, 1), '%')
FROM dual;
