-- Verification Script: Check Tutor Availability Data Quality
-- Run this to verify the migration was successful

SET @total_tutors = (SELECT COUNT(DISTINCT tutor_id) FROM tutor_availability);
SET @total_slots = (SELECT COUNT(*) FROM tutor_availability);

SELECT '=' as separator, '=' as separator2, '=' as separator3, '=' as separator4, '=' as separator5;
SELECT 'MIGRATION VERIFICATION REPORT' as title;
SELECT '=' as separator, '=' as separator2, '=' as separator3, '=' as separator4, '=' as separator5;

-- 1. Overview
SELECT 'Overview' as section;
SELECT '---------' as separator;
SELECT 
    @total_tutors as tutors_with_availability,
    @total_slots as total_availability_slots,
    ROUND(@total_slots / @total_tutors, 1) as avg_slots_per_tutor;

-- 2. Data Distribution
SELECT '' as blank_line;
SELECT 'Data Distribution by Shift Type' as section;
SELECT '--------------------------------' as separator;
SELECT 
    shift_type,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / @total_slots, 1), '%') as percentage
FROM tutor_availability
GROUP BY shift_type
ORDER BY count DESC;

-- 3. Recurring Days Analysis
SELECT '' as blank_line;
SELECT 'Recurring Days Analysis' as section;
SELECT '-----------------------' as separator;
SELECT 
    CASE 
        WHEN recurring_days IS NULL THEN 'Single Day (legacy)'
        WHEN recurring_days LIKE '%,%' THEN 'Multiple Days (optimized)'
        ELSE 'Single Day (JSON)'
    END as storage_type,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / @total_slots, 1), '%') as percentage
FROM tutor_availability
GROUP BY storage_type
ORDER BY count DESC;

-- 4. Sample Multi-Day Entries (the optimization we wanted!)
SELECT '' as blank_line;
SELECT 'Sample Multi-Day Entries (Optimization Success!)' as section;
SELECT '------------------------------------------------' as separator;
SELECT 
    tutor_id,
    recurring_days,
    shift_type,
    CONCAT(start_time, '-', end_time) as time_range,
    is_active
FROM tutor_availability
WHERE recurring_days LIKE '%,%'
ORDER BY tutor_id, start_time
LIMIT 10;

-- 5. Data Integrity Checks
SELECT '' as blank_line;
SELECT 'Data Integrity Checks' as section;
SELECT '---------------------' as separator;

-- Check 1: Orphaned records
SELECT 
    'Orphaned Records (should be 0)' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM tutor_availability
WHERE tutor_id NOT IN (SELECT id FROM tutors);

-- Check 2: Invalid JSON format
SELECT 
    'Invalid JSON Format (should be 0)' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM tutor_availability
WHERE recurring_days IS NOT NULL 
AND recurring_days NOT REGEXP '^\\[[0-9,]+\\]$';

-- Check 3: Null time ranges
SELECT 
    'Null Time Ranges (should be 0)' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM tutor_availability
WHERE start_time IS NULL OR end_time IS NULL;

-- Check 4: Invalid time ranges
SELECT 
    'Invalid Time Ranges (should be 0)' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM tutor_availability
WHERE start_time >= end_time;

-- 6. Tutor-specific breakdown
SELECT '' as blank_line;
SELECT 'Top 5 Tutors by Availability Slots' as section;
SELECT '-----------------------------------' as separator;
SELECT 
    tutor_id,
    COUNT(*) as slots,
    GROUP_CONCAT(DISTINCT shift_type ORDER BY shift_type) as shifts_offered,
    MIN(start_time) as earliest_time,
    MAX(end_time) as latest_time
FROM tutor_availability
GROUP BY tutor_id
ORDER BY slots DESC
LIMIT 5;

-- 7. Comparison with backups (if they exist)
SELECT '' as blank_line;
SELECT 'Migration Impact (Before vs After)' as section;
SELECT '-----------------------------------' as separator;

SELECT 
    'time_slots (before)' as source,
    COUNT(*) as row_count
FROM time_slots_backup
UNION ALL
SELECT 
    'teaching_sessions (before)' as source,
    COUNT(*) as row_count
FROM teaching_sessions_backup
UNION ALL
SELECT 
    '--- TOTAL BEFORE ---' as source,
    (SELECT COUNT(*) FROM time_slots_backup) + (SELECT COUNT(*) FROM teaching_sessions_backup) as row_count
UNION ALL
SELECT 
    'tutor_availability (after)' as source,
    COUNT(*) as row_count
FROM tutor_availability
UNION ALL
SELECT 
    '--- REDUCTION ---' as source,
    ROUND(
        (1 - (SELECT COUNT(*) FROM tutor_availability) * 1.0 / 
        ((SELECT COUNT(*) FROM time_slots_backup) + (SELECT COUNT(*) FROM teaching_sessions_backup))) * 100, 
        1
    ) as row_count;

-- 8. Final Status
SELECT '' as blank_line;
SELECT '=' as separator, '=' as separator2, '=' as separator3, '=' as separator4, '=' as separator5;
SELECT 'VERIFICATION COMPLETE' as status;
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM tutor_availability WHERE tutor_id NOT IN (SELECT id FROM tutors)) = 0
        AND (SELECT COUNT(*) FROM tutor_availability WHERE start_time IS NULL OR end_time IS NULL) = 0
        AND (SELECT COUNT(*) FROM tutor_availability WHERE start_time >= end_time) = 0
        THEN '✅ ALL CHECKS PASSED - Migration Successful!'
        ELSE '⚠️  Some checks failed - Review above'
    END as result;
SELECT '=' as separator, '=' as separator2, '=' as separator3, '=' as separator4, '=' as separator5;
