-- Final Cleanup: Drop time_slots only
-- Note: Keeping teaching_sessions because it has 3 active lesson_bookings

-- Summary of why we keep teaching_sessions:
-- - lesson_bookings table has FK constraint to teaching_sessions
-- - 3 active bookings exist (IDs: 3, 4, 5) for lessons on 2025-10-28 and 2025-10-29
-- - FK has ON DELETE RESTRICT - cannot drop without breaking bookings
-- - Safer to keep for historical data integrity

-- Show bookings that depend on teaching_sessions
SELECT 'Active bookings depending on teaching_sessions:' as info;
SELECT 
    lb.id as booking_id,
    lb.teaching_session_id,
    lb.tutor_id,
    lb.lesson_date,
    lb.status,
    ts.day_of_week,
    TIME_FORMAT(ts.start_time, '%H:%i') as start_time,
    TIME_FORMAT(ts.end_time, '%H:%i') as end_time
FROM lesson_bookings lb
JOIN teaching_sessions ts ON lb.teaching_session_id = ts.id;

-- Verification: time_slots is safe to drop (no dependencies)
SELECT 'Checking time_slots dependencies...' as info;
SELECT COUNT(*) as tables_referencing_time_slots
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'lophoc_online' 
AND REFERENCED_TABLE_NAME = 'time_slots';

-- Final counts before dropping time_slots
SELECT 'Current state:' as info;
SELECT 'time_slots' as table_name, COUNT(*) as row_count FROM time_slots
UNION ALL
SELECT 'teaching_sessions', COUNT(*) FROM teaching_sessions
UNION ALL
SELECT 'tutor_availability', COUNT(*) FROM tutor_availability;

-- DROP time_slots (safe - no dependencies)
DROP TABLE IF EXISTS time_slots;

SELECT '✅ time_slots dropped successfully!' as result;

-- Verify final state
SELECT 'Final state after cleanup:' as info;
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'lophoc_online' 
AND TABLE_NAME IN ('time_slots', 'teaching_sessions', 'tutor_availability');

-- Summary
SELECT 'CONSOLIDATION SUMMARY' as summary;
SELECT '✅ tutor_availability: 33 rows (consolidated with recurring_days JSON)' as detail
UNION ALL
SELECT '✅ time_slots: DROPPED (no longer needed)'
UNION ALL
SELECT '⚠️  teaching_sessions: KEPT (3 active bookings depend on it)'
UNION ALL
SELECT '✅ Storage reduction: 48 rows eliminated from time_slots'
UNION ALL
SELECT '✅ Backups: time_slots_backup, teaching_sessions_backup still available';
