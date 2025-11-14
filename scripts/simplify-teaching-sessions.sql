-- Migration: Simplify Teaching Sessions for 1-on-1 Tutoring with Recurring Schedule
-- Date: 2025-10-24
-- Purpose: Remove subject/grade (student will choose), remove max_students (1-on-1 only), add recurring days

-- Step 1: Add new column for recurring days (JSON array of day numbers)
ALTER TABLE teaching_sessions 
ADD COLUMN recurring_days VARCHAR(50) COMMENT 'JSON array of day numbers, e.g., "[1,3,5]" for Mon/Wed/Fri';

-- Step 2: Make subject_id and grade_level_id NULLABLE (since student will choose)
ALTER TABLE teaching_sessions 
MODIFY COLUMN subject_id INT NULL,
MODIFY COLUMN grade_level_id INT NULL;

-- Step 3: Remove max_students and current_students (1-on-1 only)
-- Note: Keep for backward compatibility, will ignore in new logic
-- ALTER TABLE teaching_sessions DROP COLUMN max_students;
-- ALTER TABLE teaching_sessions DROP COLUMN current_students;

-- Step 4: Make day_of_week NULLABLE (since we use recurring_days now)
ALTER TABLE teaching_sessions 
MODIFY COLUMN day_of_week INT NULL COMMENT 'Deprecated: Use recurring_days instead';

-- Step 5: Set default duration to 2 hours
ALTER TABLE teaching_sessions 
MODIFY COLUMN duration_hours DECIMAL(3,1) NOT NULL DEFAULT 2.0;

-- Step 6: Update indexes (remove subject_grade index since they're now optional)
DROP INDEX idx_subject_grade ON teaching_sessions;

-- Step 7: Add index for recurring schedule
CREATE INDEX idx_tutor_recurring ON teaching_sessions(tutor_id, recurring_days);

-- Step 8: Migrate existing data (convert day_of_week to recurring_days)
UPDATE teaching_sessions 
SET recurring_days = CONCAT('[', day_of_week, ']')
WHERE day_of_week IS NOT NULL AND recurring_days IS NULL;

-- Step 9: Add comment to table
ALTER TABLE teaching_sessions COMMENT = 'Teaching sessions with recurring schedule. Subject/grade chosen by student at booking.';

-- Verification queries:
-- SELECT id, tutor_id, recurring_days, start_time, end_time, duration_hours, price_per_session FROM teaching_sessions LIMIT 10;
-- SHOW CREATE TABLE teaching_sessions;
