-- Migration: Ultra-Simplify Teaching Sessions - Only Days + Times
-- Date: 2025-10-24
-- Purpose: Keep only recurring_days, start_time, end_time. Remove all other fields.

-- Step 1: Make ALL other columns NULLABLE (keep data but make optional)
ALTER TABLE teaching_sessions 
MODIFY COLUMN subject_id INT NULL,
MODIFY COLUMN grade_level_id INT NULL,
MODIFY COLUMN day_of_week INT NULL,
MODIFY COLUMN duration_hours DECIMAL(3,1) NULL,
MODIFY COLUMN price_per_session INT NULL,
MODIFY COLUMN max_students INT NULL,
MODIFY COLUMN current_students INT NULL,
MODIFY COLUMN title VARCHAR(255) NULL,
MODIFY COLUMN description TEXT NULL,
MODIFY COLUMN start_date VARCHAR(15) NULL,
MODIFY COLUMN end_date VARCHAR(15) NULL,
MODIFY COLUMN availability_id INT NULL;

-- Step 2: Add recurring_days if not exists (from previous migration)
-- Check if column exists first
SET @col_exists = (SELECT COUNT(*) 
                   FROM information_schema.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'teaching_sessions' 
                   AND COLUMN_NAME = 'recurring_days');

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE teaching_sessions ADD COLUMN recurring_days VARCHAR(50) NOT NULL COMMENT "JSON array of day numbers, e.g., [1,3,5] for Mon/Wed/Fri"',
    'SELECT "Column recurring_days already exists"');
    
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Make recurring_days, start_time, end_time NOT NULL (required fields)
ALTER TABLE teaching_sessions 
MODIFY COLUMN recurring_days VARCHAR(50) NOT NULL,
MODIFY COLUMN start_time VARCHAR(10) NOT NULL,
MODIFY COLUMN end_time VARCHAR(10) NOT NULL;

-- Step 4: Update indexes - only for required fields
DROP INDEX IF EXISTS idx_subject_grade ON teaching_sessions;
DROP INDEX IF EXISTS idx_day_time ON teaching_sessions;
DROP INDEX IF EXISTS idx_tutor_day ON teaching_sessions;

CREATE INDEX IF NOT EXISTS idx_tutor_time ON teaching_sessions(tutor_id, start_time);
CREATE INDEX IF NOT EXISTS idx_recurring ON teaching_sessions(recurring_days);

-- Step 5: Add table comment
ALTER TABLE teaching_sessions COMMENT = 'Minimal teaching sessions: only days + times. Tutor sets availability, student chooses everything else.';

-- Verification:
-- DESCRIBE teaching_sessions;
-- SELECT id, tutor_id, recurring_days, start_time, end_time FROM teaching_sessions LIMIT 10;

COMMIT;
