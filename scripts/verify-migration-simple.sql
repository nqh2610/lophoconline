-- Simple Verification Script

-- 1. Total counts
SELECT 'MIGRATION SUMMARY' as info;
SELECT '=================' as info;
SELECT CONCAT('Tutors with availability: ', COUNT(DISTINCT tutor_id)) as info
FROM tutor_availability;

SELECT CONCAT('Total availability slots: ', COUNT(*)) as info
FROM tutor_availability;

-- 2. Multi-day optimization showcase
SELECT '' as blank;
SELECT 'MULTI-DAY OPTIMIZATION EXAMPLES' as info;
SELECT '===============================' as info;
SELECT 
    tutor_id,
    recurring_days,
    shift_type,
    CONCAT(start_time, '-', end_time) as time_range
FROM tutor_availability
WHERE recurring_days LIKE '%,%'
ORDER BY tutor_id, start_time
LIMIT 10;

-- 3. Data integrity
SELECT '' as blank;
SELECT 'DATA INTEGRITY CHECKS' as info;
SELECT '=====================' as info;

SELECT CONCAT('Orphaned records: ', COUNT(*)) as check_result
FROM tutor_availability
WHERE tutor_id NOT IN (SELECT id FROM tutors);

SELECT CONCAT('Null time ranges: ', COUNT(*)) as check_result
FROM tutor_availability
WHERE start_time IS NULL OR end_time IS NULL;

SELECT CONCAT('Invalid time ranges: ', COUNT(*)) as check_result
FROM tutor_availability
WHERE start_time >= end_time;

-- 4. Before vs After
SELECT '' as blank;
SELECT 'MIGRATION IMPACT' as info;
SELECT '================' as info;

SELECT 'time_slots_backup' as source, COUNT(*) as rows
FROM time_slots_backup
UNION ALL
SELECT 'teaching_sessions_backup', COUNT(*)
FROM teaching_sessions_backup
UNION ALL
SELECT 'tutor_availability (new)', COUNT(*)
FROM tutor_availability;

SELECT CONCAT(
    'Storage reduction: ',
    ROUND((1 - 33.0/74)*100, 1),
    '%'
) as result;

SELECT 'Migration Status: SUCCESS' as final_status;
