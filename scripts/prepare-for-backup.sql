-- Quick Backup Script: Drop problematic views, backup, then run migration

-- Step 1: Drop problematic views
DROP VIEW IF EXISTS v_open_sessions;
DROP VIEW IF EXISTS v_student_upcoming_lessons;
DROP VIEW IF EXISTS v_tutor_upcoming_lessons;

SELECT 'Views dropped. Ready for backup.' AS status;
